"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, Droplets, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNow } from "@/hooks/use-now";
import { formatDuration, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SupplyAssessmentDTO, TankStateSnapshot } from "@/types";
import { STATE_TONE, TONE, type Tone } from "./tone";
import { StatusDot } from "./status-dot";

/**
 * Elemento principal del panel.
 *
 * Responde de un vistazo a la unica pregunta que motiva el sistema:
 * >la finca se puede quedar sin agua? El estado de la reserva pasa a ser el
 * dato de apoyo, no el titular.
 */
export function SupplyStatusCard({
  supply,
  state,
}: {
  supply: SupplyAssessmentDTO | null;
  state: TankStateSnapshot | null;
}) {
  const now = useNow();
  const tone = (supply?.riskTone ?? "idle") as Tone;
  const classes = TONE[tone];
  const atRisk = supply?.risk === "CRITICAL";
  const unevaluable = supply?.risk === "UNKNOWN";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 p-0 transition-colors duration-500",
        classes.border,
      )}
    >
      <div className={cn("absolute inset-0 opacity-[0.55]", classes.surface)} />
      <div className={cn("absolute inset-x-0 top-0 h-1", classes.dot)} aria-hidden />

      <div className="relative flex flex-col gap-5 p-6 lg:flex-row lg:items-stretch lg:justify-between">
        {/* Riesgo de desabastecimiento */}
        <div className="flex min-w-0 items-start gap-4">
          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-xl border",
              classes.border,
              classes.surface,
            )}
          >
            {atRisk || unevaluable ? (
              <AlertTriangle className={cn("size-7", classes.text)} />
            ) : (
              <Droplets className={cn("size-7", classes.text)} />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
              ESTADO DEL ABASTECIMIENTO
            </p>
            <h2
              className={cn(
                "mt-1 flex items-center gap-3 text-3xl leading-tight font-bold tracking-tight md:text-4xl",
                classes.text,
              )}
            >
              <StatusDot tone={tone} size="lg" pulse={tone !== "ok"} />
              {supply?.riskLabel ?? "SIN DATOS"}
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {supply?.riskHeadline ??
                "Todavía no se ha recibido ninguna lectura. Inicie el simulador o conecte el ESP8266."}
            </p>

            {supply?.action ? (
              <p
                className={cn(
                  "mt-3 rounded-md border px-3 py-2 text-sm font-medium",
                  classes.border,
                  classes.surface,
                  classes.text,
                )}
              >
                {supply.action}
              </p>
            ) : null}
          </div>
        </div>

        {/* Reserva: dato de apoyo */}
        <div className="shrink-0 rounded-lg border border-border/60 bg-card/70 p-4 backdrop-blur-sm lg:w-[290px]">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
            RESERVA DE AGUA
          </p>

          <p
            className={cn(
              "mt-1 text-xl font-bold tracking-tight",
              state ? TONE[STATE_TONE[state.state]].text : "text-muted-foreground",
            )}
          >
            {state ? state.label : "SIN LECTURAS"}
          </p>

          <dl className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <Row label="En este estado desde">
              {supply?.stateSince && now
                ? formatRelative(supply.stateSince, now)
                : supply?.secondsInState != null
                  ? formatDuration(supply.secondsInState)
                  : "--"}
            </Row>
            <Row label="Tendencia">
              <span className="inline-flex items-center gap-1">
                <TrendIcon trend={supply?.trend} />
                {supply?.trendLabel ?? "--"}
              </span>
            </Row>
            <Row label="Última reserva completa">
              {supply?.lastFullAt && now
                ? formatRelative(supply.lastFullAt, now)
                : supply?.lastFullAt
                  ? "—"
                  : "sin registro"}
            </Row>
          </dl>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-mono tabular-nums text-foreground">{children}</dd>
    </div>
  );
}

function TrendIcon({ trend }: { trend?: SupplyAssessmentDTO["trend"] }) {
  if (trend === "RISING")
    return <ArrowUpRight className="size-3.5 text-[var(--status-ok)]" />;
  if (trend === "FALLING")
    return <ArrowDownRight className="size-3.5 text-[var(--status-critical)]" />;
  return <Minus className="size-3.5 text-muted-foreground" />;
}
