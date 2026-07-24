---
baseline_commit: e3d8503240ab39760a04d285ea047ce770658541
---

# Story 8.5: Certificati Medici

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Genitore, Atleta, Allenatore, Dirigente o Segreteria,
I want vedere le pagine legate al certificato medico con l'identità visiva della società,
so that un flusso che riguarda dati sanitari sensibili trasmetta la stessa cura del resto dell'app.

## Acceptance Criteria

1. **Given** le pagine `/certificato-medico`, `/conferma-certificati`, `/notifiche`, **when** vengono visualizzate, **then** applicano i token di `DESIGN.md` tramite un CSS module dedicato.
2. **Given** `/certificato-medico`, **when** viene visualizzata, **then** segue il mockup key-screen già approvato (`ux-designs/ux-societa-manager-2026-07-22/mockups/key-certificato-medico.html`).
3. **Given** le stesse pagine, **when** vengono usate normalmente, **then** il comportamento resta identico a prima — nessuna regressione, suite Vitest invariata.

## ⚠️ Decisione presa in fase di creazione di questa storia (non riaprire senza nuova elicitazione)

`/certificato-medico` **oggi non mostra alcuno stato del certificato**: `page.tsx` legge già `trovaCertificatoPerAtleta` (che restituisce `stato`/`dataFineValidita`), ma li scarta — usa solo la presenza di `filePath` per decidere fra "Visualizza certificato attuale" e "Nessun Certificato ancora caricato". Il mockup approvato (`key-certificato-medico.html`) mostra invece una card con lo **stato** del certificato (testo semplice per `IN_ATTESA`, badge success per `CONFERMATO` con validità futura) + la data di validità — questo è il contenuto centrale della schermata, non un dettaglio decorativo. L'AC #2 richiede esplicitamente di seguire questo mockup.

**Risoluzione (stesso principio già applicato in Story 8.3 per `/mio-orario`: quando il mockup richiede una struttura che il markup attuale non ha, si aggiunge la formattazione minima necessaria usando SOLO dati/calcoli già esistenti, mai nuova logica di business):**

- Nuovo file **`app/(certificati-medici)/certificato-medico/stato-certificato-visualizzato.ts`** (funzione pura, con test Vitest dedicato — stesso pattern di `certificato-scaduto.ts`, Story 4.5): calcola lo stato da mostrare a partire da `stato`/`dataFineValidita` (dati già letti da `trovaCertificatoPerAtleta`, **nessuna nuova query**) riusando `calcolaGiorniAScadenza` (`app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza.ts`, Story 4.6 — **non reimplementare un quarto confronto di date Europe/Rome**, questa è già la funzione condivisa per "quanti giorni mancano alla scadenza").
  - **Non riusare `categorizzaStatoCertificato`** (`vista-dirigente/categorizza-stato-certificato.ts`, Story 5.1): quella funzione collassa deliberatamente "nessun certificato" e "IN_ATTESA" nello stesso bucket `SENZA_CERTIFICATO` (corretto per la vista aggregata del Dirigente, dove entrambi "non contano" come in regola) — ma questa pagina (vista Genitore/Atleta sulla **propria** Atleta) deve distinguerli testualmente, per la tabella completa "Pattern di Stato" di `EXPERIENCE.md`: sono due messaggi diversi ("Nessun certificato caricato" vs "Certificato in attesa di conferma").
  - Mappa esattamente la tabella "Pattern di Stato" di `EXPERIENCE.md` (già letta in fase di creazione di questa storia):
    - Nessuna riga certificato → `{ tipo: "nessuno" }` → testo semplice, nessun badge.
    - `stato === "IN_ATTESA"` → `{ tipo: "in-attesa" }` → testo semplice "Certificato in attesa di conferma", **nessun badge colorato** (nota `[NOTA UX APERTA]` di `EXPERIENCE.md`: nessuna variante badge è mai stata assegnata a questo stato — non inventarne una ora).
    - `stato === "CONFERMATO"` e `calcolaGiorniAScadenza(...) < 0` → `{ tipo: "scaduto" }` → badge **warning** (mai danger — regola non negoziabile di `DESIGN.md` per lo stato a livello di singola atleta, stessa applicata in Story 8.4), testo "Certificato scaduto".
    - `stato === "CONFERMATO"` e giorni `>= 0` e `<= 30` → `{ tipo: "in-scadenza" }` → badge **warning**, testo "Certificato in scadenza".
    - `stato === "CONFERMATO"` e (giorni `> 30` o `dataFineValidita` assente) → `{ tipo: "in-regola"; dataFineValidita }` → badge **success** (unico caso in cui il mockup usa un badge pieno anziché testo semplice), testo "Certificato in regola" + riga di validità "Valido fino al GG/MM/AAAA".
  - Nessuna modifica a `trovaCertificatoPerAtleta`, `actions.ts`, alla logica di upload/`CaricaCertificatoForm.tsx` oltre al restyle — solo `page.tsx` legge in più i due campi già restituiti e li passa alla nuova funzione pura.

