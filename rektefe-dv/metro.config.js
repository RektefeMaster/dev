const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Shared klasörünü watchFolders'a ekle
config.watchFolders = [
  path.resolve(__dirname, '../shared'),
];

// Resolver ayarları - nodeModulesPaths'i düzelt
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Babel runtime için resolver ayarları
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Babel runtime için alias ayarları - sadece gerekli olanları bırak
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
};

module.exports = config;
