import type {
  AlertRepository,
  DeviceRepository,
  ReadingRepository,
  Repositories,
  TankRepository,
} from "@/repositories/types";
import type { Alert, Device, Tank, TankReading } from "@/types";
import { type MemoryStore, createMemoryStore, newId } from "./store";

const byTimestampDesc = (a: TankReading, b: TankReading) =>
  b.timestamp.getTime() - a.timestamp.getTime();

export function createMemoryRepositories(
  store: MemoryStore = createMemoryStore(),
): Repositories {
  const tanks: TankRepository = {
    async findById(id) {
      return store.tanks.find((t) => t.id === id) ?? null;
    },
    async findFirst() {
      return store.tanks[0] ?? null;
    },
    async create({ name, description = null }) {
      const now = new Date();
      const tank: Tank = { id: newId(), name, description, createdAt: now, updatedAt: now };
      store.tanks.push(tank);
      return tank;
    },
    async ensureDefault(name, description = null) {
      return store.tanks[0] ?? (await tanks.create({ name, description }));
    },
  };

  const devices: DeviceRepository = {
    async findByDeviceId(deviceId) {
      return store.devices.find((d) => d.deviceId === deviceId) ?? null;
    },
    async ensure({ deviceId, name, type = "ESP8266" }) {
      const existing = store.devices.find((d) => d.deviceId === deviceId);
      if (existing) {
        existing.name = name;
        existing.updatedAt = new Date();
        return existing;
      }
      const now = new Date();
      const device: Device = {
        id: newId(),
        deviceId,
        name,
        type,
        status: "UNKNOWN",
        lastSeen: null,
        createdAt: now,
        updatedAt: now,
      };
      store.devices.push(device);
      return device;
    },
    async touch(deviceId, lastSeen) {
      const device = store.devices.find((d) => d.deviceId === deviceId);
      if (!device) return null;
      device.lastSeen = lastSeen;
      device.status = "ONLINE";
      device.updatedAt = new Date();
      return device;
    },
    async updateStatus(deviceId, status) {
      const device = store.devices.find((d) => d.deviceId === deviceId);
      if (!device) return null;
      device.status = status;
      device.updatedAt = new Date();
      return device;
    },
    async listAll() {
      return [...store.devices];
    },
  };

  const readings: ReadingRepository = {
    async create(input) {
      const reading: TankReading = { id: newId(), ...input };
      store.readings.push(reading);
      return reading;
    },
    async findLatest(tankId) {
      return (
        [...store.readings].filter((r) => r.tankId === tankId).sort(byTimestampDesc)[0] ?? null
      );
    },
    async find({ tankId, from, to, limit = 200, offset = 0 }) {
      return [...store.readings]
        .filter(
          (r) =>
            r.tankId === tankId &&
            (!from || r.timestamp >= from) &&
            (!to || r.timestamp <= to),
        )
        .sort(byTimestampDesc)
        .slice(offset, offset + limit);
    },
    async count({ tankId, from, to }) {
      return store.readings.filter(
        (r) =>
          r.tankId === tankId && (!from || r.timestamp >= from) && (!to || r.timestamp <= to),
      ).length;
    },
    async findCurrentStreakStart(tankId, state) {
      const ordered = [...store.readings]
        .filter((r) => r.tankId === tankId)
        .sort(byTimestampDesc);
      if (ordered.length === 0 || ordered[0].state !== state) return null;

      let start = ordered[0].timestamp;
      for (const reading of ordered) {
        if (reading.state !== state) break;
        start = reading.timestamp;
      }
      return start;
    },
  };

  const alerts: AlertRepository = {
    async create(input) {
      const alert: Alert = {
        id: newId(),
        tankId: input.tankId,
        deviceId: input.deviceId,
        type: input.type,
        severity: input.severity,
        message: input.message,
        status: "ACTIVE",
        createdAt: new Date(),
        acknowledgedAt: null,
        resolvedAt: null,
      };
      store.alerts.push(alert);
      return alert;
    },
    async findById(id) {
      return store.alerts.find((a) => a.id === id) ?? null;
    },
    async find({ tankId, status, type, limit = 100, offset = 0 }) {
      return [...store.alerts]
        .filter((a) => a.tankId === tankId)
        .filter((a) => (status === "OPEN" ? a.status !== "RESOLVED" : true))
        .filter((a) => (status && status !== "OPEN" ? a.status === status : true))
        .filter((a) => (type ? a.type === type : true))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(offset, offset + limit);
    },
    async findOpenByType(tankId, type) {
      return (
        [...store.alerts]
          .filter((a) => a.tankId === tankId && a.type === type && a.status !== "RESOLVED")
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
      );
    },
    async acknowledge(id, at) {
      const alert = store.alerts.find((a) => a.id === id && a.status === "ACTIVE");
      if (!alert) return null;
      alert.status = "ACKNOWLEDGED";
      alert.acknowledgedAt ??= at;
      return alert;
    },
    async resolve(id, at) {
      const alert = store.alerts.find((a) => a.id === id && a.status !== "RESOLVED");
      if (!alert) return null;
      alert.status = "RESOLVED";
      alert.resolvedAt ??= at;
      return alert;
    },
    async resolveOpenByType(tankId, type, at) {
      const open = store.alerts.filter(
        (a) => a.tankId === tankId && a.type === type && a.status !== "RESOLVED",
      );
      for (const alert of open) {
        alert.status = "RESOLVED";
        alert.resolvedAt ??= at;
      }
      return open;
    },
    async escalate(id, severity, message) {
      const alert = store.alerts.find((a) => a.id === id && a.status !== "RESOLVED");
      if (!alert) return null;
      alert.severity = severity;
      alert.message = message;
      return alert;
    },
  };

  return { tanks, devices, readings, alerts, driver: "memory" };
}
