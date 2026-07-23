# Review Accessibilità — DESIGN.md / EXPERIENCE.md

Review ad-hoc, focus accessibilità, per il pair DESIGN.md + EXPERIENCE.md (`ux-societa-manager-2026-07-22`). Baseline dichiarata: WCAG AA come vincolo guida, non audit formale certificato. Non vengono rimesse in discussione le decisioni di discovery già chiuse (system-font, solo light mode, motion minimo, maiuscolo sui pulsanti): qui si verificano solo le conseguenze di accessibilità di quelle decisioni.

---

- **Titolo**: Il rapporto di contrasto dichiarato per success/success-bg è impreciso (sottostimato)
  **Severità**: low
  **Posizione**: `DESIGN.md` → sezione *Colori* → `{colors.success}` su `{colors.success-bg}` (`#256029` su `#DFF2E1`), riga "Contrasto verificato ~5.3:1"
  **Dettaglio**: Ricalcolando la luminanza relativa WCAG per la coppia `#256029`/`#DFF2E1` il rapporto risulta ≈6.4:1, non ~5.3:1. Non è un problema di sicurezza (il valore reale è più alto della soglia AA, non più basso), ma è un'imprecisione nel numero dichiarato come "verificato" — mina la fiducia nelle altre cifre elencate (es. warning ~5.2:1, che invece ricalcolato torna corretto, confermando che il metodo non è sistematicamente sbagliato, solo che questo singolo numero non è stato ricalcolato con cura).
  **Fix suggerito**: Ricalcolare la coppia success/success-bg e correggere la cifra (o sostituire i valori puntuali con soglie tipo "≥5:1" per evitare falsa precisione), prima che un futuro contributor si fidi ciecamente di un numero non riverificato per una nuova coppia colore.

- **Titolo**: La regola "mai colore/icona da sola" non è codificata a livello di componente per la stat-tile
  **Severità**: medium
  **Posizione**: `DESIGN.md` → *Componenti* → `stat-tile`; `EXPERIENCE.md` → *Soglia di Accessibilità*
  **Dettaglio**: La regola hard "ogni stato di alert... deve restare comprensibile anche senza colore da solo" (`EXPERIENCE.md`, Soglia di Accessibilità) è testualmente riferita solo al "badge certificato". Non è ripetuta nella definizione del componente `stat-tile` in `DESIGN.md`, né compare come voce nella tabella "Cose da fare e da evitare". La stat-tile distingue tre stati (in regola/in scadenza/scaduto) tramite sfondo + bordo colorato; l'etichetta testuale della categoria è descritta in prosa ma non imposta come requisito non negoziabile del componente — un dev potrebbe implementare la tile solo con colore + numero, senza etichetta di stato, restando "fedele" alla spec così com'è scritta.
  **Fix suggerito**: Aggiungere una voce alla tabella "Cose da fare e da evitare" di `DESIGN.md` che imponga l'etichetta testuale di stato (`in regola`/`in scadenza`/`scaduto`) sempre presente accanto al colore nella stat-tile; estendere la regola di `EXPERIENCE.md` da "badge certificato" a "ogni componente che usa colore semantico (badge, stat-tile)".

- **Titolo**: Nessun minimo numerico per i target di tocco, solo linguaggio qualitativo
  **Severità**: high
  **Posizione**: `EXPERIENCE.md` → *Primitive di Interazione* ("Target di tocco generosi"); → *Soglia di Accessibilità* ("Target di tocco dimensionati per l'uso mobile-first")
  **Dettaglio**: In nessuno dei due documenti è specificata una dimensione minima concreta (es. 44×44px, o 24×24px come da WCAG 2.2 SC 2.5.8 "Target Size Minimum", livello AA) per checkbox di presenza, righe elenco, pulsanti primari. Il linguaggio resta "generosi"/"dimensionati per l'uso mobile-first", interamente aperto all'interpretazione implementativa. Questo è rilevante perché i due Key Flow canonici (UJ-1, UJ-2) avvengono entrambi da telefono, di sera, per un pubblico esplicitamente non-power-user (genitori, allenatori stanchi dopo l'allenamento) — un target di tocco sotto-dimensionato in una lista di 15-25 atlete produce errori di tocco reali e ripetuti (spuntare la riga sbagliata), non solo un problema estetico.
  **Fix suggerito**: Aggiungere in `EXPERIENCE.md` (Primitive di Interazione o Soglia di Accessibilità) un minimo numerico esplicito, es.: "area di tocco minima 44×44px per checkbox/riga/pulsante primario su viewport mobile, coerente con WCAG 2.5.8 e le linee guida delle piattaforme mobile."

