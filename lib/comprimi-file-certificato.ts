// Compressione nel browser dei file Certificato Medico prima dell'upload
// (spec-compressione-file-certificato, 2026-10-28). Solo lato client: le
// Server Action e lib/storage/certificati.ts restano invariate e continuano
// a validare MIME, magic byte e limite 10MB sul file ricevuto.
//
// Fail-soft: qualunque errore (PDF protetto/corrotto, canvas assente,
// browser vecchio, timeout) restituisce il file originale senza avvisare
// l'utente. I PDF firmati digitalmente non vengono mai toccati.
//
// pdfjs-dist e pdf-lib sono caricati con import() dinamico solo quando un
// PDF va davvero compresso, per non appesantire il bundle dei form.

export const SOGLIA_BYTE = 1024 * 1024; // 1MB
export const LATO_MAX_IMMAGINE = 2000;
export const LATO_MAX_PAGINA_PDF = 2500;
export const SCALA_PDF = 150 / 72; // ~150 dpi
export const QUALITA_JPEG_PDF = 0.7;
export const QUALITA_JPEG_IMMAGINE = 0.8;
// Oltre questo tempo si rinuncia e si invia l'originale (telefoni lenti,
// PDF patologici): l'utente non deve restare bloccato sul bottone.
export const TIMEOUT_COMPRESSIONE_MS = 30000;
// PDF con piu' pagine: rasterizzarli costa troppo su mobile, originale.
export const MAX_PAGINE_PDF = 30;

export type TipoFileCertificato = "pdf" | "immagine";

// ---------------------------------------------------------------------------
// Logica pura (testata in comprimi-file-certificato.test.ts)
// ---------------------------------------------------------------------------

export function tipoFileCertificato(
  nome: string,
  mime: string
): TipoFileCertificato | null {
  const m = mime.toLowerCase();
  const n = nome.toLowerCase();
  if (m === "application/pdf" || (m === "" && n.endsWith(".pdf"))) {
    return "pdf";
  }
  if (
    m === "image/jpeg" ||
    m === "image/png" ||
    (m === "" && /\.(jpe?g|png)$/.test(n))
  ) {
    return "immagine";
  }
  return null;
}

// PDF: solo se > 1MB. Immagine: se > 1MB oppure lato lungo > 2000px
// (latoLungoPx sconosciuto = si valuta solo il peso).
export function deveComprimere(
  tipo: TipoFileCertificato,
  dimensioneByte: number,
  latoLungoPx?: number
): boolean {
  if (dimensioneByte > SOGLIA_BYTE) return true;
  if (tipo === "immagine" && latoLungoPx !== undefined) {
    return latoLungoPx > LATO_MAX_IMMAGINE;
  }
  return false;
}

// Riduce (mai ingrandisce) mantenendo le proporzioni, lato lungo <= latoMax.
export function dimensioniRidotte(
  larghezza: number,
  altezza: number,
  latoMax: number
): { larghezza: number; altezza: number } {
  const latoLungo = Math.max(larghezza, altezza);
  if (latoLungo <= latoMax) return { larghezza, altezza };
  const fattore = latoMax / latoLungo;
  return {
    larghezza: Math.max(1, Math.round(larghezza * fattore)),
    altezza: Math.max(1, Math.round(altezza * fattore)),
  };
}

// Scala di rendering di una pagina PDF: 150/72, ridotta se il lato lungo
// del canvas supererebbe LATO_MAX_PAGINA_PDF.
export function scalaPaginaPdf(larghezzaPt: number, altezzaPt: number): number {
  const latoLungo = Math.max(larghezzaPt, altezzaPt) * SCALA_PDF;
  if (latoLungo <= LATO_MAX_PAGINA_PDF) return SCALA_PDF;
  return (SCALA_PDF * LATO_MAX_PAGINA_PDF) / latoLungo;
}

export function nomeFileJpeg(nome: string): string {
  const punto = nome.lastIndexOf(".");
  const base = punto > 0 ? nome.slice(0, punto) : nome;
  return `${base || "certificato"}.jpg`;
}

