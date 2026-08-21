import { Pool, type QueryResultRow } from "pg";
import { serverEnv } from "@/config/env";

/**
 * Pool de conexiones a PostgreSQL.
 *
 * Se guarda en globalThis para sobrevivir al hot-reload de Next.js en
 * desarrollo (de lo contrario cada recompilacion abriria un pool nuevo).
 */

declare global {
  var __tanquePgPool: Pool | undefined;
}

export function isDatabaseConfigured(): boolean {
  return serverEnv.databaseUrl !== null;
}

export function getPool(): Pool {
  if (!serverEnv.databaseUrl) {
    throw new Error(
      "DATABASE_URL no esta configurada. Copie .env.example a .env.local y defina la conexion.",
    );
  }

  if (!globalThis.__tanquePgPool) {
    globalThis.__tanquePgPool = new Pool({
      connectionString: serverEnv.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: /sslmode=require/.test(serverEnv.databaseUrl)
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }

  return globalThis.__tanquePgPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query(text, params as never[]);
  return result.rows as T[];
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
