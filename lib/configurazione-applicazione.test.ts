import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findUniqueMock = vi.fn();
const upsertMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    configurazioneApplicazione: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
    },
  },
}));

const {
  leggiNomeSettore,
  salvaNomeSettore,
  leggiEmailSegreteria,
  salvaEmailSegreteria,
  leggiUrlPaginaFacebook,
  salvaUrlPaginaFacebook,
  leggiContattiPubblici,
  salvaContattiPubblici,
  nessunContattoPubblicoConfigurato,
  leggiUrlSitoPolisportiva,
  salvaUrlSitoPolisportiva,
  nomeSettoreAbbreviato,
  ID_CONFIGURAZIONE_APPLICAZIONE,
} = await import("./configurazione-applicazione");

describe("leggiNomeSettore", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns the stored nomeSettore", async () => {
    findUniqueMock.mockResolvedValue({ nomeSettore: "Volley" });

    const result = await leggiNomeSettore();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      select: { nomeSettore: true },
    });
    expect(result).toBe("Volley");
  });

  it("returns null when no row exists yet (mai salvato)", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await leggiNomeSettore();

    expect(result).toBeNull();
  });

  it("returns null when the stored value is null", async () => {
    findUniqueMock.mockResolvedValue({ nomeSettore: null });

    const result = await leggiNomeSettore();

    expect(result).toBeNull();
  });
});

describe("salvaNomeSettore", () => {
  beforeEach(() => {
    upsertMock.mockReset();
  });

  it("upserts on the fixed id, atomic - no read-then-branch", async () => {
    await salvaNomeSettore("Volley");

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, nomeSettore: "Volley" },
      update: { nomeSettore: "Volley" },
    });
  });

  it("allows clearing the value back to null", async () => {
    await salvaNomeSettore(null);

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, nomeSettore: null },
      update: { nomeSettore: null },
    });
  });
});

// Story 9.31: mirror esatto dei describe sopra per leggiNomeSettore/salvaNomeSettore.
describe("leggiEmailSegreteria", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns the stored emailSegreteria", async () => {
    findUniqueMock.mockResolvedValue({ emailSegreteria: "segreteria@esempio.it" });

    const result = await leggiEmailSegreteria();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      select: { emailSegreteria: true },
    });
    expect(result).toBe("segreteria@esempio.it");
  });

  it("returns null when no row exists yet (mai salvato)", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await leggiEmailSegreteria();

    expect(result).toBeNull();
  });

  it("returns null when the stored value is null", async () => {
    findUniqueMock.mockResolvedValue({ emailSegreteria: null });

    const result = await leggiEmailSegreteria();

    expect(result).toBeNull();
  });
});

describe("salvaEmailSegreteria", () => {
  beforeEach(() => {
    upsertMock.mockReset();
  });

  it("upserts on the fixed id, atomic - no read-then-branch", async () => {
    await salvaEmailSegreteria("segreteria@esempio.it");

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, emailSegreteria: "segreteria@esempio.it" },
      update: { emailSegreteria: "segreteria@esempio.it" },
    });
  });

  it("allows clearing the value back to null", async () => {
    await salvaEmailSegreteria(null);

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, emailSegreteria: null },
      update: { emailSegreteria: null },
    });
  });
});

// Story 18.5: mirror esatto dei describe sopra per leggiEmailSegreteria/salvaEmailSegreteria.
describe("leggiUrlPaginaFacebook", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns the stored urlPaginaFacebook", async () => {
    findUniqueMock.mockResolvedValue({
      urlPaginaFacebook: "https://www.facebook.com/miasocieta",
    });

    const result = await leggiUrlPaginaFacebook();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      select: { urlPaginaFacebook: true },
    });
    expect(result).toBe("https://www.facebook.com/miasocieta");
  });

  it("returns null when no row exists yet (mai salvato)", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await leggiUrlPaginaFacebook();

    expect(result).toBeNull();
  });

  it("returns null when the stored value is null", async () => {
    findUniqueMock.mockResolvedValue({ urlPaginaFacebook: null });

    const result = await leggiUrlPaginaFacebook();

    expect(result).toBeNull();
  });
});

describe("salvaUrlPaginaFacebook", () => {
  beforeEach(() => {
    upsertMock.mockReset();
  });

  it("upserts on the fixed id, atomic - no read-then-branch", async () => {
    await salvaUrlPaginaFacebook("https://www.facebook.com/miasocieta");

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: {
        id: ID_CONFIGURAZIONE_APPLICAZIONE,
        urlPaginaFacebook: "https://www.facebook.com/miasocieta",
      },
      update: { urlPaginaFacebook: "https://www.facebook.com/miasocieta" },
    });
  });

  it("allows clearing the value back to null", async () => {
    await salvaUrlPaginaFacebook(null);

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, urlPaginaFacebook: null },
      update: { urlPaginaFacebook: null },
    });
  });
});

// Story 18.11: a differenza dei describe sopra (1 funzione per campo), qui i
// 3 campi sono letti/scritti insieme in una sola chiamata.
describe("leggiContattiPubblici", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns the stored contatti", async () => {
    findUniqueMock.mockResolvedValue({
      indirizzoSede: "Via dello Sport 1",
      telefonoPubblico: "+39 012 3456789",
      emailPubblica: "info@esempio.it",
    });

    const result = await leggiContattiPubblici();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      select: { indirizzoSede: true, telefonoPubblico: true, emailPubblica: true },
    });
    expect(result).toEqual({
      indirizzoSede: "Via dello Sport 1",
      telefonoPubblico: "+39 012 3456789",
      emailPubblica: "info@esempio.it",
    });
  });

  it("returns all null when no row exists yet (mai salvato)", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await leggiContattiPubblici();

    expect(result).toEqual({
      indirizzoSede: null,
      telefonoPubblico: null,
      emailPubblica: null,
    });
  });

  it("returns null per-field when the stored values are null", async () => {
    findUniqueMock.mockResolvedValue({
      indirizzoSede: null,
      telefonoPubblico: null,
      emailPubblica: null,
    });

    const result = await leggiContattiPubblici();

    expect(result).toEqual({
      indirizzoSede: null,
      telefonoPubblico: null,
      emailPubblica: null,
    });
  });
});

