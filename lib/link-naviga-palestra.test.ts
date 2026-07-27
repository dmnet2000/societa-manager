import { describe, expect, it } from "vitest";
import { costruisciLinkMappaIncorporata, costruisciLinkNaviga } from "./link-naviga-palestra";

describe("costruisciLinkNaviga", () => {
  it("prefers coordinates over indirizzo when both are present", () => {
    expect(
      costruisciLinkNaviga({
        indirizzo: "Via Roma 1, Mogliano Veneto",
        latitudine: 45.123456,
        longitudine: 12.654321,
      })
    ).toBe("https://www.google.com/maps/search/?api=1&query=45.123456,12.654321");
  });

  it("falls back to indirizzo when only one of the two coordinates is present", () => {
    expect(
      costruisciLinkNaviga({ indirizzo: "Via Roma 1", latitudine: 45.123456, longitudine: null })
    ).toBe("https://www.google.com/maps/search/?api=1&query=Via%20Roma%201");
  });

  it("returns a Google Maps search URL with the address url-encoded when no coordinates are set", () => {
    expect(costruisciLinkNaviga({ indirizzo: "Via Roma 1, Mogliano Veneto" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Via%20Roma%201%2C%20Mogliano%20Veneto"
    );
  });

  it("trims the address before encoding it", () => {
    expect(costruisciLinkNaviga({ indirizzo: "  Via Roma 1  " })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Via%20Roma%201"
    );
  });

  it("url-encodes accented characters", () => {
    expect(costruisciLinkNaviga({ indirizzo: "Piazza dell'Unità" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Piazza%20dell'Unit%C3%A0"
    );
  });

  it("returns null when neither coordinates nor indirizzo are present", () => {
    expect(costruisciLinkNaviga({})).toBeNull();
    expect(costruisciLinkNaviga({ indirizzo: null })).toBeNull();
    expect(costruisciLinkNaviga({ indirizzo: "" })).toBeNull();
    expect(costruisciLinkNaviga({ indirizzo: "   " })).toBeNull();
  });
});

describe("costruisciLinkMappaIncorporata", () => {
  it("builds an embed URL from coordinates when present", () => {
    expect(
      costruisciLinkMappaIncorporata({ latitudine: 45.123456, longitudine: 12.654321 })
    ).toBe("https://maps.google.com/maps?q=45.123456,12.654321&z=16&output=embed");
  });

  it("falls back to an embed URL built from indirizzo when no coordinates are set", () => {
    expect(costruisciLinkMappaIncorporata({ indirizzo: "Via Roma 1" })).toBe(
      "https://maps.google.com/maps?q=Via%20Roma%201&z=15&output=embed"
    );
  });

  it("returns null when neither coordinates nor indirizzo are present", () => {
    expect(costruisciLinkMappaIncorporata({})).toBeNull();
    expect(costruisciLinkMappaIncorporata({ indirizzo: "" })).toBeNull();
  });
});
