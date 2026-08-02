---
baseline_commit: 37ed792dd6f7f247dfa667649bf551ddd1999d13
---

# Story 10.6: Cancellazione di una Partita o di un Campionato

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore del Gruppo (o Admin/Dirigente),
I want poter cancellare una singola Partita inserita per errore, o cancellare un intero Campionato con le sue Partite importate,
so that posso correggere un import sbagliato o di test senza lasciare dati sporchi a sistema — oggi (Story 10.1/10.2) non esiste alcuna funzionalità di cancellazione per Campionato/Partita, solo creazione/import/aggiornamento.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-08-01), emersa mentre chiedeva come ripulire i dati di un import Excel di test. **Dipendenza risolta**: questa storia richiedeva Story 10.7 (Campionato appartiene a un solo Gruppo) — **già completata** — solo dopo di essa cancellare un intero Campionato è sempre sicuro (nessun altro Gruppo può esserne proprietario, `Campionato.gruppoId` è ora una FK diretta). **Nota importante scoperta in fase di creazione storia**: l'AC originale in `epics.md` cita "stessa autorizzazione a due livelli già stabilita per la modifica (Story 10.4)" — **Story 10.4 (modifica singola partita) non è ancora stata implementata** (resta in backlog). L'autorizzazione da riusare qui è quindi `risolviAutorizzazioneGruppo` (`app/(partite-campionati)/autorizzazione.ts`, Story 10.1/10.2), il vero precedente già esistente in codice, non una storia non ancora scritta.

## Acceptance Criteria

1. **Given** un Allenatore del Gruppo (o Admin/Dirigente) su una Partita esistente **When** la cancella **Then** la Partita viene rimossa, stessa autorizzazione a due livelli già stabilita per creazione/import (`risolviAutorizzazioneGruppo`)
2. **Given** un Allenatore del Gruppo (o Admin/Dirigente) su un proprio Campionato (un Campionato ha sempre un solo Gruppo proprietario, Story 10.7) **When** lo cancella **Then** il Campionato e tutte le sue Partite vengono rimossi (cascata semplice, nessun rischio di impattare altri Gruppi)
3. **And** stessa conferma esplicita (`window.confirm` o equivalente) già richiesta per altre cancellazioni distruttive del progetto (Slot/Allenatore/Atleta, Story 9.9/9.13/9.14)
4. **And** un Allenatore che non gestisce il Gruppo proprietario della Partita/del Campionato non può cancellarli — stessa regola di rifiuto già stabilita per creazione/import
5. **And** nessuna regressione sul comportamento esistente di creazione/collegamento/import (Story 10.1/10.2/10.7) — suite Vitest invariata sui casi esistenti non impattati

## Tasks / Subtasks

