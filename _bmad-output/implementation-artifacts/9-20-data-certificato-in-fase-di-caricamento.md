---
baseline_commit: ec718f3f76907f81233eb4fc95916b40bb77c033
---

# Story 9.20: Data del nuovo certificato già in fase di caricamento

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Genitore/Atleta che carica un nuovo Certificato medico,
I want poter indicare già in fase di caricamento la data di inizio e di fine validità del nuovo certificato,
so that il sistema conosce subito la data corretta, invece di aspettare che la Segreteria/Admin/Dirigente la trascriva manualmente in un secondo momento durante la conferma.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-08-01), emersa durante la creazione di Story 9.19 in risposta alla domanda sul requisito CONFERMATO del badge "in scadenza" — riconosciuta esplicitamente come richiesta distinta e registrata come storia separata (non piegata dentro la 9.19).

**Decisioni prese con l'utente in fase di creazione storia (2026-08-01)**:
1. **Due campi, non uno**: sia "data inizio validità" (data del nuovo certificato/visita) sia "data fine validità" (scadenza) — entrambe le colonne già esistenti sul modello `CertificatoMedico`, non solo `dataFineValidita`.
2. **Entrambi obbligatori** per completare l'upload — non opzionali. Questo semplifica l'implementazione: ad ogni upload (primo o ri-caricamento) `collegaFileCertificato` riceve sempre entrambe le date e le scrive sempre, nessuna logica di "campo omesso = preserva il valore precedente" da gestire.
3. **La conferma resta un passaggio separato e obbligatorio** (stato `CONFERMATO`, invariato) — questa storia NON tocca `confermaCertificato`/`ConfermaCertificatoRow.tsx`/`/conferma-certificati`. Il beneficio è che quella pagina **già oggi** precompila il form di conferma con le date lette dalla riga esistente (`conferma-certificati/page.tsx`, righe 67-78) — una volta che `collegaFileCertificato` scrive le date fornite dal Genitore/Atleta, compariranno precompilate lì automaticamente, **zero modifiche necessarie a quel file**.

**Cambio di rotta rispetto a una decisione architetturale precedente**: la migrazione `20260718020000_certificati_storage_e_rls` (Story 4.1) rese `dataFineValidita` nullable proprio perché "il nuovo flusso di upload crea/aggiorna solo `filePath`, senza che Genitore/Atleta debbano trascrivere una data di scadenza — quella spetta alla Segreteria in fase di conferma". Questa storia inverte esplicitamente quella scelta lato upload (il Genitore ora la trascrive comunque), ma **non tocca lo schema** (le colonne sono già nullable, restano tali — nessuna migrazione necessaria) e **non cambia la garanzia di fondo**: una data non è mai "ufficiale" finché non è `CONFERMATO`.

## Acceptance Criteria

1. **Given** un Genitore/Atleta sulla pagina `/certificato-medico` che carica un nuovo Certificato (primo caricamento o ri-caricamento) **When** compila il form di upload **Then** oltre al file deve indicare "Data del certificato" (`dataInizioValidita`) e "Data di scadenza" (`dataFineValidita`), entrambe obbligatorie — l'upload viene rifiutato con un messaggio di validazione chiaro se una delle due manca, non è una data valida, o se la data di scadenza precede la data di inizio
2. **Given** un upload completato con successo **When** la riga `certificati_medici` viene scritta **Then** `filePath`, `dataInizioValidita`, `dataFineValidita` sono tutti aggiornati con i nuovi valori (mai un valore precedente preservato silenziosamente — su un ri-caricamento le vecchie date, anche se confermate, sono sostituite dalle nuove) e `stato` resta forzato a `IN_ATTESA` (invariato, Story 4.4) — il certificato non diventa "in regola"/"in scadenza" in nessun badge (Story 9.19, Story 5.1) finché non viene confermato
3. **Given** un certificato caricato con le nuove date **When** Segreteria/Admin/Dirigente lo rivede in `/conferma-certificati` **Then** il form di conferma mostra già precompilate le date inserite dal Genitore/Atleta (comportamento già esistente di `conferma-certificati/page.tsx`, nessuna modifica a quel file) — la conferma resta un click esplicito e separato, le date restano modificabili prima di confermare
4. **And** nessuna regressione sul comportamento esistente di conferma (Story 4.4), calcolo stato certificato (Story 4.5/4.6/5.1) e badge "in scadenza" (Story 9.19) — suite Vitest invariata sui casi esistenti non toccati da questa storia

