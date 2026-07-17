---
baseline_commit: NO_VCS
---

# Story 2.4: Assegnazione Atlete a Gruppo

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Dirigente o Admin,
I want assegnare una o più Atlete a un Gruppo,
so that ogni atleta risulta inquadrata nel gruppo in cui si allena.

## Acceptance Criteria

1. **Given** un Gruppo esiste (Story 2.2) e un'Atleta è presente a sistema (Epic 1), **when** assegno l'Atleta al Gruppo, **then** l'Atleta risulta membro di quel Gruppo per l'Anno Agonistico del Gruppo, e l'assegnazione compare nella pagina Gruppi.
2. **Given** un'Atleta è già assegnata a un Gruppo per un dato Anno Agonistico, **when** la assegno a un **altro** Gruppo per lo stesso Anno Agonistico, **then** l'assegnazione precedente viene sostituita — un'Atleta appartiene a un solo Gruppo per Anno Agonistico, mai a più di uno contemporaneamente (invariante di sistema, non solo una regola di validazione all'inserimento).
3. **Given** un'Atleta è già assegnata a un dato Gruppo, **when** provo ad assegnarla di nuovo allo stesso Gruppo, **then** l'operazione è idempotente (nessun errore, nessun duplicato).

## Tasks / Subtasks

- [x] Task 1: Modello Prisma `GruppoAtleta` (AC: #1, #2, #3)
  - [x] `prisma/schema.prisma`: nuovo modello di giunzione `GruppoAtleta` (`id`, `atletaId`, `gruppoId`, **`annoAgonisticoId`** — copiato dal Gruppo assegnato al momento della scrittura, non risolto autonomamente —, relazioni `gruppo Gruppo @relation(...)` e `atleta Atleta @relation(...)`, `createdAt`, `@@unique([atletaId, annoAgonisticoId])`, `@@map("gruppo_atlete")`).
  - [x] **`annoAgonisticoId` è denormalizzato dal Gruppo, non opzionale**: è l'unico modo per esprimere a livello di database il vincolo "un'Atleta appartiene a un solo Gruppo per Anno Agonistico" (AC #2) — un vincolo `@@unique` in Postgres/Prisma può riferirsi solo a colonne della stessa tabella, non a una colonna di una tabella collegata (`Gruppo.annoAgonisticoId`). Stesso principio già usato da `Iscrizione` (Story 1.6, FK diretta a `AnnoAgonistico` sulla stessa riga, non transitiva tramite un'altra entità) — **non** il pattern transitivo di `Slot`/`Presenza` (AD-8, ancora da costruire), che qui non si applica perché serve un vincolo di unicità reale, non solo un'ereditarietà di lettura.
  - [x] **`GruppoAtleta` non è protetta da RLS**, nonostante la FK verso `Atleta` (RLS-protetta, AD-4): stesso esatto principio di `GenitoreAtleta` (Story 1.5) — "il vincolo di integrità referenziale è una garanzia Postgres indipendente dalla RLS/PostgREST". La dichiarazione Prisma della relazione `atleta Atleta @relation(...)` è solo uno strumento di schema/migrazione (genera la FK), **non** un permesso implicito a leggere le colonne di `Atleta` bypassando RLS a runtime (vedi Task 3 per il vincolo pratico che questo impone alla UI).
  - [x] `onDelete: Cascade` su entrambe le FK (`gruppoId`, `atletaId`) — stesso principio già applicato a `GruppoAllenatore` (Story 2.3) e `Iscrizione`/`GenitoreAtleta`.
  - [x] Migrazione scritta a mano (workaround shadow-DB consolidato): `CREATE TABLE "gruppo_atlete" (...)` con FK verso `gruppi` e `atlete`, indice univoco su `(atletaId, annoAgonisticoId)`. Applicare con `prisma migrate deploy`, verificare con `prisma migrate status` (nessun drift).
- [x] Task 2: Server Action `assegnaAtleta` in `app/(gruppi-allenatori)/gruppi/actions.ts` (AC: #1, #2, #3)
  - [x] File esistente (**non** ricreare, Story 2.2/2.3) — aggiungere la nuova Server Action accanto a `creaGruppo`/`assegnaAllenatore`. `requireRuolo(["ADMIN", "DIRIGENTE"])` come primo passo (FR-30, analogo a FR-7), stesso pattern delle altre due azioni in questo file.
  - [x] `assegnaAtleta(_prevState, formData)`: legge `gruppoId` e `atletaId` da `formData`, valida che entrambi siano presenti (messaggi distinti per campo mancante, stessa lezione già applicata a `assegnaAllenatore`). Poi: `const gruppo = await prisma.gruppo.findUnique({ where: { id: gruppoId }, select: { annoAgonisticoId: true } })` — se `null`, `VALIDATION` "Gruppo non trovato." (un `gruppoId` inesistente **non** deve arrivare fino a un errore Prisma generico qui, perché serve il suo `annoAgonisticoId` per il passo successivo, non solo per la FK).
  - [x] **Usare `prisma.gruppoAtleta.upsert`, non `create` con cattura P2002** (a differenza di `assegnaAllenatore`, Story 2.3): `where: { atletaId_annoAgonisticoId: { atletaId, annoAgonisticoId: gruppo.annoAgonisticoId } }`, `create: { atletaId, gruppoId, annoAgonisticoId: gruppo.annoAgonisticoId }`, `update: { gruppoId } }`. L'`upsert` esprime correttamente **sia** l'idempotenza (AC #3: riassegnare la stessa Atleta allo stesso Gruppo aggiorna `gruppoId` con lo stesso valore, no-op) **sia** la sostituzione (AC #2: riassegnarla a un Gruppo diverso nello stesso Anno Agonistico aggiorna `gruppoId` al nuovo valore) — un singolo passo atomico, non un check-then-write con una finestra di race.
  - [x] Un `atletaId` inesistente genera un errore Prisma di violazione FK sull'`upsert`, catturato dal blocco try/catch generico come `INTERNAL` (nessuna validazione preventiva separata dell'esistenza necessaria, stesso pattern di `assegnaAllenatore`).
  - [x] `revalidatePath("/gruppi")` dopo l'assegnazione riuscita.
  - [x] **Nessuna Server Action di rimozione in questa storia**: nessun AC richiede di rimuovere un'Atleta da un Gruppo senza riassegnarla altrove — stessa disciplina di scope già applicata in Story 2.2/2.3.
- [x] Task 3: UI in `app/(gruppi-allenatori)/gruppi/page.tsx` (AC: #1, #2)
  - [x] File esistente (**non** ricreare) — estendere la pagina, non crearne una nuova.
  - [x] **Vincolo critico di sicurezza**: `Atleta` è protetta da RLS (AD-4/AD-9) — le sue colonne (nome, codiceFiscale, ecc.) vanno lette **solo** tramite `elencaAtlete(supabase)` (`lib/db-rls/atleta.ts`, già esistente, riusato da Story 1.6), **mai** tramite un `include`/`select` Prisma diretto che attraversi la relazione `GruppoAtleta.atleta` — quella query userebbe la connessione privilegiata di Prisma, bypassando le policy RLS per dati che AD-4 protegge esplicitamente. `page.tsx` deve quindi:
    1. Creare il client Supabase autenticato (`const supabase = await createClient()`, `lib/supabase/server`) e chiamare `elencaAtlete(supabase)` per ottenere l'elenco completo delle Atlete (stesso pattern di `conferma-iscrizioni/page.tsx`, Story 1.6).
    2. Leggere le righe `GruppoAtleta` per l'Anno Agonistico corrente **solo** con `prisma.gruppoAtleta.findMany({ where: { annoAgonisticoId: annoCorrente.id }, select: { atletaId: true, gruppoId: true } })` — **senza** `include: { atleta: true }`.
    3. Costruire lato server una mappa `atletaId -> Atleta` a partire dal risultato di `elencaAtlete`, e usarla per abbinare i nomi alle righe `GruppoAtleta` per ciascun Gruppo — nessun dato di `Atleta` viene mai letto tramite Prisma diretto.
  - [x] Per ogni riga della tabella Gruppi (`GruppoRow.tsx`, Story 2.3): aggiungere una colonna "Atlete" con l'elenco delle Atlete assegnate a quel Gruppo (ordinate per nome) e un piccolo form (`select` sulle Atlete disponibili + bottone "Assegna") che invoca `assegnaAtleta` con `gruppoId` nascosto — stesso pattern del form "Assegna Allenatore" già presente in `GruppoRow.tsx`, incluso il reset del form al successo (`formRef`/`useEffect`, lezione dalla code review di Story 2.3).
- [x] Task 4: Test (Vitest)
  - [x] `app/(gruppi-allenatori)/gruppi/actions.test.ts`: file esistente, aggiungere test per `assegnaAtleta` — `FORBIDDEN` per Ruoli diversi da Admin/Dirigente; `VALIDATION` per `gruppoId`/`atletaId` mancanti (messaggi distinti); `VALIDATION` "Gruppo non trovato" quando `prisma.gruppo.findUnique` risolve `null`; successo — `prisma.gruppoAtleta.upsert` chiamato con la chiave composita corretta e `annoAgonisticoId` preso dal Gruppo risolto; errore `INTERNAL` fail-closed su eccezione Prisma (es. `atletaId` inesistente, FK violata).

### Review Findings

Code review 2026-07-17 — 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor).

- [x] [Review][Patch] `prisma.gruppo.findUnique` in `assegnaAtleta` era fuori dal blocco try/catch — un errore di connessione lì avrebbe fatto crashare la Server Action invece di restituire un `INTERNAL` gestito [app/(gruppi-allenatori)/gruppi/actions.ts] — Edge Case Hunter, risolto spostando la chiamata dentro un proprio blocco try/catch, coperto da un nuovo test TDD, riverificato con l'intera suite
- [x] [Review][Patch] `atleteDisponibili` in `page.tsx` passava l'intero oggetto `AtletaElenco` (incluso `codiceFiscale`, dato sensibile) al Client Component per un `<select>` che usa solo `id`/`nome` — payload RSC verso il browser più ampio del necessario [app/(gruppi-allenatori)/gruppi/page.tsx] — Blind Hunter, risolto proiettando l'elenco a `{id, nome}` prima di attraversare il confine server/client, riverificato dal vivo (Codice Fiscale assente dal payload della pagina, nessuna regressione funzionale)

- [x] [Review][Defer] `assegnaAtleta` non verifica che il `gruppoId` appartenga all'Anno Agonistico corrente — stessa categoria già deferita per `assegnaAllenatore` (Story 2.3) [app/(gruppi-allenatori)/gruppi/actions.ts] — deferred
- [x] [Review][Defer] Il catch-all restituisce lo stesso messaggio generico sia per un `atletaId` inesistente (mai risolvibile con un retry) sia per un errore transitorio — stessa asimmetria già presente in `assegnaAllenatore` [app/(gruppi-allenatori)/gruppi/actions.ts] — deferred
- [x] [Review][Defer] Nessuna validazione di corrispondenza tra `categoria` dell'Atleta e del Gruppo — nessun AC lo richiede [app/(gruppi-allenatori)/gruppi/actions.ts] — deferred
- [x] [Review][Defer] Nessun controllo di Iscrizione attiva prima dell'assegnazione — nessun AC lo richiede [app/(gruppi-allenatori)/gruppi/actions.ts] — deferred
- [x] [Review][Defer] Nessun indice su `gruppo_atlete.annoAgonisticoId` da solo — stesso gap ricorrente già presente su `campi.palestraId`/`gruppi.annoAgonisticoId`/`gruppo_allenatori.allenatoreId` [prisma/migrations/20260717170000_add_gruppo_atleta/migration.sql] — deferred
- [x] [Review][Defer] `Promise.all` in `page.tsx` senza try/catch — gap preesistente e trasversale da Story 2.2/2.3 [app/(gruppi-allenatori)/gruppi/page.tsx] — deferred
- [x] [Review][Defer] Nessuna indicazione in UI del Gruppo attuale di un'Atleta prima della riassegnazione — miglioramento UX, AC #2 richiede esplicitamente la sostituzione silenziosa [app/(gruppi-allenatori)/gruppi/GruppoRow.tsx] — deferred

Dismessi come rumore/falsi positivi/già gestiti (7): pre-validazione di `atletaId` contro l'elenco RLS-visibile prima dell'upsert (decisione deliberata ed esplicita nelle Dev Notes, stesso pattern di `assegnaAllenatore` — nessuna validazione preventiva separata dell'esistenza, l'errore FK generico è già il comportamento voluto); un'Atleta assegnata che sparirebbe silenziosamente dalla lista se non più visibile via RLS (irraggiungibile: `onDelete: Cascade` su `Atleta` elimina sempre anche le sue righe `GruppoAtleta`); assenza di test per la logica di join/ordinamento in `page.tsx` (fuori dalla convenzione dell'intero progetto — zero test su pagine/componenti UI in nessuna storia); l'upsert testato solo via mock, non contro un vincolo Postgres reale (già mitigato dalla verifica dal vivo eseguita in fase di dev-story, che ha confermato sostituzione e idempotenza via query dirette al DB); diff con solo riallineamento di spaziatura su `Gruppo` (comportamento standard e atteso di `prisma format`, innocuo); "nessuna prova che la migrazione sia stata validata contro un DB reale" (fattualmente errato — `prisma migrate deploy`/`migrate status` eseguiti e documentati nel Debug Log); micro-ottimizzazione di un `filter()` lineare al posto di un pre-raggruppamento (lo stesso reviewer la definisce ininfluente alla scala dichiarata del progetto).

## Dev Notes

- **`GruppoAtleta` non è protetta da RLS, ma `Atleta` sì**: questa è la prima storia dell'Epic 2 che collega un'entità non-RLS (`Gruppo`) a un'entità RLS-protetta (`Atleta`, AD-4). Il pattern corretto — già stabilito da `GenitoreAtleta` (Story 1.5) — è che la tabella di **giunzione** resta non-RLS e gestita via Prisma diretto (la FK verso `Atleta` è solo un vincolo di integrità referenziale Postgres), ma **ogni lettura dei dati veri e propri di `Atleta`** (nome, codiceFiscale, ecc.) deve passare dal client Supabase autenticato (`elencaAtlete`), mai da un `include` Prisma. Questo è il rischio più alto di questa storia — un `include: { atleta: true }` su una query Prisma di `gruppoAtleta` sarebbe un bug di sicurezza reale (bypass silenzioso di RLS), non solo una deviazione di stile.
- **Perché `upsert` e non `create` + cattura P2002 (a differenza di `assegnaAllenatore`, Story 2.3)**: FR-30/AC #2 impongono un vincolo diverso da FR-7 — un'Atleta ha **un solo** Gruppo per Anno Agonistico (relazione funzionale, non un puro molti-a-molti come Allenatore↔Gruppo). L'`upsert` sulla chiave composita `(atletaId, annoAgonisticoId)` esprime esattamente questo: la riga esistente per quella Atleta+stagione viene aggiornata con il nuovo `gruppoId` invece di generare un conflitto o una seconda riga.
- **`annoAgonisticoId` va letto dal Gruppo target, non da `risolviAnnoAgonisticoCorrente()`**: a differenza di `creaGruppo` (Story 2.2), questa azione non deve richiedere/creare l'Anno Agonistico corrente — il Gruppo a cui si assegna l'Atleta esiste già ed ha già il proprio `annoAgonisticoId` (impostato alla sua creazione). Usare quel valore, letto con un semplice `findUnique`, non un helper di risoluzione stagione.
- **AD-10 rispettato**: questa storia non scrive **mai** sulle colonne identitarie di `Atleta` (nome, codiceFiscale, categoria, ecc.) — solo su `GruppoAtleta`, una entità correlata via FK, esattamente come `Iscrizione`/`CertificatoMedico` (Story 1.6/1.7).
- **Nessuna Server Action di rimozione**: nessun AC la richiede — un'Atleta assegnata al Gruppo sbagliato si "sposta" riassegnandola al Gruppo corretto (AC #2), non serve un passo di rimozione separato.
- **Pattern di riferimento più vicino**: `app/(gruppi-allenatori)/gruppi/actions.ts#assegnaAllenatore` e `GruppoRow.tsx` (Story 2.3) per la struttura generale della Server Action e del form per-riga; `lib/db-rls/atleta.ts#elencaAtlete` e `app/(iscrizioni)/conferma-iscrizioni/page.tsx` (Story 1.6) per il pattern esatto di lettura di `Atleta` tramite client Supabase autenticato in una pagina che altrimenti usa Prisma diretto.
- **Scala**: NFR PRD §8 (~200 Atlete), un Gruppo ha tipicamente 10-20 Atlete; nessuna preoccupazione di paginazione per `elencaAtlete`/il menu di selezione.

### Project Structure Notes

- Nessun nuovo route group o pagina — estende `app/(gruppi-allenatori)/gruppi/actions.ts`, `page.tsx` e `GruppoRow.tsx` (Story 2.2/2.3).
- File nuovi attesi: `prisma/migrations/<timestamp>_add_gruppo_atleta/migration.sql`. File modificati: `prisma/schema.prisma` (nuovo modello `GruppoAtleta`; relazione inversa su `Gruppo` e `Atleta`), `app/(gruppi-allenatori)/gruppi/actions.ts`, `app/(gruppi-allenatori)/gruppi/actions.test.ts`, `app/(gruppi-allenatori)/gruppi/page.tsx`, `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4: Assegnazione Atlete a Gruppo] — user story e Acceptance Criteria originali (incluso FR-30, colmatura di una lacuna del PRD).
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-30] — "Dirigente o Admin può assegnare una o più Atlete a un Gruppo, analogamente a FR-7 per gli Allenatori".
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-4] — Atleta esplicitamente nel bind-list RLS.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-9] — split di accesso ai dati: tabelle RLS lette solo via client Supabase autenticato.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-10] — Atleta, proprietario unico Onboarding-Import per i campi identitari.
- [Source: prisma/schema.prisma#GenitoreAtleta] — pattern di riferimento per una tabella di giunzione non-RLS con FK verso un'entità RLS-protetta (Story 1.5).
- [Source: prisma/schema.prisma#Iscrizione] — pattern di riferimento per un vincolo di unicità per Anno Agonistico espresso con una FK diretta, non transitiva (Story 1.6).
- [Source: lib/db-rls/atleta.ts#elencaAtlete] — funzione di lettura condivisa da riusare, non reimplementare (Story 1.6).
- [Source: app/(iscrizioni)/conferma-iscrizioni/page.tsx] — pattern di riferimento per una pagina che combina lettura Prisma diretta e lettura RLS-protetta tramite client Supabase autenticato.
- [Source: app/(gruppi-allenatori)/gruppi/actions.ts, GruppoRow.tsx] — file esistenti da estendere, non ricreare (Story 2.2/2.3).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `npx prisma migrate deploy` + `npx prisma migrate status`: migrazione `20260717170000_add_gruppo_atleta` applicata senza drift.
- `npx tsc --noEmit`: pulito.
- `npx vitest run`: 208 test, tutti superati (18 in `actions.test.ts`, inclusi i 6 nuovi per `assegnaAtleta`).
- `npm run lint`: pulito.
- `npm run build`: build di produzione riuscita, `/gruppi` confermata come route dinamica (`ƒ`).
- Verifica live (Playwright temporaneo + Prisma diretto per le asserzioni sul DB, poi rimossi): login Admin, creazione di due Gruppi di test, Atleta di test inserita via Prisma diretto (fixture, non rappresenta il pattern di scrittura dell'app). Confermati dal vivo: AC #1 (l'Atleta compare sotto il Gruppo assegnato), AC #2 (riassegnarla a un Gruppo diverso nello stesso Anno Agonistico la sposta, sparisce dal primo), AC #3 (riassegnarla allo stesso Gruppo è idempotente - stessa riga `GruppoAtleta`, nessun duplicato, verificato via query diretta). Dati di test rimossi al termine.
- Code review (3 layer paralleli) → 2 patch applicate con TDD dove applicabile, riverificate dal vivo (Codice Fiscale confermato assente dal payload HTML di `/gruppi`, assegnazione ancora funzionante dopo le patch, nessuna regressione). Suite completa dopo le patch: 209/209 test, `tsc`/`lint`/`build` verdi.

### Completion Notes List

- Implementato esattamente come da Dev Notes: `GruppoAtleta` non-RLS con `annoAgonisticoId` denormalizzato dal Gruppo target, upsert sulla chiave composita `(atletaId, annoAgonisticoId)` per esprimere sia sostituzione (AC #2) che idempotenza (AC #3) in un unico passo atomico.
- Vincolo di sicurezza rispettato: `page.tsx` legge le Atlete solo tramite `elencaAtlete(supabase)` (client Supabase autenticato); le righe `GruppoAtleta` sono lette con `prisma.gruppoAtleta.findMany` selezionando solo `atletaId`/`gruppoId`, senza mai un `include: { atleta: true }` - la mappa `atletaId -> Atleta` è costruita lato server a partire dal risultato RLS-safe.
- Nessuna Server Action di rimozione aggiunta (nessun AC la richiede, come previsto dai Dev Notes).
- Piccola correzione in corso di sviluppo rispetto allo schema iniziale: `AnnoAgonistico` necessitava del campo di back-reference `gruppoAtlete GruppoAtleta[]` (richiesto da Prisma per una relazione esplicita), non esplicitato nel Task 1 ma necessario per la validazione dello schema - aggiunto e poi normalizzato con `prisma format`.

### File List

- `prisma/schema.prisma` (modificato: nuovo modello `GruppoAtleta`, back-reference su `Atleta`, `Gruppo`, `AnnoAgonistico`)
- `prisma/migrations/20260717170000_add_gruppo_atleta/migration.sql` (nuovo)
- `app/(gruppi-allenatori)/gruppi/actions.ts` (modificato: nuova Server Action `assegnaAtleta`)
- `app/(gruppi-allenatori)/gruppi/actions.test.ts` (modificato: nuovi test per `assegnaAtleta`)
- `app/(gruppi-allenatori)/gruppi/page.tsx` (modificato: lettura Atlete via `elencaAtlete`, righe `GruppoAtleta` via Prisma diretto senza `include`, mappa di join lato server)
- `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx` (modificato: colonna "Atlete" con form di assegnazione, stesso pattern reset-on-success della colonna Allenatori)

## Change Log

- 2026-07-17: Implementazione completa Story 2.4 (Task 1-4). Quarta storia dell'Epic 2 — estende `app/(gruppi-allenatori)/gruppi/` esistente (Story 2.2/2.3), nessuna nuova route. Prima storia dell'Epic 2 a collegare un'entità non-RLS (`Gruppo`) a un'entità RLS-protetta (`Atleta`, AD-4): `GruppoAtleta` resta non-RLS come tabella di giunzione (stesso pattern di `GenitoreAtleta`, Story 1.5), ma la UI legge le Atlete solo tramite `elencaAtlete(supabase)`, mai con un `include` Prisma che attraverserebbe la relazione bypassando RLS. A differenza di `assegnaAllenatore` (Story 2.3, `create` + cattura P2002), `assegnaAtleta` usa `upsert` sulla chiave composita `(atletaId, annoAgonisticoId)` perché AC #2 richiede sostituzione (un'Atleta ha un solo Gruppo per Anno Agonistico), non pura idempotenza multi-membership. Tutti gli AC verificati dal vivo contro un backend Supabase reale, inclusa la sostituzione (AC #2) e l'idempotenza (AC #3) confermate via query diretta al DB. Nessun bug applicativo reale scoperto durante lo sviluppo. Status → review.
- 2026-07-17: Code review. 3 layer paralleli, 0 decisioni, 2 patch applicate (try/catch attorno a `prisma.gruppo.findUnique`, prima fuori dal blocco protetto — poteva far crashare la Server Action su un errore di connessione; proiezione di `atleteDisponibili` a `{id, nome}` prima di attraversare il confine server/client — evitava di spedire il Codice Fiscale al browser per un `<select>` che non lo usa), 7 finding deferiti (stessa categoria di rischio a bassa probabilità dei confini di stagione già accettata per `assegnaAllenatore`, asimmetria di messaggio d'errore preesistente, due regole di prodotto non richieste da alcun AC, gap di indicizzazione ricorrente, `Promise.all` senza try/catch preesistente, miglioramento UX non richiesto dagli AC), 7 scartati come rumore/già gestiti — la maggioranza erano decisioni deliberate già esplicite nelle Dev Notes o verifiche già coperte dalla validazione dal vivo. Entrambe le patch riverificate dal vivo (Codice Fiscale assente dal payload, assegnazione ancora funzionante). Suite completa: 209/209 test, typecheck/lint/build verdi. Status → done.
