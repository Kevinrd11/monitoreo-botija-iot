"use client";

import { useCallback, useEffect, useState } from "react";
import type { HistoryRange, ReadingDTO } from "@/types";

/** Historial de lecturas para el grafico y la tabla de sensores. */
export function useTankHistory(range: HistoryRange, version: number) {
  const [readings, setReadings] = useState<ReadingDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/tank/readings?range=${range}&limit=2000`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error ?? "Error al consultar el historial");
      setReadings(body.readings as ReadingDTO[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
  // Carga inicial y recarga al cambiar el filtro: `load` es asincrona, el
  // setState ocurre tras la respuesta, no de forma sincrona en el efecto.
  // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, version]);

  return { readings, loading, error, reload: load };
}
