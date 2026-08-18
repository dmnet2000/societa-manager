import { describe, expect, it, vi, beforeEach } from "vitest";

// actions.ts importa lib/storage/validazione-immagine.ts, che ha
// "server-only" in testa - stesso mock gia' stabilito in
// lib/storage/logo.test.ts / app/(configurazione)/logo/actions.test.ts.
vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const createClientMock = vi.fn();
const caricaImmagineSponsorMock = vi.fn();
const revalidatePathMock = vi.fn();
const sponsorCreateMock = vi.fn();
const sponsorUpdateMock = vi.fn();
const sponsorDeleteMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/storage/sponsor", () => ({
  caricaImmagineSponsor: caricaImmagineSponsorMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sponsor: {
      create: sponsorCreateMock,
      update: sponsorUpdateMock,
      delete: sponsorDeleteMock,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { creaSponsor, aggiornaSponsor, impostaAttivaSponsor } = await import(
  "./actions"
);

const supabaseFinto = { finto: true };

const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

function fileValido(
  nome = "banner.png",
  tipo = "image/png",
  dimensione = 1024
) {
  const bytes = new Uint8Array(dimensione);
  const magic = MAGIC_BYTES[tipo];
  if (magic && dimensione >= magic.length) bytes.set(magic, 0);
  return new File([bytes], nome, { type: tipo });
}

function buildFormData(
  fields: Record<string, string> = {},
  file?: File | null
) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  if (file) formData.append("file", file);
  return formData;
}

function campiValidi() {
  return {
    nome: "Pallavolo Store",
    tipo: "BANNER",
    descrizione: "Sconto 10% su materiale sportivo.",
  };
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  createClientMock.mockReset();
  createClientMock.mockResolvedValue(supabaseFinto);
  caricaImmagineSponsorMock.mockReset();
  caricaImmagineSponsorMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
  sponsorCreateMock.mockReset();
  sponsorCreateMock.mockResolvedValue({ id: "sponsor-1" });
  sponsorUpdateMock.mockReset();
  sponsorUpdateMock.mockResolvedValue({ id: "sponsor-1" });
  sponsorDeleteMock.mockReset();
  sponsorDeleteMock.mockResolvedValue(undefined);
});

