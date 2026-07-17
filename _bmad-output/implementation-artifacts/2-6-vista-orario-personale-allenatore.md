---
baseline_commit: NO_VCS
---

# Story 2.6: Vista orario personale — Allenatore

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore,
I want vedere gli Slot dei miei Gruppi,
so that so sempre dove e quando allenarmi senza chiedere in segreteria.

## Acceptance Criteria

1. **Given** sono assegnato a uno o più Gruppi (Story 2.3) con Slot definiti (Story 2.5) per l'Anno Agonistico corrente, **when** apro la mia vista orario, **then** vedo tutti gli Slot dei miei Gruppi, ordinati per giorno della settimana (FR-3).
2. **Given** il mio account Utente non è ancora collegato a un profilo Allenatore (nessun `Allenatore.utenteId` corrispondente), **when** apro la vista, **then** vedo un messaggio chiaro invece di un errore o di una pagina vuota senza spiegazione.
3. La vista è di sola lettura: nessuna mutazione, nessuna Server Action in questa storia — coerente con AD-2 (Orari-Palestre resta l'unico proprietario della mutazione di Slot; questa storia non la tocca, solo la legge).

## Tasks / Subtasks

- [x] Task 1: Pagina `app/(orari-palestre)/mio-orario/page.tsx` (nuovo file) (AC: #1, #2, #3)
  - [x] Nuova pagina nello stesso route-group `app/(orari-palestre)/` di `palestre/` (Story 2.1) e `slot/` (Story 2.5) — stesso modulo per AD-2 (capability map: "Orari, Palestre, Campi, Slot (FR-1..FR-5) → `app/(orari-palestre)/`", FR-3 è incluso in questo intervallo).
  - [x] `export const dynamic = "force-dynamic"` — dati potenzialmente diversi ad ogni visita (nuovi Slot caricati da un Dirigente), stesso motivo di `slot/page.tsx`.
  - [x] Identificare l'utente corrente: `const supabase = await createClient()` (`lib/supabase/server`), `const { data: { user } } = await supabase.auth.getUser()`. Nessuna delle entità coinvolte in questa storia (`Utente`, `Allenatore`, `GruppoAllenatore`, `Gruppo`, `Slot`) è protetta da RLS (AD-9) — il client Supabase serve **solo** a identificare la sessione (chi è l'utente loggato), non per leggere dati RLS-protetti come in Story 2.4. Tutte le query dati restano Prisma diretto.
  - [x] Risolvere l'`Allenatore` collegato: `const utente = await prisma.utente.findUnique({ where: { supabaseAuthId: user.id } })`, poi `const allenatore = utente ? await prisma.allenatore.findUnique({ where: { utenteId: utente.id } }) : null`. Questo è il **primo** punto della codebase che risolve "il profilo di dominio dell'utente loggato" — nessun helper condiviso esiste ancora per questo, non reinventare un pattern RLS: è puro Prisma diretto su tabelle non-RLS.
  - [x] **AC #2**: se `allenatore` è `null` (Utente non ancora agganciato a un Allenatore — stesso stato descritto in `precaricamento-allenatori`/`registrati`, Story 1.1/1.4), mostrare un messaggio chiaro (es. "Il tuo account non è ancora collegato a un profilo Allenatore. Contatta la segreteria.") invece di una pagina vuota o un errore — **non** un redirect, la pagina resta raggiungibile (l'utente ha comunque il Ruolo ALLENATORE, il route-guard lo ammette).
  - [x] Se `allenatore` esiste: risolvere l'Anno Agonistico corrente in sola lettura (`trovaAnnoAgonisticoCorrente()`, mai `risolviAnnoAgonisticoCorrente()` in una pagina GET — Dev Notes Story 1.6) e interrogare gli Slot dei propri Gruppi per la stagione corrente in un'unica query: `prisma.slot.findMany({ where: { gruppo: { annoAgonisticoId: annoCorrente.id, allenatori: { some: { allenatoreId: allenatore.id } } } }, include: { campo: { include: { palestra: true } }, gruppo: true }, orderBy: [{ giorno: "asc" }, { oraInizio: "asc" }] })` — il filtro `allenatori: { some: { allenatoreId: ... } }` attraversa la relazione molti-a-molti `GruppoAllenatore` per restringere ai soli Gruppi di cui questo Allenatore fa parte, combinato con lo scoping per stagione corrente già consolidato (Story 2.2/2.3/2.4/2.5).
  - [x] Se `annoCorrente` non esiste ancora: nessuno Slot può comunque esistere per definizione (stesso ragionamento già applicato in `gruppi/page.tsx` e `slot/page.tsx`) — l'elenco resta semplicemente vuoto, nessun ramo speciale necessario.
  - [x] Rendering: tabella con colonne Giorno, Orario, Palestra/Campo, Gruppo — stesso formato di `slot/page.tsx` (Story 2.5), riusare `ETICHETTA_GIORNO` da `lib/giorno-settimana.ts` (Story 2.5, non duplicare di nuovo la mappa dei giorni). Se l'elenco Slot è vuoto (Allenatore collegato ma nessuno Slot assegnato ancora), un messaggio semplice tipo "Nessuno Slot ancora assegnato ai tuoi Gruppi." è sufficiente (nessun AC lo richiede esplicitamente, ma evita una tabella con soli header senza spiegazione).
- [x] Task 2: Route guard
  - [x] `lib/auth/route-guard.ts`: aggiungere `{ prefix: "/mio-orario", ruoliAmmessi: ["ALLENATORE"] }` — **solo** Allenatore per questa storia (FR-3 è specifico di questo Ruolo). Non includere Admin/Dirigente/altri Ruoli: non sono nell'AC, e un Admin userebbe comunque `/slot` per la vista completa (Story 2.5). Story 2.7 (Atleta) deciderà autonomamente, quando verrà creata, se estendere questa stessa pagina con un ramo per Ruolo ATLETA (allargando `ruoliAmmessi`) o costruire una pagina separata — non anticipare quella decisione qui.
- [x] Task 3: Nessun Task di test Vitest per questa storia — **decisione deliberata, non un'omissione**: la storia non introduce alcuna Server Action né alcuna logica di business estraibile in un helper `lib/` testabile (a differenza di ogni storia precedente dell'Epic 2). È una pagina di sola lettura che compone query Prisma già stabilite (stesso pattern esatto di `gruppi/page.tsx`, `slot/page.tsx`, `conferma-iscrizioni/page.tsx`), coerente con la convenzione già consolidata in tutto il progetto: nessuna pagina/Server Component ha mai avuto un file di test dedicato. Verificare comunque dal vivo tutti gli AC (Task 4).
- [x] Task 4: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] AC #1: login come un Allenatore collegato con Gruppi/Slot assegnati (o crearne uno di test), aprire `/mio-orario`, verificare che compaiano esattamente gli Slot dei propri Gruppi (e **non** quelli di Gruppi a cui non è assegnato), ordinati per giorno.
  - [x] AC #2: login come un Utente con Ruolo ALLENATORE ma **senza** un `Allenatore.utenteId` corrispondente (o rimuovere temporaneamente l'aggancio di un Allenatore di test), verificare che compaia il messaggio dedicato invece di un errore o una pagina bianca.
  - [x] Verificare che un Admin/Dirigente/Atleta non possa raggiungere `/mio-orario` (redirect a `/non-autorizzato`, route-guard).

