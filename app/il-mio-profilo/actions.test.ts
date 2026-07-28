import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const getUserMock = vi.fn();
const genitoreAtletaFindFirstMock = vi.fn();
const allenatoreFindFirstMock = vi.fn();
const caricaFotoProfiloStorageMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    genitoreAtleta: { findFirst: genitoreAtletaFindFirstMock },
    allenatore: { findFirst: allenatoreFindFirstMock },
  },
}));

vi.mock("@/lib/storage/foto-profilo", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage/foto-profilo")>(
    "@/lib/storage/foto-profilo"
  );
  return {
    ...actual,
    caricaFotoProfilo: caricaFotoProfiloStorageMock,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { caricaFotoProfilo } = await import("./actions");
const { BUCKET_FOTO_ATLETA, BUCKET_FOTO_ALLENATORE } = await import(
  "@/lib/storage/foto-profilo"
);

function buildFormData(file?: File) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return formData;
}

function buildFile(mime: string, size: number, bytes?: number[]) {
  const contenuto = bytes ? new Uint8Array(bytes) : new Uint8Array(size);
  const file = new File([contenuto], "foto.bin", { type: mime });
  if (bytes === undefined) {
    Object.defineProperty(file, "size", { value: size });
  }
  return file;
}

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0x00, 0x00];

