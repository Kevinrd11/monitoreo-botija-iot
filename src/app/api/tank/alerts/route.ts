import { NextRequest } from "next/server";
import { getDefaultTank } from "@/database/bootstrap";
import { toAlertDTO } from "@/lib/serializers";
import { fail, handle, ok } from "@/lib/api";
import { alertStatusFilterSchema } from "@/lib/validation";
import { getRepositories } from "@/repositories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/tank/alerts?status=OPEN|ACTIVE|ACKNOWLEDGED|RESOLVED|ALL&limit=100
 * Historial y panel de alertas. Por defecto devuelve las alertas abiertas.
 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const parsed = alertStatusFilterSchema.safeParse(params.get("status") ?? undefined);
    if (!parsed.success) {
      return fail("INVALID_PAYLOAD", 400, { message: "status invalido." });
    }

    const limitParam = Number(params.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 100;

    const repos = getRepositories();
    const tank = await getDefaultTank(repos);
    const alerts = await repos.alerts.find({
      tankId: tank.id,
      status: parsed.data === "ALL" ? undefined : parsed.data,
      limit,
    });

    return ok({ status: parsed.data, count: alerts.length, alerts: alerts.map(toAlertDTO) });
  });
}
