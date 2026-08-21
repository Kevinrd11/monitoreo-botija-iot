"use client";

import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTankRealtime } from "@/hooks/use-tank-realtime";
import { AlertsPanel } from "./alerts-panel";
import { BrandLogo } from "./brand-logo";
import { DashboardHeader } from "./dashboard-header";
import { DeviceCard } from "./device-card";
import { HistorySection } from "./history-section";
import { SensorCard } from "./sensor-card";
import { SupplyStatusCard } from "./supply-status-card";
import { SimulatorPanel } from "./simulator-panel";
import { TankVisual } from "./tank-visual";

/**
 * Centro de monitoreo. Toda la informacion proviene del backend a traves de
 * useTankRealtime(); ningun componente conoce el transporte ni habla con el
 * dispositivo directamente.
 */
export function Dashboard() {
  const { overview, loading, error, streamStatus, readingVersion, refresh } = useTankRealtime();

  const reading = overview?.latestReading ?? null;
  const device = overview?.device ?? null;
  const offline = device?.status === "OFFLINE";

  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-technical-grid opacity-40" />

      <DashboardHeader
        tankName={overview?.tank.name ?? "Cargando..."}
        device={device}
        streamStatus={streamStatus}
        lastReadingAt={reading?.timestamp ?? null}
        onRefresh={() => void refresh()}
      />

      <main className="relative mx-auto max-w-[1600px] space-y-5 px-6 py-6">
        {error && (
          <Card className="flex flex-row items-center gap-3 border-[var(--status-critical)]/40 bg-[var(--status-critical)]/10 p-4">
            <AlertCircle className="size-5 text-[var(--status-critical)]" />
            <p className="text-sm">
              Sin conexión con el servidor de supervisión:{" "}
              <span className="font-mono">{error}</span>
            </p>
          </Card>
        )}

        <div className="grid grid-cols-12 gap-5">
          <Card className="col-span-12 flex items-center justify-center p-6 xl:col-span-4">
            {loading && !overview ? (
              <div className="h-[400px] w-full animate-pulse rounded-xl bg-muted" />
            ) : (
              <TankVisual
                state={overview?.state ?? null}
                low={reading?.low ?? null}
                high={reading?.high ?? null}
                stale={offline}
              />
            )}
          </Card>

          <div className="col-span-12 space-y-5 xl:col-span-8">
            <SupplyStatusCard
              supply={overview?.supply ?? null}
              state={overview?.state ?? null}
            />

            <div className="grid gap-5 md:grid-cols-3">
              <SensorCard
                name="LOW"
                description="Marca el mínimo de seguridad. Si se apaga, la finca está en riesgo de quedarse sin agua."
                active={reading?.low ?? null}
              />
              <SensorCard
                name="HIGH"
                description="Marca la reserva completa. Si está activo, el abastecimiento está asegurado."
                active={reading?.high ?? null}
              />
              <DeviceCard device={device} />
            </div>

            <AlertsPanel version={readingVersion} />
          </div>
        </div>

        <HistorySection version={readingVersion} />

        <SimulatorPanel />

        <footer className="flex flex-col items-center gap-3 pb-6 text-center">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={26} />
            <span className="text-xs font-semibold tracking-[0.16em] text-[var(--brand)]">
              BOTIJA
              <span className="ml-1.5 font-normal tracking-normal text-[var(--brand-olive)]">
                Finca Agroturística
              </span>
            </span>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Sistema IoT de prevención del desabastecimiento de agua. Trabaja con dos
            sensores digitales: no mide volumen ni estima autonomía restante, y no detecta
            sobrellenado — eso requeriría un tercer sensor OVERFLOW.
          </p>
        </footer>
      </main>
    </div>
  );
}
