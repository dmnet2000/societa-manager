import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const salvaEmailSegreteriaMock = vi.fn();
const salvaUrlPaginaFacebookMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/configurazione-applicazione", () => ({
  salvaEmailSegreteria: salvaEmailSegreteriaMock,
  salvaUrlPaginaFacebook: salvaUrlPaginaFacebookMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { salvaEmailSegreteriaAction, salvaUrlPaginaFacebookAction } = await import(
  "./actions"
);

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

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  salvaEmailSegreteriaMock.mockReset();
  salvaEmailSegreteriaMock.mockResolvedValue(undefined);
  salvaUrlPaginaFacebookMock.mockReset();
  salvaUrlPaginaFacebookMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
});

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
