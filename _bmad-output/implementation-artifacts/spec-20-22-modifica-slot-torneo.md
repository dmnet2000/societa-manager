---
title: 'Story 20.22: Modifica di uno Slot del Torneo esistente'
type: 'feature'
created: '2026-09-06'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '18c59a7bdf98b2afef50e120de1da6ab96954136'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** oggi uno `SlotTorneo` esistente si può solo visualizzare e cancellare (`SlotTorneoRow.tsx`) - per scelta esplicita di Story 20.9 ("nessun AC richiede la modifica"). Un Admin che ha sbagliato o deve spostare un orario/palestra è costretto a cancellare e ricreare lo Slot, perdendo l'eventuale collegamento a una Partita già assegnata.

**Approach:** aggiungere la modifica inline di uno Slot esistente, mirror esatto del pattern già in uso da `CategoriaTorneoRow.tsx` nello stesso modulo (icona matita → riga in modifica inline con `useActionState`, ricollasso automatico dopo salvataggio riuscito). Campi modificabili: etichetta, data, ora, Palestra ed eventuale Campo - MAI fase/tabellone, che restano fissi dopo la creazione.

## Boundaries & Constraints

**Always:**
- Campi modificabili: `etichetta`, `data`, `ora`, `palestraId`, `campoId` (opzionale). `fase`/`tabellone` non sono mai modificabili dopo la creazione - cambiarli romperebbe la corrispondenza già stabilita con Partite/prenotazioni agganciate a quello Slot per quella fase/tabellone.
- Riusa `validaCampiSlot` (già usata da `creaSlotTorneoAction`) per etichetta/data/ora/palestraId - nessuna seconda validazione duplicata.
- Il campo Campo è mostrato/modificabile SOLO quando `fase === "GIRONE"` (mirror esatto della condizione già usata da `NuovoSlotTorneoForm.tsx` per decidere se mostrare la selezione Campo) - per ogni altra fase lo Slot non ha mai un Campo, invariato. Se un Campo è scelto, il server verifica sempre che appartenga davvero alla Palestra scelta (mai fidarsi del client, stessa disciplina di `creaSlotTorneoPerSelezione`, Story 20.18).
- L'update è scoped per `id` + `edizioneTorneoId` insieme (stesso pattern anti-mismatch di `aggiornaCategoriaTorneo`/`cancellaSlotTorneo`) - `count === 0` è trattato come "Slot non trovato in questa Edizione".
- Nessun vincolo sullo stato dello Slot: modificabile anche se già assegnato a una Partita o (in futuro) prenotato per una riga ipotetica - non è un'operazione distruttiva.
- Stesso perimetro di autorizzazione del resto del modulo (ADMIN/DIRIGENTE). Guida in-app (`/app/torneo`) aggiornata se la sezione "Slot orari/Palestre" è già documentata.

**Ask First:** nessuna - i limiti sopra sono già decisi qui/con l'utente (AskUserQuestion: campi modificabili confermati).

**Never:** nessuna modifica a `fase`/`tabellone` di uno Slot esistente. Nessuna modifica allo schema Prisma (tutti i campi esistono già). Nessuna modifica alla checklist di creazione in blocco per Girone (Story 20.12/20.18) - questa storia tocca solo la modifica di UNO Slot già esistente, non la creazione.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin modifica etichetta/data/ora/Palestra di uno Slot fase≠GIRONE | dati validi | Slot aggiornato, riga si ricollassa in sola lettura | N/A |
| Admin modifica Palestra e Campo di uno Slot fase=GIRONE | Campo scelto appartiene alla Palestra scelta | Slot aggiornato con la nuova coppia Palestra/Campo | N/A |
| Admin sceglie un Campo che non appartiene alla Palestra scelta | mismatch Palestra/Campo | rifiutata | `VALIDATION` |
| Admin invia dati non validi (data/ora fuori formato, etichetta vuota) | stesso formato già validato in creazione | rifiutata | `VALIDATION` (stesso messaggio di `creaSlotTorneoAction`) |
| Admin modifica uno Slot già assegnato a una Partita | Slot con `partite` collegate | modifica consentita normalmente | N/A |

</frozen-after-approval>

## Code Map

