---
title: "Story 20.15: Vista tabellare delle squadre iscritte per Girone"
type: 'feature'
created: '2026-08-26'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '89c040e7c57dc0babc7e294e93d767114516096f'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** su `/torneo`, quando una Categoria ha Squadre iscritte ma il calendario di girone non è ancora stato generato, ogni Girone è mostrato in una `<section>` separata con un proprio `<ul>` di Squadre — i Gironi sono impilati verticalmente, non affiancati, richiesta esplicita dell'utente ("i gironi in visualizzazione li vorrei sotto forma tabellare con le squadre sulle righe: |girone a|girone b|...|girone x|").

**Approach:** nel solo ramo "calendario non generato" (`!calendarioGenerato`) di `app/torneo/page.tsx`, sostituire il loop per-Girone (una `<section>`/`<ul>` per Girone) con un'unica `<table>` a livello di Categoria: una colonna per Girone (intestazione `<th>` = `girone.label`), le Squadre di quel Girone elencate come righe sotto la propria colonna. Il ramo "calendario già generato" (classifica + incontri) resta identico, non toccato.

## Boundaries & Constraints

**Always:** una Categoria senza alcuna Squadra iscritta in nessun Girone mostra lo stesso messaggio testuale già esistente oggi ("Nessuna squadra iscritta in questo girone."), una sola volta a livello di Categoria — mai una tabella con tutte le colonne vuote.

**Ask First:** risolto in fase di pianificazione (AskUserQuestion) — celle senza una Squadra corrispondente (righe in eccesso di un Girone più corto, o un Girone interamente senza Squadre) restano sempre semplici celle `<td>` vuote, nessun testo placeholder ("Nessuna squadra" o simile) in nessuna cella.

**Never:** nessuna modifica al ramo `calendarioGenerato` (classifica di girone + griglia incontri, righe successive del file) né alla tabella classifica esistente (`.tabellaClassifica`). Nessuna modifica alla pagina admin di gestione Squadre (`app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/page.tsx`, `SquadraTorneoRow.tsx`) — resta una vista CRUD, fuori scope. Nessuna modifica a `referente`/dati di contatto (non letti né oggi né dopo questa storia — solo `nome`/`girone` di ogni Squadra sono pubblici, invariato).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Squadre in entrambi i Gironi, numero uguale, calendario non generato | es. 4 Squadre per Girone | tabella con 2 colonne, 4 righe, ogni cella piena | N/A |
| Gironi con numero diverso di Squadre | es. 4 in Girone A, 2 in Girone B | tabella con 4 righe (il Girone più numeroso), celle vuote nelle righe 3-4 della colonna Girone B | N/A |
| Un Girone senza alcuna Squadra, l'altro con Squadre | 0 in Girone A, 3 in Girone B | tabella con 2 colonne (nessuna colonna mancante), colonna Girone A con tutte celle vuote | N/A |
| Nessuna Squadra iscritta in nessun Girone | 0 Squadre totali per la Categoria | messaggio testuale esistente, nessuna tabella | N/A |
| Calendario di girone già generato | `partite.length > 0` | comportamento identico a oggi (classifica + incontri per Girone) — nessuna regressione | N/A |

</frozen-after-approval>

## Code Map

- `app/torneo/page.tsx:227-238` -- il loop `GIRONI_TORNEO.map((girone) => {...})` gestisce oggi ENTRAMBI i rami (`!calendarioGenerato` e `calendarioGenerato`) per-Girone. Da restrutturare così: quando `calendarioGenerato` è `true`, il loop esistente (righe 227-328, `<section className={styles.sezioneGirone}>` con classifica + `.matchGrid`) resta bit-per-bit invariato. Quando `calendarioGenerato` è `false`, sostituire l'intero loop con un blocco a livello di Categoria: se `squadre.length === 0` → lo stesso `<p className={styles.messaggioSezione}>Nessuna squadra iscritta in questo girone.</p>` (una sola volta, non per-Girone); altrimenti → nuova `<table className={styles.tabellaSquadreGironi}>` con `<thead><tr>` (un `<th scope="col">{girone.label}</th>` per ogni `GIRONI_TORNEO`) e `<tbody>` con `Math.max(...squadrePerGirone.map(arr => arr.length))` righe, ogni cella = `squadrePerGirone[indiceGirone][indiceRiga]?.nome ?? null` (cella vuota se `undefined`). `squadrePerGirone` = `GIRONI_TORNEO.map((g) => squadre.filter((s) => s.girone === g.value))`, calcolato una sola volta per Categoria (non dentro il loop `GIRONI_TORNEO.map` esistente, che ora serve solo al ramo `calendarioGenerato`).
- `app/torneo/torneo-pubblico.module.css` -- nuova classe `.tabellaSquadreGironi` (+ `.tabellaSquadreGironi th, .tabellaSquadreGironi td` + `.tabellaSquadreGironi th`), mirror esatto delle dichiarazioni di `.tabellaClassifica`/`.tabellaClassifica th,td`/`.tabellaClassifica th` (righe 140-155 circa) con l'aggiunta di `margin-top: var(--space-6)` (stessa spaziatura di `.sezioneGirone`, che questa tabella sostituisce in questo stato — nessun wrapper `<section>` aggiuntivo necessario). Nome dedicato (non riuso diretto di `.tabellaClassifica`) perché semanticamente non è una classifica — nessun dato di classifica mostrato, solo nomi Squadra.
- Nessun altro file toccato.

