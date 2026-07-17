---
baseline_commit: NO_VCS
---

# Story 1.6: Conferma iscrizione

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Segreteria,
I want confermare l'Iscrizione di un'Atleta per l'Anno Agonistico corrente,
so that risulta chiaro chi è regolarmente iscritto in questa stagione.

## Acceptance Criteria

1. **Given** un'Atleta presente a sistema, **when** la Segreteria apre la pagina di conferma iscrizioni, **then** vede l'elenco di tutte le Atlete con il proprio stato di iscrizione per l'Anno Agonistico corrente (iscritta / non ancora iscritta).
2. **Given** un'Atleta non ancora iscritta per l'Anno Agonistico corrente, **when** la Segreteria conferma l'Iscrizione, **then** viene creato un record `Iscrizione` che collega quell'Atleta all'Anno Agonistico corrente — indipendentemente dallo stato del tesseramento federale (non tracciato a sistema).
3. **Given** l'Anno Agonistico corrente non esiste ancora a sistema (prima conferma in assoluto, o prima dopo un cambio di stagione), **when** la Segreteria conferma la prima Iscrizione, **then** il sistema deriva e crea automaticamente l'Anno Agonistico corrente dalle date di calendario (1 agosto – 30 giugno, AD-8) prima di creare l'Iscrizione — nessun passaggio manuale di setup richiesto.
4. **Given** un'Atleta è già iscritta per l'Anno Agonistico corrente, **when** la Segreteria (o un doppio click) ripete la conferma, **then** l'operazione è idempotente — nessun errore, nessun duplicato, l'Atleta resta iscritta una sola volta per quella stagione.
5. **Given** sono autenticato con un Ruolo diverso da Segreteria, **when** provo a chiamare la Server Action di conferma direttamente, **then** ricevo un rifiuto `FORBIDDEN` — sia lato Server Action sia lato database (RLS su `Iscrizione`, AD-4/AD-9).

## Tasks / Subtasks

