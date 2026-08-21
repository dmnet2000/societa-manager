import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const aggiornaDescrizioneStaffMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/staff-descrizioni", () => ({
  aggiornaDescrizioneStaff: aggiornaDescrizioneStaffMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { aggiornaDescrizioneStaffAction } = await import("./actions");

function buildFormData(fields: Record<string, string> = {}) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  aggiornaDescrizioneStaffMock.mockReset();
  aggiornaDescrizioneStaffMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
});

describe("aggiornaDescrizioneStaffAction", () => {
  it("returns FORBIDDEN se il chiamante non e' Site Manager/Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaDescrizioneStaffAction(
      undefined,
      buildFormData({ allenatoreId: "a1", descrizione: "Ciao", ruoliAggiuntivi: "[]" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["SITE_MANAGER", "ADMIN", "DIRIGENTE"]);
    expect(aggiornaDescrizioneStaffMock).not.toHaveBeenCalled();
  });

  it("aggiorna descrizione e ruoli aggiuntivi (trim applicato) e revalida /app/staff-descrizioni", async () => {
    const result = await aggiornaDescrizioneStaffAction(
      undefined,
      buildFormData({
        allenatoreId: "a1",
        descrizione: "  Allena da 10 anni  ",
        ruoliAggiuntivi: JSON.stringify(["  Team Manager  ", "Preparatore Atletico"]),
      })
    );

    expect(result).toEqual({ success: true });
    expect(aggiornaDescrizioneStaffMock).toHaveBeenCalledWith("a1", {
      descrizione: "Allena da 10 anni",
      ruoliAggiuntivi: ["Team Manager", "Preparatore Atletico"],
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/staff-descrizioni");
  });

  it("salva descrizione null quando il campo e' vuoto/solo spazi", async () => {
    const result = await aggiornaDescrizioneStaffAction(
      undefined,
      buildFormData({ allenatoreId: "a1", descrizione: "   ", ruoliAggiuntivi: "[]" })
    );

    expect(result).toEqual({ success: true });
    expect(aggiornaDescrizioneStaffMock).toHaveBeenCalledWith("a1", {
      descrizione: null,
      ruoliAggiuntivi: [],
    });
  });

  it("rimuove un ruolo aggiuntivo esistente (array inviato senza quella voce, le altre invariate)", async () => {
    // Simula lo stato post-rimozione costruito lato client (DescrizioneStaffForm.tsx):
    // partiva da 3 etichette, ne e' stata tolta una - qui si verifica che le
    // altre 2 arrivino intatte e nell'ordine originale, non solo che un
    // array a un elemento venga salvato cosi' com'e'.
    const result = await aggiornaDescrizioneStaffAction(
      undefined,
      buildFormData({
        allenatoreId: "a1",
        descrizione: "",
        ruoliAggiuntivi: JSON.stringify(["Team Manager", "Segretario"]),
      })
    );

    expect(result).toEqual({ success: true });
    expect(aggiornaDescrizioneStaffMock).toHaveBeenCalledWith("a1", {
      descrizione: null,
      ruoliAggiuntivi: ["Team Manager", "Segretario"],
    });
  });

  it("returns VALIDATION se allenatoreId e' mancante/vuoto", async () => {
    const result = await aggiornaDescrizioneStaffAction(
      undefined,
      buildFormData({ allenatoreId: "", descrizione: "", ruoliAggiuntivi: "[]" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Allenatore non valido." },
    });
    expect(aggiornaDescrizioneStaffMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION se ruoliAggiuntivi non e' un JSON valido", async () => {
    const result = await aggiornaDescrizioneStaffAction(
      undefined,
      buildFormData({ allenatoreId: "a1", descrizione: "", ruoliAggiuntivi: "non-json" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Elenco ruoli aggiuntivi non valido." },
    });
    expect(aggiornaDescrizioneStaffMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION se ruoliAggiuntivi non e' un array di stringhe", async () => {
    const result = await aggiornaDescrizioneStaffAction(
      undefined,
      buildFormData({
        allenatoreId: "a1",
        descrizione: "",
        ruoliAggiuntivi: JSON.stringify([1, 2, 3]),
      })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Elenco ruoli aggiuntivi non valido." },
    });
    expect(aggiornaDescrizioneStaffMock).not.toHaveBeenCalled();
  });

  // I/O & Edge-Case Matrix (spec): "Etichetta ruolo aggiuntivo vuota/solo
  // spazi" -> rifiutata, VALIDATION - il vero cancello e' la Server Action
  // (DescrizioneStaffForm.tsx impedisce gia' di aggiungerla lato client, ma
  // un client bypassato non deve poter aggirare questo controllo).
  it("returns VALIDATION se un'etichetta di ruoliAggiuntivi e' vuota/solo spazi", async () => {
    const result = await aggiornaDescrizioneStaffAction(
      undefined,
      buildFormData({
        allenatoreId: "a1",
        descrizione: "",
        ruoliAggiuntivi: JSON.stringify(["Team Manager", "   "]),
      })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Un ruolo aggiuntivo non può essere vuoto." },
    });
    expect(aggiornaDescrizioneStaffMock).not.toHaveBeenCalled();
  });

  it("accetta un'etichetta di ruoliAggiuntivi esattamente a 40 caratteri (boundary)", async () => {
    const result = await aggiornaDescrizioneStaffAction(
      undefined,
      buildFormData({
        allenatoreId: "a1",
        descrizione: "",
        ruoliAggiuntivi: JSON.stringify(["x".repeat(40)]),
      })
    );

    expect(result).toEqual({ success: true });
    expect(aggiornaDescrizioneStaffMock).toHaveBeenCalledWith("a1", {
      descrizione: null,
      ruoliAggiuntivi: ["x".repeat(40)],
    });
  });

  it("returns VALIDATION se un'etichetta di ruoliAggiuntivi supera i 40 caratteri", async () => {
    const result = await aggiornaDescrizioneStaffAction(
      undefined,
      buildFormData({
        allenatoreId: "a1",
        descrizione: "",
        ruoliAggiuntivi: JSON.stringify(["x".repeat(41)]),
      })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Un ruolo aggiuntivo supera i 40 caratteri." },
    });
    expect(aggiornaDescrizioneStaffMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando aggiornaDescrizioneStaff lancia", async () => {
    aggiornaDescrizioneStaffMock.mockRejectedValue(new Error("db down"));

    const result = await aggiornaDescrizioneStaffAction(
      undefined,
      buildFormData({ allenatoreId: "a1", descrizione: "Ciao", ruoliAggiuntivi: "[]" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare i dati dello Staff. Riprova." },
    });
  });
});
