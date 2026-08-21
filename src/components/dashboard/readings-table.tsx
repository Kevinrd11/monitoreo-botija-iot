"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TANK_STATE_META } from "@/domain/tank-state";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReadingDTO } from "@/types";
import { STATE_TONE, TONE } from "./tone";

/** Tabla de diagnostico de la reserva: Hora | LOW | HIGH | Estado. */
export function ReadingsTable({ readings }: { readings: ReadingDTO[] }) {
  if (readings.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay lecturas de la reserva en este rango.
      </p>
    );
  }

  return (
    <ScrollArea className="h-[280px]">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="w-[190px]">Hora</TableHead>
            <TableHead className="w-[90px]">LOW</TableHead>
            <TableHead className="w-[90px]">HIGH</TableHead>
            <TableHead>Estado de la reserva</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {readings.map((reading) => {
            const meta = TANK_STATE_META[reading.state];
            const classes = TONE[STATE_TONE[reading.state]];
            return (
              <TableRow key={reading.id}>
                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatDateTime(reading.timestamp)}
                </TableCell>
                <TableCell>
                  <SensorState on={reading.low} />
                </TableCell>
                <TableCell>
                  <SensorState on={reading.high} />
                </TableCell>
                <TableCell className={cn("text-xs font-semibold", classes.text)}>
                  {meta.emoji} {meta.label}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function SensorState({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "inline-block rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold",
        on
          ? "border-[var(--status-ok)]/40 bg-[var(--status-ok)]/10 text-[var(--status-ok)]"
          : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {on ? "ON" : "OFF"}
    </span>
  );
}
