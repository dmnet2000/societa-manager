import { describe, expect, it, vi, beforeEach } from "vitest";

// Story 20.5: actions.ts importa ora anche lib/storage/volantino-torneo.ts e
// lib/storage/validazione-immagine.ts, entrambe con "server-only" in testa -
// stesso mock gia' stabilito in gruppi/actions.test.ts.
vi.mock("server-only", () => ({}));

// Mirror dello stile di mock di app/(configurazione)/menu-pubblico/actions.test.ts:
// mock diretto di @/lib/torneo (non @/lib/prisma) - da quando le scritture
// sono state spostate li' (review fix, Story 20.1), stesso principio di
// separazione dei livelli gia' in uso per menu-pubblico.
const requireRuoloMock = vi.fn();
const trovaEdizioneTorneoPerIdMock = vi.fn();
const trovaPalestraPerIdMock = vi.fn();
const creaEdizioneTorneoMock = vi.fn();
const cancellaEdizioneTorneoMock = vi.fn();
const creaCategoriaTorneoMock = vi.fn();
const aggiornaCategoriaTorneoMock = vi.fn();
const cancellaCategoriaTorneoMock = vi.fn();
const trovaCategoriaTorneoPerIdMock = vi.fn();
const elencaCategorieTorneoMock = vi.fn();
const contaSquadreTorneoMock = vi.fn();
const creaSquadraTorneoMock = vi.fn();
const aggiornaSquadraTorneoMock = vi.fn();
const cancellaSquadraTorneoMock = vi.fn();
const trovaSquadraTorneoPerIdMock = vi.fn();
const elencaSquadreTorneoMock = vi.fn();
const contaPartiteTorneoMock = vi.fn();
const contaPartiteTorneoTabelloneMock = vi.fn();
const creaPartiteTorneoMock = vi.fn();
const cancellaPartiteTorneoMock = vi.fn();
const elencaPartiteTorneoMock = vi.fn();
const aggiornaRisultatoPartitaTorneoMock = vi.fn();
const trovaPartitaTorneoPerIdMock = vi.fn();
const creaSlotTorneoMock = vi.fn();
const trovaSlotTorneoPerIdMock = vi.fn();
const cancellaSlotTorneoMock = vi.fn();
const assegnaSlotPartitaTorneoMock = vi.fn();
const elencaSlotTorneoLiberiMock = vi.fn();
const revalidatePathMock = vi.fn();
const caricaVolantinoTorneoMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

// Story 20.5: caricaVolantinoTorneoAction riusa caricaVolantinoTorneo -
// mockata qui come funzione intera (gia' testata per conto proprio in
// lib/storage/volantino-torneo.test.ts), stesso principio di
// caricaFotoSquadra in gruppi/actions.test.ts.
vi.mock("@/lib/storage/volantino-torneo", () => ({
  caricaVolantinoTorneo: caricaVolantinoTorneoMock,
}));

// caricaVolantinoTorneoAction legge la sessione tramite createClient() solo
// per passarla a caricaVolantinoTorneo (mockata sopra) - un oggetto vuoto
// basta, nessun metodo del client viene davvero invocato in questi test.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({}),
}));

vi.mock("@/lib/torneo", () => ({
  trovaEdizioneTorneoPerId: trovaEdizioneTorneoPerIdMock,
  trovaPalestraPerId: trovaPalestraPerIdMock,
  creaEdizioneTorneo: creaEdizioneTorneoMock,
  cancellaEdizioneTorneo: cancellaEdizioneTorneoMock,
  creaCategoriaTorneo: creaCategoriaTorneoMock,
  aggiornaCategoriaTorneo: aggiornaCategoriaTorneoMock,
  cancellaCategoriaTorneo: cancellaCategoriaTorneoMock,
  trovaCategoriaTorneoPerId: trovaCategoriaTorneoPerIdMock,
  elencaCategorieTorneo: elencaCategorieTorneoMock,
  contaSquadreTorneo: contaSquadreTorneoMock,
  creaSquadraTorneo: creaSquadraTorneoMock,
  aggiornaSquadraTorneo: aggiornaSquadraTorneoMock,
  cancellaSquadraTorneo: cancellaSquadraTorneoMock,
  trovaSquadraTorneoPerId: trovaSquadraTorneoPerIdMock,
  elencaSquadreTorneo: elencaSquadreTorneoMock,
  contaPartiteTorneo: contaPartiteTorneoMock,
  contaPartiteTorneoTabellone: contaPartiteTorneoTabelloneMock,
  creaPartiteTorneo: creaPartiteTorneoMock,
  cancellaPartiteTorneo: cancellaPartiteTorneoMock,
  elencaPartiteTorneo: elencaPartiteTorneoMock,
  aggiornaRisultatoPartitaTorneo: aggiornaRisultatoPartitaTorneoMock,
  trovaPartitaTorneoPerId: trovaPartitaTorneoPerIdMock,
  creaSlotTorneo: creaSlotTorneoMock,
  trovaSlotTorneoPerId: trovaSlotTorneoPerIdMock,
  cancellaSlotTorneo: cancellaSlotTorneoMock,
  assegnaSlotPartitaTorneo: assegnaSlotPartitaTorneoMock,
  elencaSlotTorneoLiberi: elencaSlotTorneoLiberiMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const {
  creaEdizioneTorneoAction,
  cancellaEdizioneTorneoAction,
  creaCategoriaTorneoAction,
  aggiornaCategoriaTorneoAction,
  cancellaCategoriaTorneoAction,
  creaSquadraTorneoAction,
  aggiornaSquadraTorneoAction,
  cancellaSquadraTorneoAction,
  generaCalendarioGironiAction,
  cancellaPartiteTorneoAction,
  salvaRisultatoPartitaTorneoAction,
  generaTabelloneAction,
  caricaVolantinoTorneoAction,
  creaSlotTorneoAction,
  cancellaSlotTorneoAction,
  assegnaSlotPartitaTorneoAction,
} = await import("./actions");

function buildFormData(fields: Record<string, string>, file?: File | null) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  if (file) formData.append("file", file);
  return formData;
}

// Story 20.5: bytes reali con magic-byte corretto - contenutoCorrispondeAlMimeImmagine
// non e' mockata, gira per davvero, stesso principio gia' stabilito in
// gruppi/actions.test.ts.
const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

function fileValido(nome = "volantino.png", tipo = "image/png", dimensione = 1024) {
  const bytes = new Uint8Array(dimensione);
  const magic = MAGIC_BYTES[tipo];
  if (magic && dimensione >= magic.length) bytes.set(magic, 0);
  return new File([bytes], nome, { type: tipo });
}

const campiCategoriaValidi = {
  edizioneTorneoId: "edizione-1",
  nome: "Under 14",
  settimana: "SETTIMANA_1",
  numeroMassimoSquadre: "8",
};

const campiSquadraValidi = {
  categoriaTorneoId: "categoria-1",
  nome: "ASD Uno",
  girone: "GIRONE_A",
  referente: "Mario Rossi",
  contatto: "333 1234567",
};

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  trovaEdizioneTorneoPerIdMock.mockReset();
  trovaEdizioneTorneoPerIdMock.mockResolvedValue({ id: "edizione-1", anno: 2027 });
  trovaPalestraPerIdMock.mockReset();
  trovaPalestraPerIdMock.mockResolvedValue({ id: "palestra-1", nome: "Palestra Comunale" });
  creaEdizioneTorneoMock.mockReset();
  cancellaEdizioneTorneoMock.mockReset();
  creaCategoriaTorneoMock.mockReset();
  aggiornaCategoriaTorneoMock.mockReset();
  cancellaCategoriaTorneoMock.mockReset();
  elencaCategorieTorneoMock.mockReset();
  elencaCategorieTorneoMock.mockResolvedValue([]);
  trovaCategoriaTorneoPerIdMock.mockReset();
  trovaCategoriaTorneoPerIdMock.mockResolvedValue({
    id: "categoria-1",
    nome: "Under 14",
    numeroMassimoSquadre: 8,
    edizioneTorneoId: "edizione-1",
  });
  contaSquadreTorneoMock.mockReset();
  contaSquadreTorneoMock.mockResolvedValue(0);
  creaSquadraTorneoMock.mockReset();
  aggiornaSquadraTorneoMock.mockReset();
  cancellaSquadraTorneoMock.mockReset();
  trovaSquadraTorneoPerIdMock.mockReset();
  trovaSquadraTorneoPerIdMock.mockResolvedValue({
    id: "squadra-1",
    nome: "ASD Uno",
    girone: "GIRONE_A",
    categoriaTorneoId: "categoria-1",
  });
  elencaSquadreTorneoMock.mockReset();
  contaPartiteTorneoMock.mockReset();
  contaPartiteTorneoMock.mockResolvedValue(0);
  contaPartiteTorneoTabelloneMock.mockReset();
  contaPartiteTorneoTabelloneMock.mockResolvedValue(0);
  creaPartiteTorneoMock.mockReset();
  cancellaPartiteTorneoMock.mockReset();
  elencaPartiteTorneoMock.mockReset();
  elencaPartiteTorneoMock.mockResolvedValue([]);
  aggiornaRisultatoPartitaTorneoMock.mockReset();
  trovaPartitaTorneoPerIdMock.mockReset();
  trovaPartitaTorneoPerIdMock.mockResolvedValue({
    id: "partita-1",
    categoriaTorneoId: "categoria-1",
    fase: "GIRONE",
    tabellone: null,
  });
  creaSlotTorneoMock.mockReset();
  trovaSlotTorneoPerIdMock.mockReset();
  cancellaSlotTorneoMock.mockReset();
  assegnaSlotPartitaTorneoMock.mockReset();
  // Story 20.9: nessuno Slot libero di default - l'auto-assegnazione
  // best-effort (assegnaSlotAutomaticamente) e' quindi un no-op silenzioso a
  // meno che un test specifico non fornisca Slot liberi, stesso stato
  // "nessuno Slot mai creato" che i test pre-esistenti di
  // generaTabelloneAction/salvaRisultatoPartitaTorneoAction gia' assumono
  // implicitamente.
  elencaSlotTorneoLiberiMock.mockReset();
  elencaSlotTorneoLiberiMock.mockResolvedValue([]);
  revalidatePathMock.mockReset();
  caricaVolantinoTorneoMock.mockReset();
});

