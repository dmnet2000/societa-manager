---
title: 'Story 18.32: Vista mensile "stile Google Calendar" per /calendario con filtro per Campionato'
type: 'feature'
created: '2026-09-30'
status: 'done'
baseline_commit: '05cb733c1baffdc05d25cf6388206c96c4db38dd'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/calendario` mostra le Partite solo come elenco verticale per settimana; l'utente vuole "anche" una vista a griglia mensile stile Google Calendar, con checkbox per scegliere quali Campionati vedere.

**Approach:** interruttore "Elenco / Mese" sulla stessa pagina (Elenco default, invariato). La vista Mese è una griglia Lunedì-Domenica del mese, con le Partite come strisce colorate (`Campionato.colore`) dentro la cella del giorno, una legenda di checkbox per Campionato persistita in `localStorage`, navigazione mese precedente/successivo. Tutto client-side sugli stessi dati della stagione già letti dalla pagina.

## Boundaries & Constraints

**Always:** decisioni chiuse con l'utente 2026-09-30 — checkbox = Campionato; interruttore sulla stessa URL; giorno con molte Partite = tutte nella cella con scroll interno; selezione ricordata nel browser (`localStorage` in try/catch, fallback: tutti selezionati); giorno senza Partite = cella vuota silenziosa. Un solo fetch server (quello esistente), nessuna richiesta al cambio mese. Date sempre in UTC (`parseDataUtc`/`Date.UTC`), mai fuso locale. Touch target ≥44px e focus visibile su interruttore, frecce e checkbox. Registro "Poster Sportivo" (niente nero, colore card di default `#2e6f99`, testo leggibile via `testoScuroSuSfondo`).

**Ask First:** aggiungere una libreria di calendario; cambiare il comportamento/markup dell'elenco settimanale esistente.

**Never:** scritture server o nuovi campi DB; stato della selezione nell'URL o in cookie; messaggio "nessuna partita" nelle celle vuote; modifiche a `/app/partite` o al teaser home.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mese iniziale | oggi dentro l'intervallo mesi della stagione | apre il mese corrente | — |
| Mese iniziale fuori stagione | oggi prima/dopo le Partite | apre il primo/ultimo mese con Partite | — |
| Bordi navigazione | primo/ultimo mese della stagione | freccia relativa disabilitata | — |
| Griglia | mese qualunque (incl. febbraio bisestile, mese che inizia di domenica) | settimane complete Lun-Dom, giorni fuori mese attenuati | — |
| Filtro | Campionato deselezionato | sue Partite spariscono dalla griglia, persistito | — |
| Storage | `localStorage` assente/lancia/JSON corrotto/id sconosciuti | tutti selezionati, id ignoti scartati | try/catch silenzioso |
| Data invalida | `Partita.data` non parsabile | Partita esclusa dalla griglia | come `raggruppaPerSettimana` |
| Stagione vuota | nessuna Partita | messaggio esistente, nessun interruttore | — |

</frozen-after-approval>

## Code Map

- `app/calendario/page.tsx` -- Server Component: fetch stagione (select senza `campionato.id`, da aggiungere), elenco settimanale da incapsulare invariato.
- `app/calendario/calendario.module.css` -- stili elenco; card `.matchCard`/`.testoScuro` = riferimento per colori evento.
- `lib/raggruppa-per-settimana.ts` -- riusare `parseDataUtc`, `formattaDataIso`, `lunediDellaSettimana`, `oraInMinuti`.
- `lib/mese-calendario.ts` -- `giorniDelMese(meseIso)`, `meseCorrente()` (UTC) riusabili per il calcolo.
- `lib/colore-testo-leggibile.ts` -- `testoScuroSuSfondo(colore)` per il testo dell'evento.
- `lib/guida/contenuti.ts:392` -- voce Campionati che cita il colore "sul sito pubblico (calendario ...)"; `/calendario` pubblico non ha voce guida propria.
- Nessun precedente di `localStorage` nel progetto; unico storage lato client è il cookie consenso (`app/CookieBanner.tsx`), non toccare.

## Tasks & Acceptance

**Execution:**
- [x] `lib/griglia-mensile.ts` -- funzioni pure: `settimaneDelMese(meseIso)` (righe da 7 `{data, delMese}`), `intervalloMesi(date)`, `meseIniziale(oggiMese, min, max)`, `meseAdiacente(meseIso, ±1)`, `campionatiDistinti(partite)` (ordinati per nome), `leggiNascosti(raw, idValidi)` -- logica testabile separata dalla UI.
- [x] `lib/griglia-mensile.test.ts` -- coprire tutta la I/O Matrix lato funzioni pure.
- [x] `app/calendario/CalendarioVista.tsx` -- client component: interruttore Elenco/Mese (`aria-pressed`), riceve l'elenco server come `children`, griglia + legenda + frecce; storage letto in `useEffect` dopo il mount -- evita mismatch di idratazione.
- [x] `app/calendario/calendario.module.css` -- stili interruttore, legenda, griglia, eventi, cella con scroll interno; mobile sotto 900px.
- [x] `app/calendario/page.tsx` -- aggiungere `campionato.id`, passare Partite + `meseCorrente()` calcolato sul server, avvolgere l'elenco esistente in `CalendarioVista`.
- [x] `lib/guida/contenuti.ts` -- estendere la frase sul colore Campionato: identifica anche il Campionato nella legenda della vista mensile del calendario pubblico.

