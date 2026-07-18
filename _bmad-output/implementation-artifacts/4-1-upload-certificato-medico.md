---
baseline_commit: NO_VCS
---

# Story 4.1: Upload certificato medico

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Genitore o Atleta,
I want caricare il file del Certificato Medico dall'app,
so that non devo consegnarlo di persona o rincorrere la segreteria.

## Acceptance Criteria

1. **Given** sono autenticato come Genitore (della propria figlia/o) o come Atleta, **when** carico il file del Certificato Medico, **then** il file è salvato in modo privato (bucket Storage non pubblico, AD-6) e collegato all'Atleta.
2. L'accesso al file avviene solo tramite URL firmati a scadenza breve, generati lato server dopo verifica dei permessi — nessun URL pubblico o permanente.
3. Un Genitore con più figlie/i sceglie esplicitamente per quale Atleta sta caricando il file — non un caricamento ambiguo o implicito.
4. Ricaricare un file per la stessa Atleta sostituisce il precedente (un solo Certificato Medico "corrente" per Atleta, coerente con il modello dati esistente da Story 1.7) — non due file scollegati.

## Prerequisiti architetturali di questa storia (da leggere prima di iniziare)

Questa è la prima storia di Epic 4 e la prima di tutta la codebase a toccare Supabase Storage. Introduce tre estensioni non anticipate dalla ricerca iniziale, oltre al lavoro previsto da AD-6.

### 1. Bucket Storage privato + policy RLS su `storage.objects` (AD-6)

