---
title: 'Story 9.44: Partite della settimana del proprio Gruppo in evidenza sulla home interna'
type: 'feature'
created: '2026-09-24'
status: 'done'
review_loop_iteration: 0
context: []
route: 'one-shot'
---

# Story 9.44: Partite della settimana del proprio Gruppo in evidenza sulla home interna

## Intent

**Problem:** `/app` (la home interna dopo il login) non mostra mai alcuna Partita - un'Atleta, un Allenatore o un Genitore deve aprire `/app/partite` per sapere se gioca/allena questa settimana.

**Approach:** nuova sezione "Partite di questa settimana", per prima nella pagina (prima del carosello Sponsor), che incrocia due pattern già esistenti e testati: il calcolo lunedì-domenica della settimana corrente (già usato dal teaser pubblico in `app/page.tsx`) e lo scoping "solo il proprio Gruppo" per Allenatore/Atleta/Genitore (già usato in `/app/partite`) - nessuna query "esotica" nuova. Visibilità guidata dal dato (un Allenatore o un'Atleta/figlia risolti), non da un controllo esplicito sul Ruolo, stesso principio già in vigore in `/app/partite`. Cinque decisioni non risposte puntualmente dall'utente ("procedi" generico) risolte con default espliciti, documentati nel codice: anche il Genitore incluso (stessa risoluzione dell'Atleta, nessun costo aggiuntivo); più Gruppi/figlie mostrati insieme, nessun selettore; stile sobrio/tabellare dell'area interna, non il "match-card" colorato del sito pubblico; link "Vedi tutte le partite" verso `/app/partite`.

## Suggested Review Order

**Risoluzione del proprio Gruppo (entry point)**

- Entry point: risoluzione Allenatore/Atleta-Genitore e filtro Gruppo, mirror di `/app/partite` - visibilità guidata dal dato, non dal Ruolo.
  [`page.tsx:64`](../../app/app/page.tsx#L64)
  [`page.tsx:83`](../../app/app/page.tsx#L83)
  [`page.tsx:97`](../../app/app/page.tsx#L97)

- Review fix (Blind Hunter): `annoCorrente`/`allenatore` in parallelo (`Promise.all`), non più in sequenza - meno latenza su una pagina `force-dynamic`; ogni query ha ora il proprio `.catch` (un errore transitorio non fa più cadere l'intera home).
  [`page.tsx:64`](../../app/app/page.tsx#L64)

**Settimana corrente e ordinamento**

- Calcolo lunedì-domenica, mirror esatto del teaser pubblico (`app/page.tsx`) - fuso Europe/Rome via `Intl.DateTimeFormat`, non l'istante UTC.
  [`page.tsx:114`](../../app/app/page.tsx#L114)

- Review fix (Blind Hunter): riordino in memoria con `oraInMinuti` dopo la query - l'`orderBy` Prisma su "ora" è lessicografico sull'SQL sottostante ("9:00" dopo "20:30"), stesso bug già noto e corretto altrove nel progetto.
  [`page.tsx:143`](../../app/app/page.tsx#L143)
  [`raggruppa-per-settimana.ts:89`](../../lib/raggruppa-per-settimana.ts#L89) — `oraInMinuti` esportata apposta per questo riuso, non duplicata

**UI**

- Sezione condizionale (assente se vuota), stile sobrio riuso `composes: card` (review fix Blind Hunter, non più una copia delle stesse 4 dichiarazioni), `aria-labelledby` collegato all'`<h2>` (review fix Blind Hunter, stesso pattern già in uso nel teaser pubblico).
  [`page.tsx:161`](../../app/app/page.tsx#L161)
  [`home.module.css:33`](../../app/app/home.module.css#L33)

- Link "Vedi tutte le partite" con `next/link` (review fix: un `<a>` semplice violava la regola ESLint `no-html-link-for-pages`).
  [`page.tsx:193`](../../app/app/page.tsx#L193)
