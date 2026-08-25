import { describe, expect, it } from "vitest";
import { GIRONI_TORNEO, ETICHETTA_GIRONE, isGironeTorneoValido } from "./girone-torneo";

describe("GIRONI_TORNEO", () => {
  it("contains exactly i 2 gironi del torneo, in ordine", () => {
    expect(GIRONI_TORNEO.map((g) => g.value)).toEqual(["GIRONE_A", "GIRONE_B"]);
  });
});

describe("ETICHETTA_GIRONE", () => {
  it("ha un'etichetta in italiano per ciascun girone", () => {
    expect(ETICHETTA_GIRONE.GIRONE_A).toBe("Girone A");
    expect(ETICHETTA_GIRONE.GIRONE_B).toBe("Girone B");
  });
});

describe("isGironeTorneoValido", () => {
  it("returns true for a valid GironeTorneo value", () => {
    expect(isGironeTorneoValido("GIRONE_A")).toBe(true);
    expect(isGironeTorneoValido("GIRONE_B")).toBe(true);
  });

  it("returns false for an invalid or empty value", () => {
    expect(isGironeTorneoValido("")).toBe(false);
    expect(isGironeTorneoValido("GIRONE_C")).toBe(false);
    expect(isGironeTorneoValido("girone_a")).toBe(false);
  });
});
