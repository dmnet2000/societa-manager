---
baseline_commit: 12ef8bf
---

# Story 18.7: Menu di navigazione multi-pagina

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Visitatore del sito pubblico,
I want un menu di navigazione nell'header con le sezioni del sito,
so that possa raggiungere direttamente Squadre, Calendario, Staff e Contatti senza restare vincolato alla sola home.

## Acceptance Criteria

1. **Given** un Visitatore su qualunque pagina pubblica **When** guarda l'header **Then** vede un menu con le voci Home, Squadre, Calendario, Staff, Contatti, oltre al link "Accedi" già esistente (Story 18.1 AC #7).
2. **And** ogni voce porta alla pagina corrispondente (`/`, `/squadre` Story 18.8, `/calendario` Story 18.9, `/staff` Story 18.10, `/contatti` Story 18.11).
3. **And** la voce della pagina corrente è visivamente distinguibile dalle altre (stato attivo).
4. **And** su schermi stretti (mobile) il menu resta interamente utilizzabile — nessuna voce tagliata o irraggiungibile.

## Tasks / Subtasks

- [x] Task 1: Componente client riusabile `NavPubblica.tsx` (AC: #1, #2, #3)
  - [x] Nuovo `app/NavPubblica.tsx` (`"use client"`) — mirror del pattern "Server page + isola Client Component per lo stato/interattività" già stabilito in questo file da `CookieBanner.tsx` (Story 18.6). **Non** un secondo componente Server: lo stato attivo richiede `usePathname()` (`next/navigation`), che solo un Client Component può chiamare — `app/page.tsx` resta un Server Component (`force-dynamic`, legge `cookies()`/Prisma direttamente), non può calcolarlo da sé.
  - [x] Elenco voci **hard-coded nel componente** (non derivato da `PUBLIC_ROUTES`, che è un semplice array di stringhe senza `navLabel` — vedi Dev Notes): `[{ href: "/", label: "Home" }, { href: "/squadre", label: "Squadre" }, { href: "/calendario", label: "Calendario" }, { href: "/staff", label: "Staff" }, { href: "/contatti", label: "Contatti" }]`.
  - [x] Stato attivo: `const pathname = usePathname()`, confronto `pathname === voce.href` (nessuna logica di prefisso necessaria per 5 route piatte e mutuamente esclusive, a differenza di `isVoceAttiva` in `NavBarClient.tsx` che gestisce prefissi annidati sotto `/app`) — voce attiva marcata con `aria-current="page"` e una classe CSS dedicata (`.voceAttiva`), stesso principio di `NavBarClient.tsx` righe 322-329, senza copiarne la gestione dei prefissi (non necessaria qui).
  - [x] Riusabile as-is dalle Story 18.8-18.11 quando quelle pagine esisteranno: ogni pagina futura monta lo stesso `<NavPubblica />` nel proprio header e ottiene lo stato attivo corretto in modo indipendente (nessun problema di staleness da layout condiviso — a differenza di `NavBarClient.tsx`, montato una sola volta nel root layout autenticato, qui ogni pagina pubblica re-monta il componente al proprio caricamento).

- [x] Task 2: Integrazione nell'header di `app/page.tsx` (AC: #1, #2)
  - [x] `app/page.tsx`: importare `NavPubblica` e montarlo dentro `<header>`, tra `.brand` e il link "Accedi" esistente (AC #1: "oltre al link Accedi già esistente" — Accedi resta un elemento separato, non una sesta voce del menu).
  - [x] Nessuna nuova lettura dati necessaria (nessuna query, nessun `Promise.all` da estendere) — le voci sono statiche, lo stato attivo è calcolato lato client.

- [x] Task 3: Stile e comportamento mobile (AC: #4)
  - [x] Nuove classi in `app/home-pubblica.module.css` (non un nuovo modulo — stesso principio già stabilito nel progetto, un CSS module per pagina, il componente client riusa il modulo della pagina che lo monta, stesso schema di `CookieBanner.tsx`/`CookieBanner.module.css`... **eccezione qui**: siccome `NavPubblica` sarà rimontato da più pagine pubbliche future (18.8-18.11, ciascuna con il proprio CSS module), le sue classi vanno in un **nuovo file dedicato `app/NavPubblica.module.css`**, non in `home-pubblica.module.css` — altrimenti le pagine future dovrebbero importare un modulo CSS con un nome che non descrive la propria pagina, o duplicare le classi. Vedi Dev Notes.
  - [x] **Decisione presa con l'utente (2026-08-13)**: nessun drawer/hamburger (a differenza della NavBar interna autenticata, Story 9.2, pensata per un elenco più lungo e ruolo-dipendente) — elenco orizzontale con `flex-wrap: wrap`, le voci vanno semplicemente a capo su schermi stretti. Soddisfa l'AC #4 nel modo più diretto, nessuno stato di apertura/chiusura da gestire, nessun nuovo pattern di interazione da introdurre nella home pubblica.
  - [x] Touch target 44px sulle voci del menu (lezione già documentata nel progetto — `min-height` sul contenitore non basta se il figlio cliccabile non riempie l'altezza dichiarata, va applicato direttamente al link `<Link>`, mirror di `.accedi` già presente in `home-pubblica.module.css`).
  - [x] Nessun nuovo breakpoint `@media` necessario per il solo wrap (il flex-wrap funziona senza breakpoint) — se in fase di sviluppo si osserva che l'header nel suo insieme (`.header`, `justify-content: space-between`) diventa troppo affollato su schermi molto stretti insieme a brand+Accedi, valutare se serve un `@media` dedicato prima di introdurlo (nessun AC lo impone a priori).

- [x] Task 4: Test (AC: tutti)
  - [x] Nessun test diretto su `NavPubblica.tsx`/`app/page.tsx` (convenzione consolidata del progetto, nessun componente di rendering ne ha — stesso limite già accettato per `NavBarClient.tsx`/`CookieBanner.tsx`).
  - [x] Se l'elenco voci viene estratto in una costante esportata (es. `VOCI_NAV_PUBBLICA`) invece di restare inline nel componente, valutare un test di coerenza leggero (es. "ogni href inizia con /") — non obbligatorio, a discrezione dello sviluppo.
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

### Review Findings

- [x] [Review][Patch] Bug reale: le 4 rotte del menu (`/squadre`, `/calendario`, `/staff`, `/contatti`) reindirizzavano un Visitatore anonimo a `/accedi` invece di mostrare la 404 prevista [lib/auth/route-guard.ts, PUBLIC_ROUTES] — trovato indipendentemente da Blind Hunter ed Edge Case Hunter. Il piano originale (Dev Notes) assumeva "nessuna pagina esiste ancora, un click produce un 404", ma senza queste 4 rotte in `PUBLIC_ROUTES`, `getRouteDecision` (`lib/auth/route-decision.ts`) le tratta come protette e reindirizza chiunque non sia autenticato a `/accedi` — un login-wall silenzioso su un menu che promette contenuto pubblico, peggiore del 404 originariamente previsto. Risolto: le 4 rotte aggiunte a `PUBLIC_ROUTES` **in questa storia** (deviazione dal piano, che le rimandava esplicitamente alle Story 18.8-18.11) — nessuna pagina esiste ancora dietro questi path, ma ora il Proxy lascia passare la richiesta e Next.js mostra la propria 404 predefinita (nessun `app/not-found.tsx` personalizzato nel progetto), lo stesso comportamento già atteso dalla story. Aggiunto anche un test parametrico in `lib/auth/route-decision.test.ts` (mirror del test già esistente per `"/"`).
- [x] [Review][Patch] Bug CSS: `.voce:hover` (specificità classe+pseudo-classe) vinceva su `.voceAttiva` (una sola classe) indipendentemente dall'ordine nel file — passando il mouse sulla voce attualmente attiva, il colore tornava a quello di hover generico, lasciando solo la sottolineatura a indicare lo stato attivo (AC #3 indebolito durante l'hover) [app/NavPubblica.module.css] — trovato dall'Edge Case Hunter. Risolto: aggiunta `.voceAttiva:hover { color: var(--color-button-bg); }`.
- [x] [Review][Defer] Nessuna verifica visiva reale (screenshot/test dal vivo) del comportamento di doppio wrap (`.header` + `.lista`) su schermo stretto — deferred, nessuno strumento di verifica visiva disponibile in questo sandbox, demandato all'utente come per ogni altra verifica dal vivo del progetto.
- [x] [Review][Defer] `<Link>` prefetcha di default le 4 rotte che oggi non hanno una pagina reale dietro — traffico di prefetch verso pagine inesistenti (ora un 404 reale invece di un redirect, grazie al patch sopra) fino a quando le Story 18.8-18.11 non le costruiscono — nessun AC lo vieta, costo minimo e temporaneo.
- [x] [Review][Defer] Doppia fonte di verità per le 4 rotte future: l'array `VOCI` hard-coded in `NavPubblica.tsx` e `PUBLIC_ROUTES` in `route-guard.ts` devono restare sincronizzati a mano, nessun collegamento tipizzato tra i due — deferred, stesso livello di accoppiamento manuale già accettato altrove nel progetto tra elenchi correlati non derivati l'uno dall'altro.
- [x] [Review][Defer] `font-size: 13.5px` in `.voce` senza riferimento a un token DESIGN.md, diverso dal vicino `.accedi` (12.5px) nello stesso header — deferred, nessun token di dimensione font esiste in DESIGN.md per questo contesto, stesso livello di libertà già preso altrove nel progetto per valori non coperti da token.
- [x] [Review][Dismiss] "1 voce su 5 del menu (Home) non porta mai a contenuto nuovo, oggi" — comportamento corretto e atteso: l'intero sito pubblico è oggi una sola pagina, non un difetto di questa storia.
- [x] [Review][Dismiss] Nessun test per la logica di stato attivo (`pathname === voce.href`) — convenzione consolidata del progetto (nessun componente di rendering ne ha, `NavBarClient.tsx`/`CookieBanner.tsx` inclusi), già dichiarata esplicitamente nel Task 4 della story.
- [x] [Review][Dismiss] Flash iniziale senza stato attivo prima dell'hydration — conseguenza intrinseca e accettata del pattern Server+Client già in uso nel progetto (`CookieBanner.tsx`), non introdotta da questa storia.
- [x] [Review][Dismiss] Commento CSS "scollegato" tra `.header` e `.brand` in `home-pubblica.module.css` — verificato: il commento fa esplicito riferimento a "(sopra)", leggibile e corretto, nessun problema reale.
- [x] [Review][Dismiss] Ordine di tabulazione cambiato (5 nuovi link tra logo e Accedi) — conseguenza diretta e attesa dell'aggiunta di un menu, non un difetto.
- [x] [Review][Dismiss] Possibile posizionamento anomalo di "Accedi" su una riga isolata in caso di wrap a 3 righe — teorico, nessuno scenario concreto verificabile in questo sandbox, cosmetico anche se si verificasse.

## Dev Notes

### Decisioni di analisi (vedi `epics.md#Epic 18`, Story 18.7)

- **Dipendente da Story 18.1** (done): header pubblico esistente su `app/page.tsx` (solo logo+nome+"Accedi" oggi).
- **Fondativa per le Story 18.8-18.11** (pagine `/squadre`, `/calendario`, `/staff`, `/contatti`, tutte ancora in backlog): questa storia introduce solo la *struttura* del menu — i link a quelle 4 rotte punteranno a pagine che non esistono ancora finché quelle story non vengono implementate. Questo è **atteso e non è un difetto di questa storia** (stesso principio di Epic 15, dove 15.1 era fondativa senza consumer reale) — un click su "Squadre" oggi produrrebbe un 404, comportamento temporaneo accettato esplicitamente nell'epica.
- **Ogni story futura (18.8-18.11) dovrà comunque aggiungere la propria rotta a `PUBLIC_ROUTES`** (`lib/auth/route-guard.ts`) — stesso punto tecnico critico già risolto per `"/"` in Story 18.1 (senza, un Visitatore anonimo che clicca "Squadre" verrebbe reindirizzato a `/accedi` invece di vedere un 404/la pagina). **Questa storia non tocca `PUBLIC_ROUTES`**: nessuna delle 4 rotte esiste ancora, aggiungerle ora sarebbe prematuro (nessuna pagina dietro cui reindirizzare) — resta esplicitamente compito di ciascuna story 18.8-18.11.
- **"Accedi" non è una sesta voce del menu**: resta l'elemento separato già esistente dalla Story 18.1 (AC #7), il menu si aggiunge accanto, non lo sostituisce né lo assorbe.

### Perché un nuovo Client Component (`NavPubblica.tsx`), non uno esteso in `app/page.tsx`

`app/page.tsx` è un Server Component (`export const dynamic = "force-dynamic"`, legge `cookies()`/Prisma/Supabase direttamente) — non può chiamare `usePathname()`. Lo stato attivo (AC #3) richiede di sapere su quale pagina ci si trova, e in questo progetto quel calcolo è **sempre** risolto lato client con `usePathname()` (`app/NavBarClient.tsx`, Story 9.10) per un motivo specifico documentato lì: il layout radice resta nella Client Cache di Next.js e non ri-renderizza a ogni navigazione, quindi un valore calcolato lato server diventerebbe stantio dopo il primo caricamento. Quella ragione specifica (layout condiviso persistente) **non si applica 1:1** a questa storia, dato che oggi solo `/` esiste davvero — ma la stessa soluzione (`usePathname()` in un piccolo Client Component) resta la scelta corretta e già collaudata nel progetto, ed è **a prova di futuro** per le Story 18.8-18.11: ciascuna di quelle pagine monterà lo stesso `<NavPubblica />` e otterrà lo stato attivo corretto in modo indipendente al proprio caricamento (nessun problema di staleness da layout condiviso, dato che nessuna di queste pagine pubbliche condivide oggi un layout React con le altre — sono Server Component indipendenti, non route annidate sotto un `layout.tsx` comune).

Pattern diretto da riusare (non reinventare): `app/CookieBanner.tsx` (Story 18.6) — stesso principio "Server page monta un piccolo Client Component per l'unica parte stateful/interattiva", stesso file (`app/page.tsx`) in cui il precedente è già visibile.

### `NavPubblica.module.css` come file dedicato, non dentro `home-pubblica.module.css`

Il progetto segue rigidamente "un CSS module per pagina, mai condiviso" (convenzione stabilita fin da Story 18.2, per la sezione Sponsor). `NavPubblica.tsx` è però un **componente riusabile tra più pagine future** (18.8-18.11 lo monteranno ciascuna nel proprio header), non specifico di `app/page.tsx` — le sue classi vanno quindi nel proprio modulo CSS dedicato (`app/NavPubblica.module.css`), che ogni pagina futura importerà, invece di duplicare le classi in ciascun modulo di pagina o di "prendere in prestito" `home-pubblica.module.css` per un componente che non gli appartiene esclusivamente. Questa è l'unica eccezione alla convenzione "un modulo per pagina" nell'Epic 18 finora, giustificata dal fatto che è la prima volta che un pezzo di UI pubblica è condiviso tra più pagine.

### Pattern da riusare (non reinventare)

- **Split Server page + Client Component per lo stato**: `app/CookieBanner.tsx` (Story 18.6), montato in `app/page.tsx`.
- **Calcolo dello stato attivo**: `app/NavBarClient.tsx` righe 322-329 (`usePathname()` + confronto + `aria-current="page"` + classe dedicata) — qui semplificato: confronto di uguaglianza esatta (`pathname === href`), non la gestione di prefissi annidati di `isVoceAttiva` (non necessaria per 5 route piatte).
- **Touch target 44px**: `.accedi` già in `home-pubblica.module.css` — lezione già documentata nel progetto (min-height sul contenitore non basta se il figlio cliccabile non riempie l'altezza dichiarata), applicare direttamente al `<Link>` di ogni voce.
- **`PUBLIC_ROUTES`**: array di stringhe semplice (non oggetti con `navLabel` come `PROTECTED_ROUTES`) — vedi `lib/auth/route-guard.ts` righe 18-32, commento esplicito: le rotte pubbliche di contenuto "andranno aggiunte qui esplicitamente una per una", non è questa storia a farlo per le 4 rotte non ancora esistenti.

### Project Structure Notes

- Nuovi: `app/NavPubblica.tsx`, `app/NavPubblica.module.css`.
- Modificati: `app/page.tsx` (monta `<NavPubblica />` nell'header).
- Nessuna migrazione DB, nessuna nuova Server Action, nessuna modifica a `lib/auth/route-guard.ts` (le 4 rotte non esistono ancora — compito delle Story 18.8-18.11).

### References

- [Source: app/page.tsx] — header pubblico esistente (Story 18.1) su cui innestare il menu.
- [Source: app/CookieBanner.tsx, Story 18.6] — pattern "Server page + Client Component per lo stato", da riprodurre identico.
- [Source: app/NavBarClient.tsx, righe 56-62 (motivazione usePathname), 322-329 (calcolo voce attiva)] — precedente diretto per lo stato attivo, da semplificare (nessuna gestione di prefissi necessaria).
- [Source: lib/auth/route-guard.ts, righe 18-32] — struttura di `PUBLIC_ROUTES`, motivo per cui questa storia non la modifica.
- [Source: app/home-pubblica.module.css] — token/convenzioni CSS esistenti della home pubblica, `.accedi` come mirror per il touch target.
- [Source: epics.md#Epic 18: Sito pubblico Settore Volley, Story 18.7] — testo originale dell'epica, note sulla scelta delle 5 voci (Squadre/Calendario/Staff/Contatti, News esclusa perché coperta dall'embed social Story 18.5).

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

### Completion Notes List

- Implementazione seguita esattamente come pianificato in fase di analisi, nessuna deviazione. `NavPubblica.tsx` semplifica correttamente `isVoceAttiva` (confronto di uguaglianza esatta, non gestione di prefissi — 5 rotte piatte, nessuna annidata).
- **Aggiunta non esplicitamente prevista dal piano ma necessaria per l'AC #4**: `flex-wrap: wrap` aggiunto a `.header` (`app/home-pubblica.module.css`) oltre al wrap già previsto internamente al menu (`.lista` in `NavPubblica.module.css`) — senza, con brand + menu (5 voci) + Accedi tutti sulla stessa riga flex, uno schermo molto stretto non avrebbe abbastanza spazio per i tre gruppi anche se il menu stesso può andare a capo internamente (il contenitore `.header` avrebbe comunque potuto comprimere il menu a una larghezza troppo stretta prima che il wrap interno intervenisse in modo pulito). Nessun impatto visivo su schermi larghi (il wrap non si attiva se tutto entra in una riga).
- Nessuna delle 4 rotte destinazione (`/squadre`, `/calendario`, `/staff`, `/contatti`) esiste ancora — comportamento atteso e documentato nella story, un click su quelle voci produce oggi un 404. Non aggiunta alcuna voce a `PUBLIC_ROUTES` (compito delle Story 18.8-18.11, come da Dev Notes) — **corretto in review, vedi sotto**.
- **Code review completata** (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo) — 0 decision-needed, 2 patch applicati, il più significativo dei quali **contraddice l'assunzione sopra**: senza le 4 rotte in `PUBLIC_ROUTES`, un Visitatore anonimo che clicca una voce del menu veniva reindirizzato a `/accedi` (login-wall silenzioso), non a un 404 come pianificato — trovato indipendentemente da Blind Hunter ed Edge Case Hunter. Risolto aggiungendo le 4 rotte a `PUBLIC_ROUTES` in questa storia (deviazione dal piano originale, che le rimandava alle Story 18.8-18.11) + 1 test parametrico aggiunto. Secondo patch: bug di specificità CSS (`.voce:hover` vinceva su `.voceAttiva`, indebolendo l'AC #3 durante l'hover). 4 defer (verifica visiva reale del wrap, prefetch di rotte non ancora costruite, doppia fonte di verità VOCI/PUBLIC_ROUTES, font-size non tokenizzato). 6 scartati come rumore/comportamento atteso.
- Verifica: `npx vitest run` (1113/1113 passati, +4 dal fix), `npx tsc --noEmit`, `npm run lint` (0 errori, solo warning `<img>`/`no-img-element` preesistenti), `npm run build` puliti.

### File List

- Nuovi: `app/NavPubblica.tsx`, `app/NavPubblica.module.css`.
- Modificati: `app/page.tsx` (monta `<NavPubblica />` nell'header, tra brand e Accedi), `app/home-pubblica.module.css` (`flex-wrap: wrap` su `.header`, non previsto esplicitamente nel piano ma necessario per l'AC #4), `lib/auth/route-guard.ts` (review fix: `/squadre`/`/calendario`/`/staff`/`/contatti` aggiunte a `PUBLIC_ROUTES`), `lib/auth/route-decision.test.ts` (review fix: +1 test parametrico per le 4 nuove rotte pubbliche).

## Change Log

- 2026-08-13: File di story creato (create-story workflow) — decisione presa con l'utente in apertura: nessun drawer/hamburger per il menu pubblico, elenco orizzontale con wrap su mobile (a differenza della NavBar interna autenticata, pensata per un elenco più lungo). Stato ready-for-dev.
- 2026-08-13: Implementata (dev-story workflow) - tutti e 4 i Task completati. Nuovo Client Component riusabile `NavPubblica.tsx` (usePathname per lo stato attivo, mirror del pattern `CookieBanner.tsx`) montato in `app/page.tsx`, con `NavPubblica.module.css` dedicato (unica eccezione alla convenzione "un modulo per pagina", giustificata dalla condivisione futura con le Story 18.8-18.11). Aggiunto `flex-wrap: wrap` a `.header` (non esplicitamente previsto nel piano) per garantire l'AC #4 anche su schermi molto stretti. 1109/1109 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: review.
- 2026-08-13: Code review completata (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo). 0 decision-needed. 2 patch applicati: le 4 rotte del menu (`/squadre`/`/calendario`/`/staff`/`/contatti`) aggiunte a `PUBLIC_ROUTES` (trovato indipendentemente da 2 layer - senza, un Visitatore anonimo veniva reindirizzato a `/accedi` invece di vedere il 404 previsto, deviazione dal piano originale che rimandava questa aggiunta alle Story 18.8-18.11), bug di specificità CSS `.voce:hover` vs `.voceAttiva` corretto. 4 defer (verifica visiva reale del wrap, prefetch di rotte non ancora costruite, doppia fonte di verità VOCI/PUBLIC_ROUTES, font-size non tokenizzato). 6 scartati come rumore/comportamento atteso. 1113/1113 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: done.
