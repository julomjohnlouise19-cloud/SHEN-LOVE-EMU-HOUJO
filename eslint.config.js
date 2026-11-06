import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['public/sw.js'], languageOptions: { globals: { self: 'readonly', caches: 'readonly', URL: 'readonly', fetch: 'readonly', Response: 'readonly' } } },
  { files: ['**/*.ts'], rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'no-restricted-syntax': ['error', { selector: "AssignmentExpression[left.property.name='innerHTML']", message: 'Use safe DOM helpers; only ui/svg.ts accepts vetted static SVG.' }]
  } },
  { files: ['src/ui/svg.ts'], rules: { 'no-restricted-syntax': 'off' } },
  { files: ['src/core/**/*.ts'], rules: { 'no-restricted-syntax': ['error',
    { selector: "MemberExpression[object.name='Date'][property.name='now']", message: 'Inject Clock.' },
    { selector: "MemberExpression[object.name='Math'][property.name='random']", message: 'Inject RNG.' },
    { selector: "Identifier[name=/^(window|document|localStorage|sessionStorage|navigator)$/]", message: 'Pure core must not access the DOM or persistence.' }
  ] } }
);
