---
baseline_commit: NO_VCS
---

# Story 7.2: Configurazione logo applicazione

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin,
I want caricare/aggiornare il logo dell'applicazione,
so that l'app riflette l'identità visiva della società.

**Nota di scope (PRD §6.2)**: FR-32 è "Could — branding non bloccante per il lancio, rimandabile a v1.1". Eseguita comunque in sequenza con Story 7.1 per completare l'Epic 7 in un solo passaggio (nessuna dipendenza da questa storia per Story 4.3, a differenza di Story 7.1/FR-31).

## Acceptance Criteria

1. **Given** sono autenticato come Admin, **when** carico un'immagine come logo, **then** il file viene salvato in un bucket Storage pubblico e sostituisce l'eventuale logo precedente (un solo logo "corrente" per l'app, mai due file scollegati).
2. L'URL pubblico del logo è raggiungibile senza autenticazione (nessun URL firmato, a differenza di AD-6/Story 4.1 — il logo è per natura un asset da mostrare pubblicamente, non un dato sensibile, AD-12).
3. Solo l'Admin può caricare/sostituire il logo — nessun altro Ruolo, nemmeno Dirigente/Segreteria (RLS su `storage.objects`, non solo route-guard).
4. Il tipo file è limitato a PNG/JPEG e la dimensione massima a 2MB — stessa doppia difesa (bucket + controllo applicativo, incluse le magic byte del contenuto reale) già stabilita in Story 4.1.
5. Se nessun logo è mai stato caricato, la pagina non mostra un'immagine rotta — un messaggio indica che nessun logo è ancora impostato.

## Prerequisiti architetturali di questa storia (da leggere prima di iniziare)

Seconda e ultima storia dell'Epic 7 (correzione di rotta, vedi `sprint-change-proposal-2026-07-18.md`). Riusa `lib/storage/` (Story 4.1) come precedente più vicino, con una differenza strutturale importante: qui il bucket è **pubblico**, non privato.

### 1. Bucket Storage pubblico — nessuna riga DB necessaria

A differenza di `certificati-medici` (Story 4.1, privato, URL firmati) e di `configurazione_smtp` (Story 7.1, riga singola in una tabella), il logo non ha bisogno di alcuna tabella: un bucket **pubblico** con un **path fisso** (`"logo"`, nessuna cartella/nome originale) è sufficiente. Ogni caricamento fa `upload(..., { upsert: true, contentType: file.type })` sullo stesso path — sostituisce fisicamente il file precedente, non serve un riferimento DB a "quale file è il logo corrente" perché c'è sempre e solo un path possibile. L'URL pubblico si ottiene con `supabase.storage.from(bucket).getPublicUrl("logo")`, deterministico, mai da persistere.

`contentType` esplicito nell'upload è necessario: senza cartella/estensione nel path, il tipo servito dipende dal metadato salvato al momento dell'upload, non dal nome del file.

Migrazione:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('logo-applicazione', 'logo-applicazione', true, 2097152, ARRAY['image/png', 'image/jpeg']);

CREATE POLICY "admin_logo_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'logo-applicazione'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
  );

CREATE POLICY "admin_logo_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'logo-applicazione'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
  )
  WITH CHECK (
    bucket_id = 'logo-applicazione'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
  );
