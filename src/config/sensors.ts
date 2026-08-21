import { serverEnv } from "@/config/env";

/**
 * Configuracion de polaridad de los sensores.
 *
 * El backend SIEMPRE trabaja con el significado logico:
 *   low  = true  -> el agua alcanza el sensor LOW
 *   high = true  -> el agua alcanza el sensor HIGH
 *
 * Como se obtiene ese booleano depende del cableado fisico:
 *   - Normally Open  (activo en HIGH): pin en HIGH  => sensor activo  => activeLow = false
 *   - Normally Closed(activo en LOW ): pin en LOW   => sensor activo  => activeLow = true
 *
 * La conversion la hace el firmware del ESP8266. Esta configuracion existe para
 * que, si en algun momento el dispositivo prefiere enviar la lectura FISICA del
 * pin (rawLow / rawHigh), el backend pueda normalizarla sin cambiar el frontend.
 */
export interface SensorPolarityConfig {
  /** true => el sensor se considera activo cuando el pin esta en LOW. */
  lowActiveLow: boolean;
  highActiveLow: boolean;
}

export function getSensorPolarity(): SensorPolarityConfig {
  return {
    lowActiveLow: serverEnv.sensorLowActiveLow,
    highActiveLow: serverEnv.sensorHighActiveLow,
  };
}

/** Convierte el nivel fisico de un pin en el booleano logico del sensor. */
export function normalizePinLevel(pinIsHigh: boolean, activeLow: boolean): boolean {
  return activeLow ? !pinIsHigh : pinIsHigh;
}

export function describePolarity(activeLow: boolean): string {
  return activeLow
    ? "Normally Closed - activo cuando el pin esta en LOW"
    : "Normally Open - activo cuando el pin esta en HIGH";
}
