/**
 * Aplica el esquema SQL a la base de datos configurada en DATABASE_URL.
 *   npm run db:migrate
 */
import { config } from "dotenv";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import path from "node:path";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL no esta definida. Copie .env.example a .env.local.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const sql = await readFile(path.join(process.cwd(), "src", "database", "schema.sql"), "utf8");

  await pool.query(sql);
  console.log("Esquema aplicado correctamente.");
  await pool.end();
}

main().catch((error) => {
  console.error("Fallo la migracion:", error);
  process.exit(1);
});
