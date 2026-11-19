import type { ParametriFormato } from "@/lib/api-tablet/contratto";
import { chiaviValide, PARAMETRI_FORMATO_DEFAULT } from "@/lib/parametri-formato";

// Story 3.8 (AD-5): validazione pura del modulo "Parametri del formato".
// Nessun accesso al database: lo usano la Server Action e i test.

export type ChiaveModulo = Exclude<keyof ParametriFormato, "versione">;

export const CAMPI_MODULO: readonly { chiave: ChiaveModulo; etichetta: string; min: number; max: number }[] = [
  { chiave: "setPerVincere", etichetta: "Set per vincere", min: 2, max: 2 },
  { chiave: "puntiSet", etichetta: "Punti per set", min: 1, max: 99 },
  { chiave: "puntiSetDecisivo", etichetta: "Punti set decisivo", min: 1, max: 99 },
  { chiave: "scartoMinimo", etichetta: "Scarto minimo", min: 1, max: 10 },
  { chiave: "cambiPerSet", etichetta: "Cambi per set", min: 1, max: 20 },
  { chiave: "timeoutPerSet", etichetta: "Timeout per set", min: 1, max: 20 },
  { chiave: "liberiMin", etichetta: "Liberi minimi", min: 1, max: 2 },
  { chiave: "liberiMax", etichetta: "Liberi massimi", min: 1, max: 2 },
  { chiave: "rosaMax", etichetta: "Giocatori in rosa (massimo)", min: 6, max: 20 },
];

export type ErroriModulo = Partial<Record<ChiaveModulo, string>>;

export type EsitoModulo =
  | { valori: Partial<ParametriFormato> }
  | { errori: ErroriModulo };

/** Campi testo (vuoto = non impostato) -> JSON parziale oppure errori per campo. */
export function validaModuloParametri(campi: Partial<Record<ChiaveModulo, string>>): EsitoModulo {
  const valori: { -readonly [K in keyof ParametriFormato]?: number } = {};
  const errori: ErroriModulo = {};
  for (const { chiave, etichetta, min, max } of CAMPI_MODULO) {
    const testo = (campi[chiave] ?? "").trim();
    if (testo === "") continue;
    if (!/^\d+$/.test(testo)) {
      errori[chiave] = `${etichetta}: deve essere un numero intero.`;
      continue;
    }
    const n = Number(testo);
    if (chiave === "setPerVincere") {
      if (n !== 2) errori[chiave] = "Set per vincere: per ora solo 2";
      else valori[chiave] = n;
      continue;
    }
    if (!Number.isSafeInteger(n) || n < min || n > max) {
      errori[chiave] = `${etichetta}: deve essere tra ${min} e ${max}.`;
      continue;
    }
    valori[chiave] = n;
  }
  if (Object.keys(errori).length > 0) return { errori };
  return { valori };
}

/** Coppia (min, max) dei liberi risolta su default, Edizione, Categoria. */
export function coppiaLiberi(edizione: unknown, categoria: unknown): { min: number; max: number } {
  const risolvi = (chiave: "liberiMin" | "liberiMax") =>
    chiaviValide(categoria)[chiave] ??
    chiaviValide(edizione)[chiave] ??
    PARAMETRI_FORMATO_DEFAULT[chiave];
  return { min: risolvi("liberiMin"), max: risolvi("liberiMax") };
}

/**
 * Coerenza liberiMin <= liberiMax sui valori effettivi (default, Edizione,
 * Categoria). `parametriEffettivi` ripiega in silenzio sui default se la
 * coppia e' incoerente, quindi qui si risolve la coppia dai valori impostati.
 */
export function liberiCoerenti(edizione: unknown, categoria: unknown): boolean {
  const { min, max } = coppiaLiberi(edizione, categoria);
  return min <= max;
}