- [x] Task 1: Server Action `cancellaCampionato` (AC: #2, #4)
  - [x] `cancellaCampionato` aggiunta a `actions.ts` — `requireRuolo` → valida `campionatoId` → `campionato.findUnique` (risolve `gruppoId`) → `risolviAutorizzazioneGruppo` → `campionato.delete` (cascata automatica sulle Partite via FK) → `revalidatePath("/campionati")`
  - [x] 6 nuovi test in `actions.test.ts` (FORBIDDEN, VALIDATION mancante/inesistente, FORBIDDEN Allenatore non proprietario, successo Allenatore proprietario, successo Admin/Dirigente, INTERNAL su errore) — 22/22 test del file passano
- [x] Task 2: Server Action `cancellaPartita` (AC: #1, #4)
  - [x] Nuovo `app/(partite-campionati)/partite/actions.ts` (colocato con `/partite/page.tsx`, suo unico consumatore) — `cancellaPartita`: `requireRuolo` → valida `partitaId` → `partita.findUnique` (risolve `gruppoId`) → `risolviAutorizzazioneGruppo` → `partita.delete` → `revalidatePath("/partite")`
  - [x] Nuovo `app/(partite-campionati)/partite/actions.test.ts`: stessa copertura di `cancellaCampionato` — 7/7 test passano
- [x] Task 3: UI — bottone "Cancella" con conferma su `/campionati` (AC: #2, #3)
  - [x] Nuovo `EliminaCampionatoForm.tsx` — stesso pattern esatto di `AtletaAssegnata.tsx` (Story 9.14): `useActionState` + `window.confirm` + bottone disabilitato durante `pending` + errore `role="alert"`
  - [x] `campionati/page.tsx` aggiornato con il nuovo bottone accanto a `<ImportaGareForm />`
  - [x] Nuova classe `.bottoneElimina` in `campionati.module.css`
- [x] Task 4: UI — bottone "Cancella" con conferma su `/partite` (AC: #1, #3)
  - [x] Nuovo `EliminaPartitaForm.tsx` — stesso pattern di Task 3, messaggio di conferma con squadre/data
  - [x] `partite/page.tsx`: nuova colonna "Azioni" — ogni riga mostrata a un Allenatore è già filtrata ai propri Gruppi (`filtroAllenatore`), nessun controllo aggiuntivo lato client necessario
  - [x] Nuova classe `.bottoneElimina` in `partite.module.css` (+ `.errore`, mancante prima in questo modulo)
- [x] Task 5: Verifica regressione (AC: #5)
  - [x] Suite Vitest completa: 820/820 test passati (+14 nuovi)
  - [x] `npx tsc --noEmit` pulito (0 errori); ESLint pulito su tutto il modulo `(partite-campionati)`
  - [x] Nessun test di rendering per i nuovi Client Component (convenzione già stabilita)
  - [x] Confermato: nessuna modifica a `creaCampionato`/`importaGare`/`risolviAutorizzazioneGruppo`/`categorizzaStatoCertificato`

## Dev Notes

- **Perimetro esatto**: `app/(partite-campionati)/campionati/actions.ts` (+ test) esteso con `cancellaCampionato`; nuovo `app/(partite-campionati)/partite/actions.ts` (+ test) con `cancellaPartita`; nuovi `EliminaCampionatoForm.tsx`/`EliminaPartitaForm.tsx`; `page.tsx` di entrambe le rotte estesi; 2 nuove classi CSS (duplicate per modulo, pattern già stabilito). Nessuna migrazione (le FK `ON DELETE CASCADE` necessarie esistono già dalla Story 10.1/10.2), nessuna nuova entità.
- **Perché un solo `prisma.campionato.delete` basta per cancellare anche le Partite**: `Partita.campionatoId` ha `onDelete: Cascade` verso `Campionato` (`prisma/schema.prisma`, commento esplicito "ON DELETE CASCADE su entrambe le FK... una Partita non ha senso senza il suo Campionato/Gruppo", Story 10.2) — Postgres rimuove automaticamente tutte le Partite collegate quando il Campionato viene cancellato. Non serve un `prisma.partita.deleteMany` esplicito prima, né una `$transaction`.
- **Perché l'autorizzazione riusa `risolviAutorizzazioneGruppo` e non "Story 10.4"**: l'AC originale in `epics.md` fa riferimento a un'autorizzazione "già stabilita per la modifica (Story 10.4)" — ma Story 10.4 (modifica singola partita) **non è mai stata implementata**, resta in backlog. Il vero precedente in codice è `risolviAutorizzazioneGruppo` (`app/(partite-campionati)/autorizzazione.ts`), già riusato da `creaCampionato`/`importaGare` (Story 10.1/10.2) — stessa funzione, invariata, da riusare qui.
- **`cancellaPartita` vive in `partite/actions.ts`, non in `campionati/`**: decisione presa in fase di creazione storia — a differenza di `creaCampionato`/`importaGare` (mutazioni consumate dalla stessa pagina `/campionati` dove vivono), il bottone "Cancella" di una Partita vive su `/partite`, pagina finora di sola lettura. Colocare l'azione con la pagina che la consuma evita un import cross-modulo non necessario qui (a differenza di `GruppoCard`/`categorizzaStatoCertificato`, Story 9.23/9.26, dove il riuso letterale del componente giustificava l'import cross-modulo).
- **Nessun controllo aggiuntivo lato client per mostrare il bottone "Cancella" su `/partite`**: la query `partite` in `page.tsx` è già filtrata per `filtroAllenatore` quando il chiamante non è Admin/Dirigente (righe 63-73 attuali) — un Allenatore vede quindi solo le Partite dei propri Gruppi, ogni riga mostrata è già cancellabile da lui. L'autorizzazione reale resta comunque sempre verificata server-side in `cancellaPartita` (difesa in profondità, stesso principio di ogni altra Server Action del progetto).
- **Revalidazione**: `cancellaCampionato` revalida solo `/campionati` (non `/partite`) — stesso pattern già stabilito da `importaGare` (Story 10.2), che modifica `Partita` ma revalida solo `/campionati`; `/partite` si affida a `force-dynamic` per restare aggiornata (Dev Notes Story 10.3), nessuna incoerenza nuova introdotta da questa storia.
- **File NON da toccare**: `app/(partite-campionati)/autorizzazione.ts` (`risolviAutorizzazioneGruppo`, riusata invariata), `app/(partite-campionati)/campionati/importa-gare-actions.ts`, `app/(partite-campionati)/campionati/NuovoCampionatoForm.tsx`, `app/(partite-campionati)/campionati/ImportaGareForm.tsx` (nessuna Server Action di creazione/import cambia).

### Project Structure Notes

- File nuovi: `app/(partite-campionati)/partite/actions.ts`, `app/(partite-campionati)/partite/actions.test.ts`, `app/(partite-campionati)/campionati/EliminaCampionatoForm.tsx`, `app/(partite-campionati)/partite/EliminaPartitaForm.tsx`.
- File modificati: `app/(partite-campionati)/campionati/actions.ts` (+ `cancellaCampionato`), `app/(partite-campionati)/campionati/actions.test.ts` (+ test), `app/(partite-campionati)/campionati/page.tsx` (bottone Cancella per Campionato), `app/(partite-campionati)/partite/page.tsx` (colonna Azioni), `app/(partite-campionati)/campionati/campionati.module.css` (+ `.bottoneElimina`), `app/(partite-campionati)/partite/partite.module.css` (+ `.bottoneElimina`).
- Nessun file eliminato, nessuna migrazione.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 10.6: Cancellazione di una Partita o di un Campionato]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 10.7: Il Campionato appartiene a un solo Gruppo — dipendenza risolta, Campionato.gruppoId ora FK diretta]
- [Source: app/(partite-campionati)/autorizzazione.ts — risolviAutorizzazioneGruppo, da riusare invariata]
- [Source: app/(partite-campionati)/campionati/actions.ts — creaCampionato, pattern Server Action da replicare per cancellaCampionato]
- [Source: app/(partite-campionati)/campionati/importa-gare-actions.ts — pattern "revalida solo /campionati" da replicare]
- [Source: app/(partite-campionati)/partite/page.tsx — struttura tabella attuale, filtroAllenatore righe 63-73, da estendere con colonna Azioni]
- [Source: app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx — pattern esatto di conferma window.confirm + useActionState da replicare (Story 9.14)]
- [Source: prisma/schema.prisma — Campionato.gruppoId (onDelete: Cascade da Gruppo, Story 10.7), Partita.campionatoId/gruppoId (onDelete: Cascade su entrambe, Story 10.2)]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

### Completion Notes List

- Task 1: `cancellaCampionato` aggiunta a `campionati/actions.ts`, riusa `risolviAutorizzazioneGruppo` invariata. Un solo `prisma.campionato.delete` cancella anche tutte le Partite collegate (CASCADE già esistente). 6 nuovi test.
- Task 2: `cancellaPartita` in un nuovo `partite/actions.ts` (colocato con la pagina che lo consuma). 7 nuovi test.
- Task 3: `EliminaCampionatoForm.tsx` con conferma `window.confirm`, stesso pattern di `AtletaAssegnata.tsx` (Story 9.14). Aggiunto a `/campionati` accanto a `ImportaGareForm`.
- Task 4: `EliminaPartitaForm.tsx`, stesso pattern. Nuova colonna "Azioni" in `/partite` — nessun controllo aggiuntivo lato client (la query è già filtrata per Allenatore).
- Task 5: 820/820 test passati (+14 nuovi), `tsc --noEmit` pulito, ESLint pulito. Nessuna modifica a `creaCampionato`/`importaGare`/`risolviAutorizzazioneGruppo`/`categorizzaStatoCertificato`.
- Code review: capitalizzazione uniformata in `EliminaPartitaForm.tsx`; race TOCTOU (P2025) gestita in `cancellaCampionato` e `cancellaPartita`; `risolviAutorizzazioneGruppo` esteso con `permettiStagionePassata` (decisione confermata dall'utente) — Admin/Dirigente possono ora cancellare dati di stagioni passate, Allenatore resta vincolato alla stagione corrente. 826/826 test finali passati.

### File List

- `app/(partite-campionati)/campionati/actions.ts` (modificato — `cancellaCampionato` aggiunta)
- `app/(partite-campionati)/campionati/actions.test.ts` (modificato — 6 nuovi test)
- `app/(partite-campionati)/campionati/EliminaCampionatoForm.tsx` (nuovo)
- `app/(partite-campionati)/campionati/campionati.module.css` (modificato — `.bottoneElimina`)
- `app/(partite-campionati)/campionati/page.tsx` (modificato — bottone Cancella per Campionato)
- `app/(partite-campionati)/partite/actions.ts` (nuovo — `cancellaPartita`)
- `app/(partite-campionati)/partite/actions.test.ts` (nuovo — 7 test)
- `app/(partite-campionati)/partite/EliminaPartitaForm.tsx` (nuovo)
- `app/(partite-campionati)/partite/partite.module.css` (modificato — `.bottoneElimina`/`.errore`)
- `app/(partite-campionati)/partite/page.tsx` (modificato — colonna Azioni)
- `app/(partite-campionati)/autorizzazione.ts` (modificato — review fix, opzione `permettiStagionePassata`)

## Change Log

- 2026-08-02: Implementata Story 10.6 — cancellazione di una singola Partita (`/partite`) o di un intero Campionato con tutte le sue Partite (`/campionati`), entrambe con conferma esplicita `window.confirm`. Autorizzazione a due livelli riusata invariata (`risolviAutorizzazioneGruppo`, Story 10.1/10.2) — l'AC originale citava "Story 10.4" per l'autorizzazione, mai implementata; corretto riferimento al vero precedente in codice. Nessuna migrazione (CASCADE già esistente da Story 10.2). 820/820 test passati, 0 errori tsc/eslint.
- 2026-08-02: Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) — 4 fix applicati: capitalizzazione "la Partita" incoerente nel dialogo di conferma/aria-label; race TOCTOU su doppia cancellazione concorrente (P2025 trattato come successo idempotente in `cancellaCampionato` e `cancellaPartita`); `risolviAutorizzazioneGruppo` esteso con opzione `permettiStagionePassata` (decisione richiesta e confermata dall'utente) così Admin/Dirigente possono cancellare Campionati/Partite di Gruppi di stagioni passate (utile per pulizia dati), mentre l'Allenatore resta vincolato alla stagione corrente. 826/826 test passati (+6 nuovi test di review), 0 errori tsc/eslint. Story portata a `done`.

## Senior Developer Review (AI)

**Data**: 2026-08-02
**Esito**: Approvato con fix applicati

### Riepilogo

Tre subagent adversariali (Blind Hunter, Edge Case Hunter, Acceptance Auditor) hanno rivisto l'implementazione. Nessun problema bloccante; 3 fix applicati direttamente, nessun item da rimandare.

### Action Items

- [x] **[Med]** Incoerenza di capitalizzazione: `EliminaPartitaForm.tsx` usava "la partita" (minuscolo) nel testo di conferma/aria-label mentre `EliminaCampionatoForm.tsx` usa "il Campionato" (maiuscolo) — uniformato a "la Partita".
- [x] **[Med]** Race TOCTOU: due richieste di cancellazione concorrenti sullo stesso record causavano un errore generico INTERNAL sulla seconda, invece di un successo idempotente. Fix: catturato il codice Prisma `P2025` ("Record to delete does not exist") sia in `cancellaCampionato` che in `cancellaPartita`, trattato come successo (`revalidatePath` + `{ success: true }`) dato che lo stato desiderato (record assente) è comunque raggiunto. 2 nuovi test di regressione.
- [x] **[High]** `risolviAutorizzazioneGruppo` esegue il controllo di stagione-corrente **prima** del bypass ADMIN/DIRIGENTE — comportamento voluto per creazione/import (Story 10.1) ma effetto collaterale indesiderato per la cancellazione: nemmeno Admin/Dirigente potevano cancellare un Campionato/Partita di un Gruppo di una stagione passata, il caso d'uso principale di "pulizia dati" citato nella Story stessa. Presentato all'utente via AskUserQuestion — risposta: **permettere ad Admin/Dirigente**, Allenatore resta vincolato alla stagione corrente. Fix: aggiunta opzione `{ permettiStagionePassata?: boolean }` a `risolviAutorizzazioneGruppo` (default `false`, nessun cambio per `creaCampionato`/`importaGare` che non la passano), usata da `cancellaCampionato`/`cancellaPartita`. 4 nuovi test (2 per file: bypass Admin, blocco Allenatore).

### Verifica finale

826/826 test Vitest passati, `npx tsc --noEmit` pulito, ESLint pulito su `(partite-campionati)`.
