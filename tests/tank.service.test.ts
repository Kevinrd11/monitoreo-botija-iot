import { beforeEach, describe, expect, it } from "vitest";
import { subscribe } from "@/realtime/event-bus";
import { createMemoryRepositories } from "@/repositories/memory";
import type { Repositories } from "@/repositories/types";
import { UnknownDeviceError, createTankService } from "@/services/tank.service";
import type { RealtimeEvent } from "@/realtime/events";

const DEVICE_ID = "ESP8266-TANQUE-001";

let repos: Repositories;
let service: ReturnType<typeof createTankService>;

beforeEach(async () => {
  repos = createMemoryRepositories();
  service = createTankService(repos);
  // Fuerza el arranque perezoso (crea tanque y dispositivo por defecto).
  await service.getOverview();
});

const payload = (low: boolean, high: boolean, timestamp?: string) => ({
  deviceId: DEVICE_ID,
  low,
  high,
  ...(timestamp ? { timestamp } : {}),
});

describe("ingesta de lecturas", () => {
  it("determina el estado y persiste la lectura", async () => {
    const result = await service.ingestReading(payload(true, false));

    expect(result.state).toBe("MEDIUM");
    expect(result.reading).toMatchObject({ low: true, high: false, state: "MEDIUM" });

    const latest = await service.getLatestReading();
    expect(latest?.state).toBe("MEDIUM");
  });

  it("mapea las cuatro combinaciones de sensores", async () => {
    expect((await service.ingestReading(payload(false, false))).state).toBe("LOW");
    expect((await service.ingestReading(payload(true, false))).state).toBe("MEDIUM");
    expect((await service.ingestReading(payload(true, true))).state).toBe("FULL");
    expect((await service.ingestReading(payload(false, true))).state).toBe("ANOMALY");
  });

  it("rechaza un deviceId no registrado", async () => {
    await expect(
      service.ingestReading({ ...payload(true, true), deviceId: "ESP8266-DESCONOCIDO" }),
    ).rejects.toBeInstanceOf(UnknownDeviceError);
  });

  it("usa la hora de recepcion cuando el payload no trae timestamp", async () => {
    const before = Date.now();
    const result = await service.ingestReading(payload(true, true));
    const ts = new Date(result.reading.timestamp).getTime();

    expect(ts).toBeGreaterThanOrEqual(before - 1000);
    expect(ts).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("respeta el timestamp enviado por el dispositivo", async () => {
    const iso = "2026-08-20T19:30:00.000Z";
    const result = await service.ingestReading(payload(true, false, iso));
    expect(result.reading.timestamp).toBe(iso);
  });

  it("marca el dispositivo como ONLINE tras recibir una lectura", async () => {
    const result = await service.ingestReading(payload(true, true));
    expect(result.device.status).toBe("ONLINE");
    expect(result.device.lastLow).toBe(true);
    expect(result.device.lastHigh).toBe(true);
  });

  it("crea la alerta de anomalia dentro del pipeline de ingesta", async () => {
    const result = await service.ingestReading(payload(false, true));

    expect(result.state).toBe("ANOMALY");
    expect(result.activeAlerts.map((a) => a.type)).toContain("SENSOR_INCONSISTENCY");
  });
});

describe("emision en tiempo real", () => {
  it("publica un evento `reading` por cada lectura ingerida", async () => {
    const received: RealtimeEvent[] = [];
    const unsubscribe = subscribe((event) => received.push(event));

    await service.ingestReading(payload(true, true));
    unsubscribe();

    const readingEvents = received.filter((e) => e.event === "reading");
    expect(readingEvents).toHaveLength(1);
    expect(readingEvents[0].data).toMatchObject({
      state: { state: "FULL", label: "TANQUE LLENO" },
      reading: { low: true, high: true },
    });
  });
});

describe("estado de comunicacion", () => {
  it("es UNKNOWN antes de la primera lectura", async () => {
    const overview = await service.getOverview();
    expect(overview.device.status).toBe("UNKNOWN");
    expect(overview.state).toBeNull();
    expect(overview.latestReading).toBeNull();
  });

  it("pasa a OFFLINE y abre alerta al superar el timeout", async () => {
    await service.ingestReading(payload(true, true));

    const future = new Date(Date.now() + 120_000);
    const { device, activeAlerts } = await service.refreshDeviceStatus(future);

    expect(device.status).toBe("OFFLINE");
    expect(activeAlerts.map((a) => a.type)).toContain("DEVICE_OFFLINE");
  });

  it("cierra la alerta de offline cuando el dispositivo reaparece", async () => {
    await service.ingestReading(payload(true, true));
    await service.refreshDeviceStatus(new Date(Date.now() + 120_000));

    const result = await service.ingestReading(payload(true, true));
    expect(result.activeAlerts.map((a) => a.type)).not.toContain("DEVICE_OFFLINE");
  });
});

describe("historial", () => {
  it("devuelve las lecturas del rango, de la mas reciente a la mas antigua", async () => {
    const t0 = new Date("2026-08-20T19:00:00.000Z");
    await service.ingestReading(payload(false, false, t0.toISOString()));
    await service.ingestReading(payload(true, false, new Date(t0.getTime() + 60_000).toISOString()));
    await service.ingestReading(payload(true, true, new Date(t0.getTime() + 120_000).toISOString()));

    const history = await service.getHistory(t0, new Date(t0.getTime() + 300_000));

    expect(history).toHaveLength(3);
    expect(history.map((r) => r.state)).toEqual(["FULL", "MEDIUM", "LOW"]);
  });

  it("excluye las lecturas fuera del rango solicitado", async () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await service.ingestReading(payload(true, true, old.toISOString()));
    await service.ingestReading(payload(true, false));

    const lastHour = await service.getHistory(new Date(Date.now() - 3600_000), new Date());
    expect(lastHour).toHaveLength(1);
    expect(lastHour[0].state).toBe("MEDIUM");
  });
});

describe("vista agregada", () => {
  it("incluye tanque, estado, dispositivo y alertas activas", async () => {
    await service.ingestReading(payload(false, false));
    const overview = await service.getOverview();

    expect(overview.tank.name).toBeTruthy();
    expect(overview.state?.state).toBe("LOW");
    expect(overview.latestReading?.low).toBe(false);
    expect(overview.device.deviceId).toBe(DEVICE_ID);
    expect(overview.activeAlerts.map((a) => a.type)).toContain("LOW_LEVEL");
    expect(typeof overview.serverTime).toBe("string");
  });
});
