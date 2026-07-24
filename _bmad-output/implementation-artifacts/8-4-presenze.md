---
baseline_commit: e3d8503240ab39760a04d285ea047ce770658541
---

# Story 8.4: Presenze

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore o Atleta,
I want vedere le pagine di registrazione/storico presenze con l'identità visiva della società,
so that il Key Flow più usato dell'app (registrazione presenze a fine allenamento) sia curato quanto gli altri.

## Acceptance Criteria

1. **Given** le pagine `/presenze`, `/storico-presenze`, **when** vengono visualizzate, **then** applicano i token di `DESIGN.md` tramite un CSS module dedicato.
2. **Given** `/presenze`, **when** viene visualizzata, **then** segue il mockup key-screen già approvato (`ux-designs/ux-societa-manager-2026-07-22/mockups/key-presenze.html`).
3. **Given** le stesse pagine, **when** vengono usate normalmente, **then** il comportamento (salvataggio esplicito, alert certificato scaduto non bloccante FR-15) resta identico a prima — nessuna regressione, suite Vitest invariata.

## Contesto: perché questa storia esiste

Retrofit del design system sul modulo Presenze (AD-2) — il Key Flow più usato dell'app (UJ-2, Marco). A differenza di Story 8.3 (`/mio-orario`), qui il mockup **non richiede** una ristrutturazione: `attendance-row` è già un componente nominato in `DESIGN.md` → Componenti, e il markup esistente di `PresenzeForm.tsx` (checkbox + nome + badge opzionale in un `<li>`) è già strutturalmente compatibile con quel componente — serve solo applicare classi, non riorganizzare il JSX. Questa è **la prima implementazione reale** in questa codebase dei componenti `attendance-row` e `badge` di `DESIGN.md` (Story 5.1/5.2 hanno costruito solo `stat-tile`/`card`).

## Tasks / Subtasks