## Tasks / Subtasks

- [x] Task 1: `app/(certificati-medici)/certificato-medico/stato-certificato-visualizzato.ts` + test (AC #2)
  - [x] Implementata la funzione pura come descritto nella sezione "⚠️ Decisione" sopra — firma `calcolaStatoCertificatoVisualizzato(stato: StatoCertificato | null, dataFineValidita: string | null, oggi: Date): StatoCertificatoVisualizzato`.
  - [x] Test Vitest (8 casi): nessuna riga → `nessuno`; `IN_ATTESA` con/senza data → sempre `in-attesa`; `CONFERMATO` con data passata → `scaduto`; confine esatto 30gg → `in-scadenza`, 31gg → `in-regola`; `CONFERMATO` oltre 30 giorni → `in-regola` con `dataFineValidita` propagata; `CONFERMATO` senza `dataFineValidita` → `in-regola` fallback. Tutti passano.
- [x] Task 2: `app/(certificati-medici)/certificato-medico/certificato-medico.module.css` (nuovo) + applica classi in `page.tsx`/`CaricaCertificatoForm.tsx` (AC #1, #2, #3)
  - [x] **Card certificato** (`.card`, mockup `.cert-card`): riusa 1:1 il pattern `.card`. Nome Atleta mostrato sempre (quando risolvibile), non solo con più Atlete.
  - [x] **Riga di stato** (`.statusLine`): renderizza in base a `calcolaStatoCertificatoVisualizzato(...)` — testo semplice per `nessuno`/`in-attesa`, badge warning per `scaduto`/`in-scadenza`, badge success + `.validityText` per `in-regola`.
  - [x] **Zona di upload** (`.uploadLabel`/`.dropzone`): markup invariato (`<label>`+`<input type="file">`), avvolto in un contenitore `.dropzone` (bordo tratteggiato, sfondo surface-alt).
  - [x] **Pulsante "Carica Certificato"** (`.bottoneCarica`): a piena larghezza come in Story 8.4.
  - [x] Messaggi di errore/successo (`role="alert"`/`role="status"`, invariati) — riusa `.errore`/`.successo`.
  - [x] Form di selezione Atleta — riusa `.campo select`/`.bottone`.
  - [x] Nessuna modifica a `actions.ts`/`actions.test.ts` — solo `className` + la nuova riga di stato in `page.tsx`.
- [x] Task 3: `app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css` (nuovo) + applica classi in `page.tsx`/`ConfermaCertificatoRow.tsx` (AC #1, #3)
  - [x] Nessun mockup key-screen per questa pagina — restyle puro.
  - [x] Sezioni "Da confermare"/"Confermati" (`.sezione`/`h2`) — riusa pattern già stabilito.
  - [x] Ogni riga "Da confermare" (`ConfermaCertificatoRow`) — card (`.card`) coi campi in `.campo`/`.campo input`.
  - [x] Lista "Confermati" — righe semplici (`.rigaConfermata`).
  - [x] Messaggi vuoti — `.messaggioVuoto`.
  - [x] Nessuna modifica a `actions.ts`/`actions.test.ts`.
- [x] Task 4: `app/(certificati-medici)/notifiche/notifiche.module.css` (nuovo) + applica classi in `page.tsx` (AC #1, #3)
  - [x] Nessun mockup — restyle puro. Lista notifiche (`.lista`/`.riga`) — riusa il pattern `attendance-row`-simile di Story 8.4 (sfondo `surface-alt`, radius-sm), adattato a un contenuto testuale.
  - [x] Messaggio vuoto "Nessuna notifica." — `.messaggioVuoto`.
  - [x] Nessuna modifica a `lib/db-rls/notifica.ts`.
- [x] Task 5: Verifica (AC #1, #2, #3)
  - [x] `npx tsc --noEmit` pulito.
  - [x] Suite Vitest: 476/476 test passati (468 preesistenti invariati + 8 nuovi di `stato-certificato-visualizzato.test.ts`, Task 1). `actions.test.ts` di tutte e 3 le route intoccati.
  - [x] Verifica dal vivo parziale: dev server avviato (dopo `rm -rf .next`), le 3 route restituiscono 307 verso `/accedi` (nessuna sessione autenticata in questa verifica — comportamento invariato del route guard), nessun errore di compilazione/runtime nei log del dev server. **Non verificato** con una sessione autenticata reale il rendering effettivo (card stato/badge) — stessa limitazione dichiarata nelle storie precedenti dell'Epic 8. Ispezione diretta del codice conferma: nessun colore hardcoded fuori da `var(--color-*)`; badge "scaduto"/"in scadenza" sempre in variante warning (mai danger — `styles.badgeWarning`, mai un terzo `badgeDanger` introdotto); comportamento di upload/conferma invariato (nessuna modifica a `actions.ts` in nessuna route).

### Review Findings

- [x] [Review][Patch] Nessun test di confine per `giorni === 0` (e `giorni === -1`) in `calcolaStatoCertificatoVisualizzato` [app/(certificati-medici)/certificato-medico/stato-certificato-visualizzato.test.ts] — risolto: aggiunti i 2 test mancanti, confermano il comportamento gia' corretto (0 → in-scadenza, -1 → scaduto), 10/10 test passati
- [x] [Review][Defer] `CONFERMATO` con `dataFineValidita` null viene mostrato come badge success "in regola" senza data — non raggiungibile dai path di scrittura reali (`confermaCertificato` richiede sempre una data, validata in `actions.ts`), unico caso teorico è il default retroattivo della migrazione di Story 4.4 (già deferred, nessun dato reale di produzione oggi) [app/(certificati-medici)/certificato-medico/stato-certificato-visualizzato.ts:24] — deferred, pre-existing
- [x] [Review][Defer] Una `dataFineValidita` malformata produrrebbe "Invalid Date" in UI — nessun path di scrittura reale la produce (`actions.ts` valida formato+parsing prima di salvare), stessa categoria di rischio teorico già accettata più volte nel progetto [app/(certificati-medici)/certificato-medico/stato-certificato-visualizzato.ts, page.tsx] — deferred, pre-existing
- [x] [Review][Defer] Il `.dropzone` con bordo tratteggiato suggerisce drag-and-drop ma non è cablato (nessun `onDrop`/`onDragOver`) — markup della zona upload deliberatamente invariato per vincolo esplicito della storia (nessuna nuova logica interattiva in questa eccezione), input nativo resta pienamente funzionante al click [app/(certificati-medici)/certificato-medico/CaricaCertificatoForm.tsx] — deferred, pre-existing
- [x] [Review][Defer] `.testoStato` (classe pensata per la riga di stato certificato) riusata anche per il messaggio istruzionale "Seleziona un'Atleta..." — accoppiamento semantico a basso rischio, nessun impatto visivo oggi [app/(certificati-medici)/certificato-medico/page.tsx] — deferred, pre-existing
- [x] [Review][Defer] `.bottone`/`.bottoneCarica` quasi duplicati nello stesso file, pattern ripetuto una terza volta in `conferma-certificati.module.css` — coerente con la scelta architetturale dell'Epic 8 di un CSS module indipendente per pagina, nessuna condivisione tra moduli [app/(certificati-medici)/certificato-medico/certificato-medico.module.css, app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css] — deferred, pre-existing
- [x] [Review][Defer] Il nuovo `<p className={styles.uploadLabel}>` non è un heading semantico, invisibile alla navigazione per heading di uno screen reader — fedele al mockup approvato (`key-certificato-medico.html:287/327` usa anch'esso `<p class="upload-label">`), non una regressione introdotta da questa storia [app/(certificati-medici)/certificato-medico/CaricaCertificatoForm.tsx] — deferred, pre-existing

## Dev Notes

- **Unica storia dell'Epic 8 (insieme a 8.3) con un'eccezione dichiarata al vincolo "solo className"** — qui per `/certificato-medico` (nuova funzione pura + rendering di stato), non per `/conferma-certificati`/`/notifiche` (restyle puro identico alle storie precedenti).
- **Riuso obbligatorio**: `.card` (Story 5.1/8.3), `.badge` (Story 8.4, warning/success — **mai** introdurre qui una variante danger per lo stato a livello di singola atleta), `.campo`/`.campo select`/`.campo input`/`.bottone`/`.errore`/`.successo` (Story 8.2-8.4), pulsante a piena larghezza (Story 8.4, `.bottoneSalva`), `calcolaGiorniAScadenza` (Story 4.6 — **non reimplementare** il confronto data Europe/Rome, già corretto una volta dopo un bug reale in Story 4.5).
- **Lezione da Story 8.4 (code review)**: quando si dichiara un target di tocco/dimensione minima via CSS su un contenitore flex con `align-items: center`, l'elemento figlio interattivo non si stira automaticamente — se questa storia introduce righe cliccabili con requisiti di dimensione minima, verificare esplicitamente `align-self`. Se non è richiesto (nessun requisito di tocco minimo esplicito per liste sola-lettura come `/notifiche`), non serve applicarlo qui.
- **Nessun colore hardcoded fuori da `var(--color-*)`** — stesso criterio di conformità verificato dall'Acceptance Auditor in ogni storia precedente.

### Project Structure Notes

- Nuovi file: `app/(certificati-medici)/certificato-medico/stato-certificato-visualizzato.ts` (+ test), `app/(certificati-medici)/certificato-medico/certificato-medico.module.css`, `app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css`, `app/(certificati-medici)/notifiche/notifiche.module.css`.
- File modificati: `certificato-medico/page.tsx` (className + nuova riga di stato), `certificato-medico/CaricaCertificatoForm.tsx` (className), `conferma-certificati/page.tsx`/`ConfermaCertificatoRow.tsx` (className), `notifiche/page.tsx` (className).
- Nessuna migrazione, nessuna modifica a `prisma/schema.prisma`, nessuna modifica a `actions.ts`/`actions.test.ts` in nessuna delle 3 route, nessuna modifica a `lib/db-rls/certificato-medico.ts`/`lib/db-rls/notifica.ts`/`categorizza-stato-certificato.ts`/`calcola-giorni-a-scadenza.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8, Story 8.5] — AC originali.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/mockups/key-certificato-medico.html] — mockup key-screen: `.cert-card`/`.status-line`/`.status-plain-text`/`.badge-success`/`.validity-text`/`.dropzone`/`.primary-btn` (piena larghezza) — riferimento di composizione, spec (`EXPERIENCE.md`) vince in caso di conflitto.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/EXPERIENCE.md] — sezione "Pattern di Stato" (tabella completa 5 righe: nessun certificato/IN_ATTESA/CONFERMATO-futuro/CONFERMATO-in scadenza/CONFERMATO-scaduto) — fonte autoritativa per Task 1, non il solo mockup (che mostra solo 2 dei 5 stati).
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md] — Componenti → `badge` (regola non negoziabile warning/mai danger per singola atleta), `card`.
- [Source: app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts] — letta integralmente: **non riusare direttamente** (collassa "nessuno"/IN_ATTESA, sbagliato per questa pagina), ma stesso principio di riuso di `calcolaGiorniAScadenza`.
- [Source: app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza.ts] — funzione condivisa da riusare identica per il calcolo giorni-a-scadenza (fuso Europe/Rome).
- [Source: app/(presenze)/presenze/presenze.module.css, _bmad-output/implementation-artifacts/8-4-presenze.md] — pattern `.badge`/pulsante a piena larghezza da riusare identici; lezione su `align-self: stretch` per target di tocco.
- [Source: app/(certificati-medici)/certificato-medico/page.tsx, CaricaCertificatoForm.tsx, app/(certificati-medici)/conferma-certificati/page.tsx, ConfermaCertificatoRow.tsx, app/(certificati-medici)/notifiche/page.tsx] — markup e logica correnti, letti integralmente in fase di creazione di questa storia.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- Dev server riavviato dopo `rm -rf .next` per la verifica dal vivo (stessa nota di manutenzione nota da sessioni precedenti).
- Le 3 route sono protette dal route guard: senza sessione autenticata restituiscono 307 verso `/accedi` — nessun errore di compilazione/runtime nei log del dev server, ma il rendering effettivo non è stato ispezionato con una sessione reale in questa sessione.

### Completion Notes List

- `/certificato-medico`: eccezione dichiarata (come Story 8.3) — la pagina non mostrava alcuno stato del certificato prima di questa storia (solo presenza/assenza di `filePath`); aggiunta la card di stato (testo semplice per nessuno/in-attesa, badge warning per scaduto/in-scadenza, badge success + data di validità per in-regola) tramite una nuova funzione pura `calcolaStatoCertificatoVisualizzato` (con 8 test), che riusa `calcolaGiorniAScadenza` (Story 4.6) — nessuna nuova query, nessun nuovo confronto data reimplementato da zero. Deliberatamente NON riusata `categorizzaStatoCertificato` (vista-dirigente, Story 5.1): quella collassa "nessuno"/IN_ATTESA nello stesso bucket, sbagliato per questa pagina che deve distinguerli testualmente.
- Pulsante upload a piena larghezza (coerente con Story 8.4), dropzone come contenitore visivo (nessun drag-and-drop reale aggiunto, solo bordo tratteggiato).
- `/conferma-certificati`, `/notifiche`: restyle puro, nessun mockup, riuso dei pattern `.card`/`.campo`/`.bottone` già stabiliti.
- Nessuna modifica a `actions.ts`/`actions.test.ts` in nessuna delle 3 route, nessuna modifica a `categorizza-stato-certificato.ts`/`calcola-giorni-a-scadenza.ts`/`lib/db-rls/*`.
- `npx tsc --noEmit` pulito. Suite Vitest: 476/476 test passati (8 nuovi).

### File List

- `app/(certificati-medici)/certificato-medico/stato-certificato-visualizzato.ts` (nuovo)
- `app/(certificati-medici)/certificato-medico/stato-certificato-visualizzato.test.ts` (nuovo)
- `app/(certificati-medici)/certificato-medico/certificato-medico.module.css` (nuovo)
- `app/(certificati-medici)/certificato-medico/page.tsx` (modificato: `className` su sezioni/form; aggiunta card di stato certificato)
- `app/(certificati-medici)/certificato-medico/CaricaCertificatoForm.tsx` (modificato: `className` su dropzone/errore/successo/pulsante)
- `app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css` (nuovo)
- `app/(certificati-medici)/conferma-certificati/page.tsx` (modificato: `className` su sezioni/liste/messaggi)
- `app/(certificati-medici)/conferma-certificati/ConfermaCertificatoRow.tsx` (modificato: `className` su card/campi/errore/pulsanti)
- `app/(certificati-medici)/notifiche/notifiche.module.css` (nuovo)
- `app/(certificati-medici)/notifiche/page.tsx` (modificato: `className` su lista/righe/messaggio vuoto)
