const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Monorepo setup için paths
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// EXPO_USE_METRO_WORKSPACE_ROOT=1 kullanırken gerekli
config.projectRoot = projectRoot;
config.watchFolders = [workspaceRoot];

// Workspace için resolver ayarları
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Extra node modules - shared klasörünü alias olarak ekle
config.resolver.alias = {
  '@shared': path.resolve(workspaceRoot, 'shared'),
};

module.exports = config;
