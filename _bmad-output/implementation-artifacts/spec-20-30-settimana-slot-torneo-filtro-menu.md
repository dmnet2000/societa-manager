---
title: 'Story 20.30: Settimana esplicita sugli Slot del Torneo e filtro degli Slot passati/occupati nel menu di assegnazione'
type: 'feature'
created: '2026-09-13'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'd9ea1ddf2ee5fafdb3998f1938b6f65a771c2608'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** il menu a tendina "Slot" di `RisultatoPartitaTorneoForm.tsx` (usato sia per gli incontri di girone, `risultati/page.tsx`, sia per semifinali/finali, `tabellone/page.tsx`) mostra sempre TUTTI gli SlotTorneo di fase `GIRONE`/della fase pertinente dell'intera Edizione, inclusi quelli di una Settimana del torneo gia' conclusa - se gia' occupati da un'altra Partita, restano comunque in elenco (con l'avviso "(occupato)"), affollando il menu con opzioni che non hanno piu' senso di essere scelte. Richiesta esplicita dell'utente durante la gestione dal vivo del torneo.

**Approach:** `SlotTorneo` guadagna un campo esplicito `settimana` (collegamento reale, non dedotto dalla data - decisione dell'utente durante il checkpoint di questa story). Il menu a tendina nasconde uno Slot quando appartiene a una Settimana precedente a quella della Categoria corrente **E** e' gia' occupato da un'altra Partita (entrambe le condizioni insieme - decisione dell'utente: uno Slot passato ma ancora libero resta visibile, uno Slot futuro ma occupato resta visibile con l'avviso esistente).

## Boundaries & Constraints

**Always:**
- `SlotTorneo.settimana` e' `SettimanaTorneo?` (nullable) - additivo, nessun backfill per gli Slot esistenti (restano `null` finche' un Admin non li modifica esplicitamente). Uno Slot con `settimana` null **non e' mai nascosto** dal nuovo filtro (comportamento identico a oggi finche' non viene valorizzato).
- Le due Form di creazione Slot (singolo, `NuovoSlotTorneoForm.tsx`; in blocco per il girone, stesso form/Server Action) richiedono ORA la Settimana per **ogni nuovo Slot** - campo obbligatorio, mirror di `etichetta`/`data`/`ora`.
- Il form di modifica (`SlotTorneoRow.tsx`/`aggiornaSlotTorneoAction`) rende `settimana` modificabile come `etichetta`/`data`/`ora`/Palestra/Campo (Story 20.22) - mai immutabile come `fase`/`tabellone`. Permette anche di valorizzarla per la prima volta su uno Slot legacy `null`.
- **Criterio "Settimana precedente"**: `slot.settimana === SETTIMANA_1 && categoria.settimana === SETTIMANA_2` (unico caso possibile con le due Settimane esistenti, Story 20.1). Nessuna Settimana e' mai "precedente" a Settimana 1.
- **Condizione di nascondimento nel menu** (entrambe insieme): `slot.settimana` e' valorizzata E precedente a quella della Categoria corrente E lo Slot e' gia' occupato da un'ALTRA Partita (`slotOccupati.has(id) && id !== partita.slotTorneoId`, stesso insieme "occupati" gia' in uso). Lo Slot attualmente assegnato a QUESTA Partita resta sempre selezionabile/visibile, qualunque sia la sua Settimana/stato.
- Applicato in un solo punto condiviso: `RisultatoPartitaTorneoForm.tsx` (component unico riusato sia da `risultati/page.tsx` sia da `tabellone/page.tsx`, Story 20.9/20.4) - nessuna duplicazione della logica di filtro tra le due pagine chiamanti.
- `PrenotaSlotIpoteticoForm.tsx` (prenotazione anticipata, Story 20.21) resta **fuori scope**: la sua lista di Slot disponibili (`elencaSlotTorneoLiberi`) esclude gia' per definizione ogni Slot occupato, la condizione "occupato" di questa story non si applica mai li'.

**Ask First:** nessuna - le due decisioni aperte (collegamento reale Slot→Settimana invece di un'euristica sulla data; condizione "entrambe insieme" invece di "una sola basta") sono state chiuse con l'utente durante la stesura di questa spec.

**Never:** nessun backfill automatico della Settimana sugli Slot gia' esistenti (deciso: restano `null`, mai nascosti finche' non editati). Nessuna modifica al comportamento dell'avviso `window.confirm` esistente prima di sovrascrivere uno Slot occupato (Story 20.9, invariato per ogni Slot che resta visibile in elenco). Nessuna modifica a `PrenotaSlotIpoteticoForm.tsx`/`elencaSlotTorneoLiberi`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Slot di Settimana 1, occupato da un'altra Partita, Categoria corrente di Settimana 2 | `slot.settimana = SETTIMANA_1`, occupato, `categoria.settimana = SETTIMANA_2` | Non compare nel menu | N/A |
| Slot di Settimana 1, LIBERO, Categoria corrente di Settimana 2 | come sopra ma libero | Compare regolarmente nel menu | N/A |
| Slot di Settimana 2, occupato da un'altra Partita, Categoria corrente di Settimana 2 | stessa Settimana | Compare con l'avviso "(occupato)" esistente, invariato | N/A |
| Slot con `settimana` null (legacy, mai editato) | qualunque stato occupato/libero | Compare sempre, mai nascosto dal nuovo filtro | N/A |
| Slot di Settimana 1 gia' assegnato a QUESTA Partita, occupato "da se stesso" | `partita.slotTorneoId === slot.id` | Resta selezionabile (e' l'assegnazione corrente, mai nascosta) | N/A |
| Admin crea un nuovo Slot senza scegliere la Settimana | form di creazione | Rifiutato con messaggio esplicito, stesso trattamento di un campo obbligatorio mancante (`etichetta`) | `VALIDATION` |
| Admin modifica uno Slot legacy (`settimana` null) impostando una Settimana | form di modifica | Salvato, da quel momento lo Slot partecipa al nuovo filtro | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- `SlotTorneo`: nuovo campo `settimana SettimanaTorneo?` (nullable, nessun default); nuova migrazione additiva.
- `lib/torneo.ts` -- `creaSlotTorneo`/`creaSlotTorneoPerSelezione`/`aggiornaSlotTorneo`: parametro `settimana` aggiunto a ciascuna; nuovo helper puro (es. `slotDaNascondereNelMenu(slot, categoriaSettimana, slotOccupati, slotAssegnatoId)`) testato a se', riusato da `RisultatoPartitaTorneoForm.tsx`.
- `app/app/(torneo)/torneo/actions.ts` -- `creaSlotTorneoAction`, azione di creazione in blocco per il girone, `aggiornaSlotTorneoAction`: validano/passano `settimana` (obbligatoria in creazione, modificabile in modifica).
- `app/app/(torneo)/torneo/NuovoSlotTorneoForm.tsx` -- nuovo `<select>` "Settimana" (opzioni da `SettimanaTorneo`, mirror del `<select>` "Fase" gia' presente), obbligatorio, unico per l'intero form (si applica a tutti gli Slot creati in blocco per il girone).
- `app/app/(torneo)/torneo/SlotTorneoRow.tsx` -- stesso `<select>` "Settimana" nel form di modifica, `defaultValue` dallo Slot corrente (`""`/non impostata se `null`).
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/RisultatoPartitaTorneoForm.tsx` -- nuovo prop `categoriaSettimana: SettimanaTorneo`; filtro di `slotDisponibili` prima del `.map` che costruisce le `<option>`, usando l'helper puro sopra.
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/page.tsx` e `.../tabellone/page.tsx` -- passano `categoria.settimana` al form (gia' disponibile, nessuna nuova query).

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + migrazione -- `SlotTorneo.settimana` nullable
- [x] `lib/torneo.ts` -- funzioni di scrittura estese (`creaSlotTorneo`/`creaSlotTorneoPerSelezione`/`aggiornaSlotTorneo`) + test. Deviazione dal Code Map: l'helper puro di filtro NON vive qui - `lib/torneo.ts` importa `"server-only"`, che avrebbe rotto il bundle client di `RisultatoPartitaTorneoForm.tsx` (Client Component). Spostato in quel file stesso, mirror dello stile gia' in uso per `calcolaRigheSelezioneGirone`/`slotNonModificabilePerCampo` (helper puro esportato da una Client Component, testato nel proprio `.test.ts`).
- [x] `actions.ts` -- creazione (singola e in blocco) e modifica validano/passano `settimana` + test
- [x] `NuovoSlotTorneoForm.tsx` + `SlotTorneoRow.tsx` -- nuovo `<select>` Settimana
- [x] `RisultatoPartitaTorneoForm.tsx` + le due pagine chiamanti -- filtro del menu con l'helper puro `slotDaNascondereNelMenu` (definito in `RisultatoPartitaTorneoForm.tsx`, vedi sopra) + test

**Acceptance Criteria:**
- Given uno Slot di Settimana 1 gia' occupato, when l'Admin apre il menu Slot di una Categoria di Settimana 2, then quello Slot non compare
- Given lo stesso Slot ma ancora libero, when l'Admin apre lo stesso menu, then compare regolarmente
- Given uno Slot con Settimana non impostata (legacy), when l'Admin apre qualunque menu Slot, then compare sempre, occupato o meno
- Given l'Admin tenta di creare un nuovo Slot senza scegliere la Settimana, then l'operazione e' rifiutata con un messaggio esplicito
- Given una Partita gia' assegnata a uno Slot di Settimana 1 occupato "da se stessa", when il menu della sua Categoria (Settimana 2) viene renderizzato, then quello Slot resta selezionabile

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti verdi, inclusi i nuovi test dell'helper puro
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Creare due Slot (uno per Settimana), occupare quello di Settimana 1 con una Partita, verificare che sparisca dal menu di una Categoria di Settimana 2 ma resti nel menu di una Categoria di Settimana 1.
- Verificare che uno Slot esistente (creato prima di questa story, Settimana non impostata) continui a comparire ovunque come oggi.

## Suggested Review Order

**Modello dati**

- Campo nullable additivo, collegamento reale (non dedotto dalla data) alla Settimana del torneo.
  [`schema.prisma:1163`](../../prisma/schema.prisma#L1163)

**Logica di nascondimento (predicato puro, testato)**

- Entry point: entrambe le condizioni insieme (Settimana precedente E occupato), mai per uno Slot legacy `null`.
  [`RisultatoPartitaTorneoForm.tsx:53`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/RisultatoPartitaTorneoForm.tsx#L53)

- Applicato in un solo punto condiviso, prima del `.map` che costruisce le `<option>`.
  [`RisultatoPartitaTorneoForm.tsx:267`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/RisultatoPartitaTorneoForm.tsx#L267)

- `categoria.settimana` già disponibile, passato ai 4 punti di chiamata senza nuove query.
  [`tabellone/page.tsx:375`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/page.tsx#L375)

- Stesso prop passato dalla pagina gironi.
  [`risultati/page.tsx:156`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/page.tsx#L156)

**Scrittura: obbligatoria in creazione, facoltativa in modifica**

- `creaSlotTorneoAction`: validazione esplicita, la Settimana è obbligatoria per ogni nuovo Slot.
  [`actions.ts:749`](../../app/app/(torneo)/torneo/actions.ts#L749)

- `aggiornaSlotTorneoAction`: vuoto è "non impostata" legittimo, mai un errore; un valore manomesso resta rifiutato.
  [`actions.ts:911`](../../app/app/(torneo)/torneo/actions.ts#L911)

- `creaSlotTorneo`/`creaSlotTorneoPerSelezione`: parametro propagato a ogni riga creata in blocco per il girone.
  [`torneo.ts:445`](../../lib/torneo.ts#L445)

- `aggiornaSlotTorneo`: nullable, permette sia di lasciare/rimuovere la Settimana sia di valorizzarla la prima volta.
  [`torneo.ts:639`](../../lib/torneo.ts#L639)

**Form Admin**

- Nuovo `<select>` obbligatorio, unico per l'intero form di creazione in blocco.
  [`NuovoSlotTorneoForm.tsx:132`](../../app/app/(torneo)/torneo/NuovoSlotTorneoForm.tsx#L132)

- Stesso `<select>`, facoltativo, nel form di modifica di uno Slot esistente.
  [`SlotTorneoRow.tsx:251`](../../app/app/(torneo)/torneo/SlotTorneoRow.tsx#L251)

**Test**

- 7 casi sul predicato puro: entrambe le condizioni, una sola, legacy null, Slot assegnato a se stesso, Settimana successiva occupata.
  [`RisultatoPartitaTorneoForm.test.ts:20`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/RisultatoPartitaTorneoForm.test.ts#L20)

