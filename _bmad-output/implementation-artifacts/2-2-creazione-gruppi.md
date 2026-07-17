---
baseline_commit: NO_VCS
---

# Story 2.2: Creazione Gruppi

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Dirigente o Admin,
I want creare un Gruppo per l'Anno Agonistico corrente,
so that posso organizzare le atlete in squadre/categorie.

## Acceptance Criteria

1. **Given** conosco nome e categoria del Gruppo da creare, **when** lo creo nel sistema, **then** il Gruppo viene salvato con un id univoco, associato all'Anno Agonistico corrente (AD-8), e compare nell'elenco dei Gruppi.
2. **Given** l'Anno Agonistico corrente non esiste ancora a sistema (prima creazione di un Gruppo in assoluto, o primo utilizzo dopo il cambio stagione), **when** creo un Gruppo, **then** l'Anno Agonistico corrente viene derivato e creato automaticamente dalle date di calendario (1 agosto – 30 giugno, stesso helper condiviso di Story 1.6/1.8) **prima** di creare il Gruppo, così la catena FK di AD-8 non resta orfana al primo utilizzo — nessun errore, nessuna creazione manuale richiesta all'utente.
3. **Given** nome o categoria mancanti, **when** provo a creare un Gruppo, **then** ricevo un errore di validazione chiaro e nessun Gruppo viene creato.

## Tasks / Subtasks

