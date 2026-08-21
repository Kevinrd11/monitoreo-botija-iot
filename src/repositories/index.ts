import { isDatabaseConfigured } from "@/database/pool";
import { createMemoryRepositories } from "@/repositories/memory";
import { getSharedMemoryStore } from "@/repositories/memory/store";
import { postgresAlertRepository } from "@/repositories/postgres/alert.repository";
import { postgresDeviceRepository } from "@/repositories/postgres/device.repository";
import { postgresReadingRepository } from "@/repositories/postgres/reading.repository";
import { postgresTankRepository } from "@/repositories/postgres/tank.repository";
import type { Repositories } from "@/repositories/types";

/**
 * Punto unico de acceso a la capa de persistencia.
 *
 * Selecciona la implementacion PostgreSQL cuando DATABASE_URL esta definida y
 * cae a un almacen en memoria en caso contrario, de modo que el dashboard y el
 * simulador funcionen aun sin base de datos (los datos no persisten).
 */
const postgresRepositories: Repositories = {
  tanks: postgresTankRepository,
  devices: postgresDeviceRepository,
  readings: postgresReadingRepository,
  alerts: postgresAlertRepository,
  driver: "postgres",
};

declare global {
  var __tanqueMemoryRepositories: Repositories | undefined;
}

export function getRepositories(): Repositories {
  if (isDatabaseConfigured()) return postgresRepositories;
  globalThis.__tanqueMemoryRepositories ??= createMemoryRepositories(getSharedMemoryStore());
  return globalThis.__tanqueMemoryRepositories;
}

export type { Repositories } from "@/repositories/types";
