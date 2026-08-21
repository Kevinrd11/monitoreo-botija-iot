/**
 * Domain: estado de la reserva de agua.
 *
 * El sistema NO mide volumen. Solo conoce el estado de dos sensores digitales
 * (LOW y HIGH) instalados en el tanque de reserva. De su combinacion se derivan
 * exactamente cuatro estados.
 *
 * Los identificadores (LOW / MEDIUM / FULL / ANOMALY) son el contrato estable
 * del sistema: viven en la base de datos y en la API. Lo que expresa el
 * proposito del sistema — prevenir el desabastecimiento de agua de la finca —
 * son las etiquetas y los mensajes de esta tabla.
 */

export const TANK_STATES = ["LOW", "MEDIUM", "FULL", "ANOMALY"] as const;

export type TankState = (typeof TANK_STATES)[number];

export function isTankState(value: unknown): value is TankState {
  return typeof value === "string" && (TANK_STATES as readonly string[]).includes(value);
}

export interface TankStateMeta {
  /** Estado de dominio. */
  state: TankState;
  /** Etiqueta corta para chips, tablas y graficos. */
  shortLabel: string;
  /** Etiqueta principal, orientada al abastecimiento. */
  label: string;
  /** Que significa para el suministro de agua de la finca. */
  message: string;
  /** Que debe hacer el encargado. Vacio cuando no hay accion pendiente. */
  action: string;
  /** Emoji usado en la interfaz y en los mensajes de alerta. */
  emoji: string;
  /**
   * Altura de relleno del tanque, SOLO como recurso visual.
   * No representa una medicion fisica del volumen disponible.
   */
  fillRatio: number;
  /** Token de color semantico (ver globals.css). */
  tone: "critical" | "warning" | "ok" | "anomaly";
  /** Orden en el eje Y del grafico escalonado del historial. */
  chartValue: number;
}

export const TANK_STATE_META: Record<TankState, TankStateMeta> = {
  LOW: {
    state: "LOW",
    shortLabel: "CRÍTICA",
    label: "RESERVA CRÍTICA",
    message:
      "La reserva está por debajo del sensor LOW. La finca puede quedarse sin agua.",
    action: "Reponga agua cuanto antes y revise el suministro de entrada.",
    emoji: "🔴",
    fillRatio: 0.18,
    tone: "critical",
    chartValue: 0,
  },
  MEDIUM: {
    state: "MEDIUM",
    shortLabel: "PARCIAL",
    label: "RESERVA PARCIAL",
    message:
      "La reserva superó el sensor LOW pero aún no alcanza el nivel de seguridad.",
    action: "Vigile la evolución: si desciende, prepare la reposición.",
    emoji: "🟡",
    fillRatio: 0.5,
    tone: "warning",
    chartValue: 1,
  },
  FULL: {
    state: "FULL",
    shortLabel: "COMPLETA",
    label: "RESERVA COMPLETA",
    message:
      "La reserva alcanzó el sensor HIGH. El abastecimiento de la finca está asegurado.",
    action: "",
    emoji: "🟢",
    fillRatio: 1,
    tone: "ok",
    chartValue: 2,
  },
  ANOMALY: {
    state: "ANOMALY",
    shortLabel: "FALLO",
    label: "FALLO DE SENSORES",
    message:
      "Combinación de sensores inconsistente: no es posible evaluar la reserva de agua.",
    action: "Revise el cableado y el estado de los sensores LOW y HIGH.",
    emoji: "🚨",
    fillRatio: 0.62,
    tone: "anomaly",
    chartValue: 3,
  },
};

/** Valor del eje Y -> estado, usado por el grafico escalonado. */
export const CHART_VALUE_TO_STATE: Record<number, TankState> = Object.fromEntries(
  TANK_STATES.map((state) => [TANK_STATE_META[state].chartValue, state]),
) as Record<number, TankState>;
