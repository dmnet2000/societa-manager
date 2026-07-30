---
baseline_commit: fecd9bc52897ecbad5e9fdc32e91dd05392dcdf1
---

# Story 9.15: Assegnazione Atlete al proprio Gruppo da parte dell'Allenatore

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore assegnato a un Gruppo,
I want poter caricare in autonomia le Atlete sul mio Gruppo, senza passare da un Admin/Dirigente,
so that non devo aspettare l'intervento di qualcun altro per completare la composizione della mia squadra.

**Note aggiuntive:** oggi `assegnaAtleta`/`rimuoviAtleta` (`app/(gruppi-allenatori)/gruppi/actions.ts`, Story 2.4/9.14) richiedono `requireRuolo(["ADMIN", "DIRIGENTE"])` — un Allenatore non può assegnare/rimuovere Atlete, nemmeno sul proprio Gruppo. `/gruppi` (la pagina di gestione completa) resta **ADMIN/DIRIGENTE-only** — non va aperta all'Allenatore (mostrerebbe tutti i Gruppi, la gestione Allenatori, la creazione Gruppi: fuori scope, e incoerente con l'accesso ampio riservato oggi a quella pagina). Serve invece una **nuova pagina self-service**, stesso principio già seguito per `/mio-orario`, `/presenze`, `/il-mio-profilo`, `/dati-fisici` (pagine Allenatore separate dalle equivalenti Admin).

**Decisione presa con l'utente in fase di creazione storia — vincolo RLS critico**: oggi un Allenatore può vedere (`elencaAtlete(supabase)`) **solo le Atlete già nel proprio Gruppo** (policy `allenatore_proprie_atlete_select`, Story 3.1, funzione `allenatore_possiede_atleta`) — non vede affatto le Atlete non ancora assegnate o quelle di un altro Gruppo/Allenatore. Per poter "caricare in autonomia" serve una **nuova policy RLS** che gli dia visibilità su un pool di Atlete assegnabili. **Chiesto esplicitamente all'utente**: visibilità ristretta alle sole Atlete non ancora assegnate, o visibilità ampia (tutte le Atlete, come oggi Admin/Dirigente)? **Risposta: visibilità ampia** — un Allenatore vede tutte le Atlete, esattamente come Admin/Dirigente oggi. Conseguenza esplicitamente accettata: dato che `assegnaAtleta` fa un `upsert` che *sposta* un'Atleta da un Gruppo a un altro (AC #2 di Story 2.4), questa storia permette di fatto anche una **riassegnazione self-service tra Gruppi diversi**, non solo l'assegnazione di Atlete "libere" — un Allenatore può quindi spostare un'Atleta dal Gruppo di un altro Allenatore al proprio. Scelta esplicita, non un effetto collaterale non voluto — stesso schema di conferma già usato in Story 9.12 ("accesso ampio di qualunque Allenatore a tutte le foto delle Atlete", confermato esplicitamente come voluto).

## Acceptance Criteria

1. **Given** un Allenatore assegnato a un Gruppo (tramite `GruppoAllenatore`) **When** assegna un'Atleta a quel Gruppo dalla nuova pagina self-service **Then** l'assegnazione viene salvata, stessa validazione già esistente in `assegnaAtleta` (Story 2.4)
2. **Given** un Allenatore che non gestisce un dato Gruppo **When** tenta (manomettendo il form/URL) di assegnargli un'Atleta **Then** l'operazione viene rifiutata (`FORBIDDEN`)
3. **Given** un Admin o Dirigente **When** assegna un'Atleta a un Gruppo (da `/gruppi`, comportamento esistente) **Then** può farlo per qualunque Gruppo, non solo quelli gestiti da un Allenatore specifico — comportamento invariato
4. **Given** un Allenatore **When** visita la nuova pagina self-service **Then** vede solo i Gruppi che gestisce (tramite `GruppoAllenatore`), con il roster attuale e la possibilità di assegnare/rimuovere Atlete — non l'intera pagina `/gruppi` (niente creazione Gruppi, niente assegnazione Allenatori)
5. **And** nessuna regressione sul comportamento esistente di assegnazione/rimozione Atleta da `/gruppi` (Story 2.4/9.14) — suite Vitest invariata

## Tasks / Subtasks

