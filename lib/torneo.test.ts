import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const edizioneFindManyMock = vi.fn();
const edizioneFindUniqueMock = vi.fn();
const edizioneFindFirstMock = vi.fn();
const edizioneCreateMock = vi.fn();
const edizioneUpdateMock = vi.fn();
const edizioneDeleteManyMock = vi.fn();
const categoriaFindManyMock = vi.fn();
const categoriaFindUniqueMock = vi.fn();
const categoriaCreateMock = vi.fn();
const categoriaUpdateManyMock = vi.fn();
const categoriaDeleteManyMock = vi.fn();
const squadraFindManyMock = vi.fn();
const squadraFindUniqueMock = vi.fn();
const squadraCountMock = vi.fn();
const squadraCreateMock = vi.fn();
const squadraUpdateManyMock = vi.fn();
const squadraDeleteManyMock = vi.fn();
const partitaFindManyMock = vi.fn();
const partitaFindUniqueMock = vi.fn();
const partitaFindFirstMock = vi.fn();
const partitaCountMock = vi.fn();
const partitaCreateManyMock = vi.fn();
const partitaUpdateManyMock = vi.fn();
const partitaDeleteManyMock = vi.fn();
const slotFindManyMock = vi.fn();
const slotFindUniqueMock = vi.fn();
const slotCreateMock = vi.fn();
const slotCreateManyMock = vi.fn();
const slotDeleteManyMock = vi.fn();
const palestraFindManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    edizioneTorneo: {
      findMany: edizioneFindManyMock,
      findUnique: edizioneFindUniqueMock,
      findFirst: edizioneFindFirstMock,
      create: edizioneCreateMock,
      update: edizioneUpdateMock,
      deleteMany: edizioneDeleteManyMock,
    },
    categoriaTorneo: {
      findMany: categoriaFindManyMock,
      findUnique: categoriaFindUniqueMock,
      create: categoriaCreateMock,
      updateMany: categoriaUpdateManyMock,
      deleteMany: categoriaDeleteManyMock,
    },
    squadraTorneo: {
      findMany: squadraFindManyMock,
      findUnique: squadraFindUniqueMock,
      count: squadraCountMock,
      create: squadraCreateMock,
      updateMany: squadraUpdateManyMock,
      deleteMany: squadraDeleteManyMock,
    },
    partitaTorneo: {
      findMany: partitaFindManyMock,
      findUnique: partitaFindUniqueMock,
      findFirst: partitaFindFirstMock,
      count: partitaCountMock,
      createMany: partitaCreateManyMock,
      updateMany: partitaUpdateManyMock,
      deleteMany: partitaDeleteManyMock,
    },
    slotTorneo: {
      findMany: slotFindManyMock,
      findUnique: slotFindUniqueMock,
      create: slotCreateMock,
      createMany: slotCreateManyMock,
      deleteMany: slotDeleteManyMock,
    },
    palestra: {
      findMany: palestraFindManyMock,
    },
  },
}));

const {
  elencaEdizioniTorneo,
  trovaEdizioneTorneoPerId,
  trovaEdizioneTorneoCorrente,
  creaEdizioneTorneo,
  aggiornaNomiSettimaneTorneo,
  cancellaEdizioneTorneo,
  elencaCategorieTorneo,
  trovaCategoriaTorneoPerId,
  creaCategoriaTorneo,
  aggiornaCategoriaTorneo,
  cancellaCategoriaTorneo,
  elencaSquadreTorneo,
  contaSquadreTorneo,
  creaSquadraTorneo,
  aggiornaSquadraTorneo,
  cancellaSquadraTorneo,
  trovaSquadraTorneoPerId,
  elencaPartiteTorneo,
  contaPartiteTorneo,
  contaPartiteTorneoTabellone,
  prossimoNumeroPartitaTorneo,
  creaPartiteTorneo,
  cancellaPartiteTorneo,
  aggiornaRisultatoPartitaTorneo,
  trovaPartitaTorneoPerId,
  creaSlotTorneo,
  creaSlotTorneoPerSelezione,
  elencaSlotTorneo,
  trovaSlotTorneoPerId,
  cancellaSlotTorneo,
  assegnaSlotPartitaTorneo,
  elencaSlotTorneoLiberi,
} = await import("./torneo");

