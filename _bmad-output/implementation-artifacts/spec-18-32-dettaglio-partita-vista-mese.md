---
title: 'Seguito Story 18.32: dettaglio della Partita in popup dalla vista Mese di /calendario'
type: 'feature'
created: '2026-09-30'
status: 'done'
baseline_commit: '5b79529f25893d75f1ea0d276e7d8c7e751a0796'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** nella vista Mese di `/calendario` (Story 18.32) una Partita è una striscia non interattiva con solo ora e squadre: il Visitatore non può vedere palestra, indirizzo, link Naviga né risultato, che l'Elenco o FIPAV già forniscono.

**Approach:** ogni striscia diventa un pulsante; il click apre una finestra popup modale con tutti i dettagli della Partita. Si chiude con ×, Esc o clic fuori, e il focus torna alla striscia.

## Boundaries & Constraints

**Always:** decisioni dell'utente 2026-09-30 — finestra tipo popup; contenuto: Campionato, squadre, data completa, ora, palestra, indirizzo con link Naviga, **più** giornata, stato partita, risultato e parziali. Ogni campo opzionale assente viene omesso in silenzio (nessun "non disponibile"). Link Naviga costruito con `costruisciLinkNaviga` come nell'Elenco (nuova scheda, `noopener noreferrer`). Modale accessibile: `<dialog>` nativo con `showModal()`, titolo collegato via `aria-labelledby`, focus iniziale dentro la finestra, ritorno del focus alla striscia alla chiusura. Touch target ≥44px e focus visibile su strisce, ×, Naviga. Registro "Poster Sportivo" (niente nero), testo leggibile su colore Campionato via `testoScuroSuSfondo`.

**Ask First:** aggiungere librerie di modali/popover; cambiare l'Elenco settimanale o la persistenza della legenda.

**Never:** nuove query/richieste al click (i dati arrivano col fetch della pagina); scritture server; URL o storage per la Partita selezionata; toccare `/app/partite` o la home.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Partita futura completa | tutti i campi base valorizzati, nessun risultato | popup con Campionato, squadre, data, ora, palestra, indirizzo, Naviga | — |
| Partita giocata | `risultato` "3-1", `parziali` "25-20,22-25,25-18,25-19" | mostra "3-1" e i parziali separati da ", " | — |
| Campi opzionali assenti | `impianto`/`indirizzoImpianto`/`giornata`/`statoDescrizione`/`risultato`/`parziali` null o vuoti | righe omesse, nessun Naviga senza indirizzo | — |
| Stato senza risultato | `statoDescrizione` "Rinviata", `risultato` null | mostra lo stato | — |
| Chiusura | ×, Esc, clic sullo sfondo | popup chiuso, focus sulla striscia cliccata | — |
| Partita non più visibile | Campionato nascosto dalla legenda mentre il popup è aperto non è possibile (modale); dopo il cambio mese nessun popup aperto | nessun popup "orfano" | — |

</frozen-after-approval>

## Code Map

- `app/calendario/CalendarioVista.tsx` -- `GrigliaMese`: eventi oggi `<li>` non interattivi (ora, squadre, nome Campionato solo per screen reader); tipo `PartitaMese` da estendere.
- `app/calendario/page.tsx:83-95` -- `partiteMese` passa al client solo i campi della griglia: aggiungere `impianto`, `indirizzoImpianto`, `giornata`, `statoDescrizione`, `risultato`, `parziali` (aggiungere questi ultimi quattro anche al `select` Prisma).
- `lib/link-naviga-palestra.ts` -- `costruisciLinkNaviga({ indirizzo })`, già usata dall'Elenco (`page.tsx`), restituisce null senza indirizzo.
- `lib/griglia-mensile.ts` -- `etichettaGiorno(data)` ("martedì 14 ottobre", nomi letterali, niente ICU) riusabile per la data nel popup; aggiungere qui gli helper puri di formattazione.
- `lib/colore-testo-leggibile.ts` -- `testoScuroSuSfondo` per l'intestazione colorata del popup.
- `prisma/schema.prisma` model `Partita` -- `giornata`, `risultato`, `parziali` (salvati come "25-20,22-25" da `lib/sincronizza-gare-fipav/parser.ts:144`), `statoDescrizione`, tutti `String?`.
- `app/page.tsx:405` -- precedente: `risultato ?? statoDescrizione` in home.
- `app/calendario/CalendarioVista.test.tsx` -- test jsdom esistenti (`react-dom/client` + `act`), da estendere.

## Tasks & Acceptance

