// @ts-check

module.exports = {
  root: true,
  extends: 'standard-with-typescript',
  parserOptions: {
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname
  },
  ignorePatterns: ['**/dist/'],
  env: { node: true },
  overrides: [
    {
      extends: ['plugin:@typescript-eslint/disable-type-checked'],
      files: ['*.js']
    }
  ]
}
