import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const salvaEmailSegreteriaMock = vi.fn();
const salvaUrlPaginaFacebookMock = vi.fn();
const salvaContattiPubbliciMock = vi.fn();
const salvaTokenFacebookMock = vi.fn();
const leggiConfigurazioneSocialFacebookMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/configurazione-applicazione", () => ({
  salvaEmailSegreteria: salvaEmailSegreteriaMock,
  salvaUrlPaginaFacebook: salvaUrlPaginaFacebookMock,
  salvaContattiPubblici: salvaContattiPubbliciMock,
}));

const supabaseClientFinto = { client: "finto" };
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(supabaseClientFinto)),
}));

vi.mock("@/lib/db-rls/configurazione-social-facebook", () => ({
  salvaTokenFacebook: salvaTokenFacebookMock,
  leggiConfigurazioneSocialFacebook: leggiConfigurazioneSocialFacebookMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const {
  salvaEmailSegreteriaAction,
  salvaUrlPaginaFacebookAction,
  salvaContattiPubbliciAction,
  salvaTokenFacebookAction,
} = await import("./actions");

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
  revalidatePathMock.mockReset();
});

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
  it("returns FORBIDDEN se il chiamante non e' Admin/Dirigente (AC #1)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await salvaContattiPubbliciAction(
      undefined,
      buildFormDataContatti({ indirizzoSede: "Via dello Sport 1" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(salvaContattiPubbliciMock).not.toHaveBeenCalled();
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