**Acceptance Criteria:**
- Given `/calendario` con Partite, when la pagina si apre, then vedo l'elenco settimanale attuale identico e un interruttore "Elenco / Mese".
- Given la vista Mese, when la guardo, then vedo intestazioni Lun-Dom, il nome del mese, frecce precedente/successivo e una legenda con un checkbox + pallino colore per ogni Campionato con Partite in stagione.
- Given una Partita, when compare in griglia, then è una striscia col colore del suo Campionato (default `#2e6f99`) con ora e squadre, testo leggibile.
- Given una cella con più Partite di quante ne entrino, when scorro dentro la cella, then le vedo tutte; la cella è raggiungibile da tastiera.
- Given una selezione di checkbox, when ricarico la pagina, then la selezione è conservata.

## Design Notes

Persistire i Campionati **nascosti** (non i visibili): un Campionato nuovo compare selezionato di default. Chiave: `calendario-campionati-nascosti`. È una preferenza funzionale richiesta dal Visitatore, niente tracciamento: nessun impatto sul banner consenso.

Il mese iniziale viene calcolato sul server e passato come prop (mai `new Date()` nel render client). Il componente client riceve l'elenco settimanale come `children`, così resta Server Component e identico: `CalendarioVista` sceglie solo cosa mostrare.

Semantica: ogni cella è un elemento con data completa leggibile (es. `aria-label="martedì 14 ottobre"`) e una `<ul>` di eventi; la `<ul>` scrollabile riceve `tabIndex={0}` solo quando ha Partite, per non riempire la tab order di celle vuote.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: nessun errore
- `npm run lint` -- expected: 0 errori
- `npm test` -- expected: tutti verdi, nuovi test inclusi
- `npm run build` -- expected: build riuscita

**Manual checks (dev locale rotto su questa macchina, verificare al deploy):**
- `/calendario` a 375px e desktop: interruttore, griglia senza scroll orizzontale di pagina, scroll interno di una cella affollata, persistenza dei checkbox dopo ricarica.

## Suggested Review Order

**Stato e persistenza (cuore della story)**

- Mese e Campionati nascosti vivono nel parent, inizializzati solo al primo click su "Mese".
  [`CalendarioVista.tsx:78`](../../app/calendario/CalendarioVista.tsx#L78)

- Scrittura localStorage in try/catch, conserva gli id di altre stagioni.
  [`CalendarioVista.tsx:90`](../../app/calendario/CalendarioVista.tsx#L90)

- setState funzionale: toggle rapidi non si perdono.
  [`CalendarioVista.tsx:104`](../../app/calendario/CalendarioVista.tsx#L104)

- Parsing difensivo del valore salvato e fusione con id sconosciuti.
  [`griglia-mensile.ts:173`](../../lib/griglia-mensile.ts#L173)
  [`griglia-mensile.ts:203`](../../lib/griglia-mensile.ts#L203)

**Integrazione nella pagina**

- L'elenco settimanale server resta invariato, passato come `children`; mese corrente calcolato sul server.
  [`page.tsx:108`](../../app/calendario/page.tsx#L108)

- Unico cambio alla query: `campionato.id` per il filtro.
  [`page.tsx:62`](../../app/calendario/page.tsx#L62)

**Griglia mensile**

- Righe Lun-Dom complete con giorni fuori mese, tutto in UTC.
  [`griglia-mensile.ts:63`](../../lib/griglia-mensile.ts#L63)

- Mese iniziale limitato alla stagione, frecce disattivate ai bordi.
  [`griglia-mensile.ts:108`](../../lib/griglia-mensile.ts#L108)
  [`griglia-mensile.ts:116`](../../lib/griglia-mensile.ts#L116)

- Render: legenda, messaggio se tutto deselezionato, celle con scroll interno.
  [`CalendarioVista.tsx:149`](../../app/calendario/CalendarioVista.tsx#L149)
  [`CalendarioVista.tsx:226`](../../app/calendario/CalendarioVista.tsx#L226)

**Stili e mobile**

- Interruttore, legenda, griglia ed eventi nel registro Poster Sportivo.
  [`calendario.module.css:260`](../../app/calendario/calendario.module.css#L260)

- Sotto 900px la griglia diventa una colonna di giorni (scelta da confermare con l'utente).
  [`calendario.module.css:517`](../../app/calendario/calendario.module.css#L517)

**Test e guida**

- Test del componente in jsdom: default, filtro, persistenza, storage che lancia, bordi.
  [`CalendarioVista.test.tsx:1`](../../app/calendario/CalendarioVista.test.tsx#L1)

- Test delle funzioni pure (matrice I/O).
  [`griglia-mensile.test.ts:1`](../../lib/griglia-mensile.test.ts#L1)

- Guida in-app: il colore del Campionato identifica anche la legenda della vista Mese.
  [`contenuti.ts:392`](../../lib/guida/contenuti.ts#L392)
