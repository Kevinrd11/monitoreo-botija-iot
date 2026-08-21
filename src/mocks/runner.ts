import { serverEnv } from "@/config/env";
import { getTankService } from "@/services/tank.service";
import type { ReadingPayload } from "@/types";
import { MockESP8266, type MockTransport } from "./mock-esp8266";

/**
 * Simulador embebido en el servidor Next.js.
 *
 * Usa un transporte directo (llama al TankService) en lugar de HTTP para no
 * depender de la URL publica del despliegue. El pipeline que atraviesa la
 * lectura es identico al del endpoint REST.
 */
class DirectTransport implements MockTransport {
  async send(payload: ReadingPayload) {
    try {
      const result = await getTankService().ingestReading(payload);
      return { ok: true, state: result.state };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

declare global {
  var __tanqueMock: MockESP8266 | undefined;
}

export function getMockRunner(): MockESP8266 {
  globalThis.__tanqueMock ??= new MockESP8266({
    deviceId: serverEnv.deviceId,
    transport: new DirectTransport(),
    intervalMs: serverEnv.mockIntervalMs,
  });
  return globalThis.__tanqueMock;
}
