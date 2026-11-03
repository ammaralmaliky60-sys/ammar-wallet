import globals from 'globals';

/**
 * Correctness-focused rules for the dependency-free code.
 * src/core/*.js are UMD modules (browser globals + Node require for tests);
 * src/app/*.js attach everything to the single `WR` namespace.
 */
const correctness = {
  'no-undef': 'error',
  'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
  'no-redeclare': 'error',
  'no-dupe-keys': 'error',
  'no-duplicate-case': 'error',
  'no-dupe-else-if': 'error',
  'no-unreachable': 'error',
  'no-self-assign': 'error',
  'no-func-assign': 'error',
  'no-unsafe-finally': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
  'no-eval': 'error',
  'no-implicit-globals': 'error'
};

export default [
  { ignores: ['node_modules/**'] },
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: { ...globals.browser, ...globals.node } },
    rules: correctness
  },
  {
    files: ['src/app/**/*.js'],
    languageOptions: { globals: { ...globals.browser, WRFormat: 'readonly', WRLedger: 'readonly', WRMigrate: 'readonly', ThukhrPDF: 'readonly' } }
  },
  {
    files: ['tests/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' }
  },
  {
    files: ['sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } }
  }
];