beforeEach(() => {
  edizioneFindManyMock.mockReset();
  edizioneFindUniqueMock.mockReset();
  edizioneFindFirstMock.mockReset();
  edizioneCreateMock.mockReset();
  edizioneUpdateMock.mockReset();
  edizioneDeleteManyMock.mockReset();
  categoriaFindManyMock.mockReset();
  categoriaFindUniqueMock.mockReset();
  categoriaCreateMock.mockReset();
  categoriaUpdateManyMock.mockReset();
  categoriaDeleteManyMock.mockReset();
  squadraFindManyMock.mockReset();
  squadraFindUniqueMock.mockReset();
  squadraCountMock.mockReset();
  squadraCreateMock.mockReset();
  squadraUpdateManyMock.mockReset();
  squadraDeleteManyMock.mockReset();
  partitaFindManyMock.mockReset();
  partitaFindUniqueMock.mockReset();
  partitaFindFirstMock.mockReset();
  partitaCountMock.mockReset();
  partitaCreateManyMock.mockReset();
  partitaUpdateManyMock.mockReset();
  partitaDeleteManyMock.mockReset();
  slotFindManyMock.mockReset();
  slotFindUniqueMock.mockReset();
  slotCreateMock.mockReset();
  slotCreateManyMock.mockReset();
  slotDeleteManyMock.mockReset();
  palestraFindManyMock.mockReset();
});

describe("elencaEdizioniTorneo", () => {
  it("returns all Edizioni ordered by anno descending, with the Categorie count", async () => {
    const righe = [{ id: "1", anno: 2027, nome: "Memorial Mario Rossi", _count: { categorie: 2 } }];
    edizioneFindManyMock.mockResolvedValue(righe);

    const result = await elencaEdizioniTorneo();

    expect(edizioneFindManyMock).toHaveBeenCalledWith({
      orderBy: { anno: "desc" },
      include: { _count: { select: { categorie: true } } },
    });
    expect(result).toBe(righe);
  });
});

describe("trovaEdizioneTorneoPerId", () => {
  it("looks up a single Edizione by id", async () => {
    const edizione = { id: "1", anno: 2027, nome: "Memorial Mario Rossi" };
    edizioneFindUniqueMock.mockResolvedValue(edizione);

    const result = await trovaEdizioneTorneoPerId("1");

    expect(edizioneFindUniqueMock).toHaveBeenCalledWith({ where: { id: "1" } });
    expect(result).toBe(edizione);
  });
});

describe("trovaEdizioneTorneoCorrente", () => {
  // Story 20.6: "Edizione corrente" = anno piu' alto - stesso criterio di
  // elencaEdizioniTorneo (orderBy anno desc), qui findFirst.
  it("returns the Edizione with the highest anno", async () => {
    const edizione = { id: "1", anno: 2027, nome: "Memorial Mario Rossi" };
    edizioneFindFirstMock.mockResolvedValue(edizione);

    const result = await trovaEdizioneTorneoCorrente();

    expect(edizioneFindFirstMock).toHaveBeenCalledWith({ orderBy: { anno: "desc" } });
    expect(result).toBe(edizione);
  });

  it("returns null when no Edizione exists yet", async () => {
    edizioneFindFirstMock.mockResolvedValue(null);

    const result = await trovaEdizioneTorneoCorrente();

    expect(result).toBeNull();
  });
});

describe("creaEdizioneTorneo", () => {
  it("creates an Edizione with the given anno and nome", async () => {
    const edizione = { id: "1", anno: 2027, nome: "Memorial Mario Rossi" };
    edizioneCreateMock.mockResolvedValue(edizione);

    const result = await creaEdizioneTorneo(2027, "Memorial Mario Rossi");

    expect(edizioneCreateMock).toHaveBeenCalledWith({
      data: { anno: 2027, nome: "Memorial Mario Rossi" },
    });
    expect(result).toBe(edizione);
  });
});

describe("aggiornaNomiSettimaneTorneo", () => {
  it("updates the Edizione's nomeSettimana1/nomeSettimana2 by id", async () => {
    const dati = { nomeSettimana1: "Under 14/16", nomeSettimana2: null };
    const edizione = { id: "edizione-1", anno: 2027, ...dati };
    edizioneUpdateMock.mockResolvedValue(edizione);

    const result = await aggiornaNomiSettimaneTorneo("edizione-1", dati);

    expect(edizioneUpdateMock).toHaveBeenCalledWith({
      where: { id: "edizione-1" },
      data: dati,
    });
    expect(result).toBe(edizione);
  });
});