- **Titolo**: Il meccanismo CSS per il maiuscolo dei pulsanti è corretto ma non c'è un divieto esplicito di testo hardcoded in maiuscolo
  **Severità**: low
  **Posizione**: `DESIGN.md` → frontmatter `components.button-primary` (`text-transform: uppercase`) e sezione *Componenti* → pulsante primario
  **Dettaglio**: Il token specifica correttamente `text-transform: uppercase` come proprietà CSS applicata a una stringa sorgente normale — è l'approccio giusto per l'accessibilità (screen reader/display braille leggono la stringa sottostante, non la resa visiva). Tuttavia né `DESIGN.md` né `EXPERIENCE.md` contiene un'istruzione esplicita che vieti a un dev/copywriter di scrivere il testo del pulsante già in maiuscolo (es. hardcodare "SALVA" invece di "Salva" + CSS). Nulla nella spec impedisce oggi questo errore, che vanificherebbe il vantaggio di accessibilità del token.
  **Fix suggerito**: Aggiungere una frase alla voce `button-primary` di `DESIGN.md`: "il testo sorgente resta in maiuscolo/minuscolo naturale (es. 'Salva'); la resa maiuscola è affidata esclusivamente a `text-transform` CSS, mai scritta in maiuscolo nella stringa — per non penalizzare screen reader e display braille impostati su verbosità carattere-per-carattere."

- **Titolo**: Nessuna soglia minima di leggibilità né menzione di zoom/reflow al 200% per i testi più piccoli
  **Severità**: medium
  **Posizione**: `DESIGN.md` → *Tipografia* (`stat-label` 10.5px/600, `badge-label` 10.5px/700, `section-label` 11px/900); `EXPERIENCE.md` → *Soglia di Accessibilità*
  **Dettaglio**: Il pubblico dichiarato include esplicitamente genitori non esperti di tecnologia (plausibilmente anche più anziani), ma non c'è alcuna discussione di una soglia minima di leggibilità per i testi più piccoli del sistema, né alcun riferimento al comportamento a zoom browser 200% / reflow (WCAG 1.4.4, 1.4.10) in nessuno dei due documenti. Il peso tipografico pesante (600/700/900) mitiga parzialmente la leggibilità a 10.5-11px, ma non è una verifica equivalente a un requisito di reflow testato.
  **Fix suggerito**: Aggiungere una nota in `EXPERIENCE.md` → Soglia di Accessibilità che impegni a verificare che il layout (colonna singola su mobile, già previsto) regga senza scroll orizzontale o clipping del testo a 200% di zoom, e valutare se innalzare il floor di `stat-label`/`badge-label` a 11-12px.

- **Titolo**: Nessuna indicazione su come rendere accessibili gli errori di validazione dei form
  **Severità**: high
  **Posizione**: `EXPERIENCE.md` → *Primitive di Interazione*; → *Pattern di Stato* (assenza di trattazione)
  **Dettaglio**: Il documento tratta in profondità gli alert di stato non bloccanti (badge/tile), ma è silente su come vengano segnalati gli errori di validazione nei form: nessuna menzione di associazione testo-errore/campo (es. `aria-describedby`), nessuna menzione che l'errore non deve essere comunicato solo tramite colore del bordo, nessuna menzione di gestione del focus o annuncio (`aria-live`) quando un salvataggio fallisce. Il prodotto include upload di certificati medici di minori e diversi form gestionali (import Excel, configurazione SMTP, assegnazione gruppi): un errore comunicato solo visivamente/tramite colore sarebbe una barriera reale per un utente che usa uno screen reader, proprio su un flusso che tratta dati sanitari sensibili.
  **Fix suggerito**: Aggiungere una nuova sotto-sezione a `EXPERIENCE.md` (sotto Primitive di Interazione o Soglia di Accessibilità) con regole base: ogni errore di validazione è testo associato al campo (non solo colore), il focus si sposta al primo campo in errore al submit fallito (o un riepilogo viene annunciato via `aria-live`), coerente col principio "niente rumore" ma applicato anche agli errori, non solo alle notifiche di routine.

- **Titolo**: Lo stesso stato reale ("certificato scaduto") cambia colore/severità tra vista individuale e aggregata senza spiegazione a schermo
  **Severità**: medium
  **Posizione**: `DESIGN.md` → regola badge/stat-tile (riga "Regola specifica e non negoziabile"); `EXPERIENCE.md` → *Pattern di Stato* (tabella stato certificato)
  **Dettaglio**: Lo stesso stato "scaduto" è **warning** a livello di singola atleta e **danger** a livello di conteggio aggregato (Vista Dirigente) — scelta ben motivata nella spec (FR-15, pubblico diverso) e coerente. Il rischio è per un utente che vede entrambe le viste, come esplicitamente previsto in UJ-4: Roberto è "dirigente, spesso anche allenatore" — la stessa persona può vedere lo stesso stato dell'atleta X con colore diverso in due schermate diverse dello stesso prodotto, nello stesso giorno. L'etichetta testuale condivisa ("scaduto") oggi attutisce la confusione, ma non è imposta come vincolo permanente (nessuna regola non-negoziabile lo protegge da future modifiche), e non c'è alcuna microcopy a schermo che spieghi la differenza intenzionale di severità a un utente al primo incontro — rilevante per utenti a bassa vista o con differenze cognitive che si affidano più al colore che al ragionamento contestuale.
  **Fix suggerito**: Aggiungere una regola non-negoziabile analoga a quella del badge che imponga la parità della parola di stato ("scaduto") tra vista individuale e aggregata anche se il colore cambia; valutare un breve testo di aiuto nella Vista Dirigente (es. "Il colore qui riflette l'urgenza per chi deve intervenire, non la gravità sanitaria") per ridurre la confusione al primo incontro.

---

## Riepilogo severità

- critical: 0
- high: 2
- medium: 3
- low: 2

Totale: 7 findings.
