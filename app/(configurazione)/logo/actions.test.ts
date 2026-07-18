import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const createClientMock = vi.fn();
const caricaLogoMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/storage/logo", () => ({
  caricaLogo: caricaLogoMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { caricaLogoAction } = await import("./actions");

const supabaseFinto = { finto: true };

const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

function fileValido(
  nome = "logo.png",
  tipo = "image/png",
  dimensione = 1024
) {
  const bytes = new Uint8Array(dimensione);
  const magic = MAGIC_BYTES[tipo];
  if (magic && dimensione >= magic.length) bytes.set(magic, 0);
  return new File([bytes], nome, { type: tipo });
}

function buildFormData(file: File | null) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return formData;
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  createClientMock.mockReset();
  createClientMock.mockResolvedValue(supabaseFinto);
  caricaLogoMock.mockReset();
  caricaLogoMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
});

describe("caricaLogoAction (Server Action)", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin (AC #3)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await caricaLogoAction(undefined, buildFormData(fileValido()));

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith("ADMIN");
    expect(caricaLogoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando nessun file e' fornito", async () => {
    const result = await caricaLogoAction(undefined, buildFormData(null));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un'immagine da caricare." },
    });
    expect(caricaLogoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un file vuoto (size 0)", async () => {
    const result = await caricaLogoAction(
      undefined,
      buildFormData(fileValido("logo.png", "image/png", 0))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un'immagine da caricare." },
    });
  });

  it("returns VALIDATION per un tipo MIME non ammesso (mai fidarsi solo dell'attributo accept del client)", async () => {
    const result = await caricaLogoAction(
      undefined,
      buildFormData(fileValido("logo.svg", "image/svg+xml"))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato immagine non ammesso (solo PNG, JPG)." },
    });
    expect(caricaLogoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando il file supera i 2MB", async () => {
    const result = await caricaLogoAction(
      undefined,
      buildFormData(fileValido("logo.png", "image/png", 2 * 1024 * 1024 + 1))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il file supera la dimensione massima di 2MB." },
    });
    expect(caricaLogoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando le magic byte non corrispondono al MIME dichiarato (AC #4)", async () => {
    const fileIngannevole = new File(
      [new Uint8Array(1024)],
      "falso.png",
      { type: "image/png" }
    );

    const result = await caricaLogoAction(undefined, buildFormData(fileIngannevole));

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    });
    expect(caricaLogoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un PNG con solo i primi 4 byte della firma corretti (review fix: verifica l'intera firma a 8 byte, non solo un prefisso)", async () => {
    const bytes = new Uint8Array(1024);
    // Primi 4 byte corretti (0x89 0x50 0x4e 0x47), resto della firma PNG
    // (0x0d 0x0a 0x1a 0x0a) assente - con un controllo troncato a 4 byte
    // questo file superava erroneamente la verifica.
    bytes.set([0x89, 0x50, 0x4e, 0x47], 0);
    const fileParzialmenteIngannevole = new File([bytes], "falso.png", {
      type: "image/png",
    });

    const result = await caricaLogoAction(
      undefined,
      buildFormData(fileParzialmenteIngannevole)
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    });
    expect(caricaLogoMock).not.toHaveBeenCalled();
  });

  it("accetta un PNG e un JPEG validi, chiama caricaLogo e revalida /logo (AC #1)", async () => {
    const png = fileValido("logo.png", "image/png");
    const risultatoPng = await caricaLogoAction(undefined, buildFormData(png));
    expect(risultatoPng).toEqual({ success: true });
    expect(caricaLogoMock).toHaveBeenCalledWith(supabaseFinto, png);
    expect(revalidatePathMock).toHaveBeenCalledWith("/logo");

    const jpeg = fileValido("logo.jpg", "image/jpeg");
    const risultatoJpeg = await caricaLogoAction(undefined, buildFormData(jpeg));
    expect(risultatoJpeg).toEqual({ success: true });
  });

  it("returns INTERNAL fail-closed quando caricaLogo lancia (incluso un rifiuto RLS per un Ruolo non Admin, AC #3)", async () => {
    caricaLogoMock.mockRejectedValue(new Error("RLS denial"));

    const result = await caricaLogoAction(undefined, buildFormData(fileValido()));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile caricare il logo. Riprova." },
    });
  });
});
