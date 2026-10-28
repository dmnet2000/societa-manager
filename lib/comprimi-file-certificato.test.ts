import { afterEach, describe, expect, it, vi } from "vitest";
import {
  comprimiFileCertificato,
  comprimiFormDataCertificato,
  conCompressioneCertificato,
  pdfFirmato,
  deveComprimere,
  dimensioniRidotte,
  nomeFileJpeg,
  scalaPaginaPdf,
  scegliPiuPiccolo,
  tipoFileCertificato,
  SOGLIA_BYTE,
} from "./comprimi-file-certificato";

const MB = 1024 * 1024;

function fileFinto(nome: string, tipo: string, byte: number): File {
  return new File([new Uint8Array(byte)], nome, { type: tipo });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Stub minimale di createImageBitmap + canvas per il percorso di successo
// delle immagini (in node non esistono). Registra le dimensioni assegnate
// al canvas prima del rilascio (width = 0 nel finally).
function stubBrowserImmagini(larghezza: number, altezza: number) {
  const dimensioniCanvas: { width: number; height: number }[] = [];
  const canvas = {
    _w: 0,
    _h: 0,
    get width() {
      return this._w;
    },
    set width(v: number) {
      this._w = v;
      if (v > 0) dimensioniCanvas.push({ width: v, height: this._h });
    },
    get height() {
      return this._h;
    },
    set height(v: number) {
      this._h = v;
      const ultimo = dimensioniCanvas[dimensioniCanvas.length - 1];
      if (v > 0 && ultimo) ultimo.height = v;
    },
    getContext: () => ({
      fillStyle: "",
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }),
    toBlob: (cb: (b: Blob | null) => void, tipo: string) =>
      cb(new Blob([new Uint8Array(1000)], { type: tipo })),
  };
  const close = vi.fn();
  const createImageBitmap = vi.fn(async () => ({
    width: larghezza,
    height: altezza,
    close,
  }));
  vi.stubGlobal("createImageBitmap", createImageBitmap);
  vi.stubGlobal("document", { createElement: () => canvas });
  return { dimensioniCanvas, close, createImageBitmap };
}

describe("tipoFileCertificato", () => {
  it("riconosce PDF e immagini, ignora altri formati", () => {
    expect(tipoFileCertificato("a.pdf", "application/pdf")).toBe("pdf");
    expect(tipoFileCertificato("a.jpg", "image/jpeg")).toBe("immagine");
    expect(tipoFileCertificato("scan.png", "image/png")).toBe("immagine");
    expect(
      tipoFileCertificato(
        "a.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBeNull();
  });

  it("senza MIME usa l'estensione", () => {
    expect(tipoFileCertificato("A.PDF", "")).toBe("pdf");
    expect(tipoFileCertificato("foto.jpeg", "")).toBe("immagine");
    expect(tipoFileCertificato("doc.docx", "")).toBeNull();
  });
});

describe("deveComprimere", () => {
  it("PDF solo se > 1MB", () => {
    expect(deveComprimere("pdf", 6 * MB)).toBe(true);
    expect(deveComprimere("pdf", 400 * 1024)).toBe(false);
    expect(deveComprimere("pdf", SOGLIA_BYTE)).toBe(false);
    expect(deveComprimere("pdf", SOGLIA_BYTE + 1)).toBe(true);
  });

  it("immagine se > 1MB o lato lungo > 2000px", () => {
    expect(deveComprimere("immagine", 4 * MB, 4000)).toBe(true);
    expect(deveComprimere("immagine", 300 * 1024, 800)).toBe(false);
    expect(deveComprimere("immagine", 300 * 1024, 2001)).toBe(true);
    expect(deveComprimere("immagine", 300 * 1024, 2000)).toBe(false);
    expect(deveComprimere("immagine", 3 * MB, 1200)).toBe(true);
  });
});

describe("dimensioniRidotte", () => {
  it("foto 4000x3000 -> 2000x1500", () => {
    expect(dimensioniRidotte(4000, 3000, 2000)).toEqual({
      larghezza: 2000,
      altezza: 1500,
    });
  });

  it("verticale 3000x4000 -> 1500x2000", () => {
    expect(dimensioniRidotte(3000, 4000, 2000)).toEqual({
      larghezza: 1500,
      altezza: 2000,
    });
  });

  it("non ingrandisce le immagini piccole", () => {
    expect(dimensioniRidotte(800, 600, 2000)).toEqual({
      larghezza: 800,
      altezza: 600,
    });
  });
});

describe("scalaPaginaPdf", () => {
  it("A4 a 150 dpi resta sotto 2500px", () => {
    // A4 = 595x842pt -> 1240x1754px
    expect(scalaPaginaPdf(595, 842)).toBeCloseTo(150 / 72);
  });

  it("pagina grande: lato lungo del canvas limitato a 2500px", () => {
    const scala = scalaPaginaPdf(1684, 2384); // A2
    expect(Math.max(1684, 2384) * scala).toBeCloseTo(2500);
  });
});

describe("nomeFileJpeg", () => {
  it("sostituisce l'estensione con .jpg", () => {
    expect(nomeFileJpeg("scan.png")).toBe("scan.jpg");
    expect(nomeFileJpeg("foto.JPEG")).toBe("foto.jpg");
    expect(nomeFileJpeg("certificato.2026.png")).toBe("certificato.2026.jpg");
    expect(nomeFileJpeg("senza-estensione")).toBe("senza-estensione.jpg");
  });
});

describe("scegliPiuPiccolo", () => {
  it("usa il compresso solo se strettamente piu' piccolo", () => {
    const originale = { size: 2 * MB };
    expect(scegliPiuPiccolo(originale, { size: 1 * MB }).size).toBe(1 * MB);
    expect(scegliPiuPiccolo(originale, { size: 2.5 * MB })).toBe(originale);
    expect(scegliPiuPiccolo(originale, { size: 2 * MB })).toBe(originale);
  });
});

describe("pdfFirmato", () => {
  const codifica = (t: string) => new TextEncoder().encode(t);

  it("true con /ByteRange e /Sig", () => {
    expect(
      pdfFirmato(
        codifica("%PDF-1.7 << /Type /Sig /ByteRange [0 840 960 240] >>")
      )
    ).toBe(true);
  });

  it("false senza firma", () => {
    expect(pdfFirmato(codifica("%PDF-1.7 << /Type /Page >>"))).toBe(false);
    expect(pdfFirmato(codifica("%PDF-1.7 << /ByteRange [0 1 2 3] >>"))).toBe(
      false
    );
    expect(pdfFirmato(codifica("%PDF-1.7 << /Type /Sig >>"))).toBe(false);
  });
});

describe("comprimiFileCertificato (fail-soft, ambiente node)", () => {
  it("PDF leggero: originale invariato", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = fileFinto("cert.pdf", "application/pdf", 400 * 1024);
    expect(await comprimiFileCertificato(f)).toBe(f);
    expect(warn).not.toHaveBeenCalled();
  });

  it("PDF firmato pesante: originale invariato, pdf.js mai caricato", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const firma = new TextEncoder().encode(
      "%PDF-1.7 << /Type /Sig /ByteRange [0 840 960 240] >>"
    );
    const f = new File([firma, new Uint8Array(2 * MB)], "firmato.pdf", {
      type: "application/pdf",
    });
    expect(await comprimiFileCertificato(f)).toBe(f);
    expect(warn).not.toHaveBeenCalled();
  });

  it("altro formato: invariato", async () => {
    const f = fileFinto("cert.docx", "application/msword", 3 * MB);
    expect(await comprimiFileCertificato(f)).toBe(f);
  });

  it("errore durante la compressione: restituisce l'originale", async () => {
    // In node createImageBitmap non esiste -> eccezione -> originale.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = fileFinto("foto.jpg", "image/jpeg", 2 * MB);
    expect(await comprimiFileCertificato(f)).toBe(f);
    expect(warn).toHaveBeenCalled();
  });
});

describe("comprimiFormDataCertificato", () => {
  it("nessun file: FormData invariato", async () => {
    const fd = new FormData();
    fd.set("atletaId", "a1");
    await comprimiFormDataCertificato(fd);
    expect(fd.get("file")).toBeNull();
    expect(fd.get("atletaId")).toBe("a1");
  });

  it("campo file vuoto (form Segreteria opzionale): invariato", async () => {
    const fd = new FormData();
    const vuoto = new File([], "", { type: "application/octet-stream" });
    fd.set("file", vuoto);
    await comprimiFormDataCertificato(fd);
    const valore = fd.get("file") as File;
    expect(valore.size).toBe(0);
  });

  it("file che non va compresso: resta lo stesso", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fd = new FormData();
    fd.set("file", fileFinto("cert.pdf", "application/pdf", 1000));
    await comprimiFormDataCertificato(fd);
    const valore = fd.get("file") as File;
    expect(valore.name).toBe("cert.pdf");
    expect(valore.size).toBe(1000);
    expect(warn).not.toHaveBeenCalled();
  });

  it("PNG grande: sostituito da scan.jpg 2000x1500 piu' piccolo", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { dimensioniCanvas, close } = stubBrowserImmagini(4000, 3000);
    const fd = new FormData();
    fd.set("file", fileFinto("scan.png", "image/png", 3 * MB));
    await comprimiFormDataCertificato(fd);
    const valore = fd.get("file") as File;
    expect(valore.name).toBe("scan.jpg");
    expect(valore.type).toBe("image/jpeg");
    expect(valore.size).toBeLessThan(3 * MB);
    expect(dimensioniCanvas).toEqual([{ width: 2000, height: 1500 }]);
    expect(close).toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("conCompressioneCertificato", () => {
  it("la Server Action riceve il FormData gia' compresso", async () => {
    const ordine: string[] = [];
    const { createImageBitmap } = stubBrowserImmagini(4000, 3000);
    createImageBitmap.mockImplementation(async () => {
      ordine.push("compressione");
      return { width: 4000, height: 3000, close: vi.fn() };
    });
    type Stato = { n: number; nome?: string; tipo?: string };
    const action = vi.fn(async (prev: Stato, fd: FormData): Promise<Stato> => {
      ordine.push("action");
      const file = fd.get("file") as File;
      return { n: prev.n + 1, nome: file.name, tipo: file.type };
    });
    const avvolta = conCompressioneCertificato(action);
    const fd = new FormData();
    fd.set("file", fileFinto("scan.png", "image/png", 3 * MB));

    const risultato = await avvolta({ n: 1 }, fd);

    expect(ordine).toEqual(["compressione", "action"]);
    expect(action).toHaveBeenCalledWith({ n: 1 }, fd);
    expect(risultato).toEqual({ n: 2, nome: "scan.jpg", tipo: "image/jpeg" });
  });
});
