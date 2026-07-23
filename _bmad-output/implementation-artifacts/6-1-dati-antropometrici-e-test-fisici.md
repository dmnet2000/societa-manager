---
baseline_commit: 404cdd31b300813fe8c83da42703809417edfb3a
---

# Story 6.1: Dati antropometrici e test fisici

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Atleta o Allenatore,
I want inserire e consultare misurazioni antropometriche e di test fisici nel tempo,
so that posso seguire la crescita/preparazione dell'atleta.

## Acceptance Criteria

1. **Given** un'Atleta è presente a sistema (Epic 1), **when** un Allenatore (per una propria Atleta) o l'Atleta stessa inserisce una misurazione (tipo, valore, unità di misura, data), **then** la misurazione è salvata e appare immediatamente nello storico di quell'Atleta.
2. **Given** più misurazioni esistono per un'Atleta, **when** si consulta il suo storico, **then** sono mostrate in ordine cronologico (dalla più vecchia alla più recente), ciascuna con tipo, valore, unità di misura e data — precondizione diretta per il grafico di Story 6.2 ("almeno due misurazioni").
3. **Given** un Allenatore con più Gruppi, **when** apre la pagina, **then** può scegliere una qualunque delle proprie Atlete (mai di un Allenatore diverso) per inserire/consultare le sue misurazioni — stesso pattern di selezione già stabilito per lo storico presenze (Story 3.2).
4. **Given** un'Atleta, **when** apre la pagina, **then** vede/inserisce solo le proprie misurazioni, mai quelle di un'altra Atleta — anche se l'Utente ha *anche* il Ruolo Genitore collegato a una figlia, lo stesso gate `autoAggancio` già stabilito per lo storico presenze (Story 3.2 review fix) si applica identico qui.
5. **Given** un Ruolo Genitore, **when** tenta di aprire la pagina, **then** viene rifiutato dal Proxy (redirect a `/non-autorizzato`) — FR-24 ammette solo Atleta o Allenatore, **non** il Genitore (a differenza del Certificato Medico, dove il Genitore gestisce per conto della figlia, Story 4.1): qui la misurazione la registra solo chi la esegue/subisce direttamente.
6. **Given** un tentativo di inserire una misurazione senza tipo, valore o data, **when** il form viene inviato, **then** viene mostrato un errore di validazione esplicito, nessuna riga salvata.
7. **Given** un'Atleta senza nessuna misurazione ancora registrata, **when** si apre il suo storico, **then** è mostrato un messaggio esplicito ("Nessuna misurazione registrata"), non una tabella vuota silenziosa.

## Prerequisiti architetturali di questa storia (da leggere prima di iniziare)

### 1. Nuova tabella `misurazioni_atleta`, protetta da RLS — riusa due funzioni `SECURITY DEFINER` già esistenti, nessuna nuova funzione da scrivere

