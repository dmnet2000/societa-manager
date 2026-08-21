---
title: "Story 9.34: Data di scadenza del certificato nell'elenco Atlete e nei drill-down"
type: 'feature'
created: '2026-08-21'
status: 'in-progress'
review_loop_iteration: 0
context: []
baseline_commit: '1b44cdd3ddabdfc50482415127229fbecea1340f'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `dataFineValidita` del certificato medico è già letta e usata per calcolare `certificatoScaduto`/`certificatoInScadenza` (`lib/certificato-in-scadenza-per-atleta.ts`, `categorizzaStatoCertificato`) in 4 pagine (`/gruppi`, `/i-miei-gruppi`, `/vista-dirigente`, `/vista-allenatore`), ma la data stessa viene scartata subito dopo - un Allenatore/Admin/Dirigente vede solo il badge "scaduto"/"in scadenza", mai la data effettiva, e deve aprire il dettaglio del certificato di ogni Atleta per saperla.

**Approach:** deciso con l'utente il 2026-08-20 (epics.md, Story 9.34):
1. In `AtletaTabellaRiga.tsx` (`/gruppi`, `/i-miei-gruppi` via `MioGruppoCard.tsx`) il badge "Certificato scaduto"/"Certificato in scadenza" diventa un `<button>` cliccabile che rivela/nasconde la data - mirror del pattern toggle già in uso in `GruppoCard.tsx` per i drill-down (`aria-expanded`/`aria-controls`).
2. Nel drill-down di `GruppoCard.tsx` (`/vista-dirigente`/`/vista-allenatore`, già rivelato on-demand da un click sulla stat-tile) la data è sempre visibile accanto al nome, nessun secondo livello di click - `atleteScadute`/`atleteInScadenza` passano da `string[]` a `{ nome: string; dataScadenza: string }[]`.
3. Formato data: `parseDataUtc` (`lib/raggruppa-per-settimana.ts`) + `.toLocaleDateString("it-IT", { timeZone: "UTC" })` - stesso pattern già in uso in `app/page.tsx` (`formattaData`), mai un nuovo formato/libreria.

## Boundaries & Constraints

**Always:** area di tocco del badge-bottone in `AtletaTabellaRiga.tsx` ≥44×44px (regola permanente del progetto - `min-height`/`min-width` da soli non bastano se il contenitore non è un flex item che li rispetta, va sul bottone stesso). Un'Atleta senza badge (certificato in regola o assente) non ottiene nessun elemento cliccabile nuovo, nessuna regressione sul layout della colonna Certificato per quel caso. Nessuna regressione sulla logica di calcolo esistente (`categorizzaStatoCertificato`, `calcolaAtleteConCertificatoInScadenza`) - questa storia aggiunge solo la propagazione/visualizzazione di un dato già letto, nessun nuovo calcolo di scadenza.

**Ask First:** nessuna aggiuntiva - i 2 punti aperti originali della story sono già stati risolti esplicitamente con l'utente il 2026-08-20 (vedi epics.md, "Decisioni prese").

