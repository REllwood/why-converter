import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { AddressInfo } from 'net';
import { chromium, Browser, Page } from 'playwright';
import { VideoMetadata } from '../../src/core/types';

const bundleDir = path.join(__dirname, '..', '..', 'dist', 'browser');

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4'
};

export interface BrowserHarness {
  page: Page;
  baseUrl: string;
  /** Every URL the page has requested */
  requests: string[];
  /** Open another page with the bundle loaded, for tests that change browser behaviour */
  openPage(): Promise<Page>;
  close(): Promise<void>;
}

/**
 * Serve the built browser bundle plus the given files, and open a page that
 * loads the bundle with a script tag
 */
export async function startBrowser(files: Record<string, string>): Promise<BrowserHarness> {
  const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];

    if (url === '/') {
      res.setHeader('content-type', 'text/html');
      res.end('<!doctype html><html><body><script src="/dist/index.js"></script></body></html>');
      return;
    }

    const file = files[url] ?? (url.startsWith('/dist/') ? path.join(bundleDir, url.slice('/dist/'.length)) : '');
    if (!file || !fs.existsSync(file)) {
      res.statusCode = 404;
      res.end();
      return;
    }

    res.setHeader('content-type', CONTENT_TYPES[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const browser: Browser = await chromium.launch();
  const page = await browser.newPage();
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto(`${baseUrl}/`);

  return {
    page,
    baseUrl,
    requests,
    async openPage() {
      const extraPage = await browser.newPage();
      await extraPage.goto(`${baseUrl}/`);
      return extraPage;
    },
    async close() {
      await browser.close();
      await new Promise(resolve => server.close(resolve));
    }
  };
}

export interface BrowserConversion {
  success: boolean;
  error?: string;
  metadata: VideoMetadata;
  progress: number[];
  blob?: { type: string; base64: string };
  files?: Array<{ name: string; type: string; base64: string }>;
}

/**
 * Fetch a video into a Blob inside the page and convert it with the bundle,
 * returning the output bytes (as base64, which transfers far faster than arrays)
 */
export function convertInBrowser(
  page: Page,
  videoUrl: string,
  options: Record<string, unknown>,
  entry: 'global' | 'named' = 'global'
): Promise<BrowserConversion> {
  return page.evaluate(
    async ({ videoUrl, options, entry }) => {
      const toBase64 = (blob: Blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      const video = await (await fetch(videoUrl)).blob();
      const progress: number[] = [];
      const lib = (window as any).WhyConverter;
      const convert = entry === 'named' ? lib.convertVideo : lib;

      const result = await convert(video, { ...options, onProgress: (value: number) => progress.push(value) });

      return {
        success: result.success,
        error: result.error,
        metadata: result.metadata,
        progress,
        blob: result.blob ? { type: result.blob.type, base64: await toBase64(result.blob) } : undefined,
        files: result.files
          ? await Promise.all(
              result.files.map(async (file: File) => ({ name: file.name, type: file.type, base64: await toBase64(file) }))
            )
          : undefined
      };
    },
    { videoUrl, options, entry }
  );
}
