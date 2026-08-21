/**
 * Domain: alertas del sistema.
 */

export const ALERT_TYPES = [
  "LOW_LEVEL",
  "SENSOR_INCONSISTENCY",
  "DEVICE_OFFLINE",
] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_STATUSES = ["ACTIVE", "ACKNOWLEDGED", "RESOLVED"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export interface AlertTypeMeta {
  type: AlertType;
  title: string;
  emoji: string;
}

export const ALERT_TYPE_META: Record<AlertType, AlertTypeMeta> = {
  LOW_LEVEL: { type: "LOW_LEVEL", title: "NIVEL BAJO", emoji: "⚠️" },
  SENSOR_INCONSISTENCY: {
    type: "SENSOR_INCONSISTENCY",
    title: "ANOMALIA DE SENSOR",
    emoji: "🚨",
  },
  DEVICE_OFFLINE: { type: "DEVICE_OFFLINE", title: "DISPOSITIVO OFFLINE", emoji: "🔌" },
};

export function isAlertStatus(value: unknown): value is AlertStatus {
  return typeof value === "string" && (ALERT_STATUSES as readonly string[]).includes(value);
}

/** Una alerta se considera "abierta" mientras no haya sido resuelta. */
export function isOpen(status: AlertStatus): boolean {
  return status !== "RESOLVED";
}
