const path = require('path');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: [path.resolve(__dirname, 'src')],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': path.resolve(__dirname, 'src'),
            '@/shared': path.resolve(__dirname, 'src/shared'),
            '@shared': path.resolve(__dirname, 'src/shared'),
            '@features': path.resolve(__dirname, 'src/features'),
            '@/context': path.resolve(__dirname, 'src/shared/context'),
            '@/theme': path.resolve(__dirname, 'src/shared/theme'),
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
