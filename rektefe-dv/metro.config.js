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

module.exports = config;
