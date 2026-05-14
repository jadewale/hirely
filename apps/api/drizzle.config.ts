import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Glob picks up every domain file under src/db/schema/. New domains drop
  // in as src/db/schema/<domain>.ts with no config change required.
  schema: "./src/db/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
