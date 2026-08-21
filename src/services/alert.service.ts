import { serverEnv } from "@/config/env";
import { ALERT_TYPE_META, type AlertSeverity, type AlertType } from "@/domain/alert";
import type { DeviceStatus } from "@/domain/device";
import type { TankState } from "@/domain/tank-state";
import { getRepositories } from "@/repositories";
import type { Repositories } from "@/repositories/types";
import type { Alert } from "@/types";

export interface AlertServiceOptions {
  /** Minutos en NIVEL BAJO tras los cuales la alerta escala a CRITICAL. */
  lowLevelCriticalMinutes: number;
  /** Segundos sin lecturas tras los cuales el dispositivo se considera OFFLINE. */
  deviceTimeoutSeconds: number;
}

export interface EvaluateReadingInput {
  tankId: string;
  deviceId: string;
  state: TankState;
  timestamp: Date;
  /** Momento en que comenzo la racha actual del estado (para escalar severidad). */
  stateSince?: Date | null;
}

export interface AlertEvaluationResult {
  created: Alert[];
  updated: Alert[];
  resolved: Alert[];
  /** true si algo cambio y conviene notificar al dashboard. */
  changed: boolean;
}

const emptyResult = (): AlertEvaluationResult => ({
  created: [],
  updated: [],
  resolved: [],
  changed: false,
});

/**
 * AlertService
 *
 * Centraliza la creacion, escalado y resolucion automatica de alertas.
 * Regla general: mientras la condicion persiste se mantiene UNA sola alerta
 * abierta por tipo; cuando la condicion desaparece, la alerta se resuelve sola.
 */
export function createAlertService(
  repos: Repositories,
  options: AlertServiceOptions = {
    lowLevelCriticalMinutes: serverEnv.lowLevelCriticalMinutes,
    deviceTimeoutSeconds: serverEnv.deviceTimeoutSeconds,
  },
) {
  async function openOrEscalate(
    input: {
      tankId: string;
      deviceId: string | null;
      type: AlertType;
      severity: AlertSeverity;
      message: string;
    },
    result: AlertEvaluationResult,
  ): Promise<void> {
    const existing = await repos.alerts.findOpenByType(input.tankId, input.type);

    if (!existing) {
      result.created.push(await repos.alerts.create(input));
      result.changed = true;
      return;
    }

    const shouldEscalate =
      existing.severity !== input.severity || existing.message !== input.message;

    if (shouldEscalate) {
      const updated = await repos.alerts.escalate(existing.id, input.severity, input.message);
      if (updated) {
        result.updated.push(updated);
        result.changed = true;
      }
    }
  }

  async function closeIfOpen(
    tankId: string,
    type: AlertType,
    at: Date,
    result: AlertEvaluationResult,
  ): Promise<void> {
    const resolved = await repos.alerts.resolveOpenByType(tankId, type, at);
    if (resolved.length > 0) {
      result.resolved.push(...resolved);
      result.changed = true;
    }
  }

  return {
    options,

    /**
     * Evalua las alertas derivadas del estado del tanque tras una nueva lectura.
     * - ANOMALY -> SENSOR_INCONSISTENCY (CRITICAL)
     * - LOW     -> LOW_LEVEL (WARNING, escala a CRITICAL tras X minutos)
     * - resto   -> resuelve ambas
     */
    async evaluateReading(input: EvaluateReadingInput): Promise<AlertEvaluationResult> {
      const result = emptyResult();
      const { tankId, deviceId, state, timestamp } = input;

      if (state === "ANOMALY") {
        await openOrEscalate(
          {
            tankId,
            deviceId,
            type: "SENSOR_INCONSISTENCY",
            severity: "CRITICAL",
            message:
              "El sensor HIGH esta activo mientras LOW esta inactivo. Verifique el sistema de sensores.",
          },
          result,
        );
      } else {
        await closeIfOpen(tankId, "SENSOR_INCONSISTENCY", timestamp, result);
      }

      if (state === "LOW") {
        const since = input.stateSince ?? timestamp;
        const minutesInLow = Math.max(
          0,
          Math.floor((timestamp.getTime() - since.getTime()) / 60_000),
        );
        const sustained = minutesInLow >= options.lowLevelCriticalMinutes;

        await openOrEscalate(
          {
            tankId,
            deviceId,
            type: "LOW_LEVEL",
            severity: sustained ? "CRITICAL" : "WARNING",
            message: sustained
              ? `El tanque permanece en nivel bajo desde hace ${minutesInLow} minutos. El nivel de agua esta por debajo del sensor LOW.`
              : "El tanque esta por debajo del sensor LOW.",
          },
          result,
        );
      } else {
        await closeIfOpen(tankId, "LOW_LEVEL", timestamp, result);
      }

      return result;
    },

    /**
     * Evalua la alerta de comunicacion. Se invoca tanto al recibir una lectura
     * (para resolverla) como al consultar el estado del dispositivo.
     */
    async evaluateDeviceStatus(input: {
      tankId: string;
      deviceId: string;
      status: DeviceStatus;
      at?: Date;
    }): Promise<AlertEvaluationResult> {
      const result = emptyResult();
      const at = input.at ?? new Date();

      if (input.status === "OFFLINE") {
        await openOrEscalate(
          {
            tankId: input.tankId,
            deviceId: input.deviceId,
            type: "DEVICE_OFFLINE",
            severity: "CRITICAL",
            message: `El sistema no ha recibido informacion del dispositivo ${input.deviceId} durante mas de ${options.deviceTimeoutSeconds} segundos.`,
          },
          result,
        );
      } else if (input.status === "ONLINE") {
        await closeIfOpen(input.tankId, "DEVICE_OFFLINE", at, result);
      }

      return result;
    },

    async acknowledge(id: string): Promise<Alert | null> {
      return repos.alerts.acknowledge(id, new Date());
    },

    async resolve(id: string): Promise<Alert | null> {
      return repos.alerts.resolve(id, new Date());
    },

    async listActive(tankId: string): Promise<Alert[]> {
      return repos.alerts.find({ tankId, status: "OPEN", limit: 50 });
    },

    /** Titulo legible de una alerta, usado por la UI y las notificaciones. */
    title(type: AlertType): string {
      return `${ALERT_TYPE_META[type].emoji} ${ALERT_TYPE_META[type].title}`;
    },
  };
}

export type AlertService = ReturnType<typeof createAlertService>;

export function getAlertService(repos: Repositories = getRepositories()): AlertService {
  return createAlertService(repos);
}
