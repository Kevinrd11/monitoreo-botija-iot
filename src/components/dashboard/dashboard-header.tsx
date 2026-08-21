"use client";

import { Activity, Database, DatabaseZap, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";
import { formatDuration } from "@/lib/format";
import type { DeviceStatusDTO } from "@/types";
import type { StreamStatus } from "@/hooks/use-tank-realtime";
import { BrandLogo } from "./brand-logo";
import { DEVICE_TONE, TONE } from "./tone";
import { StatusDot } from "./status-dot";

interface DashboardHeaderProps {
  tankName: string;
  /** Persistencia en uso; "memory" se advierte de forma visible. */
  storage?: "postgres" | "memory";
  device: DeviceStatusDTO | null;
  streamStatus: StreamStatus;
  lastReadingAt: string | null;
  onRefresh: () => void;
}

const STREAM_LABEL: Record<StreamStatus, string> = {
  connecting: "Conectando",
  live: "Tiempo real",
  polling: "Sondeo",
};

export function DashboardHeader({
  tankName,
  storage,
  device,
  streamStatus,
  lastReadingAt,
  onRefresh,
}: DashboardHeaderProps) {
  const now = useNow();
  const tone = device ? DEVICE_TONE[device.status] : "idle";
  const classes = TONE[tone];
  const elapsed =
    lastReadingAt && now
      ? formatDuration(Math.max(0, Math.floor((now - new Date(lastReadingAt).getTime()) / 1000)))
      : lastReadingAt
        ? "hace un instante"
        : "sin lecturas";

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-6 py-3.5">
        <div className="flex items-center gap-3">
          <BrandLogo size={42} priority />
          <div>
            <h1 className="text-sm leading-none font-bold tracking-[0.16em]">
              <span className="text-[var(--brand)]">BOTIJA</span>
              <span className="mx-1.5 text-muted-foreground/50">/</span>
              ABASTECIMIENTO DE AGUA
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-[var(--brand-olive)]">Finca Agroturística</span>
              <span className="mx-1.5 text-muted-foreground/50">·</span>
              Reserva: {tankName}
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {storage === "memory" && (
            <span
              title="Sin base de datos: el historial y los avisos no sobreviven a un reinicio y pueden diferir entre instancias."
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-warning)]/40 bg-[var(--status-warning)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--status-warning)]"
            >
              <DatabaseZap className="size-3.5" />
              MODO DEMO · sin base de datos
            </span>
          )}

          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
              classes.border,
              classes.surface,
              classes.text,
            )}
          >
            <StatusDot tone={tone} pulse={device?.status === "ONLINE"} size="sm" />
            SUPERVISIÓN {device?.statusLabel ?? "SIN DATOS"}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <Activity
              className={cn(
                "size-3.5",
                streamStatus === "live" ? "text-[var(--status-ok)]" : "text-muted-foreground",
              )}
            />
            {STREAM_LABEL[streamStatus]}
          </span>

          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex">
            <Database className="size-3.5" />
            Última lectura: {elapsed}
          </span>

          <Button variant="ghost" size="icon" onClick={onRefresh} aria-label="Actualizar ahora">
            <RefreshCw className="size-4" />
          </Button>

          <Link
            href="/settings"
            aria-label="Configuración"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          >
            <Settings className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
