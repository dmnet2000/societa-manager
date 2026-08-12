import { describe, expect, it } from "vitest";
import {
  eConsensoRegistrato,
  haAccettatoCookieNonEssenziali,
  parseValoreConsenso,
} from "./cookie-consenso";

describe("eConsensoRegistrato", () => {
  it("treats 'accettato' as an already-registered choice", () => {
    expect(eConsensoRegistrato("accettato")).toBe(true);
  });

  it("treats 'rifiutato' as an already-registered choice", () => {
    expect(eConsensoRegistrato("rifiutato")).toBe(true);
  });

  it("treats undefined (no cookie) as no choice yet", () => {
    expect(eConsensoRegistrato(undefined)).toBe(false);
  });

  it("treats an unrecognized value as no choice yet", () => {
    expect(eConsensoRegistrato("qualcosa")).toBe(false);
  });

  it("treats an empty string as no choice yet", () => {
    expect(eConsensoRegistrato("")).toBe(false);
  });

  it("is case-sensitive - 'Accettato' does not count as registered", () => {
    expect(eConsensoRegistrato("Accettato")).toBe(false);
  });
});

describe("haAccettatoCookieNonEssenziali", () => {
  it("is true only for 'accettato'", () => {
    expect(haAccettatoCookieNonEssenziali("accettato")).toBe(true);
  });

  it("is false for 'rifiutato'", () => {
    expect(haAccettatoCookieNonEssenziali("rifiutato")).toBe(false);
  });

  it("is false for undefined", () => {
    expect(haAccettatoCookieNonEssenziali(undefined)).toBe(false);
  });
});

describe("parseValoreConsenso", () => {
  it("returns 'accettato' unchanged when valid", () => {
    expect(parseValoreConsenso("accettato")).toBe("accettato");
  });

  it("returns 'rifiutato' unchanged when valid", () => {
    expect(parseValoreConsenso("rifiutato")).toBe("rifiutato");
  });

  it("returns undefined for an unrecognized value", () => {
    expect(parseValoreConsenso("qualcosa")).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(parseValoreConsenso(undefined)).toBeUndefined();
  });
});
