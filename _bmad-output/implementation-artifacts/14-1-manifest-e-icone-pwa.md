---
baseline_commit: a5c6aa40a7adc970c245dd1536d7b96a35af0abe
---

# Story 14.1: Web App Manifest e icone (installabilità base)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Utente che visita il sito da mobile,
I want poter installare l'app sulla schermata Home (icona, nome, apertura a schermo intero),
so that vi acceda come farei con un'app nativa, senza dover riaprire il browser e digitare l'indirizzo ogni volta.

## Acceptance Criteria

1. **Given** un utente mobile (Chrome/Android o Safari/iOS) visita il sito **When** il browser valuta l'installabilità **Then** trova un `app/manifest.ts` (Next.js Metadata API) con `name`, `short_name`, `icons` (almeno 192×192 e 512×512 PNG), `start_url`, `display: "standalone"`, `background_color`/`theme_color` coerenti con `DESIGN.md`
2. **Given** l'app è stata installata (Aggiungi a Home Screen) **When** viene aperta dall'icona **Then** si apre senza barra degli indirizzi del browser (modalità standalone)
3. **And** nessuna regressione sulle pagine esistenti — il manifest è puramente additivo, nessun cambio a `layout.tsx` oltre al collegamento automatico gestito da Next.js quando il file è `app/manifest.ts`

## Tasks / Subtasks

