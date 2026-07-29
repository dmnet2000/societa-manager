---
baseline_commit: dd5e787a1a292857816856f4ece58bcd637d0946
---

# Story 10.1: Creazione di un Campionato per un Gruppo

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore del proprio Gruppo (o Admin/Dirigente per qualunque Gruppo),
I want creare un nuovo Campionato e collegarlo a uno o più Gruppi,
so that posso poi importare/gestire le partite di quella competizione per la mia squadra.

**Note aggiuntive:** prima storia dell'Epic 10 (Gestione Partite e Campionati) — introduce le due nuove entità dati (`Campionato`, `GruppoCampionato`) su cui si baseranno tutte le storie successive (10.2 import Excel, 10.3 vista settimanale, 10.4 modifica partita, 10.5 vista Atleta/Genitore). Nessuna `Partita` in questa storia — arriva con la 10.2.

## Acceptance Criteria

1. **Given** un Allenatore agganciato al proprio Gruppo **When** crea un nuovo Campionato (nome) per quel Gruppo **Then** il Campionato viene creato, associato all'Anno Agonistico corrente, e collegato al Gruppo
2. **Given** un Campionato già esistente (creato da un altro Allenatore/Admin per un altro Gruppo) **When** un Allenatore vuole iscrivere il proprio Gruppo alla stessa competizione **Then** può collegare il proprio Gruppo a un Campionato esistente scegliendolo da un elenco, invece di crearne uno duplicato con lo stesso nome
3. **Given** un Admin o Dirigente **When** crea/collega un Campionato **Then** può farlo per qualunque Gruppo, non solo i propri (stesso pattern di accesso ampio già usato per la gestione dei Gruppi, Story 2.2)
4. **Given** un Allenatore che non gestisce un dato Gruppo **When** tenta di creare/collegare un Campionato per quel Gruppo **Then** l'operazione viene rifiutata
5. **And** un Gruppo può essere collegato a più Campionati contemporaneamente (nessun vincolo di unicità sul lato Gruppo) — nessuna regressione sul resto del comportamento esistente (gestione Gruppi, Story 2.2), suite Vitest esistente invariata

## Tasks / Subtasks

