---
title: "Story 19.9: Modello dati e rendering pubblico delle Pagine personalizzate"
type: 'feature'
created: '2026-08-19'
status: 'planned'
review_loop_iteration: 0
context: []
baseline_commit: 'HEAD al momento della stesura (post Story 18.22 + fix party mode UI)'
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

## Tasks & Acceptance

**Execution:**
- [ ] `schema.prisma` -- nuovo model `PaginaPubblica`
- [ ] migrazione -- `CREATE TABLE` + RLS/REVOKE (nessun seed)
- [ ] `route-guard.ts` -- `rottaRiservata()`, riusa `isPublicRoute` esistente
- [ ] `lib/pagine-pubbliche.ts` -- lettura (elenco + per-slug)
- [ ] `lib/sanitizza-html.ts` -- wrapper `isomorphic-dompurify`, allowlist esplicita
- [ ] `app/[...slug]/page.tsx` -- rotta catch-all, sanitizzazione al render, `notFound()` su assenza
- [ ] `menu-pubblico/actions.ts` -- `urlVoceMenuValido` rifiuta una rotta riservata

**Acceptance Criteria:** vedi epics.md Story 19.9 (5 AC, verbatim - non duplicati qui per evitare due fonti di verità che possono disallinearsi).

## Spec Change Log

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

- Verificare che avvenga DAVVERO al render, non solo al salvataggio - un dato scritto prima di questa storia (impossibile) o tramite un bypass futuro deve restare innocuo.
  [`app/[...slug]/page.tsx`](../../app/[...slug]/page.tsx)

**Gli URL riservati (unica fonte di verità, non una seconda lista)**

- `rottaRiservata()` deve riusare `isPublicRoute`/il prefisso `/app`, non duplicare l'elenco.
  [`route-guard.ts`](../../lib/auth/route-guard.ts)

**Il gap preesistente chiuso qui**

- `urlVoceMenuValido` esteso - verificare che non rompa i valori legittimi già in uso (le 5 voci del seed 19.6 puntano tutte a pagine pubbliche reali, non riservate secondo questa nuova definizione).
  [`menu-pubblico/actions.ts`](../../app/app/(configurazione)/menu-pubblico/actions.ts)
