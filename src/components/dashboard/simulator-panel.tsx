"use client";

import { FlaskConical, Play, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMockDevice } from "@/hooks/use-mock-device";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";
import { formatRelative } from "@/lib/format";
import type { ScenarioId } from "@/mocks/scenarios";
import { StatusDot } from "./status-dot";

const SCENARIO_TONE: Record<string, string> = {
  low: "text-[var(--status-critical)]",
  rising: "text-[var(--status-warning)]",
  full: "text-[var(--status-ok)]",
  anomaly: "text-[var(--status-anomaly)]",
  offline: "text-muted-foreground",
  cycle: "text-[var(--water)]",
};

/**
 * Herramienta de desarrollo: reemplaza al ESP8266.
 *
 * Permite ensayar cada situacion de riesgo — incluido el desabastecimiento —
 * sin esperar a que ocurra en la finca. Cada boton envia exactamente el mismo
 * JSON que enviara la placa real por POST /api/tank/readings, de modo que el
 * panel reacciona igual que en produccion.
 * Se oculta cuando MOCK_ESP8266_ENABLED=false.
 */
export function SimulatorPanel() {
  const { enabled, scenarios, status, busy, send, start, stop } = useMockDevice();
  const now = useNow();

  if (!enabled) return null;

  return (
    <Card className="gap-0 overflow-hidden border-dashed py-0">
      <CardHeader className="flex flex-col gap-2 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-[0.14em]">
            <FlaskConical className="size-4 text-muted-foreground" />
            ENSAYO DE ESCENARIOS
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Solo desarrollo. Reproduce situaciones de la finca por el mismo endpoint que
            usará la placa real.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5">
            <StatusDot tone={status?.running ? "ok" : "idle"} pulse={status?.running} size="sm" />
            {status?.running ? "Simulación en curso" : "Detenido"}
          </span>
          {status?.lastSentAt && now && (
            <span className="hidden font-mono text-muted-foreground sm:inline">
              última lectura {formatRelative(status.lastSentAt, now)} · {status.sentCount} en total
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={cn(
              "flex flex-col justify-between gap-3 rounded-lg border p-4 transition-colors",
              status?.running && status.scenario === scenario.id
                ? "border-[var(--water)]/50 bg-[var(--water)]/5"
                : "border-border",
            )}
          >
            <div>
              <p
                className={cn(
                  "text-sm font-bold tracking-wide",
                  SCENARIO_TONE[scenario.id] ?? "text-foreground",
                )}
              >
                {scenario.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {scenario.description}
              </p>
            </div>

            <div className="flex gap-2">
              {scenario.id === "offline" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void stop()}
                  className="flex-1"
                >
                  <Square className="size-3.5" />
                  Cortar enlace
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void send(scenario.id as ScenarioId)}
                    className="flex-1"
                  >
                    <Send className="size-3.5" />
                    Enviar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void start(scenario.id as ScenarioId)}
                    className="flex-1"
                  >
                    <Play className="size-3.5" />
                    Automatico
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
