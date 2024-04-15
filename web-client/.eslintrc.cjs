/* eslint-env node */

module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  overrides: [
    {
      files: [
        'cypress/e2e/**/*.{cy,spec}.{js,ts,jsx,tsx}',
        'cypress/support/**/*.{js,ts,jsx,tsx}'
      ],
      extends: [
        'plugin:cypress/recommended'
      ]
    }
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    // taken from root eslint
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }
    ],
    // TODO fix instead of ignoring
    'vue/multi-word-component-names': ['error', {
      ignores: [
        'Bezier2',
        'Bin',
        'Clock',
        'Contact',
        'Data',
        'Description',
        'Disco',
        'Download',
        'Features',
        'File',
        'Finished',
        'Forward',
        'Further',
        'Home',
        'Information',
        'Landing',
        'Model',
        'People',
        'Performances',
        'Settings',
        'Tasks',
        'Tester',
        'Testing',
        'Timer',
        'Trainer',
        'Training',
        'Tutorial',
        'Upload'
      ]
    }]
  },
  ignorePatterns: ['dist/**']
}