```

**[CORRETTO dopo la verifica dal vivo — vedi Debug Log References]** Un bucket `public = true` serve gli oggetti tramite l'endpoint pubblico di Supabase Storage (`/storage/v1/object/public/...`), che **bypassa RLS interamente per la lettura anonima** — è esattamente il meccanismo con cui AC #2 è soddisfatto. Questo però **non elimina il bisogno di una policy SELECT**: `caricaLogo()` usa `upsert: true` per sostituire il file esistente sullo stesso path fisso, e Supabase Storage, per decidere internamente se eseguire insert o update, esegue una verifica di esistenza sul path che richiede una policy SELECT per la sessione autenticata — senza di essa ogni upload falliva con un rifiuto RLS, anche il primissimo. Serve quindi comunque una policy SELECT ADMIN-only (oltre a INSERT/UPDATE), riservata al percorso di scrittura autenticato — l'endpoint di lettura pubblico anonimo resta comunque bypassato da RLS, invariato.

### 2. Verifica magic byte del contenuto (stesso pattern di Story 4.1, non una nuova invenzione)

`file.type` è un'attestazione del client — un file rinominato con MIME contraffatto supererebbe un controllo solo sull'attributo dichiarato. Riusare lo stesso principio (non necessariamente lo stesso codice — `contenutoCorrispondeAlMimeDichiarato` in `certificato-medico/actions.ts` non è esportata) con l'allowlist ristretta a PNG/JPEG (niente SVG: un SVG può contenere script eseguibile, rischio XSS diretto per un asset servito pubblicamente senza alcun controllo di accesso — niente PDF: non ha senso per un logo).

## Tasks / Subtasks

- [x] Task 1: Migrazione — bucket pubblico, policy RLS (AC: #1, #2, #3, #4)
  - [x] Migrazione a mano con l'SQL esatto del Prerequisito #1 (con l'aggiunta di `ON CONFLICT (id) DO NOTHING` sull'INSERT del bucket, lezione da Story 4.1 Review Findings — applicata proattivamente qui, non un fix successivo).
  - [x] Applicare con `prisma migrate deploy`, verificare `prisma migrate status` (nessun drift). Nessuna modifica a `schema.prisma` (nessuna nuova tabella).
- [x] Task 2: `lib/storage/logo.ts` (nuovo file) (AC: #1, #2, #5)
  - [x] `caricaLogo(supabase: SupabaseClient, file: File): Promise<void>` — `supabase.storage.from("logo-applicazione").upload("logo", file, { upsert: true, contentType: file.type })`. Propaga l'errore su fallimento (incluso un rifiuto RLS).
  - [x] `urlPubblicoLogo(supabase: SupabaseClient): string` — `supabase.storage.from("logo-applicazione").getPublicUrl("logo").data.publicUrl` (sincrono lato client Storage, nessuna chiamata di rete — genera sempre lo stesso URL deterministico).
  - [x] `esisteLogo(supabase: SupabaseClient): Promise<boolean>` — `supabase.storage.from("logo-applicazione").list("", { search: "logo" })`, verifica che l'elenco contenga un file chiamato `"logo"` (AC #5: mai un'immagine rotta se non è mai stato caricato nulla).
  - [x] Test TDD per tutte e tre (mock del client Supabase, verifica argomenti passati, propagazione errori).
- [x] Task 3: `app/(configurazione)/logo/actions.ts` (nuovo file) (AC: #1, #3, #4)
  - [x] `requireRuolo("ADMIN")` come primo passo.
  - [x] `caricaLogoAction(prevState, formData)`: legge `file` (`FormData.get("file")`, deve essere un'istanza `File` con `size > 0`). Validazioni: tipo MIME tra `image/png`/`image/jpeg` (server-side, mai solo l'attributo `accept` del client), dimensione oltre 2MB, magic byte del contenuto reale (Prerequisito #2 — stessa allowlist ristretta a PNG/JPEG). Poi `caricaLogo` dentro un try/catch → `INTERNAL` su qualunque fallimento (incluso un rifiuto RLS per un Ruolo non Admin — AC #3 è quindi garantito a livello di database, non da un controllo applicativo duplicato).
  - [x] `revalidatePath("/logo")` dopo il salvataggio riuscito.
- [x] Task 4: UI `app/(configurazione)/logo/page.tsx` + `LogoForm.tsx` (nuovi file) (AC: #1, #2, #4, #5)
  - [x] `export const dynamic = "force-dynamic"`.
  - [x] `esisteLogo(supabase)`: se `true`, mostra `<img src={urlPubblicoLogo(supabase)}>` (nessuna autenticazione richiesta per caricare l'immagine, AC #2); se `false`, un messaggio "Nessun logo impostato" (AC #5).
  - [x] Form di caricamento (`<input type="file" accept=".png,.jpg,.jpeg">` + submit), sempre presente.
  - [x] `lib/auth/route-guard.ts`: aggiungere `{ prefix: "/logo", ruoliAmmessi: ["ADMIN"] }` (il route group `(configurazione)` non compare nell'URL — stesso motivo del fix di Story 7.1, non ripetere quell'errore).
- [x] Task 5: Test (Vitest)
  - [x] `lib/storage/logo.test.ts`: `caricaLogo`/`urlPubblicoLogo`/`esisteLogo`, come da Task 2.
  - [x] `app/(configurazione)/logo/actions.test.ts`: `FORBIDDEN` per Ruoli diversi da Admin; `VALIDATION` per file mancante, tipo MIME non ammesso, dimensione eccessiva, magic byte non corrispondenti (messaggi distinti); successo; `INTERNAL` fail-closed su eccezione (incluso un rifiuto RLS simulato, AC #3).
  - [x] `lib/auth/route-guard.test.ts`: aggiungere test per `/logo` (allow ADMIN, redirect per ogni altro Ruolo).
  - [x] Nessun test per `logo/page.tsx` — stessa decisione deliberata già applicata a ogni altra pagina/form di questo progetto (vedi Story 7.1 Review Findings per la verifica esplicita che nessun form client ha un test dedicato).
- [x] Task 6: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] AC #1/#5: come Admin, verificato che `/logo` mostri "Nessun logo impostato" prima di qualunque caricamento; caricato un PNG di test; verificato via query diretta al bucket (client service-role) che il file esista al path `"logo"`.
  - [x] AC #2: verificato che l'URL pubblico sia raggiungibile con una richiesta anonima (nessuna sessione) e restituisca 200 con il `Content-Type` corretto (`image/png`, poi `image/jpeg` dopo la sostituzione).
  - [x] AC #1: ricaricato un secondo logo (JPEG) e verificato che sostituisca il precedente (stesso path, contenuto/Content-Type aggiornati, un solo file nel bucket) — non un secondo file.
  - [x] AC #3: verificato che un Dirigente non possa raggiungere `/logo` (route-guard) e che un tentativo di upload diretto via REST con la sua sessione venga rifiutato da RLS (e non modifichi il logo esistente).
  - [x] AC #4: verificato il rifiuto per un file con MIME dichiarato PNG ma contenuto senza le magic byte corrette, e per un file oltre 2MB — quest'ultimo controllo ha scoperto un problema serio, vedi Debug Log References.

### Review Findings

Triage di 3 review adversarial paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) su un diff scoperto da questa storia (i file condivisi con Story 7.1 — `route-guard.ts`/`.test.ts` — sono stati annotati per escludere le righe `/smtp`, già revisionate in quella storia).

- [x] [Review][Patch] — **risolto**. **[Edge Case Hunter]** Le policy RLS INSERT/UPDATE verificavano solo `bucket_id` + Ruolo ADMIN, senza restringere il `name` dell'oggetto — un Admin (via chiamata REST diretta, non l'app) poteva scrivere qualunque path nel bucket pubblico, non solo il path fisso `"logo"` su cui si basa l'intero design della storia. L'invariante "un solo path possibile" era garantito solo dall'applicazione (`caricaLogo()` usa sempre `"logo"`), non dal database — incoerente col principio "RLS è l'autorità, non un controllo duplicato" già stabilito per `certificati_medici`/`notifiche`. Nuova migrazione che sostituisce le due policy con una versione che aggiunge `AND name = 'logo'`; verificato dal vivo che un Admin non possa più scrivere su un path diverso [prisma/migrations/20260718090000_logo_bucket_restrict_path/migration.sql]
- [x] [Review][Patch] — **risolto**. **[Blind Hunter + Acceptance Auditor, trovato indipendentemente da entrambi]** La verifica delle magic byte per PNG controllava solo i primi 4 byte (`[0x89, 0x50, 0x4e, 0x47]`), mentre il precedente che dichiara esplicitamente di seguire (`contenutoCorrispondeAlMimeDichiarato`, Story 4.1) usa la firma PNG completa a 8 byte — un file con solo il prefisso corretto superava la verifica. Estesa alla firma completa `[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]`, aggiunto un test dedicato che dimostra il gap (RED confermato prima del fix) [app/(configurazione)/logo/actions.ts]
- [x] [Review][Patch] — **risolto**. **[Blind Hunter + Edge Case Hunter, trovato indipendentemente da entrambi]** Nessun cache-busting sull'URL pubblico del logo: `urlPubblicoLogo()` è deterministico (sempre lo stesso URL per il path fisso), quindi dopo una sostituzione un browser con l'immagine già in cache avrebbe continuato a mostrare la versione precedente — `revalidatePath` invalida solo la cache RSC di Next.js, non le richieste dirette del browser verso l'endpoint pubblico di Supabase Storage. Sostituita `esisteLogo()` con `leggiInfoLogo()` (restituisce anche `aggiornatoIl`, dai metadati dell'oggetto Storage); `page.tsx` appende `?v=<aggiornatoIl>` all'URL. Verificato dal vivo che l'URL cambi realmente dopo una sostituzione [lib/storage/logo.ts, app/(configurazione)/logo/page.tsx]
- [x] [Review][Patch] — **risolto**. **[Blind Hunter]** Il commento sopra `caricaLogoAction` diceva "RLS è l'unica autorità... nessun controllo applicativo duplicato", linguaggio preso dal precedente dei certificati dove significa specificamente "RLS decide l'appartenenza, `requireRuolo` è un controllo distinto e complementare". Qui l'unico asse di accesso è il Ruolo — non c'è una dimensione di appartenenza — quindi `requireRuolo("ADMIN")` e la policy RLS ADMIN-only verificano deliberatamente la stessa cosa, in profondità (difesa in profondità, non una svista). Riscritto per essere accurato [app/(configurazione)/logo/actions.ts]
- [x] [Review][Patch] — **risolto**. **[Acceptance Auditor]** Il Prerequisito #1 della storia affermava categoricamente "nessuna policy SELECT necessaria" — la verifica dal vivo (Debug Log) ha dimostrato il contrario, ma il testo normativo del Prerequisito non era mai stato corretto: un futuro lettore che leggesse solo quella sezione (non il Debug Log in fondo) avrebbe copiato l'assunzione ormai nota come sbagliata in un futuro pattern di bucket pubblico. Corretto con una nota esplicita [questo file, sezione Prerequisiti]
- [x] [Review][Patch] — **risolto**. **[Acceptance Auditor]** La Capability Map di `ARCHITECTURE-SPINE.md` per "Configurazione Applicazione" elencava `lib/db-rls/` come proprietà condivisa di FR-31/FR-32, ma FR-32 (questa storia) non tocca `lib/db-rls/` affatto (nessuna tabella, per design — vedi Dev Notes) e mancava `lib/storage/`, introdotta qui. Corretta la riga per chiarire quale modulo appartiene a quale FR [ARCHITECTURE-SPINE.md]
- [x] [Review][Dismiss] `next.config.ts`'s `bodySizeLimit: "11mb"` è una configurazione globale, non scopabile per singola Server Action nell'API stabile di Next.js documentata in `node_modules/next/dist/docs/` — allargare il limite per accomodare i due upload reali di questo progetto (certificati 10MB, logo 2MB) è l'unica opzione disponibile; il valore scelto copre esattamente il caso più grande attuale con un margine ragionevole, non un numero arbitrariamente ampio
- [x] [Review][Dismiss] Il commento della migrazione `20260718070000` sovra-dichiara l'idempotenza ("idempotente su un secondo tentativo") quando in realtà solo l'`INSERT` del bucket ha `ON CONFLICT DO NOTHING` — le `CREATE POLICY` fallirebbero comunque con "policy already exists" in un vero scenario di ri-applicazione. Non correggibile retroattivamente (migrazione già applicata, stessa disciplina di Story 4.1/7.1) — nota informativa per future migrazioni di bucket: usare `DROP POLICY IF EXISTS` prima di ogni `CREATE POLICY` se serve idempotenza reale
- [x] [Review][Dismiss] `ON CONFLICT DO NOTHING` sull'INSERT del bucket non "ripara" un bucket pre-esistente con impostazioni sbagliate (es. creato manualmente come privato) — comportamento intenzionale (skip idempotente, non auto-repair): passare a `DO UPDATE` cambierebbe la semantica in modo altrettanto sorprendente nella direzione opposta (una riconfigurazione intenzionale di un operatore verrebbe silenziosamente sovrascritta a ogni riapplicazione della migrazione)
- [x] [Review][Dismiss] Nessun consumer del logo altrove nell'app (nav/header) — scelta di scope esplicita e documentata nei Dev Notes di questa storia fin dalla creazione, non un oversight: nessuna nav condivisa esiste in questa codebase
- [x] [Review][Dismiss] MIME/dimensione massima duplicati in tre punti (actions.ts, SQL della migrazione, test) senza un'unica fonte di verità — stesso identico pattern già presente in Story 4.1 per `certificato-medico`, non una deviazione introdotta qui
- [x] [Review][Dismiss] `urlPubblicoLogo(supabase)` accetta un parametro `SupabaseClient` che sembra non necessario dato che `getPublicUrl` non fa chiamate di rete — falso bersaglio: il parametro serve comunque per invocare `.storage.from(...)`, non è rimovibile
- [x] [Review][Dismiss] Il mock Supabase nei test usa `as never` invece di un tipo parziale — stesso identico pattern usato in **ogni** test file di questo progetto (verificato), convenzione consolidata dell'intera codebase, non una scelta specifica di questa storia
- [x] [Review][Dismiss] Nessuna pagina di errore (`error.tsx`) se `leggiInfoLogo` lancia — stesso gap sistemico trasversale a tutta l'app, già documentato come tale nelle Review Findings di Story 4.1/4.2/7.1, non introdotto qui
- [x] [Review][Dismiss] `contenutoCorrispondeAlMimeDichiarato` non è avvolta nel proprio try/catch (un `arrayBuffer()` che rigetta propagherebbe un'eccezione non gestita) — stessa identica struttura del precedente di Story 4.1 che dichiara esplicitamente di seguire, non una deviazione introdotta qui
- [x] [Review][Dismiss] Due upload concorrenti sullo stesso path fanno "vince l'ultimo scritto" senza rilevamento di conflitto — comportamento accettabile per un asset a bassa frequenza di modifica gestito da un solo gruppo di Admin fidati, nessun AC richiede il rilevamento di conflitti
- [x] [Review][Dismiss] I test di route-guard per `/logo` verificano solo il rifiuto per DIRIGENTE/SEGRETERIA, non ogni Ruolo possibile — stesso identico livello di campionamento (1-2 Ruoli rappresentativi) già usato per **ogni** altra rotta testata in questo progetto
- [x] [Review][Defer] Nessuna pre-validazione lato client in `LogoForm.tsx` oltre il filtro nativo `accept` (banalmente aggirabile) — miglioramento UX, non richiesto da alcun AC (la validazione server-side è già doppia, bucket + applicativa)

## Dev Notes

- **Nessuna tabella DB per questa storia** — a differenza di ogni altra storia recente, il logo non ha bisogno di persistenza relazionale: il path fisso nel bucket **è** la fonte di verità, `getPublicUrl` è deterministico. Non introdurre un modello Prisma "per coerenza" con Story 7.1: sarebbe uno stato ridondante da tenere sincronizzato per nessun beneficio.
- **Non mostrare il logo altrove nell'app in questa storia**: nessuna nav/header condiviso esiste in questa codebase (`app/layout.tsx` è un guscio nudo — vedi Story 4.2 Prerequisito #1 per lo stesso ragionamento) — costruire una sezione che lo consumi è fuori scope, nessun AC lo richiede.
- **Path fisso `"logo"` senza estensione**: `contentType` va sempre passato esplicitamente all'upload (Prerequisito #1) — senza, il file verrebbe servito con un Content-Type generico/sbagliato indipendentemente dal reale formato caricato.
- **Pattern di riferimento più vicino**: `lib/storage/certificati.ts` (Story 4.1) per l'uso del client Storage di Supabase — nota le differenze deliberate: qui `upsert: true` (sostituzione fisica, mai `false`), nessun URL firmato, nessuna sanitizzazione del nome file (il path è sempre il letterale `"logo"`, mai derivato da `file.name`).

### Project Structure Notes

- Nuovo route-group: `app/(configurazione)/logo/` (`page.tsx`, `actions.ts`, `actions.test.ts`, `LogoForm.tsx`) — stesso route group di `app/(configurazione)/smtp/` (Story 7.1).
- Nuovo modulo: `lib/storage/logo.ts` (+ `.test.ts`).
- File nuovi: `prisma/migrations/<timestamp>_add_logo_bucket/migration.sql`. File modificati: `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`. Nessuna modifica a `prisma/schema.prisma`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.2: Configurazione logo applicazione] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-32] — "L'Admin può caricare/aggiornare il logo dell'applicazione dall'interfaccia di configurazione."
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-12] — "il logo è un file in un bucket Storage pubblico (a differenza del bucket privato dei certificati medici, AD-6)."
- [Source: lib/storage/certificati.ts, prisma/migrations/20260718020000_certificati_storage_e_rls/migration.sql] — pattern di riferimento per bucket Storage + policy RLS (Story 4.1), qui adattato per un bucket pubblico invece che privato.
- [Source: _bmad-output/implementation-artifacts/7-1-configurazione-smtp.md#Review Findings] — verifica esplicita che nessun form client di questa codebase ha un test dedicato (precedente per Task 5).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Bug scoperto durante la verifica dal vivo (Task 6, non anticipato in fase di creazione): limite di default di Next.js sul body delle Server Action (1MB, mai configurato in questo progetto)**. Un upload di test da poco oltre 2MB si bloccava senza errore visibile invece di essere rifiutato dal controllo applicativo previsto. Isolato leggendo la documentazione ufficiale Next.js inclusa in `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md` (come richiesto da AGENTS.md — "This is NOT the Next.js you know"): `experimental.serverActions.bodySizeLimit` di default è 1MB. Questo limite si applicava silenziosamente anche a Story 4.1 (certificati fino a 10MB), mai esercitato a quella dimensione reale nella sua verifica dal vivo — un gap pre-esistente, scoperto solo ora. **Fix**: aggiunto `bodySizeLimit: "11mb"` a `next.config.ts` (copre il caso più grande, 10MB dei certificati, con margine per l'overhead multipart) — riavviato il server dev per applicarlo (le modifiche a `next.config.ts` non sono hot-reloadable).
- **Bug scoperto subito dopo (stesso Task 6): `upsert: true` su un bucket pubblico falliva con "new row violates row-level security policy" anche per un Admin autorizzato**. Isolato con uno script diretto (bypassando Playwright/UI) confrontando `upsert: false` (riuscito) contro `upsert: true` (fallito) sulla stessa sessione Admin — Supabase Storage, per decidere se eseguire insert o update, esegue una verifica di esistenza che richiede una policy SELECT autenticata su `storage.objects`, anche per un bucket pubblico (il bypass RLS di un bucket pubblico vale solo per l'endpoint di lettura anonimo, non per questa verifica interna sul path autenticato di scrittura) — smentisce il Prerequisito #1 della storia così come originariamente scritto ("nessuna policy SELECT necessaria"). **Fix**: nuova migrazione con la policy SELECT ADMIN-only mancante (non modificata quella già applicata, stessa disciplina di Story 4.1/7.1).
- Nessun altro problema imprevisto.

### Completion Notes List

- Tutti i 6 Task completati con TDD (RED confermato prima di ogni implementazione: `lib/storage/logo.ts`, Server Action, route-guard).
- Suite completa verde: `npx vitest run` (361 test, 36 file), `npx tsc --noEmit` (nessun errore), `npm run lint` (0 errori, 1 warning atteso per `<img>` — coerente con l'assenza di `next/image` in tutto il progetto), `npm run build` (produzione, `/logo` generata come route dinamica).
- Verifica dal vivo eseguita con successo su 15/15 controlli dopo aver risolto i due problemi sopra (limite body Server Action, policy SELECT mancante per l'upsert) — entrambi scoperti dal vivo, non dai test Vitest (per design: RLS/comportamento Storage reale non sono simulabili nei mock). Dati di test (Utenti Supabase Auth, oggetti nel bucket) rimossi interamente al termine.
- **Nota per Story 4.3+ e future storie con upload**: se un'altra Server Action dovesse mai aver bisogno di superare 11MB di payload, aggiornare `next.config.ts` di conseguenza — non un limite per-storia, è una configurazione globale dell'app.
- Code review (3 subagent adversarial paralleli): 6 patch applicate con TDD dove applicabile (restrizione RLS al path fisso, firma PNG completa a 8 byte, cache-busting sull'URL pubblico, commento fuorviante corretto, Prerequisito #1 della storia e Capability Map dell'architettura corretti), 15 item dismissi con motivazione esplicita (per lo più conformità a pattern/decisioni già deliberate altrove nel progetto), 1 item deferred. Suite e verifica dal vivo (incluso un test diretto della restrizione RLS al path) ri-eseguite verdi dopo le patch.

### File List

- `prisma/migrations/20260718070000_add_logo_bucket/migration.sql` (nuovo)
- `prisma/migrations/20260718080000_logo_bucket_fix_select_policy/migration.sql` (nuovo — fix scoperto in verifica dal vivo)
- `prisma/migrations/20260718090000_logo_bucket_restrict_path/migration.sql` (nuovo — review fix)
- `next.config.ts` (modificato — fix scoperto in verifica dal vivo, rilevante anche per Story 4.1)
- `lib/storage/logo.ts` (nuovo, poi modificato in review: `esisteLogo` → `leggiInfoLogo`)
- `lib/storage/logo.test.ts` (nuovo, poi modificato in review)
- `app/(configurazione)/logo/actions.ts` (nuovo, poi modificato in review: firma PNG a 8 byte, commento corretto)
- `app/(configurazione)/logo/actions.test.ts` (nuovo, poi modificato in review)
- `app/(configurazione)/logo/page.tsx` (nuovo, poi modificato in review: cache-busting)
- `app/(configurazione)/logo/LogoForm.tsx` (nuovo)
- `_bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md` (modificato — review fix, Capability Map)
- `lib/auth/route-guard.ts` (modificato)
- `lib/auth/route-guard.test.ts` (modificato)