## Tasks & Acceptance

**Execution:**
- [x] `app/torneo/page.tsx` -- sostituire il loop per-Girone nel ramo `!calendarioGenerato` con blocco a livello di Categoria (messaggio o tabella condivisa)
- [x] `app/torneo/torneo-pubblico.module.css` -- nuova classe `.tabellaSquadreGironi`

**Acceptance Criteria:** vedi `epics.md` Story 20.15 (Given/When/Then, verbatim — non duplicati qui).

## Spec Change Log

**Ciclo di review 1 (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) — 2026-08-27.** Nessun finding ha richiesto di riaprire l'Intent (nessun `intent_gap`/`bad_spec`). Verification Gap Reviewer: nessun gap (simulazione a mano dei 5 casi della matrice I/O, tutti corretti; `Math.max` non può degenerare a `-Infinity` perché `GIRONI_TORNEO` rispecchia l'intero enum Prisma `GironeTorneo`, ogni Squadra ricade sempre in esattamente un array).

**PATCH (applicati, entrambi cosmetici/robustezza, nessun impatto funzionale)**:
1. Edge Case Hunter: `.listaSquadre`/`.listaSquadre li`/`.listaSquadre li:last-child` (`torneo-pubblico.module.css`) erano diventate CSS morto — l'unico consumer (`<ul>` per-Girone) è stato rimosso da questa storia. Rimosse.
2. Blind Hunter: le `<td>` della tabella condivisa usavano l'indice di array come `key` invece di `girone.value` (`GIRONI_TORNEO[indiceGirone].value`), incoerente con l'`<th>` sopra che già usa `girone.value`. Corretto per coerenza/robustezza React.

Finding scartati (già decisi esplicitamente in fase di pianificazione/frozen intent, o pattern preesistenti non introdotti da questa storia): messaggio "Nessuna squadra iscritta in questo girone." riusato al livello di Categoria (AC #3 lo richiede letteralmente, "mantiene il messaggio esistente"); celle vuote senza testo placeholder per righe in eccesso/Gironi vuoti (deciso via AskUserQuestion in fase di pianificazione, opzione "sempre celle vuote"); nome CSS dedicato `.tabellaSquadreGironi` invece di riuso di `.tabellaClassifica` (motivato esplicitamente nelle Design Notes, già approvato al checkpoint); Squadre con `girone` fuori da `GIRONI_TORNEO` (impossibile - enum Prisma type-checked, nessun valore libero); nessun ordinamento esplicito delle Squadre nella colonna (stesso comportamento del `<ul>` rimosso, nessuna regressione); nessun test di rendering per la nuova tabella (convenzione già stabilita e confermata più volte in questa epica: zero `*.test.tsx`/rendering test in tutto `app/`); nessuna distinzione visiva tra "Girone vuoto" e "riga in eccesso" (stessa decisione dell'AskUserQuestion sopra); duplicazione tra `squadrePerGirone` (nuovo ramo) e `squadreDelGirone` ricalcolato nel ramo `calendarioGenerato` (rami volutamente separati dalla spec, toccare il ramo `calendarioGenerato` avrebbe violato il Boundary "Never").

Riverificato dopo le patch: `npx vitest run` (120 file, 1853 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 21 warning preesistenti).

## Design Notes

**Perché il loop `GIRONI_TORNEO.map` non basta più per il ramo `!calendarioGenerato`:** quel loop produce naturalmente contenuto per-Girone (una `<section>` a Girone); la richiesta esplicita dell'utente è una tabella condivisa con i Gironi come colonne — struttura ortogonale, non ottenibile mantenendo il loop per-Girone invariato per questo stato specifico.

**Perché `squadrePerGirone` è calcolato una volta a livello di Categoria:** ogni cella deve conoscere sia il proprio Girone (colonna) sia il proprio indice di riga — precalcolare l'array per Girone evita di rifiltrare `squadre` per ogni singola cella (Gironi × righe volte) dentro il render.

## Verification

**Commands:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`

**Manual checks (obbligatorio, da demandare all'utente dopo il deploy — stesso vincolo di ogni story di questa epica, dev locale rotto):** aprire `/torneo` su una Categoria con calendario non ancora generato e Squadre in entrambi i Gironi con numero diverso; verificare tabella con 2 colonne, righe in eccesso vuote nella colonna del Girone più corto; verificare che una Categoria senza Squadre mostri il messaggio testuale esistente, non una tabella vuota; verificare nessuna regressione sulla vista con calendario già generato (classifica + incontri).

## Suggested Review Order

**Tabella condivisa — nuovo ramo**

- Precalcolo di `squadrePerGirone` a livello di Categoria, unica fonte per righe/colonne della tabella.
  [`page.tsx:219`](../../app/torneo/page.tsx#L219)

- Punto di diramazione: ramo `calendarioGenerato` (loop per-Girone invariato) vs. nuovo ramo Categoria-level.
  [`page.tsx:236`](../../app/torneo/page.tsx#L236)

- Rendering della tabella condivisa (colonne = Gironi, righe = indice, celle vuote per righe in eccesso).
  [`page.tsx:346`](../../app/torneo/page.tsx#L346)

**Stile**

- Nuova classe `.tabellaSquadreGironi`, mirror di `.tabellaClassifica`.
  [`torneo-pubblico.module.css:143`](../../app/torneo/torneo-pubblico.module.css#L143)