### Review Findings

Code review 2026-07-17 — 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor).

- [x] [Review][Patch] `supabase.auth.getUser()` scartava l'`error` restituito — la codebase ha già una policy esplicita per questo caso (`requireRuolo`, `lib/auth/require-ruolo.ts`, review Story 1.3: un'interruzione del servizio deve essere distinguibile da "nessuna sessione" nei log) [app/(orari-palestre)/mio-orario/page.tsx] — Blind Hunter, risolto catturando e loggando `error`, riverificato dal vivo
- [x] [Review][Patch] `lib/auth/route-guard.test.ts` non copriva le nuove rotte `/slot` (Story 2.5) e `/mio-orario` (questa storia) — ogni aggiunta precedente a `PROTECTED_ROUTES` aveva un test dedicato [lib/auth/route-guard.test.ts] — Blind Hunter, risolto aggiungendo 4 nuovi test (allow/deny per entrambe le rotte), suite verde
- [x] [Review][Patch] Due round-trip Prisma sequenziali (`Utente` poi `Allenatore`) collassabili in un'unica query — rilevante perché questo è il primo pattern "profilo di dominio dell'utente loggato" della codebase e sarebbe stato copiato tal quale dalla Story 2.7 [app/(orari-palestre)/mio-orario/page.tsx] — Blind Hunter, risolto con `prisma.allenatore.findFirst({ where: { utente: { supabaseAuthId: user.id } } } })`, riverificato dal vivo (nessuna regressione su AC #1/#2); in fase di refactor anche l'`<h1>` duplicato tra i due return è stato accorpato in un unico rendering

