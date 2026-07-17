---
baseline_commit: NO_VCS
---

# Story 2.3: Assegnazione Allenatori a Gruppo

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Dirigente o Admin,
I want assegnare uno o più Allenatori a un Gruppo,
so that ogni gruppo ha chi lo segue.

## Acceptance Criteria

1. **Given** un Gruppo esiste (Story 2.2) e un Allenatore è registrato (Epic 1, `Allenatore` — precaricato o agganciato a un Utente), **when** assegno l'Allenatore al Gruppo, **then** l'Allenatore risulta responsabile di quel Gruppo per l'Anno Agonistico corrente, e l'assegnazione compare nella pagina Gruppi.
2. **Given** un Gruppo ha già più Allenatori assegnati, **when** ne assegno uno ulteriore, **then** tutti gli Allenatori assegnati restano visibili (un Gruppo può avere più Allenatori, ERD `GRUPPO }o--o{ ALLENATORE`).
3. **Given** un Allenatore è già assegnato a un dato Gruppo, **when** provo ad assegnarlo di nuovo allo stesso Gruppo, **then** l'operazione è idempotente (nessun duplicato, nessun errore) — stesso principio già applicato a `inserisciIscrizione` (Story 1.6).

## Tasks / Subtasks

- [x] Task 1: Modello Prisma `GruppoAllenatore` (AC: #1, #2, #3)
  - [x] `prisma/schema.prisma`: nuovo modello di giunzione molti-a-molti `GruppoAllenatore` (`id`, `gruppoId`, `allenatoreId`, relazioni `gruppo Gruppo @relation(...)` e `allenatore Allenatore @relation(...)`, `createdAt`, `@@unique([gruppoId, allenatoreId])`, `@@map("gruppo_allenatori")`) — stesso pattern di `GenitoreAtleta` (Story 1.5) e `UtenteRuolo` (Story 1.1): tabella di giunzione **non protetta da RLS** (AD-9: né `Gruppo` né `Allenatore` sono nel bind-list di AD-4), gestita via Prisma diretto, anche se le entità collegate sono a loro volta non-RLS.
  - [x] `@@unique([gruppoId, allenatoreId])` è il meccanismo che rende l'assegnazione idempotente (AC #3): un tentativo di duplicato viola il vincolo univoco (Postgres 23505/Prisma P2002), da trattare come successo — stesso pattern già consolidato in `inserisciIscrizione` (Story 1.6) e `risolviAnnoAgonisticoCorrente` (Story 1.6).
  - [x] Estendere `Gruppo` con la relazione inversa `allenatori GruppoAllenatore[]` e `Allenatore` con `gruppi GruppoAllenatore[]`.
  - [x] `onDelete: Cascade` su entrambe le FK (`gruppoId`, `allenatoreId`) — se un Gruppo o un Allenatore venissero eliminati in futuro, l'assegnazione non deve restare orfana (nessuna funzionalità di eliminazione esiste oggi per nessuno dei due, ma la FK va comunque dichiarata con una policy esplicita coerente col resto dello schema, stesso principio di `Campo.palestraId`).
  - [x] Migrazione scritta a mano (workaround shadow-DB consolidato): `CREATE TABLE "gruppo_allenatori" (...)` con FK verso `gruppi` e `allenatori`, indice univoco su `(gruppoId, allenatoreId)`. Applicare con `prisma migrate deploy`, verificare con `prisma migrate status` (nessun drift).
- [x] Task 2: Server Action `assegnaAllenatore` in `app/(gruppi-allenatori)/gruppi/actions.ts` (AC: #1, #2, #3)
  - [x] File esistente (**non** ricreare, Story 2.2) — aggiungere la nuova Server Action accanto a `creaGruppo`. `requireRuolo(["ADMIN", "DIRIGENTE"])` come primo passo (FR-7: "Dirigente o Admin"), stesso pattern di `creaGruppo`.
  - [x] `assegnaAllenatore(_prevState, formData)`: legge `gruppoId` e `allenatoreId` da `formData`, valida che entrambi siano presenti (VALIDATION altrimenti — messaggi distinti per ciascun campo mancante, **non** un unico messaggio combinato: lezione dalla code review di Story 2.1/2.2, `creaCampo`/`creaGruppo`), poi `prisma.gruppoAllenatore.create({ data: { gruppoId, allenatoreId } })` **dentro un try/catch che tratta l'errore Prisma P2002 (vincolo univoco violato) come successo idempotente** (AC #3) — non un check-then-insert (stessa lezione race-condition già applicata a `inserisciIscrizione`, Story 1.6. Un `gruppoId`/`allenatoreId` inesistente genera un errore Prisma di violazione FK, catturato dal blocco try/catch generico come `INTERNAL` (nessuna validazione preventiva separata dell'esistenza necessaria, stesso pattern di `creaCampo`, Story 2.1).
  - [x] `revalidatePath("/gruppi")` dopo l'assegnazione riuscita (o idempotente).
  - [x] **Nessuna Server Action di rimozione in questa storia**: nessun AC richiede di rimuovere un Allenatore da un Gruppo — non introdurre `rimuoviAllenatore` senza un AC che lo richieda (stessa disciplina di scope già applicata in Story 2.2).
- [x] Task 3: UI in `app/(gruppi-allenatori)/gruppi/page.tsx` (AC: #1, #2)
  - [x] File esistente (**non** ricreare, Story 2.2) — estendere la pagina, non crearne una nuova (nessun AC richiede una route dedicata per Gruppo).
  - [x] Elencare tutti gli Allenatori con `prisma.allenatore.findMany({ orderBy: { nome: "asc" } })` (Prisma diretto, sola lettura) per popolare un menu di selezione — stessa scala ridotta di `Palestra`/`Gruppo` (NFR5), nessuna paginazione necessaria.
  - [x] Per ogni riga della tabella Gruppi (già esistente, Story 2.2): includere gli Allenatori attualmente assegnati (`prisma.gruppo.findMany({ where: {...}, include: { allenatori: { include: { allenatore: true } } } })`, filtrato per l'Anno Agonistico corrente come già fatto in Story 2.2) e un piccolo form (`select` sugli Allenatori disponibili + bottone "Assegna") che invoca `assegnaAllenatore` con `gruppoId` nascosto — Client Component (`GruppoRow.tsx`) con `useActionState` e gestione d'errore (`role="alert"`), stesso pattern consolidato di `CampoRow.tsx` (Story 2.1).
  - [x] La tabella Gruppi passa quindi da riga statica (Story 2.2, `<tr>` inline nel Server Component) a un Client Component per riga — refactor minimo e mirato, non un redesign della pagina.
- [x] Task 4: Test (Vitest)
  - [x] `app/(gruppi-allenatori)/gruppi/actions.test.ts`: file esistente, aggiungere test per `assegnaAllenatore` — `FORBIDDEN` per Ruoli diversi da Admin/Dirigente; `VALIDATION` per `gruppoId`/`allenatoreId` mancanti (messaggi distinti); successo — `prisma.gruppoAllenatore.create` chiamato con i due id; **idempotenza** (AC #3) — errore P2002 da `create` trattato come successo, non propagato; errore `INTERNAL` fail-closed su altri errori Prisma (es. FK violata).

### Review Findings

Code review 2026-07-17 — 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor).

- [x] [Review][Patch] `GruppoRow.tsx` non resetta il `<select>` dopo un'assegnazione riuscita, a differenza di `NuovoGruppoForm.tsx`/`NuovoCampoForm.tsx` che resettano il form al successo [app/(gruppi-allenatori)/gruppi/GruppoRow.tsx] — Blind Hunter, risolto con lo stesso pattern `formRef`/`useEffect`, riverificato dal vivo
- [x] [Review][Patch] L'elenco degli Allenatori già assegnati (`include: { allenatori: ... }`) non ha `orderBy`, mentre il menu "disponibili" è ordinato per nome — incoerenza tra i due elenchi nella stessa riga [app/(gruppi-allenatori)/gruppi/page.tsx] — Edge Case Hunter, risolto aggiungendo `orderBy: { allenatore: { nome: "asc" } }`

- [x] [Review][Defer] Il percorso di scrittura (`assegnaAllenatore`) non verifica che il `gruppoId` appartenga all'Anno Agonistico corrente — solo la lettura (`page.tsx`) è filtrata; una tab del browser rimasta aperta a cavallo del cambio stagione potrebbe assegnare un Allenatore a un Gruppo di una stagione passata [app/(gruppi-allenatori)/gruppi/actions.ts] — deferred, stessa categoria di rischio a bassa probabilità già accettata per i confini di data dell'Anno Agonistico (Story 1.6)
- [x] [Review][Defer] Nessun indice sulla sola colonna `allenatoreId` (solo l'indice univoco composito `(gruppoId, allenatoreId)`) [prisma/migrations/20260717160000_add_gruppo_allenatore/migration.sql] — deferred, stesso gap ricorrente già presente su `campi.palestraId` (Story 2.1) e `gruppi.annoAgonisticoId` (Story 2.2), scala ridotta

Dismessi come rumore/falsi positivi/già gestiti (10): assenza di un messaggio di successo dopo l'assegnazione (confrontato correttamente con `CampoRow.tsx`/`PalestraRow.tsx`, non con i form di creazione — stesso pattern "riga di modifica senza messaggio di successo" già validato in Story 2.1, non un'inconsistenza); menu "disponibili" che non esclude gli Allenatori già assegnati (nessun AC lo richiede, l'idempotenza gestisce già la correttezza funzionale); type guard debole su `err.code === "P2002"` (pattern identico e già accettato in `risolviAnnoAgonisticoCorrente`, Story 1.6, non una nuova deviazione); violazioni FK segnalate con errore generico invece che un messaggio distinto (decisione deliberata ed esplicita del Task 2 della storia); assenza di un'azione di rimozione (decisione deliberata ed esplicita, nessun AC la richiede); cascade delete che cancellerebbe lo storico assegnazioni (speculativo, nessuna funzionalità di eliminazione esiste oggi per Gruppo o Allenatore); nessuna gestione dedicata per un menu Allenatori vuoto (cosmetico, nessun AC lo richiede); componenti UI non testati (coerente con la convenzione dell'intero progetto, nessuna pagina/componente UI ha test in nessuna storia); nessun controllo di formato su `gruppoId`/`allenatoreId` prima della FK (stessa decisione deliberata del Task 2); `gruppoId`/`allenatoreId` di soli spazi bianchi non intercettati dal controllo (probabilità trascurabile, richiede manomissione deliberata del form, campi sempre popolati da hidden input/select programmatici).

## Dev Notes

- **`GruppoAllenatore` non è protetta da RLS** (AD-9): stesso trattamento di `GenitoreAtleta` (Story 1.5) — tabella di giunzione tra entità non-RLS, Prisma diretto, connessione privilegiata. **Non creare** un client `lib/db-rls/gruppo-allenatore.ts`.
- **Idempotenza obbligatoria (AC #3)**: `@@unique([gruppoId, allenatoreId])` + cattura di P2002 nel create, **non** un `findFirst` seguito da un `create` condizionale — quella sequenza lascerebbe una finestra di race tra due richieste concorrenti (stessa lezione già imparata e corretta in `risolviAnnoAgonisticoCorrente`, Story 1.6, e in `inserisciIscrizione`, Story 1.6).
- **Estendere `app/(gruppi-allenatori)/gruppi/actions.ts` e `page.tsx` esistenti**: questa storia **non** introduce un nuovo route group né una nuova pagina — Gruppi-Allenatori possiede sia la creazione del Gruppo (Story 2.2) sia l'assegnazione degli Allenatori (questa storia), entrambe nella stessa pagina `/gruppi` (AD-2: "Gruppi-Allenatori possiede la creazione del Gruppo e l'assegnazione degli Allenatori").
- **Nessuna scrittura su `Slot`**: AD-2 è esplicito ("ma non scrive mai direttamente su Slot") — questa storia non tocca in alcun modo `Slot` (Story 2.5, proprietà esclusiva di Orari-Palestre).
- **Messaggi di validazione distinti per campo mancante**: lezione ripetuta due volte nella code review di questo stesso Epic (Story 2.1 `creaCampo`, Story 2.2 `creaGruppo`) — non ripetere l'errore una terza volta in `assegnaAllenatore`.
- **Filtro per Anno Agonistico corrente già presente in `page.tsx`** (Story 2.2, corretto in code review): l'elenco Gruppi mostrato è già scoped alla stagione corrente tramite `trovaAnnoAgonisticoCorrente()` — l'estensione con gli Allenatori assegnati va innestata dentro quella stessa query filtrata, non una query separata non filtrata.
- **`utenteId` nullable su `Allenatore`**: un Allenatore precaricato (Story 1.4) può non avere ancora un `utenteId` (nessuna registrazione autonoma completata) — questo non impedisce l'assegnazione a un Gruppo, l'AC non lo richiede. Non aggiungere un controllo che escluda gli Allenatori precaricati dal menu di selezione.
- **Pattern di riferimento più vicino**: `app/(orari-palestre)/palestre/CampoRow.tsx` e `PalestraRow.tsx` (Story 2.1) per il refactor da riga statica a Client Component per riga con form di assegnazione/modifica; `lib/db-rls/iscrizione.ts#inserisciIscrizione` (Story 1.6) per il pattern esatto di cattura del vincolo univoco come successo idempotente (qui applicato a Prisma diretto, `error.code === "P2002"`, non al client Supabase dove il codice Postgres è `"23505"`).
- **Scala**: NFR PRD §8 — un Gruppo ha tipicamente 1-3 Allenatori, il numero totale di Allenatori è piccolo; nessuna preoccupazione di paginazione per il menu di selezione.

### Project Structure Notes

- Nessun nuovo route group o pagina — estende `app/(gruppi-allenatori)/gruppi/actions.ts` e `page.tsx` (Story 2.2).
- File nuovi attesi: `prisma/migrations/<timestamp>_add_gruppo_allenatore/migration.sql`, `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx` (o nome equivalente per il refactor riga-Gruppo → Client Component, da confermare in fase di sviluppo). File modificati: `prisma/schema.prisma` (nuovo modello `GruppoAllenatore`; relazioni inverse su `Gruppo` e `Allenatore`), `app/(gruppi-allenatori)/gruppi/actions.ts`, `app/(gruppi-allenatori)/gruppi/actions.test.ts`, `app/(gruppi-allenatori)/gruppi/page.tsx`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3: Assegnazione Allenatori a Gruppo] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-7] — "Dirigente o Admin può assegnare uno o più Allenatori a un Gruppo".
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-2] — "Gruppi-Allenatori possiede la creazione del Gruppo e l'assegnazione degli Allenatori, ma non scrive mai direttamente su Slot".
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-9] — Gruppo e Allenatore non protetti da RLS, Prisma diretto.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#Structural Seed] — ERD (`GRUPPO }o--o{ ALLENATORE: "assegnato a"`).
- [Source: prisma/schema.prisma#GenitoreAtleta] — pattern di riferimento per una tabella di giunzione molti-a-molti non-RLS (Story 1.5).
- [Source: lib/db-rls/iscrizione.ts#inserisciIscrizione] — pattern di riferimento per l'idempotenza via cattura del vincolo univoco (Story 1.6).
- [Source: app/(orari-palestre)/palestre/CampoRow.tsx, PalestraRow.tsx] — pattern di riferimento per Client Component per riga con form di assegnazione (Story 2.1).
- [Source: app/(gruppi-allenatori)/gruppi/actions.ts, page.tsx] — file esistenti da estendere, non ricreare (Story 2.2).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Migrazione shadow-DB**: stesso workaround ormai consolidato (Story 1.3 in poi) — migrazione scritta a mano (`20260717160000_add_gruppo_allenatore`) e applicata con `prisma migrate deploy`, verificata con `prisma migrate status` (nessun drift).
- Verifiche eseguite e passate: `npx vitest run` (202/202 test), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun errore), `npm run build` (build completata, `/gruppi` correttamente dinamica).
- **Verifica end-to-end reale eseguita** (Playwright, contro il backend Supabase locale non mockato): login Admin → creazione Gruppo di test → assegnazione di un Allenatore (AC #1, verificato nella riga del Gruppo) → riassegnazione dello stesso Allenatore allo stesso Gruppo (AC #3, nessun errore mostrato, confermato via query diretta al DB che esiste una sola riga `GruppoAllenatore` nonostante il doppio tentativo — idempotenza reale, non solo simulata dal mock). Dati di test ripuliti dal DB al termine, Playwright disinstallato.
- Nessun bug applicativo reale scoperto durante la verifica dal vivo.
- **Code review (2026-07-17)**: 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor). 0 `decision-needed`, 2 `patch`, 2 `defer`, 10 scartati come rumore/già gestiti — la maggior parte dei finding scartati erano decisioni deliberate già esplicite nelle Dev Notes (nessuna azione di rimozione, violazioni FK con errore generico) o pattern coerenti con l'intero progetto (type guard su P2002 identico a Story 1.6, nessun test per componenti UI). Patch applicate: (1) `GruppoRow.tsx` non resettava il `<select>` dopo un'assegnazione riuscita — risolto con lo stesso pattern `formRef`/`useEffect` di `NuovoGruppoForm`/`NuovoCampoForm`; (2) l'elenco degli Allenatori già assegnati non era ordinato mentre il menu "disponibili" sì — risolto con `orderBy` sulla relazione annidata. Entrambe riverificate dal vivo. Suite completa: 202/202 test, typecheck/lint/build verdi.

### Completion Notes List

- Implementati Task 1-4: modello di giunzione `GruppoAllenatore` (non protetto da RLS, AD-9, stesso trattamento di `GenitoreAtleta`), Server Action `assegnaAllenatore` (idempotente via cattura di P2002, stesso pattern di `inserisciIscrizione`), refactor della tabella Gruppi da riga statica a `GruppoRow.tsx` (Client Component) per includere gli Allenatori assegnati e il form di assegnazione.
- **Decisione applicata coerentemente con le Dev Notes**: nessuna Server Action di rimozione introdotta — nessun AC la richiede, stessa disciplina di scope già applicata in Story 2.2.
- **Nessuna nuova route/pagina**: estesi `actions.ts`/`page.tsx` esistenti (Story 2.2), coerente con AD-2 ("Gruppi-Allenatori possiede sia la creazione del Gruppo sia l'assegnazione degli Allenatori").
- **Messaggi di validazione distinti fin dall'inizio**: applicata proattivamente la lezione delle code review di Story 2.1/2.2 (due controlli separati per `gruppoId`/`allenatoreId` mancanti), non riscoperta in un secondo momento.
- Nessun elemento bloccato da vincoli ambientali; nessun bug applicativo reale scoperto durante la dev-story.
- **Post-review**: `GruppoRow.tsx` ora resetta il `<select>` dopo un'assegnazione riuscita; l'elenco degli Allenatori già assegnati è ora ordinato per nome, coerente con il menu "disponibili".

### File List

**Creati:**
- `prisma/migrations/20260717160000_add_gruppo_allenatore/migration.sql`
- `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx`

**Modificati:**
- `prisma/schema.prisma` (nuovo modello `GruppoAllenatore`; relazioni inverse `allenatori`/`gruppi` su `Gruppo`/`Allenatore`)
- `app/(gruppi-allenatori)/gruppi/actions.ts` (nuova Server Action `assegnaAllenatore`)
- `app/(gruppi-allenatori)/gruppi/actions.test.ts` (nuovi test per `assegnaAllenatore`)
- `app/(gruppi-allenatori)/gruppi/page.tsx` (elenca Allenatori disponibili, righe Gruppi ora `GruppoRow.tsx`)

## Change Log

- 2026-07-17: Implementazione completa Story 2.3 (Task 1-4). Terza storia dell'Epic 2, seconda del modulo Gruppi-Allenatori — estende `app/(gruppi-allenatori)/gruppi/` esistente (Story 2.2), nessuna nuova route (AD-2: "Gruppi-Allenatori possiede sia la creazione del Gruppo sia l'assegnazione degli Allenatori"). `GruppoAllenatore` come tabella di giunzione non-RLS (AD-9), stesso pattern di `GenitoreAtleta` (Story 1.5). Assegnazione idempotente via cattura del vincolo univoco (Prisma P2002), stesso pattern di `inserisciIscrizione` (Story 1.6) — nessun check-then-insert. Lezione delle code review precedenti (messaggi di validazione distinti per campo) applicata proattivamente, non riscoperta. Tutti gli AC verificati anche dal vivo contro un backend Supabase reale, inclusa l'idempotenza confermata via query diretta al DB (una sola riga dopo due tentativi di assegnazione). Nessun bug applicativo reale scoperto. Status → review.
- 2026-07-17: Code review. 3 layer paralleli, 0 decisioni, 2 patch applicate (reset del form di assegnazione dopo il successo; ordinamento dell'elenco Allenatori già assegnati), 2 findings deferiti (stessa categoria di rischio a bassa probabilità dei confini di data già accettata, e gap ricorrente di indicizzazione già presente in Story 2.1/2.2), 10 scartati come rumore/già gestiti — la maggioranza erano decisioni deliberate già esplicite nelle Dev Notes o pattern coerenti con il resto del progetto. Entrambe le patch riverificate dal vivo. Suite completa: 202/202 test, typecheck/lint/build verdi. Status → done.