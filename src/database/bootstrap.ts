import { serverEnv } from "@/config/env";
import { runMigrations } from "@/database/migrate";
import { isDatabaseConfigured } from "@/database/pool";
import { getRepositories } from "@/repositories";
import type { Repositories } from "@/repositories/types";
import type { Tank } from "@/types";

/**
 * Inicializacion perezosa del sistema:
 *   1. aplica el esquema SQL (idempotente) una sola vez por proceso,
 *   2. garantiza que existan el tanque unico y el dispositivo configurado.
 *
 * Es seguro invocarla en cada peticion: el trabajo real ocurre una vez por
 * conjunto de repositorios gracias a la promesa cacheada.
 */

declare global {
  var __tanqueMigrated: Promise<void> | undefined;
}

function ensureMigrated(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  globalThis.__tanqueMigrated ??= runMigrations().catch((error) => {
    // Permite reintentar si la base de datos aun no estaba disponible.
    globalThis.__tanqueMigrated = undefined;
    throw error;
  });
  return globalThis.__tanqueMigrated;
}

/** Cache por conjunto de repositorios (los tests usan almacenes aislados). */
const seeded = new WeakMap<Repositories, Promise<Tank>>();

async function seed(repos: Repositories): Promise<Tank> {
  await ensureMigrated();
  const tank = await repos.tanks.ensureDefault(
    serverEnv.tankName,
    "Tanque monitoreado por sensores digitales LOW y HIGH.",
  );
  await repos.devices.ensure({
    deviceId: serverEnv.deviceId,
    name: serverEnv.deviceName,
    type: "ESP8266",
    tankId: tank.id,
  });
  return tank;
}

export function ensureBootstrapped(
  repos: Repositories = getRepositories(),
): Promise<Tank> {
  let pending = seeded.get(repos);
  if (!pending) {
    pending = seed(repos).catch((error) => {
      seeded.delete(repos);
      throw error;
    });
    seeded.set(repos, pending);
  }
  return pending;
}

/** Tanque unico del sistema, ya inicializado. */
export function getDefaultTank(repos: Repositories = getRepositories()): Promise<Tank> {
  return ensureBootstrapped(repos);
}