- [x] Task 1: Modello Prisma `Gruppo` (AC: #1, #2)
  - [x] `prisma/schema.prisma`: nuovo modello `Gruppo` (`id`, `nome`, `categoria`, `annoAgonisticoId`, relazione `annoAgonistico AnnoAgonistico @relation(...)`, `createdAt`, `@@map("gruppi")`). **Non protetto da RLS** (AD-9 elenca esplicitamente Gruppo insieme a Palestra/Campo/Slot/Allenatore come gestito via Prisma diretto, connessione privilegiata) — nessun client `lib/db-rls/`, nessuna policy RLS, stesso trattamento di `Palestra`/`Campo` (Story 2.1).
  - [x] Estendere `AnnoAgonistico` con la relazione inversa `gruppi Gruppo[]` (stesso pattern già usato per `iscrizioni Iscrizione[]`, Story 1.6).
  - [x] FK `annoAgonisticoId` verso `AnnoAgonistico` — **nessun** `onDelete: Cascade`/`SetNull` esplicito diverso dal default Prisma (`Restrict`) a meno che non emerga un bisogno concreto: eliminare un Anno Agonistico con Gruppi associati non è un caso d'uso di questa storia (nessuna UI di eliminazione Anno Agonistico esiste). Nessun `@@unique` su `nome` (né globale né per Anno Agonistico): nessun AC lo richiede.
  - [x] Migrazione scritta a mano (workaround shadow-DB consolidato): `CREATE TABLE "gruppi" (...)` con FK verso `anni_agonistici`. Applicare con `prisma migrate deploy`, verificare con `prisma migrate status` (nessun drift).
- [x] Task 2: Server Action `creaGruppo` in `app/(gruppi-allenatori)/gruppi/actions.ts` (AC: #1, #2, #3)
  - [x] File nuovo (il route group `(gruppi-allenatori)` non esiste ancora — prima storia di questo modulo, per FR-6/FR-7 secondo ARCHITECTURE-SPINE.md). `requireRuolo(["ADMIN", "DIRIGENTE"])` come primo passo (FR-6: "Dirigente o Admin"), stesso pattern di `app/(orari-palestre)/palestre/actions.ts` (Story 2.1).
  - [x] **Riusare** `risolviAnnoAgonisticoCorrente()` da `lib/anno-agonistico/` (Story 1.6, già find-or-create, già riusato da Story 1.8) per risolvere/creare l'Anno Agonistico corrente **prima** di creare il Gruppo (AC #2) — **non** reimplementare questa logica, è esattamente lo scopo di AD-8 ("un solo helper condiviso, mai calcoli di date ripetuti per modulo"). Stesso identico pattern già usato in `confermaIscrizione` (Story 1.6, `app/(iscrizioni)/conferma-iscrizioni/actions.ts`), che chiama `risolviAnnoAgonisticoCorrente()` per lo stesso motivo prima di un INSERT con FK verso l'Anno Agonistico.
  - [x] `creaGruppo(_prevState, formData)`: valida `nome` e `categoria` non vuoti (VALIDATION altrimenti, AC #3), poi `risolviAnnoAgonisticoCorrente()`, poi `prisma.gruppo.create({ data: { nome, categoria, annoAgonisticoId: anno.id } })`. Prisma diretto (non `lib/db-rls/`) — stesso pattern di `creaPalestra` (Story 2.1), non quello di `creaAtleta`/`inserisciIscrizione`.
  - [x] `revalidatePath("/gruppi")` dopo la creazione riuscita.
  - [x] **Nessuna Server Action di modifica in questa storia**: a differenza di Story 2.1 ("creare e modificare"), lo user story di questa storia dice solo "creare" — non introdurre `aggiornaGruppo` senza un AC che lo richieda (stessa disciplina di scope già applicata in storie precedenti).
- [x] Task 3: UI in `app/(gruppi-allenatori)/gruppi/page.tsx` (AC: #1, #3)
  - [x] Server Component con `export const dynamic = "force-dynamic"` (mutazione Server Action sulla stessa pagina — stesso motivo di `/admin` e `/palestre`, applicato fin da subito per coerenza, non scoperto in un secondo momento).
  - [x] Elenca tutti i Gruppi con `prisma.gruppo.findMany({ orderBy: { nome: "asc" } })` — Prisma diretto (sola lettura). Non è necessario mostrare l'Anno Agonistico associato in dettaglio in questa storia (nessun AC lo richiede) oltre magari a mostrarne il nome/intervallo se banale da includere; non introdurre viste aggiuntive non richieste.
  - [x] `NuovoGruppoForm.tsx` (Client Component, `useActionState` + reset del form al successo, `role="alert"` per gli errori) in cima alla pagina — stesso pattern di `NuovaPalestraForm.tsx` (Story 2.1).
  - [x] Elenco Gruppi in sola lettura (nome, categoria) — nessuna riga editabile in questa storia (vedi Task 2).
- [x] Task 4: Route guard (AC: #1, #2, #3)
  - [x] `lib/auth/route-guard.ts`: aggiungere `{ prefix: "/gruppi", ruoliAmmessi: ["ADMIN", "DIRIGENTE"] }` a `PROTECTED_ROUTES` (stesso pattern di `/palestre`, Story 2.1).
- [x] Task 5: Test (Vitest)
  - [x] `app/(gruppi-allenatori)/gruppi/actions.test.ts`: `FORBIDDEN` per Ruoli diversi da Admin/Dirigente; `VALIDATION` per nome/categoria mancanti; successo — verifica che `risolviAnnoAgonisticoCorrente` venga chiamato e il suo `id` passato a `prisma.gruppo.create` come `annoAgonisticoId` (AC #1, #2); errore `INTERNAL` fail-closed se `risolviAnnoAgonisticoCorrente` o `prisma.gruppo.create` falliscono.
  - [x] `lib/auth/route-guard.test.ts`: `/gruppi` ammette Admin e Dirigente, nega altri Ruoli (stesso pattern dei test esistenti per `/palestre`).

### Review Findings

Code review 2026-07-17 — 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor).

- [x] [Review][Patch] L'elenco Gruppi (`prisma.gruppo.findMany`) non filtra per Anno Agonistico corrente — mescola Gruppi di stagioni diverse non appena ne esiste più di una [app/(gruppi-allenatori)/gruppi/page.tsx] — corroborato da Blind Hunter ed Edge Case Hunter, risolto filtrando su `trovaAnnoAgonisticoCorrente()` (sola lettura), riverificato dal vivo con due stagioni distinte
- [x] [Review][Patch] `creaGruppo` restituisce lo stesso messaggio generico sia per `nome` mancante sia per `categoria` mancante — regressione rispetto a un fix identico già applicato in Story 2.1 (`creaCampo`) per lo stesso anti-pattern [app/(gruppi-allenatori)/gruppi/actions.ts] — corroborato da tutti e 3 i layer, risolto con due controlli distinti, riverificato dal vivo

- [x] [Review][Defer] Nessun indice sulla colonna FK `annoAgonisticoId` [prisma/migrations/20260717150000_add_gruppo/migration.sql] — deferred, stesso gap preesistente su `campi.palestraId` (Story 2.1), scala ridotta (poche decine di Gruppi)
- [x] [Review][Defer] Il messaggio di successo dopo la creazione non conferma a quale Anno Agonistico il Gruppo è stato collegato — un Dirigente che crea un Gruppo esattamente al confine 31 luglio/1 agosto potrebbe non accorgersi del cambio di stagione [app/(gruppi-allenatori)/gruppi/NuovoGruppoForm.tsx] — deferred, stessa categoria di rischio a bassa probabilità già accettata per i confini di data dell'Anno Agonistico (Story 1.6)
- [x] [Review][Defer] Nessun controllo che i valori di `FormData` siano effettivamente stringhe [app/(gruppi-allenatori)/gruppi/actions.ts] — deferred, stesso pattern preesistente in ogni Server Action del progetto, già loggato per Story 2.1

Dismessi come rumore/falsi positivi/già gestiti (9): assenza di `@@unique` su nome/categoria (decisione deliberata esplicita del Task 1); `categoria` come testo libero senza vocabolario controllato (decisione deliberata esplicita delle Dev Notes); assenza di un'azione di modifica per Gruppo (decisione deliberata esplicita della user story, "solo creare"); route `/gruppi` che non ammette Segreteria (nessun FR/AC di questa storia lo richiede, FR-6 nomina solo Dirigente/Admin); log di errore non redatti verso `console.error` (convenzione già stabilita in tutto il progetto); assenza di limiti di lunghezza su `nome`/`categoria` (coerente con ogni altro campo testo dello schema); `ON DELETE RESTRICT` senza percorso di recupero documentato (osservazione su una funzionalità futura non ancora costruita, già correttamente giustificato nel commento della migrazione); ordinamento dell'elenco per solo `nome` invece che per `categoria`+`nome` (preferenza cosmetica, nessun AC specifica l'ordinamento); `requireRuolo` chiamato fuori dal blocco try/catch (pattern identico e deliberato in ogni Server Action del progetto, `requireRuolo` già fail-closed internamente).

## Dev Notes

- **Gruppo non è protetto da RLS** (AD-9, ARCHITECTURE-SPINE.md riga 77): stesso trattamento di `Palestra`/`Campo` (Story 2.1) — Prisma diretto, connessione privilegiata. **Non creare** un client `lib/db-rls/gruppo.ts`. Nessuna migrazione RLS va scritta per `gruppi`.
- **Riuso obbligatorio di `risolviAnnoAgonisticoCorrente()`** (`lib/anno-agonistico/`, Story 1.6): AD-8 è esplicito ("un solo helper condiviso, mai calcoli di date ripetuti per modulo") — questo è il rischio più alto di questa storia (reinventare la logica di risoluzione/creazione della stagione). Leggere `app/(iscrizioni)/conferma-iscrizioni/actions.ts` (`confermaIscrizione`) come precedente diretto: stessa identica sequenza "risolvi Anno Agonistico corrente, poi crea l'entità figlia con quell'id".
- **AD-2 (confini dei moduli)**: "Gruppi-Allenatori possiede la creazione del Gruppo e l'assegnazione degli Allenatori, ma non scrive mai direttamente su Slot" — questa storia crea solo il Gruppo. L'assegnazione Allenatori (Story 2.3) e Atlete (Story 2.4) e il Caricamento Slot (Story 2.5, proprietà esclusiva di Orari-Palestre) sono fuori scope qui: non introdurre FK o tabelle di giunzione verso `Allenatore`/`Atleta`/`Slot` in questa storia.
- **Nessuna relazione con `Palestra`/`Campo` in questa storia**: `Gruppo` non ha alcun riferimento diretto a `Palestra`/`Campo` nell'ERD di ARCHITECTURE-SPINE.md — quel collegamento passa solo tramite `Slot` (Story 2.5, `GRUPPO ||--o{ SLOT`, `CAMPO ||--o{ SLOT`), non è un campo di `Gruppo` stesso.
- **Nessuna Server Action di modifica**: a differenza di Story 2.1 (esplicitamente "creare e modificare"), la user story di questa storia dice solo "creare" — l'introduzione di un'azione di modifica non richiesta sarebbe scope creep.
- **`categoria` come campo libero**: coerente con `Atleta.categoria` (Story 1.3, `String?`, testo libero dall'export federale) — qui `categoria` è invece un input diretto dell'utente in fase di creazione del Gruppo, non importato. Nessun enum o vincolo di valori ammessi è specificato da alcun AC; trattarlo come `String` obbligatoria (non opzionale, a differenza di `Atleta.categoria`) dato che l'AC #1 la elenca esplicitamente come dato necessario alla creazione.
- **Pattern di riferimento più vicino**: `app/(orari-palestre)/palestre/` (Story 2.1) per la struttura Server Action + Server Component + Client Form (entità non-RLS, Prisma diretto, `requireRuolo(["ADMIN","DIRIGENTE"])`); `app/(iscrizioni)/conferma-iscrizioni/actions.ts` per il pattern di risoluzione dell'Anno Agonistico corrente prima di un insert con FK (Story 1.6).
- **Scala**: NFR PRD §8 (~200 Atlete) — il numero di Gruppi per una polisportiva è tipicamente piccolo (poche decine al massimo), nessuna preoccupazione di paginazione per `findMany`.

### Project Structure Notes

- Nuovo route group `app/(gruppi-allenatori)/gruppi/` — coerente con la mappa di ARCHITECTURE-SPINE.md (`(gruppi-allenatori)/ # FR-6, FR-7`, riga 142; Capability Map riga 168: "Gruppi e Allenatori (FR-6, FR-7) → app/(gruppi-allenatori)/").
- Nessun nuovo modulo in `lib/` richiesto — riuso di `lib/anno-agonistico/` già esistente (Story 1.6), nessuna estensione necessaria alla sua API pubblica.
- File nuovi attesi: `prisma/migrations/<timestamp>_add_gruppo/migration.sql`, `app/(gruppi-allenatori)/gruppi/actions.ts`, `app/(gruppi-allenatori)/gruppi/actions.test.ts`, `app/(gruppi-allenatori)/gruppi/page.tsx`, `app/(gruppi-allenatori)/gruppi/NuovoGruppoForm.tsx`. File modificati: `prisma/schema.prisma` (nuovo modello `Gruppo`, relazione inversa `gruppi Gruppo[]` su `AnnoAgonistico`), `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2: Creazione Gruppi] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-6] — "Dirigente o Admin può creare un Gruppo per l'Anno Agonistico corrente".
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-8] — Anno Agonistico come partizione temporale, FK diretta da Gruppo, helper condiviso per la stagione corrente.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-9] — Gruppo non protetto da RLS, Prisma diretto con connessione privilegiata.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-2] — Gruppi-Allenatori possiede la creazione del Gruppo, non scrive mai su Slot.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#Capability → Architecture Map] — "Gruppi e Allenatori (FR-6, FR-7) | app/(gruppi-allenatori)/ | AD-2, AD-8".
- [Source: lib/anno-agonistico/risolvi-anno-agonistico-corrente.ts] — `risolviAnnoAgonisticoCorrente()`, find-or-create da riusare (Story 1.6).
- [Source: app/(iscrizioni)/conferma-iscrizioni/actions.ts] — pattern di riferimento diretto: risolvi Anno Agonistico corrente, poi crea l'entità figlia con quell'id (Story 1.6).
- [Source: app/(orari-palestre)/palestre/actions.ts] — pattern di riferimento per entità non-RLS con Prisma diretto e struttura Server Action/UI (Story 2.1).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Migrazione shadow-DB**: stesso workaround ormai consolidato (Story 1.3 in poi) — migrazione scritta a mano (`20260717150000_add_gruppo`) e applicata con `prisma migrate deploy`, verificata con `prisma migrate status` (nessun drift).
- Verifiche eseguite e passate: `npx vitest run` (196/196 test), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun errore), `npm run build` (build completata, `/gruppi` correttamente dinamica).
- **Verifica end-to-end reale eseguita** (Playwright, contro il backend Supabase locale non mockato): login Admin → creazione Gruppo (AC #1, verificato nell'elenco con nome e categoria corretti) → verifica diretta al DB che il Gruppo sia collegato all'Anno Agonistico corrente realmente risolto da `risolviAnnoAgonisticoCorrente()` (già esistente sull'istanza locale, 2025-08-01/2026-06-30) → validazione lato server per campi vuoti (AC #3, messaggio d'errore confermato). AC #2 (creazione automatica dell'Anno Agonistico quando non esiste) verificato solo via unit test, non dal vivo — un test dal vivo avrebbe richiesto svuotare `anni_agonistici`, distruttivo per l'istanza locale condivisa e i dati di altre storie (stessa decisione già presa in Story 1.8 per un caso analogo). Dati di test ripuliti dal DB al termine, Playwright disinstallato.
- Unico intoppo nello script di verifica (non applicativo): il selettore iniziale `[role="alert"]` era ambiguo perché Next.js aggiunge un proprio elemento `role="alert"` per l'annuncio di route (`__next-route-announcer__`) — corretto scopando il selettore a `form p[role="alert"]`.
- **Code review (2026-07-17)**: 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor). 0 `decision-needed`, 2 `patch`, 3 `defer`, 9 scartati come rumore/già gestiti — la maggior parte dei finding scartati erano decisioni deliberate già esplicite nelle Dev Notes (assenza di `@@unique`, `categoria` come testo libero, nessuna azione di modifica). Patch applicate: (1) l'elenco Gruppi non filtrava per Anno Agonistico corrente (`prisma.gruppo.findMany` senza `where`) — bug reale non ancora manifesto (una sola stagione esiste oggi) ma che avrebbe mescolato Gruppi di stagioni diverse al primo rollover; risolto con `trovaAnnoAgonisticoCorrente()` (sola lettura, mai `risolviAnnoAgonisticoCorrente` in una pagina GET) e un filtro `where: { annoAgonisticoId }`; riverificato dal vivo seminando una stagione passata con un Gruppo e confermando che non compare più nell'elenco. (2) `creaGruppo` restituiva lo stesso messaggio generico sia per `nome` sia per `categoria` mancante, regredendo un fix identico già applicato in Story 2.1 — risolto con due controlli distinti. Suite completa riverificata: 196/196 test, typecheck/lint/build verdi.

### Completion Notes List

- Implementati Task 1-5: modello Prisma `Gruppo` (non protetto da RLS, AD-9, stesso trattamento di `Palestra`/`Campo`), relazione inversa `gruppi Gruppo[]` su `AnnoAgonistico`, Server Action `creaGruppo` (riuso di `risolviAnnoAgonisticoCorrente()`, nessuna reimplementazione della logica di stagione), UI Server Component + Client Component per la creazione, route guard esteso a `/gruppi` (Admin/Dirigente).
- **Decisione applicata coerentemente con le Dev Notes**: nessuna Server Action di modifica introdotta (a differenza di Story 2.1) — lo user story di questa storia richiede solo la creazione, nessuno scope creep.
- **Riuso confermato**: `risolviAnnoAgonisticoCorrente()` riusato per la terza volta nel progetto (Story 1.6, 1.8, ora 2.2), coerente con AD-8 ("un solo helper condiviso").
- Nessun elemento bloccato da vincoli ambientali; nessun bug applicativo reale scoperto durante la dev-story iniziale — un bug reale (elenco non filtrato per stagione) è stato scoperto e corretto in code review, vedi sopra.
- **Post-review**: elenco Gruppi ora filtrato sull'Anno Agonistico corrente; messaggio di errore di `creaGruppo` reso accurato per nome/categoria mancanti separatamente.

### File List

**Creati:**
- `prisma/migrations/20260717150000_add_gruppo/migration.sql`
- `app/(gruppi-allenatori)/gruppi/actions.ts`
- `app/(gruppi-allenatori)/gruppi/actions.test.ts`
- `app/(gruppi-allenatori)/gruppi/page.tsx`
- `app/(gruppi-allenatori)/gruppi/NuovoGruppoForm.tsx`

**Modificati:**
- `prisma/schema.prisma` (nuovo modello `Gruppo`; relazione inversa `gruppi Gruppo[]` su `AnnoAgonistico`)
- `lib/auth/route-guard.ts` (`/gruppi` aggiunta, Admin/Dirigente)
- `lib/auth/route-guard.test.ts` (nuovi test per `/gruppi`)

## Change Log

- 2026-07-17: Implementazione completa Story 2.2 (Task 1-5). Seconda storia dell'Epic 2, prima del modulo Gruppi-Allenatori — nuovo route group `app/(gruppi-allenatori)/`. Gruppo trattato come entità non-RLS (AD-9), CRUD diretto via Prisma senza `lib/db-rls/`, stesso pattern di `Palestra`/`Campo` (Story 2.1). `risolviAnnoAgonisticoCorrente()` riusato per la terza volta nel progetto (AD-8), nessuna reimplementazione. Nessuna Server Action di modifica (scope limitato alla sola creazione, come da user story). AC #1 e #3 verificati anche dal vivo contro un backend Supabase reale; AC #2 verificato solo via unit test per non svuotare distruttivamente `anni_agonistici` sull'istanza locale condivisa. Nessun bug applicativo reale scoperto. Status → review.
- 2026-07-17: Code review. 3 layer paralleli, 0 decisioni, 2 patch applicate (elenco Gruppi filtrato per Anno Agonistico corrente — bug reale non ancora manifesto ma latente al primo rollover stagionale; messaggio d'errore accurato in `creaGruppo` per nome/categoria mancanti), 3 findings deferiti (pattern preesistenti/rischi a bassa probabilità già accettati), 9 scartati come rumore/già gestiti — la maggioranza erano decisioni deliberate già esplicite nelle Dev Notes. Entrambe le patch riverificate dal vivo (due stagioni distinte per il filtro, entrambi i campi mancanti separatamente per il messaggio). Suite completa: 196/196 test, typecheck/lint/build verdi. Status → done.
