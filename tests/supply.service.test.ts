import { describe, expect, it } from "vitest";
import { SUPPLY_RISK_META } from "@/domain/supply";
import { SupplyService } from "@/services/supply.service";

const NOW = new Date("2026-08-20T20:00:00Z");

describe("riesgo de desabastecimiento", () => {
  it("reserva bajo el minimo con enlace sano -> RIESGO CRITICO", () => {
    expect(SupplyService.risk("LOW", "ONLINE")).toBe("CRITICAL");
  });

  it("reserva parcial -> VIGILANCIA", () => {
    expect(SupplyService.risk("MEDIUM", "ONLINE")).toBe("WATCH");
  });

  it("reserva completa -> SIN RIESGO", () => {
    expect(SupplyService.risk("FULL", "ONLINE")).toBe("SECURE");
  });

  it("sensores inconsistentes -> no evaluable", () => {
    expect(SupplyService.risk("ANOMALY", "ONLINE")).toBe("UNKNOWN");
  });

  it("sin lecturas -> no evaluable", () => {
    expect(SupplyService.risk(null, "UNKNOWN")).toBe("UNKNOWN");
  });

  it("una reserva completa deja de ser fiable si el dispositivo esta caido", () => {
    // El dato podria tener horas: afirmar "sin riesgo" seria enganoso.
    expect(SupplyService.risk("FULL", "OFFLINE")).toBe("UNKNOWN");
    expect(SupplyService.risk("MEDIUM", "OFFLINE")).toBe("UNKNOWN");
  });
});

describe("tendencia de la reserva", () => {
  it("detecta llenado y descenso entre tramos", () => {
    expect(SupplyService.trend("MEDIUM", "LOW")).toBe("RISING");
    expect(SupplyService.trend("FULL", "MEDIUM")).toBe("RISING");
    expect(SupplyService.trend("LOW", "MEDIUM")).toBe("FALLING");
    expect(SupplyService.trend("MEDIUM", "FULL")).toBe("FALLING");
  });

  it("sin tramo anterior la tendencia es estable", () => {
    expect(SupplyService.trend("MEDIUM", null)).toBe("STABLE");
  });

  it("un fallo de sensores no genera tendencia", () => {
    expect(SupplyService.trend("ANOMALY", "FULL")).toBe("UNKNOWN");
    expect(SupplyService.trend("LOW", "ANOMALY")).toBe("STABLE");
  });
});

describe("evaluacion completa", () => {
  it("expone el titular, la accion y el tiempo en el estado", () => {
    const assessment = SupplyService.assess({
      state: "LOW",
      deviceStatus: "ONLINE",
      stateSince: new Date(NOW.getTime() - 30 * 60_000),
      previousDistinctState: "MEDIUM",
      lastFullAt: new Date(NOW.getTime() - 6 * 60 * 60_000),
      now: NOW,
    });

    expect(assessment.risk).toBe("CRITICAL");
    expect(assessment.riskLabel).toBe(SUPPLY_RISK_META.CRITICAL.label);
    expect(assessment.trend).toBe("FALLING");
    expect(assessment.secondsInState).toBe(1800);
    expect(assessment.action).not.toBe("");
    expect(assessment.lastFullAt).toBe(new Date(NOW.getTime() - 6 * 60 * 60_000).toISOString());
  });

  it("avisa explicitamente cuando el dato esta obsoleto", () => {
    const assessment = SupplyService.assess({
      state: "FULL",
      deviceStatus: "OFFLINE",
      now: NOW,
    });

    expect(assessment.risk).toBe("UNKNOWN");
    expect(assessment.riskHeadline.toLowerCase()).toContain("sin datos recientes");
  });

  it("nunca estima autonomia restante", () => {
    // El sistema solo tiene dos booleanos: cualquier cifra de horas o litros
    // seria inventada y podria dar una falsa sensacion de seguridad.
    const assessment = SupplyService.assess({
      state: "MEDIUM",
      deviceStatus: "ONLINE",
      now: NOW,
    });
    const texto = JSON.stringify(assessment).toLowerCase();
    expect(texto).not.toMatch(/autonom|litros|caudal|horas restantes/);
  });
});
