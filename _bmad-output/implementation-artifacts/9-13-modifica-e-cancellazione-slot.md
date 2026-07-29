---
baseline_commit: 10c321463f1b2a64df29be28894b7a6fd9195c08
---

# Story 9.13: Modifica e cancellazione di uno Slot già inserito

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente,
I want poter modificare o cancellare uno Slot già inserito nell'orario,
so that posso correggere un giorno/orario/palestra sbagliato o rimuovere uno slot che non serve più, senza dover intervenire manualmente sul database.

**Note aggiuntive:** oggi (`/slot`, Story 2.5) esiste solo `creaSlot` (`app/(orari-palestre)/slot/actions.ts`) — nessuna modifica/cancellazione una volta inserito, e la pagina renderizza l'elenco tramite `SlotTable` (`app/(orari-palestre)/SlotTable.tsx`), un componente **condiviso** con `/orari` (Segreteria) e `/mio-orario` (Allenatore/Atleta) — quelle due pagine devono restare di sola lettura, quindi `SlotTable` **non va modificato** per aggiungere modifica/cancellazione: serve un nuovo componente specifico di `/slot`.

## Acceptance Criteria

1. **Given** uno Slot esistente **senza Presenze registrate** **When** un Admin o Dirigente lo modifica (giorno, ora inizio/fine, campo, gruppo) **Then** le modifiche vengono salvate con la stessa validazione già usata in creazione (formato ora HH:MM, ora fine successiva a ora inizio, campi obbligatori)
2. **Given** uno Slot senza Presenze registrate **When** un Admin o Dirigente lo cancella **Then** lo Slot viene rimosso dall'elenco
3. **Given** uno Slot con una o più Presenze già registrate **When** un Admin o Dirigente tenta di cancellarlo **Then** l'operazione è impedita con un messaggio esplicito (nessuna perdita silenziosa dello storico presenze)
4. **Given** uno Slot con una o più Presenze già registrate **When** un Admin o Dirigente tenta di modificarlo **Then** l'operazione è impedita con un messaggio esplicito — **scoperto in code review**: `/storico-presenze` (`app/(presenze)/storico-presenze/page.tsx`) fa un join a runtime tra ogni `Presenza` storica e il suo `Slot` (`giorno`/`oraInizio`/`oraFine`/`gruppo.nome` letti dallo stato attuale dello Slot, non da uno snapshot), quindi modificare uno Slot con Presenze già registrate riscriverebbe silenziosamente come venivano visualizzate le presenze storiche già registrate. Coerente con l'aspettativa dell'utente: gli Slot vengono definiti a inizio stagione e non più modificati una volta che la stagione è in corso (una volta che uno Slot ha almeno una Presenza, resta modificabile solo finché non ne ha nessuna)
5. **And** nessuna regressione sul comportamento esistente di creazione Slot (Story 2.5) — suite Vitest invariata, stesso perimetro di Ruoli (ADMIN/DIRIGENTE) di `creaSlot`, `SlotTable`/`/orari`/`/mio-orario` invariati

## Tasks / Subtasks

