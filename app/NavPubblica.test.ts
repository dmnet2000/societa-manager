import { describe, expect, it, vi, beforeEach } from "vitest";

// Story 19.8: NavPubblica e' ora un Server Component asincrono (prima un
// array hard-coded, nessuna logica testabile) - a differenza di ogni altra
// pagina/componente del progetto (mai testate direttamente, verificato in
// analisi), qui la funzione e' chiamabile come una funzione async pura: non
// serve una libreria di rendering, basta invocarla e ispezionare l'elemento
// React restituito (type/props), lo stesso oggetto che React userebbe per
// il render vero.
const elencaVociMenuPubblicoVisibiliMock = vi.fn();

vi.mock("@/lib/menu-pubblico", () => ({
  elencaVociMenuPubblicoVisibili: elencaVociMenuPubblicoVisibiliMock,
}));

const { NavPubblica } = await import("./NavPubblica");
const { NavPubblicaClient } = await import("./NavPubblicaClient");

beforeEach(() => {
  elencaVociMenuPubblicoVisibiliMock.mockReset();
});

describe("NavPubblica", () => {
  it("maps le voci visibili (url/etichetta) a href/label per NavPubblicaClient, nell'ordine ricevuto", async () => {
    elencaVociMenuPubblicoVisibiliMock.mockResolvedValue([
      { id: "1", etichetta: "Home", url: "/", ordine: 0, visibile: true },
      { id: "2", etichetta: "Squadre", url: "/squadre", ordine: 1, visibile: true },
    ]);

    const elemento = await NavPubblica();

    expect(elemento.type).toBe(NavPubblicaClient);
    expect(elemento.props.voci).toEqual([
      { href: "/", label: "Home" },
      { href: "/squadre", label: "Squadre" },
    ]);
  });

  // AC (Story 19.8): tabella vuota (nessuna voce visibile) e' un errore
  // esplicito e loggato, non un fallback silenzioso sulle 5 voci
  // hard-coded di prima.
  it("throws e logga un errore esplicito quando nessuna voce e' visibile (AC, no fallback silenzioso)", async () => {
    elencaVociMenuPubblicoVisibiliMock.mockResolvedValue([]);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(NavPubblica()).rejects.toThrow(/nessuna voce di menu pubblico visibile/i);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

    consoleErrorSpy.mockRestore();
  });
});
