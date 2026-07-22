// Story 4.5 (FR-15): confronto per sola data di calendario, non per
// timestamp pieno - un Certificato valido "fino a oggi" non deve risultare
// gia' scaduto solo perche' la mezzanotte di quel giorno e' gia' passata
// rispetto all'ora corrente (AC #2, "futura o odierna"). Funzione pura:
// `oggi` e' un parametro esplicito, mai `new Date()` letta internamente,
// per restare testabile senza mock del tempo (stesso pattern di
// calcola-statistiche-presenza.ts, Story 3.3).
//
// Review fix: il calendario di riferimento per "oggi" e' quello di
// Europe/Rome, non UTC - la polisportiva e i suoi Allenatori sono in
// Italia, e per 1-2 ore ogni giorno (a cavallo della mezzanotte italiana,
// CET/CEST) la data UTC e' ancora quella del giorno precedente. `dataFineValidita`
// non necessita della stessa conversione: e' gia' la data di calendario
// letterale scelta dalla Segreteria (Story 4.4, `<input type="date">`),
// salvata come mezzanotte UTC di quel giorno - `.slice(0, 10)` la
// recupera esattamente cosi' com'e' stata inserita, nessuna ambiguita' di
// fuso orario da quel lato.
const FORMATTER_DATA_ROMA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
});

export function certificatoScaduto(
  dataFineValidita: string | null,
  oggi: Date
): boolean {
  if (!dataFineValidita) return false;
  return dataFineValidita.slice(0, 10) < FORMATTER_DATA_ROMA.format(oggi);
}
