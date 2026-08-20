---
title: "Story 19.9: Modello dati e rendering pubblico delle Pagine personalizzate"
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 1
context: []
baseline_commit: '22116a815aeb9f7a2171f05c783d9c3c06c3e46c'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Un Site Manager può aggiungere una voce di menu (`/app/menu-pubblico`, Story 19.6-19.7) con un URL nuovo, ma non esiste alcun meccanismo che faccia esistere una pagina reale dietro quell'URL - il Visitatore che la apre ottiene un errore/404. Le 5 pagine pubbliche di oggi (Home/Squadre/Calendario/Staff/Contatti) sono rotte Next.js scritte a mano, non generabili da configurazione.

**Approach:** Nuova entità `PaginaPubblica` (id, slug, titolo, contenuto HTML, timestamp) + una rotta catch-all (`app/[...slug]/page.tsx`) che risolve un URL a runtime cercando una riga corrispondente, invece di richiedere una nuova rotta scritta a mano per ogni pagina. Decisione presa in party mode (Mary/John/Sally/Winston/Amelia, 2026-08-19): ampiezza "dépliant digitale" (poche pagine statiche, confermato dall'utente) - **nessuno stato bozza/pubblicato**, stesso modello di `VoceMenuPubblico` (una riga esiste ed è quella che si vede). Questa storia copre solo modello dati + rendering pubblico + blocco degli URL riservati; l'editor di creazione/modifica è la Story 19.10 (dipendente da questa).

## Boundaries & Constraints

**Always:** il contenuto HTML viene sanitizzato **sia prima di essere scritto su database sia di nuovo al momento del render** (difesa in profondità, decisione esplicita di Winston in party mode - mai fidarsi di un solo passaggio quando si usa `dangerouslySetInnerHTML`, prima volta in questo progetto). Un tentativo di creare/aggiornare una Pagina (o una voce di menu esistente, Story 19.7) con uno slug/URL che collide con una rotta riservata del sito viene rifiutato - unica fonte di verità per "cosa è riservato": `PUBLIC_ROUTES`/`PROTECTED_ROUTES` già esistenti in `lib/auth/route-guard.ts`, mai una seconda lista mantenuta a mano.

**Ask First:** nessuna aggiuntiva oltre a quanto già deciso in party mode (vedi epics.md Story 19.9/19.10 per il verbale completo delle decisioni).

**Never:** non migrare le 5 pagine pubbliche esistenti in questo sistema (restano rotte scritte a mano, fuori scope - deciso esplicitamente). Non introdurre stati bozza/pubblicato, categorie, o un flusso editoriale (ampiezza "dépliant", non "blog" - deciso esplicitamente con l'utente in party mode). Nessuna Server Action di scrittura in questa storia (creazione/modifica arrivano con la 19.10) - questa storia costruisce solo lettura pubblica + la funzione di validazione condivisa (usata anche da 19.7 e 19.10).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| URL con una `PaginaPubblica` corrispondente | slug esiste | Visitatore vede titolo+contenuto sanitizzato | N/A |
| URL senza corrispondenza | nessuna riga | comportamento 404 di oggi, invariato | Next.js `notFound()` |
| Contenuto con markup pericoloso (es. `<script>`) | salvato prima della sanitizzazione (difesa storica, dato preesistente o bypass) | rimosso comunque al render (secondo passaggio di sanitizzazione) | N/A, mai eseguito |
| Slug/URL riservato (`/app`, `/api/...`, una delle 5 pagine pubbliche esistenti, rotte di autenticazione) | validazione condivisa | rifiutato | `VALIDATION` |
| Slug già in uso da un'altra `PaginaPubblica` | vincolo `@unique` | rifiutato | `VALIDATION` (constraint Prisma tradotto in messaggio esplicito) |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- nuovo model `PaginaPubblica` (`id`, `slug` `@unique` - formato assoluto tipo `/storia-societa`, stesso di `VoceMenuPubblico.url` per le rotte interne -, `titolo`, `contenutoHtml` `@db.Text`, `createdAt`, `updatedAt`), `@@map("pagine_pubbliche")` - stesso trattamento AD-9 di `VoceMenuPubblico` (RLS abilitata senza policy + REVOKE, accesso solo Prisma diretto)
- **Nuova migrazione** `prisma/migrations/<timestamp>_add_pagina_pubblica/migration.sql` -- `CREATE TABLE` + `ENABLE ROW LEVEL SECURITY` + `REVOKE ALL ... FROM anon, authenticated` (mirror esatto di `20260819000000_add_voce_menu_pubblico`, Story 19.6) - nessun seed (a differenza di `VoceMenuPubblico`, non esistono pagine "attuali" da migrare)
- `lib/auth/route-guard.ts` -- nuova funzione esportata `rottaRiservata(pathname: string): boolean` (`"/app"`/`"/app/*"`, `"/api/*"`, `isPublicRoute(pathname)` - riusa `isPublicRoute` già esportata, unica fonte di verità, nessuna seconda lista) - file già privo di `"server-only"` (Story 12.3), sicuro da importare sia da Server Action sia da un futuro consumer client
- **Nuovo file** `lib/pagine-pubbliche.ts` -- `elencaPaginePubbliche()`, `trovaPaginaPubblicaPerSlug(slug)` (usata dalla rotta catch-all), mirror strutturale di `lib/menu-pubblico.ts` - nessuna scrittura qui (arriva con 19.10)
- **Nuovo file** `lib/sanitizza-html.ts` -- wrapper su `isomorphic-dompurify` ([npmjs.com/isomorphic-dompurify](https://www.npmjs.com/package/isomorphic-dompurify)), allowlist esplicita di tag coerente con la toolbar Tiptap della 19.10 (h2/h3/p/strong/em/ul/ol/li/a/img/br) - **nuova dipendenza**, prima introduzione di sanitizzazione HTML in questo progetto
- **Nuovo file** `app/[...slug]/page.tsx` -- rotta catch-all a livello radice (sibling di `app/page.tsx`), `params: Promise<{ slug: string[] }>` (Next.js di questo progetto: `params` è una Promise, va `await`-ato - vedi `app/app/(sponsor)/sponsor/[id]/voucher/page.tsx` per il pattern già in uso), ricostruisce il path (`"/" + slug.join("/")`), `trovaPaginaPubblicaPerSlug`, `notFound()` se assente, altrimenti `<HeaderPubblico/>` + contenuto sanitizzato (`dangerouslySetInnerHTML`, **prima occorrenza nel progetto**) + `<FooterPubblico/>` - stesso guscio delle altre pagine pubbliche, `dynamic = "force-dynamic"`
- `app/app/(configurazione)/menu-pubblico/actions.ts` -- `urlVoceMenuValido` estesa: per un valore `"/"`-prefissato, aggiungere `&& !rottaRiservata(valore)` - oggi un Site Manager può salvare una voce di menu con un URL riservato senza alcun avviso (gap preesistente dalla 19.7, chiuso qui)
- `app/app/(configurazione)/menu-pubblico/actions.test.ts` -- nuovo test per il rifiuto di un URL riservato

**Gap scoperto in fase di implementazione (non nel Code Map originale, vedi Spec Change Log sotto):**
- **Nuovo file** `lib/auth/pagine-pubbliche-slug-cache.ts` -- `paginaPubblicaEsistePerSlug(slug)` edge-safe (Supabase REST via `createAdminClient`, mirror di `lib/auth/permessi-configurabili.ts`, cache TTL 90s), `invalidaCachePaginePubbliche()` per la 19.10
- **Nuova migrazione** `prisma/migrations/20260820010000_grant_pagine_pubbliche_service_role/migration.sql` -- `GRANT SELECT ON pagine_pubbliche TO service_role` (mirror di `20260804010000_grant_permessi_rotte_service_role`)
- `lib/auth/route-decision.ts` -- `getRouteDecision` consulta `paginaPubblicaEsistePerSlug` (solo per pathname non `rottaRiservata`) prima del redirect a `/accedi`, altrimenti un Visitatore anonimo verso una PaginaPubblica nuova verrebbe login-wallato prima di raggiungere `app/[...slug]/page.tsx`
- `lib/auth/route-decision.test.ts`, `lib/auth/pagine-pubbliche-slug-cache.test.ts`, `lib/auth/route-guard.test.ts`, `lib/pagine-pubbliche.test.ts`, `lib/sanitizza-html.test.ts` -- nuovi/estesi test di copertura

## Tasks & Acceptance

**Execution:**
- [x] `schema.prisma` -- nuovo model `PaginaPubblica`
- [x] migrazione -- `CREATE TABLE` + RLS/REVOKE (nessun seed)
- [x] `route-guard.ts` -- `rottaRiservata()`, riusa `isPublicRoute` esistente
- [x] `lib/pagine-pubbliche.ts` -- lettura (elenco + per-slug)
- [x] `lib/sanitizza-html.ts` -- wrapper `isomorphic-dompurify`, allowlist esplicita
- [x] `app/[...slug]/page.tsx` -- rotta catch-all, sanitizzazione al render, `notFound()` su assenza
- [x] `menu-pubblico/actions.ts` -- `urlVoceMenuValido` rifiuta una rotta riservata
- [x] (gap scoperto) `lib/auth/pagine-pubbliche-slug-cache.ts` + grant `service_role` + `route-decision.ts` -- senza questo AC #1 non funziona per un Visitatore anonimo, vedi Spec Change Log

**Acceptance Criteria:** vedi epics.md Story 19.9 (5 AC, verbatim - non duplicati qui per evitare due fonti di verità che possono disallinearsi).

## Spec Change Log

- **2026-08-20 (implementazione):** Code Map esteso oltre l'originale - il Proxy (`middleware.ts` → `lib/auth/route-decision.ts`) reindirizza a `/accedi` ogni pathname non elencato in `PUBLIC_ROUTES` quando l'utente non è autenticato, indipendentemente dal fatto che quel pathname sia effettivamente protetto (stesso meccanismo, con lo stesso identico sintomo, già corretto in Story 18.7 per `/squadre`/`/calendario`/`/staff`/`/contatti`). Senza un intervento anche qui, un Visitatore anonimo che apre l'URL di una PaginaPubblica appena creata verrebbe reindirizzato al login PRIMA di raggiungere `app/[...slug]/page.tsx`, violando AC #1 per il suo caso d'uso primario (un Visitatore, non un Utente autenticato). A differenza delle 5 rotte statiche di Story 18.7, lo slug di una PaginaPubblica non è noto in anticipo (creato a runtime da un Site Manager/Admin, Story 19.10) e non può essere aggiunto a mano a `PUBLIC_ROUTES`. Risolto riusando lo stesso pattern già stabilito per `permessi_rotte` (Story 12.4): una query edge-safe via Supabase REST (`service_role`, mai Prisma - il Proxy gira su runtime edge, `@opennextjs/cloudflare` non supporta Prisma/pg lì) con cache TTL 90s, guardata da `rottaRiservata()` per non interrogare mai il database per un pathname sotto `/app`/`/api`. Nessuna decisione di ampiezza/UX toccata (Boundaries invariate) - solo infrastruttura di autorizzazione necessaria a far funzionare l'AC già approvato. Non presente nel Code Map originale perché non individuato in fase di analisi/party mode.
- **2026-08-20 (code review, 3 layer paralleli - Blind Hunter, Edge Case Hunter, Verification Gap):** 1 **intent_gap** trovato e risolto con l'utente (root cause dentro `<frozen-after-approval>`): il Boundary "Always" ("un tentativo di... aggiornare... una voce di menu esistente... con uno slug/URL che collide con una rotta riservata... viene rifiutato") combinato con `rottaRiservata()` che riusa `isPublicRoute()` (unica fonte di verità, richiesta esplicita della spec) causava una regressione reale: risalvare una delle 5 voci `VoceMenuPubblico` seedate (Story 19.6) col proprio url invariato (es. cambiare solo l'etichetta di "Squadre") veniva rifiutato come "riservato", perché `isPublicRoute()` copre anche le 5 pagine pubbliche legittime, non solo le rotte davvero interne. **KEEP**: `rottaRiservata()` continua a riusare `isPublicRoute()` come unica fonte di verità (nessuna seconda lista) - non toccata. **Risolto** (scelta dell'utente tra due opzioni proposte): `urlVoceMenuValido`/`validaCampi` (`menu-pubblico/actions.ts`) accettano ora un `urlAttuale` opzionale (l'url già salvato per quella voce, letto da una nuova `trovaVoceMenuPubblicoPerId` in `lib/menu-pubblico.ts` prima della validazione in `aggiornaVoceMenuPubblicoAction`) - un url identico a quello già salvato è esentato da `rottaRiservata()`, un NUOVO url riservato resta sempre rifiutato sia in creazione sia in modifica. Deviazione minima e locale dal Code Map originale (nessuna riscrittura architetturale necessaria), non ha richiesto un revert completo. 5 **patch** applicati (auto-fix, verificati con la suite completa dopo l'applicazione): (1) typo commento `schema.prisma` "contentutoHtml" → "contenutoHtml"; (2) `sanitizzaHtml` non forzava `rel="noopener noreferrer"` su un `<a target="_blank">` (reverse tabnabbing) - hook DOMPurify aggiunto; (3) `rottaRiservata()` non riconosceva "/api" esatto (solo "/api/*") - allineato al trattamento di "/app"; (4) `getRouteDecision` interrogava `paginaPubblicaEsistePerSlug` anche per un Utente già autenticato (il cui esito non dipende mai da quel risultato) - riordinato dietro `!isAuthenticated`; (5) **il finding più grave delle 3 review, trovato indipendentemente da Verification Gap Reviewer e Blind Hunter**: nessun test esercitava la riga che applica `sanitizzaHtml` al render in `app/[...slug]/page.tsx` (prima occorrenza di `dangerouslySetInnerHTML` nel progetto) - una regressione a un solo token (render del contenuto grezzo invece di quello sanitizzato) sarebbe passata con la suite tutta verde. Risolto estraendo la chiamata in una nuova `contenutoSanitizzatoPaginaPubblica` (`lib/pagine-pubbliche.ts`, mirror del principio già seguito da `lib/sanitizza-html.ts`: logica di sicurezza fuori dal componente React, dove resta unit-testabile senza `@testing-library/react`, mai usata in questo progetto), con un test dedicato. 9 **defer** loggati in `deferred-work.md` (cache fail-closed senza fallback su stantio, nessun timeout/dedup sulla query Supabase REST, `invalidaCachePaginePubbliche` non ancora invocata da nessuno, nessuna FK PaginaPubblica↔VoceMenuPubblico, nessun limite dimensione `contenutoHtml`, nessuna normalizzazione slug, copertura test XSS aggiuntiva, verifica runtime `isomorphic-dompurify` sotto Cloudflare Workers non ancora fatta, nessun metadata SEO) - nessuno bloccante per questa storia, tutti o pre-esistenti nel pattern mirrorato o esplicitamente fuori scope (Story 19.10/futuro). 3 **reject** (falsi positivi o rumore, scartati dopo verifica diretta: un commento che già documentava l'uso futuro di `elencaPaginePubbliche` era stato segnalato come mancante; il rischio di finestra di rollout tra le due migrazioni è mitigato da come il progetto applica davvero le migrazioni, `prisma migrate deploy` in un solo comando; una nota generica su AGENTS.md senza un difetto concreto associato). Verifica finale dopo tutti i fix: `npx vitest run` 1346/1346 (+7), `npx tsc --noEmit` pulito, `npm run lint` 0 errori (19 warning preesistenti invariati), `npm run build` riuscita (`/[...slug]` presente, nessuna regressione di shape sulle rotte esistenti).

## Verification

**Commands:**
- `npx vitest run` (dalla root del repo) -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione sulle rotte esistenti, `/[...slug]` compare come nuova rotta dynamic

**Manual checks (if no CLI):**
- Dopo il deploy (migrazione applicata, almeno una `PaginaPubblica` creata via 19.10): l'URL corrispondente mostra il contenuto; un URL senza corrispondenza resta 404; un tentativo di salvare una voce di menu con URL `/app` o `/accedi` viene rifiutato

## Suggested Review Order

**La sanitizzazione (il punto più a rischio - prima introduzione di `dangerouslySetInnerHTML`)**

- Entry point: chiama `contenutoSanitizzatoPaginaPubblica`, mai `pagina.contenutoHtml` grezzo.
  [`[...slug]/page.tsx:47`](../../app/[...slug]/page.tsx#L47)

- Estratta apposta per essere testabile (fix review, era il finding più grave delle 3 review: nessun test esercitava questa riga).
  [`pagine-pubbliche.ts:36`](../../lib/pagine-pubbliche.ts#L36)

- Hook DOMPurify che forza `rel="noopener noreferrer"` su `target="_blank"` (fix review, reverse tabnabbing).
  [`sanitizza-html.ts:45`](../../lib/sanitizza-html.ts#L45)

**Il fix dell'intent_gap (validazione URL delle voci di menu)**

- `urlAttuale` esenta da `rottaRiservata()` un url identico a quello già salvato per la voce - risolve la regressione su "risalva una delle 5 voci seedate senza cambiarne l'url".
  [`menu-pubblico/actions.ts:62-65`](../../app/app/(configurazione)/menu-pubblico/actions.ts#L62)

**Gli URL riservati e il gate del Proxy (unica fonte di verità, non una seconda lista)**

- `rottaRiservata()` riusa `isPublicRoute`/il prefisso `/app`/`/api` (fix review: ora anche "/api" esatto, non solo "/api/*").
  [`route-guard.ts:488`](../../lib/auth/route-guard.ts#L488)

- Integrazione nel Proxy - verificare che un Utente già autenticato non attivi mai questo ramo (fix review: riordinato dietro `!isAuthenticated`).
  [`route-decision.ts:91-98`](../../lib/auth/route-decision.ts#L91)

- Lettura edge-safe via Supabase REST (mai Prisma, il Proxy gira su runtime edge) con cache TTL 90s - fail-closed su errore.
  [`pagine-pubbliche-slug-cache.ts:51`](../../lib/auth/pagine-pubbliche-slug-cache.ts#L51)

**Schema e migrazioni (periferici)**

- Nuovo model, RLS abilitata senza policy + REVOKE (mirror `VoceMenuPubblico`), nessuno stato bozza/pubblicato.
  [`schema.prisma:764`](../../prisma/schema.prisma#L764)