// Il risultato si usa solo se strettamente piu' piccolo dell'originale.
export function scegliPiuPiccolo<T extends { size: number }>(
  originale: T,
  compresso: T
): T {
  return compresso.size < originale.size ? compresso : originale;
}

// Un PDF firmato digitalmente (PAdES) non va mai rasterizzato: la firma
// copre i byte esatti del file e verrebbe distrutta. Il dizionario della
// firma contiene /ByteRange e /Sig (Type /Sig, /SigFlags nell'AcroForm).
export function pdfFirmato(bytes: Uint8Array): boolean {
  const testo = new TextDecoder("latin1").decode(bytes);
  return testo.includes("/ByteRange") && testo.includes("/Sig");
}

// ---------------------------------------------------------------------------
// Browser (canvas / pdf.js / pdf-lib)
// ---------------------------------------------------------------------------

type StatoLavoro = { annullato: boolean };

class LavoroAnnullato extends Error {}

function canvasToJpeg(canvas: HTMLCanvasElement, qualita: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob vuoto"))),
      "image/jpeg",
      qualita
    );
  });
}

async function comprimiImmagine(file: File): Promise<File> {
  // Orientamento EXIF esplicito: le foto da telefono restano dritte.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const latoLungo = Math.max(bitmap.width, bitmap.height);
    if (!deveComprimere("immagine", file.size, latoLungo)) return file;

    const { larghezza, altezza } = dimensioniRidotte(
      bitmap.width,
      bitmap.height,
      LATO_MAX_IMMAGINE
    );
    const canvas = document.createElement("canvas");
    canvas.width = larghezza;
    canvas.height = altezza;
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas 2d non disponibile");
      // Sfondo bianco: la trasparenza PNG in JPEG diventerebbe nera.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, larghezza, altezza);
      ctx.drawImage(bitmap, 0, 0, larghezza, altezza);
      const blob = await canvasToJpeg(canvas, QUALITA_JPEG_IMMAGINE);
      const compresso = new File([blob], nomeFileJpeg(file.name), {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
      return scegliPiuPiccolo(file, compresso);
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    bitmap.close();
  }
}

// Worker pdf.js: creato alla prima compressione e ricreato dopo un errore
// del worker o un timeout (terminate + workerPort = null).
type OpzioniWorkerPdf = { workerPort: Worker | null };
let workerPdf: Worker | null = null;
let opzioniWorkerPdf: OpzioniWorkerPdf | null = null;

function resettaWorkerPdf(): void {
  workerPdf?.terminate();
  workerPdf = null;
  if (opzioniWorkerPdf) opzioniWorkerPdf.workerPort = null;
}

function assicuraWorkerPdf(opzioni: OpzioniWorkerPdf): void {
  opzioniWorkerPdf = opzioni;
  if (workerPdf) return;
  const worker = new Worker(
    new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
    { type: "module" }
  );
  worker.onerror = () => {
    if (workerPdf === worker) resettaWorkerPdf();
  };
  workerPdf = worker;
  opzioni.workerPort = worker;
}

// Compressioni PDF in fila: due righe Segreteria inviate insieme non devono
// usare lo stesso workerPort in contemporanea. Ogni voce della coda e' gia'
// limitata dal timeout, quindi un PDF bloccato non blocca i successivi.
let codaPdf: Promise<unknown> = Promise.resolve();

function accodaPdf<T>(lavoro: () => Promise<T>): Promise<T> {
  const risultato = codaPdf.then(lavoro, lavoro);
  codaPdf = risultato.catch(() => {});
  return risultato;
}

async function comprimiPdf(file: File, stato: StatoLavoro): Promise<File> {
  if (!deveComprimere("pdf", file.size)) return file;

  const dati = new Uint8Array(await file.arrayBuffer());
  if (pdfFirmato(dati)) return file;

  const [pdfjs, { PDFDocument }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdf-lib"),
  ]);
  if (stato.annullato) throw new LavoroAnnullato();
  assicuraWorkerPdf(pdfjs.GlobalWorkerOptions);

  const caricamento = pdfjs.getDocument({ data: dati });
  try {
    const sorgente = await caricamento.promise;
    if (sorgente.numPages > MAX_PAGINE_PDF) return file;
    const destinazione = await PDFDocument.create();
    for (let n = 1; n <= sorgente.numPages; n++) {
      if (stato.annullato) throw new LavoroAnnullato();
      const pagina = await sorgente.getPage(n);
      // Dimensione pagina originale in punti (rotazione inclusa).
      const base = pagina.getViewport({ scale: 1 });
      const viewport = pagina.getViewport({
        scale: scalaPaginaPdf(base.width, base.height),
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      try {
        await pagina.render({ canvas, viewport }).promise;
        const blob = await canvasToJpeg(canvas, QUALITA_JPEG_PDF);
        const jpeg = await destinazione.embedJpg(await blob.arrayBuffer());
        const nuovaPagina = destinazione.addPage([base.width, base.height]);
        nuovaPagina.drawImage(jpeg, {
          x: 0,
          y: 0,
          width: base.width,
          height: base.height,
        });
      } finally {
        // Libera subito la memoria del canvas (mobile).
        canvas.width = 0;
        canvas.height = 0;
        pagina.cleanup();
      }
    }
    const bytes = await destinazione.save();
    const compresso = new File([bytes as Uint8Array<ArrayBuffer>], file.name, {
      type: "application/pdf",
      lastModified: file.lastModified,
    });
    return scegliPiuPiccolo(file, compresso);
  } finally {
    // Va atteso: il workerPort condiviso non accetta un nuovo documento
    // mentre il precedente e' ancora in fase di distruzione.
    await caricamento.destroy().catch(() => {});
  }
}

// Corre la compressione contro TIMEOUT_COMPRESSIONE_MS: se vince il timer
// si restituisce l'originale ed esegue alloScadere (annullamento/reset).
function entroTimeout(
  lavoro: Promise<File>,
  originale: File,
  alloScadere: () => void
): Promise<File> {
  // Il lavoro abbandonato puo' fallire piu' tardi: nessun rejection non gestito.
  lavoro.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const scadenza = new Promise<File>((resolve) => {
    timer = setTimeout(() => {
      console.warn(
        "Compressione certificato oltre il tempo massimo, invio l'originale"
      );
      alloScadere();
      resolve(originale);
    }, TIMEOUT_COMPRESSIONE_MS);
  });
  return Promise.race([lavoro, scadenza]).finally(() => clearTimeout(timer));
}

export async function comprimiFileCertificato(file: File): Promise<File> {
  try {
    const tipo = tipoFileCertificato(file.name, file.type);
    if (tipo === "immagine") {
      return await entroTimeout(comprimiImmagine(file), file, () => {});
    }
    if (tipo === "pdf") {
      return await accodaPdf(() => {
        const stato: StatoLavoro = { annullato: false };
        return entroTimeout(comprimiPdf(file, stato), file, () => {
          stato.annullato = true;
          resettaWorkerPdf();
        });
      });
    }
    return file; // altro formato: lo valuta (e rifiuta) il server
  } catch (errore) {
    console.warn("Compressione certificato non riuscita, invio l'originale", errore);
    return file;
  }
}

// Unico punto riusato dai tre form: sostituisce il campo "file" se presente
// e non vuoto, altrimenti lascia il FormData invariato.
export async function comprimiFormDataCertificato(
  formData: FormData,
  campo = "file"
): Promise<void> {
  const valore = formData.get(campo);
  if (!(valore instanceof File) || valore.size === 0) return;
  const risultato = await comprimiFileCertificato(valore);
  if (risultato !== valore) formData.set(campo, risultato);
}

// Avvolge una Server Action di useActionState: il file Certificato viene
// ottimizzato nel browser prima dell'invio, cosi' pending copre
// compressione + upload. Da creare a livello di modulo, non nel componente.
export function conCompressioneCertificato<S>(
  action: (prevState: S, formData: FormData) => Promise<S>
): (prevState: S, formData: FormData) => Promise<S> {
  return async (prevState, formData) => {
    await comprimiFormDataCertificato(formData);
    return action(prevState, formData);
  };
}