- [x] Task 1: Icone PWA statiche (AC: #1)
  - [x] **Decisione presa con l'utente**: nessuna libreria di image-processing installata, il logo reale del club non è quadrato — l'utente ha scelto esplicitamente l'opzione (b), placeholder generati senza dipendenze nuove.
  - [x] Creati `public/icons/icon-192.png` (192×192) e `public/icons/icon-512.png` (512×512) — PNG RGB a tinta unita (`colors.navy` `#312682`, `DESIGN.md`) scritti a mano via `zlib.deflateSync`/`zlib.crc32` (Node ≥21, nessuna dipendenza nuova). Verificati byte-per-byte: firma PNG corretta, dimensioni corrette (192×192/512×512), IDAT decompresso di lunghezza esattamente attesa per ciascuna dimensione. **Placeholder provvisori, non il logo reale del club** — vedi Completion Notes.
- [x] Task 2: `app/manifest.ts` (AC: #1)
  - [x] Nuovo file, Next.js Metadata API (`import type { MetadataRoute } from "next"`, funzione default che ritorna `MetadataRoute.Manifest`) — Next.js lo serve automaticamente a `/manifest.webmanifest` e lo collega da `<head>` senza modifiche a `layout.tsx` (AC #3).
  - [x] Campi: `name: "Società Manager"`, `short_name: "Soc. Manager"`, `icons` con le due entry di Task 1, `start_url: "/"`, `display: "standalone"`, `background_color: "#FFFFFF"`, `theme_color: "#312682"`. `npx tsc --noEmit` pulito.
- [x] Task 3: **Escludere manifest e icone dal redirect di autenticazione del Proxy** (AC: #1, #2 — gap architetturale scoperto in analisi, non menzionato esplicitamente nell'epic)
  - [x] `middleware.ts` (matcher riga finale) intercetta OGGI **qualunque** pathname tranne `_next/static`, `_next/image`, `favicon.ico` — un visitatore NON autenticato (es. sulla pagina pubblica `/accedi`, dove il browser può comunque valutare l'installabilità) riceverebbe un redirect HTML a `/accedi` anche per la richiesta di `/manifest.webmanifest` e delle icone in `public/icons/`, rompendo silenziosamente la valutazione di installabilità. Questo è esattamente lo scenario già previsto (mai concretizzato) nel Defer di Story 1.1 in `deferred-work.md`: "altri eventuali asset in `/public` verrebbero comunque fatti passare dal redirect di autenticazione... nessun asset del genere esiste ancora, impatto attuale nullo" — ora concretizzato per la prima volta da questa storia.
  - [x] Esteso `matcher` in `middleware.ts` per escludere anche `manifest.webmanifest` e `icons/` — stesso identico meccanismo già usato per `favicon.ico`, nessuna modifica a `PROTECTED_ROUTES`/`route-guard.ts` necessaria.
- [x] Task 4: Verifica (AC: #1, #2, #3)
  - [x] `npm run build` pulito, nessuna regressione — `/manifest.webmanifest` presente nell'elenco route generato (statico, `○`), tutte le route esistenti invariate.
  - [x] AC #2 (installazione reale su un dispositivo mobile, "Aggiungi a Home Screen", apertura in standalone) **non è verificabile in questo ambiente sandbox** (nessun dispositivo mobile reale, nessun accesso di rete pubblico al deploy) — documentato nel Completion Notes, stesso principio già seguito per limiti di verifica dal vivo in storie precedenti (es. Story 12.4).
- [x] Task 5: Test
  - [x] `app/manifest.test.ts` (nuovo file): `app/manifest.ts` esporta una funzione pura (nessuna dipendenza esterna, nessun `"server-only"`) — importabile e testabile direttamente con Vitest, stesso principio di qualunque modulo puro del progetto. Verificare: `icons` contiene almeno una entry `192x192` e una `512x512` di `type: "image/png"`; `display === "standalone"`; `start_url === "/"`; `name`/`short_name` non vuoti. `npx vitest run app/manifest.test.ts` → 4/4 test passati.
  - [x] Nessun test automatico esiste in questo progetto per il `matcher` di `middleware.ts` (config statica letta da Next.js, non logica applicativa) — nessun precedente da seguire, verifica solo manuale/di build per questa storia.

### Review Findings

- [x] [Review][Decision→Patch] AC#1 richiede installabilità Safari/iOS ma mancava `apple-touch-icon`/`apple-mobile-web-app-capable` — Safari/iOS storicamente non legge in modo affidabile icone e display-mode dal Web App Manifest da solo; l'esperienza reale su iOS (icona nitida, eventuale standalone) tipicamente richiede `<link rel="apple-touch-icon">` e `<meta name="mobile-web-app-capable">` in `<head>`, che richiedono toccare `app/layout.tsx`. **Risolto su decisione esplicita dell'utente** (opzione 1: estendere la story ora): aggiunto `metadata.icons.apple` (riusa `icon-192.png`) e `metadata.appleWebApp.capable = true` in `app/layout.tsx` — deroga deliberata e concordata al vincolo letterale di AC#3 ("nessun cambio a layout.tsx"), il cui intento reale (niente `<link rel="manifest">` manuale) resta rispettato. [app/layout.tsx]
- [x] [Review][Patch] Il matcher regex `icons/` in `middleware.ts` esclude dall'autenticazione l'intero prefisso `public/icons/`, non solo i due file icona attesi (`icon-192.png`/`icon-512.png`) — se in futuro un file sensibile finisse in `public/icons/` o nascesse una rotta reale sotto `/icons/...`, diventerebbe silenziosamente non autenticata, senza alcun avviso nel matcher o vicino ad esso [middleware.ts:126] — risolto: ristretto a `icons/(?:icon-192\.png|icon-512\.png)`. **Bug reale trovato nell'applicare questo fix**: un gruppo di cattura annidato normale `(...)` nel `matcher` rompe `npm run build` (Next.js non ammette capturing group nei pattern di route, solo non-capturing `(?:...)`) — corretto usando `(?:...)`, riverificato con build pulita.
- [x] [Review][Patch] `.` non escappato nel matcher regex per `manifest.webmanifest` (pattern preesistente per `favicon.ico` ora propagato a una seconda stringa) — `.` in regex corrisponde a qualunque carattere, non solo al punto letterale; impatto pratico trascurabile (nessuna rotta reale corrisponde a varianti tipo `/manifestXwebmanifest`) ma occasione mancata di non propagare un pattern impreciso [middleware.ts:126] — risolto: `\.` escappato per `favicon.ico` e `manifest.webmanifest`.
- [x] [Review][Patch] `app/manifest.test.ts` non verifica che i `src` delle icone puntino a file realmente presenti in `public/icons/` — controlla solo che l'oggetto ritornato contenga le stringhe attese, non l'esistenza dei file; un rename/eliminazione di un'icona romperebbe il manifest in silenzio con i test ancora verdi [app/manifest.test.ts:19-30] — risolto: nuovo test che verifica `existsSync` per ogni `icon.src` sotto `public/`.
- [x] [Review][Patch] `app/manifest.test.ts` verifica `background_color`/`theme_color` solo con `toBeTruthy()`, non i valori esadecimali esatti richiesti da AC#1 ("coerenti con DESIGN.md") — un refuso nel valore hex passerebbe inosservato [app/manifest.test.ts:32-37] — risolto: asserzioni ora su `"#FFFFFF"`/`"#312682"` esatti.
- [x] [Review][Patch] Nessun backlog item tracciato per sostituire le icone placeholder col logo reale del club — le Completion Notes dichiarano l'intento ("da sostituire in una story futura") ma nessuna voce esiste in `deferred-work.md`/`epics.md`, rischio che la sostituzione venga dimenticata una volta che la story passa a `done` [_bmad-output/implementation-artifacts/deferred-work.md] — risolto: voce aggiunta a `deferred-work.md`.
- [x] [Review][Defer] Il matcher di `middleware.ts`, rilevante per l'autenticazione, non ha alcun test automatico — un errore di regex/config (es. esclusione troppo ampia) creerebbe silenziosamente un bypass non autenticato, e nulla in CI lo scoprirebbe [middleware.ts:126] — deferito, pre-esistente: nessun precedente di test per questa config in tutto il progetto, gap già dichiarato esplicitamente dalla story stessa (Task 5), non introdotto da questa story ma solo esteso allo stesso pattern già in uso per `favicon.ico`.

**Dismessi come rumore/fuori scope/convenzioni già accettate (6):** nessuno script di generazione icone committato — le icone sono placeholder temporanei da sostituire, investire in riproducibilità è basso valore; inconsistenza di branding tra favicon (default Next.js) e le nuove icone PWA (navy) — esplicitamente dichiarata fuori scope nei Dev Notes della story; icone senza `purpose: "maskable"` — un'icona a tinta unita non ha contenuto da tagliare, il rischio pratico di letterboxing è trascurabile per un placeholder temporaneo; checkbox del Task 4 (AC#2) marcato `[x]` nonostante non verificabile dal vivo — convenzione già consolidata e ripetuta in questo progetto (es. Story 13.1, 12.4), non un'inconsistenza nuova; icone placeholder non sono il logo reale del club — già dichiarato esplicitamente dalla story stessa (Dev Notes, Completion Notes), non una scoperta della review; AC#2 non verificato dal vivo in questo sandbox — già dichiarato esplicitamente dalla story stessa, nessuna violazione letterale dell'AC.

## Dev Notes

### Origine delle icone — decisione bloccante (leggere prima di Task 1)

Il repo contiene un asset reale del logo del club: `_bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/imports/logo-mogliano-volley.png` (437×469px, verificato leggendo l'header PNG — **non quadrato**, non già alle dimensioni richieste). Questo NON è lo stesso concetto del logo configurabile da Admin (`/logo`, Story 7.2, `lib/storage/logo.ts`, caricato in Supabase Storage, sostituibile a runtime) — è un asset statico di design, usato per estrarre la palette colori (`DESIGN.md`, vedi `reconcile-logo-mogliano-volley.md`), non ancora usato altrove nel codice applicativo.

Nessuna libreria di image-processing (`sharp`, `jimp`, ecc.) è installata — verificato in `package.json`. Ridimensionare con precisione questo PNG a 192×192/512×512 esatti senza una libreria dedicata non è realisticamente fattibile in modo affidabile con i soli strumenti Node built-in. **Non aggiungere una nuova dipendenza per questo senza chiedere esplicita approvazione all'utente** (regola esplicita del workflow `dev-story`: nuove dipendenze richiedono HALT + approvazione).

Opzioni per procedere (nessuna decisa in fase di creazione story — decidere/chiedere in apertura di `dev-story`):
- (a) Chiedere all'utente di fornire direttamente i due file PNG già alle dimensioni corrette (quadrati, sfondo pieno o trasparente secondo preferenza).
- (b) Procedere con icone placeholder a tinta unita (es. `colors.navy` `#312682` di sfondo, iniziali "SM" se realizzabile senza dipendenze) generate via un piccolo script Node che scrive byte PNG grezzi (`zlib.deflateSync` + chunk `IHDR`/`IDAT`/`IEND` costruiti a mano) — zero dipendenze nuove, ma **va segnalato esplicitamente in Completion Notes che non sono il logo reale del club**, da sostituire in una story futura se l'utente fornirà asset definitivi.

### Contesto tecnico

- `app/layout.tsx` non necessita modifiche: la convenzione file `app/manifest.ts` (Next.js Metadata API) viene collegata automaticamente da Next.js in `<head>`, nessun `<link rel="manifest">` manuale (AC #3).
- Nessun vincolo di build Cloudflare noto per questa convenzione — `next.config.ts` non ha `output: "export"` o altre opzioni che la escluderebbero; `app/manifest.ts` viene servito come qualunque altra route a runtime dal Worker, stesso principio di ogni pagina esistente. Verificare comunque con `npm run build` (Task 4), non assumere che funzioni solo perché la build compila (stesso principio già seguito in Story 12.3/12.4 per altre convenzioni Next.js su questo stack).
- Palette colori da `DESIGN.md` (`_bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md`): `surface: #FFFFFF`, `navy: #312682` (colore di sfondo della sidebar/nav, vedi `nav.background` nello stesso file) — usati per `background_color`/`theme_color` del manifest (Task 2). Nessun Pattern dedicato in `DESIGN.md`/`EXPERIENCE.md` per un manifest PWA (documento precede questo epic) — la scelta `background_color = surface`, `theme_color = navy` è coerente con l'uso già stabilito di questi due colori nel resto dell'app, non prescritta esplicitamente altrove.
- `app/favicon.ico` esiste già (Next.js default, non brandizzato) — fuori scope per questa storia, nessun AC lo richiede.
- **Correzione post-review (2026-08-04, durante la code review di Story 14.2)**: il fix del matcher del Task 3 è verificato **inerte nel deploy Cloudflare di produzione** — senza `run_worker_first: true` in `wrangler.jsonc` (assente), Cloudflare serve ogni richiesta per un file fisicamente presente in `.open-next/assets/` (incluse `manifest.webmanifest`, le icone, `favicon.ico`) direttamente dall'Asset Worker, **senza mai invocare il Worker Next.js dove gira `middleware.ts`** (confermato con una build reale, `npx opennextjs-cloudflare build`). Il fix resta corretto e utile solo per parità di comportamento con `next dev`/eventuale `next start` locale, non per il sito reale in produzione — non è una falla (questi file sono comunque pubblici per progetto), solo una precisazione sull'effetto reale del meccanismo descritto sopra e nel Task 3. Vedi `deferred-work.md` → "Deferred from: code review of 14-2-service-worker-offline-e-aggiornamento" per il dettaglio completo.

### Pattern da riusare (non reinventare)

- Nessun pattern esistente diretto nel progetto per un manifest PWA (prima storia del genere) — la struttura del file segue direttamente la Next.js Metadata API standard (`MetadataRoute.Manifest`), non un pattern interno al progetto.
- Il fix del matcher (Task 3) segue esattamente lo stesso meccanismo già in uso per `favicon.ico` nello stesso file (`middleware.ts`, riga `matcher`) — nessuna struttura nuova, solo un'estensione della stessa regex esistente.

### Riferimenti

- [Source: epics.md#Epic 14: Installabilità PWA, Story 14.1] — AC originali, note aggiuntive sull'epic.
- [Source: middleware.ts] — matcher da estendere (Task 3), letto per intero.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md] — palette colori per `background_color`/`theme_color`.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/reconcile-logo-mogliano-volley.md] — contesto sull'asset logo esistente, colori estratti.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#Deferred from: code review of 1-1-registrazione-e-login-per-ruolo] — il Defer originale che aveva previsto questo esatto gap del matcher.
- [Source: app/layout.tsx, app/NavBar.tsx] — nome app corrente ("Società Manager") da riusare per `name` del manifest.

### Project Structure Notes

- Nuovi file: `app/manifest.ts`, `app/manifest.test.ts`, `public/icons/icon-192.png`, `public/icons/icon-512.png`.
- Modificato: `middleware.ts` (solo la riga `matcher`, nessun'altra logica toccata).
- Nessuna modifica a `app/layout.tsx`, a `lib/auth/route-guard.ts`/`route-decision.ts` (il fix del matcher è a livello Next.js, non nella logica applicativa di autorizzazione), né a `lib/storage/logo.ts` (logo configurabile Admin, concetto distinto, non toccato).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno.

### Completion Notes List

- Implementate tutte le 5 Task/AC della story: icone PWA placeholder (`icon-192.png`/`icon-512.png`, tinta unita `colors.navy`, scritte a mano via `zlib`, nessuna dipendenza nuova — decisione (b) presa esplicitamente con l'utente in apertura di dev-story), `app/manifest.ts` (Next.js Metadata API), fix del matcher in `middleware.ts` (gap architetturale scoperto in analisi, non nell'epic originale, già previsto ma mai concretizzato nel Defer di Story 1.1), test Vitest per `app/manifest.ts`.
- **Deviazione nota**: le icone sono placeholder a tinta unita, non il logo reale del club (non ridimensionabile a 192×192/512×512 senza una nuova dipendenza di image-processing — nessuna installata nel progetto). Da sostituire in una story futura se l'utente fornirà asset definitivi.
- AC #2 (installazione reale su dispositivo mobile, apertura in standalone) non verificabile in questo ambiente sandbox (nessun dispositivo mobile reale, nessun accesso di rete pubblico al deploy) — stesso limite già incontrato in storie precedenti (es. 12.4, 13.1).
- 905/905 test Vitest passati (era 901 prima di questa story, +4 per `app/manifest.test.ts`), `eslint` senza nuovi errori/warning introdotti (1 errore preesistente non correlato in `wizard-nuova-stagione/page.tsx`), `npx tsc --noEmit` pulito, `npm run build` riuscita con `/manifest.webmanifest` presente nell'elenco route generato (statico, `○`).

### File List

**Nuovi:**
- `app/manifest.ts`
- `app/manifest.test.ts`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`

**Modificati:**
- `middleware.ts` (matcher esteso per escludere `manifest.webmanifest` e le due icone PWA, stesso meccanismo già usato per `favicon.ico`; review: `.` escappato, `icons/` ristretto ai due file attesi)
- `app/layout.tsx` (review, decisione utente: `metadata.icons.apple`/`metadata.appleWebApp.capable` per installabilità Safari/iOS, AC#1)

## Change Log

- 2026-08-04: Story implementata (Task 1-5 completi). Icone PWA placeholder a tinta unita (nessuna libreria di image-processing installata, decisione presa con l'utente), `app/manifest.ts` (Next.js Metadata API), fix del matcher in `middleware.ts` per non rompere l'installabilità per utenti non autenticati (gap architetturale scoperto in analisi, già previsto nel Defer di Story 1.1). 905/905 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita con `/manifest.webmanifest` statico nell'elenco route. Status: review.
- 2026-08-04: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor). 1 decision-needed risolto su scelta esplicita dell'utente: AC#1 (Safari/iOS) richiedeva `apple-touch-icon`/`apple-mobile-web-app-capable`, non ottenibili dal solo manifest — aggiunto `metadata.icons.apple`/`metadata.appleWebApp.capable` in `app/layout.tsx` (deroga concordata alla lettera di AC#3, il cui intento reale resta rispettato). 5 patch applicati: matcher `middleware.ts` ristretto ai due file icona esatti invece dell'intero prefisso `icons/` (con un bug reale trovato e corretto durante il fix stesso — Next.js non ammette capturing group nel `matcher`, solo `(?:...)`, la build falliva finché non corretto), `.` escappato nel matcher, nuovo test che verifica l'esistenza reale dei file icona su disco, asserzioni sui valori hex esatti di `background_color`/`theme_color`, voce di backlog per la sostituzione futura delle icone placeholder aggiunta a `deferred-work.md`. 1 defer (assenza di test automatici per il matcher — gap pre-esistente in tutto il progetto, non introdotto da questa story). 6 osservazioni dismesse come rumore/fuori scope/convenzioni già accettate. 906/906 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: done.
