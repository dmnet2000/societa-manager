---
title: 'Story 20.25: Scelta del Campo nella creazione di un singolo Slot'
type: 'feature'
created: '2026-09-06'
status: 'done'
review_loop_iteration: 1
context: []
baseline_commit: '1a454a86718bb9e57bae0ccd5303697bd23f3460'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** il form di creazione di UN SINGOLO Slot (`NuovoSlotTorneoForm.tsx`, usato per fase SEMIFINALE/FINALE_VINCENTI/FINALE_PERDENTI) mostra oggi solo un `<select>` Palestra - mai un Campo, anche quando la Palestra scelta ne ha più di uno censiti. Il gap era già stato notato (e lasciato fuori scope) durante l'investigazione di Story 20.22.

**Approach:** applicare al form di creazione lo stesso pattern già usato dal form di modifica di uno Slot esistente (`SlotTorneoRow.tsx`, Story 20.22): Palestra come `<select>` controllato, un `<select>` Campo aggiuntivo mostrato solo quando la Palestra scelta ha Campi censiti, con reset del Campo al cambio di Palestra. Lato server, estendere `creaSlotTorneoAction`/`creaSlotTorneo` per accettare ed validare `campoId`, riusando `trovaCampoPerId` (già esistente da Story 20.22) per la verifica di appartenenza.

## Boundaries & Constraints

**Always:**
- Il `<select>` Campo compare SOLO quando `fase !== "GIRONE"` (stesso ramo che già mostra la Palestra) E la Palestra correntemente selezionata ha almeno un Campo - mirror esatto della condizione già in uso in `SlotTorneoRow.tsx` per la modifica.
- Cambiare la Palestra selezionata nel form resetta la scelta del Campo (mirror `key={palestraSelezionata}` già usato in `SlotTorneoRow.tsx`).
- `campoId`, se presente, è sempre verificato server-side come appartenente alla Palestra scelta (`trovaCampoPerId`, mai fidandosi del client) - stessa identica disciplina già stabilita per `aggiornaSlotTorneoAction` (Story 20.22).
- Il Campo resta opzionale: una Palestra senza Campi censiti, o senza Campo scelto pur avendone, crea comunque lo Slot con `campoId: null` - nessuna regressione sul comportamento attuale.
- Rinegoziato dopo review (vedi Spec Change Log): uno Slot di fase diversa da GIRONE che ha già un `campoId` assegnato NON è modificabile - `aggiornaSlotTorneoAction` rifiuta l'intera modifica con un messaggio esplicito prima di validare qualunque altro campo, e l'icona "Modifica" di quello Slot in `SlotTorneoRow.tsx` è disabilitata con una spiegazione (`title`). Evita che `aggiornaSlotTorneoAction` (Story 20.22, che forza sempre `campoId: null` per fase non-GIRONE) cancelli silenziosamente un Campo assegnato in creazione da questa storia. Gli Slot di fase GIRONE restano pienamente modificabili come oggi (Story 20.22, invariata).

