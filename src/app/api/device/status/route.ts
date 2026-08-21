import { handle, ok } from "@/lib/api";
import { getTankService } from "@/services/tank.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/device/status
 * Estado de comunicacion del ESP8266. Ademas reconcilia la alerta
 * DEVICE_OFFLINE si el dispositivo supero el timeout configurado.
 */
export async function GET() {
  return handle(async () => {
    const { device, supply, activeAlerts } = await getTankService().refreshDeviceStatus();
    return ok({ device, supply, activeAlerts });
  });
}
