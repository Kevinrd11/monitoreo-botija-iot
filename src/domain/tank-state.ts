/**
 * Domain: estados posibles del tanque.
 *
 * El sistema NO mide porcentaje de nivel. Solo conoce el estado de dos
 * sensores digitales (LOW y HIGH). De la combinacion de ambos se derivan
 * exactamente cuatro estados de dominio.
 */

export const TANK_STATES = ["LOW", "MEDIUM", "FULL", "ANOMALY"] as const;

export type TankState = (typeof TANK_STATES)[number];

export function isTankState(value: unknown): value is TankState {
  return typeof value === "string" && (TANK_STATES as readonly string[]).includes(value);
}

export interface TankStateMeta {
  /** Estado de dominio. */
  state: TankState;
  /** Etiqueta corta para chips y tablas. */
  shortLabel: string;
  /** Etiqueta larga para la card principal. */
  label: string;
  /** Mensaje explicativo mostrado al operador. */
  message: string;
  /** Emoji usado en la UI y en los mensajes de alerta. */
  emoji: string;
  /**
   * Altura de relleno del tanque, SOLO como recurso visual.
   * No representa una medicion fisica real del volumen de agua.
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
    shortLabel: "BAJO",
    label: "NIVEL BAJO",
    message:
      "El tanque requiere atencion. El nivel de agua esta por debajo del sensor LOW.",
    emoji: "🔴",
    fillRatio: 0.18,
    tone: "critical",
    chartValue: 0,
  },
  MEDIUM: {
    state: "MEDIUM",
    shortLabel: "MEDIO",
    label: "NIVEL MEDIO",
    message: "El tanque se encuentra en un nivel intermedio.",
    emoji: "🟡",
    fillRatio: 0.5,
    tone: "warning",
    chartValue: 1,
  },
  FULL: {
    state: "FULL",
    shortLabel: "LLENO",
    label: "TANQUE LLENO",
    message: "El tanque ha alcanzado el nivel HIGH.",
    emoji: "🟢",
    fillRatio: 1,
    tone: "ok",
    chartValue: 2,
  },
  ANOMALY: {
    state: "ANOMALY",
    shortLabel: "ANOMALIA",
    label: "ANOMALIA DE SENSOR",
    message:
      "Se detecto una combinacion de sensores inconsistente. Verifique los sensores LOW y HIGH.",
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
