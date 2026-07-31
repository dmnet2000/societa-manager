// Story 9.17: helper puro per la griglia mensile presenze. Stesso principio
// di sicurezza sul fuso orario gia' stabilito in lib/giorno-settimana.ts
// (giornoSettimanaDaData) - Date.UTC()/getUTCDate() invece di un Date
// "locale" o di una tabella manuale [31,28,31,...], cosi' il motore JS
// calcola da solo la lunghezza del mese (incluso l'anno bisestile) senza
// rischio di scivolamento di un giorno dovuto al fuso orario del processo.
const FORMATO_MESE_ISO = /^\d{4}-(0[1-9]|1[0-2])$/;

export function giorniDelMese(meseIso: string): string[] {
  // Review fix (code review Story 9.17): senza questa validazione, un
  // formato non valido (es. "abc" o "2026-13") produceva una cascata di
  // NaN silenziosa - Date.UTC(NaN, ...) -> getUTCDate() -> NaN -> il ciclo
  // sotto non itera mai -> [] restituito senza alcun errore. Fallire in
  // modo esplicito e' piu' sicuro per qualunque chiamante presente o
  // futuro, non solo per la pagina che oggi valida gia' a monte.
  if (!FORMATO_MESE_ISO.test(meseIso)) {
    throw new Error(`Formato mese non valido: "${meseIso}" (atteso "YYYY-MM").`);
  }

  const [annoStr, meseStr] = meseIso.split("-");
  const anno = Number(annoStr);
  const mese = Number(meseStr); // 1-12

  // Date.UTC(anno, mese, 0) e' il giorno 0 del mese successivo (0-indexed),
  // cioe' l'ultimo giorno del mese richiesto - il motore gestisce da solo
  // il riporto di anno per dicembre e i bisestili per febbraio.
  const ultimoGiorno = new Date(Date.UTC(anno, mese, 0)).getUTCDate();

  const giorni: string[] = [];
  for (let giorno = 1; giorno <= ultimoGiorno; giorno++) {
    giorni.push(`${annoStr}-${meseStr}-${String(giorno).padStart(2, "0")}`);
  }
  return giorni;
}

// Default del selettore mese nella pagina - "YYYY-MM" nel fuso UTC, stesso
// principio del resto del modulo (mai new Date().getMonth() locale).
export function meseCorrente(): string {
  const ora = new Date();
  const anno = ora.getUTCFullYear();
  const mese = ora.getUTCMonth() + 1;
  return `${anno}-${String(mese).padStart(2, "0")}`;
}
