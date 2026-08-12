import { describe, expect, it } from "vitest";
import { eConsensoRegistrato } from "./cookie-consenso";

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
});
