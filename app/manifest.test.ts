import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findUniqueMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    configurazioneApplicazione: {
      findUnique: findUniqueMock,
    },
  },
}));

// Story 18.21: manifest() e' ora async (name/short_name letti da
// ConfigurazioneApplicazione) - mock di @/lib/prisma (non di
// @/lib/configurazione-applicazione) per riusare la logica reale di
// nomeSettoreAbbreviato, stesso principio gia' in uso in
// lib/configurazione-applicazione.test.ts.
const { default: manifest } = await import("./manifest");

describe("manifest", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    findUniqueMock.mockResolvedValue({ nomeSettore: "Volley Mogliano" });
  });

  it("has non-empty name and short_name", async () => {
    const result = await manifest();

    expect(result.name).toBeTruthy();
    expect(result.short_name).toBeTruthy();
  });

  it("uses the configured nomeSettore for name (Story 18.21)", async () => {
    const result = await manifest();

    expect(result.name).toBe("Volley Mogliano");
  });

  it("falls back to 'Settore Volley' when nomeSettore is not configured (Story 18.21)", async () => {
    findUniqueMock.mockResolvedValue({ nomeSettore: null });

    const result = await manifest();

    expect(result.name).toBe("Settore Volley");
  });

  it("falls back to 'Settore Volley' when the DB read fails (Story 18.21, fail-soft)", async () => {
    findUniqueMock.mockRejectedValue(new Error("boom"));

    const result = await manifest();

    expect(result.name).toBe("Settore Volley");
  });

  it("truncates short_name to 12 characters for a long nomeSettore (Story 18.21)", async () => {
    findUniqueMock.mockResolvedValue({ nomeSettore: "Volley Mogliano" });

    const result = await manifest();

    expect(result.short_name).toBe("Volley Mogli");
  });

  it("has start_url '/app' and standalone display (AC #1, #2; Story 18.1: la PWA apre la dashboard, non il sito pubblico)", async () => {
    const result = await manifest();

    expect(result.start_url).toBe("/app");
    expect(result.display).toBe("standalone");
  });

  it("includes at least a 192x192 and a 512x512 PNG icon (AC #1)", async () => {
    const result = await manifest();
    const icons = result.icons ?? [];

    const icon192 = icons.find((icon) => icon.sizes === "192x192");
    const icon512 = icons.find((icon) => icon.sizes === "512x512");

    expect(icon192).toBeDefined();
    expect(icon192?.type).toBe("image/png");
    expect(icon512).toBeDefined();
    expect(icon512?.type).toBe("image/png");
  });

  it("icon src paths point to files that actually exist in public/ (Review Story 14.1)", async () => {
    const result = await manifest();
    const icons = result.icons ?? [];

    for (const icon of icons) {
      expect(existsSync(path.join(process.cwd(), "public", icon.src))).toBe(true);
    }
  });

  it("has background_color and theme_color matching DESIGN.md (colors.surface/colors.navy)", async () => {
    const result = await manifest();

    expect(result.background_color).toBe("#FFFFFF");
    expect(result.theme_color).toBe("#312682");
  });
});
