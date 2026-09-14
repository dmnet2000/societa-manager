---
title: 'Story 20.32: Testo delle match-card leggibile su schermo cellulare in /torneo'
type: 'bugfix'
created: '2026-09-14'
status: 'done'
route: 'one-shot'
review_loop_iteration: 0
context: []
---

# Story 20.32: Testo delle match-card leggibile su schermo cellulare in /torneo

## Intent

**Problem:** su `/torneo` (pagina pubblica), da schermo cellulare la sezione delle partite non risultava interamente leggibile - il nome delle squadre nelle match-card (`.squadre`, `font-size: 20px` fisso) non si riduceva mai sotto nessun breakpoint (a differenza del solo titolo di pagina, `.titolo`), e la riga senza `flex-wrap` rischiava di essere tagliata silenziosamente dal `overflow: hidden`/taglio diagonale di `.matchCard` per nomi squadra lunghi.

**Approach:** `.squadre` guadagna `flex-wrap: wrap` (sempre attivo, evita il taglio a qualunque larghezza) + `overflow-wrap: break-word` (spezza anche un singolo nome senza spazi) + una riduzione `font-size` a 16px sotto i 900px, stesso identico breakpoint gia' usato ovunque nel sito pubblico (nessun nuovo breakpoint introdotto). `.vs` eredita la stessa riduzione via `font-size: inherit`, gia' esistente.

## Suggested Review Order

- Fix vero e proprio: wrap + riduzione font-size del nome squadra, causa diretta del testo troppo grande/tagliato su mobile.
  [`torneo-pubblico.module.css:416`](../../app/torneo/torneo-pubblico.module.css#L416)

- Breakpoint di riduzione, stesso valore 900px gia' in uso in tutto il modulo.
  [`torneo-pubblico.module.css:435`](../../app/torneo/torneo-pubblico.module.css#L435)

- Divergenza intenzionale dal "mirror stilistico" con `calendario.module.css` dichiarata in testa al file.
  [`torneo-pubblico.module.css:9`](../../app/torneo/torneo-pubblico.module.css#L9)

- `.categoria`/`.meta` lasciate invariate (gia' compatte, non l'elemento segnalato) - nota esplicita per chi rivede il diff.
  [`torneo-pubblico.module.css:458`](../../app/torneo/torneo-pubblico.module.css#L458)

## Verification

**Commands:**
- `npx tsc --noEmit` -- pulito
- `npm run lint` -- 0 errori, 21 warning pre-esistenti non correlati

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire `/torneo` da uno schermo stretto reale (~360-400px) e confermare che il nome delle squadre nelle match-card sia interamente leggibile, senza testo tagliato.
- Se il fix risultasse ancora insufficiente su telefoni molto stretti, vedi `deferred-work.md` (secondo gradino di riduzione, voce Story 20.32).
