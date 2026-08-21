/**
 * Borra todas las tablas y vuelve a aplicar el esquema.
 * DESTRUCTIVO: elimina lecturas, alertas, dispositivos y tanques.
 *   npm run db:reset
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
    console.error("DATABASE_URL no esta definida.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  await pool.query(
    "DROP TABLE IF EXISTS alerts, tank_readings, devices, tanks CASCADE;",
  );
  const sql = await readFile(path.join(process.cwd(), "src", "database", "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Base de datos reiniciada.");
  await pool.end();
}

main().catch((error) => {
  console.error("Fallo el reinicio:", error);
  process.exit(1);
});
