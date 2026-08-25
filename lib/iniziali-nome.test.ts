import { describe, expect, it } from "vitest";
import { inizialiNome, inizialiNomeCompleto } from "./iniziali-nome";

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

describe("inizialiNomeCompleto", () => {
  it("returns the uppercase first letter of the first two tokens", () => {
    expect(inizialiNomeCompleto("Rossi Mario")).toBe("RM");
  });

  it("uppercases even when the input is already lowercase", () => {
    expect(inizialiNomeCompleto("rossi mario")).toBe("RM");
  });

  it("trims leading/trailing whitespace before splitting", () => {
    expect(inizialiNomeCompleto("  Rossi Mario  ")).toBe("RM");
  });

  it("collapses multiple spaces between tokens", () => {
    expect(inizialiNomeCompleto("Rossi   Mario")).toBe("RM");
  });

  it("returns a single letter when there is only one token", () => {
    expect(inizialiNomeCompleto("Rossi")).toBe("R");
  });

  it("uses only the first two tokens when there are more than two", () => {
    expect(inizialiNomeCompleto("Rossi Mario Junior")).toBe("RM");
  });

  it("returns an empty string when the input is empty", () => {
    expect(inizialiNomeCompleto("")).toBe("");
  });

  it("returns an empty string when the input is only whitespace", () => {
    expect(inizialiNomeCompleto("   ")).toBe("");
  });
});
