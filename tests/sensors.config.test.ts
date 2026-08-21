import { describe, expect, it } from "vitest";
import { normalizePinLevel } from "@/config/sensors";

/**
 * La polaridad es una cuestion de cableado. El backend siempre debe recibir el
 * significado logico, sin importar como este conectado el sensor.
 */
describe("normalizacion de la polaridad del sensor", () => {
  it("Normally Open: el sensor esta activo cuando el pin lee HIGH", () => {
    expect(normalizePinLevel(true, false)).toBe(true);
    expect(normalizePinLevel(false, false)).toBe(false);
  });

  it("Normally Closed: el sensor esta activo cuando el pin lee LOW", () => {
    expect(normalizePinLevel(false, true)).toBe(true);
    expect(normalizePinLevel(true, true)).toBe(false);
  });
});
