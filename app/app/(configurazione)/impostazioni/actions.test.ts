import { describe, expect, it, vi, beforeEach } from "vitest";

// Story 18.14: actions.ts ora importa anche lib/storage/foto-hero.ts (ha
// "server-only" in testa) - stesso mock gia' stabilito in
// app/(configurazione)/logo/actions.test.ts.
vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const salvaEmailSegreteriaMock = vi.fn();
const salvaUrlPaginaFacebookMock = vi.fn();
const salvaContattiPubbliciMock = vi.fn();
const salvaTokenFacebookMock = vi.fn();
const leggiConfigurazioneSocialFacebookMock = vi.fn();
const caricaFotoHeroMock = vi.fn();
const caricaLogoPolisportivaMock = vi.fn();
const salvaUrlSitoPolisportivaMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/configurazione-applicazione", () => ({
  salvaEmailSegreteria: salvaEmailSegreteriaMock,
  salvaUrlPaginaFacebook: salvaUrlPaginaFacebookMock,
  salvaContattiPubblici: salvaContattiPubbliciMock,
  salvaUrlSitoPolisportiva: salvaUrlSitoPolisportivaMock,
}));

const supabaseClientFinto = { client: "finto" };
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(supabaseClientFinto)),
}));

vi.mock("@/lib/db-rls/configurazione-social-facebook", () => ({
  salvaTokenFacebook: salvaTokenFacebookMock,
  leggiConfigurazioneSocialFacebook: leggiConfigurazioneSocialFacebookMock,
}));

vi.mock("@/lib/storage/foto-hero", () => ({
  caricaFotoHero: caricaFotoHeroMock,
}));

