import type { AlertSeverity, AlertStatus, AlertType } from "@/domain/alert";
import type { DeviceStatus, DeviceType } from "@/domain/device";
import type { TankState } from "@/domain/tank-state";

/* ------------------------------------------------------------------ */
/* Entidades persistidas                                               */
/* ------------------------------------------------------------------ */

export interface Tank {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Device {
  id: string;
  deviceId: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  lastSeen: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TankReading {
  id: string;
  tankId: string;
  deviceId: string;
  low: boolean;
  high: boolean;
  state: TankState;
  timestamp: Date;
}

export interface Alert {
  id: string;
  tankId: string;
  deviceId: string | null;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  createdAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
}

/* ------------------------------------------------------------------ */
/* DTOs de entrada                                                     */
/* ------------------------------------------------------------------ */

/** Payload aceptado en POST /api/tank/readings. */
export interface ReadingPayload {
  deviceId: string;
  low: boolean;
  high: boolean;
  timestamp?: string;
}

export interface CreateReadingInput {
  tankId: string;
  deviceId: string;
  low: boolean;
  high: boolean;
  state: TankState;
  timestamp: Date;
}

export interface CreateAlertInput {
  tankId: string;
  deviceId: string | null;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
}

/* ------------------------------------------------------------------ */
/* DTOs de salida (lo que consume el dashboard)                        */
/* ------------------------------------------------------------------ */

export interface TankStateSnapshot {
  state: TankState;
  label: string;
  shortLabel: string;
  message: string;
  emoji: string;
  fillRatio: number;
  tone: string;
}

export interface ReadingDTO {
  id: string;
  tankId: string;
  deviceId: string;
  low: boolean;
  high: boolean;
  state: TankState;
  timestamp: string;
}

export interface AlertDTO {
  id: string;
  tankId: string;
  deviceId: string | null;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

export interface DeviceStatusDTO {
  deviceId: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  statusLabel: string;
  statusEmoji: string;
  statusMessage: string;
  lastSeen: string | null;
  secondsSinceLastSeen: number | null;
  timeoutSeconds: number;
  lastLow: boolean | null;
  lastHigh: boolean | null;
}

/** Respuesta de GET /api/tank: todo lo que el dashboard necesita de una vez. */
export interface TankOverviewDTO {
  tank: {
    id: string;
    name: string;
    description: string | null;
  };
  state: TankStateSnapshot | null;
  latestReading: ReadingDTO | null;
  device: DeviceStatusDTO;
  activeAlerts: AlertDTO[];
  serverTime: string;
}

export type HistoryRange = "1h" | "6h" | "24h" | "7d";