describe("creaEdizioneTorneoAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaEdizioneTorneoAction(undefined, buildFormData({ anno: "2027" }));

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(creaEdizioneTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when anno is missing", async () => {
    const result = await creaEdizioneTorneoAction(undefined, buildFormData({ anno: "" }));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'anno è obbligatorio." },
    });
    expect(creaEdizioneTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when anno is not numeric", async () => {
    const result = await creaEdizioneTorneoAction(
      undefined,
      buildFormData({ anno: "duemilaventisette" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'anno deve essere un numero intero." },
    });
    expect(creaEdizioneTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when anno is below the minimum", async () => {
    const result = await creaEdizioneTorneoAction(undefined, buildFormData({ anno: "0" }));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'anno deve essere tra 2000 e 2100." },
    });
    expect(creaEdizioneTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when anno is above the maximum", async () => {
    const result = await creaEdizioneTorneoAction(undefined, buildFormData({ anno: "99999" }));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'anno deve essere tra 2000 e 2100." },
    });
    expect(creaEdizioneTorneoMock).not.toHaveBeenCalled();
  });

  // Story 20.7: Nome obbligatorio, validato dopo l'anno.
  it("returns a validation error when nome is missing", async () => {
    const result = await creaEdizioneTorneoAction(
      undefined,
      buildFormData({ anno: "2027", nome: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome è obbligatorio." },
    });
    expect(creaEdizioneTorneoMock).not.toHaveBeenCalled();
  });

  // Review fix (Blind Hunter): il .trim() e' pensato apposta per
  // intercettare una stringa di soli spazi - solo "" era testato finora.
  it("returns a validation error when nome is only whitespace", async () => {
    const result = await creaEdizioneTorneoAction(
      undefined,
      buildFormData({ anno: "2027", nome: "   " })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome è obbligatorio." },
    });
    expect(creaEdizioneTorneoMock).not.toHaveBeenCalled();
  });

  // Review fix (Blind Hunter): il comportamento di trim non era mai
  // verificato - il valore passato a creaEdizioneTorneo deve essere gia'
  // ripulito dagli spazi ai margini.
  it("trims nome before passing it to creaEdizioneTorneo", async () => {
    creaEdizioneTorneoMock.mockResolvedValue({
      id: "edizione-1",
      anno: 2027,
      nome: "Memorial Mario Rossi",
    });

    await creaEdizioneTorneoAction(
      undefined,
      buildFormData({ anno: "2027", nome: "  Memorial Mario Rossi  " })
    );

    expect(creaEdizioneTorneoMock).toHaveBeenCalledWith(2027, "Memorial Mario Rossi");
  });

  // Review fix (Edge Case Hunter + Blind Hunter): nessun limite di
  // lunghezza server-side esisteva prima di questa patch - un FormData
  // manomesso poteva bypassare il maxLength=100 del widget.
  it("returns a validation error when nome exceeds 100 characters", async () => {
    const result = await creaEdizioneTorneoAction(
      undefined,
      buildFormData({ anno: "2027", nome: "a".repeat(101) })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome non può superare i 100 caratteri." },
    });
    expect(creaEdizioneTorneoMock).not.toHaveBeenCalled();
  });

  it("accepts nome of exactly 100 characters", async () => {
    creaEdizioneTorneoMock.mockResolvedValue({ id: "edizione-1", anno: 2027, nome: "a".repeat(100) });

    const result = await creaEdizioneTorneoAction(
      undefined,
      buildFormData({ anno: "2027", nome: "a".repeat(100) })
    );

    expect(result).toEqual({ success: true });
  });

  // Review fix (Verification Gap Reviewer): la combinazione "anno invalido
  // + nome vuoto" non era mai stata testata - documenta che l'errore
  // sull'anno ha sempre priorita' (return anticipato), coerente con
  // l'ordine di validazione server anche se nel form il campo Nome compare
  // visivamente prima di Anno.
  it("reports the anno error first when both anno and nome are invalid", async () => {
    const result = await creaEdizioneTorneoAction(
      undefined,
      buildFormData({ anno: "0", nome: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'anno deve essere tra 2000 e 2100." },
    });
    expect(creaEdizioneTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error, not INTERNAL, when the year already exists (P2002)", async () => {
    creaEdizioneTorneoMock.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );

    const result = await creaEdizioneTorneoAction(
      undefined,
      buildFormData({ anno: "2027", nome: "Memorial Mario Rossi" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Esiste già un'Edizione per l'anno 2027." },
    });
  });

  it("creates the Edizione (AC #1)", async () => {
    creaEdizioneTorneoMock.mockResolvedValue({
      id: "edizione-1",
      anno: 2027,
      nome: "Memorial Mario Rossi",
    });

    const result = await creaEdizioneTorneoAction(
      undefined,
      buildFormData({ anno: "2027", nome: "Memorial Mario Rossi" })
    );

    expect(result).toEqual({ success: true });
    expect(creaEdizioneTorneoMock).toHaveBeenCalledWith(2027, "Memorial Mario Rossi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo");
  });

  it("returns a friendly error, no crash, on an unexpected failure", async () => {
    creaEdizioneTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await creaEdizioneTorneoAction(
      undefined,
      buildFormData({ anno: "2027", nome: "Memorial Mario Rossi" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare l'Edizione. Riprova." },
    });
  });
});

describe("cancellaEdizioneTorneoAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await cancellaEdizioneTorneoAction(
      undefined,
      buildFormData({ id: "edizione-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(cancellaEdizioneTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when id is missing", async () => {
    const result = await cancellaEdizioneTorneoAction(undefined, buildFormData({}));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Edizione non specificata." },
    });
    expect(cancellaEdizioneTorneoMock).not.toHaveBeenCalled();
  });

  it("deletes the Edizione atomically (guard in the where clause) when it has no Categorie", async () => {
    cancellaEdizioneTorneoMock.mockResolvedValue({ count: 1 });

    const result = await cancellaEdizioneTorneoAction(
      undefined,
      buildFormData({ id: "edizione-1" })
    );

    expect(cancellaEdizioneTorneoMock).toHaveBeenCalledWith("edizione-1");
    expect(trovaEdizioneTorneoPerIdMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo");
    expect(result).toEqual({ success: true });
  });

  it("blocks deletion with an explicit message when the Edizione has Categorie collegate", async () => {
    cancellaEdizioneTorneoMock.mockResolvedValue({ count: 0 });
    trovaEdizioneTorneoPerIdMock.mockResolvedValue({ id: "edizione-1", anno: 2027 });
    elencaCategorieTorneoMock.mockResolvedValue([{ id: "categoria-1" }]);

    const result = await cancellaEdizioneTorneoAction(
      undefined,
      buildFormData({ id: "edizione-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Impossibile cancellare: questa Edizione ha ancora Categorie collegate.",
      },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  // Review fix (Edge Case Hunter, Story 20.9): count 0 con Categorie GIA'
  // svuotate (es. dopo "Cancella tutte le partite", Story 20.8) ma Slot
  // ancora presenti - messaggio distinto, altrimenti l'Admin cercherebbe
  // Categorie da cancellare che non esistono piu'.
  it("blocks deletion with a distinct message when only Slot orari are collegati (Categorie already empty)", async () => {
    cancellaEdizioneTorneoMock.mockResolvedValue({ count: 0 });
    trovaEdizioneTorneoPerIdMock.mockResolvedValue({ id: "edizione-1", anno: 2027 });
    elencaCategorieTorneoMock.mockResolvedValue([]);

    const result = await cancellaEdizioneTorneoAction(
      undefined,
      buildFormData({ id: "edizione-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Impossibile cancellare: questa Edizione ha ancora Slot orari collegati - cancellali prima dalla pagina Slot.",
      },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL, no crash, when the Edizione no longer exists at all", async () => {
    cancellaEdizioneTorneoMock.mockResolvedValue({ count: 0 });
    trovaEdizioneTorneoPerIdMock.mockResolvedValue(null);

    const result = await cancellaEdizioneTorneoAction(
      undefined,
      buildFormData({ id: "edizione-inesistente" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile cancellare l'Edizione. Riprova." },
    });
  });

  it("returns a friendly error, no crash, when the delete throws", async () => {
    cancellaEdizioneTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await cancellaEdizioneTorneoAction(
      undefined,
      buildFormData({ id: "edizione-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile cancellare l'Edizione. Riprova." },
    });
  });
});

describe("caricaVolantinoTorneoAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await caricaVolantinoTorneoAction(
      undefined,
      buildFormData({ edizioneTorneoId: "edizione-1" }, fileValido())
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(caricaVolantinoTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when edizioneTorneoId is missing", async () => {
    const result = await caricaVolantinoTorneoAction(
      undefined,
      buildFormData({}, fileValido())
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Edizione non specificata." },
    });
    expect(caricaVolantinoTorneoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when no file is selected", async () => {
    const result = await caricaVolantinoTorneoAction(
      undefined,
      buildFormData({ edizioneTorneoId: "edizione-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un'immagine da caricare." },
    });
    expect(caricaVolantinoTorneoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION for a disallowed MIME type", async () => {
    const result = await caricaVolantinoTorneoAction(
      undefined,
      buildFormData(
        { edizioneTorneoId: "edizione-1" },
        fileValido("volantino.gif", "image/gif")
      )
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato immagine non ammesso (solo PNG, JPG)." },
    });
    expect(caricaVolantinoTorneoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when the file exceeds the 2MB size limit", async () => {
    const fileTroppoGrande = fileValido("volantino.png", "image/png", 2 * 1024 * 1024 + 1);

    const result = await caricaVolantinoTorneoAction(
      undefined,
      buildFormData({ edizioneTorneoId: "edizione-1" }, fileTroppoGrande)
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il file supera la dimensione massima di 2MB." },
    });
    expect(caricaVolantinoTorneoMock).not.toHaveBeenCalled();
  });

  // Review fix (Blind Hunter): il controllo e' "file.size > LIMITE" - un
  // file di dimensione ESATTAMENTE pari al limite deve essere accettato,
  // non solo rifiutato un byte sopra (unico caso testato finora).
  it("accepts a file of exactly the 2MB size limit", async () => {
    caricaVolantinoTorneoMock.mockResolvedValue(undefined);
    const fileAlLimite = fileValido("volantino.png", "image/png", 2 * 1024 * 1024);

    const result = await caricaVolantinoTorneoAction(
      undefined,
      buildFormData({ edizioneTorneoId: "edizione-1" }, fileAlLimite)
    );

    expect(result).toEqual({ success: true });
    expect(caricaVolantinoTorneoMock).toHaveBeenCalledWith({}, "edizione-1", fileAlLimite);
  });

  it("returns VALIDATION when file content doesn't match the declared MIME type", async () => {
    const fileConMimeFinto = new File([new Uint8Array([0, 0, 0, 0])], "volantino.png", {
      type: "image/png",
    });

    const result = await caricaVolantinoTorneoAction(
      undefined,
      buildFormData({ edizioneTorneoId: "edizione-1" }, fileConMimeFinto)
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    });
    expect(caricaVolantinoTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Edizione no longer exists", async () => {
    trovaEdizioneTorneoPerIdMock.mockResolvedValue(null);

    const result = await caricaVolantinoTorneoAction(
      undefined,
      buildFormData({ edizioneTorneoId: "edizione-inesistente" }, fileValido())
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Edizione non trovata." },
    });
    expect(caricaVolantinoTorneoMock).not.toHaveBeenCalled();
  });

  it("uploads the volantino and revalidates the Edizione page (AC #1)", async () => {
    caricaVolantinoTorneoMock.mockResolvedValue(undefined);
    const file = fileValido();

    const result = await caricaVolantinoTorneoAction(
      undefined,
      buildFormData({ edizioneTorneoId: "edizione-1" }, file)
    );

    expect(result).toEqual({ success: true });
    expect(caricaVolantinoTorneoMock).toHaveBeenCalledWith({}, "edizione-1", file);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/edizione-1");
  });

  it("returns a friendly error, no crash, when the upload throws", async () => {
    caricaVolantinoTorneoMock.mockRejectedValue(new Error("storage down"));

    const result = await caricaVolantinoTorneoAction(
      undefined,
      buildFormData({ edizioneTorneoId: "edizione-1" }, fileValido())
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile caricare il volantino. Riprova." },
    });
  });
});

describe("creaCategoriaTorneoAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaCategoriaTorneoAction(
      undefined,
      buildFormData(campiCategoriaValidi)
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(creaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when edizioneTorneoId is missing", async () => {
    const result = await creaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, edizioneTorneoId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Edizione non specificata." },
    });
    expect(creaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome is missing", async () => {
    const result = await creaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, nome: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome è obbligatorio." },
    });
    expect(creaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when settimana is missing", async () => {
    const result = await creaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, settimana: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La settimana è obbligatoria." },
    });
    expect(creaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when settimana is not a valid SettimanaTorneo value", async () => {
    const result = await creaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, settimana: "SETTIMANA_3" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Settimana non valida." },
    });
    expect(creaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when numeroMassimoSquadre is missing", async () => {
    const result = await creaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, numeroMassimoSquadre: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il numero massimo di squadre è obbligatorio." },
    });
    expect(creaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when numeroMassimoSquadre is not numeric", async () => {
    const result = await creaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, numeroMassimoSquadre: "otto" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il numero massimo di squadre deve essere un numero intero.",
      },
    });
    expect(creaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when numeroMassimoSquadre is below the minimum", async () => {
    const result = await creaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, numeroMassimoSquadre: "1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il numero massimo di squadre deve essere tra 2 e 8.",
      },
    });
    expect(creaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when numeroMassimoSquadre is above the maximum", async () => {
    const result = await creaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, numeroMassimoSquadre: "9" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il numero massimo di squadre deve essere tra 2 e 8.",
      },
    });
    expect(creaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error, not a generic INTERNAL, when the Edizione no longer exists (review fix)", async () => {
    trovaEdizioneTorneoPerIdMock.mockResolvedValue(null);

    const result = await creaCategoriaTorneoAction(
      undefined,
      buildFormData(campiCategoriaValidi)
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Edizione non trovata." },
    });
    expect(creaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("creates the Categoria attached to the Edizione (AC #1)", async () => {
    creaCategoriaTorneoMock.mockResolvedValue({ id: "categoria-1" });

    const result = await creaCategoriaTorneoAction(
      undefined,
      buildFormData(campiCategoriaValidi)
    );

    expect(result).toEqual({ success: true });
    expect(creaCategoriaTorneoMock).toHaveBeenCalledWith({
      nome: "Under 14",
      settimana: "SETTIMANA_1",
      numeroMassimoSquadre: 8,
      edizioneTorneoId: "edizione-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/edizione-1");
  });

  it("returns a friendly error, no crash, when the create fails", async () => {
    creaCategoriaTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await creaCategoriaTorneoAction(
      undefined,
      buildFormData(campiCategoriaValidi)
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare la Categoria. Riprova." },
    });
  });
});

describe("aggiornaCategoriaTorneoAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, id: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(aggiornaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when id is missing", async () => {
    const result = await aggiornaCategoriaTorneoAction(
      undefined,
      buildFormData(campiCategoriaValidi)
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non specificata." },
    });
    expect(aggiornaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("reuses the same field validation as creaCategoriaTorneoAction (e.g. rejects an invalid settimana)", async () => {
    const result = await aggiornaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, id: "categoria-1", settimana: "NON_VALIDA" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Settimana non valida." },
    });
    expect(aggiornaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("updates the Categoria (AC)", async () => {
    aggiornaCategoriaTorneoMock.mockResolvedValue({ count: 1 });

    const result = await aggiornaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, id: "categoria-1" })
    );

    expect(result).toEqual({ success: true });
    expect(aggiornaCategoriaTorneoMock).toHaveBeenCalledWith("categoria-1", "edizione-1", {
      nome: "Under 14",
      settimana: "SETTIMANA_1",
      numeroMassimoSquadre: 8,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/edizione-1");
  });

  it("returns a validation error when the new numeroMassimoSquadre is below the Squadre already iscritte (review fix, Story 20.2)", async () => {
    contaSquadreTorneoMock.mockResolvedValue(5);

    const result = await aggiornaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, id: "categoria-1", numeroMassimoSquadre: "4" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Non puoi impostare un massimo inferiore alle 5 squadre già iscritte.",
      },
    });
    expect(aggiornaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("allows lowering numeroMassimoSquadre exactly to the current Squadre count", async () => {
    contaSquadreTorneoMock.mockResolvedValue(4);
    aggiornaCategoriaTorneoMock.mockResolvedValue({ count: 1 });

    const result = await aggiornaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, id: "categoria-1", numeroMassimoSquadre: "4" })
    );

    expect(result).toEqual({ success: true });
  });

  it("returns a validation error, not a silent no-op, when id/edizioneTorneoId don't match any row (review fix)", async () => {
    aggiornaCategoriaTorneoMock.mockResolvedValue({ count: 0 });

    const result = await aggiornaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, id: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non trovata in questa Edizione." },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the update fails", async () => {
    aggiornaCategoriaTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await aggiornaCategoriaTorneoAction(
      undefined,
      buildFormData({ ...campiCategoriaValidi, id: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare la Categoria. Riprova." },
    });
  });
});

describe("cancellaCategoriaTorneoAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await cancellaCategoriaTorneoAction(
      undefined,
      buildFormData({ id: "categoria-1", edizioneTorneoId: "edizione-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(cancellaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when id or edizioneTorneoId is missing", async () => {
    const result = await cancellaCategoriaTorneoAction(
      undefined,
      buildFormData({ id: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non specificata." },
    });
    expect(cancellaCategoriaTorneoMock).not.toHaveBeenCalled();
  });

  it("deletes the Categoria (no sporting dependency guard in this story)", async () => {
    cancellaCategoriaTorneoMock.mockResolvedValue({ count: 1 });

    const result = await cancellaCategoriaTorneoAction(
      undefined,
      buildFormData({ id: "categoria-1", edizioneTorneoId: "edizione-1" })
    );

    expect(cancellaCategoriaTorneoMock).toHaveBeenCalledWith("categoria-1", "edizione-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/edizione-1");
    expect(result).toEqual({ success: true });
  });

  it("returns a validation error (not a silent success) when id/edizioneTorneoId don't match any row (review fix)", async () => {
    cancellaCategoriaTorneoMock.mockResolvedValue({ count: 0 });
    trovaCategoriaTorneoPerIdMock.mockResolvedValue(null);

    const result = await cancellaCategoriaTorneoAction(
      undefined,
      buildFormData({ id: "categoria-1", edizioneTorneoId: "edizione-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non trovata in questa Edizione." },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("blocks deletion with an explicit message when the Categoria has Squadre collegate (Story 20.2)", async () => {
    cancellaCategoriaTorneoMock.mockResolvedValue({ count: 0 });
    trovaCategoriaTorneoPerIdMock.mockResolvedValue({
      id: "categoria-1",
      nome: "Under 14",
      numeroMassimoSquadre: 8,
      edizioneTorneoId: "edizione-1",
    });

    const result = await cancellaCategoriaTorneoAction(
      undefined,
      buildFormData({ id: "categoria-1", edizioneTorneoId: "edizione-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Impossibile cancellare: questa Categoria ha ancora Squadre collegate.",
      },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the delete throws an unexpected error", async () => {
    cancellaCategoriaTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await cancellaCategoriaTorneoAction(
      undefined,
      buildFormData({ id: "categoria-1", edizioneTorneoId: "edizione-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile cancellare la Categoria. Riprova." },
    });
  });
});

describe("creaSquadraTorneoAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaSquadraTorneoAction(undefined, buildFormData(campiSquadraValidi));

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(creaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when categoriaTorneoId is missing", async () => {
    const result = await creaSquadraTorneoAction(
      undefined,
      buildFormData({ ...campiSquadraValidi, categoriaTorneoId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non specificata." },
    });
    expect(creaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome is missing", async () => {
    const result = await creaSquadraTorneoAction(
      undefined,
      buildFormData({ ...campiSquadraValidi, nome: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome è obbligatorio." },
    });
    expect(creaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when girone is missing", async () => {
    const result = await creaSquadraTorneoAction(
      undefined,
      buildFormData({ ...campiSquadraValidi, girone: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il girone è obbligatorio." },
    });
    expect(creaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when girone is not a valid GironeTorneo value", async () => {
    const result = await creaSquadraTorneoAction(
      undefined,
      buildFormData({ ...campiSquadraValidi, girone: "GIRONE_C" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Girone non valido." },
    });
    expect(creaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error, not a generic INTERNAL, when the Categoria no longer exists", async () => {
    trovaCategoriaTorneoPerIdMock.mockResolvedValue(null);

    const result = await creaSquadraTorneoAction(undefined, buildFormData(campiSquadraValidi));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non trovata." },
    });
    expect(creaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("rejects enrolling beyond numeroMassimoSquadre with an explicit message", async () => {
    trovaCategoriaTorneoPerIdMock.mockResolvedValue({
      id: "categoria-1",
      nome: "Under 14",
      numeroMassimoSquadre: 8,
      edizioneTorneoId: "edizione-1",
    });
    contaSquadreTorneoMock.mockResolvedValue(8);

    const result = await creaSquadraTorneoAction(undefined, buildFormData(campiSquadraValidi));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Numero massimo di squadre raggiunto (8)." },
    });
    expect(creaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("allows enrolling one below numeroMassimoSquadre (boundary, review fix)", async () => {
    trovaCategoriaTorneoPerIdMock.mockResolvedValue({
      id: "categoria-1",
      nome: "Under 14",
      numeroMassimoSquadre: 8,
      edizioneTorneoId: "edizione-1",
    });
    contaSquadreTorneoMock.mockResolvedValue(7);
    creaSquadraTorneoMock.mockResolvedValue({ id: "squadra-1" });

    const result = await creaSquadraTorneoAction(undefined, buildFormData(campiSquadraValidi));

    expect(result).toEqual({ success: true });
    expect(creaSquadraTorneoMock).toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the Categoria/count lookup throws (review fix - now inside the same try/catch)", async () => {
    trovaCategoriaTorneoPerIdMock.mockRejectedValue(new Error("db down"));

    const result = await creaSquadraTorneoAction(undefined, buildFormData(campiSquadraValidi));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile iscrivere la Squadra. Riprova." },
    });
    expect(creaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("rejects enrolling a new Squadra once the girone calendar has been generated (review fix, Story 20.3)", async () => {
    contaPartiteTorneoMock.mockResolvedValue(6);

    const result = await creaSquadraTorneoAction(undefined, buildFormData(campiSquadraValidi));

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Non puoi iscrivere una nuova Squadra: il calendario è già stato generato per questa Categoria.",
      },
    });
    expect(creaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("creates the Squadra attached to the Categoria (AC #1), with referente/contatto normalized to null when blank", async () => {
    creaSquadraTorneoMock.mockResolvedValue({ id: "squadra-1" });

    const result = await creaSquadraTorneoAction(
      undefined,
      buildFormData({ ...campiSquadraValidi, referente: "  ", contatto: "  " })
    );

    expect(result).toEqual({ success: true });
    expect(creaSquadraTorneoMock).toHaveBeenCalledWith({
      nome: "ASD Uno",
      girone: "GIRONE_A",
      referente: null,
      contatto: null,
      categoriaTorneoId: "categoria-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/edizione-1/categoria-1");
  });

  it("returns a friendly error, no crash, when the create fails", async () => {
    creaSquadraTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await creaSquadraTorneoAction(undefined, buildFormData(campiSquadraValidi));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile iscrivere la Squadra. Riprova." },
    });
  });
});

describe("aggiornaSquadraTorneoAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaSquadraTorneoAction(
      undefined,
      buildFormData({ ...campiSquadraValidi, id: "squadra-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(aggiornaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when id is missing", async () => {
    const result = await aggiornaSquadraTorneoAction(
      undefined,
      buildFormData(campiSquadraValidi)
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Squadra non specificata." },
    });
    expect(aggiornaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when categoriaTorneoId is missing on its own (review fix, both branches of the combined guard)", async () => {
    const result = await aggiornaSquadraTorneoAction(
      undefined,
      buildFormData({ ...campiSquadraValidi, id: "squadra-1", categoriaTorneoId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Squadra non specificata." },
    });
    expect(aggiornaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("reuses the same field validation as creaSquadraTorneoAction (e.g. rejects an invalid girone)", async () => {
    const result = await aggiornaSquadraTorneoAction(
      undefined,
      buildFormData({
        ...campiSquadraValidi,
        id: "squadra-1",
        girone: "NON_VALIDO",
      })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Girone non valido." },
    });
    expect(aggiornaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error, not a generic INTERNAL, when the Categoria no longer exists (review fix)", async () => {
    trovaCategoriaTorneoPerIdMock.mockResolvedValue(null);

    const result = await aggiornaSquadraTorneoAction(
      undefined,
      buildFormData({ ...campiSquadraValidi, id: "squadra-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non trovata." },
    });
    expect(aggiornaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("updates the Squadra, scoped on id + categoriaTorneoId only, and revalidates the path derived server-side (review fix)", async () => {
    aggiornaSquadraTorneoMock.mockResolvedValue({ count: 1 });

    const result = await aggiornaSquadraTorneoAction(
      undefined,
      buildFormData({ ...campiSquadraValidi, id: "squadra-1" })
    );

    expect(result).toEqual({ success: true });
    expect(aggiornaSquadraTorneoMock).toHaveBeenCalledWith("squadra-1", "categoria-1", {
      nome: "ASD Uno",
      girone: "GIRONE_A",
      referente: "Mario Rossi",
      contatto: "333 1234567",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/edizione-1/categoria-1");
  });

  it("returns a validation error, not a silent no-op, when id/categoriaTorneoId don't match any row", async () => {
    aggiornaSquadraTorneoMock.mockResolvedValue({ count: 0 });

    const result = await aggiornaSquadraTorneoAction(
      undefined,
      buildFormData({ ...campiSquadraValidi, id: "squadra-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Squadra non trovata in questa Categoria." },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects changing girone once the calendar has been generated (review fix, Story 20.3)", async () => {
    trovaSquadraTorneoPerIdMock.mockResolvedValue({
      id: "squadra-1",
      nome: "ASD Uno",
      girone: "GIRONE_A",
      categoriaTorneoId: "categoria-1",
    });
    contaPartiteTorneoMock.mockResolvedValue(6);

    const result = await aggiornaSquadraTorneoAction(
      undefined,
      buildFormData({ ...campiSquadraValidi, id: "squadra-1", girone: "GIRONE_B" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Non puoi cambiare il girone: il calendario è già stato generato per questa Categoria.",
      },
    });
    expect(aggiornaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("allows updating other fields (girone unchanged) even after the calendar has been generated", async () => {
    trovaSquadraTorneoPerIdMock.mockResolvedValue({
      id: "squadra-1",
      nome: "ASD Uno",
      girone: "GIRONE_A",
      categoriaTorneoId: "categoria-1",
    });
    contaPartiteTorneoMock.mockResolvedValue(6);
    aggiornaSquadraTorneoMock.mockResolvedValue({ count: 1 });

    const result = await aggiornaSquadraTorneoAction(
      undefined,
      buildFormData({ ...campiSquadraValidi, id: "squadra-1", nome: "ASD Uno Modificata" })
    );

    expect(result).toEqual({ success: true });
    expect(aggiornaSquadraTorneoMock).toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the update fails", async () => {
    aggiornaSquadraTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await aggiornaSquadraTorneoAction(
      undefined,
      buildFormData({ ...campiSquadraValidi, id: "squadra-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare la Squadra. Riprova." },
    });
  });
});

describe("cancellaSquadraTorneoAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await cancellaSquadraTorneoAction(
      undefined,
      buildFormData({ id: "squadra-1", categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(cancellaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when id or categoriaTorneoId is missing", async () => {
    const result = await cancellaSquadraTorneoAction(
      undefined,
      buildFormData({ id: "squadra-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Squadra non specificata." },
    });
    expect(cancellaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error, not a generic INTERNAL, when the Categoria no longer exists (review fix)", async () => {
    trovaCategoriaTorneoPerIdMock.mockResolvedValue(null);

    const result = await cancellaSquadraTorneoAction(
      undefined,
      buildFormData({ id: "squadra-1", categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non trovata." },
    });
    expect(cancellaSquadraTorneoMock).not.toHaveBeenCalled();
  });

  it("deletes the Squadra (no Partita dependency guard in this story) and revalidates the path derived server-side (review fix)", async () => {
    cancellaSquadraTorneoMock.mockResolvedValue({ count: 1 });

    const result = await cancellaSquadraTorneoAction(
      undefined,
      buildFormData({ id: "squadra-1", categoriaTorneoId: "categoria-1" })
    );

    expect(cancellaSquadraTorneoMock).toHaveBeenCalledWith("squadra-1", "categoria-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/edizione-1/categoria-1");
    expect(result).toEqual({ success: true });
  });

  it("returns a validation error (not a silent success) when id/categoriaTorneoId don't match any row", async () => {
    cancellaSquadraTorneoMock.mockResolvedValue({ count: 0 });
    trovaSquadraTorneoPerIdMock.mockResolvedValue(null);

    const result = await cancellaSquadraTorneoAction(
      undefined,
      buildFormData({ id: "squadra-1", categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Squadra non trovata in questa Categoria." },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns an explicit message (not a generic INTERNAL) when the Squadra has Partite già generate (review fix, Story 20.3)", async () => {
    cancellaSquadraTorneoMock.mockResolvedValue({ count: 0 });
    trovaSquadraTorneoPerIdMock.mockResolvedValue({
      id: "squadra-1",
      nome: "ASD Uno",
      girone: "GIRONE_A",
      categoriaTorneoId: "categoria-1",
    });

    const result = await cancellaSquadraTorneoAction(
      undefined,
      buildFormData({ id: "squadra-1", categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Impossibile cancellare: questa Squadra ha già incontri generati.",
      },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the delete throws an unexpected error", async () => {
    cancellaSquadraTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await cancellaSquadraTorneoAction(
      undefined,
      buildFormData({ id: "squadra-1", categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile cancellare la Squadra. Riprova." },
    });
  });
});

describe("generaCalendarioGironiAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await generaCalendarioGironiAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when categoriaTorneoId is missing", async () => {
    const result = await generaCalendarioGironiAction(undefined, buildFormData({}));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non specificata." },
    });
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error, not a generic INTERNAL, when the Categoria no longer exists", async () => {
    trovaCategoriaTorneoPerIdMock.mockResolvedValue(null);

    const result = await generaCalendarioGironiAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non trovata." },
    });
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("rejects regenerating an already-generated calendar with an explicit message (idempotency)", async () => {
    contaPartiteTorneoMock.mockResolvedValue(6);

    const result = await generaCalendarioGironiAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il calendario è già stato generato per questa Categoria.",
      },
    });
    expect(elencaSquadreTorneoMock).not.toHaveBeenCalled();
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("rejects generation when a girone has fewer than 2 Squadre", async () => {
    elencaSquadreTorneoMock.mockResolvedValue([
      { id: "s1", girone: "GIRONE_A" },
      { id: "s2", girone: "GIRONE_A" },
      { id: "s3", girone: "GIRONE_B" },
    ]);

    const result = await generaCalendarioGironiAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Servono almeno 2 Squadre in ciascun girone per generare il calendario.",
      },
    });
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("generates all pairs of each girone (all'italiana), never across gironi (AC #1)", async () => {
    elencaSquadreTorneoMock.mockResolvedValue([
      { id: "a1", girone: "GIRONE_A" },
      { id: "a2", girone: "GIRONE_A" },
      { id: "a3", girone: "GIRONE_A" },
      { id: "b1", girone: "GIRONE_B" },
      { id: "b2", girone: "GIRONE_B" },
    ]);
    creaPartiteTorneoMock.mockResolvedValue({ count: 4 });

    const result = await generaCalendarioGironiAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({ success: true });
    expect(creaPartiteTorneoMock).toHaveBeenCalledWith([
      { categoriaTorneoId: "categoria-1", squadraCasaId: "a1", squadraOspiteId: "a2" },
      { categoriaTorneoId: "categoria-1", squadraCasaId: "a1", squadraOspiteId: "a3" },
      { categoriaTorneoId: "categoria-1", squadraCasaId: "a2", squadraOspiteId: "a3" },
      { categoriaTorneoId: "categoria-1", squadraCasaId: "b1", squadraOspiteId: "b2" },
    ]);
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/torneo/edizione-1/categoria-1/risultati"
    );
  });

  it("returns a friendly error, no crash, when the create fails", async () => {
    elencaSquadreTorneoMock.mockResolvedValue([
      { id: "a1", girone: "GIRONE_A" },
      { id: "a2", girone: "GIRONE_A" },
      { id: "b1", girone: "GIRONE_B" },
      { id: "b2", girone: "GIRONE_B" },
    ]);
    creaPartiteTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await generaCalendarioGironiAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile generare il calendario. Riprova." },
    });
  });

  it("translates a unique-constraint violation (P2002, concurrent double-submit) into the same explicit idempotency message (review fix, Story 20.3)", async () => {
    elencaSquadreTorneoMock.mockResolvedValue([
      { id: "a1", girone: "GIRONE_A" },
      { id: "a2", girone: "GIRONE_A" },
      { id: "b1", girone: "GIRONE_B" },
      { id: "b2", girone: "GIRONE_B" },
    ]);
    creaPartiteTorneoMock.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );

    const result = await generaCalendarioGironiAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il calendario è già stato generato per questa Categoria.",
      },
    });
  });
});

describe("cancellaPartiteTorneoAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await cancellaPartiteTorneoAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(cancellaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when categoriaTorneoId is missing", async () => {
    const result = await cancellaPartiteTorneoAction(undefined, buildFormData({}));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non specificata." },
    });
    expect(cancellaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Categoria does not exist", async () => {
    trovaCategoriaTorneoPerIdMock.mockResolvedValue(null);

    const result = await cancellaPartiteTorneoAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non trovata." },
    });
    expect(cancellaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("deletes all Partite of the Categoria and revalidates both risultati and tabellone (AC #1)", async () => {
    trovaCategoriaTorneoPerIdMock.mockResolvedValue({
      id: "categoria-1",
      edizioneTorneoId: "edizione-1",
    });
    cancellaPartiteTorneoMock.mockResolvedValue({ count: 12 });

    const result = await cancellaPartiteTorneoAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({ success: true });
    expect(cancellaPartiteTorneoMock).toHaveBeenCalledWith("categoria-1");
    // Review fix (Blind Hunter): anche la pagina della Categoria (elenco
    // Squadre) va rivalidata, da li' l'Admin procede a cancellare le
    // Squadre dopo le partite.
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/edizione-1/categoria-1");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/torneo/edizione-1/categoria-1/risultati"
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/torneo/edizione-1/categoria-1/tabellone"
    );
  });

  it("is a valid no-op (success) when there are no Partite to delete", async () => {
    trovaCategoriaTorneoPerIdMock.mockResolvedValue({
      id: "categoria-1",
      edizioneTorneoId: "edizione-1",
    });
    cancellaPartiteTorneoMock.mockResolvedValue({ count: 0 });

    const result = await cancellaPartiteTorneoAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({ success: true });
  });

  it("returns a friendly error, no crash, when the Categoria lookup fails", async () => {
    trovaCategoriaTorneoPerIdMock.mockRejectedValue(new Error("db down"));

    const result = await cancellaPartiteTorneoAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile cancellare le partite. Riprova." },
    });
    // Review fix (Blind Hunter): la lettura della Categoria e' ora separata
    // dalla cancellazione - un suo fallimento non deve mai arrivare a
    // cancellare nulla.
    expect(cancellaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the delete fails", async () => {
    trovaCategoriaTorneoPerIdMock.mockResolvedValue({
      id: "categoria-1",
      edizioneTorneoId: "edizione-1",
    });
    cancellaPartiteTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await cancellaPartiteTorneoAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile cancellare le partite. Riprova." },
    });
    // Review fix (Verification Gap Reviewer): se la cancellazione stessa
    // fallisce, nessun revalidatePath deve essere chiamato - a differenza
    // dello scenario "cancellazione riuscita ma revalidatePath fallito",
    // qui i dati non sono mai stati toccati, quindi l'errore riportato e'
    // sempre corretto/coerente con lo stato reale.
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("generaTabelloneAction", () => {
  // 4 Squadre per girone, con un risultato completo tra tutte le coppie
  // (calendario "tutti contro tutti" gia' completato) - a1/b1 vincono
  // sempre 2-0, a2/b2 battono solo a3/a4 (b3/b4), a3/b3 batte solo a4/b4:
  // classifica deterministica 1°=a1/b1, 2°=a2/b2, 3°=a3/b3, 4°=a4/b4.
  const squadreComplete = [
    { id: "a1", girone: "GIRONE_A" },
    { id: "a2", girone: "GIRONE_A" },
    { id: "a3", girone: "GIRONE_A" },
    { id: "a4", girone: "GIRONE_A" },
    { id: "b1", girone: "GIRONE_B" },
    { id: "b2", girone: "GIRONE_B" },
    { id: "b3", girone: "GIRONE_B" },
    { id: "b4", girone: "GIRONE_B" },
  ];

  function partita2a0(casaId: string, ospiteId: string, girone: string) {
    return {
      id: `${casaId}-${ospiteId}`,
      categoriaTorneoId: "categoria-1",
      squadraCasaId: casaId,
      squadraCasa: { id: casaId, girone },
      squadraOspiteId: ospiteId,
      squadraOspite: { id: ospiteId, girone },
      fase: "GIRONE",
      tabellone: null,
      set1Casa: 25,
      set1Ospite: 10,
      set2Casa: 25,
      set2Ospite: 10,
      set3Casa: null,
      set3Ospite: null,
    };
  }

  const partiteGironeComplete = [
    partita2a0("a1", "a2", "GIRONE_A"),
    partita2a0("a1", "a3", "GIRONE_A"),
    partita2a0("a1", "a4", "GIRONE_A"),
    partita2a0("a2", "a3", "GIRONE_A"),
    partita2a0("a2", "a4", "GIRONE_A"),
    partita2a0("a3", "a4", "GIRONE_A"),
    partita2a0("b1", "b2", "GIRONE_B"),
    partita2a0("b1", "b3", "GIRONE_B"),
    partita2a0("b1", "b4", "GIRONE_B"),
    partita2a0("b2", "b3", "GIRONE_B"),
    partita2a0("b2", "b4", "GIRONE_B"),
    partita2a0("b3", "b4", "GIRONE_B"),
  ];

  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await generaTabelloneAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when categoriaTorneoId is missing", async () => {
    const result = await generaTabelloneAction(undefined, buildFormData({}));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non specificata." },
    });
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error, not a generic INTERNAL, when the Categoria no longer exists", async () => {
    trovaCategoriaTorneoPerIdMock.mockResolvedValue(null);

    const result = await generaTabelloneAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non trovata." },
    });
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("rejects regenerating an already-generated tabellone with an explicit message (idempotency)", async () => {
    contaPartiteTorneoTabelloneMock.mockResolvedValue(4);

    const result = await generaTabelloneAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il tabellone è già stato generato per questa Categoria.",
      },
    });
    expect(elencaSquadreTorneoMock).not.toHaveBeenCalled();
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("rejects generation when Girone A has fewer than 4 Squadre", async () => {
    elencaSquadreTorneoMock.mockResolvedValue([
      { id: "a1", girone: "GIRONE_A" },
      { id: "a2", girone: "GIRONE_A" },
      { id: "a3", girone: "GIRONE_A" },
      { id: "b1", girone: "GIRONE_B" },
      { id: "b2", girone: "GIRONE_B" },
      { id: "b3", girone: "GIRONE_B" },
      { id: "b4", girone: "GIRONE_B" },
    ]);

    const result = await generaTabelloneAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Servono almeno 4 Squadre in ciascun girone per generare il tabellone.",
      },
    });
    expect(elencaPartiteTorneoMock).not.toHaveBeenCalled();
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("rejects generation when Girone B has fewer than 4 Squadre (review fix, asymmetric coverage)", async () => {
    elencaSquadreTorneoMock.mockResolvedValue([
      { id: "a1", girone: "GIRONE_A" },
      { id: "a2", girone: "GIRONE_A" },
      { id: "a3", girone: "GIRONE_A" },
      { id: "a4", girone: "GIRONE_A" },
      { id: "b1", girone: "GIRONE_B" },
      { id: "b2", girone: "GIRONE_B" },
      { id: "b3", girone: "GIRONE_B" },
    ]);

    const result = await generaTabelloneAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Servono almeno 4 Squadre in ciascun girone per generare il tabellone.",
      },
    });
    expect(elencaPartiteTorneoMock).not.toHaveBeenCalled();
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("rejects generation when both gironi have fewer than 4 Squadre (review fix, asymmetric coverage)", async () => {
    elencaSquadreTorneoMock.mockResolvedValue([
      { id: "a1", girone: "GIRONE_A" },
      { id: "a2", girone: "GIRONE_A" },
      { id: "b1", girone: "GIRONE_B" },
      { id: "b2", girone: "GIRONE_B" },
    ]);

    const result = await generaTabelloneAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Servono almeno 4 Squadre in ciascun girone per generare il tabellone.",
      },
    });
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("rejects generation when the girone calendar was never generated at all (empty partite, edge case), with a message distinct from 'incomplete' (review fix)", async () => {
    elencaSquadreTorneoMock.mockResolvedValue(squadreComplete);
    elencaPartiteTorneoMock.mockResolvedValue([]);

    const result = await generaTabelloneAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Devi prima generare il calendario di girone (e inserirne i risultati) per entrambi i gironi.",
      },
    });
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("rejects generation when a girone has an incontro without a result yet", async () => {
    elencaSquadreTorneoMock.mockResolvedValue(squadreComplete);
    const partiteIncomplete = partiteGironeComplete.map((p, i) =>
      i === 0 ? { ...p, set1Casa: null, set1Ospite: null, set2Casa: null, set2Ospite: null } : p
    );
    elencaPartiteTorneoMock.mockResolvedValue(partiteIncomplete);

    const result = await generaTabelloneAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Il tabellone può essere generato solo quando la classifica di entrambi i gironi è completa.",
      },
    });
    expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
  });

  it("generates the 4 semifinali with the literal pairing of the AC (1°A-2°B/1°B-2°A, 3°A-4°B/3°B-4°A)", async () => {
    elencaSquadreTorneoMock.mockResolvedValue(squadreComplete);
    elencaPartiteTorneoMock.mockResolvedValue(partiteGironeComplete);
    creaPartiteTorneoMock.mockResolvedValue({ count: 4 });

    const result = await generaTabelloneAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({ success: true });
    expect(creaPartiteTorneoMock).toHaveBeenCalledWith([
      {
        categoriaTorneoId: "categoria-1",
        squadraCasaId: "a1",
        squadraOspiteId: "b2",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_1_4",
      },
      {
        categoriaTorneoId: "categoria-1",
        squadraCasaId: "b1",
        squadraOspiteId: "a2",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_1_4",
      },
      {
        categoriaTorneoId: "categoria-1",
        squadraCasaId: "a3",
        squadraOspiteId: "b4",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_5_8",
      },
      {
        categoriaTorneoId: "categoria-1",
        squadraCasaId: "b3",
        squadraOspiteId: "a4",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_5_8",
      },
    ]);
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/torneo/edizione-1/categoria-1/tabellone"
    );
    // Review fix (Verification Gap Reviewer): elencaSlotTorneoLiberiMock
    // risolve [] di default (beforeEach) - questo test dimostrava solo
    // l'assenza di crash, mai che l'auto-assegnazione best-effort non tenti
    // realmente alcuna scrittura quando non ci sono Slot liberi.
    expect(assegnaSlotPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the create fails", async () => {
    elencaSquadreTorneoMock.mockResolvedValue(squadreComplete);
    elencaPartiteTorneoMock.mockResolvedValue(partiteGironeComplete);
    creaPartiteTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await generaTabelloneAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile generare il tabellone. Riprova." },
    });
  });

  it("translates a unique-constraint violation (P2002, concurrent double-submit) into the same explicit idempotency message", async () => {
    elencaSquadreTorneoMock.mockResolvedValue(squadreComplete);
    elencaPartiteTorneoMock.mockResolvedValue(partiteGironeComplete);
    creaPartiteTorneoMock.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );

    const result = await generaTabelloneAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il tabellone è già stato generato per questa Categoria.",
      },
    });
  });
});

describe("salvaRisultatoPartitaTorneoAction", () => {
  const campiRisultato2a0 = {
    id: "partita-1",
    categoriaTorneoId: "categoria-1",
    set1Casa: "25",
    set1Ospite: "20",
    set2Casa: "25",
    set2Ospite: "18",
  };

  const campiRisultato2a1 = {
    id: "partita-1",
    categoriaTorneoId: "categoria-1",
    set1Casa: "25",
    set1Ospite: "20",
    set2Casa: "20",
    set2Ospite: "25",
    set3Casa: "15",
    set3Ospite: "10",
  };

  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData(campiRisultato2a0)
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(aggiornaRisultatoPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when id is missing", async () => {
    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData({ ...campiRisultato2a0, id: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Incontro non specificato." },
    });
    expect(aggiornaRisultatoPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when categoriaTorneoId is missing", async () => {
    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData({ ...campiRisultato2a0, categoriaTorneoId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Incontro non specificato." },
    });
    expect(aggiornaRisultatoPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when a required set score is missing", async () => {
    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData({ ...campiRisultato2a0, set1Casa: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il punteggio del set 1 (Casa) è obbligatorio." },
    });
    expect(aggiornaRisultatoPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when a set score is not a non-negative integer", async () => {
    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData({ ...campiRisultato2a0, set2Ospite: "-3" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il punteggio del set 2 (Ospite) deve essere un numero intero non negativo.",
      },
    });
    expect(aggiornaRisultatoPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when only one of the two set3 fields is filled", async () => {
    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData({ ...campiRisultato2a0, set3Casa: "15" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il punteggio del terzo set è incompleto." },
    });
    expect(aggiornaRisultatoPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("rejects a structurally incoherent score (a tied set) with an explicit message (AC)", async () => {
    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData({ ...campiRisultato2a0, set2Casa: "20", set2Ospite: "20" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il punteggio inserito non è coerente con il regolamento (al meglio dei 3 set).",
      },
    });
    expect(aggiornaRisultatoPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("rejects a third set present when the first two already decided the match 2-0 (AC)", async () => {
    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData({ ...campiRisultato2a0, set3Casa: "15", set3Ospite: "10" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il punteggio inserito non è coerente con il regolamento (al meglio dei 3 set).",
      },
    });
    expect(aggiornaRisultatoPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error, not a generic INTERNAL, when the Categoria no longer exists", async () => {
    trovaCategoriaTorneoPerIdMock.mockResolvedValue(null);

    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData(campiRisultato2a0)
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non trovata." },
    });
    expect(aggiornaRisultatoPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error, not a silent no-op, when id/categoriaTorneoId don't match any row", async () => {
    aggiornaRisultatoPartitaTorneoMock.mockResolvedValue({ count: 0 });

    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData(campiRisultato2a0)
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Incontro non trovato in questa Categoria." },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  // Review fix (Edge Case Hunter, Story 20.4): un risultato di girone/
  // semifinale non e' piu' modificabile una volta che il tabellone/le
  // finali derivate sono gia' stati generati - altrimenti la correzione
  // resterebbe silenziosamente non riflessa negli accoppiamenti/vincitori
  // gia' derivati dal risultato originale, ora scaduto.
  describe("locking a result once downstream state has been derived (review fix, Story 20.4)", () => {
    it("rejects editing a GIRONE result once the tabellone has been generated for the Categoria", async () => {
      trovaPartitaTorneoPerIdMock.mockResolvedValue({
        id: "partita-1",
        categoriaTorneoId: "categoria-1",
        fase: "GIRONE",
        tabellone: null,
      });
      contaPartiteTorneoTabelloneMock.mockResolvedValue(4);

      const result = await salvaRisultatoPartitaTorneoAction(
        undefined,
        buildFormData(campiRisultato2a0)
      );

      expect(result).toEqual({
        error: {
          code: "VALIDATION",
          message:
            "Non puoi modificare un risultato di girone: il tabellone è già stato generato per questa Categoria.",
        },
      });
      expect(aggiornaRisultatoPartitaTorneoMock).not.toHaveBeenCalled();
    });

    it("allows editing a GIRONE result when no tabellone has been generated yet", async () => {
      trovaPartitaTorneoPerIdMock.mockResolvedValue({
        id: "partita-1",
        categoriaTorneoId: "categoria-1",
        fase: "GIRONE",
        tabellone: null,
      });
      contaPartiteTorneoTabelloneMock.mockResolvedValue(0);
      aggiornaRisultatoPartitaTorneoMock.mockResolvedValue({ count: 1 });

      const result = await salvaRisultatoPartitaTorneoAction(
        undefined,
        buildFormData(campiRisultato2a0)
      );

      expect(result).toEqual({ success: true });
      expect(aggiornaRisultatoPartitaTorneoMock).toHaveBeenCalled();
    });

    it("rejects editing a SEMIFINALE result once the finali of its tabellone already exist", async () => {
      trovaPartitaTorneoPerIdMock.mockResolvedValue({
        id: "partita-1",
        categoriaTorneoId: "categoria-1",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_1_4",
      });
      elencaPartiteTorneoMock.mockResolvedValue([
        { id: "f1", tabellone: "POSIZIONI_1_4", fase: "FINALE_VINCENTI" },
        { id: "f2", tabellone: "POSIZIONI_1_4", fase: "FINALE_PERDENTI" },
      ]);

      const result = await salvaRisultatoPartitaTorneoAction(
        undefined,
        buildFormData(campiRisultato2a0)
      );

      expect(result).toEqual({
        error: {
          code: "VALIDATION",
          message: "Non puoi modificare questo risultato: le finali sono già state generate.",
        },
      });
      expect(aggiornaRisultatoPartitaTorneoMock).not.toHaveBeenCalled();
    });

    it("allows editing a SEMIFINALE result when the finali of its tabellone don't exist yet", async () => {
      trovaPartitaTorneoPerIdMock.mockResolvedValue({
        id: "partita-1",
        categoriaTorneoId: "categoria-1",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_1_4",
      });
      elencaPartiteTorneoMock.mockResolvedValue([
        { id: "partita-1", tabellone: "POSIZIONI_1_4", fase: "SEMIFINALE" },
        { id: "s2", tabellone: "POSIZIONI_1_4", fase: "SEMIFINALE" },
      ]);
      aggiornaRisultatoPartitaTorneoMock.mockResolvedValue({ count: 1 });

      const result = await salvaRisultatoPartitaTorneoAction(
        undefined,
        buildFormData(campiRisultato2a0)
      );

      expect(result).toEqual({ success: true });
      expect(aggiornaRisultatoPartitaTorneoMock).toHaveBeenCalled();
    });

    it("never locks a FINALE_VINCENTI/FINALE_PERDENTI result (no further stage derives from it)", async () => {
      trovaPartitaTorneoPerIdMock.mockResolvedValue({
        id: "partita-1",
        categoriaTorneoId: "categoria-1",
        fase: "FINALE_VINCENTI",
        tabellone: "POSIZIONI_1_4",
      });
      aggiornaRisultatoPartitaTorneoMock.mockResolvedValue({ count: 1 });

      const result = await salvaRisultatoPartitaTorneoAction(
        undefined,
        buildFormData(campiRisultato2a0)
      );

      expect(result).toEqual({ success: true });
      expect(elencaPartiteTorneoMock).not.toHaveBeenCalled();
      expect(contaPartiteTorneoTabelloneMock).not.toHaveBeenCalled();
    });
  });

  it("saves a valid 2-0 result, with set3 stored as null (AC)", async () => {
    aggiornaRisultatoPartitaTorneoMock.mockResolvedValue({ count: 1 });

    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData(campiRisultato2a0)
    );

    expect(result).toEqual({ success: true });
    expect(aggiornaRisultatoPartitaTorneoMock).toHaveBeenCalledWith("partita-1", "categoria-1", {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
      set3Casa: null,
      set3Ospite: null,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/torneo/edizione-1/categoria-1/risultati"
    );
  });

  it("saves a valid 2-1 result, with set3 stored (AC)", async () => {
    aggiornaRisultatoPartitaTorneoMock.mockResolvedValue({ count: 1 });

    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData(campiRisultato2a1)
    );

    expect(result).toEqual({ success: true });
    expect(aggiornaRisultatoPartitaTorneoMock).toHaveBeenCalledWith("partita-1", "categoria-1", {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 20,
      set2Ospite: 25,
      set3Casa: 15,
      set3Ospite: 10,
    });
  });

  it("returns a friendly error, no crash, when the update fails", async () => {
    aggiornaRisultatoPartitaTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData(campiRisultato2a0)
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile salvare il risultato. Riprova." },
    });
  });

  it("revalidates both risultati and tabellone paths (this action is shared by both pages)", async () => {
    aggiornaRisultatoPartitaTorneoMock.mockResolvedValue({ count: 1 });

    await salvaRisultatoPartitaTorneoAction(undefined, buildFormData(campiRisultato2a0));

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/torneo/edizione-1/categoria-1/risultati"
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/torneo/edizione-1/categoria-1/tabellone"
    );
  });

  // Story 20.4: la generazione automatica delle finali e' un side-effect di
  // questa azione - fase/tabellone SEMPRE riletti server-side (mai dal
  // client, che non li invia affatto in questo form).
  describe("automatic finali generation (spec-20-4)", () => {
    it("does not even look up the sibling semifinale for a GIRONE partita (the common case)", async () => {
      aggiornaRisultatoPartitaTorneoMock.mockResolvedValue({ count: 1 });
      // beforeEach gia' configura trovaPartitaTorneoPerIdMock con fase
      // GIRONE di default.

      await salvaRisultatoPartitaTorneoAction(undefined, buildFormData(campiRisultato2a0));

      expect(elencaPartiteTorneoMock).not.toHaveBeenCalled();
      expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
    });

    it("generates the 2 finali of the tabellone once both semifinali sorelle have a result (AC)", async () => {
      aggiornaRisultatoPartitaTorneoMock.mockResolvedValue({ count: 1 });
      trovaPartitaTorneoPerIdMock.mockResolvedValue({
        id: "partita-1",
        categoriaTorneoId: "categoria-1",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_1_4",
      });
      elencaPartiteTorneoMock.mockResolvedValue([
        {
          id: "partita-1",
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "a1",
          squadraOspiteId: "b2",
          fase: "SEMIFINALE",
          tabellone: "POSIZIONI_1_4",
          set1Casa: 25,
          set1Ospite: 20,
          set2Casa: 25,
          set2Ospite: 18,
          set3Casa: null,
          set3Ospite: null,
        },
        {
          id: "partita-2",
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "b1",
          squadraOspiteId: "a2",
          fase: "SEMIFINALE",
          tabellone: "POSIZIONI_1_4",
          set1Casa: 20,
          set1Ospite: 25,
          set2Casa: 15,
          set2Ospite: 25,
          set3Casa: null,
          set3Ospite: null,
        },
      ]);
      creaPartiteTorneoMock.mockResolvedValue({ count: 2 });

      const result = await salvaRisultatoPartitaTorneoAction(
        undefined,
        buildFormData(campiRisultato2a0)
      );

      expect(result).toEqual({ success: true });
      // partita-1: a1 vince 2-0 su b2 -> vincitore a1, perdente b2.
      // partita-2: a2 (ospite) vince 2-0 su b1 (casa) -> vincitore a2,
      // perdente b1.
      expect(creaPartiteTorneoMock).toHaveBeenCalledWith([
        {
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "a1",
          squadraOspiteId: "a2",
          fase: "FINALE_VINCENTI",
          tabellone: "POSIZIONI_1_4",
        },
        {
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "b2",
          squadraOspiteId: "b1",
          fase: "FINALE_PERDENTI",
          tabellone: "POSIZIONI_1_4",
        },
      ]);
    });

    it("does not generate finali (and does not error) when the sibling semifinale has no result yet", async () => {
      aggiornaRisultatoPartitaTorneoMock.mockResolvedValue({ count: 1 });
      trovaPartitaTorneoPerIdMock.mockResolvedValue({
        id: "partita-1",
        categoriaTorneoId: "categoria-1",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_1_4",
      });
      elencaPartiteTorneoMock.mockResolvedValue([
        {
          id: "partita-1",
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "a1",
          squadraOspiteId: "b2",
          fase: "SEMIFINALE",
          tabellone: "POSIZIONI_1_4",
          set1Casa: 25,
          set1Ospite: 20,
          set2Casa: 25,
          set2Ospite: 18,
          set3Casa: null,
          set3Ospite: null,
        },
        {
          id: "partita-2",
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "b1",
          squadraOspiteId: "a2",
          fase: "SEMIFINALE",
          tabellone: "POSIZIONI_1_4",
          set1Casa: null,
          set1Ospite: null,
          set2Casa: null,
          set2Ospite: null,
          set3Casa: null,
          set3Ospite: null,
        },
      ]);

      const result = await salvaRisultatoPartitaTorneoAction(
        undefined,
        buildFormData(campiRisultato2a0)
      );

      expect(result).toEqual({ success: true });
      expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
    });

    // Review fix (Edge Case Hunter, Story 20.4): questo scenario (risalvare
    // una semifinale le cui finali esistono gia') e' ora bloccato PRIMA
    // ancora di tentare l'aggiornamento (erroreModificaBloccata) - non e'
    // piu' "salva comunque, poi non generare due volte le finali" ma "non
    // salvare affatto". Il test verifica il nuovo comportamento (rifiuto
    // esplicito), non solo l'assenza di doppia generazione.
    it("rejects re-saving a semifinale whose finali already exist for that tabellone, before even attempting the update", async () => {
      trovaPartitaTorneoPerIdMock.mockResolvedValue({
        id: "partita-1",
        categoriaTorneoId: "categoria-1",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_1_4",
      });
      elencaPartiteTorneoMock.mockResolvedValue([
        {
          id: "finale-vincenti",
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "a1",
          squadraOspiteId: "a2",
          fase: "FINALE_VINCENTI",
          tabellone: "POSIZIONI_1_4",
          set1Casa: null,
          set1Ospite: null,
          set2Casa: null,
          set2Ospite: null,
          set3Casa: null,
          set3Ospite: null,
        },
        {
          id: "finale-perdenti",
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "b2",
          squadraOspiteId: "b1",
          fase: "FINALE_PERDENTI",
          tabellone: "POSIZIONI_1_4",
          set1Casa: null,
          set1Ospite: null,
          set2Casa: null,
          set2Ospite: null,
          set3Casa: null,
          set3Ospite: null,
        },
      ]);

      const result = await salvaRisultatoPartitaTorneoAction(
        undefined,
        buildFormData(campiRisultato2a0)
      );

      expect(result).toEqual({
        error: {
          code: "VALIDATION",
          message: "Non puoi modificare questo risultato: le finali sono già state generate.",
        },
      });
      expect(aggiornaRisultatoPartitaTorneoMock).not.toHaveBeenCalled();
      expect(creaPartiteTorneoMock).not.toHaveBeenCalled();
    });

    // Review fix (Edge Case Hunter, Story 20.4): il catch P2002 di
    // generaFinaliSeCompletate ora ri-verifica che le finali esistano
    // DAVVERO prima di trattare l'errore come un no-op idempotente - il
    // mock qui simula esplicitamente la sequenza reale (nessuna finale al
    // momento del controllo pre-salvataggio e del tentativo di creazione,
    // finali presenti solo alla ri-verifica successiva al P2002, come se
    // una richiesta concorrente le avesse appena inserite nel frattempo).
    it("translates a unique-constraint violation on the finali insert (concurrent double-submit) into a silent no-op, not an error surfaced to the user", async () => {
      aggiornaRisultatoPartitaTorneoMock.mockResolvedValue({ count: 1 });
      trovaPartitaTorneoPerIdMock.mockResolvedValue({
        id: "partita-1",
        categoriaTorneoId: "categoria-1",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_1_4",
      });
      const semifinaliComplete = [
        {
          id: "partita-1",
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "a1",
          squadraOspiteId: "b2",
          fase: "SEMIFINALE",
          tabellone: "POSIZIONI_1_4",
          set1Casa: 25,
          set1Ospite: 20,
          set2Casa: 25,
          set2Ospite: 18,
          set3Casa: null,
          set3Ospite: null,
        },
        {
          id: "partita-2",
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "b1",
          squadraOspiteId: "a2",
          fase: "SEMIFINALE",
          tabellone: "POSIZIONI_1_4",
          set1Casa: 20,
          set1Ospite: 25,
          set2Casa: 15,
          set2Ospite: 25,
          set3Casa: null,
          set3Ospite: null,
        },
      ];
      const conFinaliGiaCreate = [
        ...semifinaliComplete,
        {
          id: "finale-vincenti",
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "a1",
          squadraOspiteId: "a2",
          fase: "FINALE_VINCENTI",
          tabellone: "POSIZIONI_1_4",
          set1Casa: null,
          set1Ospite: null,
          set2Casa: null,
          set2Ospite: null,
          set3Casa: null,
          set3Ospite: null,
        },
        {
          id: "finale-perdenti",
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "b2",
          squadraOspiteId: "b1",
          fase: "FINALE_PERDENTI",
          tabellone: "POSIZIONI_1_4",
          set1Casa: null,
          set1Ospite: null,
          set2Casa: null,
          set2Ospite: null,
          set3Casa: null,
          set3Ospite: null,
        },
      ];
      // 1ª chiamata: erroreModificaBloccata (pre-salvataggio) - nessuna
      // finale ancora, il blocco non scatta. 2ª chiamata:
      // generaFinaliSeCompletate - ancora nessuna finale, tenta la
      // creazione (che sotto rifiuta con P2002, simulando una richiesta
      // concorrente che le ha appena create). 3ª chiamata: la
      // ri-verifica post-P2002 (review fix) - ora le trova, le tratta come
      // idempotenza.
      elencaPartiteTorneoMock
        .mockResolvedValueOnce(semifinaliComplete)
        .mockResolvedValueOnce(semifinaliComplete)
        .mockResolvedValueOnce(conFinaliGiaCreate);
      creaPartiteTorneoMock.mockRejectedValue(
        Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
      );

      const result = await salvaRisultatoPartitaTorneoAction(
        undefined,
        buildFormData(campiRisultato2a0)
      );

      // Il salvataggio del risultato e' comunque riuscito - il fallimento
      // riguarda solo il side-effect di generazione delle finali, gia'
      // fatto da qualcun altro nel frattempo (idempotenza, non un errore
      // utente).
      expect(result).toEqual({ success: true });
    });

    it("surfaces a genuine, unexplained P2002 (finali still don't exist after re-checking) as INTERNAL instead of silently swallowing it (review fix)", async () => {
      aggiornaRisultatoPartitaTorneoMock.mockResolvedValue({ count: 1 });
      trovaPartitaTorneoPerIdMock.mockResolvedValue({
        id: "partita-1",
        categoriaTorneoId: "categoria-1",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_1_4",
      });
      const semifinaliComplete = [
        {
          id: "partita-1",
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "a1",
          squadraOspiteId: "b2",
          fase: "SEMIFINALE",
          tabellone: "POSIZIONI_1_4",
          set1Casa: 25,
          set1Ospite: 20,
          set2Casa: 25,
          set2Ospite: 18,
          set3Casa: null,
          set3Ospite: null,
        },
        {
          id: "partita-2",
          categoriaTorneoId: "categoria-1",
          squadraCasaId: "b1",
          squadraOspiteId: "a2",
          fase: "SEMIFINALE",
          tabellone: "POSIZIONI_1_4",
          set1Casa: 20,
          set1Ospite: 25,
          set2Casa: 15,
          set2Ospite: 25,
          set3Casa: null,
          set3Ospite: null,
        },
      ];
      // Nessuna finale a NESSUna delle tre letture - il P2002 non e' quindi
      // spiegabile con una generazione concorrente riuscita, e va propagato.
      elencaPartiteTorneoMock.mockResolvedValue(semifinaliComplete);
      creaPartiteTorneoMock.mockRejectedValue(
        Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
      );

      const result = await salvaRisultatoPartitaTorneoAction(
        undefined,
        buildFormData(campiRisultato2a0)
      );

      expect(result).toEqual({
        error: { code: "INTERNAL", message: "Impossibile salvare il risultato. Riprova." },
      });
    });
  });
});

// Story 20.9 (Epic 20, Torneo Memorial): SlotTorneo - stesso stile delle
// describe precedenti.
const campiSlotGironeValidi = {
  edizioneTorneoId: "edizione-1",
  etichetta: "Campo 1 - Sabato mattina",
  data: "2026-09-05",
  ora: "09:00",
  palestraId: "palestra-1",
  fase: "GIRONE",
};

const campiSlotSemifinaleValidi = {
  edizioneTorneoId: "edizione-1",
  etichetta: "Campo 1 - Sabato pomeriggio",
  data: "2026-09-05",
  ora: "15:00",
  palestraId: "palestra-1",
  fase: "SEMIFINALE",
  tabellone: "POSIZIONI_1_4",
};

describe("creaSlotTorneoAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaSlotTorneoAction(undefined, buildFormData(campiSlotGironeValidi));

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(creaSlotTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when edizioneTorneoId is missing", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotGironeValidi, edizioneTorneoId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Edizione non specificata." },
    });
    expect(creaSlotTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when etichetta is missing", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotGironeValidi, etichetta: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'etichetta è obbligatoria." },
    });
    expect(creaSlotTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when etichetta exceeds the max length", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotGironeValidi, etichetta: "a".repeat(101) })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'etichetta non può superare i 100 caratteri." },
    });
    expect(creaSlotTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when data is missing", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotGironeValidi, data: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La data è obbligatoria." },
    });
  });

  it("returns a validation error when ora is missing", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotGironeValidi, ora: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'ora è obbligatoria." },
    });
  });

  it("returns a validation error when palestraId is missing", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotGironeValidi, palestraId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La Palestra è obbligatoria." },
    });
  });

  it("returns a validation error when fase is missing", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotGironeValidi, fase: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La fase è obbligatoria." },
    });
  });

  it("returns a validation error when fase is not a valid enum value", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotGironeValidi, fase: "QUARTI" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Fase non valida." },
    });
  });

  // I/O matrix (spec-20-9): "Creazione Slot con fase GIRONE e un tabellone
  // specificato" -> rifiutata, VALIDATION - mirror del CHECK discriminato a
  // livello DB, ma con un messaggio esplicito PRIMA del database.
  it("rejects a GIRONE Slot with a tabellone specified (I/O matrix)", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotGironeValidi, tabellone: "POSIZIONI_1_4" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Un incontro di girone non ha un tabellone." },
    });
    expect(creaSlotTorneoMock).not.toHaveBeenCalled();
  });

  // I/O matrix: "Creazione Slot con fase SEMIFINALE/FINALE senza tabellone"
  // -> rifiutata, VALIDATION.
  it("rejects a SEMIFINALE/FINALE Slot with no tabellone (I/O matrix)", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotSemifinaleValidi, tabellone: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il tabellone è obbligatorio per semifinali/finali." },
    });
    expect(creaSlotTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when tabellone is not a valid enum value", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotSemifinaleValidi, tabellone: "QUARTI" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Tabellone non valido." },
    });
  });

  it("returns a validation error, not a generic INTERNAL, when the Edizione no longer exists", async () => {
    trovaEdizioneTorneoPerIdMock.mockResolvedValue(null);

    const result = await creaSlotTorneoAction(undefined, buildFormData(campiSlotGironeValidi));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Edizione non trovata." },
    });
    expect(creaSlotTorneoMock).not.toHaveBeenCalled();
  });

  // Review fix (Blind Hunter + Edge Case Hunter, convergenti): stesso
  // controllo esplicito di "Edizione non trovata" appena sopra, ora anche
  // per la Palestra - prima si affidava solo al vincolo FK del DB.
  it("returns a validation error, not a generic INTERNAL, when the Palestra no longer exists", async () => {
    trovaPalestraPerIdMock.mockResolvedValue(null);

    const result = await creaSlotTorneoAction(undefined, buildFormData(campiSlotGironeValidi));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Palestra non trovata." },
    });
    expect(creaSlotTorneoMock).not.toHaveBeenCalled();
  });

  // Review fix (Blind Hunter + Edge Case Hunter, convergenti): solo la
  // non-vuotezza di data/ora era verificata prima.
  it("returns a validation error when data has an invalid format", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotGironeValidi, data: "05/09/2026" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La data deve essere nel formato AAAA-MM-GG." },
    });
    expect(creaSlotTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when ora has an invalid format", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotGironeValidi, ora: "9:00" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "L'ora deve essere nel formato HH:MM (00:00-23:59).",
      },
    });
    expect(creaSlotTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when ora is not a plausible time (25:99)", async () => {
    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotGironeValidi, ora: "25:99" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "L'ora deve essere nel formato HH:MM (00:00-23:59).",
      },
    });
    expect(creaSlotTorneoMock).not.toHaveBeenCalled();
  });

  it("accepts a valid boundary time (23:59)", async () => {
    creaSlotTorneoMock.mockResolvedValue({ id: "slot-1" });

    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData({ ...campiSlotGironeValidi, ora: "23:59" })
    );

    expect(result).toEqual({ success: true });
  });

  it("creates a GIRONE Slot with tabellone null and revalidates the Slot page", async () => {
    creaSlotTorneoMock.mockResolvedValue({ id: "slot-1" });

    const result = await creaSlotTorneoAction(undefined, buildFormData(campiSlotGironeValidi));

    expect(result).toEqual({ success: true });
    expect(creaSlotTorneoMock).toHaveBeenCalledWith({
      edizioneTorneoId: "edizione-1",
      etichetta: "Campo 1 - Sabato mattina",
      data: "2026-09-05",
      ora: "09:00",
      palestraId: "palestra-1",
      fase: "GIRONE",
      tabellone: null,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/edizione-1/slot");
  });

  it("creates a SEMIFINALE Slot with the given tabellone", async () => {
    creaSlotTorneoMock.mockResolvedValue({ id: "slot-1" });

    const result = await creaSlotTorneoAction(
      undefined,
      buildFormData(campiSlotSemifinaleValidi)
    );

    expect(result).toEqual({ success: true });
    expect(creaSlotTorneoMock).toHaveBeenCalledWith({
      edizioneTorneoId: "edizione-1",
      etichetta: "Campo 1 - Sabato pomeriggio",
      data: "2026-09-05",
      ora: "15:00",
      palestraId: "palestra-1",
      fase: "SEMIFINALE",
      tabellone: "POSIZIONI_1_4",
    });
  });

  it("returns a friendly error, no crash, when the create fails", async () => {
    creaSlotTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await creaSlotTorneoAction(undefined, buildFormData(campiSlotGironeValidi));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare lo Slot. Riprova." },
    });
  });
});

