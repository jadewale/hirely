import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Glob picks up every domain file under src/schema/. New domains drop in as
  // src/schema/<domain>.ts with no config change required.
  schema: './src/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
