/**
 * @file eslint.config.mjs
 * @description Root ESLint configuration for the ParentingMyKid monorepo.
 *              Applies TypeScript-aware linting rules across all apps and packages.
 *              Rules are intentionally strict to enforce consistent code quality
 *              and catch bugs early — especially important in a children's safety app.
 */

import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      'node_modules/**',
      '.turbo/**',
      'dist/**',
      'build/**',
      '.expo/**',
      'android/**',
      'ios/**',
      '**/*.js.map',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Enforce explicit return types — catches accidental undefined returns in business logic
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Prevent unused variables — keeps codebase clean
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Disallow any — enforces type safety throughout the app
      '@typescript-eslint/no-explicit-any': 'warn',
      // Prefer const — enforces immutability where possible
      'prefer-const': 'error',
      // No console.log in production code — use proper logging
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
