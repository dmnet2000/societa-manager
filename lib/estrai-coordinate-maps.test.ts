import { describe, expect, it } from "vitest";
import { estraiCoordinateDaLinkMaps, isLinkMapsAccorciato } from "./estrai-coordinate-maps";

describe("estraiCoordinateDaLinkMaps", () => {
  it("prefers the precise pin format (!3d/!4d) over the viewport center", () => {
    const link =
      "https://www.google.com/maps/place/Palazzetto/@45.5,12.3,17z/data=!4m5!3m4!1s0x0:0x0!8m2!3d45.123456!4d12.654321";
    expect(estraiCoordinateDaLinkMaps(link)).toEqual({ lat: 45.123456, lng: 12.654321 });
  });

  it("extracts coordinates from the viewport center (@lat,lng,zoom)", () => {
    expect(estraiCoordinateDaLinkMaps("https://www.google.com/maps/@45.123456,12.654321,15z")).toEqual(
      { lat: 45.123456, lng: 12.654321 }
    );
  });

  it("handles negative coordinates (southern/western hemisphere)", () => {
    expect(estraiCoordinateDaLinkMaps("https://www.google.com/maps/@-33.865143,151.2099,12z")).toEqual(
      { lat: -33.865143, lng: 151.2099 }
    );
  });

  it("extracts coordinates from a ?q=lat,lng query parameter", () => {
    expect(estraiCoordinateDaLinkMaps("https://www.google.com/maps?q=45.123456,12.654321")).toEqual({
      lat: 45.123456,
      lng: 12.654321,
    });
  });

  it("extracts coordinates from a ?ll=lat,lng query parameter (older format)", () => {
    expect(estraiCoordinateDaLinkMaps("https://maps.google.com/maps?ll=45.123456,12.654321")).toEqual({
      lat: 45.123456,
      lng: 12.654321,
    });
  });

  it("extracts coordinates from a ?query=lat,lng parameter (the app's own generated link format)", () => {
    expect(
      estraiCoordinateDaLinkMaps("https://www.google.com/maps/search/?api=1&query=45.123456,12.654321")
    ).toEqual({ lat: 45.123456, lng: 12.654321 });
  });

  it("returns null when no recognizable coordinate pattern is present", () => {
    expect(estraiCoordinateDaLinkMaps("https://www.google.com/maps/place/Palazzetto+Comunale")).toBeNull();
  });

  it("returns null when the URL is not a Google Maps domain, even if coordinate-shaped (security: rejects arbitrary/non-Maps links, review fix)", () => {
    expect(estraiCoordinateDaLinkMaps("https://example.com/?q=45.123456,12.654321")).toBeNull();
  });

  it("resolves a scheme-less short link before checking the domain", () => {
    expect(estraiCoordinateDaLinkMaps("maps.app.goo.gl/abc123")).toBeNull();
    // Nessuna coordinata nell'URL breve stesso (va risolto altrove, vedi
    // risolviLinkMaps) - qui verifichiamo solo che non lanci un'eccezione e
    // non venga scartato SOLO perche' privo di schema.
  });

  it("returns null for out-of-range latitude", () => {
    expect(estraiCoordinateDaLinkMaps("https://www.google.com/maps/@200.0,12.654321,15z")).toBeNull();
  });

  it("returns null for out-of-range longitude", () => {
    expect(estraiCoordinateDaLinkMaps("https://www.google.com/maps/@45.123456,999.0,15z")).toBeNull();
  });

  it("returns null for an empty or whitespace-only string", () => {
    expect(estraiCoordinateDaLinkMaps("")).toBeNull();
    expect(estraiCoordinateDaLinkMaps("   ")).toBeNull();
  });
});

describe("isLinkMapsAccorciato", () => {
  it("returns true for maps.app.goo.gl links", () => {
    expect(isLinkMapsAccorciato("https://maps.app.goo.gl/abc123")).toBe(true);
  });

  it("returns true for goo.gl/maps links", () => {
    expect(isLinkMapsAccorciato("https://goo.gl/maps/abc123")).toBe(true);
  });

  it("returns false for a full google.com/maps link", () => {
    expect(isLinkMapsAccorciato("https://www.google.com/maps/@45.1,12.6,15z")).toBe(false);
  });

  it("returns false for an unparseable string", () => {
    expect(isLinkMapsAccorciato("non un url")).toBe(false);
  });

  it("returns true for a scheme-less short link (pasted without https://)", () => {
    expect(isLinkMapsAccorciato("maps.app.goo.gl/abc123")).toBe(true);
  });
});
