---
baseline_commit: 51efe3165f9bef9615d514016b0c33391024fd12
---

# Story 18.18: Rivedere il menu di navigazione pubblica su mobile — le voci vanno a capo su due righe

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Decisione presa con l'utente prima di scrivere questa storia

`epics.md` lasciava esplicitamente aperta la direzione da scegliere (riapriva una decisione già presa due volte, Story 18.7/18.12: "nessun drawer/hamburger, elenco orizzontale con wrap"). **Chiesto all'utente**, che ha scelto: **hamburger/drawer**, stesso pattern già usato dalla NavBar interna autenticata (`app/NavBarClient.tsx`, Story 9.2) — non riaprire questa scelta durante lo sviluppo.

## Story

As a Visitatore da smartphone,
I want che il menu di navigazione dell'header (Home, Squadre, Calendario, Staff, Contatti, Accedi) resti leggibile e ordinato,
so that non veda le voci spezzate su due righe in modo disordinato.

## Acceptance Criteria

1. **Given** un Visitatore su uno smartphone (larghezza schermo stretta, es. 360-390px) **When** visita qualunque pagina pubblica **Then** le 5 voci del menu (Home/Squadre/Calendario/Staff/Contatti) sono nascoste dietro un pulsante hamburger, non più in linea nell'header — nessuna voce spezzata su più righe.
2. **And** toccando l'hamburger si apre un pannello con le 5 voci in colonna; toccandolo di nuovo (o toccando Esc da tastiera) si richiude.
3. **And** ogni voce di menu e il pulsante hamburger mantengono un target di tocco minimo 44×44px.
4. **And** la voce della pagina corrente resta visivamente distinguibile dalle altre (stato attivo, invariato da Story 18.7 AC #3).
5. **And** su desktop (larghezza ≥ 901px, stesso breakpoint 900px già in uso nel resto del registro pubblico) il menu resta orizzontale in linea come oggi, nessun hamburger visibile — nessuna regressione.
6. **And** il pulsante "Accedi" resta un elemento separato dal menu hamburger, sempre visibile nell'header (invariato da Story 18.1 AC #7, non diventa una sesta voce nel drawer).
7. **And** nessuna regressione sulle altre pagine pubbliche che montano lo stesso `NavPubblica.tsx` (`/`, `/squadre`, `/calendario`, `/staff`, `/contatti`).

## Tasks / Subtasks

- [x] Task 1: `NavPubblica.tsx` — stato aperto/chiuso e rilevamento desktop/mobile (AC: #1, #2, #5)
  - [x] `useState<boolean>` `aperto` (default `false`).
  - [x] Rilevamento desktop via `useSyncExternalStore` + `matchMedia`, mirror di `NavBarClient.tsx` (3 funzioni), breakpoint `(min-width: 901px)`.
  - [x] Nessuna riproduzione della complessità aggiuntiva di `NavBarClient.tsx` (overlay/scroll-lock/menuProfilo/gruppi/reset su pathname) — non necessaria qui.
  - [x] Rendering condizionale `{(desktop || aperto) && <ul>...</ul>}`.
  - [x] `<button>` hamburger con `aria-expanded`/`aria-controls="nav-pubblica-lista"`/`aria-label` dinamico.
  - [x] `id="nav-pubblica-lista"` sul `<ul>`.
  - [x] Ogni `<Link>` chiude il pannello al click (`onClick={() => setAperto(false)}`).
  - [x] Esc chiude il pannello (`useEffect` mirror di `NavBarClient.tsx`).

- [x] Task 2: `NavPubblica.module.css` — hamburger + pannello dropdown (AC: #1, #3, #5)
  - [x] `.hamburger`: nascosto di default, `display: inline-flex` sotto `max-width: 900px`, touch target esplicito 44×44, `:focus-visible` outline bianco.
  - [x] `.lista` sotto `max-width: 900px`: colonna, `position: absolute` ancorata all'header, sfondo/bordo mirror di `.header`, `.voce` a `width: 100%`.
  - [x] `.lista` fuori dal breakpoint invariata (AC #5).

- [x] Task 3: `HeaderPubblico.module.css` — contesto di posizionamento (AC: #1)
  - [x] `position: relative` aggiunto a `.header`, nessun altro cambio al file.

- [x] Task 4: Verifica AC #4/#6/#7 — nessuna regressione (AC: #4, #6, #7)
  - [x] `.voceAttiva` non toccata, identica in riga (desktop) e colonna (mobile).
  - [x] `.accedi` non toccato, resta separato dal drawer.
  - [x] Nessuna delle 5 page.tsx pubbliche toccata — tutte montano `<HeaderPubblico>` invariato.

- [x] Task 5: Test e verifica finale (AC: tutti)
  - [x] Confermato: nessun test importa `NavPubblica.tsx`/`HeaderPubblico.tsx` (solo un commento in `route-decision.test.ts`, non un import).
  - [x] `npx vitest run` (1182/1182), `npx tsc --noEmit` (0 errori), `npm run lint` (0 errori, warning preesistenti invariati), `npm run build` (riuscita, tutte le rotte pubbliche presenti nell'output).

## Dev Notes

### Perché hamburger/drawer qui è più semplice del drawer interno

`app/NavBarClient.tsx` (Story 9.2) gestisce una sidebar a piena altezza con contenuto ruolo-dipendente (gruppi espandibili, menu profilo, form di logout) montata in un layout persistente — richiede overlay, blocco scroll, reset su cambio pathname, `inert` per una transizione di scorrimento. `NavPubblica.tsx` qui è un pannello dropdown con 5 link piatti, rimontato da zero ad ogni pagina pubblica (nessun layout condiviso). **Riusare il solo pattern di rilevamento desktop/mobile** (`useSyncExternalStore`+`matchMedia`, già scritto e già passato per code review in Story 9.2) — non l'intera complessità del componente. Vedi Task 1 per il dettaglio di cosa NON serve riprodurre.

### Perché 901px e non 880px

880px è il breakpoint del portale interno (`NavBar.module.css`, Story 9.2), scelto lì per una barra laterale di 220px + contenuto. Il registro pubblico "Poster Sportivo" (Story 18.9-18.16) usa già **900px** in 5 file CSS diversi come confine mobile/desktop — questa storia usa lo stesso breakpoint (`min-width: 901px` per "desktop", equivalente a `max-width: 900px` per "mobile"), non introduce un terzo valore.

### `NavPubblica` non vive in un layout condiviso — verificato, non assunto

`app/layout.tsx` (root) non monta `HeaderPubblico`/`NavPubblica` — ogni `page.tsx` pubblico lo fa singolarmente (`app/page.tsx`, `app/squadre/page.tsx`, ecc.). Questo significa che `NavPubblica` è un'istanza React nuova ad ogni navigazione tra pagine pubbliche, quindi lo stato locale `aperto` si azzera da solo — a differenza di `NavBarClient.tsx`, che vive nel layout autenticato persistente e per questo necessita di logica esplicita di reset su cambio `pathname` (Story 9.2/9.4). Non aggiungere quella logica qui, sarebbe codice morto.

### Cosa NON cambia in questa storia

Nessuna modifica a `.voce`/`.voceAttiva`/`.voce::after` (hover/stato attivo, Story 18.7 AC #3) fuori dal nuovo breakpoint mobile. Nessuna modifica a `.accedi`/`.brand`/`.logo`/`.nomeSettore` in `HeaderPubblico.module.css` (solo aggiunta `position: relative` a `.header`, Task 3). Nessuna modifica a `app/NavBarClient.tsx`/`NavBar.module.css` (portale interno, invariato). Nessuna nuova Server Action, nessuna migrazione.

### Project Structure Notes

- Nessun file nuovo creato.
- File modificati: `app/NavPubblica.tsx`, `app/NavPubblica.module.css`, `app/HeaderPubblico.module.css`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 18, Story 18.18] — testo originale, punto aperto (direzione da scegliere) risolto con l'utente prima di questa storia (hamburger/drawer).
- [Source: app/NavBarClient.tsx, app/NavBar.module.css] — pattern hamburger/drawer di riferimento (Story 9.2), in particolare `useSyncExternalStore`+`matchMedia` per il rilevamento desktop/mobile, riusato qui in forma ridotta.
- [Source: app/NavPubblica.tsx, app/NavPubblica.module.css] — componente da modificare, invariato da Story 18.7/18.12 fino ad ora.
- [Source: app/HeaderPubblico.tsx, app/HeaderPubblico.module.css] — contenitore che monta `NavPubblica` tra `.brand` e `.accedi` (Story 18.1 AC #7, non riaperta).
- [Source: app/layout.tsx] — conferma che nessun layout condiviso monta `HeaderPubblico`/`NavPubblica`, motivazione del Dev Note sopra.
- [Source: app/home-pubblica.module.css, app/calendario/calendario.module.css, app/contatti/contatti.module.css, app/squadre/squadre.module.css, app/staff/staff.module.css] — breakpoint `max-width: 900px` già stabilito nel registro pubblico, riusato qui.
- [Source: AGENTS.md, root del repo] — nota su Next.js non standard, non sostanzialmente applicabile (nessuna modifica a routing/Server Action).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (dev-story workflow)

### Debug Log References

Nessuno - implementazione lineare, nessun blocco/HALT incontrato.

### Completion Notes List

- Tutti e 5 i Task completati esattamente come pianificato, nessuna deviazione.
- `NavPubblica.tsx`: aggiunto stato `aperto` + rilevamento desktop/mobile via `useSyncExternalStore`/`matchMedia` (mirror ridotto di `NavBarClient.tsx`, Story 9.2 — riusato solo il pattern di rilevamento, non l'overlay/scroll-lock/menuProfilo/gruppi/reset-su-pathname, non necessari per un pannello dropdown con 5 link piatti rimontato da zero ad ogni pagina pubblica). Rendering condizionale `{(desktop || aperto) && <ul>...}` invece di `inert` (mirror di `.menuProfiloTendina`, nessuna transizione CSS da preservare qui).
- `NavPubblica.module.css`: nuova `.hamburger` (nascosta su desktop, 44×44 esplicito, visibile sotto 900px), `.lista` ridefinita in colonna/dropdown assoluto sotto 900px (fuori da quel breakpoint invariata, AC #5).
- `HeaderPubblico.module.css`: solo `position: relative` aggiunto a `.header` (contesto di ancoraggio per il dropdown), nessun altro cambio.
- Breakpoint 901px/900px scelto per coerenza con gli altri 5 file CSS del registro pubblico, non 880px del portale interno (motivato nei Dev Notes).
- 1182/1182 test Vitest passati (nessun test esistente importava i file toccati, solo un commento non-import in `route-decision.test.ts`), 0 errori tsc/eslint (warning preesistenti invariati), build produzione riuscita (tutte le rotte pubbliche presenti nell'output).
- Verifica visiva dal vivo NON eseguibile in questo sandbox (stesso limite noto delle altre story dell'Epic 18) — demandata all'utente: in particolare verificare su un telefono reale (non solo devtools) che l'hamburger apra/chiuda il pannello, che il tap su una voce navighi e chiuda il pannello, e che su desktop il menu resti orizzontale come prima senza alcun hamburger visibile.

### File List

- `app/NavPubblica.tsx`
- `app/NavPubblica.module.css`
- `app/HeaderPubblico.module.css`

### Change Log

- 2026-08-15: File di story creato (create-story workflow) — direzione (hamburger/drawer) risolta esplicitamente con l'utente prima della scrittura. Status: backlog → ready-for-dev.
- 2026-08-15: Implementata Story 18.18 (dev-story workflow) — menu pubblico mobile con hamburger/drawer, mirror ridotto del pattern desktop/mobile di `NavBarClient.tsx`. 1182/1182 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: ready-for-dev → review.
