---
title: 'Story 18.31: Calendario pubblico - card a piena larghezza e testo meta spostato'
type: 'feature'
created: '2026-09-11'
status: 'done'
route: 'one-shot'
review_loop_iteration: 0
context: []
---

# Story 18.31: Calendario pubblico - card a piena larghezza e testo meta spostato

## Intent

**Problem:** richiesta esplicita dell'utente per `/calendario` (sito pubblico): spostare ulteriormente a destra il testo data/ora/palestra (già oggetto di un fix precedente per il taglio diagonale della card) e allargare la card partita, percepita come piccola.

**Diagnosi dal vivo (volleymogliano.it/calendario):** la card è piccola perché `.matchGrid` usa una griglia fissa a 2 colonne - una settimana con una sola partita (il caso più comune) occupa solo metà riga, lasciando l'altra colonna vuota. Chiarito con l'utente: preferita una colonna singola sempre (ogni card occupa l'intera larghezza di `.main`) invece di un `+100px` letterale che, restando a 2 colonne, avrebbe fatto sovrapporre le card in una settimana con 2+ partite.

**Approach:** `.matchGrid` passa da `repeat(2, 1fr)` a `1fr` (colonna singola su ogni viewport, media query per il breakpoint 900px ormai ridondante e rimossa per la sola parte grid). `.meta` (testo data/ora/palestra) riceve altri 50px di `padding-left` oltre al fix già esistente per il taglio diagonale.

## Suggested Review Order

- Griglia a colonna singola.
  [`calendario.module.css:63`](../../app/calendario/calendario.module.css#L63)

- Spostamento aggiuntivo del testo meta.
  [`calendario.module.css:157`](../../app/calendario/calendario.module.css#L157)

## Verification

**Commands:**
- `npx tsc --noEmit` -- pulito (nessuna logica toccata, solo CSS)
- `npm run lint` -- 0 errori
- `npx vitest run` -- 2080/2080 verdi

**Diagnosi dal vivo:** ispezionato `/calendario` in produzione via browser prima di intervenire (screenshot + zoom sull'angolo tagliato della card), per capire esattamente quale elemento l'utente intendeva con "la fascia" - chiarito con l'utente essere l'intera card, non il taglio diagonale. Nessuna review a 3 livelli dispatchata: cambiamento puramente CSS/visivo, nessuna logica applicativa toccata, blast radius minimo (un solo file, una sola pagina pubblica).

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire `/calendario`: verificare che ogni card occupi l'intera larghezza della pagina, anche con una sola partita nella settimana.
- Verificare che il testo data/ora/palestra sia più distante dal bordo tagliato in basso a sinistra.
- Verificare una settimana con 2+ partite: le card devono impilarsi verticalmente (colonna singola), non più affiancate.
