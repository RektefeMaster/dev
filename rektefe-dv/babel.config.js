module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@/shared': '../shared'
          }
        }
      ],
      '@babel/plugin-transform-runtime',
      'react-native-reanimated/plugin'
    ]
  };
};
