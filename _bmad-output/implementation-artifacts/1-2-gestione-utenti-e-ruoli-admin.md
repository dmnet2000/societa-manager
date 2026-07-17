---
baseline_commit: NO_VCS
---

# Story 1.2: Gestione utenti e ruoli — Admin

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin di sistema,
I want creare, disattivare/riattivare e assegnare Ruoli agli utenti,
so that posso mantenere corretto l'accesso al sistema nel tempo.

## Acceptance Criteria

1. **Given** sono autenticato come Admin, **when** creo un nuovo utente specificando email, password e uno o più Ruoli, **then** viene creato un utente Supabase Auth e un record `Utente` (Prisma) con quei Ruoli, sincronizzati anche in `app_metadata` (AD-11) — l'utente può accedere subito con quelle credenziali (nessuna conferma email, coerente con Story 1.1).
2. **Given** provo a creare un utente con un'email già registrata, **when** invio il form, **then** ricevo un messaggio d'errore chiaro (stesso rilevamento di Story 1.1: `error.code === "user_already_exists"` oltre al caso `identities` vuoto), non un falso successo.
3. **Given** sono autenticato come Admin, **when** disattivo un utente esistente, **then** il suo `Utente.attivo` diventa `false` **e** un suo successivo tentativo di login viene rifiutato con un messaggio chiaro ("Account disattivato. Contatta la segreteria."), non un crash e non un accesso silenzioso.
4. **Given** un utente è disattivato, **when** un Admin lo riattiva, **then** `Utente.attivo` torna `true` e può accedere di nuovo normalmente.
5. **Given** sono autenticato come Admin, **when** assegno o rimuovo uno o più Ruoli a un utente esistente, **then** `UtenteRuolo` (Prisma, fonte di verità) e `app_metadata` (Supabase) vengono aggiornati coerentemente riusando `sincronizzaRuoliAppMetadata` — l'effetto sulle sessioni già aperte segue la staleness accettata da AD-11 (nessuna invalidazione forzata della sessione corrente).
6. **Given** visito `/admin` senza il Ruolo Admin (o non autenticato), **then** vengo reindirizzato dal route guard già esistente (Story 1.1, invariato — `PROTECTED_ROUTES` già mappa `/admin` → `["ADMIN"]`).

## Tasks / Subtasks

