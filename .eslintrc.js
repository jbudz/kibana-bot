module.exports = {
  parser: '@typescript-eslint/parser',
  overrides: [
    {
      files: ['**/*.ts'],
      extends: [
        'prettier',
        'plugin:@typescript-eslint/recommended',
        'prettier/@typescript-eslint',
      ],
      plugins: ['prettier'],
      rules: {
        'prettier/prettier': 'error',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/camelcase': [
          'error',
          {
            properties: 'never',
          },
        ],
      },
    },
  ],
}
