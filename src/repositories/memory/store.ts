import type { Alert, Device, Tank, TankReading } from "@/types";

/**
 * Almacen en memoria.
 *
 * Se usa en dos situaciones:
 *   1. Tests unitarios (aislados, sin PostgreSQL).
 *   2. Ejecucion sin DATABASE_URL, para que el dashboard arranque igualmente.
 *      Los datos se pierden al reiniciar el proceso.
 */
export interface MemoryStore {
  tanks: Tank[];
  devices: Device[];
  readings: TankReading[];
  alerts: Alert[];
}

export function createMemoryStore(): MemoryStore {
  return { tanks: [], devices: [], readings: [], alerts: [] };
}

declare global {
  var __tanqueMemoryStore: MemoryStore | undefined;
}

/** Instancia compartida por el proceso (sobrevive al hot-reload de Next.js). */
export function getSharedMemoryStore(): MemoryStore {
  globalThis.__tanqueMemoryStore ??= createMemoryStore();
  return globalThis.__tanqueMemoryStore;
}

export function newId(): string {
  return globalThis.crypto.randomUUID();
}
