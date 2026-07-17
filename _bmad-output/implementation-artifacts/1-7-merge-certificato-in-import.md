---
baseline_commit: NO_VCS
---

# Story 1.7: Merge certificato in import

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente,
I want che l'import aggiorni la data del Certificato Medico solo se più recente di quella a sistema,
so that non perdo dati più aggiornati già inseriti manualmente.

## Acceptance Criteria

1. **Given** un'Atleta ha già una data di fine validità del Certificato Medico a sistema, **when** importo un export con una data di fine validità diversa per la stessa Atleta, **then** il sistema aggiorna il Certificato Medico solo se la data nel file è più recente di quella esistente (motore condiviso AD-5, `unisciCertificato`), altrimenti mantiene quello esistente invariato.
2. **Given** un'Atleta non ha ancora nessun Certificato Medico a sistema, **when** l'import trova una data di fine validità valida per quella riga, **then** viene creato un nuovo record `CertificatoMedico` minimale collegato all'Atleta.
3. **Given** una riga dell'export ha un Codice Fiscale/Data Nascita/Sesso/Nome validi ma nessuna data di fine validità del certificato (campo vuoto o non parsabile), **when** il file viene importato, **then** l'Atleta viene comunque creata/aggiornata normalmente (Story 1.3) — solo il merge del Certificato Medico viene saltato per quella riga, nessuna riga scartata per questo motivo.
4. **Given** l'import è terminato, **then** viene creata qui la tabella minima `CertificatoMedico` (date di validità, mesi di validità, modulo) — nessun upload di file, notifica o stato di validazione: quelli sono compiti dell'Epic 4, che estenderà questo stesso modello.

## Tasks / Subtasks

