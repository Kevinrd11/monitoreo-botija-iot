"use client";

import { useSyncExternalStore } from "react";

/**
 * Reloj compartido con resolucion de un segundo.
 *
 * Los contadores del tipo "hace 12 segundos" necesitan avanzar aunque no
 * lleguen eventos nuevos. Leer Date.now() durante el render seria impuro, y un
 * intervalo por componente multiplicaria los timers; useSyncExternalStore
 * resuelve ambos problemas con una unica fuente externa.
 *
 * Devuelve null durante el render del servidor y la hidratacion, de modo que
 * el marcado inicial coincida en ambos lados.
 */

let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const listener of listeners) listener();
    }, 1000);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => now;
const getServerSnapshot = () => 0;

export function useNow(): number | null {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return value === 0 ? null : value;
}
