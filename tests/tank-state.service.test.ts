import { describe, expect, it } from "vitest";
import { TANK_STATE_META, TANK_STATES } from "@/domain/tank-state";
import { TankStateService } from "@/services/tank-state.service";

describe("TankStateService.determine", () => {
  it("LOW=false, HIGH=false -> LOW", () => {
    expect(TankStateService.determine(false, false)).toBe("LOW");
  });

  it("LOW=true, HIGH=false -> MEDIUM", () => {
    expect(TankStateService.determine(true, false)).toBe("MEDIUM");
  });

  it("LOW=true, HIGH=true -> FULL", () => {
    expect(TankStateService.determine(true, true)).toBe("FULL");
  });

  it("LOW=false, HIGH=true -> ANOMALY", () => {
    expect(TankStateService.determine(false, true)).toBe("ANOMALY");
  });

  it("cubre las cuatro combinaciones posibles y solo esas", () => {
    const results = [
      TankStateService.determine(false, false),
      TankStateService.determine(true, false),
      TankStateService.determine(true, true),
      TankStateService.determine(false, true),
    ];
    expect(new Set(results)).toEqual(new Set(TANK_STATES));
  });
});

describe("TankStateService.isAnomaly", () => {
  it("solo marca anomalia con HIGH activo y LOW inactivo", () => {
    expect(TankStateService.isAnomaly(false, true)).toBe(true);
    expect(TankStateService.isAnomaly(false, false)).toBe(false);
    expect(TankStateService.isAnomaly(true, false)).toBe(false);
    expect(TankStateService.isAnomaly(true, true)).toBe(false);
  });
});

describe("metadatos de estado", () => {
  it("FULL significa reserva completa, nunca sobrellenado", () => {
    const meta = TANK_STATE_META.FULL;
    expect(meta.label).toBe("RESERVA COMPLETA");
    expect(meta.message.toLowerCase()).not.toContain("sobrellen");
    expect(meta.fillRatio).toBe(1);
    // Sin riesgo: no hay nada que hacer.
    expect(meta.action).toBe("");
  });

  it("ANOMALY no se presenta como reserva disponible", () => {
    const meta = TANK_STATE_META.ANOMALY;
    expect(meta.label).toBe("FALLO DE SENSORES");
    expect(meta.message).toContain("inconsistente");
    expect(meta.action).not.toBe("");
  });

  it("los estados de riesgo indican que hacer", () => {
    expect(TANK_STATE_META.LOW.action).not.toBe("");
    expect(TANK_STATE_META.MEDIUM.action).not.toBe("");
  });

  it("ningun mensaje promete autonomia restante", () => {
    // Dos sensores digitales no permiten estimar cuanto tiempo queda de agua.
    for (const state of TANK_STATES) {
      const meta = TANK_STATE_META[state];
      const texto = `${meta.message} ${meta.action}`.toLowerCase();
      expect(texto).not.toMatch(/horas restantes|autonom|litros|caudal|%/);
    }
  });

  it("el snapshot expone solo datos serializables", () => {
    const snapshot = TankStateService.snapshotFromSensors(true, false);
    expect(snapshot).toMatchObject({
      state: "MEDIUM",
      label: "RESERVA PARCIAL",
      shortLabel: "PARCIAL",
    });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it("cada estado tiene un valor distinto en el eje Y del grafico", () => {
    const values = TANK_STATES.map((state) => TANK_STATE_META[state].chartValue);
    expect(new Set(values).size).toBe(TANK_STATES.length);
  });
});
