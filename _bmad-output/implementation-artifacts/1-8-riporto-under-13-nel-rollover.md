---
baseline_commit: NO_VCS
---

# Story 1.8: Riporto Under 13 nel rollover

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin, Dirigente o Segreteria,
I want che le Atlete Under 13 assenti dall'export vengano comunque riportate nella nuova stagione,
so that non perdo atlete valide per una limitazione dell'export federale, ma posso comunque escluderle se serve.

## Acceptance Criteria

1. **Given** un'Atleta Under 13 era iscritta nell'Anno Agonistico precedente (Iscrizione attiva, Story 1.6) **e** non compare tra le righe del nuovo export (per Codice Fiscale), **when** eseguo l'import per la nuova stagione (Story 1.3/1.7), **then** viene creata automaticamente una nuova `Iscrizione` per quell'Atleta collegata all'Anno Agonistico corrente (find-or-create, come già in Story 1.6) — "riportata" di default, nessuna azione manuale richiesta per crearla.
2. **Given** un'Atleta non è classificata Under 13 (`categoria` non contiene "Under 13"/"U13") oppure non aveva un'Iscrizione attiva nell'Anno Agonistico precedente, **when** eseguo lo stesso import, **then** **non** viene riportata automaticamente — il riporto si applica solo alle Under 13 realmente assenti dall'export che erano iscritte l'anno prima.
3. **Given** il riepilogo dell'import termina, **then** include anche il conteggio delle Atlete riportate automaticamente (`riportate`), oltre a `create`/`aggiornate`/`scartate` già esistenti (Story 1.3).
4. **Given** un'Iscrizione (riportata automaticamente o confermata manualmente, Story 1.6) risulta non più corretta, **when** un Admin, Dirigente o Segreteria la esclude dalla pagina di conferma iscrizioni, **then** l'Iscrizione viene marcata non attiva (non eliminata — nessun record storico perso) e l'Atleta torna a comparire come "non iscritta" per quell'Anno Agonistico.
5. **Given** non esiste ancora nessun Anno Agonistico precedente a sistema (prima stagione in assoluto), **when** eseguo l'import, **then** nessun riporto viene tentato — comportamento equivalente ad AC #2, nessun errore.

## Tasks / Subtasks

