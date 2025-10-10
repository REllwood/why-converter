declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    repeat?: number;
    workerScript?: string;
  }

  interface FrameOptions {
    delay?: number;
    copy?: boolean;
  }

  class GIF {
    constructor(options: GIFOptions);
    addFrame(canvas: HTMLCanvasElement | CanvasRenderingContext2D, options?: FrameOptions): void;
    render(): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    on(event: 'progress', callback: (progress: number) => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
  }

  export = GIF;
}

