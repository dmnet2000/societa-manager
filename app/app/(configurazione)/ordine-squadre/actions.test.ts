import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const trovaAnnoAgonisticoCorrenteMock = vi.fn();
const elencaGruppiOrdinatiMock = vi.fn();
const riordinaGruppiMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/anno-agonistico", () => ({
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
}));

vi.mock("@/lib/ordine-squadre", () => ({
  elencaGruppiOrdinati: elencaGruppiOrdinatiMock,
  riordinaGruppi: riordinaGruppiMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { spostaGruppoAction } = await import("./actions");

function buildFormData(fields: Record<string, string> = {}) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

function gruppiFinti() {
  return [
    { id: "a", nome: "Under 13", ordine: 0 },
    { id: "b", nome: "Under 15", ordine: 1 },
    { id: "c", nome: "Under 17", ordine: 2 },
  ];
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  trovaAnnoAgonisticoCorrenteMock.mockReset();
  trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
  elencaGruppiOrdinatiMock.mockReset();
  elencaGruppiOrdinatiMock.mockResolvedValue(gruppiFinti());
  riordinaGruppiMock.mockReset();
  riordinaGruppiMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
});

describe("spostaGruppoAction", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Site Manager", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "b", direzione: "su" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "SITE_MANAGER"]);
    expect(elencaGruppiOrdinatiMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per una direzione non valida", async () => {
    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "b", direzione: "laterale" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Direzione non valida." },
    });
    expect(elencaGruppiOrdinatiMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION se non esiste una stagione corrente", async () => {
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(null);

    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "b", direzione: "su" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Nessuna stagione corrente trovata." },
    });
    expect(elencaGruppiOrdinatiMock).not.toHaveBeenCalled();
  });

  it("scambia con il Gruppo precedente su \"su\" e revalida /app/ordine-squadre e /squadre", async () => {
    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "b", direzione: "su" })
    );

    expect(result).toEqual({ success: true });
    expect(elencaGruppiOrdinatiMock).toHaveBeenCalledWith("anno-1");
    expect(riordinaGruppiMock).toHaveBeenCalledWith(["b", "a", "c"]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/ordine-squadre");
    expect(revalidatePathMock).toHaveBeenCalledWith("/squadre");
  });

  it("scambia con il Gruppo successivo su \"giu\"", async () => {
    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "b", direzione: "giu" })
    );

    expect(result).toEqual({ success: true });
    expect(riordinaGruppiMock).toHaveBeenCalledWith(["a", "c", "b"]);
  });

  it("e' un no-op (success) su \"su\" per il primo Gruppo - nessuna scrittura", async () => {
    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "a", direzione: "su" })
    );

    expect(result).toEqual({ success: true });
    expect(riordinaGruppiMock).not.toHaveBeenCalled();
  });

  it("e' un no-op (success) su \"giu\" per l'ultimo Gruppo - nessuna scrittura", async () => {
    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "c", direzione: "giu" })
    );

    expect(result).toEqual({ success: true });
    expect(riordinaGruppiMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION se l'id non corrisponde a nessun Gruppo", async () => {
    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "inesistente", direzione: "su" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato." },
    });
    expect(riordinaGruppiMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando riordinaGruppi lancia", async () => {
    riordinaGruppiMock.mockRejectedValue(new Error("db down"));

    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "b", direzione: "su" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile riordinare le squadre. Riprova." },
    });
  });
});