vi.mock("@/lib/storage/logo-polisportiva", () => ({
  caricaLogoPolisportiva: caricaLogoPolisportivaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const {
  salvaEmailSegreteriaAction,
  salvaUrlPaginaFacebookAction,
  salvaContattiPubbliciAction,
  salvaTokenFacebookAction,
  caricaFotoHeroAction,
  caricaLogoPolisportivaAction,
  salvaUrlSitoPolisportivaAction,
} = await import("./actions");

const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

function fileFotoHeroValido(
  nome = "foto-hero.png",
  tipo = "image/png",
  dimensione = 1024
) {
  const bytes = new Uint8Array(dimensione);
  const magic = MAGIC_BYTES[tipo];
  if (magic && dimensione >= magic.length) bytes.set(magic, 0);
  return new File([bytes], nome, { type: tipo });
}

function buildFormDataFotoHero(file: File | null) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return formData;
}

function buildFormData(valore: string) {
  const formData = new FormData();
  formData.append("emailSegreteria", valore);
  return formData;
}

function buildFormDataFacebook(valore: string) {
  const formData = new FormData();
  formData.append("urlPaginaFacebook", valore);
  return formData;
}

function buildFormDataContatti(valori: {
  indirizzoSede?: string;
  telefonoPubblico?: string;
  emailPubblica?: string;
}) {
  const formData = new FormData();
  formData.append("indirizzoSede", valori.indirizzoSede ?? "");
  formData.append("telefonoPubblico", valori.telefonoPubblico ?? "");
  formData.append("emailPubblica", valori.emailPubblica ?? "");
  return formData;
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  salvaEmailSegreteriaMock.mockReset();
  salvaEmailSegreteriaMock.mockResolvedValue(undefined);
  salvaUrlPaginaFacebookMock.mockReset();
  salvaUrlPaginaFacebookMock.mockResolvedValue(undefined);
  salvaContattiPubbliciMock.mockReset();
  salvaContattiPubbliciMock.mockResolvedValue(undefined);
  salvaTokenFacebookMock.mockReset();
  salvaTokenFacebookMock.mockResolvedValue(undefined);
  leggiConfigurazioneSocialFacebookMock.mockReset();
  // Default: una configurazione esiste gia' - riflette lo scenario piu'
  // comune testato sotto (Admin che aggiorna, lascia il token vuoto per
  // non modificarlo). Il test dedicato "nessuna configurazione esistente"
  // sovrascrive esplicitamente questo default a null.
  leggiConfigurazioneSocialFacebookMock.mockResolvedValue({
    id: "c1",
    accessToken: "EAAG...esistente",
    ultimaLetturaOk: true,
    ultimoErrore: null,
  });
  caricaFotoHeroMock.mockReset();
  caricaFotoHeroMock.mockResolvedValue(undefined);
  caricaLogoPolisportivaMock.mockReset();
  caricaLogoPolisportivaMock.mockResolvedValue(undefined);
  salvaUrlSitoPolisportivaMock.mockReset();
  salvaUrlSitoPolisportivaMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
});

function buildFormDataSitoPolisportiva(valore: string) {
  const formData = new FormData();
  formData.append("urlSitoPolisportiva", valore);
  return formData;
}

function buildFormDataToken(valore: string) {
  const formData = new FormData();
  formData.append("accessToken", valore);
  return formData;
}

// Story 9.31: mirror di salvaNomeSettoreAction (app/(configurazione)/logo/actions.test.ts).
describe("salvaEmailSegreteriaAction (Server Action)", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin (AC #5)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await salvaEmailSegreteriaAction(
      undefined,
      buildFormData("segreteria@esempio.it")
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith("ADMIN");
    expect(salvaEmailSegreteriaMock).not.toHaveBeenCalled();
  });

  it("salva il valore fornito (trim applicato) e revalida /impostazioni (AC #2)", async () => {
    const result = await salvaEmailSegreteriaAction(
      undefined,
      buildFormData("  segreteria@esempio.it  ")
    );

    expect(result).toEqual({ success: true });
    expect(salvaEmailSegreteriaMock).toHaveBeenCalledWith("segreteria@esempio.it");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/impostazioni");
  });

  it("salva null quando il campo e' lasciato vuoto (rimuove la configurazione, AC #4)", async () => {
    const result = await salvaEmailSegreteriaAction(undefined, buildFormData("   "));

    expect(result).toEqual({ success: true });
    expect(salvaEmailSegreteriaMock).toHaveBeenCalledWith(null);
  });

  it("returns VALIDATION per un formato email non plausibile (AC #4)", async () => {
    const result = await salvaEmailSegreteriaAction(
      undefined,
      buildFormData("non-e-una-email")
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Indirizzo email non valido." },
    });
    expect(salvaEmailSegreteriaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION oltre i 254 caratteri (AC #4)", async () => {
    const valoreTroppoLungo = `${"x".repeat(250)}@a.it`;

    const result = await salvaEmailSegreteriaAction(
      undefined,
      buildFormData(valoreTroppoLungo)
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "L'indirizzo email supera i 254 caratteri.",
      },
    });
    expect(salvaEmailSegreteriaMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando salvaEmailSegreteria lancia", async () => {
    salvaEmailSegreteriaMock.mockRejectedValue(new Error("db down"));

    const result = await salvaEmailSegreteriaAction(
      undefined,
      buildFormData("segreteria@esempio.it")
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile salvare l'Email Segreteria. Riprova." },
    });
  });
});

