---
baseline_commit: 67d9cb7583d42d9066fd2e23c5b5c92cff3e2575
---

# Story 9.33: Atlete su riga separata in `/gruppi` (elenco orizzontale)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente che gestisce l'elenco Gruppi,
I want vedere le Atlete assegnate a un Gruppo su una riga distinta e compatta invece che in una colonna verticale,
so that l'elenco Gruppi resti leggibile anche per rose numerose, senza dover scrollare a lungo per passare da un Gruppo al successivo.

## Acceptance Criteria

1. **Given** un Admin/Dirigente/Allenatore su `/gruppi` **When** vede un Gruppo **Then** le Atlete assegnate non sono più nella colonna della riga principale (Nome/Categoria) ma su una riga di tabella distinta a piena larghezza, sotto la riga principale — stesso trattamento già applicato agli Allenatori.
2. **And** l'elenco delle Atlete in quella riga è disposto in orizzontale (wrap automatico), non più una per riga verticale — stesso pattern di `AllenatoreAssegnato.tsx`/`.listaAssegnatiInline` già in uso per Allenatori.
3. **And** il form "Assegna Atleta" e il pulsante/pannello "Nuovo Atleta" si spostano nella stessa nuova riga, invariati nella funzionalità (nessuna modifica a `assegnaAtleta`/`creaEAssegnaAtleta`).
4. **And** l'header della tabella (`page.tsx`) riflette la nuova struttura a 2 colonne (Nome, Categoria) per la riga principale — "Atlete" non è più un'intestazione di colonna.
5. **And** nessuna regressione su `assegnaAtleta`/`rimuoviAtleta`/`creaEAssegnaAtleta` né sulla riga Allenatori già esistente (`rigaAllenatori`) — solo riposizionamento/restyling, nessuna Server Action toccata.

## Studio di usabilità (svolto in fase di analisi, 2026-08-06)

**Problema**: la colonna Atlete della riga principale impila verticalmente elenco (una per riga) + form "Assegna Atleta" + pulsante/pannello "Nuovo Atleta" — per un Gruppo con rosa numerosa (10-20 Atlete) la colonna diventa altissima, rendendo l'intero elenco Gruppi difficile da scorrere.

**Opzioni valutate con l'utente**:

- **(a) Riga separata, elenco sempre visibile in orizzontale** — mirror diretto di quanto già fatto per Allenatori: le Atlete escono dalla colonna e diventano una riga a piena larghezza, nomi disposti in orizzontale con wrap automatico invece che uno sotto l'altro. Nessun click aggiuntivo, stesso identico pattern di interazione già in produzione per Allenatori (coerenza visiva, nessuna nuova interazione da imparare per l'utente).
- **(b) Riga separata e richiudibile** — come (a), ma la riga parte collassata mostrando solo un riassunto ("Atlete: N assegnate") con un toggle per espandere l'elenco completo. Più compatta per rose molto numerose, ma richiede un click in più ad ogni consultazione e introduce un pattern di interazione (collassa/espandi) non ancora presente altrove in questa tabella.

**Scelta confermata dall'utente: opzione (a).** Motivazione: coerenza con il trattamento già applicato agli Allenatori nella stessa pagina (stessa riga, stesso pattern `.listaAssegnatiInline`), nessuna interazione aggiuntiva da imparare. Il collassamento (opzione b) resta un'estensione possibile in una story futura se una rosa particolarmente numerosa dovesse rendere anche l'elenco orizzontale troppo esteso — non richiesto ora, non assumere che vada implementato in questa storia.

## Tasks / Subtasks

