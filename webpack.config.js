const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.umd.ts',
  output: {
    path: path.resolve(__dirname, 'dist/browser'),
    filename: 'index.js',
    // Keep everything in index.js so a single script tag or file is enough
    asyncChunks: false,
    library: {
      name: 'WhyConverter',
      type: 'umd',
      export: 'default'
    },
    globalObject: 'this'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      // jsPDF loads these lazily for HTML and SVG rendering, which this library
      // never uses; without them the bundle is one file instead of four
      html2canvas: false,
      dompurify: false,
      canvg: false
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.browser.json'
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  performance: {
    // The bundle is a library whose size is mostly jsPDF, not an app entry point
    hints: false
  },
  target: 'web'
};
