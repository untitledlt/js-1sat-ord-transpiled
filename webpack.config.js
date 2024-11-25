const path = require('path');

module.exports = {
  entry: './src/index.ts', // Your library entry point
  output: {
    filename: 'library.bundle.js', // Output file name
    path: path.resolve(__dirname, 'dist'), // Output directory
    libraryTarget: 'commonjs2', // Generate CommonJS2 module
  },
  resolve: {
    extensions: ['.ts', '.js'], // Resolve TypeScript and JavaScript files
  },
  module: {
    rules: [
      {
        test: /\.ts$/, // Match .ts files
        exclude: /node_modules/,
        use: 'ts-loader', // Use ts-loader to transpile TypeScript
      },
    ],
  },
  mode: 'production',
  target: 'node', // Target Node.js environment
};
