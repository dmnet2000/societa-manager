import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const createClientMock = vi.fn();
const risolviAnnoAgonisticoCorrenteMock = vi.fn();
const inserisciIscrizioneMock = vi.fn();
const disattivaIscrizioneMock = vi.fn();
const disattivaIscrizioneAttivaPerAtletaMock = vi.fn();
const segnaAtletaRimossaMock = vi.fn();
const annullaRimozioneAtletaMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/anno-agonistico", () => ({
  risolviAnnoAgonisticoCorrente: risolviAnnoAgonisticoCorrenteMock,
}));

vi.mock("@/lib/db-rls/iscrizione", () => ({
  inserisciIscrizione: inserisciIscrizioneMock,
  disattivaIscrizione: disattivaIscrizioneMock,
  disattivaIscrizioneAttivaPerAtleta: disattivaIscrizioneAttivaPerAtletaMock,
}));

vi.mock("@/lib/db-rls/atleta", () => ({
  segnaAtletaRimossa: segnaAtletaRimossaMock,
  annullaRimozioneAtleta: annullaRimozioneAtletaMock,
  MOTIVI_RIMOZIONE_ATLETA: ["NON_PIU_IN_SOCIETA", "TRASFERITA"],
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { confermaIscrizione, escludiIscrizione, rimuoviAtleta, ripristinaAtleta } =
  await import("./actions");

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

describe("confermaIscrizione (Server Action)", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    createClientMock.mockReset();
    createClientMock.mockResolvedValue({ marker: "supabase-client" });
    risolviAnnoAgonisticoCorrenteMock.mockReset();
    inserisciIscrizioneMock.mockReset();
    disattivaIscrizioneMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and does nothing if the caller is not Segreteria", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await confermaIscrizione(undefined, "atleta-1");

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith("SEGRETERIA");
    expect(risolviAnnoAgonisticoCorrenteMock).not.toHaveBeenCalled();
  });

  it("resolves the current AnnoAgonistico and confirms the Iscrizione (AC #2, #3)", async () => {
    risolviAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    inserisciIscrizioneMock.mockResolvedValue(undefined);

    const result = await confermaIscrizione(undefined, "atleta-1");

    expect(result).toEqual({ success: true });
    expect(risolviAnnoAgonisticoCorrenteMock).toHaveBeenCalled();
    expect(inserisciIscrizioneMock).toHaveBeenCalledWith(
      { marker: "supabase-client" },
      "atleta-1",
      "anno-1"
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/conferma-iscrizioni");
  });

  it("returns a friendly error, no crash, when inserisciIscrizione fails", async () => {
    risolviAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    inserisciIscrizioneMock.mockRejectedValue(new Error("db down"));

    const result = await confermaIscrizione(undefined, "atleta-1");

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile confermare l'iscrizione. Riprova.",
      },
    });
  });

  it("returns a friendly error, no crash, when resolving the AnnoAgonistico fails", async () => {
    risolviAnnoAgonisticoCorrenteMock.mockRejectedValue(new Error("db down"));

    const result = await confermaIscrizione(undefined, "atleta-1");

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile confermare l'iscrizione. Riprova.",
      },
    });
    expect(inserisciIscrizioneMock).not.toHaveBeenCalled();
  });
});

describe("escludiIscrizione (Server Action)", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    createClientMock.mockReset();
    createClientMock.mockResolvedValue({ marker: "supabase-client" });
    disattivaIscrizioneMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente/Segreteria", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await escludiIscrizione(undefined, "iscrizione-1");

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith([
      "ADMIN",
      "DIRIGENTE",
      "SEGRETERIA",
    ]);
    expect(disattivaIscrizioneMock).not.toHaveBeenCalled();
  });

  it("excludes the Iscrizione (AC #4)", async () => {
    disattivaIscrizioneMock.mockResolvedValue(undefined);

    const result = await escludiIscrizione(undefined, "iscrizione-1");

    expect(result).toEqual({ success: true });
    expect(disattivaIscrizioneMock).toHaveBeenCalledWith(
      { marker: "supabase-client" },
      "iscrizione-1"
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/conferma-iscrizioni");
  });

  it("returns a friendly error, no crash, when disattivaIscrizione fails", async () => {
    disattivaIscrizioneMock.mockRejectedValue(new Error("not found"));

    const result = await escludiIscrizione(undefined, "iscrizione-1");

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile escludere l'iscrizione. Riprova.",
      },
    });
  });
});

