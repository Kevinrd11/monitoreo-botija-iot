import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPool } from "@/database/pool";

/** Aplica src/database/schema.sql (idempotente). */
export async function runMigrations(): Promise<void> {
  const schemaPath = path.join(process.cwd(), "src", "database", "schema.sql");
  const sql = await readFile(schemaPath, "utf8");
  await getPool().query(sql);
}
