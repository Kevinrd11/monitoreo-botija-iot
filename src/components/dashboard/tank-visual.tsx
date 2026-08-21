"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import type { TankStateSnapshot } from "@/types";
import { STATE_TONE, TONE } from "./tone";

/**
 * Representacion visual del tanque.
 *
 * ATENCION: la altura del agua es un RECURSO VISUAL, no una medicion.
 * Con dos sensores digitales no existe informacion de volumen; por eso el
 * tanque se rotula con BAJO / MEDIO / LLENO y nunca con un porcentaje.
 */

const VIEW_W = 302;
const VIEW_H = 400;
const TANK_X = 44;
const TANK_W = 160;
const TANK_TOP = 44;
const TANK_BOTTOM = 372;
const TANK_H = TANK_BOTTOM - TANK_TOP;

/** Altura relativa a la que estan montados los sensores en la pared del tanque. */
const SENSOR_LOW_RATIO = 0.3;
const SENSOR_HIGH_RATIO = 0.85;

const yFor = (ratio: number) => TANK_BOTTOM - ratio * TANK_H;

interface TankVisualProps {
  state: TankStateSnapshot | null;
  low: boolean | null;
  high: boolean | null;
  stale?: boolean;
}

export function TankVisual({ state, low, high, stale = false }: TankVisualProps) {
  const uid = useId().replace(/:/g, "");
  const tone = state ? STATE_TONE[state.state] : "idle";
  const isAnomaly = state?.state === "ANOMALY";

  // Transicion suave del nivel al cambiar de estado.
  const target = state?.fillRatio ?? 0;
  const [ratio, setRatio] = useState(target);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRatio(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const waterTop = yFor(ratio);
  const lowY = yFor(SENSOR_LOW_RATIO);
  const highY = yFor(SENSOR_HIGH_RATIO);

  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center gap-2",
        stale && "opacity-60 grayscale-[0.35]",
      )}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-[440px] w-full max-w-[360px]"
        role="img"
        aria-label={
          state ? `Tanque en estado ${state.label}` : "Tanque sin lecturas disponibles"
        }
      >
        <defs>
          <linearGradient id={`water-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--water)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--water-deep)" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id={`shell-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0.09" />
            <stop offset="45%" stopColor="var(--foreground)" stopOpacity="0.02" />
            <stop offset="100%" stopColor="var(--foreground)" stopOpacity="0.11" />
          </linearGradient>

          <pattern
            id={`hatch-${uid}`}
            width="10"
            height="10"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <rect width="10" height="10" fill="var(--status-anomaly)" fillOpacity="0.18" />
            <line x1="0" y1="0" x2="0" y2="10" stroke="var(--status-anomaly)" strokeWidth="4" strokeOpacity="0.5" />
          </pattern>

          <clipPath id={`inner-${uid}`}>
            <rect
              x={TANK_X}
              y={TANK_TOP}
              width={TANK_W}
              height={TANK_H}
              rx="18"
              ry="18"
            />
          </clipPath>
        </defs>

        {/* Tapa superior */}
        <rect
          x={TANK_X - 12}
          y={TANK_TOP - 16}
          width={TANK_W + 24}
          height="16"
          rx="6"
          fill="var(--muted)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />

        {/* Cuerpo */}
        <rect
          x={TANK_X}
          y={TANK_TOP}
          width={TANK_W}
          height={TANK_H}
          rx="18"
          ry="18"
          fill="var(--panel)"
          stroke="var(--border)"
          strokeWidth="2"
        />

        <g clipPath={`url(#inner-${uid})`}>
          {/* Agua */}
          <g
            style={{
              transform: `translateY(${waterTop - TANK_BOTTOM}px)`,
              transition: "transform 900ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <rect
              x={TANK_X}
              y={TANK_BOTTOM}
              width={TANK_W}
              height={TANK_H}
              fill={isAnomaly ? `url(#hatch-${uid})` : `url(#water-${uid})`}
            />
            {/* Superficie ondulada */}
            <g className="animate-water-wave">
              <path
                d={wavePath(TANK_X - 160, TANK_BOTTOM, TANK_W * 3)}
                fill={isAnomaly ? "var(--status-anomaly)" : "var(--water)"}
                fillOpacity="0.85"
              />
            </g>
          </g>

          {/* Burbujas: solo cuando hay agua real y no hay anomalia */}
          {!isAnomaly && ratio > 0.2 && (
            <g opacity="0.5">
              {[0, 1, 2].map((i) => (
                <circle
                  key={i}
                  cx={TANK_X + 45 + i * 38}
                  cy={TANK_BOTTOM - 18}
                  r={3 + i}
                  fill="white"
                  className="animate-rise-bubble"
                  style={{ animationDelay: `${i * 1.6}s` }}
                />
              ))}
            </g>
          )}

          {/* Reflejo lateral */}
          <rect
            x={TANK_X}
            y={TANK_TOP}
            width={TANK_W}
            height={TANK_H}
            fill={`url(#shell-${uid})`}
          />
        </g>

        {/* Marcas de los sensores */}
        <SensorMark y={highY} label="HIGH" active={high === true} />
        <SensorMark y={lowY} label="LOW" active={low === true} />

        {/* Contorno de estado */}
        <rect
          x={TANK_X}
          y={TANK_TOP}
          width={TANK_W}
          height={TANK_H}
          rx="18"
          ry="18"
          fill="none"
          stroke={TONE[tone].hex}
          strokeWidth="2.5"
          strokeOpacity={state ? 0.85 : 0.25}
          className={isAnomaly ? "animate-outline-pulse" : undefined}
        />

        {/* Base */}
        <rect
          x={TANK_X - 18}
          y={TANK_BOTTOM + 2}
          width={TANK_W + 36}
          height="12"
          rx="5"
          fill="var(--muted)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        <rect x={TANK_X + 12} y={TANK_BOTTOM + 14} width="16" height="14" rx="3" fill="var(--muted)" />
        <rect x={TANK_X + TANK_W - 28} y={TANK_BOTTOM + 14} width="16" height="14" rx="3" fill="var(--muted)" />
      </svg>

      <p className="mt-1 max-w-[280px] text-center text-[11px] leading-relaxed text-muted-foreground">
        Representacion cualitativa. El sistema no mide volumen: solo conoce si el
        agua alcanza los sensores LOW y HIGH.
      </p>
    </div>
  );
}

/** Marca lateral con la etiqueta del sensor y su LED. */
function SensorMark({ y, label, active }: { y: number; label: string; active: boolean }) {
  const color = active ? TONE.ok.hex : "var(--status-idle)";
  return (
    <g>
      <line
        x1={TANK_X - 26}
        y1={y}
        x2={TANK_X + TANK_W + 6}
        y2={y}
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="5 4"
        strokeOpacity={active ? 0.9 : 0.4}
      />
      <circle cx={TANK_X - 26} cy={y} r="6" fill={color} fillOpacity={active ? 1 : 0.35} />
      {active && (
        <circle cx={TANK_X - 26} cy={y} r="10" fill={color} fillOpacity="0.25">
          <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
          <animate attributeName="fill-opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      <text
        x={TANK_X + TANK_W + 12}
        y={y + 4}
        fontSize="11"
        fontWeight="600"
        letterSpacing="0.08em"
        fill={color}
        fillOpacity={active ? 1 : 0.6}
      >
        {label}
      </text>
      <text
        x={TANK_X + TANK_W + 12}
        y={y + 17}
        fontSize="9"
        letterSpacing="0.06em"
        fill="var(--status-idle)"
      >
        {active ? "ACTIVO" : "INACTIVO"}
      </text>
    </g>
  );
}

/** Genera una onda sinusoidal cerrada usable como superficie del agua. */
function wavePath(startX: number, baseY: number, width: number): string {
  const amplitude = 5;
  const period = 80;
  const segments = Math.ceil(width / period);
  let d = `M ${startX} ${baseY}`;
  for (let i = 0; i < segments; i += 1) {
    d += ` q ${period / 4} ${-amplitude} ${period / 2} 0 q ${period / 4} ${amplitude} ${period / 2} 0`;
  }
  d += ` L ${startX + width} ${baseY + 400} L ${startX} ${baseY + 400} Z`;
  return d;
}
