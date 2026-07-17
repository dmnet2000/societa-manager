---
baseline_commit: NO_VCS
---

# Story 2.1: Anagrafica Palestre e Campi

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente,
I want creare e modificare una Palestra con i suoi Campi,
so that posso rappresentare gli impianti reali usati dalla polisportiva.

## Acceptance Criteria

1. **Given** conosco il nome (e opzionalmente l'indirizzo) di una Palestra, **when** la creo nel sistema, **then** viene salvata con un id univoco e compare nell'elenco delle Palestre.
2. **Given** una Palestra esiste, **when** le aggiungo uno o più Campi (nome), **then** ogni Campo è collegato a quella Palestra e compare nel suo elenco Campi.
3. **Given** una Palestra o un Campo esistono, **when** ne modifico i dati (nome Palestra, indirizzo Palestra, nome Campo), **then** le modifiche sono persistite e visibili immediatamente nell'elenco.
4. **Given** una Palestra ha più Campi, **then** il modello dati non introduce alcun vincolo che impedisca a due Gruppi di essere assegnati allo stesso orario sulla stessa Palestra, purché su Campi diversi — nessuna verifica di conflitto va implementata qui (i conflitti sugli Slot sono fuori scope per questa storia, saranno eventualmente affrontati in Story 2.5 Caricamento Slot).

## Tasks / Subtasks

- [x] Task 1: Modelli Prisma `Palestra` e `Campo` (AC: #1, #2, #4)
  - [x] `prisma/schema.prisma`: nuovo modello `Palestra` (`id`, `nome`, `indirizzo String?`, `createdAt`, relazione `campi Campo[]`, `@@map("palestre")`) e nuovo modello `Campo` (`id`, `nome`, `palestraId`, relazione `palestra Palestra @relation(...)`, `createdAt`, `@@map("campi")`). **Non protetti da RLS** (AD-9 elenca esplicitamente Palestra/Campo insieme a Slot/Gruppo/Allenatore come gestiti via Prisma diretto, connessione privilegiata) — nessun client `lib/db-rls/`, nessuna policy RLS, stesso trattamento di `Allenatore`/`AnnoAgonistico` (Story 1.4/1.6), non di `Atleta`/`Iscrizione`.
  - [x] `onDelete: Cascade` su `Campo.palestraId` (eliminare una Palestra elimina i suoi Campi) — nessun AC richiede l'eliminazione in questa storia, ma la FK va comunque dichiarata con una policy esplicita coerente col resto dello schema.
  - [x] Nessun `@@unique` su `nome` (né per Palestra né per Campo): nessun AC lo richiede, evitare di inventare un vincolo non specificato (stessa lezione delle storie precedenti: non aggiungere restrizioni non richieste).
  - [x] Migrazione scritta a mano (workaround shadow-DB consolidato dalla Story 1.3 in poi): `CREATE TABLE "palestre" (...)`, `CREATE TABLE "campi" (...)` con FK verso `palestre`. Applicare con `prisma migrate deploy`, verificare con `prisma migrate status` (nessun drift).
- [x] Task 2: Server Actions in `app/(orari-palestre)/palestre/actions.ts` (AC: #1, #2, #3)
  - [x] File nuovo (il route group `(orari-palestre)` non esiste ancora — prima storia di questo modulo, per FR-1..FR-5 secondo ARCHITECTURE-SPINE.md). `requireRuolo(["ADMIN", "DIRIGENTE"])` come primo passo in ogni Server Action (FR-1: "Admin o Dirigente"), stesso pattern di `import-atlete`/`precaricamento-allenatori` (Story 1.3/1.4).
  - [x] `creaPalestra(_prevState, formData)`: valida `nome` non vuoto (VALIDATION altrimenti), `indirizzo` opzionale, `prisma.palestra.create(...)`. Prisma diretto (non `lib/db-rls/`) — stesso pattern di `precaricaAllenatore` (Story 1.4), non quello di `creaAtleta`/`inserisciIscrizione`.
  - [x] `aggiornaPalestra(_prevState, formData)`: id, nome, indirizzo — `prisma.palestra.update(...)`. Nessun controllo "riga effettivamente modificata" necessario qui (a differenza di `aggiornaAtleta`/`disattivaIscrizione`): quei controlli servivano a rilevare un rifiuto RLS silenzioso di PostgREST, qui si passa da Prisma diretto e un id inesistente genera già un errore Prisma esplicito (`P2025`), catturato dal blocco try/catch generico.
  - [x] `creaCampo(_prevState, formData)`: `palestraId`, `nome` — valida che `palestraId` sia presente, `prisma.campo.create(...)`. Un `palestraId` inesistente genera un errore Prisma di violazione FK, catturato dal blocco try/catch generico (nessuna validazione preventiva separata necessaria).
  - [x] `aggiornaCampo(_prevState, formData)`: id, nome — `prisma.campo.update(...)`.
  - [x] `revalidatePath("/palestre")` dopo ogni mutazione riuscita, stesso pattern di ogni altra Server Action del progetto.
- [x] Task 3: UI in `app/(orari-palestre)/palestre/page.tsx` (AC: #1, #2, #3)
  - [x] Server Component con `export const dynamic = "force-dynamic"` — stesso motivo di `/admin` (Story 1.2): mutazioni tramite Server Action sulla stessa pagina, dati sempre freschi al render (deviazione consapevole dalla nota originale della story, che ipotizzava di poterne fare a meno: il precedente più vicino, `/admin`, lo usa per lo stesso identico scenario).
  - [x] Elenca tutte le Palestre con `prisma.palestra.findMany({ include: { campi: { orderBy: { nome: "asc" } } }, orderBy: { nome: "asc" } })` — Prisma diretto (sola lettura), nessun `lib/db-rls/` creato per questa storia (non protetta da RLS).
  - [x] `NuovaPalestraForm.tsx` (Client Component, `useActionState` + reset del form al successo) in cima alla pagina.
  - [x] `PalestraRow.tsx`: form inline di modifica (nome, indirizzo) via `aggiornaPalestra`; `CampoRow.tsx` per ogni Campo esistente (form inline di modifica nome via `aggiornaCampo`); `NuovoCampoForm.tsx` per aggiungere un Campo (palestraId nascosto) — stesso pattern Client Component con `useActionState` e gestione d'errore (`role="alert"`) già consolidato in `UtenteRow.tsx`/`NuovoUtenteForm.tsx` (Story 1.2).
- [x] Task 4: Route guard (AC: #1, #2, #3)
  - [x] `lib/auth/route-guard.ts`: aggiungere `{ prefix: "/palestre", ruoliAmmessi: ["ADMIN", "DIRIGENTE"] }` a `PROTECTED_ROUTES` (stesso pattern di `/import-atlete`, `/precaricamento-allenatori`).
- [x] Task 5: Test (Vitest)
  - [x] `app/(orari-palestre)/palestre/actions.test.ts`: per ciascuna delle 4 Server Action — `FORBIDDEN` per Ruoli diversi da Admin/Dirigente; successo con `prisma.palestra`/`prisma.campo` mockato; `VALIDATION` per campi obbligatori mancanti (nome vuoto); errore `INTERNAL` fail-closed su eccezione Prisma (es. id inesistente, FK violata).
  - [x] `lib/auth/route-guard.test.ts`: `/palestre` ammette Admin e Dirigente, nega altri Ruoli (stesso pattern dei test esistenti per `/import-atlete`).

### Review Findings

Code review 2026-07-17 — 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor).

- [x] [Review][Patch] `creaCampo` restituisce sempre "Il nome del Campo è obbligatorio." anche quando il campo mancante è `palestraId`, non `nome` [app/(orari-palestre)/palestre/actions.ts] — corroborato da tutti e 3 i layer, risolto con due controlli distinti ("Palestra non specificata." / "Il nome del Campo è obbligatorio.")

- [x] [Review][Defer] Nessun controllo che i valori di `FormData` siano stringhe (un campo `File` verrebbe stringificato e persistito) [app/(orari-palestre)/palestre/actions.ts] — deferred, pattern identico in ogni Server Action del progetto (`String(formData.get(...) ?? "")`), non introdotto da questa storia
- [x] [Review][Defer] Nessuna gestione di scritture concorrenti (ultima modifica vince silenziosamente) su `aggiornaPalestra`/`aggiornaCampo` [app/(orari-palestre)/palestre/actions.ts] — deferred, stessa categoria di rischio a bassa probabilità già accettata in Story 1.3/1.4 (pochi Admin/Dirigente attivi contemporaneamente)
- [x] [Review][Defer] L'elenco Ruoli `["ADMIN", "DIRIGENTE"]` è duplicato letteralmente 5 volte (4 Server Action + route-guard) senza una costante condivisa [app/(orari-palestre)/palestre/actions.ts, lib/auth/route-guard.ts] — deferred, stesso pattern in ogni Server Action del progetto fin da Story 1.3, opportunità di refactor trasversale non specifica di questa storia
- [x] [Review][Defer] Nessun messaggio di stato vuoto quando non esistono ancora Palestre o quando una Palestra non ha ancora Campi [app/(orari-palestre)/palestre/page.tsx, PalestraRow.tsx] — deferred, stesso livello di rifinitura UI già accettato per ogni altra pagina-elenco del progetto (vedi deferred-work.md, Story 1.6)

Dismessi come rumore/falsi positivi/già gestiti (7): messaggio "Riprova" generico su un errore di violazione FK in `creaCampo` (coerente con la convenzione di errore generico `INTERNAL` già stabilita in tutto il progetto, non specifico di questa storia); cascade delete su `Campo.palestraId` senza una UI di eliminazione (stessa convenzione `onDelete: Cascade` già usata per ogni FK dello schema, nessuna funzionalità di eliminazione esiste oggi in nessun modulo); assenza di `@@unique` su `nome` (decisione deliberata ed esplicita del Task 1 della storia, non una lacuna); assenza di validazione del formato di `id` prima dell'update (decisione deliberata ed esplicita del Task 2/Dev Notes — un id inesistente genera già un errore Prisma esplicito P2025, catturato dal blocco try/catch generico); assenza di limiti di lunghezza su `nome`/`indirizzo` (coerente con ogni altro campo testo dello schema, nessun `maxLength` esiste in nessun modello); protezione di rotta limitata al solo prefisso `/palestre` (osservazione su un'ipotetica rotta futura di Story 2.5, non una lacuna di questa storia); assenza di un messaggio di successo dopo `aggiornaPalestra`/`aggiornaCampo` (verificato dall'Acceptance Auditor: coincide esattamente con il pattern già stabilito in `admin/actions.ts`/`UtenteRow.tsx`, citato esplicitamente nelle Dev Notes come riferimento da riusare).

## Dev Notes

- **Palestra/Campo non sono protette da RLS** (AD-9, ARCHITECTURE-SPINE.md riga 77): a differenza di `Atleta`/`Iscrizione`/`CertificatoMedico` (Story 1.3/1.6/1.7), l'accesso a runtime passa da Prisma diretto con connessione privilegiata, esattamente come `Allenatore` (Story 1.4) e `AnnoAgonistico` (Story 1.6). **Non creare** un client `lib/db-rls/palestra.ts` — sarebbe un pattern sbagliato per queste tabelle. Nessuna migrazione RLS (`ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, `GRANT`) va scritta per `palestre`/`campi`.
- **Route group nuovo**: `app/(orari-palestre)/` non esiste ancora nel repository — questa è la prima storia di FR-1..FR-5 (Orari e Palestre). Verificare che Next.js gestisca correttamente un nuovo route group senza `layout.tsx` dedicato (i route group esistenti come `(onboarding-import)`, `(iscrizioni)`, `(amministrazione)` non ne hanno uno proprio — condividono il layout radice).
- **Naming Server Action**: verbo esplicito senza suffisso (`creaPalestra`, non `creaPalestraAction`) — convenzione stabilita in Story 1.6 code review e da allora sempre rispettata.
- **Nessuna dipendenza da Anno Agonistico**: a differenza di `Gruppo`/`Iscrizione` (AD-8), `Palestra`/`Campo` non hanno alcun riferimento all'Anno Agonistico nell'ERD di ARCHITECTURE-SPINE.md — sono strutturali e permanenti, non legate a una stagione. Non introdurre un FK verso `AnnoAgonistico` per questa storia.
- **AD-2 (confini dei moduli)**: Orari-Palestre sarà l'unico proprietario della mutazione di `Slot` in Story 2.5, ma quel vincolo non si applica qui — questa storia riguarda solo `Palestra`/`Campo`, non ancora `Slot` (Story 2.5) né `Gruppo` (Story 2.2, modulo Gruppi-Allenatori separato).
- **AC #4 è un vincolo di non-regressione sul modello dati, non un comportamento da implementare**: non aggiungere alcun indice/vincolo univoco che leghi implicitamente un Campo a un unico orario o Gruppo — quella logica (se mai necessaria) appartiene a `Slot` (Story 2.5), fuori scope qui.
- **Pattern di riferimento più vicino**: `app/(onboarding-import)/precaricamento-allenatori/` (Story 1.4) — stessa categoria di entità (non-RLS, Prisma diretto, CRUD semplice, `requireRuolo(["ADMIN","DIRIGENTE"])`). Leggere quel file prima di implementare per riusare esattamente lo stesso stile di validazione/errore, adattandolo a due entità correlate (Palestra → Campo) invece di una sola.
- **Scala**: NFR PRD §8, ~200 Atlete per il v1 — il numero di Palestre/Campi è tipicamente molto piccolo (una manciata di impianti), nessuna preoccupazione di paginazione o performance per `findMany`.

### Project Structure Notes

- Nuovo route group `app/(orari-palestre)/palestre/` — coerente con la mappa di ARCHITECTURE-SPINE.md (`(orari-palestre)/ # FR-1..FR-5`, riga 141 e Capability Map riga 167: "Orari, Palestre, Campi, Slot (FR-1..FR-5) → app/(orari-palestre)/").
- Nessun nuovo modulo in `lib/` richiesto per questa storia (a differenza di `lib/anno-agonistico/`, `lib/matching-codice-fiscale/`) — CRUD diretto via Prisma dentro `actions.ts`, stesso approccio di `precaricamento-allenatori`.
- File nuovi attesi: `prisma/migrations/<timestamp>_add_palestra_campo/migration.sql`, `app/(orari-palestre)/palestre/actions.ts`, `app/(orari-palestre)/palestre/actions.test.ts`, `app/(orari-palestre)/palestre/page.tsx`, più eventuali Client Component per le righe (es. `PalestraRow.tsx`, `CampoRow.tsx`, nomi da confermare in fase di sviluppo). File modificati: `prisma/schema.prisma`, `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1: Anagrafica Palestre e Campi] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-1] — "Admin o Dirigente può creare/modificare una Palestra e i suoi Campi", conseguenze su Campi multipli e Gruppi contemporanei.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#3. Glossario] — definizioni di Palestra, Campo, Slot.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-9] — split di accesso ai dati: Palestra/Campo non protette da RLS, Prisma diretto con connessione privilegiata.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#Capability → Architecture Map] — "Orari, Palestre, Campi, Slot (FR-1..FR-5) | app/(orari-palestre)/ | AD-2, AD-8".
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#Structural Seed] — ERD (`PALESTRA ||--o{ CAMPO`) e struttura cartelle attesa.
- [Source: app/(onboarding-import)/precaricamento-allenatori/actions.ts] — pattern di riferimento per entità non-RLS con Prisma diretto (Story 1.4).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Migrazione shadow-DB**: stesso workaround ormai consolidato (Story 1.3 in poi) — migrazione scritta a mano (`20260717140000_add_palestra_campo`) e applicata con `prisma migrate deploy`, verificata con `prisma migrate status` (nessun drift).
- **`force-dynamic` aggiunto fin da subito** (deviazione consapevole dalla nota originale della story, che ipotizzava di poterne fare a meno): il precedente più vicino, `/admin` (Story 1.2), lo usa per lo stesso identico scenario (mutazioni Server Action sulla stessa pagina) — applicato per coerenza invece di scoprirne la necessità in un secondo momento.
- Verifiche eseguite e passate: `npx vitest run` (188/188 test), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun errore), `npm run build` (build completata, `/palestre` correttamente dinamica).
- **Verifica end-to-end reale eseguita** (Playwright, contro il backend Supabase locale non mockato): login Admin → creazione Palestra (AC #1, verificata nell'elenco) → aggiunta Campo (AC #2, verificata collegata alla Palestra) → modifica nome/indirizzo Palestra e nome Campo (AC #3, entrambe verificate persistite e riflesse immediatamente in UI via `revalidatePath`, nessun reload di pagina necessario data l'assenza di `redirect()` nelle azioni) → stato finale confermato anche via query diretta al DB. Testato anche il diniego del route guard per un Ruolo non autorizzato (Atleta) → redirect a `/non-autorizzato` confermato. Dati di test ripuliti dal DB al termine, Playwright disinstallato.
- Prima nota di debug degna di rilievo durante la verifica dal vivo: il selettore iniziale dello script Playwright cercava il testo della Palestra dentro l'elemento `<article>` (`hasText`), che non intercetta il valore di un `<input>` (non è testo visibile ai fini del DOM text-matching) — errore del solo script di verifica, non un problema applicativo; corretto selezionando direttamente `input[value="..."]`.
- **Code review (2026-07-17)**: 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor). 0 `decision-needed`, 1 `patch`, 4 `defer`, 7 scartati come rumore/già gestiti — la maggior parte dei finding scartati erano decisioni deliberate già esplicite nella story (assenza di `@@unique`, nessun controllo di formato su `id` prima dell'update, nessun messaggio di successo su `aggiornaPalestra`/`aggiornaCampo`, quest'ultimo confermato dall'Acceptance Auditor come identico al pattern già stabilito in `admin/actions.ts`/`UtenteRow.tsx`). Unica patch applicata: `creaCampo` restituiva lo stesso messaggio ("Il nome del Campo è obbligatorio.") sia per un nome vuoto sia per un `palestraId` mancante — corroborato da tutti e 3 i layer, risolto con due controlli distinti. Suite completa riverificata: 188/188 test, typecheck/lint verdi.

### Completion Notes List

- Implementati Task 1-5: modelli Prisma `Palestra`/`Campo` (non protetti da RLS, AD-9, stesso trattamento di `Allenatore`/`AnnoAgonistico`), Server Actions CRUD (`creaPalestra`, `aggiornaPalestra`, `creaCampo`, `aggiornaCampo`) in un nuovo route group `app/(orari-palestre)/`, UI Server Component + Client Component per la creazione/modifica inline di Palestre e Campi, route guard esteso a `/palestre` (Admin/Dirigente).
- **Decisione applicata coerentemente con le Dev Notes**: nessun `lib/db-rls/` creato per Palestra/Campo (non protette da RLS) — CRUD diretto via Prisma dentro `actions.ts`, stesso approccio di `precaricamento-allenatori` (Story 1.4).
- **Scope rispettato**: nessuna logica di conflitto Slot/Gruppo introdotta (AC #4 verificato come vincolo di non-regressione sul modello dati, non un comportamento da implementare) — nessun indice/vincolo univoco aggiunto oltre a quanto esplicitamente richiesto.
- Nessun elemento bloccato da vincoli ambientali; nessun bug applicativo reale scoperto durante la verifica dal vivo (unico problema riscontrato era nello script di verifica stesso, non nel codice — vedi Debug Log).
- **Post-review**: messaggio di errore di `creaCampo` reso accurato quando manca `palestraId` invece del nome (vedi Debug Log).

### File List

**Creati:**
- `prisma/migrations/20260717140000_add_palestra_campo/migration.sql`
- `app/(orari-palestre)/palestre/actions.ts`
- `app/(orari-palestre)/palestre/actions.test.ts`
- `app/(orari-palestre)/palestre/page.tsx`
- `app/(orari-palestre)/palestre/NuovaPalestraForm.tsx`
- `app/(orari-palestre)/palestre/NuovoCampoForm.tsx`
- `app/(orari-palestre)/palestre/PalestraRow.tsx`
- `app/(orari-palestre)/palestre/CampoRow.tsx`

**Modificati:**
- `prisma/schema.prisma` (nuovi modelli `Palestra`, `Campo`)
- `lib/auth/route-guard.ts` (`/palestre` allargata ad Admin/Dirigente)
- `lib/auth/route-guard.test.ts` (nuovi test per `/palestre`)

## Change Log

- 2026-07-17: Implementazione completa Story 2.1 (Task 1-5). Prima storia dell'Epic 2 e del modulo Orari-Palestre — nuovo route group `app/(orari-palestre)/`. Palestra/Campo trattate come entità non-RLS (AD-9), CRUD diretto via Prisma senza `lib/db-rls/`, stesso pattern consolidato di `Allenatore`/`precaricamento-allenatori` (Story 1.4). Tutti gli AC (#1-#3) verificati anche dal vivo contro un backend Supabase reale (Playwright + query dirette DB); AC #4 verificato per costruzione (nessun vincolo introdotto nel modello dati che impedirebbe due Gruppi sullo stesso orario su Campi diversi). Testato anche il diniego del route guard per un Ruolo non autorizzato. Nessun bug applicativo reale scoperto in fase di verifica. Status → review.
- 2026-07-17: Code review. 3 layer paralleli, 0 decisioni, 1 patch applicata (messaggio d'errore accurato in `creaCampo` quando manca `palestraId`), 4 findings deferiti (pattern preesistenti nel progetto, non regressioni di questa storia), 7 scartati come rumore/già gestiti — la maggioranza erano decisioni deliberate già esplicite nelle Dev Notes della storia stessa. Suite completa: 188/188 test, typecheck/lint verdi. Status → done.
