/**
 * Domain: estado de comunicacion del dispositivo (ESP8266).
 */

export const DEVICE_STATUSES = ["ONLINE", "OFFLINE", "UNKNOWN"] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export const DEVICE_TYPES = ["ESP8266"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export interface DeviceStatusMeta {
  status: DeviceStatus;
  label: string;
  emoji: string;
  message: string;
}

export const DEVICE_STATUS_META: Record<DeviceStatus, DeviceStatusMeta> = {
  ONLINE: {
    status: "ONLINE",
    label: "ONLINE",
    emoji: "🟢",
    message: "La reserva está supervisada: el dispositivo envía lecturas con normalidad.",
  },
  OFFLINE: {
    status: "OFFLINE",
    label: "OFFLINE",
    emoji: "🔴",
    message: "Sin datos del dispositivo: la reserva de agua está sin supervisión.",
  },
  UNKNOWN: {
    status: "UNKNOWN",
    label: "SIN DATOS",
    emoji: "⚪",
    message: "Todavía no se ha recibido ninguna lectura de este dispositivo.",
  },
};

/**
 * Deriva el estado de comunicacion a partir de la ultima lectura recibida.
 * Es una funcion pura: la "hora actual" se inyecta para poder testearla.
 */
export function deriveDeviceStatus(
  lastSeen: Date | null,
  timeoutSeconds: number,
  now: Date = new Date(),
): DeviceStatus {
  if (!lastSeen) return "UNKNOWN";
  const elapsedSeconds = (now.getTime() - lastSeen.getTime()) / 1000;
  return elapsedSeconds <= timeoutSeconds ? "ONLINE" : "OFFLINE";
}

export function secondsSince(lastSeen: Date | null, now: Date = new Date()): number | null {
  if (!lastSeen) return null;
  return Math.max(0, Math.floor((now.getTime() - lastSeen.getTime()) / 1000));
}
