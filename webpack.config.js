const path = require('path');

module.exports = {
  entry: './src/index.js', // Path to your ES module entry file
  output: {
    filename: 'es-module.bundle.js', // Output file name
    path: path.resolve(__dirname, 'dist'), // Output directory
    libraryTarget: 'commonjs2', // Output as CommonJS
  },
  module: {
    rules: [
      {
        test: /\.m?js$/, // Match .js or .mjs files
        exclude: /node_modules/, // Exclude node_modules
        use: {
          loader: 'babel-loader', // Use Babel to transpile
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    node: 'current', // Target the current Node.js version
                  },
                },
              ],
            ],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.mjs'], // Resolve .js and .mjs files
  },
  target: 'node', // Target Node.js environment
};
