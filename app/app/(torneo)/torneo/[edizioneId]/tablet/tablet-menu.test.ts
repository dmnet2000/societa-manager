import { describe, expect, it } from "vitest";
import { nomeTablet, tabletNelMenu } from "./tablet-menu";

describe("nomeTablet", () => {
  it("prende la parte dell'email prima di @", () => {
    expect(nomeTablet("campo1@tablet.invalid")).toBe("campo1");
  });

  it("senza @ restituisce il testo com'e'", () => {
    expect(nomeTablet("campo1")).toBe("campo1");
  });
});

describe("tabletNelMenu", () => {
  const tablet = [
    { id: "a", email: "campo1@tablet.invalid", attivo: true },
    { id: "b", email: "campo2@tablet.invalid", attivo: false },
  ];

  it("propone solo i tablet attivi a una gara che non ha quello disattivato", () => {
    expect(tabletNelMenu(tablet, null).map((t) => t.id)).toEqual(["a"]);
    expect(tabletNelMenu(tablet, "a").map((t) => t.id)).toEqual(["a"]);
  });

  it("mantiene il tablet disattivato sulla gara che lo ha gia'", () => {
    expect(tabletNelMenu(tablet, "b").map((t) => t.id)).toEqual(["a", "b"]);
  });
});