// Story 18.5.
describe("salvaUrlPaginaFacebookAction (Server Action)", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Dirigente (AC #1)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await salvaUrlPaginaFacebookAction(
      undefined,
      buildFormDataFacebook("https://www.facebook.com/miasocieta")
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    // Review fix: questo toHaveBeenCalledWith e' l'unica verifica reale
    // dell'array a due Ruoli (a differenza di salvaEmailSegreteriaAction,
    // ADMIN-only) - requireRuolo e' mockato per intero, quindi nessun test
    // di questo file puo' simulare la logica di risoluzione Ruolo reale
    // (gia' testata a parte in require-ruolo.test.ts); un test separato
    // "allows DIRIGENTE" con la mock di default (autorizza sempre) sarebbe
    // stato fuorviante - rimosso.
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(salvaUrlPaginaFacebookMock).not.toHaveBeenCalled();
  });

  it("salva il valore fornito (trim applicato) e revalida /impostazioni (AC #1)", async () => {
    const result = await salvaUrlPaginaFacebookAction(
      undefined,
      buildFormDataFacebook("  https://www.facebook.com/miasocieta  ")
    );

    expect(result).toEqual({ success: true });
    expect(salvaUrlPaginaFacebookMock).toHaveBeenCalledWith(
      "https://www.facebook.com/miasocieta"
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/impostazioni");
  });

  it("salva null quando il campo e' lasciato vuoto (rimuove la configurazione, AC #3)", async () => {
    const result = await salvaUrlPaginaFacebookAction(
      undefined,
      buildFormDataFacebook("   ")
    );

    expect(result).toEqual({ success: true });
    expect(salvaUrlPaginaFacebookMock).toHaveBeenCalledWith(null);
  });

  it("returns VALIDATION per un URL senza protocollo http/https", async () => {
    const result = await salvaUrlPaginaFacebookAction(
      undefined,
      buildFormDataFacebook("javascript:alert(1)")
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "URL non valido (deve iniziare con http:// o https:// ed essere entro 500 caratteri).",
      },
    });
    expect(salvaUrlPaginaFacebookMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un URL con protocollo data:", async () => {
    const result = await salvaUrlPaginaFacebookAction(
      undefined,
      buildFormDataFacebook("data:text/html,<script>alert(1)</script>")
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "URL non valido (deve iniziare con http:// o https:// ed essere entro 500 caratteri).",
      },
    });
    expect(salvaUrlPaginaFacebookMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un URL non parsabile", async () => {
    const result = await salvaUrlPaginaFacebookAction(
      undefined,
      buildFormDataFacebook("non-un-url")
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "URL non valido (deve iniziare con http:// o https:// ed essere entro 500 caratteri).",
      },
    });
    expect(salvaUrlPaginaFacebookMock).not.toHaveBeenCalled();
  });

  // Review fix: confine esatto (500 accettato, 501 rifiutato) invece di un
  // solo valore ben oltre il limite - un off-by-one in
  // LUNGHEZZA_MASSIMA_LINK_ESTERNO (">" invece di ">=" o viceversa) non
  // sarebbe mai stato rilevato dal test precedente.
  it("accepts a URL of exactly 500 characters (confine esatto)", async () => {
    const prefisso = "https://www.facebook.com/";
    const valoreAlLimite = `${prefisso}${"x".repeat(500 - prefisso.length)}`;
    expect(valoreAlLimite.length).toBe(500);

    const result = await salvaUrlPaginaFacebookAction(
      undefined,
      buildFormDataFacebook(valoreAlLimite)
    );

    expect(result).toEqual({ success: true });
    expect(salvaUrlPaginaFacebookMock).toHaveBeenCalledWith(valoreAlLimite);
  });

  it("returns VALIDATION at 501 characters (confine esatto)", async () => {
    const prefisso = "https://www.facebook.com/";
    const valoreTroppoLungo = `${prefisso}${"x".repeat(501 - prefisso.length)}`;
    expect(valoreTroppoLungo.length).toBe(501);

    const result = await salvaUrlPaginaFacebookAction(
      undefined,
      buildFormDataFacebook(valoreTroppoLungo)
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "URL non valido (deve iniziare con http:// o https:// ed essere entro 500 caratteri).",
      },
    });
    expect(salvaUrlPaginaFacebookMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando salvaUrlPaginaFacebook lancia", async () => {
    salvaUrlPaginaFacebookMock.mockRejectedValue(new Error("db down"));

    const result = await salvaUrlPaginaFacebookAction(
      undefined,
      buildFormDataFacebook("https://www.facebook.com/miasocieta")
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile salvare la Pagina Facebook. Riprova." },
    });
  });
});