- [x] Task 1: Modello dati `CertificatoMedico` + Row-Level Security (AC: #1, #2, #4)
  - [x] `prisma/schema.prisma`: nuovo modello `CertificatoMedico` (id UUID, `atletaId` **FK univoca** verso `Atleta` — un solo Certificato "corrente" per Atleta, questa storia non introduce uno storico di certificati precedenti, coerente con l'AC "aggiorna la data solo se più recente" che descrive l'aggiornamento di un unico record, non la creazione di righe parallele ad ogni import — `dataInizioValidita` DateTime?, `dataFineValidita` DateTime **obbligatoria** — è l'unico campo su cui si basa il confronto "vince la data più recente", un record senza questo valore non viene mai creato (AC #3) — `mesiValidita` Int?, `modulo` String?, `createdAt`, `updatedAt`). `@@map("certificati_medici")`.
  - [x] Migrazione con SQL grezzo per abilitare RLS e le policy — `CertificatoMedico` è esplicitamente nel bind-list di AD-4 (insieme ad Atleta, Presenza, Iscrizione). Stesso pattern ormai consolidato: policy separate per operazione (`SELECT`/`INSERT`/`UPDATE` per Admin/Dirigente/Segreteria, AD-4 "accesso ampio" — a differenza di `Iscrizione`, qui `UPDATE` è realmente usato da `unisciCertificato`), **nessuna policy/GRANT `DELETE`** (nessun AC di questa storia richiede di eliminare un Certificato), GRANT esplicito incluso dall'inizio (lezione Story 1.3/1.5/1.6 sul GRANT mancante).
- [x] Task 2: Modulo `lib/db-rls/certificato-medico.ts` (AC: #1, #2)
  - [x] `trovaCertificatoPerAtleta(supabase, atletaId)`: legge il `CertificatoMedico` esistente per una data Atleta (o `null`).
  - [x] `creaCertificato(supabase, atletaId, dati)`: inserisce un nuovo record. Stesso avvertimento già noto (Story 1.3): `id`/`updatedAt` vanno generati esplicitamente lato applicativo, i default Prisma non sono default di colonna Postgres quando si scrive tramite `supabase-js`.
  - [x] `aggiornaCertificato(supabase, id, dati)`: aggiorna un record esistente, con lo stesso controllo "riga effettivamente modificata" già introdotto in `aggiornaAtleta` (Story 1.3 review) — un `UPDATE` negato dalla RLS o su un id inesistente non deve essere riportato come riuscito.
- [x] Task 3: Funzione di merge `unisciCertificato` nel modulo condiviso `lib/matching-codice-fiscale/` (AC: #1, #2, #3) — seconda operazione del motore AD-5, già prevista testualmente nell'Architecture Spine ("`unisciCertificato`, merge che implementa la regola 'vince la data più recente' di FR-22")
  - [x] `unisciCertificato(supabase, atletaId, datiCertificato)`: usa `trovaCertificatoPerAtleta` (Task 2) per cercare un Certificato esistente per quell'Atleta. Se non esiste, chiama `creaCertificato` (AC #2). Se esiste, confronta `dataFineValidita` esistente vs quella nuova: aggiorna (`aggiornaCertificato`) **solo se** la nuova è strettamente più recente (AC #1); altrimenti non fa nulla, silenziosamente (AC #1, "mantiene quello esistente" — non è un errore, non va nel riepilogo scartate).
  - [x] Questa funzione **non** viene mai chiamata se `datiCertificato.dataFineValidita` è `null` (AC #3) — quella decisione spetta al chiamante (Task 5), non a questa funzione.
- [x] Task 4: Estendere il parser dell'export federale (AC: #3)
  - [x] `app/(onboarding-import)/import-atlete/parser.ts` (file esistente, **non** ricreare): aggiungere alla riga importata un campo `certificato: { dataInizioValidita: Date | null; dataFineValidita: Date | null; mesiValidita: number | null; modulo: string | null }`, popolato dalle colonne `Data Inizio Val.Cert`, `Data Fine Val.Cert` (stesso parser di date italiane `gg/mm/aaaa` già esistente, `parseDataItaliana`), `Mesi Validità Cert` (numero, `null` se non parsabile), `Modulo` (testo libero). **Nessuna di queste colonne è tra `COLONNE_ESSENZIALI`**: se mancano o sono vuote/non parsabili, il campo corrispondente è `null` — la riga **non** viene scartata per questo (AC #3, a differenza di Codice Fiscale/Data Nascita/Sesso/Nome che restano obbligatori, Story 1.3).
- [x] Task 5: Estendere la Server Action `importaAtlete` (AC: #1, #2, #3)
  - [x] `app/(onboarding-import)/import-atlete/actions.ts` (file esistente, **non** ricreare): `creaAtleta` va esteso per restituire l'`id` generato (oggi restituisce `void` — l'id serve qui per collegare il Certificato appena creato, non richiede altre modifiche al suo comportamento). Dopo la create/update dell'Atleta (logica esistente invariata), se `riga.certificato.dataFineValidita` non è `null`, chiamare `unisciCertificato(supabase, atletaId, riga.certificato)` (Task 3) — nello stesso blocco try/catch già esistente, stessa gestione d'errore fail-closed.
  - [x] Il riepilogo dell'import (AC #5 di Story 1.3: create/aggiornate/scartate) **non cambia forma** — il merge del certificato non introduce un nuovo conteggio nell'AC di questa storia, non anticipare una UI di stato certificati (Epic 4).
- [x] Task 6: Test (Vitest)
  - [x] `lib/db-rls/certificato-medico.ts`: `trovaCertificatoPerAtleta`, `creaCertificato`, `aggiornaCertificato` (incluso il caso "nessuna riga modificata") — mock del client Supabase, stesso pattern di `lib/db-rls/atleta.test.ts`.
  - [x] `unisciCertificato`: crea quando non esiste nulla (AC #2), aggiorna quando la nuova data è più recente (AC #1), non fa nulla quando la nuova data è uguale o precedente (AC #1). La protezione per `dataFineValidita` nullo resta lato chiamante (Task 3), non testata qui — la firma di `unisciCertificato` la rende non-nullable, coerente con la responsabilità dichiarata.
  - [x] `parser.ts`: nuove colonne certificato mappate correttamente; riga con Codice Fiscale/Data Nascita/Sesso/Nome validi ma senza dati di certificato **non** scartata (AC #3); date di certificato in formato non valido → campo `null`, riga comunque processata; `Mesi Validità Cert` non numerico → `null`, riga comunque processata.
  - [x] `import-atlete/actions.test.ts`: integrazione completa — Atleta nuova + certificato → entrambi creati; Atleta esistente + certificato → aggiornamento tramite `unisciCertificato` con l'id corretto; riga senza dati di certificato → Atleta comunque creata/aggiornata, nessuna chiamata a `unisciCertificato`. Aggiornato anche il mock/test di `creaAtleta` per il nuovo valore di ritorno (`id` invece di `void`).

### Review Findings

- [x] [Review][Patch] `unisciCertificato` sovrascrive l'intero record quando aggiorna (data più recente), non solo `dataFineValidita` — se la riga più recente dell'export ha `modulo`/`mesiValidita`/`dataInizioValidita` vuoti per quella riga specifica, questi valori vengono azzerati anche se il record esistente li aveva popolati correttamente da un import precedente. Risolto: merge per-campo (un campo `null` nella nuova riga mantiene il valore esistente), TDD con 2 nuovi test, riverificato dal vivo con 2 import successivi. [lib/matching-codice-fiscale/unisci-certificato.ts]
- [x] [Review][Patch] `parseNumeroCella` non impone che `Mesi Validità Cert` sia un intero — `Number("12.5")` o notazione scientifica sono valori finiti e passano il controllo, ma la colonna è `INTEGER`: un valore non intero può far fallire l'intera riga (o l'intero import) invece di essere trattato come non parsabile (`null`, come le altre colonne certificato). Risolto: `Number.isInteger` invece di `Number.isFinite`, TDD con nuovo test. [app/(onboarding-import)/import-atlete/parser.ts]
- [x] [Review][Patch] In `actions.ts`, il narrowing di `certificato.dataFineValidita` da `Date | null` a `Date` si basa sul control-flow narrowing di TypeScript che sopravvive a uno spread (`{ ...certificato, dataFineValidita: certificato.dataFineValidita }`) — fragile: un futuro refactor che destruttura `certificato` in una variabile locale prima dello spread reintrodurrebbe silenziosamente `Date | null` dove `DatiCertificato` dichiara `Date` non nullable. Risolto: `const` locale esplicito prima del blocco `if`, garanzia verificata dal compilatore. [app/(onboarding-import)/import-atlete/actions.ts]
- [x] [Review][Patch] `lib/db-rls/certificato-medico.test.ts` verifica nel payload solo `dataFineValidita` esplicitamente — `dataInizioValidita`, `mesiValidita`, `modulo` non sono assertiti direttamente (solo coperti implicitamente end-to-end via `actions.test.ts`). Risolto: asserzioni estese a tutti e 4 i campi sia per `creaCertificato` sia per `aggiornaCertificato`. [lib/db-rls/certificato-medico.test.ts]
- [x] [Review][Defer] Race condition (read-then-write) in `unisciCertificato` sotto import concorrenti sulla stessa Atleta: due chiamate quasi simultanee potrebbero entrambe trovare "nessun certificato esistente" e tentare entrambe `creaCertificato`, la seconda urtando il vincolo univoco `atletaId` — stessa classe di problema a bassa probabilità già accettata come Defer in Story 1.3/1.4/1.5/1.6 (singolo Admin, piccola società). Un fix analogo a quello di Story 1.6 (cattura dell'errore di vincolo univoco + retry come update) è possibile ma non banale qui (l'errore Postgres non viene preservato oltre il messaggio in `creaCertificato`) — da rivalutare se questa race si manifestasse realmente. [lib/matching-codice-fiscale/unisci-certificato.ts]
- [x] [Review][Defer] Se `esistente.dataFineValidita` fosse mai un valore non parsabile, il confronto `NaN` risulterebbe sempre falso e l'aggiornamento verrebbe saltato silenziosamente — nessun percorso di scrittura reale in questo codebase produce mai un valore non-ISO per questa colonna (unico scrittore: `creaCertificato`/`aggiornaCertificato`, sempre `.toISOString()`). [lib/matching-codice-fiscale/unisci-certificato.ts]
- [x] [Review][Defer] Il messaggio d'errore generico "Import interrotto: alcune Atlete potrebbero non essere state salvate" non distingue un fallimento nella create/update dell'Atleta (che non è avvenuto) da un fallimento nel solo merge del certificato (l'Atleta è comunque salvata) — coerente con la convenzione di errore generico già stabilita in tutto il progetto. [app/(onboarding-import)/import-atlete/actions.ts]
- [x] [Review][Defer] Una riga con altri campi certificato popolati (es. `Modulo`, `Mesi Validità Cert`) ma senza una `Data Fine Val.Cert` parsabile viene scartata silenziosamente (nessuna riga in `scartate`, nessun segnale) — aggiungere un avviso richiederebbe cambiare la forma del riepilogo dell'import, esplicitamente fuori scope per questa storia (Dev Notes: "il riepilogo non cambia forma"). [app/(onboarding-import)/import-atlete/parser.ts]
- [x] [Review][Defer] Nessun vincolo di controllo a livello DB che imponga `dataInizioValidita <= dataFineValidita` — idea di hardening dei dati, nessuna conseguenza grave oggi (l'Epic 4, che costruirà l'interfaccia di revisione dei certificati, non esiste ancora). [prisma/migrations/20260717090000_add_certificato_medico/migration.sql]
- [x] [Review][Defer] Nessuno storico dei Certificati Medici (un solo record "corrente" per Atleta, sovrascritto integralmente) — decisione architetturale già esplicita e motivata nelle Dev Notes di questa storia, non una lacuna emersa in review. [prisma/schema.prisma]
- [x] [Review][Defer] La policy RLS `SELECT` su `certificati_medici` è scoped solo per Ruolo (Admin/Dirigente/Segreteria), non per relazione Genitore/Atleta — dati sanitari più sensibili dei semplici campi identitari di `Atleta`. Non è una lacuna di questa storia: è esattamente lo scope di FR-27/Epic 5 ("Permessi granulari su dati sanitari"), già pianificato come storia futura dedicata. [prisma/migrations/20260717090000_add_certificato_medico/migration.sql]
- [x] [Review][Defer] Nessun limite di plausibilità sulle date di certificato (es. una data palesemente errata come `01/01/2099` "vincerebbe" sempre il confronto "più recente", seppellendo un certificato legittimo) — nessuna UI espone oggi questi dati per una verifica umana; l'Epic 4 costruirà i flussi di revisione. [app/(onboarding-import)/import-atlete/parser.ts]
- [x] [Review][Defer] Il ciclo di import esegue ora fino a 4 round-trip Supabase sequenziali per riga (erano 2 prima di questa storia) — stesso Defer già accettato in Story 1.3 per il ciclo sequenziale, la scala resta comunque entro NFR5 (~200 Atlete). [app/(onboarding-import)/import-atlete/actions.ts]
- [x] [Review][Defer] Nessun confine transazionale attorno al ciclo per-riga — un fallimento a metà lascia le righe precedenti già salvate, senza indicazione di quali. Il ripetere l'intero file è il percorso di recupero implicito, reso sicuro dall'idempotenza reale (ma non dichiarata esplicitamente) sia dell'upsert Atleta (per Codice Fiscale) sia del merge certificato (per data) — stessa decisione "nessun rollback automatico" di Story 1.1, qui documentata esplicitamente per la prima volta. [app/(onboarding-import)/import-atlete/actions.ts]

## Dev Notes

- **Continuità dalle Story precedenti — cosa riusare:**
  - `trovaPerCodiceFiscale`, `lib/db-rls/atleta.ts` (`creaAtleta`/`aggiornaAtleta`), `parseDataItaliana` (già gestisce il formato `gg/mm/aaaa` e la validazione round-trip delle date, Story 1.3 review) — **non** riscrivere un secondo parser di date per i campi certificato, riusare la stessa funzione già esportata da `parser.ts`.
  - Pattern RLS ormai consolidato (Story 1.3/1.6): policy separate per operazione, GRANT esplicito completo dall'inizio, nessuna policy/GRANT `DELETE` non necessaria, verifica dal vivo con `prisma migrate status` + query dirette a `pg_policies`/`information_schema` prima di considerare la storia conclusa.
  - `requireRuolo(["ADMIN", "DIRIGENTE"])` in `importaAtlete` **non cambia** — FR-22 descrive lo stesso flusso di import di FR-19 (Story 1.3), stessi attori. Non introdurre un nuovo controllo di Ruolo per questa storia.
- **`CertificatoMedico` è protetta da RLS (AD-4, esplicitamente nel bind-list)** — stesso pattern di `Atleta`/`Iscrizione`: client Supabase autenticato (`lib/db-rls/certificato-medico.ts`), mai Prisma diretto a runtime.
- **`unisciCertificato` vive in `lib/matching-codice-fiscale/`, non in un nuovo modulo `lib/certificati/`** — questo è esplicitamente previsto dall'Architecture Spine (AD-5: "un solo modulo condiviso espone due operazioni nominate — `trovaPerCodiceFiscale`... e `unisciCertificato`"), nonostante il nome del modulo suggerisca solo il matching per Codice Fiscale. Non spostarla altrove: Story 1.8 (Riporto Under 13 nel rollover) e la futura Epic 4 la riuseranno da qui.
- **Perché un solo Certificato per Atleta, non uno storico**: l'AC #1 descrive "il sistema aggiorna **la** data" (singolare) — un aggiornamento in-place di un record esistente, non la creazione di una nuova riga storica ad ogni import. L'ERD dell'Architecture Spine mostra `ATLETA ||--o{ CERTIFICATO_MEDICO` (uno-a-molti) — letto come un margine per una futura estensione (Epic 4, rinnovo con un nuovo certificato fisico caricato), non un requisito di questa storia. Se in fase di dev-story questa lettura risultasse sbagliata, fermarsi e chiedere prima di introdurre uno storico multi-riga.
- **Perché `dataFineValidita` è l'unico campo obbligatorio del modello**: è l'unico su cui si basa il confronto "vince la data più recente" (FR-22) — un record senza questo valore non avrebbe senso e non viene mai creato (Task 3/AC #3). `dataInizioValidita`, `mesiValidita`, `modulo` restano opzionali: l'addendum del brief nota che l'export è "più ricco di quanto ipotizzato" ma non garantisce che ogni riga abbia tutti e quattro i campi popolati.
- **Cosa NON fare in questa storia:** nessun upload di file (AD-6, Epic 4), nessuna notifica (FR-12/13, Epic 4), nessuno stato di validazione/conferma da parte della Segreteria (FR-14, Epic 4), nessun alert di scadenza (FR-15, Epic 4), nessun promemoria automatico (FR-16, Epic 4). Questa storia crea solo la tabella minima e la logica di merge all'import — esattamente come dichiarato nell'AC #4 e nel Dev Notes di Story 1.3 ("viene creata qui la tabella minima CertificatoMedico... che l'Epic 4 estenderà").
- **Colonne dell'export non ancora mappate da questa storia**: `Tipo Attività`, `Tesseram.BV/SV`, `Campionato`, campi società/prestito — restano esplicitamente fuori perimetro (vedi addendum del brief), non introdurli.
- **Scala (NFR5):** fino a ~200 Atlete — nessuna ottimizzazione di batching necessaria per il merge, un ciclo semplice riga-per-riga (già il pattern esistente in `importaAtlete`) è adeguato.

### Project Structure Notes

- File nuovi attesi: una migrazione Prisma con SQL RLS grezzo, `lib/db-rls/certificato-medico.ts` e relativo test, `lib/matching-codice-fiscale/unisci-certificato.ts` e relativo test.
- File esistenti da estendere (non ricreare): `prisma/schema.prisma` (nuovo modello), `lib/matching-codice-fiscale/index.ts` (esporta anche `unisciCertificato`), `lib/db-rls/atleta.ts` (`creaAtleta` ora restituisce l'`id`) e il relativo test, `app/(onboarding-import)/import-atlete/parser.ts` e `parser.test.ts`, `app/(onboarding-import)/import-atlete/actions.ts` e `actions.test.ts`.
- Nessuna modifica a `proxy.ts`, `lib/auth/route-guard.ts` (nessuna nuova route), `lib/auth-admin/*`, `lib/anno-agonistico/*`, ai modelli `Utente`/`Ruolo`/`UtenteRuolo`/`Allenatore`/`GenitoreAtleta`/`AnnoAgonistico`/`Iscrizione`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1: Accesso, Popolamento e Iscrizioni / Story 1.7, 1.3 (confini di scope)]
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-22, NFR5]
- [Source: _bmad-output/planning-artifacts/briefs/brief-societa-manager-2026-07-13/addendum.md#Colonne certificato medico: Data Inizio/Fine Val.Cert, Mesi Validità Cert, Modulo]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-4, AD-5, AD-9, Structural Seed (lib/matching-codice-fiscale/: trovaPerCodiceFiscale, unisciCertificato)]
- [Source: _bmad-output/implementation-artifacts/1-3-import-archivio-atlete-da-export-federale.md — parser.ts/actions.ts esistenti da estendere, RLS su Atleta, lezioni sulle policy separate/GRANT/verifica riga modificata, confini di scope espliciti su CertificatoMedico rimandato a questa storia]
- [Source: _bmad-output/implementation-artifacts/1-6-conferma-iscrizione.md — pattern RLS più recente (policy separate, nessun GRANT/policy DELETE non necessario, verifica dal vivo di policy/GRANT)]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Migrazione shadow-DB**: stesso workaround ormai consolidato (Story 1.3/1.4/1.5/1.6) — migrazione scritta a mano e applicata con `prisma migrate deploy`, verificata con `prisma migrate status` (nessun drift).
- **Prisma richiede la relazione dichiarata su entrambi i modelli**: aggiunto `certificatoMedico CertificatoMedico?` su `Atleta` (stesso pattern di `GenitoreAtleta`/`Iscrizione`, Story 1.5/1.6).
- **Bug reale scoperto in verifica dal vivo (non in unit test)**: `creaAtleta`/`aggiornaAtleta` venivano chiamate passando l'intera `riga` del parser, che ora include il campo `certificato` — TypeScript non segnala errore (nessun controllo di proprietà eccedenti quando si passa una variabile, solo per i letterali oggetto), ma a runtime PostgREST rifiutava l'insert/update con `"Could not find the 'certificato' column of 'atlete' in the schema cache"`. I test unitari (mock) non l'avevano rilevato perché non validano la forma esatta del payload verso Supabase. Risolto destrutturando `const { certificato, ...datiAtleta } = riga` prima di chiamare `creaAtleta`/`aggiornaAtleta`, passando `certificato` solo a `unisciCertificato`. Riverificato dal vivo con esito positivo.
- Verifiche eseguite e passate: `npx vitest run` (149/149 test), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun errore), `npm run build` (build completata).
- **Verifica end-to-end reale eseguita** (Playwright, file `.xlsx` generati in memoria con `exceljs`, contro il backend Supabase locale, non mockato, 4 import successivi sulla stessa Atleta di test): import con dati certificato → `CertificatoMedico` creato (AC #2); re-import con `dataFineValidita` più vecchia → certificato invariato (AC #1, confermato via query diretta al DB); re-import con `dataFineValidita` più recente → certificato aggiornato (AC #1); re-import senza alcun dato di certificato → Atleta comunque aggiornata, certificato lasciato invariato (AC #3). Stato finale confermato via query diretta: `dataFineValidita` e `modulo` corrispondono esattamente all'ultimo import con data più recente, non a quelli intermedi. Dati di test ripuliti dal DB al termine, Playwright disinstallato.
- **Code review (2026-07-17):** 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) hanno trovato — con corroborazione tra Blind Hunter ed Edge Case Hunter sul finding principale — che `unisciCertificato` sovrascriveva l'intero record invece di fare un merge per-campo (un import con `modulo`/`mesiValidita` vuoti per quella riga avrebbe azzerato dati corretti già salvati), che `Mesi Validità Cert` non veniva validato come intero, un narrowing di tipo fragile in `actions.ts`, e una copertura di test incompleta sul payload di `certificato-medico.ts`. Nessuna violazione degli AC trovata dall'Acceptance Auditor. Un sub-agent ha segnalato (erroneamente) un presunto prompt injection che in realtà era il normale meccanismo di system-reminder della sessione — nessun impatto sulla review. Tutte e 4 le patch applicate con TDD dove pertinente; il fix del merge per-campo riverificato dal vivo con 2 import successivi (data aggiornata, campi secondari preservati, confermato via query diretta al DB). Suite completa: `npx vitest run` (152/152 test), typecheck/lint/build verdi.

### Completion Notes List

- Implementati Task 1-6: modello `CertificatoMedico` (RLS, un solo Certificato "corrente" per Atleta), `lib/db-rls/certificato-medico.ts`, seconda operazione del motore condiviso AD-5 (`unisciCertificato` in `lib/matching-codice-fiscale/`), parser esteso con le 4 nuove colonne (nessuna obbligatoria), `creaAtleta` esteso per restituire l'`id` generato, Server Action `importaAtlete` estesa con il merge del certificato.
- **Decisione architetturale applicata come da Dev Notes**: `unisciCertificato` vive in `lib/matching-codice-fiscale/`, non in un nuovo modulo dedicato — coerente con AD-5, nessuna obiezione emersa in fase di sviluppo.
- **Scope rispettato**: nessun upload di file, notifica, stato di validazione o alert di scadenza — tutti esplicitamente rimandati all'Epic 4 (AC #4, Dev Notes).
- Nessun elemento bloccato da vincoli ambientali; unico problema reale scoperto e risolto durante la verifica dal vivo (vedi Debug Log — bug di payload, non un problema di RLS/GRANT come nelle storie precedenti).
- **Post-review (patch applicate)**: `unisciCertificato` ora fa un merge per-campo invece di sovrascrivere l'intero record, `Mesi Validità Cert` validato come intero, narrowing di tipo reso esplicito in `actions.ts`, copertura di test estesa su tutti i campi del payload certificato.

### File List

**Creati:**
- `prisma/migrations/20260717090000_add_certificato_medico/migration.sql`
- `lib/db-rls/certificato-medico.ts`
- `lib/db-rls/certificato-medico.test.ts`
- `lib/matching-codice-fiscale/unisci-certificato.ts`
- `lib/matching-codice-fiscale/unisci-certificato.test.ts`

**Modificati:**
- `prisma/schema.prisma` (nuovo modello `CertificatoMedico`; back-reference `certificatoMedico` su `Atleta`)
- `lib/matching-codice-fiscale/index.ts` (esporta anche `unisciCertificato`)
- `lib/db-rls/atleta.ts` (`creaAtleta` ora restituisce l'`id` generato invece di `void`)
- `lib/db-rls/atleta.test.ts` (test aggiornato per il nuovo valore di ritorno)
- `app/(onboarding-import)/import-atlete/parser.ts` (nuovo campo `certificato` sulla riga importata, dalle 4 colonne dell'export; post-review: `parseNumeroCella` valida un intero)
- `app/(onboarding-import)/import-atlete/parser.test.ts` (nuovi test per le colonne certificato; post-review: nuovo test per il valore non intero)
- `app/(onboarding-import)/import-atlete/actions.ts` (merge del certificato integrato nel ciclo di import; fix del bug payload, vedi Debug Log; post-review: `const` locale esplicito per il narrowing di tipo)
- `app/(onboarding-import)/import-atlete/actions.test.ts` (nuovi test per l'integrazione del merge)
- `lib/matching-codice-fiscale/unisci-certificato.ts` (post-review: merge per-campo invece di sovrascrittura totale)
- `lib/matching-codice-fiscale/unisci-certificato.test.ts` (post-review: 2 nuovi test per il merge per-campo)
- `lib/db-rls/certificato-medico.test.ts` (post-review: asserzioni estese a tutti i campi del payload)

## Change Log

- 2026-07-17: Implementazione completa Story 1.7 (Task 1-6). Seconda tabella RLS del progetto dopo `Iscrizione` (Story 1.6) — stesso pattern ormai consolidato (policy separate, GRANT esplicito completo dall'inizio), qui con `UPDATE` realmente usato da `unisciCertificato` (a differenza di `Iscrizione`, dove lo stesso privilegio era risultato inutilizzato ed è stato rimosso in code review). Seconda operazione del motore condiviso AD-5 (`unisciCertificato`), già prevista testualmente nell'Architecture Spine. Scoperto e risolto dal vivo un bug reale non rilevato dai test unitari (campo `certificato` passato per errore a `creaAtleta`/`aggiornaAtleta`, rifiutato da PostgREST). Tutti gli AC verificati anche contro un backend reale (Playwright + query dirette DB, 4 import successivi sulla stessa Atleta).
- 2026-07-17: Code review. Applicate 4 patch (merge per-campo in `unisciCertificato` invece di sovrascrittura totale, validazione intero su `Mesi Validità Cert`, narrowing di tipo reso esplicito, copertura di test estesa). Nessuna violazione degli AC. Suite completa e verifica dal vivo del fix principale riverificate con esito positivo. Status → done.
