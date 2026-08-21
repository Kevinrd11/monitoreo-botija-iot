import { serverEnv } from "@/config/env";
import {
  DEVICE_STATUS_META,
  deriveDeviceStatus,
  secondsSince,
} from "@/domain/device";
import { getRepositories } from "@/repositories";
import type { Repositories } from "@/repositories/types";
import type { Device, DeviceStatusDTO, TankReading } from "@/types";

/**
 * DeviceService
 *
 * Responsable del ciclo de vida del ESP8266: registro, ultima comunicacion y
 * derivacion del estado ONLINE / OFFLINE / UNKNOWN.
 *
 * El estado OFFLINE no se "guarda" activamente por un cron: se deriva del
 * tiempo transcurrido desde lastSeen cada vez que se consulta, y se persiste
 * de forma oportunista. Asi el sistema es correcto aunque el proceso se
 * reinicie o corra en un entorno serverless.
 */
export function createDeviceService(
  repos: Repositories,
  timeoutSeconds: number = serverEnv.deviceTimeoutSeconds,
) {
  return {
    timeoutSeconds,

    /** Registra el dispositivo si aun no existe. */
    async ensure(tankId: string): Promise<Device> {
      return repos.devices.ensure({
        deviceId: serverEnv.deviceId,
        name: serverEnv.deviceName,
        type: "ESP8266",
        tankId,
      });
    },

    /** Marca una comunicacion entrante del dispositivo. */
    async registerCommunication(deviceId: string, at: Date): Promise<Device | null> {
      return repos.devices.touch(deviceId, at);
    },

    /** Estado actual derivado del tiempo transcurrido desde la ultima lectura. */
    async getStatus(
      deviceId: string = serverEnv.deviceId,
      lastReading: TankReading | null = null,
      now: Date = new Date(),
    ): Promise<DeviceStatusDTO> {
      const device = await repos.devices.findByDeviceId(deviceId);
      const lastSeen = device?.lastSeen ?? null;
      const status = deriveDeviceStatus(lastSeen, timeoutSeconds, now);

      // Persistencia oportunista: mantiene coherente la columna `status`.
      if (device && device.status !== status) {
        await repos.devices.updateStatus(deviceId, status);
      }

      const meta = DEVICE_STATUS_META[status];

      return {
        deviceId,
        name: device?.name ?? serverEnv.deviceName,
        type: device?.type ?? "ESP8266",
        status,
        statusLabel: meta.label,
        statusEmoji: meta.emoji,
        statusMessage: meta.message,
        lastSeen: lastSeen ? lastSeen.toISOString() : null,
        secondsSinceLastSeen: secondsSince(lastSeen, now),
        timeoutSeconds,
        lastLow: lastReading?.low ?? null,
        lastHigh: lastReading?.high ?? null,
      };
    },
  };
}

export type DeviceService = ReturnType<typeof createDeviceService>;

export function getDeviceService(repos: Repositories = getRepositories()): DeviceService {
  return createDeviceService(repos);
}
