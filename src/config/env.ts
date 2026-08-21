/**
 * Lectura centralizada de variables de entorno del lado servidor.
 * Ningun otro modulo debe leer process.env directamente.
 */

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

export const serverEnv = {
  /** Cadena de conexion a PostgreSQL. Si falta, se usa el repositorio en memoria. */
  databaseUrl: process.env.DATABASE_URL?.trim() || null,

  /** Identificador logico del unico dispositivo del sistema. */
  deviceId: process.env.DEVICE_ID?.trim() || "ESP8266-TANQUE-001",

  /** Nombre legible del dispositivo. */
  deviceName: process.env.DEVICE_NAME?.trim() || "ESP8266 Tanque Principal",

  /** Segundos sin lecturas tras los cuales el dispositivo se considera OFFLINE. */
  deviceTimeoutSeconds: num(process.env.DEVICE_TIMEOUT_SECONDS, 60),

  /** Nombre del unico tanque monitoreado. */
  tankName: process.env.TANK_NAME?.trim() || "Tanque Principal",

  /** Minutos en NIVEL BAJO tras los cuales la alerta escala a CRITICAL. */
  lowLevelCriticalMinutes: num(process.env.LOW_LEVEL_CRITICAL_MINUTES, 15),

  /** Habilita el simulador de ESP8266 y sus endpoints de desarrollo. */
  mockEnabled: bool(process.env.MOCK_ESP8266_ENABLED, process.env.NODE_ENV !== "production"),

  /** Intervalo por defecto (ms) del simulador automatico. */
  mockIntervalMs: num(process.env.MOCK_ESP8266_INTERVAL_MS, 5000),

  /** Polaridad electrica de los sensores (ver src/config/sensors.ts). */
  sensorLowActiveLow: bool(process.env.SENSOR_LOW_ACTIVE_LOW, false),
  sensorHighActiveLow: bool(process.env.SENSOR_HIGH_ACTIVE_LOW, false),
} as const;

export type ServerEnv = typeof serverEnv;