- [x] [Review][Defer] Nessun `try/catch` attorno alle chiamate Supabase/Prisma — gap preesistente e trasversale a tutta l'app, già loggato in Story 1.2 [app/(orari-palestre)/mio-orario/page.tsx] — deferred
- [x] [Review][Defer] `user` nullo o senza riga `Utente` corrispondente mostra lo stesso messaggio pensato per AC #2 — stato dati patologico a bassa probabilità, nessun crash [app/(orari-palestre)/mio-orario/page.tsx] — deferred
- [x] [Review][Defer] Nessuna stagione corrente configurata mostra lo stesso messaggio di un elenco vuoto — stessa categoria di imprecisione di stato-vuoto già accettata in Story 2.1/2.5 [app/(orari-palestre)/mio-orario/page.tsx] — deferred
- [x] [Review][Defer] `Utente.attivo` verificato solo al login, non ad ogni richiesta — decisione già esplicita altrove nella codebase (AD-11) [app/(orari-palestre)/mio-orario/page.tsx] — deferred
- [x] [Review][Defer] Query senza `select` esplicito, colonne non usate recuperate — nessun rischio di esposizione (Server Component, mai passato come prop a un Client Component), solo inefficienza trascurabile alla scala del progetto [app/(orari-palestre)/mio-orario/page.tsx] — deferred
- [x] [Review][Defer] Markup/query Slot duplicati tra `mio-orario/page.tsx` e `slot/page.tsx` — solo la seconda occorrenza, prematuro astrarre ora [app/(orari-palestre)/mio-orario/page.tsx, app/(orari-palestre)/slot/page.tsx] — deferred
- [x] [Review][Defer] Messaggio di stato vuoto non distingue le cause (nessuna assegnazione / stagione passata / nessuno Slot ancora caricato) — miglioramento UX, nessun AC lo richiede [app/(orari-palestre)/mio-orario/page.tsx] — deferred
- [x] [Review][Defer] `trovaAnnoAgonisticoCorrente()` non eseguita in parallelo con la catena identità→Allenatore — micro-ottimizzazione, nessun impatto misurabile [app/(orari-palestre)/mio-orario/page.tsx] — deferred
- [x] [Review][Defer] `oraInizio`/`oraFine` renderizzati senza validazione in lettura — il percorso di scrittura già valida il formato, nessuno scenario reale produce un valore malformato [app/(orari-palestre)/mio-orario/page.tsx] — deferred

Dismesso come artefatto della review (1): "`/slot` privo di protezione fino a questo diff, corretta come rider non documentato" — falso: `/slot` era già stato aggiunto a `PROTECTED_ROUTES` e revisionato nella Story 2.5; l'artefatto deriva dal diff costruito per questa review, che per errore copriva anche i commit della Story 2.5 (nessun confine di commit puntuale disponibile). Nessuna azione necessaria.

## Dev Notes

