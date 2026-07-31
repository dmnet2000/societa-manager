---
baseline_commit: 5e402d0c62794bbfd8c9caafb4fe68e8be045925
---

# Story 9.18: Creazione di una nuova Atleta da parte dell'Allenatore

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore assegnato a un Gruppo,
I want poter inserire una nuova Atleta che non trovo nell'elenco, direttamente dalla pagina del mio Gruppo,
so that non devo aspettare che la Segreteria la registri altrove prima di poterla aggiungere alla squadra.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-30). Dati richiesti: Cognome, Nome, data di nascita, Codice Fiscale (obbligatori); email e cellulare (opzionali). "La pagina del mio Gruppo" per un Allenatore è `/i-miei-gruppi` (Story 9.15, `MioGruppoCard.tsx`) — **non** `/gruppi` (Admin/Dirigente-only, non va toccata).

**Decisione presa con l'utente in fase di creazione storia (2026-07-31)**: **AD-10 esteso**. Oggi `lib/db-rls/atleta.ts` → `creaAtleta` è dichiarata di proprietà esclusiva di Onboarding-Import (commento `AD-10: solo i campi identitari di Atleta`). Chiesto esplicitamente se allargare questo confine o mantenere la creazione formalmente dentro `(onboarding-import)`: **risposta → estendere AD-10** — il form resta sulla pagina del Gruppo (`(gruppi-allenatori)`), la nuova Server Action richiama la stessa `creaAtleta()` condivisa (nessuna duplicazione della logica di creazione). `ARCHITECTURE-SPINE.md` va aggiornato di conseguenza (Task 0).

## Acceptance Criteria

1. **Given** un Allenatore sulla pagina `/i-miei-gruppi`, su un Gruppo che gestisce, che non trova un'Atleta nell'elenco esistente **When** apre il form "nuova Atleta" e compila Cognome, Nome, data di nascita, Codice Fiscale (obbligatori) ed eventualmente email e/o cellulare (opzionali) **Then** una nuova Atleta viene creata (con `sesso` derivato dal Codice Fiscale) e assegnata automaticamente al Gruppo dell'Allenatore per la stagione corrente
2. **Given** lo stesso form **When** il Codice Fiscale inserito non rispetta il formato valido, appartiene a un'Atleta già esistente in anagrafica, o non permette di derivare un sesso valido **Then** l'inserimento viene rifiutato con un messaggio chiaro e specifico per ciascun caso, nessuna Atleta duplicata viene creata
3. **Given** una nuova Atleta creata da un Allenatore con questo flusso **When** l'inserimento va a buon fine **Then** viene generata una notifica visibile alla Segreteria (e Admin/Dirigente) nella pagina `/notifiche`, con un testo che indica chiaramente che si tratta di una nuova Atleta (non di un certificato caricato) — nessuna regressione sulle notifiche esistenti di caricamento certificato (Story 4.2)
4. **Given** un Allenatore che non gestisce un dato Gruppo **When** tenta di inserire una nuova Atleta su quel Gruppo (manomissione form/URL) **Then** l'operazione viene rifiutata, stesso principio di autorizzazione già stabilito per `assegnaAtleta` (Story 9.15)
5. **And** nessuna regressione sul comportamento esistente di creazione Atleta da Onboarding-Import (Story 1.2/1.7), di assegnazione Atleta a Gruppo (Story 2.4/9.15), né delle notifiche di caricamento certificato (Story 4.2) — suite Vitest invariata

## Tasks / Subtasks

