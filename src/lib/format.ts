/** Formateo de fechas y duraciones en espaniol para la UI. */

export function formatRelative(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "sin datos";
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  return formatDuration(seconds);
}

export function formatDuration(seconds: number): string {
  if (seconds < 5) return "hace un instante";
  if (seconds < 60) return `hace ${seconds} segundos`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? "dia" : "dias"}`;
}

export function formatClock(iso: string | null): string {
  if (!iso) return "--:--:--";
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatAxisTime(iso: string, range: string): string {
  const date = new Date(iso);
  if (range === "7d") {
    return date.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit" });
  }
  return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
