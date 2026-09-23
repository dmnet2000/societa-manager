import { describe, expect, it } from "vitest";
import { testoScuroSuSfondo } from "./colore-testo-leggibile";

describe("testoScuroSuSfondo", () => {
  it("il blu di default della match-card resta a testo chiaro (comportamento invariato)", () => {
    expect(testoScuroSuSfondo("#2e6f99")).toBe(false);
  });

  it("bianco richiede testo scuro", () => {
    expect(testoScuroSuSfondo("#ffffff")).toBe(true);
  });

  it("nero richiede testo chiaro", () => {
    expect(testoScuroSuSfondo("#000000")).toBe(false);
  });

  it("un giallo chiaro richiede testo scuro", () => {
    expect(testoScuroSuSfondo("#ffee58")).toBe(true);
  });

  it("un rosso scuro richiede testo chiaro", () => {
    expect(testoScuroSuSfondo("#8b0000")).toBe(false);
  });

  it("e' case-insensitive sull'esadecimale", () => {
    expect(testoScuroSuSfondo("#FFFFFF")).toBe(true);
  });

  it("un formato inatteso non passa mai a testo scuro alla cieca", () => {
    expect(testoScuroSuSfondo("blue")).toBe(false);
    expect(testoScuroSuSfondo("")).toBe(false);
  });
});