Nessun bucket esiste ancora. Va creato via migrazione (non dashboard, per restare riproducibile in locale/CI come ogni altra parte di questo schema):

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('certificati-medici', 'certificati-medici', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']);
```

`storage.objects` ha già RLS abilitata e i GRANT di base verso `authenticated` per definizione dell'estensione Storage di Supabase — servono solo le POLICY, non nuovi GRANT (a differenza delle tabelle nello schema `public` di questo progetto). Percorso file: `{atletaId}/{filename}` — permette alle policy di isolare per Atleta tramite `(storage.foldername(name))[1]`, idiom standard di Supabase Storage.

### 2. Nuova funzione `SECURITY DEFINER`: `utente_possiede_atleta`

A differenza di `atleta_possiede_presenza` (Story 3.2, gated su `autoAggancio = true` per escludere l'accesso di un Genitore ai dati identity-specific di una figlia), qui la semantica è opposta: **sia l'aggancio a se stessa sia l'aggancio Genitore↔figlia devono dare accesso** — gestire il certificato di una figlia è esattamente il compito di un Genitore (AC #1). Nessun gate su `autoAggancio`:

```sql
CREATE OR REPLACE FUNCTION utente_possiede_atleta(atleta_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "genitori_atlete" ga
    JOIN "utenti" u ON u."id" = ga."utenteId"
    WHERE ga."atletaId" = atleta_id_param
      AND u."supabaseAuthId" = auth.uid()::text
  );
$$;
```

Riusata identica per tre superfici distinte: le policy `certificati_medici`, le policy `storage.objects` (bucket `certificati-medici`), e la nuova policy SELECT su `atlete` sotto.

### 3. Gap scoperto in fase di analisi: nessun accesso Genitore/Atleta a `atlete` né a `certificati_medici`

La ricerca preliminare ha confermato che le policy RLS esistenti su `certificati_medici` (Story 1.7) sono scoped **solo** per ADMIN/DIRIGENTE/SEGRETERIA — zero accesso per Genitore/Atleta. Questo non è lo scope di FR-27/Epic 5 ("permessi granulari sui dati sanitari", pianificata come storia futura separata): è un prerequisito bloccante di **questa** storia, perché AC #1 richiede esplicitamente che Genitore/Atleta possano scrivere (e implicitamente leggere lo stato) il proprio Certificato. Analogamente, nessuna policy SELECT su `atlete` esiste oggi per Genitore/Atleta — necessaria per mostrare il nome della propria Atleta nel selettore (AC #3), non solo un id grezzo. Entrambe le lacune vanno colmate in Task 1, con la stessa funzione `utente_possiede_atleta` sopra, gated anche sul Ruolo (`(auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['GENITORE', 'ATLETA']`) per coerenza con il pattern di difesa in profondità già stabilito in Story 3.1/3.2.

### 4. `CertificatoMedico.dataFineValidita` diventa nullable

Lo schema attuale rende `dataFineValidita` obbligatoria (Story 1.7: "un record senza questo valore non viene mai creato", vero per il solo flusso di import). Questa storia introduce un secondo percorso di creazione — l'upload di un file senza che Genitore/Atleta inseriscano manualmente una data di scadenza (quella spetta alla Segreteria in sede di conferma, Story 4.4: transcriverla da un documento cartaceo non è compito di chi carica il file). Un Certificato caricato ma non ancora confermato deve poter esistere con `dataFineValidita = null` ("in attesa di validazione" implicito, nessun enum di stato introdotto qui — prematuro prima di Story 4.4, che è dove uno stato esplicito servirà davvero). Il flusso di import (Story 1.7, `unisciCertificato`) non cambia: continua a fornire sempre una data reale, il tipo `DatiCertificato` esistente resta invariato (non nullable) — la nuova funzione di upload di questa storia è separata e non passa da `unisciCertificato`/`creaCertificato`.

## Tasks / Subtasks

- [x] Task 1: Migrazione — bucket Storage, funzione condivisa, policy RLS (AC: #1, #2, #3)
  - [x] `prisma/schema.prisma`: `CertificatoMedico.filePath String?` (nuovo campo, percorso nel bucket, mai un URL); `dataFineValidita DateTime?` (da obbligatoria a opzionale, vedi Prerequisito #4).
  - [x] Migrazione a mano: `ALTER TABLE "certificati_medici" ALTER COLUMN "dataFineValidita" DROP NOT NULL;`, `ALTER TABLE "certificati_medici" ADD COLUMN "filePath" TEXT;`.
  - [x] `INSERT INTO storage.buckets (...)` per il bucket privato `certificati-medici` (vedi Prerequisito #1).
  - [x] Funzione `utente_possiede_atleta` (vedi Prerequisito #2), `REVOKE`/`GRANT EXECUTE` verso `authenticated` (stesso pattern di ogni funzione `SECURITY DEFINER` precedente).
  - [x] Nuove policy su `certificati_medici` (combinate in OR con `admin_dirigente_segreteria_*` esistenti, che restano intatte): `genitore_atleta_gestisce_certificato_select`/`_insert`/`_update`, gated su Ruolo GENITORE/ATLETA **e** `utente_possiede_atleta("atletaId")`. Nessuna policy DELETE (nessun AC la richiede).
  - [x] Nuova policy SELECT su `atlete`: `genitore_atleta_propria_select`, stesso doppio gate (Ruolo + relazione) — combinata in OR con `admin_dirigente_segreteria_accesso_ampio` e `allenatore_proprie_atlete_select` (Story 3.1) esistenti.
  - [x] Policy su `storage.objects` per il bucket `certificati-medici`: `SELECT`/`INSERT`/`UPDATE`, gated su `bucket_id = 'certificati-medici' AND (ruolo ampio OR (ruolo GENITORE/ATLETA AND utente_possiede_atleta((storage.foldername(name))[1])))` — stesso doppio accesso (ampio + scoped) già usato per `certificati_medici`.
  - [x] Applicare con `prisma migrate deploy`, verificare `prisma migrate status` (nessun drift), poi `prisma generate`.
- [x] Task 2: `lib/storage/certificati.ts` (nuovo file) (AC: #1, #2, #4)
  - [x] `caricaFileCertificato(supabase: SupabaseClient, atletaId: string, file: File): Promise<string>` — `supabase.storage.from("certificati-medici").upload(\`${atletaId}/${randomUUID()}-${file.name}\`, file, { upsert: false })` (path sempre nuovo, mai sovrascrittura silenziosa dello stesso oggetto — la "sostituzione" del Certificato è a livello di riga `CertificatoMedico.filePath`, non di file fisico, così un vecchio file caricato per errore resta recuperabile lato Storage anche dopo una ri-carica). Restituisce il path creato. Propaga l'errore su fallimento (`throw new Error(error.message)`).
  - [x] `generaUrlFirmato(supabase: SupabaseClient, filePath: string, scadenzaSecondi = 300): Promise<string>` — `supabase.storage.from("certificati-medici").createSignedUrl(filePath, scadenzaSecondi)`. RLS su `storage.objects` (Task 1) è l'unica autorità che decide se la chiamata riesce — nessun controllo applicativo duplicato (stesso principio già stabilito per `presenze`, Story 3.1). Propaga l'errore su fallimento o permesso negato.
  - [x] Test TDD per entrambe le funzioni (mock del client Supabase, verifica argomenti passati a `.storage.from().upload()`/`.createSignedUrl()`, propagazione errori).
- [x] Task 3: `lib/db-rls/certificato-medico.ts` — estensione (AC: #1, #4)
  - [x] `collegaFileCertificato(supabase: SupabaseClient, atletaId: string, filePath: string): Promise<void>` — upsert su `atletaId` (chiave unica esistente) con **solo** `id` (generato), `atletaId`, `filePath`, `updatedAt` nel payload — mai `dataFineValidita` nel payload di upsert: se la riga esiste già, i valori di validità restano quelli attuali (semantica standard di upsert PostgREST: solo le colonne presenti nel payload vengono aggiornate); se non esiste, viene creata con `dataFineValidita` implicitamente `NULL` (colonna ora nullable, Task 1). Stesso accettato "churn" dell'id sull'upsert già documentato per `Presenza` (Story 3.1) — nessuna FK punta a `CertificatoMedico.id`.
  - [x] Test TDD: verifica che il payload di upsert non includa mai `dataFineValidita`/`mesiValidita`/`modulo`/`dataInizioValidita`, propagazione errore (incluso un rifiuto RLS).
- [x] Task 4: Server Actions in `app/(certificati-medici)/certificato-medico/actions.ts` (nuovo file) (AC: #1, #2, #3, #4)
  - [x] `requireRuolo(["GENITORE", "ATLETA"])` come primo passo in ogni azione.
  - [x] `caricaCertificato(prevState, formData)`: legge `atletaId` e `file` (`FormData.get("file")`, deve essere un'istanza `File` con `size > 0`). Validazioni distinte: atletaId mancante, file mancante, tipo MIME non tra `application/pdf`/`image/jpeg`/`image/png` (controllo server-side, mai solo l'attributo `accept` del client — mai fidarsi solo del client), dimensione oltre 10MB (stesso limite impostato sul bucket, Task 1 — doppia difesa, non solo quella del bucket). Poi `caricaFileCertificato` (Task 2) + `collegaFileCertificato` (Task 3) in sequenza dentro un try/catch → `INTERNAL` su qualunque fallimento (incluso un rifiuto RLS per un `atletaId` non proprio — AC #3 è quindi garantito a livello di database, non da un controllo applicativo duplicato, stesso principio di AC #4 in Story 3.1).
  - [x] `revalidatePath("/certificato-medico")` dopo il salvataggio riuscito.
- [x] Task 5: UI in `app/(certificati-medici)/certificato-medico/page.tsx` + `CaricaCertificatoForm.tsx` (nuovi file) (AC: #1, #2, #3, #4)
  - [x] `export const dynamic = "force-dynamic"`.
  - [x] Identità: risolve **tutte** le righe `genitori_atlete` dell'Utente (self **e** figlie, nessun filtro `autoAggancio` — a differenza di Story 3.2, qui entrambi i tipi di aggancio danno lo stesso diritto di gestione, vedi Prerequisito #2), poi `elencaAtlete(supabase)` (RLS-safe, ora accessibile anche a Genitore/Atleta grazie a Task 1) per i nomi.
  - [x] Se `atletaIds.length === 0`: messaggio "account non ancora collegato a nessuna Atleta. Contatta la segreteria."
  - [x] Se `atletaIds.length === 1`: nessun selettore, l'Atleta è risolta automaticamente (caso Atleta self, o Genitore con una sola figlia).
  - [x] Se `atletaIds.length > 1` (AC #3, Genitore con più figlie): selettore `<form method="get">` con `<select name="atletaId">` — stesso pattern `searchParams` di `/presenze`, `/storico-presenze` (Story 3.1/3.2). Nessuna azione possibile finché non è scelta esplicitamente un'Atleta.
  - [x] Per l'Atleta risolta/selezionata: mostra se un Certificato esiste già (`trovaCertificatoPerAtleta`, riusata da Story 1.7) — se ha un `filePath`, un bottone/link "Visualizza certificato attuale" che invoca una Server Action dedicata (`ottieniUrlCertificato`) per generare l'URL firmato al momento del click (mai pre-generato lato server e incorporato nell'HTML, che ne vanificherebbe la scadenza breve, AC #2) e reindirizza. Sempre presente il form di upload (`<input type="file" accept=".pdf,.jpg,.jpeg,.png">` + submit) per caricare un nuovo file (AC #4: sostituisce il collegamento corrente).
  - [x] `lib/auth/route-guard.ts`: `{ prefix: "/certificato-medico", ruoliAmmessi: ["GENITORE", "ATLETA"] }`.
- [x] Task 6: Test (Vitest)
  - [x] `lib/storage/certificati.test.ts`: `caricaFileCertificato`/`generaUrlFirmato`, come da Task 2.
  - [x] `lib/db-rls/certificato-medico.test.ts`: aggiungere test per `collegaFileCertificato`, come da Task 3.
  - [x] `app/(certificati-medici)/certificato-medico/actions.test.ts`: `FORBIDDEN` per Ruoli diversi da Genitore/Atleta; `VALIDATION` per `atletaId`/file mancanti, tipo MIME non ammesso, dimensione eccessiva (messaggi distinti); successo — chiama `caricaFileCertificato` poi `collegaFileCertificato` nell'ordine corretto; `INTERNAL` fail-closed su eccezione (incluso un rifiuto RLS simulato, AC #3).
  - [x] `lib/auth/route-guard.test.ts`: aggiungere test per `/certificato-medico` (allow GENITORE/ATLETA, redirect per ALLENATORE/ADMIN/altri).
  - [x] Nessun test per `certificato-medico/page.tsx` — stessa decisione deliberata già applicata a ogni altra pagina di questo progetto.
- [x] Task 7: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] AC #1/#2: come Atleta (auto-agganciata), caricare un PDF di test; verificare via query diretta al DB che `CertificatoMedico.filePath` sia valorizzato; verificare che il file NON sia raggiungibile con un URL diretto/pubblico al bucket (richiesta anonima → errore); verificare che "Visualizza certificato attuale" produca un URL firmato funzionante che scade (o quantomeno che sia esplicitamente a scadenza breve, non permanente).
  - [x] AC #3: come Genitore con due figlie (entrambe con un Certificato caricabile), verificare che il selettore mostri entrambe per nome e che caricare per l'una non tocchi l'altra.
  - [x] AC #3 (negativo): un `atletaId` manomesso nell'URL/form per un'Atleta non propria deve essere rifiutato (RLS, verificare anche via REST diretto che l'upload fallisca e che nessun file compaia nel bucket per quell'Atleta).
  - [x] AC #4: ricaricare un file per la stessa Atleta; verificare via query diretta che `CertificatoMedico.filePath` punti al nuovo file (non più al vecchio) e che la riga resti unica (nessun duplicato, `atletaId` è già `@unique`).
  - [x] Verificare che un Allenatore/Admin/Dirigente/Segreteria non possa raggiungere `/certificato-medico` (route-guard) — le loro policy RLS ampie su `certificati_medici` restano comunque attive per un futuro uso (Story 4.4), fuori scope qui.
  - [x] Verificare il rifiuto per tipo file non ammesso (es. `.exe`) e per un file oltre 10MB.

### Review Findings

- [x] [Review][Patch] — **risolto**. La migrazione crea solo `certificati_medici_admin_dirigente_segreteria_select` (SELECT) su `storage.objects` per i Ruoli ampi, non le corrispondenti INSERT/UPDATE previste dal Task 1 stesso ("SELECT/INSERT/UPDATE, gated su... ruolo ampio OR...") — rilevante per la futura Story 4.4, dove la Segreteria deve poter inserire manualmente un Certificato ricevuto fuori app (FR-14). Aggiunte in una migrazione separata (una migrazione già applicata non si modifica, TDD-safe) [prisma/migrations/20260718030000_certificati_storage_fix_policy/migration.sql]
- [x] [Review][Patch] — **risolto**. Il tipo MIME dichiarato dal client (`file.type`) non è verificato contro i byte reali del file — un file rinominato con un `Content-Type` falsificato supera sia il controllo server-side sia (presumibilmente) il filtro `allowed_mime_types` del bucket, dato che entrambi si basano sul tipo dichiarato, non sul contenuto. Aggiunta `contenutoCorrispondeAlMimeDichiarato()`: verifica le magic byte iniziali del contenuto reale per PDF/JPEG/PNG prima di procedere con l'upload [app/(certificati-medici)/certificato-medico/actions.ts]
- [x] [Review][Patch] — **risolto**. `file.name` veniva concatenato nel percorso Storage senza alcuna sanitizzazione (slash, caratteri di controllo, lunghezza). Aggiunta `sanitizzaNomeFile()`: whitelist alfanumerico/punto/trattino/underscore, troncata a 100 caratteri [lib/storage/certificati.ts]
- [x] [Review][Patch] — **risolto**. `ottieniUrlCertificato` non racchiudeva `trovaCertificatoPerAtleta`/`generaUrlFirmato` in un try/catch — un fallimento (es. oggetto Storage cancellato, errore transitorio) produceva un'eccezione non gestita invece di un fallback controllato. Ora entrambe le chiamate sono in un try/catch che non include mai `redirect()` (per non intercettare l'eccezione di controllo che Next.js usa internamente per la redirect stessa); su qualunque fallimento reindirizza comunque a `/certificato-medico` [app/(certificati-medici)/certificato-medico/actions.ts]
- [x] [Review][Patch] — **risolto**. Ricaricare un file (AC #4) sostituiva solo il riferimento `filePath` nel DB, mai il file precedente nel bucket. `caricaCertificato` ora recupera il `filePath` esistente prima di caricare il nuovo file e, solo dopo che il nuovo file è stato caricato e collegato con successo, chiama `rimuoviFileCertificato` sul vecchio path (fallimento della rimozione non bloccante: il nuovo file resta comunque collegato) [app/(certificati-medici)/certificato-medico/actions.ts, lib/storage/certificati.ts]. **Scoperto in verifica dal vivo**: la rimozione falliva silenziosamente perché non esisteva alcuna policy `DELETE` su `storage.objects` per il bucket (nessun Ruolo l'aveva mai prevista, nemmeno nel design originale del Task 1) — aggiunta `certificati_medici_genitore_atleta_delete` [prisma/migrations/20260718040000_certificati_storage_delete_policy/migration.sql]
- [x] [Review][Dismiss] `INSERT INTO storage.buckets` non ha una clausola `ON CONFLICT` — un secondo tentativo di applicare la migrazione fallirebbe con un errore di vincolo univoco invece di essere idempotente. **Non correggibile retroattivamente**: la migrazione `20260718020000_certificati_storage_e_rls` è già stata applicata con successo (checksum tracciato da Prisma) — modificarla ora romperebbe `prisma migrate status` per chiunque l'abbia già applicata. Nessuna nuova migrazione può "aggiungere" `ON CONFLICT` a un `INSERT` già eseguito una volta. Guidance informativa per future migrazioni che creano bucket: usare `ON CONFLICT (id) DO NOTHING` fin dalla prima stesura [prisma/migrations/20260718020000_certificati_storage_e_rls/migration.sql]
- [x] [Review][Patch] — **risolto**. **(conseguenza diretta della modifica di questa storia)** `dataFineValidita` nullable rende ora raggiungibile per la prima volta un caso limite in `unisci-certificato.ts` (Story 1.7): `new Date(esistente.dataFineValidita as string)` con un valore `null` si affidava silenziosamente alla coercizione implicita di `new Date(null)` a epoch (1970-01-01) invece di un controllo esplicito — funzionalmente corretto per coincidenza (l'import aggiornava comunque la riga) ma fragile, non tipizzato correttamente e non ovvio per chi legge. Sostituito con un controllo esplicito `esistente.dataFineValidita ? new Date(...) : null` [lib/matching-codice-fiscale/unisci-certificato.ts]
- [x] [Review][Patch] — **risolto**. La firma di `ottieniUrlCertificato(atletaId: string): Promise<void>` non rifletteva come viene effettivamente invocata (`.bind(null, atletaId)` come `action` di un form — Next.js la chiama con un secondo argomento `FormData` finale, silenziosamente ignorato da JS) — funzionava ma la firma dichiarata era fuorviante. Aggiunto `_formData?: FormData` [app/(certificati-medici)/certificato-medico/actions.ts]
- [x] [Review][Defer] Se `caricaFileCertificato` riesce ma il successivo `collegaFileCertificato` fallisce, il file resta orfano nel bucket senza alcuna riga DB che lo referenzi e senza pulizia automatica — caso raro (fallimento tra due chiamate consecutive), nessun rollback implementato [app/(certificati-medici)/certificato-medico/actions.ts] — deferred, raro e a basso impatto (bucket privato, nessun costo di esposizione)
- [x] [Review][Defer] `collegaFileCertificato` rigenera un nuovo `id` ad ogni upsert (incluso un ri-caricamento) — stesso "churn" già accettato per `Presenza` (Story 3.1), ma Story 4.4 (validazione Segreteria) potrebbe in futuro aver bisogno di riferirsi a "quale caricamento specifico è stato validato" — da rivalutare esplicitamente quando quella storia verrà scritta, non anticipare qui [lib/db-rls/certificato-medico.ts] — deferred, preoccupazione futura speculativa
- [x] [Review][Dismiss] "Nessun commento esplicativo nella migrazione" — falso positivo: i commenti esistono nel file reale (visibili nel diff completo), erano stati omessi solo nel prompt di uno dei subagent di review per brevità
- [x] [Review][Dismiss] Nessun controllo applicativo dell'appartenenza di `atletaId` prima di scrivere — scelta deliberata, coerente con il principio "RLS è l'autorità, non un controllo duplicato" già stabilito in Story 3.1 AC #4
- [x] [Review][Dismiss] "Zero test automatici per l'enforcement RLS" — la codebase usa deliberatamente due livelli distinti (Vitest per la business logic, verifica dal vivo per RLS, mai il contrario) — la verifica dal vivo di questa storia ha effettivamente esercitato sia il rifiuto RLS per un'Atleta non propria sia i limiti MIME/dimensione
- [x] [Review][Dismiss] `elencaAtlete(supabase)` legge tutte le Atlete visibili via RLS invece di filtrare per un elenco di id — stesso pattern già usato in `/presenze` e `/storico-presenze` (Story 3.1/3.2), non una deviazione introdotta qui
- [x] [Review][Dismiss] Errori non gestiti durante il render della pagina (es. `elencaAtlete`/`trovaCertificatoPerAtleta` che lanciano) — gap sistemico trasversale a tutta l'app (nessun `error.tsx` esiste da nessuna parte), già documentato come tale in Story 2.6, non introdotto da questa storia

## Dev Notes

- **I Prerequisiti architetturali sopra sono la parte più delicata di questa storia** — leggerli per intero prima di scrivere la migrazione. In particolare Prerequisito #3 (gap di accesso Genitore/Atleta a `atlete`/`certificati_medici`) non era anticipato dalla pianificazione originale dell'epic ed è stato scoperto durante l'analisi architetturale di questa storia specifica, non durante l'implementazione — a differenza del pattern di Story 3.1/3.2 dove gap simili sono emersi solo in verifica dal vivo. Anticiparlo qui evita un secondo giro di migrazioni correttive.
- **AD-10 rispettato**: questa storia non scrive mai sulle colonne identitarie di `Atleta` — solo `CertificatoMedico.filePath` e la nuova policy SELECT su `atlete` è di sola lettura.
- **Nessuna interazione con Story 4.2/4.3 (notifiche/email) in questa storia**: l'upload avviene senza inviare alcuna notifica — quello è lo scope esplicito delle prossime due storie. Non anticipare `lib/email/` qui.
- **Nessun campo di stato esplicito (`VALIDATO`/`IN_ATTESA`/`SCADUTO`) introdotto in questa storia** — deliberatamente rimandato a Story 4.4, dove servirà per davvero (vedi Prerequisito #4). Un Certificato con `dataFineValidita = null` è implicitamente "in attesa", nessuna colonna dedicata ancora.
- **Pattern di riferimento più vicino**: `lib/db-rls/presenza.ts` + le migrazioni `20260717190000_add_presenza`/`20260718000000_presenze_atleta_select`/`20260718010000_genitori_atlete_auto_aggancio` (Story 3.1/3.2) per il pattern `SECURITY DEFINER` + policy a doppio gate (Ruolo + relazione); `lib/matching-codice-fiscale/unisci-certificato.ts` (Story 1.7) per il modello dati `CertificatoMedico` esistente, non toccato dal flusso di upload di questa storia; `app/(onboarding-import)/import-atlete/actions.ts` per l'unico precedente di gestione `FormData`/`File` in una Server Action (validazione lì minimale, da rinforzare qui: tipo MIME e dimensione controllati server-side, non solo lato client).
- **Scala**: un file per Atleta, dimensione limitata a 10MB — nessuna preoccupazione di volume per il bucket Storage a questa scala (NFR PRD §8).

### Project Structure Notes

- Nuovo route-group: `app/(certificati-medici)/certificato-medico/` (`page.tsx`, `actions.ts`, `actions.test.ts`, `CaricaCertificatoForm.tsx`).
- Nuovo modulo: `lib/storage/certificati.ts` (+ `.test.ts`) — prima cartella `lib/storage/` di questa codebase, nominata esplicitamente nello Structural Seed dell'architettura.
- File nuovi: `prisma/migrations/<timestamp>_certificati_storage_e_rls/migration.sql`. File modificati: `prisma/schema.prisma` (`CertificatoMedico.filePath`, `dataFineValidita` nullable), `lib/db-rls/certificato-medico.ts` (+ `collegaFileCertificato`), `lib/db-rls/certificato-medico.test.ts`, `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1: Upload certificato medico] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-11] — "Genitore o Atleta può caricare il file del Certificato Medico dall'app."
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-6] — "il bucket Supabase Storage dei certificati è privato; l'accesso avviene solo tramite URL firmati a scadenza breve, generati lato server dopo verifica dei permessi."
- [Source: prisma/migrations/20260717090000_add_certificato_medico/migration.sql] — policy RLS esistenti su `certificati_medici` (solo ADMIN/DIRIGENTE/SEGRETERIA), estese non sostituite da questa storia.
- [Source: prisma/migrations/20260718000000_presenze_atleta_select/migration.sql, 20260718010000_genitori_atlete_auto_aggancio/migration.sql] — pattern `SECURITY DEFINER` di riferimento (Story 3.2), riusato per `utente_possiede_atleta` (qui senza il gate `autoAggancio`, vedi Prerequisito #2 per il perché).
- [Source: lib/matching-codice-fiscale/unisci-certificato.ts, lib/db-rls/certificato-medico.ts] — modello dati e helper RLS esistenti per `CertificatoMedico` (Story 1.7), estesi non sostituiti.
- [Source: app/(onboarding-import)/import-atlete/actions.ts] — unico precedente di gestione `FormData`/`File` in una Server Action in questa codebase.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Falso allarme nello script di verifica (non un bug applicativo)**: il click su "Visualizza certificato attuale" sembrava non produrre alcuna navigazione (l'URL della pagina restava `/certificato-medico`), facendo temere che l'URL firmato non venisse generato. Isolato con uno script di debug dedicato che ha tracciato header di risposta e richieste di rete: il server genera correttamente l'URL firmato (header `x-action-redirect` di Next.js, contenente un token valido) e il browser avvia effettivamente la richiesta verso Supabase Storage — ma Chromium tratta la risposta come un **download di file** (non una navigazione a una pagina stabile), che Playwright riporta come `net::ERR_ABORTED` sulla navigazione: comportamento corretto e atteso per un URL che serve un allegato PDF, non un errore. Corretto lo script di verifica per leggere l'URL firmato direttamente dall'header `x-action-redirect` della risposta POST invece di attendere una navigazione di pagina, poi validato con una `fetch()` diretta (200, contenuto raggiungibile).
- **Gap scoperto durante la pulizia dei dati di verifica (non affrontato in questa storia)**: gli oggetti nel bucket Storage non vengono rimossi automaticamente quando la riga `CertificatoMedico`/`Atleta` corrispondente viene eliminata — nessuna relazione FK esiste tra lo schema `public` di Postgres e `storage.objects`, quindi un file caricato può restare orfano nel bucket anche dopo la cancellazione dei dati collegati. Non rilevante per gli AC di questa storia (nessuno richiede una cancellazione), ma documentato come rischio operativo futuro (vedi Review Findings/Dev Notes).
- **Patch di code review applicate con TDD** (RED confermato prima di ogni implementazione): sanitizzazione nome file + `rimuoviFileCertificato` (`lib/storage/certificati.ts`), verifica magic byte + wiring della rimozione del vecchio file + try/catch graceful in `ottieniUrlCertificato` + firma corretta (`app/(certificati-medici)/certificato-medico/actions.ts`), controllo esplicito `dataFineValidita` nullable (`lib/matching-codice-fiscale/unisci-certificato.ts`). Una policy mancante su `storage.objects` è stata aggiunta in una migrazione separata anziché modificare quella già applicata (`20260718030000_certificati_storage_fix_policy`); l'item `ON CONFLICT` sul bucket è stato riclassificato Dismiss per lo stesso motivo (non correggibile retroattivamente su una migrazione già applicata).
- **Gap scoperto durante la verifica dal vivo delle patch stesse (non durante l'implementazione)**: `rimuoviFileCertificato` (la nuova funzione della patch AC #4 sopra) falliva silenziosamente ad ogni ri-caricamento — nessuna policy `DELETE` esisteva su `storage.objects` per il bucket `certificati-medici`, per nessun Ruolo (il design originale del Task 1 non l'aveva prevista: solo SELECT/INSERT/UPDATE). Poiché il fallimento della rimozione è intenzionalmente non bloccante (il nuovo file resta comunque collegato), l'assenza della policy non produceva alcun errore visibile — solo un file orfano nel bucket ad ogni ri-caricamento, l'esatto problema che la patch doveva risolvere. Scoperto verificando fisicamente il contenuto del bucket dopo un ri-caricamento (non solo la riga DB), non dal solo comportamento applicativo. Corretto con `prisma/migrations/20260718040000_certificati_storage_delete_policy/migration.sql`, poi riverificato dal vivo con successo.

### Completion Notes List

- Tutti i 7 Task completati con TDD (RED confermato prima di ogni implementazione: `lib/storage/certificati.ts`, `lib/db-rls/certificato-medico.ts`, Server Action, route-guard).
- Suite completa verde: `npx vitest run` (291 test, 30 file), `npx tsc --noEmit` (nessun errore), `npm run lint` (pulito), `npm run build` (produzione, `/certificato-medico` generata come route dinamica).
- Verifica dal vivo eseguita con successo su tutti gli scenari (AC #1-#4: upload e collegamento, privacy del bucket confermata sia in negativo — nessun accesso pubblico — sia in positivo — URL firmato funzionante —, selettore Genitore con due figlie, upload scoped e rifiuto RLS per Atleta non propria, ri-caricamento che sostituisce il file, validazione MIME server-side, route-guard). Dati di test (Atlete, Utenti Supabase Auth, oggetti Storage) rimossi interamente al termine.
- Nessuna deviazione dal design descritto nei Prerequisiti architetturali della storia.

### File List

- `prisma/schema.prisma` (modificato: `CertificatoMedico.filePath`, `dataFineValidita` nullable)
- `prisma/migrations/20260718020000_certificati_storage_e_rls/migration.sql` (nuovo)
- `lib/storage/certificati.ts` (nuovo)
- `lib/storage/certificati.test.ts` (nuovo)
- `lib/db-rls/certificato-medico.ts` (modificato: + `collegaFileCertificato`)
- `lib/db-rls/certificato-medico.test.ts` (modificato)
- `lib/auth/route-guard.ts` (modificato)
- `lib/auth/route-guard.test.ts` (modificato)
- `app/(certificati-medici)/certificato-medico/actions.ts` (nuovo)
- `app/(certificati-medici)/certificato-medico/actions.test.ts` (nuovo)
- `app/(certificati-medici)/certificato-medico/page.tsx` (nuovo)
- `app/(certificati-medici)/certificato-medico/CaricaCertificatoForm.tsx` (nuovo)
- `prisma/migrations/20260718030000_certificati_storage_fix_policy/migration.sql` (nuovo — review fix)
- `prisma/migrations/20260718040000_certificati_storage_delete_policy/migration.sql` (nuovo — review fix, gap scoperto in verifica dal vivo)
- `lib/matching-codice-fiscale/unisci-certificato.ts` (modificato — review fix)
- `lib/matching-codice-fiscale/unisci-certificato.test.ts` (modificato — review fix)