`MisurazioneAtleta` è un log di sola aggiunta (append-only: nessun AC richiede modifica/eliminazione di una misurazione passata, stessa scelta già fatta per `Presenza`/`Iscrizione`/`CertificatoMedico`). Protetta da RLS (dato personale nel tempo, coerente con AD-4) — ma con un bind-list **più stretto** delle tabelle precedenti: **solo `ALLENATORE` (proprie Atlete) e `ATLETA` (se stessa)**, fedele al testo di FR-24 ("Atleta o Allenatore"). Decisione deliberata di questa storia: **nessuna policy per `ADMIN`/`DIRIGENTE`/`SEGRETERIA`** — a differenza di `Presenza`/`CertificatoMedico`/`Iscrizione`, questa tabella non è nel bind-list originale di AD-4 e FR-24 non menziona alcun Ruolo gestionale; non inventare un accesso ampio non richiesto (se servisse in futuro, è un'estensione a parte).

Riusa **identiche**, senza scriverne di nuove:
- `allenatore_possiede_atleta(atleta_id_param TEXT)` (Story 3.1/4.5, `prisma/migrations/20260717200000_atlete_allenatore_select/migration.sql`) — per la policy Allenatore.
- `atleta_possiede_presenza(atleta_id_param TEXT)` (Story 3.2, `prisma/migrations/20260718010000_genitori_atlete_auto_aggancio/migration.sql`) — nome storico legato a "presenza" ma **generica**: verifica solo `genitori_atlete.autoAggancio = true` per l'Utente corrente, nessuna logica specifica di Presenza nel corpo. **Non creare una nuova funzione con logica identica** — questo è esattamente il caso "Atleta si vede solo se stessa" che questa funzione già risolve, e il gate `autoAggancio = true` esclude correttamente il Genitore (coerente con AC #4/#5, a differenza di `utente_possiede_atleta` usata per i Certificati, che include deliberatamente anche il Genitore).

```sql
-- Nuova migrazione: prisma/migrations/20260725000000_add_misurazione_atleta/migration.sql

CREATE TABLE "misurazioni_atleta" (
    "id" TEXT NOT NULL,
    "atletaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valore" DOUBLE PRECISION NOT NULL,
    "unitaMisura" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misurazioni_atleta_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "misurazioni_atleta" ADD CONSTRAINT "misurazioni_atleta_atletaId_fkey"
  FOREIGN KEY ("atletaId") REFERENCES "atlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "misurazioni_atleta" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allenatore_propria_atleta_misurazione_select" ON "misurazioni_atleta"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_atleta("atletaId")
  );

CREATE POLICY "allenatore_propria_atleta_misurazione_insert" ON "misurazioni_atleta"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_atleta("atletaId")
  );

CREATE POLICY "atleta_propria_misurazione_select" ON "misurazioni_atleta"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ATLETA'
    AND atleta_possiede_presenza("atletaId")
  );

CREATE POLICY "atleta_propria_misurazione_insert" ON "misurazioni_atleta"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ATLETA'
    AND atleta_possiede_presenza("atletaId")
  );

-- Nessuna policy/GRANT UPDATE/DELETE: nessun AC richiede la modifica o la
-- rimozione di una misurazione passata (stessa scelta di Presenza/Iscrizione).
GRANT SELECT, INSERT ON "misurazioni_atleta" TO authenticated;
```

### 2. `data` come stringa `"YYYY-MM-DD"`, non `DateTime`

Stesso principio già stabilito per `Presenza.data`/`Slot.oraInizio` (Story 2.5/3.1): nessuna aritmetica di date richiesta da questa storia (l'ordinamento cronologico è un semplice `ORDER BY` su stringa ISO, che ordina correttamente in modo lessicografico). Un tipo `DateTime`/`@db.Date` introdurrebbe solo l'ambiguità di fuso orario già incontrata altrove in questo progetto, senza alcun beneficio qui.

### 3. `tipo`/`unitaMisura` come stringhe libere, non un enum chiuso

L'AC parla di misurazioni "es. altezza, peso, risultato di un test fisico" — un elenco di esempi, non un enum chiuso da imporre. Stringa libera per `tipo` (es. "Altezza", "Peso", "Salto in alto") e per `unitaMisura` (es. "cm", "kg", "sec") — nessuna validazione di contenuto oltre "non vuoto" (AC #6). Story 6.2 (grafico) raggrupperà per `tipo` così com'è, senza bisogno di un enum.

### 4. Pagina unica con doppia sezione — stesso pattern esatto di `storico-presenze/page.tsx` (Story 3.2)

Nessuna nuova pagina "vista Gruppo" o selettore separato: `app/(dati-atleta)/dati-fisici/page.tsx` risolve in parallelo "sono un Allenatore?" (`prisma.allenatore.findFirst`) e "sono un'Atleta collegata a me stessa?" (`prisma.genitoreAtleta.findMany({ autoAggancio: true })`) esattamente come `storico-presenze/page.tsx` — stessa sezione "Il mio storico" per l'Atleta, stessa sezione con `<select>` delle proprie Atlete per l'Allenatore. Riusa `elencaAtlete(supabase)` per risolvere i nomi (mai un `include` Prisma diretto, AD-4/Dev Notes Story 2.4).

## Tasks / Subtasks

- [x] Task 1: Migrazione — tabella `misurazioni_atleta`, riuso funzioni esistenti (AC: #1, #3, #4, #5)
  - [x] Nuova cartella `prisma/migrations/20260725000000_add_misurazione_atleta/migration.sql` (vedi SQL completo nel Prerequisito #1).
  - [x] Aggiorna `prisma/schema.prisma`: nuovo model `MisurazioneAtleta`, relazione `misurazioni MisurazioneAtleta[]` su `Atleta`. `npx prisma generate` dopo la migrazione.
- [x] Task 2: `lib/db-rls/misurazione-atleta.ts` (nuovo) (AC: #1, #2)
  - [x] `inserisciMisurazione(supabase, atletaId, dati: { tipo, valore, unitaMisura, data }): Promise<void>` — insert, `id` generato esplicitamente (Prisma Client default non si applica via supabase-js, stesso principio di ogni altra tabella RLS di questo progetto).
  - [x] `leggiMisurazioniPerAtleta(supabase, atletaId): Promise<Misurazione[]>` — `select` colonne esplicite, `.order("data", { ascending: true }).order("id", { ascending: true })` (spareggio deterministico per righe con la stessa data, stesso principio già stabilito in `leggiStoricoPresenzePerAtleta`, Story 3.2 review fix).
- [x] Task 3: `app/(dati-atleta)/dati-fisici/actions.ts` (nuovo) (AC: #1, #6)
  - [x] `inserisciMisurazioneAction` — Server Action, valida `tipo`/`valore`/`unitaMisura`/`data` non vuoti e `valore` numerico prima di chiamare `inserisciMisurazione`. Errori come `{ error: { code, message } }` (convenzione ARCHITECTURE-SPINE.md). Nessun `requireRuolo` necessario qui in aggiunta alla RLS: a differenza delle Server Action Admin-only, qui sia Allenatore sia Atleta sono ammessi e la RLS decide comunque riga per riga — stesso principio già usato per `registraPresenze` (Story 3.1, nessun `requireRuolo` lì).
- [x] Task 4: `app/(dati-atleta)/dati-fisici/page.tsx` (nuovo) (AC: #1, #2, #3, #4, #7)
  - [x] Stesso schema a doppia sezione di `storico-presenze/page.tsx` (Prerequisito #4): sezione "Le mie misurazioni" per l'Atleta (autoAggancio), sezione "Misurazioni delle mie Atlete" con `<select>` per l'Allenatore.
  - [x] Form di inserimento (tipo/valore/unità/data) + tabella storico ordinata cronologicamente, per ciascuna sezione applicabile.
  - [x] AC #7: messaggio esplicito se `leggiMisurazioniPerAtleta` restituisce un array vuoto.
- [x] Task 5: Route guard (AC: #5)
  - [x] `lib/auth/route-guard.ts`: aggiungi `{ prefix: "/dati-fisici", ruoliAmmessi: ["ALLENATORE", "ATLETA"] }` a `PROTECTED_ROUTES`.
  - [x] Test in `route-guard.test.ts`: consenti Allenatore e Atleta, rifiuta ogni altro Ruolo (incluso Genitore, esplicitamente escluso da AC #5) verso `/non-autorizzato`.
- [x] Task 6: Test (Vitest)
  - [x] Nessuna funzione pura nuova introdotta da questa storia (nessuna logica derivata come `calcola-statistiche-presenza.ts`/`categorizza-stato-certificato.ts`) — solo il test del route guard sopra. Nessun test automatico per `page.tsx`/`actions.ts`/`lib/db-rls/misurazione-atleta.ts` oltre quello (stesso principio già stabilito in Story 5.1/5.2: solo funzioni pure hanno test Vitest in questa codebase, i moduli `db-rls` seguono lo stesso pattern non testato di `presenza.ts`/`certificato-medico.ts`).
- [x] Task 7: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] Setup: Docker Desktop + stack Supabase CLI locale + dev server. Crea un Gruppo con un'Atleta, un Utente Allenatore assegnato al Gruppo, un Utente Atleta agganciato (autoAggancio) alla stessa Atleta, un Utente Genitore (non agganciato come autoAggancio) e uno con solo Ruolo Segreteria.
  - [x] AC #1/#2: come Allenatore, inserisci due misurazioni (es. Altezza, Peso) con date diverse per la propria Atleta; verifica che appaiano nello storico in ordine cronologico.
  - [x] AC #3: verifica che l'Allenatore veda nel `<select>` solo le proprie Atlete.
  - [x] AC #4: come Atleta (stessa Atleta), verifica che veda/inserisca solo le proprie misurazioni (incluse quelle appena inserite dall'Allenatore, stessa Atleta).
  - [x] AC #5: un Utente con Ruolo Genitore (o Segreteria) che tenta `/dati-fisici` → redirect a `/non-autorizzato`.
  - [x] AC #6: tentativo di inserire con un campo vuoto → errore di validazione esplicito, nessuna riga salvata.
  - [x] AC #7: un'Atleta senza misurazioni ancora → messaggio esplicito, nessuna tabella vuota silenziosa.
  - [x] Dati e Utenti di test rimossi a fine sessione, stato del DB locale ripristinato a com'era prima della verifica.

### Review Findings

- [x] [Review][Patch] `Number.isNaN(Number(valoreGrezzo))` non intercetta `"Infinity"`/`"-Infinity"` — passano la validazione e finiscono salvati come misura [app/(dati-atleta)/dati-fisici/actions.ts:35] — risolto con `Number.isFinite`, verificato dal vivo
- [x] [Review][Patch] Separatore decimale con virgola (convenzione italiana, es. "178,5") respinto come non numerico — attrito reale in un'app interamente in italiano [app/(dati-atleta)/dati-fisici/actions.ts:35] — risolto normalizzando la virgola al punto prima del parsing, verificato dal vivo
- [x] [Review][Patch] Nessun attributo `required` sui campi del form — la validazione (AC #6) emerge solo dopo un round-trip al server invece che nativamente lato client [app/(dati-atleta)/dati-fisici/MisurazioneForm.tsx] — risolto, verificato dal vivo
- [x] [Review][Defer] `allenatore_possiede_atleta` non è scoped per stagione — un Allenatore assegnato solo nella stagione corrente eredita l'accesso in lettura all'intero storico misurazioni, incluse righe di stagioni precedenti/altri Allenatori [prisma/migrations/20260725000000_add_misurazione_atleta/migration.sql] — deferred, funzione condivisa preesistente (Story 3.1/4.5), stesso comportamento già presente per Presenza/Certificato, non introdotto da questa storia
- [x] [Review][Defer] `FORMATO_DATA` valida solo la forma della data, non la validità calendariale (es. "2026-13-45" passa) [app/(dati-atleta)/dati-fisici/actions.ts:48] — deferred, stesso pattern già in uso identico in `registraPresenze` (Story 3.1)
- [x] [Review][Defer] Nessun `try/catch` attorno alle query di lettura in `page.tsx` (RLS/DB error fa crashare l'intera pagina) [app/(dati-atleta)/dati-fisici/page.tsx] — deferred, replica esatta dello stesso pattern non gestito in `storico-presenze/page.tsx` (Story 3.2)
- [x] [Review][Defer] `atletaIds[0]` risolto senza `orderBy` su `genitoreAtleta.findMany` — spareggio non deterministico in caso di violazione di integrità dati [app/(dati-atleta)/dati-fisici/page.tsx] — deferred, replica esatta dello stesso pattern di `storico-presenze/page.tsx`
- [x] [Review][Defer] Nessuna protezione da doppio invio (form non resettato dopo il submit, nessun vincolo di unicità) [app/(dati-atleta)/dati-fisici/MisurazioneForm.tsx] — deferred, coerente con la convenzione dell'intero progetto (nessun form di questa codebase ha una protezione simile)
- [x] [Review][Defer] `leggiMisurazioniPerAtleta` senza `LIMIT`/paginazione [lib/db-rls/misurazione-atleta.ts] — deferred, stessa convenzione di `leggiStoricoPresenzePerAtleta`
- [x] [Review][Defer] Un Allenatore senza Atlete nella stagione corrente vede solo "Seleziona..." nel `<select>`, nessun messaggio esplicito [app/(dati-atleta)/dati-fisici/page.tsx] — deferred, stesso gap già presente in `storico-presenze/page.tsx`

## Dev Notes

- **Nessun accesso Admin/Dirigente/Segreteria a questa tabella** — decisione deliberata (Prerequisito #1), fedele al testo letterale di FR-24. Se in futuro servisse una vista aggregata per la Dirigenza (es. estensione della Vista d'insieme, Story 5.1), sarebbe un'estensione esplicita da decidere a parte, non da anticipare qui.
- **Riuso di `atleta_possiede_presenza` per una tabella non-Presenza** — il nome è storico (introdotto in Story 3.2 per le Presenze) ma la funzione è già generica (verifica solo l'aggancio `autoAggancio` dell'Atleta), esattamente come `allenatore_possiede_atleta` è già riusata su `atlete`/`certificati_medici` oltre che su `presenze`. Non rinominare la funzione in questa storia (tocca migrazioni già applicate in produzione/altre storie) — il nome non riflette più perfettamente ogni suo utilizzo, ma è un costo accettato piuttosto che una migrazione di rename non richiesta da nessun AC.
- **Nessun campo obbligatorio oltre a quelli elencati** — niente note testuali libere, niente allegati/foto: FR-24/AC non li richiedono, aggiungerli sarebbe scope creep.
- **Fuori perimetro esplicito**: il grafico di progresso (Story 6.2, "Could", non ancora pianificata in dettaglio) non fa parte di questa storia — questa storia si ferma a "inserire e consultare in ordine cronologico" (AC #1/#2), il grafico è un consumo successivo degli stessi dati.

### Project Structure Notes

- Nuova migrazione: `prisma/migrations/20260725000000_add_misurazione_atleta/migration.sql`.
- Nuovo model Prisma: `MisurazioneAtleta` (+ relazione su `Atleta`).
- Nuovi file: `lib/db-rls/misurazione-atleta.ts`, `app/(dati-atleta)/dati-fisici/page.tsx`, `app/(dati-atleta)/dati-fisici/actions.ts`.
- File modificati: `lib/auth/route-guard.ts` (+ `.test.ts`).
- Prima storia a materializzare il route group `app/(dati-atleta)/` previsto dallo Structural Seed dell'architettura.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.1: Dati antropometrici e test fisici] — user story e AC originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-24] — "Atleta o Allenatore può inserire/consultare misurazioni antropometriche e di test fisici nel tempo." (Should, non bloccante v1).
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md] — Capability Map "Dati Atleta (FR-24, FR-25) | app/(dati-atleta)/ | AD-2"; Structural Seed.
- [Source: app/(presenze)/storico-presenze/page.tsx] — pattern a doppia sezione (Atleta self / Allenatore selettore) da replicare identico.
- [Source: prisma/migrations/20260717200000_atlete_allenatore_select/migration.sql] — `allenatore_possiede_atleta`, riusata identica.
- [Source: prisma/migrations/20260718010000_genitori_atlete_auto_aggancio/migration.sql] — `atleta_possiede_presenza` (gated `autoAggancio`), riusata identica.
- [Source: prisma/migrations/20260718020000_certificati_storage_e_rls/migration.sql] — `utente_possiede_atleta` (include Genitore), consultata solo per contrasto — **non** usata qui, deliberatamente (AC #5).
- [Source: lib/db-rls/presenza.ts] — pattern `leggiStoricoPresenzePerAtleta`/ordinamento con spareggio, da replicare identico.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- Dopo il riavvio del dev server (per evitare il Prisma Client stale, gia' noto da Story 5.2), `npx tsc --noEmit` riportava errori di sintassi in `.next/dev/types/routes.d.ts`/`validator.ts` (file auto-generati da Next.js, non codice applicativo). Ispezione diretta di `validator.ts` (righe 55-67) ha confermato un file genuinamente troncato/corrotto a meta' di un blocco (riga 62: `onse | void`, frammento di una firma di Route Handler) - quasi certamente causato dall'aver terminato (`taskkill`) il processo `next dev` mentre stava ancora scrivendo questi file. Fix: stop del processo, `rm -rf .next`, riavvio pulito di `next dev`, una richiesta HTTP per far rigenerare i tipi, poi `npx tsc --noEmit` pulito.
- Verifica dal vivo: seed temporaneo (`tmp-seed-story-6-1.mjs`, cancellato a fine sessione) con AnnoAgonistico corrente + Gruppo + Atleta + Allenatore assegnato + Atleta agganciata (autoAggancio) + Genitore (non agganciato) + Segreteria; script Playwright temporaneo (`tmp-verify-story-6-1.mjs`, cancellato a fine sessione) ha verificato tutti i 7 AC in un singolo passaggio pulito (13/13 controlli OK). Dati di test e AnnoAgonistico creato rimossi a fine verifica (il DB locale non aveva alcun AnnoAgonistico prima di questa sessione - ripristinato a quello stato).

### Completion Notes List

- Tutti i 7 AC implementati e verificati dal vivo (Playwright temporaneo, cancellato a fine sessione).
- Nessuna nuova funzione `SECURITY DEFINER`: riusate identiche `allenatore_possiede_atleta` e `atleta_possiede_presenza`, come da Prerequisito #1.
- Nessuna policy/GRANT Admin/Dirigente/Segreteria su `misurazioni_atleta` - decisione deliberata, fedele al testo letterale di FR-24 (vedi Dev Notes).
- Suite Vitest completa: 447/447 test passati (nessuna regressione). `npx tsc --noEmit` pulito.

### File List

- `prisma/migrations/20260725000000_add_misurazione_atleta/migration.sql` (nuovo)
- `prisma/schema.prisma` (modificato: model `MisurazioneAtleta`, relazione su `Atleta`)
- `lib/db-rls/misurazione-atleta.ts` (nuovo)
- `app/(dati-atleta)/dati-fisici/actions.ts` (nuovo)
- `app/(dati-atleta)/dati-fisici/page.tsx` (nuovo)
- `app/(dati-atleta)/dati-fisici/MisurazioneForm.tsx` (nuovo)
- `lib/auth/route-guard.ts` (modificato: prefisso `/dati-fisici`)
- `lib/auth/route-guard.test.ts` (modificato: test Allenatore/Atleta ammessi, Genitore/Admin/Dirigente/Segreteria rifiutati)