**Never:** non toccare `categorizzaStatoCertificato`/`calcolaGiorniAScadenza` (il calcolo dello stato/soglia resta invariato). Non introdurre una nuova convenzione di formattazione data - solo `parseDataUtc` + `toLocaleDateString("it-IT", {timeZone:"UTC"})`, mai `Date.prototype.toLocaleDateString()` senza `timeZone:"UTC"` su una stringa "YYYY-MM-DD" (bug di fuso orario già pagato in questo progetto, Story 4.5/4.6 - vedi `calcola-giorni-a-scadenza.ts`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Atleta con badge "scaduto"/"in scadenza" su `/gruppi` o `/i-miei-gruppi` | click sul badge | il badge (ora `<button>`) rivela la data di scadenza in formato gg/mm/aaaa, area di tocco ≥44×44px | N/A |
| Click di nuovo sullo stesso badge | badge già espanso | la data si nasconde di nuovo (toggle) | N/A |
| Atleta senza badge (certificato in regola o assente) | riga tabella | nessun elemento cliccabile nuovo nella colonna Certificato, layout invariato | N/A |
| Drill-down "scaduto"/"in scadenza" espanso su `/vista-dirigente`/`/vista-allenatore` | click sulla stat-tile (comportamento esistente, invariato) | ogni Atleta elencata mostra anche la data di scadenza accanto al nome, sempre visibile, nessun click aggiuntivo | N/A |
| Gruppo escluso dai permessi Dirigente (Story 5.2, `conteggi: null`) | `/vista-dirigente` | invariato - nessun bucket/data calcolabile, stesso messaggio "fuori dai permessi" di oggi | N/A |
| Atleta risolvibile solo come "Atleta sconosciuta" (caso limite difensivo pre-esistente, GruppoAtleta/elencaAtlete divergenti) | `/vista-dirigente`/`/vista-allenatore` | mostra comunque la data di scadenza accanto a "Atleta sconosciuta" - il dato non dipende dalla risoluzione del nome | N/A |

</frozen-after-approval>

## Code Map

- `lib/raggruppa-per-settimana.ts` -- nessuna modifica, solo riuso di `parseDataUtc` già esportata
- `lib/certificato-in-scadenza-per-atleta.ts` -- nuova funzione esportata `formattaDataScadenzaCertificato(dataFineValidita: string): string` (`parseDataUtc(dataFineValidita.slice(0,10)).toLocaleDateString("it-IT", {timeZone:"UTC"})`, stesso `.slice(0,10)` difensivo già usato in `calcola-giorni-a-scadenza.ts` per una stringa che potrebbe essere un timestamp completo); `calcolaAtleteConCertificatoInScadenza` estesa per includere `dataFineValidita: string | null` nell'oggetto restituito (passthrough del valore già letto da `RigaCertificato`, nessun nuovo calcolo) e nel tipo di ritorno
- `app/app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx` -- tipo `Atleta` esteso con `dataFineValidita: string | null`
- `app/app/(gruppi-allenatori)/gruppi/page.tsx` -- il type-guard inline del `.filter()` (righe ~146-155) esteso con `dataFineValidita: string | null`
- `app/app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` -- stesso type-guard inline esteso (righe ~138-147)
- `app/app/(gruppi-allenatori)/gruppi/AtletaTabellaRiga.tsx` -- il badge Certificato diventa un `<button type="button">` con stato locale `mostraData` (`useState`), `aria-expanded`/`aria-controls`, mostra `formattaDataScadenzaCertificato(atleta.dataFineValidita)` quando espanso (solo se `dataFineValidita` non è null - difensivo, l'invariante garantisce che scaduto/in-scadenza implichi una data non-null, ma il tipo resta `string | null`); un'Atleta senza badge non renderizza alcun bottone (invariato, solo `<span>` vuoto come oggi)
- `app/app/(gruppi-allenatori)/gruppi/gruppi.module.css` -- il badge Certificato diventa cliccabile: stile bottone che preserva l'aspetto visivo attuale di `.badge` ma con area di tocco ≥44×44px (mirror di `.frecciaPost`/`.pausaPost` in `home-pubblica.module.css`: `display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px`); nuovo stile per il testo della data rivelata
- `app/app/(amministrazione)/vista-dirigente/GruppoCard.tsx` -- `GruppoCardData.atleteScadute`/`atleteInScadenza` da `string[]` a `{ nome: string; dataScadenza: string }[]`; il drill-down mostra `{item.nome} — {item.dataScadenza}` invece di solo `{nome}`
- `app/app/(amministrazione)/vista-dirigente/page.tsx` -- `atleteScadute`/`atleteInScadenza` ora array di oggetti (`{ nome, dataScadenza: formattaDataScadenzaCertificato(...) }`), `.sort()` aggiornato per ordinare su `.nome`
- `app/app/(gruppi-allenatori)/vista-allenatore/page.tsx` -- stesse modifiche del file gemello sopra
- `lib/certificato-in-scadenza-per-atleta.test.ts` -- nuovi casi per `formattaDataScadenzaCertificato` e per il campo `dataFineValidita` propagato da `calcolaAtleteConCertificatoInScadenza`

## Tasks & Acceptance

**Execution:**
- [ ] `lib/certificato-in-scadenza-per-atleta.ts` -- `formattaDataScadenzaCertificato` + `dataFineValidita` propagato
- [ ] `AtletaAssegnata.tsx` -- tipo `Atleta` esteso
- [ ] `gruppi/page.tsx` + `i-miei-gruppi/page.tsx` -- type-guard estesi
- [ ] `AtletaTabellaRiga.tsx` -- badge cliccabile con toggle data
- [ ] `gruppi.module.css` -- touch target 44×44 + stile data
- [ ] `GruppoCard.tsx` -- drill-down con data sempre visibile
- [ ] `vista-dirigente/page.tsx` + `vista-allenatore/page.tsx` -- bucket `{nome, dataScadenza}`
- [ ] `lib/certificato-in-scadenza-per-atleta.test.ts` -- nuovi casi

**Acceptance Criteria:** vedi epics.md Story 9.34 (4 AC, verbatim - non duplicati qui).

## Spec Change Log

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione

**Manual checks (obbligatorio, non solo se manca la CLI):**
- Dopo il deploy: un Allenatore su `/i-miei-gruppi` clicca un badge "in scadenza"/"scaduto" e vede la data; un Admin/Dirigente ripete lo stesso su `/gruppi`; un Admin apre `/vista-dirigente` (e un Allenatore `/vista-allenatore`), espande il drill-down "scaduto"/"in scadenza" e vede la data accanto a ogni nome senza ulteriori click

## Suggested Review Order

**Il dato che attraversa i livelli (nessuna regressione sul calcolo esistente)**

- `formattaDataScadenzaCertificato` e la propagazione di `dataFineValidita` - verificare che non tocchi `categorizzaStatoCertificato`.
  [`lib/certificato-in-scadenza-per-atleta.ts`](../../lib/certificato-in-scadenza-per-atleta.ts)

**Il badge cliccabile (touch target, nessun elemento nuovo se non c'è badge)**

- Area di tocco 44×44px, toggle, nessuna regressione per un'Atleta senza badge.
  [`AtletaTabellaRiga.tsx`](../../app/app/(gruppi-allenatori)/gruppi/AtletaTabellaRiga.tsx)

**Il drill-down (data sempre visibile, nessun click aggiuntivo)**

- `atleteScadute`/`atleteInScadenza` come oggetti, non più stringhe.
  [`GruppoCard.tsx`](../../app/app/(amministrazione)/vista-dirigente/GruppoCard.tsx)
