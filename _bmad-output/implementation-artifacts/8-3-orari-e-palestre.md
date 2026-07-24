---
baseline_commit: e3d8503240ab39760a04d285ea047ce770658541
---

# Story 8.3: Orari e Palestre

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore, Atleta, Segreteria, Dirigente o Admin,
I want vedere le pagine di palestre/slot/orari con l'identità visiva della società,
so that consultare/gestire l'orario sia un'esperienza coerente col resto dell'app, specialmente da smartphone in palestra (NFR3).

## Acceptance Criteria

1. **Given** le pagine `/palestre`, `/slot`, `/orari`, `/mio-orario`, **when** vengono visualizzate, **then** applicano i token di `DESIGN.md` tramite un CSS module dedicato.
2. **Given** `/mio-orario`, **when** viene visualizzata, **then** segue il mockup key-screen già approvato (`ux-designs/ux-societa-manager-2026-07-22/mockups/key-mio-orario.html`).
3. **Given** le stesse pagine, **when** vengono usate normalmente, **then** il comportamento resta identico a prima — nessuna regressione, suite Vitest invariata.

## Contesto: perché questa storia esiste

Retrofit del design system sulle pagine del modulo Orari-Palestre (AD-2), rimaste allo scaffold grezzo. Restyle puro secondo il vincolo trasversale dell'Epic 8, con **un'eccezione dichiarata e necessaria** per `/mio-orario` — vedi "Decisione: /mio-orario diverge da `SlotTable`" più sotto.

## ⚠️ Decisione presa in fase di creazione di questa storia (non riaprire senza nuova elicitazione)

`SlotTable.tsx` (`app/(orari-palestre)/SlotTable.tsx`) è un componente condiviso usato da 3 pagine (`/slot`, `/orari`, `/mio-orario`) — introdotto in Story 2.8 esplicitamente per evitare che `/mio-orario` diventasse "una quarta copia divergente" dello stesso identico formato tabellare (Giorno/Orario/Palestra-Campo/Gruppo).

Il mockup approvato per `/mio-orario` (`mockups/key-mio-orario.html`) **non è una tabella**: è una lista raggruppata per giorno (`.day-group` → `.day-label` + più `.slot-row`, ognuna con orario/gruppo/palestra in un formato a card, non a colonne). L'AC #2 di questa storia richiede esplicitamente che `/mio-orario` segua quel mockup — un vincolo specifico a questa sola pagina, che nessun'altra storia/AC impone su `/slot` o `/orari`.

**Risoluzione:** `/mio-orario` smette di usare `<SlotTable>` e adotta un markup proprio (raggruppato per giorno, card `slot-row`) — la stessa identica lista `slot` già calcolata da `unisciESordinaSlot` (nessuna nuova query/logica), solo un rendering diverso. `/slot` e `/orari` continuano a usare `<SlotTable>` invariato (solo restyle via CSS module). Questa è un'eccezione mirata e dichiarata al vincolo generale dell'Epic 8 "solo className sopra il markup esistente": qui la riorganizzazione del JSX è imposta dall'AC stesso (non è possibile soddisfare "segue il mockup" per una lista raggruppata usando solo CSS su una struttura `<table>`), non una libera reinterpretazione.

