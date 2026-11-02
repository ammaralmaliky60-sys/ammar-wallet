import globals from 'globals';

/** Correctness-focused lint rules for the dependency-free browser code. */
export default [
  { ignores: ['node_modules/**'] },
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
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
      'no-eval': 'error'
    }
  },
  {
    files: ['sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } }
  },
  {
    // Tests evaluate slices of app.js on purpose.
    files: ['tests/**'],
    rules: { 'no-new-func': 'off' }
  }
];