- [x] Task 1: Server Action `creaUtente` (AC: #1, #2)
  - [x] In `app/(amministrazione)/admin/actions.ts`: valida email/password/Ruoli (riusa `RUOLI_VALIDI` da `lib/ruoli.ts`), poi stesso pattern di Story 1.1 `registrati/actions.ts` — `supabase.auth.admin.createUser` (service-role, **non** `signUp`: l'Admin crea l'utente direttamente, non è una richiesta self-service) con `email_confirm: true` (nessuna conferma email, come da seed Story 1.1)
  - [x] Try/catch fail-closed sulla chiamata Supabase (pattern stabilito in Story 1.1 code review); rilevamento email duplicata: sia `error.code === "user_already_exists"` sia `identities` vuoto (entrambi i casi emersi in Story 1.1)
  - [x] `prisma.utente.create` + `sincronizzaRuoliAppMetadata` (riuso diretto da `lib/auth-admin/sync-roles.ts`, già aggiornata in Story 1.1 code review per fare merge di `app_metadata`, non sostituzione) — stesso non-rollback-automatico deciso in Story 1.1 su fallimento a metà (vedi Dev Notes)
  - [x] Errori nella forma `{ error: { code, message } }` (convenzione ARCHITECTURE-SPINE.md, applicata da Story 1.1 in poi — **non** tornare a `{ error: string }`)
- [x] Task 2: Server Action `impostaAttivoUtente` — disattiva/riattiva (AC: #3, #4)
  - [x] Toggle di `Utente.attivo` via Prisma (`update` per id) — nessuna scrittura su Supabase Auth necessaria per questa azione da sola (vedi Dev Notes sul perché non specchiamo `attivo` in `app_metadata`)
- [x] Task 3: Bloccare il login per utenti disattivati (AC: #3)
  - [x] Modificare `app/(auth)/accedi/actions.ts` (file esistente, **non** nuovo): dopo un `signInWithPassword` riuscito, query Prisma su `Utente.attivo` per `supabaseAuthId`; se `attivo === false`, chiamare `supabase.auth.signOut()` sulla sessione appena creata e restituire `{ error: { code: "ACCOUNT_DISATTIVATO", message: "Account disattivato. Contatta la segreteria." } }` invece di proseguire con `redirect("/")`
- [x] Task 4: Server Action `aggiornaRuoliUtente` — assegna/rimuove Ruoli (AC: #5)
  - [x] Sostituisce l'insieme `UtenteRuolo` per l'utente target (delete + create nella stessa transazione Prisma, o `deleteMany`+`createMany`) poi richiama `sincronizzaRuoliAppMetadata` — **non** invalidare/forzare logout: la staleness è esplicitamente accettata da AD-11
- [x] Task 5: UI Admin — lista utenti, creazione, toggle, ruoli (AC: #1, #3, #4, #5, #6)
  - [x] Estendere `app/(amministrazione)/admin/page.tsx` (file esistente, stub da Story 1.1): Server Component che legge tutti gli `Utente` + `Ruoli` via Prisma diretto (non protetto da RLS, AD-9 — stesso pattern di Story 1.1), tabella con email/Ruoli/attivo, form di creazione utente, controlli per toggle attivo e per Ruoli
  - [x] Nessuna modifica al route guard: `/admin` è già mappato a `["ADMIN"]` in `lib/auth/route-guard.ts` (Story 1.1) — verificare solo che nessuna nuova route venga introdotta fuori da quel prefisso
- [x] Task 6: Test (Vitest) per tutte le nuove Server Action e per la modifica a `accedi`
  - [x] `app/(amministrazione)/admin/actions.test.ts`: mock di Supabase/Prisma come nei test di Story 1.1, copertura di successo/errore per ciascuna delle 3 Server Action nuove
  - [x] Estendere `app/(auth)/accedi/actions.test.ts` con il caso "utente disattivato" (AC #3)

### Review Findings

- [x] [Review][Patch] Nessuna protezione contro la rimozione dell'ultimo Admin — deciso con l'utente: bloccare sia `aggiornaRuoliUtente` (se rimuoverebbe ADMIN all'ultimo utente attivo con quel ruolo) sia `impostaAttivoUtente` (se disattiverebbe l'ultimo Admin attivo). `app/(amministrazione)/admin/actions.ts`.
- [x] [Review][Patch] Le 3 Server Action Admin (`creaUtente`, `impostaAttivoUtente`, `aggiornaRuoliUtente`) non verificano internamente che il chiamante sia Admin — si affidano solo al route guard di `proxy.ts`, basato sul pathname. Le Server Action di Next.js sono endpoint POST identificati da un riferimento d'azione, non necessariamente vincolati alla pagina che li importa — vanno protette anche a livello di singola Server Action (`code: "FORBIDDEN"`, riservato in ARCHITECTURE-SPINE.md esattamente a questo caso). [app/(amministrazione)/admin/actions.ts]
- [x] [Review][Patch] `aggiornaRuoliUtente` si fida di un `supabaseAuthId` proveniente da un campo hidden del form, mai verificato contro `utenteId` — un submit manomesso potrebbe aggiornare i Ruoli di un utente sincronizzando il risultato su `app_metadata` di un utente diverso. Va derivato da `utenteId` via Prisma, non accettato dal client. [app/(amministrazione)/admin/actions.ts, app/(amministrazione)/admin/UtenteRow.tsx]
- [x] [Review][Patch] In `accedi()`, quando non esiste nessun `Utente` corrispondente all'utente Supabase Auth autenticato (`utente === null` — proprio lo scenario prodotto da un fallimento parziale di `creaUtente`/`registrati`), il login viene consentito silenziosamente, contraddicendo l'intento fail-closed dichiarato nel commento del codice stesso. [app/(auth)/accedi/actions.ts]
- [x] [Review][Patch] `aggiornaRuoliUtente`: `deleteMany` + `createMany` su `UtenteRuolo` non sono in una transazione — un fallimento tra le due chiamate lascia l'utente senza alcun Ruolo (stato peggiore di prima della modifica). [app/(amministrazione)/admin/actions.ts]
- [x] [Review][Patch] Rilevamento email duplicata su `admin.createUser` controlla solo `error.code === "email_exists"`, senza il controllo aggiuntivo `"user_already_exists"` richiesto testualmente da AC #2/Task 1 per coerenza con Story 1.1 — se una versione futura di GoTrue restituisse quel codice anche per questo metodo, l'errore ricadrebbe genericamente su INTERNAL. [app/(amministrazione)/admin/actions.ts]
- [x] [Review][Patch] `parseRuoliDaForm` reimplementa la stessa logica di filtro/dedup di `lib/ruoli.ts` invece di riusare `parseRuoli`, nonostante le Dev Notes di questa storia si impegnino esplicitamente a riusarlo. [app/(amministrazione)/admin/actions.ts, lib/ruoli.ts]
- [x] [Review][Patch] Tutti i blocchi `catch` di questa storia (`admin/actions.ts`, `accedi/actions.ts`) scartano la causa reale dell'errore senza loggarla — ogni fallimento in produzione diventa indistinguibile dagli altri. [app/(amministrazione)/admin/actions.ts, app/(auth)/accedi/actions.ts]
- [x] [Review][Patch] Il campo password in `NuovoUtenteForm` non ha `autoComplete="new-password"` — un password manager potrebbe offrire di autocompilare le credenziali salvate dell'Admin stesso. [app/(amministrazione)/admin/NuovoUtenteForm.tsx]
- [x] [Review][Patch] `UtenteRow` usa checkbox non controllati (`defaultChecked`) con `key` basata solo su `utente.id` — dopo un aggiornamento dei Ruoli, se React riusa la stessa istanza del componente, le checkbox potrebbero non riflettere i dati freschi dal server. [app/(amministrazione)/admin/UtenteRow.tsx]
- [x] [Review][Patch] `NuovoUtenteForm` non si resetta né mostra conferma dopo una `creaUtente` riuscita — email/password appena usate restano nei campi, senza feedback di successo oltre a individuare la nuova riga in tabella. [app/(amministrazione)/admin/NuovoUtenteForm.tsx]
- [x] [Review][Patch] `toggleAttivo` in `UtenteRow` non intercetta un possibile fallimento della chiamata RPC stessa a `impostaAttivoUtente` (distinto dal try/catch interno all'azione, che copre solo la query Prisma). [app/(amministrazione)/admin/UtenteRow.tsx]
- [x] [Review][Patch] In `accedi()`, il blocco `catch` chiama a sua volta `supabase.auth.signOut()` senza protezione — se anche questa chiamata lancia un'eccezione, sfugge non gestita dalla funzione. [app/(auth)/accedi/actions.ts]
- [x] [Review][Defer] Nessuna normalizzazione case dell'email prima delle chiamate Supabase/Prisma — deferred, pre-existing (stesso pattern, non normalizzato, già presente in `registrati/actions.ts` di Story 1.1). [app/(amministrazione)/admin/actions.ts]
- [x] [Review][Defer] `signInWithPassword` mappa qualunque codice di errore (rate limit, email non confermata, ecc.) sullo stesso messaggio generico "Credenziali non valide" — deferred, pre-existing (comportamento invariato di Story 1.1, non toccato dal Task 3 di questa storia). [app/(auth)/accedi/actions.ts]
- [x] [Review][Defer] `AdminPage` legge tutti gli Utenti senza paginazione — deferred, pre-existing scale concern (prematuro per la scala attuale hobby/piccola società). [app/(amministrazione)/admin/page.tsx]
- [x] [Review][Defer] `AdminPage` non ha un error boundary se la query Prisma fallisce — deferred, pre-existing (nessuna pagina dell'app ha `error.tsx`, non specifico di questa storia). [app/(amministrazione)/admin/page.tsx]
- [x] [Review][Defer] L'array `RUOLI` (valore/etichetta) è duplicato in `NuovoUtenteForm.tsx` e `UtenteRow.tsx` (e già in `registrati/page.tsx` di Story 1.1) — deferred, pulizia DRY a basso rischio che tocca anche un file di Story 1.1. [app/(amministrazione)/admin/NuovoUtenteForm.tsx, app/(amministrazione)/admin/UtenteRow.tsx]
- [x] [Review][Defer] Nessun flusso di invito/password temporanea/reset forzato per gli utenti creati dall'Admin — deferred, esplicitamente fuori scope (nessun sistema di inviti/email esiste in questo progetto). [app/(amministrazione)/admin/actions.ts]

## Dev Notes

- **Continuità da Story 1.1 — cosa riusare, non reinventare:**
  - `lib/auth-admin/client.ts` (`createAdminClient`, client service-role) e `lib/auth-admin/sync-roles.ts` (`sincronizzaRuoliAppMetadata`, **già aggiornata in code review per fare merge di `app_metadata` invece di sostituirlo** — usarla così com'è, non reintrodurre la sostituzione)
  - `lib/ruoli.ts` (`RUOLI_VALIDI`, `parseRuoli`) — validazione condivisa dei Ruolo, aggiunta in Story 1.1 code review proprio per essere riusata da storie successive come questa
  - Convenzione **stabilita** (non opzionale) da Story 1.1 code review: ogni Server Action restituisce errori come `{ error: { code, message } }` (ARCHITECTURE-SPINE.md, "Data & formati"), `code: 'FORBIDDEN'` riservato ai soli rifiuti di autorizzazione. Le nuove Server Action di questa storia devono seguire la stessa forma fin da subito — **non** replicare la forma `{ error: string }` originaria di Story 1.1 (già corretta).
  - Pattern try/catch fail-closed attorno alle chiamate Supabase (rete/outage → messaggio d'errore pulito, non crash) — stabilito in Story 1.1 code review, da riapplicare qui.
  - Story 1.1 aveva **deliberatamente rimandato** il controllo di `Utente.attivo` al login a questa storia (commento nello schema Prisma: "servirà a Story 1.2 per la disattivazione") — Task 3 lo implementa.
- **AD-11 (Ruoli specchiati su `app_metadata`):** la regola esplicita in `ARCHITECTURE-SPINE.md` è che la staleness del JWT tra un aggiornamento Ruoli e il prossimo refresh **è accettata**, "non richiede invalidazione forzata della sessione". Questo vale per i cambi di Ruolo (Task 4/AC #5): non serve fare logout dell'utente quando un Admin cambia i suoi Ruoli.
- **Perché `Utente.attivo` NON va specchiato in `app_metadata` come i Ruoli:** a differenza dei Ruoli, l'AC #3 di questa storia richiede che un utente disattivato **non possa più accedere**, non solo che smetta di vedere funzionalità — è un requisito più forte della staleness accettata da AD-11 per i Ruoli. La soluzione più semplice e coerente con l'architettura esistente è controllare `attivo` nel **login** (`accedi/actions.ts`, un punto in cui una query Prisma è già normale ed economica, a differenza del Proxy che AD-11 tiene volutamente senza query DB) — non nel Proxy/middleware. Una sessione già aperta al momento della disattivazione resta valida fino alla sua naturale scadenza (`jwt_expiry`, di default 1h in `supabase/config.toml`) — coerente con lo stesso principio di staleness accettata di AD-11, qui esteso per analogia da chi ha creato questa storia. **Se l'utente si aspetta un blocco immediato anche per sessioni già aperte, serve una decisione esplicita** (es. richiamare `supabase.auth.admin.signOut(supabaseAuthId, "global")` al momento della disattivazione) — non implementato di default in questa storia, da confermare con l'utente prima di dev-story se il gap non è accettabile.
- **AD-2 (confini moduli):** questa storia vive interamente in `app/(amministrazione)/` (Amministrazione e Vista Dirigente, FR-26/FR-27/FR-29 — `ARCHITECTURE-SPINE.md` Structural Seed) — **non** in `(auth)/` o `(onboarding-import)/`, tranne la singola modifica mirata a `accedi/actions.ts` (Task 3), che resta necessaria perché il controllo `attivo` è intrinseco al login stesso.
- **AD-9 (split dati RLS):** `Utente`/`UtenteRuolo` restano fuori dalle tabelle RLS-protette (CertificatoMedico, Atleta, Presenza, Iscrizione) — gestibili via Prisma diretto, come in Story 1.1. Nessun cambiamento qui.
- **Creazione utente da Admin vs auto-registrazione (Story 1.1):** usare `supabase.auth.admin.createUser` (service-role), **non** `supabase.auth.signUp` — la registrazione self-service è FR-18/Story 1.1, la creazione da parte dell'Admin è FR-26/questa storia; sono percorsi distinti anche se il rilevamento email-duplicata è concettualmente lo stesso.
- **Riattivazione:** l'AC dell'epic menziona solo "disattivare", ma un flag booleano naturalmente si presta a un toggle bidirezionale (AC #4 di questa storia lo rende esplicito) — nessuna funzionalità aggiuntiva oltre al semplice ripristino di `attivo = true`.
- **Nessuno standard di testing diverso da Story 1.1:** Vitest, stesso pattern di mock di Supabase/Prisma (nessuna rete/DB reale nei test unitari).

### Project Structure Notes

- File **nuovi** attesi: `app/(amministrazione)/admin/actions.ts`, `app/(amministrazione)/admin/actions.test.ts`.
- File **esistenti da modificare** (non ricreare da zero): `app/(amministrazione)/admin/page.tsx` (stub di Story 1.1, va esteso), `app/(auth)/accedi/actions.ts` e il relativo `actions.test.ts` (Task 3, controllo `attivo`).
- Nessuna modifica a `lib/auth/route-guard.ts`, `proxy.ts`, `prisma/schema.prisma` attesa — lo schema Utente/Ruolo/UtenteRuolo di Story 1.1 copre già questa storia.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1: Accesso, Popolamento e Iscrizioni / Story 1.2]
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-26]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-2, AD-4, AD-9, AD-11, Structural Seed (app/(amministrazione)/)]
- [Source: _bmad-output/implementation-artifacts/1-1-registrazione-e-login-per-ruolo.md — pattern Server Action, client Supabase admin, sync-roles, convenzione errori post-code-review, schema Utente/Ruolo/UtenteRuolo]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Verificato dal vivo (`admin.createUser`, non `signUp`): l'email duplicata restituisce `error.code === "email_exists"` (diverso da `user_already_exists` di `signUp`, Story 1.1) — usato in `creaUtente`.
- `npm run build`: `/admin` risultava inizialmente pre-renderizzato come pagina statica (`○`), nonostante legga dati mutabili via Prisma modificati dalle stesse Server Action sulla pagina. Aggiunto `export const dynamic = "force-dynamic"` per forzare il rendering per-richiesta — build verificata di nuovo (`ƒ /admin`).
- Verifiche eseguite e passate prima della code review: `npx vitest run` (37/37 test), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun errore), `npm run build` (build completata). Dopo le patch della code review: 50/50 test (13 nuovi/aggiornati), typecheck/lint/build di nuovo verdi.
- **Code review (2026-07-16):** 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) hanno trovato — con tripla corroborazione indipendente — che `aggiornaRuoliUtente` si fidava di un `supabaseAuthId` proveniente da un campo hidden del form, mai verificato contro `utenteId`; e che nessuna delle 3 Server Action Admin verificava internamente il Ruolo del chiamante (si affidavano solo al route guard di `proxy.ts`, basato sul pathname — non garantito per le Server Action di Next.js, che sono endpoint indipendenti dal path della pagina che le importa). Corretti entrambi: nuovo helper `lib/auth/require-ruolo.ts` richiamato da tutte e 3 le azioni; `supabaseAuthId` ora derivato da `utenteId` via Prisma. Altre 11 patch applicate (transazione su `aggiornaRuoliUtente`, doppio controllo email duplicata, riuso di `parseRuoli`, logging degli errori, protezione ultimo Admin — decisa con l'utente — e alcuni fix minori UI). Una segnalazione dell'Acceptance Auditor ("i test non compaiono nel diff") era un falso positivo dovuto a un errore mio nel costruire il diff inviato ai reviewer, non un gap reale.
- Scoperto durante l'applicazione delle patch: `"server-only"` (pacchetto npm) lancia un errore runtime se importato fuori dalla pipeline di build di Next.js — necessario mockarlo esplicitamente nei test che caricano il modulo reale (`lib/auth/require-ruolo.test.ts`), stesso problema già riscontrato in Story 1.1 per `lib/auth-admin/sync-roles.test.ts`.
- Riverificate dal vivo (Playwright + query dirette DB/app_metadata, dopo le patch) le protezioni più importanti: rimozione del Ruolo ADMIN e disattivazione bloccate correttamente quando l'utente e' l'unico Admin attivo; consentite quando ne esiste un altro; riassegnazione Ruoli funzionante con `supabaseAuthId` derivato lato server; messaggio/reset di successo dopo la creazione di un utente.

### Completion Notes List

- Implementati Task 1-6: Server Action `creaUtente`/`impostaAttivoUtente`/`aggiornaRuoliUtente`, blocco login per utenti disattivati in `accedi/actions.ts`, UI Admin (lista utenti, form creazione, toggle attivo, riassegnazione Ruoli), test Vitest per tutto quanto sopra.
- Riusati senza modifiche concettuali: `lib/auth-admin/client.ts`, `lib/auth-admin/sync-roles.ts` (merge `app_metadata`, Story 1.1), `lib/ruoli.ts` (validazione/dedup Ruolo, Story 1.1). Nessuna modifica a `lib/auth/route-guard.ts`, `proxy.ts`, `prisma/schema.prisma`.
- **Verifica end-to-end reale eseguita** (Playwright contro il backend Supabase locale, non mockato): login Admin → `/admin` → creazione nuovo utente (visibile in tabella, confermato anche via query diretta al DB) → disattivazione → tentativo di login con quell'utente rifiutato con "Account disattivato. Contatta la segreteria." (AC #3) → riattivazione (AC #4) → riassegnazione Ruoli (aggiunta `DIRIGENTE`), confermata sia su `UtenteRuolo` (Prisma) sia su `app_metadata` (merge corretto, non sostituzione) via query dirette. Tutti gli AC (#1–#6) verificati contro un backend reale, non solo con i mock dei test.
- Nessun elemento bloccato da vincoli ambientali in questa storia (Docker/Supabase locale già disponibili dalla Story 1.1).

### File List

**Creati:**
- `app/(amministrazione)/admin/actions.ts`
- `app/(amministrazione)/admin/actions.test.ts`
- `app/(amministrazione)/admin/NuovoUtenteForm.tsx`
- `app/(amministrazione)/admin/UtenteRow.tsx`
- `lib/auth/require-ruolo.ts` (code review: verifica il Ruolo del chiamante dentro ogni Server Action riservata)
- `lib/auth/require-ruolo.test.ts`

**Modificati:**
- `app/(amministrazione)/admin/page.tsx` (da stub statico a Server Component con lista utenti reale; aggiunto `export const dynamic = "force-dynamic"`; poi, in code review, `key` include i Ruoli e non passa più `supabaseAuthId` a `UtenteRow`)
- `app/(auth)/accedi/actions.ts` (Task 3: controllo `Utente.attivo` post-login, `signOut` + errore se disattivato; poi, in code review, fail-closed anche su `Utente` non trovato, logging, `signOut` resiliente nel catch)
- `app/(auth)/accedi/actions.test.ts` (nuovi test per il blocco utente disattivato e i casi limite collegati; poi aggiornati/estesi in code review)
- `lib/ruoli.ts` (code review: `parseRuoli` ora deduplica)
- `lib/ruoli.test.ts` (code review: nuovo test per il dedup)

## Change Log

- 2026-07-16: Implementazione completa Story 1.2 (Task 1-6): gestione utenti/ruoli/disattivazione da parte dell'Admin. Nessun blocco ambientale (Docker/Supabase locale già disponibili). Tutti gli AC verificati anche contro un backend reale (Playwright + query dirette DB/app_metadata).
- 2026-07-16: Code review. Trovate e corrette (tripla corroborazione tra i 3 layer di review) due lacune di sicurezza reali: Server Action Admin senza controllo di autorizzazione proprio, e `aggiornaRuoliUtente` che si fidava di un `supabaseAuthId` non verificato dal client. Aggiunta, con l'utente, la protezione contro la rimozione dell'ultimo Admin attivo. 13 patch totali applicate e riverificate dal vivo. Story portata a `done`.
