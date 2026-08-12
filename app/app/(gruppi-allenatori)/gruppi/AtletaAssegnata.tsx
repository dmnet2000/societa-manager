// Review fix: esportato invece di ridichiarato indipendentemente in
// GruppoRow.tsx - un futuro campo aggiunto qui non si disallineerebbe
// silenziosamente dall'altra copia.
// Story 9.19: certificatoInScadenza calcolato una volta per l'intero elenco
// Atlete della pagina chiamante (gruppi/page.tsx, i-miei-gruppi/page.tsx) -
// qui e' innocuo anche per le Atlete mostrate solo nel <select> "disponibili"
// (mai renderizzato li').
// certificatoScaduto (estensione 2026-08-06): calcolato dallo stesso helper
// condiviso (lib/certificato-in-scadenza-per-atleta.ts) per tutti i
// consumer.
// Richiesta utente 2026-08-07: il componente AtletaAssegnata (<li>-based,
// Story 9.14) e' stato rimosso come dead code - i-miei-gruppi/MioGruppoCard.tsx,
// il suo unico consumer, riusa ora AtletaTabellaRiga.tsx (stesso layout a 5
// colonne di /gruppi, Story 9.33 round 4/5) al suo posto. Questo file resta
// solo per il tipo Atleta condiviso, ancora usato da AtletaTabellaRiga.tsx/
// GruppoRow.tsx/page.tsx di entrambe le pagine.
export type Atleta = {
  id: string;
  nome: string;
  certificatoInScadenza: boolean;
  certificatoScaduto: boolean;
};