- [x] Task 0: Aggiornare AD-10 in ARCHITECTURE-SPINE.md (decisione presa con l'utente)
  - [x] Regola AD-10 estesa per riconoscere esplicitamente `(gruppi-allenatori)` come secondo punto di scrittura autorizzato per i campi identitari di Atleta (tramite la stessa `creaAtleta()` condivisa, nessuna logica di creazione duplicata), titolo/tag `[AGGIORNATO, 2026-07-31 — Story 9.18]`; aggiunta AD-10 alla riga "Gruppi e Allenatori" della tabella dei moduli.
- [x] Task 1: Migrazione schema — `Atleta.email`/`cellulare` nullable, `Notifica.tipo` enum (AC: #1, #3)
  - [x] Nuova migrazione scritta a mano `prisma/migrations/20260731000000_atleta_contatti_notifica_tipo/migration.sql`: `ALTER TABLE "atlete" ADD COLUMN "email" TEXT; ALTER TABLE "atlete" ADD COLUMN "cellulare" TEXT;` — nessun nuovo GRANT necessario.
  - [x] Stesso file: `CREATE TYPE "TipoNotifica" AS ENUM (...); ALTER TABLE "notifiche" ADD COLUMN "tipo" "TipoNotifica" NOT NULL DEFAULT 'CERTIFICATO_CARICATO';`.
  - [x] `prisma/schema.prisma` aggiornato: `Atleta.email`/`cellulare`, `enum TipoNotifica`, `Notifica.tipo`.
  - [x] `npx prisma validate` eseguito con successo; `npx prisma generate` eseguito per rigenerare i tipi TypeScript (`prisma migrate deploy` non eseguibile in questa sessione, nessuna istanza Supabase locale).
- [x] Task 2: Decodifica del sesso dal Codice Fiscale (AC: #1, #2)
  - [x] Nuovo file `lib/matching-codice-fiscale/estrai-sesso-da-codice-fiscale.ts`: `estraiSessoDaCodiceFiscale(codiceFiscale: string): Sesso | null` — estrae i caratteri alle posizioni 9-10, `01-31` maschio, `41-71` femmina, `null` se non numerico/fuori range/stringa troppo corta. Omocodia non gestita (documentato), nessun cross-check con la data di nascita.
  - [x] 7 test (giorno 01/31 maschio, 41/71 femmina, caratteri non numerici, fuori range, stringa troppo corta).
- [x] Task 3: Estendere `creaAtleta`/`creaNotifica` per i nuovi campi (AC: #1, #3, #5)
  - [x] `lib/db-rls/atleta.ts`: `DatiAtletaIdentitari` guadagna `email?: string | null` e `cellulare?: string | null`. 1 nuovo test.
  - [x] `lib/db-rls/notifica.ts`: `creaNotifica(supabase, atletaId, tipo: TipoNotifica = "CERTIFICATO_CARICATO")` — il chiamante esistente (`certificato-medico/actions.ts`) resta invariato, verificato con la sua suite (28/28 invariata). `elencaNotifiche`/`NotificaElenco` estesi con `tipo`. 3 nuovi test.
- [x] Task 4: Nuova Server Action `creaEAssegnaAtleta` (AC: #1, #2, #3, #4)
  - [x] `app/(gruppi-allenatori)/gruppi/actions.ts`: nuova funzione esportata, stesso perimetro di Ruolo di `assegnaAtleta`.
  - [x] Validazione in ordine: `gruppoId`, `cognome`/`nome`/`dataNascita`/`codiceFiscale` obbligatori, formato Codice Fiscale, poi `estraiSessoDaCodiceFiscale` (errore dedicato se `null`).
  - [x] Gruppo risolto + `risolviPossessoGruppo` riusato (AC #4).
  - [x] Codice Fiscale duplicato verificato (AC #2), nessuna scrittura se trovato.
  - [x] `nome` = `` `${cognome} ${nome}` `` concatenato, nessuna nuova colonna `cognome`.
  - [x] Creazione via `creaAtleta` (Task 3), poi assegnazione con lo stesso upsert atomico di `assegnaAtleta` — bloccante se fallisce.
  - [x] Notifica `NUOVO_ATLETA` non bloccante (try/catch proprio, stesso pattern di `certificato-medico/actions.ts`).
  - [x] `revalidatePath("/i-miei-gruppi")` al successo. 16 nuovi test, 53/53 totali in `actions.test.ts`.
- [x] Task 5: Nuovo form "Nuova Atleta" in `MioGruppoCard.tsx` (AC: #1, #2)
  - [x] Nuovo `useActionState(creaEAssegnaAtleta, undefined)` indipendente, secondo `<form>` sotto quello "Assegna Atleta" esistente.
  - [x] Campi: Cognome, Nome, Data di nascita, Codice Fiscale (obbligatori), Email, Cellulare (opzionali), `gruppoId` hidden.
  - [x] Reset del form al successo (`useEffect`, stesso pattern del form esistente).
  - [x] Nessun `window.confirm` (nessun rischio equivalente alla riassegnazione).
  - [x] Nuova classe `.formNuovaAtleta` in `i-miei-gruppi.module.css`.
- [x] Task 6: Estendere `/notifiche` per il nuovo tipo (AC: #3, #5)
  - [x] `lib/db-rls/notifica.ts`: `NotificaElenco`/`elencaNotifiche` già estesi con `tipo` (Task 3).
  - [x] `app/(certificati-medici)/notifiche/page.tsx`: testo per riga condizionale su `notifica.tipo` — invariato per `CERTIFICATO_CARICATO`, nuovo testo per `NUOVO_ATLETA`.
- [x] Task 7: Test (AC: #1-#5)
  - [x] `lib/matching-codice-fiscale/estrai-sesso-da-codice-fiscale.test.ts`: 7 test.
  - [x] `app/(gruppi-allenatori)/gruppi/actions.test.ts`: 16 nuovi test per `creaEAssegnaAtleta` (successo, ogni validazione, CF non valido/duplicato/sesso non derivabile, FORBIDDEN, fallimento creazione/assegnazione, notifica non bloccante).
  - [x] `lib/db-rls/atleta.test.ts`/`lib/db-rls/notifica.test.ts`: 1 + 3 nuovi test.
  - [x] Nessun test di rendering per `MioGruppoCard.tsx`/`notifiche/page.tsx`.
  - [x] Suite Vitest completa: 776/776 test passati (68 file), inclusa `certificato-medico/actions.test.ts` invariata (28/28). `npx tsc --noEmit` ed ESLint puliti su tutti i file di questa storia.

### Review Findings

- [x] [Review][Patch] Nessuna policy RLS INSERT per ALLENATORE su "atlete" — l'attore Allenatore (AC #1) non riesce mai a creare l'Atleta in produzione: `creaAtleta` scrive tramite il client Supabase con la sessione dell'utente (mai Prisma diretto, AD-9), ma l'unica policy INSERT esistente su `atlete` (`admin_dirigente_segreteria_insert`, migrazione 20260716080000) ammette solo ADMIN/DIRIGENTE/SEGRETERIA. Un Allenatore riceve l'errore generico "Impossibile creare l'Atleta. Riprova." (RLS nega l'insert, inghiottito dal catch). Fix: nuova migrazione `20260731010000_creaeassegnaatleta_rls_fix` con policy `allenatore_nuova_atleta_insert`. [prisma/migrations/20260731010000_creaeassegnaatleta_rls_fix/migration.sql, lib/db-rls/atleta.ts:49]
- [x] [Review][Patch] Nessuna policy RLS INSERT su "notifiche" per ALLENATORE/ADMIN/DIRIGENTE — la notifica NUOVO_ATLETA (AC #3) non viene mai creata in produzione: l'unica policy INSERT esistente (`genitore_atleta_crea_notifica`, migrazione 20260718050000) ammette solo GENITORE/ATLETA. L'errore RLS è inghiottito dal catch non bloccante di `creaEAssegnaAtleta`, quindi l'azione riporta comunque successo senza che la notifica venga mai scritta. Fix: stessa nuova migrazione, policy `allenatore_admin_dirigente_notifica_nuova_atleta_insert` scoped a `tipo = 'NUOVO_ATLETA'`. [prisma/migrations/20260731010000_creaeassegnaatleta_rls_fix/migration.sql, app/(gruppi-allenatori)/gruppi/actions.ts:492]
- [x] [Review][Patch] `prisma.atleta.findUnique` (connessione privilegiata) usato per il controllo Codice Fiscale duplicato — viola AD-9 (Atleta è RLS-protetta, mai Prisma diretto a runtime salvo le tabelle esplicitamente elencate, che non includono Atleta). Fix: spostata la creazione del client `supabase` prima di questo controllo, sostituito con `supabase.from("atlete").select("id").eq("codiceFiscale", codiceFiscale).maybeSingle()` (le policy SELECT già coprono sia ADMIN/DIRIGENTE/SEGRETERIA sia ALLENATORE). Test aggiornati (`atletaMaybeSingleMock` sostituisce `atletaFindUniqueMock`). [app/(gruppi-allenatori)/gruppi/actions.ts:462-466]
- [x] [Review][Patch] Commento AD-10 obsoleto in `lib/db-rls/atleta.ts` (righe 5-6) — dichiara ancora "proprietà esclusiva di Onboarding-Import", contraddicendo l'AD-10 appena aggiornato in ARCHITECTURE-SPINE.md nello stesso diff. Fix: commento riscritto per riflettere i due moduli autorizzati. [lib/db-rls/atleta.ts:5-6]
- [x] [Review][Patch] `creaEAssegnaAtleta` non chiama `revalidatePath("/gruppi")` come fanno invece `assegnaAtleta`/`rimuoviAtleta` — un ADMIN/DIRIGENTE che usa questa action (autorizzato da `requireRuolo`) vede `/gruppi` con dati stantii dopo il successo. Fix: aggiunta la stessa coppia `revalidatePath("/gruppi")` + `revalidatePath("/i-miei-gruppi")`. [app/(gruppi-allenatori)/gruppi/actions.ts:543]
- [x] [Review][Patch] Testo notifica "Nuova Atleta inserita da un Allenatore" attribuito sempre allo stesso ruolo anche quando l'azione è eseguita da ADMIN/DIRIGENTE (entrambi autorizzati a chiamare `creaEAssegnaAtleta`) — attribuzione fuorviante. Fix: testo neutro "Nuova Atleta inserita: {nome}", nessuna attribuzione di Ruolo. [app/(certificati-medici)/notifiche/page.tsx:47-49]
- [x] [Review][Patch] Nessuna validazione di parsing su `dataNascita` — un valore non parsabile (bypass del widget `<input type="date">`, es. richiesta manomessa) genera un `RangeError` interno in `creaAtleta`/`serializza` mascherato dall'errore generico "Impossibile creare l'Atleta. Riprova." invece di un errore di validazione chiaro. Fix: `Number.isNaN(dataNascita.getTime())` con messaggio VALIDATION dedicato, più 1 nuovo test. [app/(gruppi-allenatori)/gruppi/actions.ts:389,493]
- [x] [Review][Patch] Copertura di test: nessun test esercita il percorso di successo con un vero attore ALLENATORE proprietario del Gruppo — tutti i test di successo di `creaEAssegnaAtleta` girano sotto la sessione ADMIN di default (`beforeEach`); l'unico test con sessione ALLENATORE copre il caso FORBIDDEN. La storia si chiama "creazione da parte dell'Allenatore" ma quel percorso specifico non è mai verificato dalla suite. Fix: 1 nuovo test con sessione ALLENATORE + `GruppoAllenatore` posseduto. [app/(gruppi-allenatori)/gruppi/actions.test.ts]
- [x] [Review][Defer] Race TOCTOU sul controllo Codice Fiscale duplicato (check-then-insert, non atomico) — deferred, pre-esistente (stessa classe di rischio a bassa probabilità già accettata in Story 1.4/1.5/9.5/9.9). [app/(gruppi-allenatori)/gruppi/actions.ts:462-500]
- [x] [Review][Defer] Nessun rollback se l'upsert di assegnazione al Gruppo fallisce dopo la creazione riuscita dell'Atleta — deferred, mitigato (l'Atleta orfana ricompare nel form "Assegna Atleta" esistente per un tentativo successivo), stesso principio "nessun rollback automatico" già accettato ovunque nel progetto. [app/(gruppi-allenatori)/gruppi/actions.ts:484-531]
- [x] [Review][Defer] `isCodiceFiscaleValido` non fa un controllo del checksum (solo formato 16 caratteri alfanumerici) — deferred, limite preesistente da Story 1.4, riusato qui senza modifiche. [lib/matching-codice-fiscale/valida-codice-fiscale.ts]

## Dev Notes

- **`nome` resta un'unica colonna**: Atleta non ha (e questa storia non aggiunge) una colonna `cognome` separata — tutta l'anagrafica esistente (import federale, Story 1.2, `import-atlete/parser.ts`) salva "Cognome e Nome" concatenato in `nome`. Il form mostra due campi separati per UX/validazione migliori, ma li concatena nello stesso formato prima di scrivere.
- **Perché `sesso` va derivato e non richiesto nel form**: l'utente ha elencato solo Cognome/Nome/data di nascita/Codice Fiscale (+ email/cellulare opzionali) — `sesso` è `NOT NULL` su `Atleta` ma il Codice Fiscale lo codifica deterministicamente (posizioni 9-10, +40 sul giorno per il sesso femminile). Nessuna nuova domanda da porre all'Allenatore.
- **Perché la Notifica ha bisogno di un `tipo`**: `Notifica` (Story 4.2) è oggi a scopo singolo — riusarla senza distinzione mostrerebbe "Nuovo certificato caricato per..." anche per una neonata Atleta, un'informazione falsa. Il nuovo campo `tipo` con default retrocompatibile evita qualunque migrazione dei dati esistenti.
- **Perché l'assegnazione al Gruppo è bloccante ma la notifica no**: l'assegnazione automatica al Gruppo è parte della garanzia esplicita di AC #1 ("...e assegnata automaticamente..."), un suo fallimento deve essere visibile all'Allenatore. La notifica alla Segreteria è un effetto informativo collaterale, stesso principio già stabilito per il caricamento certificato (Story 4.2/4.3, `certificato-medico/actions.ts`) — non bloccante per non far fallire un'operazione già riuscita per una notifica di cortesia.
- **AD-10 esteso — non una violazione silenziosa**: `creaAtleta` (`lib/db-rls/atleta.ts`) viene ora richiamata anche da `(gruppi-allenatori)`, non solo da `(onboarding-import)`. Decisione esplicita dell'utente (Task 0 aggiorna il testo dell'AD in `ARCHITECTURE-SPINE.md`) — non dedurre in una futura review che questo sia un confine rotto per errore.
- **Omocodia non gestita**: la decodifica del sesso (Task 2) assume che le posizioni 9-10 del Codice Fiscale siano cifre numeriche dirette. Nel raro caso di omocodia su quel campo specifico (collisione anagrafica), la funzione restituisce `null` e l'azione rifiuta l'inserimento con un messaggio chiaro — non un dato silenziosamente sbagliato. Non implementare la decodifica completa dell'omocodia (fuori scope, complessità sproporzionata per un caso limite).
- **File NON da toccare**: `app/(gruppi-allenatori)/gruppi/page.tsx`, `GruppoRow.tsx`, `NuovoGruppoForm.tsx` (pagina Admin/Dirigente, invariata), `creaGruppo`/`assegnaAllenatore` (fuori scope), `app/(onboarding-import)/import-atlete/*` (creazione Atleta da import, invariata — Task 3 estende solo il *tipo* dei dati accettati da `creaAtleta`, non il comportamento esistente).

### Project Structure Notes

- File nuovi: `prisma/migrations/20260731000000_atleta_contatti_notifica_tipo/migration.sql`, `lib/matching-codice-fiscale/estrai-sesso-da-codice-fiscale.ts`, `lib/matching-codice-fiscale/estrai-sesso-da-codice-fiscale.test.ts`.
- File modificati: `prisma/schema.prisma` (Atleta.email/cellulare, enum TipoNotifica, Notifica.tipo), `lib/db-rls/atleta.ts` (DatiAtletaIdentitari esteso), `lib/db-rls/notifica.ts` (creaNotifica con tipo, elencaNotifiche con tipo), `app/(gruppi-allenatori)/gruppi/actions.ts` (nuova `creaEAssegnaAtleta`), `app/(gruppi-allenatori)/gruppi/actions.test.ts`, `app/(gruppi-allenatori)/i-miei-gruppi/MioGruppoCard.tsx` (nuovo form), `app/(certificati-medici)/notifiche/page.tsx` (testo per tipo), `_bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md` (AD-10 esteso).
- Riuso invariato: `isCodiceFiscaleValido`, `risolviPossessoGruppo`, l'upsert atomico di `assegnaAtleta`, il pattern non-bloccante di `certificato-medico/actions.ts` per la notifica.
- Nuovo modulo? No — la Server Action resta in `(gruppi-allenatori)` (AD-10 esteso, Task 0), coerente con dove vive già `assegnaAtleta`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.18 — Acceptance Criteria]
- [Source: lib/db-rls/atleta.ts — creaAtleta/DatiAtletaIdentitari da estendere, commento AD-10 da riconciliare con l'AD aggiornato]
- [Source: app/(gruppi-allenatori)/gruppi/actions.ts — assegnaAtleta/risolviPossessoGruppo da riusare per creaEAssegnaAtleta]
- [Source: app/(gruppi-allenatori)/i-miei-gruppi/MioGruppoCard.tsx — componente da estendere col nuovo form]
- [Source: lib/matching-codice-fiscale/valida-codice-fiscale.ts — isCodiceFiscaleValido esistente, da riusare]
- [Source: app/(certificati-medici)/certificato-medico/actions.ts righe ~104-113 — pattern "notifica non bloccante" da replicare identico]
- [Source: lib/db-rls/notifica.ts, app/(certificati-medici)/notifiche/page.tsx — Notifica/elencaNotifiche/pagina da estendere con tipo]
- [Source: app/(onboarding-import)/import-atlete/parser.ts riga ~161 — convenzione "Cognome e Nome" concatenato in nome]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md righe 79-82 — testo AD-10 da aggiornare (Task 0)]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno (ciclo TDD lineare per ogni task — l'unica sorpresa: il test di `creaAtleta` con `email`/`cellulare` extra passava già a runtime prima ancora di estendere il tipo `DatiAtletaIdentitari`, dato che `creaAtleta` spreadava già `...dati` senza validazione di forma — l'estensione del tipo era comunque necessaria per la type-safety del nuovo chiamante).

### Completion Notes List

- **AD-10 esteso**: `ARCHITECTURE-SPINE.md` aggiornato esplicitamente (Task 0) — `(gruppi-allenatori)` è ora il secondo modulo autorizzato a richiamare `creaAtleta()` condivisa, oltre a Onboarding-Import.
- **Migrazione**: `Atleta.email`/`cellulare` (nullable) + `enum TipoNotifica` + `Notifica.tipo` (default `CERTIFICATO_CARICATO`, retrocompatibile — nessun backfill necessario per le righe Story 4.2 esistenti). `npx prisma validate`/`generate` eseguiti con successo.
- **`estraiSessoDaCodiceFiscale`**: decodifica le posizioni 9-10 del CF (01-31 maschio, 41-71 femmina); omocodia non gestita — restituisce `null` esplicito invece di un dato sbagliato silenzioso.
- **`creaEAssegnaAtleta`**: nuova Server Action in `gruppi/actions.ts`, riusa `risolviPossessoGruppo` (Story 9.15) invariato per l'autorizzazione. Assegnazione al Gruppo bloccante (parte della garanzia di AC #1); notifica `NUOVO_ATLETA` non bloccante, stesso pattern già stabilito in `certificato-medico/actions.ts` (verificato: la sua suite, 28/28, resta invariata dopo l'estensione di `creaNotifica`).
- **Form "Nuova Atleta"**: aggiunto in `MioGruppoCard.tsx` (secondo `useActionState` indipendente), nessun `window.confirm` (nessun rischio di sottrarre un'Atleta a un altro Allenatore, a differenza dell'assegnazione di un'Atleta esistente).
- **`/notifiche`**: testo per riga condizionale su `tipo`, invariato per `CERTIFICATO_CARICATO`.
- Suite completa: 776/776 test (68 file), `tsc --noEmit` pulito, ESLint pulito su tutti i file di questa storia (i 3 problemi rilevati dal linter sono pre-esistenti in `wizard-nuova-stagione`, non toccato).

### File List

**Nuovi:**

- `prisma/migrations/20260731000000_atleta_contatti_notifica_tipo/migration.sql`
- `lib/matching-codice-fiscale/estrai-sesso-da-codice-fiscale.ts`
- `lib/matching-codice-fiscale/estrai-sesso-da-codice-fiscale.test.ts`
- `prisma/migrations/20260731010000_creaeassegnaatleta_rls_fix/migration.sql` (code review fix)

**Modificati:**

- `prisma/schema.prisma`
- `lib/db-rls/atleta.ts`
- `lib/db-rls/atleta.test.ts`
- `lib/db-rls/notifica.ts`
- `lib/db-rls/notifica.test.ts`
- `app/(gruppi-allenatori)/gruppi/actions.ts`
- `app/(gruppi-allenatori)/gruppi/actions.test.ts`
- `app/(gruppi-allenatori)/i-miei-gruppi/MioGruppoCard.tsx`
- `app/(gruppi-allenatori)/i-miei-gruppi/i-miei-gruppi.module.css`
- `app/(certificati-medici)/notifiche/page.tsx`
- `_bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md`

## Change Log

- 2026-07-31: Implementata Story 9.18 — creazione di una nuova Atleta da parte dell'Allenatore, direttamente da `/i-miei-gruppi`. AD-10 esteso (deciso con l'utente); migrazione per `Atleta.email`/`cellulare` e `Notifica.tipo`; nuova `estraiSessoDaCodiceFiscale`; nuova Server Action `creaEAssegnaAtleta` (crea + assegna + notifica non bloccante); nuovo form in `MioGruppoCard.tsx`; `/notifiche` esteso con testo per tipo. 776/776 test passati, 0 errori tsc/eslint. Status: review.
- 2026-07-31: Code review — 2 finding `HIGH` critici (nessuna policy RLS INSERT su "atlete"/"notifiche" per ALLENATORE, il percorso AC #1/#3 non era mai raggiungibile in produzione, mascherato da errori generici e da un catch non bloccante) più 5 finding minori, tutti risolti con patch (nuova migrazione RLS, query CF duplicato spostata da Prisma diretto a client Supabase/AD-9, commento AD-10 riconciliato, `revalidatePath("/gruppi")` aggiunto, testo notifica neutro sul Ruolo, validazione `dataNascita`, 2 nuovi test inclusa la copertura del percorso ALLENATORE). 3 finding deferiti (race TOCTOU su CF, nessun rollback su assegnazione fallita, checksum CF pre-esistente). 778/778 test, 0 errori tsc/eslint. Status: done.
