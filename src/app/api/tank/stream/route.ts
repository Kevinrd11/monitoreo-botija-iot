import { subscribe } from "@/realtime/event-bus";
import type { RealtimeEvent } from "@/realtime/events";
import { getTankService } from "@/services/tank.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Cada cuanto el servidor reevalua el estado de comunicacion del dispositivo. */
const TICK_MS = 5_000;

/**
 * GET /api/tank/stream  (text/event-stream)
 *
 * Canal Server-Sent Events del dashboard. Se eligio SSE sobre WebSockets
 * porque el flujo es unidireccional (servidor -> navegador), reconecta solo y
 * no requiere infraestructura adicional.
 *
 * Eventos emitidos: `reading`, `alerts`, `device`, `heartbeat`.
 * El cliente no habla nunca con el ESP8266: solo con este endpoint.
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const service = getTankService();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      const send = (payload: RealtimeEvent) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${payload.event}\ndata: ${JSON.stringify(payload.data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      // Snapshot inicial: el dashboard queda sincronizado sin esperar eventos.
      try {
        const overview = await service.getOverview();
        controller.enqueue(
          encoder.encode(`event: snapshot\ndata: ${JSON.stringify(overview)}\n\n`),
        );
      } catch (error) {
        console.error("[stream] no se pudo enviar el snapshot inicial:", error);
      }

      const unsubscribe = subscribe(send);

      const tick = setInterval(async () => {
        if (closed) return;
        try {
          // Reconcilia ONLINE/OFFLINE y abre o cierra DEVICE_OFFLINE.
          const { device } = await service.refreshDeviceStatus();
          send({ event: "device", data: { device } });
          send({ event: "heartbeat", data: { serverTime: new Date().toISOString() } });
        } catch (error) {
          console.error("[stream] error en el tick:", error);
        }
      }, TICK_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(tick);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* el stream ya estaba cerrado */
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
