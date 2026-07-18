import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const createClientMock = vi.fn();
const caricaFileCertificatoMock = vi.fn();
const generaUrlFirmatoMock = vi.fn();
const rimuoviFileCertificatoMock = vi.fn();
const collegaFileCertificatoMock = vi.fn();
const trovaCertificatoPerAtletaMock = vi.fn();
const creaNotificaMock = vi.fn();
const revalidatePathMock = vi.fn();
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/storage/certificati", () => ({
  caricaFileCertificato: caricaFileCertificatoMock,
  generaUrlFirmato: generaUrlFirmatoMock,
  rimuoviFileCertificato: rimuoviFileCertificatoMock,
}));

vi.mock("@/lib/db-rls/certificato-medico", () => ({
  collegaFileCertificato: collegaFileCertificatoMock,
  trovaCertificatoPerAtleta: trovaCertificatoPerAtletaMock,
}));

vi.mock("@/lib/db-rls/notifica", () => ({
  creaNotifica: creaNotificaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const { caricaCertificato, ottieniUrlCertificato } = await import("./actions");

const supabaseFinto = { finto: true };

function buildFormData(fields: { atletaId?: string; file?: File | null }) {
  const formData = new FormData();
  if (fields.atletaId !== undefined) formData.append("atletaId", fields.atletaId);
  if (fields.file) formData.append("file", fields.file);
  return formData;
}

const MAGIC_BYTES: Record<string, number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

function fileValido(
  nome = "certificato.pdf",
  tipo = "application/pdf",
  dimensione = 1024
) {
  const bytes = new Uint8Array(dimensione);
  const magic = MAGIC_BYTES[tipo];
  if (magic && dimensione >= magic.length) bytes.set(magic, 0);
  return new File([bytes], nome, { type: tipo });
}

function fileConMimeIngannevole(
  nome = "falso.pdf",
  tipo = "application/pdf",
  dimensione = 1024
) {
  // Dichiara un tipo (via file.type/estensione) ma il contenuto reale non ha
  // la magic byte corrispondente - simula un rinominato "virus.exe" ->
  // "falso.pdf" con MIME contraffatto, esattamente il caso che la verifica
  // lato server (non solo l'allowlist su file.type) deve intercettare.
  return new File([new Uint8Array(dimensione)], nome, { type: tipo });
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  createClientMock.mockReset();
  createClientMock.mockResolvedValue(supabaseFinto);
  caricaFileCertificatoMock.mockReset();
  caricaFileCertificatoMock.mockResolvedValue("atleta-1/file.pdf");
  generaUrlFirmatoMock.mockReset();
  rimuoviFileCertificatoMock.mockReset();
  rimuoviFileCertificatoMock.mockResolvedValue(undefined);
  collegaFileCertificatoMock.mockReset();
  collegaFileCertificatoMock.mockResolvedValue(undefined);
  trovaCertificatoPerAtletaMock.mockReset();
  trovaCertificatoPerAtletaMock.mockResolvedValue(null);
  creaNotificaMock.mockReset();
  creaNotificaMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
  redirectMock.mockClear();
});

describe("caricaCertificato (Server Action)", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Genitore/Atleta (AC #1)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", file: fileValido() })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["GENITORE", "ATLETA"]);
    expect(caricaFileCertificatoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when atletaId is missing (AC #3)", async () => {
    const result = await caricaCertificato(
      undefined,
      buildFormData({ file: fileValido() })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Atleta non specificata." },
    });
    expect(caricaFileCertificatoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when no file is provided", async () => {
    const result = await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un file da caricare." },
    });
    expect(caricaFileCertificatoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION for an empty file (size 0)", async () => {
    const result = await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", file: fileValido("x.pdf", "application/pdf", 0) })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un file da caricare." },
    });
  });

  it("returns VALIDATION for a disallowed MIME type (mai fidarsi solo dell'attributo accept del client)", async () => {
    const result = await caricaCertificato(
      undefined,
      buildFormData({
        atletaId: "atleta-1",
        file: fileValido("virus.exe", "application/x-msdownload"),
      })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Formato file non ammesso (solo PDF, JPG, PNG).",
      },
    });
    expect(caricaFileCertificatoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when the file exceeds 10MB", async () => {
    const result = await caricaCertificato(
      undefined,
      buildFormData({
        atletaId: "atleta-1",
        file: fileValido("grande.pdf", "application/pdf", 10 * 1024 * 1024 + 1),
      })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il file supera la dimensione massima di 10MB.",
      },
    });
    expect(caricaFileCertificatoMock).not.toHaveBeenCalled();
  });

  it("uploads the file and links it to the Atleta on success (AC #1)", async () => {
    const file = fileValido();
    const result = await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", file })
    );

    expect(createClientMock).toHaveBeenCalled();
    expect(caricaFileCertificatoMock).toHaveBeenCalledWith(
      supabaseFinto,
      "atleta-1",
      file
    );
    expect(collegaFileCertificatoMock).toHaveBeenCalledWith(
      supabaseFinto,
      "atleta-1",
      "atleta-1/file.pdf"
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/certificato-medico");
    expect(result).toEqual({ success: true });
  });

  it("returns INTERNAL fail-closed when the upload throws (incluso un rifiuto RLS per un'Atleta non propria, AC #3)", async () => {
    caricaFileCertificatoMock.mockRejectedValue(new Error("RLS denial"));

    const result = await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", file: fileValido() })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile caricare il Certificato. Riprova.",
      },
    });
    expect(collegaFileCertificatoMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed when linking the file throws", async () => {
    collegaFileCertificatoMock.mockRejectedValue(new Error("db down"));

    const result = await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", file: fileValido() })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile caricare il Certificato. Riprova.",
      },
    });
  });

  it("returns VALIDATION when le magic byte del contenuto non corrispondono al MIME dichiarato (review fix: file.type e' controllato dal client)", async () => {
    const result = await caricaCertificato(
      undefined,
      buildFormData({
        atletaId: "atleta-1",
        file: fileConMimeIngannevole("virus.pdf", "application/pdf"),
      })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    });
    expect(caricaFileCertificatoMock).not.toHaveBeenCalled();
  });

  it("accetta un JPEG/PNG valido con le rispettive magic byte", async () => {
    const jpeg = fileValido("foto.jpg", "image/jpeg");
    const risultatoJpeg = await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", file: jpeg })
    );
    expect(risultatoJpeg).toEqual({ success: true });

    const png = fileValido("foto.png", "image/png");
    const risultatoPng = await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", file: png })
    );
    expect(risultatoPng).toEqual({ success: true });
  });

  it("rimuove il vecchio file dal bucket dopo aver collegato con successo quello nuovo (review fix, AC #4: ri-caricamento sostituisce, non accumula)", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue({
      id: "c1",
      atletaId: "atleta-1",
      filePath: "atleta-1/vecchio.pdf",
    });
    caricaFileCertificatoMock.mockResolvedValue("atleta-1/nuovo.pdf");

    const result = await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", file: fileValido() })
    );

    expect(result).toEqual({ success: true });
    expect(trovaCertificatoPerAtletaMock).toHaveBeenCalledWith(
      supabaseFinto,
      "atleta-1"
    );
    // Ordine: prima il nuovo file e' caricato e collegato, solo dopo il
    // vecchio viene rimosso - se l'upload/collegamento del nuovo fallisse,
    // il vecchio file resta intatto (nessuna finestra in cui l'Atleta
    // rimane senza alcun certificato accessibile).
    expect(collegaFileCertificatoMock).toHaveBeenCalledWith(
      supabaseFinto,
      "atleta-1",
      "atleta-1/nuovo.pdf"
    );
    expect(rimuoviFileCertificatoMock).toHaveBeenCalledWith(
      supabaseFinto,
      "atleta-1/vecchio.pdf"
    );
  });

  it("non chiama rimuoviFileCertificato se non esisteva un file precedente (primo caricamento)", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue(null);

    const result = await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", file: fileValido() })
    );

    expect(result).toEqual({ success: true });
    expect(rimuoviFileCertificatoMock).not.toHaveBeenCalled();
  });

  it("il caricamento riesce comunque se la rimozione del vecchio file fallisce (non e' un fallimento bloccante, il nuovo file resta collegato)", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue({
      id: "c1",
      atletaId: "atleta-1",
      filePath: "atleta-1/vecchio.pdf",
    });
    rimuoviFileCertificatoMock.mockRejectedValue(new Error("not found"));

    const result = await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", file: fileValido() })
    );

    expect(result).toEqual({ success: true });
  });

  it("crea una notifica per l'Atleta dopo un collegamento riuscito (Story 4.2 AC #1)", async () => {
    const result = await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", file: fileValido() })
    );

    expect(result).toEqual({ success: true });
    expect(creaNotificaMock).toHaveBeenCalledWith(supabaseFinto, "atleta-1");
  });

  it("crea una notifica anche su un ri-caricamento (nessuna distinzione primo/successivo, Story 4.2 AC #1)", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue({
      id: "c1",
      atletaId: "atleta-1",
      filePath: "atleta-1/vecchio.pdf",
    });

    await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", file: fileValido() })
    );

    expect(creaNotificaMock).toHaveBeenCalledWith(supabaseFinto, "atleta-1");
  });

  it("il caricamento riesce comunque se la creazione della notifica fallisce (non bloccante, Story 4.2 AC #4)", async () => {
    creaNotificaMock.mockRejectedValue(new Error("notifica RLS denial"));

    const result = await caricaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", file: fileValido() })
    );

    expect(result).toEqual({ success: true });
  });
});

