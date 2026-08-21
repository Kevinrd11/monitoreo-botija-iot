import { toReadingDTO } from "@/lib/serializers";
import { handle, ok } from "@/lib/api";
import { TankStateService } from "@/services/tank-state.service";
import { getTankService } from "@/services/tank.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/tank/latest
 * Ultima lectura recibida y su estado derivado.
 */
export async function GET() {
  return handle(async () => {
    const reading = await getTankService().getLatestReading();
    if (!reading) {
      return ok({ reading: null, state: null });
    }
    return ok({
      reading: toReadingDTO(reading),
      state: TankStateService.snapshot(reading.state),
    });
  });
}