describe("caricaFotoProfilo", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: "auth-u1" } } });
    genitoreAtletaFindFirstMock.mockReset();
    allenatoreFindFirstMock.mockReset();
    caricaFotoProfiloStorageMock.mockReset();
    caricaFotoProfiloStorageMock.mockResolvedValue(undefined);
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and does not touch Storage when the caller lacks the required Ruolo", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await caricaFotoProfilo(
      "ATLETA",
      undefined,
      buildFormData(buildFile("image/jpeg", 5, JPEG_HEADER))
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(caricaFotoProfiloStorageMock).not.toHaveBeenCalled();
  });

  it("calls requireRuolo with exactly [ATLETA, ALLENATORE], regardless of tipo (review fix)", async () => {
    genitoreAtletaFindFirstMock.mockResolvedValue({ atletaId: "atleta-1" });

    await caricaFotoProfilo(
      "ATLETA",
      undefined,
      buildFormData(buildFile("image/jpeg", 5, JPEG_HEADER))
    );

    expect(requireRuoloMock).toHaveBeenCalledWith(["ATLETA", "ALLENATORE"]);
  });

  it("returns a validation error when no file is provided, no Supabase/Prisma call", async () => {
    const result = await caricaFotoProfilo("ATLETA", undefined, buildFormData());

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un file da caricare." },
    });
    expect(genitoreAtletaFindFirstMock).not.toHaveBeenCalled();
    expect(caricaFotoProfiloStorageMock).not.toHaveBeenCalled();
  });

  it("returns a validation error for a disallowed mime type", async () => {
    const result = await caricaFotoProfilo(
      "ATLETA",
      undefined,
      buildFormData(buildFile("application/pdf", 5, [0x25, 0x50, 0x44, 0x46]))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato file non ammesso (solo JPG, PNG)." },
    });
    expect(caricaFotoProfiloStorageMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the file exceeds 5MB", async () => {
    const file = buildFile("image/jpeg", 5 * 1024 * 1024 + 1);

    const result = await caricaFotoProfilo("ATLETA", undefined, buildFormData(file));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il file supera la dimensione massima di 5MB." },
    });
    expect(caricaFotoProfiloStorageMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the file content does not match the declared mime type", async () => {
    const file = buildFile("image/jpeg", 5, [0x00, 0x00, 0x00, 0x00, 0x00]);

    const result = await caricaFotoProfilo("ATLETA", undefined, buildFormData(file));

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    });
    expect(caricaFotoProfiloStorageMock).not.toHaveBeenCalled();
  });

  it("returns NON_COLLEGATO when tipo=ATLETA but no autoAggancio row resolves", async () => {
    genitoreAtletaFindFirstMock.mockResolvedValue(null);

    const result = await caricaFotoProfilo(
      "ATLETA",
      undefined,
      buildFormData(buildFile("image/jpeg", 5, JPEG_HEADER))
    );

    expect(result).toEqual({
      error: {
        code: "NON_COLLEGATO",
        message: "Il tuo account non è collegato a un profilo Allenatore o Atleta.",
      },
    });
    expect(caricaFotoProfiloStorageMock).not.toHaveBeenCalled();
  });

  it("returns NON_COLLEGATO when tipo=ALLENATORE but no Allenatore row resolves", async () => {
    allenatoreFindFirstMock.mockResolvedValue(null);

    const result = await caricaFotoProfilo(
      "ALLENATORE",
      undefined,
      buildFormData(buildFile("image/jpeg", 5, JPEG_HEADER))
    );

    expect(result).toEqual({
      error: {
        code: "NON_COLLEGATO",
        message: "Il tuo account non è collegato a un profilo Allenatore o Atleta.",
      },
    });
    expect(caricaFotoProfiloStorageMock).not.toHaveBeenCalled();
  });

  it("resolves the Atleta via autoAggancio (never trusting a client-provided id) and uploads to the Atleta bucket", async () => {
    genitoreAtletaFindFirstMock.mockResolvedValue({ atletaId: "atleta-1" });
    const file = buildFile("image/jpeg", 5, JPEG_HEADER);

    const result = await caricaFotoProfilo("ATLETA", undefined, buildFormData(file));

    expect(genitoreAtletaFindFirstMock).toHaveBeenCalledWith({
      where: { utente: { supabaseAuthId: "auth-u1" }, autoAggancio: true },
      select: { atletaId: true },
      orderBy: { atletaId: "asc" },
    });
    expect(caricaFotoProfiloStorageMock).toHaveBeenCalledWith(
      expect.anything(),
      BUCKET_FOTO_ATLETA,
      "atleta-1",
      file
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/il-mio-profilo");
    expect(result).toEqual({ success: true });
    // Review fix (code review Story 9.12, Blind Hunter): il ramo "altro"
    // non deve mai essere interrogato.
    expect(allenatoreFindFirstMock).not.toHaveBeenCalled();
  });

  it("resolves the Allenatore via utenteId and uploads to the Allenatore bucket", async () => {
    allenatoreFindFirstMock.mockResolvedValue({ id: "allenatore-1" });
    const file = buildFile("image/png", 5, [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    const result = await caricaFotoProfilo("ALLENATORE", undefined, buildFormData(file));

    expect(allenatoreFindFirstMock).toHaveBeenCalledWith({
      where: { utente: { supabaseAuthId: "auth-u1" } },
    });
    expect(caricaFotoProfiloStorageMock).toHaveBeenCalledWith(
      expect.anything(),
      BUCKET_FOTO_ALLENATORE,
      "allenatore-1",
      file
    );
    expect(result).toEqual({ success: true });
    // Review fix (code review Story 9.12, Blind Hunter): il ramo "altro"
    // non deve mai essere interrogato.
    expect(genitoreAtletaFindFirstMock).not.toHaveBeenCalled();
  });

  it("returns a VALIDATION error for an unexpected tipo value, no Prisma/Storage call (review fix, defensive branch)", async () => {
    const result = await caricaFotoProfilo(
      // @ts-expect-error -- valore intenzionalmente fuori dall'unione, per testare il ramo difensivo
      "ALTRO",
      undefined,
      buildFormData(buildFile("image/jpeg", 5, JPEG_HEADER))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Tipo di profilo non valido." },
    });
    expect(genitoreAtletaFindFirstMock).not.toHaveBeenCalled();
    expect(allenatoreFindFirstMock).not.toHaveBeenCalled();
    expect(caricaFotoProfiloStorageMock).not.toHaveBeenCalled();
  });

  it("returns a friendly INTERNAL error, no crash, when the storage upload throws", async () => {
    genitoreAtletaFindFirstMock.mockResolvedValue({ atletaId: "atleta-1" });
    caricaFotoProfiloStorageMock.mockRejectedValue(new Error("boom"));

    const result = await caricaFotoProfilo(
      "ATLETA",
      undefined,
      buildFormData(buildFile("image/jpeg", 5, JPEG_HEADER))
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile caricare la foto. Riprova." },
    });
  });
});
