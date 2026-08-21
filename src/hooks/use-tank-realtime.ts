"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AlertDTO, DeviceStatusDTO, TankOverviewDTO } from "@/types";

/**
 * useTankRealtime
 *
 * Unico punto de contacto del dashboard con el backend en tiempo real.
 * Los componentes no saben si por debajo hay SSE, WebSockets o polling:
 * solo consumen el snapshot y reaccionan a sus cambios.
 *
 * Estrategia: Server-Sent Events sobre /api/tank/stream con degradacion
 * automatica a polling de /api/tank si el navegador o el proxy no lo permiten.
 */

export type StreamStatus = "connecting" | "live" | "polling";

export interface TankRealtime {
  overview: TankOverviewDTO | null;
  loading: boolean;
  error: string | null;
  streamStatus: StreamStatus;
  /** Cambia con cada lectura nueva: sirve para invalidar historial y tablas. */
  readingVersion: number;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 5000;
const MAX_SSE_FAILURES = 3;

export function useTankRealtime(): TankRealtime {
  const [overview, setOverview] = useState<TankOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("connecting");
  const [readingVersion, setReadingVersion] = useState(0);

  const failuresRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const response = await fetch("/api/tank", { cache: "no-store" });
      const body = await response.json();
      if (!body.success) throw new Error(body.error ?? "Error al consultar el tanque");
      setOverview(body.data as TankOverviewDTO);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Snapshot inicial mientras se establece el canal SSE. La peticion es
    // asincrona: el setState ocurre al resolverse, no durante el efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOverview();
  }, [fetchOverview]);

  // ---- Polling de respaldo -------------------------------------------------
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    setStreamStatus("polling");
    pollTimerRef.current = setInterval(() => {
      void fetchOverview();
      setReadingVersion((v) => v + 1);
    }, POLL_INTERVAL_MS);
  }, [fetchOverview]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ---- Canal SSE -----------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      startPolling();
      return;
    }

    const source = new EventSource("/api/tank/stream");

    const onSnapshot = (event: MessageEvent<string>) => {
      failuresRef.current = 0;
      stopPolling();
      setStreamStatus("live");
      setOverview(JSON.parse(event.data) as TankOverviewDTO);
      setLoading(false);
      setError(null);
    };

    const onReading = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as {
        reading: TankOverviewDTO["latestReading"];
        state: TankOverviewDTO["state"];
        device: DeviceStatusDTO;
        activeAlerts: AlertDTO[];
      };
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              latestReading: payload.reading,
              state: payload.state,
              device: payload.device,
              activeAlerts: payload.activeAlerts,
              serverTime: new Date().toISOString(),
            }
          : prev,
      );
      setReadingVersion((v) => v + 1);
    };

    const onAlerts = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as { activeAlerts: AlertDTO[] };
      setOverview((prev) => (prev ? { ...prev, activeAlerts: payload.activeAlerts } : prev));
    };

    const onDevice = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as { device: DeviceStatusDTO };
      setOverview((prev) => (prev ? { ...prev, device: payload.device } : prev));
    };

    const onHeartbeat = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as { serverTime: string };
      setOverview((prev) => (prev ? { ...prev, serverTime: payload.serverTime } : prev));
    };

    const onOpen = () => {
      failuresRef.current = 0;
      stopPolling();
      setStreamStatus("live");
    };

    const onError = () => {
      failuresRef.current += 1;
      // EventSource reintenta solo; si insiste en fallar, pasamos a polling.
      if (failuresRef.current >= MAX_SSE_FAILURES) {
        startPolling();
      }
    };

    source.addEventListener("snapshot", onSnapshot as EventListener);
    source.addEventListener("reading", onReading as EventListener);
    source.addEventListener("alerts", onAlerts as EventListener);
    source.addEventListener("device", onDevice as EventListener);
    source.addEventListener("heartbeat", onHeartbeat as EventListener);
    source.addEventListener("open", onOpen);
    source.addEventListener("error", onError);

    return () => {
      source.removeEventListener("snapshot", onSnapshot as EventListener);
      source.removeEventListener("reading", onReading as EventListener);
      source.removeEventListener("alerts", onAlerts as EventListener);
      source.removeEventListener("device", onDevice as EventListener);
      source.removeEventListener("heartbeat", onHeartbeat as EventListener);
      source.removeEventListener("open", onOpen);
      source.removeEventListener("error", onError);
      source.close();
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  const refresh = useCallback(async () => {
    await fetchOverview();
    setReadingVersion((v) => v + 1);
  }, [fetchOverview]);

  return { overview, loading, error, streamStatus, readingVersion, refresh };
}