describe("cancellaEdizioneTorneo", () => {
  it("deletes atomically, guarded in the where clause against Categorie e Slot collegati", async () => {
    edizioneDeleteManyMock.mockResolvedValue({ count: 1 });

    const result = await cancellaEdizioneTorneo("1");

    expect(edizioneDeleteManyMock).toHaveBeenCalledWith({
      where: { id: "1", categorie: { none: {} }, slot: { none: {} } },
    });
    expect(result).toEqual({ count: 1 });
  });
});

describe("elencaCategorieTorneo", () => {
  it("returns only the Categorie of the given Edizione, ordered by settimana then nome", async () => {
    const righe = [{ id: "1", nome: "Under 14", settimana: "SETTIMANA_1" }];
    categoriaFindManyMock.mockResolvedValue(righe);

    const result = await elencaCategorieTorneo("edizione-1");

    expect(categoriaFindManyMock).toHaveBeenCalledWith({
      where: { edizioneTorneoId: "edizione-1" },
      orderBy: [{ settimana: "asc" }, { nome: "asc" }],
    });
    expect(result).toBe(righe);
  });
});

describe("creaCategoriaTorneo", () => {
  it("creates a Categoria attached to the given Edizione", async () => {
    const dati = {
      nome: "Under 14",
      settimana: "SETTIMANA_1" as const,
      numeroMassimoSquadre: 8,
      edizioneTorneoId: "edizione-1",
    };
    const categoria = { id: "1", ...dati };
    categoriaCreateMock.mockResolvedValue(categoria);

    const result = await creaCategoriaTorneo(dati);

    expect(categoriaCreateMock).toHaveBeenCalledWith({ data: dati });
    expect(result).toBe(categoria);
  });
});

describe("aggiornaCategoriaTorneo", () => {
  it("updates only the Categoria matching BOTH id and edizioneTorneoId", async () => {
    const dati = { nome: "Under 16", settimana: "SETTIMANA_2" as const, numeroMassimoSquadre: 6 };
    categoriaUpdateManyMock.mockResolvedValue({ count: 1 });

    const result = await aggiornaCategoriaTorneo("categoria-1", "edizione-1", dati);

    expect(categoriaUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "categoria-1", edizioneTorneoId: "edizione-1" },
      data: dati,
    });
    expect(result).toEqual({ count: 1 });
  });
});

describe("trovaCategoriaTorneoPerId", () => {
  it("looks up a single Categoria by id", async () => {
    const categoria = { id: "categoria-1", nome: "Under 14", edizioneTorneoId: "edizione-1" };
    categoriaFindUniqueMock.mockResolvedValue(categoria);

    const result = await trovaCategoriaTorneoPerId("categoria-1");

    expect(categoriaFindUniqueMock).toHaveBeenCalledWith({ where: { id: "categoria-1" } });
    expect(result).toBe(categoria);
  });
});

describe("cancellaCategoriaTorneo", () => {
  it("deletes only the Categoria matching id and edizioneTorneoId, guarded against Squadre collegate", async () => {
    categoriaDeleteManyMock.mockResolvedValue({ count: 1 });

    const result = await cancellaCategoriaTorneo("categoria-1", "edizione-1");

    expect(categoriaDeleteManyMock).toHaveBeenCalledWith({
      where: { id: "categoria-1", edizioneTorneoId: "edizione-1", squadre: { none: {} } },
    });
    expect(result).toEqual({ count: 1 });
  });
});

describe("elencaSquadreTorneo", () => {
  it("returns only the Squadre of the given Categoria, ordered by girone then nome", async () => {
    const righe = [{ id: "1", nome: "ASD Uno", girone: "GIRONE_A" }];
    squadraFindManyMock.mockResolvedValue(righe);

    const result = await elencaSquadreTorneo("categoria-1");

    expect(squadraFindManyMock).toHaveBeenCalledWith({
      where: { categoriaTorneoId: "categoria-1" },
      orderBy: [{ girone: "asc" }, { nome: "asc" }],
    });
    expect(result).toBe(righe);
  });
});

describe("contaSquadreTorneo", () => {
  it("counts the Squadre of the given Categoria", async () => {
    squadraCountMock.mockResolvedValue(3);

    const result = await contaSquadreTorneo("categoria-1");

    expect(squadraCountMock).toHaveBeenCalledWith({ where: { categoriaTorneoId: "categoria-1" } });
    expect(result).toBe(3);
  });
});

