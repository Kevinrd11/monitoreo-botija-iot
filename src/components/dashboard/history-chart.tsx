"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TANK_STATE_META, type TankState } from "@/domain/tank-state";
import { formatAxisTime, formatDateTime } from "@/lib/format";
import type { HistoryRange, ReadingDTO } from "@/types";
import { STATE_TONE, TONE } from "./tone";

/**
 * Grafico escalonado del historial de estados.
 *
 * Se usa una escala ORDINAL (0=BAJO, 1=MEDIO, 2=LLENO, 3=ANOMALIA) y una
 * interpolacion "stepAfter": el estado se mantiene hasta que llega una lectura
 * nueva. Deliberadamente NO se dibuja una curva continua de porcentaje, porque
 * el sistema no dispone de esa medicion.
 */

const Y_TICKS = [0, 1, 2, 3];
const TICK_LABEL: Record<number, string> = {
  0: "BAJO",
  1: "MEDIO",
  2: "LLENO",
  3: "ANOMALIA",
};

interface Point {
  t: number;
  value: number;
  state: TankState;
  low: boolean;
  high: boolean;
  iso: string;
}

export function HistoryChart({
  readings,
  range,
}: {
  readings: ReadingDTO[];
  range: HistoryRange;
}) {
  // La API devuelve de mas reciente a mas antigua; el eje X necesita lo inverso.
  const data: Point[] = [...readings]
    .reverse()
    .map((reading) => ({
      t: new Date(reading.timestamp).getTime(),
      value: TANK_STATE_META[reading.state].chartValue,
      state: reading.state,
      low: reading.low,
      high: reading.high,
      iso: reading.timestamp,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No hay lecturas en este rango.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value: number) => formatAxisTime(new Date(value).toISOString(), range)}
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={40}
          />
          <YAxis
            domain={[-0.3, 3.3]}
            ticks={Y_TICKS}
            tickFormatter={(value: number) => TICK_LABEL[value] ?? ""}
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={78}
          />
          <Tooltip content={<HistoryTooltip />} />
          <Line
            type="stepAfter"
            dataKey="value"
            stroke="var(--water)"
            strokeWidth={2.5}
            isAnimationActive={false}
            dot={(props: unknown) => <StateDot {...(props as StateDotProps)} />}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface StateDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: Point;
}

/** Punto coloreado segun el estado de la lectura. */
function StateDot({ cx, cy, payload, index }: StateDotProps) {
  if (cx == null || cy == null || !payload) return <g key={index} />;
  return (
    <circle
      key={index}
      cx={cx}
      cy={cy}
      r={3.2}
      fill={TONE[STATE_TONE[payload.state]].hex}
      stroke="var(--card)"
      strokeWidth={1.2}
    />
  );
}

function HistoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Point }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const meta = TANK_STATE_META[point.state];

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
      <p className="font-mono text-[11px] text-muted-foreground">{formatDateTime(point.iso)}</p>
      <p className="mt-1 text-sm font-bold" style={{ color: TONE[STATE_TONE[point.state]].hex }}>
        {meta.emoji} {meta.label}
      </p>
      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
        LOW={point.low ? "ON" : "OFF"} · HIGH={point.high ? "ON" : "OFF"}
      </p>
    </div>
  );
}
