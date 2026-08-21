import { serverEnv } from "@/config/env";
import { getDefaultTank } from "@/database/bootstrap";
import type { TankState } from "@/domain/tank-state";
import { toAlertDTO, toReadingDTO } from "@/lib/serializers";
import { publish } from "@/realtime/event-bus";
import { getRepositories } from "@/repositories";
import type { Repositories } from "@/repositories/types";
import { createAlertService } from "@/services/alert.service";
import { createDeviceService } from "@/services/device.service";
import { TankStateService } from "@/services/tank-state.service";
import type {
  AlertDTO,
  DeviceStatusDTO,
  ReadingDTO,
  ReadingPayload,
  TankOverviewDTO,
  TankReading,
} from "@/types";

export class UnknownDeviceError extends Error {
  constructor(deviceId: string) {
    super(`Dispositivo desconocido: ${deviceId}`);
    this.name = "UnknownDeviceError";
  }
}

export interface IngestResult {
  reading: ReadingDTO;
  state: TankState;
  device: DeviceStatusDTO;
  activeAlerts: AlertDTO[];
}

/**
 * TankService
 *
 * Orquesta el flujo completo de una lectura entrante y compone las vistas que
 * consume el dashboard. Toda la logica de negocio vive aqui y en los servicios
 * que coordina; los componentes React solo consumen DTOs.
 */
export function createTankService(repos: Repositories = getRepositories()) {
  const alerts = createAlertService(repos);
  const devices = createDeviceService(repos);

  async function activeAlertDTOs(tankId: string): Promise<AlertDTO[]> {
    const list = await alerts.listActive(tankId);
    return list.map(toAlertDTO);
  }

  return {
    alerts,
    devices,

    /**
     * Pipeline de ingesta de POST /api/tank/readings:
     *  1. valida el deviceId contra el dispositivo registrado,
     *  2. determina el estado con TankStateService,
     *  3. persiste la lectura,
     *  4. actualiza la ultima comunicacion del dispositivo,
     *  5. evalua alertas (nivel bajo, anomalia, reconexion),
     *  6. emite el evento realtime al dashboard.
     */
    async ingestReading(payload: ReadingPayload): Promise<IngestResult> {
      const tank = await getDefaultTank(repos);

      const known = await repos.devices.findByDeviceId(payload.deviceId);
      if (!known) throw new UnknownDeviceError(payload.deviceId);

      const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
      const state = TankStateService.determine(payload.low, payload.high);

      const reading = await repos.readings.create({
        tankId: tank.id,
        deviceId: payload.deviceId,
        low: payload.low,
        high: payload.high,
        state,
        timestamp,
      });

      await devices.registerCommunication(payload.deviceId, timestamp);

      const stateSince = await repos.readings.findCurrentStreakStart(tank.id, state);

      await alerts.evaluateReading({
        tankId: tank.id,
        deviceId: payload.deviceId,
        state,
        timestamp,
        stateSince,
      });
      // El dispositivo acaba de comunicarse: cierra cualquier alerta de offline.
      await alerts.evaluateDeviceStatus({
        tankId: tank.id,
        deviceId: payload.deviceId,
        status: "ONLINE",
        at: timestamp,
      });

      const deviceStatus = await devices.getStatus(payload.deviceId, reading);
      const readingDTO = toReadingDTO(reading);
      const openAlerts = await activeAlertDTOs(tank.id);

      publish({
        event: "reading",
        data: {
          reading: readingDTO,
          state: TankStateService.snapshot(state),
          device: deviceStatus,
          activeAlerts: openAlerts,
        },
      });

      return { reading: readingDTO, state, device: deviceStatus, activeAlerts: openAlerts };
    },

    /**
     * Reconcilia el estado de comunicacion: si el dispositivo lleva mas de
     * DEVICE_TIMEOUT_SECONDS sin reportar, abre la alerta DEVICE_OFFLINE.
     * Se invoca desde las lecturas del dashboard y desde el stream SSE.
     */
    async refreshDeviceStatus(now: Date = new Date()): Promise<{
      device: DeviceStatusDTO;
      alertsChanged: boolean;
      activeAlerts: AlertDTO[];
    }> {
      const tank = await getDefaultTank(repos);
      const latest = await repos.readings.findLatest(tank.id);
      const device = await devices.getStatus(serverEnv.deviceId, latest, now);

      const evaluation = await alerts.evaluateDeviceStatus({
        tankId: tank.id,
        deviceId: serverEnv.deviceId,
        status: device.status,
        at: now,
      });

      const openAlerts = await activeAlertDTOs(tank.id);

      if (evaluation.changed) {
        publish({ event: "alerts", data: { activeAlerts: openAlerts } });
        publish({ event: "device", data: { device } });
      }

      return { device, alertsChanged: evaluation.changed, activeAlerts: openAlerts };
    },

    /** Vista agregada para el arranque del dashboard (GET /api/tank). */
    async getOverview(now: Date = new Date()): Promise<TankOverviewDTO> {
      const tank = await getDefaultTank(repos);
      const latest = await repos.readings.findLatest(tank.id);
      const { device, activeAlerts } = await this.refreshDeviceStatus(now);

      return {
        tank: { id: tank.id, name: tank.name, description: tank.description },
        state: latest ? TankStateService.snapshot(latest.state) : null,
        latestReading: latest ? toReadingDTO(latest) : null,
        device,
        activeAlerts,
        serverTime: now.toISOString(),
      };
    },

    async getLatestReading(): Promise<TankReading | null> {
      const tank = await getDefaultTank(repos);
      return repos.readings.findLatest(tank.id);
    },

    async getHistory(from: Date, to: Date, limit = 1000): Promise<ReadingDTO[]> {
      const tank = await getDefaultTank(repos);
      const readings = await repos.readings.find({ tankId: tank.id, from, to, limit });
      return readings.map(toReadingDTO);
    },

    async publishAlertsChanged(): Promise<AlertDTO[]> {
      const tank = await getDefaultTank(repos);
      const openAlerts = await activeAlertDTOs(tank.id);
      publish({ event: "alerts", data: { activeAlerts: openAlerts } });
      return openAlerts;
    },
  };
}

export type TankService = ReturnType<typeof createTankService>;

export function getTankService(repos: Repositories = getRepositories()): TankService {
  return createTankService(repos);
}
