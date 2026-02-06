const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Optimize for faster bundling and smaller bundle size
config.resolver.assetExts.push(
  // Add any additional asset extensions if needed
);

config.transformer.minifierConfig = {
  keep_fnames: false,
  mangle: {
    keep_fnames: false,
  },
  compress: {
    drop_console: true, // Remove console logs in production
    drop_debugger: true,
    pure_funcs: ['console.log'],
  },
};

// Enable source maps for debugging (disable in production)
config.transformer.enableBabelRuntimes = false;

module.exports = config;
