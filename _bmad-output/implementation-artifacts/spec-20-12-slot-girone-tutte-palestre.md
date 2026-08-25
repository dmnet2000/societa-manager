---
title: "Story 20.12: Creazione Slot di girone su tutte le Palestre in un solo passaggio"
type: 'feature'
created: '2026-08-25'
status: 'done'
review_loop_iteration: 1
context: []
baseline_commit: '15f578401c08dcc485ad6d08099e1cf9ef7843ab'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** oggi creare gli Slot orari della fase a gironi (Story 20.9) richiede una creazione manuale separata per ciascuna Palestra usata in parallelo nello stesso orario (es. 4 gare simultanee il sabato pomeriggio su 4 palestre diverse = 4 invii identici del form, solo `palestraId` cambia).

**Approach:** deciso con l'utente tramite `AskUserQuestion` (2026-08-25) - quando la fase scelta nel form di creazione Slot è GIRONE, il campo Palestra scompare e un solo invio crea uno `SlotTorneo` per OGNI Palestra già censita nel gestionale (stessa etichetta/data/ora/fase GIRONE/tabellone nullo), letta sempre server-side (mai da una lista inviata dal client). Semifinali/finali restano invariate: un solo Slot, una sola Palestra scelta esplicitamente.

## Boundaries & Constraints

**Always:** l'elenco delle Palestre su cui creare gli Slot di girone è SEMPRE riletto server-side al momento della creazione (`prisma.palestra.findMany()`), mai fidandosi di un elenco/selezione inviata dal client - stessa disciplina "mai fidarsi del client per lo scoping" già applicata in tutta l'epica. Ogni Slot creato resta una riga `SlotTorneo` indipendente (nessuna nuova entità "gruppo di Slot" o relazione tra le righe create insieme) - cancellabile singolarmente come oggi, stesso comportamento di `cancellaSlotTorneoAction`/`SlotTorneoRow.tsx`, invariati.

**Ask First:** nessuna - i punti erano aperti, chiariti con l'utente prima di questa spec.

**Never:** nessuna modifica al comportamento per semifinali/finali (`fase !== "GIRONE"`) - form/validazione/creazione restano quelle di Story 20.9, bit per bit. Nessun vincolo di unicità nuovo tra Slot creati in blocco (stesso principio già accettato in Story 20.9 - "nessun controllo di duplicati/unicità tra Slot identici", deferred-work.md) - un doppio invio dello stesso form crea semplicemente 2×N righe invece di N, stesso rischio già accettato, solo scalato dal numero di Palestre. Nessuna modifica di schema/migrazione: questa storia è puramente applicativa (logica server + UI).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fase GIRONE, N Palestre censite | form senza Palestra selezionata (campo non mostrato) | N righe SlotTorneo create, stessa etichetta/data/ora/fase GIRONE/tabellone null, una per Palestra | N/A |
| Fase GIRONE, nessuna Palestra censita | 0 Palestre nel gestionale | creazione rifiutata | `VALIDATION` ("Nessuna Palestra configurata...") |
| Fase SEMIFINALE/FINALE_VINCENTI/FINALE_PERDENTI | comportamento Story 20.9 invariato | 1 riga SlotTorneo per la Palestra scelta esplicitamente | invariato (stessi messaggi di errore di Story 20.9) |
| Fase GIRONE con tabellone specificato (bypass client) | dati incoerenti | rifiutata (stesso vincolo discriminato già esistente) | `VALIDATION` |

</frozen-after-approval>

## Code Map

- `app/app/(torneo)/torneo/NuovoSlotTorneoForm.tsx` -- quando `fase === "GIRONE"` (stato locale già tracciato, mirror del `mostraTabellone` esistente), nascondere il campo `<select>` Palestra (non `required`, non inviato) e mostrare invece una breve nota testuale ("Verrà creato uno Slot per ciascuna Palestra già censita.") nello stesso punto del form. Per ogni altra fase, il campo Palestra resta invariato (mostrato, `required`).
- `app/app/(torneo)/torneo/actions.ts` -- `validaCampiSlot`: riordinare i controlli in modo che la validità di `fase` sia accertata PRIMA di decidere se `palestraId` è obbligatorio (oggi `palestraId` è controllato incondizionatamente, prima ancora di leggere `fase`). Il tipo di ritorno `CampiSlotValidati` diventa un'unione discriminata su `fase`: il ramo `GIRONE` non include `palestraId` (mai letto/richiesto dal form in quel caso); il ramo non-GIRONE lo include come oggi. `creaSlotTorneoAction`: se `valori.fase === "GIRONE"`, chiamare la nuova `creaSlotTorneoPerTutteLePalestre(edizioneTorneoId, etichetta, data, ora)` invece di `creaSlotTorneo`/`trovaPalestraPerId` - se il risultato indica zero Palestre esistenti, restituire `VALIDATION` ("Nessuna Palestra configurata: aggiungine una prima di creare uno Slot di girone."); altrimenti (fase non-GIRONE) percorso invariato (`trovaPalestraPerId` + `creaSlotTorneo`, bit per bit come oggi).
- `lib/torneo.ts` -- nuova funzione `creaSlotTorneoPerTutteLePalestre(dati: { edizioneTorneoId: string; etichetta: string; data: string; ora: string }): Promise<{ count: number }>` - legge `prisma.palestra.findMany({ select: { id: true } })` (stessa query già usata direttamente in `[edizioneId]/slot/page.tsx` per popolare il `<select>` esistente, qui invece server-side per la creazione), e se non vuota esegue `prisma.slotTorneo.createMany({ data: palestre.map((p) => ({ edizioneTorneoId, etichetta, data, ora, palestraId: p.id, fase: "GIRONE", tabellone: null })) })`; se vuota ritorna `{ count: 0 }` senza alcuna query di scrittura.
- `lib/guida/contenuti.ts` -- aggiornare la sezione `/app/torneo` esistente (creazione Slot) per menzionare che un solo invio per la fase a gironi crea uno Slot per ciascuna Palestra.

