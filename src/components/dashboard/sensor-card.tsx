"use client";

import { Radio } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StatusDot } from "./status-dot";
import { TONE } from "./tone";

interface SensorCardProps {
  name: "LOW" | "HIGH";
  description: string;
  active: boolean | null;
}

/**
 * Indicador de un sensor digital de nivel. Son la unica fuente de verdad del
 * sistema: de estos dos booleanos sale toda la evaluacion del riesgo de
 * desabastecimiento. Se actualiza en cuanto llega una lectura nueva.
 */
export function SensorCard({ name, description, active }: SensorCardProps) {
  const tone = active === null ? "idle" : active ? "ok" : "idle";
  const classes = TONE[tone];

  return (
    <Card
      className={cn(
        "h-full justify-between gap-0 p-5 transition-colors duration-300",
        active ? cn("border-[var(--status-ok)]/40", classes.surface) : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio
            className={cn(
              "size-4",
              active ? "text-[var(--status-ok)]" : "text-muted-foreground",
            )}
          />
          <span className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
            SENSOR {name}
          </span>
        </div>
        <StatusDot tone={tone} pulse={active === true} />
      </div>

      <p
        className={cn(
          "mt-4 font-mono text-2xl font-bold tracking-tight",
          active ? "text-[var(--status-ok)]" : "text-muted-foreground",
        )}
      >
        {active === null ? "SIN DATOS" : active ? "ACTIVO" : "INACTIVO"}
      </p>

      <p className="mt-auto pt-3 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </Card>
  );
}