describe("creaSquadraTorneo", () => {
  it("creates a Squadra attached to the given Categoria", async () => {
    const dati = {
      nome: "ASD Uno",
      girone: "GIRONE_A" as const,
      referente: "Mario Rossi",
      contatto: "333 1234567",
      categoriaTorneoId: "categoria-1",
    };
    const squadra = { id: "1", ...dati };
    squadraCreateMock.mockResolvedValue(squadra);

    const result = await creaSquadraTorneo(dati);

    expect(squadraCreateMock).toHaveBeenCalledWith({ data: dati });
    expect(result).toBe(squadra);
  });
});

describe("aggiornaSquadraTorneo", () => {
  it("updates only the Squadra matching BOTH id and categoriaTorneoId", async () => {
    const dati = { nome: "ASD Due", girone: "GIRONE_B" as const, referente: null, contatto: null };
    squadraUpdateManyMock.mockResolvedValue({ count: 1 });

    const result = await aggiornaSquadraTorneo("squadra-1", "categoria-1", dati);

    expect(squadraUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "squadra-1", categoriaTorneoId: "categoria-1" },
      data: dati,
    });
    expect(result).toEqual({ count: 1 });
  });
});

describe("trovaSquadraTorneoPerId", () => {
  it("looks up a single Squadra by id", async () => {
    const squadra = { id: "squadra-1", nome: "ASD Uno" };
    squadraFindUniqueMock.mockResolvedValue(squadra);

    const result = await trovaSquadraTorneoPerId("squadra-1");

    expect(squadraFindUniqueMock).toHaveBeenCalledWith({ where: { id: "squadra-1" } });
    expect(result).toBe(squadra);
  });
});

describe("cancellaSquadraTorneo", () => {
  // Review fix (Story 20.3): il where e' stato esteso con
  // "partiteCasa: { none: {} } }"/"partiteOspite: { none: {} } }" - una
  // Squadra con incontri gia' generati non e' piu' eliminabile, stesso
  // pattern anti-TOCTOU di cancellaCategoriaTorneo/cancellaEdizioneTorneo.
  it("deletes only the Squadra matching id + categoriaTorneoId AND with no PartitaTorneo collegate", async () => {
    squadraDeleteManyMock.mockResolvedValue({ count: 1 });

    const result = await cancellaSquadraTorneo("squadra-1", "categoria-1");

    expect(squadraDeleteManyMock).toHaveBeenCalledWith({
      where: {
        id: "squadra-1",
        categoriaTorneoId: "categoria-1",
        partiteCasa: { none: {} },
        partiteOspite: { none: {} },
      },
    });
    expect(result).toEqual({ count: 1 });
  });
});

describe("elencaPartiteTorneo", () => {
  // Story 20.11: orderBy semplificato a "numero" - una sequenza globale
  // dell'Edizione assegnata per blocchi consecutivi per girone/fase, produce
  // gia' un raggruppamento naturale equivalente al precedente ordine per
  // girone/nome Squadra.
  it("returns only the Partite of the given Categoria, with squadre incluse, ordinate per numero", async () => {
    const righe = [{ id: "partita-1", numero: 1, squadraCasa: { nome: "ASD Uno" } }];
    partitaFindManyMock.mockResolvedValue(righe);

    const result = await elencaPartiteTorneo("categoria-1");

    expect(partitaFindManyMock).toHaveBeenCalledWith({
      where: { categoriaTorneoId: "categoria-1" },
      include: {
        squadraCasa: true,
        squadraOspite: true,
        slotTorneo: { include: { palestra: true, campo: true } },
      },
      orderBy: [{ numero: "asc" }],
    });
    expect(result).toBe(righe);
  });
});

describe("contaPartiteTorneo", () => {
  it("counts the Partite of the given Categoria", async () => {
    partitaCountMock.mockResolvedValue(6);

    const result = await contaPartiteTorneo("categoria-1");

    expect(partitaCountMock).toHaveBeenCalledWith({ where: { categoriaTorneoId: "categoria-1" } });
    expect(result).toBe(6);
  });
});

describe("contaPartiteTorneoTabellone", () => {
  // Story 20.4: guardia di idempotenza dedicata per generaTabelloneAction -
  // conta solo le PartitaTorneo con fase diversa da GIRONE, distinta da
  // contaPartiteTorneo sopra (che conta anche gli incontri di girone).
  it("counts only the Partite of the given Categoria with fase !== GIRONE", async () => {
    partitaCountMock.mockResolvedValue(4);

    const result = await contaPartiteTorneoTabellone("categoria-1");

    expect(partitaCountMock).toHaveBeenCalledWith({
      where: { categoriaTorneoId: "categoria-1", fase: { not: "GIRONE" } },
    });
    expect(result).toBe(4);
  });
});

