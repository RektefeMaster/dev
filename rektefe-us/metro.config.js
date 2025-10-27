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
config.resolver = {
  ...config.resolver,
  alias: {
    '@': path.resolve(__dirname, 'src'),
    '@/shared': path.resolve(__dirname, 'src/shared'),
    '@shared': path.resolve(__dirname, 'src/shared'),
    '@features': path.resolve(__dirname, 'src/features'),
    '@/context': path.resolve(__dirname, 'src/shared/context'),
    '@/theme': path.resolve(__dirname, 'src/shared/theme'),
  },
};

// Ensure that all platforms are included
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;