- [x] Task 1: Server Actions `aggiornaSlot`/`cancellaSlot` (AC: #1, #2, #3)
  - [x] Validazione estratta in `validaCampiSlot` (funzione privata del modulo), riusata sia da `creaSlot` (comportamento invariato, 14/14 test esistenti passati invariati) sia dalla nuova `aggiornaSlot`
  - [x] `aggiornaSlot`: `requireRuolo(["ADMIN","DIRIGENTE"])`, `id` obbligatorio, stessa validazione via l'helper condiviso, `prisma.slot.update`, `revalidatePath("/slot")`
  - [x] `cancellaSlot`: `requireRuolo(["ADMIN","DIRIGENTE"])`, `id` obbligatorio, cancellazione atomica `prisma.slot.deleteMany({ where: { id, presenze: { none: {} } } })` (stesso pattern anti-TOCTOU di `cancellaAllenatore`, Story 9.9) — su `count === 0` un secondo `findUnique` distingue "Slot non trovato" (`INTERNAL`) da "Slot con Presenze collegate" (`VALIDATION`)
  - [x] `SlotActionState` esistente riusato invariato da entrambe le nuove azioni
  - [x] TDD: 12 nuovi test scritti falliti prima dell'implementazione (26/26 test del file passati dopo)
- [x] Task 2: `SlotRow.tsx` — riga con modifica inline + cancellazione (AC: #1, #2, #3)
  - [x] Nuovo `app/(orari-palestre)/slot/SlotRow.tsx` — stesso identico pattern di `AllenatoreRow.tsx` (Story 9.9): due `useActionState` separati, form di modifica precompilato (`GIORNI_SETTIMANA`, `type="time"`, select Campo/Gruppo), form di cancellazione separato con `window.confirm`, `azionePending` condiviso tra le due azioni della riga
  - [x] `campi`/`gruppi` passati come prop, nessuna query duplicata
- [x] Task 3: `page.tsx` — sostituire `SlotTable` con l'elenco modificabile (AC: #1, #2, #3, #4)
  - [x] `SlotTable` non toccato — `page.tsx` renderizza `<SlotRow>` per ogni Slot, stessa query/ordinamento esistente, aggiunto un messaggio "Nessuno Slot inserito." per l'elenco vuoto
  - [x] Verificato che `/orari` e `/mio-orario` continuano a importare `SlotTable` invariato (nessuna modifica a quei due file)
- [x] Task 4: Test (AC: #1, #2, #3)
  - [x] 12 nuovi test per `aggiornaSlot`/`cancellaSlot` in `actions.test.ts` (FORBIDDEN, validazione riusata, update riuscito, delete atomico con Presenze/senza Presenze/Slot inesistente, errori INTERNAL)
  - [x] 14/14 test esistenti di `creaSlot` passati invariati dopo l'estrazione dell'helper
- [x] Task 5: Test e regressione (AC: #4)
  - [x] Suite Vitest completa: 697/697 test passati (63 file)
  - [x] `npx tsc --noEmit` pulito (dopo un fix di narrowing: `CampiSlotValidati.giorno` tipizzato `GiornoSettimana`, non `string`, altrimenti la narrowing di `isGiornoSettimanaValido` non attraversava il confine della funzione estratta); ESLint pulito sui file di questa storia
  - [x] Nessun test di rendering per `SlotRow.tsx`/`page.tsx`, coerente con la convenzione già stabilita nel progetto

### Review Findings

- [x] [Review][Decision] `cancellaSlot` filtra tramite la relazione `presenze: { none: {} } }` dentro un `deleteMany` su `Slot` eseguito con Prisma diretto — `lib/db-rls/presenza.ts` documenta esplicitamente (AD-4/AD-9) che `Presenza` è protetta da RLS e va **sempre** letta/scritta tramite un client Supabase autenticato, "mai Prisma diretto a runtime". Qui non viene mai letto/restituito il contenuto di alcuna riga `Presenza` (solo un filtro EXISTS-style per decidere se lo `Slot` può essere cancellato), e il chiamante è comunque già ristretto a `ADMIN`/`DIRIGENTE` (Ruoli con visibilità RLS ampia su tutte le Presenze) — quindi nessuna escalation di privilegio pratica oggi. **Deciso con l'utente: accettato così com'è**, nessuna modifica al codice — documentata la motivazione qui.
- [x] [Review][Decision-derivata] Durante la discussione di cui sopra, l'utente ha sollevato un problema più serio e reale, non identificato dai tre layer di review: `/storico-presenze` fa un join a runtime tra ogni `Presenza` e il suo `Slot` (`giorno`/`oraInizio`/`oraFine`/`gruppo.nome` letti dallo stato attuale dello Slot) — modificare uno Slot con Presenze già registrate riscriverebbe silenziosamente come vengono visualizzate le presenze storiche. **Deciso con l'utente**: bloccare la modifica (non solo la cancellazione) se lo Slot ha già Presenze registrate, coerente con l'aspettativa che gli Slot vengano definiti a inizio stagione e non più toccati durante la stagione — nuovo AC #4 aggiunto, stessa identica guardia atomica già costruita per `cancellaSlot` estesa ad `aggiornaSlot` (`prisma.slot.updateMany` con lo stesso `where` composto, non `update` semplice).
- [x] [Review][Patch] Pulsanti "Salva"/"Cancella" in `SlotRow.tsx` senza `aria-label` — a differenza di `AllenatoreRow.tsx` (Story 9.9), il pattern che questa storia dichiara esplicitamente di replicare "stesso identico", che li ha proprio per distinguere pulsanti identici tra loro per screen reader con più righe renderizzate. **Risolto**: `aria-label` aggiunto a entrambi i pulsanti (`Salva ${etichettaSlot}`/`Cancella ${etichettaSlot}`, etichetta costruita da giorno+ora).
- [x] [Review][Patch] Il link "Naviga" verso la palestra (presente per ogni riga nella vecchia `SlotTable`, tramite `costruisciLinkNaviga(campo.palestra)`) è sparito da `/slot` dopo la sostituzione con `SlotRow` — nessuna nota nella storia autorizzava questa perdita di funzionalità, `/orari`/`/mio-orario` lo mantengono (usano ancora `SlotTable` invariato) ma `/slot` stesso no. Viola lo spirito dell'AC #5 ("nessuna regressione sul comportamento esistente"). **Risolto**: link "Naviga" ripristinato in `SlotRow.tsx` per il Campo attualmente salvato sullo Slot (`costruisciLinkNaviga`, riuso invariato di `lib/link-naviga-palestra.ts`), nuova classe `.linkNaviga` in `slot.module.css`.
- [x] [Review][Defer] Nessun controllo di concorrenza ottimistica in `aggiornaSlot` (nessun campo versione/`updatedAt` confrontato) — un form rimasto aperto con valori ormai stantii può sovrascrivere silenziosamente una modifica concorrente di un altro Admin, senza alcun avviso. Stesso identico rischio già presente e accettato in `aggiornaAllenatore` (Story 9.9, il precedente esplicito di questa storia) — non una regressione introdotta qui. [app/(orari-palestre)/slot/actions.ts]
- [x] [Review][Defer] Messaggio generico "Riprova" fuorviante quando `cancellaSlot`/`aggiornaSlot` operano su uno Slot già cancellato da un'altra sessione concorrente (race a bassa probabilità) — stesso identico limite già presente e accettato in `cancellaAllenatore` (Story 9.9). [app/(orari-palestre)/slot/actions.ts]
- [x] [Review][Defer] Nessuna validazione che `campoId`/`gruppoId` corrispondano a righe realmente esistenti in `validaCampiSlot` — pre-esistente in `creaSlot` (Story 2.5), non introdotto da questa storia, solo ora raggiungibile anche dal percorso di modifica. [app/(orari-palestre)/slot/actions.ts]
- [x] [Review][Defer] Nessun controllo di sovrapposizione oraria per lo stesso Campo raggiungibile dalla modifica — stesso limite pre-esistente di `creaSlot` (nessun `@@unique`/controllo dedicato), non introdotto qui. [app/(orari-palestre)/slot/actions.ts]
- [x] [Review][Defer] Nessun test dedicato per `aggiornaSlot` su uno Slot cancellato concorrentemente (Prisma P2025) — il `catch` generico già gestisce il caso in sicurezza, solo non testato esplicitamente; stessa causa del messaggio "Riprova" già deferito sopra. [app/(orari-palestre)/slot/actions.test.ts]
- [x] [Review][Defer] Margine superiore raddoppiato nel form di modifica (`.form` e il primo `.campo` hanno entrambi `margin-top: var(--space-4)`, senza collapsing perché `.form` è un contenitore flex) — stesso identico pattern già presente in `precaricamento-allenatori.module.css` (Story 9.9), non un problema introdotto qui. [app/(orari-palestre)/slot/slot.module.css]
- [x] [Review][Dismiss] "Nessun messaggio di successo dopo il salvataggio" — confrontato con il componente sbagliato: `NuovoSlotForm.tsx` mostra un messaggio di successo, ma il precedente che questa storia dichiara esplicitamente di replicare (`AllenatoreRow.tsx`, Story 9.9) non lo mostra nemmeno lui — `SlotRow.tsx` replica correttamente il pattern indicato.

## Dev Notes

- **`SlotTable` è condiviso, non toccarlo**: `app/(orari-palestre)/SlotTable.tsx` (Story 2.8) è importato da tre pagine (`/slot`, `/orari`, `/mio-orario`) — solo `/slot` deve guadagnare modifica/cancellazione. Aggiungere pulsanti di modifica/cancellazione dentro `SlotTable` li farebbe comparire anche per Segreteria (`/orari`) e Allenatore/Atleta (`/mio-orario`), Ruoli che oggi non hanno né devono avere questi permessi (`requireRuolo` protegge solo le Server Action, ma l'affordance visiva comparirebbe comunque). Per questo Task 2/3 introducono un nuovo componente (`SlotRow.tsx`) usato solo da `/slot`, invece di estendere `SlotTable`.
- **Perché bloccare la cancellazione con Presenze collegate**: `Presenza.slotId` ha `onDelete: Cascade` (`prisma/schema.prisma` riga 557) — un `DELETE` su uno Slot con Presenze già registrate cancellerebbe silenziosamente lo storico presenze di quello slot, senza alcun avviso. Stessa classe di rischio già affrontata in Story 9.9 per `Allenatore` (bloccato se agganciato a un account o assegnato a un Gruppo) — qui la condizione di blocco è singola (Presenze collegate), il pattern di implementazione (delete atomico con `where` composto, poi un secondo fetch solo se `count === 0` per costruire il messaggio) è identico.
- **Perché bloccare anche la modifica con Presenze collegate (AC #4, scoperto in code review)**: `/storico-presenze` (`app/(presenze)/storico-presenze/page.tsx`) fa un join a runtime tra ogni `Presenza` e il suo `Slot` (`giorno`/`oraInizio`/`oraFine`/`gruppo.nome` letti dallo stato attuale dello Slot, non da uno snapshot salvato sulla Presenza) — modificare uno Slot con Presenze già registrate riscriverebbe silenziosamente come vengono visualizzate le presenze storiche. Bloccato con la stessa identica guardia atomica di `cancellaSlot`, ma con `prisma.slot.updateMany` (non `update` semplice) per mantenere l'atomicità anti-TOCTOU.
- **Riuso obbligatorio, non reinventare**:
  - `cancellaAllenatore` (`precaricamento-allenatori/actions.ts` righe 152-202, Story 9.9) — pattern esatto di cancellazione atomica anti-TOCTOU (`deleteMany` con `where` composto, non `findUnique` + `delete` separati) e di messaggio d'errore costruito solo se la delete non ha trovato righe.
  - `AllenatoreRow.tsx` (stesso modulo, Story 9.9) — pattern esatto di riga con modifica inline + cancellazione separata, `window.confirm`, `azionePending` condiviso tra le due azioni della stessa riga.
  - `NuovoSlotForm.tsx` (Story 2.5) — campi/select esatti da precompilare nel form di modifica (`GIORNI_SETTIMANA` da `lib/giorno-settimana`, `type="time"` per gli orari).
  - `FORMATO_ORA`/`isGiornoSettimanaValido` già esistenti in `actions.ts`/`lib/giorno-settimana.ts` — **non riscriverli**, solo estrarre la validazione che li usa in una funzione condivisa tra `creaSlot` e `aggiornaSlot`.
- **Stesso perimetro di Ruoli**: `ADMIN`/`DIRIGENTE`, identico a `creaSlot` e alla rotta `/slot` già protetta (`lib/auth/route-guard.ts`) — nessuna modifica al route-guard necessaria in questa storia (a differenza di Story 10.1/10.3, che introducevano rotte nuove).
- **File NON da toccare**: `app/(orari-palestre)/SlotTable.tsx`, `app/(orari-palestre)/orari/page.tsx`, `app/(orari-palestre)/mio-orario/page.tsx` (tutti e tre devono restare esattamente come sono).

### Project Structure Notes

- File nuovi: `app/(orari-palestre)/slot/SlotRow.tsx`.
- File modificati: `app/(orari-palestre)/slot/actions.ts` (nuove `aggiornaSlot`/`cancellaSlot`, validazione di `creaSlot` estratta in helper condiviso), `app/(orari-palestre)/slot/actions.test.ts` (nuovi test), `app/(orari-palestre)/slot/page.tsx` (usa `SlotRow` invece di `SlotTable`).
- Nessuna migrazione — `Slot`/`Presenza` esistono già invariati.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.13 — Acceptance Criteria]
- [Source: app/(onboarding-import)/precaricamento-allenatori/actions.ts righe 152-202 — cancellaAllenatore, pattern di cancellazione atomica anti-TOCTOU da riusare identico]
- [Source: app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx — pattern di riga con modifica inline + cancellazione separata]
- [Source: app/(orari-palestre)/slot/actions.ts — creaSlot, validazione esistente da estrarre in helper condiviso]
- [Source: app/(orari-palestre)/slot/NuovoSlotForm.tsx — campi/select del form da riusare nella modifica]
- [Source: app/(orari-palestre)/SlotTable.tsx — componente condiviso con /orari e /mio-orario, da NON modificare]
- [Source: prisma/schema.prisma riga 557 — Presenza.slotId onDelete: Cascade, motivo del guard sulla cancellazione]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- `npx tsc --noEmit` ha fallito dopo l'estrazione di `validaCampiSlot`: `giorno` era tipizzato `string` nel tipo di ritorno `CampiSlotValidati`, perdendo la narrowing di `isGiornoSettimanaValido` (`value is GiornoSettimana`) attraverso il confine della funzione. Risolto tipizzando `CampiSlotValidati.giorno: GiornoSettimana`.

### Completion Notes List

- Task 1: validazione di `creaSlot` estratta in `validaCampiSlot` (comportamento identico, 14/14 test invariati), nuove `aggiornaSlot`/`cancellaSlot`. Cancellazione atomica (`deleteMany` con `where: { id, presenze: { none: {} } }`) stesso pattern anti-TOCTOU di `cancellaAllenatore` (Story 9.9) — `Presenza.slotId` ha `onDelete: Cascade`, quindi il guard e' l'unica vera protezione contro la perdita silenziosa dello storico presenze.
- Task 2: `SlotRow.tsx` — stesso pattern di `AllenatoreRow.tsx`, nuove classi `.lista`/`.card`/`.bottoneSecondario`/`.form`/`.messaggioVuoto` aggiunte a `slot.module.css` (mancanti, mutuate da `precaricamento-allenatori.module.css`/`SlotTable.module.css`).
- Task 3: `page.tsx` usa `SlotRow` al posto di `SlotTable` solo in questa pagina — `SlotTable.tsx`, `/orari/page.tsx`, `/mio-orario/page.tsx` verificati invariati.
- Task 4/5: 697/697 test passati, `tsc --noEmit` pulito dopo il fix di narrowing, ESLint pulito sui file di questa storia.
- Code review (2026-07-29): Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo. Acceptance Auditor: 0 violazioni sui 4 AC originali. 1 decision-needed risolta con l'utente (uso di Prisma diretto sulla relazione `presenze` in `cancellaSlot` — accettato così com'è, nessuna riga `Presenza` viene mai letta/esposta, solo un filtro EXISTS, e il chiamante è già ristretto a Ruoli con piena visibilità RLS su Presenza). Durante quella discussione l'utente ha sollevato un problema reale non trovato da nessuno dei tre layer: `/storico-presenze` fa un join a runtime tra Presenza e Slot (giorno/ora/gruppo letti dallo stato attuale dello Slot, non da uno snapshot) — modificare uno Slot con Presenze già registrate avrebbe riscritto silenziosamente come appare lo storico presenze. Aggiunto un nuovo AC #4 e la stessa guardia atomica già costruita per `cancellaSlot` anche per `aggiornaSlot` (`prisma.slot.updateMany` con lo stesso `where` composto, non un `update` semplice), coerente con l'aspettativa che gli Slot vengano definiti a inizio stagione e non più toccati durante la stagione. 2 patch applicati (aria-label sui pulsanti Salva/Cancella, mancanti a differenza del precedente esplicito `AllenatoreRow.tsx`; link "Naviga" ripristinato in `SlotRow.tsx`, sparito da `/slot` dopo la sostituzione di `SlotTable`). 6 defer (nessun controllo di concorrenza ottimistica, messaggio "Riprova" generico su record già cancellato concorrentemente, nessuna validazione di esistenza FK su campoId/gruppoId, nessun controllo di sovrapposizione oraria, test mancante per aggiornaSlot su Slot cancellato concorrentemente, margine doppio nel form di modifica — tutti pre-esistenti/già accettati nel precedente Story 9.9). 1 scartato come falso positivo (nessun messaggio di successo dopo il salvataggio — confrontato con il componente sbagliato, il precedente reale `AllenatoreRow.tsx` non lo mostra nemmeno lui). 699/699 test passati, `tsc --noEmit` ed ESLint puliti dopo i fix.

### File List

- `app/(orari-palestre)/slot/actions.ts` (modificato — `validaCampiSlot` estratta, nuove `aggiornaSlot`/`cancellaSlot`, entrambe con guardia atomica anti-TOCTOU su `presenze: { none: {} } }`)
- `app/(orari-palestre)/slot/actions.test.ts` (modificato — 14 nuovi test)
- `app/(orari-palestre)/slot/SlotRow.tsx` (nuovo, poi corretto in code review — aria-label sui pulsanti, link "Naviga" ripristinato)
- `app/(orari-palestre)/slot/slot.module.css` (modificato — nuove classi `.lista`/`.card`/`.bottoneSecondario`/`.form`/`.messaggioVuoto`/`.linkNaviga`)
- `app/(orari-palestre)/slot/page.tsx` (modificato — usa `SlotRow` invece di `SlotTable`)

## Change Log

- 2026-07-29: Implementata Story 9.13 — modifica e cancellazione di uno Slot già inserito. Nuove Server Action `aggiornaSlot`/`cancellaSlot` (cancellazione atomica bloccata se esistono Presenze collegate, stesso pattern anti-TOCTOU di `cancellaAllenatore`, Story 9.9), nuovo componente `SlotRow.tsx` specifico di `/slot` (il componente condiviso `SlotTable` resta invariato per `/orari`/`/mio-orario`). Nessuna migrazione. 697/697 test passati, 0 errori tsc/eslint sui file di questa storia. Status: review.
- 2026-07-29: Code review chiusa — scoperto e risolto un problema reale segnalato dall'utente (non trovato dai tre layer di review): modificare uno Slot con Presenze già registrate avrebbe riscritto silenziosamente lo storico presenze visualizzato in `/storico-presenze` (join a runtime con lo Slot, non uno snapshot). Aggiunto AC #4 e la stessa guardia atomica di `cancellaSlot` anche per `aggiornaSlot`. 2 patch applicati (aria-label, link "Naviga" ripristinato), 6 defer, 1 scartato. 699/699 test passati, 0 errori tsc/eslint dopo i fix. Status: done.