describe("creaPartiteTorneo", () => {
  // Story 20.11: edizioneTorneoId/numero ora obbligatori sul tipo del
  // parametro - il chiamante li calcola sempre prima (prossimoNumeroPartitaTorneo
  // sotto), nessun default silenzioso possibile per un numero di gara.
  it("bulk-creates all the given pairs in a single createMany call", async () => {
    const righe = [
      {
        categoriaTorneoId: "categoria-1",
        squadraCasaId: "a1",
        squadraOspiteId: "a2",
        edizioneTorneoId: "edizione-1",
        numero: 1,
      },
    ];
    partitaCreateManyMock.mockResolvedValue({ count: 1 });

    const result = await creaPartiteTorneo(righe);

    expect(partitaCreateManyMock).toHaveBeenCalledWith({ data: righe });
    expect(result).toEqual({ count: 1 });
  });

  // Story 20.4: fase/tabellone opzionali - il chiamante (generaTabelloneAction/
  // il side-effect di salvaRisultatoPartitaTorneoAction) li passa
  // esplicitamente per le semifinali/finali, passati invariati a Prisma.
  it("passes fase/tabellone through to createMany when provided", async () => {
    const righe = [
      {
        categoriaTorneoId: "categoria-1",
        squadraCasaId: "s1",
        squadraOspiteId: "s2",
        edizioneTorneoId: "edizione-1",
        numero: 5,
        fase: "SEMIFINALE" as const,
        tabellone: "POSIZIONI_1_4" as const,
      },
    ];
    partitaCreateManyMock.mockResolvedValue({ count: 1 });

    const result = await creaPartiteTorneo(righe);

    expect(partitaCreateManyMock).toHaveBeenCalledWith({ data: righe });
    expect(result).toEqual({ count: 1 });
  });
});

// Story 20.11 (Epic 20, Torneo Memorial): "prossimo numero" - legge il
// massimo numero gia' assegnato nell'Edizione e incrementa da li'.
describe("prossimoNumeroPartitaTorneo", () => {
  it("returns 1 when the Edizione has no PartitaTorneo yet (AC #1)", async () => {
    partitaFindFirstMock.mockResolvedValue(null);

    const result = await prossimoNumeroPartitaTorneo("edizione-1");

    expect(partitaFindFirstMock).toHaveBeenCalledWith({
      where: { edizioneTorneoId: "edizione-1" },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    expect(result).toBe(1);
  });

  // AC #2: la nuova Categoria riceve N+1, mai una numerazione che riparte -
  // qui simulato dal massimo gia' presente nell'Edizione (indipendentemente
  // da quale Categoria l'abbia generato).
  it("returns one more than the highest numero already assigned in the Edizione", async () => {
    partitaFindFirstMock.mockResolvedValue({ numero: 12 });

    const result = await prossimoNumeroPartitaTorneo("edizione-1");

    expect(result).toBe(13);
  });
});

describe("trovaPartitaTorneoPerId", () => {
  it("looks up a single PartitaTorneo by id", async () => {
    const partita = { id: "partita-1", fase: "SEMIFINALE", tabellone: "POSIZIONI_1_4" };
    partitaFindUniqueMock.mockResolvedValue(partita);

    const result = await trovaPartitaTorneoPerId("partita-1");

    expect(partitaFindUniqueMock).toHaveBeenCalledWith({ where: { id: "partita-1" } });
    expect(result).toBe(partita);
  });
});

describe("aggiornaRisultatoPartitaTorneo", () => {
  it("updates only the Partita matching BOTH id and categoriaTorneoId", async () => {
    const dati = {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
      set3Casa: null,
      set3Ospite: null,
    };
    partitaUpdateManyMock.mockResolvedValue({ count: 1 });

    const result = await aggiornaRisultatoPartitaTorneo("partita-1", "categoria-1", dati);

    expect(partitaUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "partita-1", categoriaTorneoId: "categoria-1" },
      data: dati,
    });
    expect(result).toEqual({ count: 1 });
  });
});

