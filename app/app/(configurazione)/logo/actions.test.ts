import { describe, expect, it, vi, beforeEach } from "vitest";

// Story 16.1: actions.ts ora importa lib/storage/validazione-immagine.ts
// (estratto da questo file), che ha "server-only" in testa - stesso mock
// gia' stabilito in lib/storage/logo.test.ts.
vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const createClientMock = vi.fn();
const caricaLogoMock = vi.fn();
const salvaNomeSettoreMock = vi.fn();
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

vi.mock("@/lib/configurazione-applicazione", () => ({
  salvaNomeSettore: salvaNomeSettoreMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { caricaLogoAction, salvaNomeSettoreAction } = await import("./actions");

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
  salvaNomeSettoreMock.mockReset();
  salvaNomeSettoreMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
});

function buildFormDataNomeSettore(valore: string) {
  const formData = new FormData();
  formData.append("nomeSettore", valore);
  return formData;
}

describe("caricaLogoAction (Server Action)", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin ne' Site Manager (AC #3, Story 19.2)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await caricaLogoAction(undefined, buildFormData(fileValido()));

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "SITE_MANAGER"]);
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/logo");

    const jpeg = fileValido("logo.jpg", "image/jpeg");
    const risultatoJpeg = await caricaLogoAction(undefined, buildFormData(jpeg));
    expect(risultatoJpeg).toEqual({ success: true });
  });

  it("consente l'upload anche a un Site Manager (Story 19.2, additivo rispetto ad Admin)", async () => {
    const png = fileValido("logo.png", "image/png");
    const result = await caricaLogoAction(undefined, buildFormData(png));

    expect(result).toEqual({ success: true });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "SITE_MANAGER"]);
    expect(caricaLogoMock).toHaveBeenCalledWith(supabaseFinto, png);
  });

  it("returns INTERNAL fail-closed quando caricaLogo lancia (incluso un rifiuto RLS per un Ruolo non Admin/Site Manager, AC #3)", async () => {
    caricaLogoMock.mockRejectedValue(new Error("RLS denial"));

    const result = await caricaLogoAction(undefined, buildFormData(fileValido()));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile caricare il logo. Riprova." },
    });
  });
});

describe("salvaNomeSettoreAction (Server Action)", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin ne' Site Manager (Story 19.2)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await salvaNomeSettoreAction(
      undefined,
      buildFormDataNomeSettore("Volley")
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "SITE_MANAGER"]);
    expect(salvaNomeSettoreMock).not.toHaveBeenCalled();
  });

  it("salva il valore fornito (trim applicato) e revalida /logo", async () => {
    const result = await salvaNomeSettoreAction(
      undefined,
      buildFormDataNomeSettore("  Volley  ")
    );

    expect(result).toEqual({ success: true });
    expect(salvaNomeSettoreMock).toHaveBeenCalledWith("Volley");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/logo");
  });

  it("consente il salvataggio anche a un Site Manager (Story 19.2, additivo rispetto ad Admin)", async () => {
    const result = await salvaNomeSettoreAction(
      undefined,
      buildFormDataNomeSettore("Volley")
    );

    expect(result).toEqual({ success: true });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "SITE_MANAGER"]);
    expect(salvaNomeSettoreMock).toHaveBeenCalledWith("Volley");
  });

  it("salva null quando il campo e' lasciato vuoto (rimuove il nome del settore)", async () => {
    const result = await salvaNomeSettoreAction(undefined, buildFormDataNomeSettore("   "));

    expect(result).toEqual({ success: true });
    expect(salvaNomeSettoreMock).toHaveBeenCalledWith(null);
  });

  it("returns VALIDATION oltre i 60 caratteri", async () => {
    const result = await salvaNomeSettoreAction(
      undefined,
      buildFormDataNomeSettore("x".repeat(61))
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il nome del settore supera i 60 caratteri.",
      },
    });
    expect(salvaNomeSettoreMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando salvaNomeSettore lancia", async () => {
    salvaNomeSettoreMock.mockRejectedValue(new Error("db down"));

    const result = await salvaNomeSettoreAction(
      undefined,
      buildFormDataNomeSettore("Volley")
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile salvare il nome del settore. Riprova." },
    });
  });
});