// Story 18.11.
describe("salvaContattiPubbliciAction (Server Action)", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Dirigente/Site manager (AC #1, Story 19.1)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await salvaContattiPubbliciAction(
      undefined,
      buildFormDataContatti({ indirizzoSede: "Via dello Sport 1" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE", "SITE_MANAGER"]);
    expect(salvaContattiPubbliciMock).not.toHaveBeenCalled();
  });

  // Story 19.1: SITE_MANAGER e' l'unico Ruolo aggiunto a questa action -
  // requireRuolo e' mockato, quindi questo test verifica solo che l'action
  // chiami requireRuolo con l'array esteso e proceda al salvataggio quando
  // il mock lascia passare (comportamento identico ad ADMIN/DIRIGENTE).
  it("salva i contatti quando il chiamante ha solo SITE_MANAGER", async () => {
    requireRuoloMock.mockResolvedValue(null);

    const result = await salvaContattiPubbliciAction(
      undefined,
      buildFormDataContatti({ indirizzoSede: "Via dello Sport 1" })
    );

    expect(result).toEqual({ success: true });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE", "SITE_MANAGER"]);
    expect(salvaContattiPubbliciMock).toHaveBeenCalledWith({
      indirizzoSede: "Via dello Sport 1",
      telefonoPubblico: null,
      emailPubblica: null,
    });
  });

  it("salva i 3 valori forniti (trim applicato) e revalida /impostazioni (AC #1)", async () => {
    const result = await salvaContattiPubbliciAction(
      undefined,
      buildFormDataContatti({
        indirizzoSede: "  Via dello Sport 1  ",
        telefonoPubblico: "  +39 012 3456789  ",
        emailPubblica: "  info@esempio.it  ",
      })
    );

    expect(result).toEqual({ success: true });
    expect(salvaContattiPubbliciMock).toHaveBeenCalledWith({
      indirizzoSede: "Via dello Sport 1",
      telefonoPubblico: "+39 012 3456789",
      emailPubblica: "info@esempio.it",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/impostazioni");
  });

  it("salva null per tutti e 3 quando ogni campo e' lasciato vuoto", async () => {
    const result = await salvaContattiPubbliciAction(undefined, buildFormDataContatti({}));

    expect(result).toEqual({ success: true });
    expect(salvaContattiPubbliciMock).toHaveBeenCalledWith({
      indirizzoSede: null,
      telefonoPubblico: null,
      emailPubblica: null,
    });
  });

  it("lascia un solo campo vuoto (null) mentre gli altri due restano quelli forniti - campi indipendenti", async () => {
    const result = await salvaContattiPubbliciAction(
      undefined,
      buildFormDataContatti({
        indirizzoSede: "Via dello Sport 1",
        telefonoPubblico: "",
        emailPubblica: "info@esempio.it",
      })
    );

    expect(result).toEqual({ success: true });
    expect(salvaContattiPubbliciMock).toHaveBeenCalledWith({
      indirizzoSede: "Via dello Sport 1",
      telefonoPubblico: null,
      emailPubblica: "info@esempio.it",
    });
  });

  it("returns VALIDATION per un indirizzo oltre i 300 caratteri", async () => {
    const result = await salvaContattiPubbliciAction(
      undefined,
      buildFormDataContatti({ indirizzoSede: "x".repeat(301) })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'indirizzo supera i 300 caratteri." },
    });
    expect(salvaContattiPubbliciMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un telefono oltre i 30 caratteri", async () => {
    const result = await salvaContattiPubbliciAction(
      undefined,
      buildFormDataContatti({ telefonoPubblico: "0".repeat(31) })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il telefono supera i 30 caratteri." },
    });
    expect(salvaContattiPubbliciMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un telefono con caratteri non ammessi", async () => {
    const result = await salvaContattiPubbliciAction(
      undefined,
      buildFormDataContatti({ telefonoPubblico: "chiamami!" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Numero di telefono non valido." },
    });
    expect(salvaContattiPubbliciMock).not.toHaveBeenCalled();
  });

  it("accepts un telefono con cifre, spazi e + - ( ) . /", async () => {
    const result = await salvaContattiPubbliciAction(
      undefined,
      buildFormDataContatti({ telefonoPubblico: "+39 (012) 345-6789" })
    );

    expect(result).toEqual({ success: true });
  });

  it("returns VALIDATION per un'email pubblica non plausibile", async () => {
    const result = await salvaContattiPubbliciAction(
      undefined,
      buildFormDataContatti({ emailPubblica: "non-e-una-email" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Indirizzo email non valido." },
    });
    expect(salvaContattiPubbliciMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un'email pubblica oltre i 254 caratteri", async () => {
    const valoreTroppoLungo = `${"x".repeat(250)}@a.it`;

    const result = await salvaContattiPubbliciAction(
      undefined,
      buildFormDataContatti({ emailPubblica: valoreTroppoLungo })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "L'indirizzo email supera i 254 caratteri.",
      },
    });
    expect(salvaContattiPubbliciMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando salvaContattiPubblici lancia", async () => {
    salvaContattiPubbliciMock.mockRejectedValue(new Error("db down"));

    const result = await salvaContattiPubbliciAction(
      undefined,
      buildFormDataContatti({ indirizzoSede: "Via dello Sport 1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile salvare i Contatti pubblici. Riprova." },
    });
  });
});

// Story 18.13.
describe("salvaTokenFacebookAction (Server Action)", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Dirigente (AC #6)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await salvaTokenFacebookAction(
      undefined,
      buildFormDataToken("EAAG...nuovo")
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(salvaTokenFacebookMock).not.toHaveBeenCalled();
  });

  it("salva il valore fornito (trim applicato) e revalida /impostazioni (AC #6)", async () => {
    const result = await salvaTokenFacebookAction(
      undefined,
      buildFormDataToken("  EAAG...nuovo  ")
    );

    expect(result).toEqual({ success: true });
    expect(salvaTokenFacebookMock).toHaveBeenCalledWith(supabaseClientFinto, "EAAG...nuovo");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/impostazioni");
  });

  it("valore vuoto = successo SENZA modificare il token esistente (a differenza di Pagina Facebook/Contatti, un segreto non va mai svuotato per errore)", async () => {
    const result = await salvaTokenFacebookAction(undefined, buildFormDataToken("   "));

    expect(result).toEqual({ success: true });
    expect(salvaTokenFacebookMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION oltre i 512 caratteri", async () => {
    const result = await salvaTokenFacebookAction(
      undefined,
      buildFormDataToken("x".repeat(513))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il token supera i 512 caratteri." },
    });
    expect(salvaTokenFacebookMock).not.toHaveBeenCalled();
  });

  it("accepts un token di esattamente 512 caratteri (confine esatto)", async () => {
    const result = await salvaTokenFacebookAction(
      undefined,
      buildFormDataToken("x".repeat(512))
    );

    expect(result).toEqual({ success: true });
    expect(salvaTokenFacebookMock).toHaveBeenCalledWith(supabaseClientFinto, "x".repeat(512));
  });

  it("returns INTERNAL fail-closed quando salvaTokenFacebook lancia", async () => {
    salvaTokenFacebookMock.mockRejectedValue(new Error("db down"));

    const result = await salvaTokenFacebookAction(
      undefined,
      buildFormDataToken("EAAG...nuovo")
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile salvare il Token Facebook. Riprova." },
    });
  });

  // Fix code review: prima un submit vuoto restituiva sempre successo,
  // anche senza alcuna configurazione esistente da "non modificare" -
  // bypassabile senza JS/con un POST diretto, ignorando l'attributo HTML
  // required (che dipende dal client). Mirror del controllo gia' fatto da
  // salvaConfigurazione (SMTP) prima di accettare una password vuota.
  it("returns VALIDATION su submit vuoto quando nessun token e' mai stato configurato", async () => {
    leggiConfigurazioneSocialFacebookMock.mockResolvedValue(null);

    const result = await salvaTokenFacebookAction(undefined, buildFormDataToken("   "));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il token è obbligatorio al primo salvataggio." },
    });
    expect(salvaTokenFacebookMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando la verifica della configurazione esistente lancia (submit vuoto)", async () => {
    leggiConfigurazioneSocialFacebookMock.mockRejectedValue(new Error("db down"));

    const result = await salvaTokenFacebookAction(undefined, buildFormDataToken(""));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile salvare il Token Facebook. Riprova." },
    });
  });
});

