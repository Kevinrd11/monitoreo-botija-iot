"use client";

import { useCallback, useEffect, useState } from "react";
import type { MockStatus } from "@/mocks/mock-esp8266";
import type { Scenario, ScenarioId } from "@/mocks/scenarios";

/**
 * Control del simulador de ESP8266 (solo desarrollo).
 * Habla con /api/mock, que a su vez inyecta lecturas por el mismo pipeline
 * que usara el dispositivo real.
 */
export function useMockDevice() {
  const [enabled, setEnabled] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [status, setStatus] = useState<MockStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/mock", { cache: "no-store" });
      const body = await response.json();
      if (!body.success) {
        setEnabled(false);
        return;
      }
      setEnabled(true);
      setScenarios(body.scenarios as Scenario[]);
      setStatus(body.status as MockStatus);
    } catch {
      setEnabled(false);
    }
  }, []);

  useEffect(() => {
    // Descubre si el simulador esta habilitado. Es asincrono: el setState
    // ocurre al resolverse la peticion, no de forma sincrona en el efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const post = useCallback(
    async (payload: { action: "send" | "start" | "stop"; scenario?: ScenarioId }) => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch("/api/mock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!body.success) throw new Error(body.error ?? "El simulador rechazo la accion");
        setStatus(body.status as MockStatus);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error de red");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return {
    enabled,
    scenarios,
    status,
    busy,
    error,
    reload: load,
    send: (scenario: ScenarioId) => post({ action: "send", scenario }),
    start: (scenario: ScenarioId) => post({ action: "start", scenario }),
    stop: () => post({ action: "stop" }),
  };
}