// Story 9.43 (AC #1/#2/#10): mirror esatto del perimetro di autorizzazione
// di escludiIscrizione sopra (stessi 3 Ruoli), non di confermaIscrizione.
// Review fix: l'Iscrizione della stagione corrente non arriva più da un
// iscrizioneId passato dal client (formData) - viene risolta lato server
// per atletaId+Anno Agonistico (disattivaIscrizioneAttivaPerAtleta), PRIMA
// di segnare l'Atleta rimossa (ordine invertito rispetto alla prima
// versione, vedi commento in actions.ts).
describe("rimuoviAtleta (Server Action)", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    createClientMock.mockReset();
    createClientMock.mockResolvedValue({ marker: "supabase-client" });
    risolviAnnoAgonisticoCorrenteMock.mockReset();
    risolviAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    segnaAtletaRimossaMock.mockReset();
    disattivaIscrizioneAttivaPerAtletaMock.mockReset();
    disattivaIscrizioneAttivaPerAtletaMock.mockResolvedValue(undefined);
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente/Segreteria", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ atletaId: "atleta-1", motivo: "TRASFERITA" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith([
      "ADMIN",
      "DIRIGENTE",
      "SEGRETERIA",
    ]);
    expect(segnaAtletaRimossaMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when atletaId is missing", async () => {
    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ motivo: "TRASFERITA" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Atleta non specificata." },
    });
    expect(segnaAtletaRimossaMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when motivo is missing or not one of the two valid values (AC #1)", async () => {
    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ atletaId: "atleta-1", motivo: "QUALCOS_ALTRO" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona il motivo della rimozione." },
    });
    expect(segnaAtletaRimossaMock).not.toHaveBeenCalled();
  });

  it("marks the Atleta as removed with motivo and nota, resolving the current season's Iscrizione itself (AC #1/#2)", async () => {
    segnaAtletaRimossaMock.mockResolvedValue(undefined);

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({
        atletaId: "atleta-1",
        motivo: "NON_PIU_IN_SOCIETA",
        nota: "Ha smesso di allenarsi",
      })
    );

    expect(result).toEqual({ success: true });
    expect(risolviAnnoAgonisticoCorrenteMock).toHaveBeenCalled();
    expect(disattivaIscrizioneAttivaPerAtletaMock).toHaveBeenCalledWith(
      { marker: "supabase-client" },
      "atleta-1",
      "anno-1"
    );
    expect(segnaAtletaRimossaMock).toHaveBeenCalledWith(
      { marker: "supabase-client" },
      "atleta-1",
      { motivoRimozione: "NON_PIU_IN_SOCIETA", notaRimozione: "Ha smesso di allenarsi" }
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/conferma-iscrizioni");
  });

  it("saves nota as null when left empty (facoltativa)", async () => {
    segnaAtletaRimossaMock.mockResolvedValue(undefined);

    await rimuoviAtleta(
      undefined,
      buildFormData({ atletaId: "atleta-1", motivo: "TRASFERITA" })
    );

    expect(segnaAtletaRimossaMock).toHaveBeenCalledWith(
      { marker: "supabase-client" },
      "atleta-1",
      { motivoRimozione: "TRASFERITA", notaRimozione: null }
    );
  });

  // Story 9.43 (review fix): il maxLength={500} lato client (RimuoviAtletaForm)
  // e' aggirabile da una richiesta costruita a mano - troncata anche qui.
  it("truncates nota to 500 characters server-side, even if the form's maxLength is bypassed", async () => {
    segnaAtletaRimossaMock.mockResolvedValue(undefined);
    const notaLunghissima = "x".repeat(600);

    await rimuoviAtleta(
      undefined,
      buildFormData({
        atletaId: "atleta-1",
        motivo: "TRASFERITA",
        nota: notaLunghissima,
      })
    );

    const notaSalvata = segnaAtletaRimossaMock.mock.calls[0][2].notaRimozione;
    expect(notaSalvata).toHaveLength(500);
  });

  it("is a no-op for the Iscrizione when the Atleta had none active for the current season (idempotent, AC #2)", async () => {
    segnaAtletaRimossaMock.mockResolvedValue(undefined);

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ atletaId: "atleta-1", motivo: "TRASFERITA" })
    );

    expect(result).toEqual({ success: true });
    expect(disattivaIscrizioneAttivaPerAtletaMock).toHaveBeenCalledWith(
      { marker: "supabase-client" },
      "atleta-1",
      "anno-1"
    );
  });

  it("returns a friendly error, no crash, when disattivaIscrizioneAttivaPerAtleta fails - segnaAtletaRimossa is never reached", async () => {
    disattivaIscrizioneAttivaPerAtletaMock.mockRejectedValue(new Error("db down"));

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ atletaId: "atleta-1", motivo: "TRASFERITA" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile rimuovere l'Atleta dalla società. Riprova.",
      },
    });
    expect(segnaAtletaRimossaMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when segnaAtletaRimossa fails", async () => {
    segnaAtletaRimossaMock.mockRejectedValue(new Error("db down"));

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ atletaId: "atleta-1", motivo: "TRASFERITA" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile rimuovere l'Atleta dalla società. Riprova.",
      },
    });
  });
});

describe("ripristinaAtleta (Server Action)", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    createClientMock.mockReset();
    createClientMock.mockResolvedValue({ marker: "supabase-client" });
    annullaRimozioneAtletaMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente/Segreteria", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await ripristinaAtleta(
      undefined,
      buildFormData({ atletaId: "atleta-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(annullaRimozioneAtletaMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when atletaId is missing", async () => {
    const result = await ripristinaAtleta(undefined, buildFormData({}));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Atleta non specificata." },
    });
    expect(annullaRimozioneAtletaMock).not.toHaveBeenCalled();
  });

  it("restores the Atleta (AC #7)", async () => {
    annullaRimozioneAtletaMock.mockResolvedValue(undefined);

    const result = await ripristinaAtleta(
      undefined,
      buildFormData({ atletaId: "atleta-1" })
    );

    expect(result).toEqual({ success: true });
    expect(annullaRimozioneAtletaMock).toHaveBeenCalledWith(
      { marker: "supabase-client" },
      "atleta-1"
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/conferma-iscrizioni");
  });

  it("returns a friendly error, no crash, when annullaRimozioneAtleta fails", async () => {
    annullaRimozioneAtletaMock.mockRejectedValue(new Error("db down"));

    const result = await ripristinaAtleta(
      undefined,
      buildFormData({ atletaId: "atleta-1" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile ripristinare l'Atleta. Riprova.",
      },
    });
  });
});