// Story 18.14: mirror di caricaLogoAction (app/(configurazione)/logo/actions.test.ts)
// - stessa sequenza di validazione, ma requireRuolo ammette anche DIRIGENTE
// (AC #2).
describe("caricaFotoHeroAction (Server Action)", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin ne' Dirigente (AC #2)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await caricaFotoHeroAction(
      undefined,
      buildFormDataFotoHero(fileFotoHeroValido())
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(caricaFotoHeroMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando nessun file e' fornito", async () => {
    const result = await caricaFotoHeroAction(undefined, buildFormDataFotoHero(null));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un'immagine da caricare." },
    });
    expect(caricaFotoHeroMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un file vuoto (size 0)", async () => {
    const result = await caricaFotoHeroAction(
      undefined,
      buildFormDataFotoHero(fileFotoHeroValido("foto-hero.png", "image/png", 0))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un'immagine da caricare." },
    });
    expect(caricaFotoHeroMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un tipo MIME non ammesso", async () => {
    const result = await caricaFotoHeroAction(
      undefined,
      buildFormDataFotoHero(fileFotoHeroValido("foto-hero.svg", "image/svg+xml"))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato immagine non ammesso (solo PNG, JPG)." },
    });
    expect(caricaFotoHeroMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando il file supera i 2MB", async () => {
    const result = await caricaFotoHeroAction(
      undefined,
      buildFormDataFotoHero(
        fileFotoHeroValido("foto-hero.png", "image/png", 2 * 1024 * 1024 + 1)
      )
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il file supera la dimensione massima di 2MB." },
    });
    expect(caricaFotoHeroMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando le magic byte non corrispondono al MIME dichiarato (AC #1)", async () => {
    const fileIngannevole = new File([new Uint8Array(1024)], "falso.png", {
      type: "image/png",
    });

    const result = await caricaFotoHeroAction(undefined, buildFormDataFotoHero(fileIngannevole));

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    });
    expect(caricaFotoHeroMock).not.toHaveBeenCalled();
  });

  it("accetta ADMIN, chiama caricaFotoHero e revalida /app/impostazioni (AC #1)", async () => {
    const png = fileFotoHeroValido("foto-hero.png", "image/png");
    const result = await caricaFotoHeroAction(undefined, buildFormDataFotoHero(png));

    expect(result).toEqual({ success: true });
    expect(caricaFotoHeroMock).toHaveBeenCalledWith(supabaseClientFinto, png);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/impostazioni");
  });

  it("accetta DIRIGENTE (AC #2, non ADMIN-only come il logo)", async () => {
    const jpeg = fileFotoHeroValido("foto-hero.jpg", "image/jpeg");
    const result = await caricaFotoHeroAction(undefined, buildFormDataFotoHero(jpeg));

    expect(result).toEqual({ success: true });
    // Review fix (code review, Acceptance Auditor): il test precedente
    // verificava solo l'happy-path col mock di default "tutto permesso",
    // senza provare nulla di diverso dal test ADMIN sopra - questa
    // asserzione verifica che il perimetro di Ruoli richiesto sia
    // esplicitamente ["ADMIN", "DIRIGENTE"] (AC #2), non solo che un mock
    // permissivo lasci passare la richiesta.
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
  });

  it("returns INTERNAL fail-closed quando caricaFotoHero lancia (incluso un rifiuto RLS)", async () => {
    caricaFotoHeroMock.mockRejectedValue(new Error("RLS denial"));

    const result = await caricaFotoHeroAction(
      undefined,
      buildFormDataFotoHero(fileFotoHeroValido())
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile caricare la foto. Riprova." },
    });
  });
});

