import { EventEmitter } from "node:events";
import type { RealtimeEvent } from "./events";

/**
 * Bus de eventos en proceso.
 *
 * El backend publica aqui; el endpoint SSE (/api/tank/stream) se suscribe y
 * reenvia a cada dashboard conectado. El frontend nunca conoce este modulo:
 * solo habla con el hook useTankRealtime().
 *
 * Nota de escalado: al ser in-process, funciona con una unica instancia de
 * servidor. Para multi-instancia basta sustituir la implementacion por
 * Redis pub/sub o Postgres LISTEN/NOTIFY sin tocar el resto del sistema.
 */

const CHANNEL = "tank";

declare global {
  var __tanqueEventBus: EventEmitter | undefined;
}

function emitter(): EventEmitter {
  if (!globalThis.__tanqueEventBus) {
    const bus = new EventEmitter();
    // Cada pestania abierta del dashboard es un listener.
    bus.setMaxListeners(100);
    globalThis.__tanqueEventBus = bus;
  }
  return globalThis.__tanqueEventBus;
}

export function publish(event: RealtimeEvent): void {
  emitter().emit(CHANNEL, event);
}

export function subscribe(listener: (event: RealtimeEvent) => void): () => void {
  const bus = emitter();
  bus.on(CHANNEL, listener);
  return () => {
    bus.off(CHANNEL, listener);
  };
}

export function subscriberCount(): number {
  return emitter().listenerCount(CHANNEL);
}
