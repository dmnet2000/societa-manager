---
title: "Story 20.9: Slot orari e Palestre per le partite del Torneo"
type: 'feature'
created: '2026-08-25'
status: 'done'
review_loop_iteration: 1
context: []
baseline_commit: '95a260c38ff6ee04f246c12e22e3baac43a42722'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** oggi una `PartitaTorneo` non ha data/ora/palestra - l'Admin non ha modo di pianificare in anticipo dove/quando si gioca ogni incontro del weekend di torneo, comprese semifinali e finali non ancora disputate.

**Approach:** deciso in sessione di party mode (Mary/John/Sally/Winston/Amelia, 2026-08-25) - **"prenotazione per fase"**, non "genera tutto con placeholder" (scartata: avrebbe richiesto `squadraCasaId`/`squadraOspiteId` nullable su `PartitaTorneo` e la riscrittura di `generaFinaliSeCompletate`, Story 20.4). Nuova entità `SlotTorneo` (data/ora/Palestra/fase/tabellone ammessi), scoped per `EdizioneTorneo`. Le partite di girone si assegnano a mano; le semifinali/finali si assegnano **in automatico, best-effort**, al momento stesso in cui vengono generate.

## Boundaries & Constraints

**Always:** `SlotTorneo.fase`/`tabellone` riusano ESATTAMENTE gli enum `FaseTorneo`/`TabelloneTorneo` già esistenti (Story 20.4) - stessa unione discriminata (`fase = GIRONE ⟺ tabellone IS NULL`), stesso vincolo CHECK a livello DB già stabilito per `PartitaTorneo`. `SlotTorneo.palestraId` è una FK diretta verso il modello `Palestra` esistente (Epic 2, `prisma/schema.prisma`) - **mai** una nuova anagrafica palestre. Quando un Admin assegna (o il sistema auto-assegna) uno Slot a una Partita, il server verifica sempre che `slot.fase`/`slot.tabellone` corrispondano a `partita.fase`/`partita.tabellone` - mai fidarsi che il client abbia filtrato correttamente la lista, stessa disciplina "mai fidarsi del client per lo scoping" già applicata in tutta l'epica.

**Ask First:** nessuna - tutti i punti erano aperti, risolti in party mode.

