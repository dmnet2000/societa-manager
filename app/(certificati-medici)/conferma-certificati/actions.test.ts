import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const createClientMock = vi.fn();
const caricaFileCertificatoMock = vi.fn();
const generaUrlFirmatoMock = vi.fn();
const confermaCertificatoMock = vi.fn();
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

// Story 4.4: MIME_AMMESSI/DIMENSIONE_MASSIMA_BYTE/contenutoCorrispondeAlMimeDichiarato
// restano l'implementazione reale (condivisi con certificato-medico/actions.ts,
// Story 4.1) - solo l'I/O sul bucket e' mockato.
vi.mock("@/lib/storage/certificati", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/storage/certificati")>();
  return {
    ...actual,
    caricaFileCertificato: caricaFileCertificatoMock,
    generaUrlFirmato: generaUrlFirmatoMock,
  };
});

vi.mock("@/lib/db-rls/certificato-medico", () => ({
  confermaCertificato: confermaCertificatoMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const { confermaCertificato, ottieniUrlCertificatoConferma } = await import(
  "./actions"
);

const supabaseFinto = { finto: true };

function buildFormData(fields: {
  atletaId?: string;
  dataInizioValidita?: string;
  dataFineValidita?: string;
  mesiValidita?: string;
  modulo?: string;
  file?: File | null;
}) {
  const formData = new FormData();
  if (fields.atletaId !== undefined) formData.append("atletaId", fields.atletaId);
  if (fields.dataInizioValidita !== undefined)
    formData.append("dataInizioValidita", fields.dataInizioValidita);
  if (fields.dataFineValidita !== undefined)
    formData.append("dataFineValidita", fields.dataFineValidita);
  if (fields.mesiValidita !== undefined)
    formData.append("mesiValidita", fields.mesiValidita);
  if (fields.modulo !== undefined) formData.append("modulo", fields.modulo);
  if (fields.file) formData.append("file", fields.file);
  return formData;
}

const MAGIC_PDF = [0x25, 0x50, 0x44, 0x46];

function fileValido(nome = "certificato.pdf", tipo = "application/pdf") {
  const bytes = new Uint8Array(1024);
  bytes.set(MAGIC_PDF, 0);
  return new File([bytes], nome, { type: tipo });
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  createClientMock.mockReset();
  createClientMock.mockResolvedValue(supabaseFinto);
  caricaFileCertificatoMock.mockReset();
  caricaFileCertificatoMock.mockResolvedValue("atleta-1/manuale.pdf");
  confermaCertificatoMock.mockReset();
  confermaCertificatoMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
});

describe("confermaCertificato (Server Action)", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente/Segreteria (AC #4)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await confermaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", dataFineValidita: "2027-01-01" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith([
      "ADMIN",
      "DIRIGENTE",
      "SEGRETERIA",
    ]);
    expect(confermaCertificatoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when atletaId is missing", async () => {
    const result = await confermaCertificato(
      undefined,
      buildFormData({ dataFineValidita: "2027-01-01" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Atleta non specificata." },
    });
    expect(confermaCertificatoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when dataFineValidita is missing (obbligatoria)", async () => {
    const result = await confermaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "La data di fine validità è obbligatoria.",
      },
    });
    expect(confermaCertificatoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION for a malformed dataFineValidita", async () => {
    const result = await confermaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", dataFineValidita: "non-una-data" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Data di fine validità non valida." },
    });
  });

  it("conferma con successo senza file allegato (AC #1)", async () => {
    const result = await confermaCertificato(
      undefined,
      buildFormData({
        atletaId: "atleta-1",
        dataInizioValidita: "2026-01-01",
        dataFineValidita: "2027-01-01",
        mesiValidita: "12",
        modulo: "A",
      })
    );

    expect(result).toEqual({ success: true });
    expect(caricaFileCertificatoMock).not.toHaveBeenCalled();
    expect(confermaCertificatoMock).toHaveBeenCalledWith(
      supabaseFinto,
      "atleta-1",
      {
        dataInizioValidita: new Date("2026-01-01"),
        dataFineValidita: new Date("2027-01-01"),
        mesiValidita: 12,
        modulo: "A",
      }
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/conferma-certificati");
  });

  it("carica il file allegato e lo collega quando fornito (AC #2, inserimento manuale)", async () => {
    const file = fileValido();

    const result = await confermaCertificato(
      undefined,
      buildFormData({
        atletaId: "atleta-1",
        dataFineValidita: "2027-01-01",
        file,
      })
    );

    expect(result).toEqual({ success: true });
    expect(caricaFileCertificatoMock).toHaveBeenCalledWith(
      supabaseFinto,
      "atleta-1",
      file
    );
    expect(confermaCertificatoMock).toHaveBeenCalledWith(
      supabaseFinto,
      "atleta-1",
      expect.objectContaining({ filePath: "atleta-1/manuale.pdf" })
    );
  });

  it("returns VALIDATION for a disallowed file MIME type quando un file e' allegato", async () => {
    const file = new File([new Uint8Array(10)], "virus.exe", {
      type: "application/x-msdownload",
    });

    const result = await confermaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", dataFineValidita: "2027-01-01", file })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Formato file non ammesso (solo PDF, JPG, PNG).",
      },
    });
    expect(confermaCertificatoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando le magic byte non corrispondono al MIME dichiarato", async () => {
    const file = new File([new Uint8Array(1024)], "falso.pdf", {
      type: "application/pdf",
    });

    const result = await confermaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", dataFineValidita: "2027-01-01", file })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    });
  });

  it("returns INTERNAL fail-closed quando confermaCertificato lancia (incluso un rifiuto RLS)", async () => {
    confermaCertificatoMock.mockRejectedValue(new Error("RLS denial"));

    const result = await confermaCertificato(
      undefined,
      buildFormData({ atletaId: "atleta-1", dataFineValidita: "2027-01-01" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile confermare il Certificato. Riprova.",
      },
    });
  });
});

describe("ottieniUrlCertificatoConferma (Server Action)", () => {
  it("redirects back without generating a URL if the caller is not Admin/Dirigente/Segreteria", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    await expect(
      ottieniUrlCertificatoConferma("atleta-1/file.pdf")
    ).rejects.toThrow("REDIRECT:/conferma-certificati");

    expect(generaUrlFirmatoMock).not.toHaveBeenCalled();
  });

  it("redirects to the signed URL when generation succeeds (AC #1: la Segreteria deve poter verificare il file prima di confermare)", async () => {
    generaUrlFirmatoMock.mockResolvedValue("https://esempio.local/firmato");

    await expect(
      ottieniUrlCertificatoConferma("atleta-1/file.pdf")
    ).rejects.toThrow("REDIRECT:https://esempio.local/firmato");

    expect(generaUrlFirmatoMock).toHaveBeenCalledWith(
      supabaseFinto,
      "atleta-1/file.pdf"
    );
  });

  it("redirects gracefully instead of throwing if generaUrlFirmato fails", async () => {
    generaUrlFirmatoMock.mockRejectedValue(new Error("not found"));

    await expect(
      ottieniUrlCertificatoConferma("atleta-1/file.pdf")
    ).rejects.toThrow("REDIRECT:/conferma-certificati");
  });
});
