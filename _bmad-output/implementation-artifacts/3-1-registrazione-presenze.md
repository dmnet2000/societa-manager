---
baseline_commit: NO_VCS
---

# Story 3.1: Registrazione presenze

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore,
I want registrare presenza/assenza di ogni Atleta del mio Gruppo per uno Slot svolto,
so that ho traccia di chi ha partecipato a ogni allenamento.

## Acceptance Criteria

1. **Given** il mio Gruppo ha Atlete assegnate (Story 2.4) e uno Slot svolto (Story 2.5), **when** segno presenza/assenza per ogni Atleta di quello Slot, **then** la Presenza è salvata, collegata ad Atleta e Slot.
2. Posso registrare anche per Slot passati (es. dimenticati), non solo in tempo reale — nessuna restrizione sulla data scelta oltre a corrispondere al giorno della settimana del proprio Slot.
3. Riassegnare le stesse presenze per lo stesso Slot+data è idempotente: nessun duplicato, i valori vengono aggiornati (correggere un errore di battitura non crea una seconda riga).
4. Posso registrare presenze **solo** per i Gruppi di cui sono Allenatore — un tentativo di registrare per uno Slot di un Gruppo altrui viene rifiutato.

## Prerequisiti architetturali di questa storia (da leggere prima di iniziare)

Questa è la prima storia dell'Epic 3 e introduce **tre pattern nuovi** nella codebase, nessuno dei quali riusabile da una storia precedente. Vanno costruiti con cura, non improvvisati durante l'implementazione.

### 1. Prima policy RLS con scoping relazionale (non solo per Ruolo)

