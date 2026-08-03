import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const genitoreAtletaFindManyMock = vi.fn();
const gruppoAtletaFindManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    genitoreAtleta: {
      findMany: genitoreAtletaFindManyMock,
    },
    gruppoAtleta: {
      findMany: gruppoAtletaFindManyMock,
    },
  },
}));

const { elencaEmailCollegateAdAtleta } = await import("./email-destinatari-atleta");

describe("elencaEmailCollegateAdAtleta", () => {
  beforeEach(() => {
    genitoreAtletaFindManyMock.mockReset();
    gruppoAtletaFindManyMock.mockReset();
  });

  it("restituisce le email di Genitore e Atleta-se-stessa insieme a quelle dell'Allenatore del Gruppo (AC #5)", async () => {
    genitoreAtletaFindManyMock.mockResolvedValue([
      { utente: { email: "genitore@esempio.it", attivo: true } },
      { utente: { email: "atleta@esempio.it", attivo: true } },
    ]);
    gruppoAtletaFindManyMock.mockResolvedValue([
      {
        gruppo: {
          allenatori: [
            {
              allenatore: {
                utente: { email: "allenatore@esempio.it", attivo: true },
              },
            },
          ],
        },
      },
    ]);

    const risultato = await elencaEmailCollegateAdAtleta("atleta-1", "anno-1");

    expect(genitoreAtletaFindManyMock).toHaveBeenCalledWith({
      where: { atletaId: "atleta-1" },
      select: { utente: { select: { email: true, attivo: true } } },
    });
    expect(gruppoAtletaFindManyMock).toHaveBeenCalledWith({
      where: { atletaId: "atleta-1", annoAgonisticoId: "anno-1" },
      select: {
        gruppo: {
          select: {
            allenatori: {
              select: {
                allenatore: {
                  select: { utente: { select: { email: true, attivo: true } } },
                },
              },
            },
          },
        },
      },
    });
    expect(risultato.sort()).toEqual(
      ["allenatore@esempio.it", "atleta@esempio.it", "genitore@esempio.it"].sort()
    );
  });

  // Story 9.21 (review fix): un'Atleta puo' ora essere assegnata a piu'
  // Gruppi nella stessa stagione - il findMany deve raccogliere gli
  // Allenatori di TUTTE le righe GruppoAtleta trovate, non solo della
  // prima (il vecchio findFirst avrebbe notificato solo gli Allenatori di
  // un Gruppo scelto arbitrariamente).
  it("include gli Allenatori di TUTTI i Gruppi quando l'Atleta è assegnata a più Gruppi nella stessa stagione", async () => {
    genitoreAtletaFindManyMock.mockResolvedValue([]);
    gruppoAtletaFindManyMock.mockResolvedValue([
      {
        gruppo: {
          allenatori: [
            { allenatore: { utente: { email: "allenatore-under16@esempio.it", attivo: true } } },
          ],
        },
      },
      {
        gruppo: {
          allenatori: [
            { allenatore: { utente: { email: "allenatore-under19@esempio.it", attivo: true } } },
          ],
        },
      },
    ]);

    const risultato = await elencaEmailCollegateAdAtleta("atleta-1", "anno-1");

    expect(risultato.sort()).toEqual(
      ["allenatore-under16@esempio.it", "allenatore-under19@esempio.it"].sort()
    );
  });

  it("deduplica se la stessa persona compare piu' volte", async () => {
    genitoreAtletaFindManyMock.mockResolvedValue([
      { utente: { email: "genitore@esempio.it", attivo: true } },
      { utente: { email: "genitore@esempio.it", attivo: true } },
    ]);
    gruppoAtletaFindManyMock.mockResolvedValue([]);

    const risultato = await elencaEmailCollegateAdAtleta("atleta-1", "anno-1");

    expect(risultato).toEqual(["genitore@esempio.it"]);
  });

  it("deduplica anche se lo stesso indirizzo compare con maiuscole/minuscole diverse (review fix)", async () => {
    genitoreAtletaFindManyMock.mockResolvedValue([
      { utente: { email: "Genitore@Esempio.it", attivo: true } },
    ]);
    gruppoAtletaFindManyMock.mockResolvedValue([
      {
        gruppo: {
          allenatori: [
            { allenatore: { utente: { email: "genitore@esempio.IT", attivo: true } } },
          ],
        },
      },
    ]);

    const risultato = await elencaEmailCollegateAdAtleta("atleta-1", "anno-1");

    expect(risultato).toEqual(["genitore@esempio.it"]);
  });

  it("esclude gli Utenti non attivi e gli Allenatori non ancora agganciati (utente null)", async () => {
    genitoreAtletaFindManyMock.mockResolvedValue([
      { utente: { email: "disattivato@esempio.it", attivo: false } },
    ]);
    gruppoAtletaFindManyMock.mockResolvedValue([
      {
        gruppo: {
          allenatori: [{ allenatore: { utente: null } }],
        },
      },
    ]);

    const risultato = await elencaEmailCollegateAdAtleta("atleta-1", "anno-1");

    expect(risultato).toEqual([]);
  });

  it("restituisce un array vuoto (mai un errore) se nessuna riga e' trovata", async () => {
    genitoreAtletaFindManyMock.mockResolvedValue([]);
    gruppoAtletaFindManyMock.mockResolvedValue([]);

    const risultato = await elencaEmailCollegateAdAtleta("atleta-1", "anno-1");

    expect(risultato).toEqual([]);
  });

  it("con annoAgonisticoId null esclude l'Allenatore ma non Genitore/Atleta, senza interrogare GruppoAtleta", async () => {
    genitoreAtletaFindManyMock.mockResolvedValue([
      { utente: { email: "genitore@esempio.it", attivo: true } },
    ]);

    const risultato = await elencaEmailCollegateAdAtleta("atleta-1", null);

    expect(gruppoAtletaFindManyMock).not.toHaveBeenCalled();
    expect(risultato).toEqual(["genitore@esempio.it"]);
  });
});
