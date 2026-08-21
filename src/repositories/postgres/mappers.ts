import type { AlertSeverity, AlertStatus, AlertType } from "@/domain/alert";
import type { DeviceStatus, DeviceType } from "@/domain/device";
import type { TankState } from "@/domain/tank-state";
import type { Alert, Device, Tank, TankReading } from "@/types";

export interface TankRow {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DeviceRow {
  id: string;
  device_id: string;
  name: string;
  type: string;
  status: string;
  last_seen: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ReadingRow {
  id: string;
  tank_id: string;
  device_id: string;
  low: boolean;
  high: boolean;
  state: string;
  timestamp: Date;
}

export interface AlertRow {
  id: string;
  tank_id: string;
  device_id: string | null;
  type: string;
  severity: string;
  message: string;
  status: string;
  created_at: Date;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
}

export const toTank = (row: TankRow): Tank => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toDevice = (row: DeviceRow): Device => ({
  id: row.id,
  deviceId: row.device_id,
  name: row.name,
  type: row.type as DeviceType,
  status: row.status as DeviceStatus,
  lastSeen: row.last_seen,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toReading = (row: ReadingRow): TankReading => ({
  id: row.id,
  tankId: row.tank_id,
  deviceId: row.device_id,
  low: row.low,
  high: row.high,
  state: row.state as TankState,
  timestamp: row.timestamp,
});

export const toAlert = (row: AlertRow): Alert => ({
  id: row.id,
  tankId: row.tank_id,
  deviceId: row.device_id,
  type: row.type as AlertType,
  severity: row.severity as AlertSeverity,
  message: row.message,
  status: row.status as AlertStatus,
  createdAt: row.created_at,
  acknowledgedAt: row.acknowledged_at,
  resolvedAt: row.resolved_at,
});
