"use client";

import { Cpu, Wifi, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { DeviceStatusDTO } from "@/types";
import { DEVICE_TONE, TONE } from "./tone";
import { StatusDot } from "./status-dot";

/**
 * Salud del enlace con el ESP8266.
 *
 * Importa tanto como el nivel: si el dispositivo deja de reportar, la reserva
 * queda sin supervision y un desabastecimiento podria pasar inadvertido. El
 * contador "hace N segundos" avanza en el cliente entre eventos para que la
 * informacion nunca parezca congelada.
 */
export function DeviceCard({ device }: { device: DeviceStatusDTO | null }) {
  const now = useNow();

  // Mientras no llegan eventos el contador sigue avanzando en el cliente.
  const elapsed =
    device?.lastSeen && now
      ? Math.max(0, Math.floor((now - new Date(device.lastSeen).getTime()) / 1000))
      : (device?.secondsSinceLastSeen ?? null);

  const tone = device ? DEVICE_TONE[device.status] : "idle";
  const classes = TONE[tone];
  const online = device?.status === "ONLINE";

  return (
    <Card className={cn("gap-0 p-5 transition-colors duration-300", classes.border)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-muted-foreground" />
          <span className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
            SUPERVISIÓN
          </span>
        </div>
        <StatusDot tone={tone} pulse={online} />
      </div>

      <p className="mt-3 truncate font-mono text-sm font-semibold" title={device?.deviceId}>
        {device?.deviceId ?? "--"}
      </p>

      <div className={cn("mt-2 flex items-center gap-1.5 text-lg font-bold", classes.text)}>
        {online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
        {device?.statusLabel ?? "SIN DATOS"}
      </div>

      <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between gap-2">
          <dt>Última comunicación</dt>
          <dd className="font-mono tabular-nums text-foreground">
            {elapsed === null ? "--" : formatDuration(elapsed)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Marca de tiempo</dt>
          <dd className="font-mono tabular-nums">{formatDateTime(device?.lastSeen ?? null)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Tiempo máximo sin datos</dt>
          <dd className="font-mono tabular-nums">{device?.timeoutSeconds ?? "--"} s</dd>
        </div>
      </dl>

      <div className="mt-3 flex gap-1.5 font-mono text-[11px]">
        <ReadingChip label="LOW" on={device?.lastLow ?? null} />
        <ReadingChip label="HIGH" on={device?.lastHigh ?? null} />
      </div>
    </Card>
  );
}

function ReadingChip({ label, on }: { label: string; on: boolean | null }) {
  return (
    <span
      className={cn(
        "flex-1 rounded border px-2 py-1 text-center font-semibold",
        on === null
          ? "border-border text-muted-foreground"
          : on
            ? "border-[var(--status-ok)]/40 bg-[var(--status-ok)]/10 text-[var(--status-ok)]"
            : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {label}: {on === null ? "--" : on ? "ACTIVO" : "INACTIVO"}
    </span>
  );
}
