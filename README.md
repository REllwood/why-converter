# Why Converter

**"Why would you ever use this?"**

A powerful, universal JavaScript library for converting videos to PDF, GIF, or image sequences.

## Features

- **Multiple Output Formats**: PDF, GIF, or image sequences (PNG, JPEG, WebP)
- **Flexible Frame Extraction**: Extract by frame count, frame interval, or time interval
- **PDF Layouts**: Customise frames per page, page size, and orientation
- **Quality Control**: Adjust compression, dimensions, and quality settings
- **Universal**: Works in both Node.js and browser environments
- **Zero Config**: Sensible defaults with extensive customization options
- **Progress Tracking**: Monitor conversion progress with callbacks
- **Format Support**: MP4, WebM, MOV, AVI, MKV (Node.js) | MP4, WebM, OGG (Browser)

## Installation

```bash
npm install why-converter
```

For Node.js usage, you'll also need ffmpeg installed on your system, or use the optional `ffmpeg-static` package:

```bash
npm install why-converter ffmpeg-static
```

## Quick Start

### Node.js

```javascript
const { convertVideo } = require('why-converter');

// Convert video to PDF
const result = await convertVideo('./video.mp4', {
  extractionMode: 'frames',
  framesCount: 10,
  outputFormat: 'pdf',
  outputPath: './output.pdf',
  onProgress: (progress) => console.log(`${progress}%`)
});

console.log('Success!', result);
```

### Browser

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
  - File path (Node.js) or File/Blob object (Browser)

- **options**: `ConversionOptions` object with the following properties:

#### Frame Extraction Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `extractionMode` | `'frames' \| 'interval' \| 'time'` | `'frames'` | Frame extraction mode |
| `framesCount` | `number` | `10` | Number of frames to extract (mode: 'frames') |
| `frameInterval` | `number` | - | Extract every Nth frame (mode: 'interval') |
| `timeInterval` | `number` | - | Extract frame every N seconds (mode: 'time') |

#### Output Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputFormat` | `'pdf' \| 'gif' \| 'images'` | `'pdf'` | Output format |
| `outputPath` | `string` | - | Output file path (Node.js only) |

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
| `gifRepeat` | `number` | `0` | Loop count (0 = infinite) |

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
| `compression` | `number` | `80` | Compression level (0-100) |

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
  outputPath?: string;        // Node.js
  blob?: Blob;                // Browser (PDF/GIF)
  files?: File[];             // Browser (images)
  metadata: {
    totalFrames: number;
    extractedFrames: number;
    duration: number;
    dimensions: { width: number; height: number };
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

const result = await VideoFrameConverter(videoFile, {
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
- Node.js >= 14.0.0
- FFmpeg (installed globally or via `ffmpeg-static` package)

### Browser
- Modern browser with:
  - HTML5 Video API
  - Canvas API
  - Blob/File API
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

Install ffmpeg globally or use `ffmpeg-static`:

```bash
npm install ffmpeg-static
```

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) - FFmpeg wrapper for Node.js
- [PDFKit](https://pdfkit.org/) - PDF generation for Node.js
- [jsPDF](https://github.com/parallax/jsPDF) - PDF generation for browsers
- [gifencoder](https://github.com/eugeneware/gifencoder) - GIF encoding for Node.js
- [gif.js](https://github.com/jnordberg/gif.js) - GIF encoding for browsers

## 🔗 Links

- [GitHub Repository](https://github.com/yourusername/why-converter)
- [NPM Package](https://www.npmjs.com/package/why-converter)
- [Issue Tracker](https://github.com/yourusername/why-converter/issues)

---

Made with ❤️ by Ya boi

