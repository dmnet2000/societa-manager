---
baseline_commit: NO_VCS
---

# Story 1.3: Import archivio Atlete da export federale

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente,
I want importare l'export Excel del portale federale volley,
so that non devo inserire a mano ogni atleta.

## Acceptance Criteria

1. **Given** sono autenticato come Admin o Dirigente, **when** carico un file Excel nel formato dell'export federale, **then** il sistema crea un nuovo record `Atleta` per ogni Codice Fiscale non già presente, e aggiorna i campi identitari (non le date di certificato — vedi Dev Notes) per ogni Codice Fiscale già esistente (motore condiviso `trovaPerCodiceFiscale`, AD-5).
2. **Given** l'export contiene una data in formato stringa `gg/mm/aaaa` (es. Data Nascita), **when** il file viene importato, **then** la data viene normalizzata e persistita in ISO 8601, non salvata come stringa originale.
3. **Given** una riga dell'export ha un Codice Fiscale, una Data Nascita, un Sesso (M/F) o un Cognome e Nome mancante/vuoto/non valido — tutti campi identitari `NOT NULL` nello schema `Atleta` (Task 1) — **when** il file viene importato, **then** quella riga viene scartata e segnalata nel riepilogo dell'import con il motivo specifico (non blocca le altre righe, non crea un'Atleta con dati identitari incompleti). Sono scartate anche righe con Codice Fiscale duplicato all'interno dello stesso file (solo la prima occorrenza viene processata).
4. **Given** sono autenticato con un Ruolo diverso da Admin/Dirigente (es. Atleta, Genitore), **when** provo a inviare il form di import o a chiamare la Server Action direttamente, **then** ricevo un rifiuto `FORBIDDEN` — sia lato Server Action (difesa in profondità) sia lato database (RLS su `Atleta`, AD-4/AD-9).
5. **Given** l'import è terminato, **when** la pagina si aggiorna, **then** vedo un riepilogo con conteggio di Atlete create, aggiornate e righe scartate (con il motivo).

## Tasks / Subtasks

- [x] Task 1: Modello dati `Atleta` + Row-Level Security (AC: #1, #4)
  - [x] `prisma/schema.prisma`: nuovo modello `Atleta` (id UUID, `codiceFiscale` univoco, `nome` — stringa unica "Cognome e Nome" come nell'export, non separata — `sesso` enum M/F, `dataNascita`, `luogoNascita`, `provinciaNascita`, `indirizzo`, `cap`, `localitaResidenza`, `provinciaResidenza`, `categoria`, `matricola`, `dataPrimoTesseramento`, `createdAt`, `updatedAt`). **Non** includere qui date di Certificato Medico: quella tabella (`CertificatoMedico`) viene creata in Story 1.7, che estenderà questo import — vedi Dev Notes.
  - [x] Migrazione Prisma per il modello, **più** una seconda migrazione (o la stessa, editata a mano) con SQL grezzo per abilitare RLS sulla tabella e creare la policy per Ruoli ad accesso ampio — Prisma non esprime policy RLS nello schema, va scritto SQL direttamente nel file di migrazione (vedi Dev Notes per lo SQL esatto).
  - [x] `@@map("atlete")` per coerenza con la convenzione di naming (italiano, plurale minuscolo) già usata per `Utente`→`utenti`.
- [x] Task 2: Modulo condiviso `lib/matching-codice-fiscale/` (AC: #1)
  - [x] Nuovo modulo (Structural Seed, AD-5): esporta `trovaPerCodiceFiscale(supabase, codiceFiscale)` — lookup di un'Atleta esistente per Codice Fiscale, tramite il client Supabase RLS-aware (AD-9), non Prisma diretto.
  - [x] **Non** implementare qui `unisciCertificato` (l'altra funzione prevista da AD-5 per lo stesso modulo): richiede il modello `CertificatoMedico`, che non esiste ancora — la aggiungerà Story 1.7 allo stesso modulo.
- [x] Task 3: Modulo `lib/db-rls/` per l'accesso a `Atleta` (AC: #1, #4)
  - [x] Nuovo modulo (Structural Seed, AD-9): funzioni per creare/aggiornare un'Atleta tramite il client Supabase autenticato (`lib/supabase/server.ts`, già esistente da Story 1.1) — **mai** `prisma.atleta.*` a runtime, dato che `Atleta` è protetta da RLS (AD-4) e Prisma bypassa PostgREST/i claim JWT.
- [x] Task 4: Parsing Excel e normalizzazione date (AC: #2, #3)
  - [x] Installare `exceljs` (vedi Dev Notes sulla scelta rispetto a `xlsx`/SheetJS)
  - [x] Parser che legge il foglio, salta le prime 4 righe (intestazioni alla riga 5, dato confermato dall'utente in fase di brief), mappa le colonne rilevanti (vedi Dev Notes per l'elenco esatto e i nomi colonna)
  - [x] Normalizza le date `gg/mm/aaaa` (stringhe, non date Excel native) in `Date`/ISO 8601 prima di passare i dati a Task 3
  - [x] Righe con Codice Fiscale mancante/vuoto: escluse dalla persistenza, incluse nel riepilogo come "scartate" con motivo (AC #3) — non un errore che blocca l'intero import
- [x] Task 5: Server Action `importaAtlete` (AC: #1, #3, #4, #5)
  - [x] `app/(onboarding-import)/import-atlete/actions.ts`: verifica autorizzazione (`requireRuolo`, esteso per accettare più Ruoli — vedi Dev Notes), legge il file da `FormData`, chiama parser (Task 4), poi per ogni riga valida chiama `trovaPerCodiceFiscale` (Task 2) e crea o aggiorna via `lib/db-rls/` (Task 3)
  - [x] Errori nella forma `{ error: { code, message } }` (convenzione ARCHITECTURE-SPINE.md/Story 1.1); `code: "FORBIDDEN"` per il rifiuto di autorizzazione (AC #4)
  - [x] Try/catch fail-closed attorno alle operazioni Supabase/parsing (pattern stabilito in Story 1.1/1.2 code review)
- [x] Task 6: UI di import (AC: #1, #5)
  - [x] `app/(onboarding-import)/import-atlete/page.tsx`: form con `<input type="file">` per l'upload, protetto dal route guard esistente (va aggiunta una entry in `PROTECTED_ROUTES` per questo prefisso, `ruoliAmmessi: ["ADMIN", "DIRIGENTE"]` — Story 1.1/1.2 non avevano ancora nessuna route con più di un Ruolo ammesso)
  - [x] Dopo l'import, mostra il riepilogo (create/aggiornate/scartate) restituito dalla Server Action (AC #5)
- [x] Task 7: Test (Vitest)
  - [x] Parser Excel: righe valide mappate correttamente, date normalizzate, righe senza Codice Fiscale scartate — usare un file di test minimale generato in memoria con `exceljs`, non un file reale su disco
  - [x] `trovaPerCodiceFiscale`, Server Action `importaAtlete`: mock del client Supabase (stesso pattern di mock usato per Prisma nelle Story precedenti)
  - [x] `lib/auth/require-ruolo.ts` esteso: test per il nuovo supporto a più Ruoli ammessi

### Review Findings

- [x] [Review][Patch] La policy RLS concedeva a Segreteria/Dirigente gli stessi diritti `FOR ALL` (incluso `DELETE`) di Admin su `atlete` — deciso con l'utente: SELECT/INSERT/UPDATE per Admin/Dirigente/Segreteria, `DELETE` riservato solo ad Admin. `prisma/migrations/20260716063714_add_atleta/migration.sql` (nuova migrazione di correzione).
- [x] [Review][Patch] `aggiornaAtleta` non verifica che l'`UPDATE` abbia effettivamente modificato una riga — se RLS nega l'operazione o l'id non esiste più, PostgREST non restituisce un errore e l'azione riporta "aggiornata" anche quando non è successo nulla. [lib/db-rls/atleta.ts]
- [x] [Review][Patch] Il Codice Fiscale non viene normalizzato (trim + maiuscolo) prima del confronto/persistenza — varianti di maiuscole/minuscole o spazi creerebbero un'Atleta duplicata invece di aggiornare quella esistente, vanificando lo scopo del motore di matching condiviso (AD-5). [app/(onboarding-import)/import-atlete/parser.ts, lib/matching-codice-fiscale/trova-per-codice-fiscale.ts]
- [x] [Review][Patch] Un "Cognome e Nome" vuoto viene persistito come stringa vuota (`?? ""`) invece di essere scartato come le righe senza Codice Fiscale/Data Nascita/Sesso — incoerente, dato che anche `nome` è un campo identitario essenziale. Aggiornare anche l'AC #3/Dev Notes della story per documentare esplicitamente che lo scarto si applica a Codice Fiscale, Data Nascita, Sesso **e** Nome (necessario per i vincoli NOT NULL/di dominio dello schema, non un'espansione arbitraria di scope). [app/(onboarding-import)/import-atlete/parser.ts]
- [x] [Review][Patch] Il parser delle date accetta combinazioni giorno/mese non valide (es. `31/02/2020`), che `Date.UTC` converte silenziosamente in una data diversa invece di essere trattate come non valide. [app/(onboarding-import)/import-atlete/parser.ts]
- [x] [Review][Patch] Nessun rilevamento di Codici Fiscali duplicati all'interno dello stesso file: una seconda riga con lo stesso CF sovrascrive silenziosamente la prima via aggiornamento, senza alcuna segnalazione nel riepilogo. [app/(onboarding-import)/import-atlete/parser.ts]
- [x] [Review][Patch] Nessuna verifica che le colonne essenziali (almeno "Codice Fiscale") siano state trovate nella riga di intestazione — se le intestazioni non corrispondono esattamente (rinominate, spazi, maiuscole diverse), ogni riga del file viene scartata con un motivo fuorviante ("Codice Fiscale mancante") invece di un unico errore chiaro sul formato del file. [app/(onboarding-import)/import-atlete/parser.ts]
- [x] [Review][Patch] L'errore di `supabase.auth.getUser()` in `requireRuolo` viene scartato senza essere loggato, rendendo un'eventuale interruzione del servizio Auth indistinguibile da "nessuna sessione". [lib/auth/require-ruolo.ts]
- [x] [Review][Defer] Import sequenziale riga-per-riga (1 SELECT + 1 INSERT/UPDATE per riga, nessun batching/transazione/upsert) — rischio concreto di timeout su Cloudflare Workers per file grandi, ma NFR5 limita la scala a ~200 Atlete e nessun AC di performance lo richiede esplicitamente; risolverlo richiederebbe ridisegnare il conteggio create/aggiornate (AC #5) per un batch sicuro. [app/(onboarding-import)/import-atlete/actions.ts]
- [x] [Review][Defer] Nessun test automatico verifica dal vivo che la policy RLS blocchi davvero i Ruoli non autorizzati — verificato manualmente dal vivo durante lo sviluppo (vedi Debug Log Reference), ma non con un test automatico ripetibile; aggiungere un'infrastruttura di test di integrazione contro Postgres reale è fuori dallo standard di test (Vitest + mock) di questo progetto. [prisma/migrations/20260716063714_add_atleta/migration.sql]
- [x] [Review][Defer] Finestra di autorizzazione stantia sulla revoca di un Ruolo (fino a 1h, `jwt_expiry`) — stesso trade-off architetturale già accettato in AD-11/Story 1.1, non un problema nuovo introdotto qui. [prisma/migrations/20260716063714_add_atleta/migration.sql]
- [x] [Review][Defer] Il route guard permette per difetto ("fail-open") qualunque rotta autenticata non esplicitamente elencata in `PROTECTED_ROUTES` — comportamento preesistente dalla Story 1.1, invariato da questa storia; invertirlo a "fail-closed" di default è un cambio di design più ampio. [lib/auth/route-guard.ts]
- [x] [Review][Defer] Nessun limite di dimensione/tipo file lato server sull'upload Excel oltre all'`accept=".xlsx"` lato client — rischio basso per uno strumento interno riservato ad Admin/Dirigente già filtrati dal route guard. [app/(onboarding-import)/import-atlete/actions.ts]
- [x] [Review][Defer] `trovaPerCodiceFiscale` non distingue "Atleta inesistente" da "Atleta esistente ma nascosta dalla RLS" — nessuna conseguenza reale oggi (solo Admin/Dirigente, entrambi Ruoli ad accesso ampio, la richiamano), ma diventerà rilevante quando le Story 1.5/Epic 2 aggiungeranno policy scoped per Genitore/Allenatore. [lib/matching-codice-fiscale/trova-per-codice-fiscale.ts]
- [x] [Review][Defer] Il Codice Fiscale (dato sensibile) può comparire senza redazione nei log (`console.error(err)` su un errore di vincolo univoco) — stesso pattern già adottato ed esplicitamente approvato in tutto il codebase dalle code review di Story 1.1/1.2; una redazione andrebbe applicata trasversalmente, non solo qui. [app/(onboarding-import)/import-atlete/actions.ts]

## Dev Notes

- **Continuità da Story 1.1/1.2 — cosa riusare:**
  - Convenzione errori `{ error: { code, message } }`, `FORBIDDEN` per autorizzazione (ARCHITECTURE-SPINE.md, applicata da Story 1.1 in poi).
  - Pattern try/catch fail-closed attorno alle chiamate esterne (Supabase, parsing file) — stabilito in code review di Story 1.1/1.2.
  - `lib/auth/require-ruolo.ts` (Story 1.2 code review) verifica il Ruolo del chiamante dentro la Server Action, non solo via route guard — **va esteso** in questa storia per accettare più Ruoli ammessi (FR-19 richiede Admin **o** Dirigente, la firma attuale accetta un solo `Ruolo`). Non riscrivere da zero: allargare la firma esistente (es. `Ruolo | Ruolo[]`).
  - `lib/supabase/server.ts` (Story 1.1) per il client Supabase con sessione utente autenticata — è il client da usare per `Atleta` (AD-9), non il client `service-role` di `lib/auth-admin/` (quello è riservato a operazioni realmente privilegiate come la scrittura di `app_metadata`, non a bypassare RLS su dati di dominio).
- **PRIMA TABELLA CON RLS DEL PROGETTO — territorio nuovo:** Story 1.1/1.2 hanno lavorato solo su `Utente`/`UtenteRuolo`, esplicitamente **non** protette da RLS (AD-9) e quindi gestite via Prisma diretto. `Atleta` è invece nel gruppo AD-4/AD-9 (protetta da RLS, letta/scritta via client Supabase autenticato) — è la prima volta in questo progetto. Non riusare il pattern Prisma-diretto di `prisma.utente.*` per `Atleta`: usare sempre il client Supabase (`supabase.from("atlete")...`) tramite `lib/db-rls/`.
- **SQL della policy RLS (nuovo, da scrivere in questa storia):** AD-4 stabilisce esplicitamente che Admin/Dirigente/Segreteria hanno "policy di accesso ampio (non scoped a una singola Atleta/Gruppo), necessario per operazioni trasversali come l'import massivo (FR-19)" — è la regola già decisa in architettura, questa storia la implementa per la prima volta. Non sono ancora implementabili le policy scoped per Genitore (aggancio Genitore-Atleta è Story 1.5, non esiste ancora l'FK) o per Allenatore (Gruppo è Epic 2) — quelle arriveranno con le storie che introducono quelle relazioni. SQL indicativo da adattare nella migrazione:
  ```sql
  ALTER TABLE "atlete" ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "admin_dirigente_segreteria_accesso_ampio" ON "atlete"
    FOR ALL
    USING (
      (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']
    )
    WITH CHECK (
      (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']
    );
  ```
  `auth.jwt()` è la funzione Supabase che espone i claim del JWT corrente come `jsonb`, incluso `app_metadata` (specchiato dai Ruoli, AD-11) — l'operatore `?|` verifica se uno qualunque dei Ruoli passati è presente nell'array. Se `app_metadata`/`ruoli` mancano, l'espressione valuta `NULL`, trattato come `false` (fail-closed) da Postgres in una clausola `USING`/`WITH CHECK`. **Verificare questa policy con una query reale contro Supabase locale prima di considerarla conclusa** — non è stata testata dal vivo in fase di creazione di questa storia.
- **Scelta libreria Excel — `exceljs`, non `xlsx`/SheetJS:** ricerca web (luglio 2026) conferma che il pacchetto `xlsx` su npm è fermo a una versione vecchia (0.18.5) con vulnerabilità note — SheetJS pubblica le versioni recenti solo tramite il proprio CDN (`https://cdn.sheetjs.com/...`), non più su npm. Per evitare un'installazione non standard e una dipendenza non aggiornabile via npm, usare **`exceljs`** (mantenuto attivamente, installabile con `npm install exceljs` dal registro standard) — sufficiente per un file di sole ~200 righe, non serve lo streaming per grandi file che motiva la scelta di SheetJS in altri contesti.
- **Schema colonne dell'export (da `_bmad-output/planning-artifacts/briefs/brief-societa-manager-2026-07-13/addendum.md`), colonne rilevanti per questa storia:** `Codice Fiscale` (chiave di matching), `Cognome e Nome` (stringa unica → `Atleta.nome`), `M/F` → `sesso`, `Data Nascita`, `Località Nascita`, `Pr.Nasc.`, `Indirizzo`, `CAP`, `Località Residenza`, `Pr.`, `Categ.` → `categoria`, `Matricola`, `Data 1° Tess.` → `dataPrimoTesseramento`. Intestazioni alla riga 5 del foglio (confermato dall'utente). **Non mappare in questa storia:** `Data Inizio/Fine Val.Cert`, `Mesi Validità Cert`, `Modulo` (Certificato Medico — Story 1.7 li aggiungerà), `Data Validità Tess.` (esplicitamente da non tracciare, non correlata alla conferma iscrizione), campi società/prestito (fuori perimetro).
- **AD-10 (Atleta, proprietario unico):** Onboarding-Import (questo modulo) è l'unico proprietario dei campi identitari di `Atleta` — nessun altro modulo futuro (Certificati-Medici, Iscrizioni, Dati-Atleta) scriverà mai su queste colonne, solo sulle proprie entità correlate via FK. Rispettare questo confine anche nel nome delle funzioni esportate da `lib/matching-codice-fiscale/` (restituiscono/cercano Atlete, non le modificano se non tramite l'upsert dei soli campi identitari qui definiti).
- **Confini con le storie successive dello stesso Epic (non reinventare, non anticipare):** `AnnoAgonistico` (AD-8) **non** viene creato in questa storia — l'AC dell'epic dice "carico il file per l'Anno Agonistico corrente" ma `Atleta` non ha un FK diretto a `AnnoAgonistico` nell'ERD (solo `Gruppo`/`Iscrizione` ce l'hanno) — l'aspetto stagionale dell'import riguarda `Iscrizione` (Story 1.6), non l'anagrafica `Atleta`. `CertificatoMedico` **non** viene creato qui (Story 1.7, testualmente: "viene creata qui la tabella minima CertificatoMedico"). Se in fase di dev-story questa lettura risultasse sbagliata, fermarsi e chiedere prima di introdurre `AnnoAgonistico`/`CertificatoMedico` qui.
- **Scala (NFR5):** fino a ~200 Atlete — nessuna necessità di streaming/paginazione per il parsing o l'upsert, un ciclo semplice riga-per-riga è adeguato.

### Project Structure Notes

- File nuovi attesi: `prisma/schema.prisma` (esteso), una migrazione Prisma con SQL RLS grezzo, `lib/matching-codice-fiscale/index.ts` (o `trova-per-codice-fiscale.ts`), `lib/db-rls/atleta.ts`, `app/(onboarding-import)/import-atlete/actions.ts`, `app/(onboarding-import)/import-atlete/page.tsx`, relativi test.
- File esistenti da estendere (non ricreare): `lib/auth/require-ruolo.ts` (supporto multi-Ruolo), `lib/auth/route-guard.ts` (nuova entry in `PROTECTED_ROUTES` per `/import-atlete`, ammessi `["ADMIN","DIRIGENTE"]`).
- Nessuna modifica a `proxy.ts`, `lib/auth-admin/*`, ai modelli `Utente`/`Ruolo`/`UtenteRuolo`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1: Accesso, Popolamento e Iscrizioni / Story 1.3, 1.6, 1.7, 1.8 (confini di scope)]
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-19, NFR5]
- [Source: _bmad-output/planning-artifacts/briefs/brief-societa-manager-2026-07-13/addendum.md#Schema dell'export federale]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-4, AD-5, AD-8, AD-9, AD-10, Structural Seed (lib/matching-codice-fiscale/, lib/db-rls/)]
- [Source: _bmad-output/implementation-artifacts/1-1-registrazione-e-login-per-ruolo.md, 1-2-gestione-utenti-e-ruoli-admin.md — convenzione errori, pattern try/catch, requireRuolo]
- Ricerca web (luglio 2026): stato del pacchetto npm `xlsx` (SheetJS) vs `exceljs` per il parsing Excel in Node.js.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **RLS: `prisma migrate dev` fallisce su SQL che referenzia `auth.jwt()`** — il database "shadow" usato da Prisma per la validazione delle migrazioni è un Postgres vuoto, senza lo schema `auth` di Supabase (errore `schema "auth" does not exist"`). Risolto generando la migrazione con `prisma migrate dev --create-only` (nessuna applicazione, solo generazione SQL), poi applicandola con `prisma migrate deploy`, che non usa il database shadow.
- **RLS abilitata ma insufficiente da sola** — dopo la prima applicazione, sia un ruolo autorizzato che uno non autorizzato ricevevano `"permission denied for table atlete"`: mancavano i `GRANT` di base sulla tabella per il ruolo Postgres `authenticated` (le tabelle create via migrazione diretta non sono esposte di default alle API — `auto_expose_new_tables` non attivo, vedi `supabase/config.toml`, Story 1.1). Aggiunta una seconda migrazione con `GRANT SELECT, INSERT, UPDATE, DELETE ON "atlete" TO authenticated`. Dopo questo fix, verificato dal vivo (script diretto con `supabase-js`, non i test unitari) che: un utente con solo Ruolo ALLENATORE non vede righe (`SELECT` vuoto) e non può inserire (RLS blocca l'`INSERT`); un utente Admin può leggere e scrivere normalmente.
- **I default Prisma (`@default(uuid())`, `@updatedAt`) non esistono a livello di colonna Postgres** — sono generati lato Prisma Client, non nel database. Un `INSERT` tramite `supabase-js` (bypassando Prisma Client) senza `id`/`updatedAt` espliciti fallisce per vincolo NOT NULL. `lib/db-rls/atleta.ts` genera `id` con `crypto.randomUUID()` e `updatedAt` esplicitamente prima di ogni scrittura.
- **Scelta libreria Excel**: confermato dal vivo (ricerca web) che il pacchetto npm `xlsx` è fermo alla v0.18.5 con vulnerabilità note, SheetJS pubblica solo via CDN proprio ora — usato `exceljs` (v4.4.0, registro npm standard) come da Dev Notes della story.
- **Incompatibilità di tipi exceljs/@types/node**: `workbook.xlsx.load()` dichiara un parametro `Buffer` non generico, incompatibile a livello di tipi (non di runtime) con il `Buffer<ArrayBufferLike>` delle `@types/node` correnti — cast esplicito con commento nel codice.
- Verifiche eseguite e passate: `npx vitest run` (69/69 test), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun errore/warning), `npm run build` (build completata, `/import-atlete` correttamente statica — a differenza di `/admin`, questa pagina è un Client Component puro senza dati server-side da tenere freschi).
- **Verifica end-to-end reale eseguita** (Playwright + file `.xlsx` generato in memoria con `exceljs`, contro il backend Supabase locale, non mockato): upload con 2 righe valide + 1 senza Codice Fiscale → riepilogo corretto (2 create, 0 aggiornate, 1 scartata con motivo); ri-upload dello stesso file → 0 create, 2 aggiornate (upsert per Codice Fiscale funzionante, nessun duplicato); dati verificati anche via query diretta al DB (date normalizzate correttamente in ISO 8601). Route guard verificato: un utente con solo Ruolo ALLENATORE che visita `/import-atlete` viene reindirizzato a `/non-autorizzato` (AC #4).
- **Code review (2026-07-16):** 3 layer paralleli hanno trovato — con doppia/tripla corroborazione — che `aggiornaAtleta` non verificava se l'`UPDATE` avesse davvero modificato una riga (RLS-denial silenzioso riportato come successo), che il Codice Fiscale non era normalizzato prima del matching/persistenza (rischio concreto di duplicati), e che il parser accettava date di calendario inesistenti (es. `31/02/2020`) facendole "rollare" silenziosamente. Deciso con l'utente di restringere `DELETE` su `atlete` al solo Admin (Segreteria/Dirigente restano SELECT/INSERT/UPDATE) — nuova migrazione che sostituisce la policy `FOR ALL` originaria con 4 policy separate. Altre 6 patch applicate: verifica riga aggiornata, normalizzazione CF (parser + modulo di matching, difensiva in entrambi i punti), scarto coerente anche per Nome vuoto (con aggiornamento dell'AC #3 per documentarlo), validazione round-trip delle date, rilevamento Codice Fiscale duplicato nello stesso file, validazione delle intestazioni essenziali con errore chiaro se mancanti, logging dell'errore di `getUser()` in `requireRuolo`. Tutte le patch riverificate dal vivo contro il backend reale (77/77 test, typecheck/lint/build verdi).

### Completion Notes List

- Implementati Task 1-7: modello `Atleta` + RLS (prima tabella del progetto protetta da Row-Level Security), modulo condiviso `lib/matching-codice-fiscale/` (`trovaPerCodiceFiscale`), modulo `lib/db-rls/atleta.ts`, parser Excel (`exceljs`) con normalizzazione date e gestione righe scartate, Server Action `importaAtlete`, UI di import con riepilogo, route guard esteso per `/import-atlete` (primo caso con più Ruoli ammessi).
- `lib/auth/require-ruolo.ts` (Story 1.2) esteso per accettare un array di Ruoli ammessi (`Ruolo | Ruolo[]`) — retrocompatibile, le chiamate esistenti in `app/(amministrazione)/admin/actions.ts` (singolo Ruolo) continuano a funzionare senza modifiche.
- **Scope rispettato come da Dev Notes**: non creati `CertificatoMedico` (Story 1.7) né `AnnoAgonistico` (Story 1.6/Epic 2) — le colonne dell'export relative al certificato medico non sono mappate dal parser in questa storia.
- Nessun elemento bloccato da vincoli ambientali (Docker/Supabase locale già disponibili dalle Story precedenti).

### File List

**Creati:**
- `prisma/migrations/20260716063714_add_atleta/migration.sql` (modello `Atleta` + RLS)
- `prisma/migrations/20260716070500_grant_atlete_access/migration.sql` (GRANT mancanti per `authenticated`)
- `lib/matching-codice-fiscale/trova-per-codice-fiscale.ts`
- `lib/matching-codice-fiscale/trova-per-codice-fiscale.test.ts`
- `lib/matching-codice-fiscale/index.ts`
- `lib/db-rls/atleta.ts`
- `lib/db-rls/atleta.test.ts`
- `app/(onboarding-import)/import-atlete/parser.ts`
- `app/(onboarding-import)/import-atlete/parser.test.ts`
- `app/(onboarding-import)/import-atlete/actions.ts`
- `app/(onboarding-import)/import-atlete/actions.test.ts`
- `app/(onboarding-import)/import-atlete/page.tsx`

**Modificati:**
- `prisma/schema.prisma` (modello `Atleta`, enum `Sesso`)
- `lib/auth/require-ruolo.ts` (supporto a più Ruoli ammessi; poi, in code review, logging dell'errore di `getUser()`)
- `lib/auth/require-ruolo.test.ts` (nuovi test per il supporto multi-Ruolo; poi nuovo test per il logging)
- `lib/auth/route-guard.ts` (nuova entry `PROTECTED_ROUTES` per `/import-atlete`)
- `lib/auth/route-guard.test.ts` (nuovi test per la nuova route)
- `package.json` (dipendenza `exceljs`)
- `lib/db-rls/atleta.ts` (code review: `aggiornaAtleta` verifica che l'update abbia modificato una riga)
- `lib/db-rls/atleta.test.ts` (code review: nuovi test per la verifica riga aggiornata)
- `lib/matching-codice-fiscale/trova-per-codice-fiscale.ts` (code review: normalizzazione difensiva del Codice Fiscale)
- `lib/matching-codice-fiscale/trova-per-codice-fiscale.test.ts` (code review: nuovo test per la normalizzazione)
- `app/(onboarding-import)/import-atlete/parser.ts` (code review: normalizzazione CF, scarto Nome vuoto, validazione date, dedup CF nel file, validazione intestazioni essenziali)
- `app/(onboarding-import)/import-atlete/parser.test.ts` (code review: nuovi test per tutte le patch sopra)

**Creati (code review):**
- `prisma/migrations/20260716080000_atlete_restrict_delete/migration.sql` (restringe `DELETE` su `atlete` al solo Admin)

## Change Log

- 2026-07-16: Implementazione completa Story 1.3 (Task 1-7). Prima tabella del progetto con Row-Level Security (`Atleta`) — scoperti e risolti due problemi ambientali reali (shadow database di Prisma incompatibile con SQL Supabase-specifico; GRANT di tabella mancanti oltre alla RLS). Tutti gli AC verificati anche contro un backend reale (Playwright + query dirette DB).
- 2026-07-16: Code review. Corretti un bug reale (`aggiornaAtleta` non rilevava un update RLS-negato) e un rischio concreto di duplicati (Codice Fiscale non normalizzato). Deciso con l'utente di restringere `DELETE` su `atlete` al solo Admin. 8 patch totali applicate e riverificate dal vivo. Story portata a `done`.
