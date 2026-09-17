---
title: 'Story 20.35: Refertista assegnabile indipendentemente dal risultato'
type: 'bugfix'
created: '2026-09-17'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '2d084f79bc07d6d0d6a86d01627232baf0960470'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** il campo Refertista (Story 20.34) è oggi inserito nello stesso form/stessa Server Action del risultato (`salvaRisultatoPartitaTorneoAction`) - `set1`/`set2` sono obbligatori sia lato client (`required`) sia lato server (`leggiPunteggioSet`), quindi non si può salvare un Refertista senza aver già completato un punteggio valido. Richiesta esplicita dell'utente: deve poter essere assegnato anche PRIMA che l'incontro inizi/abbia un risultato.

**Approach:** il Refertista diventa un'assegnazione indipendente dal risultato - mirror esatto del pattern già esistente per l'assegnazione dello Slot (`assegnaSlotPartitaTorneoAction`/`assegnaSlotPartitaTorneo`, Story 20.9): proprio form, propria Server Action, sempre visibile e salvabile indipendentemente dallo stato del risultato. Rimosso dal form/dalla Server Action del risultato (revert della parte di Story 20.34 che lo legava li').

## Boundaries & Constraints

**Always:**
- Nuova Server Action indipendente `assegnaRefertistaPartitaTorneoAction`, mirror di `assegnaSlotPartitaTorneoAction`: stesso perimetro `requireRuolo(["ADMIN","DIRIGENTE"])`, stessa rilettura server-side di `id`/`categoriaTorneoId` prima di scrivere, stessa doppia `revalidatePath` (risultati + tabellone).
- Stessa validazione già esistente (trim, `REFERTISTA_MAX = 20`, stringa vuota → `null`) - solo spostata dalla Server Action del risultato a quella nuova, nessun cambiamento di comportamento di validazione.
- **Mai bloccato da `erroreModificaBloccata`** (a differenza del risultato) - mirror esatto di `assegnaSlotPartitaTorneoAction`, che non applica quel blocco: il Refertista, come lo Slot, resta assegnabile/modificabile anche dopo che finali/tabellone a valle sono stati generati.
- Il form del risultato (`salvaRisultatoPartitaTorneoAction`) torna esattamente come prima di Story 20.34 - nessun campo `refertista` nei suoi dati/validazione.
- UI: form indipendente sempre visibile (nessun toggle "in modifica"), stesso trattamento del form Slot esistente sulla stessa riga - un `<input>` con `defaultValue` dal valore corrente + bottone "Salva", `key` sul valore corrente per rinfrescare il campo dopo un salvataggio riuscito (mirror `NomiSettimaneTorneoForm.tsx`).
- La visualizzazione pubblica/in admin già esistente (riga "Refertista: {nome}" su `/torneo`, colonna nella tabella "Mostra tutti gli incontri") resta invariata - legge lo stesso campo `PartitaTorneo.refertista`, nessuna migrazione, nessuna modifica a `app/torneo/page.tsx`/`TabellaIncontriCategoria.tsx`.

**Ask First:** nessuna - il pattern da seguire (mirror esatto dell'assegnazione Slot) è stato indicato esplicitamente dall'utente.

**Never:** nessuna modifica al modello dati (`PartitaTorneo.refertista` resta invariato, nessuna nuova migrazione). Nessuna modifica alla visualizzazione pubblica/tabellare già esistente. Nessuna modifica al form/alla Server Action dello Slot (solo mirror del pattern, non riuso diretto del codice).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin assegna un Refertista PRIMA che l'incontro abbia un risultato | Nessun punteggio inserito, Refertista valido | Salvato correttamente, nessun blocco per punteggio mancante | N/A |
| Admin assegna un Refertista dopo che il risultato è già stato inserito | Risultato già presente | Salvato indipendentemente, il risultato non viene toccato | N/A |
| Admin modifica il Refertista su un incontro con modifica del risultato bloccata (finali già generate) | `erroreModificaBloccata` vero per il risultato | Il Refertista resta comunque modificabile (mai bloccato, mirror Slot) | N/A |
| Admin lascia il campo vuoto e salva | Nessun testo | `refertista` diventa `null`, nessuna riga mostrata sul pubblico/tabella | N/A |
| Admin inserisce un testo oltre 20 caratteri | Testo troppo lungo | Rifiutato con lo stesso messaggio esplicito già esistente | `VALIDATION` |

</frozen-after-approval>

## Code Map

- `lib/torneo.ts` -- `aggiornaRisultatoPartitaTorneo`: rimosso `refertista` dai `dati` scritti (revert). Nuova `assegnaRefertistaPartitaTorneo(id, categoriaTorneoId, refertista: string | null)`, mirror esatto di `assegnaSlotPartitaTorneo` (stesso `updateMany` scoped su id+categoriaTorneoId).
- `app/app/(torneo)/torneo/actions.ts` -- `validaCampiRisultato`/`CampiRisultatoValidati`/`salvaRisultatoPartitaTorneoAction`: rimosso tutto ciò che riguarda `refertista` (revert). `REFERTISTA_MAX` spostato/riusato dalla nuova azione. Nuova `assegnaRefertistaPartitaTorneoAction`, mirror di `assegnaSlotPartitaTorneoAction` (stessa rilettura `trovaPartitaTorneoPerId`/`trovaCategoriaTorneoPerId`, stessa validazione lunghezza, **nessuna chiamata a `erroreModificaBloccata`**).
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/RisultatoPartitaTorneoForm.tsx` -- rimosso `refertista` da `valoriIniziali()`/dallo stato del form risultato/dal fieldset punteggio/dalla riga di sola lettura dedicata. Nuovo `useActionState(assegnaRefertistaPartitaTorneoAction, undefined)` + form indipendente (mirror del form Slot esistente sulla stessa riga: sempre visibile, `<input name="refertista" defaultValue={partita.refertista ?? ""}>` + bottone "Salva", `key` sul valore per rinfrescare dopo un salvataggio riuscito).

## Tasks & Acceptance

**Execution:**
- [x] `lib/torneo.ts` -- `aggiornaRisultatoPartitaTorneo` (revert) + nuova `assegnaRefertistaPartitaTorneo` + test
- [x] `actions.ts` -- `salvaRisultatoPartitaTorneoAction` (revert) + nuova `assegnaRefertistaPartitaTorneoAction` + test
- [x] `RisultatoPartitaTorneoForm.tsx` -- rimosso dal form risultato, nuovo form indipendente sempre visibile

**Acceptance Criteria:**
- Given un incontro senza alcun risultato inserito, when l'Admin assegna un Refertista, then viene salvato senza richiedere alcun punteggio
- Given un incontro con modifica del risultato bloccata (finali generate a valle), when l'Admin modifica il Refertista, then l'operazione riesce comunque (mai bloccata come il risultato)
- Given il form del risultato, when l'Admin lo apre in modifica, then non contiene più alcun campo Refertista (spostato nel proprio form indipendente)

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti verdi, inclusi i test aggiornati/nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Assegnare un Refertista su un incontro senza ancora alcun risultato, verificare che si salvi correttamente e compaia su `/torneo`.
- Verificare che il form del risultato non richieda più il Refertista per essere salvato.

## Suggested Review Order

**Funzionalità principale**

- Nuova Server Action indipendente, mirror esatto di `assegnaSlotPartitaTorneoAction` (nessuna chiamata a `erroreModificaBloccata`).
  [`actions.ts:2392`](../../app/app/(torneo)/torneo/actions.ts#L2392)

- Nuovo form indipendente sempre visibile sulla riga dell'incontro, `key` sul valore corrente per rinfrescare dopo il salvataggio.
  [`RisultatoPartitaTorneoForm.tsx:252`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/RisultatoPartitaTorneoForm.tsx#L252)

- Revert completo del Refertista dal form/dalla Server Action del risultato (Story 20.34).
  [`actions.ts:2076`](../../app/app/(torneo)/torneo/actions.ts#L2076)

**Correzioni emerse in review**

- `REFERTISTA_MAX` spostato accanto al suo unico chiamante rimasto (`assegnaRefertistaPartitaTorneoAction`) - prima era lasciato accanto a `validaCampiRisultato`, che non lo usa più dopo il revert.
  [`actions.ts:2397`](../../app/app/(torneo)/torneo/actions.ts#L2397)

**Note (non modificate, coerenti con pattern già esistenti)**

- Nessun `aria-label` per-riga sul bottone "Salva" del Refertista (Blind Hunter) - verificato: identico al bottone "Assegna/Aggiorna Slot" già esistente che questa storia mirror-izza, non una regressione introdotta qui.
- `maxLength` client-side rende il ramo server "troppo lungo" raggiungibile solo da una richiesta manomessa (Blind Hunter) - stesso pattern deliberato già in uso per `ETICHETTA_SLOT_MAX`.
- `String(formData.get("id"))` senza controllo di tipo (Edge Case Hunter) - identico al pattern già in `assegnaSlotPartitaTorneoAction`, non introdotto da questa storia.
- Due findings deferiti (conferma prima di svuotare il campo; perdita di una modifica non salvata su remount concorrente) - vedi `deferred-work.md`, sezione "spec-20-35" (2026-09-17).
