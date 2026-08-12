import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest", () => {
  it("has non-empty name and short_name", () => {
    const result = manifest();

    expect(result.name).toBeTruthy();
    expect(result.short_name).toBeTruthy();
  });

  it("has start_url '/app' and standalone display (AC #1, #2; Story 18.1: la PWA apre la dashboard, non il sito pubblico)", () => {
    const result = manifest();

    expect(result.start_url).toBe("/app");
    expect(result.display).toBe("standalone");
  });

  it("includes at least a 192x192 and a 512x512 PNG icon (AC #1)", () => {
    const result = manifest();
    const icons = result.icons ?? [];

    const icon192 = icons.find((icon) => icon.sizes === "192x192");
    const icon512 = icons.find((icon) => icon.sizes === "512x512");

    expect(icon192).toBeDefined();
    expect(icon192?.type).toBe("image/png");
    expect(icon512).toBeDefined();
    expect(icon512?.type).toBe("image/png");
  });

  it("icon src paths point to files that actually exist in public/ (Review Story 14.1)", () => {
    const result = manifest();
    const icons = result.icons ?? [];

    for (const icon of icons) {
      expect(existsSync(path.join(process.cwd(), "public", icon.src))).toBe(true);
    }
  });

  it("has background_color and theme_color matching DESIGN.md (colors.surface/colors.navy)", () => {
    const result = manifest();

    expect(result.background_color).toBe("#FFFFFF");
    expect(result.theme_color).toBe("#312682");
  });
});
