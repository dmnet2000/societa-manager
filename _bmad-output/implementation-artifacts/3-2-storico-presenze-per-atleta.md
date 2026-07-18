---
baseline_commit: NO_VCS
---

# Story 3.2: Storico presenze per Atleta

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore o Atleta,
I want consultare lo storico presenze della singola Atleta,
so that ho visibilità sulla sua partecipazione nel tempo.

## Acceptance Criteria

1. **Given** esistono Presenze registrate per un'Atleta (Story 3.1), **when** apro lo storico presenze di quell'Atleta, **then** vedo l'elenco cronologico di presenze/assenze per Slot (data, giorno, orario, Gruppo, presente/assente).
2. Come Allenatore, posso consultare lo storico solo delle Atlete dei Gruppi di cui sono Allenatore.
3. Come Atleta, consulto automaticamente il mio storico (nessuna selezione necessaria) — nessun accesso allo storico di altre Atlete.
4. Il Ruolo Genitore **non** ha accesso a questa vista in questa storia (FR-9 elenca esplicitamente solo Allenatore e Atleta — stessa esclusione già applicata a `/mio-orario`, Story 2.6/2.7).

## Prerequisito architetturale di questa storia (da leggere prima di iniziare)

**Prima policy RLS scoped per il Ruolo ATLETA in questa codebase.** Ogni tabella RLS-protetta finora (`atlete`, `iscrizioni`, `certificati_medici`, `presenze`) ha policy scoped solo per Ruolo (ADMIN/DIRIGENTE/SEGRETERIA) o per relazione Allenatore→Gruppo (Story 3.1) — mai per un'Atleta che legge i propri dati. FR-9 richiede che un'Atleta veda il proprio storico presenze, mai quello di un'altra.

La policy SELECT `allenatore_proprio_gruppo_select` su `presenze` (Story 3.1, funzione `allenatore_possiede_slot_e_atleta`) **copre già interamente il lato Allenatore di questa storia** — nessuna nuova policy necessaria per quel Ruolo, la stessa relazione (Allenatore→Gruppo→Atleta) che protegge la scrittura protegge anche la lettura.

Serve invece una **nuova** policy SELECT per ATLETA, che riusa lo stesso aggancio di identità di Story 2.7 (`GenitoreAtleta` come corrispondenza Utente↔Atleta "a se stessa", non protetta da RLS, AD-9) dentro una funzione `SECURITY DEFINER` — stesso pattern esatto di `allenatore_possiede_slot`/`allenatore_possiede_atleta` (Story 3.1), per lo stesso motivo: `genitori_atlete`/`utenti` non hanno GRANT verso `authenticated`, e concederne uno diretto esporrebbe email/CF a chiunque sia autenticato.

