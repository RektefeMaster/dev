const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Shared klasörünü watchFolders'a ekle
config.watchFolders = [
  path.resolve(__dirname, '../shared'),
];

// Resolver ayarları
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../shared'),
];

// Alias mapping ekle
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@shared': path.resolve(__dirname, 'src/shared'),
  '@features': path.resolve(__dirname, 'src/features'),
};

// Ensure that all platforms are included
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;