describe("cancellaPartiteTorneo", () => {
  it("deletes all Partite for the given Categoria (girone and tabellone together)", async () => {
    partitaDeleteManyMock.mockResolvedValue({ count: 12 });

    const result = await cancellaPartiteTorneo("categoria-1");

    expect(partitaDeleteManyMock).toHaveBeenCalledWith({
      where: { categoriaTorneoId: "categoria-1" },
    });
    expect(result).toEqual({ count: 12 });
  });

  it("is a valid no-op when there are no Partite to delete", async () => {
    partitaDeleteManyMock.mockResolvedValue({ count: 0 });

    const result = await cancellaPartiteTorneo("categoria-1");

    expect(result).toEqual({ count: 0 });
  });
});

// Story 20.9 (Epic 20, Torneo Memorial): funzioni SlotTorneo - stesso stile
// di mock/assert delle describe precedenti.
describe("creaSlotTorneo", () => {
  it("creates a Slot attached to the given Edizione", async () => {
    const dati = {
      edizioneTorneoId: "edizione-1",
      etichetta: "Campo 1 - Sabato mattina",
      data: "2026-09-05",
      ora: "09:00",
      palestraId: "palestra-1",
      fase: "GIRONE" as const,
      tabellone: null,
    };
    const slot = { id: "slot-1", ...dati };
    slotCreateMock.mockResolvedValue(slot);

    const result = await creaSlotTorneo(dati);

    expect(slotCreateMock).toHaveBeenCalledWith({ data: dati });
    expect(result).toBe(slot);
  });
});

