import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 5000 });

async function waitForDatabase(attempts = 20) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await pool.query("select 1");
      return;
    } catch (error) {
      console.log(`  database not ready (${attempt}/${attempts})`);
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

async function main() {
  try {
    await waitForDatabase();
    await migrate(drizzle(pool), {
      migrationsFolder: process.env.MIGRATIONS_FOLDER ?? "./drizzle",
    });
    console.log("✓ migrations complete");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("migration failed", error);
  process.exit(1);
});