- [x] Task 1: Nuova policy RLS — Allenatore vede tutte le Atlete (AC: #1, #4)
  - [x] Nuova migrazione scritta a mano `prisma/migrations/20260730010000_allenatore_tutte_atlete_select/migration.sql`: nuova policy `CREATE POLICY "allenatore_tutte_atlete_select" ON "atlete" FOR SELECT USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE')` — stesso identico pattern di `admin_dirigente_segreteria_select` (`prisma/migrations/20260716080000_atlete_restrict_delete/migration.sql`), nessuna funzione `SECURITY DEFINER` necessaria (nessuno scoping richiesto, l'utente ha scelto visibilità ampia)
  - [x] **Non rimuovere** la policy esistente `allenatore_proprie_atlete_select` (Story 3.1, `allenatore_possiede_atleta`) — diventa ridondante (la nuova policy la copre già, le policy dello stesso comando si combinano in OR) ma lasciarla non causa conflitti, rimuoverla non è necessario per questa storia
  - [x] `Atleta` non ha una colonna di stagione propria (nessun `annoAgonisticoId` diretto, confermato in `prisma/schema.prisma`) — "tutte le Atlete" qui significa letteralmente tutte le righe della tabella, stessa esatta ampiezza già usata dalla policy Admin/Dirigente/Segreteria esistente, **non** un nuovo filtro di stagione da inventare
  - [x] `npx prisma migrate deploy` non eseguibile in questa sessione se non c'è un'istanza Supabase locale disponibile (stesso limite già incontrato nelle storie precedenti) — `npx prisma validate` come verifica minima (eseguito: schema valido)
- [x] Task 2: Estendere `assegnaAtleta`/`rimuoviAtleta` con autorizzazione a due livelli (AC: #1, #2, #3)
  - [x] `app/(gruppi-allenatori)/gruppi/actions.ts`: `requireRuolo(["ADMIN", "DIRIGENTE"])` → `requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"])` in **entrambe** `assegnaAtleta` e `rimuoviAtleta`
  - [x] Nuovo helper privato del modulo (`risolviPossessoGruppo(gruppoId): Promise<{ ok: true } | { ok: false; error }>`) — **non importato** `risolviAutorizzazioneGruppo` da `app/(partite-campionati)/autorizzazione.ts`: quell'helper appartiene al modulo Epic 10 (Campionato/Partita), mentre Gruppo/GruppoAtleta/GruppoAllenatore sono di proprietà di `(gruppi-allenatori)` (AD-2) — stessa logica (Admin/Dirigente ampio, Allenatore verificato via `GruppoAllenatore.findUnique` sulla chiave composita già esistente), scritta localmente in questo modulo
  - [x] A differenza di `risolviAutorizzazioneGruppo` (Epic 10), **non verifica** che il Gruppo appartenga alla stagione corrente: `assegnaAtleta`/`rimuoviAtleta` già risolvono/validano il Gruppo (per recuperare `annoAgonisticoId` per la chiave composita `GruppoAtleta`) — il controllo di possesso è aggiunto **dopo** quella risoluzione esistente, non duplicata
  - [x] Messaggio di rifiuto: `{ code: "FORBIDDEN", message: "Non gestisci questo Gruppo." }` — stesso testo già usato in Story 10.1
  - [x] `creaGruppo`/`assegnaAllenatore` **non toccati** — restano `ADMIN`/`DIRIGENTE` come oggi, fuori scope di questa storia
- [x] Task 3: Nuova pagina self-service `/i-miei-gruppi` (AC: #1, #4)
  - [x] Nuova rotta protetta in `lib/auth/route-guard.ts`: `{ prefix: "/i-miei-gruppi", ruoliAmmessi: ["ALLENATORE"], navLabel: "I miei Gruppi" }` — solo Allenatore (Admin/Dirigente hanno già `/gruppi` per la gestione completa, non serve una seconda rotta per loro)
  - [x] Nuovo `app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` (Server Component, `force-dynamic` per lo stesso motivo di `/gruppi`) — risolve l'Allenatore dalla sessione (stesso pattern di `dati-fisici/page.tsx`/`presenze/page.tsx`), poi i propri Gruppi della stagione corrente, poi TUTTE le Atlete (`elencaAtlete(supabase)`, ora visibili grazie alla nuova policy Task 1) per popolare il `<select>` di assegnazione, escludendo per ciascun Gruppo le Atlete già assegnate a **quel** Gruppo (stesso calcolo `disponibili` già usato in `campionati/page.tsx` per i Campionati collegabili)
  - [x] Nessun Allenatore agganciato → stesso messaggio di errore già usato altrove ("Il tuo account non è ancora collegato a un profilo Allenatore. Contatta la segreteria.")
  - [x] Riusato **invariato** `AtletaAssegnata.tsx` (Story 9.14, già agnostico rispetto al Ruolo del chiamante — chiama semplicemente `rimuoviAtleta`) per il pulsante di rimozione per Atleta
  - [x] Nuovo componente `MioGruppoCard.tsx` per il form di assegnazione (card invece che riga di tabella) — stesso `useActionState(assegnaAtleta, undefined)`, stesso reset del form al successo
  - [x] Nuovo `app/(gruppi-allenatori)/i-miei-gruppi/i-miei-gruppi.module.css` — CSS module autonomo, stessi design token/pattern (`.errore`, `.bottone`) di `gruppi.module.css`, nuove regole solo per il layout a card
- [x] Task 4: Test (AC: #1, #2, #3)
  - [x] `app/(gruppi-allenatori)/gruppi/actions.test.ts`: nuovi test per `assegnaAtleta`/`rimuoviAtleta` con Ruolo ALLENATORE — Allenatore che gestisce il Gruppo (successo), Allenatore che non lo gestisce (`FORBIDDEN`, nessuna scrittura), Allenatore senza profilo agganciato (`FORBIDDEN`). Test esistenti (ADMIN/DIRIGENTE, entrambe le azioni) aggiornati per il nuovo `requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"])` e continuano a passare (33/33)
  - [x] Nessun test di rendering per la nuova pagina/componenti, coerente con la convenzione già stabilita nel progetto
- [x] Task 5: Test e regressione (AC: #5)
  - [x] Suite Vitest completa: 713/713 test passati (63 file), nessuna regressione
  - [x] `npx tsc --noEmit` pulito; ESLint pulito sui file nuovi/modificati di questa storia (gli unici 3 problemi rilevati sono pre-esistenti in `wizard-nuova-stagione`, file non toccato da questa storia)
  - [x] Verifica manuale dal vivo: non eseguibile in questa sessione (rotta protetta, nessuna istanza Supabase locale disponibile) — stesso limite già incontrato nelle storie precedenti (es. Story 9.13), coperta qui dalla suite Vitest sopra; da confermare con l'utente dopo il deploy che un Allenatore vede tutte le Atlete nella nuova pagina, può assegnarne una al proprio Gruppo, non può agire su un Gruppo che non gestisce

### Review Findings

- [x] [Review][Patch] `risolviPossessoGruppo` non verifica la stagione del Gruppo — un Allenatore mantiene per sempre il possesso di un Gruppo di una stagione passata (le righe `GruppoAllenatore` non vengono mai ripulite al cambio stagione) e potrebbe riscrivere `GruppoAtleta` di una stagione chiusa tramite un `gruppoId` manomesso — **fix**: `risolviPossessoGruppo` ora riceve anche l'`annoAgonisticoId` del Gruppo (gia' risolto dal chiamante) e lo confronta con `trovaAnnoAgonisticoCorrente()`, solo per il ramo Allenatore. 2 nuovi test (stagione passata → FORBIDDEN, per entrambe le azioni). [app/(gruppi-allenatori)/gruppi/actions.ts]
- [x] [Review][Patch] `revalidatePath` non copre `/i-miei-gruppi` — dopo un'assegnazione/rimozione riuscita da quella pagina, la UI dell'Allenatore resta con dati non aggiornati (Next.js 16 non rinfresca automaticamente la route chiamante senza un `revalidatePath`/`refresh()` esplicito, verificato in `node_modules/next/dist/docs`) — **fix**: aggiunto `revalidatePath("/i-miei-gruppi")` accanto a `revalidatePath("/gruppi")` in entrambe `assegnaAtleta`/`rimuoviAtleta`. [app/(gruppi-allenatori)/gruppi/actions.ts]
- [x] [Review][Patch] Ramo `catch`/`INTERNAL` di `risolviPossessoGruppo` privo di test — nessuno dei 6 nuovi test fa fallire `prisma.allenatore.findFirst`/`prisma.gruppoAllenatore.findUnique` — **fix**: 2 nuovi test (uno per azione) che fanno rigettare `allenatoreFindFirstMock` e verificano l'errore `INTERNAL`. [app/(gruppi-allenatori)/gruppi/actions.ts]
- [x] [Review][Patch] Form di assegnazione in `MioGruppoCard.tsx` privo di conferma prima dell'invio, a differenza del pulsante di rimozione (`AtletaAssegnata.tsx`) che usa `window.confirm` — rischio di spostare per errore un'Atleta da un altro Gruppo/Allenatore senza alcun avviso — **fix**: aggiunto `onSubmit` con `window.confirm` (stesso pattern di `AtletaAssegnata.tsx`), mostra il nome dell'Atleta selezionata e il Gruppo di destinazione. [app/(gruppi-allenatori)/i-miei-gruppi/MioGruppoCard.tsx]
- [x] [Review][Defer] Doppia chiamata a `supabase.auth.getUser()` per invocazione (`requireRuolo` + `risolviPossessoGruppo`) — stesso pattern già presente e accettato in `app/(partite-campionati)/campionati/actions.ts` (Epic 10), non specifico di questa storia — deferred, pre-existing [app/(gruppi-allenatori)/gruppi/actions.ts:34-50]
- [x] [Review][Defer] Enumerazione minima: un Allenatore può distinguere "Gruppo inesistente" (VALIDATION) da "Gruppo non tuo" (FORBIDDEN) in base all'ordine dei controlli — rischio basso (id UUID non enumerabili, utenti già autenticati, dato non sensibile) — deferred, pre-existing pattern di validazione dell'app [app/(gruppi-allenatori)/gruppi/actions.ts:202-211]
- [x] [Review][Defer] Selettore Atlete in `MioGruppoCard.tsx` senza ricerca/filtro né indicazione di quali siano già assegnate altrove — usabilità peggiorata su un elenco fino a ~200 righe, richiederebbe una feature di ricerca non specificata negli AC — deferred, miglioramento UX fuori scope [app/(gruppi-allenatori)/i-miei-gruppi/page.tsx:88-92]
- [x] [Review][Defer] `elencaAtlete(supabase)` eseguita incondizionatamente anche quando l'Allenatore non gestisce alcun Gruppo (a differenza della query `gruppoAtleteRows`, correttamente gated) — inefficienza minima su una tabella di ~200 righe — deferred, pre-existing
- [x] [Review][Defer] `prisma.allenatore.findFirst` assume un solo Allenatore per Utente, senza asserzione esplicita — stesso identico pattern già usato in `presenze/page.tsx`, `campionati/page.tsx`, `dati-fisici/page.tsx` — deferred, pre-existing convention dell'app [app/(gruppi-allenatori)/i-miei-gruppi/page.tsx:27-31]
- [x] [Review][Defer] Nessun `try/catch` attorno alle letture in `Promise.all` di `page.tsx` — stesso identico pattern non-guardato già usato in `presenze/page.tsx` per le letture GET — deferred, pre-existing convention dell'app [app/(gruppi-allenatori)/i-miei-gruppi/page.tsx:63-74]

## Dev Notes

- **Perché una nuova pagina e non l'apertura di `/gruppi` all'Allenatore**: `/gruppi` mostra oggi TUTTI i Gruppi (accesso ampio Admin/Dirigente) più la creazione Gruppi e l'assegnazione Allenatori — aprirla all'Allenatore richiederebbe un rendering condizionale complesso per nascondergli tutto tranne il proprio Gruppo e la sola sezione Atlete. Il progetto ha già un pattern consolidato per questo esatto problema: pagine self-service separate (`/mio-orario` vs `/orari`, `/presenze` vs la gestione Slot, `/il-mio-profilo`, `/dati-fisici`) invece di condizionare pesantemente un'unica pagina Admin. Segui lo stesso pattern.
- **Perché l'helper di autorizzazione non va condiviso con Epic 10**: `risolviAutorizzazioneGruppo` (`app/(partite-campionati)/autorizzazione.ts`, Story 10.2) ha la stessa *forma* logica (Admin/Dirigente ampio, Allenatore verificato via `GruppoAllenatore`) ma appartiene al modulo `(partite-campionati)` (Campionato/Partita, AD-2). Gruppo/GruppoAtleta/GruppoAllenatore sono di proprietà di `(gruppi-allenatori)` — un helper di autorizzazione per QUESTO modulo va scritto localmente qui, non importato da un altro modulo (romperebbe il confine AD-2, anche se la logica sembra duplicata). Duplicazione minima accettabile, stesso principio già visto altrove nel progetto (es. `RigaScartata` ridefinita in `lib/importa-gare/parser.ts` invece di importata da `import-atlete/parser.ts`, Story 10.2).
- **Visibilità ampia delle Atlete per l'Allenatore — decisione esplicita, non un bug**: con la nuova policy RLS, un Allenatore vede (e può assegnare/riassegnare) qualunque Atleta, anche quelle già in un Gruppo gestito da un altro Allenatore. Questo è stato chiesto esplicitamente all'utente e confermato — non "restringere per errore" questa visibilità in fase di sviluppo pensando sia un oversight.
- **`GruppoAllenatore` esiste già** (Story 2.3, `@@unique([gruppoId, allenatoreId])`) — il controllo "l'Allenatore gestisce questo Gruppo" è un `findUnique` su quella chiave composita già presente, nessuna nuova tabella/colonna.
- **File NON da toccare**: `app/(gruppi-allenatori)/gruppi/page.tsx`, `GruppoRow.tsx`, `NuovoGruppoForm.tsx` (la pagina Admin/Dirigente resta esattamente com'è), `creaGruppo`/`assegnaAllenatore` in `actions.ts`.

### Project Structure Notes

- File nuovi: `prisma/migrations/<timestamp>_allenatore_tutte_atlete_select/migration.sql`, `app/(gruppi-allenatori)/i-miei-gruppi/page.tsx`, `app/(gruppi-allenatori)/i-miei-gruppi/i-miei-gruppi.module.css`, un nuovo componente per il form di assegnazione (nome a scelta implementativa).
- File modificati: `lib/auth/route-guard.ts` (nuova voce `PROTECTED_ROUTES` per `/i-miei-gruppi`), `app/(gruppi-allenatori)/gruppi/actions.ts` (Ruolo esteso + nuovo helper di possesso in `assegnaAtleta`/`rimuoviAtleta`), `app/(gruppi-allenatori)/gruppi/actions.test.ts` (nuovi test).
- Riuso invariato: `AtletaAssegnata.tsx` (Story 9.14), `elencaAtlete` (`lib/db-rls/atleta.ts`).
- Nuovo modulo? No — resta dentro `(gruppi-allenatori)`, che possiede già Gruppo/GruppoAtleta/GruppoAllenatore (AD-2).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.15 — Acceptance Criteria]
- [Source: app/(gruppi-allenatori)/gruppi/actions.ts — assegnaAtleta/rimuoviAtleta da estendere]
- [Source: app/(partite-campionati)/autorizzazione.ts — risolviAutorizzazioneGruppo, stessa forma logica ma NON importabile (modulo diverso, AD-2)]
- [Source: prisma/migrations/20260716080000_atlete_restrict_delete/migration.sql — admin_dirigente_segreteria_select, pattern esatto da riusare per la nuova policy Allenatore]
- [Source: prisma/migrations/20260717200000_atlete_allenatore_select/migration.sql — policy Allenatore esistente (scoped), da NON rimuovere]
- [Source: app/(presenze)/presenze/page.tsx — pattern di risoluzione "i miei Gruppi/Slot" da riusare per "i miei Gruppi"]
- [Source: app/(partite-campionati)/campionati/page.tsx — pattern di calcolo "disponibili" (esclude gli già assegnati) da riusare per le Atlete]
- [Source: app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx — Story 9.14, riuso invariato, già agnostico rispetto al Ruolo del chiamante]
- [Source: _bmad-output/implementation-artifacts/9-14-rimozione-atleta-da-gruppo.md — Dev Agent Record, pattern di test/struttura più recente per questo stesso modulo]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno (nessuna sessione di debug oltre il normale ciclo test-implementazione — 33/33 test del modulo verdi al primo giro dopo aver allineato due assertion pre-esistenti sull'elenco Ruoli di `requireRuolo`).

### Completion Notes List

- Nuova policy RLS `allenatore_tutte_atlete_select` (SELECT-only, nessun `SECURITY DEFINER`) aggiunta senza rimuovere la policy scoped esistente (Story 3.1) — si combinano in OR. `npx prisma validate` eseguito con successo; `prisma migrate deploy` non eseguibile in questa sessione (nessuna istanza Supabase raggiungibile), da applicare in produzione insieme al deploy del codice (stessa lezione Story 11.1/11.2).
- Nuovo helper privato `risolviPossessoGruppo` in `app/(gruppi-allenatori)/gruppi/actions.ts` (non condiviso con `risolviAutorizzazioneGruppo` di `(partite-campionati)`, confine AD-2) — chiamato dopo la risoluzione esistente del Gruppo in `assegnaAtleta`/`rimuoviAtleta`, non la duplica.
- Nuova pagina self-service `/i-miei-gruppi` con card per Gruppo gestito (`MioGruppoCard.tsx`), riuso invariato di `AtletaAssegnata.tsx` e della Server Action `assegnaAtleta` esistente. `creaGruppo`/`assegnaAllenatore`/`/gruppi` non toccati.
- Test aggiornati: `app/(gruppi-allenatori)/gruppi/actions.test.ts` estende i mock (`@/lib/supabase/server`, `prisma.allenatore.findFirst`, `prisma.gruppoAllenatore.findUnique`) con un default a sessione ADMIN in `beforeEach` per non rompere i test pre-esistenti; 2 assertion pre-esistenti aggiornate al nuovo elenco Ruoli di `requireRuolo`; 6 nuovi test (3 per `assegnaAtleta`, 3 per `rimuoviAtleta`: Allenatore che gestisce il Gruppo/successo, Allenatore che non lo gestisce/`FORBIDDEN`, Allenatore senza profilo/`FORBIDDEN`).
- Suite completa: 713/713 test (63 file), `tsc --noEmit` pulito, ESLint pulito sui file di questa storia (i soli 3 problemi rilevati dal linter sono pre-esistenti in `wizard-nuova-stagione`, non toccato).
- Verifica manuale dal vivo rimandata al deploy (nessuna istanza Supabase locale disponibile in questa sessione), stesso limite già incontrato in Story 9.13.

### File List

**Nuovi:**

- `prisma/migrations/20260730010000_allenatore_tutte_atlete_select/migration.sql`
- `app/(gruppi-allenatori)/i-miei-gruppi/page.tsx`
- `app/(gruppi-allenatori)/i-miei-gruppi/MioGruppoCard.tsx`
- `app/(gruppi-allenatori)/i-miei-gruppi/i-miei-gruppi.module.css`

**Modificati:**

- `lib/auth/route-guard.ts`
- `app/(gruppi-allenatori)/gruppi/actions.ts`
- `app/(gruppi-allenatori)/gruppi/actions.test.ts`

## Change Log

- 2026-07-30: Implementata Story 9.15 — assegnazione Atlete al proprio Gruppo da parte dell'Allenatore. Nuova policy RLS `allenatore_tutte_atlete_select` (visibilità ampia, decisione esplicita con l'utente), nuovo helper locale `risolviPossessoGruppo` per l'autorizzazione a due livelli di `assegnaAtleta`/`rimuoviAtleta`, nuova pagina self-service `/i-miei-gruppi`. `/gruppi` (Admin/Dirigente) invariata. 713/713 test passati, 0 errori tsc/eslint. Status: review.
- 2026-07-30: Code review chiusa (Blind Hunter + Edge Case Hunter + Acceptance Auditor) — 0 decision-needed, 4 patch applicati (controllo stagione in `risolviPossessoGruppo` per bloccare il possesso stantio su Gruppi di stagioni passate; `revalidatePath("/i-miei-gruppi")` aggiunto accanto a `/gruppi`; test per il ramo `catch`/`INTERNAL`; conferma `window.confirm` sul form di assegnazione), 6 defer (pattern pre-esistenti nel resto del progetto), 2 scartati come rumore. 717/717 test passati, 0 errori tsc/eslint dopo i fix. Status: done.
