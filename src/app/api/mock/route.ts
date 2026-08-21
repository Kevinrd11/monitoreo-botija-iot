import { NextRequest } from "next/server";
import { serverEnv } from "@/config/env";
import { fail, handle, ok } from "@/lib/api";
import { getMockRunner } from "@/mocks/runner";
import { SCENARIO_LIST, SCENARIOS, isScenarioId } from "@/mocks/scenarios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Endpoint de DESARROLLO que controla el simulador de ESP8266.
 * Se desactiva poniendo MOCK_ESP8266_ENABLED=false.
 *
 * GET  /api/mock                       -> estado del simulador y escenarios
 * POST /api/mock { action, scenario }  -> "send" | "start" | "stop"
 */
export async function GET() {
  return handle(async () => {
    if (!serverEnv.mockEnabled) {
      return fail("DISABLED", 403, { message: "El simulador esta desactivado." });
    }
    return ok({
      enabled: true,
      deviceId: serverEnv.deviceId,
      defaultIntervalMs: serverEnv.mockIntervalMs,
      scenarios: SCENARIO_LIST,
      status: getMockRunner().status(),
    });
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    if (!serverEnv.mockEnabled) {
      return fail("DISABLED", 403, { message: "El simulador esta desactivado." });
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      scenario?: string;
      intervalMs?: number;
    };

    const runner = getMockRunner();
    const action = body.action ?? "send";

    if (action === "stop") {
      runner.stop();
      return ok({ status: runner.status() });
    }

    if (!isScenarioId(body.scenario)) {
      return fail("INVALID_PAYLOAD", 400, {
        message: `scenario invalido. Valores validos: ${SCENARIO_LIST.map((s) => s.id).join(", ")}`,
      });
    }

    if (action === "start") {
      runner.start(body.scenario, body.intervalMs ?? serverEnv.mockIntervalMs);
      return ok({ status: runner.status() });
    }

    if (action === "send") {
      // "offline" no envia nada: solo detiene la comunicacion.
      if (SCENARIOS[body.scenario].frames.length === 0) {
        runner.stop();
        return ok({ status: runner.status(), sent: false });
      }
      runner.stop();
      const result = await runner.sendScenario(body.scenario);
      return ok({ status: runner.status(), sent: true, result });
    }

    return fail("INVALID_PAYLOAD", 400, {
      message: "action invalida. Use send | start | stop.",
    });
  });
}
