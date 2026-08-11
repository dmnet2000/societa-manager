---
baseline_commit: f2222a2
---

# Story 18.1: Migrazione dashboard interna a `/app` e nuova home pubblica

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Visitatore senza account,
I want raggiungere un sito pubblico del Settore Volley visitando la radice del dominio, con un registro visivo accattivante,
so that possa scoprire la società senza dover fare login.

## Acceptance Criteria

1. **Given** un Visitatore senza sessione **When** visita `"/"` **Then** vede la nuova home pubblica del sito (nessun redirect a `/accedi`).
2. **Given** un Utente autenticato **When** effettua login o si registra **Then** viene reindirizzato a `/app` (non più a `"/"`), dove trova la dashboard interna invariata nel comportamento (compreso il carosello Banner sponsor per Atleta/Genitore, Story 16.3).
3. **And** ogni rotta oggi raggiungibile senza prefisso (es. `/gruppi`, `/admin`, `/sponsor`, `/il-mio-profilo`, `/modifica-password`) è ora raggiungibile solo sotto `/app` (es. `/app/gruppi`) — stessa identica autorizzazione per Ruolo di prima, nessuna rotta rimasta raggiungibile al vecchio path.
4. **And** un Utente non autenticato che tenta di visitare una rotta sotto `/app` viene reindirizzato a `/accedi` come oggi.
5. **And** nessun link interno della dashboard (NavBar, redirect, azioni post-submit, `revalidatePath`, icona "?" della guida) punta ancora al vecchio path senza prefisso.
6. **And** l'app installata come PWA (Epic 14, `app/manifest.ts`) si apre su `/app` (la dashboard), non sulla nuova home pubblica.
7. **And** la nuova home pubblica non richiede autenticazione, non espone alcun dato riservato e non contiene ancora alcuna sezione di contenuto (sponsor/partite/foto squadra/social arrivano nelle Story 18.2-18.5) — solo layout/scheletro (header, footer, struttura), il registro visivo va progettato con Sally (UX) prima di implementare il markup finale.
8. **Given** un Visitatore sulla home pubblica **When** cerca di accedere al portale **Then** trova un link "Accedi" ben visibile nell'header del sito (pattern comune ai siti con un'area riservata) che porta a `/accedi` — un Utente già autenticato che visita `"/"` vede comunque questo link (nessuna sessione controllata sulla home pubblica in questa story, la home resta identica per tutti i visitatori).

## Tasks / Subtasks

- [x] Task 1: Nuovo layout annidato per l'area applicativa (AC: #2, #3, #4)
  - [x] Creare `app/app/layout.tsx`: sposta qui il contenuto oggi in `app/layout.tsx` che è specifico della dashboard interna — `<NavBar />` + wrapper `.shell`/`.contenuto` (da `app/globals.css`) attorno a `{children}`. Import di `NavBar`/`NavBar.actions`/`NavBarClient` invariati (file NON spostati fisicamente, restano in `app/`, solo importati da un nuovo punto — nessun motivo di spostarli, non sono file di rotta).
  - [x] `app/layout.tsx` (root) si riduce a `<html><body><ServiceWorkerRegistration />{children}</body></html>` — resta il layout condiviso da TUTTO (sito pubblico + `/app`), la nuova home pubblica non deve ereditare la sidebar/topBar della dashboard interna.
  - [x] **Deciso in sviluppo**: spostata anche `app/non-autorizzato/` sotto `app/app/non-autorizzato/`, per coerenza (raggiunta solo da un Utente già autenticato con Ruolo sbagliato). `NON_AUTORIZZATO_PATH` aggiornato a `/app/non-autorizzato` in `lib/auth/route-guard.ts` - il confronto in `app/NavBar.tsx` resta invariato (legge la costante, non un letterale).

