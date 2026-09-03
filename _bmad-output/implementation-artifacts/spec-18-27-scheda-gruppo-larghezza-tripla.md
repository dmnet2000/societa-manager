---
title: 'Story 18.27: Scheda Gruppo molto più larga in /squadre'
type: 'feature'
created: '2026-09-03'
status: 'done'
review_loop_iteration: 0
context: []
route: 'one-shot'
---

# Story 18.27: Scheda Gruppo molto più larga in /squadre

## Intent

**Problem:** `.listaGruppi` (`app/squadre/squadre.module.css`) è oggi una griglia a 3 colonne dentro `.main` (`max-width: 1000px`, Story 18.25) - ogni `.schedaGruppo` occupa circa 1/3 della larghezza, spazio compresso per una scheda che dalla Story 18.24 include anche l'elenco Atlete (foto/nome/Numero) oltre a foto/nome/categoria/Allenatori.

**Approach:** `.listaGruppi` passa da `repeat(3, 1fr)` a `1fr` a qualunque larghezza - ogni scheda occupa così l'intera larghezza di `.main`, ben oltre il triplo di prima (AC #1 chiede "almeno" il triplo, non un fattore esatto). La media query mobile che imponeva già 1 colonna sotto i 900px diventa ridondante ed è stata rimossa. Nessuna modifica a `.main` né al contenuto interno delle schede.

## Suggested Review Order

- Entry point: `.listaGruppi` a 1 sola colonna, mirror dello stesso pattern già collaudato sul breakpoint mobile (Story 18.8).
  [`squadre.module.css:71`](../../app/squadre/squadre.module.css#L71)

- Media query mobile rimossa perché ridondante (già a 1 colonna a qualunque larghezza).
  [`squadre.module.css:54`](../../app/squadre/squadre.module.css#L54)

- Review fix (Blind Hunter): dicitura "esattamente 3 volte" era matematicamente imprecisa (il gap tra colonne, presente solo nel layout a 3 colonne, rende il rapporto reale sempre superiore a 3x) - corretta in "almeno/ben oltre il triplo", coerente con l'AC #1.
  [`squadre.module.css:60`](../../app/squadre/squadre.module.css#L60)

- Review fix (Blind Hunter): intestazione del file non elencava questa story tra quelle che l'hanno toccato - aggiunta, mirror della stessa convenzione già in uso per 18.8/18.12/18.25.
  [`squadre.module.css:8`](../../app/squadre/squadre.module.css#L8)

**Nota per il revisore umano (non bloccante, segnalata ma non risolta - fuori scope per l'AC #3, "nessuna modifica di layout interno alla scheda"):** la foto di squadra (altezza fissa 260px desktop/140px mobile) passa da un crop ~1.15:1 a un crop molto più largo/basso con la scheda ~3x più larga, e il testo (Allenatori/Atlete) può ora estendersi fino a quasi la larghezza intera della scheda senza alcun `max-width`. Entrambi effetti reali della sola larghezza cambiata, non corretti qui per restare dentro lo scope già deciso in apertura della story - da rivedere con un'eventuale story di follow-up dopo aver visto il risultato dal vivo (dev locale rotto, nessuna verifica visiva possibile in questo ambiente).
