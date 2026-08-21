import { describe, expect, it } from "vitest";
import { publish, subscribe, subscriberCount } from "@/realtime/event-bus";
import type { RealtimeEvent } from "@/realtime/events";

describe("bus de eventos en tiempo real", () => {
  it("entrega los eventos a todos los suscriptores", () => {
    const a: RealtimeEvent[] = [];
    const b: RealtimeEvent[] = [];
    const unsubA = subscribe((e) => a.push(e));
    const unsubB = subscribe((e) => b.push(e));

    publish({ event: "heartbeat", data: { serverTime: "2026-08-20T20:00:00.000Z" } });

    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    unsubA();
    unsubB();
  });

  it("deja de entregar tras cancelar la suscripcion", () => {
    const received: RealtimeEvent[] = [];
    const unsubscribe = subscribe((e) => received.push(e));
    const before = subscriberCount();

    unsubscribe();
    publish({ event: "heartbeat", data: { serverTime: new Date().toISOString() } });

    expect(received).toHaveLength(0);
    expect(subscriberCount()).toBe(before - 1);
  });
});
