import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const countMock = vi.fn();
const findManyMock = vi.fn();
const upsertMock = vi.fn();
const deleteManyMock = vi.fn();
const transactionMock = vi.fn();
const elencaFederazioniMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tesseramento: {
      count: countMock,
      findMany: findManyMock,
      upsert: upsertMock,
      deleteMany: deleteManyMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/federazioni", () => ({
  elencaFederazioni: elencaFederazioniMock,
}));

const {
  federazioneInUso,
  federazioniPerAtleta,
  etichetteTesseramentoPerAtleta,
  colonneTesseramento,
  validaModificheTesseramento,
  salvaModificheTesseramento,
} = await import("./tesseramento");

// Ordine configurato: FIPAV, CSI, UISP (disattivata).
const FEDERAZIONI = [
  { id: "fipav", nome: "FIPAV", sigla: "FIPAV", attiva: true },
  { id: "csi", nome: "Centro Sportivo Italiano", sigla: "CSI", attiva: true },
  { id: "uisp", nome: "UISP", sigla: null, attiva: false },
];

beforeEach(() => {
  for (const mock of [
    countMock,
    findManyMock,
    upsertMock,
    deleteManyMock,
    transactionMock,
    elencaFederazioniMock,
  ]) {
    mock.mockReset();
  }
  elencaFederazioniMock.mockResolvedValue(FEDERAZIONI);
  findManyMock.mockResolvedValue([]);
  upsertMock.mockImplementation((args) => ({ upsert: args }));
  deleteManyMock.mockImplementation((args) => ({ deleteMany: args }));
  transactionMock.mockResolvedValue([]);
});

describe("federazioneInUso", () => {
  it("cerca la Federazione negli array di qualunque stagione", async () => {
    countMock.mockResolvedValue(2);
    expect(await federazioneInUso("csi")).toBe(true);
    expect(countMock).toHaveBeenCalledWith({ where: { federazioneIds: { has: "csi" } } });
  });

  it("false se nessun Tesseramento la contiene", async () => {
    countMock.mockResolvedValue(0);
    expect(await federazioneInUso("csi")).toBe(false);
  });
});

describe("letture", () => {
  it("federazioniPerAtleta legge solo la stagione richiesta", async () => {
    findManyMock.mockResolvedValue([{ atletaId: "a1", federazioneIds: ["csi"] }]);
    const mappa = await federazioniPerAtleta("anno-1");
    expect(findManyMock).toHaveBeenCalledWith({
      where: { annoAgonisticoId: "anno-1" },
      select: { atletaId: true, federazioneIds: true },
    });
    expect(mappa.get("a1")).toEqual(["csi"]);
  });

  it("etichette in ordine configurato, sigla o nome, id sconosciuti ignorati", async () => {
    findManyMock.mockResolvedValue([
      { atletaId: "a1", federazioneIds: ["uisp", "csi", "fipav"] },
      { atletaId: "a2", federazioneIds: ["sparita"] },
    ]);
    const mappa = await etichetteTesseramentoPerAtleta("anno-1");
    expect(mappa.get("a1")).toEqual(["FIPAV", "CSI", "UISP"]);
    expect(mappa.has("a2")).toBe(false);
  });
});

describe("colonneTesseramento", () => {
  it("attive + disattivate ancora usate in stagione, nell'ordine configurato", () => {
    const colonne = colonneTesseramento(FEDERAZIONI, new Map([["a1", ["uisp"]]]));
    expect(colonne).toEqual([
      { id: "fipav", etichetta: "FIPAV", nome: "FIPAV", attiva: true },
      { id: "csi", etichetta: "CSI", nome: "Centro Sportivo Italiano", attiva: true },
      { id: "uisp", etichetta: "UISP", nome: "UISP", attiva: false },
    ]);
  });

  it("una disattivata non usata in stagione non diventa colonna", () => {
    const colonne = colonneTesseramento(FEDERAZIONI, new Map([["a1", ["fipav"]]]));
    expect(colonne.map((c) => c.id)).toEqual(["fipav", "csi"]);
  });
});

