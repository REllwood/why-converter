declare module 'gifencoder' {
  class GIFEncoder {
    constructor(width: number, height: number);
    start(): void;
    finish(): void;
    setDelay(ms: number): void;
    setRepeat(n: number): void;
    setQuality(quality: number): void;
    addFrame(ctx: any): void;
    out: {
      getData(): Uint8Array;
    };
  }
  export = GIFEncoder;
}