describe("creaSponsor (Server Action)", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Dirigente/Site Manager (AC #5, Story 19.3)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaSponsor(
      undefined,
      buildFormData(campiValidi(), fileValido())
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE", "SITE_MANAGER"]);
    expect(sponsorCreateMock).not.toHaveBeenCalled();
  });

  // Story 19.3 (Epic 19, Ruolo Site Manager): SITE_MANAGER aggiunto a
  // requireRuolo - additivo, ADMIN/DIRIGENTE restano invariati.
  it("crea lo Sponsor quando il chiamante e' Site Manager (Story 19.3)", async () => {
    const file = fileValido();
    const result = await creaSponsor(undefined, buildFormData(campiValidi(), file));

    expect(result).toEqual({ success: true });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE", "SITE_MANAGER"]);
    expect(sponsorCreateMock).toHaveBeenCalled();
  });

  it("returns VALIDATION quando il nome manca", async () => {
    const result = await creaSponsor(
      undefined,
      buildFormData({ ...campiValidi(), nome: "  " }, fileValido())
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome dello Sponsor è obbligatorio." },
    });
    expect(sponsorCreateMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un tipo non valido", async () => {
    const result = await creaSponsor(
      undefined,
      buildFormData({ ...campiValidi(), tipo: "ALTRO" }, fileValido())
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Tipo Sponsor non valido." },
    });
    expect(sponsorCreateMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando la descrizione manca", async () => {
    const result = await creaSponsor(
      undefined,
      buildFormData({ ...campiValidi(), descrizione: "" }, fileValido())
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La descrizione è obbligatoria." },
    });
    expect(sponsorCreateMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando il nome supera i 100 caratteri (review fix)", async () => {
    const result = await creaSponsor(
      undefined,
      buildFormData({ ...campiValidi(), nome: "x".repeat(101) }, fileValido())
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome dello Sponsor supera i 100 caratteri." },
    });
    expect(sponsorCreateMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando la descrizione supera i 1000 caratteri (review fix)", async () => {
    const result = await creaSponsor(
      undefined,
      buildFormData({ ...campiValidi(), descrizione: "x".repeat(1001) }, fileValido())
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La descrizione supera i 1000 caratteri." },
    });
    expect(sponsorCreateMock).not.toHaveBeenCalled();
  });

  // Review fix (Edge Case Hunter + Blind Hunter, trovato indipendentemente
  // da entrambi): nessuna validazione server-side su linkEsterno permetteva
  // uno schema javascript:/data: reso poi come href cliccabile - stesso
  // rischio gia' corretto per linkFipav (Story 10.8).
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "www.esempio.it",
    "non-e-un-link",
  ])("returns VALIDATION per un linkEsterno pericoloso o senza schema: %s", async (valore) => {
    const result = await creaSponsor(
      undefined,
      buildFormData({ ...campiValidi(), linkEsterno: valore }, fileValido())
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il link esterno non è valido (deve iniziare con http:// o https://).",
      },
    });
    expect(sponsorCreateMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando nessun file e' fornito (AC #1: obbligatorio alla creazione)", async () => {
    const result = await creaSponsor(undefined, buildFormData(campiValidi()));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un'immagine da caricare." },
    });
    expect(sponsorCreateMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un tipo MIME non ammesso (mai fidarsi solo dell'attributo accept del client, AC #6)", async () => {
    const result = await creaSponsor(
      undefined,
      buildFormData(campiValidi(), fileValido("banner.svg", "image/svg+xml"))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato immagine non ammesso (solo PNG, JPG)." },
    });
    expect(sponsorCreateMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando il file supera i 2MB (AC #6)", async () => {
    const result = await creaSponsor(
      undefined,
      buildFormData(
        campiValidi(),
        fileValido("banner.png", "image/png", 2 * 1024 * 1024 + 1)
      )
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il file supera la dimensione massima di 2MB." },
    });
    expect(sponsorCreateMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando le magic byte non corrispondono al MIME dichiarato (AC #6)", async () => {
    const fileIngannevole = new File([new Uint8Array(1024)], "falso.png", {
      type: "image/png",
    });

    const result = await creaSponsor(
      undefined,
      buildFormData(campiValidi(), fileIngannevole)
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    });
    expect(sponsorCreateMock).not.toHaveBeenCalled();
  });

  it("crea lo Sponsor, carica l'immagine col suo id e revalida /sponsor (AC #1)", async () => {
    const file = fileValido();
    const result = await creaSponsor(undefined, buildFormData(campiValidi(), file));

    expect(result).toEqual({ success: true });
    expect(sponsorCreateMock).toHaveBeenCalledWith({
      data: {
        nome: "Pallavolo Store",
        tipo: "BANNER",
        descrizione: "Sconto 10% su materiale sportivo.",
        linkEsterno: null,
      },
    });
    expect(caricaImmagineSponsorMock).toHaveBeenCalledWith(
      supabaseFinto,
      "sponsor-1",
      file
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/sponsor");
  });

  it("salva linkEsterno quando fornito", async () => {
    await creaSponsor(
      undefined,
      buildFormData(
        { ...campiValidi(), linkEsterno: "https://esempio.it" },
        fileValido()
      )
    );

    expect(sponsorCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ linkEsterno: "https://esempio.it" }),
    });
  });

  it("returns INTERNAL fail-closed quando la create Prisma lancia", async () => {
    sponsorCreateMock.mockRejectedValue(new Error("db down"));

    const result = await creaSponsor(
      undefined,
      buildFormData(campiValidi(), fileValido())
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare lo Sponsor. Riprova." },
    });
    expect(caricaImmagineSponsorMock).not.toHaveBeenCalled();
  });

  it("rimuove la riga appena creata (best-effort) e returns INTERNAL se l'upload dell'immagine fallisce", async () => {
    caricaImmagineSponsorMock.mockRejectedValue(new Error("storage down"));

    const result = await creaSponsor(
      undefined,
      buildFormData(campiValidi(), fileValido())
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile caricare l'immagine. Riprova." },
    });
    expect(sponsorDeleteMock).toHaveBeenCalledWith({ where: { id: "sponsor-1" } });
  });
});