describe("validaModificheTesseramento (matrice I/O Story 26.2)", () => {
  const attuali = new Map([
    ["conFipav", ["fipav"]],
    ["conUisp", ["uisp"]],
  ]);

  it("nuovo tesseramento su due federazioni, ordinate come l'elenco", () => {
    expect(
      validaModificheTesseramento(
        [{ atletaId: "nuova", federazioni: ["csi", "fipav", "csi"] }],
        attuali,
        FEDERAZIONI,
        false
      )
    ).toEqual({
      ok: true,
      operazioni: [{ atletaId: "nuova", tipo: "scrivi", federazioneIds: ["fipav", "csi"] }],
    });
  });

  it("sostituzione FIPAV -> CSI", () => {
    expect(
      validaModificheTesseramento(
        [{ atletaId: "conFipav", federazioni: ["csi"] }],
        attuali,
        FEDERAZIONI,
        false
      )
    ).toEqual({
      ok: true,
      operazioni: [{ atletaId: "conFipav", tipo: "scrivi", federazioneIds: ["csi"] }],
    });
  });

  it("svuotamento confermato elimina la riga", () => {
    expect(
      validaModificheTesseramento(
        [{ atletaId: "conFipav", federazioni: [] }],
        attuali,
        FEDERAZIONI,
        true
      )
    ).toEqual({ ok: true, operazioni: [{ atletaId: "conFipav", tipo: "elimina" }] });
  });

  it("svuotamento non confermato richiede conferma", () => {
    expect(
      validaModificheTesseramento(
        [{ atletaId: "conFipav", federazioni: [] }],
        attuali,
        FEDERAZIONI,
        false
      )
    ).toEqual({ ok: false, motivo: "conferma_richiesta", atletaIds: ["conFipav"] });
  });

  it("riga mai tesserata lasciata vuota: nessuna operazione, nessuna conferma", () => {
    expect(
      validaModificheTesseramento(
        [{ atletaId: "nuova", federazioni: [] }],
        attuali,
        FEDERAZIONI,
        false
      )
    ).toEqual({ ok: true, operazioni: [] });
  });

  it("Federazione disattivata gia' presente resta accettata", () => {
    expect(
      validaModificheTesseramento(
        [{ atletaId: "conUisp", federazioni: ["uisp", "csi"] }],
        attuali,
        FEDERAZIONI,
        false
      )
    ).toEqual({
      ok: true,
      operazioni: [{ atletaId: "conUisp", tipo: "scrivi", federazioneIds: ["csi", "uisp"] }],
    });
  });

  it("Federazione disattivata nuova e' rifiutata", () => {
    expect(
      validaModificheTesseramento(
        [{ atletaId: "nuova", federazioni: ["uisp"] }],
        attuali,
        FEDERAZIONI,
        false
      )
    ).toEqual({ ok: false, motivo: "federazione_non_valida", atletaIds: ["nuova"] });
  });

  it("id inesistente rifiutato, e l'intero batch fallisce", () => {
    expect(
      validaModificheTesseramento(
        [
          { atletaId: "nuova", federazioni: ["fipav"] },
          { atletaId: "conFipav", federazioni: ["zzz"] },
        ],
        attuali,
        FEDERAZIONI,
        true
      )
    ).toEqual({ ok: false, motivo: "federazione_non_valida", atletaIds: ["conFipav"] });
  });
});

describe("salvaModificheTesseramento", () => {
  it("legge lo stato delle sole Atlete modificate e scrive in un'unica transazione", async () => {
    findManyMock.mockResolvedValue([{ atletaId: "a2", federazioneIds: ["fipav"] }]);
    const esito = await salvaModificheTesseramento(
      "anno-1",
      [
        { atletaId: "a1", federazioni: ["csi"] },
        { atletaId: "a2", federazioni: [] },
      ],
      { consentiSvuotamento: true }
    );
    expect(esito).toEqual({ ok: true });
    expect(findManyMock).toHaveBeenCalledWith({
      where: { annoAgonisticoId: "anno-1", atletaId: { in: ["a1", "a2"] } },
      select: { atletaId: true, federazioneIds: true },
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(transactionMock).toHaveBeenCalledWith([
      {
        upsert: {
          where: { atletaId_annoAgonisticoId: { atletaId: "a1", annoAgonisticoId: "anno-1" } },
          create: { atletaId: "a1", annoAgonisticoId: "anno-1", federazioneIds: ["csi"] },
          update: { federazioneIds: ["csi"] },
        },
      },
      { deleteMany: { where: { atletaId: "a2", annoAgonisticoId: "anno-1" } } },
    ]);
  });

  it("non scrive nulla se la validazione fallisce", async () => {
    findManyMock.mockResolvedValue([{ atletaId: "a2", federazioneIds: ["fipav"] }]);
    const esito = await salvaModificheTesseramento(
      "anno-1",
      [
        { atletaId: "a1", federazioni: ["csi"] },
        { atletaId: "a2", federazioni: [] },
      ],
      { consentiSvuotamento: false }
    );
    expect(esito).toEqual({ ok: false, motivo: "conferma_richiesta", atletaIds: ["a2"] });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("nessuna transazione se non ci sono operazioni", async () => {
    const esito = await salvaModificheTesseramento(
      "anno-1",
      [{ atletaId: "a1", federazioni: [] }],
      { consentiSvuotamento: false }
    );
    expect(esito).toEqual({ ok: true });
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
