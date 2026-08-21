import type { AlertSeverity } from "@/domain/alert";
import type { DeviceStatus } from "@/domain/device";
import type { TankState } from "@/domain/tank-state";

/** Tonos semanticos compartidos por toda la UI. */
export type Tone = "ok" | "warning" | "critical" | "anomaly" | "idle";

export interface ToneClasses {
  text: string;
  dot: string;
  border: string;
  surface: string;
  ring: string;
  hex: string;
}

export const TONE: Record<Tone, ToneClasses> = {
  ok: {
    text: "text-[var(--status-ok)]",
    dot: "bg-[var(--status-ok)]",
    border: "border-[var(--status-ok)]/35",
    surface: "bg-[var(--status-ok)]/10",
    ring: "shadow-[0_0_0_4px_var(--status-ok-soft)]",
    hex: "var(--status-ok)",
  },
  warning: {
    text: "text-[var(--status-warning)]",
    dot: "bg-[var(--status-warning)]",
    border: "border-[var(--status-warning)]/35",
    surface: "bg-[var(--status-warning)]/10",
    ring: "shadow-[0_0_0_4px_var(--status-warning-soft)]",
    hex: "var(--status-warning)",
  },
  critical: {
    text: "text-[var(--status-critical)]",
    dot: "bg-[var(--status-critical)]",
    border: "border-[var(--status-critical)]/35",
    surface: "bg-[var(--status-critical)]/10",
    ring: "shadow-[0_0_0_4px_var(--status-critical-soft)]",
    hex: "var(--status-critical)",
  },
  anomaly: {
    text: "text-[var(--status-anomaly)]",
    dot: "bg-[var(--status-anomaly)]",
    border: "border-[var(--status-anomaly)]/35",
    surface: "bg-[var(--status-anomaly)]/10",
    ring: "shadow-[0_0_0_4px_var(--status-anomaly-soft)]",
    hex: "var(--status-anomaly)",
  },
  idle: {
    text: "text-muted-foreground",
    dot: "bg-[var(--status-idle)]",
    border: "border-border",
    surface: "bg-muted/40",
    ring: "",
    hex: "var(--status-idle)",
  },
};

export const STATE_TONE: Record<TankState, Tone> = {
  LOW: "critical",
  MEDIUM: "warning",
  FULL: "ok",
  ANOMALY: "anomaly",
};

export const DEVICE_TONE: Record<DeviceStatus, Tone> = {
  ONLINE: "ok",
  OFFLINE: "critical",
  UNKNOWN: "idle",
};

export const SEVERITY_TONE: Record<AlertSeverity, Tone> = {
  INFO: "idle",
  WARNING: "warning",
  CRITICAL: "critical",
};