describe("aggiornaSponsor (Server Action)", () => {
  function buildFormDataAggiorna(
    fields: Record<string, string> = {},
    file?: File | null
  ) {
    return buildFormData({ id: "sponsor-1", ...campiValidi(), ...fields }, file);
  }

  it("returns FORBIDDEN se il chiamante non e' Admin/Dirigente/Site Manager (Story 19.3)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaSponsor(undefined, buildFormDataAggiorna());

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE", "SITE_MANAGER"]);
    expect(sponsorUpdateMock).not.toHaveBeenCalled();
  });

  // Story 19.3 (Epic 19, Ruolo Site Manager): SITE_MANAGER aggiunto a
  // requireRuolo - additivo, ADMIN/DIRIGENTE restano invariati.
  it("aggiorna lo Sponsor quando il chiamante e' Site Manager (Story 19.3)", async () => {
    const result = await aggiornaSponsor(undefined, buildFormDataAggiorna());

    expect(result).toEqual({ success: true });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE", "SITE_MANAGER"]);
    expect(sponsorUpdateMock).toHaveBeenCalled();
  });

  it("aggiorna nome/tipo/descrizione/link SENZA immagine (AC #2: sostituita solo se ne viene caricata una nuova)", async () => {
    const result = await aggiornaSponsor(undefined, buildFormDataAggiorna());

    expect(result).toEqual({ success: true });
    expect(sponsorUpdateMock).toHaveBeenCalledWith({
      where: { id: "sponsor-1" },
      data: {
        nome: "Pallavolo Store",
        tipo: "BANNER",
        descrizione: "Sconto 10% su materiale sportivo.",
        linkEsterno: null,
      },
    });
    expect(caricaImmagineSponsorMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/sponsor");
  });

  it("sostituisce l'immagine quando un nuovo file valido e' fornito (AC #2)", async () => {
    const file = fileValido();
    const result = await aggiornaSponsor(undefined, buildFormDataAggiorna({}, file));

    expect(result).toEqual({ success: true });
    expect(caricaImmagineSponsorMock).toHaveBeenCalledWith(
      supabaseFinto,
      "sponsor-1",
      file
    );
  });

  it("returns VALIDATION per un nuovo file non valido, senza toccare Prisma", async () => {
    const result = await aggiornaSponsor(
      undefined,
      buildFormDataAggiorna({}, fileValido("falso.svg", "image/svg+xml"))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato immagine non ammesso (solo PNG, JPG)." },
    });
    expect(sponsorUpdateMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando l'update Prisma lancia", async () => {
    sponsorUpdateMock.mockRejectedValue(new Error("db down"));

    const result = await aggiornaSponsor(undefined, buildFormDataAggiorna());

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare lo Sponsor. Riprova." },
    });
  });

  it("returns INTERNAL quando l'upload della nuova immagine fallisce (riga gia' aggiornata, nessun rollback)", async () => {
    caricaImmagineSponsorMock.mockRejectedValue(new Error("storage down"));

    const result = await aggiornaSponsor(
      undefined,
      buildFormDataAggiorna({}, fileValido())
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare l'immagine. Riprova." },
    });
    expect(sponsorUpdateMock).toHaveBeenCalled();
  });
});

describe("impostaAttivaSponsor (Server Action)", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Dirigente/Site Manager (Story 19.3)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await impostaAttivaSponsor(
      undefined,
      buildFormData({ id: "sponsor-1", attiva: "false" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE", "SITE_MANAGER"]);
    expect(sponsorUpdateMock).not.toHaveBeenCalled();
  });

  // Story 19.3 (Epic 19, Ruolo Site Manager): SITE_MANAGER aggiunto a
  // requireRuolo - additivo, ADMIN/DIRIGENTE restano invariati.
  it("imposta lo stato attivo/disattivo quando il chiamante e' Site Manager (Story 19.3)", async () => {
    const result = await impostaAttivaSponsor(
      undefined,
      buildFormData({ id: "sponsor-1", attiva: "false" })
    );

    expect(result).toEqual({ success: true });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE", "SITE_MANAGER"]);
    expect(sponsorUpdateMock).toHaveBeenCalled();
  });

  // Review fix (Edge Case Hunter + Blind Hunter, trovato indipendentemente
  // da entrambi): un valore mancante/malformato di "attiva" veniva
  // silenziosamente trattato come "false" (=== "true" non corrisponde),
  // disattivando uno Sponsor senza alcun errore.
  it.each(["", "si", "1", "vero"])(
    "returns VALIDATION per un valore di 'attiva' malformato: %s",
    async (valore) => {
      const result = await impostaAttivaSponsor(
        undefined,
        buildFormData({ id: "sponsor-1", attiva: valore })
      );

      expect(result).toEqual({
        error: { code: "VALIDATION", message: "Valore di stato non valido." },
      });
      expect(sponsorUpdateMock).not.toHaveBeenCalled();
    }
  );

  it("returns VALIDATION quando 'attiva' e' del tutto assente dal FormData", async () => {
    const result = await impostaAttivaSponsor(undefined, buildFormData({ id: "sponsor-1" }));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Valore di stato non valido." },
    });
    expect(sponsorUpdateMock).not.toHaveBeenCalled();
  });

  it("disattiva uno Sponsor attivo (AC #3)", async () => {
    const result = await impostaAttivaSponsor(
      undefined,
      buildFormData({ id: "sponsor-1", attiva: "false" })
    );

    expect(result).toEqual({ success: true });
    expect(sponsorUpdateMock).toHaveBeenCalledWith({
      where: { id: "sponsor-1" },
      data: { attiva: false },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/sponsor");
  });

  it("riattiva uno Sponsor disattivato (AC #4)", async () => {
    const result = await impostaAttivaSponsor(
      undefined,
      buildFormData({ id: "sponsor-1", attiva: "true" })
    );

    expect(result).toEqual({ success: true });
    expect(sponsorUpdateMock).toHaveBeenCalledWith({
      where: { id: "sponsor-1" },
      data: { attiva: true },
    });
  });

  it("returns INTERNAL fail-closed quando l'update Prisma lancia", async () => {
    sponsorUpdateMock.mockRejectedValue(new Error("db down"));

    const result = await impostaAttivaSponsor(
      undefined,
      buildFormData({ id: "sponsor-1", attiva: "false" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile aggiornare lo stato dello Sponsor. Riprova.",
      },
    });
  });
});
