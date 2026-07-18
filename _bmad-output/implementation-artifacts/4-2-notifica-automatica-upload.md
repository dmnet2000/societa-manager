---
baseline_commit: NO_VCS
---

# Story 4.2: Notifica automatica upload

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore o Dirigente,
I want essere avvisato quando viene caricato un nuovo Certificato Medico per un'Atleta del mio Gruppo,
so that lo so subito, senza dover controllare manualmente.

## Acceptance Criteria

1. **Given** un Certificato Medico viene caricato con successo (Story 4.1, sia primo caricamento sia ri-caricamento) per un'Atleta, **when** l'upload si completa, **then** viene creata una notifica in-app che l'Allenatore del Gruppo di quell'Atleta e ogni Dirigente possono vedere.
2. Un Allenatore vede **solo** le notifiche relative alle proprie Atlete (Gruppi a cui è assegnato) — mai quelle di un Gruppo altrui, anche manomettendo l'URL/richiesta diretta (enforced da RLS, non da un controllo applicativo).
3. Un Dirigente vede **tutte** le notifiche (accesso ampio, coerente con AD-4 — un Dirigente non è scoped a un singolo Gruppo).
4. La creazione della notifica non deve mai far fallire o bloccare il caricamento del Certificato: l'upload (Story 4.1) resta l'operazione primaria, la notifica è un effetto collaterale non bloccante.
5. La notifica mostra almeno il nome dell'Atleta e la data/ora del caricamento.

## Prerequisiti architetturali di questa storia (da leggere prima di iniziare)

