import type { Alert, AlertDTO, ReadingDTO, TankReading } from "@/types";

export const toReadingDTO = (reading: TankReading): ReadingDTO => ({
  id: reading.id,
  tankId: reading.tankId,
  deviceId: reading.deviceId,
  low: reading.low,
  high: reading.high,
  state: reading.state,
  timestamp: reading.timestamp.toISOString(),
});

export const toAlertDTO = (alert: Alert): AlertDTO => ({
  id: alert.id,
  tankId: alert.tankId,
  deviceId: alert.deviceId,
  type: alert.type,
  severity: alert.severity,
  message: alert.message,
  status: alert.status,
  createdAt: alert.createdAt.toISOString(),
  acknowledgedAt: alert.acknowledgedAt ? alert.acknowledgedAt.toISOString() : null,
  resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
});
