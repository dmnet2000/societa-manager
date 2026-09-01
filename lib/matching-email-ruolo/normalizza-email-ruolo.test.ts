import { describe, expect, it } from "vitest";
import { normalizzaEmailRuolo } from "./normalizza-email-ruolo";

describe("normalizzaEmailRuolo", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizzaEmailRuolo("  mario@example.com  ")).toBe("mario@example.com");
  });

  it("lowercases the email", () => {
    expect(normalizzaEmailRuolo("Mario@Example.COM")).toBe("mario@example.com");
  });

  it("combines trim and lowercase", () => {
    expect(normalizzaEmailRuolo("  Mario@Example.COM  ")).toBe("mario@example.com");
  });

  it("returns an already-normalized email unchanged", () => {
    expect(normalizzaEmailRuolo("mario@example.com")).toBe("mario@example.com");
  });
});
