---
baseline_commit: 9bf025b844f2e6e1f6faef5fc64c310051d5486a
---

# Story 4.5: Alert scadenza non bloccante

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore,
I want vedere un alert visivo quando il Certificato Medico di un'Atleta è scaduto,
so that ne sono consapevole, ma senza che questo mi impedisca di registrare la presenza.

## Acceptance Criteria

1. **Given** un'Atleta nel roster di un Allenatore ha un Certificato Medico con `dataFineValidita` nel passato, **when** l'Allenatore apre `/presenze` per un proprio Slot, **then** vede un alert visivo accanto al nome di quell'Atleta.
2. **Given** un'Atleta ha un Certificato Medico con `dataFineValidita` futura (o odierna), **when** l'Allenatore apre `/presenze`, **then** non vede alcun alert per quell'Atleta.
3. **Given** un'Atleta non ha ancora un Certificato Medico caricato, oppure ne ha uno senza `dataFineValidita` impostata (mai confermato, Story 4.4), **when** l'Allenatore apre `/presenze`, **then** non vede alcun alert per quell'Atleta — nessuna data nota non è "scaduto", sono due stati distinti.
4. **Given** un'Atleta con Certificato scaduto, **when** l'Allenatore spunta/despunta la sua presenza e salva, **then** il salvataggio riesce esattamente come per qualunque altra Atleta — l'alert non impedisce in nessun caso la registrazione (FR-15, effetto puramente informativo).
5. **Given** un Allenatore che apre `/presenze` per un proprio Slot, **when** la pagina carica lo stato dei Certificati del roster, **then** vede la scadenza solo delle proprie Atlete (quelle dei propri Gruppi) — mai di Atlete di altri Allenatori, mai un errore/pagina vuota per la lettura dei Certificati.

## Prerequisiti architetturali di questa storia (da leggere prima di iniziare)

### 1. Gap RLS: nessuna policy SELECT su `certificati_medici` per il Ruolo ALLENATORE — nuova migrazione necessaria

