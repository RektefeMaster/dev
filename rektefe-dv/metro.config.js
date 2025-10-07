const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Shared klasörünü watchFolders'a ekle
config.watchFolders = [
  path.resolve(__dirname, '../shared'),
];

// Workspace için resolver ayarları
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'), // Workspace hoisted packages
  path.resolve(__dirname, '../shared'),
];

// Workspace paketlerini çözümleme
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