- [x] Task 1: Estendere il modello `Iscrizione` con lo stato attivo/escluso (AC: #4)
  - [x] `prisma/schema.prisma`: aggiungere `attiva Boolean @default(true)` a `Iscrizione` — rappresenta se l'iscrizione (riportata automaticamente o confermata manualmente) è ancora valida. **Non** una nuova tabella, **non** un `DELETE`: Story 1.6 (poi confermato in code review) ha deliberatamente rimosso ogni policy/GRANT `DELETE` su `iscrizioni` — riaprire quella decisione non è necessario, l'esclusione è un `UPDATE` (già coperto dalla policy RLS `admin_dirigente_segreteria_update` esistente, nessuna nuova migrazione RLS richiesta oltre alla colonna).
  - [x] Migrazione: `ALTER TABLE "iscrizioni" ADD COLUMN "attiva" BOOLEAN NOT NULL DEFAULT true` — sicuro per le righe esistenti (Story 1.6), nessuna richiede backfill manuale.
- [x] Task 2: Nuova funzione `trovaAnnoAgonisticoPrecedente` in `lib/anno-agonistico/` (AC: #1, #5)
  - [x] `trovaAnnoAgonisticoPrecedente(annoCorrente)`: sola lettura (Prisma diretto, come le altre funzioni del modulo, Story 1.6) — cerca l'`AnnoAgonistico` con `dataFine` più recente **tra quelli con `dataFine` antecedente alla `dataInizio` di quello corrente** (`findFirst` con `where: { dataFine: { lt: annoCorrente.dataInizio } }`, `orderBy: { dataFine: "desc" }`). Restituisce `null` se non esiste (AC #5, prima stagione in assoluto).
  - [x] Esportare da `lib/anno-agonistico/index.ts`.
- [x] Task 3: Estendere `lib/db-rls/atleta.ts` e `lib/db-rls/iscrizione.ts` (AC: #1, #2, #4)
  - [x] `lib/db-rls/atleta.ts`: estendere `AtletaElenco`/`elencaAtlete` per includere anche `categoria` nella `select` — serve per riconoscere le Under 13 candidate al riporto. Cambio additivo: `app/(iscrizioni)/conferma-iscrizioni/page.tsx` (Story 1.6), che già usa `elencaAtlete`, non deve rompersi (ignora semplicemente il campo in più).
  - [x] `lib/db-rls/iscrizione.ts`: `elencaIscrizioniPerAnno` deve filtrare `where("attiva", true)` — un'Atleta con Iscrizione esclusa (Task 4) non deve più risultare "iscritta" né per la pagina di conferma (Story 1.6) né per il riporto dell'anno successivo (AC #2, "non aveva un'Iscrizione attiva"). Modifica al comportamento esistente, non solo un'aggiunta — verificare che i test di Story 1.6 vengano aggiornati di conseguenza.
  - [x] `lib/db-rls/iscrizione.ts`: nuova funzione `disattivaIscrizione(supabase, id)` — `UPDATE iscrizioni SET attiva = false WHERE id = ...`, con lo stesso controllo "riga effettivamente modificata" già usato in `aggiornaCertificato`/`aggiornaAtleta` (RLS-denial o id inesistente non devono essere riportati come successo).
- [x] Task 4: Logica di riporto integrata in `importaAtlete` (AC: #1, #2, #3, #5)
  - [x] `app/(onboarding-import)/import-atlete/actions.ts` (file esistente, **non** ricreare, già esteso in Story 1.7 col merge certificato): dopo il ciclo esistente sulle righe dell'export, aggiungere il passaggio di riporto — **non** un nuovo modulo/route: stesso principio già applicato in Story 1.7 per FR-22 (la mappa cartelle di ARCHITECTURE-SPINE.md assegna concettualmente FR-22/FR-23 a "Rollover-Stagionale", ma Story 1.7 ha implementato FR-22 direttamente dentro `import-atlete` perché non c'è una UI/route separata che lo triggera — stesso ragionamento vale qui, il riporto è innescato dall'import stesso, non da un'azione utente distinta).
  - [x] Algoritmo: risolvere `annoCorrente` (`risolviAnnoAgonisticoCorrente()`, Story 1.6/1.8-riuso, find-or-create — qui l'import stesso può essere il primo trigger della nuova stagione); risolvere `annoPrecedente` (`trovaAnnoAgonisticoPrecedente(annoCorrente)`, Task 2) — se `null`, saltare l'intero passaggio di riporto (AC #5); altrimenti leggere gli `atletaId` iscritti (attivi) per `annoPrecedente` (`elencaIscrizioniPerAnno`, Task 3, già filtrato `attiva`); leggere tutte le Atlete (`elencaAtlete`, Task 3, ora con `categoria`); filtrare le candidate: `atletaIdIscrittiPrecedente.has(atleta.id) && /under\s*13|u\s*13/i.test(atleta.categoria ?? "") && !codiciFiscaliImportati.has(atleta.codiceFiscale)` (`codiciFiscaliImportati` = insieme dei Codici Fiscali normalizzati presenti in `risultato.righe`, già disponibili dal ciclo esistente); per ognuna, chiamare `inserisciIscrizione(supabase, atleta.id, annoCorrente.id)` (Story 1.6, già idempotente sul vincolo univoco — nessun controllo aggiuntivo di duplicato necessario) e incrementare `riportate`.
  - [x] **Nota sul pattern "Under 13"**: nessun campione reale del valore esatto della colonna `Categ.` per le Under 13 è disponibile nei documenti di progetto (solo "Under 16" compare come esempio nei test di Story 1.3) — la regex `/under\s*13|u\s*13/i` è un'interpretazione ragionevole ma non verificata contro un export reale. Se in fase di sviluppo emergesse un formato diverso (es. abbreviazioni societarie specifiche), aggiornare la regex e documentarlo nel Debug Log.
  - [x] Estendere `ImportaAtleteState` con `riportate: number` (AC #3) — stesso pattern di `create`/`aggiornate`, non una nuova forma di risposta.
- [x] Task 5: Esclusione manuale dalla pagina di conferma iscrizioni (AC: #4)
  - [x] `app/(iscrizioni)/conferma-iscrizioni/actions.ts` (file esistente, **non** ricreare, Story 1.6, rinominato in code review): nuova Server Action `escludiIscrizione(_prevState, iscrizioneId)` — `requireRuolo(["ADMIN", "DIRIGENTE", "SEGRETERIA"])` (tutti e tre, a differenza di `confermaIscrizione` che resta solo Segreteria — FR-23 nomina esplicitamente tutti e tre gli attori per l'esclusione, diversamente da FR-17 per la conferma). Chiama `disattivaIscrizione` (Task 3), stessa gestione d'errore fail-closed e `revalidatePath("/conferma-iscrizioni")` già presenti nel file.
  - [x] `lib/auth/route-guard.ts`: allargare l'entry `/conferma-iscrizioni` da `["SEGRETERIA"]` a `["ADMIN", "DIRIGENTE", "SEGRETERIA"]` — necessario perché Admin/Dirigente devono poter raggiungere la pagina per escludere un'Iscrizione, anche se il bottone "Conferma" resta funzionalmente riservato a Segreteria dal controllo `requireRuolo` dentro `confermaIscrizione` stesso (difesa in profondità già a livello di Server Action, coerente col pattern AD-4 "RLS ampia, controllo applicativo più stretto").
  - [x] `app/(iscrizioni)/conferma-iscrizioni/page.tsx`: `elencaIscrizioniPerAnno` deve restituire anche l'id della riga `Iscrizione` (non solo l'`atletaId`) — la UI ha bisogno dell'id per chiamare `escludiIscrizione`. Cambiare la forma del valore restituito (es. `{ atletaId: string; id: string }[]`) e adattare la costruzione della mappa passata a `IscrizioneRow`.
  - [x] `app/(iscrizioni)/conferma-iscrizioni/IscrizioneRow.tsx`: per una riga già iscritta, mostrare — oltre al testo "Iscritta" — un bottone "Escludi" che chiama `escludiIscrizione`, stesso pattern (`useTransition`, gestione errore) già usato per "Conferma".
  - [x] **Limite noto, accettato per questa storia**: ri-confermare (bottone "Conferma") un'Atleta la cui Iscrizione è stata esclusa (`attiva: false`) non la riattiva — `inserisciIscrizione` tratta il vincolo univoco `(atletaId, annoAgonisticoId)` già esistente come successo idempotente (Story 1.6) senza toccare `attiva`, quindi il click risulterebbe silenzioso senza riattivare la riga. Nessun AC di questa storia richiede la riattivazione; documentare questo limite nel Debug Log, non risolverlo qui (fuori scope, coerente con NFR6).
- [x] Task 6: Test (Vitest)
  - [x] `lib/anno-agonistico/trova-anno-agonistico-precedente.test.ts`: trova l'anno immediatamente precedente, `null` se non esiste nessuno.
  - [x] `lib/db-rls/iscrizione.test.ts`: `elencaIscrizioniPerAnno` filtra `attiva=true` (aggiornare i test esistenti di conseguenza); `disattivaIscrizione` (successo, nessuna riga modificata, errore di query).
  - [x] `lib/db-rls/atleta.test.ts`: `elencaAtlete` include `categoria` nel payload/risultato.
  - [x] `import-atlete/actions.test.ts`: Under 13 iscritta l'anno precedente e assente dall'export → riportata (nuova Iscrizione, conteggio `riportate` incrementato); Under 13 presente nell'export → non riportata (già gestita dal ciclo normale); Atleta non Under 13 assente dall'export → non riportata; nessuna Iscrizione l'anno precedente → non riportata; nessun Anno Agonistico precedente → nessun riporto tentato, nessun errore (AC #5).
  - [x] `conferma-iscrizioni/actions.test.ts`: `escludiIscrizione` — `FORBIDDEN` per Ruoli diversi da Admin/Dirigente/Segreteria, successo (chiama `disattivaIscrizione`), errore fail-closed.
  - [x] `lib/auth/route-guard.test.ts`: `/conferma-iscrizioni` ora ammette anche Admin e Dirigente, non solo Segreteria.

### Review Findings

Code review 2026-07-17 — 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor).

- [x] [Review][Decision] Un'Iscrizione esclusa non può mai più essere riattivata attraverso l'app (vicolo cieco permanente) — `inserisciIscrizione` tratta il conflitto 23505 come successo idempotente senza mai riportare `attiva` a `true`; il vincolo univoco `@@unique([atletaId, annoAgonisticoId])` non è scoped su `attiva`. Qualunque tentativo futuro di re-iscrivere quell'Atleta per quell'Anno Agonistico — sia via `confermaIscrizione` sia via un futuro riporto automatico — urta la riga esclusa esistente e viene silenziosamente ignorato. Nessun percorso UI di recupero. Corroborato indipendentemente da Blind Hunter ed Edge Case Hunter, con dettaglio maggiore di quanto originariamente colto nelle Dev Notes (che menzionavano solo il caso "ri-conferma via bottone").

- [x] [Review][Patch] Il conteggio `riportate` può essere impreciso — `inserisciIscrizione` non segnala se ha davvero inserito/riattivato una riga [lib/db-rls/iscrizione.ts, app/(onboarding-import)/import-atlete/actions.ts]
- [x] [Review][Patch] Il bottone "Conferma" viene mostrato anche ad Admin/Dirigente che ora raggiungono `/conferma-iscrizioni` ma vengono respinti da `requireRuolo("SEGRETERIA")` [app/(iscrizioni)/conferma-iscrizioni/page.tsx, IscrizioneRow.tsx]
- [x] [Review][Patch] Regex Under 13 priva di confini di parola e tolleranza per il trattino (falsi positivi/negativi) [app/(onboarding-import)/import-atlete/actions.ts:PATTERN_UNDER_13]
- [x] [Review][Patch] Commento nella migrazione `20260717120000_iscrizioni_add_attiva` afferma che la policy UPDATE esiste già, falso fino alla migrazione successiva [prisma/migrations/20260717120000_iscrizioni_add_attiva/migration.sql]

- [x] [Review][Defer] Policy RLS UPDATE su `iscrizioni` non è column-scoped [prisma/migrations/20260717130000_iscrizioni_restore_update_for_esclusione/migration.sql] — deferred, pattern preesistente identico su tutte le tabelle RLS del progetto (`atlete`, `certificati_medici`), non una regressione di questa storia
- [x] [Review][Defer] Nessuna paginazione su `elencaAtlete`/`elencaIscrizioniPerAnno` [lib/db-rls/atleta.ts, lib/db-rls/iscrizione.ts] — deferred, pattern preesistente da Story 1.6, rischio basso data la scala del progetto
- [x] [Review][Defer] Nessuna transazione attorno al ciclo di import + riporto, conteggi parziali persi su fallimento a metà [app/(onboarding-import)/import-atlete/actions.ts] — deferred, pattern preesistente identico dal ciclo principale (Story 1.3/1.7)
- [x] [Review][Defer] Euristica di riporto strutturalmente imprecisa (categoria non storicizzata per stagione, righe scartate non escluse da `codiciFiscaliImportati`, solo la stagione immediatamente precedente) [app/(onboarding-import)/import-atlete/actions.ts] — deferred, limiti intrinseci al design già accettato nelle Dev Notes
- [x] [Review][Defer] `AnnoAgonistico` senza vincolo CHECK a livello DB su `dataInizio < dataFine` [prisma/schema.prisma] — deferred, preesistente da Story 1.6

Dismessi come rumore/falsi positivi/già gestiti (5): mismatch di normalizzazione CF tra `codiciFiscaliImportati` ed `elencaAtlete` (falso positivo, AD-10 + normalizzazione in parser.ts già lo esclude); tie-break non deterministico in `trovaAnnoAgonisticoPrecedente` (strutturalmente impossibile, unico writer di `AnnoAgonistico` usa sempre confini canonici Ago1-Giu30); confine adiacente `dataFine == dataInizio` (strutturalmente impossibile, salto di un mese tra stagioni); bottone "Escludi" nascosto fino al reload dopo una Conferma nella stessa sessione (già documentato e accettato nelle Dev Notes/Completion Notes, tripla corroborazione conferma solo la correttezza della caratterizzazione già nota); osservazione dell'Acceptance Auditor sulla premessa del Task 1 riguardo alla migrazione RLS (il gap reale che descrive è lo stesso già scoperto e corretto dal vivo, documentato nel Debug Log).

## Dev Notes

- **Continuità dalle Story precedenti — cosa riusare:**
  - `risolviAnnoAgonisticoCorrente`/`trovaAnnoAgonisticoCorrente` (Story 1.6, `lib/anno-agonistico/`) — questa storia ne è il **secondo consumatore reale** dopo la pagina di conferma iscrizioni (Story 2.2 lo sarà in futuro per Gruppo, come già annotato nelle Dev Notes di Story 1.6).
  - `inserisciIscrizione` (Story 1.6, rinominata da `confermaIscrizione` in code review) — già idempotente sul vincolo univoco `(atletaId, annoAgonisticoId)`, riusata as-is per il riporto, nessuna nuova funzione di creazione.
  - `elencaAtlete`, `elencaIscrizioniPerAnno` (Story 1.6) — entrambe estese (non ricreate) in questa storia.
  - Convenzione errori `{ error: { code, message } }`, pattern try/catch fail-closed, verifica "riga effettivamente modificata" dopo un `UPDATE` (Story 1.3 review, riapplicata in ogni storia successiva).
- **Perché l'esclusione è un `UPDATE` (`attiva=false`) e non un `DELETE`**: Story 1.6 ha deliberatamente rimosso ogni policy/GRANT `DELETE` su `iscrizioni` in code review (principio del minimo privilegio, nessun AC lo richiedeva). Riaprire quella decisione per questa storia introdurrebbe una superficie di scrittura più ampia di quanto serva — l'AC #4 di questa storia parla esplicitamente di "esclusione", non di cancellazione, ed è naturalmente modellabile come stato (`attiva`), che preserva anche una traccia storica di cosa è stato riportato/escluso. Se in fase di dev-story questa lettura risultasse sbagliata, fermarsi e chiedere prima di reintrodurre `DELETE`.
- **Perché il riporto vive dentro `import-atlete/actions.ts` e non in un nuovo `app/(rollover-stagionale)/`**: la struttura di cartelle di ARCHITECTURE-SPINE.md assegna concettualmente FR-22/FR-23 a un modulo "Rollover-Stagionale", ma Story 1.7 (FR-22) ha già stabilito il precedente di implementare quella logica direttamente dentro l'azione di import esistente, perché non esiste (né questa storia introduce) un trigger UI separato — sia il merge certificato sia il riporto Under 13 avvengono "quando eseguo l'import", non tramite un'azione utente dedicata. Seguire lo stesso precedente qui, non creare una nuova route.
- **Limite noto sul riconoscimento "Under 13" (vedi Task 4)**: `categoria` è testo libero importato dall'export federale (Story 1.3) — questa storia usa un pattern regex ragionevole ma non verificato contro un campione reale di export con Under 13. Se il formato reale differisce, va corretto in fase di sviluppo (non è un blocco, ma va documentato).
- **Limite noto sulla ri-attivazione (vedi Task 5)**: nessun percorso per riattivare un'Iscrizione esclusa tramite il bottone "Conferma" esistente — `inserisciIscrizione` non distingue "non esiste ancora" da "esiste ma è esclusa". Fuori scope per questa storia (nessun AC la richiede), ma da annotare esplicitamente come Defer per non sorprendere una storia futura.
- **`categoria` diventa un campo letto anche fuori da Onboarding-Import**: AD-10 riserva a Onboarding-Import la **scrittura** dei campi identitari di Atleta (incluso `categoria`), non la lettura — `elencaAtlete` (già usata da Story 1.6 in un modulo diverso, `(iscrizioni)`) che ora legge anche `categoria` resta una lettura condivisa, non una violazione di AD-10.
- **Scala (NFR5):** fino a ~200 Atlete — leggere l'intero elenco Atlete una volta per il riporto (oltre al ciclo per-riga già esistente dell'import) resta economico a questa scala, coerente con le altre scelte "niente batching" già accettate nelle Story precedenti.

### Project Structure Notes

- File nuovi attesi: `lib/anno-agonistico/trova-anno-agonistico-precedente.ts` e relativo test.
- File esistenti da estendere (non ricreare): `prisma/schema.prisma` (campo `attiva` su `Iscrizione`), `lib/anno-agonistico/index.ts`, `lib/db-rls/atleta.ts` (+test), `lib/db-rls/iscrizione.ts` (+test), `app/(onboarding-import)/import-atlete/actions.ts` (+test), `app/(iscrizioni)/conferma-iscrizioni/actions.ts` (+test), `page.tsx`, `IscrizioneRow.tsx`, `lib/auth/route-guard.ts` (+test).
- Nessuna modifica a `proxy.ts`, `lib/auth-admin/*`, `lib/matching-codice-fiscale/*`, ai modelli `Utente`/`Ruolo`/`UtenteRuolo`/`Allenatore`/`GenitoreAtleta`/`AnnoAgonistico`/`CertificatoMedico`. Nessun nuovo modulo/route `app/(rollover-stagionale)/`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1: Accesso, Popolamento e Iscrizioni / Story 1.8]
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-23, NFR5, Glossario ("Le atlete Under 13 vanno riportate di default...")]
- [Source: _bmad-output/planning-artifacts/briefs/brief-societa-manager-2026-07-13/addendum.md#Categ. — l'export reale copre tutte le categorie insieme, incluse le Under 13]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-2, AD-4, AD-8, AD-9, AD-10, Structural Seed (app/(rollover-stagionale)/ - FR-22, FR-23)]
- [Source: _bmad-output/implementation-artifacts/1-6-conferma-iscrizione.md — modello Iscrizione esistente, inserisciIscrizione idempotente, lib/anno-agonistico/, nessun DELETE su iscrizioni (decisione da non riaprire)]
- [Source: _bmad-output/implementation-artifacts/1-7-merge-certificato-in-import.md — precedente di implementare la logica "Rollover-Stagionale" (FR-22) dentro import-atlete/actions.ts invece di una nuova route, stesso ragionamento riusato qui per FR-23]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Migrazione shadow-DB**: stesso workaround ormai consolidato (Story 1.3-1.7) — migrazioni scritte a mano e applicate con `prisma migrate deploy`, verificate con `prisma migrate status` (nessun drift).
- **Gap scoperto in fase di dev-story (AC #3)**: il Task 4 estendeva `ImportaAtleteState` con `riportate`, ma `import-atlete/page.tsx` non lo mostrava nel riepilogo — l'AC richiede esplicitamente che il conteggio sia incluso. Corretto aggiungendo la riga `Atlete riportate (Under 13): {state.riportate}`, stesso pattern di `create`/`aggiornate`.
- **Bug reale scoperto in verifica dal vivo (non in unit test)**: il click su "Escludi" falliva con `permission denied for table iscrizioni`. Causa: la code review di Story 1.6 aveva rimosso policy e GRANT `UPDATE` su `iscrizioni` perché nessun AC di quella storia li usava (principio del minimo privilegio); il Task 1 di questa storia ha aggiunto la colonna `attiva` ma nessuna migrazione ha ripristinato `UPDATE`, pur essendo `disattivaIscrizione` (Task 3) il primo vero utilizzo di un UPDATE su questa tabella dopo la rimozione. I mock unitari non l'hanno rilevato perché non validano i privilegi RLS reali. Risolto con una nuova migrazione (`20260717130000_iscrizioni_restore_update_for_esclusione`) che ripristina la stessa policy/GRANT già presenti su `certificati_medici` (Story 1.7). Riverificato dal vivo con esito positivo.
- **Verifica end-to-end reale eseguita** (Playwright, file `.xlsx` generato in memoria con `exceljs`, contro il backend Supabase locale non mockato): seed diretto via SQL di un Anno Agonistico precedente, un'Atleta "Under 13" con Iscrizione attiva in quell'anno; import di un file export contenente solo un'altra Atleta (CF diverso) → riepilogo mostra "Atlete riportate (Under 13): 1" (AC #3), confermato via query diretta che la nuova `Iscrizione` punta all'Anno Agonistico corrente risolto da `risolviAnnoAgonisticoCorrente` (AC #1). Navigazione su `/conferma-iscrizioni` come Admin (route ora allargata) → riga dell'Atleta riportata mostra "Iscritta" + bottone "Escludi" (AC #4); click su "Escludi" → dopo il fix RLS, transizione client a "Conferma" e, dopo ricaricamento pagina, stato confermato anche lato server (`attiva=false` verificato via query diretta). Dati di test ripuliti dal DB al termine, Playwright disinstallato. AC #5 (nessun Anno Agonistico precedente) verificato solo via unit test — un test dal vivo avrebbe richiesto svuotare `anni_agonistici`, distruttivo per l'istanza locale condivisa.
- Verifiche eseguite e passate: `npx vitest run` (165/165 test), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun errore), `npm run build` (build completata).
- **Code review (2026-07-17)**: 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor). 1 `decision-needed`, 4 `patch`, 5 `defer`, 5 scartati come rumore/falsi positivi/già gestiti. Decisione risolta applicando l'opzione raccomandata: `inserisciIscrizione` ora riattiva (`attiva:true`) una riga esclusa invece di limitarsi a ignorare il conflitto univoco, chiudendo il vicolo cieco "esclusione permanente" segnalato indipendentemente da 2 dei 3 layer — riverificato dal vivo contro Supabase locale reale (insert → 23505 → update di riattivazione → riga confermata `attiva=true` via query diretta, poi dati di test ripuliti). Le 4 patch applicate: (1) `inserisciIscrizione` restituisce ora `boolean` (vero solo se una riga è stata davvero creata/riattivata), `riportate` incrementato solo in quel caso; (2) `page.tsx` calcola `puoConfermare` (Ruolo Segreteria) e lo passa a `IscrizioneRow`, che nasconde il bottone "Conferma" per Admin/Dirigente (mostra "Non iscritta" invece di un bottone che fallirebbe sempre); (3) regex Under 13 resa più robusta con confini di parola e tolleranza per il trattino (`/\bunder[\s-]*13\b|\bu[\s-]*13\b/i`); (4) commento fattualmente errato nella migrazione `20260717120000` corretto (non modifica lo schema, solo il commento — verificato che `prisma migrate status`/`deploy` non segnalano drift). Suite completa riverificata: 168/168 test, typecheck/lint/build verdi.

### Completion Notes List

- Implementati Task 1-6: colonna `Iscrizione.attiva` (esclusione senza riaprire il `DELETE` rimosso in Story 1.6), `trovaAnnoAgonisticoPrecedente` (riuso di `lib/anno-agonistico/`, Story 1.6/1.8), `elencaAtlete` esteso con `categoria`, `elencaIscrizioniPerAnno` filtrato su `attiva=true` e con forma di ritorno estesa a `{ id, atletaId }[]`, `disattivaIscrizione`, logica di riporto Under 13 integrata in `importaAtlete` (nessun nuovo modulo/route, stesso precedente di Story 1.7 per FR-22), Server Action `escludiIscrizione` (Admin/Dirigente/Segreteria, a differenza di `confermaIscrizione` riservata a Segreteria), route `/conferma-iscrizioni` allargata, bottone "Escludi" in `IscrizioneRow.tsx`.
- **Post-review (risolto)**: il limite "ri-confermare un'Iscrizione esclusa non la riattiva", inizialmente accettato come fuori scope, è stato riaperto in code review dopo essere stato corroborato indipendentemente da due reviewer con un impatto più ampio del previsto (bloccava anche i futuri riporti automatici, non solo il bottone "Conferma") — ora risolto, vedi Debug Log.
- **Limite noto, accettato per questa storia**: dopo una "Conferma" riuscita in sessione, il bottone "Escludi" compare solo dopo un ricaricamento della pagina — `confermaIscrizione` non restituisce l'id della riga `Iscrizione` creata, e l'istanza già montata di `IscrizioneRow` non si risincronizza automaticamente dalle nuove props dopo `revalidatePath`. Nessun AC lo richiede; ri-confermato in code review come limite noto correttamente caratterizzato (tripla corroborazione), non riaperto.
- Pattern regex "Under 13" reso più robusto in code review (confini di parola, tolleranza trattino); resta comunque non verificato contro un campione reale di export con Under 13.
- Tre problemi reali scoperti e risolti tra dev-story e code review, nessuno rilevato dai test unitari a mock: riepilogo import mancante di `riportate` (AC #3), permessi RLS `UPDATE` mancanti su `iscrizioni` (AC #4), esclusione-senza-possibilità-di-riattivazione (vicolo cieco) — vedi Debug Log.

### File List

**Creati:**
- `lib/anno-agonistico/trova-anno-agonistico-precedente.ts`
- `lib/anno-agonistico/trova-anno-agonistico-precedente.test.ts`
- `prisma/migrations/20260717120000_iscrizioni_add_attiva/migration.sql`
- `prisma/migrations/20260717130000_iscrizioni_restore_update_for_esclusione/migration.sql`

**Modificati:**
- `prisma/schema.prisma` (`Iscrizione.attiva Boolean @default(true)`)
- `lib/anno-agonistico/index.ts` (esporta anche `trovaAnnoAgonisticoPrecedente`)
- `lib/db-rls/atleta.ts` (`AtletaElenco`/`elencaAtlete` includono `categoria`)
- `lib/db-rls/atleta.test.ts` (test aggiornato per `categoria`)
- `lib/db-rls/iscrizione.ts` (`elencaIscrizioniPerAnno` filtra `attiva=true` e restituisce `{ id, atletaId }[]`; nuova `disattivaIscrizione`)
- `lib/db-rls/iscrizione.test.ts` (test riscritti per la nuova forma di ritorno; nuovi test per `disattivaIscrizione`)
- `app/(onboarding-import)/import-atlete/actions.ts` (logica di riporto Under 13 integrata; `ImportaAtleteState` esteso con `riportate`)
- `app/(onboarding-import)/import-atlete/actions.test.ts` (nuovi test per il riporto: assente+iscritta l'anno precedente, presente nell'export, non Under 13, nessuna iscrizione precedente, nessun anno precedente)
- `app/(onboarding-import)/import-atlete/page.tsx` (riepilogo import mostra anche `riportate`, gap scoperto in dev-story, vedi Debug Log)
- `app/(iscrizioni)/conferma-iscrizioni/actions.ts` (nuova Server Action `escludiIscrizione`)
- `app/(iscrizioni)/conferma-iscrizioni/actions.test.ts` (nuovi test per `escludiIscrizione`)
- `app/(iscrizioni)/conferma-iscrizioni/page.tsx` (usa la nuova forma di `elencaIscrizioniPerAnno`, passa `iscrizioneId` a `IscrizioneRow`)
- `app/(iscrizioni)/conferma-iscrizioni/IscrizioneRow.tsx` (bottone "Escludi" per le righe già iscritte)
- `lib/auth/route-guard.ts` (`/conferma-iscrizioni` allargata ad Admin/Dirigente/Segreteria)
- `lib/auth/route-guard.test.ts` (test aggiornati per la route allargata)

## Change Log

- 2026-07-17: Implementazione completa Story 1.8 (Task 1-6). Riuso del motore condiviso `lib/anno-agonistico/` (già usato da Story 1.6) per una terza volta, coerente con AD-8. Riporto Under 13 implementato dentro `import-atlete/actions.ts`, non in un nuovo modulo `rollover-stagionale`, stesso precedente esplicito di Story 1.7 per FR-22. Esclusione manuale modellata come `attiva=false` (UPDATE), non `DELETE`, per non riaprire la decisione di Story 1.6. Due problemi reali scoperti durante dev-story/verifica dal vivo, non rilevati dai test a mock: riepilogo import privo del conteggio `riportate` richiesto dall'AC #3, e permessi RLS `UPDATE` mancanti su `iscrizioni` (rimossi in Story 1.6, mai ripristinati nonostante il nuovo utilizzo reale introdotto da questa storia) — entrambi corretti e riverificati dal vivo. Tutti gli AC (#1-#4) verificati anche contro un backend reale (Playwright + `exceljs` + query dirette DB); AC #5 verificato solo via unit test per non svuotare distruttivamente `anni_agonistici` sull'istanza locale condivisa. Status → review.
- 2026-07-17: Code review. 3 layer paralleli, 1 decisione risolta (riattivazione di un'Iscrizione esclusa, chiudendo un vicolo cieco permanente non colto in pieno nelle Dev Notes originali) + 4 patch applicate (conteggio `riportate` accurato, bottone "Conferma" nascosto per Ruoli non autorizzati, regex Under 13 più robusta, commento di migrazione corretto) + 5 findings deferiti (pattern preesistenti nel progetto, non regressioni di questa storia) + 5 scartati come rumore/falsi positivi/già gestiti. Fix di riattivazione riverificato dal vivo contro Supabase locale reale. Suite completa: 168/168 test, typecheck/lint/build verdi. Status → done.