**Execution:**
- [x] `lib/griglia-mensile.ts` -- helper puri: `formattaParziali(raw)` ("25-20,22-25" → "25-20, 22-25", null se vuoto) e `righeDettaglioPartita(partita)` (elenco etichetta/valore dei soli campi presenti, in ordine fisso) -- logica testabile senza DOM.
- [x] `lib/griglia-mensile.test.ts` -- coprire le righe della I/O Matrix lato helper.
- [x] `app/calendario/page.tsx` -- estendere `select` e `partiteMese` con i campi del dettaglio.
- [x] `app/calendario/CalendarioVista.tsx` -- estendere `PartitaMese`; strisce come `<button>` dentro `<li>`; nuovo componente `DettaglioPartita` con `<dialog>` modale, chiusura ×/Esc/sfondo, ritorno focus.
- [x] `app/calendario/calendario.module.css` -- stili pulsante-striscia (reset, focus), dialog, backdrop, intestazione colorata, righe, bottone ×, Naviga; mobile sotto 900px.
- [x] `app/calendario/CalendarioVista.test.tsx` -- click su una striscia apre il dialog con i dettagli; campi assenti omessi; chiusura riporta il focus. In jsdom `HTMLDialogElement.showModal/close` possono mancare: stub nel test.

**Acceptance Criteria:**
- Given la vista Mese, when clicco o attivo da tastiera (Invio/Spazio) una Partita, then si apre il popup con i suoi dettagli.
- Given il popup aperto, when premo Esc, clicco × o fuori dalla finestra, then si chiude e il focus torna alla Partita cliccata.
- Given una Partita con indirizzo, when clicco Naviga, then si apre la navigazione in una nuova scheda.

## Design Notes

Un solo `<dialog>` montato in `GrigliaMese`, con la Partita selezionata nello stato (`PartitaMese | null`): `useEffect` su quello stato chiama `showModal()`/`close()`; l'evento `close` del dialog (Esc incluso) azzera lo stato e ridà il focus al pulsante di origine (ref salvato al click). Clic sullo sfondo: `onClick` sul dialog con `e.target === e.currentTarget`.

Ordine righe: Campionato (intestazione colorata), squadre (titolo), data + ora, giornata, palestra, indirizzo + Naviga, stato, risultato, parziali.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: nessun errore
- `npm run lint` -- expected: 0 errori
- `npm test` -- expected: tutti verdi, nuovi test inclusi

**Manual checks (dev locale rotto su questa macchina, verificare al deploy):**
- `/calendario` vista Mese a 375px e desktop: popup leggibile, chiusura con Esc/×/sfondo, Naviga apre le mappe, nessuno scroll orizzontale.

## Suggested Review Order

**Popup e ciclo di vita del dialog**

- Componente del popup: intestazione colorata, righe presenti, Naviga.
  [`CalendarioVista.tsx:361`](../../app/calendario/CalendarioVista.tsx#L361)

- Chiusura su sfondo solo se pressione e clic sono fuori dal contenuto.
  [`CalendarioVista.tsx:430`](../../app/calendario/CalendarioVista.tsx#L430)

- Apertura/chiusura con ripiego per browser senza `showModal`.
  [`CalendarioVista.tsx:344`](../../app/calendario/CalendarioVista.tsx#L344)

- Ritorno del focus alla striscia, o al titolo del mese se non c'è più.
  [`CalendarioVista.tsx:201`](../../app/calendario/CalendarioVista.tsx#L201)

- Striscia come pulsante, colore del Campionato sul pulsante.
  [`CalendarioVista.tsx:304`](../../app/calendario/CalendarioVista.tsx#L304)

**Dati e formattazione**

- Proiezione server→client unica e testata, campi del dettaglio obbligatori.
  [`griglia-mensile.ts:275`](../../lib/griglia-mensile.ts#L275)
  [`page.tsx:88`](../../app/calendario/page.tsx#L88)

- Righe del dettaglio in ordine fisso, campi vuoti omessi.
  [`griglia-mensile.ts:310`](../../lib/griglia-mensile.ts#L310)
  [`griglia-mensile.ts:238`](../../lib/griglia-mensile.ts#L238)

**Stili, test e guida**

- Dialog con scroll interno sul corpo, non sul dialog.
  [`calendario.module.css:529`](../../app/calendario/calendario.module.css#L529)

- Test: apertura, Esc reale, sfondo, colori, fallback, focus.
  [`CalendarioVista.test.tsx:1`](../../app/calendario/CalendarioVista.test.tsx#L1)

- Guida in-app aggiornata.
  [`contenuti.ts:392`](../../lib/guida/contenuti.ts#L392)
