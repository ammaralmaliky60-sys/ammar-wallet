import globals from 'globals';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const espree = require('espree');

/**
 * app/*.js are classic scripts that share one global scope (see index.html).
 * Every top-level declaration in one file is therefore a global for the others.
 * Unused/duplicate/ordering checks across files live in tests/app-structure.test.cjs.
 */
const appGlobals = {};
for (const file of readdirSync(new URL('./app/', import.meta.url))) {
  if (!file.endsWith('.js')) continue;
  const ast = espree.parse(readFileSync(new URL(`./app/${file}`, import.meta.url), 'utf8'), { ecmaVersion: 2023 });
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration') appGlobals[node.id.name] = 'writable';
    if (node.type === 'VariableDeclaration') for (const d of node.declarations) appGlobals[d.id.name] = 'writable';
  }
}

const correctness = {
  'no-undef': 'error',
  'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
  'no-redeclare': ['error', { builtinGlobals: false }],
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
};

export default [
  { ignores: ['node_modules/**'] },
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: { ...globals.browser, ...globals.node } },
    rules: correctness
  },
  {
    files: ['app/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...appGlobals } },
    rules: { 'no-unused-vars': ['error', { vars: 'local', args: 'none', caughtErrors: 'none' }] }
  },
  {
    files: ['sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } }
  }
];
