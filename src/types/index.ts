import type { AlertSeverity, AlertStatus, AlertType } from "@/domain/alert";
import type { DeviceStatus, DeviceType } from "@/domain/device";
import type { SupplyRisk, SupplyTrend } from "@/domain/supply";
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
  action: string;
  emoji: string;
  fillRatio: number;
  tone: string;
}

/**
 * Evaluacion del riesgo de desabastecimiento: el proposito del sistema.
 * No incluye ninguna estimacion de autonomia restante, porque dos sensores
 * digitales no aportan la informacion necesaria para calcularla.
 */
export interface SupplyAssessmentDTO {
  risk: SupplyRisk;
  riskLabel: string;
  riskHeadline: string;
  riskEmoji: string;
  riskTone: string;
  /** Accion recomendada al encargado. Vacio si no hay nada que hacer. */
  action: string;
  trend: SupplyTrend;
  trendLabel: string;
  trendDescription: string;
  /** Segundos que lleva la reserva en el estado actual. */
  secondsInState: number | null;
  stateSince: string | null;
  /** Ultima vez que la reserva estuvo completa. */
  lastFullAt: string | null;
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
  supply: SupplyAssessmentDTO;
  latestReading: ReadingDTO | null;
  device: DeviceStatusDTO;
  activeAlerts: AlertDTO[];
  serverTime: string;
  /**
   * Persistencia en uso. "memory" significa que el historial y los avisos no
   * sobreviven a un reinicio y pueden diferir entre instancias: la interfaz
   * debe advertirlo para que nadie confie en el panel como registro fiable.
   */
  storage: "postgres" | "memory";
}

export type HistoryRange = "1h" | "6h" | "24h" | "7d";
