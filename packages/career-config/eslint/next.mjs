// Shared flat ESLint config for the career-* Next.js app.
//
// Mirrors apps/web's config (eslint-config-next core-web-vitals + typescript)
// so the new web app lints identically.
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export const nextConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
