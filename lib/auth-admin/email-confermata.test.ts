import { describe, expect, it } from "vitest";
import { calcolaEmailConfermataPerAuthId } from "./email-confermata";

describe("calcolaEmailConfermataPerAuthId", () => {
  it("restituisce true per un Utente con email_confirmed_at valorizzato", () => {
    const mappa = calcolaEmailConfermataPerAuthId([
      { id: "auth-1", email_confirmed_at: "2026-01-01T00:00:00Z" },
    ]);
    expect(mappa.get("auth-1")).toBe(true);
  });

  it("restituisce false per un Utente con email_confirmed_at null", () => {
    const mappa = calcolaEmailConfermataPerAuthId([
      { id: "auth-2", email_confirmed_at: null },
    ]);
    expect(mappa.get("auth-2")).toBe(false);
  });

  it("restituisce false per un Utente con email_confirmed_at assente (undefined)", () => {
    const mappa = calcolaEmailConfermataPerAuthId([{ id: "auth-3" }]);
    expect(mappa.get("auth-3")).toBe(false);
  });

  it("non ha alcuna voce per un Utente assente dalla lista", () => {
    const mappa = calcolaEmailConfermataPerAuthId([
      { id: "auth-1", email_confirmed_at: "2026-01-01T00:00:00Z" },
    ]);
    expect(mappa.has("auth-non-presente")).toBe(false);
    expect(mappa.get("auth-non-presente")).toBeUndefined();
  });
});
