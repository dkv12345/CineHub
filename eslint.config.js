import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'data/raw/**',
      'data/seed/**',
      'docs/**',
      'tools/**',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  {
    files: ['apps/web/**/*.{js,jsx,ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@cinehub/db', '@cinehub/db/*'],
              message:
                'Presentation tier (apps/web) must not access database tier (@cinehub/db) directly.',
            },
            {
              group: [
                '@cinehub/core-api',
                '@cinehub/core-api/*',
                '@cinehub/aggregator',
                '@cinehub/aggregator/*',
              ],
              message:
                'Presentation tier (apps/web) must not import internal backend services directly.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/**/*.{js,mjs,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@cinehub/web', '@cinehub/core-api', '@cinehub/aggregator'],
              message: 'Shared packages must not import from higher-level apps or services.',
            },
          ],
        },
      ],
    },
  },
);