describe("ottieniUrlCertificato (Server Action)", () => {
  it("redirects back without generating a URL if the caller is not Genitore/Atleta", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    await expect(ottieniUrlCertificato("atleta-1")).rejects.toThrow(
      "REDIRECT:/certificato-medico"
    );

    expect(generaUrlFirmatoMock).not.toHaveBeenCalled();
  });

  it("redirects back if no Certificato/file exists yet for the Atleta", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue(null);

    await expect(ottieniUrlCertificato("atleta-1")).rejects.toThrow(
      "REDIRECT:/certificato-medico"
    );

    expect(generaUrlFirmatoMock).not.toHaveBeenCalled();
  });

  it("redirects to the signed URL when a file exists (AC #2)", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue({
      id: "c1",
      atletaId: "atleta-1",
      filePath: "atleta-1/file.pdf",
    });
    generaUrlFirmatoMock.mockResolvedValue("https://esempio.local/firmato");

    await expect(ottieniUrlCertificato("atleta-1")).rejects.toThrow(
      "REDIRECT:https://esempio.local/firmato"
    );

    expect(generaUrlFirmatoMock).toHaveBeenCalledWith(
      supabaseFinto,
      "atleta-1/file.pdf"
    );
  });

  it("redirects gracefully instead of throwing if trovaCertificatoPerAtleta fails (review fix: mai un'eccezione non gestita in una Server Action invocata da un bottone)", async () => {
    trovaCertificatoPerAtletaMock.mockRejectedValue(new Error("db down"));

    await expect(ottieniUrlCertificato("atleta-1")).rejects.toThrow(
      "REDIRECT:/certificato-medico"
    );

    expect(generaUrlFirmatoMock).not.toHaveBeenCalled();
  });

  it("redirects gracefully instead of throwing if generaUrlFirmato fails (es. RLS nega l'accesso allo storage.objects)", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue({
      id: "c1",
      atletaId: "atleta-1",
      filePath: "atleta-1/file.pdf",
    });
    generaUrlFirmatoMock.mockRejectedValue(new Error("not found"));

    await expect(ottieniUrlCertificato("atleta-1")).rejects.toThrow(
      "REDIRECT:/certificato-medico"
    );
  });
});
