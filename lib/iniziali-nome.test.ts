import { describe, expect, it } from "vitest";
import { inizialiNome } from "./iniziali-nome";

describe("inizialiNome", () => {
  it("returns the uppercase first letter of nome+cognome", () => {
    expect(inizialiNome("Mario", "Rossi")).toBe("MR");
  });

  it("uppercases even when the input is already lowercase", () => {
    expect(inizialiNome("mario", "rossi")).toBe("MR");
  });

  it("trims leading whitespace before taking the first letter", () => {
    expect(inizialiNome("  Mario", "  Rossi")).toBe("MR");
  });

  it("returns a single letter when cognome is empty", () => {
    expect(inizialiNome("Mario", "")).toBe("M");
  });

  it("returns an empty string when both are empty", () => {
    expect(inizialiNome("", "")).toBe("");
  });
});