- [x] Task 1: Spostare le Atlete dalla colonna della riga principale a una nuova riga distinta (AC: #1, #2, #3, #4)
  - [x] `GruppoRow.tsx`: rimuovere il terzo `<td>` della `rigaPrincipale` (righe 92-222 nella versione corrente, contiene l'intero blocco Atlete: elenco, form "Assegna Atleta", toggle "Nuovo Atleta") — la `rigaPrincipale` resta con solo `<td>{gruppo.nome}</td>` e `<td>{gruppo.categoria}</td>`.
  - [x] Nuova `<tr className={styles.rigaAtlete}>` (mirror di `rigaAllenatori`, riga 224 in poi) con un singolo `<td colSpan={2}>` (non più 3 — la riga principale ha ora 2 colonne, non 3) contenente, nell'ordine: etichetta "Atlete:", `<ul className={styles.listaAssegnatiInline}>` con `AtletaAssegnata` invece di `AllenatoreAssegnato`, il form "Assegna Atleta" (con `styles.formInline` aggiunto, mirror del form Allenatori), il toggle "Nuovo Atleta"/pannello (Task 2/3 del codice già in produzione, spostato invariato).
  - [x] `rigaAllenatori` esistente: `colSpan` da aggiornare da `3` a `2` (la riga principale ha ora 2 colonne, non più 3) — **attenzione**, se dimenticato la tabella si disallinea silenziosamente (nessun errore a runtime, solo un layout visivamente sbagliato).
  - [x] Ordine delle due righe extra (Atlete/Allenatori) da confermare in sviluppo — nessuna preferenza esplicita dell'utente, mantenere l'ordine attuale (Allenatori) o mettere Atlete prima (probabilmente più naturale, dato che la colonna Atlete era la più a destra/ultima prima) — decisione libera dello sviluppatore, non bloccante.
- [x] Task 2: Aggiornare l'header della tabella (AC: #4)
  - [x] `page.tsx`: rimuovere `<th>Atlete</th>` dal `<thead>` — resta solo `<th>Nome</th>`/`<th>Categoria</th>`.
- [x] Task 3: CSS (AC: #2)
  - [x] `gruppi.module.css`: riusare `.listaAssegnatiInline`/`.formInline`/`.azioniCompatto` già esistenti (introdotti per Allenatori, generici — non serve duplicarli). Aggiungere solo `.rigaAtlete`/`.etichettaAtlete` se serve una regola dedicata diversa da `.rigaAllenatori`/`.etichettaAllenatori` (probabilmente identiche, valutare se riusare le stesse classi generiche invece di duplicare — es. rinominare `.etichettaAllenatori` in qualcosa di più generico se usata identica per entrambe).
- [x] Task 4: Verifica
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti — nessun test di rendering esiste per `GruppoRow.tsx` (convenzione già accettata), nessuna modifica alle Server Action quindi nessuna modifica attesa a `actions.test.ts`.
  - [x] Verifica dal vivo (aspetto visivo reale) probabilmente non eseguibile in questo sandbox per il limite già noto (motore Prisma WASM non caricabile da Node sotto `next dev`) — se il limite persiste, documentarlo come per le storie precedenti invece di darlo per scontato.

## Dev Notes

### Pattern da riusare (non reinventare)

- **Mirror esatto della riga Allenatori** (già in produzione, `GruppoRow.tsx` righe 224-268): stessa struttura `<tr><td colSpan={N}>etichetta + <ul> inline + form inline</td></tr>`. Questa storia applica lo stesso trattamento alle Atlete — non progettare un pattern nuovo.
- **`AtletaAssegnata.tsx` non richiede modifiche**: già renderizza un `<li className={styles.atletaAssegnata}>` internamente flessibile (nome + badge + pulsante Rimuovi) — il cambio da verticale a orizzontale è puramente una questione del contenitore `<ul>` (`.listaAssegnati` → `.listaAssegnatiInline`), non del componente riga stesso. Stesso principio già verificato per `AllenatoreAssegnato.tsx`.
- **Il toggle "Nuovo Atleta"** (pulsante + pannello collassabile, codice già in produzione senza story formale dedicata) si sposta invariato nella nuova riga — nessuna modifica alla sua logica (`mostraNuovaAtleta`, pattern "adjust state during render").

### Attenzione al `colSpan`

Sia `rigaAtlete` (nuova) sia `rigaAllenatori` (esistente) devono avere `colSpan={2}`, non `{3}` — la tabella ha 2 colonne nella riga principale dopo questa storia (Nome, Categoria), non più 3. `rigaAllenatori` ha oggi `colSpan={3}` (corretto quando la riga principale aveva ancora 3 colonne, incluse le Atlete) — va aggiornato a `2` **in questa storia**, non solo la nuova riga Atlete, altrimenti la tabella si disallinea silenziosamente (nessun errore, solo un layout visivamente rotto).

### Riferimenti

- [Source: app/(gruppi-allenatori)/gruppi/GruppoRow.tsx] — struttura attuale completa, incluso il mirror da riusare (`rigaAllenatori`).
- [Source: app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx] — componente riga, nessuna modifica prevista.
- [Source: app/(gruppi-allenatori)/gruppi/gruppi.module.css] — classi `.listaAssegnatiInline`/`.formInline`/`.rigaAllenatori`/`.etichettaAllenatori` già esistenti da riusare/mirrorare.
- [Source: app/(gruppi-allenatori)/gruppi/page.tsx] — header tabella da aggiornare.

### Project Structure Notes

- Nessun nuovo file, nessuna nuova migrazione, nessuna Server Action toccata — solo `GruppoRow.tsx`/`page.tsx`/`gruppi.module.css`.
- Modifica puramente di presentazione, stesso principio già dichiarato per la story diretta degli Allenatori.

## Review Findings

Code review con 3 layer adversariali paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) sul diff completo della story.

**Acceptance Auditor**: nessuna violazione degli AC — tutti e 5 verificati indipendentemente, incluso il punto specifico sul `colSpan` (entrambe le righe estese confermate a `{2}`, non solo una delle due) e la conferma che nessuna forma di collassamento (opzione (b) scartata nello studio di usabilità) sia stata implementata per errore.

- [x] [Review][Patch] Il pannello "Nuova Atleta" (paragrafo separatore + form a 6 campi), quando espanso, era un Fragment con due figli diretti dentro un `<td>` che ora è `display:flex; flex-wrap:wrap` (`.rigaAtlete td`) — prima di questa storia quel `<td>` era a layout di blocco normale, quindi i due figli si impilavano correttamente; sarebbero diventati due elementi flessibili indipendenti nella stessa riga di "Atlete:"/elenco/form-assegna/pulsante, perdendo il raggruppamento visivo del pannello. Trovato dall'Edge Case Hunter. Corretto: nuovo contenitore `.pannelloNuovaAtleta` (un solo elemento della riga flessibile esterna). [app/(gruppi-allenatori)/gruppi/GruppoRow.tsx:144-225]
- [x] [Review][Patch] Commento di intestazione di `gruppi.module.css` (righe 1-7) citava ancora `.listaAssegnati` tra le classi disponibili, ma questa storia l'ha rimossa come dead code. Trovato dall'Acceptance Auditor. Corretto. [app/(gruppi-allenatori)/gruppi/gruppi.module.css:1-7]

- [x] [Review][Defer] Il form "Assegna Atleta" (e allo stesso modo "Assegna Allenatore") usa `.formInline` (riga, nessun `flex-wrap`) — un messaggio di errore di validazione lungo non andrebbe a capo su una riga propria, si affiderebbe solo allo scroll orizzontale del contenitore esterno. Trovato dall'Edge Case Hunter. Deferred: stesso identico gap già presente nella riga Allenatori già in produzione (spedita prima di questa storia) — questa storia lo eredita invariato mirrorando lo stesso pattern, non lo introduce né lo aggrava specificamente per le Atlete. [app/(gruppi-allenatori)/gruppi/GruppoRow.tsx, gruppi.module.css]
- [x] [Review][Defer] L'errore inline per-riga di `AtletaAssegnata.tsx` (quando `rimuoviAtleta` fallisce su una singola Atleta) è ora un figlio di un `<li>` che è un elemento flessibile dentro `.listaAssegnatiInline` — un `<li>` più alto per via dell'errore potrebbe spostare/far andare a capo i chip vicini sulla stessa riga, cosa che non accadeva col vecchio elenco verticale. Trovato dal Blind Hunter. Deferred: caso raro (solo su un fallimento di rimozione), cosmetico e transitorio (sparisce al retry/dismiss), nessun impatto sui dati. [app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx, gruppi.module.css]
- [x] [Review][Defer] Il commento sopra `.rigaPrincipale td, .rigaAtlete td` afferma che il bordo separatore vive solo sull'ultima delle tre righe (`rigaAllenatori`) — vero oggi, ma fragile: l'ordine Atlete-poi-Allenatori è una scelta arbitraria dello sviluppatore (nessuna preferenza esplicita dell'utente, come dichiarato nella story stessa) e un futuro scambio d'ordine invaliderebbe silenziosamente il commento e la regola CSS. Trovato dal Blind Hunter. Deferred: nessun impatto attuale, nessun test possibile per questo tipo di invariante visivo in questo progetto. [app/(gruppi-allenatori)/gruppi/gruppi.module.css]
- [x] [Review][Defer] Le etichette "Atlete:"/"Allenatori:" sono `<span>` semplici, non associate semanticamente (`aria-labelledby`/`<label>`) all'elenco/form che seguono — utenti di screen reader ricevono una cella con lista e form non etichettati. Trovato dal Blind Hunter. Deferred: gap già pre-esistente per Allenatori (spedito prima di questa storia), questa storia lo replica invariato per le Atlete invece di introdurlo — un miglioramento di accessibilità consolidato per entrambe le righe è più adatto a una story dedicata. [app/(gruppi-allenatori)/gruppi/GruppoRow.tsx]

**Dismessi come rumore/convenzioni già accettate/decisioni già prese (7)**: riordino del paragrafo di errore nel form "Assegna Atleta" (dopo il pulsante invece che prima) non esplicitamente dichiarato nei Task — in realtà intenzionale, allinea l'ordine a quello già esistente del form Allenatori (Dev Notes: "mirror esatto della riga Allenatori"), nessun impatto funzionale, osservazione indipendente anche dell'Acceptance Auditor come "benigna"; mismatch di scala nel riuso del pattern a chip per rose numerose (10-20 Atlete) — già discusso e deliberato nello Studio di usabilità della story stessa, l'utente ha scelto esplicitamente l'opzione senza collassamento sapendo che le rose possono essere numerose; nessuna copertura automatica/test di rendering per `GruppoRow.tsx` — convenzione già accettata in tutto il progetto per componenti-riga analoghi; mismatch semantico thead/tbody (2 header, 3 tipi di riga) — gap già pre-esistente per Allenatori, non introdotto da questa storia; story segnata "review" nonostante un AC visivo non verificabile dal vivo in questo sandbox — limite già dichiarato esplicitamente nelle Completion Notes, stesso trattamento trasparente già usato per ogni storia di questa sessione con lo stesso limite; commento che cita "Story 9.33" per una parte e "senza story formale" per l'altra nello stesso blocco — chiarezza sufficiente, non un'ambiguità reale; nessun guard strutturale sul rischio `colSpan` oltre alla disciplina dello sviluppatore — stesso limite di "nessun test di rendering" già accettato sopra, lo stesso rischio esiste già per `rigaAllenatori` da prima di questa storia.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno — nessuna migrazione, nessun accesso DB necessario, nessuna Server Action toccata.

### Completion Notes List

- Implementate tutte le 4 Task/5 AC della story: `rigaPrincipale` ridotta a Nome/Categoria, nuova `rigaAtlete` (mirror di `rigaAllenatori`, elenco orizzontale via `.listaAssegnatiInline`, form "Assegna Atleta" in linea, toggle "Nuovo Atleta" spostato invariato), `colSpan` di entrambe le righe estese aggiornato a `2`, header tabella aggiornato.
- Ordine delle righe scelto: Atlete prima di Allenatori (nessuna preferenza esplicita dell'utente, lasciata allo sviluppatore per la story).
- CSS: rinominata `.etichettaAllenatori` in `.etichettaRigaEstesa` (riusata da entrambe le righe invece di duplicare la regola), rimossa `.listaAssegnati`/`.listaAssegnati li` da `gruppi.module.css` (dead code dopo questa storia — nessun altro consumer nello stesso modulo, verificato; `i-miei-gruppi.module.css` ha una propria definizione indipendente, non impattata).
- Verifica dal vivo (aspetto visivo reale) non eseguibile in questo sandbox — stesso limite già incontrato più volte in questa sessione (motore Prisma WASM non caricabile da Node sotto `next dev`). Verificato tutto il resto: 966/966 test Vitest passati (invariato, nessun test di rendering per `GruppoRow.tsx`), `eslint`/`tsc --noEmit` puliti, `npm run build` riuscita.

### File List

**Modificati:**
- `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx` (Atlete spostate dalla colonna a nuova `rigaAtlete`, `colSpan` di `rigaAllenatori` aggiornato)
- `app/(gruppi-allenatori)/gruppi/page.tsx` (header tabella: rimossa colonna "Atlete")
- `app/(gruppi-allenatori)/gruppi/gruppi.module.css` (`.etichettaAllenatori` → `.etichettaRigaEstesa`, `.rigaAtlete` aggiunta, `.listaAssegnati`/`.listaAssegnati li` rimosse)

## Change Log

- 2026-08-06: File di story creato (con studio di usabilità già svolto e decisione confermata dall'utente), stato ready-for-dev.
- 2026-08-06: Story implementata (Task 1-4 completi). Atlete spostate dalla colonna della riga principale a una nuova riga distinta a piena larghezza con elenco orizzontale, mirror esatto del trattamento già in produzione per Allenatori. `colSpan` di entrambe le righe estese aggiornato da 3 a 2 (riga principale ora a 2 colonne). CSS consolidato (`.etichettaRigaEstesa` condivisa, `.listaAssegnati` rimossa come dead code). 966/966 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: review, in attesa di code review adversariale.
- 2026-08-06: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Acceptance Auditor: nessuna violazione degli AC (verificato indipendentemente anche il punto specifico sul `colSpan` di entrambe le righe estese, e che nessuna forma di collassamento scartata nello studio di usabilità sia stata implementata per errore). 2 patch applicati: il pannello "Nuova Atleta" (separatore + form) sarebbe diventato due elementi flessibili slegati invece di un blocco raggruppato una volta che il `<td>` contenitore è diventato `display:flex` — corretto con un nuovo contenitore `.pannelloNuovaAtleta`; commento di intestazione CSS obsoleto (citava ancora `.listaAssegnati`, rimossa come dead code dalla stessa storia) — corretto. 4 defer (form "Assegna" senza `flex-wrap` per errori lunghi — gap già pre-esistente per Allenatori; errore inline per-riga di `AtletaAssegnata.tsx` che potrebbe spostare i chip vicini — raro e cosmetico; commento CSS fragile legato a un ordine di righe arbitrario; etichette "Atlete:"/"Allenatori:" senza associazione semantica/aria — gap già pre-esistente per Allenatori) — tutti coerenti con limiti/decisioni già accettati in questo progetto o già deliberati nello Studio di usabilità della story stessa, vedi `deferred-work.md`. 7 dismessi come rumore/convenzioni già accettate/decisioni già prese. 966/966 test Vitest passati, 0 errori tsc/eslint dopo i fix, build produzione riuscita. Status: done.
