import { describe, expect, it } from "vitest";
import { deriveDeviceStatus, secondsSince } from "@/domain/device";

const NOW = new Date("2026-08-20T20:00:00Z");

describe("deriveDeviceStatus", () => {
  it("es UNKNOWN mientras no se haya recibido ninguna lectura", () => {
    expect(deriveDeviceStatus(null, 60, NOW)).toBe("UNKNOWN");
  });

  it("es ONLINE dentro del timeout", () => {
    const lastSeen = new Date(NOW.getTime() - 30_000);
    expect(deriveDeviceStatus(lastSeen, 60, NOW)).toBe("ONLINE");
  });

  it("sigue ONLINE justo en el limite del timeout", () => {
    const lastSeen = new Date(NOW.getTime() - 60_000);
    expect(deriveDeviceStatus(lastSeen, 60, NOW)).toBe("ONLINE");
  });

  it("pasa a OFFLINE al superar el timeout", () => {
    const lastSeen = new Date(NOW.getTime() - 61_000);
    expect(deriveDeviceStatus(lastSeen, 60, NOW)).toBe("OFFLINE");
  });

  it("respeta un timeout configurado distinto", () => {
    const lastSeen = new Date(NOW.getTime() - 90_000);
    expect(deriveDeviceStatus(lastSeen, 120, NOW)).toBe("ONLINE");
    expect(deriveDeviceStatus(lastSeen, 30, NOW)).toBe("OFFLINE");
  });
});

describe("secondsSince", () => {
  it("devuelve null sin lecturas previas", () => {
    expect(secondsSince(null, NOW)).toBeNull();
  });

  it("cuenta los segundos transcurridos", () => {
    expect(secondsSince(new Date(NOW.getTime() - 45_000), NOW)).toBe(45);
  });
});
