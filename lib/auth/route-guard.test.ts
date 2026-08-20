import { describe, expect, it } from "vitest";
import { rottaRiservata } from "./route-guard";

// Story 19.9 (Epic 19, Ruolo Site Manager): rottaRiservata e' l'unica fonte
// di verita' per "cosa e' una rotta riservata del sito" - consumata sia da
// urlVoceMenuValido (app/app/(configurazione)/menu-pubblico/actions.ts,
// Story 19.7) sia dalla futura creazione/modifica di una PaginaPubblica
// (Story 19.10). Nessun mock qui: route-guard.ts non ha "server-only" ed e'
// importabile invariato anche in un test/bundle client.
describe("rottaRiservata", () => {
  it("rifiuta '/app' esatto", () => {
    expect(rottaRiservata("/app")).toBe(true);
  });

  it("rifiuta qualunque prefisso sotto '/app/'", () => {
    expect(rottaRiservata("/app/gruppi")).toBe(true);
    expect(rottaRiservata("/app/menu-pubblico")).toBe(true);
  });

  it("rifiuta qualunque prefisso sotto '/api/'", () => {
    expect(rottaRiservata("/api/health")).toBe(true);
    expect(rottaRiservata("/api/cron/promemoria-certificati")).toBe(true);
  });

  it("rifiuta '/api' esatto (senza slash finale)", () => {
    expect(rottaRiservata("/api")).toBe(true);
  });

  it("rifiuta le rotte di autenticazione (isPublicRoute)", () => {
    expect(rottaRiservata("/accedi")).toBe(true);
    expect(rottaRiservata("/registrati")).toBe(true);
    expect(rottaRiservata("/conferma-registrazione")).toBe(true);
    expect(rottaRiservata("/recupera-password")).toBe(true);
    expect(rottaRiservata("/reimposta-password")).toBe(true);
  });

  it("rifiuta le 5 pagine pubbliche esistenti (isPublicRoute)", () => {
    expect(rottaRiservata("/")).toBe(true);
    expect(rottaRiservata("/squadre")).toBe(true);
    expect(rottaRiservata("/calendario")).toBe(true);
    expect(rottaRiservata("/staff")).toBe(true);
    expect(rottaRiservata("/contatti")).toBe(true);
  });

  it("consente uno slug nuovo, non riservato", () => {
    expect(rottaRiservata("/storia-societa")).toBe(false);
    expect(rottaRiservata("/regolamento")).toBe(false);
  });

  it("non tratta '/apple' come riservato sotto '/app' (nessun match parziale sul solo prefisso testuale)", () => {
    expect(rottaRiservata("/apple")).toBe(false);
  });

  it("non tratta '/apis' come riservato sotto '/api' (nessun match parziale sul solo prefisso testuale)", () => {
    expect(rottaRiservata("/apis")).toBe(false);
  });

  // Code review (Edge Case Hunter): senza un confronto case-insensitive, un
  // valore come "/App" o "/Squadre" bypassava rottaRiservata() pur
  // "sembrando" una rotta reale solo a meno delle maiuscole.
  it("riconosce come riservato un valore che differisce solo per maiuscole/minuscole", () => {
    expect(rottaRiservata("/App")).toBe(true);
    expect(rottaRiservata("/APP/gruppi")).toBe(true);
    expect(rottaRiservata("/Api/health")).toBe(true);
    expect(rottaRiservata("/Squadre")).toBe(true);
    expect(rottaRiservata("/Accedi")).toBe(true);
  });
});
