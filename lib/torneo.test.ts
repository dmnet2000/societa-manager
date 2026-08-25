import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const edizioneFindManyMock = vi.fn();
const edizioneFindUniqueMock = vi.fn();
const edizioneFindFirstMock = vi.fn();
const edizioneCreateMock = vi.fn();
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
const partitaCountMock = vi.fn();
const partitaCreateManyMock = vi.fn();
const partitaUpdateManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    edizioneTorneo: {
      findMany: edizioneFindManyMock,
      findUnique: edizioneFindUniqueMock,
      findFirst: edizioneFindFirstMock,
      create: edizioneCreateMock,
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
      count: partitaCountMock,
      createMany: partitaCreateManyMock,
      updateMany: partitaUpdateManyMock,
    },
  },
}));

const {
  elencaEdizioniTorneo,
  trovaEdizioneTorneoPerId,
  trovaEdizioneTorneoCorrente,
  creaEdizioneTorneo,
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
  creaPartiteTorneo,
  aggiornaRisultatoPartitaTorneo,
  trovaPartitaTorneoPerId,
} = await import("./torneo");

beforeEach(() => {
  edizioneFindManyMock.mockReset();
  edizioneFindUniqueMock.mockReset();
  edizioneFindFirstMock.mockReset();
  edizioneCreateMock.mockReset();
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
  partitaCountMock.mockReset();
  partitaCreateManyMock.mockReset();
  partitaUpdateManyMock.mockReset();
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

describe("cancellaEdizioneTorneo", () => {
  it("deletes atomically, guarded in the where clause against Categorie collegate", async () => {
    edizioneDeleteManyMock.mockResolvedValue({ count: 1 });

    const result = await cancellaEdizioneTorneo("1");

    expect(edizioneDeleteManyMock).toHaveBeenCalledWith({
      where: { id: "1", categorie: { none: {} } },
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
  it("returns only the Partite of the given Categoria, with squadre incluse, ordinate per girone poi nome", async () => {
    const righe = [{ id: "partita-1", squadraCasa: { nome: "ASD Uno" } }];
    partitaFindManyMock.mockResolvedValue(righe);

    const result = await elencaPartiteTorneo("categoria-1");

    expect(partitaFindManyMock).toHaveBeenCalledWith({
      where: { categoriaTorneoId: "categoria-1" },
      include: { squadraCasa: true, squadraOspite: true },
      orderBy: [
        { squadraCasa: { girone: "asc" } },
        { squadraCasa: { nome: "asc" } },
        { squadraOspite: { nome: "asc" } },
      ],
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
  it("bulk-creates all the given pairs in a single createMany call", async () => {
    const righe = [
      { categoriaTorneoId: "categoria-1", squadraCasaId: "a1", squadraOspiteId: "a2" },
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
