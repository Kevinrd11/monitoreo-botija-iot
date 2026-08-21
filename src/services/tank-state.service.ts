import {
  TANK_STATE_META,
  type TankState,
  type TankStateMeta,
} from "@/domain/tank-state";
import type { TankStateSnapshot } from "@/types";

/**
 * TankStateService
 *
 * Unico lugar del sistema donde la combinacion de sensores se traduce a un
 * estado de dominio. Es puro y no depende de React, de la base de datos ni
 * del transporte HTTP.
 *
 *   LOW=false HIGH=false -> LOW      El agua esta por debajo del sensor LOW.
 *   LOW=true  HIGH=false -> MEDIUM   El agua alcanzo LOW pero no HIGH.
 *   LOW=true  HIGH=true  -> FULL     El agua alcanzo ambos sensores.
 *   LOW=false HIGH=true  -> ANOMALY  Combinacion fisicamente imposible.
 *
 * IMPORTANTE: HIGH=true significa "RESERVA COMPLETA", nunca "sobrellenado".
 * Con solo dos sensores no existe informacion suficiente para afirmar que el
 * agua supero el sensor HIGH. La deteccion de sobrellenado requeriria un
 * tercer sensor (OVERFLOW) y no esta implementada.
 */
export const TankStateService = {
  /** Traduce la lectura de los dos sensores al estado de dominio. */
  determine(low: boolean, high: boolean): TankState {
    if (high) return low ? "FULL" : "ANOMALY";
    return low ? "MEDIUM" : "LOW";
  },

  /** true cuando la combinacion de sensores es fisicamente inconsistente. */
  isAnomaly(low: boolean, high: boolean): boolean {
    return TankStateService.determine(low, high) === "ANOMALY";
  },

  /** Metadatos de presentacion asociados a un estado. */
  meta(state: TankState): TankStateMeta {
    return TANK_STATE_META[state];
  },

  /** Vista serializable del estado, lista para enviar al dashboard. */
  snapshot(state: TankState): TankStateSnapshot {
    const meta = TANK_STATE_META[state];
    return {
      state: meta.state,
      label: meta.label,
      shortLabel: meta.shortLabel,
      message: meta.message,
      action: meta.action,
      emoji: meta.emoji,
      fillRatio: meta.fillRatio,
      tone: meta.tone,
    };
  },

  /** Snapshot directamente desde la lectura de los sensores. */
  snapshotFromSensors(low: boolean, high: boolean): TankStateSnapshot {
    return TankStateService.snapshot(TankStateService.determine(low, high));
  },
};

export type TankStateServiceType = typeof TankStateService;