// Story 20.18 (Epic 20, Torneo Memorial): sostituisce
// creaSlotTorneoPerTutteLePalestre (Story 20.12) - una riga per selezione
// Palestra x Campo, l'insieme valido ricalcolato SEMPRE server-side (mai
// fidandosi delle selezioni ricevute).
describe("creaSlotTorneoPerSelezione", () => {
  it("creates one SlotTorneo per selected combinazione Palestra/Campo, campoId incluso", async () => {
    palestraFindManyMock.mockResolvedValue([
      { id: "palestra-1", campi: [{ id: "campo-1" }, { id: "campo-2" }] },
      { id: "palestra-2", campi: [] },
    ]);
    slotCreateManyMock.mockResolvedValue({ count: 3 });

    const result = await creaSlotTorneoPerSelezione({
      edizioneTorneoId: "edizione-1",
      etichetta: "Sabato pomeriggio",
      data: "2026-09-05",
      ora: "15:00",
      selezioni: [
        { palestraId: "palestra-1", campoId: "campo-1" },
        { palestraId: "palestra-1", campoId: "campo-2" },
        { palestraId: "palestra-2", campoId: null },
      ],
    });

    // Review fix (Verification Gap Reviewer): select invece di include - solo
    // "id" di Palestra e "id" di Campo sono mai letti, mai l'intera riga
    // Palestra (nome/indirizzo/latitudine/longitudine/createdAt).
    expect(palestraFindManyMock).toHaveBeenCalledWith({
      select: { id: true, campi: { select: { id: true } } },
    });
    expect(slotCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          edizioneTorneoId: "edizione-1",
          etichetta: "Sabato pomeriggio",
          data: "2026-09-05",
          ora: "15:00",
          palestraId: "palestra-1",
          campoId: "campo-1",
          fase: "GIRONE",
          tabellone: null,
        },
        {
          edizioneTorneoId: "edizione-1",
          etichetta: "Sabato pomeriggio",
          data: "2026-09-05",
          ora: "15:00",
          palestraId: "palestra-1",
          campoId: "campo-2",
          fase: "GIRONE",
          tabellone: null,
        },
        {
          edizioneTorneoId: "edizione-1",
          etichetta: "Sabato pomeriggio",
          data: "2026-09-05",
          ora: "15:00",
          palestraId: "palestra-2",
          campoId: null,
          fase: "GIRONE",
          tabellone: null,
        },
      ],
    });
    expect(result).toEqual({ count: 3, nessunaPalestraCensita: false });
  });

  // I/O matrix (spec-20-18): "Palestra con 2 Campi, un solo Campo
  // selezionato" -> 1 SlotTorneo creato con quel campoId.
  it("creates only the selected Campo when only one of two is chosen", async () => {
    palestraFindManyMock.mockResolvedValue([
      { id: "palestra-1", campi: [{ id: "campo-1" }, { id: "campo-2" }] },
    ]);
    slotCreateManyMock.mockResolvedValue({ count: 1 });

    const result = await creaSlotTorneoPerSelezione({
      edizioneTorneoId: "edizione-1",
      etichetta: "Sabato pomeriggio",
      data: "2026-09-05",
      ora: "15:00",
      selezioni: [{ palestraId: "palestra-1", campoId: "campo-1" }],
    });

    expect(slotCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          edizioneTorneoId: "edizione-1",
          etichetta: "Sabato pomeriggio",
          data: "2026-09-05",
          ora: "15:00",
          palestraId: "palestra-1",
          campoId: "campo-1",
          fase: "GIRONE",
          tabellone: null,
        },
      ],
    });
    expect(result).toEqual({ count: 1, nessunaPalestraCensita: false });
  });

  // I/O matrix: "Selezione manomessa (id inesistente o combinazione
  // Palestra/Campo non valida)" -> riga ignorata, mai creata.
  it("silently discards a selection with a Campo that does not belong to the given Palestra", async () => {
    palestraFindManyMock.mockResolvedValue([
      { id: "palestra-1", campi: [{ id: "campo-1" }] },
      { id: "palestra-2", campi: [{ id: "campo-2" }] },
    ]);
    slotCreateManyMock.mockResolvedValue({ count: 1 });

    const result = await creaSlotTorneoPerSelezione({
      edizioneTorneoId: "edizione-1",
      etichetta: "Sabato pomeriggio",
      data: "2026-09-05",
      ora: "15:00",
      selezioni: [
        { palestraId: "palestra-1", campoId: "campo-1" },
        // campo-2 appartiene a palestra-2, non a palestra-1 - scartata.
        { palestraId: "palestra-1", campoId: "campo-2" },
        // id del tutto inesistente - scartata.
        { palestraId: "palestra-inesistente", campoId: null },
      ],
    });

    expect(slotCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          edizioneTorneoId: "edizione-1",
          etichetta: "Sabato pomeriggio",
          data: "2026-09-05",
          ora: "15:00",
          palestraId: "palestra-1",
          campoId: "campo-1",
          fase: "GIRONE",
          tabellone: null,
        },
      ],
    });
    expect(result).toEqual({ count: 1, nessunaPalestraCensita: false });
  });

  // Review fix (Edge Case Hunter): una combinazione valida inviata due
  // volte (form manomesso, o un doppio submit non impedito lato client)
  // deve produrre UNA sola riga SlotTorneo, mai due righe identiche.
  it("deduplicates a repeated selezione before writing (same combinazione sent twice)", async () => {
    palestraFindManyMock.mockResolvedValue([
      { id: "palestra-1", campi: [{ id: "campo-1" }] },
    ]);
    slotCreateManyMock.mockResolvedValue({ count: 1 });

    const result = await creaSlotTorneoPerSelezione({
      edizioneTorneoId: "edizione-1",
      etichetta: "Sabato pomeriggio",
      data: "2026-09-05",
      ora: "15:00",
      selezioni: [
        { palestraId: "palestra-1", campoId: "campo-1" },
        { palestraId: "palestra-1", campoId: "campo-1" },
      ],
    });

    expect(slotCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          edizioneTorneoId: "edizione-1",
          etichetta: "Sabato pomeriggio",
          data: "2026-09-05",
          ora: "15:00",
          palestraId: "palestra-1",
          campoId: "campo-1",
          fase: "GIRONE",
          tabellone: null,
        },
      ],
    });
    expect(result).toEqual({ count: 1, nessunaPalestraCensita: false });
  });

  // I/O matrix: "tutte le righe deselezionate" -> selezione vuota, nessuna
  // scrittura, nessunaPalestraCensita false (le Palestre esistono, solo la
  // selezione e' vuota) - distingue questo caso da "0 Palestre esistono"
  // sotto.
  it("returns count 0 without writing anything when selezioni is empty but Palestre exist", async () => {
    palestraFindManyMock.mockResolvedValue([{ id: "palestra-1", campi: [] }]);

    const result = await creaSlotTorneoPerSelezione({
      edizioneTorneoId: "edizione-1",
      etichetta: "Sabato pomeriggio",
      data: "2026-09-05",
      ora: "15:00",
      selezioni: [],
    });

    expect(result).toEqual({ count: 0, nessunaPalestraCensita: false });
    expect(slotCreateManyMock).not.toHaveBeenCalled();
  });

  it("returns count 0 with nessunaPalestraCensita true when no Palestra exists yet", async () => {
    palestraFindManyMock.mockResolvedValue([]);

    const result = await creaSlotTorneoPerSelezione({
      edizioneTorneoId: "edizione-1",
      etichetta: "Sabato pomeriggio",
      data: "2026-09-05",
      ora: "15:00",
      selezioni: [{ palestraId: "palestra-1", campoId: null }],
    });

    expect(result).toEqual({ count: 0, nessunaPalestraCensita: true });
    expect(slotCreateManyMock).not.toHaveBeenCalled();
  });
});

