import { handle, ok } from "@/lib/api";
import { getTankService } from "@/services/tank.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/tank
 * Vista agregada del sistema: tanque, estado, ultima lectura, dispositivo y
 * alertas activas. Es la unica llamada que el dashboard necesita al arrancar.
 */
export async function GET() {
  return handle(async () => {
    const overview = await getTankService().getOverview();
    return ok({ data: overview });
  });
}
