---
baseline_commit: NO_VCS
---

# Story 1.1: Registrazione e login per ruolo

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore, Atleta, Genitore, Segreteria, Dirigente o Admin,
I want potermi registrare e accedere al sistema con il mio ruolo,
so that posso usare le funzionalità dedicate al mio ruolo.

## Acceptance Criteria

1. **Given** non ho ancora un account, **when** mi registro con email, password e uno o più Ruoli dichiarati, **then** viene creato un utente Supabase Auth **e** un record `Utente` a sistema (Prisma) con quei Ruoli, collegato tramite l'id dell'utente Supabase Auth. Non serve conferma email prima di poter accedere (vedi Dev Notes).
2. **Given** un account esistente, **when** accedo con email e password corrette, **then** ottengo una sessione valida e vengo reindirizzato all'area applicativa.
3. **Given** credenziali errate, **when** tento il login, **then** ricevo un messaggio di errore chiaro (nessun crash, nessun redirect silenzioso).
4. **Given** provo a registrarmi con un'email già usata, **when** invio il form, **then** ricevo un messaggio "email già registrata" — non un falso successo (Supabase `signUp` non genera un errore esplicito per email duplicate: va rilevato controllando che `data.user.identities` sia vuoto, vedi Dev Notes).
5. **Given** sono autenticato con uno o più Ruoli, **when** visito una route riservata a un Ruolo che non ho, **then** vengo reindirizzato a una pagina "Non autorizzato" (route guard per ruolo — AD-2 di `ARCHITECTURE-SPINE.md`).
6. **Given** non sono autenticato, **when** visito una route protetta, **then** vengo reindirizzato al login.

## Tasks / Subtasks

- [x] Task 1: Scaffold iniziale del progetto (AC: tutte — nessuna storia di setup dedicata per decisione di epics.md; questa è la prima storia in assoluto)
  - [x] `create-next-app` con App Router + TypeScript (nessuno starter template dedicato — vedi `epics.md` Additional Requirements)
  - [x] Installare: `@supabase/supabase-js`, `@supabase/ssr`, `prisma`, `@prisma/client`, `@prisma/adapter-pg`
  - [x] Creare `prisma.config.ts` in root con `DATABASE_URL` (pooled, Supavisor transaction pooler, `?pgbouncer=true`) per il runtime e `DIRECT_URL` (non pooled) per CLI/migrate
  - [ ] **BLOCCATO (richiede azione utente):** Progetto Supabase creato in regione EU (Frankfurt) — vedi PRD §9 e `ARCHITECTURE-SPINE.md` Deferred (residenza dati sanitari). Non ho accesso per creare un progetto Supabase reale; per lo sviluppo locale ho predisposto `supabase/` (CLI init) che non richiede un account cloud — vedi Completion Notes. Resta bloccato solo questo (produzione); lo sviluppo locale è ora sbloccato (vedi sotto).
  - [x] "Confirm email" — la config locale generata da `supabase init` ha già `enable_confirmations = false` di default (`supabase/config.toml`); per un eventuale progetto cloud reale andrà verificato nel dashboard.