// Story 18.20: mirror esatto di caricaFotoHeroAction sopra (Story 18.14).
describe("caricaLogoPolisportivaAction (Server Action)", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin ne' Dirigente (AC #3)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await caricaLogoPolisportivaAction(
      undefined,
      buildFormDataFotoHero(fileFotoHeroValido())
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(caricaLogoPolisportivaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando nessun file e' fornito", async () => {
    const result = await caricaLogoPolisportivaAction(undefined, buildFormDataFotoHero(null));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un'immagine da caricare." },
    });
    expect(caricaLogoPolisportivaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un file vuoto (size 0)", async () => {
    const result = await caricaLogoPolisportivaAction(
      undefined,
      buildFormDataFotoHero(fileFotoHeroValido("logo-polisportiva.png", "image/png", 0))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un'immagine da caricare." },
    });
    expect(caricaLogoPolisportivaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un tipo MIME non ammesso", async () => {
    const result = await caricaLogoPolisportivaAction(
      undefined,
      buildFormDataFotoHero(fileFotoHeroValido("logo-polisportiva.svg", "image/svg+xml"))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato immagine non ammesso (solo PNG, JPG)." },
    });
    expect(caricaLogoPolisportivaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando il file supera i 2MB", async () => {
    const result = await caricaLogoPolisportivaAction(
      undefined,
      buildFormDataFotoHero(
        fileFotoHeroValido("logo-polisportiva.png", "image/png", 2 * 1024 * 1024 + 1)
      )
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il file supera la dimensione massima di 2MB." },
    });
    expect(caricaLogoPolisportivaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando le magic byte non corrispondono al MIME dichiarato (AC #1)", async () => {
    const fileIngannevole = new File([new Uint8Array(1024)], "falso.png", {
      type: "image/png",
    });

    const result = await caricaLogoPolisportivaAction(
      undefined,
      buildFormDataFotoHero(fileIngannevole)
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    });
    expect(caricaLogoPolisportivaMock).not.toHaveBeenCalled();
  });

  it("accetta ADMIN, chiama caricaLogoPolisportiva e revalida /app/impostazioni (AC #1)", async () => {
    const png = fileFotoHeroValido("logo-polisportiva.png", "image/png");
    const result = await caricaLogoPolisportivaAction(undefined, buildFormDataFotoHero(png));

    expect(result).toEqual({ success: true });
    expect(caricaLogoPolisportivaMock).toHaveBeenCalledWith(supabaseClientFinto, png);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/impostazioni");
  });

  it("accetta DIRIGENTE (AC #3, non ADMIN-only come il logo del Settore)", async () => {
    const jpeg = fileFotoHeroValido("logo-polisportiva.jpg", "image/jpeg");
    const result = await caricaLogoPolisportivaAction(undefined, buildFormDataFotoHero(jpeg));

    expect(result).toEqual({ success: true });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
  });

  it("returns INTERNAL fail-closed quando caricaLogoPolisportiva lancia (incluso un rifiuto RLS)", async () => {
    caricaLogoPolisportivaMock.mockRejectedValue(new Error("RLS denial"));

    const result = await caricaLogoPolisportivaAction(
      undefined,
      buildFormDataFotoHero(fileFotoHeroValido())
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile caricare il logo. Riprova." },
    });
  });
});

