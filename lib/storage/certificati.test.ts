import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const uploadMock = vi.fn();
const createSignedUrlMock = vi.fn();
const removeMock = vi.fn();
const fromMock = vi.fn(() => ({
  upload: uploadMock,
  createSignedUrl: createSignedUrlMock,
  remove: removeMock,
}));

const supabase = { storage: { from: fromMock } } as never;

const { caricaFileCertificato, generaUrlFirmato, rimuoviFileCertificato } =
  await import("./certificati");

function fileFinto(nome: string) {
  return { name: nome } as File;
}

describe("caricaFileCertificato", () => {
  beforeEach(() => {
    fromMock.mockClear();
    uploadMock.mockReset();
  });

  it("carica il file su un path nuovo scoped all'Atleta e restituisce il path (AC #1)", async () => {
    uploadMock.mockResolvedValue({ data: { path: "irrilevante" }, error: null });
    const file = fileFinto("certificato.pdf");

    const path = await caricaFileCertificato(supabase, "atleta-1", file);

    expect(fromMock).toHaveBeenCalledWith("certificati-medici");
    const [pathUsato, fileUsato, opzioni] = uploadMock.mock.calls[0];
    expect(pathUsato).toMatch(/^atleta-1\/[0-9a-f-]{36}-certificato\.pdf$/);
    expect(fileUsato).toBe(file);
    expect(opzioni).toEqual({ upsert: false });
    expect(path).toBe(pathUsato);
  });

  it("throws when the upload fails (incluso un rifiuto RLS su storage.objects, AC #3)", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { message: "new row violates row-level security policy" },
    });

    await expect(
      caricaFileCertificato(supabase, "atleta-1", fileFinto("x.pdf"))
    ).rejects.toThrow("row-level security");
  });

  it("sanitizza il nome del file (review fix): nessuno slash/carattere di controllo puo' raggiungere il percorso Storage", async () => {
    uploadMock.mockResolvedValue({ data: { path: "irrilevante" }, error: null });

    const path = await caricaFileCertificato(
      supabase,
      "atleta-1",
      fileFinto("../../etc/passwd\x00.pdf")
    );

    // Un solo slash nel percorso finale, quello tra atletaId e nome file
    // sanitizzato - senza sanitizzazione "../../etc/passwd" produrrebbe
    // segmenti di percorso annidati imprevedibili (rischio di traversal).
    expect(path.split("/")).toHaveLength(2);
    expect(path.startsWith("atleta-1/")).toBe(true);
  });

  it("limita la lunghezza del nome del file sanitizzato (review fix)", async () => {
    uploadMock.mockResolvedValue({ data: { path: "irrilevante" }, error: null });

    const nomeLunghissimo = "a".repeat(500) + ".pdf";
    const path = await caricaFileCertificato(supabase, "atleta-1", fileFinto(nomeLunghissimo));

    const nomeFileNelPath = path.split("/")[1];
    expect(nomeFileNelPath.length).toBeLessThanOrEqual(150);
  });
});

describe("rimuoviFileCertificato", () => {
  beforeEach(() => {
    fromMock.mockClear();
    removeMock.mockReset();
  });

  it("rimuove il file al path indicato (review fix, AC #4: pulizia del vecchio file su ri-caricamento)", async () => {
    removeMock.mockResolvedValue({ data: [{}], error: null });

    await rimuoviFileCertificato(supabase, "atleta-1/vecchio.pdf");

    expect(fromMock).toHaveBeenCalledWith("certificati-medici");
    expect(removeMock).toHaveBeenCalledWith(["atleta-1/vecchio.pdf"]);
  });

  it("throws when the removal fails", async () => {
    removeMock.mockResolvedValue({ data: null, error: { message: "not found" } });

    await expect(
      rimuoviFileCertificato(supabase, "atleta-1/vecchio.pdf")
    ).rejects.toThrow("not found");
  });
});

describe("generaUrlFirmato", () => {
  beforeEach(() => {
    fromMock.mockClear();
    createSignedUrlMock.mockReset();
  });

  it("genera un URL firmato a scadenza breve (AC #2)", async () => {
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: "https://esempio.local/firmato" },
      error: null,
    });

    const url = await generaUrlFirmato(supabase, "atleta-1/file.pdf");

    expect(fromMock).toHaveBeenCalledWith("certificati-medici");
    expect(createSignedUrlMock).toHaveBeenCalledWith("atleta-1/file.pdf", 300);
    expect(url).toBe("https://esempio.local/firmato");
  });

  it("accetta una scadenza personalizzata", async () => {
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: "https://esempio.local/firmato" },
      error: null,
    });

    await generaUrlFirmato(supabase, "atleta-1/file.pdf", 60);

    expect(createSignedUrlMock).toHaveBeenCalledWith("atleta-1/file.pdf", 60);
  });

  it("throws when the signed URL generation fails (permesso negato, AC #3)", async () => {
    createSignedUrlMock.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    await expect(
      generaUrlFirmato(supabase, "atleta-1/file.pdf")
    ).rejects.toThrow("not found");
  });
});