```sql
CREATE OR REPLACE FUNCTION atleta_possiede_presenza(atleta_id_param TEXT)
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

seguita da una policy `atleta_propria_select` gated sia dal Ruolo (`(auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ATLETA'`) sia dalla relazione — il gate sul Ruolo è necessario perché `genitori_atlete` non distingue un aggancio "a se stessa" da un aggancio Genitore↔figlia (stessa ambiguità già accettata in Story 2.7): senza il gate su Ruolo, un Utente con **solo** il Ruolo Genitore erediterebbe involontariamente accesso allo storico presenze della figlia tramite RLS, in contraddizione con AC #4.

**Nessun nuovo GRANT su `presenze`**: `GRANT SELECT ... TO authenticated` è già concesso dalla migrazione Story 3.1, copre anche il Ruolo ATLETA.

## Tasks / Subtasks

- [x] Task 1: Migrazione — policy RLS SELECT per ATLETA su `presenze` (AC: #3, #4)
  - [x] Nuova migrazione: funzione `atleta_possiede_presenza` (`SECURITY DEFINER`, `SET search_path = public`, come sopra) + `REVOKE EXECUTE ... FROM PUBLIC` / `GRANT EXECUTE ... TO authenticated`.
  - [x] Policy `atleta_propria_select` su `presenze`, `FOR SELECT`, gated su Ruolo ATLETA **e** `atleta_possiede_presenza("atletaId")` — combinata in OR con le policy SELECT esistenti (`admin_dirigente_segreteria_select`, `allenatore_proprio_gruppo_select`), nessuna di queste va toccata.
  - [x] Applicare con `prisma migrate deploy`, verificare `prisma migrate status` (nessun drift).
- [x] Task 2: `lib/db-rls/presenza.ts` — nuova funzione di lettura (AC: #1)
  - [x] `leggiStoricoPresenzePerAtleta(supabase: SupabaseClient, atletaId: string): Promise<{ id: string; slotId: string; data: string; presente: boolean }[]>` — `select("id, slotId, data, presente").eq("atletaId", atletaId).order("data", { ascending: true })`. Stesso pattern di `leggiPresenzePerSlotEData` (Story 3.1): `throw new Error(error.message)` su errore.
  - [x] Test TDD: verifica select/eq/order, propagazione errore.
- [x] Task 3: UI in `app/(presenze)/storico-presenze/page.tsx` (nuovo file) (AC: #1, #2, #3, #4)
  - [x] `export const dynamic = "force-dynamic"`; `searchParams: Promise<{...}>` (Next.js 16, gia' verificato, Dev Notes Story 2.8 — non ri-verificare).
  - [x] Identità: stesso pattern collassato di `mio-orario`/`presenze` (Story 2.6/2.7/3.1) — risolve `allenatore` (`prisma.allenatore.findFirst`) e `atletaIds` (`prisma.genitoreAtleta.findMany`) in `Promise.all`. Se nessuno dei due risolve: stesso messaggio già usato in `/presenze` ("account non ancora collegato a un profilo Allenatore. Contatta la segreteria." adattato per includere anche Atleta, vedi sotto).
  - [x] **Ramo Atleta** (se `atletaIds.length > 0`): mostra automaticamente lo storico del **primo** `atletaId` risolto (AC #3) — scelta deliberata, diversa dal merge di `mio-orario` (Story 2.7): unire cronologie di presenza di persone diverse in un'unica lista sarebbe fuorviante (a differenza di unire orari, dove sovrapposizioni sono normali), non solo un dettaglio di ordinamento. Nessuna selezione manuale necessaria.
  - [x] **Ramo Allenatore** (se `allenatore` risolto): selettore `<form method="get">` (stesso pattern `/orari`, `/presenze` — Story 2.8/3.1) con `<select name="atletaId">` popolato dalle Atlete dei propri Gruppi per la stagione corrente (stessa query `GruppoAtleta` + `elencaAtlete(supabase)` di `/presenze`, riusarla). Se `atletaId` in `searchParams` non è tra le proprie Atlete: messaggio di errore chiaro, mai una query silenziosa (stesso principio del controllo `slotId` in `/presenze`).
  - [x] Se entrambi i rami risolvono (Utente con doppio Ruolo Allenatore+Atleta): mostra entrambe le sezioni (non un merge — sono esperienze distinte, AC #2 vs AC #3).
  - [x] Per l'`atletaId` da mostrare (proprio o selezionato): `leggiStoricoPresenzePerAtleta(supabase, atletaId)` (Task 2) + `prisma.slot.findMany({ where: { id: { in: slotIds } }, include: { campo: { include: { palestra: true } }, gruppo: true } })` (Slot non è protetto da RLS, AD-9) per i dettagli di ogni riga, uniti lato server con una mappa (stesso pattern di join manuale già usato in `/presenze`, `/gruppi`). Tabella: Data, Giorno, Orario, Gruppo, Presente/Assente.
  - [x] `lib/auth/route-guard.ts`: `{ prefix: "/storico-presenze", ruoliAmmessi: ["ALLENATORE", "ATLETA"] }` (AC #4: Genitore esplicitamente escluso, stesso scope minimale di `/mio-orario`).
- [x] Task 4: Test (Vitest)
  - [x] `lib/db-rls/presenza.test.ts`: aggiungere test per `leggiStoricoPresenzePerAtleta`.
  - [x] `lib/auth/route-guard.test.ts`: aggiungere test per `/storico-presenze` (allow ALLENATORE/ATLETA, redirect per GENITORE/ADMIN/altri).
  - [x] Nessun test per `storico-presenze/page.tsx` — stessa decisione deliberata già applicata a ogni altra pagina di questo progetto.
- [x] Task 5: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] AC #1/#3: come Atleta (auto-agganciata, Story 2.7), con Presenze pregresse registrate da un Allenatore (Story 3.1) su più Slot/date, verificare che `/storico-presenze` mostri l'elenco corretto (data, giorno, orario, Gruppo, presente/assente) in ordine cronologico, senza selettore.
  - [x] AC #2: come Allenatore con più Atlete nel proprio Gruppo, verificare che il selettore mostri solo le proprie Atlete e che lo storico cambi in base alla selezione.
  - [x] AC #2 (negativo): un `atletaId` manomesso nell'URL per un'Atleta **non** del proprio Gruppo deve mostrare un errore, non lo storico di quell'Atleta (verificare anche che RLS la blocchi comunque a monte).
  - [x] AC #4: verificare che un Genitore (agganciato a un'Atleta ma senza Ruolo Allenatore/Atleta) non possa raggiungere `/storico-presenze` (redirect `/non-autorizzato`, route-guard) — e che, anche bypassando la UI, RLS non gli conceda comunque righe `presenze` per un'Atleta figlia (verifica diretta della policy `atleta_propria_select`, gated sul Ruolo).
  - [x] Verificare che un Admin/Dirigente/Segreteria non possa raggiungere `/storico-presenze` (route-guard) — le loro policy RLS ampie su `presenze` restano comunque attive per un futuro uso (fuori scope qui, stesso trattamento già dato in Story 3.1).

### Review Findings

- [x] [Review][Patch] **(Sicurezza)** La policy RLS `atleta_propria_select` concedeva lettura per *qualsiasi* riga `genitori_atlete` dell'Utente, non solo per il proprio aggancio "a se stessa" — un Utente con doppio Ruolo Atleta+Genitore (caso esplicitamente supportato dalla registrazione, Story 2.7, già testato in `registrati/actions.test.ts`) otteneva quindi accesso allo storico presenze di una figlia tramite il proprio aggancio Genitore, violazione reale di AC #3 [prisma/migrations/20260718000000_presenze_atleta_select/migration.sql] — risolto aggiungendo la colonna `GenitoreAtleta.autoAggancio` (migrazione `20260718010000_genitori_atlete_auto_aggancio`), valorizzata `true` solo per l'aggancio a se stessa (Story 2.7) e richiesta esplicitamente dalla funzione RLS; riverificato dal vivo con uno scenario doppio-ruolo end-to-end (DB, REST diretto, UI)
- [x] [Review][Patch] Ordinamento per `data` non deterministico per righe con la stessa data (due Slot diversi possono cadere nello stesso giorno) [lib/db-rls/presenza.ts] — risolto con un secondo `.order("id", { ascending: true })` come spareggio
- [x] [Review][Defer] Il ramo Allenatore risolve il roster (`gruppoAtleteRows`) solo per l'Anno Agonistico corrente — un coach perde l'accesso UI allo storico di un'Atleta passata a un altro Gruppo/Allenatore in una stagione successiva, anche se lo storico esiste ancora — stessa scelta di scoping già applicata al selettore Slot di `/presenze` (Story 3.1) [app/(presenze)/storico-presenze/page.tsx] — deferred, consistente con la convenzione esistente
- [x] [Review][Defer] La colonna "Giorno" è derivata dal `Slot.giorno` corrente, non dal giorno della settimana calcolato dalla `data` storica della Presenza — se in futuro esistesse una funzionalità di modifica dello Slot, lo storico potrebbe retroattivamente mostrare un giorno errato per righe passate — nessuna funzionalità di modifica Slot esiste oggi (stessa assenza già accettata in Story 2.5) [app/(presenze)/storico-presenze/page.tsx] — deferred, non raggiungibile allo stato attuale
- [x] [Review][Defer] Nessuna paginazione su `leggiStoricoPresenzePerAtleta` (elenco illimitato) — alla scala attuale (una stagione = poche decine di Slot per Atleta) non rilevante; da riconsiderare se lo storico dovesse estendersi su più stagioni [lib/db-rls/presenza.ts] — deferred, non rilevante alla scala attuale
- [x] [Review][Defer] Query duplicata se lo stesso Utente compare in entrambe le sezioni (es. un'Allenatore che allena anche se stessa) — nessuna memoizzazione tra `sezioneAtleta` e `sezioneAllenatore` [app/(presenze)/storico-presenze/page.tsx] — deferred, caso raro, nessun impatto di correttezza
- [x] [Review][Dismiss] Deviazione dalla query Slot letterale del Task 3 (`include: { campo: {...}, gruppo: true }` vs `include: { gruppo: true }` implementato) — semplificazione corretta: Palestra/Campo non sono mai renderizzati nella tabella (Data/Giorno/Orario/Gruppo/Presenza), includerli avrebbe solo aggiunto una query superflua

## Dev Notes

- **Il prerequisito architetturale sopra è la parte più delicata di questa storia** — leggerlo per intero prima di scrivere la migrazione. Non improvvisare una policy diversa.
- **AC #4 (esclusione Genitore) è un vincolo di sicurezza, non solo di UI**: il gate sul Ruolo dentro la policy RLS (non solo nel route-guard) è ciò che impedisce a un Genitore-non-Atleta di leggere `presenze` di una figlia bypassando la UI — senza quel gate, `genitori_atlete` da solo non basterebbe a escluderlo (vedi Prerequisito).
- **Scelta "primo atletaId, non merge" per il ramo Atleta**: diversa deliberatamente dal precedente di `mio-orario` (Story 2.7, che unisce le liste di Slot di più agganci) — qui unire due cronologie di presenza distinte confonderebbe l'identità di chi era presente/assente, un errore di sostanza, non solo di ordinamento. Se in futuro emergesse un caso reale di doppio aggancio Atleta, va rivalutato esplicitamente (non riproposto il pattern merge di mio-orario senza pensarci).
- **Nessuna interazione con FR-10 (trend/percentuale)** in questa storia — Story 3.3, "Could", fuori perimetro v1 (PRD §6.2). Non anticipare un calcolo di percentuale/trend qui.
- **Pattern di riferimento più vicino**: `app/(orari-palestre)/mio-orario/page.tsx` (identità collassata, Story 2.6/2.7) e `app/(presenze)/presenze/page.tsx` (selettore Allenatore via `searchParams`, join `GruppoAtleta`+`elencaAtlete`, Story 3.1) — questa storia è in larga parte una ricombinazione di pattern già stabiliti, non nuovi (a parte la policy RLS ATLETA).

### Project Structure Notes

- Nuovo file: `app/(presenze)/storico-presenze/page.tsx` (stesso modulo `(presenze)` di Story 3.1 — sola lettura, non introduce una nuova proprietà di mutazione).
- File nuovi: `prisma/migrations/<timestamp>_presenze_atleta_select/migration.sql`. File modificati: `lib/db-rls/presenza.ts` (+ `leggiStoricoPresenzePerAtleta`), `lib/db-rls/presenza.test.ts`, `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2: Storico presenze per Atleta] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-9] — "Allenatore e Atleta possono consultare lo storico presenze della singola Atleta."
- [Source: prisma/migrations/20260717210000_presenze_scope_atleta_gruppo/migration.sql] — pattern `SECURITY DEFINER` di riferimento (Story 3.1 review fix), da riusare identico per l'Atleta.
- [Source: app/(orari-palestre)/mio-orario/page.tsx] — pattern di identità collassata e precedente "merge" (deliberatamente non riusato qui, vedi Dev Notes).
- [Source: app/(presenze)/presenze/page.tsx, app/(presenze)/presenze/actions.ts] — pattern di riferimento per il selettore Allenatore e il join Slot/Gruppo/Palestra.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Falso allarme nello script di verifica (non un bug applicativo)**: il primo run mostrava lo storico dell'Allenatore corretto ma poi, dopo il login come Atleta, sembrava restituire ancora la sessione dell'Allenatore (`haSelettore=true` inatteso). Causa reale: i Codici Fiscali fittizi generati per lo script avevano 17 caratteri invece di 16 (`isCodiceFiscaleValido` li rifiutava silenziosamente), quindi le registrazioni Atleta/Genitore fallivano senza creare l'utente, il login successivo falliva con "Credenziali non valide", e la sessione restava quella dell'Allenatore precedente. Risolto correggendo la lunghezza dei CF di test — nessuna modifica al codice applicativo necessaria.
- **Robustezza dello script di verifica**: un primo run era stato interrotto da un fallimento di setup, lasciando dati di test residui che hanno fatto collidere l'unique constraint su `codiceFiscale` al run successivo. Risolto con una pulizia per pattern (nome/CF/email, non per id memorizzati) eseguita sia prima del setup sia nel blocco finale — resiliente a run interrotti in qualsiasi punto.
- Confermata via verifica dal vivo (incluso un controllo diretto via REST, non solo route-guard) l'assenza di accesso RLS per un Genitore non-Atleta: il gate esplicito sul Ruolo dentro `atleta_propria_select` (non solo la relazione `genitori_atlete`) è ciò che rende AC #4 un vincolo di sicurezza reale, non solo di UI — coerente con quanto anticipato nei Prerequisiti architetturali.
- **Vulnerabilità di sicurezza individuata in code review (Blind Hunter, non anticipata nel Prerequisito architetturale della storia)**: il Prerequisito aveva ragionato correttamente sul gate del Ruolo per escludere un Genitore-senza-Ruolo-Atleta (AC #4), ma non aveva considerato la direzione opposta — un Utente con **entrambi** i Ruoli Atleta e Genitore (caso esplicitamente supportato dalla registrazione fin da Story 2.7, con tanto di test dedicato "hooks up both Atleta (self) and Genitore (child) independently") soddisfa comunque `(ruoli) ? 'ATLETA'`, e la funzione `atleta_possiede_presenza` non distingueva QUALE riga `genitori_atlete` fosse l'aggancio a se stessa. Un simile Utente poteva quindi leggere lo storico presenze di una figlia — violazione reale di AC #3, non solo teorica (il test esistente dimostra che lo scenario è realmente raggiungibile con la UI di registrazione attuale). Risolto aggiungendo `GenitoreAtleta.autoAggancio` (Boolean, default false, valorizzato `true` solo dal blocco di auto-aggancio Atleta in `registrati/actions.ts`) e richiedendolo esplicitamente nella funzione RLS. Riverificato dal vivo con uno scenario end-to-end dedicato: registrazione doppio-ruolo, verifica DB (`autoAggancio` corretto su entrambe le righe), verifica REST diretta (lettura negata per la figlia, concessa per sé), verifica UI (`/storico-presenze` mostra solo il proprio storico). Nessuna regressione: tutti i 270 test + i 29 test di `registrati/actions.test.ts` restano verdi.
- **Correzione minore insieme al fix di sicurezza**: `leggiStoricoPresenzePerAtleta` ordinava solo per `data`, non deterministico per righe con la stessa data (due Slot diversi nello stesso giorno) — aggiunto un secondo `.order("id", { ascending: true })` come spareggio (Edge Case Hunter).

### Completion Notes List

- Tutti i 5 Task completati con TDD (RED confermato prima di ogni implementazione: `lib/db-rls/presenza.ts`, route-guard).
- Suite completa verde: `npx vitest run` (270 test, 28 file), `npx tsc --noEmit` (nessun errore), `npm run lint` (pulito), `npm run build` (produzione, `/storico-presenze` generata come route dinamica).
- Verifica dal vivo eseguita con successo su tutti gli scenari (AC #1-#4: storico Allenatore con selettore, storico Atleta automatico, rifiuto Atleta estranea, esclusione Genitore sia via route-guard sia via RLS diretta). Dati di test rimossi interamente al termine (Palestra/Campo/Gruppi/Slot/Atlete/Allenatore/Presenze di test, utenti Supabase Auth).
- **Code review (Blind Hunter): individuata e risolta una vulnerabilità di sicurezza reale** — la policy RLS `atleta_propria_select` non distingueva un aggancio "a se stessa" (Story 2.7) da un aggancio Genitore↔figlia, concedendo a un Utente con doppio Ruolo Atleta+Genitore (caso già esplicitamente supportato e testato nella registrazione) accesso in lettura allo storico presenze di una figlia — violazione reale di AC #3. Risolto con una nuova colonna `GenitoreAtleta.autoAggancio`, valorizzata solo per l'aggancio a se stessa e richiesta dalla funzione RLS. Riverificato dal vivo con uno scenario doppio-ruolo end-to-end (DB, REST diretto, UI) — vedi Review Findings e Debug Log per il dettaglio.
- 2 patch aggiuntive applicate (ordinamento deterministico per date uguali), 4 findings differiti (nessuno bloccante), 1 scartato come falso positivo (semplificazione corretta della query Slot).
- Nessuna deviazione dal design descritto nel Prerequisito architetturale della storia, ad eccezione del fix di sicurezza sopra (non anticipato in fase di creazione della storia, scoperto in code review).

### File List

- `prisma/schema.prisma` (modificato: + `GenitoreAtleta.autoAggancio`, review fix)
- `prisma/migrations/20260718000000_presenze_atleta_select/migration.sql` (nuovo)
- `prisma/migrations/20260718010000_genitori_atlete_auto_aggancio/migration.sql` (nuovo, review fix — vulnerabilità di sicurezza)
- `lib/db-rls/presenza.ts` (modificato: + `leggiStoricoPresenzePerAtleta`, esteso in review fix)
- `lib/db-rls/presenza.test.ts` (modificato, esteso in review fix)
- `lib/auth/route-guard.ts` (modificato)
- `lib/auth/route-guard.test.ts` (modificato)
- `app/(presenze)/storico-presenze/page.tsx` (nuovo, esteso in review fix)
- `app/(onboarding-import)/registrati/actions.ts` (modificato in review fix — `autoAggancio: true` sull'aggancio a se stessa)
- `app/(onboarding-import)/registrati/actions.test.ts` (modificato in review fix)
