---
title: 'Story 18.37: stile "Match Week" sulla pagina pubblica /squadre'
type: 'feature'
created: '2026-10-02'
status: 'in-progress'
baseline_commit: 'e1ad3fe644acb084436d92d4b5e8f5e4a0d69059'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/squadre` usa ancora il registro chiaro (sfondo grigio, card bianche, badge numero grigio), mentre partite, calendario e classifiche sono passati allo stile "Match Week" (Story 18.35/18.36, `ux-designs/stile.jpg`): la pagina stona.

**Approach:** decisioni utente 2026-10-02 — sfondo blu Match Week su tutta la pagina (come `/calendario` e `/classifiche`), titoli di categoria e nome squadra su fascia obliqua, numero di maglia delle atlete nel quadratino rosso `#C8102E`, card squadra con sagoma obliqua e filo bianco (come le righe partita) al posto della card bianca. Contenuti, ordine e dati invariati.

## Boundaries & Constraints

**Always:** riuso di `DecorazioniMatchWeek`/`classeFasciaMatchWeek` (`app/SfondoMatchWeek.tsx`) sull'intera pagina, sfondo a piena larghezza con contenuto ancora centrato a max 1000px (Story 18.25). Card: fondo scuro semitrasparente sul blu, testo bianco/`#C3D6F5` (contrasti ≥ 4.5:1 per il testo normale, verificati e commentati), sagoma con `clip-path` obliquo e filo bianco via `drop-shadow` sul contenitore. Foto squadra e placeholder restano con il loro taglio. Quadratino numero: bianco su `#C8102E` (5.88:1). Fasce: categoria in rosso `#C8102E`, nome squadra in azzurro `#2e6f99`, testo bianco. "Niente nero", `forced-colors` leggibile (bordi di sistema al posto di sagome/fili), `prefers-reduced-motion` rispettato, nessuno scroll orizzontale a 375px. Gerarchia h1/h2/h3/h4 invariata. DESIGN.md (team-card) aggiornato.

**Ask First:** cambiare dati mostrati, ordine/raggruppamento, foto o layout a una colonna; toccare la home o altre pagine.

**Never:** immagini/texture nuove dentro la card; nuove librerie o font web; modifiche alle query o a `/app/ordine-squadre`.

</frozen-after-approval>

## Code Map

- `app/squadre/page.tsx:203-320` -- `<main>` + blocchi categoria (`h2`), `.schedaGruppo` (foto/placeholder, `h3` nome, categoria, allenatori, atlete con foto/iniziali, nome, numero): solo classi/struttura visiva, aggiungere `classeFasciaMatchWeek` + `<DecorazioniMatchWeek />` e un contenitore interno centrato.
- `app/squadre/squadre.module.css` -- intero modulo da riallineare: `.main` (oggi grigio `#f2f5f7` + max-width), `.titolo`, `.titoloBloccoCategoria`, `.schedaGruppo` (bianca + ombra + hover), `.nomeGruppo`, `.categoriaGruppo` (`#0072a3`, illeggibile sul blu), `.listaAllenatori`, `.sezioneAtlete` (bordo `#e5e9ee`), `.titoloSezioneAtlete`, `.nomeAtleta`, `.numeroAtleta` (badge grigio → quadratino rosso), `.fotoAtleta`/`.inizialiAtleta`.
- `app/SfondoMatchWeek.tsx`, `app/sfondo-match-week.module.css` -- fascia (ridefinisce `--color-text-primary` bianco e `--color-text-secondary` `#C3D6F5`); aggiornare il commento d'elenco delle pagine che la usano.
- `app/riga-partita.module.css:10-60` -- riferimento per `.cornice` (filo bianco `drop-shadow`) e `clip-path` obliquo; `app/classifiche/classifiche.module.css` `.fasciaTitolo` per la fascia obliqua del titolo. Non modificarli.
- `app/calendario/page.tsx:92` -- esempio d'uso della fascia su `<main>`.
- `_bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-08-13/DESIGN.md:193,340,351` -- `team-card`, sezione Squadre su grigio-chiaro: segnare superato e documentare la variante Match Week.

## Tasks & Acceptance

**Execution:**
- [ ] `app/squadre/page.tsx` -- fascia Match Week sulla pagina, contenitore centrato, wrapper per il filo della card; markup dati invariato.
- [ ] `app/squadre/squadre.module.css` -- nuovi stili Match Week (fasce, card, quadratino numero, testi, `forced-colors`, mobile), rimozione degli stili chiari non più usati.
- [ ] `app/sfondo-match-week.module.css` -- commento aggiornato (anche `/squadre`).
- [ ] `DESIGN.md` -- variante Match Week della `team-card` e della sezione Squadre.

**Acceptance Criteria:**
- Given `/squadre` con almeno una squadra, when la apro, then vedo lo sfondo blu Match Week, titoli di categoria e nome squadra su fasce oblique, card squadra con sagoma obliqua e filo bianco, e i numeri di maglia in quadratini rossi.
- Given una larghezza di 375px e nomi lunghi, when guardo la pagina, then nulla è tagliato e la pagina non scorre in orizzontale.
- Given il contrasto elevato di sistema, when apro la pagina, then card, fasce e numeri restano distinguibili.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: nessun errore
- `npm run lint` -- expected: 0 errori
- `npm test` -- expected: tutti verdi

**Manual checks (dev locale rotto):**
- anteprima statica dai componenti reali; `/squadre` a 375px e desktop al deploy.
