import { z } from "zod";

/**
 * Contrato de entrada del ESP8266.
 *
 * `low` y `high` son el significado LOGICO del sensor (true = el agua alcanza
 * ese sensor). La conversion desde el nivel electrico del pin la realiza el
 * firmware, ver src/config/sensors.ts.
 *
 * `timestamp` es opcional: si el dispositivo no tiene hora sincronizada por NTP,
 * el backend usa la hora de recepcion.
 */
export const readingPayloadSchema = z.object({
  deviceId: z.string().min(1).max(128),
  low: z.boolean(),
  high: z.boolean(),
  timestamp: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "timestamp debe ser una fecha ISO-8601 valida",
    })
    .optional(),
});

export type ReadingPayloadInput = z.infer<typeof readingPayloadSchema>;

export const historyRangeSchema = z.enum(["1h", "6h", "24h", "7d"]).default("1h");

export const alertStatusFilterSchema = z
  .enum(["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "OPEN", "ALL"])
  .default("OPEN");

/** Milisegundos que abarca cada rango del historial. */
export const RANGE_MS: Record<z.infer<typeof historyRangeSchema>, number> = {
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

export const RANGE_LABEL: Record<z.infer<typeof historyRangeSchema>, string> = {
  "1h": "Ultima hora",
  "6h": "Ultimas 6 horas",
  "24h": "Ultimas 24 horas",
  "7d": "Ultimos 7 dias",
};