describe("salvaContattiPubblici", () => {
  beforeEach(() => {
    upsertMock.mockReset();
  });

  it("upserts on the fixed id, atomic - all 3 fields together", async () => {
    const valori = {
      indirizzoSede: "Via dello Sport 1",
      telefonoPubblico: "+39 012 3456789",
      emailPubblica: "info@esempio.it",
    };

    await salvaContattiPubblici(valori);

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, ...valori },
      update: valori,
    });
  });

  it("allows clearing a subset of fields back to null (indipendenti)", async () => {
    const valori = {
      indirizzoSede: "Via dello Sport 1",
      telefonoPubblico: null,
      emailPubblica: null,
    };

    await salvaContattiPubblici(valori);

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, ...valori },
      update: valori,
    });
  });
});

describe("nessunContattoPubblicoConfigurato", () => {
  it("returns true when all 4 fields (including social) are null", () => {
    expect(
      nessunContattoPubblicoConfigurato({
        indirizzoSede: null,
        telefonoPubblico: null,
        emailPubblica: null,
        urlPaginaFacebook: null,
      })
    ).toBe(true);
  });

  it("returns false when only indirizzoSede is set", () => {
    expect(
      nessunContattoPubblicoConfigurato({
        indirizzoSede: "Via dello Sport 1",
        telefonoPubblico: null,
        emailPubblica: null,
        urlPaginaFacebook: null,
      })
    ).toBe(false);
  });

  it("returns false when only telefonoPubblico is set", () => {
    expect(
      nessunContattoPubblicoConfigurato({
        indirizzoSede: null,
        telefonoPubblico: "+39 012 3456789",
        emailPubblica: null,
        urlPaginaFacebook: null,
      })
    ).toBe(false);
  });

  it("returns false when only emailPubblica is set", () => {
    expect(
      nessunContattoPubblicoConfigurato({
        indirizzoSede: null,
        telefonoPubblico: null,
        emailPubblica: "info@esempio.it",
        urlPaginaFacebook: null,
      })
    ).toBe(false);
  });

  it("returns false when only urlPaginaFacebook (social) is set - conta come campo a pieno titolo", () => {
    expect(
      nessunContattoPubblicoConfigurato({
        indirizzoSede: null,
        telefonoPubblico: null,
        emailPubblica: null,
        urlPaginaFacebook: "https://www.facebook.com/miasocieta",
      })
    ).toBe(false);
  });

  it("returns false when all 4 fields are set", () => {
    expect(
      nessunContattoPubblicoConfigurato({
        indirizzoSede: "Via dello Sport 1",
        telefonoPubblico: "+39 012 3456789",
        emailPubblica: "info@esempio.it",
        urlPaginaFacebook: "https://www.facebook.com/miasocieta",
      })
    ).toBe(false);
  });
});

// Story 18.21: usata da app/manifest.ts per short_name (app/manifest.test.ts
// verifica l'integrazione, qui la funzione pura in isolamento).
describe("nomeSettoreAbbreviato", () => {
  it("returns the name unchanged when 12 characters or fewer", () => {
    expect(nomeSettoreAbbreviato("Volley")).toBe("Volley");
    expect(nomeSettoreAbbreviato("Volley Mogli")).toBe("Volley Mogli");
  });

  it("truncates to 12 characters when longer", () => {
    expect(nomeSettoreAbbreviato("Volley Mogliano Veneto")).toBe("Volley Mogli");
  });

  it("returns an empty string unchanged", () => {
    expect(nomeSettoreAbbreviato("")).toBe("");
  });
});

// Story 18.20: mirror esatto dei describe sopra per leggiUrlPaginaFacebook/salvaUrlPaginaFacebook.
describe("leggiUrlSitoPolisportiva", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns the stored urlSitoPolisportiva", async () => {
    findUniqueMock.mockResolvedValue({
      urlSitoPolisportiva: "https://www.polisportiva-esempio.it",
    });

    const result = await leggiUrlSitoPolisportiva();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      select: { urlSitoPolisportiva: true },
    });
    expect(result).toBe("https://www.polisportiva-esempio.it");
  });

  it("returns null when no row exists yet (mai salvato)", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await leggiUrlSitoPolisportiva();

    expect(result).toBeNull();
  });

  it("returns null when the stored value is null", async () => {
    findUniqueMock.mockResolvedValue({ urlSitoPolisportiva: null });

    const result = await leggiUrlSitoPolisportiva();

    expect(result).toBeNull();
  });
});

describe("salvaUrlSitoPolisportiva", () => {
  beforeEach(() => {
    upsertMock.mockReset();
  });

  it("upserts on the fixed id, atomic - no read-then-branch", async () => {
    await salvaUrlSitoPolisportiva("https://www.polisportiva-esempio.it");

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: {
        id: ID_CONFIGURAZIONE_APPLICAZIONE,
        urlSitoPolisportiva: "https://www.polisportiva-esempio.it",
      },
      update: { urlSitoPolisportiva: "https://www.polisportiva-esempio.it" },
    });
  });

  it("allows clearing the value back to null", async () => {
    await salvaUrlSitoPolisportiva(null);

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, urlSitoPolisportiva: null },
      update: { urlSitoPolisportiva: null },
    });
  });
});