describe("cancellaSlotTorneoAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await cancellaSlotTorneoAction(
      undefined,
      buildFormData({ id: "slot-1", edizioneTorneoId: "edizione-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(cancellaSlotTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when id/edizioneTorneoId are missing", async () => {
    const result = await cancellaSlotTorneoAction(undefined, buildFormData({ id: "" }));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Slot non specificato." },
    });
    expect(cancellaSlotTorneoMock).not.toHaveBeenCalled();
  });

  it("deletes the Slot and revalidates the Slot page", async () => {
    cancellaSlotTorneoMock.mockResolvedValue({ count: 1 });

    const result = await cancellaSlotTorneoAction(
      undefined,
      buildFormData({ id: "slot-1", edizioneTorneoId: "edizione-1" })
    );

    expect(result).toEqual({ success: true });
    expect(cancellaSlotTorneoMock).toHaveBeenCalledWith("slot-1", "edizione-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/edizione-1/slot");
  });

  it("returns an explicit message when the Slot is still assigned to a Partita", async () => {
    cancellaSlotTorneoMock.mockResolvedValue({ count: 0 });
    trovaSlotTorneoPerIdMock.mockResolvedValue({ id: "slot-1", edizioneTorneoId: "edizione-1" });

    const result = await cancellaSlotTorneoAction(
      undefined,
      buildFormData({ id: "slot-1", edizioneTorneoId: "edizione-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Impossibile cancellare: questo Slot è già assegnato a un incontro.",
      },
    });
  });

  it("returns 'not found' when the Slot doesn't exist / doesn't match the Edizione", async () => {
    cancellaSlotTorneoMock.mockResolvedValue({ count: 0 });
    trovaSlotTorneoPerIdMock.mockResolvedValue(null);

    const result = await cancellaSlotTorneoAction(
      undefined,
      buildFormData({ id: "slot-1", edizioneTorneoId: "edizione-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Slot non trovato in questa Edizione." },
    });
  });

  it("returns a friendly error, no crash, when the delete fails", async () => {
    cancellaSlotTorneoMock.mockRejectedValue(new Error("db down"));

    const result = await cancellaSlotTorneoAction(
      undefined,
      buildFormData({ id: "slot-1", edizioneTorneoId: "edizione-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile cancellare lo Slot. Riprova." },
    });
  });
});

