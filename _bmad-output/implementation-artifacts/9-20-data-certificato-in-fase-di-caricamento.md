---
baseline_commit: ec718f3f76907f81233eb4fc95916b40bb77c033
---

# Story 9.20: Data del nuovo certificato già in fase di caricamento

Status: ready-for-dev

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

- [ ] Task 1: Estendere `collegaFileCertificato` per accettare e scrivere le due date (AC: #1, #2)
  - [ ] `lib/db-rls/certificato-medico.ts`: firma estesa a `collegaFileCertificato(supabase, atletaId, filePath, dataInizioValidita: Date, dataFineValidita: Date)` — entrambe obbligatorie (nessun parametro opzionale, decisione utente).
  - [ ] Il payload dell'upsert include ora anche `dataInizioValidita: dataInizioValidita.toISOString()` e `dataFineValidita: dataFineValidita.toISOString()`, oltre a `id`/`atletaId`/`filePath`/`stato: "IN_ATTESA"`/`updatedAt` già esistenti — **rimuovere** il commento esistente che dichiara "mai i campi di validità" (Story 4.1 AC #4, ora invertito da questa storia) e sostituirlo con uno che spiega la nuova garanzia (le date sono sempre quelle appena fornite, non un merge parziale).
  - [ ] `mesiValidita`/`modulo` restano non toccati da questa funzione (invariato — quei due campi restano un concetto esclusivo della Segreteria in fase di conferma, l'utente non li ha richiesti qui).
- [ ] Task 2: Validare le due date nella Server Action `caricaCertificato` (AC: #1)
  - [ ] `app/(certificati-medici)/certificato-medico/actions.ts`: leggere `dataInizioValidita`/`dataFineValidita` da `formData` (stessi nomi campo di `ConfermaCertificatoRow.tsx`, per coerenza). Validazione in ordine, subito dopo il controllo `atletaId` esistente e prima dei controlli sul file (stesso principio "controlli economici prima" già seguito nella funzione): entrambe presenti (`VALIDATION` se mancante), parsabili come data (`new Date(stringa)`, `Number.isNaN(.getTime())` → `VALIDATION` — stessa lezione della validazione `dataNascita` in Story 9.18), `dataFineValidita >= dataInizioValidita` (altrimenti `VALIDATION` con messaggio dedicato "La data di scadenza non può precedere la data di inizio validità.").
  - [ ] Passare le due `Date` risultanti a `collegaFileCertificato` nel blocco `try` esistente (stessa posizione della chiamata attuale).
- [ ] Task 3: Nuovi campi nel form di upload (AC: #1)
  - [ ] `app/(certificati-medici)/certificato-medico/CaricaCertificatoForm.tsx`: due nuovi `<input type="date" required>` (`name="dataInizioValidita"`/`name="dataFineValidita"`) prima del campo file esistente, con `<label>` "Data del certificato" / "Data di scadenza" — stesso pattern `<div className={styles.campo}><label>...<input .../></label></div>` già usato in `ConfermaCertificatoRow.tsx`.
  - [ ] `app/(certificati-medici)/certificato-medico/certificato-medico.module.css`: la regola `.campo` esiste già ma styla solo `select` (nessuna regola `input`) — aggiungere `.campo input` + `.campo input:focus-visible`, copiando esattamente il blocco già presente in `app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css` (righe 71-84).
  - [ ] Nessuna modifica al reset del form al successo (`useEffect` esistente, righe 16-20) — `formRef.current?.reset()` pulisce già tutti i campi del form, incluse le due nuove date.
- [ ] Task 4: Aggiornare i test esistenti impattati dal cambio di comportamento (AC: #1, #2, #4)
  - [ ] `lib/db-rls/certificato-medico.test.ts`: il test `"upserts solo id/atletaId/filePath/stato/updatedAt, mai i campi di validita' (Story 4.1 AC #4)"` (righe 150-170) **verifica esattamente il comportamento che questa storia inverte** — riscriverlo per il nuovo comportamento: `collegaFileCertificato(supabase, "a1", "a1/file.pdf", dataInizio, dataFine)` con `dataInizio`/`dataFine` come parametri obbligatori, e assert che il payload include ora `dataInizioValidita`/`dataFineValidita` serializzate. Aggiornare anche `Object.keys(payload).sort()` atteso.
  - [ ] `app/(certificati-medici)/certificato-medico/actions.test.ts`: `buildFormData` (righe 79-84) estesa con `dataInizioValidita`/`dataFineValidita` opzionali; tutti i test esistenti di successo per `caricaCertificato` aggiornati per passare date valide (altrimenti falliranno con la nuova validazione `VALIDATION`); nuovi test per: data mancante (una delle due), data non parsabile, `dataFineValidita < dataInizioValidita`.
- [ ] Task 5: Verifica RLS e regressione (AC: #2, #3, #4)
  - [ ] Confermare (lettura, non nuova migrazione) che le policy `genitore_atleta_gestisce_certificato_insert`/`_update` (migrazione `20260718020000_certificati_storage_e_rls`) non hanno restrizioni per colonna — coprono già la scrittura di `dataInizioValidita`/`dataFineValidita` da parte di GENITORE/ATLETA sulla propria Atleta, nessuna nuova policy necessaria (RLS di Postgres è per riga, non per colonna).
  - [ ] Verificare che `conferma-certificati/page.tsx`/`ConfermaCertificatoRow.tsx` non richiedano alcuna modifica (precompilazione già esistente, Task 3 della loro storia originale, Story 4.4) — solo lettura di conferma, nessun file toccato.
  - [ ] Suite Vitest completa eseguita — nessuna regressione sui casi esistenti non toccati (`confermaCertificato`, `categorizzaStatoCertificato`, `certificato-scaduto.ts`, `calcolaAtleteConCertificatoInScadenza`/Story 9.19).
  - [ ] `npx tsc --noEmit` ed ESLint puliti sui file toccati.
  - [ ] Verifica manuale dal vivo dopo il deploy (nessuna istanza Supabase locale disponibile in questa sessione, stesso limite già incontrato in molte storie recenti): un Genitore carica un certificato con le due date, la Segreteria apre `/conferma-certificati` e vede le date già precompilate, conferma, il certificato appare "in regola"/"in scadenza" in base alla nuova data.

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

### Debug Log References

### Completion Notes List

### File List
