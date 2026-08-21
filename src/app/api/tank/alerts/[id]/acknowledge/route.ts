import { toAlertDTO } from "@/lib/serializers";
import { fail, handle, ok } from "@/lib/api";
import { getTankService } from "@/services/tank.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/tank/alerts/:id/acknowledge
 * Marca la alerta como reconocida por un operador (sigue abierta).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const service = getTankService();
    const alert = await service.alerts.acknowledge(id);

    if (!alert) {
      return fail("NOT_FOUND", 404, {
        message: "La alerta no existe o no esta en estado ACTIVE.",
      });
    }

    await service.publishAlertsChanged();
    return ok({ alert: toAlertDTO(alert) });
  });
}
