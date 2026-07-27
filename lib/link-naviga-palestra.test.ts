import { describe, expect, it } from "vitest";
import { costruisciLinkNaviga } from "./link-naviga-palestra";

describe("costruisciLinkNaviga", () => {
  it("returns a Google Maps search URL with the address url-encoded", () => {
    expect(costruisciLinkNaviga("Via Roma 1, Mogliano Veneto")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Via%20Roma%201%2C%20Mogliano%20Veneto"
    );
  });

  it("trims the address before encoding it", () => {
    expect(costruisciLinkNaviga("  Via Roma 1  ")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Via%20Roma%201"
    );
  });

  it("url-encodes accented characters", () => {
    expect(costruisciLinkNaviga("Piazza dell'Unità")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Piazza%20dell'Unit%C3%A0"
    );
  });

  it("returns null for null", () => {
    expect(costruisciLinkNaviga(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(costruisciLinkNaviga(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(costruisciLinkNaviga("")).toBeNull();
  });

  it("returns null for a whitespace-only string", () => {
    expect(costruisciLinkNaviga("   ")).toBeNull();
  });
});