- [x] Task 2: Spostamento fisico delle rotte protette sotto `app/app/` (AC: #3)
  - [x] `git mv` di ogni route group protetto in `app/` dentro `app/app/`: `(amministrazione)`, `(certificati-medici)`, `(configurazione)`, `(dati-atleta)`, `(gruppi-allenatori)`, `(guida)`, `(iscrizioni)`, `(orari-palestre)`, `(partite-campionati)`, `(presenze)`, `(sponsor)`, più le due rotte senza route group `il-mio-profilo/` e `modifica-password/`. Usare `git mv` (non cancella+ricrea) per preservare la history del file.
  - [x] **NON spostare**: `(auth)/` (contiene `/accedi`, `/registrati`, `/recupera-password`, `/reimposta-password` — restano pubbliche, invariate) e `api/` (Route Handler, non pagine — `/api/cron/*`/`/api/health` già esentate dal Proxy via `isRouteHandlerCron`/`isRouteHandlerHealth`, nessun impatto).
  - [x] Spostare anche il contenuto della dashboard oggi in `app/page.tsx` (il carosello Banner sponsor + saluto, Story 16.3) in `app/app/page.tsx` — con lui i file che usa: `app/SponsorCarosello.tsx` → `app/app/SponsorCarosello.tsx`, `app/home.module.css` → `app/app/home.module.css`.

- [x] Task 3: Aggiornare `PROTECTED_ROUTES`/`PUBLIC_ROUTES` (AC: #1, #3, #4)
  - [x] `lib/auth/route-guard.ts`: prependere `/app` a ogni `prefix` dell'array `PROTECTED_ROUTES` (es. `/gruppi` → `/app/gruppi`). **Non toccare** `ruoliAmmessi`/`navLabel`/`gruppo`/`permessiConfigurabili`/`nascostaDallaNav` — solo il valore di `prefix` cambia, la logica di autorizzazione resta identica byte-per-byte.
  - [x] Aggiungere `"/"` a `PUBLIC_ROUTES`. Nota tecnica non ovvia: `isPublicRoute` fa `pathname === route || pathname.startsWith(\`${route}/\`)` — con `route = "/"` il secondo confronto diventa `pathname.startsWith("//")`, che non è mai vero per un path normale. Aggiungere `"/"` rende pubblica **solo** la home esatta, non un prefisso che intercetterebbe ogni altra rotta (nessuna rotta reale del progetto inizia per `"//"`). Le rotte pubbliche di contenuto introdotte dalle story successive (18.2-18.5) andranno aggiunte esplicitamente qui una per una quando esisteranno, non sono coperte automaticamente da questa voce.
  - [x] `getRouteDecision`/`isPublicRoute`/`isRouteHandlerCron`/`isRouteHandlerHealth`/`matchProtectedRoute` (`lib/auth/route-decision.ts`, `lib/auth/route-guard.ts`): nessuna modifica di logica, solo ai dati che consumano.

- [x] Task 4: Redirect e link con path letterali (AC: #2, #5, #6)
  - [x] `app/(auth)/accedi/actions.ts:92` e `app/(onboarding-import)/registrati/actions.ts:295`: entrambi `redirect("/")` → `redirect("/app")`. **Deciso in sviluppo** (nessuno split del route group): solo `import-atlete/` e `precaricamento-allenatori/` spostati dentro `app/app/(onboarding-import)/`, `registrati/` resta in `app/(onboarding-import)/registrati/` (pubblica, invariata) - due cartelle `(onboarding-import)` distinte convivono senza conflitto (route group puramente organizzativo, non compare nell'URL).
  - [x] `app/(certificati-medici)/certificato-medico/actions.ts:228` (`redirect("/certificato-medico")`), `app/(certificati-medici)/conferma-certificati/actions.ts:265` (`redirect("/conferma-certificati")`), `app/(gruppi-allenatori)/wizard-nuova-stagione/actions.ts:133` (`redirect("/gruppi")`): aggiungere prefisso `/app`.
  - [x] `app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx:49` (`href="/gruppi"`), `app/NavBarClient.tsx:378` (`href="/modifica-password"`): aggiungere prefisso `/app`.
  - [x] **Non toccare**: `app/(onboarding-import)/registrati/page.tsx:100`, `app/(auth)/recupera-password/RecuperaPasswordForm.tsx:36`, `app/(auth)/accedi/AccediForm.tsx:32` e `:35` — tutti puntano a rotte pubbliche (`/accedi`, `/recupera-password`, `/registrati`) che non si spostano.
  - [x] `app/manifest.ts`: `start_url: "/"` → `start_url: "/app"` (AC #6 — senza questo, un utente che ha installato la PWA prima di questa story continuerebbe ad aprire la nuova home pubblica invece della dashboard, rompendo silenziosamente lo scopo originale di Epic 14).

- [x] Task 5: Nuova home pubblica (AC: #1, #7, #8)
  - [x] Nuovo `app/page.tsx`: home pubblica, nessuna sessione richiesta, nessuna query a dati riservati. Solo layout/scheletro in questa story (header/footer/struttura) — le sezioni di contenuto sono fuori scope, arrivano con 18.2-18.5.
  - [x] Header del sito pubblico: link "Accedi" (`<Link href="/accedi">`, coerente con `a { color: inherit; text-decoration: none; }` già globale in `app/globals.css`) sempre visibile — nessun controllo di sessione qui (fuori scope AC #8: la home resta identica per tutti, autenticati o no; un Utente già loggato che clicca "Accedi" da `/accedi` verrebbe comunque reindirizzato normalmente in base al flusso esistente di quella pagina, non e' compito di questa story cambiarlo).
  - [x] Coinvolgere Sally (UX designer) per il registro visivo "accattivante" prima di finalizzare il markup — stesso principio già seguito per il carosello Sponsor in homepage (Story 16.3 estensione), nessun mockup preesistente da riusare per un sito pubblico (tutto il resto del progetto è disegnato per l'area autenticata). Il link "Accedi" va incluso nel mockup fin dalla prima bozza, non aggiunto dopo.

- [x] Task 6: Sweep sistematico — guida in-app e riferimenti residui (AC: #5)
  - [x] `lib/guida/contenuti.ts`: il campo `rotta` di **ogni** voce di `CONTENUTI_GUIDA` è oggi un mirror letterale di `PROTECTED_ROUTES[].prefix` (Story 17.1/17.2) — va aggiornato con lo stesso prefisso `/app` per tutte le 31 voci, altrimenti `contenutoPerRotta` smette di trovare corrispondenze e ogni icona "?" del progetto sparisce silenziosamente (nessun errore, `contenutoPerRotta` ritorna `null` per design, Story 17.1 AC #4).
  - [x] Ogni chiamata `contenutoPerRotta("/xxx", ...)` nei `page.tsx` (45 punti di chiamata secondo `grep -rn "contenutoPerRotta(" app` al momento della stesura — alcune pagine con più rami "early-return" la invocano più volte, Story 17.2) va aggiornata con lo stesso prefisso `/app` nel primo argomento.
  - [x] Sweep finale con `grep -rn "revalidatePath(\"/\|redirect(\"/\|href=\"/" app lib` per catturare eventuali riferimenti letterali non ancora enumerati sopra (25 file con `revalidatePath` individuati in analisi, non elencati singolarmente qui — ognuno chiama `revalidatePath` sul path della propria rotta, va aggiornato in coppia con lo spostamento della cartella che lo contiene).

- [x] Task 7: Test (AC: tutti)
  - [x] `lib/auth/route-decision.test.ts`, `lib/auth/voci-navigazione.test.ts`, `lib/auth/require-ruolo.test.ts`, `lib/auth/permessi-configurabili.test.ts`, `lib/guida/contenuti.test.ts`: aggiornare ogni assert su path letterali con prefisso `/app`; aggiungere caso `getRouteDecision("/", false, [])` → `{ action: "allow" }` e `isPublicRoute("/")` → `true`.
  - [x] `actions.test.ts` dei moduli spostati che asseriscono comportamento di route-guard (almeno `admin`, `permessi-accesso`, `gruppi`, `palestre`, `sponsor` individuati in analisi — verificarne altri durante lo sweep).
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti. Promemoria di processo noto (memoria persistente dell'agente): se `next dev`/`tsc` mostrano errori dentro `.next/dev/types`, non è un bug di codice — `rm -rf .next` e riavviare.

## Dev Notes

### Decisioni di analisi (2026-08-11, prese con l'utente — vedi `epics.md#Epic 18`)

- **Punto tecnico critico risolto**: il sito pubblico prende `"/"`, la dashboard interna si sposta sotto `/app` (non il contrario — scartata l'opzione "sito pubblico su un prefisso proprio, `/` resta la dashboard").
- **Solo lo scheletro della home pubblica in questa story**: nessuna sezione di contenuto (sponsor/partite/foto squadra/social) — arrivano una alla volta nelle story 18.2-18.5, tutte dipendenti da questa.

### Scoperta architetturale chiave: split del root layout

`app/layout.tsx` oggi monta **sempre** `<NavBar />` (che si auto-nasconde con `return null` se non c'è sessione, `app/NavBar.tsx:39`) dentro un wrapper `.shell`/`.contenuto` (`app/globals.css`, Story 9.2) attorno a `{children}` — questo layout è condiviso da OGNI pagina del progetto, inclusa la futura home pubblica. Senza intervenire, la home pubblica erediterebbe comunque la struttura a sidebar della dashboard interna (anche con `NavBar` che renderizza `null`, il div `.shell`/`.contenuto` resterebbe). La soluzione (Task 1) è il pattern standard di Next.js App Router per questo caso: un layout annidato specifico per il segmento `/app` (`app/app/layout.tsx`) porta con sé NavBar+shell, il root layout torna a essere il minimo condiviso (html/body/ServiceWorkerRegistration). `NavBar.tsx`/`NavBarClient.tsx`/`NavBar.actions.ts`/`NavBar.module.css` **non hanno bisogno di spostarsi fisicamente** — non sono file di rotta (nessun `page.tsx`/`layout.tsx`), la loro posizione su disco è indipendente dalla struttura URL; basta importarli dal nuovo `app/app/layout.tsx` invece che dal root.

### Il pattern chiave: `PROTECTED_ROUTES[].prefix` è la fonte di verità, i link sono già dinamici

`app/NavBar.tsx` → `lib/auth/voci-navigazione.ts` (`filtraVociNavigazione`/`raggruppaVociNavigazione`) costruisce ogni `href` della sidebar leggendo `route.prefix` direttamente da `PROTECTED_ROUTES` — **non ci sono `href` hardcoded nella sidebar**. Questo significa che aggiornare `prefix` in `lib/auth/route-guard.ts` (Task 3) aggiorna automaticamente tutti i link della barra di navigazione, senza toccare `voci-navigazione.ts`/`NavBarClient.tsx` per quello scopo specifico. I punti che **restano** da aggiornare a mano sono solo quelli con un path scritto letteralmente nel codice (redirect di Server Action, `<Link href="...">` fuori dalla sidebar, `revalidatePath`, `contenutoPerRotta(...)`) — elencati nei Task 4/6 sopra, individuati con una ricerca sistematica (`grep`) durante l'analisi di questa storia, non esaustiva al 100%: fare comunque il proprio giro di `grep` prima di considerare il lavoro finito.

### Rischio silenzioso da non ripetere: `lib/guida/contenuti.ts`

Story 17.1/17.2 hanno introdotto un secondo elenco (`CONTENUTI_GUIDA`) il cui campo `rotta` è un mirror manuale — non derivato — di `PROTECTED_ROUTES[].prefix`. Un test di coerenza esiste già (`lib/guida/contenuti.test.ts`, verifica `CONTENUTI_GUIDA` vs `PROTECTED_ROUTES`) e fallirà se le 31 voci non vengono aggiornate in coppia con `route-guard.ts` — ma il sintomo *in produzione* di dimenticarsene (prima che il test lo becchi) sarebbe silenzioso: nessun errore, solo l'icona "?" della guida che sparisce da ogni pagina (`contenutoPerRotta` ritorna `null` per design). Regola di processo permanente del progetto (salvata anche in memoria dell'agente): ogni story che tocca una funzionalità già documentata in guida deve aggiornarne anche il contenuto — qui si applica in modo particolarmente esteso, a tutte le 31 voci contemporaneamente.

### Punto aperto da chiarire in sviluppo — `/registrati` e il route group `(onboarding-import)`

`/registrati` è oggi pubblica (raggiungibile senza login, per definizione — un Visitatore si registra prima di avere un account) ma fisicamente vive nel route group `app/(onboarding-import)/`, insieme a `/import-atlete` che **è** protetta (Admin/Dirigente). Verificare in sviluppo se `(onboarding-import)` va scisso (`/registrati` resta a livello root, `/import-atlete` si sposta sotto `app/app/`) o se esiste già una separazione di file sufficiente da rendere lo split naturale — non assunto qui, nessun precedente diretto nel progetto per uno split di route group a metà.

### Pattern da riusare (non reinventare)

- **Layout annidato per segmento**: pattern standard Next.js App Router (nessuna libreria) — un `layout.tsx` dentro `app/app/` si applica solo alle rotte sotto quel segmento, il root layout resta il guscio condiviso.
- **`git mv` per spostare directory intere**: nessun precedente diretto in questo progetto (prima volta che si spostano cartelle di rotta esistenti), ma è la pratica standard per preservare la history di ogni file spostato — preferibile a cancella+ricrea.

### Riferimenti

- [Source: lib/auth/route-guard.ts] — `PROTECTED_ROUTES`/`PUBLIC_ROUTES`/`matchProtectedRoute`/`isPublicRoute`, unica fonte di verità per autorizzazione e navigazione.
- [Source: lib/auth/route-decision.ts] — `getRouteDecision`: **qualunque** path non in `PUBLIC_ROUTES` richiede autenticazione, indipendentemente dal fatto che compaia o meno in `PROTECTED_ROUTES` (il match su `PROTECTED_ROUTES` serve solo al controllo Ruolo, non alla soglia di autenticazione) — per questo `"/"` è protetta oggi pur non comparendo in nessun array.
- [Source: lib/auth/voci-navigazione.ts] — conferma che i link della sidebar sono già dinamici da `route.prefix`, nessun hardcoding da correggere lì.
- [Source: lib/guida/contenuti.ts, contenutoPerRotta] — dipendenza incrociata con `PROTECTED_ROUTES` da non dimenticare (vedi sopra).
- [Source: app/layout.tsx, app/NavBar.tsx, app/globals.css (.shell/.contenuto)] — struttura da scindere in root layout + nuovo `app/app/layout.tsx`.
- [Source: app/page.tsx, app/SponsorCarosello.tsx] — dashboard/carosello Story 16.3 da spostare invariati sotto `app/app/`.
- [Source: app/manifest.ts] — `start_url` da aggiornare per l'installabilità PWA (Epic 14).
- [Source: middleware.ts] — matcher/logica invariati, nessuna modifica necessaria (esclude già asset statici indipendentemente dalla struttura di `app/`).
- [Source: epics.md#Epic 18: Sito pubblico Settore Volley] — decisioni di analisi complete, testo originale della richiesta utente, rottura in 5 story.

### Project Structure Notes

- Nuova cartella `app/app/` — contiene lo spostamento di tutti i route group oggi protetti (elenco completo nel Task 2) più `page.tsx`/`SponsorCarosello.tsx`/`home.module.css` della dashboard e un nuovo `layout.tsx`.
- `app/layout.tsx` (root) drasticamente semplificato — resta condiviso da sito pubblico e area `/app`.
- Nuovo `app/page.tsx` — home pubblica, sostituisce l'attuale dashboard su `"/"`.
- Non spostati: `app/(auth)/`, `app/api/`, `app/NavBar.tsx` e file collegati, `app/globals.css`, `app/manifest.ts` (modificato, non spostato), `app/favicon.ico`.
- Nessuna nuova Server Action, nessuna nuova tabella — solo spostamento di file esistenti, aggiornamento di path letterali, e **una migrazione dati** (non di schema) scoperta in sviluppo: `permessi_rotte` (Epic 12) ha righe con il vecchio prefisso, vedi Completion Notes.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (claude-opus-5)

### Debug Log References

- Durante lo spostamento fisico (Task 2), `git mv` ha fallito con "Permission denied" su tutte le cartelle con parentesi (`(amministrazione)`, `(certificati-medici)`, ecc.) e su `(onboarding-import)/import-atlete`. Causa: processi `next dev`/Turbopack residui di una sessione precedente (mai terminati correttamente, `taskkill` sui 3 PID orfani) tenevano lock sui file. Non un problema del codice - `git mv` è andato a buon fine subito dopo aver terminato i processi.
- Build di produzione: gli errori `Dynamic server usage` (`/app/impostazioni`, uso di `cookies`) e `PrismaClientKnownRequestError`/`ERR_UNKNOWN_FILE_EXTENSION` (motore Prisma WASM) durante "Generating static pages" sono il quirk noto e già documentato di questo ambiente locale (non il motore WASM reale di produzione) - non bloccano l'output, la build completa con successo e la tabella delle rotte finale conferma tutti i path attesi (`/`, `/app`, `/app/gruppi`, ecc.).
- `tsc --noEmit` inizialmente falliva con ~60 errori `Cannot find module '.../page.js'` dentro `.next/dev/types` - causa nota e già in memoria persistente dell'agente (cache di tipi Next.js corrotta da un `next dev` di una sessione precedente, riferita ai vecchi path pre-spostamento). Risolto con `rm -rf .next`, non un bug di codice.

### Completion Notes List

- Task 1-5 implementati come da story. Task 6 (sweep) e Task 7 (test) hanno fatto emergere **5 riferimenti letterali reali non catturati dai grep iniziali della story** (pattern diversi da `href="/`/`redirect("/`/`revalidatePath("/`/`contenutoPerRotta(`), tutti corretti:
  1. `SponsorVetrinaCard.tsx`: `href={\`/sponsor/${id}/voucher\`}` (template literal, non stringa semplice) → `/app/sponsor/${id}/voucher`.
  2. `impostazioni/page.tsx`: costante locale `PREFISSI_IMPOSTAZIONI = ["/smtp", "/logo"]` usata per un `.find()` su `PROTECTED_ROUTES` - senza il prefisso, il `.find()` falliva silenziosamente e la pagina mostrava/linkava ai vecchi path.
  3. `lib/auth/voci-navigazione.ts`: mappa `VOCI_FIGLIE_NASCOSTE` (Story 9.24, evidenzia "Impostazioni" attiva quando si è su `/smtp`/`/logo`) - stessa causa, chiave e valori aggiornati a `/app/...`.
  4. `precaricamento-allenatori/actions.ts` (×3): `requireRuolo(["ADMIN"], "/precaricamento-allenatori")` - il secondo parametro collega la Server Action al sistema di permessi configurabili (Epic 12/Story 12.4); senza il prefisso, `matchProtectedRoute` non trovava più la rotta e la funzionalità "permessi configurabili" per questa pagina si sarebbe disattivata silenziosamente, tornando al vecchio comportamento ADMIN-only hardcoded.
  5. Sei import `@/app/(amministrazione)/...` e `@/app/(partite-campionati)/...` (alias assoluto verso moduli condivisi dentro un route group, non un file di rotta) - senza il prefisso, la build/i test fallivano con "Cannot find package" (questi hanno causato il fallimento immediato di 4 file di test, non un'assenza silenziosa).
  6. **Migrazione dati** (non prevista nella story originale): la tabella `permessi_rotte` (Epic 12, Story 12.1/12.4) ha righe scritte in produzione con il vecchio prefisso (es. `/precaricamento-allenatori`) - senza aggiornarle, un Admin che aveva già configurato permessi per quella rotta li avrebbe persi silenziosamente al deploy (fail-closed per design di `rottaAbilitataPerRuolo`). Nuova migrazione `20260811000000_prefissa_app_permessi_rotte` (`UPDATE ... SET rotta = '/app' || rotta WHERE rotta NOT LIKE '/app/%'`). **Da applicare in produzione PRIMA o CONTESTUALMENTE al deploy del codice** (stessa lezione già documentata per Story 11.1/11.2 in `project-deploy-produzione`), non dopo.
- Decisioni prese in sviluppo sui due punti aperti della story: `app/non-autorizzato/` spostata sotto `/app` (per coerenza); `(onboarding-import)` non scisso come cartella - solo `import-atlete`/`precaricamento-allenatori` spostati sotto `app/app/`, `registrati` resta al suo posto (route group puramente organizzativo, due cartelle omonime in punti diversi dell'albero convivono senza conflitto).
- Home pubblica (`app/page.tsx`, Task 5): scheletro funzionale con header (logo/nome settore se configurati, mirror del pattern già in `/accedi` — fail-soft try/catch separati) + link "Accedi", hero con messaggio placeholder, footer. Registro visivo volutamente minimale (stessi token DESIGN.md del gradiente già approvato per `/accedi`, nessun colore nuovo) - la story esplicitamente rimanda a Sally per il registro visivo definitivo quando arriveranno le sezioni di contenuto (18.2-18.5), non bloccante per questa storia.
- 1062/1062 test Vitest passati (era 1061, +1 nuovo test su `getRouteDecision("/", ...)`/`isPublicRoute("/")`), 0 errori tsc/eslint (8 warning preesistenti invariati, nessuno nuovo), build produzione riuscita.
- Verifica dal vivo (login reale, navigazione su `/app/*`, installazione PWA) non eseguibile in questo sandbox (nessun accesso a un browser con sessione reale nel contesto di `dev-story`) - demandata all'utente dopo il deploy, stesso limite già accettato per le migrazioni scritte a mano di story precedenti.

### File List

**Nuovi:**
- `app/app/layout.tsx`
- `app/page.tsx` (nuova home pubblica — sostituisce il vecchio `app/page.tsx`, spostato)
- `app/home-pubblica.module.css`
- `prisma/migrations/20260811000000_prefissa_app_permessi_rotte/migration.sql`
- `_bmad-output/implementation-artifacts/18-1-migrazione-dashboard-app-e-home-pubblica.md`

**Spostati con `git mv`** (contenuto invariato salvo dove indicato sotto — ~100 file, un intero sottoalbero): tutti i route group `app/(amministrazione)/`, `app/(certificati-medici)/`, `app/(configurazione)/`, `app/(dati-atleta)/`, `app/(gruppi-allenatori)/`, `app/(guida)/`, `app/(iscrizioni)/`, `app/(orari-palestre)/`, `app/(partite-campionati)/`, `app/(presenze)/`, `app/(sponsor)/` → `app/app/(...)/`; `app/il-mio-profilo/`, `app/modifica-password/`, `app/non-autorizzato/` → `app/app/...`; `app/(onboarding-import)/import-atlete/` e `app/(onboarding-import)/precaricamento-allenatori/` → `app/app/(onboarding-import)/...` (`registrati/` resta al vecchio posto); `app/page.tsx` (vecchio, dashboard), `app/SponsorCarosello.tsx`, `app/home.module.css`, `app/sponsor-carosello.module.css` → `app/app/...`.

**Modificati (contenuto, oltre allo spostamento dove applicabile):**
- `app/layout.tsx` (semplificato al minimo condiviso)
- `lib/auth/route-guard.ts` (prefisso `/app` su tutti i `prefix` di `PROTECTED_ROUTES`, `NON_AUTORIZZATO_PATH`, `"/"` in `PUBLIC_ROUTES`)
- `lib/auth/voci-navigazione.ts` (`VOCI_FIGLIE_NASCOSTE`)
- `lib/guida/contenuti.ts` (29 voci `rotta` + 2 commenti)
- `app/NavBar.actions.ts` (`revalidatePath("/app", "layout")` + commento)
- `app/NavBarClient.tsx` (link `/modifica-password`)
- `app/manifest.ts` (`start_url`)
- `app/(auth)/accedi/actions.ts`, `app/(onboarding-import)/registrati/actions.ts` (redirect post-login/registrazione)
- `app/app/(certificati-medici)/certificato-medico/actions.ts`, `app/app/(certificati-medici)/conferma-certificati/actions.ts` (2 redirect ciascuno, incluso il fallback `url ?? "..."`)
- `app/app/(gruppi-allenatori)/wizard-nuova-stagione/actions.ts`, `app/app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx`
- `app/app/(sponsor)/sponsor/SponsorVetrinaCard.tsx` (link voucher)
- `app/app/(configurazione)/impostazioni/page.tsx` (`PREFISSI_IMPOSTAZIONI`)
- `app/app/(onboarding-import)/precaricamento-allenatori/actions.ts` (parametro `rotta` di `requireRuolo`, ×3)
- ~25 file `actions.ts` sotto `app/app/` con `revalidatePath(...)` aggiornato (uno per modulo spostato — elenco completo nel diff, non ripetuto qui)
- 45 punti di chiamata `contenutoPerRotta("/app/...")` sparsi in ~29 `page.tsx` sotto `app/app/`
- 6 import `@/app/app/(amministrazione)/...` / `@/app/app/(partite-campionati)/...` (`ConfermaCertificatoRow.tsx`, `ListaConfermati.tsx`, `conferma-certificati/page.tsx`, `vista-allenatore/page.tsx` ×3 import, `campionati/actions.ts`, `importa-gare-actions.ts`, `partite/actions.ts`, `lib/certificato-in-scadenza-per-atleta.ts`, `lib/ordina-certificati-per-stato.ts`)
- Test aggiornati (path letterali con prefisso `/app`): `lib/auth/route-decision.test.ts` (+1 nuovo test), `lib/auth/voci-navigazione.test.ts`, `lib/auth/require-ruolo.test.ts`, `lib/guida/contenuti.test.ts`, `app/manifest.test.ts`, `app/NavBar.actions.test.ts`, e gli `actions.test.ts` di ogni modulo spostato con assert su `revalidatePath`/`redirect`/`requireRuolo` (admin, permessi-accesso, certificato-medico, conferma-certificati, impostazioni, logo, smtp, dati-fisici, gruppi, conferma-iscrizioni, conferma-tesseramenti, import-atlete, precaricamento-allenatori, palestre, slot, campionati, importa-gare, partite, presenze, sponsor, il-mio-profilo, accedi, registrati)
- `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml` (decisioni Epic 18 + stato story)

## Change Log

- 2026-08-11: File di story creato, stato ready-for-dev.
- 2026-08-11: Implementata - migrazione dashboard interna a `/app`, nuova home pubblica su `"/"` con link Accedi. 5 riferimenti letterali reali trovati oltre a quelli previsti dalla story (voucher Sponsor, PREFISSI_IMPOSTAZIONI, VOCI_FIGLIE_NASCOSTE, parametro rotta di requireRuolo in precaricamento-allenatori, import @/app/(...) condivisi) + 1 migrazione dati non prevista (permessi_rotte). 1062/1062 test Vitest passati (era 1061), 0 errori tsc/eslint, build produzione riuscita. Status: review.
