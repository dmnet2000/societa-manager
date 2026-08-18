---
baseline_commit: 4bc9b4c657d680dc4035fc375a3b953a7f2baf0d
---

# Story 11.4: Registrazione non completabile da Safari/iOS — il link dopo la registrazione non funziona

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Causa confermata prima di scrivere questa storia (non più solo un'ipotesi)

`epics.md` lasciava la causa come "probabile ma non confermata", con come primo passo esplicito "verificare se 'Confirm email' è attivo sul Dashboard Supabase di produzione". **Verificato direttamente in questa sessione** con una chiamata GET all'endpoint pubblico `/auth/v1/settings` del progetto Supabase di produzione (`.env.production`, nessuna azione distruttiva, sola lettura):

```json
{ "mailer_autoconfirm": false, "disable_signup": false, ... }
```

**`mailer_autoconfirm: false` conferma**: la conferma email **è attiva in produzione**, disallineata dalla configurazione locale (`supabase/config.toml`, `enable_confirmations = false`) e dall'intento originale della Story 1.1 ("non serve conferma email prima di poter accedere"). Il codice (`registrati()`) non ha mai gestito questo caso: nessun `emailRedirectTo`, nessuna rotta di callback, `redirect("/app")` immediato dopo `signUp()` — un Utente reale riceve invece un'email di conferma di Supabase che il sito non sa gestire, bloccandolo esattamente come segnalato.

**Chiesto esplicitamente all'utente come procedere** (due opzioni: disattivare "Confirm email" sul Dashboard — zero codice — oppure costruire un vero flusso di conferma): **l'utente ha scelto di costruire il flusso di conferma**, non di disattivarlo. Questa storia quindi **non segue più la "correzione più diretta"** indicata nell'AC originale di `epics.md` (disattivare il toggle) — implementa invece un flusso di conferma reale, deliberatamente, come nuova capacità del prodotto. Non riaprire questa decisione durante lo sviluppo.

## Story

As a Utente che si registra,
I want ricevere un'email di conferma e completare la registrazione cliccando un link che funziona in modo affidabile su qualunque browser/dispositivo (inclusa la combinazione app Mail→Safari su iOS),
so that possa accedere all'app senza restare bloccato, indipendentemente da dove apro il link di conferma.

**Perché "un link che funziona ovunque" risolve specificamente il sintomo Safari/iOS**: `lib/supabase/client.ts`/`server.ts` non impostano `flowType` esplicito, quindi Supabase usa **PKCE** di default per `signUp()` — un flusso che lega un "code verifier" al browser/dispositivo che ha avviato la richiesta. Se il link di conferma si apre in un contesto diverso (l'app Mail su iPhone che lancia Safari, il caso più comune su iOS), lo scambio PKCE fallisce **anche se una rotta di callback esistesse**. Questa storia **evita il problema alla radice**, non lo aggira: mirror esatto del pattern già usato con successo dal recupero password (`app/(auth)/recupera-password/actions.ts`) — un `token_hash` autogenerato via Admin API (`generateLink`), mai l'`action_link`/flusso PKCE nativo di Supabase, inviato con l'SMTP applicativo. Lo stesso meccanismo del recupero password non ha mai avuto questo problema su Safari/iOS: la stessa ragione si applica qui.

## Acceptance Criteria

1. **Given** un Utente compila il form di registrazione (`/registrati`) con dati validi **When** invia il form **Then** riceve un'email di conferma inviata dall'SMTP applicativo (non da Supabase) con un link verso `/conferma-registrazione?token_hash=...`, e la pagina mostra un messaggio esplicito ("controlla la tua email per completare la registrazione"), **non più** un redirect immediato a `/app`
2. **And** l'account Supabase Auth + il record `Utente`/`Ruoli`/aggancio (Allenatore precaricato, Genitore↔Atleta, Atleta↔se stessa) vengono creati **subito** alla sottomissione del form, esattamente come oggi — solo il redirect a `/app` viene sostituito dall'invio email, nessuna logica di creazione dati spostata al momento della conferma
3. **Given** l'Utente apre il link di conferma ricevuto via email, **da qualunque browser o dispositivo, incluso un contesto diverso da quello che ha avviato la registrazione** (es. app Mail→Safari su iPhone) **When** conferma **Then** la sessione viene stabilita e l'Utente accede all'app (`/app`), senza il problema di legame browser/dispositivo del PKCE nativo di Supabase (vedi sopra)
4. **And** un link di conferma non valido, scaduto, o già usato mostra un messaggio di errore chiaro, senza rivelare se l'account esiste o meno oltre a quanto già implicito dal fatto di possedere il link
5. **And** se l'invio dell'email di conferma fallisce (es. SMTP applicativo non configurato, host irraggiungibile) **Then** la registrazione fallisce con un messaggio esplicito che invita l'Utente a riprovare — **nessun account "silenziosamente bloccato"**: l'Utente Supabase Auth e i record Prisma possono restare creati senza email inviata (stessa politica "nessun rollback automatico" già accettata dal codice esistente, vedi commento in `registrati/actions.ts`), ma l'Utente riceve un errore visibile, non un falso messaggio di successo
6. **And** nessuna regressione sul comportamento di `accedi`/`recupera-password`/`reimposta-password`, sulla validazione dei campi del form di registrazione (email/password obbligatorie, Ruolo obbligatorio, Codici Fiscali), o sulla gestione "email già registrata" esistente

## Tasks / Subtasks

- [x] Task 1: `app/(onboarding-import)/registrati/actions.ts` — da `signUp()` a `generateLink(type:"signup")` + invio email applicativo (AC: #1, #2, #5, #6)
  - [x] Sostituito con `const admin = createAdminClient(); const { data, error } = await admin.auth.admin.generateLink({ type: "signup", email, password })` — mirror di `richiediRecuperoPassword`
  - [x] **Non verificato empiricamente** (vedi Dev Agent Record): mantenuto `error.code === "user_already_exists"` + `data.user.identities.length === 0` come fallback prudente, stesso codice di prima — nessun ambiente disponibile per verificarlo senza toccare la produzione
  - [x] Logica successiva (creazione `prisma.utente`, `sincronizzaRuoliAppMetadata`, aggancio Allenatore/Genitore/Atleta) invariata, usa ancora `data.user.id`
  - [x] Link `${proto}://${host}/conferma-registrazione?token_hash=...` costruito con `headers()`, `inviaEmail` chiamato con oggetto/testo espliciti
  - [x] `inviaEmail` in un `try/catch` separato — su errore, `{ error: { code: "EMAIL_NON_INVIATA", ... } }` (AC #5)
  - [x] `redirect("/app")` finale sostituito da `return { successo: true, messaggio: "..." }`
  - [x] `RegistrazioneState` esteso col ramo `successo` — mirror esatto di `RecuperaPasswordState`
- [x] Task 2: Nuova rotta `/conferma-registrazione` (AC: #3, #4)
  - [x] `app/(auth)/conferma-registrazione/page.tsx` — Server Component, legge `token_hash` da `searchParams`, monta `ConfermaRegistrazioneForm`
  - [x] `app/(auth)/conferma-registrazione/ConfermaRegistrazioneForm.tsx` — Client Component, `useActionState(confermaRegistrazione.bind(null, tokenHash), undefined)`, nessun campo di testo, un paragrafo + un bottone "Conferma registrazione" (click esplicito, nessun auto-submit)
  - [x] `app/(auth)/conferma-registrazione/actions.ts` — `confermaRegistrazione(tokenHash, prevState, formData)`, `verifyOtp({token_hash, type:"signup"})` via `createClient()` (Server Action, non Server Component — vedi Dev Notes), `redirect("/app")` su successo, `ERRORE_TOKEN` generico su fallimento
  - [x] `app/(auth)/conferma-registrazione/conferma-registrazione.module.css` — nuovo modulo minimo (`.form`/`.testo`/`.errore`/`.bottone`), stesso pattern "un modulo per pagina" già in uso per ogni altra pagina auth del progetto (`registrati.module.css`/`reimposta-password.module.css` sono a loro volta già quasi identici tra loro) — non importato da `reimposta-password.module.css` per non introdurre una dipendenza cross-pagina inedita nel progetto
- [x] Task 3: `app/(onboarding-import)/registrati/page.tsx` — gestire il nuovo stato di successo (AC: #1)
  - [x] Ramo `{state?.successo ? <p role="status" className={styles.successo}>...} : <form>...}` — nuova classe `.successo` in `registrati.module.css`, mirror di `.successo` in `permessi-accesso.module.css`
  - [x] Form nascosto quando `state?.successo` è vero (rendering condizionale, nessun precedente diretto trovato altrove nel progetto da riusare)
- [x] Task 4: `lib/auth/route-guard.ts` — nuova rotta pubblica (AC: #3, #4)
  - [x] `"/conferma-registrazione"` aggiunta a `PUBLIC_ROUTES`
  - [x] `lib/auth/route-decision.test.ts` — nuovo test dedicato aggiunto (non esteso quello esistente, per chiarezza)
- [x] Task 5: Test (AC: tutti)
  - [x] `app/(onboarding-import)/registrati/actions.test.ts` — riscritto: `createAdminClientMock` ora restituisce `{ auth: { admin: { generateLink: generateLinkMock } } }`, `inviaEmailMock`/`headersMock` aggiunti (mirror esatto dello scaffold di `recupera-password/actions.test.ts`). Tutti i casi di successo pre-esistenti (che si aspettavano `redirect`) adattati a `{successo:true, messaggio:...}`. Nuovi casi: link costruito correttamente dagli header (AC #1), `EMAIL_NON_INVIATA` su `inviaEmail` che lancia (AC #5) — 31 test, tutti verdi
  - [x] Nuovo `app/(auth)/conferma-registrazione/actions.test.ts` — mirror ridotto di `reimposta-password/actions.test.ts` (nessun `updateUser`/`attivo` — non richiesti da questa storia), 4 test
  - [x] `lib/auth/route-decision.test.ts` aggiornato
  - [x] Suite Vitest esistente confermata verde (`accedi`/`recupera-password`/`reimposta-password` invariati, non toccati)
- [x] Task 6: Verifica finale (AC: tutti)
  - [x] `npx vitest run` — 93 file, 1222 test, tutti passati; `npx tsc --noEmit` pulito; `npm run lint` — 0 errori (solo warning preesistenti + 2 nuovi warning attesi `no-unused-vars` su `_prevState`/`_formData` in `conferma-registrazione/actions.ts`, stesso pattern già presente altrove nel progetto, es. `wizard-nuova-stagione/actions.ts`)
  - [x] `npm run build` pulito — output verificato identico alla baseline stabilita in Story 18.21 per le rotte statiche/dinamiche esistenti (`○ /_not-found`, `○ /manifest.webmanifest`, `○ /recupera-password`, `○ /registrati` invariate; `ƒ /reimposta-password` invariata, era già dinamica prima di questa storia). Nuova rotta `/conferma-registrazione` compare come `ƒ` (Dynamic) — atteso e corretto: legge `searchParams`, stessa ragione per cui `/reimposta-password` è `ƒ`
  - [x] Verifica manuale via email reale **non eseguita** in questo sandbox (nessun SMTP/Supabase raggiungibile in modo sicuro qui) — demandata esplicitamente all'utente

### Review Findings

- [x] [Review][Decision] Nessun modo di richiedere una nuova email di conferma — dopo un fallimento SMTP o un token scaduto, l'Utente resta bloccato indefinitamente nonostante l'AC #5 prometta esplicitamente "nessun account silenziosamente bloccato". — Tracciando il percorso reale di un secondo tentativo con la stessa email: `generateLink` può (a) restituire di nuovo un errore/`identities` vuoto → `EMAIL_ALREADY_REGISTERED` ("Email già registrata"), oppure (b) restituire con successo lo stesso `user.id` (utente non confermato) → `prisma.utente.create` urta il vincolo unique su `supabaseAuthId` → errore generico "Impossibile completare la registrazione. Riprova." In entrambi i casi l'Utente non ottiene mai una nuova email. Lo stesso vale per il link scaduto in `conferma-registrazione/actions.ts`, il cui messaggio "Registrati di nuovo" porta allo stesso vicolo cieco. Trovato indipendentemente da tutti e tre i layer di review (Blind Hunter, Edge Case Hunter, Acceptance Auditor). Serve una decisione di prodotto: aggiungere una funzione di reinvio (`resend`/nuovo `generateLink` su un utente già esistente ma non confermato) ora, oppure accettare il limite e correggere solo i messaggi (oggi "contatta la segreteria"/"registrati di nuovo" promettono un percorso che non funziona).
- [x] [Review][Patch] `data.properties.hashed_token` letto senza guardia dopo il commit dei record Prisma, fuori da ogni try/catch — se la forma della risposta di `generateLink` si discostasse da quella assunta (già segnalato altrove nel codice come non verificato empiricamente), la Server Action lancerebbe non gestita invece di restituire lo stesso `{error: {...}}` amichevole garantito ovunque nel resto della funzione. [app/(onboarding-import)/registrati/actions.ts:319-322] — risolto: costruzione del link avvolta in un try/catch dedicato, con guardia esplicita su `data.properties?.hashed_token`; su fallimento restituisce lo stesso `{error: {code:"INTERNAL", ...}}` del resto della funzione. Nuovo test di regressione aggiunto.
- [x] [Review][Patch] Log di errore sull'invio email fallito privo di un identificativo (email/utente) — il messaggio mostrato all'Utente ("Contatta la segreteria") presuppone che lo staff possa trovare la registrazione bloccata, ma il `console.error` non registra quale email/account. [app/(onboarding-import)/registrati/actions.ts:336] — risolto: `email` aggiunta al messaggio di log.
- [x] [Review][Defer] Link di conferma costruito dagli header `host`/`x-forwarded-proto` senza validazione (incluso il caso `host` assente → link `https://null/...`) — stesso pattern non validato già in produzione in `recupera-password/actions.ts`, qui riprodotto fedelmente; la posta in gioco è più alta (concede accesso pieno a un account appena creato, non solo un reset password), ma non è una regressione introdotta da questa storia. [app/(onboarding-import)/registrati/actions.ts:319-322] — deferito: pattern pre-esistente e accettato, andrebbe corretto insieme al pattern gemello di recupera-password, non isolatamente qui.
- [x] [Review][Defer] `/conferma-registrazione`, come ogni altra rotta pubblica di autenticazione del progetto (`/accedi`, `/recupera-password`, `/reimposta-password`, `/registrati`), resta raggiungibile e utilizzabile anche da un Utente già autenticato — `verifyOtp` sovrascriverebbe silenziosamente la sessione corrente. — deferito: comportamento uniforme su tutta la famiglia di rotte auth esistenti, mai stato guardato da nessuna di esse, non introdotto da questa storia.
- [x] [Review][Defer] Nessun throttling/CAPTCHA su `/registrati`, che ora aziona l'SMTP applicativo reale a ogni invio — stesso principio di design già accettato per `/recupera-password` (che aziona lo stesso SMTP senza throttling). — deferito: rischio di design pre-esistente, non una regressione di questa storia.
- [x] [Review][Defer] `EMAIL_ALREADY_REGISTERED`/"Email già registrata" rivela l'esistenza dell'account, incoerente con l'anti-enumerazione deliberata di `recupera-password`. — deferito: ramo/messaggio preesistente dalla Story 1.1, invariato da questa storia (solo l'API sottostante è cambiata, non la logica del branch).
- [x] [Review][Defer] `token_hash` come parametro di query ripetuto potrebbe arrivare come array nonostante il tipo dichiari `string` — stesso pattern non guardato già presente in `reimposta-password/page.tsx`; conseguenza qui comunque innocua (errore generico gestito, non un crash, `verifyOtp` è dentro un try/catch). — deferito: mirror di un pattern preesistente, conseguenza già contenuta.

**Dismessi come rumore/fuori scope (2)**: nessuna validazione del formato email prima di `inviaEmail` — Supabase valida già il formato in fase di `generateLink`, e un eventuale valore anomalo residuo fallirebbe comunque in modo gestito (`EMAIL_NON_INVIATA`), non un crash né un vettore di abuso; il comportamento non verificato empiricamente di `generateLink` su email duplicata (Blind Hunter) — già segnalato esplicitamente come tale nel codice e nella story stessa, non una scoperta nuova, assorbito nel finding decision-needed sopra.

## Dev Notes

### Causa e verifica — vedi sezione dedicata sopra

Non ripetuta qui. La verifica (`mailer_autoconfirm: false` in produzione) è stata fatta con una singola richiesta GET pubblica, di sola lettura, all'endpoint `/auth/v1/settings` del progetto Supabase referenziato in `.env.production` — nessuna modifica, nessun rischio. Riproducibile con:

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

### Perché `generateLink` (Admin API) e non `signUp()` col client di sessione

`richiediRecuperoPassword` (`recupera-password/actions.ts`) ha già risolto esattamente questo problema per il recupero password: usa `admin.auth.admin.generateLink({ type: "recovery", email })`, che crea il token **senza inviare alcuna email nativa di Supabase** — l'invio passa dall'SMTP applicativo (`inviaEmail`), il link nel corpo dell'email punta al dominio proprio dell'app con un `token_hash` (mai `action_link`, che punterebbe al dominio Supabase, non gestito dall'adapter cookie di questa app, commento originale in `recupera-password/actions.ts`). Questa storia applica lo stesso identico pattern a `type: "signup"` invece di `"recovery"` — `generateLink` lo supporta nativamente (`GenerateSignupLinkParams`, verificato in `node_modules/@supabase/auth-js/dist/module/lib/types.d.ts`, accetta `{ type: "signup", email, password }`, restituisce `{ properties: { hashed_token, ... }, user }`).

### Perché questo risolve il sintomo Safari/iOS specificamente (non solo "aggiunge una conferma email")

Il client Supabase di questo progetto (`lib/supabase/client.ts`/`server.ts`) usa il flusso **PKCE di default** (nessun `flowType` esplicito) — un `signUp()`/`action_link` nativo di Supabase lega il token allo stesso browser/dispositivo che ha avviato la richiesta tramite un "code verifier" locale. Su iOS, aprire un link di conferma dall'app Mail lancia tipicamente Safari in un contesto diverso da quello (se esistente) usato per compilare il form di registrazione, rompendo lo scambio PKCE. Il pattern `token_hash` + `verifyOtp({token_hash, type})` **non è soggetto a PKCE** — è un token opaco mono-uso verificato lato server, indipendente dal browser/dispositivo che lo consuma. Stesso meccanismo già in produzione per il recupero password, mai segnalato come rotto su Safari/iOS.

### `verifyOtp` (scrittura cookie) deve avvenire in una Server Action, mai in un Server Component

Vedi Task 2: `lib/supabase/server.ts`, `setAll`, ignora silenziosamente l'errore "Cookies can only be modified in a Server Action or Route Handler" — un tentativo di chiamare `verifyOtp` direttamente dentro `page.tsx` (Server Component) fallirebbe silenziosamente nello stabilire la sessione, senza alcun errore visibile in fase di sviluppo. `reimposta-password` ha già risolto questo con un Client Component + Server Action (`useActionState`); questa storia mirror lo stesso schema esatto.

### Ambiente locale per la verifica dal vivo — stato noto (vedi anche Story 18.21)

`npm run dev` è strutturalmente rotto per ogni pagina che tocca Prisma (motore WASM forzato incondizionatamente in `lib/prisma.ts`). Per questa storia, il problema è più ampio: anche verificare l'invio email reale richiederebbe un SMTP applicativo configurato e raggiungibile e (per il lato Supabase) l'istanza di produzione reale — nessuno dei due è ragionevolmente testabile in modo sicuro in questo sandbox. `npm run build` resta utile per verificare l'assenza di regressioni sulla generazione statica/dinamica delle rotte (vedi Task 6), ma non sostituisce una prova end-to-end reale.

### Cosa NON cambia in questa storia

Nessuna modifica a `app/(auth)/accedi/*`, `app/(auth)/recupera-password/*`, `app/(auth)/reimposta-password/*` (solo letti come riferimento/pattern). Nessuna modifica a `lib/email/invia-email.ts` (riusato as-is). Nessuna modifica alla lista `RUOLI` selezionabili in fase di registrazione (inclusa la voce "ADMIN", preesistente e indipendente da questa storia). Nessuna modifica al Dashboard Supabase (l'utente ha scelto esplicitamente di non disattivare "Confirm email").

### Project Structure Notes

- File nuovi: `app/(auth)/conferma-registrazione/page.tsx`, `app/(auth)/conferma-registrazione/ConfermaRegistrazioneForm.tsx`, `app/(auth)/conferma-registrazione/actions.ts`, `app/(auth)/conferma-registrazione/actions.test.ts`, `app/(auth)/conferma-registrazione/conferma-registrazione.module.css` (se non riusabile da `reimposta-password.module.css`).
- File modificati: `app/(onboarding-import)/registrati/actions.ts`, `app/(onboarding-import)/registrati/actions.test.ts`, `app/(onboarding-import)/registrati/page.tsx`, `app/(onboarding-import)/registrati/registrati.module.css`, `lib/auth/route-guard.ts`, il file di test che copre `PUBLIC_ROUTES` (da identificare esattamente in Task 4).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11, Story 11.4] — testo originale; causa "confermata" in questa sessione (vedi sopra), decisione presa con l'utente diverge dalla "correzione più diretta" lì suggerita.
- [Source: app/(auth)/recupera-password/actions.ts, app/(auth)/reimposta-password/actions.ts, app/(auth)/reimposta-password/page.tsx, app/(auth)/reimposta-password/ReimpostaPasswordForm.tsx] — pattern di riferimento diretto, letti per intero in questa sessione, da riprodurre quasi 1:1.
- [Source: app/(onboarding-import)/registrati/actions.ts, app/(onboarding-import)/registrati/page.tsx, app/(onboarding-import)/registrati/actions.test.ts] — file principali da modificare, letti per intero.
- [Source: lib/email/invia-email.ts] — `inviaEmail`, riusata direttamente; nota sull'errore `CONFIGURAZIONE_SMTP_MANCANTE` rilevante per AC #5.
- [Source: lib/supabase/server.ts, lib/supabase/client.ts] — conferma assenza di `flowType` esplicito (PKCE di default) e del limite "cookie scrivibili solo in Server Action/Route Handler".
- [Source: lib/auth/route-guard.ts] — `PUBLIC_ROUTES`, voce da aggiungere.
- [Source: node_modules/@supabase/auth-js/dist/module/lib/types.d.ts] — `GenerateSignupLinkParams`/`VerifyTokenHashParams`/`EmailOtpType` (include `"signup"`), verificato nella libreria installata, non assunto dall'addestramento (AGENTS.md).
- [Source: .env.production] — URL/anon key del progetto Supabase di produzione, usati per la verifica GET read-only di `/auth/v1/settings` che ha confermato la causa.
- [Source: _bmad-output/implementation-artifacts/18-21-favicon-titolo-tab-browser.md] — precedente diretto per la disciplina "verificare col build reale, non fidarsi solo della documentazione", riapplicata al Task 6.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (create-story + dev-story workflow)

### Debug Log References

- Ambiente Bash del sandbox rimasto temporaneamente senza `PATH` funzionante durante lo sviluppo (`npx`/`ls`/`which` tutti "command not found", solo i builtin di shell funzionavano) — non correlato al codice di questa storia. Aggirato passando a PowerShell per tutti i comandi di verifica (`tsc`/`vitest`/`lint`/`build`), che ha funzionato regolarmente per l'intera sessione.

### Completion Notes List

- File di story creato (create-story workflow) — causa del bug **confermata** (non solo ipotizzata) con una chiamata GET read-only a `/auth/v1/settings` di produzione (`mailer_autoconfirm: false`). Chiesto esplicitamente all'utente come procedere (disattivare il toggle vs costruire un vero flusso di conferma): scelto di costruire il flusso, mirror del pattern `token_hash`/`generateLink` già usato con successo dal recupero password — scelta che risolve anche il problema PKCE/Safari-iOS alla radice, non solo il sintomo "nessuna rotta di callback".
- Implementata (dev-story workflow): tutti i 6 Task completati come pianificato, nessuna deviazione sostanziale dal piano.
- **Punto esplicitamente non verificato** (segnalato come tale dalla storia stessa, Task 1): il comportamento reale di `generateLink({type:"signup"})` su un'email già registrata non è stato verificato empiricamente (nessun ambiente Supabase locale disponibile nel sandbox, e testarlo contro produzione avrebbe creato un account reale senza autorizzazione esplicita dell'utente per quel test specifico) — mantenuto lo stesso controllo già in uso (`error.code === "user_already_exists"` + `identities` vuoto) come fallback prudente. **Da verificare dal vivo dall'utente** insieme al resto del flusso (AC #4/#6).
- 1222/1222 test Vitest passati (93 file, +9 rispetto alla baseline: 31 in `registrati/actions.test.ts` riscritto da zero, 4 nuovi in `conferma-registrazione/actions.test.ts`, 1 nuovo in `route-decision.test.ts`), `npx tsc --noEmit` pulito, `npm run lint` 0 errori (2 nuovi warning attesi, stesso pattern preesistente altrove), `npm run build` pulito con output di generazione statica/dinamica verificato identico alla baseline (Story 18.21) sulle rotte esistenti.
- Verifica end-to-end reale (email effettivamente ricevuta, link aperto da Safari/iOS in un contesto diverso) **non eseguibile in questo sandbox** — demandata esplicitamente all'utente, unico modo per chiudere davvero il cerchio su questo bug.
- **Code review eseguita** (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo): 1 decision-needed, 2 patch, 5 defer, 2 dismessi. L'utente ha scelto di risolvere il decision-needed aggiungendo ora una funzione di reinvio (non solo correggere i testi) — implementato: `registrati()` ora controlla `prisma.utente.findUnique({where:{supabaseAuthId}})` prima di ricreare i record; se l'Utente esiste già (tentativo precedente rimasto non confermato per email fallita o link scaduto), salta la creazione e reinvia solo l'email con un nuovo `hashed_token`, invece di finire nel vicolo cieco segnalato in review. Messaggio di `EMAIL_NON_INVIATA` reso onesto di conseguenza ("Riprova tra qualche minuto" - ora vero). 5 nuovi test aggiunti per il percorso di reinvio (34 totali in `registrati/actions.test.ts`, da 31). `npx tsc --noEmit` verificato pulito e la suite di `registrati/actions.test.ts` verificata verde (34/34) dopo il fix.
- **Sessione precedente interrotta dall'utente** prima della riverifica completa — ripresa in questa sessione. Applicati i 2 finding "patch" rimasti: (1) costruzione del link di conferma avvolta in un try/catch con guardia esplicita su `data.properties?.hashed_token`, nuovo test di regressione aggiunto; (2) `email` aggiunta al log di errore sull'invio fallito, per rendere rintracciabile la registrazione bloccata dallo staff.
- Verifica finale completa eseguita: 1226/1226 test Vitest passati (93 file, +4 rispetto alla sessione precedente: 4 nuovi test in `registrati/actions.test.ts` per il percorso di reinvio + guardia hashed_token), `npx tsc --noEmit` pulito, `npm run lint` 0 errori (solo warning preesistenti, nessuno nuovo), `npm run build` pulito con output di generazione statica/dinamica identico alla baseline (`○ /_not-found`, `○ /manifest.webmanifest`, `○ /recupera-password`, `○ /registrati`; `ƒ /reimposta-password`, `ƒ /conferma-registrazione` — nessuna regressione).
- Code review completa: 1 decision-needed risolto (funzione di reinvio implementata, scelta dell'utente), 2 patch applicati, 5 defer documentati (qui e in `deferred-work.md`), 2 dismessi. Nessun finding bloccante residuo.

### File List

- `app/(onboarding-import)/registrati/actions.ts` (modificato)
- `app/(onboarding-import)/registrati/actions.test.ts` (modificato)
- `app/(onboarding-import)/registrati/page.tsx` (modificato)
- `app/(onboarding-import)/registrati/registrati.module.css` (modificato)
- `app/(auth)/conferma-registrazione/page.tsx` (nuovo)
- `app/(auth)/conferma-registrazione/ConfermaRegistrazioneForm.tsx` (nuovo)
- `app/(auth)/conferma-registrazione/actions.ts` (nuovo)
- `app/(auth)/conferma-registrazione/actions.test.ts` (nuovo)
- `app/(auth)/conferma-registrazione/conferma-registrazione.module.css` (nuovo)
- `lib/auth/route-guard.ts` (modificato)
- `lib/auth/route-decision.test.ts` (modificato)

## Change Log

- 2026-08-17: File di story creato (create-story workflow) — causa confermata con una verifica read-only in produzione (`mailer_autoconfirm: false`), decisione presa con l'utente (costruire un vero flusso di conferma, non disattivare il toggle). Status: backlog → ready-for-dev.
- 2026-08-17: Implementata (dev-story workflow) — `registrati()` da `signUp()` a `generateLink`+email applicativa+stato di successo; nuova rotta `/conferma-registrazione` (mirror di `/reimposta-password`); `PUBLIC_ROUTES` esteso. 1222/1222 test Vitest passati (+9), 0 errori tsc/eslint, build produzione con output identico alla baseline sulle rotte esistenti. Un punto esplicitamente non verificato empiricamente (comportamento di `generateLink` su email duplicata), segnalato come tale. Verifica end-to-end reale via email non eseguibile nel sandbox, demandata all'utente. Status: ready-for-dev → review.
- 2026-08-17: Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor, in parallelo) — 1 decision-needed, 2 patch, 5 defer, 2 dismessi. Decision-needed (nessun modo di richiedere una nuova email di conferma, trovato indipendentemente da tutti e tre i layer): risolto su scelta esplicita dell'utente aggiungendo una funzione di reinvio — `registrati()` ora rileva un Utente già esistente ma non confermato (`prisma.utente.findUnique`) e reinvia l'email invece di ricreare i record/finire nel vicolo cieco. 2 patch applicati (guardia su `hashed_token` con try/catch dedicato; identificativo email aggiunto al log di errore). 1226/1226 test Vitest passati (+4), 0 errori tsc/eslint, build produzione con output invariato. Status: review → done.