- **Questa è la prima pagina della codebase che risolve "il profilo di dominio collegato all'utente loggato"** (Utente → Allenatore, via `utenteId`). Nessun helper condiviso esiste ancora per questo pattern — non reinventare un meccanismo RLS: `Utente`/`Allenatore` sono entrambe non protette da RLS (AD-9), il client Supabase autenticato serve solo a leggere `user.id` (identità di sessione), esattamente come già fa `conferma-iscrizioni/page.tsx` (Story 1.6) per leggere `user.app_metadata.ruoli` — non per bypassare RLS.
- **AC #2 non è un caso limite ipotetico**: uno Utente può registrarsi con Ruolo ALLENATORE senza fornire (o senza che corrisponda) il Codice Fiscale di un Allenatore precaricato (`registrati/actions.ts`, Story 1.1/1.4) — `Allenatore.utenteId` resta `null` finché non c'è un aggancio. Questa storia è la prima a dover *leggere* quello stato per un utente reale che interagisce con l'app (le storie precedenti lo scrivevano/gestivano solo lato Admin/Dirigente) — va gestito esplicitamente, non ignorato.
- **Nessun nuovo helper in `lib/anno-agonistico/` necessario**: `trovaAnnoAgonisticoCorrente()` esiste già ed è sufficiente; il filtro "Slot dei miei Gruppi" si esprime con un'unica query Prisma tramite relation filter (`gruppo.allenatori.some(...)`), non serve un helper dedicato "risoluzione transitiva Slot" separato per questa storia (quel concetto, citato nei commenti di AD-8, è già soddisfatto dal filtro `where: { gruppo: { annoAgonisticoId: ... } }` già usato in Story 2.5 — qui si aggiunge solo un ulteriore filtro per Allenatore sulla stessa query).
- **Pattern di riferimento più vicino**: `app/(orari-palestre)/slot/page.tsx` (Story 2.5) per la query Slot scopata per stagione e per il rendering tabellare (`ETICHETTA_GIORNO` da `lib/giorno-settimana.ts`, da riusare senza duplicare); `app/(iscrizioni)/conferma-iscrizioni/page.tsx` (Story 1.6) per il pattern di lettura di `user.id`/`app_metadata` tramite client Supabase autenticato in una pagina altrimenti Prisma-diretto.
- **Nessuna Server Action, nessun file di test Vitest in questa storia** — decisione esplicita, vedi Task 3. Non è un'eccezione al processo TDD della storia: semplicemente non c'è business logic da isolare, solo composizione di query già validate nelle storie precedenti.
- **Scala**: NFR PRD §8, un Allenatore ha tipicamente 1-2 Gruppi con poche decine di Slot al massimo — nessuna paginazione necessaria.

### Project Structure Notes

- Nuova pagina nel route-group esistente: `app/(orari-palestre)/mio-orario/page.tsx` (nessun nuovo route-group, stesso modulo di `palestre/` e `slot/`).
- File nuovi attesi: `app/(orari-palestre)/mio-orario/page.tsx`. File modificati: `lib/auth/route-guard.ts` (nuova rotta `/mio-orario`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.6: Vista orario personale — Allenatore] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-3] — "L'Allenatore vede gli Slot dei propri Gruppi. Realizza UJ-2."
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#UJ-2] — "Marco, allenatore di due gruppi, apre l'app la domenica sera, vede l'orario della settimana per entrambi i gruppi..."
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-2] — capability map: FR-1..FR-5 (Orari, Palestre, Campi, Slot) vivono in `app/(orari-palestre)/`.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-9] — `Utente`, `Allenatore`, `Gruppo`, `GruppoAllenatore`, `Slot` non protette da RLS, gestibili via Prisma diretto.
- [Source: app/(orari-palestre)/slot/page.tsx, lib/giorno-settimana.ts] — pattern di riferimento per la query Slot scopata per stagione e per le etichette dei giorni (Story 2.5).
- [Source: app/(iscrizioni)/conferma-iscrizioni/page.tsx] — pattern di riferimento per la lettura dell'identità dell'utente loggato tramite client Supabase autenticato (Story 1.6).
- [Source: app/(onboarding-import)/registrati/actions.ts] — pattern di aggancio `Allenatore.utenteId` in fase di registrazione (Story 1.1/1.4), origine dello stato "non ancora collegato" gestito da AC #2.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `npx tsc --noEmit`: pulito.
- `npx vitest run`: 227 test, tutti superati (nessun test nuovo, decisione deliberata — vedi Task 3, nessuna regressione).
- `npm run lint`: pulito.
- `npm run build`: build di produzione riuscita, `/mio-orario` confermata come route dinamica (`ƒ`).
- Verifica live (Playwright temporaneo + Prisma/Supabase diretti per il setup, poi rimossi): come Admin, precaricato un Allenatore di test, creata Palestra→Campo, Gruppo, assegnato l'Allenatore al Gruppo, creato uno Slot. Registrato un utente con Ruolo ALLENATORE e Codice Fiscale corrispondente (aggancio automatico) → login → `/mio-orario` mostra correttamente lo Slot del proprio Gruppo (AC #1). Registrato un secondo utente con Ruolo ALLENATORE senza Codice Fiscale (nessun aggancio) → login → `/mio-orario` mostra il messaggio dedicato invece di un errore (AC #2). Registrato un utente con Ruolo SEGRETERIA → tentativo di accesso a `/mio-orario` → redirect a `/non-autorizzato` (route-guard). Tutti i test superati al primo tentativo. Dati di test rimossi al termine (inclusi gli utenti Supabase Auth).