**Ask First:** nessuna - mirror diretto di un pattern già approvato in Story 20.22, salvo il punto rinegoziato sopra (deciso con l'utente dopo review).

**Never:** nessuna modifica alla creazione in blocco per Girone (checklist Palestra×Campo, Story 20.12/20.18, già corretta). Nessuna modifica allo schema Prisma (`campoId` su `SlotTorneo` esiste già da Story 20.18). Nessun tentativo di preservare/unire il Campo durante la modifica (l'unica strada scelta è bloccare l'intera modifica, non un merge parziale).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Crea Slot (fase SEMIFINALE) scegliendo una Palestra con più Campi e un Campo valido | Campo appartiene alla Palestra scelta | Slot creato con quel `campoId` | N/A |
| Crea Slot scegliendo una Palestra senza Campi censiti | nessun `<select>` Campo mostrato | Slot creato con `campoId: null`, comportamento invariato | N/A |
| Crea Slot con un Campo che non appartiene alla Palestra scelta (manomissione client) | mismatch Palestra/Campo | rifiutata | `VALIDATION` |
| Cambia Palestra dopo aver scelto un Campo, senza riscegliere il Campo | Palestra cambiata | il Campo torna a "Nessuno" nel form, mai inviato un `campoId` della Palestra precedente | N/A |
| Admin tenta di modificare uno Slot non-GIRONE con un `campoId` già assegnato | Slot creato con Campo da questa storia | rifiutata, l'icona Modifica è disabilitata | `VALIDATION` |

</frozen-after-approval>

## Code Map

- `lib/torneo.ts` -- `creaSlotTorneo` (riga ~366): il tipo `dati` guadagna `campoId: string | null` opzionale (default `null` se omesso), passato tale e quale a `prisma.slotTorneo.create`
- `app/app/(torneo)/torneo/actions.ts` -- `creaSlotTorneoAction`, ramo `else` non-GIRONE (riga ~725-736): legge `campoId` da `formData` (non da `validazione.valori`, che non lo considera per questo ramo, mirror `aggiornaSlotTorneoAction`), se presente verifica con `trovaCampoPerId` che `campo.palestraId === palestraId` altrimenti `VALIDATION`, poi lo passa a `creaSlotTorneo`
- `app/app/(torneo)/torneo/NuovoSlotTorneoForm.tsx` -- nuovo stato `palestraSelezionata` (Palestra `<select>` diventa controllato, `value`/`onChange` invece di `defaultValue`); `<select>` Campo aggiuntivo mostrato quando `mostraPalestra && campiDisponibili.length > 0` (mirror `SlotTorneoRow.tsx`); `palestraSelezionata` resettato a `""` insieme a `fase` nel blocco "success" esistente (righe ~57-63) e nell'effetto di reset del form (righe ~65-69)
- **Aggiunto dopo review (rinegoziazione, vedi Spec Change Log):** `app/app/(torneo)/torneo/actions.ts` -- `aggiornaSlotTorneoAction` (Story 20.22): subito dopo aver letto `slotEsistente`, se `slotEsistente.fase !== "GIRONE" && slotEsistente.campoId` rifiuta l'intera azione con `VALIDATION` prima di chiamare `validaCampiSlot`, mirror del pattern "guardia esplicita prima di ogni altra elaborazione" già usato altrove nell'epica
- **Aggiunto dopo review:** `app/app/(torneo)/torneo/SlotTorneoRow.tsx` -- il bottone "Modifica" (icona matita) è `disabled` con un `title` esplicativo quando `slot.fase !== "GIRONE" && slot.campoId` è impostato, coerente con la guardia server-side sopra

## Tasks & Acceptance

**Execution:**
- [x] `lib/torneo.ts` -- `creaSlotTorneo` accetta `campoId` opzionale + test
- [x] `torneo/actions.ts` -- `creaSlotTorneoAction` legge/valida `campoId` per il ramo non-GIRONE + test
- [x] `NuovoSlotTorneoForm.tsx` -- Palestra controllata + `<select>` Campo condizionale + reset coerente
- [x] `torneo/actions.ts` -- `aggiornaSlotTorneoAction` rifiuta la modifica di uno Slot non-GIRONE con `campoId` già assegnato + test
- [x] `SlotTorneoRow.tsx` -- icona "Modifica" disabilitata con spiegazione per quegli Slot

**Acceptance Criteria:**
- Given una Palestra con più Campi censiti, when la si seleziona nel form di creazione di un singolo Slot, then compare un `<select>` Campo popolato con i Campi di quella Palestra
- Given un Campo scelto, when si cambia la Palestra selezionata, then la scelta del Campo si azzera (mai inviato un Campo della Palestra precedente)
- Given un `campoId` che non appartiene alla Palestra inviata (bypassando il form), when si invia la creazione, then è rifiutata con un messaggio esplicito
- Given uno Slot non-GIRONE con un `campoId` assegnato, when l'Admin tenta di modificarlo (anche solo l'etichetta), then l'azione è rifiutata prima di scrivere qualunque campo, e l'icona Modifica è disabilitata con una spiegazione

