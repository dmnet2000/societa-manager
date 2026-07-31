import type { Sesso } from "@prisma/client";

// Story 9.18: il Codice Fiscale italiano codifica il sesso nel campo
// giorno di nascita (posizioni 9-10, 0-indexed): 01-31 per un maschio,
// 41-71 (+40 sul giorno) per una femmina. Non gestisce l'omocodia
// (sostituzione lettera<->cifra per collisioni anagrafiche, rarissima) -
// se quella posizione specifica e' stata omocodiata, le due cifre non sono
// numeriche e questa funzione restituisce null: un fallback esplicito a
// errore di validazione lato chiamante, mai un sesso dedotto a caso.
// Nessun cross-check con la data di nascita fornita separatamente nel form
// (richiederebbe la decodifica completa di anno/mese/giorno, fuori scope).
export function estraiSessoDaCodiceFiscale(codiceFiscale: string): Sesso | null {
  if (codiceFiscale.length < 11) {
    return null;
  }

  const giornoSesso = Number(codiceFiscale.slice(9, 11));
  if (!Number.isInteger(giornoSesso)) {
    return null;
  }

  if (giornoSesso >= 1 && giornoSesso <= 31) {
    return "M";
  }
  if (giornoSesso >= 41 && giornoSesso <= 71) {
    return "F";
  }

  return null;
}
