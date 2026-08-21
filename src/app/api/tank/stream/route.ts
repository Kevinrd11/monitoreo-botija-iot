import { subscribe } from "@/realtime/event-bus";
import type { RealtimeEvent } from "@/realtime/events";
import { getTankService } from "@/services/tank.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Cada cuanto el servidor reevalua el riesgo y busca lecturas nuevas. */
const TICK_MS = 5_000;

/**
 * GET /api/tank/stream  (text/event-stream)
 *
 * Canal Server-Sent Events del panel. Se eligio SSE sobre WebSockets porque el
 * flujo es unidireccional (servidor -> navegador), reconecta solo y no requiere
 * infraestructura adicional.
 *
 * DOS CAMINOS, A PROPOSITO
 *
 *  1. Bus en proceso: cuando la lectura entra por la MISMA instancia que
 *     atiende este stream, el panel se entera al instante.
 *
 *  2. Sondeo del estado compartido en cada tick: en un despliegue con varias
 *     instancias (Vercel), el ESP8266 puede escribir en una instancia distinta
 *     de la que sirve este stream, y el bus en memoria nunca se lo entregaria.
 *     Por eso cada tick relee el estado desde la base de datos y emite un
 *     evento `reading` si la ultima lectura cambio.
 *
 * El resultado es correcto en ambos casos: instantaneo si hay afinidad de
 * instancia, y con TICK_MS de retraso como maximo si no la hay. El cliente no
 * distingue: recibe los mismos eventos.
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const service = getTankService();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      /** Ultima lectura ya notificada por este stream, sea por bus o por tick. */
      let lastReadingId: string | null = null;

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

      // Snapshot inicial: el panel queda sincronizado sin esperar eventos.
      try {
        const overview = await service.getOverview();
        lastReadingId = overview.latestReading?.id ?? null;
        controller.enqueue(
          encoder.encode(`event: snapshot\ndata: ${JSON.stringify(overview)}\n\n`),
        );
      } catch (error) {
        console.error("[stream] no se pudo enviar el snapshot inicial:", error);
      }

      // Camino 1: eventos publicados por esta misma instancia.
      const unsubscribe = subscribe((event) => {
        if (event.event === "reading") lastReadingId = event.data.reading.id;
        send(event);
      });

      // Camino 2: reconciliacion periodica contra el estado compartido.
      const tick = setInterval(async () => {
        if (closed) return;
        try {
          const overview = await service.getOverview();

          const reading = overview.latestReading;
          if (reading && reading.id !== lastReadingId) {
            lastReadingId = reading.id;
            send({
              event: "reading",
              data: {
                reading,
                state: overview.state!,
                supply: overview.supply,
                device: overview.device,
                activeAlerts: overview.activeAlerts,
              },
            });
          } else {
            // Sin lecturas nuevas, basta con refrescar enlace y riesgo.
            send({
              event: "device",
              data: { device: overview.device, supply: overview.supply },
            });
          }

          send({ event: "heartbeat", data: { serverTime: overview.serverTime } });
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