describe("assegnaSlotPartitaTorneoAction", () => {
  const partitaSemifinale = {
    id: "partita-1",
    categoriaTorneoId: "categoria-1",
    fase: "SEMIFINALE",
    tabellone: "POSIZIONI_1_4",
  };

  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await assegnaSlotPartitaTorneoAction(
      undefined,
      buildFormData({ id: "partita-1", categoriaTorneoId: "categoria-1", slotTorneoId: "slot-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(assegnaSlotPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when id/categoriaTorneoId are missing", async () => {
    const result = await assegnaSlotPartitaTorneoAction(
      undefined,
      buildFormData({ id: "", categoriaTorneoId: "categoria-1", slotTorneoId: "slot-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Incontro non specificato." },
    });
    expect(assegnaSlotPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error, not a generic INTERNAL, when the Categoria no longer exists", async () => {
    trovaCategoriaTorneoPerIdMock.mockResolvedValue(null);

    const result = await assegnaSlotPartitaTorneoAction(
      undefined,
      buildFormData({ id: "partita-1", categoriaTorneoId: "categoria-1", slotTorneoId: "slot-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Categoria non trovata." },
    });
    expect(assegnaSlotPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns 'not found' when the Partita doesn't exist / doesn't match the Categoria", async () => {
    trovaPartitaTorneoPerIdMock.mockResolvedValue(null);

    const result = await assegnaSlotPartitaTorneoAction(
      undefined,
      buildFormData({ id: "partita-1", categoriaTorneoId: "categoria-1", slotTorneoId: "slot-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Incontro non trovato in questa Categoria." },
    });
    expect(assegnaSlotPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("returns 'Slot non trovato' when the given slotTorneoId doesn't exist", async () => {
    trovaPartitaTorneoPerIdMock.mockResolvedValue(partitaSemifinale);
    trovaSlotTorneoPerIdMock.mockResolvedValue(null);

    const result = await assegnaSlotPartitaTorneoAction(
      undefined,
      buildFormData({ id: "partita-1", categoriaTorneoId: "categoria-1", slotTorneoId: "slot-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Slot non trovato." },
    });
    expect(assegnaSlotPartitaTorneoMock).not.toHaveBeenCalled();
  });

  // I/O matrix (spec-20-9): "Assegnazione di uno Slot con fase/tabellone
  // non corrispondenti alla Partita" -> rifiutata, VALIDATION - mai fidarsi
  // del client, fase/tabellone della Partita sono sempre riletti server-side.
  it("rejects a Slot whose fase/tabellone don't match the Partita's real fase/tabellone (I/O matrix)", async () => {
    trovaPartitaTorneoPerIdMock.mockResolvedValue(partitaSemifinale);
    trovaSlotTorneoPerIdMock.mockResolvedValue({
      id: "slot-1",
      fase: "GIRONE",
      tabellone: null,
    });

    const result = await assegnaSlotPartitaTorneoAction(
      undefined,
      buildFormData({ id: "partita-1", categoriaTorneoId: "categoria-1", slotTorneoId: "slot-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Lo Slot selezionato non corrisponde alla fase di questo incontro.",
      },
    });
    expect(assegnaSlotPartitaTorneoMock).not.toHaveBeenCalled();
  });

  it("assigns the Slot when fase/tabellone match, and revalidates both pages", async () => {
    trovaPartitaTorneoPerIdMock.mockResolvedValue(partitaSemifinale);
    trovaSlotTorneoPerIdMock.mockResolvedValue({
      id: "slot-1",
      fase: "SEMIFINALE",
      tabellone: "POSIZIONI_1_4",
      edizioneTorneoId: "edizione-1",
    });
    assegnaSlotPartitaTorneoMock.mockResolvedValue({ count: 1 });

    const result = await assegnaSlotPartitaTorneoAction(
      undefined,
      buildFormData({ id: "partita-1", categoriaTorneoId: "categoria-1", slotTorneoId: "slot-1" })
    );

    expect(result).toEqual({ success: true });
    expect(assegnaSlotPartitaTorneoMock).toHaveBeenCalledWith("partita-1", "categoria-1", "slot-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/edizione-1/categoria-1/risultati");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/edizione-1/categoria-1/tabellone");
  });

  // Review fix (Blind Hunter): fase/tabellone GIRONE/null combaciano sempre,
  // quindi uno Slot di un'altra Edizione con fase/tabellone coincidenti
  // andrebbe accettato per errore senza questo controllo dedicato.
  it("rejects a Slot whose fase/tabellone match but which belongs to a different Edizione", async () => {
    trovaPartitaTorneoPerIdMock.mockResolvedValue(partitaSemifinale);
    trovaSlotTorneoPerIdMock.mockResolvedValue({
      id: "slot-1",
      fase: "SEMIFINALE",
      tabellone: "POSIZIONI_1_4",
      edizioneTorneoId: "edizione-2",
    });

    const result = await assegnaSlotPartitaTorneoAction(
      undefined,
      buildFormData({ id: "partita-1", categoriaTorneoId: "categoria-1", slotTorneoId: "slot-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Lo Slot selezionato appartiene a un'altra Edizione.",
      },
    });
    expect(assegnaSlotPartitaTorneoMock).not.toHaveBeenCalled();
  });

  // spec-20-9 Code Map: slotTorneoId vuoto = RIMUOVI l'assegnazione
  // esistente, non un valore mancante da rifiutare.
  it("removes an existing assignment when slotTorneoId is empty", async () => {
    trovaPartitaTorneoPerIdMock.mockResolvedValue(partitaSemifinale);
    assegnaSlotPartitaTorneoMock.mockResolvedValue({ count: 1 });

    const result = await assegnaSlotPartitaTorneoAction(
      undefined,
      buildFormData({ id: "partita-1", categoriaTorneoId: "categoria-1", slotTorneoId: "" })
    );

    expect(result).toEqual({ success: true });
    expect(trovaSlotTorneoPerIdMock).not.toHaveBeenCalled();
    expect(assegnaSlotPartitaTorneoMock).toHaveBeenCalledWith("partita-1", "categoria-1", null);
  });

  it("returns a validation error, not a silent no-op, when the update matches no row (count 0)", async () => {
    trovaPartitaTorneoPerIdMock.mockResolvedValue(partitaSemifinale);
    trovaSlotTorneoPerIdMock.mockResolvedValue({
      id: "slot-1",
      fase: "SEMIFINALE",
      tabellone: "POSIZIONI_1_4",
      edizioneTorneoId: "edizione-1",
    });
    assegnaSlotPartitaTorneoMock.mockResolvedValue({ count: 0 });

    const result = await assegnaSlotPartitaTorneoAction(
      undefined,
      buildFormData({ id: "partita-1", categoriaTorneoId: "categoria-1", slotTorneoId: "slot-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Incontro non trovato in questa Categoria." },
    });
  });

  it("returns a friendly error, no crash, when the assignment fails", async () => {
    trovaPartitaTorneoPerIdMock.mockResolvedValue(partitaSemifinale);
    trovaSlotTorneoPerIdMock.mockRejectedValue(new Error("db down"));

    const result = await assegnaSlotPartitaTorneoAction(
      undefined,
      buildFormData({ id: "partita-1", categoriaTorneoId: "categoria-1", slotTorneoId: "slot-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile assegnare lo Slot. Riprova." },
    });
  });
});

// Story 20.9: wiring dell'auto-assegnazione best-effort dentro
// generaTabelloneAction (4 semifinali) e generaFinaliSeCompletate (2
// finali, side-effect di salvaRisultatoPartitaTorneoAction) - i test di
// generaTabelloneAction/salvaRisultatoPartitaTorneoAction sopra coprono gia'
// implicitamente il caso "nessuno Slot libero" (default beforeEach,
// elencaSlotTorneoLiberiMock risolve []): qui si verifica invece che
// un'assegnazione avvenga DAVVERO quando Slot liberi esistono, e che un suo
// fallimento non blocchi comunque la generazione.
describe("automatic Slot assignment wiring (spec-20-9)", () => {
  const squadreComplete = [
    { id: "a1", girone: "GIRONE_A" },
    { id: "a2", girone: "GIRONE_A" },
    { id: "a3", girone: "GIRONE_A" },
    { id: "a4", girone: "GIRONE_A" },
    { id: "b1", girone: "GIRONE_B" },
    { id: "b2", girone: "GIRONE_B" },
    { id: "b3", girone: "GIRONE_B" },
    { id: "b4", girone: "GIRONE_B" },
  ];

  function partita2a0(casaId: string, ospiteId: string, girone: string) {
    return {
      id: `${casaId}-${ospiteId}`,
      categoriaTorneoId: "categoria-1",
      squadraCasaId: casaId,
      squadraCasa: { id: casaId, girone },
      squadraOspiteId: ospiteId,
      squadraOspite: { id: ospiteId, girone },
      fase: "GIRONE",
      tabellone: null,
      set1Casa: 25,
      set1Ospite: 10,
      set2Casa: 25,
      set2Ospite: 10,
      set3Casa: null,
      set3Ospite: null,
    };
  }

  const partiteGironeComplete = [
    partita2a0("a1", "a2", "GIRONE_A"),
    partita2a0("a1", "a3", "GIRONE_A"),
    partita2a0("a1", "a4", "GIRONE_A"),
    partita2a0("a2", "a3", "GIRONE_A"),
    partita2a0("a2", "a4", "GIRONE_A"),
    partita2a0("a3", "a4", "GIRONE_A"),
    partita2a0("b1", "b2", "GIRONE_B"),
    partita2a0("b1", "b3", "GIRONE_B"),
    partita2a0("b1", "b4", "GIRONE_B"),
    partita2a0("b2", "b3", "GIRONE_B"),
    partita2a0("b2", "b4", "GIRONE_B"),
    partita2a0("b3", "b4", "GIRONE_B"),
  ];

  it("assigns a free Slot to each newly-generated semifinale, one per tabellone, in a deterministic order (AC #7)", async () => {
    elencaSquadreTorneoMock.mockResolvedValue(squadreComplete);
    creaPartiteTorneoMock.mockResolvedValue({ count: 4 });
    assegnaSlotPartitaTorneoMock.mockResolvedValue({ count: 1 });

    const semi1_1_4 = { id: "semi-1", fase: "SEMIFINALE", tabellone: "POSIZIONI_1_4", slotTorneoId: null };
    const semi2_1_4 = { id: "semi-2", fase: "SEMIFINALE", tabellone: "POSIZIONI_1_4", slotTorneoId: null };
    const semi1_5_8 = { id: "semi-3", fase: "SEMIFINALE", tabellone: "POSIZIONI_5_8", slotTorneoId: null };
    const semi2_5_8 = { id: "semi-4", fase: "SEMIFINALE", tabellone: "POSIZIONI_5_8", slotTorneoId: null };

    elencaPartiteTorneoMock
      .mockResolvedValueOnce(partiteGironeComplete) // classifica di girone
      .mockResolvedValueOnce([semi1_1_4, semi2_1_4]) // assegnaSlotAutomaticamente POSIZIONI_1_4
      .mockResolvedValueOnce([semi1_5_8, semi2_5_8]); // assegnaSlotAutomaticamente POSIZIONI_5_8

    elencaSlotTorneoLiberiMock.mockImplementation(
      (_edizioneTorneoId: string, _fase: string, tabellone: string | null) => {
        if (tabellone === "POSIZIONI_1_4") return Promise.resolve([{ id: "slot-a" }, { id: "slot-b" }]);
        if (tabellone === "POSIZIONI_5_8") return Promise.resolve([{ id: "slot-c" }]);
        return Promise.resolve([]);
      }
    );

    const result = await generaTabelloneAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({ success: true });
    expect(assegnaSlotPartitaTorneoMock).toHaveBeenCalledWith("semi-1", "categoria-1", "slot-a");
    expect(assegnaSlotPartitaTorneoMock).toHaveBeenCalledWith("semi-2", "categoria-1", "slot-b");
    expect(assegnaSlotPartitaTorneoMock).toHaveBeenCalledWith("semi-3", "categoria-1", "slot-c");
    // Un solo Slot libero per POSIZIONI_5_8 - la seconda semifinale di quel
    // tabellone resta senza Slot, nessun errore (best-effort, AC #8).
    expect(assegnaSlotPartitaTorneoMock).not.toHaveBeenCalledWith(
      "semi-4",
      "categoria-1",
      expect.anything()
    );
  });

  it("still generates the tabellone successfully when the auto-assignment itself errors (best-effort, AC #8)", async () => {
    elencaSquadreTorneoMock.mockResolvedValue(squadreComplete);
    elencaPartiteTorneoMock.mockResolvedValue(partiteGironeComplete);
    creaPartiteTorneoMock.mockResolvedValue({ count: 4 });
    elencaSlotTorneoLiberiMock.mockRejectedValue(new Error("db down"));

    const result = await generaTabelloneAction(
      undefined,
      buildFormData({ categoriaTorneoId: "categoria-1" })
    );

    expect(result).toEqual({ success: true });
  });

  it("assigns a free Slot to each of the 2 newly-generated finali (side-effect of salvaRisultatoPartitaTorneoAction)", async () => {
    const campiRisultato2a0 = {
      id: "partita-1",
      categoriaTorneoId: "categoria-1",
      set1Casa: "25",
      set1Ospite: "20",
      set2Casa: "25",
      set2Ospite: "18",
    };
    aggiornaRisultatoPartitaTorneoMock.mockResolvedValue({ count: 1 });
    trovaPartitaTorneoPerIdMock.mockResolvedValue({
      id: "partita-1",
      categoriaTorneoId: "categoria-1",
      fase: "SEMIFINALE",
      tabellone: "POSIZIONI_1_4",
    });
    creaPartiteTorneoMock.mockResolvedValue({ count: 2 });
    assegnaSlotPartitaTorneoMock.mockResolvedValue({ count: 1 });

    const semifinaliComplete = [
      {
        id: "partita-1",
        categoriaTorneoId: "categoria-1",
        squadraCasaId: "a1",
        squadraOspiteId: "b2",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_1_4",
        set1Casa: 25,
        set1Ospite: 20,
        set2Casa: 25,
        set2Ospite: 18,
        set3Casa: null,
        set3Ospite: null,
      },
      {
        id: "partita-2",
        categoriaTorneoId: "categoria-1",
        squadraCasaId: "b1",
        squadraOspiteId: "a2",
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_1_4",
        set1Casa: 20,
        set1Ospite: 25,
        set2Casa: 15,
        set2Ospite: 25,
        set3Casa: null,
        set3Ospite: null,
      },
    ];
    const finaleVincenti = {
      id: "finale-vincenti-1",
      fase: "FINALE_VINCENTI",
      tabellone: "POSIZIONI_1_4",
      slotTorneoId: null,
    };
    const finalePerdenti = {
      id: "finale-perdenti-1",
      fase: "FINALE_PERDENTI",
      tabellone: "POSIZIONI_1_4",
      slotTorneoId: null,
    };

    elencaPartiteTorneoMock
      .mockResolvedValueOnce(semifinaliComplete) // erroreModificaBloccata
      .mockResolvedValueOnce(semifinaliComplete) // generaFinaliSeCompletate (check semifinali+finaliEsistenti)
      .mockResolvedValueOnce([finaleVincenti]) // assegnaSlotAutomaticamente FINALE_VINCENTI
      .mockResolvedValueOnce([finalePerdenti]); // assegnaSlotAutomaticamente FINALE_PERDENTI

    elencaSlotTorneoLiberiMock.mockImplementation((_edizioneTorneoId: string, fase: string) => {
      if (fase === "FINALE_VINCENTI") return Promise.resolve([{ id: "slot-vincenti" }]);
      if (fase === "FINALE_PERDENTI") return Promise.resolve([{ id: "slot-perdenti" }]);
      return Promise.resolve([]);
    });

    const result = await salvaRisultatoPartitaTorneoAction(
      undefined,
      buildFormData(campiRisultato2a0)
    );

    expect(result).toEqual({ success: true });
    expect(assegnaSlotPartitaTorneoMock).toHaveBeenCalledWith(
      "finale-vincenti-1",
      "categoria-1",
      "slot-vincenti"
    );
    expect(assegnaSlotPartitaTorneoMock).toHaveBeenCalledWith(
      "finale-perdenti-1",
      "categoria-1",
      "slot-perdenti"
    );
    // Review fix (Verification Gap Reviewer): elencaSlotTorneoLiberiMock
    // ignorava deliberatamente il primo argomento (prefisso "_") - nessuna
    // asserzione dimostrava che l'edizioneTorneoId ricevuto fosse quello
    // vero della Categoria (non un valore qualsiasi che facesse comunque
    // compilare/passare il test).
    expect(elencaSlotTorneoLiberiMock).toHaveBeenCalledWith(
      "edizione-1",
      "FINALE_VINCENTI",
      "POSIZIONI_1_4"
    );
    expect(elencaSlotTorneoLiberiMock).toHaveBeenCalledWith(
      "edizione-1",
      "FINALE_PERDENTI",
      "POSIZIONI_1_4"
    );
  });
});
