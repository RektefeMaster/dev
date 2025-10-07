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

// Babel runtime için resolver ayarları
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Babel runtime için alias ayarları
config.resolver.alias = {
  '@babel/runtime': path.resolve(__dirname, 'node_modules/@babel/runtime'),
  '@': path.resolve(__dirname, 'src'),
  '@/shared': path.resolve(__dirname, '../shared'),
};

module.exports = config;
