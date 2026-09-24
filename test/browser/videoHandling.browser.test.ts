import * as path from 'path';
import { createTestVideo, makeTempDir, removeDir } from '../fixtures';
import { BrowserHarness, convertInBrowser, startBrowser } from './harness';

describe('browser video handling', () => {
  let dir: string;
  let harness: BrowserHarness;

  beforeAll(async () => {
    dir = makeTempDir();
    const film = createTestVideo(path.join(dir, 'film.webm'), { duration: 2, fps: 24, width: 320, height: 240 });
    const live = createTestVideo(path.join(dir, 'live.webm'), { duration: 2, width: 160, height: 120, withoutDuration: true });
    harness = await startBrowser({ '/film.webm': film, '/live.webm': live });
  });

  afterAll(async () => {
    await harness?.close();
    removeDir(dir);
  });

  it("measures the video's frame rate for 'interval' mode", async () => {
    // At the real 24 fps, every 24th frame of a 2 s video is at 0 s and 1 s
    const result = await convertInBrowser(harness.page, '/film.webm', {
      extractionMode: 'interval',
      frameInterval: 24,
      outputFormat: 'images'
    });

    expect(result.error).toBeUndefined();
    expect(result.metadata.fps).toBeCloseTo(24, 0);
    expect(result.metadata.extractedFrames).toBe(2);
  });

  it('works out the duration of a video that does not store it', async () => {
    const result = await convertInBrowser(harness.page, '/live.webm', { framesCount: 3, outputFormat: 'images' });

    expect(result.error).toBeUndefined();
    expect(result.metadata.duration).toBeCloseTo(2, 0);
    expect(result.files).toHaveLength(3);
  });

  it('converts a MediaRecorder recording', async () => {
    const result = await harness.page.evaluate(async () => {
      // Record a second of an animated canvas, as a web app recording the screen or camera would
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d')!;
      const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => chunks.push(event.data);

      let hue = 0;
      const timer = setInterval(() => {
        ctx.fillStyle = `hsl(${(hue += 20)}, 80%, 50%)`;
        ctx.fillRect(0, 0, 160, 120);
      }, 33);
      recorder.start();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await new Promise(resolve => {
        recorder.onstop = resolve;
        recorder.stop();
      });
      clearInterval(timer);

      const recording = new Blob(chunks, { type: 'video/webm' });
      const conversion = await (window as any).WhyConverter(recording, { framesCount: 3, outputFormat: 'images' });
      return { success: conversion.success, error: conversion.error, duration: conversion.metadata.duration, files: conversion.files?.length };
    });

    expect(result.error).toBeUndefined();
    expect(result.duration).toBeGreaterThan(0.5);
    expect(result.duration).toBeLessThan(5);
    expect(result.files).toBe(3);
  });

  it('explains when the browser cannot play the file', async () => {
    const result = await harness.page.evaluate(async () => {
      const notAVideo = new Blob(['this is not a video'], { type: 'video/mp4' });
      const conversion = await (window as any).WhyConverter(notAVideo, { framesCount: 2 });
      return { success: conversion.success, error: conversion.error };
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^The browser could not load this video/);
  });

  it('gives up with an error instead of hanging when a seek never finishes', async () => {
    const page = await harness.openPage();
    try {
      const result = await page.evaluate(async () => {
        const video = await (await fetch('/film.webm')).blob();
        // Make seeks go nowhere, so 'seeked' never fires
        const { set, get } = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime')!;
        Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
          configurable: true,
          get,
          set(this: HTMLMediaElement, value: number) {
            if (value > 0) return;
            set!.call(this, value);
          }
        });
        const conversion = await (window as any).WhyConverter(video, { framesCount: 2, outputFormat: 'images' });
        return { success: conversion.success, error: conversion.error };
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/^Timed out seeking to /);
    } finally {
      await page.close();
    }
  });
});
