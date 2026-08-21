import type { TankState } from "@/domain/tank-state";

/**
 * Escenarios reproducibles por el simulador.
 * "offline" no envia lecturas: simplemente deja de comunicarse, que es
 * exactamente lo que ocurre cuando el ESP8266 pierde WiFi o alimentacion.
 */
export const SCENARIO_IDS = [
  "low",
  "rising",
  "full",
  "anomaly",
  "offline",
  "cycle",
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

export interface Scenario {
  id: ScenarioId;
  label: string;
  description: string;
  /** Lecturas emitidas en ciclo. Vacio = el dispositivo deja de reportar. */
  frames: Array<{ low: boolean; high: boolean }>;
  expectedState: TankState | null;
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  low: {
    id: "low",
    label: "RESERVA CRÍTICA",
    description:
      "LOW=OFF, HIGH=OFF. La reserva cayó bajo el mínimo: riesgo de desabastecimiento.",
    frames: [{ low: false, high: false }],
    expectedState: "LOW",
  },
  rising: {
    id: "rising",
    label: "RESERVA PARCIAL",
    description:
      "LOW=ON, HIGH=OFF. La reserva supera el mínimo pero no el nivel de seguridad.",
    frames: [{ low: true, high: false }],
    expectedState: "MEDIUM",
  },
  full: {
    id: "full",
    label: "RESERVA COMPLETA",
    description: "LOW=ON, HIGH=ON. Abastecimiento asegurado.",
    frames: [{ low: true, high: true }],
    expectedState: "FULL",
  },
  anomaly: {
    id: "anomaly",
    label: "FALLO DE SENSORES",
    description:
      "LOW=OFF, HIGH=ON. Combinación imposible: la reserva deja de ser evaluable.",
    frames: [{ low: false, high: true }],
    expectedState: "ANOMALY",
  },
  offline: {
    id: "offline",
    label: "SIN SUPERVISIÓN",
    description: "El dispositivo deja de reportar y la reserva queda a ciegas.",
    frames: [],
    expectedState: null,
  },
  cycle: {
    id: "cycle",
    label: "CICLO DE CONSUMO",
    description:
      "Recorre crítica → parcial → completa → parcial, como un día de la finca.",
    frames: [
      { low: false, high: false },
      { low: true, high: false },
      { low: true, high: true },
      { low: true, high: false },
    ],
    expectedState: null,
  },
};

export const SCENARIO_LIST: Scenario[] = SCENARIO_IDS.map((id) => SCENARIOS[id]);

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === "string" && (SCENARIO_IDS as readonly string[]).includes(value);
}