## Spec Change Log

**2026-09-06 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer).** Trovata reale (Blind Hunter): `aggiornaSlotTorneoAction` (Story 20.22) forza sempre `campoId: null` per fase diversa da GIRONE - innocuo prima di questa storia (uno Slot non-GIRONE non aveva mai un Campo), ma con la creazione di Slot non-GIRONE con Campo ora possibile, qualunque modifica successiva a quello Slot (anche solo l'etichetta) lo cancellerebbe silenziosamente. Causa radice dentro il blocco congelato (`Never`: "nessuna modifica a SlotTorneoRow.tsx/aggiornaSlotTorneoAction"), quindi rinegoziato con l'utente invece di una patch autonoma. **Decisione dell'utente:** non provare a preservare/unire il Campo durante la modifica - bloccare del tutto la modifica di uno Slot non-GIRONE che ha già un Campo assegnato (icona Modifica disabilitata + rifiuto server-side esplicito). Frozen intent, Code Map e Tasks aggiornati di conseguenza.

**DEFER (annotati in `deferred-work.md`):** i restanti finding dei 3 reviewer (nessun test per la logica client-side nuova - stesso limite sistemico già accettato per ogni componente React del progetto; testo guida "più Campi" leggermente impreciso rispetto alla condizione reale `>= 1`; commento ora "morto" su `creaSlotTorneo` riguardo il caso `campoId` omesso, mai esercitato dall'unico chiamante reale; messaggio di errore che non distingue Campo inesistente da Campo di un'altra Palestra, mirror di un pattern già esistente; commento del modello Prisma non aggiornato; edge case a bassissima probabilità sul reset di `palestraSelezionata` al cambio Fase/aggiornamento della prop `palestre`).

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti verdi, inclusi i nuovi/estesi test
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori

**Manual checks (obbligatorio, dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Creare uno Slot di fase Semifinale scegliendo una Palestra a doppio Campo e un Campo specifico: verificare che venga salvato correttamente e mostrato con Palestra+Campo nell'elenco.
- Cambiare Palestra dopo aver scelto un Campo: verificare che il Campo si resetti.
- Creare uno Slot per una Palestra senza Campi censiti: verificare che il comportamento resti invariato (nessun select Campo, creazione regolare).
- Creare uno Slot di Semifinale con Campo, poi provare a modificarlo: verificare che l'icona Modifica sia disabilitata con una spiegazione, e che uno Slot Girone con Campo resti invece pienamente modificabile.

## Suggested Review Order

**Blocco della modifica su uno Slot con Campo (il cancello reale, aggiunto in review)**

- Predicato puro estratto e testato (Verification Gap Reviewer).
  [`SlotTorneoRow.tsx`](../../app/app/(torneo)/torneo/SlotTorneoRow.tsx) · [`SlotTorneoRow.test.ts`](../../app/app/(torneo)/torneo/SlotTorneoRow.test.ts)

- Guardia server-side, verificata prima di ogni altra elaborazione.
  [`actions.ts`](../../app/app/(torneo)/torneo/actions.ts)

**Creazione con Campo opzionale**

- Verifica server-side che il Campo appartenga davvero alla Palestra scelta.
  [`actions.ts`](../../app/app/(torneo)/torneo/actions.ts)

- Form: Palestra controllata, Campo condizionale con reset al cambio Palestra.
  [`NuovoSlotTorneoForm.tsx`](../../app/app/(torneo)/torneo/NuovoSlotTorneoForm.tsx)

**Peripherals**

- Derivazione condivisa estratta (fix di review, eliminava una duplicazione tra i due file sopra).
  [`campi-palestra-torneo.ts`](../../lib/campi-palestra-torneo.ts)

- Test della Server Action (creazione con/senza Campo, coerenza Campo/Palestra, blocco modifica).
  [`actions.test.ts`](../../app/app/(torneo)/torneo/actions.test.ts)

