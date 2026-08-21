import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryRepositories } from "@/repositories/memory";
import type { Repositories } from "@/repositories/types";
import { createAlertService } from "@/services/alert.service";

const OPTIONS = { lowLevelCriticalMinutes: 15, deviceTimeoutSeconds: 60 };
const NOW = new Date("2026-08-20T20:00:00Z");

let repos: Repositories;
let service: ReturnType<typeof createAlertService>;
let tankId: string;

beforeEach(async () => {
  repos = createMemoryRepositories();
  service = createAlertService(repos, OPTIONS);
  tankId = (await repos.tanks.create({ name: "Tanque de prueba" })).id;
});

const base = { tankId: "", deviceId: "ESP8266-TANQUE-001", timestamp: NOW };

describe("alerta de anomalia de sensores", () => {
  it("crea una alerta CRITICAL cuando el estado es ANOMALY", async () => {
    const result = await service.evaluateReading({ ...base, tankId, state: "ANOMALY" });

    expect(result.created).toHaveLength(1);
    expect(result.created[0]).toMatchObject({
      type: "SENSOR_INCONSISTENCY",
      severity: "CRITICAL",
      status: "ACTIVE",
    });
    expect(result.created[0].message).toContain("HIGH");
  });

  it("no duplica la alerta mientras la anomalia persiste", async () => {
    await service.evaluateReading({ ...base, tankId, state: "ANOMALY" });
    const second = await service.evaluateReading({ ...base, tankId, state: "ANOMALY" });

    expect(second.created).toHaveLength(0);
    expect(await repos.alerts.find({ tankId, status: "OPEN" })).toHaveLength(1);
  });

  it("resuelve la alerta automaticamente cuando la anomalia desaparece", async () => {
    await service.evaluateReading({ ...base, tankId, state: "ANOMALY" });
    const result = await service.evaluateReading({ ...base, tankId, state: "FULL" });

    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0].status).toBe("RESOLVED");
    expect(await service.listActive(tankId)).toHaveLength(0);
  });
});

describe("alerta de nivel bajo", () => {
  it("abre la alerta como WARNING al entrar en nivel bajo", async () => {
    const result = await service.evaluateReading({
      ...base,
      tankId,
      state: "LOW",
      stateSince: NOW,
    });

    expect(result.created[0]).toMatchObject({ type: "LOW_LEVEL", severity: "WARNING" });
  });

  it("escala a CRITICAL cuando el nivel bajo se sostiene", async () => {
    await service.evaluateReading({ ...base, tankId, state: "LOW", stateSince: NOW });

    const later = new Date(NOW.getTime() + 20 * 60_000);
    const result = await service.evaluateReading({
      tankId,
      deviceId: base.deviceId,
      state: "LOW",
      timestamp: later,
      stateSince: NOW,
    });

    expect(result.created).toHaveLength(0);
    expect(result.updated[0]).toMatchObject({ severity: "CRITICAL" });
    expect(result.updated[0].message).toContain("20 minutos");
    expect(await repos.alerts.find({ tankId, status: "OPEN" })).toHaveLength(1);
  });

  it("se resuelve cuando el tanque sube de nivel", async () => {
    await service.evaluateReading({ ...base, tankId, state: "LOW", stateSince: NOW });
    const result = await service.evaluateReading({ ...base, tankId, state: "MEDIUM" });

    expect(result.resolved.map((a) => a.type)).toContain("LOW_LEVEL");
  });

  it("no abre alerta de nivel bajo en MEDIUM ni en FULL", async () => {
    const medium = await service.evaluateReading({ ...base, tankId, state: "MEDIUM" });
    const full = await service.evaluateReading({ ...base, tankId, state: "FULL" });

    expect(medium.created).toHaveLength(0);
    expect(full.created).toHaveLength(0);
  });
});

describe("alerta de dispositivo offline", () => {
  it("abre DEVICE_OFFLINE cuando el dispositivo supera el timeout", async () => {
    const result = await service.evaluateDeviceStatus({
      tankId,
      deviceId: base.deviceId,
      status: "OFFLINE",
      at: NOW,
    });

    expect(result.created[0]).toMatchObject({ type: "DEVICE_OFFLINE", severity: "CRITICAL" });
    expect(result.created[0].message).toContain("60 segundos");
  });

  it("la resuelve cuando el dispositivo vuelve a comunicarse", async () => {
    await service.evaluateDeviceStatus({
      tankId,
      deviceId: base.deviceId,
      status: "OFFLINE",
      at: NOW,
    });
    const result = await service.evaluateDeviceStatus({
      tankId,
      deviceId: base.deviceId,
      status: "ONLINE",
      at: NOW,
    });

    expect(result.resolved).toHaveLength(1);
    expect(await service.listActive(tankId)).toHaveLength(0);
  });

  it("no abre alertas mientras el estado es UNKNOWN", async () => {
    const result = await service.evaluateDeviceStatus({
      tankId,
      deviceId: base.deviceId,
      status: "UNKNOWN",
      at: NOW,
    });
    expect(result.changed).toBe(false);
  });
});

describe("acciones manuales", () => {
  it("permite reconocer y luego resolver una alerta", async () => {
    const { created } = await service.evaluateReading({ ...base, tankId, state: "ANOMALY" });
    const id = created[0].id;

    const acknowledged = await service.acknowledge(id);
    expect(acknowledged?.status).toBe("ACKNOWLEDGED");
    expect(acknowledged?.acknowledgedAt).not.toBeNull();

    const resolved = await service.resolve(id);
    expect(resolved?.status).toBe("RESOLVED");
    expect(resolved?.resolvedAt).not.toBeNull();
  });

  it("una alerta reconocida sigue contando como activa hasta resolverse", async () => {
    const { created } = await service.evaluateReading({ ...base, tankId, state: "ANOMALY" });
    await service.acknowledge(created[0].id);

    expect(await service.listActive(tankId)).toHaveLength(1);
  });

  it("no reconoce dos veces la misma alerta", async () => {
    const { created } = await service.evaluateReading({ ...base, tankId, state: "ANOMALY" });
    await service.acknowledge(created[0].id);
    expect(await service.acknowledge(created[0].id)).toBeNull();
  });
});
