"use client";

import { useState } from "react";
import { BellRing, Check, CheckCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ALERT_TYPE_META } from "@/domain/alert";
import { type AlertFilter, useAlerts } from "@/hooks/use-alerts";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AlertDTO } from "@/types";
import { SEVERITY_TONE, TONE } from "./tone";
import { StatusDot } from "./status-dot";

const FILTERS: Array<{ id: AlertFilter; label: string }> = [
  { id: "OPEN", label: "Activas" },
  { id: "RESOLVED", label: "Resueltas" },
  { id: "ALL", label: "Todas" },
];

/** Panel de alertas con reconocimiento, resolucion y filtrado. */
export function AlertsPanel({ version }: { version: number }) {
  const [filter, setFilter] = useState<AlertFilter>("OPEN");
  const { alerts, loading, pendingId, acknowledge, resolve } = useAlerts(filter, version);

  const openCount = alerts.filter((a) => a.status !== "RESOLVED").length;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-[0.14em]">
          <BellRing className="size-4 text-muted-foreground" />
          PANEL DE ALERTAS
          {filter === "OPEN" && openCount > 0 && (
            <span className="rounded-full bg-[var(--status-critical)] px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
              {openCount}
            </span>
          )}
        </CardTitle>

        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === option.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading && alerts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Cargando alertas...</p>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <ShieldCheck className="size-8 text-[var(--status-ok)]" />
            <p className="text-sm font-medium">
              {filter === "OPEN" ? "Sin alertas activas" : "No hay alertas en este filtro"}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              El sistema abre alertas automaticamente ante nivel bajo sostenido,
              inconsistencia de sensores o perdida de comunicacion.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[340px]">
            <ul className="divide-y divide-border/70">
              {alerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  pending={pendingId === alert.id}
                  onAcknowledge={() => acknowledge(alert.id)}
                  onResolve={() => resolve(alert.id)}
                />
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function AlertRow({
  alert,
  pending,
  onAcknowledge,
  onResolve,
}: {
  alert: AlertDTO;
  pending: boolean;
  onAcknowledge: () => void;
  onResolve: () => void;
}) {
  const meta = ALERT_TYPE_META[alert.type];
  const tone = SEVERITY_TONE[alert.severity];
  const classes = TONE[tone];
  const resolved = alert.status === "RESOLVED";

  return (
    <li className={cn("flex gap-3 px-5 py-4", resolved && "opacity-60")}>
      <div className={cn("mt-1", resolved && "grayscale")}>
        <StatusDot tone={resolved ? "idle" : tone} pulse={alert.status === "ACTIVE"} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-sm font-bold tracking-wide", resolved ? "" : classes.text)}>
            {meta.emoji} {meta.title}
          </span>
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
              resolved ? "border-border text-muted-foreground" : cn(classes.border, classes.text),
            )}
          >
            {alert.severity}
          </span>
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
            {alert.status}
          </span>
        </div>

        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{alert.message}</p>

        <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
          {formatDateTime(alert.createdAt)} · {formatRelative(alert.createdAt)}
          {alert.resolvedAt && ` · resuelta ${formatRelative(alert.resolvedAt)}`}
        </p>
      </div>

      {!resolved && (
        <div className="flex shrink-0 flex-col gap-1.5">
          {alert.status === "ACTIVE" && (
            <Button size="sm" variant="outline" disabled={pending} onClick={onAcknowledge}>
              <Check className="size-3.5" />
              Reconocer
            </Button>
          )}
          <Button size="sm" variant="secondary" disabled={pending} onClick={onResolve}>
            <CheckCheck className="size-3.5" />
            Resolver
          </Button>
        </div>
      )}
    </li>
  );
}
