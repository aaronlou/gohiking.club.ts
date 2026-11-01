import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";

try {
  loadEnvFile(".env");
} catch {
  // Docker and CI inject env directly.
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
