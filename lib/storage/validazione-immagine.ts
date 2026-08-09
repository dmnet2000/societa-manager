import "server-only";

// Story 7.2 (logo/actions.ts), estratto qui in Story 16.1 per essere
// riusato anche da app/(sponsor)/sponsor/actions.ts - stessa allowlist e
// limite di /logo, non duplicarli una terza volta (erano gia' presenti
// anche in lib/storage/certificati.ts con un'allowlist/limite diversi,
// PDF incluso e 10MB, non condivisibili qui). Niente SVG: puo' contenere
// script eseguibile, rischio XSS diretto per un asset pubblico.
export const MIME_AMMESSI_IMMAGINE = ["image/png", "image/jpeg"];
export const DIMENSIONE_MASSIMA_IMMAGINE_BYTE = 2 * 1024 * 1024;

// Firma PNG completa a 8 byte (review fix Story 7.2: un controllo troncato
// ai primi 4 byte accettava file con solo il prefisso corretto).
const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

export async function contenutoCorrispondeAlMimeImmagine(
  file: File
): Promise<boolean> {
  const magic = MAGIC_BYTES[file.type];
  if (!magic) return false;
  const intestazione = new Uint8Array(
    await file.slice(0, magic.length).arrayBuffer()
  );
  return magic.every((byte, i) => intestazione[i] === byte);
}
