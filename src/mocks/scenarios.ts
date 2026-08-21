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
    label: "NIVEL BAJO",
    description: "LOW=OFF, HIGH=OFF. El agua esta por debajo del sensor LOW.",
    frames: [{ low: false, high: false }],
    expectedState: "LOW",
  },
  rising: {
    id: "rising",
    label: "NIVEL MEDIO",
    description: "LOW=ON, HIGH=OFF. El agua alcanzo LOW pero no HIGH.",
    frames: [{ low: true, high: false }],
    expectedState: "MEDIUM",
  },
  full: {
    id: "full",
    label: "TANQUE LLENO",
    description: "LOW=ON, HIGH=ON. El agua alcanzo ambos sensores.",
    frames: [{ low: true, high: true }],
    expectedState: "FULL",
  },
  anomaly: {
    id: "anomaly",
    label: "ANOMALIA",
    description: "LOW=OFF, HIGH=ON. Combinacion fisicamente inconsistente.",
    frames: [{ low: false, high: true }],
    expectedState: "ANOMALY",
  },
  offline: {
    id: "offline",
    label: "DISPOSITIVO OFFLINE",
    description: "El dispositivo deja de enviar lecturas.",
    frames: [],
    expectedState: null,
  },
  cycle: {
    id: "cycle",
    label: "CICLO DE LLENADO",
    description: "Recorre BAJO -> MEDIO -> LLENO -> MEDIO de forma continua.",
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
