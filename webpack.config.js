const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.browser.ts',
  output: {
    path: path.resolve(__dirname, 'dist/browser'),
    filename: 'index.js',
    library: {
      name: 'WhyConverter',
      type: 'umd',
      export: 'default'
    },
    globalObject: 'this'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      'fs': false,
      'path': false,
      'stream': false,
      'util': false,
      'buffer': false,
      'process': false
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
  externals: {
    'fluent-ffmpeg': 'fluent-ffmpeg',
    'ffmpeg-static': 'ffmpeg-static',
    'pdfkit': 'pdfkit'
  },
  target: 'web'
};