- [x] Task 1: Modello dati `AnnoAgonistico` (AC: #3)
  - [x] `prisma/schema.prisma`: nuovo modello `AnnoAgonistico` (id UUID, `dataInizio` DateTime, `dataFine` DateTime, `createdAt`). **Non** protetto da RLS: non è nel bind-list di AD-4 (`CertificatoMedico`, `Atleta`, `Presenza`, `Iscrizione`) — è dato puramente strutturale/organizzativo (intervallo di date), non personale/sensibile, stesso trattamento di `Palestra`/`Campo`/`Slot`/`Gruppo` (AD-9). Gestibile via Prisma diretto.
  - [x] `@@unique([dataInizio, dataFine])` per evitare righe duplicate per la stessa stagione (stessa classe di race condition a bassa probabilità già accettata come Defer in Story 1.3/1.4 per il Codice Fiscale — qui analoga, un solo utente Segreteria attivo).
  - [x] `@@map("anni_agonistici")`.
- [x] Task 2: Modulo condiviso `lib/anno-agonistico/` (AC: #3) — **Structural Seed** già previsto in ARCHITECTURE-SPINE.md, prima storia che lo popola
  - [x] `calcolaIntervalloStagioneCorrente(oggi: Date): { dataInizio: Date; dataFine: Date }`: calcola l'intervallo 1 agosto–30 giugno che contiene `oggi` (AD-8) — se `oggi` è tra gennaio e luglio, la stagione è iniziata l'agosto dell'anno precedente; se è tra agosto e dicembre, la stagione inizia quest'agosto.
  - [x] `trovaAnnoAgonisticoCorrente(oggi?: Date)`: lookup **sola lettura** (Prisma diretto) dell'`AnnoAgonistico` la cui `dataInizio`/`dataFine` contengono `oggi` — restituisce `null` se non esiste ancora (usato dalla pagina, nessun side-effect su una GET).
  - [x] `risolviAnnoAgonisticoCorrente(oggi?: Date)`: **find-or-create** (Prisma diretto) — se `trovaAnnoAgonisticoCorrente` non trova nulla, crea la riga con l'intervallo calcolato e la restituisce; usato **solo** dalla Server Action di conferma (side-effect di scrittura, mai da una pagina in sola lettura). Questa è la "stagione corrente" risolta da un solo helper condiviso richiesto da AD-8 — Story 2.2 (Creazione Gruppi) riuserà questa stessa funzione, non ne scriverà una propria.
- [x] Task 3: Modello dati `Iscrizione` + Row-Level Security (AC: #2, #4, #5)
  - [x] `prisma/schema.prisma`: nuovo modello `Iscrizione` (id UUID, `atletaId` FK verso `Atleta`, `annoAgonisticoId` FK verso `AnnoAgonistico`, `confermataIl` DateTime `@default(now())`, `createdAt`). `@@unique([atletaId, annoAgonisticoId])` — una sola Iscrizione per Atleta per Anno Agonistico (AC #4); **non** un vincolo di unicità solo su `atletaId` (un'Atleta ha un'Iscrizione per ogni stagione in cui si iscrive, confermato anche da Story 1.8 che parla esplicitamente di "nuova Iscrizione proposta per il nuovo Anno Agonistico" — la cardinalità semplificata `ATLETA ||--o| ISCRIZIONE` nell'ERD dell'Architecture Spine è una semplificazione del diagramma, non vincolante sulla cardinalità multi-stagione).
  - [x] `@@map("iscrizioni")`.
  - [x] Migrazione con SQL grezzo per abilitare RLS e le policy — stesso pattern di `atlete` (Story 1.3), **ma applicando fin da subito** la lezione della code review di quella storia: policy separate per `SELECT`/`INSERT`/`UPDATE` (Admin/Dirigente/Segreteria, AD-4 "accesso ampio") e **nessuna policy/GRANT `DELETE`** (nessun AC richiede di eliminare un'Iscrizione — a differenza di `atlete`, qui non serve nemmeno concedere `DELETE` per poi restringerlo in una storia successiva). SQL indicativo (adattare/verificare dal vivo, stesso avvertimento di Story 1.3):
    ```sql
    ALTER TABLE "iscrizioni" ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "admin_dirigente_segreteria_select" ON "iscrizioni"
      FOR SELECT
      USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']);

    CREATE POLICY "admin_dirigente_segreteria_insert" ON "iscrizioni"
      FOR INSERT
      WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']);

    CREATE POLICY "admin_dirigente_segreteria_update" ON "iscrizioni"
      FOR UPDATE
      USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA'])
      WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']);

    GRANT SELECT, INSERT, UPDATE ON "iscrizioni" TO authenticated;
    ```
    Ricordare il GRANT esplicito (senza, `permission denied` — lezione Story 1.3/1.5, `auto_expose_new_tables` non attivo) e verificare dal vivo prima di considerare la storia conclusa.
- [x] Task 4: Estendere `lib/db-rls/atleta.ts` con una lettura elenco (AC: #1)
  - [x] Aggiungere `elencaAtlete(supabase)`: legge tutte le Atlete (id, nome, codiceFiscale) ordinate per nome, tramite client Supabase autenticato — riuso del modulo esistente (Story 1.3), **nessun nuovo modulo di data-access per una semplice lettura**. Sola lettura, non tocca AD-10 (nessuna scrittura sui campi identitari).
- [x] Task 5: Modulo `lib/db-rls/iscrizione.ts` (AC: #2, #4)
  - [x] `elencaIscrizioniPerAnno(supabase, annoAgonisticoId)`: legge gli `atletaId` già iscritti per una data stagione (per costruire lo stato "iscritta/non iscritta" in pagina).
  - [x] `confermaIscrizione(supabase, atletaId, annoAgonisticoId)`: inserisce la riga `Iscrizione`; se l'inserimento fallisce per violazione del vincolo univoco `(atletaId, annoAgonisticoId)` (Postgres `23505`), tratta il caso come **successo idempotente** (AC #4) — nessun errore all'utente, l'Atleta risultava già iscritta.
- [x] Task 6: Server Action `confermaIscrizione` (AC: #2, #3, #4, #5)
  - [x] Nuovo modulo `app/(iscrizioni)/` (Structural Seed, AD-2 — non riusare `(onboarding-import)`, l'iscrizione è un modulo a se stante).
  - [x] `app/(iscrizioni)/conferma-iscrizioni/actions.ts`: `requireRuolo("SEGRETERIA")` — **solo** Segreteria, non Admin/Dirigente: FR-17 nomina esplicitamente solo la Segreteria per questa azione (a differenza di FR-19/FR-20 "Admin o Dirigente" — stesso principio già applicato in Story 1.3/1.4, l'elenco di Ruoli lato Server Action rispecchia esattamente quello della FR, l'accesso più ampio di Admin/Dirigente resta solo a livello di policy RLS per operazioni trasversali, AD-4).
  - [x] Risolve l'Anno Agonistico corrente con `risolviAnnoAgonisticoCorrente()` (Task 2, find-or-create — qui, nella Server Action, non in pagina), poi chiama `confermaIscrizione` (Task 5).
  - [x] Errori nella forma `{ error: { code, message } }`, `FORBIDDEN` per il rifiuto di autorizzazione, try/catch fail-closed (convenzioni stabilite dalle Story precedenti).
  - [x] `revalidatePath("/conferma-iscrizioni")` dopo il successo.
- [x] Task 7: UI di conferma iscrizioni (AC: #1, #2, #4)
  - [x] `app/(iscrizioni)/conferma-iscrizioni/page.tsx`: Server Component, `export const dynamic = "force-dynamic"` (dati mutabili in tempo reale, stesso motivo di `/admin`, Story 1.2). Legge l'elenco Atlete (Task 4) e l'Anno Agonistico corrente in sola lettura (`trovaAnnoAgonisticoCorrente`, **senza** crearlo — se non esiste ancora, nessuna Atleta risulta iscritta, stato coerente); per ognuna, legge se è già iscritta (Task 5) e mostra lo stato + un bottone "Conferma" per chi non lo è ancora.
  - [x] `app/(iscrizioni)/conferma-iscrizioni/IscrizioneRow.tsx`: Client Component per riga, stesso pattern di `UtenteRow.tsx` (Story 1.2) — bottone che invoca la Server Action, gestisce `pending`/errore.
  - [x] `lib/auth/route-guard.ts`: nuova entry `{ prefix: "/conferma-iscrizioni", ruoliAmmessi: ["SEGRETERIA"] }` (route guard, coerente col Ruolo unico della Server Action).
- [x] Task 8: Test (Vitest)
  - [x] `lib/anno-agonistico/`: `calcolaIntervalloStagioneCorrente` per date in ciascuna metà dell'anno (gennaio–luglio vs agosto–dicembre) e ai bordi esatti (1 agosto, 30 giugno); `trovaAnnoAgonisticoCorrente` e `risolviAnnoAgonisticoCorrente` con Prisma mockato (trovata esistente / da creare).
  - [x] `lib/db-rls/atleta.ts` (`elencaAtlete`), `lib/db-rls/iscrizione.ts` (`elencaIscrizioniPerAnno`, `confermaIscrizione` incluso il caso di violazione del vincolo univoco trattato come successo) — mock del client Supabase, stesso pattern di `lib/db-rls/atleta.test.ts` (Story 1.3).
  - [x] Server Action `confermaIscrizione`: `FORBIDDEN` per Ruoli diversi da Segreteria, creazione dell'Anno Agonistico se mancante, aggancio Iscrizione, idempotenza su doppia conferma, errori fail-closed.
  - [x] `lib/auth/route-guard.test.ts`: nuova route.

### Review Findings

- [x] [Review][Defer] `calcolaIntervalloStagioneCorrente` calcola i confini della stagione in UTC (`getUTCFullYear`/`getUTCMonth`), non in orario locale Europe/Rome — per una finestra di circa 1-2 ore attorno alla mezzanotte UTC del 31 luglio/1 agosto (le 2-3 del mattino ora italiana, a seconda dell'ora legale), il sistema potrebbe attribuire la stagione "sbagliata" rispetto all'orologio a muro italiano. **Deciso con l'utente: accettabile per ora** — margine di errore di poche ore, una volta l'anno. Da riconsiderare (gestione esplicita del fuso orario Europe/Rome) se questo margine dovesse rivelarsi un problema reale. `lib/anno-agonistico/calcola-intervallo-stagione-corrente.ts`.
- [x] [Review][Patch] `risolviAnnoAgonisticoCorrente` (find-or-create) non chiude la race condition allo stesso modo di `confermaIscrizione` — due conferme concorrenti alla prima Iscrizione della stagione potrebbero entrambe trovare `null` e tentare entrambe la `create`, la seconda urtando `@@unique([dataInizio, dataFine])` con un errore Prisma non gestito, riportato come generico "Impossibile confermare l'iscrizione" invece di un successo. Risolto: cattura dell'errore Prisma `P2002` con ri-lettura idempotente della riga creata dall'altra chiamata (TDD, nuovo test). [lib/anno-agonistico/risolvi-anno-agonistico-corrente.ts]
- [x] [Review][Patch] Il nome della Server Action (`confermaIscrizioneAction`) contraddice la convenzione di naming della stessa ARCHITECTURE-SPINE.md, che usa **esattamente questa storia** come esempio ("Server Action con verbo esplicito, es. `confermaIscrizione`") — ogni altra Server Action del progetto usa un verbo puro senza suffisso (`creaUtente`, `impostaAttivoUtente`, `importaAtlete`, `precaricaAllenatore`, `accedi`, `registrati`). Risolto: rinominata in `confermaIscrizione`; per evitare la collisione con l'omonima funzione di basso livello, quest'ultima è stata rinominata `inserisciIscrizione` in `lib/db-rls/iscrizione.ts`. [app/(iscrizioni)/conferma-iscrizioni/actions.ts]
- [x] [Review][Patch] `IscrizioneRow.tsx` non ha un try/catch attorno alla chiamata diretta alla Server Action, a differenza del proprio pattern di riferimento dichiarato (`UtenteRow.tsx`, Story 1.2) — se la promise rifiuta invece di risolvere in `{ error }`, l'eccezione non gestita non aggiorna mai lo stato di errore in UI. Risolto: aggiunto try/catch attorno alla chiamata, stesso pattern di `UtenteRow.tsx`. [app/(iscrizioni)/conferma-iscrizioni/IscrizioneRow.tsx]
- [x] [Review][Patch] La policy/GRANT `UPDATE` su `iscrizioni` non è mai usata da nessun AC/codice di questa storia — superficie di scrittura concessa "per sicurezza" ma non necessaria (nessun test la esercita), in violazione del principio del minimo privilegio. Risolto: nuova migrazione che rimuove la policy e revoca il GRANT `UPDATE`, verificato dal vivo (query diretta a `pg_policies`/`information_schema`). [prisma/migrations/20260716210000_add_iscrizione/migration.sql]
- [x] [Review][Patch] `IscrizioneRow.tsx` ridichiara localmente un tipo `Atleta` invece di importare `AtletaElenco` da `lib/db-rls/atleta.ts` — stessa forma, due fonti di verità che potrebbero divergere silenziosamente. Risolto: importa `AtletaElenco`. [app/(iscrizioni)/conferma-iscrizioni/IscrizioneRow.tsx]
- [x] [Review][Defer] Nessuna paginazione su `elencaAtlete`/`elencaIscrizioniPerAnno` — coerente con NFR5 (~200 Atlete per il v1), stesso trattamento di ogni altra pagina-elenco del progetto (Admin, import-atlete, precaricamento-allenatori). [lib/db-rls/atleta.ts, lib/db-rls/iscrizione.ts]
- [x] [Review][Defer] L'errore generico `INTERNAL` nasconde la causa reale (RLS, FK, race, timeout) al client — coerente con la convenzione già stabilita in tutto il progetto (messaggio generico al client, `console.error` per la diagnostica lato server). [app/(iscrizioni)/conferma-iscrizioni/actions.ts]
- [x] [Review][Defer] Nessun test automatico verifica dal vivo che le policy RLS di `iscrizioni` blocchino davvero un JWT con un Ruolo non autorizzato (solo mock a livello di unit test) — stessa categoria già esplicitamente accettata come Defer in Story 1.3, verificato manualmente dal vivo invece che con un test ripetibile. [prisma/migrations/20260716210000_add_iscrizione/migration.sql]
- [x] [Review][Defer] Nessun messaggio di stato vuoto né attributi di accessibilità di base (`scope` sulle `th`, `caption`, associazione dell'errore al bottone tramite `aria-describedby`) nella tabella di `page.tsx` — stesso livello di rifinitura UI di ogni altra pagina-elenco del progetto, non una regressione specifica di questa storia. [app/(iscrizioni)/conferma-iscrizioni/page.tsx]
- [x] [Review][Defer] Se un'Atleta venisse eliminata concorrentemente mentre una riga è aperta lato Segreteria, la conferma fallirebbe per violazione FK con un errore generico e riprovabile all'infinito — puramente teorico, nessuna funzionalità di eliminazione di un'Atleta esiste oggi nell'app. [app/(iscrizioni)/conferma-iscrizioni/actions.ts]
- [x] [Review][Defer] Nessun vincolo di controllo a livello DB su `AnnoAgonistico` (es. `dataFine > dataInizio`, nessuna sovrapposizione tra stagioni) — idea di hardening difensivo; l'unico percorso di scrittura che crea righe deriva sempre entrambe le date correttamente insieme, nessuno script di scrittura diretta esiste oggi. [prisma/schema.prisma]
- [x] [Review][Defer] `calcolaIntervalloStagioneCorrente` non ha una guardia per una Data non valida (`NaN`) in input — nessun punto di chiamata reale le passa altro che `new Date()` o una data esplicita valida oggi. [lib/anno-agonistico/calcola-intervallo-stagione-corrente.ts]
- [x] [Review][Defer] Il `Promise.all` in `page.tsx` non è avvolto in un try/catch e non esiste alcun `error.tsx` in tutta l'app — gap preesistente e trasversale a tutto il progetto, già loggato come Defer in Story 1.2. [app/(iscrizioni)/conferma-iscrizioni/page.tsx]

## Dev Notes

- **Continuità dalle Story precedenti — cosa riusare:**
  - `requireRuolo` (Story 1.2, esteso Story 1.3) — qui con un singolo Ruolo (`"SEGRETERIA"`), stessa firma già in uso in `admin/actions.ts` per `"ADMIN"`.
  - Convenzione errori `{ error: { code, message } }`, `FORBIDDEN` riservato all'autorizzazione, pattern try/catch fail-closed, `revalidatePath` dopo ogni mutazione (tutte le Story precedenti).
  - Pattern UI lista + riga con Server Action per-riga (`AdminPage`/`UtenteRow.tsx`, Story 1.2) — stesso approccio per `conferma-iscrizioni`/`IscrizioneRow.tsx`, ma senza form (un solo bottone "Conferma" per riga, non un intero form di modifica).
  - `lib/db-rls/atleta.ts` (Story 1.3) — **estendere**, non ricreare: aggiungere solo la funzione di lettura elenco, lasciare intatte `creaAtleta`/`aggiornaAtleta`.
- **PRIMA VOLTA che `lib/anno-agonistico/` viene popolato** — la cartella è già prevista come Structural Seed in ARCHITECTURE-SPINE.md ("helper stagione corrente, risoluzione transitiva Slot/Presenza (AD-8)") ma non esiste ancora codice. Questa storia crea il modello dati e l'helper; **Story 2.2 (Creazione Gruppi) riuserà `risolviAnnoAgonisticoCorrente` per lo stesso scopo** (AD-8: "la 'stagione corrente' è risolta da un solo helper condiviso, mai da calcoli di date ripetuti per modulo") — non anticipare qui nulla di specifico a Gruppo/Slot/Presenza (che ereditano l'Anno Agonistico transitivamente tramite Gruppo, non tramite un proprio FK diretto — questa storia non tocca `Gruppo`/`Slot`/`Presenza`, non esistono ancora).
- **`AnnoAgonistico` NON è protetta da RLS — decisione di questa storia, non esplicitata testualmente in AD-9**: AD-9 elenca esplicitamente le tabelle Prisma-dirette (Palestra, Campo, Slot, Gruppo, Allenatore, Utente, UtenteRuolo) e quelle RLS (CertificatoMedico, Atleta, Presenza, Iscrizione) — `AnnoAgonistico` non compare in nessuna delle due liste perché non esisteva ancora quando l'architettura è stata scritta. Trattarla come Prisma-diretta è la lettura più coerente: contiene solo un intervallo di date, nessun dato personale/sensibile, stesso trattamento delle altre tabelle organizzative (Palestra, Gruppo). Se in fase di dev-story questa lettura risultasse sbagliata, fermarsi e chiedere prima di introdurre RLS su questa tabella.
- **`Iscrizione` È protetta da RLS (AD-4, esplicitamente nel bind-list)** — prima tabella RLS-protetta da quando Story 1.3 ha introdotto `Atleta`. Stesso pattern: client Supabase autenticato (`lib/db-rls/iscrizione.ts`), mai Prisma diretto a runtime. **Applicare fin da subito la lezione della code review di Story 1.3**: policy separate per operazione (non un'unica `FOR ALL`), e qui **nessuna policy/GRANT `DELETE`** del tutto (non solo ristretta ad Admin) — nessun AC di questa storia richiede di eliminare un'Iscrizione.
- **Chi può confermare — solo Segreteria, non Admin/Dirigente a livello di Server Action**: FR-17 nomina esplicitamente solo la Segreteria (a differenza di FR-19/FR-20, "Admin o Dirigente") — `requireRuolo("SEGRETERIA")`, non un array. L'accesso più ampio di Admin/Dirigente/Segreteria resta comunque alla policy RLS (AD-4, "accesso ampio... necessario per operazioni trasversali"), coerente con la lettura che l'accesso ampio DB-level è un livello di difesa in profondità, non un'autorizzazione applicativa aggiuntiva per compiere l'azione specifica.
- **Auto-creazione dell'Anno Agonistico: solo dal percorso di scrittura, mai da una GET** — `risolviAnnoAgonisticoCorrente` (find-or-create) va chiamata **solo** dalla Server Action (side-effect di scrittura appropriato), **mai** dal rendering della pagina (`page.tsx` usa `trovaAnnoAgonisticoCorrente`, sola lettura, restituisce `null` se la stagione non è ancora stata creata — in quel caso nessuna Atleta risulta iscritta, stato comunque corretto da mostrare). Una GET non dovrebbe avere effetti collaterali di scrittura.
- **Idempotenza (AC #4) — via cattura del vincolo univoco, non via check-then-insert**: `confermaIscrizione` in `lib/db-rls/iscrizione.ts` tenta sempre l'`INSERT`; se Postgres rifiuta per violazione di `@@unique([atletaId, annoAgonisticoId])` (codice errore `23505`), è trattato come successo (l'Atleta era già iscritta) — evita la finestra di race check-then-create già nota da Story 1.3/1.4 (qui eliminata alla radice, non solo accettata come Defer).
- **Cosa NON fare in questa storia:** non creare `Gruppo`/`Slot`/`Presenza` (Epic 2/3, FK verso `AnnoAgonistico` solo per `Gruppo`, ereditato transitivamente da `Slot`/`Presenza` — nessuno di questi esiste ancora). Non tracciare lo stato del tesseramento federale (esplicitamente escluso dall'AC). Non costruire alcuna UI per "annullare" un'Iscrizione confermata — nessun AC lo richiede. Non gestire qui il caso Story 1.8 (riporto Under 13 nel rollover, storia futura) — questa storia riguarda solo la conferma manuale da parte della Segreteria per l'anno corrente.
- **Scala (NFR5):** fino a ~200 Atlete — nessuna paginazione necessaria per l'elenco.

### Project Structure Notes

- File nuovi attesi: `lib/anno-agonistico/` (nuova cartella, Structural Seed già previsto), `lib/db-rls/iscrizione.ts` e relativo test, `app/(iscrizioni)/conferma-iscrizioni/actions.ts`, `page.tsx`, `IscrizioneRow.tsx` e relativi test.
- File esistenti da estendere (non ricreare): `prisma/schema.prisma` (due nuovi modelli), `lib/db-rls/atleta.ts` (nuova funzione di lettura elenco), `lib/auth/route-guard.ts` (nuova entry per `/conferma-iscrizioni`).
- Nessuna modifica a `proxy.ts`, `lib/auth-admin/*`, `lib/matching-codice-fiscale/*`, ai modelli `Utente`/`Ruolo`/`UtenteRuolo`/`Allenatore`/`GenitoreAtleta`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1: Accesso, Popolamento e Iscrizioni / Story 1.6, 1.8 (riferimenti incrociati su Iscrizione)]
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-17, NFR5]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-2, AD-4, AD-8, AD-9, Structural Seed (lib/anno-agonistico/, app/(iscrizioni)/)]
- [Source: _bmad-output/implementation-artifacts/1-2-gestione-utenti-e-ruoli-admin.md — pattern UI lista + riga con Server Action, AdminPage/UtenteRow.tsx]
- [Source: _bmad-output/implementation-artifacts/1-3-import-archivio-atlete-da-export-federale.md — prima tabella RLS del progetto (Atleta), lezione sulle policy separate per operazione invece di FOR ALL, lezione sui GRANT mancanti, lib/db-rls/atleta.ts esistente da estendere]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Migrazione shadow-DB**: stesso workaround ormai consolidato (Story 1.3/1.4/1.5) — entrambe le migrazioni (`AnnoAgonistico`, `Iscrizione`+RLS) scritte a mano e applicate con `prisma migrate deploy`, verificate con `prisma migrate status` (nessun drift).
- **Prisma richiede la relazione dichiarata su entrambi i modelli**: come già in Story 1.5 per `GenitoreAtleta`, aggiunto `iscrizioni Iscrizione[]` su `Atleta` (puramente a livello di schema, nessuna lettura runtime di `Atleta` via Prisma diretto).
- **Policy RLS/GRANT per `iscrizioni` scritte corrette al primo colpo**: applicando fin da subito le lezioni di Story 1.3 (policy separate per operazione, GRANT esplicito incluso dall'inizio, nessun GRANT `DELETE` dato che non serve), la verifica dal vivo non ha rivelato problemi di permessi su questa tabella (a differenza delle sorprese di Story 1.3/1.5).
- **Scoperta imprevista in fase di verifica dal vivo — staleness del JWT subito dopo l'auto-registrazione (conseguenza reale di AD-11, non un bug introdotto da questa storia)**: un utente Segreteria appena registrato (`registrati/actions.ts`) e reindirizzato a "/" ottiene una sessione il cui JWT/access-token è stato emesso da `signUp` **prima** che `sincronizzaRuoliAppMetadata` scrivesse i Ruoli su `app_metadata` — visitando subito dopo `/conferma-iscrizioni`, il route guard (che usa `getUser()`, dati freschi dal server Auth) lo autorizza correttamente, ma la lettura RLS-protetta di `atlete`/`iscrizioni` (che valuta `auth.jwt()`, i claim incorporati nel token già emesso, non rifreschi lato server) vede `ruoli` ancora vuoto e restituisce zero righe — nessun errore, solo un elenco vuoto. Verificato che un logout/login successivo (JWT nuovo, emesso con i Ruoli già presenti in `app_metadata`) risolve immediatamente il problema. Questo è esattamente il trade-off già accettato esplicitamente in AD-11 ("la staleness del JWT... è accettata, non richiede invalidazione forzata della sessione"), qui semplicemente osservato per la prima volta in un caso concreto (auto-registrazione + Ruolo Segreteria-gated nella stessa sessione) — **non risolto in questa storia** (richiederebbe un refresh esplicito della sessione dopo la sincronizzazione di `app_metadata` in `registrati/actions.ts`, un cambiamento trasversale a tutte le storie precedenti, non specifico di questa). Loggato in `deferred-work.md`.
- Verifiche eseguite e passate: `npx vitest run` (129/129 test), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun errore), `npm run build` (build completata, `/conferma-iscrizioni` correttamente dinamica).
- **Verifica end-to-end reale eseguita** (Playwright, contro il backend Supabase locale, non mockato, con due Atlete di test precaricate via Prisma diretto): pagina raggiungibile da un utente Segreteria (dopo un login "fresco", vedi sopra); prima conferma → `AnnoAgonistico` corrente creato automaticamente con l'intervallo corretto per la data odierna (confermato via query diretta al DB, AC #3) e `Iscrizione` collegata correttamente (AC #2); stato "Iscritta" persiste dopo un reload della pagina; la seconda Atleta resta "non iscritta" (nessuna interferenza tra righe); un utente Admin (non Segreteria) viene reindirizzato a `/non-autorizzato` visitando `/conferma-iscrizioni` (AC #5, route guard). Idempotenza (AC #4) verificata a fondo via test unitari (violazione del vincolo univoco `23505` trattata come successo) — non ripetuta dal vivo con un doppio click reale poiché la UI rimuove il bottone "Conferma" dopo il primo successo, rendendo il doppio submit non riproducibile tramite l'interfaccia stessa. Dati di test ripuliti dal DB al termine (Atlete, Iscrizioni, Utenti/sessioni Supabase Auth create per la verifica), Playwright disinstallato.
- **Code review (2026-07-16):** 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) hanno trovato — con corroborazione tra layer — una race condition reale su `risolviAnnoAgonisticoCorrente` (chiusa allo stesso modo di `confermaIscrizione`, TDD), un nome di Server Action in contraddizione con l'esempio illustrativo della stessa ARCHITECTURE-SPINE.md (rinominata, con conseguente rinomina della funzione di basso livello per evitare collisione), un try/catch mancante in `IscrizioneRow.tsx` rispetto al proprio pattern di riferimento, e una policy/GRANT `UPDATE` concessi ma mai usati (rimossi con una nuova migrazione). Deciso con l'utente di accettare per ora il calcolo dei confini di stagione in UTC anziché ora locale italiana (margine di poche ore, una volta l'anno). Tutte le patch riverificate dal vivo (flusso di conferma ancora funzionante dopo le rinomine; policy/GRANT `UPDATE` confermati assenti via query diretta a `pg_policies`/`information_schema`). Suite completa: `npx vitest run` (131/131 test), typecheck/lint/build verdi.

### Completion Notes List

- Implementati Task 1-8: modelli `AnnoAgonistico` (non-RLS) e `Iscrizione` (RLS, con policy separate per operazione e nessun GRANT/policy `DELETE` fin da subito), modulo condiviso `lib/anno-agonistico/` (Structural Seed, prima popolazione — riusabile da Story 2.2), estensione di `lib/db-rls/atleta.ts` con `elencaAtlete`, nuovo modulo `lib/db-rls/iscrizione.ts`, Server Action `confermaIscrizioneAction` (solo Ruolo Segreteria, coerente con FR-17), nuovo modulo `app/(iscrizioni)/` con UI lista+riga, route guard esteso.
- **Decisione architetturale applicata come da Dev Notes**: `AnnoAgonistico` trattata come non protetta da RLS (dato puramente strutturale, nessuna delle due liste esplicite di AD-9 la menziona per nome, essendo un'entità introdotta solo con questa storia) — nessuna obiezione emersa in fase di sviluppo, nessuna richiesta di fermarsi e chiedere.
- Auto-creazione dell'Anno Agonistico correttamente confinata al percorso di scrittura (Server Action), mai alla GET della pagina — confermato dal vivo (la pagina in sola lettura non crea nulla finché non arriva la prima conferma).
- Nessun elemento bloccato da vincoli ambientali; l'unica scoperta imprevista (staleness del JWT post-auto-registrazione) è un comportamento reale ma già architetturalmente accettato (AD-11), non un difetto di questa storia.
- **Post-review (patch applicate)**: race condition su `AnnoAgonistico` chiusa, Server Action rinominata `confermaIscrizione` (coerente con l'esempio di naming di ARCHITECTURE-SPINE.md), funzione di basso livello rinominata `inserisciIscrizione` per evitare la collisione, try/catch aggiunto in `IscrizioneRow.tsx`, tipo locale duplicato sostituito con l'import di `AtletaElenco`, policy/GRANT `UPDATE` inutilizzati rimossi con una nuova migrazione. Decisione utente: calcolo dei confini di stagione in UTC accettato per ora, deferito con clausola di revisione.

### File List

**Creati:**
- `prisma/migrations/20260716200000_add_anno_agonistico/migration.sql`
- `prisma/migrations/20260716210000_add_iscrizione/migration.sql`
- `prisma/migrations/20260716220000_iscrizioni_remove_unused_update/migration.sql` (post-review: rimuove policy/GRANT `UPDATE` inutilizzati)
- `lib/anno-agonistico/calcola-intervallo-stagione-corrente.ts`
- `lib/anno-agonistico/calcola-intervallo-stagione-corrente.test.ts`
- `lib/anno-agonistico/risolvi-anno-agonistico-corrente.ts`
- `lib/anno-agonistico/risolvi-anno-agonistico-corrente.test.ts`
- `lib/anno-agonistico/index.ts`
- `lib/db-rls/iscrizione.ts`
- `lib/db-rls/iscrizione.test.ts`
- `app/(iscrizioni)/conferma-iscrizioni/actions.ts`
- `app/(iscrizioni)/conferma-iscrizioni/actions.test.ts`
- `app/(iscrizioni)/conferma-iscrizioni/page.tsx`
- `app/(iscrizioni)/conferma-iscrizioni/IscrizioneRow.tsx`

**Modificati:**
- `prisma/schema.prisma` (nuovi modelli `AnnoAgonistico`, `Iscrizione`; back-reference `iscrizioni` su `Atleta`)
- `lib/db-rls/atleta.ts` (nuova funzione di lettura elenco `elencaAtlete`)
- `lib/db-rls/atleta.test.ts` (nuovi test per `elencaAtlete`)
- `lib/auth/route-guard.ts` (nuova entry per `/conferma-iscrizioni`, solo Segreteria)
- `lib/auth/route-guard.test.ts` (nuovi test per la nuova route)
- `lib/anno-agonistico/risolvi-anno-agonistico-corrente.ts` (post-review: chiusura race condition su `P2002`)
- `lib/anno-agonistico/risolvi-anno-agonistico-corrente.test.ts` (post-review: 2 nuovi test)
- `lib/db-rls/iscrizione.ts` (post-review: `confermaIscrizione` → `inserisciIscrizione`)
- `lib/db-rls/iscrizione.test.ts` (post-review: rinominato di conseguenza)
- `app/(iscrizioni)/conferma-iscrizioni/actions.ts` (post-review: Server Action rinominata `confermaIscrizioneAction` → `confermaIscrizione`, import aggiornato)
- `app/(iscrizioni)/conferma-iscrizioni/actions.test.ts` (post-review: rinominato di conseguenza)
- `app/(iscrizioni)/conferma-iscrizioni/IscrizioneRow.tsx` (post-review: try/catch aggiunto, import di `AtletaElenco` invece di un tipo locale duplicato)

## Change Log

- 2026-07-16: Implementazione completa Story 1.6 (Task 1-8). Prima tabella RLS del progetto dopo `Atleta` (Story 1.3) — applicate fin da subito le lezioni della code review di quella storia (policy separate per operazione, GRANT esplicito completo, nessun DELETE non necessario). Prima popolazione del modulo condiviso `lib/anno-agonistico/` (Structural Seed, AD-8), riusabile da Story 2.2. Scoperta e documentata (non risolta, comportamento già accettato da AD-11) una staleness del JWT subito dopo l'auto-registrazione che impedisce temporaneamente le letture RLS con la propria sessione finché non si rientra. Tutti gli AC verificati anche contro un backend reale (Playwright + query dirette DB).
- 2026-07-16: Code review. Applicate 5 patch (race condition su `AnnoAgonistico` chiusa con lo stesso pattern idempotente di `Iscrizione`, Server Action rinominata per coerenza con la convenzione di naming dell'architettura, try/catch mancante in `IscrizioneRow.tsx`, rimozione della policy/GRANT `UPDATE` inutilizzati, tipo duplicato sostituito con l'import condiviso) e 1 decisione utente (calcolo dei confini di stagione in UTC anziché ora locale italiana, accettato per ora). Suite completa e verifica dal vivo riverificate con esito positivo. Status → done.
