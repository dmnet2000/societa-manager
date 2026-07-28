---
baseline_commit: dd5e787a1a292857816856f4ece58bcd637d0946
---

# Story 9.11: Recupero password

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Utente che non riesce ad accedere perché ha dimenticato la password,
I want un modo per reimpostarla senza dover chiedere aiuto,
so that posso tornare ad accedere all'app da solo.

As a Admin,
I want poter reimpostare direttamente la password di un Utente a un valore noto,
so that posso sbloccare rapidamente chi non riesce a usare il recupero via email (es. email non raggiungibile, SMTP non configurato) senza passaggi tecnici.

**Note aggiuntive:** Story aggiunta il 2026-07-28 su richiesta esplicita dell'utente (vedi `epic-9-context.md`). Durante la creazione di questa storia l'utente ha chiesto di aggiungere **anche** la seconda funzionalità (reset Admin a password fissa) come parte dello stesso lavoro — la storia copre quindi due meccanismi distinti e indipendenti, entrambi descritti sotto. **Verificato**: oggi non esiste alcun flusso di recupero password nel progetto — `/accedi` è solo login, `/modifica-password` (Story 9.4) richiede già una sessione attiva.

## Acceptance Criteria

**Parte A — Recupero via email (self-service)**

1. **Given** un Utente su `/accedi` che non ricorda la password **When** clicca un link "Password dimenticata?" **Then** raggiunge una nuova pagina pubblica `/recupera-password` con un form che chiede solo l'email
2. **Given** l'Utente inserisce un'email e invia il form **When** l'invio va a buon fine (indipendentemente dal fatto che l'email corrisponda o meno a un account esistente, e indipendentemente da un eventuale errore di invio SMTP) **Then** vede sempre lo stesso messaggio generico di conferma (es. "Se l'indirizzo è registrato, riceverai un'email con le istruzioni") — nessuna differenza visibile che permetta di scoprire se un'email è registrata (anti-enumerazione)
3. **Given** l'email corrisponde a un Utente esistente **When** il server elabora la richiesta **Then** viene inviata (via `lib/email/invia-email.ts`, stessa infrastruttura SMTP applicativa già esistente — non le impostazioni email native di Supabase) un'email con un link verso una nuova pagina pubblica `/reimposta-password` contenente un token di recupero valido
4. **Given** l'Utente apre il link ricevuto via email **When** raggiunge `/reimposta-password` **Then** vede un form per impostare la nuova password (stessi vincoli già validati in `/modifica-password`: almeno 8 caratteri non-solo-spazi, massimo 72 caratteri, campo di conferma che deve coincidere)
5. **Given** l'Utente invia la nuova password da `/reimposta-password` con un token valido e non scaduto **When** il server elabora la richiesta **Then** la password dell'account viene aggiornata e l'Utente può accedere da `/accedi` con la nuova password
6. **Given** il token nel link è scaduto, già usato, o non valido **When** l'Utente invia il form su `/reimposta-password` **Then** vede un messaggio di errore chiaro (nessun crash), senza rivelare se il problema è "token scaduto" vs "token inesistente" in modo che riveli l'esistenza dell'account sottostante

**Parte B — Reset forzato dall'Admin (password fissa)**

7. **Given** un Admin sulla pagina `/admin` (elenco Utenti, Story 1.2) **When** visualizza la riga di un Utente **Then** vede un nuovo pulsante "Reimposta password"
8. **Given** l'Admin clicca "Reimposta password" per un Utente **When** conferma l'azione (dialogo di conferma, stesso pattern già usato per la cancellazione Allenatore in Story 9.9) **Then** la password di quell'Utente viene impostata al valore fisso concordato `Volley@Mogliano`, senza richiedere la password attuale
9. **And** solo un Admin può eseguire questa azione — la Server Action verifica il Ruolo internamente (`requireRuolo("ADMIN")`), non si affida solo al route guard della pagina
10. **And** nessuna regressione sul resto del comportamento esistente (login, modifica-password con sessione attiva, gestione Utenti in `/admin`) — suite Vitest esistente invariata, stesso vincolo delle altre storie di questo epic

## Tasks / Subtasks

