/**
 * Domain: riesgo de desabastecimiento.
 *
 * Este es el proposito del sistema. El estado del tanque (LOW / MEDIUM / FULL /
 * ANOMALY) es el dato crudo; lo que le importa al encargado de la finca es si
 * se va a quedar sin agua y con cuanta antelacion puede reaccionar.
 *
 * LIMITE HONESTO DEL SISTEMA
 * Con dos sensores digitales NO se puede calcular cuanto tiempo queda de agua:
 * eso exigiria medir caudal o volumen. Por eso aqui no existe ninguna
 * "autonomia restante" ni una estimacion de horas. El riesgo se deriva
 * unicamente de hechos observados: el estado actual, cuanto lleva en el, y si
 * la reserva sube o baja.
 */

import type { DeviceStatus } from "./device";
import { TANK_STATE_META, type TankState } from "./tank-state";

/* ------------------------------------------------------------------ */
/* Nivel de riesgo                                                     */
/* ------------------------------------------------------------------ */

export const SUPPLY_RISKS = ["SECURE", "WATCH", "CRITICAL", "UNKNOWN"] as const;
export type SupplyRisk = (typeof SUPPLY_RISKS)[number];

export interface SupplyRiskMeta {
  risk: SupplyRisk;
  label: string;
  headline: string;
  emoji: string;
  tone: "ok" | "warning" | "critical" | "anomaly" | "idle";
}

export const SUPPLY_RISK_META: Record<SupplyRisk, SupplyRiskMeta> = {
  SECURE: {
    risk: "SECURE",
    label: "SIN RIESGO",
    headline: "Abastecimiento asegurado",
    emoji: "🟢",
    tone: "ok",
  },
  WATCH: {
    risk: "WATCH",
    label: "VIGILANCIA",
    headline: "Reserva por debajo del nivel de seguridad",
    emoji: "🟡",
    tone: "warning",
  },
  CRITICAL: {
    risk: "CRITICAL",
    label: "RIESGO DE DESABASTECIMIENTO",
    headline: "La finca puede quedarse sin agua",
    emoji: "🔴",
    tone: "critical",
  },
  UNKNOWN: {
    risk: "UNKNOWN",
    label: "RIESGO NO EVALUABLE",
    headline: "El sistema no puede confirmar el estado de la reserva",
    emoji: "⚫",
    tone: "idle",
  },
};

/**
 * Deriva el riesgo de desabastecimiento.
 *
 * El estado de comunicacion pesa tanto como el del tanque: si el dispositivo
 * lleva minutos sin reportar, la ultima lectura ya no describe la realidad y
 * afirmar "sin riesgo" seria enganoso.
 */
export function deriveSupplyRisk(
  state: TankState | null,
  deviceStatus: DeviceStatus,
): SupplyRisk {
  if (state === null || deviceStatus !== "ONLINE") return "UNKNOWN";

  switch (state) {
    case "LOW":
      return "CRITICAL";
    case "MEDIUM":
      return "WATCH";
    case "FULL":
      return "SECURE";
    case "ANOMALY":
      return "UNKNOWN";
  }
}

/* ------------------------------------------------------------------ */
/* Tendencia de la reserva                                             */
/* ------------------------------------------------------------------ */

export const SUPPLY_TRENDS = ["RISING", "FALLING", "STABLE", "UNKNOWN"] as const;
export type SupplyTrend = (typeof SUPPLY_TRENDS)[number];

export interface SupplyTrendMeta {
  trend: SupplyTrend;
  label: string;
  description: string;
}

export const SUPPLY_TREND_META: Record<SupplyTrend, SupplyTrendMeta> = {
  RISING: {
    trend: "RISING",
    label: "EN LLENADO",
    description: "La reserva subió respecto a la lectura anterior.",
  },
  FALLING: {
    trend: "FALLING",
    label: "EN DESCENSO",
    description: "La reserva bajó respecto a la lectura anterior.",
  },
  STABLE: {
    trend: "STABLE",
    label: "ESTABLE",
    description: "La reserva se mantiene en el mismo tramo.",
  },
  UNKNOWN: {
    trend: "UNKNOWN",
    label: "SIN DATOS",
    description: "Aún no hay lecturas suficientes para determinar la tendencia.",
  },
};

/**
 * Compara el estado actual con el ultimo estado distinto para saber si la
 * reserva sube o baja.
 *
 * Es una tendencia por TRAMOS, no una pendiente: con tres niveles discretos no
 * existe una velocidad de vaciado. Los estados de fallo no forman tendencia.
 */
export function deriveSupplyTrend(
  current: TankState | null,
  previousDistinct: TankState | null,
): SupplyTrend {
  if (!current || current === "ANOMALY") return "UNKNOWN";
  if (!previousDistinct || previousDistinct === "ANOMALY") return "STABLE";

  const now = TANK_STATE_META[current].chartValue;
  const before = TANK_STATE_META[previousDistinct].chartValue;

  if (now > before) return "RISING";
  if (now < before) return "FALLING";
  return "STABLE";
}
