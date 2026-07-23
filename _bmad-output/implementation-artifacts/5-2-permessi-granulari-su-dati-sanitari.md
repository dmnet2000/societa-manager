---
baseline_commit: 12bd15db96bc9df5b09c74b45216296ef1719892
---

# Story 5.2: Permessi granulari su dati sanitari

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin di sistema,
I want configurare permessi granulari su chi vede i dati relativi ai Certificati Medici,
so that posso restringere l'accesso oltre il controllo di base per ruolo, se serve.

## Acceptance Criteria

**Nota di chiarimento (elicitazione con l'utente, 2026-07-23)**: l'AC originale dell'epic è deliberatamente astratto ("un permesso più fine, es. limitare la visibilità a un sottoinsieme di dati anche dentro lo stesso ruolo"). Concordato con l'utente il disegno concreto: granularità **per Gruppo**, applicata **solo al Ruolo Dirigente** (Segreteria e Admin restano sempre con visibilità piena e non configurabile — Segreteria ha già oggi un ruolo trasversale su tutto il club, es. vista orari di tutti i gruppi, Story 2.8, e deve continuare a validare/confermare i certificati di chiunque). Gli AC sotto riflettono questo disegno, non il testo originale dell'epic.

1. **Given** nessuna riga esiste ancora nella tabella dei Gruppi visibili al Dirigente, **when** un Dirigente legge i Certificati Medici (`elencaCertificati`, pagine esistenti come `/vista-dirigente`, `/conferma-certificati` se mai avesse accesso, notifiche), **then** vede tutti i Certificati di tutti i Gruppi — comportamento identico a oggi, nessuna rottura per chi non configura mai questo permesso.
2. **Given** l'Admin apre la nuova pagina di configurazione permessi, **when** seleziona uno o più Gruppi dell'Anno Agonistico corrente e salva, **then** da quel momento un Dirigente vede solo i Certificati Medici delle Atlete appartenenti a quei Gruppi — per qualunque punto della UI che legge Certificati (RLS, non un filtro applicativo per singola pagina).
3. **Given** l'Admin deseleziona tutti i Gruppi in precedenza selezionati e salva, **when** un Dirigente legge di nuovo i Certificati, **then** torna a vedere tutto (AC #1) — deselezionare tutto equivale a rimuovere la restrizione, non serve un interruttore separato "attivo/disattivo".
4. **Given** una restrizione è configurata (uno o più Gruppi selezionati), **when** un Utente con Ruolo Segreteria o Admin legge i Certificati, **then** non è in nessun modo influenzato dalla restrizione — vede sempre tutto, la configurazione si applica esclusivamente al Ruolo Dirigente.
5. **Given** la pagina di configurazione permessi, **when** un Ruolo diverso da Admin tenta di aprirla, **then** viene rifiutato dal Proxy (redirect a `/non-autorizzato`) — solo l'Admin può configurare questo permesso (FR-27, "As a Admin").
6. **Given** la restrizione è configurata con Gruppi della stagione corrente, **when** l'Anno Agonistico cambia (nuova stagione, Story 1.6/6.3) e nuovi Gruppi vengono creati con nuovi id, **then** la vecchia configurazione non si applica automaticamente ai nuovi Gruppi (gli id sono diversi) — l'Admin deve riconfigurare esplicitamente la restrizione per la nuova stagione se la vuole ancora attiva. Comportamento accettato esplicitamente per questa storia (Should/v1.1), non un bug.

## Prerequisiti architetturali di questa storia (da leggere prima di iniziare)

### 1. Nuova tabella `gruppi_visibili_dirigente`, NON protetta da RLS — stessa scelta di `Gruppo`/`Slot` (AD-9), per un motivo specifico e non ovvio

A differenza di `configurazione_smtp` (Story 7.1, RLS ADMIN-only), questa tabella **non** ha RLS né policy proprie. Motivo: la policy RLS che leggerà questa tabella (Prerequisito #2, dentro una funzione `SECURITY DEFINER`) deve poter verificare la restrizione per **qualunque** sessione Dirigente, non solo per una sessione Admin — se la tabella avesse RLS ADMIN-only, la subquery della funzione userebbe comunque i privilegi della funzione (SECURITY DEFINER bypassa le policy della tabella referenziata), quindi in teoria funzionerebbe anche con RLS abilitata; ma per restare coerenti con AD-9 (tabelle puramente strutturali, non un dato personale/sanitario in sé — contiene solo riferimenti a `gruppoId`) e per non introdurre GRANT verso `authenticated` non necessari, si segue lo stesso trattamento già riservato a `Gruppo`/`Slot`/`Palestra`: **nessun GRANT verso `authenticated`, accesso in scrittura solo via Prisma diretto** (Server Action con `requireRuolo(["ADMIN"])`, stesso pattern di `Utente`/`UtenteRuolo`, Story 1.2). La lettura da parte della policy RLS su `certificati_medici` passa dalla funzione `SECURITY DEFINER` sotto, che bypassa comunque l'assenza di GRANT (esattamente come `allenatore_possiede_atleta`, Story 3.1/4.5, legge `gruppo_atlete`/`gruppo_allenatori`/`allenatori`/`utenti` — tutte tabelle senza GRANT verso `authenticated` — dall'interno della funzione).

```prisma
model GruppoVisibileDirigente {
  id        String   @id @default(uuid())
  gruppoId  String
  gruppo    Gruppo   @relation(fields: [gruppoId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([gruppoId])
  @@map("gruppi_visibili_dirigente")
}
```

Aggiungi la relazione inversa su `Gruppo`: `visibileDirigente GruppoVisibileDirigente?` (nome campo corretto rispetto alla bozza iniziale — funzionalmente inerte, il campo non è mai referenziato direttamente, l'accesso passa sempre da `prisma.gruppoVisibileDirigente`).

### 2. Funzione `SECURITY DEFINER` — stesso pattern di `allenatore_possiede_atleta` (Story 3.1/4.5), non un nuovo approccio

```sql
-- Nuova migrazione: <timestamp>_dirigente_certificati_scoped_select/migration.sql

CREATE TABLE "gruppi_visibili_dirigente" (
    "id" TEXT NOT NULL,
    "gruppoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gruppi_visibili_dirigente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gruppi_visibili_dirigente_gruppoId_key" ON "gruppi_visibili_dirigente"("gruppoId");

ALTER TABLE "gruppi_visibili_dirigente" ADD CONSTRAINT "gruppi_visibili_dirigente_gruppoId_fkey"
  FOREIGN KEY ("gruppoId") REFERENCES "gruppi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Nessun GRANT verso "authenticated" (Prerequisito #1) - accesso in
-- scrittura solo via Prisma diretto (connessione privilegiata).

-- Review fix: scoped alla stagione corrente (via anni_agonistici.dataInizio/
-- dataFine, gia' presenti, nessuna euristica da replicare in SQL) - senza
-- questo, righe "stale" di una stagione passata in gruppi_visibili_dirigente
-- (mai ripulite dopo un rollover) potevano causare sovra-esposizione o, nel
-- caso peggiore, il blocco totale del Dirigente (vedi migrazione separata
-- 20260724010000_dirigente_certificati_scoped_by_stagione, applicata subito
-- dopo aver scoperto il bug in code review - non nella migrazione originale
-- sotto, lasciata qui solo come riferimento storico del Task 1).
CREATE OR REPLACE FUNCTION dirigente_vede_certificato_atleta(atleta_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    NOT EXISTS (
      SELECT 1
      FROM "gruppi_visibili_dirigente" gvd
      JOIN "gruppi" g ON g.id = gvd."gruppoId"
      JOIN "anni_agonistici" aa ON aa.id = g."annoAgonisticoId"
      WHERE aa."dataInizio" <= CURRENT_DATE AND aa."dataFine" >= CURRENT_DATE
    )
    OR EXISTS (
      SELECT 1
      FROM "gruppo_atlete" ga
      JOIN "gruppi_visibili_dirigente" gvd ON gvd."gruppoId" = ga."gruppoId"
      JOIN "gruppi" g ON g.id = gvd."gruppoId"
      JOIN "anni_agonistici" aa ON aa.id = g."annoAgonisticoId"
      WHERE ga."atletaId" = atleta_id_param
        AND aa."dataInizio" <= CURRENT_DATE AND aa."dataFine" >= CURRENT_DATE
    );
$$;

REVOKE EXECUTE ON FUNCTION dirigente_vede_certificato_atleta(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dirigente_vede_certificato_atleta(TEXT) TO authenticated;

-- Sostituisce le 3 policy esistenti (Story 1.7/4.5) che includevano
-- DIRIGENTE nello stesso array di ADMIN/SEGRETERIA: DIRIGENTE va rimosso da
-- li' e trattato con le sue policy dedicate sotto, altrimenti resterebbe
-- comunque ad accesso pieno (OR fra policy multiple, RLS Postgres di
-- default) e la restrizione non avrebbe mai effetto.
DROP POLICY "admin_dirigente_segreteria_select" ON "certificati_medici";
DROP POLICY "admin_dirigente_segreteria_insert" ON "certificati_medici";
DROP POLICY "admin_dirigente_segreteria_update" ON "certificati_medici";

CREATE POLICY "admin_segreteria_select" ON "certificati_medici"
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SEGRETERIA']);

CREATE POLICY "admin_segreteria_insert" ON "certificati_medici"
  FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SEGRETERIA']);

CREATE POLICY "admin_segreteria_update" ON "certificati_medici"
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SEGRETERIA'])
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SEGRETERIA']);

CREATE POLICY "dirigente_select_scoped" ON "certificati_medici"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
    AND dirigente_vede_certificato_atleta("atletaId")
  );

CREATE POLICY "dirigente_insert_scoped" ON "certificati_medici"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
    AND dirigente_vede_certificato_atleta("atletaId")
  );

CREATE POLICY "dirigente_update_scoped" ON "certificati_medici"
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
    AND dirigente_vede_certificato_atleta("atletaId")
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
    AND dirigente_vede_certificato_atleta("atletaId")
  );
```

**Perché anche INSERT/UPDATE, non solo SELECT**: FR-27/AC parlano di "chi vede" (lettura), ma se solo la SELECT fosse scoped mentre INSERT/UPDATE restassero ad accesso pieno per Dirigente, un Dirigente potrebbe comunque scrivere/confermare (`confermaCertificato`, Story 4.4) un Certificato di un'Atleta che non può vedere — incoerente e un gap di sicurezza reale, non ipotetico. Scoping identico su tutte e tre le operazioni.

**Nessun cambiamento per `ALLENATORE`/`GENITORE`/`ATLETA`**: le loro policy (Story 3.1/4.5/1.7/4.1) restano intatte, non toccate da questa migrazione.

### 3. Nessuna modifica a `elencaCertificati`/`lib/db-rls/certificato-medico.ts`

La funzione esiste già (Story 4.4) e non ha nessun filtro applicativo per Ruolo — la RLS decide cosa restituire, esattamente come già oggi per Allenatore/Genitore/Atleta. Questa storia **non** tocca quel file: il Dirigente scoped ottiene automaticamente solo le righe permesse, senza nessuna modifica al codice applicativo che le legge.

### 4. Nuova pagina Admin-only: `app/(amministrazione)/permessi-certificati/page.tsx`

Coerente con la Capability Map (stessa riga "Amministrazione e Vista Dirigente", `app/(amministrazione)/`) — accanto a `admin/page.tsx` e `vista-dirigente/page.tsx`, non dentro di essi. Costruita **sul design system finalizzato** (Story 5.1 ha già introdotto i token in `app/globals.css`): riusa `{typography}`/`{colors}`/`{rounded}` esistenti, nessun nuovo token da inventare per una semplice lista di checkbox.

## Tasks / Subtasks

- [x] Task 1: Migrazione — tabella `gruppi_visibili_dirigente`, funzione `dirigente_vede_certificato_atleta`, sostituzione delle 3 policy esistenti (AC: #1, #2, #3, #4)
  - [x] Nuova cartella `prisma/migrations/20260724000000_dirigente_certificati_scoped_select/migration.sql` (vedi SQL completo nel Prerequisito #2).
  - [x] Aggiorna `prisma/schema.prisma`: nuovo model `GruppoVisibileDirigente`, relazione inversa su `Gruppo` (Prerequisito #1). `npx prisma generate` dopo la migrazione.
- [x] Task 2: `app/(amministrazione)/permessi-certificati/actions.ts` (nuovo) (AC: #2, #3, #5)
  - [x] `salvaGruppiVisibiliDirigente` — Server Action (`useActionState` compatibile), `requireRuolo("ADMIN")` in testa. Sostituzione completa (delete-all + insert dei nuovi, in una transazione Prisma `$transaction`) — dataset piccolo (poche decine di Gruppi al massimo), nessun bisogno di un diff riga-per-riga. `gruppoIds: []` (nessuna selezione) produce correttamente zero righe = nessuna restrizione (AC #3).
  - [x] Errori come `{ error: { code, message } }` (convenzione ARCHITECTURE-SPINE.md), `revalidatePath("/permessi-certificati")` al successo.
- [x] Task 3: `app/(amministrazione)/permessi-certificati/page.tsx` (nuovo) (AC: #2, #3, #5)
  - [x] `export const dynamic = "force-dynamic"` (dati mutabili, stesso motivo di `admin/page.tsx`).
  - [x] `trovaAnnoAgonisticoCorrente()` (sola lettura) per elencare solo i Gruppi della stagione corrente — coerente col Prerequisito/AC #6.
  - [x] `prisma.gruppo.findMany` (Anno corrente) + `prisma.gruppoVisibileDirigente.findMany` (per pre-selezionare le checkbox già configurate) — entrambe non protette da RLS (AD-9), Prisma diretto.
  - [x] Form (`PermessiCertificatiForm.tsx`, Client Component) con una checkbox per Gruppo (nome + categoria), pulsante "Salva" che invoca `salvaGruppiVisibiliDirigente`. Applica i token di `DESIGN.md` (stack tipografico di sistema, `{rounded.sm}`, `{colors.button-bg}` per il pulsante primario — stessa disciplina di Story 5.1).
  - [x] Messaggio esplicito se nessun Anno Agonistico corrente o zero Gruppi — stessa disciplina "mai un caso vuoto silenzioso" di Story 5.1.
- [x] Task 4: Route guard (AC: #5)
  - [x] `lib/auth/route-guard.ts`: aggiungi `{ prefix: "/permessi-certificati", ruoliAmmessi: ["ADMIN"] }` a `PROTECTED_ROUTES`.
  - [x] Test in `route-guard.test.ts`: consenti Admin, rifiuta ogni altro Ruolo (incluso Dirigente stesso — non deve poter configurare il proprio permesso) verso `/non-autorizzato`.
- [x] Task 5: Test (Vitest)
  - [x] Nessun test automatico per la funzione SQL `dirigente_vede_certificato_atleta` (nessuna infrastruttura di test di integrazione contro Postgres reale in questo progetto — stessa categoria già accettata per `allenatore_possiede_atleta`, Story 3.1/4.5, verificata solo dal vivo). Nessun test automatico per `page.tsx`/`actions.ts` oltre il route guard (stesso principio di Story 5.1).
- [x] Task 6: Verifica dal vivo (manuale, Playwright temporaneo + verifica diretta RLS via supabase-js)
  - [x] Setup: Docker Desktop + stack Supabase CLI locale + dev server (riavviato a metà verifica, vedi Debug Log). Creati 2 Gruppi nell'Anno Agonistico corrente (A, B), ciascuno con un'Atleta con Certificato Medico `CONFERMATO`; un Utente Dirigente, un Utente Segreteria, un Utente Admin.
  - [x] AC #1: prima di ogni configurazione, verificato via sessione Supabase del Dirigente (`.from("certificati_medici").select()`) che veda entrambe le Atlete (2 righe).
  - [x] AC #2: configurato (via Prisma diretto, poi ri-verificato tramite l'interfaccia reale) il solo Gruppo A come visibile — il Dirigente vede ora solo `atletaA` (1 riga).
  - [x] AC #3: rimossa la configurazione (nessuna riga in `gruppi_visibili_dirigente`) — il Dirigente torna a vedere entrambe le Atlete.
  - [x] AC #4: con la restrizione al Gruppo A attiva, verificato che Segreteria e Admin vedano comunque entrambe le Atlete (2 righe ciascuno), nessun impatto della restrizione.
  - [x] AC #5: come Admin, `/permessi-certificati` mostra correttamente le checkbox dei 2 Gruppi, la selezione si salva e persiste dopo reload (verificato con Playwright attraverso l'interfaccia reale, non solo a livello DB). Un Utente con Ruolo Dirigente che tenta `/permessi-certificati` → redirect confermato a `/non-autorizzato`.
  - [x] Scoping INSERT/UPDATE per Dirigente verificato direttamente via supabase-js: un tentativo di `UPDATE` sul Certificato di `atletaB` (fuori dal Gruppo consentito) restituisce zero righe modificate (RLS nega silenziosamente, stesso pattern "nessuna riga aggiornata = non autorizzato" già stabilito in Story 1.3/4.4); lo stesso `UPDATE` su `atletaA` (dentro lo scope) riesce.
  - [x] Dati e Utenti di test rimossi a fine sessione, stato del DB locale ripristinato a com'era prima della verifica.

### Review Findings

- [x] [Review][Patch] **Bug reale di "riga stale" tra stagioni** nella funzione `dirigente_vede_certificato_atleta`: il `JOIN` con `gruppo_atlete` non è mai scoped alla stagione — se restano righe in `gruppi_visibili_dirigente` riferite a Gruppi di una stagione passata (mai ripulite dopo un rollover), la funzione può produrre **due esiti opposti entrambi sbagliati**: (a) un'Atleta appartenuta in passato a un Gruppo autorizzato ma non più oggi resta comunque visibile (sovra-esposizione); (b) se restano solo righe "orfane" (stagione passata), `NOT EXISTS` risulta falso (tabella non vuota) ma nessuna Atleta della stagione corrente farà mai match → il Dirigente non vede **nessun** Certificato, non "tutti" come dichiarato dall'AC #6 — contraddice direttamente il comportamento atteso [prisma/migrations/20260724000000_dirigente_certificati_scoped_select/migration.sql] — **Fixed**: nuova migrazione `20260724010000_dirigente_certificati_scoped_by_stagione` — sia il controllo "restrizione attiva" sia il match di appartenenza sono ora scoped alla stagione corrente (`anni_agonistici.dataInizio/dataFine` contro `CURRENT_DATE`). Ri-verificato dal vivo: con solo una riga stale di stagione passata, il Dirigente torna a vedere tutto (prima del fix avrebbe visto zero righe).
- [x] [Review][Patch] **`/vista-dirigente` (Story 5.1) mostra dati falsi per le Atlete fuori dallo scope del Dirigente**: legge `elencaCertificati(supabase)` ora scoped, ma i Gruppi/l'appartenenza (Prisma diretto) restano non scoped — un'Atleta con Certificato realmente `CONFERMATO` ma fuori dai Gruppi consentiti appare come "senza certificato"/"da verificare", un'informazione sbagliata mostrata al Dirigente, non solo un dato mancante — esplicitamente citata come superficie coinvolta dall'AC #1 di questa storia [app/(amministrazione)/vista-dirigente/page.tsx] — **Fixed**: la pagina legge ora `gruppoVisibileDirigente` (scoped alla stagione corrente, stessa logica del fix sopra) e mostra "Fuori dai permessi configurati" per i Gruppi esclusi invece di calcolare conteggi errati (`conteggi: null` in `GruppoCardData`). Ri-verificato dal vivo con successo.
- [x] [Review][Patch] Valori duplicati in `gruppoIds` (form manomesso o doppio submit) fanno fallire l'intera transazione (`createMany` urta il vincolo `@unique` su `gruppoId`) con un errore generico, invece di essere semplicemente deduplicati [app/(amministrazione)/permessi-certificati/actions.ts] — **Fixed**: `Array.from(new Set(...))` prima dell'insert.
- [x] [Review][Patch] Conteggio test nelle Completion Notes errato: dichiarati "5 nuovi" ma il diff ne aggiunge 2 (`route-guard.test.ts`) [Dev Agent Record della storia] — **Fixed**: conteggio corretto nelle Completion Notes.
- [x] [Review][Patch] Il test "rifiuta ogni altro Ruolo" per `/permessi-certificati` esercita solo Dirigente/Segreteria/Allenatore, non Genitore/Atleta — il Task 4 dichiara "ogni altro Ruolo" ma il diff non lo dimostra per tutti e cinque [lib/auth/route-guard.test.ts] — **Fixed**: aggiunte le asserzioni per Genitore e Atleta allo stesso test.
- [x] [Review][Patch] Il Prerequisito #1 della storia prescrive testualmente il nome campo inverso `gruppoVisibileDirigente` su `Gruppo`, ma il codice usa `visibileDirigente` — funzionalmente inerte (il campo non è mai referenziato altrove) ma il testo della storia va corretto per riflettere il codice reale [_bmad-output/implementation-artifacts/5-2-permessi-granulari-su-dati-sanitari.md, Prerequisito #1] — **Fixed**: testo del Prerequisito #1 corretto.
- [x] [Review][Defer] `/conferma-certificati` (Story 4.4) mostra un'Atleta con Certificato già `CONFERMATO` ma fuori dallo scope del Dirigente come "Da confermare" (falso, non solo mancante) — pagina preesistente non progettata per questo nuovo concetto di scoping; richiede un ripensamento della pagina stessa, fuori dal perimetro contenuto di questa storia [app/(certificati-medici)/conferma-certificati/page.tsx]
- [x] [Review][Defer] `confermaCertificato`/`aggiornaCertificato` (`lib/db-rls/certificato-medico.ts`, condivisa da tutti i Ruoli) possono restituire successo senza aver scritto nulla se la RLS nega silenziosamente l'upsert (controllano solo `error`, mai le righe modificate) — gap preesistente, reso raggiungibile in pratica solo ora che un Dirigente può essere scoped; il fix riguarda una funzione condivisa usata da ogni Ruolo, non specifico di questa storia [lib/db-rls/certificato-medico.ts]
- [x] [Review][Defer] Le policy su `storage.objects` per il file del certificato (PDF/immagine) restano non scoped per il Dirigente — solo la riga di metadata in `certificati_medici` è ora limitata, non il documento reale; rilevante dato che la storia si chiama esplicitamente "permessi granulari sui **dati sanitari**" [prisma/migrations/20260718020000_certificati_storage_e_rls/migration.sql, 20260718030000_certificati_storage_fix_policy/migration.sql]
- [x] [Review][Defer] Le email di promemoria scadenza (Story 4.6, Cron) notificano ogni Dirigente attivo di ogni certificato in scadenza, ignorando completamente la restrizione — bypass della granularità per un canale diverso dall'app [app/api/cron/promemoria-certificati/route.ts, lib/utenti/email-per-ruolo.ts]
- [x] [Review][Defer] Un Utente con Ruolo Dirigente **e anche** Segreteria o Admin non è mai limitato dalla restrizione (le policy RLS multiple si combinano in OR) — comportamento corretto e voluto (Segreteria/Admin restano sempre ad accesso pieno per decisione esplicita dell'utente), ma merita una nota esplicita nei Dev Notes perché non ovvio leggendo solo il codice [prisma/migrations/20260724000000_dirigente_certificati_scoped_select/migration.sql]
- [x] [Review][Defer] Le checkbox del form Admin non si risincronizzano dopo `revalidatePath` in scenari di modifica concorrente (componente non controllato, `defaultChecked`) — rischio basso, stessa assunzione "singolo Admin" già accettata in storie precedenti [app/(amministrazione)/permessi-certificati/PermessiCertificatiForm.tsx]

## Dev Notes

- **Perché non RLS sulla nuova tabella**: vedi Prerequisito #1 — la funzione `SECURITY DEFINER` risolve comunque il problema di lettura per la policy su `certificati_medici`; niente RLS/GRANT qui evita di introdurre un'eccezione non necessaria ad AD-9 per una tabella puramente di configurazione strutturale (nessun dato personale, solo riferimenti a `gruppoId`).
- **"Deseleziona tutto" come unico modo di disattivare la restrizione** (AC #3) è una scelta deliberata di semplicità per questa storia (Should/v1.1) — nessun interruttore "attivo/disattivo" separato, un set vuoto è già uno stato pienamente valido e coerente (`NOT EXISTS` nella funzione SQL).
- **La restrizione non sopravvive al cambio di stagione** (AC #6) — accettato esplicitamente, coerente con la natura "se serve" (Should) di questa storia. Se in futuro servisse una configurazione che sopravvive al rollover, andrebbe ripensata insieme al Wizard Nuova Stagione (Story 6.3, non ancora costruita) — fuori perimetro qui.
- **Fuori perimetro esplicito**: nessuna granularità per singola Atleta o per singolo campo del certificato (scartate in fase di elicitazione con l'utente a favore della granularità per Gruppo, più semplice e sufficiente per la scala di un singolo club); nessuna restrizione configurabile per Segreteria o Admin (entrambi restano sempre ad accesso pieno, per decisione esplicita dell'utente).

### Project Structure Notes

- Nuova migrazione: `prisma/migrations/<timestamp>_dirigente_certificati_scoped_select/migration.sql`.
- Nuovo model Prisma: `GruppoVisibileDirigente` (+ relazione inversa su `Gruppo`).
- Nuovi file: `app/(amministrazione)/permessi-certificati/page.tsx`, `app/(amministrazione)/permessi-certificati/actions.ts`.
- File modificati: `lib/auth/route-guard.ts` (+ `.test.ts`).
- Nessuna modifica a `lib/db-rls/certificato-medico.ts` (Prerequisito #3).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.2: Permessi granulari su dati sanitari] — user story e AC originali (astratti, vedi nota di chiarimento sopra).
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-27] — "L'Admin può configurare permessi granulari su chi vede i dati relativi ai Certificati Medici, oltre il controllo di base per ruolo."
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#Deferred] — "Permessi granulari fine oltre il ruolo base (FR-27, Should)... una granularità più fine è un'estensione futura delle policy, non un cambio di paradigma" — questa storia realizza esattamente quell'estensione.
- [Source: prisma/migrations/20260717200000_atlete_allenatore_select/migration.sql, prisma/migrations/20260722000000_certificati_allenatore_select/migration.sql] — pattern `SECURITY DEFINER` da replicare identico (`allenatore_possiede_atleta` → `dirigente_vede_certificato_atleta`).
- [Source: prisma/migrations/20260717090000_add_certificato_medico/migration.sql] — le 3 policy `admin_dirigente_segreteria_*` da sostituire.
- [Source: app/(amministrazione)/vista-dirigente/] — Story 5.1, prima pagina costruita sul design system finalizzato; stesso pattern di pagina Admin-only da replicare per `/permessi-certificati` (Prisma diretto per dati non-RLS, `trovaAnnoAgonisticoCorrente` sola lettura).
- [Source: app/(amministrazione)/admin/actions.ts] — pattern Server Action `requireRuolo(["ADMIN"])` da riusare identico.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md, EXPERIENCE.md] — token/pattern del design system finalizzato, da applicare alla nuova pagina.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Ambientale, scoperto in verifica dal vivo (non applicativo)**: il dev server `next dev`, già in esecuzione da sessioni precedenti, aveva in memoria un client Prisma generato prima dell'aggiunta del model `GruppoVisibileDirigente` — `/permessi-certificati` rispondeva `500` (Server Component error) nonostante `npx prisma generate` fosse già stato rieseguito con successo su disco (confermato funzionante da script Node freschi). Risolto riavviando il processo `next dev`. Nessuna modifica al codice applicativo: un riavvio del dev server dopo un cambio di schema Prisma è comunque buona prassi, non specifico di questa storia.
- Nessun altro problema incontrato: il pattern `SECURITY DEFINER` (riuso identico da Story 3.1/4.5) ha funzionato al primo tentativo, sia per SELECT sia per INSERT/UPDATE.

### Completion Notes List

- Tutti i 6 Task completati (nessun TDD applicabile: nessuna funzione pura nuova introdotta da questa storia, solo migrazione SQL + Server Action + pagina + route guard — stesso principio già stabilito da Story 5.1 per le parti non testabili in isolamento).
- Suite completa verde: `npx vitest run` (445 test, 43 file — 440 pre-esistenti + 2 nuovi in `route-guard.test.ts`, le asserzioni aggiuntive del review fix estendono test già esistenti senza aggiungerne di nuovi), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun nuovo errore, solo un warning pre-esistente non correlato), `npm run build` (produzione, nessuna regressione — `/permessi-certificati` compare correttamente come rotta dinamica).
- **Elicitazione preliminare con l'utente** (prima della creazione della story): l'AC originale dell'epic era troppo astratto per essere implementato direttamente — concordato un disegno concreto (granularità per Gruppo, solo Ruolo Dirigente restringibile, Segreteria/Admin sempre ad accesso pieno) prima di scrivere qualunque codice, documentato nella story stessa.
- **Verifica dal vivo (Task 6) ha confermato tutti gli AC funzionanti**, sia a livello RLS diretto (query/update via sessioni Supabase reali per Dirigente/Segreteria/Admin) sia a livello di interfaccia reale (form Admin, persistenza dopo reload, route guard). Un solo problema ambientale scoperto e risolto (dev server con Prisma Client non rigenerato in memoria, vedi Debug Log) — nessun bug applicativo reale in questa fase.
- **Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor)**: 6 finding `patch`, 6 `defer`, 5 scartati come rumore. **Il più significativo**: la funzione `dirigente_vede_certificato_atleta` non era scoped alla stagione — righe stale di stagioni passate potevano causare sovra-esposizione oppure il blocco totale del Dirigente (zero certificati visibili), l'opposto dell'AC #6. Corretto con una nuova migrazione (`20260724010000_dirigente_certificati_scoped_by_stagione`) che scopa sia il controllo "restrizione attiva" sia il match di appartenenza alla stagione corrente, verificata dal vivo riproducendo esattamente lo scenario di bug (riga stale + zero righe per la stagione corrente → il Dirigente vede comunque tutto). Corretto anche un secondo bug reale scoperto in review: `/vista-dirigente` (Story 5.1) mostrava dati falsi ("senza certificato") per le Atlete escluse dallo scope invece di un messaggio esplicito — anch'esso ri-verificato dal vivo con successo. Applicati anche: dedup dei `gruppoIds`, copertura test per tutti i 5 Ruoli non-Admin, correzioni testuali nella story. **6 finding deferred** (documentati in `deferred-work.md`, confermato con l'utente di non espanderli in questa storia): `/conferma-certificati` mostra dati falsi per Atlete fuori scope; `confermaCertificato`/`aggiornaCertificato` possono restituire successo senza scrivere se la RLS nega; le policy su `storage.objects` (il *file* del certificato) restano non scoped; le email di promemoria (Story 4.6) ignorano la restrizione; un Utente con Ruolo Dirigente+Segreteria/Admin non è mai limitato (comportamento corretto e voluto, solo da documentare meglio); le checkbox non si risincronizzano in scenari di modifica concorrente.
- Nessuna deviazione dai Prerequisiti architetturali della storia: nessun GRANT verso `authenticated` introdotto per `gruppi_visibili_dirigente` (AD-9 rispettato), scoping identico su SELECT/INSERT/UPDATE per Dirigente (non solo lettura), `elencaCertificati`/`lib/db-rls/certificato-medico.ts` non toccati.

### File List

- `prisma/migrations/20260724000000_dirigente_certificati_scoped_select/migration.sql` (nuovo)
- `prisma/migrations/20260724010000_dirigente_certificati_scoped_by_stagione/migration.sql` (nuovo, review fix: scoping per stagione)
- `prisma/schema.prisma` (modificato: nuovo model `GruppoVisibileDirigente`, relazione inversa su `Gruppo`)
- `app/(amministrazione)/permessi-certificati/actions.ts` (nuovo)
- `app/(amministrazione)/permessi-certificati/page.tsx` (nuovo)
- `app/(amministrazione)/permessi-certificati/PermessiCertificatiForm.tsx` (nuovo)
- `app/(amministrazione)/permessi-certificati/permessi-certificati.module.css` (nuovo)
- `app/(amministrazione)/vista-dirigente/page.tsx` (modificato, review fix: legge `gruppoVisibileDirigente` e marca i Gruppi esclusi)
- `app/(amministrazione)/vista-dirigente/GruppoCard.tsx` (modificato, review fix: nuovo stato "fuori dai permessi configurati")
- `lib/auth/route-guard.ts` (modificato: nuova rotta `/permessi-certificati`, solo Admin)
- `lib/auth/route-guard.test.ts` (modificato: nuovi test per la rotta sopra + copertura Genitore/Atleta, review fix)