## Tasks & Acceptance

**Execution:**
- [x] `lib/torneo.ts` -- `creaSlotTorneoPerTutteLePalestre` + test
- [x] `torneo/actions.ts` -- `validaCampiSlot` riordinata (unione discriminata su fase) + branch GIRONE in `creaSlotTorneoAction` + test (creazione multipla, zero Palestre, semifinali/finali invariate, eventuali test di validazione la cui ASSERZIONE DIPENDE dall'ordine dei controlli - verificarli e aggiornarli se necessario)
- [x] `NuovoSlotTorneoForm.tsx` -- nascondere il campo Palestra per fase GIRONE + nota testuale
- [x] `lib/guida/contenuti.ts` -- aggiornare la sezione Slot

**Acceptance Criteria:** vedi `epics.md` Story 20.12 (Given/When/Then, verbatim).

## Design Notes

**Perché nessuna nuova entità "gruppo di Slot":** gli Slot creati insieme non hanno bisogno di restare collegati tra loro dopo la creazione - ciascuno si comporta esattamente come uno Slot creato singolarmente oggi (assegnabile/cancellabile in autonomia). Introdurre un raggruppamento persistente aggiungerebbe complessità (una nuova tabella/colonna, logica di cancellazione a cascata) senza che nessun AC lo richieda: l'utente ha chiesto una scorciatoia di CREAZIONE, non una gestione di gruppo permanente.

**Perché il riordino di `validaCampiSlot` invece di un controllo aggiuntivo in coda:** la validità di `fase` deve essere nota PRIMA di poter decidere se `palestraId` è un campo obbligatorio o meno - un controllo "palestraId obbligatorio solo se fase non è GIRONE" richiede necessariamente che `fase` sia già stata letta e validata. Questo cambia l'ordine in cui alcuni messaggi di errore vengono restituiti quando più campi sono vuoti contemporaneamente (es. oggi "La Palestra è obbligatoria" precede "La fase è obbligatoria" se entrambi mancano) - i test esistenti che asseriscono quell'ordine specifico vanno verificati e aggiornati di conseguenza, non è un effetto collaterale accidentale ma una conseguenza diretta e necessaria del nuovo requisito condizionale.

## Verification

**Commands:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`

**Manual checks (obbligatorio):** non eseguibile in questa sessione - ambiente di sviluppo locale rotto (Prisma WASM + Windows), Epic 20 mai deployata in produzione.

## Spec Change Log

Implementata direttamente (nessuna delega ad agente, dimensione medio-piccola, nessuna modifica di schema/migrazione). Review a 3 agenti in parallelo (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) su diff isolato dal baseline (675 righe).

**Verificato esplicitamente, nessun problema:** ordine dei controlli in `validaCampiSlot` corretto (etichetta/data/ora sempre incondizionati, `palestraId` obbligatorio solo nel ramo non-GIRONE); narrowing del tipo union `CampiSlotValidati` corretto in `creaSlotTorneoAction` (nessun cast sospetto); `creaSlotTorneoPerTutteLePalestre` rilegge sempre le Palestre server-side, `fase`/`tabellone` hardcoded (impossibile forzare un'altra fase attraverso questa funzione); nessun altro punto del codice (`cancellaSlotTorneoAction`, `SlotTorneoRow.tsx`, pagina `/slot`) assume erroneamente "un solo Slot per etichetta/data/ora"; tutti e 5 gli AC di epics.md verificati puntualmente, implementati e testati; nessuna modifica a `prisma/schema.prisma` (confermato dai 3 reviewer).

**PATCH (applicato):**
1. Nessun test verificava esplicitamente quale messaggio di errore vince quando `fase` e `palestraId` sono ENTRAMBI vuoti in un invio non-GIRONE (il riordino della validazione lo rende un caso genuinamente diverso da prima) - aggiunto test mirror di quello analogo già esistente per `creaEdizioneTorneoAction` ("reports the anno error first when both anno and nome are invalid").

**REJECT (nessuna azione, con motivazione):**
- Nessun test di componente per `NuovoSlotTorneoForm.tsx` che verifichi a runtime l'occultamento del campo Palestra per GIRONE (AC #1) - verificato via lettura del codice sorgente (condizione `mostraPalestra = fase !== "GIRONE"` non invertita). Gap coerente con il pattern già stabilito in tutto il progetto (zero file `*.test.tsx` esistono ovunque nella codebase), non introdotto né aggravato da questa storia - stesso REJECT già applicato in Story 20.9/20.11 per lo stesso motivo.
