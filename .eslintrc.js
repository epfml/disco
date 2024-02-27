// @ts-check

module.exports = {
  root: true,
  extends: "standard-with-typescript",
  parserOptions: {
    project: "./tsconfig.eslint.json",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ["**/dist/", "*.d.ts"],
  env: {
    mocha: true,
  },
};