**Never:** nessuna generazione automatica di partite-placeholder (`squadraCasaId`/`squadraOspiteId` restano sempre obbligatori, invariati). Nessun blocco della generazione di calendario/tabellone/finali se non esistono Slot per quella fase - l'assegnazione è sempre best-effort, mai un prerequisito. Nessun vincolo di unicità DB che impedisca a due Partite di puntare allo stesso Slot (deciso in party mode) - la protezione è solo un avviso applicativo prima di sovrascrivere.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Creazione Slot con fase GIRONE e un tabellone specificato | dati incoerenti | rifiutata | `VALIDATION` |
| Creazione Slot con fase SEMIFINALE/FINALE senza tabellone | dati incoerenti | rifiutata | `VALIDATION` |
| Generazione tabellone (4 semifinali) con Slot sufficienti disponibili | 2+ Slot liberi per fase/tabellone | ogni semifinale assegnata a uno Slot libero | N/A |
| Generazione tabellone senza alcuno Slot creato per quella fase | 0 Slot disponibili | partite generate comunque, nessuno Slot assegnato, nessun errore | N/A |
| Assegnazione manuale di uno Slot già occupato da un'altra Partita | Slot non libero | avviso esplicito prima di confermare la sovrascrittura | N/A (conferma, non un blocco) |
| Assegnazione di uno Slot con fase/tabellone non corrispondenti alla Partita | mismatch | rifiutata | `VALIDATION` |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- nuovo model `SlotTorneo` (`id`, `edizioneTorneoId` FK → `EdizioneTorneo`, `etichetta String`, `data`, `ora`, `palestraId` FK → `Palestra`, `fase FaseTorneo`, `tabellone TabelloneTorneo?`); `PartitaTorneo` guadagna `slotTorneoId String?` FK → `SlotTorneo` (nessun `onDelete` a cascata - stesso trattamento Restrict di ogni altra FK strutturale del progetto)
- **Nuova migrazione** -- `CREATE TABLE slot_torneo` + FK + **stesso vincolo CHECK discriminato** già usato per `PartitaTorneo.fase`/`tabellone` (Story 20.4, cercare quella migrazione per il testo esatto del CHECK e mirror-arlo) + `ALTER TABLE partite_torneo ADD COLUMN slotTorneoId`
- `lib/torneo.ts` -- nuove funzioni: `creaSlotTorneo`, `elencaSlotTorneo(edizioneTorneoId)` (con `include: {palestra:true}` per mostrare nome/indirizzo), `cancellaSlotTorneo(id, edizioneTorneoId)` (guardia: rifiutata se `partite: {some:{}}}`, mirror `cancellaSquadraTorneo`), `assegnaSlotPartitaTorneo(id, categoriaTorneoId, slotTorneoId | null)` (update scoped, mirror `aggiornaRisultatoPartitaTorneo`)
- `app/app/(torneo)/torneo/actions.ts` -- nuove `creaSlotTorneoAction`/`cancellaSlotTorneoAction` (validazione fase/tabellone coerenti, mirror `creaCategoriaTorneoAction`); nuova `assegnaSlotPartitaTorneoAction` (verifica server-side che lo slot scelto abbia fase/tabellone coerenti con la partita, verifica se lo slot è già occupato da un'altra partita e lo segnala - vedi Design Notes per il meccanismo di conferma); estendere `generaTabelloneAction` e la funzione privata `generaFinaliSeCompletate` con una chiamata a un nuovo helper privato `assegnaSlotAutomaticamente(categoriaTorneoId, edizioneTorneoId, fase, tabellone)` (best-effort, silenzioso se non ci sono Slot liberi)
- **Nuovo file** `app/app/(torneo)/torneo/[edizioneId]/slot/page.tsx` + `NuovoSlotTorneoForm.tsx` + `SlotTorneoRow.tsx` -- gestione Slot dell'Edizione (elenco + creazione + cancellazione), mirror strutturale di `[edizioneId]/page.tsx`/`CategoriaTorneoRow.tsx`. `<select>` Palestra popolato da `prisma.palestra.findMany()` (già usata altrove nel progetto per un elenco a discesa, cercare un precedente es. in `/app/palestre` o `/app/slot` di Epic 2 per il mirror esatto)
- `app/app/(torneo)/torneo/[edizioneId]/page.tsx` -- link verso la nuova pagina `/slot`, mirror del link "Tabellone semifinali/finali" già presente altrove
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/RisultatoPartitaTorneoForm.tsx` -- **componente condiviso, riusato sia da `risultati/page.tsx` sia da `tabellone/page.tsx`** (verificarne gli usi prima di modificarlo): estendere il tipo `Partita` con `fase`, `tabellone`, `slotTorneoId`, e i dati dello Slot assegnato (etichetta/data/ora/nome Palestra) se presente; nuovo `<select>` Slot (filtrato via prop `slotDisponibili` passata dal genitore, già scoped alla fase/tabellone di quella specifica partita) con submit verso `assegnaSlotPartitaTorneoAction`, indipendente dal form risultato esistente (proprio `useActionState`, mirror del pattern multi-form-sulla-stessa-riga già in uso per `AtletaTabellaRiga.tsx`/`VoceMenuPubblicoRow.tsx`)
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/page.tsx` e `.../tabellone/page.tsx` -- recuperano `elencaSlotTorneo(edizioneId)` e lo passano giù come prop
- `app/torneo/page.tsx` (pubblico) -- per ogni incontro con `slotTorneoId` assegnato, mostra etichetta/data/ora/nome Palestra + link "Naviga" (`costruisciLinkNaviga`, `lib/link-naviga-palestra.ts`, riuso diretto)

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + migrazione (CHECK discriminato + FK)
- [x] `lib/torneo.ts` -- CRUD SlotTorneo + `assegnaSlotPartitaTorneo` + test
- [x] `torneo/actions.ts` -- azioni Slot + `assegnaSlotPartitaTorneoAction` + auto-assegnazione in `generaTabelloneAction`/`generaFinaliSeCompletate` + test
- [x] `[edizioneId]/slot/page.tsx` + form + row
- [x] `RisultatoPartitaTorneoForm.tsx` esteso (Slot select) + `risultati/page.tsx` + `tabellone/page.tsx` aggiornati
- [x] `app/torneo/page.tsx` -- Slot/Palestra/Naviga sulle partite pubbliche

**Acceptance Criteria:** vedi `epics.md` Story 20.9 (Given/When/Then, verbatim).

## Design Notes

**Perché l'auto-assegnazione è "best-effort" e non bloccante:** l'AC #8 lo richiede esplicitamente - il torneo deve continuare a funzionare identico a oggi se nessuno Slot è mai stato creato (nessuna regressione su Story 20.3/20.4). L'assegnazione degli Slot è un livello di comodità sopra la generazione esistente, mai un prerequisito.

**Sul "segnala se lo Slot è già occupato prima di sovrascrivere" (AC #6):** implementarlo come un avviso client-side prima del submit (mirror `window.confirm` già in uso per le azioni distruttive dell'epica) è sufficiente e proporzionato - non serve un secondo giro di conferma server-side, dato che non c'è alcun vincolo di unicità DB da rispettare (deciso esplicitamente in party mode) e sovrascrivere un'assegnazione non è un'operazione distruttiva irreversibile (a differenza di Story 20.8).

**Sull'ordine di assegnazione automatica:** quando più Slot liberi della stessa fase/tabellone sono disponibili, assegnare in un ordine deterministico e semplice (es. `data`/`ora` crescenti) - nessuna logica di "abbinamento intelligente" tra specifiche partite e specifici Slot, mai richiesto da alcun AC.

## Verification

**Commands:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx prisma validate`

**Manual checks (obbligatorio):**
- Un Admin crea alcuni Slot per un'Edizione (girone + semifinali + finali, palestre diverse), assegna a mano uno Slot a un incontro di girone, poi genera il tabellone e verifica che le semifinali abbiano ricevuto uno Slot in automatico. Verifica che la pagina pubblica `/torneo` mostri Slot/Palestra/Naviga per gli incontri assegnati.
- **Non eseguito** (ambiente di sviluppo locale rotto, Prisma WASM + Windows - vedi memoria `project_dev_locale_prisma_wasm_rotto`): verificato solo via test automatici + tsc + lint + build + prisma validate, tutti verdi.

## Spec Change Log

Review a 3 agenti in parallelo (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) su diff isolato (`git diff` dal `baseline_commit`, 2582 righe). Findings triagiati come segue.

**PATCH (applicati):**
1. `slotOccupati` era calcolato per-Categoria mentre `SlotTorneo` è scoped per-Edizione (condiviso tra tutte le Categorie di un weekend) - due Categorie diverse potevano assegnarsi lo stesso Slot senza che l'avviso di sovrascrittura scattasse. Aggiunta `elencaSlotOccupatiEdizione(edizioneTorneoId)` in `lib/torneo.ts`, wired in `risultati/page.tsx` e `tabellone/page.tsx` al posto del calcolo per-Categoria.
2. `assegnaSlotPartitaTorneoAction` non verificava che lo Slot appartenesse alla stessa Edizione della Categoria (uno Slot GIRONE/null di un'altra Edizione avrebbe sempre superato il check fase/tabellone "per caso"). Aggiunto controllo esplicito `slot.edizioneTorneoId !== categoria.edizioneTorneoId` → `VALIDATION`/"Lo Slot selezionato appartiene a un'altra Edizione." + test dedicato.
3. `creaSlotTorneoAction` verificava l'esistenza dell'Edizione ma non della Palestra scelta. Aggiunta `trovaPalestraPerId` in `lib/torneo.ts`, wired con `VALIDATION`/"Palestra non trovata." + test.
4. Nessuna validazione di formato per `data`/`ora` in `validaCampiSlot` (solo non-vuoto). Aggiunta regex `AAAA-MM-GG` e `HH:MM` (00:00-23:59) + test su formato invalido e limiti.
5. `cancellaEdizioneTorneo` non teneva conto della nuova relazione `slot` (FK Restrict) - un'Edizione con Categorie già svuotate (es. dopo Story 20.8) ma Slot residui falliva con un `INTERNAL` generico invece di un messaggio guida. Aggiunto `slot: {none:{}}` al `where` di `cancellaEdizioneTorneo` e disambiguazione in `cancellaEdizioneTorneoAction` (messaggio distinto Categorie vs Slot) + test per entrambi i casi.
6. `<select>` Slot in `RisultatoPartitaTorneoForm.tsx` non si aggiornava con `defaultValue` stantio dopo submit (stessa classe di bug già corretta in Story 9.35). Aggiunto `key={partita.slotTorneoId ?? "nessuno"}`.
7. `SlotTorneoRow.tsx` non mostrava l'indirizzo Palestra nonostante il Code Map lo richiedesse esplicitamente. Esteso il tipo e aggiunta `.indirizzoPalestra` in `torneo.module.css`.
8. `assegnaSlotAutomaticamente` avvolgeva l'intero ciclo in un unico try/catch - un fallimento a metà lista abbandonava tutte le assegnazioni successive. Spostato il try/catch dentro il ciclo, per-iterazione.
9. Coperture test mancanti aggiunte: nessuna scrittura quando non ci sono Slot liberi (auto-assegnazione best-effort), argomenti esatti passati a `elencaSlotTorneoLiberi` per entrambi i tabelloni finali.

**DEFER (annotati in `deferred-work.md`):**
- Race condition TOCTOU su assegnazione concorrente (manuale/automatica), nessun lock.
- Race tra verifica-esistenza e scrittura se lo Slot viene cancellato nel mezzo → errore generico invece di un messaggio specifico.
- Nessun controllo di duplicati/unicità tra Slot identici (etichetta/data/ora/palestra/fase tutti uguali).
- `NuovoSlotTorneoForm.tsx` non gestisce esplicitamente il caso "nessuna Palestra configurata".
- Nessuna formattazione localizzata di data/ora nelle 3 superfici di visualizzazione (mostrate come stringhe ISO grezze).
- Doppio submit sulla stessa pagina non sincronizzato senza reload (client-only by design, già nei Design Notes).
- Messaggio di errore non distingue sempre fase vs tabellone come causa del rifiuto (l'Edizione ha ora un messaggio proprio, fase/tabellone restano un messaggio condiviso).

**REJECT (nessuna azione):**
- "Semifinale ()" come fallback se `tabellone` è null: il CHECK a livello DB lo esclude già (stesso precedente accettato in Story 20.4).
- Nessun raggruppamento/ordinamento per Palestra/fase nella tabella Admin Slot: nessun AC lo richiede, parzialmente mitigato dal fix cross-Categoria.
- Etichetta non normalizzata oltre il trim: nessun AC lo richiede.
- Copertura test dei componenti (`RisultatoPartitaTorneoForm.tsx`, `NuovoSlotTorneoForm.tsx`, `SlotTorneoRow.tsx`): gap sistemico, zero `*.test.tsx` in tutto il progetto, coerente con ogni story precedente di questa sessione.
- "TOCTOU reintrodotto" in `assegnaSlotPartitaTorneoAction` (pattern read-then-act): necessario per derivare `categoria.edizioneTorneoId` server-side, mirror del pattern già in uso in `generaTabelloneAction`/`salvaRisultatoPartitaTorneoAction` nello stesso file - non un vincolo DB da proteggere come nelle azioni di cancellazione.
