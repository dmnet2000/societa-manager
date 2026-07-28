import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  BUCKET_FOTO_ATLETA,
  BUCKET_FOTO_ALLENATORE,
  MIME_AMMESSI_FOTO,
  DIMENSIONE_MASSIMA_FOTO_BYTE,
  contenutoCorrispondeAlMimeDichiaratoFoto,
  caricaFotoProfilo,
  esisteFotoProfilo,
  generaUrlFirmatoFotoProfilo,
} from "./foto-profilo";

function buildFakeSupabase() {
  const uploadMock = vi.fn();
  const listMock = vi.fn();
  const createSignedUrlMock = vi.fn();
  const from = vi.fn(() => ({
    upload: uploadMock,
    list: listMock,
    createSignedUrl: createSignedUrlMock,
  }));
  return {
    supabase: { storage: { from } } as unknown as import("@supabase/supabase-js").SupabaseClient,
    from,
    uploadMock,
    listMock,
    createSignedUrlMock,
  };
}

function buildFile(mime: string, bytes: number[]): File {
  return new File([new Uint8Array(bytes)], "foto.bin", { type: mime });
}

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0x00, 0x00];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00];

describe("costanti", () => {
  it("espone bucket e vincoli attesi", () => {
    expect(BUCKET_FOTO_ATLETA).toBe("foto-profilo-atlete");
    expect(BUCKET_FOTO_ALLENATORE).toBe("foto-profilo-allenatori");
    expect(MIME_AMMESSI_FOTO).toEqual(["image/jpeg", "image/png"]);
    expect(DIMENSIONE_MASSIMA_FOTO_BYTE).toBe(5 * 1024 * 1024);
  });
});

describe("contenutoCorrispondeAlMimeDichiaratoFoto", () => {
  it("riconosce un JPEG valido", async () => {
    const file = buildFile("image/jpeg", JPEG_HEADER);
    expect(await contenutoCorrispondeAlMimeDichiaratoFoto(file)).toBe(true);
  });

  it("riconosce un PNG valido", async () => {
    const file = buildFile("image/png", PNG_HEADER);
    expect(await contenutoCorrispondeAlMimeDichiaratoFoto(file)).toBe(true);
  });

  it("rifiuta un contenuto che non corrisponde al mime dichiarato", async () => {
    const file = buildFile("image/png", JPEG_HEADER);
    expect(await contenutoCorrispondeAlMimeDichiaratoFoto(file)).toBe(false);
  });

  it("rifiuta un mime non ammesso", async () => {
    const file = buildFile("application/pdf", [0x25, 0x50, 0x44, 0x46]);
    expect(await contenutoCorrispondeAlMimeDichiaratoFoto(file)).toBe(false);
  });
});

describe("caricaFotoProfilo", () => {
  it("carica con path fisso {entitaId}/foto, upsert:true e contentType esplicito", async () => {
    const { supabase, from, uploadMock } = buildFakeSupabase();
    uploadMock.mockResolvedValue({ error: null });
    const file = buildFile("image/jpeg", JPEG_HEADER);

    await caricaFotoProfilo(supabase, BUCKET_FOTO_ATLETA, "atleta-1", file);

    expect(from).toHaveBeenCalledWith(BUCKET_FOTO_ATLETA);
    expect(uploadMock).toHaveBeenCalledWith("atleta-1/foto", file, {
      upsert: true,
      contentType: "image/jpeg",
    });
  });

  it("lancia se l'upload fallisce", async () => {
    const { supabase, uploadMock } = buildFakeSupabase();
    uploadMock.mockResolvedValue({ error: { message: "boom" } });
    const file = buildFile("image/jpeg", JPEG_HEADER);

    await expect(
      caricaFotoProfilo(supabase, BUCKET_FOTO_ATLETA, "atleta-1", file)
    ).rejects.toThrow("boom");
  });
});

describe("esisteFotoProfilo", () => {
  it("restituisce esiste:true con aggiornatoIl quando l'oggetto e' presente", async () => {
    const { supabase, listMock } = buildFakeSupabase();
    listMock.mockResolvedValue({
      data: [{ name: "foto", updated_at: "2026-07-28T00:00:00.000Z" }],
      error: null,
    });

    const risultato = await esisteFotoProfilo(supabase, BUCKET_FOTO_ATLETA, "atleta-1");

    expect(listMock).toHaveBeenCalledWith("atleta-1", { search: "foto" });
    expect(risultato).toEqual({ esiste: true, aggiornatoIl: "2026-07-28T00:00:00.000Z" });
  });

  it("restituisce esiste:false quando nessun oggetto e' presente", async () => {
    const { supabase, listMock } = buildFakeSupabase();
    listMock.mockResolvedValue({ data: [], error: null });

    const risultato = await esisteFotoProfilo(supabase, BUCKET_FOTO_ATLETA, "atleta-1");

    expect(risultato).toEqual({ esiste: false, aggiornatoIl: null });
  });

  it("lancia se list() fallisce", async () => {
    const { supabase, listMock } = buildFakeSupabase();
    listMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(
      esisteFotoProfilo(supabase, BUCKET_FOTO_ATLETA, "atleta-1")
    ).rejects.toThrow("boom");
  });
});

describe("generaUrlFirmatoFotoProfilo", () => {
  it("genera l'URL firmato per il path {entitaId}/foto", async () => {
    const { supabase, createSignedUrlMock } = buildFakeSupabase();
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: "https://esempio.it/firmato" },
      error: null,
    });

    const url = await generaUrlFirmatoFotoProfilo(supabase, BUCKET_FOTO_ATLETA, "atleta-1");

    expect(createSignedUrlMock).toHaveBeenCalledWith("atleta-1/foto", 300);
    expect(url).toBe("https://esempio.it/firmato");
  });

  it("lancia se la generazione fallisce", async () => {
    const { supabase, createSignedUrlMock } = buildFakeSupabase();
    createSignedUrlMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(
      generaUrlFirmatoFotoProfilo(supabase, BUCKET_FOTO_ATLETA, "atleta-1")
    ).rejects.toThrow("boom");
  });
});
