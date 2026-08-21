import type { AlertStatus, AlertType } from "@/domain/alert";
import type { DeviceStatus, DeviceType } from "@/domain/device";
import type { TankState } from "@/domain/tank-state";
import type {
  Alert,
  CreateAlertInput,
  CreateReadingInput,
  Device,
  Tank,
  TankReading,
} from "@/types";

export interface TankRepository {
  findById(id: string): Promise<Tank | null>;
  findFirst(): Promise<Tank | null>;
  create(input: { name: string; description?: string | null }): Promise<Tank>;
  /** Devuelve el unico tanque del sistema, creandolo si aun no existe. */
  ensureDefault(name: string, description?: string | null): Promise<Tank>;
}

export interface DeviceRepository {
  findByDeviceId(deviceId: string): Promise<Device | null>;
  ensure(input: {
    deviceId: string;
    name: string;
    type?: DeviceType;
    tankId?: string | null;
  }): Promise<Device>;
  touch(deviceId: string, lastSeen: Date): Promise<Device | null>;
  updateStatus(deviceId: string, status: DeviceStatus): Promise<Device | null>;
  listAll(): Promise<Device[]>;
}

export interface ReadingQuery {
  tankId: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface ReadingRepository {
  create(input: CreateReadingInput): Promise<TankReading>;
  findLatest(tankId: string): Promise<TankReading | null>;
  find(query: ReadingQuery): Promise<TankReading[]>;
  count(query: Pick<ReadingQuery, "tankId" | "from" | "to">): Promise<number>;
  /**
   * Momento en el que el tanque entro en la racha actual del estado indicado.
   * Devuelve null si la ultima lectura no corresponde a ese estado.
   */
  findCurrentStreakStart(tankId: string, state: TankState): Promise<Date | null>;
}

export interface AlertQuery {
  tankId: string;
  status?: AlertStatus | "OPEN";
  type?: AlertType;
  limit?: number;
  offset?: number;
}

export interface AlertRepository {
  create(input: CreateAlertInput): Promise<Alert>;
  findById(id: string): Promise<Alert | null>;
  find(query: AlertQuery): Promise<Alert[]>;
  /** Alerta no resuelta del tipo indicado, si existe. */
  findOpenByType(tankId: string, type: AlertType): Promise<Alert | null>;
  acknowledge(id: string, at: Date): Promise<Alert | null>;
  resolve(id: string, at: Date): Promise<Alert | null>;
  /** Resuelve todas las alertas abiertas de un tipo (la condicion desaparecio). */
  resolveOpenByType(tankId: string, type: AlertType, at: Date): Promise<Alert[]>;
  /** Sube la severidad de una alerta abierta (p. ej. WARNING -> CRITICAL). */
  escalate(id: string, severity: Alert["severity"], message: string): Promise<Alert | null>;
}

export interface Repositories {
  tanks: TankRepository;
  devices: DeviceRepository;
  readings: ReadingRepository;
  alerts: AlertRepository;
  /** "postgres" | "memory" - util para diagnostico y para el README. */
  driver: "postgres" | "memory";
}