- `lib/torneo.ts` -- nuova `aggiornaSlotTorneo(id, edizioneTorneoId, dati: {etichetta, data, ora, palestraId, campoId})` (mirror `aggiornaCategoriaTorneo:117`, `updateMany` scoped su `id`+`edizioneTorneoId`)
- `app/app/(torneo)/torneo/actions.ts` -- nuova `aggiornaSlotTorneoAction` (mirror `aggiornaCategoriaTorneoAction:439`: `requireRuolo`, riusa `validaCampiSlot:567`, verifica Palestra esistente già come `creaSlotTorneoAction:658`, verifica Campo↔Palestra coerente quando `fase===GIRONE` e Campo è impostato, mirror della ricomputazione server-side già in `creaSlotTorneoPerSelezione`)
- `app/app/(torneo)/torneo/SlotTorneoRow.tsx` -- estesa con toggle `inModifica` e form inline (mirror esatto `CategoriaTorneoRow.tsx:32-229`: stato `inModifica`, `useActionState` per `aggiornaSlotTorneoAction`/`cancellaSlotTorneoAction` separati, gestione errori indipendente, Salva/Annulla); il campo Campo compare solo quando `slot.fase === "GIRONE"`, popolato dai Campi della Palestra correntemente selezionata nel form (prop `palestre` da passare giù, mirror `NuovoSlotTorneoForm.tsx`)
- `app/app/(torneo)/torneo/[edizioneId]/slot/page.tsx` -- passa la lista `palestre` (già letta per `NuovoSlotTorneoForm`) anche a `SlotTorneoRow`
- `lib/guida/contenuti.ts` -- rotta `/app/torneo`: una frase in più sulla modifica di uno Slot esistente (etichetta/data/ora/Palestra/Campo)

## Tasks & Acceptance

**Execution:**
- [ ] `lib/torneo.ts` -- `aggiornaSlotTorneo` + test
- [ ] `torneo/actions.ts` -- `aggiornaSlotTorneoAction` (validazione + verifica Campo↔Palestra) + test
- [ ] `SlotTorneoRow.tsx` -- modifica inline (mirror `CategoriaTorneoRow.tsx`)
- [ ] `[edizioneId]/slot/page.tsx` -- prop `palestre` passata a `SlotTorneoRow`
- [ ] `lib/guida/contenuti.ts` -- aggiornamento `corpo` rotta `/app/torneo`

**Acceptance Criteria:**
- Given uno Slot esistente di fase GIRONE con un Campo assegnato, when l'Admin ne modifica Palestra e Campo con una coppia valida, then lo Slot è aggiornato e la riga torna in sola lettura
- Given uno Slot di fase SEMIFINALE/FINALE, when l'Admin apre la modifica, then non vede alcun campo Campo (mai avuto uno) e può modificare solo etichetta/data/ora/Palestra
- Given uno Slot già assegnato a una Partita reale, when l'Admin lo modifica, then la modifica è consentita senza alcun blocco legato all'assegnazione esistente

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti verdi, inclusi i nuovi test
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori

**Manual checks (obbligatorio, dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Modificare etichetta/data/ora/Palestra di uno Slot di fase SEMIFINALE: verificare l'aggiornamento e l'assenza del campo Campo.
- Modificare Palestra e Campo di uno Slot di fase GIRONE con Campi disponibili: verificare l'aggiornamento; provare una combinazione Palestra/Campo incoerente e verificare il rifiuto.
- Modificare uno Slot già assegnato a una Partita: verificare che la modifica non tocchi l'assegnazione esistente.

## Suggested Review Order

**Anti-tampering: fase/tabellone sempre riletti dal database**

- Entry point: la fase reale dello Slot è riletta da `trovaSlotTorneoPerId` e forzata nel `FormData` passato a `validaCampiSlot`, mai fidandosi di un valore inviato dal client.
  [`actions.ts:770`](../../app/app/(torneo)/torneo/actions.ts#L770)

**Coerenza Campo↔Palestra**

- Il Campo esiste solo per fase GIRONE; se scelto, il server verifica che appartenga davvero alla Palestra selezionata.
  [`actions.ts:816`](../../app/app/(torneo)/torneo/actions.ts#L816)

- Helper di lookup del Campo, mirror di `trovaPalestraPerId`.
  [`torneo.ts:366`](../../lib/torneo.ts#L366)

**Update scoped e senza vincoli sullo stato dello Slot**

- `updateMany` scoped su id+edizioneTorneoId, `fase`/`tabellone` esclusi dai campi scrivibili per costruzione.
  [`torneo.ts:512`](../../lib/torneo.ts#L512)

**UI: modifica inline della riga**

- Toggle `inModifica`, form con Palestra/Campo dipendenti (il Campo si resetta se la Palestra cambia).
  [`SlotTorneoRow.tsx:49`](../../app/app/(torneo)/torneo/SlotTorneoRow.tsx#L49)

**Peripherals**

- Prop `palestre` propagata da `SlotTorneoPage` a `SlotTorneoRow`.
  [`page.tsx:84`](../../app/app/(torneo)/torneo/[edizioneId]/slot/page.tsx#L84)

- Test della Server Action (tampering fase/campoId, coerenza Campo/Palestra, count-0, errori).
  [`actions.test.ts`](../../app/app/(torneo)/torneo/actions.test.ts)