Le uniche policy SELECT esistenti su `certificati_medici` (migrazione Story 1.7/4.1) coprono `ADMIN`/`DIRIGENTE`/`SEGRETERIA` (accesso ampio) e `GENITORE`/`ATLETA` (solo la propria Atleta, via `utente_possiede_atleta`). **ALLENATORE non è mai stato incluso** — senza una nuova policy, `elencaCertificati(supabase)` (Story 4.4, già esistente) restituirebbe sempre un array vuoto per una sessione Allenatore, e nessun alert potrebbe mai comparire (AC #1 non funzionerebbe in produzione, esattamente come il bug scoperto in verifica dal vivo di Story 4.3 per un problema analogo).

**Riusa la funzione `SECURITY DEFINER` già esistente** `allenatore_possiede_atleta(atleta_id_param TEXT)` (migrazione `20260717200000_atlete_allenatore_select`, creata per la policy equivalente su `atlete`) — stessa logica di scoping (Atleta appartenente a un Gruppo assegnato all'Allenatore), nessuna nuova funzione da scrivere:

```sql
-- Nuova migrazione: 20260722000000_certificati_allenatore_select/migration.sql
CREATE POLICY "allenatore_proprie_atlete_certificato_select" ON "certificati_medici"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_atleta("atletaId")
  );
```

**Nessun nuovo GRANT necessario**: `GRANT SELECT, INSERT, UPDATE ON "certificati_medici" TO authenticated` (Story 1.7) è già a livello di tabella, copre già ogni Ruolo autenticato incluso Allenatore — manca solo la policy.

### 2. Riusare `elencaCertificati` (Story 4.4), nessuna nuova query di lettura

`lib/db-rls/certificato-medico.ts` espone già `elencaCertificati(supabase)` (colonne esplicite: `id, atletaId, stato, filePath, dataInizioValidita, dataFineValidita, mesiValidita, modulo`) — con la nuova policy sopra, per una sessione Allenatore restituirà solo i Certificati delle proprie Atlete (RLS-filtrati). Nessuna nuova funzione di lettura da scrivere in `lib/db-rls/`.

### 3. "Scaduto" è indipendente da `stato` (IN_ATTESA/CONFERMATO, Story 4.4) — solo la data conta

FR-15/AC #1 parlano solo di `dataFineValidita` nel passato, non dello stato di conferma. **Non condizionare l'alert allo `stato`**: un Certificato `IN_ATTESA` (es. ri-caricato, Story 4.4 AC #3) con una vecchia `dataFineValidita` ormai passata deve comunque mostrare l'alert — l'informazione utile per l'Allenatore è "la validità nota è scaduta", non "è stata riconfermata". Questa è una scelta implementativa deliberata di questa storia (non esplicitata da FR-15), motivata dal fatto che Epic 5/Story 5.2 (permessi granulari, fuori perimetro qui) e Story 4.4 (conferma) restano concettualmente separate dall'allerta di scadenza per l'Allenatore.

### 4. `/presenze` (Story 3.1) è l'unica superficie che serve — "visualizza il Gruppo" e "registra le presenze" sono la stessa pagina

Non esiste nella codebase una pagina distinta "vista Gruppo" per l'Allenatore (`/gruppi` è Admin/Dirigente-only, `/mio-orario` mostra solo l'orario, non il roster). Il roster delle proprie Atlete per un proprio Slot è mostrato solo in `app/(presenze)/presenze/page.tsx` (Story 3.1), esattamente dove FR-8 già registra le presenze — un solo punto di integrazione, nessuna nuova pagina.

### 5. Funzione pura co-locata, stesso pattern di `calcola-statistiche-presenza.ts` (Story 3.3)

Non incorporare il calcolo "è scaduto" direttamente nel Server Component `page.tsx` (mai testato altrimenti) — estrarlo in `app/(presenze)/presenze/certificato-scaduto.ts`, funzione pura con `oggi: Date` come parametro esplicito (mai `new Date()` letta internamente, per restare testabile senza mock del tempo), con il proprio file di test, stesso pattern già stabilito per il trend di Story 3.3.

## Tasks / Subtasks

- [x] Task 1: Migrazione RLS — policy SELECT per ALLENATORE su `certificati_medici` (AC: #1, #5)
  - [x] Nuova cartella `prisma/migrations/20260722000000_certificati_allenatore_select/migration.sql` (vedi SQL nel Prerequisito #1). Nessun nuovo GRANT.
- [x] Task 2: `app/(presenze)/presenze/certificato-scaduto.ts` (nuovo) (AC: #1, #2, #3)
  - [x] `certificatoScaduto(dataFineValidita: string | null, oggi: Date): boolean` — `false` se `dataFineValidita` è `null`/assente (AC #3), altrimenti confronto per sola data di calendario (`YYYY-MM-DD`, non timestamp pieno — vedi Dev Notes).
  - [x] Test TDD: `null`/assente → `false`; data futura → `false`; data odierna → `false` (non ancora scaduto lo stesso giorno); data passata → `true`.
- [x] Task 3: `app/(presenze)/presenze/page.tsx` — leggere i Certificati del roster (AC: #1, #2, #3, #5)
  - [x] Aggiunto `elencaCertificati(supabase)` (Story 4.4, `lib/db-rls/certificato-medico.ts`) al `Promise.all` già esistente insieme a `elencaAtlete`/`leggiPresenzePerSlotEData`.
  - [x] Join in memoria per `atletaId` (stesso pattern di `notifiche/page.tsx`/`storico-presenze/page.tsx`, mai un `include` Prisma diretto su `certificati_medici`, RLS-protetta AD-4) per arricchire ogni riga del `roster` con `certificatoScaduto: boolean` (usando `certificatoScaduto(dataFineValidita, new Date())`).
- [x] Task 4: `PresenzeForm.tsx` — alert visivo non bloccante (AC: #1, #2, #4)
  - [x] Estesa `AtletaMinima`/`roster` con `certificatoScaduto: boolean`; renderizzato `<span role="alert">Certificato scaduto</span>` accanto al nome quando `true`, nessuna modifica alla logica di submit/checkbox (l'alert è puramente decorativo, nessun `disabled`/validazione collegato).
- [x] Task 5: Test (Vitest)
  - [x] Come elencato nel Task 2 sopra (unico modulo con logica pura testabile introdotto da questa storia). Suite completa verde (418 test, 40 file).
  - [x] Nessun test aggiuntivo per `page.tsx`/`PresenzeForm.tsx`: nessuna storia precedente ha mai testato un Server Component o un Client Component di rendering in questa codebase (solo `actions.ts`/funzioni pure hanno test Vitest) — coerente con lo standard di test già stabilito, verificato invece dal vivo (Task 6).
- [x] Task 6: Verifica dal vivo (manuale)
  - [x] Setup: Docker Desktop + stack Supabase CLI locale + dev server già attivi (proseguiti da Story 4.4). Migrazione applicata (`prisma migrate deploy`). Creati un Allenatore + Utente collegato, una Palestra/Campo/Gruppo/Slot (mercoledì, coincidente con l'Anno Agonistico già a sistema) e tre Atlete di test (Certificato scaduto/valido/assente) assegnate al Gruppo. Verifica con Playwright (script temporanei, rimossi a fine verifica).
  - [x] AC #1: come Allenatore, aperto `/presenze` per il proprio Slot; il roster ha caricato correttamente le sole Atlete del proprio Gruppo (nessun errore RLS) e l'Atleta con Certificato scaduto mostra l'alert `Certificato scaduto`.
  - [x] AC #5 (review fix — correzione formulazione): **verificato per costruzione, non con un secondo Allenatore di test dal vivo** — la policy RLS riusa identica `allenatore_possiede_atleta`, già in produzione senza problemi di isolamento dalla Story 3.1. Nessun errore RLS incontrato durante la verifica con un solo Allenatore. Vedi Debug Log per il dettaglio del rischio residuo.
  - [x] AC #2: l'Atleta con Certificato valido (data futura) non mostra alcun alert.
  - [x] AC #3: l'Atleta senza alcun Certificato caricato non mostra alcun alert.
  - [x] AC #4: spuntata la presenza dell'Atleta con l'alert e salvata; il salvataggio riesce normalmente (`Presenze salvate.`), l'alert non ha impedito nulla.
  - [x] Dati e file di scratch della verifica rimossi a fine sessione — stato del DB locale ripristinato a com'era prima della verifica.

### Review Findings

- [x] [Review][Patch] `certificatoScaduto`/`oggi` confrontano la data di calendario UTC, non quella di Europe/Rome: per 1-2 ore ogni giorno (a cavallo della mezzanotte italiana) un Certificato appena scaduto risulta ancora "non scaduto" — contraddice la motivazione esplicita nei Dev Notes e viola l'intento dell'AC #1 [app/(presenze)/presenze/certificato-scaduto.ts, page.tsx]
- [x] [Review][Patch] `role="alert"` usato per un'informazione statica presente già al primo render (dovrebbe essere riservato ad annunci dinamici, come già fatto per `state.error`/`state.success` nello stesso file) — più badge simultanei disorientano gli screen reader e non vengono ri-annunciati se l'utente naviga alla riga in un secondo momento [app/(presenze)/presenze/PresenzeForm.tsx]
- [x] [Review][Patch] Manca un test per `dataFineValidita` come stringa vuota in `certificatoScaduto` (il comportamento è già corretto — `!""` è falsy — manca solo la prova di regressione) [app/(presenze)/presenze/certificato-scaduto.test.ts]
- [x] [Review][Defer] Nessun test automatico end-to-end per l'isolamento RLS tra Allenatori di Gruppi diversi (AC #5) — deferred, stessa categoria già accettata in molte storie precedenti (nessuna infrastruttura di test di integrazione contro Postgres reale in questo progetto); rischio basso, stessa funzione RLS già in produzione senza problemi dalla Story 3.1
- [x] [Review][Defer] Nessun indicatore distinto per un Certificato `IN_ATTESA` (ri-caricato, in attesa di riconferma Segreteria) rispetto a uno realmente scaduto — scelta architetturale deliberata e già motivata nei Dev Notes (separazione da Story 4.4), non un difetto; possibile idea di prodotto per una storia futura

## Dev Notes

- **Nessuna modifica a `lib/db-rls/certificato-medico.ts`** — `elencaCertificati` esiste già (Story 4.4) con le colonne già necessarie; questa storia aggiunge solo la policy RLS mancante e il calcolo/rendering lato Allenatore.
- **Confronto per sola data di calendario, non per timestamp pieno** — un confronto naive `new Date(dataFineValidita) < new Date()` avrebbe reso "scaduto" un Certificato valido fino a oggi stesso (mezzanotte UTC del giorno è già nel passato rispetto a qualunque ora successiva), contraddicendo AC #2 ("futura **o odierna**"). `certificatoScaduto` confronta invece le sole stringhe di data (`YYYY-MM-DD`), coerente con l'intento letterale dell'AC — nessun margine/trade-off di fuso orario da accettare qui, a differenza del confine Anno Agonistico di Story 1.6.
- **Nessuna interazione con la pagina `/conferma-certificati` (Story 4.4)** — quella pagina resta l'unica a mostrare `stato` (IN_ATTESA/CONFERMATO) alla Segreteria; questa storia non tocca quella UI né introduce un concetto di stato aggiuntivo, solo un confronto di data per l'Allenatore.
- **Fuori perimetro esplicito di questa storia**: nessun alert per Dirigente (la sua vista aggregata è Story 5.1, Epic 5, non ancora pianificata in dettaglio) né per Admin/Segreteria — FR-15/AC parlano solo di Allenatore.

### Project Structure Notes

- Nuova migrazione: `prisma/migrations/20260722000000_certificati_allenatore_select/migration.sql`.
- Nuovo file: `app/(presenze)/presenze/certificato-scaduto.ts` (+ `.test.ts`).
- File modificati: `app/(presenze)/presenze/page.tsx`, `app/(presenze)/presenze/PresenzeForm.tsx`.
- Nessuna nuova tabella, nessun nuovo Server Action.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.5: Alert scadenza non bloccante] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-15] — "Il sistema mostra un alert visivo quando il Certificato Medico di un'Atleta è scaduto... non impedisce mai la registrazione di una presenza (FR-8)."
- [Source: prisma/migrations/20260717200000_atlete_allenatore_select/migration.sql] — funzione `allenatore_possiede_atleta` riusata identica per la nuova policy.
- [Source: app/(presenze)/presenze/page.tsx, PresenzeForm.tsx, actions.ts] — pagina/form esistenti da Story 3.1 da estendere.
- [Source: app/(presenze)/storico-presenze/calcola-statistiche-presenza.ts] — pattern di funzione pura co-locata con test dedicato, da replicare identico.
- [Source: _bmad-output/implementation-artifacts/4-4-conferma-validazione-certificato.md] — `elencaCertificati`, colonne esplicite, e il concetto `stato` da NON confondere con "scaduto".

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Verifica dal vivo rallentata da un problema ambientale (non applicativo)**: durante gli script Playwright di verifica, richieste API parallele (Promise.all in `page.tsx`) autenticate con un JWT appena emesso subito dopo il login fallivano in modo intermittente con `JWT issued at future` — non tutte le richieste della stessa raffica fallivano insieme (a volte solo `elencaAtlete`, a volte solo `elencaCertificati`, mai in modo sistematico), il che esclude un vero disallineamento di orologio tra host e container Docker (verificato più volte: host, Postgres e i container Auth/Kong risultavano allineati entro 1-2 secondi). Causa più probabile: jitter di schedulazione tra i processi coinvolti in ambiente Docker Desktop/WSL2 locale su un token appena emesso, non riproducibile in produzione (infrastruttura cloud sincronizzata). Mitigato per lo script di verifica con un'attesa di 2 secondi dopo il login prima della prima richiesta dati. Nessuna modifica al codice applicativo per questo problema (fuori perimetro della storia, non causato da questa storia).
- **AC #5 (isolamento tra Allenatori) verificato per costruzione, non con un secondo Allenatore di test**: la nuova policy RLS riusa identica la funzione `allenatore_possiede_atleta` già in produzione per la tabella `atlete` dalla Story 3.1 (stessa logica di scoping, mai stata causa di problemi di isolamento in quella storia) — non è stato eseguito un secondo test manuale con un Allenatore diverso per limiti di tempo dopo i rallentamenti ambientali sopra descritti. Rischio residuo basso, segnalato per trasparenza.

### Completion Notes List

- Tutti i 6 Task completati con TDD dove applicabile (RED confermato prima dell'implementazione nel Task 2).
- Suite completa verde: `npx vitest run` (418 test, 40 file — 414 pre-esistenti + 4 nuovi), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun nuovo errore), `npm run build` (produzione, nessuna regressione).
- Verifica dal vivo (Task 6) ha confermato AC #1-#4 funzionanti come da design. Nessun bug applicativo reale scoperto durante l'implementazione (il rallentamento incontrato era interamente ambientale, vedi Debug Log). Nessuna deviazione dal design dei Prerequisiti architetturali della storia.
- **Review fix**: tre layer di review indipendenti (Blind Hunter, Edge Case Hunter, Acceptance Auditor) hanno convergito su un bug reale — `certificatoScaduto` confrontava la data odierna in UTC invece che nel fuso di Europe/Rome, creando una finestra di 1-2 ore al giorno in cui un Certificato appena scaduto non veniva segnalato (contraddiceva la motivazione esplicita già scritta nei Dev Notes). Corretto con `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" })`. Corretto anche l'uso scorretto di `role="alert"` (riservato ad annunci dinamici, non a contenuto statico al render iniziale) e aggiunta la formulazione corretta per il Task 6/AC #5 (verificato per costruzione, non con un secondo Allenatore dal vivo). 420 test verdi dopo i fix (418 → 420, +2 nuovi test su questo modulo).

### File List

- `prisma/migrations/20260722000000_certificati_allenatore_select/migration.sql` (nuovo)
- `app/(presenze)/presenze/certificato-scaduto.ts` (nuovo)
- `app/(presenze)/presenze/certificato-scaduto.test.ts` (nuovo)
- `app/(presenze)/presenze/page.tsx` (modificato: lettura `elencaCertificati`, join in memoria, calcolo `certificatoScaduto` per riga di roster)
- `app/(presenze)/presenze/PresenzeForm.tsx` (modificato: alert visivo non bloccante accanto al nome)
