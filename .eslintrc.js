const tsRecommended = require('@typescript-eslint/eslint-plugin/dist/configs/recommended');

module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'prettier',
    'prettier/@typescript-eslint',
  ],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
  },

  overrides: [
    {
      ...tsRecommended,
      files: [
        '**/*.ts',
        '**/*.tsx',
      ],
      rules: {
        ...tsRecommended.rules,
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      }
    }
  ]
}
