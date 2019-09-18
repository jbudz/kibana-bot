module.exports = {
  babelrc: false,
  sourceType: 'module',
  presets: [
    '@babel/preset-typescript',
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
        useBuiltIns: 'entry',
        corejs: { version: 3 },
      },
    ],
  ],
  plugins: ['@babel/plugin-proposal-class-properties'],
}