- [x] Task 2: Modello dati Utente/Ruolo — relazione molti-a-molti (AC: #1)
  - [x] `prisma/schema.prisma`: modello `Utente` (id, `supabaseAuthId` univoco → `auth.users.id`, email, `attivo Boolean @default(true)` — servirà a Story 1.2 per la disattivazione, createdAt)
  - [x] Modello `Ruolo` (enum) e tabella di giunzione `UtenteRuolo` (utenteId, ruolo) — **relazione molti-a-molti**, non un singolo campo enum
  - [x] Prima migrazione Prisma eseguita in locale (`npx prisma migrate dev --name init`) dopo l'installazione di Docker — vedi Change Log 2026-07-15.
  - [x] Nota: `Utente`/`UtenteRuolo` **non** sono tra le tabelle RLS-protette elencate in AD-4/AD-9 (CertificatoMedico, Atleta, Presenza, Iscrizione) — gestibili via Prisma con connessione diretta, non tramite client Supabase
- [x] Task 3: Sincronizzazione Ruoli su Supabase `app_metadata` (AC: #5, #6)
  - [x] Dopo aver scritto i Ruoli in `UtenteRuolo` (Prisma), specchiarli anche in `app_metadata` dell'utente Supabase Auth tramite una chiamata service-role (`supabase.auth.admin.updateUserById`) — **non** `user_metadata` (modificabile lato client, non affidabile per autorizzazione)
  - [x] Motivo: il Proxy Next.js (Task 4 — `proxy.ts`, l'ex "middleware", rinominato in Next.js 16) deve poter leggere i Ruoli senza una query Prisma a ogni richiesta — il comportamento di una connessione Prisma via `@prisma/adapter-pg` dentro il Proxy una volta deployato tramite l'adapter Cloudflare (`@opennextjs/cloudflare`) non è verificato per questo stack; leggere i Ruoli da `user.app_metadata` (già presente nel JWT validato da `getUser()`) evita il problema e riduce la latenza
  - [x] Prisma (`UtenteRuolo`) resta la fonte di verità (AD-3); `app_metadata` è una copia sincronizzata per letture edge-safe, aggiornata a ogni scrittura dei Ruoli (qui e in Story 1.2)
- [x] Task 4: Client Supabase (browser + server) e Proxy di sessione (AC: #2, #3, #5, #6)
  - [x] `lib/supabase/client.ts` — `createBrowserClient` (per componenti client)
  - [x] `lib/supabase/server.ts` — `createServerClient` che legge/scrive i cookie tramite `cookies()` di Next.js (per Server Component/Server Action/Route Handler)
  - [x] `proxy.ts` in root (**non** `middleware.ts` — rinominato in Next.js 16, funzione esportata `proxy` non più `middleware`; gira su runtime Node.js di default) — usa `createServerClient` + `supabase.auth.getUser()` (non `getSession()`, che non rivalida il JWT) per aggiornare il cookie di sessione a ogni richiesta e per leggere `user.app_metadata` ai fini del route guard; includere un `matcher` che esclude `_next/static`, `_next/image` e i file statici
- [x] Task 5: Registrazione (AC: #1, #4)
  - [x] Form di registrazione in `app/(onboarding-import)/registrati/` — **non** in `(auth)/`: la Structural Seed di `ARCHITECTURE-SPINE.md` riserva `(auth)/` a solo login/sessione/logout, e mappa esplicitamente la registrazione (FR-18) a `(onboarding-import)/`, lo stesso modulo che Story 1.4/1.5 estenderanno con la logica di matching Codice Fiscale
  - [x] Server Action: chiama `supabase.auth.signUp`; se `data.user.identities` risulta vuoto dopo la chiamata, l'email è già registrata (Supabase non lancia un errore esplicito, per non permettere l'enumerazione delle email) → mostra il messaggio di AC #4 invece di procedere
  - [x] Se il signup va a buon fine: crea il record `Utente` + `UtenteRuolo` via Prisma, poi sincronizza `app_metadata` (Task 3)
  - [x] **Non** salvare i Ruoli in `user_metadata`/`signUp({ options: { data } })` — non è RLS-safe (client-editable); i Ruoli vivono in `UtenteRuolo` (Prisma), specchiati in `app_metadata` solo lato server
- [x] Task 6: Login e route guard per ruolo (AC: #2, #3, #5, #6)
  - [x] Form di login in `app/(auth)/accedi/` (qui sì — è pura meccanica di sessione, non registrazione di dominio)
  - [x] Server Action: `supabase.auth.signInWithPassword`, messaggio di errore chiaro su credenziali errate (AC #3)
  - [x] Route guard nel Proxy (`proxy.ts`): legge i Ruoli da `user.app_metadata`, confronta con i Ruoli richiesti dalla route (mappa route→ruoli per route group), reindirizza a `/non-autorizzato` se non autorizzato (AC #5) o a `/accedi` se non autenticato (AC #6)

### Review Findings

- [x] [Review][Patch] Nessuna gestione dell'eccezione quando `prisma.utente.create` o `sincronizzaRuoliAppMetadata` falliscono dopo che `supabase.auth.signUp` è già andato a buon fine — deciso con l'utente: solo un messaggio di errore pulito (niente crash), senza rollback automatico; il dato orfano resta per una pulizia manuale futura. [app/(onboarding-import)/registrati/actions.ts:215-228]
- [x] [Review][Patch] `prisma/seed.mjs` crea un Admin reale senza alcuna guardia contro l'esecuzione su un progetto Supabase non locale — deciso con l'utente: aggiungere una guardia che rifiuta l'esecuzione se `NEXT_PUBLIC_SUPABASE_URL` non contiene `127.0.0.1`/`localhost`. [prisma/seed.mjs]
- [x] [Review][Patch] Le Server Action di login/registrazione e il Proxy non gestiscono eccezioni impreviste (es. rete/outage) dalle chiamate Supabase — un errore non "atteso" (diverso dal campo `error` gestito) causa un crash non gestito invece del messaggio di errore previsto dal pattern del file. [app/(auth)/accedi/actions.ts:26, app/(onboarding-import)/registrati/actions.ts:44, proxy.ts:34]
- [x] [Review][Patch] Valori duplicati nel campo `ruoli` inviato dal form di registrazione non vengono deduplicati prima della `create` annidata di Prisma, che urterebbe contro il vincolo `@@unique([utenteId, ruolo])` con un errore non gestito. [app/(onboarding-import)/registrati/actions.ts:189]
- [x] [Review][Patch] `app/page.tsx` e `proxy.ts` castano `user.app_metadata.ruoli` direttamente a `Ruolo[]`/`string[]` senza validazione a runtime — un valore malformato fallirebbe silenziosamente su `.includes()`/`.join()` invece di essere gestito in modo difensivo su un percorso di autorizzazione. [app/page.tsx:9, proxy.ts:36]
- [x] [Review][Patch] `sincronizzaRuoliAppMetadata` sostituisce l'intero oggetto `app_metadata` invece di unirlo a quello esistente — un rischio latente non appena un'altra funzionalità scriverà altri campi in `app_metadata` sullo stesso utente. [lib/auth-admin/sync-roles.ts:19]
- [x] [Review][Patch] Le Server Action restituiscono `{ error: string }` invece del formato mandato esplicitamente dall'architettura: `{ error: { code, message } }`, con `code: 'FORBIDDEN'` riservato ai soli rifiuti di autorizzazione (ARCHITECTURE-SPINE.md, convenzione "Data & formati"). Riguarda entrambe le Server Action, le rispettive pagine e i test. [app/(auth)/accedi/actions.ts:13, app/(onboarding-import)/registrati/actions.ts:18]
- [x] [Review][Defer] `Utente.attivo` non viene mai controllato al login, un utente disattivato può comunque autenticarsi — deferred, pre-existing (il campo è esplicitamente predisposto per la disattivazione in Story 1.2, non in questa storia). [app/(auth)/accedi/actions.ts, prisma/schema.prisma]
- [x] [Review][Defer] Nessuna validazione centralizzata delle variabili d'ambiente richieste — asserzioni non-null sparse (`process.env.X!`) in più file, un valore mancante emerge come errore criptico a runtime invece che al boot. — deferred, pre-existing (cross-cutting, non blocca nessun AC di questa storia). [lib/prisma.ts, lib/supabase/client.ts, lib/supabase/server.ts, lib/auth-admin/client.ts, proxy.ts]
- [x] [Review][Defer] Il matcher del Proxy esclude solo `_next/static`, `_next/image` e `favicon.ico`: altri eventuali asset in `/public` verrebbero comunque fatti passare dal redirect di autenticazione. — deferred, pre-existing (nessun asset del genere esiste ancora in questo diff, impatto attuale nullo). [proxy.ts:52]
- [x] [Review][Defer] Finestra di autorizzazione stantia: se i Ruoli di un utente vengono revocati, il JWT già emesso mantiene i vecchi Ruoli fino al refresh/scadenza (`jwt_expiry` = 1h). — deferred, pre-existing (trade-off intrinseco della scelta architetturale AD-11 di leggere i Ruoli dal JWT invece che da una query Prisma ad ogni richiesta). [proxy.ts]
- [x] [Review][Defer] Nessuna funzionalità di logout in nessuna pagina di questo diff. — deferred, pre-existing (fuori scope per gli AC di questa storia, che coprono solo login/registrazione/route guard). [app/page.tsx]

## Dev Notes

- **Paradigma (AD-1):** applicazione unica, monolite Next.js — tutta la logica di questa storia (Server Action incluse) resta nello stesso repo, nessun servizio backend separato.
- **AD-2 (confini moduli):** la meccanica di sessione (login/logout) vive in `app/(auth)/`; la registrazione (FR-18) vive in `app/(onboarding-import)/` insieme a import/precaricamento/aggancio (Story 1.3-1.5) — **non mescolare le due cose**, è una distinzione esplicita dell'architettura, non stilistica. Il modello `Utente`/`Ruolo` non appartiene a nessun modulo-feature: è infrastruttura condivisa. La gestione utenti più avanzata (creazione/disattivazione/riassegnazione ruoli da parte dell'Admin) è **Story 1.2**, non questa.
- **AD-9 (split dati RLS):** `Utente`/`UtenteRuolo` non sono nella lista delle tabelle RLS-protette (CertificatoMedico, Atleta, Presenza, Iscrizione) — gestibili via Prisma con connessione diretta. Questo cambia per le storie successive che toccano quelle 4 tabelle: lì servirà il client Supabase (`supabase-js`) autenticato lato utente, non Prisma diretto.
- **Privacy/regione (PRD §9):** il progetto Supabase va creato in regione EU (Frankfurt) fin dall'inizio — non è cambiabile facilmente dopo la creazione del progetto.
- **Breaking change Next.js 16:** `middleware.ts` è deprecato, rinominato `proxy.ts` (funzione esportata `proxy`, non `middleware`); di default gira su runtime Node.js, non più edge. Verificato leggendo `node_modules/next/dist/docs/` della versione installata (16.2.10) — il pacchetto stesso avverte che le API possono differire dal training data.
- **Autenticazione — pattern corrente (ricerca web luglio 2026):** `@supabase/auth-helpers-nextjs` è deprecato; usare **solo** `@supabase/ssr` (ultima versione ~0.12.0) per l'integrazione SSR con App Router. Due client factory distinte (browser/server) sono lo standard, non un client unico condiviso.
- **Prisma 7 — obbligatorio un driver adapter:** `new PrismaClient()` senza adapter lancia un errore. Serve `@prisma/adapter-pg` (~7.8.0, stesso major di `prisma`/`@prisma/client`) passato come `new PrismaPg({ connectionString })`. La configurazione (`schema`, `datasource` per il CLI) vive in `prisma.config.ts`, non più solo in `schema.prisma`.
- **Due connection string necessarie:** `DATABASE_URL` (Supavisor transaction pooler, `?pgbouncer=true`, usata a runtime da `PrismaClient`) e `DIRECT_URL` (connessione diretta non pooled, usata da `prisma migrate` in `prisma.config.ts`) — PgBouncer in transaction mode non supporta i prepared statement che Migrate richiede.
- **Ruoli al signup — molti-a-molti, non un singolo campo:** l'ERD dell'architettura prevede esplicitamente che un Utente possa avere più Ruoli. Modellare come tabella di giunzione, non enum singolo.
- **Perché i Ruoli vanno anche in `app_metadata`:** il Proxy Next.js è il punto più naturale per il route guard, ma una query Prisma ad ogni richiesta nel Proxy, una volta deployato tramite l'adapter Cloudflare, non è un pattern verificato/sicuro in questo stack. Specchiare i Ruoli in `app_metadata` (scrivibile solo server-side via service role) evita il problema: il Proxy legge i Ruoli già presenti nel JWT restituito da `getUser()`, senza toccare il database. Prisma resta comunque la fonte di verità per i Ruoli (AD-3) — `app_metadata` è solo una cache sincronizzata.
- **Prisma 7 — ulteriore breaking change scoperto in fase di implementazione:** la proprietà `url` nel blocco `datasource` di `schema.prisma` **non è più supportata** (errore P1012 "no longer supported in schema files"). La connessione per Migrate va in `prisma.config.ts` (`DIRECT_URL`), quella a runtime passa solo dall'adapter (`lib/prisma.ts`, `DATABASE_URL`). Il blocco `datasource` nello schema resta solo con `provider`.
- **`prisma.config.ts` non carica `.env` automaticamente:** serve `import "dotenv/config"` esplicito in cima al file, altrimenti `env("DIRECT_URL")` fallisce con `PrismaConfigEnvError`.
- **Rilevare l'email duplicata:** `supabase.auth.signUp` con un'email già esistente non restituisce un errore esplicito (per non permettere l'enumerazione delle email) — restituisce un utente con `identities: []`. Controllare questo campo per mostrare il messaggio corretto (AC #4).

### Project Structure Notes

- Prima storia del progetto: nessun file preesistente da leggere/modificare (repository vuoto, nessun commit). Questa storia stabilisce la struttura base (`app/(auth)/`, `app/(onboarding-import)/`, `lib/supabase/`, `prisma/schema.prisma`, `proxy.ts`) che le storie successive estenderanno — in particolare Story 1.4 e 1.5 aggiungeranno altre route sotto `app/(onboarding-import)/`.
- Nominare i modelli Prisma in italiano, PascalCase singolare, coerente con la convenzione dell'architettura (Atleta, Gruppo, CertificatoMedico, ecc.): `Utente`, `Ruolo`, `UtenteRuolo`.
- Nessuno standard di testing è specificato in `ARCHITECTURE-SPINE.md` (silenzio esplicito, accettabile per un progetto hobby/solo-dev) — concordato con l'utente **Vitest** come framework, adottato in questa storia (`vitest.config.ts`) e da riusare nelle successive.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1: Accesso, Popolamento e Iscrizioni / Story 1.1]
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-18, FR-26, §8 NFR Trasversali (Sicurezza/Autenticazione), §9 (privacy/residenza dati)]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-1, AD-2, AD-3, AD-4, AD-9, Stack, Structural Seed (Utente molti-a-molti Ruolo, mappa app/(auth)/ vs app/(onboarding-import)/)]
- Ricerca web (luglio 2026): documentazione Supabase Auth SSR per Next.js App Router; changelog Prisma 7 (driver adapters, prisma.config.ts); gestione dati custom utente Supabase (`app_metadata` vs `user_metadata`); comportamento `signUp` su email duplicate.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Scaffold Next.js 16 generato via `create-next-app` in una cartella temporanea (`scaffold-tmp/`, per evitare che il CLI rifiutasse una directory non vuota per la presenza di `_bmad/`/`_bmad-output/`), poi i file spostati nella root e `scaffold-tmp/` rimossa. `.gitignore` unito con quello generato da Next.js.
- Scoperta durante l'analisi dei doc Next.js 16 installati (`node_modules/next/dist/docs/`, letti perché il pacchetto stesso avverte "this is NOT the Next.js you know"): `middleware.ts` è stato rinominato `proxy.ts` in Next 16 (funzione `proxy`, non `middleware`; runtime Node.js di default, non edge). Corretto in Task/Dev Notes prima di scrivere codice.
- Scoperta durante `npx prisma generate`: Prisma 7 non supporta più `url` nel blocco `datasource` di `schema.prisma` (errore P1012) — rimosso, la connessione runtime passa solo dall'adapter.
- Scoperta durante `npx prisma generate`: `prisma.config.ts` non carica `.env` automaticamente — aggiunto `import "dotenv/config"`.
- Docker non disponibile in questo ambiente sandbox: `supabase start`, la prima migrazione Prisma (`prisma migrate dev`) e il seed (`prisma db seed`) non sono stati eseguiti qui — vedi Completion Notes per i comandi da lanciare in locale.
- Verifiche eseguite ed effettivamente passate in questo ambiente: `npx vitest run` (12/12 test), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun errore), `npm run build` (build di produzione completata, tutte le route generate correttamente incluso il Proxy).
- **2026-07-15, dopo installazione Docker:** `supabase start` inizialmente fallito — il container `analytics` (Vector/Logflare) risulta `unhealthy` su Windows perché richiede il demone Docker esposto su `tcp://localhost:2375` (non il default di Docker Desktop). Risolto disabilitando `analytics` in `supabase/config.toml` (`enabled = false`) — non necessario per lo sviluppo locale, nessun impatto sulle altre funzionalità.
- **2026-07-15, verifica end-to-end reale (Playwright contro backend Supabase locale vero):** confermati AC #1, #2, #3, #5, #6. **AC #4 fallito alla prima verifica**: per email duplicata questa versione locale di GoTrue restituisce un errore esplicito (`error.code === "user_already_exists"`, HTTP 422) anziché il comportamento "silenzioso" (`identities: []`) assunto nelle Dev Notes originali — il branch `if (error)` intercettava il caso prima del controllo `identities`, mostrando il messaggio generico invece di "Email già registrata". Corretto in `app/(onboarding-import)/registrati/actions.ts` gestendo esplicitamente `error.code === "user_already_exists"`; il controllo `identities` vuoto resta come fallback per ambienti/versioni dove si applica il comportamento silenzioso. Aggiunto test dedicato in `actions.test.ts`. Riverificato con Playwright contro il backend reale: ora mostra correttamente "Email già registrata."

### Completion Notes List

- Implementate Task 1-6: scaffold, schema dati Utente/Ruolo/UtenteRuolo (molti-a-molti), sync `app_metadata`, client Supabase (browser/server), Proxy con route guard, pagine e Server Action di registrazione e login.
- 12 test automatici scritti e passati (Vitest): `lib/auth/route-guard.test.ts` (6), `app/(onboarding-import)/registrati/actions.test.ts` (3), `app/(auth)/accedi/actions.test.ts` (3) — mockano Supabase/Prisma, non richiedono rete/DB reali.
- **Sbloccato il 2026-07-15** dopo installazione Docker da parte dell'utente: `supabase start` (con `analytics` disabilitato, vedi Debug Log), `npx prisma migrate dev --name init`, `npx prisma db seed` (Admin `admin@societa-manager.local` / `password` creato realmente).
- **Verifica end-to-end reale eseguita** (Playwright contro il backend Supabase locale vero, non mockato): registrazione nuovo utente con ruolo (confermato anche via query diretta al DB: `Utente`+`UtenteRuolo` scritti correttamente) → login con quelle credenziali → sessione valida e redirect (AC #1, #2). Login con credenziali errate → "Credenziali non valide. Riprova.", nessun crash (AC #3). Login Admin seed → accesso a `/admin` riuscito (AC #5, route guard per ruolo). Route protette non autenticate → redirect a `/accedi` (AC #6, già verificato in precedenza). AC #4 (email duplicata) inizialmente fallito e poi corretto — vedi Debug Log Reference sopra.
- `.env` locale ora contiene le chiavi reali della istanza Supabase locale (non più placeholder) — valide solo per l'ambiente Docker locale di sviluppo, va sovrascritto con i valori del progetto cloud reale prima di un deploy in produzione.

### File List

**Creati:**
- `app/(auth)/accedi/actions.ts`
- `app/(auth)/accedi/page.tsx`
- `app/(auth)/accedi/actions.test.ts`
- `app/(onboarding-import)/registrati/actions.ts`
- `app/(onboarding-import)/registrati/page.tsx`
- `app/(onboarding-import)/registrati/actions.test.ts`
- `app/(amministrazione)/admin/page.tsx`
- `app/non-autorizzato/page.tsx`
- `lib/prisma.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/auth/route-guard.ts`
- `lib/auth/route-guard.test.ts`
- `lib/auth-admin/client.ts`
- `lib/auth-admin/sync-roles.ts`
- `prisma/schema.prisma`
- `prisma/seed.mjs`
- `prisma.config.ts`
- `proxy.ts`
- `vitest.config.ts`
- `.env.example`
- `supabase/config.toml` (via `supabase init`)
- `supabase/.gitignore`
- `lib/ruoli.ts` (validazione condivisa dei Ruolo — code review 2026-07-15)
- `lib/ruoli.test.ts`
- `lib/auth-admin/sync-roles.test.ts`

**Modificati:**
- `app/page.tsx` (sostituito il template di default con l'area applicativa protetta; poi, in code review, uso di `parseRuoli`)
- `package.json` (dipendenze + script `test`; poi aggiunta dipendenza `server-only`, mancante nonostante fosse già importata — bug preesistente scoperto in code review)
- `.gitignore` (unito con quello generato da Next.js)
- `proxy.ts` (code review: try/catch fail-closed su `getUser()`, uso di `parseRuoli`)
- `app/(auth)/accedi/actions.ts` (code review: forma errore `{ code, message }`, try/catch su `signInWithPassword`)
- `app/(auth)/accedi/page.tsx` (code review: `state.error.message`)
- `app/(auth)/accedi/actions.test.ts` (code review: nuova forma errore, nuovo test per eccezione di rete)
- `app/(onboarding-import)/registrati/actions.ts` (code review: forma errore `{ code, message }`, try/catch su `signUp` e sul blocco Prisma+sync post-signup senza rollback automatico, dedup Ruoli)
- `app/(onboarding-import)/registrati/page.tsx` (code review: `state.error.message`)
- `app/(onboarding-import)/registrati/actions.test.ts` (code review: nuova forma errore, nuovi test per eccezione di rete/dedup Ruoli/fallimento sync post-signup)
- `lib/auth-admin/sync-roles.ts` (code review: legge e unisce `app_metadata` esistente invece di sostituirlo)
- `prisma/seed.mjs` (code review: guardia contro l'esecuzione su un'istanza Supabase non locale)

**Rimossi:**
- `app/page.module.css` (CSS del template di default, non più referenziato)

## Change Log

- 2026-07-16: Implementazione iniziale Story 1.1 (Task 1-6). Due sotto-task bloccati da vincoli ambientali (nessun Docker/progetto Supabase reale) — vedi Completion Notes.
- 2026-07-15: Docker installato dall'utente. Sbloccati i due sotto-task pendenti (`supabase start` locale, prima migrazione Prisma + seed). Verifica end-to-end reale con Playwright: trovato e corretto un bug reale sull'AC #4 (gestione email duplicata — GoTrue locale restituisce un errore esplicito, non il comportamento silenzioso assunto in origine). Tutti gli AC ora verificati contro un backend reale.
- 2026-07-15: Code review (bmad-code-review, 3 layer paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor). 9 segnalazioni scartate perché contraddette da FR-18/AC #4/architettura/config Supabase già letti dai reviewer senza quel contesto; 5 rimandate (vedi `deferred-work.md`); 2 decisioni (nessun rollback automatico sull'orfano post-signup, guardia locale su `prisma/seed.mjs`) risolte con l'utente; 7 patch applicate: forma errore Server Action conforme a `{ error: { code, message } }` (ARCHITECTURE-SPINE.md), try/catch fail-closed su Supabase (login/registrazione/Proxy), dedup Ruoli in registrazione, validazione runtime di `app_metadata.ruoli` (nuovo `lib/ruoli.ts`), merge invece di sostituzione di `app_metadata` in `sincronizzaRuoliAppMetadata`. Scoperto e corretto un bug preesistente non coperto da test: la dipendenza `server-only` era importata ma mai installata. 23/23 test, typecheck, lint e build tutti verdi; riverificato l'intero flusso con Playwright contro il backend reale. Story portata a `done`.
