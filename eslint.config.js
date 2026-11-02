import js from '@eslint/js';
import nxPlugin from '@nx/eslint-plugin';
import angular from 'angular-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-angular/**',
      '**/.angular/**',
      '**/.nx/**',
      '**/out-tsc/**',
      '**/node_modules/**',
      'data/raw/**',
      'data/seed/**',
      'docs/**',
      'tools/**',
      'coverage/**',
      'libs/web/shared/data-access/src/lib/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      '@nx': nxPlugin,
    },
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
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: false,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:shell',
                'type:feature',
                'type:data-access',
                'type:ui',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:shell',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:data-access',
                'type:ui',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: ['type:data-access', 'type:ui', 'type:util'],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:util', 'scope:shared'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:util'],
            },
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util'],
            },
            {
              sourceTag: 'scope:web',
              onlyDependOnLibsWithTags: ['scope:web', 'scope:shared'],
            },
            {
              sourceTag: 'scope:server',
              onlyDependOnLibsWithTags: ['scope:server', 'scope:shared'],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{js,jsx,ts,tsx}', 'libs/web/**/*.{js,ts}'],
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
                'Presentation tier (web) must not access database tier (@cinehub/db) directly.',
            },
            {
              group: [
                '@cinehub/core-api',
                '@cinehub/core-api/*',
                '@cinehub/aggregator',
                '@cinehub/aggregator/*',
              ],
              message:
                'Presentation tier (web) must not import internal backend services directly.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/app/**/*.ts', 'libs/web/**/*.ts'],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'ch', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['ch', 'app'], style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['apps/web/src/app/**/*.html', 'libs/web/**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
  {
    files: ['apps/core-api/src/platform/**/*.{js,mjs}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../modules/**', '../../modules/**', '../../../modules/**'],
              message: 'Backend platform/ layer must never import from modules/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/core-api/src/modules/**/*.{js,mjs}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../*/*.controller.js',
                '../*/*.service.js',
                '../*/*.repository.js',
                '../*/*.routes.js',
                '../*/*.schema.js',
                '../*/*.nlp.js',
                '../*/*.session.js',
                '../*/*.vector.js',
              ],
              message:
                'Backend modules may only import another module through its public index.js entry point.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['libs/shared/**/*.{js,mjs,ts}', 'libs/db/**/*.{js,mjs,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@cinehub/web', '@cinehub/core-api', '@cinehub/aggregator'],
              message: 'Shared libraries must not import from higher-level apps or services.',
            },
          ],
        },
      ],
    },
  },
);
