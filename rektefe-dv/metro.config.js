const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Shared klasörünü watchFolders'a ekle
config.watchFolders = [
  path.resolve(__dirname, '..'),
];

// Workspace için resolver ayarları
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
];

// Extra node modules - shared klasörünü alias olarak ekle
config.resolver.alias = {
  '@shared': path.resolve(__dirname, '../shared'),
};

module.exports = config;