- [x] Task 1: Migrazione Prisma — `Campionato`, `GruppoCampionato` (AC: #1, #2, #5)
  - [x] Aggiungere a `prisma/schema.prisma`:
    ```prisma
    // Non protetto da RLS (AD-9): dato strutturale, stesso trattamento di
    // Gruppo/Slot — nessun dato sanitario/personale. Decisione presa con
    // l'utente in fase di analisi dell'Epic 10 (vedi epics.md).
    model Campionato {
      id               String             @id @default(uuid())
      nome             String
      annoAgonisticoId String
      annoAgonistico   AnnoAgonistico     @relation(fields: [annoAgonisticoId], references: [id])
      createdAt        DateTime           @default(now())
      gruppi           GruppoCampionato[]

      @@map("campionati")
    }

    // Tabella di giunzione molti-a-molti (un Gruppo può partecipare a più
    // Campionati contemporaneamente, un Campionato può essere condiviso da
    // più Gruppi) - stesso pattern di GruppoAllenatore (Story 2.3).
    model GruppoCampionato {
      id           String     @id @default(uuid())
      gruppoId     String
      campionatoId String
      gruppo       Gruppo     @relation(fields: [gruppoId], references: [id], onDelete: Cascade)
      campionato   Campionato @relation(fields: [campionatoId], references: [id], onDelete: Cascade)
      createdAt    DateTime   @default(now())

      @@unique([gruppoId, campionatoId])
      @@map("gruppo_campionati")
    }
    ```
  - [x] Aggiungere il campo di relazione inversa `campionati Campionato[]` a `model AnnoAgonistico` e `campionati GruppoCampionato[]` a `model Gruppo` (righe 173-184 e 347-360 di `prisma/schema.prisma`)
  - [x] Nuova migrazione scritta a mano `prisma/migrations/20260728010000_add_campionato/migration.sql` — niente `prisma migrate dev`, stesso stile delle migrazioni esistenti (`ON DELETE RESTRICT` verso `anni_agonistici`, confermato confrontando `20260717150000_add_gruppo`/`20260717170000_add_gruppo_atleta`; `ON DELETE CASCADE` per la giunzione, confermato confrontando `20260717160000_add_gruppo_allenatore`)
  - [x] `npx prisma migrate deploy` tentato: **nessuna istanza Supabase locale in esecuzione** in questa sessione (`P1001: Can't reach database server`), stesso limite già incontrato nelle Storie 9.6/9.12. `npx prisma validate` (schema valido) e `npx prisma generate` (Client rigenerato con successo) eseguiti al suo posto — applicazione/verifica reale della migrazione rimandata al deploy, come da Task 5
- [x] Task 2: Route protetta `/campionati` (AC: #1, #2, #3, #4)
  - [x] `lib/auth/route-guard.ts`: aggiungere `{ prefix: "/campionati", ruoliAmmessi: ["ADMIN", "DIRIGENTE", "ALLENATORE"], navLabel: "Campionati" }` a `PROTECTED_ROUTES` — prima volta che ALLENATORE compare tra i Ruoli ammessi su una rotta di gestione (a differenza di `/gruppi`, oggi solo `ADMIN`/`DIRIGENTE`) — decisione presa con l'utente in fase di analisi dell'Epic 10
  - [x] `lib/auth/route-guard.test.ts`: nuovo caso per `/campionati` (ADMIN/DIRIGENTE/ALLENATORE ammessi, altri Ruoli rediretti a `/non-autorizzato`)
- [x] Task 3: Server Actions — nuovo modulo `(partite-campionati)` (AC: #1, #2, #3, #4)
  - [x] Nuova cartella `app/(partite-campionati)/campionati/` — **nuovo modulo** (non annidato in `(gruppi-allenatori)`, che possiede la mutazione di `Gruppo` stesso, AD-2, ma non le nuove entità di questo epic): coerente con l'aggiunta di un modulo per epic aggiunto in corso d'opera (stesso principio già seguito per `(configurazione)`, Story 7.1/7.2)
  - [x] `app/(partite-campionati)/campionati/actions.ts`, due Server Action:
    - `creaCampionato(_prevState, formData)`: `formData` contiene `nome` e `gruppoId`. Passi:
      1. `requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"])` come primo passo (difesa in profondità)
      2. Valida `nome`/`gruppoId` non vuoti (`VALIDATION` se mancanti, nessuna chiamata Supabase/Prisma)
      3. Risolve i Ruoli reali del chiamante: `createClient()` → `supabase.auth.getUser()` → `parseRuoli(user?.app_metadata?.ruoli)` (`lib/ruoli.ts`)
      4. Se il chiamante **non** ha `ADMIN` né `DIRIGENTE` (quindi solo `ALLENATORE`): risolve il proprio `Allenatore` (`prisma.allenatore.findFirst({ where: { utente: { supabaseAuthId: user.id } } })`, stesso pattern di Story 9.12/dati-fisici) e verifica che gestisca **esattamente** il `gruppoId` richiesto tramite `prisma.gruppoAllenatore.findUnique({ where: { gruppoId_allenatoreId: { gruppoId, allenatoreId: allenatore.id } } })` — se non lo gestisce (o non ha alcun Allenatore collegato), ritorna `{ error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." } }` (AC #4)
      5. Admin/Dirigente **saltano** il controllo del passo 4 (accesso ampio, AC #3)
      6. `risolviAnnoAgonisticoCorrente()` (`lib/anno-agonistico`, già esistente — **non reimplementare**, stesso riuso già fatto in `creaGruppo`, `app/(gruppi-allenatori)/gruppi/actions.ts` riga 47)
      7. `prisma.campionato.create({ data: { nome, annoAgonisticoId: anno.id } })` poi `prisma.gruppoCampionato.create({ data: { gruppoId, campionatoId: campionato.id } })` — due scritture, nessuna transazione esplicita richiesta (stesso livello di garanzia già accettato per operazioni analoghe nel progetto, es. Story 1.1)
      8. `revalidatePath("/campionati")`, ritorna `{ success: true }`
    - `collegaCampionatoEsistente(_prevState, formData)`: `formData` contiene `gruppoId` e `campionatoId` (di un Campionato già esistente, selezionato da un `<select>` nella UI). Stessi passi 1-5 di sopra per l'autorizzazione, poi `prisma.gruppoCampionato.create({ data: { gruppoId, campionatoId } })` dentro un `try/catch` che tratta `P2002` (violazione `@@unique([gruppoId, campionatoId])`) come successo idempotente — stesso identico pattern di `assegnaAllenatore` (`app/(gruppi-allenatori)/gruppi/actions.ts` righe 81-94, AC #3 di quella storia)
  - [x] Nuovo `app/(partite-campionati)/campionati/actions.test.ts`: nome/gruppoId mancanti → `VALIDATION`, nessuna chiamata; non-Ruolo-ammesso → `FORBIDDEN` da `requireRuolo`; Allenatore che non gestisce il Gruppo target → `FORBIDDEN` esplicito, nessuna scrittura Prisma; Allenatore che gestisce il proprio Gruppo → successo, `Campionato`+`GruppoCampionato` creati; Admin/Dirigente su un Gruppo qualunque (nessun controllo di possesso) → successo; `collegaCampionatoEsistente` su un collegamento già esistente (P2002) → successo idempotente, nessun errore (14 test)
- [x] Task 4: Pagina e componenti (AC: #1, #2, #3, #4, #5)
  - [x] Nuovo `app/(partite-campionati)/campionati/page.tsx` (Server Component, `export const dynamic = "force-dynamic"`, stesso motivo di `/gruppi`/`/admin`)
    - Risolve `annoCorrente` (`trovaAnnoAgonisticoCorrente()`, sola lettura — **mai** `risolviAnnoAgonisticoCorrente()` in una pagina GET, stesso principio Dev Notes Story 1.6/2.2)
    - Risolve la sessione (`createClient()` → `supabase.auth.getUser()`) e i Ruoli (`parseRuoli`)
    - Se Admin/Dirigente: elenco di **tutti** i Gruppi dell'Anno Agonistico corrente (stessa query di `app/(gruppi-allenatori)/gruppi/page.tsx` righe 35-45, senza l'`include` degli allenatori/atlete che qui non serve)
    - Se solo Allenatore: risolve il proprio `Allenatore` e filtra ai soli Gruppi che gestisce (`prisma.gruppo.findMany({ where: { annoAgonisticoId: annoCorrente.id, allenatori: { some: { allenatoreId: allenatore.id } } } })`)
    - Per ciascun Gruppo mostrato: elenco dei Campionati già collegati (`include: { campionati: { include: { campionato: true } } }`) + form "Nuovo Campionato" (nome) + `<select>` "Collega Campionato esistente" (Campionati **non** già collegati a quel Gruppo, calcolato lato server)
    - Nessun Anno Agonistico corrente → messaggio vuoto coerente (nessun Gruppo può esistere senza, stesso principio di `/gruppi`)
  - [x] Nuovo `app/(partite-campionati)/campionati/NuovoCampionatoForm.tsx` (Client Component, riceve `gruppoId`) — campo `nome` + submit, reset al successo (stesso pattern `useActionState`+`useEffect` di `NuovoGruppoForm.tsx`). **Deviazione documentata dal Dev Notes originale**: `gruppoId` passato come campo `hidden` nel form (non legato via `.bind()`) — riusa esattamente lo stesso pattern di `GruppoRow.tsx`/`assegnaAllenatore` (Story 2.2/2.3), il precedente più vicino per "form di assegnazione dentro una riga di tabella legata a un Gruppo esplicito e non ambiguo" — a differenza del discriminatore `tipo` di Story 9.12, che risolveva un'identità ambigua dalla sessione. L'autorizzazione/il controllo di possesso restano comunque sempre verificati lato server in `creaCampionato`, indipendentemente da come `gruppoId` arriva.
  - [x] Nuovo `app/(partite-campionati)/campionati/CollegaCampionatoForm.tsx` (Client Component) — `<select>` dei Campionati collegabili + submit, stesso pattern del `<select>` Allenatore/Atleta già in `GruppoRow.tsx` (stesso `hidden` `gruppoId`, stessa motivazione sopra)
  - [x] Nuovo `app/(partite-campionati)/campionati/campionati.module.css` — stesso set di classi già stabilito in `gruppi.module.css` (`.tabella`/`.scrollWrapper`/`.listaAssegnati`/`.formCompatto`/`.bottoneCompatto`/`.errore`), nessun meccanismo `composes` in questa codebase
- [x] Task 5: Test e regressione (AC: #5)
  - [x] Suite Vitest completa: tutti i test esistenti devono continuare a passare invariati
  - [x] `npx tsc --noEmit` ed ESLint puliti su tutti i file nuovi/modificati
  - [x] Nessun test di rendering introdotto per i nuovi Client Component, coerente con la convenzione già stabilita nel progetto

### Review Findings

- [x] [Review][Patch] `verificaPossessoGruppoSeAllenatore` non è avvolta in un `try/catch`: se `createClient()`/`getUser()`/`prisma.allenatore.findFirst`/`prisma.gruppoAllenatore.findUnique` lanciano (rete/DB), l'eccezione si propaga fuori dalla Server Action invece del contratto `{ error: { code, message } }` rispettato ovunque nel resto del progetto [app/(partite-campionati)/campionati/actions.ts] — risolto: l'intera funzione (rinominata `risolviAutorizzazioneGruppo`) è ora avvolta in `try/catch`, ritorna `{ code: "INTERNAL", ... }` su eccezione.
- [x] [Review][Patch] `creaCampionato` fa `prisma.campionato.create` seguito da un `prisma.gruppoCampionato.create` separato, senza `prisma.$transaction`: se il secondo fallisce (es. `gruppoId` non valido), il primo resta comunque committato — un `Campionato` orfano, mai collegato a nessun Gruppo. Il Dev Notes originale cita la Story 1.1 come precedente per "nessuna transazione necessaria", ma il precedente realmente analogo nel progetto (`app/(gruppi-allenatori)/wizard-nuova-stagione/actions.ts`, Story 5.2 — "crea entità padre, poi crea righe di giunzione dipendenti che referenziano il suo id") usa `prisma.$transaction` esattamente per questo motivo [app/(partite-campionati)/campionati/actions.ts] — risolto: entrambe le scritture avvolte in `prisma.$transaction(async (tx) => {...})`.
- [x] [Review][Patch] Nessun controllo che il `gruppoId` esista/appartenga alla stagione corrente per il percorso Admin/Dirigente (che salta interamente `verificaPossessoGruppoSeAllenatore`) — un id non valido emerge solo come fallimento di FK dopo che il rischio di riga orfana sopra si è già verificato [app/(partite-campionati)/campionati/actions.ts] — risolto: l'esistenza/stagione del Gruppo è ora verificata per **tutti** i chiamanti (prima del branch Admin/Dirigente vs Allenatore), non solo per l'Allenatore.
- [x] [Review][Patch] Il controllo di possesso Gruppo↔Allenatore (`gruppoAllenatore.findUnique`) non è scoped alla stagione corrente: le righe `GruppoAllenatore` non vengono mai cancellate al cambio stagione (nessuna pulizia esiste nel progetto), quindi un Allenatore che ha gestito un Gruppo in una stagione passata ma non più in quella corrente supera comunque il controllo e può collegare un nuovo Campionato a quel Gruppo ormai storico [app/(partite-campionati)/campionati/actions.ts] — risolto dallo stesso fix di cui sopra: un Gruppo di una stagione passata ha sempre un id diverso da un Gruppo corrente (mai riportato tra stagioni), quindi verificare che il Gruppo target sia della stagione corrente esclude già di per sé ogni Gruppo storico, indipendentemente da quando risale la riga `GruppoAllenatore`.
- [x] [Review][Patch] `collegaCampionatoEsistente` non verifica mai che il `campionatoId` inviato appartenga alla stessa stagione del `gruppoId` target (o alla stagione corrente in generale) — l'elenco `disponibili` in `page.tsx` filtra solo cosa viene *offerto* nel `<select>`, nessun controllo server-side ri-verifica il valore effettivamente inviato: una richiesta manomessa può collegare un Gruppo della stagione corrente a un Campionato di una stagione passata [app/(partite-campionati)/campionati/actions.ts, app/(partite-campionati)/campionati/page.tsx] — risolto: nuovo controllo esplicito `campionato.annoAgonisticoId === autorizzazione.annoCorrenteId` prima della creazione del collegamento.
- [x] [Review][Patch] Copertura di test asimmetrica tra le due Server Action: `collegaCampionatoEsistente` non ha un test per il rifiuto `FORBIDDEN` da `requireRuolo` né per `gruppoId` mancante, pur condividendo la stessa impalcatura di autorizzazione di `creaCampionato` (che li ha entrambi) [app/(partite-campionati)/campionati/actions.test.ts] — risolto: aggiunti entrambi i test mancanti, più test per il nuovo controllo di stagione su `campionatoId`.
- [x] [Review][Patch] Nessun controllo su nome duplicato/case-insensitive per `Campionato` nella stessa stagione: l'AC #2 esiste proprio per evitare un Campionato duplicato con lo stesso nome, ma `creaCampionato` inserisce comunque un secondo Campionato con nome identico (o diversa capitalizzazione) se l'utente usa il form "nuovo" invece di "collega esistente" — la regola è oggi rispettata solo per convenzione UI, non dall'azione né da un vincolo DB [app/(partite-campionati)/campionati/actions.ts] — risolto: `prisma.campionato.findFirst({ where: { nome: { equals: nome, mode: "insensitive" }, annoAgonisticoId } })` prima della creazione, errore `VALIDATION` che suggerisce di collegare il Campionato esistente.
- [x] [Review][Defer] Un errore di `supabase.auth.getUser()` in `page.tsx` viene solo loggato (`console.error`), l'esecuzione prosegue con `user` potenzialmente `undefined` — un Admin/Dirigente colpito da un problema transitorio di autenticazione vedrebbe il messaggio "account non collegato a un profilo Allenatore" invece di un'indicazione che qualcosa è realmente fallito [app/(partite-campionati)/campionati/page.tsx] — deferred, stesso pattern di gestione errori già presente in molte pagine del progetto (solo log, mai un messaggio distinto), severità bassa (scenario raro, nessun dato esposto/corrotto).
- [x] [Review][Defer] `Utente.attivo` non viene mai verificato nella risoluzione dell'Allenatore chiamante — un Allenatore disattivato con sessione ancora valida supera comunque il controllo di possesso [app/(partite-campionati)/campionati/actions.ts] — deferred, stesso trade-off già accettato a livello di intero progetto (Story 1.2/AD-11, `attivo` controllato solo al login): questa storia eredita il gap già esistente in ogni altra funzione di questo tipo, non è la sede per chiuderlo in isolamento.
- [x] [Review][Defer] Doppio round-trip a `supabase.auth.getUser()` per invio (uno dentro `requireRuolo`, uno dentro `verificaPossessoGruppoSeAllenatore`) [app/(partite-campionati)/campionati/actions.ts] — deferred, stessa inefficienza minore già accettata altrove nel progetto (Story 9.12).
- [x] [Review][Defer] `gruppo_campionati` non ha un indice secondario su `campionatoId` da solo (solo l'indice univoco composito su `(gruppoId, campionatoId)`) — stesso limite già presente in `gruppo_allenatori`, non una regressione introdotta qui.
- [x] [Review][Defer] La corrispondenza tra l'`onDelete` implicito di Prisma per la relazione `Campionato → AnnoAgonistico` (non dichiarato esplicitamente in `schema.prisma`) e `ON DELETE RESTRICT` scritto a mano nella migrazione non è stata verificata con uno strumento (`prisma migrate diff`), solo per analogia visiva con la migrazione già in produzione di `Gruppo` (stessa identica forma di relazione) — deferred, rischio basso per analogia diretta con un pattern già validato dal vivo.

## Dev Notes

- **Nuovo modulo `(partite-campionati)`**: `Campionato`/`GruppoCampionato`/(in storie successive) `Partita` sono concetti nuovi non di proprietà di nessun modulo esistente — in particolare **non** di `(gruppi-allenatori)`, che secondo AD-2 possiede la creazione del Gruppo e l'assegnazione Allenatori/Atlete, ma non le nuove entità di questo epic. Stesso principio già seguito per `(configurazione)` (Story 7.1/7.2, modulo aggiunto in corso d'opera per un epic post-hoc). Il modulo legge `Gruppo`/`GruppoAllenatore` via Prisma diretto (permesso: nessuno di questi è protetto da RLS, AD-9), ma non scrive mai direttamente sulle tabelle di `Gruppo` stesso (solo su `Campionato`/`GruppoCampionato`, di sua esclusiva proprietà).
- **Prima volta che `ALLENATORE` gestisce una rotta oggi riservata a `ADMIN`/`DIRIGENTE`**: `/gruppi` (Story 2.2) è **solo** `ADMIN`/`DIRIGENTE` — questa storia introduce deliberatamente un pattern diverso (Allenatore gestore dei propri Campionati, Admin/Dirigente ad accesso ampio su tutti), deciso esplicitamente con l'utente durante l'analisi dell'Epic 10. **Non estendere** per errore l'accesso di `/gruppi` stesso: quella rotta resta invariata, fuori perimetro di questa storia.
- **Autorizzazione a due livelli, non solo `requireRuolo`**: `requireRuolo(["ADMIN","DIRIGENTE","ALLENATORE"])` verifica solo che il chiamante abbia **uno dei tre** Ruoli — non basta da solo per questa storia, perché un Allenatore deve poter agire solo sui **propri** Gruppi mentre Admin/Dirigente devono poter agire su **tutti**. Serve quindi un secondo controllo esplicito (righe Prisma) solo quando il chiamante **non** ha Ruolo Admin/Dirigente — nessuna RLS qui (`Campionato`/`GruppoCampionato`/`Gruppo`/`GruppoAllenatore` non sono protette da RLS, AD-9), quindi il controllo di appartenenza va scritto in Server Action, non delegato al database.
- **`risolviAnnoAgonisticoCorrente()` vs `trovaAnnoAgonisticoCorrente()`**: la Server Action (mutazione) usa **sempre** `risolviAnnoAgonisticoCorrente()` (crea l'Anno Agonistico se non esiste ancora), la pagina (sola lettura) usa **sempre** `trovaAnnoAgonisticoCorrente()` (non crea nulla) — stessa distinzione già stabilita nei Dev Notes di Story 1.6/2.2, **non invertire**.
- **`GruppoAllenatore` già esiste** (Story 2.3, `@@unique([gruppoId, allenatoreId])`) — il controllo "l'Allenatore gestisce questo Gruppo" è un `findUnique` su quella chiave composita già presente, nessuna nuova tabella/colonna necessaria per questo controllo.
- **File NON da toccare**: `app/(gruppi-allenatori)/gruppi/*` (Gruppo/GruppoAllenatore/GruppoAtleta restano di esclusiva proprietà di quel modulo, AD-2 — questa storia li **legge** soltanto via Prisma diretto), `lib/anno-agonistico/*` (riusato invariato), `prisma/migrations/2026072*` esistenti.

### Project Structure Notes

- File nuovi: `prisma/migrations/<timestamp>_add_campionato/migration.sql`, `app/(partite-campionati)/campionati/{page.tsx, actions.ts, actions.test.ts, NuovoCampionatoForm.tsx, CollegaCampionatoForm.tsx, campionati.module.css}`.
- File modificati: `prisma/schema.prisma` (nuovi model `Campionato`/`GruppoCampionato`, nuovi campi di relazione inversa su `AnnoAgonistico`/`Gruppo`), `lib/auth/route-guard.ts` (nuova voce `PROTECTED_ROUTES`), `lib/auth/route-guard.test.ts` (nuovo test).
- Nessuna modifica a `Partita` in questa storia (arriva con la Story 10.2, che dipende da questa per il collegamento Gruppo↔Campionato già stabilito qui).
- `ARCHITECTURE-SPINE.md` non elenca ancora un modulo `(partite-campionati)` nella sua Structural Seed (documento scritto prima dell'aggiunta dell'Epic 10) — stessa situazione già affrontata per `(configurazione)` in Story 7.1, nessun aggiornamento formale del documento richiesto da questa storia.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 10: Gestione Partite e Campionati — Story 10.1, decisioni prese il 2026-07-28]
- [Source: app/(gruppi-allenatori)/gruppi/actions.ts — creaGruppo (risolviAnnoAgonisticoCorrente, righe 18-60), assegnaAllenatore (pattern P2002-come-successo, righe 64-98)]
- [Source: app/(gruppi-allenatori)/gruppi/page.tsx — pattern pagina Gruppi/Anno Agonistico corrente, righe 14-54]
- [Source: app/(dati-atleta)/dati-fisici/page.tsx — pattern di risoluzione "sono un Allenatore?" (prisma.allenatore.findFirst) e "quali Gruppi gestisco" (Gruppo.allenatori.some), righe 98-114 e 146-159]
- [Source: lib/anno-agonistico/index.ts — trovaAnnoAgonisticoCorrente/risolviAnnoAgonisticoCorrente, distinzione lettura/scrittura]
- [Source: lib/ruoli.ts — parseRuoli, per il controllo a due livelli Admin/Dirigente vs Allenatore]
- [Source: prisma/schema.prisma righe 173-184 (AnnoAgonistico), 347-360 (Gruppo), 387-397 (GruppoAllenatore, chiave composita da riusare per il controllo di possesso)]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- `npx prisma migrate deploy` tentato in locale: `P1001: Can't reach database server at 127.0.0.1:54322` — nessuna istanza Supabase locale in esecuzione in questa sessione (verificato esplicitamente, non assunto). `npx prisma validate` (schema valido) e `npx prisma generate` (Client rigenerato) eseguiti al suo posto.

### Completion Notes List

- Task 1: nuovi model `Campionato`/`GruppoCampionato` in `prisma/schema.prisma` (non protetti da RLS, AD-9), migrazione scritta a mano `20260728010000_add_campionato` (`ON DELETE RESTRICT` verso `anni_agonistici` confermato confrontando le migrazioni esistenti di `Gruppo`/`GruppoAtleta`, `ON DELETE CASCADE` per la giunzione confermato confrontando `gruppo_allenatori`). Schema validato, Prisma Client rigenerato; migrazione non applicata dal vivo (nessun Supabase locale disponibile).
- Task 2: `/campionati` aggiunta a `PROTECTED_ROUTES` (ADMIN, DIRIGENTE, ALLENATORE) — prima rotta di gestione con ALLENATORE tra i Ruoli ammessi.
- Task 3: `creaCampionato`/`collegaCampionatoEsistente` — autorizzazione a due livelli: `requireRuolo` grezzo, poi un controllo esplicito lato Prisma (`GruppoAllenatore.findUnique` sulla chiave composita già esistente) solo per chi non ha Ruolo ADMIN/DIRIGENTE. 14 nuovi test.
- Task 4: `page.tsx` risolve Admin/Dirigente (accesso ampio) vs solo Allenatore (filtro ai propri Gruppi) con lo stesso pattern già usato in `dati-fisici/page.tsx`. **Deviazione documentata** dal Dev Notes originale della storia: `gruppoId` passato come campo `hidden` (non legato via `.bind()`) — riusa il pattern più vicino e consistente già stabilito in `GruppoRow.tsx` (Story 2.2/2.3) per "form di assegnazione dentro una riga legata a un Gruppo esplicito", invece del discriminatore `.bind()` di Story 9.12 (pensato per un'identità ambigua da risolvere dalla sessione, non applicabile qui). Nessun impatto sulla sicurezza: l'autorizzazione resta comunque sempre verificata lato server.
- Nessun test di rendering introdotto per i nuovi Client Component, coerente con la convenzione già stabilita nel progetto.
- Task 5: 634/634 test passati, `tsc --noEmit` pulito, ESLint pulito sui file di questa storia (7 problemi residui nel progetto sono tutti pre-esistenti, in file non toccati qui).
- Code review (2026-07-28/29): Acceptance Auditor 0 violazioni sui 5 AC. 0 decision-needed. 6 patch applicati: `risolviAutorizzazioneGruppo` (rinominata da `verificaPossessoGruppoSeAllenatore`) ora verifica **prima di tutto** che il Gruppo esista e appartenga alla stagione corrente per **ogni** chiamante (non solo l'Allenatore) — risolve in un colpo solo sia "nessun controllo di esistenza per Admin/Dirigente" sia "possesso Allenatore non scoped alla stagione" (un Gruppo di una stagione passata ha sempre un id diverso, mai riportato tra stagioni); l'intera funzione avvolta in `try/catch`; `creaCampionato` ora usa `prisma.$transaction` per le due scritture (precedente corretto trovato: `wizard-nuova-stagione/actions.ts`, non la Story 1.1 citata in origine); nuovo controllo di stagione anche su `campionatoId` in `collegaCampionatoEsistente`; nuovo controllo di nome duplicato case-insensitive nella stessa stagione in `creaCampionato`; test mancanti aggiunti per `collegaCampionatoEsistente`. 5 defer (errore `getUser()` in `page.tsx` solo loggato, `Utente.attivo` non verificato, doppio round-trip `getUser()`, indice secondario mancante su `gruppo_campionati.campionatoId`, `onDelete` non verificato con `prisma migrate diff`). 3 scartati come falsi positivi/già conformi al precedente (coercizione `formData`/File, tabella vuota senza Anno Agonistico — coincide col comportamento già stabilito in `/gruppi`, checklist Task 5 non spuntata nonostante il lavoro fatto). Regressione completa dopo i fix: 642/642 test, `tsc --noEmit` pulito, ESLint pulito.

### File List

- `prisma/schema.prisma` (modificato — nuovi model `Campionato`/`GruppoCampionato`, nuovi campi di relazione inversa su `AnnoAgonistico`/`Gruppo`)
- `prisma/migrations/20260728010000_add_campionato/migration.sql` (nuovo)
- `lib/auth/route-guard.ts` (modificato — nuova voce `PROTECTED_ROUTES` per `/campionati`)
- `lib/auth/route-guard.test.ts` (modificato — nuovi test per `/campionati`)
- `app/(partite-campionati)/campionati/actions.ts` (nuovo)
- `app/(partite-campionati)/campionati/actions.test.ts` (nuovo)
- `app/(partite-campionati)/campionati/page.tsx` (nuovo)
- `app/(partite-campionati)/campionati/NuovoCampionatoForm.tsx` (nuovo)
- `app/(partite-campionati)/campionati/CollegaCampionatoForm.tsx` (nuovo)
- `app/(partite-campionati)/campionati/campionati.module.css` (nuovo)

## Change Log

- 2026-07-28: Implementata Story 10.1 — prima storia dell'Epic 10 (Gestione Partite e Campionati). Nuove entità `Campionato`/`GruppoCampionato` (non RLS, FK diretta ad `AnnoAgonistico`), nuovo modulo `(partite-campionati)`, nuova rotta `/campionati` (prima volta che ALLENATORE gestisce una rotta oltre a vederla), autorizzazione a due livelli (Admin/Dirigente ampio, Allenatore scoped al proprio Gruppo via `GruppoAllenatore`). 634/634 test passati, 0 errori tsc/eslint sui file di questa storia. Migrazione non applicata localmente (nessuna istanza Supabase disponibile in questa sessione) — verifica dal vivo demandata all'utente dopo il deploy.
- 2026-07-29: Code review chiusa — 6 patch applicati (transazione Prisma per creare Campionato+collegamento, controllo di stagione unificato per Gruppo/Campionato applicato a tutti i Ruoli, gestione eccezioni nell'autorizzazione, controllo nome duplicato, test mancanti), 5 elementi deferiti, 0 decision-needed. 642/642 test passati.
