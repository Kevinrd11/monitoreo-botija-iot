import type { ReadingPayload } from "@/types";
import { SCENARIOS, type ScenarioId } from "./scenarios";

/**
 * MockESP8266
 *
 * Reemplaza al hardware durante el desarrollo. Construye exactamente el mismo
 * JSON que enviara la placa real y lo entrega a traves de un "transporte":
 *
 *   - HttpTransport   -> POST real a /api/tank/readings (script CLI).
 *   - Cualquier otro  -> inyeccion directa en el backend (simulador embebido).
 *
 * El backend no distingue entre este simulador y el ESP8266 fisico.
 */

export interface MockTransport {
  send(payload: ReadingPayload): Promise<{ ok: boolean; state?: string; error?: string }>;
}

export class HttpTransport implements MockTransport {
  constructor(private readonly endpoint: string) {}

  async send(payload: ReadingPayload) {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as {
      state?: string;
      error?: string;
    };
    return { ok: response.ok, state: body.state, error: body.error };
  }
}

export interface MockESP8266Options {
  deviceId: string;
  transport: MockTransport;
  intervalMs?: number;
  onSend?: (payload: ReadingPayload, result: { ok: boolean; state?: string; error?: string }) => void;
}

export interface MockStatus {
  running: boolean;
  scenario: ScenarioId;
  intervalMs: number;
  frameIndex: number;
  sentCount: number;
  lastSentAt: string | null;
  lastPayload: ReadingPayload | null;
}

export class MockESP8266 {
  private timer: ReturnType<typeof setInterval> | null = null;
  private scenario: ScenarioId = "rising";
  private frameIndex = 0;
  private sentCount = 0;
  private lastSentAt: Date | null = null;
  private lastPayload: ReadingPayload | null = null;
  private intervalMs: number;

  constructor(private readonly options: MockESP8266Options) {
    this.intervalMs = options.intervalMs ?? 5000;
  }

  /** Envia una unica lectura con los sensores indicados. */
  async sendSensors(low: boolean, high: boolean) {
    const payload: ReadingPayload = {
      deviceId: this.options.deviceId,
      low,
      high,
      timestamp: new Date().toISOString(),
    };
    const result = await this.options.transport.send(payload);
    this.sentCount += 1;
    this.lastSentAt = new Date();
    this.lastPayload = payload;
    this.options.onSend?.(payload, result);
    return result;
  }

  /** Envia una unica lectura correspondiente al escenario indicado. */
  async sendScenario(id: ScenarioId) {
    const scenario = SCENARIOS[id];
    if (scenario.frames.length === 0) return null; // offline: no se envia nada
    const frame = scenario.frames[0];
    return this.sendSensors(frame.low, frame.high);
  }

  /** Arranca el envio periodico recorriendo los frames del escenario. */
  start(id: ScenarioId = this.scenario, intervalMs = this.intervalMs) {
    this.stop();
    this.scenario = id;
    this.intervalMs = intervalMs;
    this.frameIndex = 0;

    const scenario = SCENARIOS[id];
    if (scenario.frames.length === 0) return; // "offline": arrancado pero mudo

    const emit = async () => {
      const frames = SCENARIOS[this.scenario].frames;
      if (frames.length === 0) return;
      const frame = frames[this.frameIndex % frames.length];
      this.frameIndex += 1;
      try {
        await this.sendSensors(frame.low, frame.high);
      } catch (error) {
        console.error("[MockESP8266] fallo al enviar la lectura:", error);
      }
    };

    void emit();
    this.timer = setInterval(() => void emit(), intervalMs);
  }

  /** Detiene el envio: equivale a que el ESP8266 pierda WiFi o alimentacion. */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  get running(): boolean {
    return this.timer !== null;
  }

  status(): MockStatus {
    return {
      running: this.running,
      scenario: this.scenario,
      intervalMs: this.intervalMs,
      frameIndex: this.frameIndex,
      sentCount: this.sentCount,
      lastSentAt: this.lastSentAt ? this.lastSentAt.toISOString() : null,
      lastPayload: this.lastPayload,
    };
  }
}
