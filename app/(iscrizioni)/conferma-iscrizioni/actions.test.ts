import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const createClientMock = vi.fn();
const risolviAnnoAgonisticoCorrenteMock = vi.fn();
const inserisciIscrizioneMock = vi.fn();
const disattivaIscrizioneMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/anno-agonistico", () => ({
  risolviAnnoAgonisticoCorrente: risolviAnnoAgonisticoCorrenteMock,
}));

vi.mock("@/lib/db-rls/iscrizione", () => ({
  inserisciIscrizione: inserisciIscrizioneMock,
  disattivaIscrizione: disattivaIscrizioneMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { confermaIscrizione, escludiIscrizione } = await import("./actions");

describe("confermaIscrizione (Server Action)", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    createClientMock.mockReset();
    createClientMock.mockResolvedValue({ marker: "supabase-client" });
    risolviAnnoAgonisticoCorrenteMock.mockReset();
    inserisciIscrizioneMock.mockReset();
    disattivaIscrizioneMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and does nothing if the caller is not Segreteria", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await confermaIscrizione(undefined, "atleta-1");

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith("SEGRETERIA");
    expect(risolviAnnoAgonisticoCorrenteMock).not.toHaveBeenCalled();
  });

  it("resolves the current AnnoAgonistico and confirms the Iscrizione (AC #2, #3)", async () => {
    risolviAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    inserisciIscrizioneMock.mockResolvedValue(undefined);

    const result = await confermaIscrizione(undefined, "atleta-1");

    expect(result).toEqual({ success: true });
    expect(risolviAnnoAgonisticoCorrenteMock).toHaveBeenCalled();
    expect(inserisciIscrizioneMock).toHaveBeenCalledWith(
      { marker: "supabase-client" },
      "atleta-1",
      "anno-1"
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/conferma-iscrizioni");
  });

  it("returns a friendly error, no crash, when inserisciIscrizione fails", async () => {
    risolviAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    inserisciIscrizioneMock.mockRejectedValue(new Error("db down"));

    const result = await confermaIscrizione(undefined, "atleta-1");

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile confermare l'iscrizione. Riprova.",
      },
    });
  });

  it("returns a friendly error, no crash, when resolving the AnnoAgonistico fails", async () => {
    risolviAnnoAgonisticoCorrenteMock.mockRejectedValue(new Error("db down"));

    const result = await confermaIscrizione(undefined, "atleta-1");

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile confermare l'iscrizione. Riprova.",
      },
    });
    expect(inserisciIscrizioneMock).not.toHaveBeenCalled();
  });
});

describe("escludiIscrizione (Server Action)", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    createClientMock.mockReset();
    createClientMock.mockResolvedValue({ marker: "supabase-client" });
    disattivaIscrizioneMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente/Segreteria", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await escludiIscrizione(undefined, "iscrizione-1");

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith([
      "ADMIN",
      "DIRIGENTE",
      "SEGRETERIA",
    ]);
    expect(disattivaIscrizioneMock).not.toHaveBeenCalled();
  });

  it("excludes the Iscrizione (AC #4)", async () => {
    disattivaIscrizioneMock.mockResolvedValue(undefined);

    const result = await escludiIscrizione(undefined, "iscrizione-1");

    expect(result).toEqual({ success: true });
    expect(disattivaIscrizioneMock).toHaveBeenCalledWith(
      { marker: "supabase-client" },
      "iscrizione-1"
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/conferma-iscrizioni");
  });

  it("returns a friendly error, no crash, when disattivaIscrizione fails", async () => {
    disattivaIscrizioneMock.mockRejectedValue(new Error("not found"));

    const result = await escludiIscrizione(undefined, "iscrizione-1");

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile escludere l'iscrizione. Riprova.",
      },
    });
  });
});
