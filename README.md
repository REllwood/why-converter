# Why Converter

**"Why would you ever use this?"**

A powerful, universal JavaScript library for converting videos to PDF, GIF, or image sequences.

## Features

- **Multiple Output Formats**: PDF, GIF, or image sequences (PNG, JPEG, WebP)
- **Flexible Frame Extraction**: Extract by frame count, frame interval, or time interval
- **PDF Layouts**: Customise frames per page, page size, and orientation
- **Quality Control**: Adjust dimensions and quality settings
- **Universal**: Works in both Node.js and browser environments
- **Zero Config**: Sensible defaults with extensive customisation options
- **Progress Tracking**: Monitor conversion progress with callbacks
- **Format Support**: MP4, WebM, MOV, AVI, MKV (Node.js) | MP4, WebM, OGG (Browser)

## Installation

```bash
npm install why-converter
```

In Node.js the library uses `ffmpeg` and `ffprobe`. Both are installed automatically through the optional dependencies `ffmpeg-static` and `@ffprobe-installer/ffprobe`, so there's nothing else to set up. If you'd rather use your own binaries, see [FFmpeg Not Found](#ffmpeg-not-found-nodejs).

## Quick Start

### Node.js

```javascript
import { convertVideo } from 'why-converter';

// Convert video to PDF
const result = await convertVideo('./video.mp4', {
  extractionMode: 'frames',
  framesCount: 10,
  outputFormat: 'pdf',
  outputPath: './output.pdf',
  onProgress: (progress) => console.log(`${progress}%`)
});

if (result.success) {
  console.log('Saved to', result.outputPath);
} else {
  console.error('Failed:', result.error);
}
```

CommonJS works too:

```javascript
const { convertVideo } = require('why-converter');

convertVideo('./video.mp4', { outputFormat: 'gif' }).then((result) => {
  console.log(result.success ? `${result.buffer.length} bytes` : result.error);
});
```

### Browser (with a bundler)

Bundlers such as webpack and Vite pick up the browser build automatically:

```javascript
import { convertVideo } from 'why-converter';

const result = await convertVideo(fileInput.files[0], { outputFormat: 'pdf' });
```

### Browser (script tag)

```html
<script src="node_modules/why-converter/dist/browser/index.js"></script>

<script>
  const fileInput = document.querySelector('input[type="file"]');

  fileInput.addEventListener('change', async (e) => {
    const result = await WhyConverter(e.target.files[0], {
      extractionMode: 'frames',
      framesCount: 10,
      outputFormat: 'pdf',
      onProgress: (progress) => console.log(`${progress}%`)
    });

    // Download the PDF
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.pdf';
    a.click();
  });
</script>
```

## API Reference

### `convertVideo(input, options)`

Main function to convert videos.

#### Parameters

- **input**: `string | File | Blob | Buffer`
  - Node.js: a file path or a `Buffer`
  - Browser: a `File`, a `Blob` or a video URL

- **options** (optional): `ConversionOptions` object with the following properties. Every option is checked before any work starts; invalid values make the conversion fail with `success: false` and an `error` listing every problem.

#### Frame Extraction Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `extractionMode` | `'frames' \| 'interval' \| 'time'` | `'frames'` | Frame extraction mode |
| `framesCount` | `number` | `10` | Number of frames to extract, evenly spaced from the first frame to the last (mode: 'frames'). A video with fewer frames returns each frame once |
| `frameInterval` | `number` | `30` | Extract every Nth frame (mode: 'interval') |
| `timeInterval` | `number` | `1` | Extract a frame every N seconds, starting at 0 (mode: 'time') |

Browsers don't expose a video's frame rate, so in the browser `'interval'` mode measures it by playing the video (muted) for a fraction of a second. The other modes don't need it, and report `metadata.fps` as 30.

#### Output Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputFormat` | `'pdf' \| 'gif' \| 'images'` | `'pdf'` | Output format |
| `outputPath` | `string` | - | Node.js only. For PDF/GIF, the file to write (an existing directory, or a path ending in `/`, gets `output.pdf`/`output.gif` inside it); the data is also returned as `buffer`. For images, the directory to write into (a temporary directory is used if omitted). Missing directories are created |

#### PDF Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pdfLayout` | `'portrait' \| 'landscape'` | `'landscape'` | Page orientation |
| `framesPerPage` | `number` | `1` | Number of frames per page |
| `pageSize` | `'A4' \| 'Letter' \| 'Legal' \| [width, height]` | `'A4'` | PDF page size |

#### GIF Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gifFps` | `number` | `10` | Frames per second |
| `gifQuality` | `number` | `80` | Quality (1-100) |
| `gifRepeat` | `number` | `0` | `0` loops forever, `-1` plays once, `n` repeats n times |

#### Image Sequence Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `imageFormat` | `'png' \| 'jpeg' \| 'webp'` | `'png'` | Image format |
| `imageQuality` | `number` | `90` | Quality for JPEG/WebP (1-100) |
| `imagePrefix` | `string` | `'frame_'` | Filename prefix |

#### Quality Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `width` | `number` | - | Output width in pixels |
| `height` | `number` | - | Output height in pixels |
| `maintainAspectRatio` | `boolean` | `true` | Maintain aspect ratio |

`compression` is deprecated: it never had any effect. Use `gifQuality` or `imageQuality` instead.

#### Callbacks

| Option | Type | Description |
|--------|------|-------------|
| `onProgress` | `(progress: number) => void` | Progress callback (0-100) |
| `onComplete` | `(result: ConversionResult) => void` | Completion callback |
| `onError` | `(error: Error) => void` | Error callback |

#### Returns

`Promise<ConversionResult>` with:

```typescript
{
  success: boolean;
  error?: string;             // Set when success is false
  outputPath?: string;        // Node.js: file written (PDF/GIF) or directory (images)
  buffer?: Buffer;            // Node.js (PDF/GIF), returned whether or not outputPath is set
  filePaths?: string[];       // Node.js (images)
  blob?: Blob;                // Browser (PDF/GIF)
  files?: File[];             // Browser (images)
  metadata: {
    totalFrames: number;
    extractedFrames: number;
    duration: number;         // Seconds
    dimensions: { width: number; height: number };  // As displayed (rotation applied)
    fps?: number;
    format?: string;          // Container format (Node.js)
  };
}
```

## Examples

### Example 1: Video to PDF (Multiple Frames Per Page)

```javascript
const result = await convertVideo('./video.mp4', {
  extractionMode: 'time',
  timeInterval: 2,              // Extract frame every 2 seconds
  outputFormat: 'pdf',
  framesPerPage: 4,             // 2x2 grid
  pdfLayout: 'landscape',
  pageSize: 'A4'
});
```

### Example 2: Video to GIF Animation

```javascript
const result = await convertVideo('./video.mp4', {
  extractionMode: 'frames',
  framesCount: 30,
  outputFormat: 'gif',
  gifFps: 15,
  gifQuality: 90,
  width: 640,                   // Resize to 640px width
  maintainAspectRatio: true
});
```

### Example 3: Extract Image Sequence

```javascript
const result = await convertVideo('./video.mp4', {
  extractionMode: 'interval',
  frameInterval: 30,            // Every 30th frame
  outputFormat: 'images',
  imageFormat: 'jpeg',
  imageQuality: 85,
  imagePrefix: 'scene_'
});
```

### Example 4: Extract Key Moments

```javascript
const result = await convertVideo('./video.mp4', {
  extractionMode: 'frames',
  framesCount: 12,
  outputFormat: 'pdf',
  framesPerPage: 6,
  pdfLayout: 'portrait',
  pageSize: 'Letter'
});
```

### Example 5: Browser with Progress Bar

```javascript
const progressBar = document.getElementById('progress');

const result = await WhyConverter(videoFile, {
  extractionMode: 'frames',
  framesCount: 20,
  outputFormat: 'pdf',
  onProgress: (progress) => {
    progressBar.style.width = `${progress}%`;
  }
});

// Download result
const url = URL.createObjectURL(result.blob);
const a = document.createElement('a');
a.href = url;
a.download = 'output.pdf';
a.click();
```

### Example 6: Keep the Output in Memory (Node.js)

```javascript
const result = await convertVideo('./video.mp4', {
  framesCount: 8,
  outputFormat: 'gif'           // No outputPath, so nothing is written to disk
});

if (result.success) {
  await uploadSomewhere(result.buffer);
}
```

## Use Cases

- **Video Documentation**: Create PDF reports from video content
- **Educational Materials**: Extract key frames for study guides
- **Storyboarding**: Generate storyboards from video footage
- **Thumbnails**: Extract preview images from videos
- **Video Analysis**: Create visual timelines of video content
- **Animation**: Convert video clips to GIF animations
- **Frame Extraction**: Batch extract frames for processing

## Requirements

### Node.js
- Node.js >= 18
- `ffmpeg` and `ffprobe` (installed automatically via optional dependencies, or from your system)

### Browser
- Modern browser with:
  - HTML5 Video API
  - Canvas API
  - Blob/File API
  - `requestVideoFrameCallback` for measuring frame rates in `'interval'` mode (30 fps is assumed without it)
  - Supports: Chrome, Firefox, Safari, Edge

## Advanced Configuration

### Custom Page Sizes

```javascript
const result = await convertVideo('./video.mp4', {
  outputFormat: 'pdf',
  pageSize: [800, 1200],        // Custom size in points
  framesPerPage: 1
});
```

### Custom Dimensions

```javascript
const result = await convertVideo('./video.mp4', {
  width: 1920,
  height: 1080,
  maintainAspectRatio: false    // Force exact dimensions
});
```

### All Callbacks

```javascript
const result = await convertVideo('./video.mp4', {
  extractionMode: 'frames',
  framesCount: 10,
  outputFormat: 'pdf',
  onProgress: (progress) => {
    console.log(`Progress: ${progress.toFixed(2)}%`);
  },
  onComplete: (result) => {
    console.log('Complete!', result.metadata);
  },
  onError: (error) => {
    console.error('Failed:', error.message);
  }
});
```

## Troubleshooting

### FFmpeg Not Found (Node.js)

The binaries are looked up in this order:

1. The `FFMPEG_PATH` and `FFPROBE_PATH` environment variables
2. The optional `ffmpeg-static` and `@ffprobe-installer/ffprobe` packages
3. `ffmpeg` and `ffprobe` on your `PATH`

The optional packages fetch or set up their binaries in install scripts. If your package manager skips install scripts (for example pnpm, until you run `pnpm approve-builds`), or you installed with `--omit=optional`, either allow those scripts or install ffmpeg on your system, which includes ffprobe.

### Browser Memory Issues

For large videos, reduce the number of frames extracted:

```javascript
const result = await convertVideo(videoFile, {
  extractionMode: 'frames',
  framesCount: 10,              // Fewer frames
  width: 640                    // Smaller dimensions
});
```

### CORS Issues in Browser

Ensure your video files are served with proper CORS headers if loading from external URLs.

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import { convertVideo, ConversionOptions, ConversionResult } from 'why-converter';

const options: ConversionOptions = {
  extractionMode: 'frames',
  framesCount: 10,
  outputFormat: 'pdf'
};

const result: ConversionResult = await convertVideo('./video.mp4', options);
```

## Development

```bash
npm install
npm test                 # Unit and Node.js integration tests (uses the bundled ffmpeg)
npm run test:browser     # Builds the browser bundle and tests it in Chromium with Playwright
npm run test:package     # Builds the package and checks its entry points and types
npm run build            # Builds dist/node and dist/browser
```

The browser tests need Playwright's Chromium: `npx playwright install chromium`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) - FFmpeg wrapper for Node.js
- [PDFKit](https://pdfkit.org/) - PDF generation for Node.js
- [jsPDF](https://github.com/parallax/jsPDF) - PDF generation for browsers
- [gifenc](https://github.com/mattdesl/gifenc) - GIF encoding for Node.js and browsers
- [pngjs](https://github.com/pngjs/pngjs) - PNG decoding for Node.js

## 🔗 Links

- [GitHub Repository](https://github.com/REllwood/why-converter)
- [NPM Package](https://www.npmjs.com/package/why-converter)
- [Issue Tracker](https://github.com/REllwood/why-converter/issues)

---

Made with ❤️ by Ya boi