### Completion Notes List

- Implementato esattamente come da Dev Notes: prima pagina della codebase a risolvere "il profilo di dominio dell'utente loggato" (Utente → Allenatore via `utenteId`), usando il client Supabase autenticato solo per l'identità di sessione (`user.id`), non per bypassare RLS — tutte le query dati restano Prisma diretto su tabelle non-RLS.
- AC #2 gestito esplicitamente: un Allenatore non ancora agganciato vede un messaggio chiaro, non un errore o una pagina vuota.
- Nessuna Server Action, nessun file di test Vitest — decisione deliberata e documentata (Task 3): pagina di sola lettura che compone query Prisma già stabilite nelle storie precedenti, coerente con la convenzione dell'intero progetto (nessuna pagina/Server Component ha mai avuto test dedicati).
- `route-guard.ts` esteso con `/mio-orario` ristretto al solo Ruolo ALLENATORE (FR-3) — non anticipata la decisione di Story 2.7 (Atleta) su se estendere questa stessa pagina o crearne una separata.

### File List

- `app/(orari-palestre)/mio-orario/page.tsx` (nuovo, poi modificato in code review)
- `lib/auth/route-guard.ts` (modificato: aggiunta rotta `/mio-orario`)
- `lib/auth/route-guard.test.ts` (modificato in code review: aggiunti test per `/slot` e `/mio-orario`)

## Change Log

- 2026-07-17: Implementazione completa Story 2.6 (Task 1-4). Sesta storia dell'Epic 2 — nuova pagina `app/(orari-palestre)/mio-orario/` nello stesso modulo di `palestre/`/`slot/` (AD-2, capability map FR-1..FR-5). Prima pagina della codebase a risolvere il profilo di dominio dell'utente loggato (Utente → Allenatore via `utenteId`), usando il client Supabase autenticato solo per l'identità di sessione, non per RLS. Nessuna Server Action né file di test — decisione deliberata, coerente con la convenzione del progetto (nessuna pagina ha mai avuto test dedicati). Query Slot scopata sia per Anno Agonistico corrente sia per i Gruppi dell'Allenatore tramite un relation filter sulla giunzione `GruppoAllenatore`. AC #2 (Allenatore non ancora agganciato) gestito esplicitamente con un messaggio dedicato. Tutti gli AC verificati dal vivo contro un backend Supabase reale, incluso il rifiuto di accesso per un Ruolo non ammesso. Nessun bug applicativo reale scoperto durante lo sviluppo. Status → review.
- 2026-07-17: Code review. 3 layer paralleli, 0 decisioni, 3 patch applicate (cattura/log dell'`error` di `getUser()`, prima scartato — stessa policy già stabilita in `requireRuolo`; aggiunti i test mancanti in `route-guard.test.ts` per `/slot` e `/mio-orario`; collassate due query sequenziali Utente→Allenatore in una sola, accorpando anche l'`<h1>` duplicato tra i due rami di rendering), 9 finding deferiti (gap trasversali preesistenti, imprecisioni di messaggistica per stati-limite a bassa probabilità, micro-ottimizzazioni, duplicazione a sola-seconda-occorrenza), 1 scartato come artefatto della review (falso positivo su `/slot` dovuto a un diff che copriva anche i commit della Story 2.5). Tutte le patch riverificate dal vivo, nessuna regressione. Suite completa: 231/231 test, typecheck/lint/build verdi. Status → done.