- [x] Task 1: `app/(presenze)/presenze/presenze.module.css` (nuovo) + applica classi in `page.tsx`/`PresenzeForm.tsx` (AC #1, #2, #3)
  - [x] Form di filtro (select Slot + input data + pulsante "Carica") — riusa `.campo select`/`.campo input`/`.bottoneCarica` (stesso pattern Story 8.2/8.3, incluso `:focus-visible`).
  - [x] **Intestazione Slot** (`.slotHeader`/`.sezioneLabel`/`.slotTitolo`, coerente col mockup `.slot-header`/`.section-label`/`.slot-title`): mostra `ETICHETTA_GIORNO[slotSelezionato.giorno]` + data formattata `GG/MM` + `oraInizio`–`oraFine` + `gruppo.nome`. Renderizzata solo nel ramo che mostra davvero il roster (non nei rami di errore).
  - [x] **Riga presenza** (`.riga`, componente `attendance-row` di `DESIGN.md`): sfondo `var(--color-surface-alt)`, `border-radius: var(--radius-sm)`, checkbox a sinistra, nome in body-strong, badge opzionale a destra (`margin-left: auto`). **`min-height: 44px`** sulla riga intera.
  - [x] **Badge "Certificato scaduto"** (`.badge`, componente `badge` di `DESIGN.md`): variante **warning**, **mai danger**.
  - [x] **Pulsante "Salva presenze"** (`.bottoneSalva`): a piena larghezza, coerente col mockup.
  - [x] Messaggi di errore/successo (`role="alert"`/`role="status"`, invariati) — riusa `.errore`/`.successo`.
  - [x] Nessuna modifica a `actions.ts`/`actions.test.ts`/`certificato-scaduto.ts`/`certificato-scaduto.test.ts` — solo `className` + formattazione data presentazionale.
- [x] Task 2: `app/(presenze)/storico-presenze/storico-presenze.module.css` (nuovo) + applica classi in `page.tsx` (AC #1, #3)
  - [x] Nessun mockup key-screen per questa pagina — restyle puro, stesso approccio di `/slot`/`/orari` (Story 8.3).
  - [x] Form di filtro Atleta (Allenatore) — riusa `.campo select`/`.bottone`.
  - [x] Tabella storico (`StoricoTable`) — riusa 1:1 il pattern `.tabella`/`.scrollWrapper` già stabilito in `SlotTable.module.css` (Story 8.3, incluso il fix di code review sull'overflow).
  - [x] Riga statistiche — percentuale in body-strong (`.percentuale`), nessun nuovo componente stat-tile inventato.
  - [x] Messaggi "Nessuna Presenza registrata."/"Atleta non trovata tra le tue." — stile `.messaggioVuoto`/`.errore`.
  - [x] Nessuna modifica a `calcola-statistiche-presenza.ts`/test, a `lib/db-rls/presenza.ts`, alla logica di risoluzione Allenatore/Atleta.
- [x] Task 3: Verifica (AC #1, #2, #3)
  - [x] `npx tsc --noEmit` pulito.
  - [x] Suite Vitest completa invariata: 468/468 test passati (nessun nuovo test — `actions.test.ts`, `certificato-scaduto.test.ts`, `calcola-statistiche-presenza.test.ts` intoccati).
  - [x] Verifica dal vivo parziale: dev server avviato (dopo `rm -rf .next`), le 2 route restituiscono 307 verso `/accedi` (nessuna sessione autenticata in questa verifica — comportamento invariato del route guard), nessun errore di compilazione/runtime nei log del dev server. **Non verificato** con una sessione autenticata reale il rendering effettivo (attendance-row/badge/intestazione Slot) — stessa limitazione dichiarata in Story 8.2/8.3, nessun ambiente Docker+Supabase locale allestito per questa storia. Ispezione diretta del codice conferma: nessun colore hardcoded fuori da `var(--color-*)`; badge in variante warning (mai danger); pulsante "Salva presenze" senza alcun collegamento a `certificatoScaduto` (nessun `disabled`/`required` condizionato, FR-15 invariato).

## Dev Notes

- **Restyle puro con un piccolo elemento presentazionale nuovo** (l'intestazione Slot in `/presenze`, Task 1) — a differenza dell'eccezione di Story 8.3 (`/mio-orario`, ristrutturazione del rendering), qui non serve alcuna ristrutturazione: solo `className` + la formattazione di dati già caricati (nessuna nuova query, nessuna nuova logica di business). Per `/storico-presenze`, restyle puro identico a `/slot`/`/orari`.
- **Prima implementazione reale di `attendance-row` e `badge`** (componenti nominati in `DESIGN.md` ma mai costruiti prima) — segui `DESIGN.md` → Componenti alla lettera per questi due, non inventare varianti.
- **Regola non negoziabile del badge**: variante warning per lo stato "certificato scaduto" a livello di singola atleta, **mai** danger — già rispettata dal codice esistente (`PresenzeForm.tsx` non ha logica di stato, riceve `certificatoScaduto: boolean` già calcolato da `certificato-scaduto.ts`), qui si applica solo lo stile giusto alla condizione già esistente.
- **Target di tocco ≥44×44px** (`EXPERIENCE.md` → Primitive di Interazione) sulla riga presenza — il mockup mostra un checkbox 20×20 a scopo illustrativo, non come target di tocco letterale; applica `min-height: 44px` alla riga (`.riga`), non solo al checkbox. Stesso principio "spec vince sul mockup in caso di conflitto" già visto in Story 8.3.
- **Pulsante "Salva presenze" a piena larghezza** — unica storia dell'Epic 8 dove il pulsante primario non è `align-self: flex-start` (compatto): il mockup lo mostra esplicitamente a piena larghezza per un'azione di salvataggio a fine lista lunga su mobile. Non "correggere" questo per farlo combaciare col pattern compatto delle altre storie — qui la spec (il mockup, AC #2) lo richiede esplicitamente diverso.
- **Riuso obbligatorio** (non reinventare): `.campo`/`.campo select`/`.campo input`/`.bottone`/`.errore`/`.successo` da Story 8.2/8.3; `.tabella`/`.scrollWrapper` da `SlotTable.module.css` (Story 8.3, incluso il fix overflow già imparato in code review — non ripetere la stessa dimenticanza qui).
- **Focus da tastiera su checkbox**: applica `:focus-visible` sul checkbox della riga presenza fin da subito (Story 8.2 aveva dimenticato questo esatto dettaglio su checkbox/link in prima battuta, corretto solo in code review — non ripetere l'omissione qui).
- **Nessun colore hardcoded fuori da `var(--color-*)`** — stesso criterio di conformità verificato dall'Acceptance Auditor in ogni storia precedente dell'Epic 8.

### Project Structure Notes

- Nuovi file: `app/(presenze)/presenze/presenze.module.css`, `app/(presenze)/storico-presenze/storico-presenze.module.css`.
- File modificati: `app/(presenze)/presenze/page.tsx` (className + intestazione Slot presentazionale), `app/(presenze)/presenze/PresenzeForm.tsx` (className), `app/(presenze)/storico-presenze/page.tsx` (className, incluso il componente async interno `StoricoTable`).
- Nessuna migrazione, nessuna modifica a `prisma/schema.prisma`, nessuna modifica a `actions.ts`/`actions.test.ts`/`certificato-scaduto.ts`/`certificato-scaduto.test.ts`/`calcola-statistiche-presenza.ts`/`calcola-statistiche-presenza.test.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8, Story 8.4] — AC originali.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/mockups/key-presenze.html] — mockup key-screen per `/presenze`: `.slot-header`/`.section-label`/`.slot-title`/`.attendance-row`/`.athlete-name`/`.badge-warning`/`.save-footer`/`.primary-btn` (pulsante a piena larghezza) — riferimento di composizione, spec (`EXPERIENCE.md`) vince in caso di conflitto (es. dimensione target di tocco checkbox).
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md] — Componenti → `attendance-row`, `badge` (regola non negoziabile warning/mai danger per singola atleta); Colori → `--color-surface-alt`, `--color-warning`/`--color-warning-bg`.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/EXPERIENCE.md] — Primitive di Interazione (target di tocco ≥44×44px, checkbox di presenza citata esplicitamente); Pattern dei Componenti → "Alert non bloccante"/"Riga presenza con checkbox" (comportamentale, invariato).
- [Source: app/(orari-palestre)/SlotTable.module.css] — pattern `.tabella`/`.scrollWrapper` da riusare identico (Story 8.3, incluso il review fix overflow).
- [Source: app/(presenze)/presenze/certificato-scaduto.ts, app/(presenze)/presenze/PresenzeForm.tsx] — logica/commenti esistenti su FR-15 (badge mai bloccante, niente `role="alert"`), letti integralmente, da preservare invariati.
- [Source: app/(presenze)/presenze/page.tsx, app/(presenze)/storico-presenze/page.tsx, app/(presenze)/storico-presenze/calcola-statistiche-presenza.ts] — markup e logica correnti, letti integralmente in fase di creazione di questa storia.

### Review Findings

- [x] [Review][Patch] Il target di tocco ≥44×44px richiesto da `EXPERIENCE.md` per la riga presenza non era realmente raggiunto: `.riga` usa `align-items: center` (non `stretch`), quindi `.etichetta` (la `<label>` che è l'effettivo elemento cliccabile) si dimensionava sul proprio contenuto (~20-24px) invece di riempire il `min-height: 44px` della riga — toccare l'area di padding sopra/sotto l'etichetta, pur dentro il rettangolo visivo di 44px, non attivava il checkbox [app/(presenze)/presenze/presenze.module.css] — risolto con `align-self: stretch` su `.etichetta`; confermato indipendentemente sia da Blind Hunter sia da Edge Case Hunter
- [x] [Review][Patch] La formattazione data (`data.split("-")`) non validava il formato prima di affettare le posizioni — un valore di `data` sintatticamente diverso da "YYYY-MM-DD" (raggiungibile solo manomettendo l'URL, ma il controllo a monte verifica solo il giorno-della-settimana, non la forma) poteva produrre "undefined/undefined" o testo parziale nell'intestazione Slot [app/(presenze)/presenze/page.tsx] — risolto con verifica esplicita del formato (`/^\d{4}-\d{2}-\d{2}$/`) prima di affettare, con fallback al valore grezzo (mai un crash, mai un "undefined" visibile)
- [x] [Review][Patch] `.etichetta` non aveva `min-width: 0` — un nome atleta lungo insieme al badge "Certificato scaduto" (`flex-shrink: 0`) avrebbe potuto far sfondare la riga senza restringersi, con `overflow-x: hidden` su `<body>` il testo sarebbe stato tagliato silenziosamente invece di andare a capo [app/(presenze)/presenze/presenze.module.css] — risolto aggiungendo `min-width: 0` a `.etichetta`
- [x] [Review][Patch] `.sezioneLabel { margin-bottom: 2px }` era un valore non tokenizzato, unico caso nei due CSS module di questa storia [app/(presenze)/presenze/presenze.module.css] — risolto con `var(--space-1)`
- [x] [Review][Defer] CSS duplicato fra `presenze.module.css`/`storico-presenze.module.css` e i CSS module di Story 8.2/8.3 — convenzione già accettata, nessun `composes` mai usato in questa codebase [app/(presenze)/presenze/presenze.module.css, storico-presenze/storico-presenze.module.css]
- [x] [Review][Defer] Naming inconsistente `.bottoneCarica`/`.bottone` per lo stesso ruolo UI fra i due file di questa storia — cosmetico, nessun impatto funzionale [app/(presenze)/presenze/presenze.module.css, storico-presenze/storico-presenze.module.css]
- [x] [Review][Defer] `.scrollWrapper` (riusato da Story 8.3) non ha `tabindex`/indicazione visiva per lo scroll orizzontale da tastiera — stesso gap preesistente dalla sua prima introduzione, ora copiato una seconda volta, da affrontare trasversalmente [app/(orari-palestre)/SlotTable.module.css, app/(presenze)/storico-presenze/storico-presenze.module.css]
- [x] [Review][Defer] Intestazione Slot mostra sempre "Slot selezionato" invece del contestuale "Slot passato" del mockup — generalizzazione deliberata e ragionevole (già confermata non-violazione dall'Acceptance Auditor), distinguere passato/futuro richiederebbe nuova logica fuori scope [app/(presenze)/presenze/page.tsx]
- [x] [Review][Defer] Una data sintatticamente valida ma calendarialmente impossibile (es. "2026-02-30") normalizzata da `Date` produrrebbe una data inesistente mostrata alla lettera se coincidentalmente superasse il controllo a monte — stesso limite di validazione-solo-forma già accettato in tutto il progetto [app/(presenze)/presenze/page.tsx]
- [x] [Review][Dismiss] Selettore bare `.sezione h2` in `storico-presenze.module.css` — stessa convenzione già usata identica in `slot.module.css`/`orari.module.css`/`palestre.module.css` (Story 8.3), non una deviazione nuova
- [x] [Review][Dismiss] Badge non applicato alla colonna "Presenza" (Presente/Assente) di `/storico-presenze` — nessun AC/mockup lo richiede per questa pagina, coerente con la scelta deliberata "restyle puro, nessun componente nuovo inventato" già documentata nella storia
- [x] [Review][Dismiss] `.scrollWrapper` usa `margin-top: var(--space-3)` invece di `var(--space-4)` come in `SlotTable.module.css` — divergenza puramente cosmetica di un token di spaziatura, la parte strutturale del riuso (`overflow-x: auto`) è identica

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- Dev server riavviato dopo `rm -rf .next` per la verifica dal vivo (stessa nota di manutenzione nota da sessioni precedenti).
- Le 2 route sono protette dal route guard: senza sessione autenticata restituiscono 307 verso `/accedi` — nessun errore di compilazione/runtime nei log del dev server, ma il rendering effettivo non è stato ispezionato con una sessione reale in questa sessione.

### Completion Notes List

- `/presenze`: prima implementazione reale dei componenti `attendance-row`/`badge` di `DESIGN.md`. Aggiunta un'intestazione Slot presentazionale (sola formattazione di dati già caricati, nessuna nuova query). Pulsante "Salva presenze" a piena larghezza (variazione contestuale legittima del mockup, non il pattern compatto usato altrove). Riga presenza con `min-height: 44px` per il target di tocco richiesto da `EXPERIENCE.md` (il mockup mostra un checkbox 20×20 solo a scopo illustrativo). Badge sempre in variante warning, mai danger — nessuna modifica alla logica di `certificato-scaduto.ts`.
- `/storico-presenze`: restyle puro, riuso identico del pattern `.tabella`/`.scrollWrapper` di `SlotTable.module.css` (Story 8.3) fin dall'inizio (nessuna dimenticanza sull'overflow da correggere in review, a differenza di Story 8.3).
- Nessuna modifica a `actions.ts`/`actions.test.ts`/`certificato-scaduto.ts`/`certificato-scaduto.test.ts`/`calcola-statistiche-presenza.ts`/`calcola-statistiche-presenza.test.ts` in nessuna route.
- `npx tsc --noEmit` pulito. Suite Vitest: 468/468 test passati, nessun nuovo test (invariato rispetto a Story 8.1/8.2/8.3).

### File List

- `app/(presenze)/presenze/presenze.module.css` (nuovo; review fix: `.etichetta` con `align-self: stretch`/`min-width: 0`, `.sezioneLabel` tokenizzato)
- `app/(presenze)/presenze/page.tsx` (modificato: `className` su form filtro/sezioni; aggiunta intestazione Slot presentazionale; review fix: formattazione data validata con fallback)
- `app/(presenze)/presenze/PresenzeForm.tsx` (modificato: `className` su riga/checkbox/nome/badge/errore/successo/pulsante)
- `app/(presenze)/storico-presenze/storico-presenze.module.css` (nuovo)
- `app/(presenze)/storico-presenze/page.tsx` (modificato: `className` su sezioni/form filtro/tabella/statistiche/messaggi, incluso il componente async `StoricoTable`)