FR-12 introduce un concetto di dominio nuovo (nessuna tabella "notifiche" esiste ancora) — a differenza di FR-13 (Story 4.3, mail alla Segreteria via Resend, già anticipato dall'architettura in `lib/email/`), FR-12 **non è email**: il PRD distingue esplicitamente "l'allenatore e il dirigente vengono avvisati" (FR-12) da "la segreteria riceve una mail" (FR-13, UJ-1 completo). Nessuna infrastruttura di push/WebSocket esiste in questo progetto (l'unica menzione, nel memlog di architettura, è "possibile evoluzione futura a PWA con notifiche push" — esplicitamente deferred). L'unica implementazione coerente con l'architettura attuale è una **notifica persistita in DB + una pagina che la elenca**, stesso identico pattern minimale già usato per ogni altra vista di lista in questa codebase (`/presenze`, `/storico-presenze`, `/orari`): nessuna nav/badge/toast globale, perché nessuna nav condivisa esiste nell'app (`app/layout.tsx` è un guscio nudo, `app/page.tsx` non ha menu).

### 1. Nuovo modello `Notifica` — minimale, deliberatamente senza stato "letta"

Nessun AC di questa storia richiede di segnare una notifica come letta/non letta o di cancellarla — solo che esista e sia visibile a chi di dovere. Aggiungere quel concetto ora sarebbe premature (stesso principio già applicato in Story 4.1 per lo stato del Certificato, rimandato a Story 4.4 "quando servirà davvero"). Schema:

```prisma
model Notifica {
  id        String   @id @default(uuid())
  atletaId  String
  atleta    Atleta   @relation(fields: [atletaId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@map("notifiche")
}
```

Aggiungere `notifiche Notifica[]` alle relazioni di `Atleta`. Nessun campo "messaggio"/"tipo": un solo evento possibile oggi (upload certificato), il nome dell'Atleta e la data si ricavano a lettura via join applicativo (stesso pattern di `storico-presenze/page.tsx`, mai un `include` Prisma su una tabella RLS-protetta).

### 2. RLS: riuso totale delle funzioni `SECURITY DEFINER` già esistenti — nessuna nuova funzione

Due funzioni già esistono e coprono esattamente i due lati di questa storia, nessuna nuova `SECURITY DEFINER` necessaria:

- **INSERT** (chi crea la notifica, cioè il Genitore/Atleta che ha appena caricato il file): `utente_possiede_atleta(atleta_id_param)` — Story 4.1, `prisma/migrations/20260718020000_certificati_storage_e_rls/migration.sql`. La stessa sessione che ha appena superato la policy INSERT su `certificati_medici` può creare la propria notifica per la stessa Atleta.
- **SELECT** per l'Allenatore (scoped al proprio Gruppo): `allenatore_possiede_atleta(atleta_id_param)` — Story 3.1, `prisma/migrations/20260717200000_atlete_allenatore_select/migration.sql`. Verifica `gruppo_atlete -> gruppo_allenatori -> allenatori -> utenti`, esattamente la relazione Allenatore↔Gruppo↔Atleta richiesta da AC #2.
- **SELECT** per il Dirigente: nessuna funzione necessaria, solo il controllo Ruolo diretto sul JWT (accesso ampio, AC #3) — stesso pattern "ampio" già usato altrove per ADMIN/DIRIGENTE/SEGRETERIA (qui solo DIRIGENTE, perché AC #1/#3 nominano esplicitamente solo Allenatore e Dirigente — Admin/Segreteria restano fuori scope, nessun AC li menziona).

Migrazione (`prisma/migrations/<timestamp>_add_notifica/migration.sql`, in aggiunta allo schema Prisma):

```sql
CREATE TABLE "notifiche" (
    "id" TEXT NOT NULL,
    "atletaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifiche_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notifiche" ADD CONSTRAINT "notifiche_atletaId_fkey" FOREIGN KEY ("atletaId") REFERENCES "atlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifiche" ENABLE ROW LEVEL SECURITY;

-- GRANT esplicito richiesto (tabella nello schema "public", a differenza di
-- storage.objects - AD-9/Story 4.1 Prerequisito #1).
GRANT SELECT, INSERT ON "notifiche" TO authenticated;

CREATE POLICY "genitore_atleta_crea_notifica" ON "notifiche"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['GENITORE', 'ATLETA']
    AND utente_possiede_atleta("atletaId")
  );

CREATE POLICY "allenatore_proprie_notifiche_select" ON "notifiche"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_atleta("atletaId")
  );

CREATE POLICY "dirigente_notifiche_select" ON "notifiche"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
  );
```

Nessuna policy UPDATE/DELETE (nessun AC la richiede — stessa scelta già fatta per `certificati_medici`, Story 1.7/4.1).

### 3. Punto di innesto: dentro `caricaCertificato`, non un nuovo modulo

FR-12 è mappato dall'architettura sotto `app/(certificati-medici)/` insieme a FR-11 (Capability Map, ARCHITECTURE-SPINE.md) — stesso modulo di Story 4.1, nessun confine AD-2 da attraversare. La chiamata va **dopo** che `collegaFileCertificato` ha già avuto successo in `app/(certificati-medici)/certificato-medico/actions.ts` (`caricaCertificato`), avvolta nel suo **proprio** `try/catch` non bloccante — stesso identico pattern già stabilito in Story 4.1 per `rimuoviFileCertificato` (un fallimento logga e prosegue, non fa fallire l'azione: AC #4 di questa storia). Non toccare la logica di rimozione del vecchio file già presente.

## Tasks / Subtasks

- [x] Task 1: Migrazione — tabella `notifiche`, RLS, policy (AC: #1, #2, #3)
  - [x] `prisma/schema.prisma`: nuovo model `Notifica` (vedi Prerequisito #1), aggiungere `notifiche Notifica[]` alle relazioni di `Atleta`.
  - [x] Migrazione a mano con l'SQL esatto del Prerequisito #2 (`CREATE TABLE`, FK `ON DELETE CASCADE`, `ENABLE ROW LEVEL SECURITY`, `GRANT SELECT, INSERT TO authenticated`, le tre policy).
  - [x] Applicare con `prisma migrate deploy`, verificare `prisma migrate status` (nessun drift), poi `prisma generate`.
- [x] Task 2: `lib/db-rls/notifica.ts` (nuovo file) (AC: #1, #5)
  - [x] `creaNotifica(supabase: SupabaseClient, atletaId: string): Promise<void>` — insert con `id: randomUUID()` esplicito (nessun default Postgres per `id`, stesso motivo di ogni altra tabella di questo progetto — vedi commento in `lib/db-rls/certificato-medico.ts`), `atletaId`; `createdAt` NON nel payload (ha `DEFAULT CURRENT_TIMESTAMP` a livello Postgres, unico caso in questo schema con un default DB-side per una colonna diversa da un id). Propaga l'errore su fallimento (`throw new Error(error.message)`).
  - [x] `elencaNotifiche(supabase: SupabaseClient): Promise<{ id: string; atletaId: string; createdAt: string }[]>` — `select("*")` da `notifiche`, `.order("createdAt", { ascending: false })`. RLS decide cosa e' visibile, nessun filtro applicativo aggiuntivo (stesso principio di `elencaAtlete`).
  - [x] Test TDD per entrambe (mock del client Supabase, verifica argomenti passati, propagazione errori).
- [x] Task 3: Hook non bloccante in `caricaCertificato` (AC: #1, #4)
  - [x] In `app/(certificati-medici)/certificato-medico/actions.ts`, dopo che `collegaFileCertificato` ha avuto successo (sia primo caricamento sia ri-caricamento — nessuna distinzione, vedi Prerequisito #3): chiamare `creaNotifica(supabase, atletaId)` in un try/catch separato, non bloccante (log dell'errore, l'azione ritorna comunque `{ success: true }`) — stesso pattern già usato per `rimuoviFileCertificato`.
  - [x] Aggiornare `actions.test.ts`: verifica che `creaNotifica` sia chiamata con `(supabase, atletaId)` dopo un upload riuscito; verifica che un fallimento di `creaNotifica` non cambi l'esito dell'azione (`{ success: true }` comunque).
- [x] Task 4: UI `app/(certificati-medici)/notifiche/page.tsx` (nuovo file) (AC: #1, #2, #3, #5)
  - [x] `export const dynamic = "force-dynamic"` (dati potenzialmente nuovi ad ogni visita, stesso motivo di `/presenze`, `/storico-presenze`).
  - [x] Nessun controllo di Ruolo esplicito nella pagina — la route-guard (sotto) è già il cancello, stesso pattern di ogni altra pagina di lista di questa codebase (mai un controllo duplicato).
  - [x] `elencaNotifiche(supabase)` per le righe, poi `elencaAtlete(supabase)` per risolvere `atletaId -> nome` (stesso pattern a due passaggi di `storico-presenze/page.tsx`: mai un `include`/join Prisma diretto su una tabella RLS-protetta). Righe la cui Atleta non è risolvibile (RLS-filtrata anche su `atlete`, caso limite) vengono scartate silenziosamente, non mostrate come errore — stesso pattern difensivo di `StoricoTable`. Nessuna nuova policy su `atlete` necessaria: DIRIGENTE ha già SELECT ampio (`admin_dirigente_segreteria_select`, Story 1.3) e ALLENATORE ha già SELECT scoped (`allenatore_proprie_atlete_select`, Story 3.1) — entrambi risolvono correttamente i nomi delle Atlete a cui hanno accesso via `elencaAtlete`.
  - [x] Lista (già ordinata per data decrescente da `elencaNotifiche`): un elemento per riga con nome Atleta + data/ora di caricamento (AC #5). Se vuota: "Nessuna notifica."
  - [x] `lib/auth/route-guard.ts`: aggiungere `{ prefix: "/notifiche", ruoliAmmessi: ["ALLENATORE", "DIRIGENTE"] }`.
- [x] Task 5: Test (Vitest)
  - [x] `lib/db-rls/notifica.test.ts`: `creaNotifica`/`elencaNotifiche`, come da Task 2.
  - [x] `app/(certificati-medici)/certificato-medico/actions.test.ts`: casi del Task 3.
  - [x] `lib/auth/route-guard.test.ts`: aggiungere test per `/notifiche` (allow ALLENATORE/DIRIGENTE, redirect per ATLETA/GENITORE/ADMIN/SEGRETERIA/altri).
  - [x] Nessun test per `notifiche/page.tsx` — stessa decisione deliberata già applicata a ogni altra pagina di questo progetto.
- [x] Task 6: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] AC #1/#5: come Genitore/Atleta, caricare un Certificato per un'Atleta assegnata a un Gruppo con un Allenatore noto; login come quell'Allenatore, verificare che `/notifiche` mostri la notifica con nome Atleta e data.
  - [x] AC #1: login come Dirigente (nessun Gruppo assegnato, accesso ampio), verificare che la stessa notifica sia visibile.
  - [x] AC #2 (negativo): login come un Allenatore di un Gruppo **diverso** (nessuna relazione con l'Atleta), verificare che la notifica NON compaia — sia via UI sia via query REST diretta (RLS, non solo filtro applicativo).
  - [x] AC #4: verificato via test Vitest (`caricaCertificato` ritorna comunque `{ success: true }` quando `creaNotifica` lancia un'eccezione) — non ripetuto dal vivo, stesso principio già applicato al resto della suite di questa storia.
  - [x] Verificare che un'Atleta non possa raggiungere `/notifiche` (route-guard, redirect a `/non-autorizzato` confermato dal vivo); Genitore/Admin/Segreteria coperti dagli stessi test unitari di `route-guard.test.ts` (stessa funzione pura `getRouteDecision`, nessuna logica aggiuntiva da verificare dal vivo per quei Ruoli).
  - [x] Ri-caricare un Certificato per la stessa Atleta (Story 4.1 AC #4) e verificare che venga creata una **seconda** notifica (nessuna deduplicazione, ogni upload riuscito genera un evento).

### Review Findings

Triage di 3 review adversarial paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) su `lib/db-rls/notifica.ts`/`.test.ts`, `app/(certificati-medici)/notifiche/page.tsx`, la migrazione `notifiche`, e le porzioni Story-4.2 di `actions.ts`/`route-guard.ts` (Story 4.1, condivisa negli stessi file, esplicitamente esclusa dal perimetro di questa review).

- [x] [Review][Patch] — **risolto**. `elencaNotifiche` usava `select("*")`, in contrasto con la convenzione di ogni altra funzione di lettura in `lib/db-rls/` (es. `elencaAtlete`: colonne esplicite) — un futuro campo aggiunto a `notifiche` verrebbe esposto al client senza una decisione consapevole in review. Cambiato in `select("id, atletaId, createdAt")` [lib/db-rls/notifica.ts]
- [x] [Review][Patch] — **risolto**. Nessun limite sulla lista: `notifiche` cresce senza limite per design (nessuna deduplicazione/stato "letta", scelta deliberata — vedi Dev Notes), e `elencaNotifiche` non aveva `.limit()`. Aggiunto `.limit(50)` — un tetto ragionevole per una lista di attività recenti, evita che la pagina rallenti indefinitamente [lib/db-rls/notifica.ts]
- [x] [Review][Dismiss] Nessun try/catch in `notifiche/page.tsx` attorno a `elencaNotifiche`/`elencaAtlete` — un fallimento produce un'eccezione non gestita invece di un fallback controllato. Falso bersaglio: è lo stesso identico gap sistemico trasversale a **tutta** l'app (nessun `error.tsx` esiste da nessuna parte), già documentato come tale nelle Review Findings di Story 4.1 ("gap sistemico... non introdotto da questa storia") — non introdotto qui, non è responsabilità di questa storia risolverlo isolatamente
- [x] [Review][Dismiss] ADMIN escluso da `/notifiche` (route-guard e policy RLS) mentre quasi ogni altra rotta/policy "ad accesso ampio" di questa codebase raggruppa ADMIN con DIRIGENTE. Scelta deliberata e già motivata esplicitamente nel Prerequisito architetturale #2 della storia: FR-12/AC #1/#3 nominano solo Allenatore e Dirigente come destinatari — nessun AC richiede visibilità Admin. Se una storia futura lo richiedesse, è un'estensione additiva della policy, non un difetto di questa
- [x] [Review][Dismiss] Nessuna deduplicazione/debounce sulla creazione della notifica (doppio upload rapido, o ri-caricamento correttivo, produce due righe permanenti e indistinguibili) — esplicitamente fuori scope, documentato in Dev Notes e nell'ultimo bullet del Task 6 ("nessuna deduplicazione, ogni upload riuscito genera un evento"): decisione consapevole, non un gap dimenticato
- [x] [Review][Dismiss] Nessun test per `notifiche/page.tsx` (join `elencaNotifiche`/`elencaAtlete`, filtro difensivo, formattazione data) — stessa politica di test deliberata e consolidata già applicata a **ogni** altra pagina di questo progetto (Vitest copre solo business logic in `lib/`/Server Action, mai `page.tsx`/Server Component) — non una lacuna introdotta qui
- [x] [Review][Dismiss] Il filtro che scarta silenziosamente una `Notifica` la cui Atleta non è risolvibile potrebbe nascondere un futuro disallineamento tra le policy RLS di `notifiche` e `atlete` — stesso identico pattern difensivo-ma-silenzioso già usato per `StoricoTable` (`storico-presenze/page.tsx`) su un caso strutturalmente garantito; nessuna funzione di logging esiste per casi analoghi altrove nella codebase (es. Slot orfano da una Presenza) — coerenza con lo stile esistente, non un gap specifico di questa storia
- [x] [Review][Dismiss] Il test del percorso non bloccante (`creaNotifica` che fallisce) non verifica che `console.error` sia stato chiamato — vero, ma il test gemello per lo stesso pattern nello stesso file (`rimuoviFileCertificato` che fallisce, Story 4.1) ha la stessa identica lacuna: non un gap introdotto da questa storia, coerenza con lo stile esistente del file
- [x] [Review][Dismiss] Il test di `creaNotifica` che verifica il rifiuto RLS si basa su un sottostringa del messaggio d'errore Postgres mockato (`"row-level security"`), un contratto debole che non distingue davvero un rifiuto RLS da un errore generico — stesso identico pattern usato in **ogni** test di questo tipo nell'intera codebase (es. `certificati.test.ts`, Story 4.1) — convenzione di test consolidata dell'intero progetto, non una scelta specifica di questa storia
- [x] [Review][Defer] Nessun indice esplicito su `notifiche.createdAt` per il carico di `ORDER BY` su una tabella che cresce senza limite — nessuna migrazione di questo progetto ha mai aggiunto un indice non-unique esplicito (verificato: `grep CREATE INDEX` su tutte le migrazioni, zero risultati oltre PK/unique), quindi aggiungerne uno qui sarebbe una deviazione isolata dalla convenzione del progetto, non richiesta da alcun AC — deferred, da rivalutare se/quando la tabella raggiungerà una scala reale (NFR PRD §8: nessuna preoccupazione di volume alla scala attuale di un singolo club)
- [x] [Review][Defer] Nessun campo che registri **chi** (Genitore vs Atleta stessa) ha innescato l'upload che ha generato la notifica — informazione non recuperabile retroattivamente se una storia futura volesse distinguerlo. Speculativo, nessun AC attuale lo richiede — se servirà, richiede una modifica di schema, da valutare quando quella storia verrà scritta
- [x] [Review][Defer] Nessun tie-break esplicito sull'ordinamento quando due notifiche condividono lo stesso `createdAt` al millisecondo (upload concorrenti) — impatto puramente cosmetico (ordine di visualizzazione, nessun rischio di sicurezza/correttezza dei dati) e un tiebreak su `id` (UUID casuale) non aggiungerebbe un ordine "corretto", solo uno deterministico ma arbitrario — non vale la churn per questo beneficio marginale, deferred come nota informativa

## Dev Notes

- **Nessuna interazione con Story 4.3** (mail alla Segreteria, FR-13): quella storia userà `lib/email/` (Resend), un canale completamente separato — non riusare/estendere `Notifica` per quello, sono due FR distinti con destinatari e canali diversi (vedi Prerequisito architetturale).
- **Nessun campo "letta"/stato**: deliberatamente fuori scope, nessun AC lo richiede — se una storia futura lo richiedesse, si aggiunge come estensione additiva (nuova colonna/tabella di lettura per-utente), non anticipare qui.
- **`Notifica` non ha un proprio Anno Agonistico (AD-8 non si applica)**: non è un concetto stagionale, è un log di eventi — nessun riferimento a `AnnoAgonistico` necessario.
- **Pattern di riferimento più vicino**: `prisma/migrations/20260718020000_certificati_storage_e_rls/migration.sql` (Story 4.1) per il riuso di `utente_possiede_atleta`; `prisma/migrations/20260717200000_atlete_allenatore_select/migration.sql` (Story 3.1) per `allenatore_possiede_atleta`; `app/(presenze)/storico-presenze/page.tsx` per il pattern "due letture RLS-safe + join applicativo in memoria, mai un `include` Prisma diretto su una tabella protetta"; `lib/storage/certificati.ts`/Story 4.1 per il pattern "operazione secondaria in un try/catch separato, non bloccante" già riusato identico qui per `creaNotifica`.
- **AD-10 rispettato**: questa storia non scrive mai sulle colonne identitarie di `Atleta`, solo una nuova tabella correlata via FK.

### Project Structure Notes

- Nuova route: `app/(certificati-medici)/notifiche/page.tsx` — stesso route-group di `certificato-medico` (entrambi sotto la Capability "Certificati Medici", FR-11..FR-16).
- Nuovo modulo: `lib/db-rls/notifica.ts` (+ `.test.ts`).
- File nuovi: `prisma/migrations/<timestamp>_add_notifica/migration.sql`. File modificati: `prisma/schema.prisma` (model `Notifica` + relazione su `Atleta`), `app/(certificati-medici)/certificato-medico/actions.ts` (+ chiamata a `creaNotifica`), `app/(certificati-medici)/certificato-medico/actions.test.ts`, `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2: Notifica automatica upload] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-12] — "Il sistema notifica automaticamente Allenatore e Dirigente del Gruppo quando un nuovo Certificato Medico viene caricato. Realizza UJ-1."
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#UJ-1] — distingue esplicitamente "l'allenatore e il dirigente vengono avvisati" (qui) da "la segreteria riceve una mail" (Story 4.3, FR-13) — due canali diversi, non lo stesso meccanismo.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-2, AD-4, AD-9, Capability Map] — modulo Certificati-Medici, RLS, split Prisma/Supabase client, nessuna infrastruttura push/nav esistente (Deferred: "possibile evoluzione a PWA con notifiche push").
- [Source: prisma/migrations/20260718020000_certificati_storage_e_rls/migration.sql] — `utente_possiede_atleta`, riusata per la policy INSERT.
- [Source: prisma/migrations/20260717200000_atlete_allenatore_select/migration.sql] — `allenatore_possiede_atleta`, riusata per la policy SELECT Allenatore.
- [Source: app/(certificati-medici)/certificato-medico/actions.ts, lib/storage/certificati.ts] — pattern non bloccante da riusare identico per `creaNotifica` (Story 4.1 review fix, `rimuoviFileCertificato`).
- [Source: app/(presenze)/storico-presenze/page.tsx] — pattern "due letture RLS-safe + join applicativo in memoria".

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

Nessun problema imprevisto — il modulo era completamente nuovo (nessuna tabella `notifiche` preesistente) ma tutte le funzioni `SECURITY DEFINER` necessarie (`utente_possiede_atleta`, `allenatore_possiede_atleta`) esistevano già da Story 3.1/4.1, riusate senza modifiche. Lo script di verifica dal vivo ha richiesto un setup più articolato del solito (2 Gruppi, 2 Allenatori precaricati, 1 Atleta, 1 Dirigente) per poter esercitare sia il caso positivo (AC #1/#3) sia quello negativo (AC #2) in un solo run — nessun problema riscontrato nell'esecuzione, solo più passaggi di setup rispetto alle storie precedenti.

### Completion Notes List

- Tutti i 6 Task completati con TDD (RED confermato prima di ogni implementazione: `lib/db-rls/notifica.ts`, hook in `caricaCertificato`, `route-guard.ts`).
- Suite completa verde: `npx vitest run` (313 test, 31 file), `npx tsc --noEmit` (nessun errore), `npm run lint` (pulito), `npm run build` (produzione, `/notifiche` generata come route dinamica).
- Verifica dal vivo eseguita con successo su tutti gli scenari (AC #1: notifica creata e visibile ad Allenatore/Dirigente; AC #2: Allenatore di un Gruppo diverso non vede nulla, confermato sia via UI sia via query REST diretta con la sua sessione; AC #3: Dirigente accesso ampio; AC #5: nome Atleta + data visibili; route-guard per `/notifiche`; nessuna deduplicazione su ri-caricamento). Dati di test (Atlete, Allenatori, Gruppi, Utenti Supabase Auth, Notifiche, Certificati, oggetti Storage) rimossi interamente al termine.
- Nessuna deviazione dal design descritto nei Prerequisiti architetturali della storia: nessuna nuova funzione `SECURITY DEFINER`, solo riuso di `utente_possiede_atleta` (Story 4.1) e `allenatore_possiede_atleta` (Story 3.1).
- Code review (3 subagent adversarial paralleli): 2 patch applicate con TDD (colonne esplicite invece di `select("*")`, limite di 50 righe su `elencaNotifiche`), 8 item dismissi con motivazione esplicita (per lo più conformità a pattern/decisioni già deliberate altrove in questa storia o nel resto della codebase), 3 item deferred in `deferred-work.md`. Suite re-verificata verde dopo le patch.

### File List

- `prisma/schema.prisma` (modificato: model `Notifica`, relazione `Atleta.notifiche`)
- `prisma/migrations/20260718050000_add_notifica/migration.sql` (nuovo)
- `lib/db-rls/notifica.ts` (nuovo)
- `lib/db-rls/notifica.test.ts` (nuovo)
- `app/(certificati-medici)/certificato-medico/actions.ts` (modificato: hook non bloccante a `creaNotifica`)
- `app/(certificati-medici)/certificato-medico/actions.test.ts` (modificato)
- `app/(certificati-medici)/notifiche/page.tsx` (nuovo)
- `lib/auth/route-guard.ts` (modificato)
- `lib/auth/route-guard.test.ts` (modificato)
