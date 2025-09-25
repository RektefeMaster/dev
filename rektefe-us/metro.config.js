const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure that all platforms are included
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add support for additional file extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;
