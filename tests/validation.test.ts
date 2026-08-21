import { describe, expect, it } from "vitest";
import { readingPayloadSchema } from "@/lib/validation";

describe("validacion del payload del ESP8266", () => {
  it("acepta el payload documentado", () => {
    const result = readingPayloadSchema.safeParse({
      deviceId: "ESP8266-TANQUE-001",
      low: true,
      high: false,
      timestamp: "2026-08-20T19:30:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("acepta el payload sin timestamp (dispositivo sin NTP)", () => {
    const result = readingPayloadSchema.safeParse({
      deviceId: "ESP8266-TANQUE-001",
      low: false,
      high: false,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza sensores que no sean booleanos", () => {
    for (const bad of [{ low: 1, high: 0 }, { low: "true", high: "false" }, { low: null, high: null }]) {
      const result = readingPayloadSchema.safeParse({ deviceId: "X", ...bad });
      expect(result.success).toBe(false);
    }
  });

  it("rechaza el payload sin deviceId", () => {
    expect(readingPayloadSchema.safeParse({ low: true, high: true }).success).toBe(false);
    expect(
      readingPayloadSchema.safeParse({ deviceId: "", low: true, high: true }).success,
    ).toBe(false);
  });

  it("rechaza un timestamp que no es una fecha valida", () => {
    const result = readingPayloadSchema.safeParse({
      deviceId: "ESP8266-TANQUE-001",
      low: true,
      high: true,
      timestamp: "no-es-una-fecha",
    });
    expect(result.success).toBe(false);
  });
});