Tutte le policy RLS esistenti (`atlete`, `iscrizioni`, `certificati_medici`) verificano solo `auth.jwt() -> 'app_metadata' -> 'ruoli'` — un Ruolo ammesso vede/scrive **tutte** le righe, senza restrizione per relazione. `Presenza` è diversa: un Allenatore deve poter scrivere **solo** per i propri Gruppi (AC #4), non per Gruppi altrui — Admin/Dirigente/Segreteria restano con accesso ampio (stesso trattamento già dato ad `Atleta`/`Iscrizione`/`CertificatoMedico`, AD-4). Serve quindi una **seconda** policy per operazione, che attraversa `Presenza → Slot → Gruppo → GruppoAllenatore → Allenatore → Utente → auth.uid()` con una subquery `EXISTS`. Le policy multiple e permissive sullo stesso comando si combinano in OR automaticamente in Postgres — non serve un'unica espressione booleana gigante, due policy separate e leggibili sono la scelta corretta.

### 2. `data` come `String` ("YYYY-MM-DD"), non `DateTime`

Stessa decisione già presa per `oraInizio`/`oraFine` di `Slot` (Story 2.5): un `DateTime`/`@db.Date` introdurrebbe la stessa ambiguità di fuso orario già incontrata con `AnnoAgonistico` (Story 1.6), senza alcun beneficio reale (nessuna aritmetica sulle date richiesta da questa storia). Il form usa `<input type="date">`, che produce già una stringa `"YYYY-MM-DD"` — nessuna conversione necessaria.

### 3. Primo utilizzo di `.upsert()` via supabase-js in questa codebase

Ogni scrittura RLS-protetta finora (`creaAtleta`, `inserisciIscrizione`, ecc.) genera `id` lato applicazione (`randomUUID()`) perché nessuna tabella ha un `DEFAULT` Postgres per `id` (solo `@default(uuid())` lato Prisma Client, che non si applica scrivendo via supabase-js — lezione di Story 1.3). Con `.upsert(righe, { onConflict: "atletaId,slotId,data" })`, PostgREST genera `INSERT ... ON CONFLICT (...) DO UPDATE SET <ogni colonna del payload>` — se `id` è nel payload, viene **rigenerato ad ogni ri-registrazione** (AC #3, correggere un errore di battitura cambia silenziosamente l'`id` della riga). **Accettato deliberatamente**: nessun'altra tabella referenzia `Presenza.id` con una FK, quindi questo "churn" della chiave primaria è innocuo — non introdurre un `DEFAULT gen_random_uuid()` solo per `presenze` (deviazione one-off dal pattern stabilito, sproporzionata al problema reale).

## Tasks / Subtasks

- [x] Task 1: Modello Prisma `Presenza` + migrazione con RLS (AC: #1, #2, #3, #4)
  - [x] `prisma/schema.prisma`: nuovo modello `Presenza` (`id`, `atletaId`, `slotId`, `data String`, `presente Boolean`, relazioni `atleta Atleta @relation(..., onDelete: Cascade)` e `slot Slot @relation(..., onDelete: Cascade)`, `createdAt`, `@@unique([atletaId, slotId, data])`, `@@map("presenze")`). Back-reference `presenze Presenza[]` su `Atleta` e su `Slot`.
  - [x] `Presenza` è protetta da RLS (AD-4, nel bind-list insieme ad Atleta/Iscrizione/CertificatoMedico) — letta/scritta **solo** tramite client Supabase autenticato (`lib/db-rls/presenza.ts`, Task 2), mai Prisma diretto a runtime.
  - [x] `Presenza` **eredita l'Anno Agonistico transitivamente tramite `Slot` → `Gruppo`** (AD-8, stesso pattern di `Slot` stesso, Story 2.5) — nessuna colonna `annoAgonisticoId` propria.
  - [x] Migrazione scritta a mano: `CREATE TABLE "presenze" (...)`, FK verso `atlete`/`slot` (`ON DELETE CASCADE`), `CREATE UNIQUE INDEX` su `(atletaId, slotId, data)`. `ALTER TABLE "presenze" ENABLE ROW LEVEL SECURITY`. `GRANT SELECT, INSERT, UPDATE ON "presenze" TO authenticated` (stesso pattern di `atlete`/`iscrizioni` — nessun `service_role` necessario, nessuna scrittura pre-signup come per Atleta/GenitoreAtleta).
  - [x] Policy RLS, **due per operazione** (SELECT/INSERT/UPDATE — nessuna policy DELETE, nessun AC richiede la rimozione di una Presenza):
    - `admin_dirigente_segreteria_*`: stesso pattern esatto già usato per `atlete`/`iscrizioni`/`certificati_medici` — `(auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']`.
    - `allenatore_proprio_gruppo_*`: `(auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE' AND EXISTS (SELECT 1 FROM "slot" s JOIN "gruppo_allenatori" ga ON ga."gruppoId" = s."gruppoId" JOIN "allenatori" a ON a.id = ga."allenatoreId" JOIN "utenti" u ON u.id = a."utenteId" WHERE s.id = "presenze"."slotId" AND u."supabaseAuthId" = auth.uid()::text)` — implementato come funzione `SECURITY DEFINER` (`allenatore_possiede_slot`, vedi Debug Log) invece di una subquery inline, per il motivo descritto lì.
  - [x] Applicare con `prisma migrate deploy`, verificare con `prisma migrate status` (nessun drift), poi `prisma generate`.
- [x] Task 2: `lib/db-rls/presenza.ts` (nuovo file) (AC: #1, #2, #3)
  - [x] `registraPresenze(supabase: SupabaseClient, righe: { atletaId: string; slotId: string; data: string; presente: boolean }[]): Promise<void>` — `supabase.from("presenze").upsert(righe.map(r => ({ id: randomUUID(), ...r })), { onConflict: "atletaId,slotId,data" })`. Nessun controllo "riga effettivamente modificata" necessario qui (a differenza di `aggiornaAtleta`/`disattivaIscrizione`): un upsert riuscito senza errore è già la conferma che la riga esiste (creata o aggiornata) — un rifiuto RLS silenzioso di PostgREST su un upsert produce comunque un errore esplicito (`error` non nullo), non un `data` vuoto silenzioso come per un `UPDATE` puro.
  - [x] `leggiPresenzePerSlotEData(supabase: SupabaseClient, slotId: string, data: string): Promise<{ atletaId: string; presente: boolean }[]>` — legge le Presenze già registrate per quello Slot+data, usata per precompilare il form (AC #3: correggere presenze già inserite, non solo crearne di nuove).
  - [x] Stesso pattern di `lib/db-rls/iscrizione.ts` (Story 1.6/1.8): `import "server-only"`, `SupabaseClient` come primo parametro, `throw new Error(error.message)` su errore.
- [x] Task 3: Estendere `lib/giorno-settimana.ts` con `giornoSettimanaDaData` (AC: #2)
  - [x] Nuova funzione `giornoSettimanaDaData(data: string): GiornoSettimana` — converte una stringa `"YYYY-MM-DD"` nel giorno della settimana corrispondente. **Usare `new Date(data).getUTCDay()`, mai `.getDay()`**: una stringa ISO "solo data" (senza componente orario) viene interpretata come UTC mezzanotte dalle specifiche ECMAScript — `.getDay()` la reinterpreterebbe nel fuso orario locale del processo Node, con lo stesso rischio di scivolamento di un giorno già incontrato con i confini `AnnoAgonistico` (Story 1.6). Mappare `getUTCDay()` (0=Domenica...6=Sabato) ai valori dell'enum `GiornoSettimana` tramite una tabella dedicata, **non** riordinare `GIORNI_SETTIMANA` (che resta nell'ordine Lunedì→Domenica per la UI).
  - [x] Aggiungere test in `lib/giorno-settimana.test.ts` per questa nuova funzione (almeno un caso per un Lunedì e un caso per una Domenica, per coprire esplicitamente il confine settimanale).
- [x] Task 4: Server Action `registraPresenze` in `app/(presenze)/presenze/actions.ts` (nuovo file) (AC: #1, #2, #3, #4)
  - [x] Nuovo route-group `app/(presenze)/` (capability map: FR-8..FR-10 vivono qui, insieme a `lib/db-rls/`).
  - [x] `requireRuolo(["ALLENATORE"])` come primo passo (FR-8 è specifico di questo Ruolo — Admin/Dirigente/Segreteria hanno comunque accesso ampio via RLS se in futuro servisse una correzione, ma questa storia non costruisce una UI per loro, stessa disciplina di scope di `/mio-orario`, Story 2.6).
  - [x] Legge da `formData`: `slotId`, `data` (stringa `"YYYY-MM-DD"`), l'elenco completo degli `atletaId` del roster (`formData.getAll("rosterAtletaId")` — **tutti** gli Atlete dello Slot, non solo quelli spuntati) e l'elenco degli `atletaId` marcati presenti (`formData.getAll("presenteAtletaId")` — solo i checkbox spuntati, coerente con la semantica HTML nativa dei checkbox). Validare `slotId`/`data` non vuoti e `rosterAtletaId` non vuoto (messaggi distinti).
  - [x] Validare il formato di `data` (regex `/^\d{4}-\d{2}-\d{2}$/`, stesso livello di rigore di `oraInizio`/`oraFine`, Story 2.5 — non serve una validazione di calendario più profonda, `<input type="date">` la garantisce già lato browser).
  - [x] Costruire `righe = rosterAtletaId.map(atletaId => ({ atletaId, slotId, data, presente: presentiSet.has(atletaId) }))` (`presentiSet = new Set(presenteAtletaId)`) — **ogni** Atleta del roster ottiene una riga esplicita, presente o assente (AC #1: "segno presenza/assenza per **ogni** Atleta", non solo per i presenti).
  - [x] Chiamare `registraPresenze(supabase, righe)` dentro un try/catch → `INTERNAL` generico su errore (un tentativo di scrivere per uno Slot non proprio viene rifiutato dalla policy RLS `allenatore_proprio_gruppo_insert`/`_update` — AC #4 è quindi garantito a livello di database, non da un controllo applicativo duplicato; l'errore RLS arriva qui come un errore Postgres generico, catturato dallo stesso blocco).
  - [x] `revalidatePath("/presenze")` dopo il salvataggio riuscito.
- [x] Task 5: UI in `app/(presenze)/presenze/page.tsx` (nuovo file) (AC: #1, #2, #3, #4)
  - [x] `export const dynamic = "force-dynamic"`.
  - [x] `searchParams` è una `Promise` in questa versione di Next.js (Dev Notes Story 2.8, già verificato — non ri-verificare, riusare quella conoscenza).
  - [x] Identificare l'Allenatore loggato: stesso pattern già stabilito in `mio-orario/page.tsx` (Story 2.6/2.7, collassato in un'unica query) — `prisma.allenatore.findFirst({ where: { utente: { supabaseAuthId: user.id } } })`. Se `null`: stesso messaggio di `mio-orario/page.tsx` ("account non ancora collegato a un profilo Allenatore. Contatta la segreteria.") — non duplicare la logica, riusare la stessa formulazione.
  - [x] **Selettore Slot+data** (primo passo, `<form method="get">` HTML nativo, stesso pattern di `/orari`, Story 2.8): `<select name="slotId">` popolato con **solo** gli Slot dei Gruppi dell'Allenatore per la stagione corrente (stessa query già usata per il ramo Allenatore di `mio-orario/page.tsx` — riusarla, non reinventarla), `<input type="date" name="data">`, bottone "Carica".
  - [x] Se `slotId`+`data` sono presenti in `searchParams` **e** `slotId` è tra gli Slot propri dell'Allenatore **e** il giorno della settimana di `data` (`giornoSettimanaDaData`, Task 3) corrisponde a `slot.giorno` — altrimenti mostrare un messaggio di errore chiaro ("La data selezionata non corrisponde al giorno di questo Slot.") invece di procedere silenziosamente con un roster fuorviante:
    1. Risolvere gli Atlete del Gruppo di quello Slot per la stagione corrente: `GruppoAtleta` (Prisma diretto, non-RLS) per gli `atletaId`, poi `elencaAtlete(supabase)` (RLS-safe, **mai** un `include` Prisma su `Atleta` — stessa disciplina AD-4 già applicata in Story 2.4/2.6/2.7) per nome/id, uniti lato server con una mappa (stesso pattern di `gruppi/page.tsx`, Story 2.4).
    2. `leggiPresenzePerSlotEData(supabase, slotId, data)` (Task 2) per precompilare i checkbox con le presenze già registrate, se esistono (AC #3).
    3. Form (`<form action={registraPresenze}>`): un `<input type="hidden" name="rosterAtletaId" value={atleta.id}>` **per ogni** Atleta del roster (necessario perché solo i checkbox spuntati vengono inviati in un `FormData` — l'azione deve comunque sapere quali Atlete fanno parte del roster completo per registrare esplicitamente le assenze), un `<input type="hidden" name="slotId">`, un `<input type="hidden" name="data">`, e un `<input type="checkbox" name="presenteAtletaId" value={atleta.id}>` per Atleta, precompilato (`defaultChecked`) in base al risultato di `leggiPresenzePerSlotEData` (default non spuntato = assente per una nuova registrazione). Bottone "Salva presenze".
  - [x] `lib/auth/route-guard.ts`: aggiungere `{ prefix: "/presenze", ruoliAmmessi: ["ALLENATORE"] }` — stesso pattern minimale già applicato a `/mio-orario` (Story 2.6), non allargare ad altri Ruoli senza un AC che lo richieda.
- [x] Task 6: Test (Vitest)
  - [x] `lib/db-rls/presenza.test.ts`: `registraPresenze` — verifica che `.upsert()` sia chiamato con `onConflict: "atletaId,slotId,data"` e con un `id` generato per ogni riga; propaga l'errore se l'upsert fallisce (incluso un rifiuto RLS, che PostgREST restituisce come `error` non nullo). `leggiPresenzePerSlotEData` — verifica la query (`select`, due `eq`), mappa correttamente il risultato, propaga l'errore in caso di fallimento.
  - [x] `lib/giorno-settimana.test.ts`: aggiungere test per `giornoSettimanaDaData` (Task 3) — almeno un Lunedì e una Domenica, per coprire esplicitamente il confine UTC.
  - [x] `app/(presenze)/presenze/actions.test.ts`: `FORBIDDEN` per Ruoli diversi da Allenatore; `VALIDATION` per `slotId`/`data`/roster mancanti (messaggi distinti); `VALIDATION` per formato data non valido; successo — `registraPresenze` chiamato con una riga per ogni `rosterAtletaId`, `presente` corretto per ciascuno in base a `presenteAtletaId`; errore `INTERNAL` fail-closed su eccezione (incluso un rifiuto RLS simulato, AC #4).
  - [x] Nessun test per `presenze/page.tsx` — stessa decisione deliberata già applicata a ogni altra pagina di questo progetto.
- [x] Task 7: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] AC #1/#2: come Admin, creare Palestra→Campo→Gruppo→Atlete assegnate→Slot; registrare/loggare un Allenatore collegato a quel Gruppo; su `/presenze`, selezionare quello Slot e una data passata corrispondente al giorno della settimana corretto; segnare presente un'Atleta e assente un'altra; salvare; verificare via query diretta al DB che le due righe `Presenza` siano state create correttamente.
  - [x] AC #3: ricaricare la stessa pagina con lo stesso Slot+data, verificare che i checkbox riflettano lo stato appena salvato; invertire un valore e risalvare; verificare via query diretta che sia rimasta **una sola riga** per quella combinazione Atleta+Slot+data (nessun duplicato), con il valore aggiornato.
  - [x] AC #4: creare un secondo Gruppo/Slot **non** assegnato a questo Allenatore; verificare che non compaia nel selettore Slot della pagina; tentare comunque una POST diretta (bypassando la UI) verso `registraPresenze` con quello `slotId` e verificare che venga rifiutata (RLS).
  - [x] Verificare che un Admin/Dirigente/Atleta/Segreteria non possa raggiungere `/presenze` (redirect a `/non-autorizzato`, route-guard).
  - [x] Verificare il messaggio di errore per una data il cui giorno della settimana non corrisponde allo Slot selezionato.

### Review Findings

- [x] [Review][Patch] La policy RLS di `presenze` verifica solo che l'Allenatore possieda lo Slot, non che l'Atleta segnata appartenga davvero al Gruppo di quello Slot — un `rosterAtletaId` manomesso può registrare una Presenza per un'Atleta estranea, purché lo Slot sia proprio (AC #4 solo parzialmente applicato a livello di database) [prisma/migrations/20260717190000_add_presenza/migration.sql] — risolto con `allenatore_possiede_slot_e_atleta` (nuova migrazione `20260717210000_presenze_scope_atleta_gruppo`), riverificato dal vivo
- [x] [Review][Patch] Il controllo giorno/data (AC #2) è applicato solo in `page.tsx` (percorso di lettura/UI), non nella Server Action `registraPresenze` (percorso di scrittura) — una POST diretta che bypassa la UI può registrare una Presenza per una data il cui giorno della settimana non corrisponde allo Slot [app/(presenze)/presenze/actions.ts] — risolto: lookup dello Slot + confronto `giornoSettimanaDaData` aggiunti alla Server Action, riverificato dal vivo
- [x] [Review][Patch] Nessuna deduplicazione di `rosterAtletaId`: un form manomesso con id duplicati fa fallire l'intero upsert con un errore Postgres poco chiaro invece di un errore di validazione pulito [app/(presenze)/presenze/actions.ts] — risolto con `[...new Set(...)]`
- [x] [Review][Patch] I checkbox di `PresenzeForm` sono non controllati (`defaultChecked`) senza una key legata a Slot+data — se il componente non viene rimontato, lo stato visualizzato può non risincronizzarsi con `presentiIniziali` aggiornato [app/(presenze)/presenze/PresenzeForm.tsx] — risolto con `key={`${slotId}-${data}`}` sull'invocazione in `page.tsx`
- [x] [Review][Defer] `ON DELETE CASCADE` da `presenze` verso `atlete`/`slot` cancella silenziosamente lo storico presenze se l'Atleta o lo Slot vengono eliminati — stesso pattern già usato per `Iscrizione`/`CertificatoMedico`, non una deviazione introdotta da questa storia, ma un rischio da tenere presente per Story 3.2/3.3 (storico/trend) [prisma/migrations/20260717190000_add_presenza/migration.sql] — deferred, pre-existing pattern
- [x] [Review][Defer] Nessun indice con `slotId`+`data` come colonne guida (l'unico indice è l'UNIQUE su `atletaId, slotId, data`) — `leggiPresenzePerSlotEData` non può sfruttarlo appieno; non rilevante alla scala attuale (NFR PRD §8) [prisma/migrations/20260717190000_add_presenza/migration.sql] — deferred, non rilevante alla scala attuale
- [x] [Review][Defer] La nuova policy SELECT `allenatore_proprie_atlete_select` su `atlete` espone tutte le colonne (non solo id/nome) a un Allenatore per le proprie Atlete — stesso livello di esposizione già presente nella policy ADMIN/DIRIGENTE/SEGRETERIA esistente, non un pattern nuovo introdotto da questa storia [prisma/migrations/20260717200000_atlete_allenatore_select/migration.sql] — deferred, consistente con la convenzione esistente
- [x] [Review][Defer] Le policy RLS di scrittura per ADMIN/DIRIGENTE/SEGRETERIA su `presenze` non sono mai state esercitate nella verifica dal vivo (solo il rifiuto di route-guard è stato verificato) — stesso pattern boilerplate già collaudato su `atlete`/`iscrizioni`/`certificati_medici` [prisma/migrations/20260717190000_add_presenza/migration.sql] — deferred, pattern boilerplate già collaudato altrove
- [x] [Review][Defer] Nessuna validazione di validità calendariale oltre al formato regex per `data` (es. "2026-02-30" viene normalizzata silenziosamente da `Date`) — stessa scelta deliberata già presa per `oraInizio`/`oraFine` (Story 2.5), il mismatch con `slot.giorno` intercetta comunque la quasi totalità dei casi reali [app/(presenze)/presenze/actions.ts] — deferred, consistente con la convenzione esistente
- [x] [Review][Defer] I test di `route-guard.test.ts` per `/presenze` non coprono esplicitamente il rifiuto per DIRIGENTE/SEGRETERIA (solo ATLETA e ADMIN) [lib/auth/route-guard.test.ts] — deferred, copertura minima già accettata altrove nel progetto

## Dev Notes

- **Questa storia introduce tre pattern architetturali nuovi** (policy RLS con scoping relazionale, `data` come stringa, primo `.upsert()` via supabase-js) — vedi la sezione dedicata sopra, letta per intero prima di iniziare l'implementazione. Non improvvisare varianti diverse da quelle già decise lì.
- **AD-10 rispettato**: questa storia non scrive mai sulle colonne identitarie di `Atleta` — solo su `Presenza`, una entità correlata via FK, esattamente come `Iscrizione`/`CertificatoMedico`.
- **Nessuna interazione con lo stato del Certificato Medico in questa storia**: la metrica SM-1 del PRD ("zero casi di atlete in campo senza che lo stato del Certificato Medico fosse visibile a chi le allena") lega concettualmente FR-8 a FR-15, ma FR-15 appartiene all'Epic 4 (non ancora costruito) — questa storia registra presenze senza alcun controllo o alert sul certificato. Non anticipare quella funzionalità qui.
- **Pattern di riferimento più vicino**: `lib/db-rls/iscrizione.ts` (Story 1.6/1.8) per la struttura dei helper RLS; `app/(orari-palestre)/mio-orario/page.tsx` (Story 2.6/2.7) per l'identificazione dell'Allenatore loggato e la risoluzione dei propri Slot/Gruppi; `app/(orari-palestre)/orari/page.tsx` (Story 2.8) per il pattern `<form method="get">` + `searchParams` per il selettore; `app/(gruppi-allenatori)/gruppi/page.tsx` (Story 2.4) per il pattern di join manuale lato server tra un elenco non-RLS (`GruppoAtleta`) e un elenco RLS-safe (`elencaAtlete`).
- **Scala**: NFR PRD §8, un Gruppo ha tipicamente 10-20 Atlete — nessuna paginazione necessaria per il roster.
- **Prerequisito bloccante scoperto durante la verifica dal vivo (non anticipato in fase di creazione della storia)**: la policy RLS `SELECT` esistente su `atlete` (Story 1.3) ammette solo ADMIN/DIRIGENTE/SEGRETERIA — nessuna storia precedente aveva mai richiesto che un Allenatore leggesse questa tabella. `elencaAtlete(supabase)` restituiva quindi sempre 0 righe per una sessione Allenatore, con il roster della pagina `/presenze` sempre vuoto nonostante `GruppoAtleta` contenesse le righe corrette. Risolto con una migrazione aggiuntiva (`20260717200000_atlete_allenatore_select`) che introduce una nuova policy SELECT scoped per ALLENATORE su `atlete`, con lo stesso pattern `SECURITY DEFINER` descritto sotto. Vedi Debug Log per il dettaglio completo.

### Project Structure Notes

- Nuovo route-group: `app/(presenze)/presenze/` (`page.tsx`, `actions.ts`, `actions.test.ts`, `PresenzeForm.tsx`).
- File nuovi: `prisma/migrations/20260717190000_add_presenza/migration.sql`, `prisma/migrations/20260717200000_atlete_allenatore_select/migration.sql`, `lib/db-rls/presenza.ts`, `lib/db-rls/presenza.test.ts`. File modificati: `prisma/schema.prisma` (nuovo modello `Presenza`, back-reference su `Atleta`/`Slot`), `lib/giorno-settimana.ts` (+ `giornoSettimanaDaData`), `lib/giorno-settimana.test.ts`, `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1: Registrazione presenze] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-8] — "L'Allenatore registra presenza/assenza di ogni Atleta del Gruppo per uno Slot svolto... anche per Slot passati."
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-4] — Presenza esplicitamente nel bind-list RLS.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-8] — "Slot e Presenza non hanno un proprio riferimento di stagione."
- [Source: prisma/migrations/20260716080000_atlete_restrict_delete/migration.sql] — pattern di riferimento per le policy RLS basate su Ruolo, esteso (non sostituito) con lo scoping relazionale per Allenatore.
- [Source: lib/db-rls/iscrizione.ts] — pattern di riferimento per i helper RLS (Story 1.6/1.8).
- [Source: app/(orari-palestre)/mio-orario/page.tsx, app/(orari-palestre)/orari/page.tsx] — pattern di riferimento per l'identificazione dell'Allenatore e il selettore `searchParams` (Story 2.6/2.7/2.8).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Scelta SECURITY DEFINER invece di subquery inline nella policy RLS**: la policy `allenatore_proprio_gruppo_*` su `presenze` doveva attraversare `slot`/`gruppo_allenatori`/`allenatori`/`utenti` per verificare l'appartenenza dello Slot all'Allenatore. Queste tabelle non hanno alcun GRANT verso il ruolo `authenticated` (AD-9: lette solo via Prisma diretto con connessione privilegiata) — una subquery inline nella policy sarebbe fallita per mancanza di permessi, e concedere un GRANT diretto avrebbe esposto email (`utenti`) e Codice Fiscale (`allenatori`) a qualsiasi utente autenticato tramite l'API REST, non solo all'Allenatore proprietario. Risolto con una funzione `allenatore_possiede_slot(slot_id_param TEXT)` `SECURITY DEFINER` (con `SET search_path = public` per prevenire hijacking dello schema), che esegue la verifica con i privilegi del proprietario e restituisce solo un booleano. Pattern standard Supabase per questo esatto caso, primo utilizzo in questa codebase.
- **Stesso problema, scoperto una seconda volta, durante la verifica dal vivo**: il roster di `/presenze` risultava sempre vuoto nonostante `GruppoAtleta` contenesse le righe corrette. Causa: `elencaAtlete(supabase)` (che legge `atlete` via RLS) restituiva 0 righe per una sessione Allenatore — la policy SELECT esistente su `atlete` (Story 1.3) ammette solo ADMIN/DIRIGENTE/SEGRETERIA, mai anticipato perché nessuna storia precedente aveva bisogno che un Allenatore leggesse Atlete. Risolto con una migrazione aggiuntiva (`20260717200000_atlete_allenatore_select`) che introduce `allenatore_possiede_atleta(atleta_id_param TEXT)` (stesso pattern `SECURITY DEFINER`) e una policy SELECT scoped per ALLENATORE su `atlete`, combinata in OR con la policy esistente.
- **Falso negativo nello script di verifica (non un bug applicativo)**: al primo tentativo, il test del messaggio di errore per giorno/data non corrispondenti falliva in modo intermittente (`textContent()` su `[role="alert"]` restituiva `null`). Isolato con uno script di debug dedicato: il messaggio viene renderizzato correttamente, il fallimento era dovuto a una lettura troppo rapida rispetto al re-render lato client dopo una risposta POST di una Server Action (stessa classe di problema del gotcha "networkidle si risolve prima della transizione client" già documentato nelle storie precedenti, Story 2.5/2.8). Risolto con un breve `waitForTimeout(500)` esplicito prima della lettura, stesso idiom consolidato.
- **Idempotenza dello script di verifica tra run successivi**: un primo run parziale (fallito per il problema RLS su `atlete`) aveva già registrato un nuovo Utente con lo stesso Codice Fiscale precaricato; un secondo tentativo di registrazione con una nuova email non si sarebbe più agganciato all'Allenatore precaricato (CF già preso). Corretto riusando l'account già agganciato quando presente, invece di registrarne uno nuovo ad ogni run.
- **Code review (Blind Hunter, eseguito due volte indipendentemente, + Edge Case Hunter)**: entrambe le esecuzioni hanno individuato lo stesso gap reale — la policy RLS `allenatore_proprio_gruppo_*` verificava solo la proprietà dello Slot, mai l'appartenenza dell'Atleta al Gruppo di quello Slot (AC #4 solo parzialmente applicato) — e il controllo giorno/data (AC #2) mancava nella Server Action (presente solo nel percorso di lettura `page.tsx`). Entrambi risolti (vedi Review Findings). Un finding isolato su un presunto errore di sintassi in `actions.test.ts` è stato verificato come falso positivo (artefatto di trascrizione nel prompt del subagent, non presente nel file reale — confermato rieseguendo i test, 7/7 verdi).
- **Riverifica dal vivo delle due patch di sicurezza**: script Playwright dedicato, con un secondo Gruppo/Atleta "estranei" (non del Gruppo dell'Allenatore) creati appositamente. Riscontrato lo stesso gotcha AD-11 (staleness del JWT) già noto: la sessione appena creata da `signUp` non riflette ancora `app_metadata.ruoli` nel token già emesso — necessario un login esplicito dopo la registrazione per ottenere un token fresco, altrimenti `elencaAtlete(supabase)` restituisce 0 righe anche per un Ruolo correttamente sincronizzato lato DB. Non un bug applicativo, un dettaglio dello script di verifica. Entrambe le patch confermate: un `rosterAtletaId` manomesso per un'Atleta estranea viene rifiutato (nessuna riga scritta), una data con giorno non corrispondente viene rifiutata dalla Server Action con il messaggio corretto.

### Completion Notes List

- Tutti i 7 Task completati con TDD (RED confermato prima di ogni implementazione per la business logic: `lib/giorno-settimana.ts`, `lib/db-rls/presenza.ts`, Server Action, route-guard).
- Suite completa verde: `npx vitest run` (266 test, 28 file), `npx tsc --noEmit` (nessun errore), `npm run lint` (pulito), `npm run build` (produzione, `/presenze` generata come route dinamica).
- Verifica dal vivo eseguita con successo su tutti gli scenari (AC #1-#4, route-guard, messaggio giorno/data non corrispondenti) dopo la correzione del prerequisito bloccante sulla policy RLS di `atlete` (vedi Debug Log e Dev Notes). Dati di test creati per la verifica interamente rimossi al termine (Palestra/Campo/Gruppi/Slot/Atlete/Allenatore/Utente di test, righe Presenza, utente Supabase Auth).
- Nessuna deviazione dal design descritto nei Prerequisiti architetturali della storia, ad eccezione dell'estensione non anticipata della policy RLS di `atlete` (documentata sopra).
- Code review completata: 4 patch applicate e riverificate dal vivo (RLS atleta-gruppo, controllo giorno/data nella Server Action, deduplicazione roster, key di remount su `PresenzeForm`), 6 findings differiti in `deferred-work.md` (nessuno bloccante), 7 findings scartati come falsi positivi o consistenti con convenzioni già stabilite.

### File List

- `prisma/schema.prisma` (modificato)
- `prisma/migrations/20260717190000_add_presenza/migration.sql` (nuovo)
- `prisma/migrations/20260717200000_atlete_allenatore_select/migration.sql` (nuovo)
- `prisma/migrations/20260717210000_presenze_scope_atleta_gruppo/migration.sql` (nuovo, review fix)
- `lib/db-rls/presenza.ts` (nuovo)
- `lib/db-rls/presenza.test.ts` (nuovo)
- `lib/giorno-settimana.ts` (modificato)
- `lib/giorno-settimana.test.ts` (modificato)
- `lib/auth/route-guard.ts` (modificato)
- `lib/auth/route-guard.test.ts` (modificato)
- `app/(presenze)/presenze/actions.ts` (nuovo, esteso in review fix)
- `app/(presenze)/presenze/actions.test.ts` (nuovo, esteso in review fix)
- `app/(presenze)/presenze/page.tsx` (nuovo, esteso in review fix)
- `app/(presenze)/presenze/PresenzeForm.tsx` (nuovo)