## Tasks / Subtasks

- [x] Task 1: Estendere `collegaFileCertificato` per accettare e scrivere le due date (AC: #1, #2)
  - [x] `lib/db-rls/certificato-medico.ts`: firma estesa a `collegaFileCertificato(supabase, atletaId, filePath, dataInizioValidita: Date, dataFineValidita: Date)` — entrambe obbligatorie (nessun parametro opzionale, decisione utente).
  - [x] Il payload dell'upsert include ora anche `dataInizioValidita: dataInizioValidita.toISOString()` e `dataFineValidita: dataFineValidita.toISOString()`, oltre a `id`/`atletaId`/`filePath`/`stato: "IN_ATTESA"`/`updatedAt` già esistenti — commento "mai i campi di validità" (Story 4.1 AC #4) rimosso e sostituito spiegando la nuova garanzia.
  - [x] `mesiValidita`/`modulo` non toccati da questa funzione (invariato).
- [x] Task 2: Validare le due date nella Server Action `caricaCertificato` (AC: #1)
  - [x] `app/(certificati-medici)/certificato-medico/actions.ts`: legge `dataInizioValidita`/`dataFineValidita` da `formData`. Validazione in ordine, subito dopo il controllo `atletaId` e prima dei controlli sul file: entrambe presenti (`VALIDATION` se mancante), parsabili come data (`Number.isNaN(.getTime())` → `VALIDATION`), `dataFineValidita >= dataInizioValidita` (altrimenti `VALIDATION` con messaggio dedicato).
  - [x] Le due `Date` risultanti passate a `collegaFileCertificato` nel blocco `try` esistente.
- [x] Task 3: Nuovi campi nel form di upload (AC: #1)
  - [x] `app/(certificati-medici)/certificato-medico/CaricaCertificatoForm.tsx`: due nuovi `<input type="date" required>` (`name="dataInizioValidita"`/`name="dataFineValidita"`) prima del campo file esistente, con `<label>` "Data del certificato" / "Data di scadenza".
  - [x] `app/(certificati-medici)/certificato-medico/certificato-medico.module.css`: aggiunta `.campo input` + `.campo input:focus-visible`, copiate da `conferma-certificati.module.css`.
  - [x] Nessuna modifica al reset del form al successo — `formRef.current?.reset()` pulisce già tutti i campi.
- [x] Task 4: Aggiornare i test esistenti impattati dal cambio di comportamento (AC: #1, #2, #4)
  - [x] `lib/db-rls/certificato-medico.test.ts`: test `collegaFileCertificato` riscritto per il nuovo comportamento (firma con 2 parametri data obbligatori, payload include `dataInizioValidita`/`dataFineValidita` serializzate, `Object.keys(payload).sort()` aggiornato).
  - [x] `app/(certificati-medici)/certificato-medico/actions.test.ts`: `buildFormData` estesa con `dataInizioValidita`/`dataFineValidita` opzionali (default a due date valide, cosi' i test esistenti restano invariati senza doverle passare esplicitamente una per una; `null` per ometterle nei test di validazione dedicati). 2 assert esistenti su `collegaFileCertificatoMock` estesi con le nuove date attese. 4 nuovi test: `dataInizioValidita` mancante, `dataFineValidita` mancante, data non parsabile, `dataFineValidita < dataInizioValidita`.
- [x] Task 5: Verifica RLS e regressione (AC: #2, #3, #4)
  - [x] Confermato (lettura, nessuna nuova migrazione) che le policy `genitore_atleta_gestisce_certificato_insert`/`_update` (migrazione `20260718020000_certificati_storage_e_rls`) non hanno restrizioni per colonna — coprono già la scrittura di `dataInizioValidita`/`dataFineValidita` da parte di GENITORE/ATLETA sulla propria Atleta.
  - [x] Confermato che `conferma-certificati/page.tsx`/`ConfermaCertificatoRow.tsx` non richiedono alcuna modifica — nessun file toccato (verificato via `git status`).
  - [x] Suite Vitest completa eseguita: 787/787 test passati (+4 nuovi rispetto a 783 precedenti), nessuna regressione.
  - [x] `npx tsc --noEmit` ed ESLint puliti sui file toccati.
  - [x] Verifica manuale dal vivo: non eseguibile in questa sessione (nessuna istanza Supabase locale disponibile) — stesso limite già incontrato in molte storie recenti, coperta qui da tsc/ESLint/suite Vitest sopra; da confermare con l'utente dopo il deploy: un Genitore carica un certificato con le due date, la Segreteria apre `/conferma-certificati` e vede le date già precompilate, conferma, il certificato appare "in regola"/"in scadenza" in base alla nuova data.

### Review Findings

- [x] [Review][Patch] `caricaCertificato` accetta date calendarialmente inesistenti (es. "2026-02-30") senza errore — **risolto**: estratto il pattern già esistente in `conferma-certificati/actions.ts` (`FORMATO_DATA`/`parseDataValida`, con round-trip verso ISO) in un nuovo modulo condiviso `lib/parse-data-iso.ts` (`FORMATO_DATA_ISO`/`parseDataIsoValida`, 7 nuovi test), riusato ora da entrambe le Server Action che scrivono `dataInizioValidita`/`dataFineValidita` su `certificati_medici`. Aggiunto anche 1 nuovo test in `actions.test.ts` che pin-a il caso "30 febbraio". [lib/parse-data-iso.ts, app/(certificati-medici)/certificato-medico/actions.ts, app/(certificati-medici)/conferma-certificati/actions.ts]
- [x] [Review][Patch] Etichette dei campi disallineate da quelle che la Segreteria vedrà in conferma — **risolto**: rinominate "Data del certificato"/"Data di scadenza" → "Data inizio validità"/"Data fine validità", identiche a `ConfermaCertificatoRow.tsx`. [app/(certificati-medici)/certificato-medico/CaricaCertificatoForm.tsx]
- [x] [Review][Patch] Commento di `collegaFileCertificato` affermava "la garanzia di fondo non cambia" mentre descriveva un cambiamento reale di invariante — **risolto**: commento riformulato per essere esplicito su cosa cambia (le date vengono sempre sovrascritte) e cosa resta invariato (stato sempre `IN_ATTESA`). [lib/db-rls/certificato-medico.ts]
- [x] [Review][Defer] Nessun limite di plausibilità (min/max) sulle date, né client né server — deferred, coerente con `confermaCertificato` (stesso limite pre-esistente sulla funzione gemella, nessun AC di questa storia lo richiede). [app/(certificati-medici)/certificato-medico/actions.ts, CaricaCertificatoForm.tsx]
- [x] [Review][Defer] Messaggio di validazione generico non identifica quale dei due campi data manca — deferred, coerente con la convenzione a un solo messaggio per form già stabilita in tutto il progetto (es. Story 9.16). [app/(certificati-medici)/certificato-medico/actions.ts]
- [x] [Review][Defer] Round-trip multipli se la validazione HTML5 lato client viene bypassata (nessun controllo aggregato di tutti gli errori in un colpo solo) — deferred, stesso pattern di validazione sequenziale già usato in ogni Server Action del progetto. [app/(certificati-medici)/certificato-medico/actions.ts]
- [x] [Review][Dismiss] Blocco CSS `.campo input` duplicato invece di condiviso tra i due moduli — falso positivo/rumore: è esattamente quanto istruito dalla storia stessa (Task 3, "copiare esattamente"), stesso pattern già deliberato in Story 9.19 per il badge "in scadenza" (CSS Modules non condivide facilmente regole cross-modulo in questo progetto).

## Dev Notes

- **Perché nessuna migrazione**: `dataInizioValidita`/`dataFineValidita` sono già colonne nullable su `CertificatoMedico` (rese tali dalla migrazione Story 4.1, `20260718020000_certificati_storage_e_rls`, proprio per il vecchio comportamento che questa storia inverte) — questa storia cambia solo *chi* le valorizza e *quando*, non lo schema.
- **Il "rinnovo" resta gated dalla conferma, per costruzione**: `categorizzaStatoCertificato` (Story 5.1) e il badge "in scadenza" (Story 9.19) richiedono già `stato === "CONFERMATO"` prima di considerare qualunque data. Un upload con le nuove date lascia `stato = "IN_ATTESA"` (invariato) — quindi **nessun badge cambia visibilmente finché la Segreteria non conferma**, esattamente la richiesta originale dell'utente ("serve la conferma dell'avvenuto caricamento"). Questo significa anche che questa storia **non ha bisogno di toccare** `categorizzaStatoCertificato`/`certificato-scaduto.ts`/`stato-certificato-visualizzato.ts`/`calcolaAtleteConCertificatoInScadenza` (Story 9.19) — tutti e quattro continuano a funzionare invariati, il loro comportamento su `IN_ATTESA` non cambia.
- **Il beneficio reale è la precompilazione in conferma**: `conferma-certificati/page.tsx` (righe 61-78) già legge `certificato?.dataInizioValidita`/`dataFineValidita` dalla riga esistente e le passa come `defaultValue` a `ConfermaCertificatoRow.tsx` — oggi quei valori sono quasi sempre vuoti al primo caricamento (mai scritti da `collegaFileCertificato`) o stantii su un ri-caricamento (preservati dal vecchio comportamento). Dopo questa storia sono sempre le date appena fornite dal Genitore/Atleta. **Non serve toccare `conferma-certificati/page.tsx` né `ConfermaCertificatoRow.tsx`** — il collegamento è già lì, aspetta solo dati migliori in ingresso.
- **Perché entrambe le date sono obbligatorie ora (decisione esplicita dell'utente)**: elimina la logica "campo omesso preserva il valore precedente" che altrimenti servirebbe — ogni chiamata a `collegaFileCertificato` scrive sempre entrambe le date, nessun ramo condizionale. Rende anche il test esistente di Story 4.1 (che asseriva il comportamento opposto) da riscrivere, non da lasciare invariato — è previsto, non una regressione.
- **`mesiValidita`/`modulo` restano fuori scope**: l'utente ha chiesto esplicitamente due date, non l'intero set di campi che la Segreteria gestisce in conferma. Non aggiungerli al form di upload.
- **Validazione data, stesso principio già stabilito nel progetto**: `new Date(stringa)` + `Number.isNaN(.getTime())` per rifiutare un valore non parsabile con un errore `VALIDATION` esplicito invece di un `RangeError` interno mascherato da un errore generico — stessa lezione già applicata a `dataNascita` in `creaEAssegnaAtleta` (Story 9.18, review fix).
- **File NON da toccare**: `confermaCertificato`/`ConfermaCertificatoRow.tsx`/`conferma-certificati/page.tsx` (Story 4.4, precompilazione già esistente — vedi sopra), `categorizzaStatoCertificato`/`certificato-scaduto.ts`/`stato-certificato-visualizzato.ts` (Story 4.5/4.6/5.1, invariati per costruzione), `calcolaAtleteConCertificatoInScadenza`/`AtletaAssegnata.tsx`/`gruppi/page.tsx`/`i-miei-gruppi/page.tsx`/`vista-dirigente/*` (Story 9.19, badge "in scadenza" — nessun impatto, il gate `CONFERMATO` li isola da questa storia), `unisciCertificato`/import federale (Story 1.7 — fornisce già sempre una data reale, non impattato), `creaCertificato`/`aggiornaCertificato` (altre funzioni di `lib/db-rls/certificato-medico.ts`, usate altrove, non toccate da questa storia), `ottieniUrlCertificato` (invariato).

### Project Structure Notes

- Nessun file nuovo, nessuna migrazione. File modificati attesi: `lib/db-rls/certificato-medico.ts`, `lib/db-rls/certificato-medico.test.ts`, `app/(certificati-medici)/certificato-medico/actions.ts`, `app/(certificati-medici)/certificato-medico/actions.test.ts`, `app/(certificati-medici)/certificato-medico/CaricaCertificatoForm.tsx`, `app/(certificati-medici)/certificato-medico/certificato-medico.module.css`.
- Nessun nuovo modulo, nessuna nuova entità/colonna, nessun cambiamento ad AD esistenti — questa storia resta interamente dentro il modulo `(certificati-medici)` già esistente, invertendo una singola decisione di prodotto presa in Story 4.1 (documentata esplicitamente in quella migrazione) senza toccare RLS/schema.

### References

- [Source: app/(certificati-medici)/certificato-medico/actions.ts — caricaCertificato, punto di inserimento della nuova validazione]
- [Source: lib/db-rls/certificato-medico.ts righe 113-149 — collegaFileCertificato da estendere, commento Story 4.1 da riconciliare]
- [Source: app/(certificati-medici)/certificato-medico/CaricaCertificatoForm.tsx — form da estendere con i due nuovi campi]
- [Source: app/(certificati-medici)/certificato-medico/certificato-medico.module.css — .campo esiste ma senza regola input]
- [Source: app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css righe 71-84 — blocco .campo input da copiare]
- [Source: app/(certificati-medici)/conferma-certificati/page.tsx righe 61-78 — precompilazione già esistente, nessuna modifica necessaria]
- [Source: app/(certificati-medici)/conferma-certificati/ConfermaCertificatoRow.tsx — stessi nomi campo dataInizioValidita/dataFineValidita da riusare per coerenza]
- [Source: prisma/migrations/20260718020000_certificati_storage_e_rls/migration.sql — perché dataFineValidita è nullable, decisione che questa storia inverte lato upload]
- [Source: lib/db-rls/certificato-medico.test.ts righe 144-181 — test esistente da riscrivere, verifica il comportamento opposto]
- [Source: app/(certificati-medici)/certificato-medico/actions.test.ts — buildFormData e test esistenti da estendere]
- [Source: _bmad-output/implementation-artifacts/9-18-creazione-nuova-atleta-da-allenatore.md — pattern di validazione data (Number.isNaN(.getTime())) da riusare]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.20 — Acceptance Criteria]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno — implementazione lineare, nessuna sorpresa rispetto ai Dev Notes scritti in fase di create-story.

### Completion Notes List

- **`collegaFileCertificato`**: firma estesa con `dataInizioValidita`/`dataFineValidita: Date` obbligatori, scritte sempre nell'upsert (mai preservato un valore precedente) — inverte esplicitamente il comportamento di Story 4.1 AC #4.
- **`caricaCertificato`**: validazione delle due date (presenza, parsabilità, ordine) subito dopo il controllo `atletaId`, prima dei controlli sul file più costosi. Messaggi di errore dedicati per ciascun caso.
- **`CaricaCertificatoForm.tsx`**: due nuovi campi data obbligatori ("Data del certificato", "Data di scadenza") prima del campo file, stesso pattern `.campo` già usato in `ConfermaCertificatoRow.tsx`.
- **Nessuna migrazione**: colonne già nullable dalla Story 4.1. Nessuna nuova policy RLS: le policy INSERT/UPDATE esistenti per GENITORE/ATLETA non hanno restrizioni per colonna.
- **Zero modifiche a `conferma-certificati/page.tsx`/`ConfermaCertificatoRow.tsx`**: la precompilazione del form di conferma con le nuove date è un effetto automatico di dati migliori in ingresso, non una modifica di codice — verificato che nessuno dei due file compaia in `git status`.
- **Nessun impatto sul badge "in scadenza"/calcolo stato**: `categorizzaStatoCertificato`/`certificato-scaduto.ts`/`stato-certificato-visualizzato.ts`/`calcolaAtleteConCertificatoInScadenza` (Story 9.19) invariati per costruzione — tutti già gated su `stato === "CONFERMATO"`, che questa storia non tocca (`collegaFileCertificato` forza sempre `IN_ATTESA`).
- 795/795 test passati dopo la code review (+8 nuovi rispetto ai 787 dell'implementazione iniziale: 7 per il nuovo modulo condiviso `parse-data-iso.ts` + 1 per il caso "30 febbraio" in `actions.test.ts`), `npx tsc --noEmit` pulito, ESLint pulito su tutti i file toccati.
- **Code review**: 0 decision-needed, 3 patch applicate (validazione data calendarialmente inesistente corretta riusando/estraendo il pattern già esistente in `conferma-certificati/actions.ts`; etichette dei campi allineate a quelle della conferma; commento fuorviante riformulato), 3 defer (nessun limite min/max sulle date, messaggio di validazione non field-specific, round-trip multipli se JS bypassato — tutti pre-esistenti/coerenti con la convenzione del progetto, vedi `deferred-work.md`), 1 scartato come falso positivo (CSS duplicato, era esattamente quanto la storia stessa istruiva).

### File List

**Nuovi:**

- `lib/parse-data-iso.ts`
- `lib/parse-data-iso.test.ts`

**Modificati:**

- `lib/db-rls/certificato-medico.ts`
- `lib/db-rls/certificato-medico.test.ts`
- `app/(certificati-medici)/certificato-medico/actions.ts`
- `app/(certificati-medici)/certificato-medico/actions.test.ts`
- `app/(certificati-medici)/certificato-medico/CaricaCertificatoForm.tsx`
- `app/(certificati-medici)/certificato-medico/certificato-medico.module.css`
- `app/(certificati-medici)/conferma-certificati/actions.ts`

## Change Log

- 2026-08-01: Implementata Story 9.20 — due nuovi campi obbligatori (data inizio/fine validità) nel form di upload del certificato medico lato Genitore/Atleta. `collegaFileCertificato` estesa per scriverle sempre (inverte Story 4.1 AC #4); validazione dedicata in `caricaCertificato` (presenza, parsabilità, ordine). Nessuna migrazione, nessuna modifica a `/conferma-certificati` (beneficia automaticamente della precompilazione già esistente). Stato certificato resta `IN_ATTESA` fino a conferma esplicita (invariato) — nessun impatto sul badge "in scadenza" (Story 9.19). 787/787 test passati, 0 errori tsc/eslint. Status: review.
- 2026-08-01: Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor, Acceptance Auditor: 0 violazioni) — 3 patch applicate: validazione date corretta (estratto `lib/parse-data-iso.ts` dal pattern già esistente in `conferma-certificati/actions.ts`, verificato dal vivo che `new Date("2026-02-30")` si normalizza silenziosamente invece di fallire), etichette dei campi allineate a `ConfermaCertificatoRow.tsx`, commento fuorviante riformulato. 3 defer (pre-esistenti, coerenti con la convenzione del progetto), 1 scartato come falso positivo. 795/795 test passati, 0 errori tsc/eslint dopo i fix. Status: done.