describe("elencaSlotTorneo", () => {
  it("returns only the Slot of the given Edizione, with Palestra e Campo inclusi, ordinati per data poi ora", async () => {
    const righe = [
      { id: "slot-1", etichetta: "Campo 1", palestra: { nome: "Palestra A" }, campo: null },
    ];
    slotFindManyMock.mockResolvedValue(righe);

    const result = await elencaSlotTorneo("edizione-1");

    expect(slotFindManyMock).toHaveBeenCalledWith({
      where: { edizioneTorneoId: "edizione-1" },
      include: { palestra: true, campo: true },
      orderBy: [{ data: "asc" }, { ora: "asc" }],
    });
    expect(result).toBe(righe);
  });
});

describe("trovaSlotTorneoPerId", () => {
  it("looks up a single Slot by id", async () => {
    const slot = { id: "slot-1", etichetta: "Campo 1", edizioneTorneoId: "edizione-1" };
    slotFindUniqueMock.mockResolvedValue(slot);

    const result = await trovaSlotTorneoPerId("slot-1");

    expect(slotFindUniqueMock).toHaveBeenCalledWith({ where: { id: "slot-1" } });
    expect(result).toBe(slot);
  });
});

describe("cancellaSlotTorneo", () => {
  it("deletes only the Slot matching id and edizioneTorneoId, guarded against Partite collegate", async () => {
    slotDeleteManyMock.mockResolvedValue({ count: 1 });

    const result = await cancellaSlotTorneo("slot-1", "edizione-1");

    expect(slotDeleteManyMock).toHaveBeenCalledWith({
      where: { id: "slot-1", edizioneTorneoId: "edizione-1", partite: { none: {} } },
    });
    expect(result).toEqual({ count: 1 });
  });
});

describe("assegnaSlotPartitaTorneo", () => {
  it("updates only the Partita matching BOTH id and categoriaTorneoId with the given slotTorneoId", async () => {
    partitaUpdateManyMock.mockResolvedValue({ count: 1 });

    const result = await assegnaSlotPartitaTorneo("partita-1", "categoria-1", "slot-1");

    expect(partitaUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "partita-1", categoriaTorneoId: "categoria-1" },
      data: { slotTorneoId: "slot-1" },
    });
    expect(result).toEqual({ count: 1 });
  });

  it("accepts a null slotTorneoId to remove an existing assignment", async () => {
    partitaUpdateManyMock.mockResolvedValue({ count: 1 });

    const result = await assegnaSlotPartitaTorneo("partita-1", "categoria-1", null);

    expect(partitaUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "partita-1", categoriaTorneoId: "categoria-1" },
      data: { slotTorneoId: null },
    });
    expect(result).toEqual({ count: 1 });
  });
});

describe("elencaSlotTorneoLiberi", () => {
  it("returns only the Slot of the given fase/tabellone with no Partita collegata, ordered by data then ora", async () => {
    const righe = [{ id: "slot-1", fase: "SEMIFINALE", tabellone: "POSIZIONI_1_4" }];
    slotFindManyMock.mockResolvedValue(righe);

    const result = await elencaSlotTorneoLiberi("edizione-1", "SEMIFINALE", "POSIZIONI_1_4");

    expect(slotFindManyMock).toHaveBeenCalledWith({
      where: {
        edizioneTorneoId: "edizione-1",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_1_4",
        partite: { none: {} },
      },
      orderBy: [{ data: "asc" }, { ora: "asc" }],
    });
    expect(result).toBe(righe);
  });

  it("passes a null tabellone through for GIRONE Slot", async () => {
    slotFindManyMock.mockResolvedValue([]);

    await elencaSlotTorneoLiberi("edizione-1", "GIRONE", null);

    expect(slotFindManyMock).toHaveBeenCalledWith({
      where: {
        edizioneTorneoId: "edizione-1",
        fase: "GIRONE",
        tabellone: null,
        partite: { none: {} },
      },
      orderBy: [{ data: "asc" }, { ora: "asc" }],
    });
  });
});