// Story 18.20: mirror esatto di salvaUrlPaginaFacebookAction (Story 18.5).
describe("salvaUrlSitoPolisportivaAction (Server Action)", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Dirigente (AC #3)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await salvaUrlSitoPolisportivaAction(
      undefined,
      buildFormDataSitoPolisportiva("https://www.polisportiva-esempio.it")
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(salvaUrlSitoPolisportivaMock).not.toHaveBeenCalled();
  });

  it("salva il valore fornito (trim applicato) e revalida /impostazioni (AC #2)", async () => {
    const result = await salvaUrlSitoPolisportivaAction(
      undefined,
      buildFormDataSitoPolisportiva("  https://www.polisportiva-esempio.it  ")
    );

    expect(result).toEqual({ success: true });
    expect(salvaUrlSitoPolisportivaMock).toHaveBeenCalledWith(
      "https://www.polisportiva-esempio.it"
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/impostazioni");
  });

  it("salva null quando il campo e' lasciato vuoto (rimuove la configurazione, AC #2)", async () => {
    const result = await salvaUrlSitoPolisportivaAction(
      undefined,
      buildFormDataSitoPolisportiva("   ")
    );

    expect(result).toEqual({ success: true });
    expect(salvaUrlSitoPolisportivaMock).toHaveBeenCalledWith(null);
  });

  it("returns VALIDATION per un URL senza protocollo http/https", async () => {
    const result = await salvaUrlSitoPolisportivaAction(
      undefined,
      buildFormDataSitoPolisportiva("javascript:alert(1)")
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "URL non valido (deve iniziare con http:// o https:// ed essere entro 500 caratteri).",
      },
    });
    expect(salvaUrlSitoPolisportivaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un URL non parsabile", async () => {
    const result = await salvaUrlSitoPolisportivaAction(
      undefined,
      buildFormDataSitoPolisportiva("non-un-url")
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "URL non valido (deve iniziare con http:// o https:// ed essere entro 500 caratteri).",
      },
    });
    expect(salvaUrlSitoPolisportivaMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando salvaUrlSitoPolisportiva lancia", async () => {
    salvaUrlSitoPolisportivaMock.mockRejectedValue(new Error("db down"));

    const result = await salvaUrlSitoPolisportivaAction(
      undefined,
      buildFormDataSitoPolisportiva("https://www.polisportiva-esempio.it")
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare il sito della Polisportiva. Riprova.",
      },
    });
  });
});
