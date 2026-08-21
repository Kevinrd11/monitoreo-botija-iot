"use client";

import { AlertTriangle, Droplets } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/format";
import type { ReadingDTO, TankStateSnapshot } from "@/types";
import { STATE_TONE, TONE } from "./tone";
import { StatusDot } from "./status-dot";

interface TankStateCardProps {
  state: TankStateSnapshot | null;
  reading: ReadingDTO | null;
}

/** Card principal: el estado del tanque es la informacion mas importante. */
export function TankStateCard({ state, reading }: TankStateCardProps) {
  const tone = state ? STATE_TONE[state.state] : "idle";
  const classes = TONE[tone];
  const isAnomaly = state?.state === "ANOMALY";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 p-0 transition-colors duration-500",
        classes.border,
      )}
    >
      <div className={cn("absolute inset-0 opacity-[0.55]", classes.surface)} />
      <div
        className={cn("absolute inset-x-0 top-0 h-1", classes.dot)}
        aria-hidden
      />

      <div className="relative flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-xl border",
              classes.border,
              classes.surface,
            )}
          >
            {isAnomaly ? (
              <AlertTriangle className={cn("size-7", classes.text)} />
            ) : (
              <Droplets className={cn("size-7", classes.text)} />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
              ESTADO DEL TANQUE
            </p>
            <h2
              className={cn(
                "mt-1 flex items-center gap-3 text-3xl leading-tight font-bold tracking-tight md:text-4xl",
                classes.text,
              )}
            >
              <StatusDot tone={tone} size="lg" pulse={tone !== "ok"} />
              {state ? state.label : "SIN LECTURAS"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {state
                ? state.message
                : "Todavia no se ha recibido ninguna lectura del dispositivo. Inicie el simulador o conecte el ESP8266."}
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-lg border border-border/60 bg-card/70 px-4 py-3 text-right backdrop-blur-sm">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
            ULTIMA LECTURA
          </p>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {formatClock(reading?.timestamp ?? null)}
          </p>
          <div className="mt-2 flex justify-end gap-1.5 font-mono text-[11px]">
            <SensorPill label="LOW" on={reading?.low ?? null} />
            <SensorPill label="HIGH" on={reading?.high ?? null} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function SensorPill({ label, on }: { label: string; on: boolean | null }) {
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 font-semibold",
        on === null
          ? "border-border text-muted-foreground"
          : on
            ? "border-[var(--status-ok)]/40 bg-[var(--status-ok)]/10 text-[var(--status-ok)]"
            : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {label} {on === null ? "--" : on ? "ON" : "OFF"}
    </span>
  );
}
