// Story 18.6: nome/durata del cookie di consenso condivisi tra la lettura
// server-side (app/page.tsx, tramite cookies() da next/headers) e la
// scrittura client-side (CookieBanner.tsx, tramite document.cookie) - una
// sola fonte di verita' evita un disallineamento silenzioso tra i due lati.
export const NOME_COOKIE_CONSENSO = "consenso_cookie";

// ~6 mesi (15768000s). Nessuna convenzione di durata pre-esistente nel
// progetto per un cookie non di sessione - valore coerente con le Linee
// guida cookie del Garante Privacy italiano (durata non superiore ai 6
// mesi prima di richiedere nuovamente il consenso).
export const DURATA_COOKIE_CONSENSO_SECONDI = 15768000;

export type ValoreConsenso = "accettato" | "rifiutato";

// Sia "accettato" sia "rifiutato" contano come "scelta gia' registrata"
// (AC #1/#2 Story 18.6) - un rifiuto va rispettato/ricordato allo stesso
// modo di un'accettazione, non richiede di essere richiesto di nuovo. Un
// valore non riconosciuto (cookie assente, manomesso, o di una versione
// futura del banner) e' trattato come "nessuna scelta ancora fatta".
export function eConsensoRegistrato(valore: string | undefined): boolean {
  return valore === "accettato" || valore === "rifiutato";
}
