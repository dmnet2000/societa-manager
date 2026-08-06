import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const salvaEmailSegreteriaMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/configurazione-applicazione", () => ({
  salvaEmailSegreteria: salvaEmailSegreteriaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { salvaEmailSegreteriaAction } = await import("./actions");

function buildFormData(valore: string) {
  const formData = new FormData();
  formData.append("emailSegreteria", valore);
  return formData;
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  salvaEmailSegreteriaMock.mockReset();
  salvaEmailSegreteriaMock.mockResolvedValue(undefined);
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/impostazioni");
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