- [x] Task 1: Validazione password condivisa (AC: #4, #5) — prerequisito per Parte A
  - [x] Estrarre la validazione già inline in `app/modifica-password/actions.ts` (righe 35-57: lunghezza minima 8 su contenuto trim, massimo 72, coincidenza conferma) in una funzione pura `validaNuovaPassword(nuovaPassword: string, confermaPassword: string): { code: string; message: string } | null` in nuovo file `lib/auth/validazione-password.ts`
  - [x] `app/modifica-password/actions.ts` aggiornato per chiamare l'helper condiviso invece della logica inline — comportamento identico, **nessuna modifica ai test esistenti** di `app/modifica-password/actions.test.ts` (stessi messaggi di errore, stessi codici)
  - [x] Nuovo test `lib/auth/validazione-password.test.ts` per l'helper estratto (stessi casi già coperti in `modifica-password/actions.test.ts`: corta, solo spazi, troppo lunga, non coincidente, valida)
- [x] Task 2: Route pubbliche (AC: #1, #4)
  - [x] `lib/auth/route-guard.ts`: aggiungere `"/recupera-password"` e `"/reimposta-password"` a `PUBLIC_ROUTES` (riga 7) — senza questo il Proxy redireziona a `/accedi` prima ancora che l'Utente possa vedere il form, anche disconnesso
- [x] Task 3: Richiesta di recupero — `/recupera-password` (AC: #1, #2, #3)
  - [x] Nuova pagina `app/(auth)/recupera-password/page.tsx` — stesso scheletro di `app/modifica-password/page.tsx` (`<main className="pagina-form"><div className="riquadro-form">`, Story 9.3), nessun controllo di Ruolo (pubblica)
  - [x] Nuovo `app/(auth)/recupera-password/RecuperaPasswordForm.tsx` (Client Component, `useActionState`) — un solo campo email, messaggio di conferma sempre uguale al successo (AC #2)
  - [x] Nuovo `app/(auth)/recupera-password/actions.ts`, Server Action `richiediRecuperoPassword`:
    - Valida email non vuota (`VALIDATION` se mancante)
    - `createAdminClient()` (già esistente, `lib/auth-admin/client.ts`) → `admin.generateLink({ type: "recovery", email })`
    - Se l'email non corrisponde a nessun account, `generateLink` restituisce un errore — **loggarlo (`console.error`) ma non rifletterlo nella risposta**: ritornare comunque il messaggio di successo generico (AC #2, anti-enumerazione)
    - Se `generateLink` ha successo, usare `properties.hashed_token` (dalla risposta) per costruire l'URL assoluto `${origine}/reimposta-password?token_hash=${hashed_token}&type=recovery` — **non usare `properties.action_link`** (punta al dominio Supabase, non gestito dai cookie di sessione di questa app)
    - `origine` derivata da `await headers()` (`next/headers`, funzione async in questa versione di Next — vedi `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/headers.md`): header `host` + `x-forwarded-proto` (default `https` se assente, coerente con l'hosting Cloudflare in produzione) — **nessuna nuova variabile d'ambiente**, nessun precedente nel progetto per un "app base URL" configurato staticamente
    - Invio dell'email via `inviaEmail()` esistente (testo semplice con il link, stesso stile delle altre email del progetto — Story 4.3/4.6) — se `inviaEmail` lancia (es. `CONFIGURAZIONE_SMTP_MANCANTE`), catturare, loggare, e ritornare comunque il messaggio di successo generico (stesso principio anti-enumerazione: non rivelare all'esterno se l'SMTP applicativo è configurato)
    - Ritorna sempre `{ successo: true }` con lo stesso messaggio, in ogni ramo (email inesistente, invio fallito, invio riuscito) — l'unica eccezione è la validazione "email obbligatoria" (nessuna chiamata esterna ancora avvenuta, sicuro da distinguere)
  - [x] Aggiungere link "Password dimenticata?" in `app/(auth)/accedi/AccediForm.tsx`, stesso stile del link "Registrati" già presente (riga 31-33)
- [x] Task 4: Reimpostazione — `/reimposta-password` (AC: #4, #5, #6)
  - [x] Nuova pagina `app/(auth)/reimposta-password/page.tsx` — legge `token_hash`/`type` da `searchParams` (Server Component, li passa come props al Client Component), stesso scheletro `pagina-form`/`riquadro-form`
  - [x] Nuovo `app/(auth)/reimposta-password/ReimpostaPasswordForm.tsx` — stessi due campi di `ModificaPasswordForm.tsx` (nuova password + conferma), riusa lo stesso pattern CSS (`.form`/`.campo`/`.errore`/`.successo`/`.bottone`, copiare `modifica-password.module.css` in un nuovo `reimposta-password.module.css` — nessun meccanismo `composes` in questa codebase, vedi commento in quel file)
  - [x] Nuovo `app/(auth)/reimposta-password/actions.ts`, Server Action `reimpostaPassword(tokenHash, type, formData)`:
    - Valida la nuova password con `validaNuovaPassword()` (Task 1) **prima** di qualunque chiamata Supabase (stesso principio I/O Matrix di `modificaPassword`)
    - `createClient()` (`lib/supabase/server.ts`, legge/scrive i cookie della richiesta corrente) → `supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })` — se fallisce (token scaduto/invalido/già consumato), ritornare un errore generico (AC #6), loggare il dettaglio reale solo lato server
    - Se `verifyOtp` ha successo, la sessione è ora stabilita (cookie scritti dall'adapter già esistente) — chiamare `supabase.auth.updateUser({ password: nuovaPassword })` (stesso identico secondo passo già presente in `modificaPassword`)
    - Su successo, redirect a `/accedi` (a differenza di `/modifica-password`, qui ha senso navigare via: il token è mono-uso e la pagina non serve più) — **oppure** messaggio di successo con link a `/accedi`, a scelta implementativa se il redirect diretto complica il test dello stato di successo; entrambe le opzioni soddisfano l'AC, preferire il redirect per coerenza con `accedi`/`registrati` (pattern "successo = navighi via")
- [x] Task 5: Reset Admin a password fissa (AC: #7, #8, #9)
  - [x] `app/(amministrazione)/admin/actions.ts`: nuova Server Action `reimpostaPasswordFissaUtente(_prevState, utenteId: string)` — stesso stile di `impostaAttivoUtente` (chiamata diretta da `onClick`/`useTransition` nel Client Component, non da un `<form>` visibile)
    - `requireRuolo("ADMIN")` come primo passo (AC #9)
    - Costante nominata nel file: `const PASSWORD_FISSA_RESET = "Volley@Mogliano";` con commento sul perché è un valore fisso concordato (club piccolo, comunicazione fuori banda dall'Admin all'Utente — nessuna email automatica di notifica, fuori perimetro esplicito di questa storia) e sul fatto che l'Utente non è forzato a cambiarla al primo accesso (nessun meccanismo "must change password" in Supabase Auth di base — se necessario, va aggiunto in una storia futura)
    - Deriva `supabaseAuthId` da `utenteId` via `prisma.utente.findUniqueOrThrow({ where: { id: utenteId }, select: { supabaseAuthId: true } })` — **mai accettato da un campo del form**, stesso principio anti-manomissione già applicato in `aggiornaRuoliUtente` (righe 190-196 di `admin/actions.ts`)
    - `createAdminClient().auth.admin.updateUserById(supabaseAuthId, { password: PASSWORD_FISSA_RESET })`
    - Nessun controllo aggiuntivo tipo "non è l'unico Admin" (a differenza di `impostaAttivoUtente`/`aggiornaRuoliUtente`): resettare la password non toglie il Ruolo Admin a nessuno
    - `revalidatePath("/admin")` non chiamato (nessun dato mostrato in tabella cambia in seguito al reset password — a differenza delle altre azioni, non c'è nulla da rinfrescare)
  - [x] `app/(amministrazione)/admin/UtenteRow.tsx`: nuovo pulsante "Reimposta password" per riga, stesso pattern `useTransition` + stato di errore locale già usato per `toggleAttivo` (righe 29-48), con `window.confirm()` prima dell'invio (stesso pattern di `AllenatoreRow.tsx`, Story 9.9, righe 89-99) — messaggio di conferma esplicito sul valore fisso che verrà impostato
- [x] Task 6: Test e regressione (AC: #10)
  - [x] `app/(auth)/recupera-password/actions.test.ts`: email mancante (VALIDATION, nessuna chiamata), email inesistente → successo generico comunque, `generateLink` ok → `inviaEmail` chiamato con il link corretto, `inviaEmail` che lancia → successo generico comunque (nessun errore propagato)
  - [x] `app/(auth)/reimposta-password/actions.test.ts`: casi di validazione password (min/conferma, via l'helper condiviso), token mancante/`verifyOtp` fallisce/lancia → errore generico, `verifyOtp` ok + `updateUser` fallisce → errore, entrambi ok → redirect a `/accedi`
  - [x] `app/(amministrazione)/admin/actions.test.ts`: nuovi casi per `reimpostaPasswordFissaUtente` — non-Admin → `FORBIDDEN` nessuna chiamata a `updateUserById`, Admin → `updateUserById` chiamato con l'id Supabase corretto e la password fissa esatta, Prisma che lancia → errore senza chiamare Supabase
  - [x] `lib/auth/route-guard.test.ts`: aggiunto caso `/recupera-password`/`/reimposta-password` raggiungibili senza sessione
  - [x] Suite Vitest completa: 592/592 passati (nessuna modifica ai test esistenti di `modifica-password/actions.test.ts`, comportamento preservato dal refactor)
  - [x] `npx tsc --noEmit` ed ESLint puliti su tutti i file nuovi/modificati (1 warning pre-esistente non correlato su `<img>` in `accedi/page.tsx`)

### Review Findings

- [x] [Review][Patch] `reimpostaPasswordFissaUtente` non ha alcuna restrizione sul Ruolo dell'Utente bersaglio: un Admin può reimpostare la password di un altro Admin (o di se stesso) al valore fisso `Volley@Mogliano` — possibile presa di controllo silenziosa di un account Admin da parte di un altro Admin [app/(amministrazione)/admin/actions.ts] — risolto con l'utente: bloccare il reset se il bersaglio ha il Ruolo ADMIN, stesso principio già usato per la disattivazione/rimozione ruolo dell'unico Admin — risolto: aggiunto controllo `eAdmin` con errore `VALIDATION` prima di qualunque chiamata Supabase, 2 nuovi test.
- [x] [Review][Patch] Il flusso di recupero self-service non controlla `Utente.attivo` dopo `verifyOtp` — un account disattivato puo' comunque completare la reimpostazione della password su `/reimposta-password`, incoerente con il controllo esplicito gia' applicato al login in `app/(auth)/accedi/actions.ts` [app/(auth)/reimposta-password/actions.ts] — risolto: stesso controllo Prisma + `signOut()` fail-closed già usato in `accedi/actions.ts`, 3 nuovi test (disattivato, Utente inesistente, controllo che lancia).
- [x] [Review][Patch] Il link email include un parametro `&type=recovery` morto: ne' `reimposta-password/page.tsx` ne' `reimposta-password/actions.ts` lo leggono mai (`type: "recovery"` e' cablato lato server) [app/(auth)/recupera-password/actions.ts:57] — risolto: parametro rimosso dal link costruito.
- [x] [Review][Patch] Canale laterale di tempo tra "email esistente" (round-trip SMTP reale via `inviaEmail`) ed "email inesistente" (nessuna chiamata SMTP) vanifica parzialmente l'obiettivo anti-enumerazione degli AC #2/#6: un attaccante che misura la latenza puo' comunque distinguere i due casi anche col messaggio identico [app/(auth)/recupera-password/actions.ts:39-63] — risolto: durata minima comune (`DURATA_MINIMA_MS`, 300ms) applicata prima del `return` finale in ogni ramo, 1 nuovo test.
- [x] [Review][Patch] Nessuna traccia di audit su `reimpostaPasswordFissaUtente`: non viene loggato quale Admin ha eseguito il reset ne' su quale Utente, un'azione che sovrascrive silenziosamente una credenziale merita accountability minima [app/(amministrazione)/admin/actions.ts] — risolto: `console.log` con email del chiamante (via `createClient().auth.getUser()`) e `utenteId` bersaglio dopo un reset riuscito.
- [x] [Review][Defer] Il link di recupero password costruito in `richiediRecuperoPassword` deriva l'origine da `headers().get("host")`/`x-forwarded-proto` senza validarli contro un valore noto — un Host non attendibile porterebbe l'email di recupero a puntare a un dominio diverso da quello reale (password-reset poisoning) [app/(auth)/recupera-password/actions.ts:54-57] — deferred: rischio accettato per ora dall'utente, l'hosting Cloudflare Pages instrada solo le richieste per il dominio configurato, riducendo il rischio pratico rispetto a un reverse proxy generico; da riconsiderare se osservato dal vivo o se cambia l'hosting.
- [x] [Review][Defer] Nessun rate limiting/protezione da abuso su `/recupera-password` (email-bombing, esaurimento quota SMTP) [app/(auth)/recupera-password/actions.ts] — deferred, pre-esistente: nessuna infrastruttura di rate limiting esiste in nessun punto del progetto (incluse `/accedi`/`/registrati`, gia' pubbliche da 9 epic), richiederebbe nuova infrastruttura (KV/Durable Object) fuori perimetro di questa storia
- [x] [Review][Defer] Il `token_hash` viaggia come query param in chiaro nell'URL (cronologia browser, log server) [app/(auth)/reimposta-password/page.tsx] — deferred, caratteristica intrinseca del pattern Supabase scelto (stesso schema del suo `action_link`), mitigata da mono-uso (`verifyOtp`) e scadenza breve; nessuna risorsa di terze parti caricata da quella pagina, quindi nessuna fuga via `Referrer-Policy` in pratica
- [x] [Review][Defer] Il dialogo `window.confirm()` del reset Admin non mostra mai il valore fisso `Volley@Mogliano` — l'Admin deve gia' conoscerlo a memoria/da documentazione (ora in README) [app/(amministrazione)/admin/UtenteRow.tsx] — deferred, miglioramento UX minore, richiederebbe una costante condivisa client/server non ancora presente

## Dev Notes

- **Perché `generateLink` + `verifyOtp` (token_hash) e non `resetPasswordForEmail()` nativo**: `resetPasswordForEmail()` invierebbe l'email tramite la configurazione SMTP **di Supabase stesso** (impostata nella dashboard del progetto Supabase), un meccanismo completamente separato dalla configurazione SMTP applicativa già esistente (`configurazione_smtp`, tabella con RLS ADMIN-only, Story 7.1/AD-12, usata da `lib/email/invia-email.ts`). Usare `admin.generateLink({ type: "recovery" })` (chiamata service-role, già un pattern esistente in questo file via `createAdminClient()`, vedi `app/(amministrazione)/admin/actions.ts` riga 59) genera il token **senza inviare alcuna email**, lasciando all'app il controllo completo dell'invio tramite l'infrastruttura SMTP già esistente — coerente con AD-12 ("il logo/parametri email sono gestiti dall'Admin, non da un servizio esterno separato") e con la preferenza già espressa nel progetto per riusare l'esistente invece di introdurre un secondo canale email parallelo.
- **`properties.hashed_token` vs `properties.action_link`**: la risposta di `generateLink` include entrambi. `action_link` punta a un endpoint ospitato dal progetto Supabase stesso (`{SUPABASE_URL}/auth/v1/verify?...`) pensato per un flusso che Supabase gestisce autonomamente — non si integra con l'adapter cookie di `lib/supabase/server.ts` usato ovunque in questo progetto. Usare invece `hashed_token` nel proprio URL (`/reimposta-password?token_hash=...`) e verificarlo lato server con `supabase.auth.verifyOtp()` (che scrive i cookie tramite lo stesso adapter già in uso) è il pattern documentato da Supabase per email di recupero personalizzate, ed è l'unico che resta coerente con il resto dell'autenticazione di questo progetto.
- **Anti-enumerazione (AC #2, #6)**: decisione deliberata di questa storia, non presente altrove nel progetto (`app/(onboarding-import)/registrati/actions.ts` rivela già "email già registrata" in fase di registrazione — vedi `error.code === "user_already_exists"`). La scelta di non rivelare l'esistenza dell'account **qui** è specifica del recupero password (superficie di attacco diversa: enumerare account tramite reset password è un vettore molto più comune e a basso costo da chiudere) e non richiede di rivedere la scelta già fatta in `registrati` — le due storie restano indipendenti, nessuna incoerenza da correggere.
- **Nessuna nuova variabile d'ambiente per l'URL base dell'app**: il progetto non ha oggi alcuna convenzione simile (verificato: nessun `APP_URL`/`NEXT_PUBLIC_APP_URL`/`BASE_URL` in uso). Derivare l'origine da `await headers()` (header `host` + `x-forwarded-proto`) dentro la Server Action evita di introdurne una — **da leggere `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/headers.md` prima di scrivere questo codice** (AGENTS.md): `headers()` è **asincrona** in questa versione di Next.js (a differenza di versioni precedenti al training), va sempre `await headers()`.
- **`app/(auth)/` è il posto giusto** per entrambe le nuove pagine di Parte A: `ARCHITECTURE-SPINE.md` (Structural Seed) documenta esplicitamente `app/(auth)/` come "solo login/sessione/logout - meccanica di autenticazione, non registrazione di dominio" — coerente con dove vive già `/accedi`.
- **Riuso della validazione password (Task 1)**: `app/modifica-password/actions.ts` (righe 35-57) ha già in linea esattamente i controlli che servono anche per `/reimposta-password` (min 8 su contenuto trim per evitare password di soli spazi, max 72 byte per il troncamento silenzioso di bcrypt — entrambi scoperti in code review della Story 9.4, non reinventare). Estrarli in `lib/auth/validazione-password.ts` evita una terza copia futura e mantiene un solo posto dove questi due vincoli (min/max) sono documentati. **Il refactor di `modifica-password/actions.ts` deve preservare esattamente lo stesso comportamento** — i test esistenti in `app/modifica-password/actions.test.ts` non vanno modificati, solo continuare a passare.
- **Reset Admin (Parte B) — nessuna relazione con Parte A**: sono due funzionalità indipendenti che risolvono lo stesso problema per due pubblici diversi (Utente da solo vs Admin che sblocca qualcuno). Nessun codice condiviso necessario tra le due, a parte l'uso comune di `createAdminClient()` (già esistente, riusato invariato).
- **Password fissa `Volley@Mogliano`**: valore concordato esplicitamente con l'utente durante la creazione di questa storia (non una scelta implementativa) — va scritta esattamente così (rispettando maiuscole/minuscole/simbolo `@`), come costante nominata nel codice (mai un valore letterale ripetuto), con un commento che ne spiega la natura fissa/nota (non generata casualmente) e l'assenza di un flusso "cambio password obbligatorio al primo accesso" (limite noto, non richiesto).
- **File NON da toccare**: `app/(auth)/accedi/actions.ts` (login, invariato — solo `AccediForm.tsx` guadagna un link), `lib/email/invia-email.ts` (riusato invariato, nessuna nuova opzione necessaria: un'email con link è comunque solo `testo` con una stringa URL dentro), `middleware.ts` (nessuna modifica: il redirect per rotta pubblica è già gestito da `getRouteDecision`/`PUBLIC_ROUTES`, basta il Task 2).

### Project Structure Notes

- File nuovi: `app/(auth)/recupera-password/{page.tsx, RecuperaPasswordForm.tsx, actions.ts, actions.test.ts, recupera-password.module.css}`, `app/(auth)/reimposta-password/{page.tsx, ReimpostaPasswordForm.tsx, actions.ts, actions.test.ts, reimposta-password.module.css}`, `lib/auth/validazione-password.ts` (+ `.test.ts`).
- File modificati: `lib/auth/route-guard.ts` (2 nuove `PUBLIC_ROUTES`), `app/modifica-password/actions.ts` (usa l'helper condiviso), `app/(auth)/accedi/AccediForm.tsx` (link "Password dimenticata?"), `app/(amministrazione)/admin/actions.ts` (nuova azione `reimpostaPasswordFissaUtente`), `app/(amministrazione)/admin/UtenteRow.tsx` (nuovo pulsante), `app/(amministrazione)/admin/actions.test.ts` (nuovi casi).
- Nessuna migrazione Prisma: nessun nuovo campo/tabella, il token di recupero è gestito interamente da Supabase Auth (non persistito nel nostro schema).
- Nessuna nuova dipendenza npm: `generateLink`/`verifyOtp`/`updateUserById` sono già parte di `@supabase/supabase-js` (client service-role/anon già usati altrove).

### References

- [Source: _bmad-output/implementation-artifacts/epic-9-context.md#Story 9.11 — nota su generateLink/verifyOtp vs resetPasswordForEmail, da chiarire in sviluppo (chiarito in questa storia)]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-12 — configurazione email applicativa via DB, non variabili d'ambiente]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#Structural Seed — app/(auth)/ solo meccanica di autenticazione]
- [Source: app/modifica-password/actions.ts — validazione password da estrarre (righe 35-57), pattern updateUser già stabilito]
- [Source: lib/email/invia-email.ts — servizio email applicativo esistente, da riusare invariato]
- [Source: lib/auth-admin/client.ts — createAdminClient(), già usato per admin.createUser in app/(amministrazione)/admin/actions.ts]
- [Source: app/(amministrazione)/admin/actions.ts — pattern requireRuolo/derivazione supabaseAuthId da utenteId lato server, da riusare per Parte B]
- [Source: app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx righe 89-99 — pattern window.confirm() per azione sensibile per riga, Story 9.9]
- [Source: lib/auth/route-guard.ts — PUBLIC_ROUTES/PROTECTED_ROUTES, unica fonte di verità per l'autorizzazione delle rotte]
- [Source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/headers.md — headers() asincrona in questa versione, come richiesto da AGENTS.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

### Completion Notes List

- Task 1: validazione password estratta in `lib/auth/validazione-password.ts` (`validaNuovaPassword`), riusata sia da `modifica-password/actions.ts` sia dal nuovo `reimposta-password/actions.ts` — comportamento identico, i test esistenti di `modifica-password/actions.test.ts` non sono stati toccati e continuano a passare invariati.
- Task 2: `/recupera-password` e `/reimposta-password` aggiunte a `PUBLIC_ROUTES` (`lib/auth/route-guard.ts`).
- Task 3: `richiediRecuperoPassword` (nuovo `app/(auth)/recupera-password/actions.ts`) usa `createAdminClient().auth.admin.generateLink({ type: "recovery", email })` per generare il token senza inviare alcuna email nativa Supabase, poi invia il link via `inviaEmail()` (SMTP applicativo esistente). L'origine del link è derivata da `await headers()` (header `host`/`x-forwarded-proto`, nessuna nuova variabile d'ambiente). Messaggio di successo sempre identico (anti-enumerazione), verificato con test sia per email inesistente sia per fallimento di `inviaEmail`.
- Task 4: `reimpostaPassword` (nuovo `app/(auth)/reimposta-password/actions.ts`) usa `supabase.auth.verifyOtp({ token_hash, type: "recovery" })` per stabilire la sessione dal token ricevuto via email, poi riusa lo stesso `updateUser({ password })` già presente in `modificaPassword`. Su successo, redirect a `/accedi`. Token mancante/scaduto/invalido → stesso messaggio generico `TOKEN_NON_VALIDO`, dettaglio reale solo nei log server.
- Task 5: `reimpostaPasswordFissaUtente` (nuova Server Action in `app/(amministrazione)/admin/actions.ts`), protetta da `requireRuolo("ADMIN")`, deriva `supabaseAuthId` da `utenteId` via Prisma (mai da un campo form) e chiama `admin.updateUserById(supabaseAuthId, { password: "Volley@Mogliano" })`. Nuovo pulsante "Reimposta password" per riga in `UtenteRow.tsx` con conferma `window.confirm()` (stesso pattern di `AllenatoreRow.tsx`, Story 9.9).
- Task 6: suite Vitest completa 585/585 passati, `npx tsc --noEmit` pulito, ESLint pulito (1 warning pre-esistente non correlato su `<img>` in `accedi/page.tsx`).
- Nessun test di rendering introdotto per i nuovi Client Component (`RecuperaPasswordForm.tsx`, `ReimpostaPasswordForm.tsx`), coerente con la convenzione già stabilita nel progetto (nessun file `*.test.tsx` esiste in tutto il repo).
- Code review (2026-07-28): Acceptance Auditor 0 violazioni sui 10 AC. 2 decision-needed risolte con l'utente (reset Admin bloccato su bersagli Admin; rischio Host/proto non validati accettato per ora). 4 patch applicati (vedi Review Findings), 3 defer, 7 scartati come falsi positivi/rumore/già accettati in spec. Regressione completa dopo i fix: 592/592 test, `tsc --noEmit` pulito, ESLint pulito.

### File List

- `lib/auth/validazione-password.ts` (nuovo)
- `lib/auth/validazione-password.test.ts` (nuovo)
- `app/modifica-password/actions.ts` (modificato — usa `validaNuovaPassword` condivisa)
- `lib/auth/route-guard.ts` (modificato — `/recupera-password` e `/reimposta-password` aggiunte a `PUBLIC_ROUTES`)
- `lib/auth/route-guard.test.ts` (modificato — nuovo test per le due route pubbliche)
- `app/(auth)/recupera-password/page.tsx` (nuovo)
- `app/(auth)/recupera-password/RecuperaPasswordForm.tsx` (nuovo)
- `app/(auth)/recupera-password/actions.ts` (nuovo)
- `app/(auth)/recupera-password/actions.test.ts` (nuovo)
- `app/(auth)/recupera-password/recupera-password.module.css` (nuovo)
- `app/(auth)/reimposta-password/page.tsx` (nuovo)
- `app/(auth)/reimposta-password/ReimpostaPasswordForm.tsx` (nuovo)
- `app/(auth)/reimposta-password/actions.ts` (nuovo)
- `app/(auth)/reimposta-password/actions.test.ts` (nuovo)
- `app/(auth)/reimposta-password/reimposta-password.module.css` (nuovo)
- `app/(auth)/accedi/AccediForm.tsx` (modificato — link "Password dimenticata?")
- `app/(amministrazione)/admin/actions.ts` (modificato — nuova Server Action `reimpostaPasswordFissaUtente`)
- `app/(amministrazione)/admin/actions.test.ts` (modificato — nuovi test per `reimpostaPasswordFissaUtente`)
- `app/(amministrazione)/admin/UtenteRow.tsx` (modificato — nuovo pulsante "Reimposta password")
- `app/(amministrazione)/admin/page.tsx` (modificato — nuova colonna di intestazione)
- `app/(amministrazione)/admin/actions.ts` (modificato di nuovo in code review — blocco reset su bersaglio Admin, audit log)
- `app/(auth)/reimposta-password/actions.ts` (modificato in code review — controllo `attivo`)
- `app/(auth)/reimposta-password/actions.test.ts` (modificato in code review — nuovi test per il controllo `attivo`)
- `app/(auth)/recupera-password/actions.ts` (modificato in code review — durata minima comune, parametro morto rimosso)
- `app/(auth)/recupera-password/actions.test.ts` (modificato in code review — nuovo test sulla durata minima)

## Change Log

- 2026-07-28: Implementata Story 9.11 — recupero password self-service via email (`/recupera-password` + `/reimposta-password`, `generateLink`/`verifyOtp` su infrastruttura SMTP applicativa esistente) e reset Admin a password fissa (`Volley@Mogliano`, nuovo pulsante per riga in `/admin`). Validazione password estratta in helper condiviso `lib/auth/validazione-password.ts`. 585/585 test passati, 0 errori tsc/eslint.
- 2026-07-28: Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) completata — Acceptance Auditor: 0 violazioni sui 10 AC. 2 decision-needed risolte con l'utente (reset Admin fisso: bloccato su bersagli Admin per prevenire la presa di controllo; Host/proto non validati nel link email: rischio accettato per ora, hosting Cloudflare Pages). 4 patch applicati (blocco reset su Admin + audit log, controllo `Utente.attivo` mancante nel reset self-service, parametro `&type=recovery` morto rimosso, canale laterale di tempo anti-enumerazione mitigato con una durata minima comune). 3 defer (Host/proto non validati, nessun rate limiting su `/recupera-password` — pre-esistente in tutto il progetto, `window.confirm()` non mostra il valore fisso). 7 scartati come falsi positivi/rumore/già accettati in spec. 592/592 test passati, 0 errori tsc/eslint dopo i fix.
