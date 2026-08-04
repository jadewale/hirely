// Shared flat ESLint config for the career-* NestJS apps.
//
// Mirrors apps/api's hand-rolled config so the new app lints identically, but
// centralizes it here so every career NestJS surface stays consistent. The
// consuming app passes its own directory so type-checked rules resolve the
// right tsconfig.
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * @param {string} tsconfigRootDir - the consuming app's directory
 *   (pass `import.meta.dirname`).
 * @returns the flat config array for a NestJS app.
 */
export function nestConfig(tsconfigRootDir) {
  return tseslint.config(
    { ignores: ['eslint.config.mjs', 'dist', 'coverage'] },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
      languageOptions: {
        globals: {
          ...globals.node,
          ...globals.jest,
        },
        sourceType: 'commonjs',
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
    },
    {
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
        'prettier/prettier': ['error', { endOfLine: 'auto' }],
      },
    },
  );
}