**Vincolo aggiuntivo, non negoziabile:** il mockup mostra date di calendario specifiche ("Martedì 15/07", intestazione "Settimana 14–20 luglio") che **non esistono nel modello dati reale** — `Slot.giorno` è un giorno-della-settimana ricorrente per l'intera stagione (`GiornoSettimana`, AD-8), non un'istanza datata. Calcolare "la settimana corrente con date reali" sarebbe una nuova logica di business, fuori scope per un restyle (violerebbe il vincolo dell'Epic 8 "nessuna modifica a query/comportamento/struttura dati"). **Non inventare questa logica.** Riprendi solo la struttura visiva del mockup (raggruppamento per giorno, card `slot-row`, etichette di sezione) applicata ai dati reali già disponibili:
- Raggruppa `slot` per `giorno`, nell'ordine di `GIORNI_SETTIMANA` (`lib/giorno-settimana.ts`) — Lunedì→Domenica, non l'ordine di arrivo dei dati.
- Etichetta di ogni gruppo: `ETICHETTA_GIORNO[giorno]` (es. "Martedì"), **senza** una data di calendario inventata (niente "15/07").
- Titolo pagina: lascia `<h1>Il mio orario</h1>` (già presente, invariato) — non introdurre un sottotitolo tipo "Settimana 14–20 luglio" che non ha corrispondenza nei dati.
- Ogni riga slot (`slot-row`): orario (`oraInizio`–`oraFine`), nome gruppo, palestra/campo — stessi campi già letti oggi da `SlotTable`, nessun nuovo campo da recuperare.

## Tasks / Subtasks

- [x] Task 1: `app/(orari-palestre)/palestre/palestre.module.css` (nuovo, un solo file condiviso da tutti i componenti della route) + applica classi (AC #1, #3)
  - [x] `page.tsx`: contenitore sezioni ("Nuova Palestra", "Elenco Palestre").
  - [x] `NuovaPalestraForm.tsx`: riusa 1:1 il pattern `.campo`/`.bottone`/`.errore`/`.successo` già stabilito in Story 8.2 (`accedi.module.css` ecc.) — stessi valori esatti (bordo/radius/focus-ring/uppercase/tracking), solo copiati in questo nuovo file (nessun import cross-route, stessa convenzione già in uso: ogni route ha il proprio CSS module).
  - [x] `PalestraRow.tsx` (`<article>`): stile a card — riusa 1:1 il pattern `.card` già stabilito in `vista-dirigente.module.css` (Story 5.1: `border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); background: var(--color-surface);`). Il form di modifica dentro la card riusa `.campo`/`.bottone`/`.errore`.
  - [x] `CampoRow.tsx` (`<li>`): riga compatta dentro la card, riusa `.campo`/`.bottone`/`.errore`.
  - [x] `NuovoCampoForm.tsx`: riusa `.campo`/`.bottone`/`.errore`.
  - [x] Nessuna modifica a `actions.ts`/`actions.test.ts`.
- [x] Task 2: `app/(orari-palestre)/SlotTable.module.css` (nuovo, colocato con `SlotTable.tsx` — componente condiviso da `/slot` e `/orari`, **non** da `/mio-orario` dopo Task 5) + applica classi (AC #1, #3)
  - [x] Stile tabella (`<table>`/`<thead>`/`<tbody>`/`<th>`/`<td>`) con i token di `DESIGN.md` — nessun pattern tabellare esiste ancora nel codebase sotto il design system: deriva coerenza dai token base (bordo `var(--color-border)`, testo `var(--color-text-primary)`/intestazioni `var(--color-text-secondary)`, spaziatura `var(--space-*)`), stesso principio già applicato in Story 8.2 per i campi form.
  - [x] Il messaggio `messaggioVuoto` (`<p>`) usa lo stesso stile "testo secondario/italico" già stabilito in `vista-dirigente.module.css`/`permessi-certificati.module.css` (`.messaggioVuoto`/`.aiuto`: `font-size: 13px; color: var(--color-text-secondary);`).
  - [x] Nessuna modifica alla firma/logica di `SlotTable` (props, `messaggioVuoto` opzionale) — solo `className`.
- [x] Task 3: `app/(orari-palestre)/slot/slot.module.css` (nuovo) + applica classi in `page.tsx`/`NuovoSlotForm.tsx` (AC #1, #3)
  - [x] `NuovoSlotForm.tsx` ha 3 `<select>` (giorno/campo/gruppo) e 2 `<input type="time">` — **estendi** il pattern `.campo` di Story 8.2 con una regola `.campo select` identica a `.campo input` (stesso bordo/radius/padding/focus-ring): nessun `<select>` è mai stato stilizzato prima in questa codebase, prima occorrenza.
  - [x] `page.tsx`: contenitore sezioni ("Nuovo Slot", "Elenco Slot" — quest'ultima usa `<SlotTable>`, già coperta da Task 2).
  - [x] Nessuna modifica a `actions.ts`/`actions.test.ts`.
- [x] Task 4: `app/(orari-palestre)/orari/orari.module.css` (nuovo) + applica classi in `page.tsx` (AC #1, #3)
  - [x] Form di filtro (`<select>` Palestra/Gruppo + pulsante "Filtra") — riusa `.campo select` (Task 3, stesso pattern, copiato in questo file) e `.bottone`.
  - [x] Sezione "Elenco Slot" usa `<SlotTable>`, già coperta da Task 2.
  - [x] Nessuna modifica alla logica di `searchParams`/filtro.
- [x] Task 5: `app/(orari-palestre)/mio-orario/mio-orario.module.css` (nuovo) + **ristruttura** (solo presentazionale) `page.tsx` per seguire il mockup (AC #1, #2, #3)
  - [x] Letta la sezione "⚠️ Decisione" — nessuna data di calendario inventata, nessuna nuova query.
  - [x] `<SlotTable>` sostituito da `raggruppaPerGiorno` (funzione locale pura in `page.tsx`, sfrutta l'ordine già garantito da `unisciESordinaSlot` raggruppando per cambio di `giorno` consecutivo — nessun bisogno di iterare `GIORNI_SETTIMANA` a parte) + rendering `.giornoGruppo`/`.giornoLabel` (`ETICHETTA_GIORNO[giorno]`, sezione-label 11px/900/uppercase/`var(--color-navy)`) + `.slotRiga` (`var(--color-surface-alt)`/`var(--radius-sm)`, orario+dettagli) per ogni Slot.
  - [x] Messaggio vuoto (`slot.length === 0`) invariato testualmente, solo classe `.messaggioVuoto`.
  - [x] Messaggio "account non ancora collegato" invariato (nessuna classe necessaria).
  - [x] Nessuna modifica a `unisciESordinaSlot`, alle query Prisma, alla logica di risoluzione Allenatore/Atleta — solo il blocco JSX finale ristrutturato.
- [x] Task 6: Verifica (AC #1, #2, #3)
  - [x] `npx tsc --noEmit` pulito.
  - [x] Suite Vitest completa invariata: 468/468 test passati (nessun nuovo test — `SlotTable`/le pagine sono Server/Client Component, mai testate con un test-runner React in questa codebase; `actions.test.ts` di `/palestre` e `/slot` intoccati).
  - [x] Verifica dal vivo parziale: dev server avviato (dopo `rm -rf .next`), le 4 route restituiscono 307 verso `/accedi` (nessuna sessione autenticata in questa verifica — comportamento invariato del route guard, non una regressione), nessun errore di compilazione/runtime nei log del dev server. **Non verificato** con una sessione autenticata reale il rendering effettivo delle classi CSS module e del raggruppamento per giorno di `/mio-orario` (nessun ambiente Docker+Supabase locale allestito per questa storia, stessa limitazione dichiarata in Story 8.2) — rischio mitigato da: `tsc`/Vitest puliti, ispezione diretta del codice per ogni file.

## Dev Notes

- **Restyle puro con un'unica eccezione dichiarata** (`/mio-orario`, vedi sezione "⚠️ Decisione" sopra) — per `/palestre`, `/slot`, `/orari` vale lo stesso vincolo di Story 8.2: nessuna modifica a Server Action/query/comportamento, solo `className`/CSS module.
- **`SlotTable` è condiviso da 2 pagine dopo questa storia** (`/slot`, `/orari`), non più 3 — `/mio-orario` se ne stacca (Task 5). Non è una regressione della decisione DRY di Story 2.8: è un'eccezione mirata imposta dall'AC #2 di questa storia specifica, già discussa e approvata sopra.
- **Riuso obbligatorio dei pattern già stabiliti** (non reinventare): `.campo`/`.campo input`/`.bottone`/`.errore`/`.successo` da Story 8.2 (`_bmad-output/implementation-artifacts/8-2-onboarding-e-autenticazione.md`, File List); `.card` da `vista-dirigente.module.css` (Story 5.1); `.messaggioVuoto`/`.aiuto` da `vista-dirigente.module.css`/`permessi-certificati.module.css`. Ogni file CSS di questa storia copia gli stessi valori esatti (nessun import cross-route — ogni route ha sempre avuto il proprio file, invariato in questa storia).
- **Prima occorrenza di `<select>` da stilizzare** — Story 8.2 aveva solo `<input>` (text/email/password/file). Estendi `.campo` con `.campo select` identico a `.campo input` (stesso bordo/radius/padding/focus-visible) in `slot.module.css` e `orari.module.css`.
- **Focus da tastiera**: applica lo stesso `:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }` su ogni elemento interattivo nuovo (select, righe cliccabili se presenti) — Story 8.2 code review ha già segnalato e corretto una dimenticanza analoga su checkbox/link; non ripetere l'omissione qui su `<select>`.
- **Nessun colore hardcoded fuori da `var(--color-*)`** — verificato esplicitamente dall'Acceptance Auditor in Story 8.2 code review come criterio di conformità AC1; stesso criterio qui.

### Project Structure Notes

- Nuovi file: `app/(orari-palestre)/palestre/palestre.module.css`, `app/(orari-palestre)/SlotTable.module.css`, `app/(orari-palestre)/slot/slot.module.css`, `app/(orari-palestre)/orari/orari.module.css`, `app/(orari-palestre)/mio-orario/mio-orario.module.css`.
- File modificati: `palestre/page.tsx`, `palestre/PalestraRow.tsx`, `palestre/CampoRow.tsx`, `palestre/NuovaPalestraForm.tsx`, `palestre/NuovoCampoForm.tsx`, `SlotTable.tsx`, `slot/page.tsx`, `slot/NuovoSlotForm.tsx`, `orari/page.tsx`, `mio-orario/page.tsx` (quest'ultimo con ristrutturazione presentazionale, non solo `className` — vedi Task 5).
- Nessuna migrazione, nessuna modifica a `prisma/schema.prisma`, nessuna modifica a `actions.ts`/`actions.test.ts` in nessuna route.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8, Story 8.3] — AC originali.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/mockups/key-mio-orario.html] — mockup key-screen per `/mio-orario`: `.day-group`/`.day-label`/`.slot-row`/`.slot-time`/`.slot-details`/`.slot-group`/`.slot-place` — riferimento di composizione, spec vince in caso di conflitto (coerente con `EXPERIENCE.md`, UJ-2).
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md] — token; nessun componente "tabella" o "select" esplicitamente definito (stesso tipo di gap già colmato in Story 8.2 per i campi form).
- [Source: app/(amministrazione)/vista-dirigente/vista-dirigente.module.css] — pattern `.card`/`.messaggioVuoto` da riusare identici.
- [Source: _bmad-output/implementation-artifacts/8-2-onboarding-e-autenticazione.md] — pattern `.campo`/`.bottone`/`.errore`/`.successo` da riusare identici; nota sulla code review (focus-visible su ogni elemento interattivo, non solo input/button).
- [Source: app/(orari-palestre)/SlotTable.tsx] — commento originale (Story 2.8): componente condiviso per evitare "una quarta copia divergente" — motivo per cui l'eccezione di Task 5 va dichiarata esplicitamente, non fatta silenziosamente.
- [Source: lib/giorno-settimana.ts] — `GIORNI_SETTIMANA` (ordine Lunedì→Domenica), `ETICHETTA_GIORNO` — da riusare per il raggruppamento di Task 5, non reinventare un ordine/etichette proprie.
- [Source: app/(orari-palestre)/mio-orario/page.tsx] — `unisciESordinaSlot`, risoluzione Allenatore/Atleta: letti integralmente in fase di creazione di questa storia, nessuna modifica prevista a questa logica.

### Review Findings

- [x] [Review][Patch] `SlotRiga` era definito due volte in modo identico (`SlotTable.tsx` e `mio-orario/page.tsx`) invece di una sola fonte condivisa — in tensione col motivo per cui `SlotTable` stesso era stato estratto (Story 2.8: "evitare una quarta copia divergente") [app/(orari-palestre)/SlotTable.tsx, app/(orari-palestre)/mio-orario/page.tsx] — risolto esportando `SlotRiga` da `SlotTable.tsx` e importandolo in `mio-orario/page.tsx`, nessuna copia residua; verificato `tsc`/Vitest invariati
- [x] [Review][Patch] La `<table>` di `SlotTable` non aveva un contenitore con `overflow-x` — su viewport stretto una tabella a 4 colonne (Giorno/Orario/Palestra-Campo/Gruppo) rischiava di essere tagliata silenziosamente da `overflow-x: hidden` su `<body>` (`app/globals.css`) invece di restare scorrevole, rilevante per NFR3 ("mobile-first... da smartphone in palestra", citato esplicitamente nella user story di questa storia) [app/(orari-palestre)/SlotTable.tsx, SlotTable.module.css] — risolto avvolgendo `<table>` in un `<div className={styles.scrollWrapper}>` (`overflow-x: auto`)
- [x] [Review][Patch] Il testo della Task 3 di questa storia riportava erroneamente "4 `<select>`" in `NuovoSlotForm.tsx`, che in realtà ne ha 3 (giorno/campo/gruppo) — refuso nel testo della storia, non un difetto di codice (l'implementazione copre correttamente tutti e 3 i `<select>` reali) [_bmad-output/implementation-artifacts/8-3-orari-e-palestre.md] — corretto il conteggio nel testo
- [x] [Review][Defer] CSS duplicato quasi verbatim (`.campo`/`.bottone`/`.errore`/`.successo`/`.sezione`) fra i 3 nuovi CSS module di questa storia e quelli di Story 8.2 — nessun meccanismo `composes` è mai stato usato in questa codebase, convenzione esplicita (un CSS module indipendente per route), non un difetto di questa storia [app/(orari-palestre)/palestre/palestre.module.css, slot/slot.module.css, orari/orari.module.css]
- [x] [Review][Defer] `.errore`/`.successo` usano solo colore testo, non le varianti `-bg` di `DESIGN.md` — stesso pattern già introdotto (e non corretto) in Story 8.2, non una regressione di questa storia [tutti i nuovi CSS module di questa storia]
- [x] [Review][Defer] `raggruppaPerGiorno` si fida che `slot` arrivi ordinato/contiguo per giorno e che ogni `giorno` sia una chiave nota di `ETICHETTA_GIORNO`, senza guardia difensiva propria — garantito oggi dal tipo `GiornoSettimana` di Prisma e da `GIORNI_SETTIMANA` come unica fonte di verità, stessa classe di fiducia in un invariante già estesa altrove nel progetto [app/(orari-palestre)/mio-orario/page.tsx]
- [x] [Review][Defer] `raggruppaPerGiorno` non ha copertura di test dedicata (funzione pura colocata in `page.tsx`, non estratta in `lib/` come `unisciESordinaSlot`) — divergenza minore dalla convenzione di Story 2.7, da valutare se riusata altrove in futuro [app/(orari-palestre)/mio-orario/page.tsx]
- [x] [Review][Defer] La conversione da tabella a card raggruppate in `/mio-orario` perde l'associazione semantica header-colonna per screen reader — la tabella originale non aveva comunque `scope="col"` sui propri `<th>`, quindi non era pienamente accessibile nemmeno prima; un miglioramento reale richiede una scelta di formulazione/UX non banale [app/(orari-palestre)/mio-orario/page.tsx]
- [x] [Review][Defer] Il rendering a card di `/mio-orario` e quello a tabella di `SlotTable` non condividono markup/classi pur rappresentando la stessa forma di Slot — conseguenza diretta e accettata della "Decisione" esplicita di questa storia, non da riaprire senza nuova elicitazione [app/(orari-palestre)/mio-orario/page.tsx, app/(orari-palestre)/SlotTable.tsx]
- [x] [Review][Dismiss] Nuovi `<div>` wrapper introdotti in `palestre/page.tsx` (`.lista`), `CampoRow.tsx`/`NuovoCampoForm.tsx` (`.campo`) — tecnicamente nuovo markup, non solo `className` su elementi esistenti; stesso identico pattern già accettato senza obiezioni nella code review di Story 8.2, zero impatto comportamentale, necessario per applicare stili flex-column/gap a un gruppo di elementi
- [x] [Review][Dismiss] `.sezione h2` (13px) non corrisponde a nessun token tipografico letterale di `DESIGN.md` (11px section-label o 13.5px body-strong più vicini) — stessa categoria di gap-filling già accettata per `.campo label` in Story 8.2, decisione necessaria per un componente non definito da `DESIGN.md`

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- Dev server riavviato dopo `rm -rf .next` per la verifica dal vivo (stessa nota di manutenzione nota da sessioni precedenti).
- Le 4 route sono protette dal route guard: senza sessione autenticata restituiscono 307 verso `/accedi` — verificato che nessun errore di compilazione/runtime compaia nei log del dev server, ma il rendering effettivo (classi CSS, raggruppamento per giorno) non è stato ispezionato con una sessione reale in questa sessione.

### Completion Notes List

- `/palestre`, `/slot`, `/orari`: restyle puro, CSS module dedicati, riuso 1:1 dei pattern `.campo`/`.bottone`/`.errore`/`.successo` (Story 8.2) e `.card` (Story 5.1, `vista-dirigente.module.css`). Prima estensione di `.campo` a `<select>` (`.campo select`, stesso trattamento di `.campo input`).
- `SlotTable.tsx` (condiviso da `/slot` e `/orari`): nuovo `SlotTable.module.css`, nessuna modifica a props/logica.
- `/mio-orario`: **eccezione dichiarata** al vincolo "solo className" — smette di usare `<SlotTable>` (tabella) e adotta un rendering proprio raggruppato per giorno (`raggruppaPerGiorno`, funzione locale pura) per soddisfare l'AC #2 (segue `mockups/key-mio-orario.html`). Nessuna data di calendario inventata (il mockup mostra date specifiche non presenti nel modello dati reale, `Slot.giorno` è ricorrente non datato) — solo il nome del giorno (`ETICHETTA_GIORNO`). Nessuna modifica a query/logica di risoluzione Allenatore/Atleta.
- Nessuna modifica a `actions.ts`/`actions.test.ts` in nessuna route.
- `npx tsc --noEmit` pulito. Suite Vitest: 468/468 test passati, nessun nuovo test (invariato rispetto a Story 8.1/8.2).

### File List

- `app/(orari-palestre)/palestre/palestre.module.css` (nuovo)
- `app/(orari-palestre)/palestre/page.tsx` (modificato: `className` su sezioni/lista)
- `app/(orari-palestre)/palestre/PalestraRow.tsx` (modificato: `className` su card/campo/errore/pulsante/lista campi)
- `app/(orari-palestre)/palestre/CampoRow.tsx` (modificato: `className` su campo/errore/pulsante)
- `app/(orari-palestre)/palestre/NuovaPalestraForm.tsx` (modificato: `className` su campo/errore/successo/pulsante)
- `app/(orari-palestre)/palestre/NuovoCampoForm.tsx` (modificato: `className` su campo/errore/pulsante)
- `app/(orari-palestre)/SlotTable.module.css` (nuovo; review fix: aggiunto `.scrollWrapper`)
- `app/(orari-palestre)/SlotTable.tsx` (modificato: `className` su tabella/messaggio vuoto; review fix: `SlotRiga` esportato, `<table>` avvolta in `.scrollWrapper`)
- `app/(orari-palestre)/slot/slot.module.css` (nuovo)
- `app/(orari-palestre)/slot/page.tsx` (modificato: `className` su sezioni)
- `app/(orari-palestre)/slot/NuovoSlotForm.tsx` (modificato: `className` su campo/select/errore/successo/pulsante)
- `app/(orari-palestre)/orari/orari.module.css` (nuovo)
- `app/(orari-palestre)/orari/page.tsx` (modificato: `className` su sezioni/filtro/campo/pulsante)
- `app/(orari-palestre)/mio-orario/mio-orario.module.css` (nuovo)
- `app/(orari-palestre)/mio-orario/page.tsx` (ristrutturato: sostituito `<SlotTable>` con rendering raggruppato per giorno, nuova funzione locale `raggruppaPerGiorno`; review fix: `SlotRiga` importato da `../SlotTable` invece di ridefinito localmente)
