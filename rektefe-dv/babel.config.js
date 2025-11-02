const path = require('path');

module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.NODE_ENV === 'production';
  
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
            '@/components': path.resolve(__dirname, 'src/shared/components'),
            '@/context': path.resolve(__dirname, 'src/context'),
            '@/theme': path.resolve(__dirname, 'src/theme'),
            '@/constants': path.resolve(__dirname, 'src/constants'),
          }
        }
      ],
      // Production build'de console.log'ları kaldır (__DEV__ kontrolü ile optimize edilmiş loglar zaten çalışmayacak)
      ...(isProduction ? [
        ['transform-remove-console', { exclude: ['error', 'warn'] }]
      ] : []),
      'react-native-reanimated/plugin'
    ]
  };
};
