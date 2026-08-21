import { NextRequest } from "next/server";
import { RANGE_MS, historyRangeSchema, readingPayloadSchema } from "@/lib/validation";
import { fail, handle, ok } from "@/lib/api";
import { getTankService, UnknownDeviceError } from "@/services/tank.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/tank/readings
 *
 * Endpoint que consumira el ESP8266 real. Cuerpo esperado:
 *   { "deviceId": "ESP8266-TANQUE-001", "low": true, "high": false,
 *     "timestamp": "2026-08-20T19:30:00Z" }   // timestamp opcional
 *
 * Respuesta: { "success": true, "state": "MEDIUM" }
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_PAYLOAD", 400, { message: "El cuerpo no es JSON valido." });
    }

    const parsed = readingPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return fail("INVALID_PAYLOAD", 400, {
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }

    try {
      const result = await getTankService().ingestReading(parsed.data);
      return ok({
        state: result.state,
        reading: result.reading,
        device: { status: result.device.status },
        activeAlerts: result.activeAlerts.length,
      });
    } catch (error) {
      if (error instanceof UnknownDeviceError) {
        return fail("UNKNOWN_DEVICE", 404, { message: error.message });
      }
      throw error;
    }
  });
}

/**
 * GET /api/tank/readings?range=1h|6h|24h|7d&limit=1000
 * Historial de lecturas, de la mas reciente a la mas antigua.
 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const range = historyRangeSchema.safeParse(params.get("range") ?? undefined);
    if (!range.success) {
      return fail("INVALID_PAYLOAD", 400, { message: "range invalido (1h|6h|24h|7d)." });
    }

    const limitParam = Number(params.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 5000) : 1000;

    const to = new Date();
    const from = new Date(to.getTime() - RANGE_MS[range.data]);
    const readings = await getTankService().getHistory(from, to, limit);

    return ok({
      range: range.data,
      from: from.toISOString(),
      to: to.toISOString(),
      count: readings.length,
      readings,
    });
  });
}
