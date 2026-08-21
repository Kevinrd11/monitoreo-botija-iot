import type { DeviceStatus } from "@/domain/device";
import {
  SUPPLY_RISK_META,
  SUPPLY_TREND_META,
  type SupplyRisk,
  type SupplyTrend,
  deriveSupplyRisk,
  deriveSupplyTrend,
} from "@/domain/supply";
import { TANK_STATE_META, type TankState } from "@/domain/tank-state";
import type { SupplyAssessmentDTO } from "@/types";

/**
 * SupplyService
 *
 * Traduce los hechos observados (estado de la reserva, antiguedad de ese
 * estado, tendencia y salud del enlace) en la unica pregunta que le importa a
 * la finca: >se puede quedar sin agua?
 *
 * Es puro: recibe todo por parametro y no toca base de datos ni React.
 *
 * Deliberadamente NO estima "horas de autonomia restante". Dos sensores
 * digitales no aportan caudal ni volumen; cualquier cifra de ese tipo seria
 * inventada y podria hacer que alguien confie en una reserva inexistente.
 */
export interface SupplyAssessmentInput {
  state: TankState | null;
  deviceStatus: DeviceStatus;
  /** Momento en que la reserva entro en el estado actual. */
  stateSince?: Date | null;
  /** Ultimo estado distinto del actual, para la tendencia. */
  previousDistinctState?: TankState | null;
  /** Ultima vez que la reserva estuvo completa. */
  lastFullAt?: Date | null;
  now?: Date;
}

export const SupplyService = {
  /** Nivel de riesgo de desabastecimiento. */
  risk(state: TankState | null, deviceStatus: DeviceStatus): SupplyRisk {
    return deriveSupplyRisk(state, deviceStatus);
  },

  /** Tendencia de la reserva por tramos. */
  trend(current: TankState | null, previousDistinct: TankState | null): SupplyTrend {
    return deriveSupplyTrend(current, previousDistinct);
  },

  /** Evaluacion completa, lista para enviar al panel. */
  assess(input: SupplyAssessmentInput): SupplyAssessmentDTO {
    const now = input.now ?? new Date();
    const risk = SupplyService.risk(input.state, input.deviceStatus);
    const trend = SupplyService.trend(input.state, input.previousDistinctState ?? null);

    const riskMeta = SUPPLY_RISK_META[risk];
    const trendMeta = SUPPLY_TREND_META[trend];
    const stateMeta = input.state ? TANK_STATE_META[input.state] : null;

    const secondsInState = input.stateSince
      ? Math.max(0, Math.floor((now.getTime() - input.stateSince.getTime()) / 1000))
      : null;

    return {
      risk,
      riskLabel: riskMeta.label,
      riskHeadline:
        input.deviceStatus !== "ONLINE" && input.state !== null
          ? "Sin datos recientes del dispositivo: la última lectura puede no reflejar la reserva actual."
          : riskMeta.headline,
      riskEmoji: riskMeta.emoji,
      riskTone: riskMeta.tone,
      action: stateMeta?.action ?? "",
      trend,
      trendLabel: trendMeta.label,
      trendDescription: trendMeta.description,
      secondsInState,
      stateSince: input.stateSince ? input.stateSince.toISOString() : null,
      lastFullAt: input.lastFullAt ? input.lastFullAt.toISOString() : null,
    };
  },
};

export type SupplyServiceType = typeof SupplyService;
