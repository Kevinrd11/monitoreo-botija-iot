import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockESP8266, type MockTransport } from "@/mocks/mock-esp8266";
import { SCENARIOS } from "@/mocks/scenarios";
import { TankStateService } from "@/services/tank-state.service";
import type { ReadingPayload } from "@/types";

class RecordingTransport implements MockTransport {
  sent: ReadingPayload[] = [];
  async send(payload: ReadingPayload) {
    this.sent.push(payload);
    return { ok: true, state: TankStateService.determine(payload.low, payload.high) };
  }
}

let transport: RecordingTransport;
let device: MockESP8266;

beforeEach(() => {
  transport = new RecordingTransport();
  device = new MockESP8266({ deviceId: "ESP8266-TANQUE-001", transport, intervalMs: 1000 });
});

describe("payload generado por el simulador", () => {
  it("tiene exactamente la forma que enviara el ESP8266 real", async () => {
    await device.sendSensors(true, false);

    expect(transport.sent).toHaveLength(1);
    const payload = transport.sent[0];
    expect(Object.keys(payload).sort()).toEqual(["deviceId", "high", "low", "timestamp"]);
    expect(payload.deviceId).toBe("ESP8266-TANQUE-001");
    expect(typeof payload.low).toBe("boolean");
    expect(typeof payload.high).toBe("boolean");
    expect(Number.isNaN(Date.parse(payload.timestamp!))).toBe(false);
  });
});

describe("escenarios", () => {
  it.each([
    ["low", false, false, "LOW"],
    ["rising", true, false, "MEDIUM"],
    ["full", true, true, "FULL"],
    ["anomaly", false, true, "ANOMALY"],
  ] as const)("%s produce LOW=%s HIGH=%s -> %s", async (id, low, high, state) => {
    const result = await device.sendScenario(id);

    expect(transport.sent.at(-1)).toMatchObject({ low, high });
    expect(result?.state).toBe(state);
    expect(SCENARIOS[id].expectedState).toBe(state);
  });

  it("el escenario offline no envia ninguna lectura", async () => {
    const result = await device.sendScenario("offline");

    expect(result).toBeNull();
    expect(transport.sent).toHaveLength(0);
  });
});

describe("envio automatico", () => {
  beforeEach(() => vi.useFakeTimers());

  it("emite en cada intervalo y recorre los frames del ciclo", async () => {
    device.start("cycle", 1000);
    await vi.advanceTimersByTimeAsync(3000);
    device.stop();

    expect(transport.sent.length).toBeGreaterThanOrEqual(4);
    expect(transport.sent.slice(0, 4).map((p) => [p.low, p.high])).toEqual([
      [false, false],
      [true, false],
      [true, true],
      [true, false],
    ]);
  });

  it("stop() detiene la comunicacion, simulando un dispositivo offline", async () => {
    device.start("full", 1000);
    await vi.advanceTimersByTimeAsync(2000);
    const sentBeforeStop = transport.sent.length;

    device.stop();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(device.running).toBe(false);
    expect(transport.sent).toHaveLength(sentBeforeStop);
  });

  it("el escenario offline arranca sin emitir nada", async () => {
    device.start("offline", 1000);
    await vi.advanceTimersByTimeAsync(5000);

    expect(transport.sent).toHaveLength(0);
  });
});
