"use client";

import { useCallback, useEffect, useState } from "react";
import type { AlertDTO } from "@/types";

export type AlertFilter = "OPEN" | "RESOLVED" | "ALL";

/** Panel de alertas: listado filtrable y acciones de reconocer / resolver. */
export function useAlerts(filter: AlertFilter, version: number) {
  const [alerts, setAlerts] = useState<AlertDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/tank/alerts?status=${filter}&limit=200`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error ?? "Error al consultar las alertas");
      setAlerts(body.alerts as AlertDTO[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
  // Carga inicial y recarga al cambiar el filtro: `load` es asincrona, el
  // setState ocurre tras la respuesta, no de forma sincrona en el efecto.
  // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, version]);

  const act = useCallback(
    async (id: string, action: "acknowledge" | "resolve") => {
      setPendingId(id);
      try {
        const response = await fetch(`/api/tank/alerts/${id}/${action}`, { method: "POST" });
        const body = await response.json();
        if (!body.success) throw new Error(body.error ?? "La accion no se pudo aplicar");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error de red");
      } finally {
        setPendingId(null);
      }
    },
    [load],
  );

  return {
    alerts,
    loading,
    error,
    pendingId,
    reload: load,
    acknowledge: (id: string) => act(id, "acknowledge"),
    resolve: (id: string) => act(id, "resolve"),
  };
}
