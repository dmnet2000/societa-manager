---
title: 'Story 20.32: /torneo non si ridimensiona su schermo cellulare'
type: 'bugfix'
created: '2026-09-14'
status: 'done'
route: 'one-shot'
review_loop_iteration: 0
context: []
---

# Story 20.32: /torneo non si ridimensiona su schermo cellulare

## Intent

**Problem:** su `/torneo` (pagina pubblica), da schermo cellulare la pagina non si adattava alla larghezza dello schermo - segnalato dall'utente, poi verificato dal vivo su `volleymogliano.it/torneo` (iframe a 375px, ispezione DOM diretta). Causa reale: `.main` non aveva una `width` esplicita - dentro il layout flex globale del sito (`app/globals.css`, `body { display: flex; flex-direction: column }`), un figlio flex senza `width` si dimensiona sul min-content del proprio contenuto invece che sul viewport (regola CSS "automatic minimum size" degli item flex). `.main` risultava cosi' largo ~539px anche a 375px di viewport. Il sito ha anche `html, body { max-width: 100vw; overflow-x: hidden }`: il sintomo per il visitatore non era una scrollbar orizzontale ma contenuto tagliato/invisibile oltre il bordo schermo. Due tabelle (`.tabellaClassifica`, `.tabellaSquadreGironi`) contribuivano al problema: nessun wrapper di scroll orizzontale, gap gia' noto (`deferred-work.md`, Story 20.16) ma mai chiuso.

**Approach:** `.main { width: 100% }` (in aggiunta a `max-width:1000px; margin:0 auto` esistenti) rende il contenitore a dimensione esplicita invece che calcolata dal contenuto - si restringe correttamente su schermi stretti, il centraggio resta invariato sopra i 1000px. Le due tabelle guadagnano il wrapper `.tabellaScroll` gia' in uso per `.tabellaIncontri` nello stesso file; `.tabellaClassifica` guadagna anche `min-width`/`white-space: nowrap` (mirror di `.tabellaIncontri`) per uno scroll orizzontale leggibile invece di celle compresse. Complementare: `.squadre` (nome squadre nelle match-card) guadagna `flex-wrap`/`overflow-wrap` (mai piu' tagliato da `.matchCard{overflow:hidden}`) e una riduzione font-size sotto i 900px (breakpoint unico gia' in uso in tutto il sito pubblico).

**Verifica dal vivo:** fix confermato empiricamente su produzione (non solo per ispezione statica del CSS) - misurato `document.body.scrollWidth` prima (539px a 375px di viewport, overflow reale) e dopo aver applicato le stesse modifiche via DOM live (0 overflow, `scrollWidth === innerWidth === 360px`, nessun elemento piu' largo del viewport).

## Suggested Review Order

**Causa radice**

- Il fix vero: `.main` da dimensione-sul-contenuto a dimensione-esplicita dentro il flex layout globale del sito.
  [`torneo-pubblico.module.css:58`](../../app/torneo/torneo-pubblico.module.css#L58)

- Le due tabelle che, prima del fix su `.main`, spingevano il min-content a ~539px - gap gia' noto (Story 20.16) ora chiuso lato pubblico.
  [`page.tsx:383`](../../app/torneo/page.tsx#L383)

- Stesso wrapper, seconda tabella.
  [`page.tsx:483`](../../app/torneo/page.tsx#L483)

- `.tabellaClassifica` guadagna `min-width`/`nowrap` per uno scroll leggibile invece di celle compresse a 312px.
  [`torneo-pubblico.module.css:309`](../../app/torneo/torneo-pubblico.module.css#L309)

**Leggibilita' complementare (match-card)**

- `.squadre`: wrap sempre attivo + riduzione font-size sotto i 900px.
  [`torneo-pubblico.module.css:451`](../../app/torneo/torneo-pubblico.module.css#L451)

## Verification

**Commands:**
- `npx tsc --noEmit` -- pulito
- `npm run lint` -- 0 errori, 21 warning pre-esistenti non correlati

**Manual checks (dev locale rotto su questa macchina - verifica dal vivo gia' eseguita su produzione per questa story, vedi sopra):**
- Fatto: `/torneo` a 375px, nessun overflow orizzontale residuo (misurato).
- Da fare al prossimo controllo: ripetere a 320px (telefono molto stretto) e in orientamento landscape.
- Vedi `deferred-work.md` per i gap noti non chiusi da questa story: tabella classifica lato admin ancora senza wrapper, accessibilita' da tastiera dei tre wrapper di scroll, eventuale secondo gradino di riduzione font-size.
