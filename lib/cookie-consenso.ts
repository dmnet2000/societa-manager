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

// Review fix (code review Story 18.6, Acceptance Auditor): restituisce il
// valore tipizzato invece del solo booleano di eConsensoRegistrato - serve
// a passare la scelta gia' registrata (non solo "esiste o no") a
// CookieBanner, cosi' che riaprendo "Preferenze cookie" si veda quale
// scelta e' attualmente in vigore (AC #3 "rivedere... la scelta").
export function parseValoreConsenso(
  valore: string | undefined
): ValoreConsenso | undefined {
  return eConsensoRegistrato(valore) ? (valore as ValoreConsenso) : undefined;
}

// Review fix (code review Story 18.6, Blind Hunter): unico controllo che
// una futura Story 18.5 (embed social, cookie di terze parti) dovra' usare
// per decidere se caricare uno strumento non essenziale (AC #5) - da
// riusare cosi' com'e', non da ri-derivare confrontando di nuovo la
// stringa "accettato" in un altro file.
export function haAccettatoCookieNonEssenziali(valore: string | undefined): boolean {
  return valore === "accettato";
}
