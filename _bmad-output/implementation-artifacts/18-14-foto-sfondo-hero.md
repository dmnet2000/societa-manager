---
baseline_commit: b64d05e8f2e6109b5adcc5de02cf43619b9127df
---

# Story 18.14: Caricamento della foto di sfondo dell'hero da Admin/Dirigente

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente,
I want caricare una foto reale per lo sfondo dell'hero della home pubblica,
so that il sito mostri un'immagine vera della squadra/società quando non ci sono post Facebook da mostrare, invece del solo placeholder grafico.

## Discrepanza rispetto a `epics.md`, risolta con l'utente prima di scrivere questa storia

`epics.md` (Story 18.14, scritta il 2026-08-14) descrive l'hero come se avesse un solo sfondo possibile: il placeholder CSS `.heroFoto` ("FOTO AZIONE"), sempre visibile finché non si carica una foto reale. **Nella stessa giornata, in sessione successiva, l'hero è stato modificato** (richiesta diretta dell'utente, poi Story 18.19 in backlog per un ulteriore aggiustamento) per mostrare il carosello dei post Facebook (`HeroPostFacebook.tsx`) come sfondo quando configurato — vedi `app/page.tsx` righe 264-266/289: oggi `.heroFoto` compare **solo se `postFacebook.length === 0`**. Un commento in `home-pubblica.module.css` (righe 76-78) nota esplicitamente che il trattamento visivo dei post Facebook segue "lo stesso principio già previsto per la futura foto reale, Story 18.14" — la foto Facebook copre già, in pratica, il ruolo di "immagine vera al posto del placeholder".

**Chiesto esplicitamente all'utente**: dove si inserisce la foto caricata ora che i post Facebook occupano già lo sfondo quando configurati? Risposta: **la foto caricata è il fallback quando Facebook non è configurato/non ha post** — sostituisce il placeholder grafico `.heroFoto`, ma **non** ha priorità sui post Facebook quando questi sono presenti. Priorità finale dello sfondo hero (più alta prima):
1. Post Facebook (`postFacebook.length > 0`) — invariato, nessuna modifica a `HeroPostFacebook.tsx`.
2. Foto hero caricata da Admin/Dirigente (questa storia) — nuovo.
3. Placeholder CSS `.heroFoto` — invariato, ultimo fallback.

Questo **sostituisce** l'AC #3 originale di `epics.md` ("la vede come sfondo dell'hero" senza condizioni) con l'AC #3 sotto, che rende esplicita la priorità.

## Acceptance Criteria

1. **Given** un Admin o Dirigente **When** carica un'immagine PNG/JPEG entro 2MB come foto di sfondo dell'hero **Then** l'immagine viene salvata e sostituisce quella precedente se già presente (stessa validazione MIME/dimensione/magic-byte già in uso per logo/Sponsor/foto squadra — `lib/storage/validazione-immagine.ts`, riuso diretto)
2. **And** un Utente con un altro Ruolo (Allenatore, Segreteria, Atleta, Genitore) non può caricare la foto hero — solo ADMIN/DIRIGENTE
3. **Given** un Visitatore senza sessione **When** visita la home pubblica **Then** vede come sfondo dell'hero, in ordine di priorità: (a) il carosello dei post Facebook se configurato e con post disponibili (invariato, priorità più alta), altrimenti (b) la foto hero caricata se presente, altrimenti (c) il placeholder grafico `[FOTO AZIONE]` esistente — mai un'area vuota o un'immagine rotta
4. **And** il testo dell'hero (titolo, CTA "Scopri le squadre") resta leggibile sopra la foto reale caricata — riuso dello stesso scrim (`.heroFotoPost::after`) già usato per i post Facebook, nessun nuovo trattamento da inventare
5. **And** nessuna regressione sul comportamento esistente: quando ci sono post Facebook, la foto hero caricata (se presente) resta invisibile/non renderizzata — stesso principio "un solo sfondo alla volta" già in uso

## Tasks / Subtasks

- [x] Task 1: Migrazione Storage — bucket `foto-hero` (AC: #1, #2, #3)
  - [x] Nuovo file `prisma/migrations/20260815000000_add_foto_hero_bucket/migration.sql`, una sola migrazione corretta fin da subito.
  - [x] Policy SELECT pubblica fin da subito, ristretta al path fisso `name = 'foto-hero'`.
  - [x] Policy INSERT/UPDATE ristrette al path fisso, ruoli ADMIN+DIRIGENTE.
  - [x] Nessuna funzione di possesso (mirror sponsor-banner).
  - [x] Nessuna policy DELETE.

- [x] Task 2: `lib/storage/foto-hero.ts` — mirror di `lib/storage/logo.ts` (AC: #1, #3)
  - [x] `BUCKET`/`PATH` = `"foto-hero"`.
  - [x] `caricaFotoHero`, `urlPubblicoFotoHero`, `leggiInfoFotoHero` implementate mirror esatto di `logo.ts`.

- [x] Task 3: Server Action di upload in `app/app/(configurazione)/impostazioni/actions.ts` (AC: #1, #2)
  - [x] `caricaFotoHeroAction` aggiunta allo stesso file, `requireRuolo(["ADMIN", "DIRIGENTE"])`, stessa sequenza di validazione di `caricaLogoAction`.
  - [x] `FotoHeroActionState` mirror `LogoActionState`.
  - [x] `revalidatePath("/app/impostazioni")` al successo, nessun `revalidatePath("/")` (home già `force-dynamic`).

- [x] Task 4: `FotoHeroForm.tsx` + sezione in `/app/impostazioni` (AC: #1, #2)
  - [x] Nuovo `FotoHeroForm.tsx`, mirror esatto di `LogoForm.tsx`.
  - [x] Nuova sezione "Foto sfondo hero" in `/app/impostazioni` dopo "Token Facebook" (non `/app/logo`, ADMIN-only a livello di rotta).
  - [x] `leggiInfoFotoHero(supabase)` aggiunta al flusso di lettura di `ImpostazioniPage` — `createClient()` estratto in un primo `Promise.all` insieme a `ruoli` (non esisteva ancora in questo Server Component, il client serve anche a `urlPubblicoFotoHero` in modo sincrono nel JSX), le letture dipendenti in un secondo `Promise.all`.
  - [x] Anteprima `<img>` con cache-buster, nuove classi `.anteprimaFotoHero`/`.messaggioVuoto` in `impostazioni.module.css` (mirror `logo.module.css`).
  - [x] Nessun avviso soft (mirror "Contatti pubblici").

- [x] Task 5: Home pubblica — fallback a 3 livelli nell'hero (AC: #3, #4, #5)
  - [x] `leggiInfoFotoHero(supabase)` aggiunta al `Promise.all` esistente di `app/page.tsx`.
  - [x] Blocco hero sostituito con fallback a 3 rami, priorità Facebook invariata.
  - [x] Riuso di `styles.heroFotoPost` (nessuna nuova classe CSS in `home-pubblica.module.css`).
  - [x] Verificato: il blocco `{postFacebook.length > 0 && <HeroPostFacebook post={postFacebook} />}` resta testualmente invariato, i due nuovi rami sono entrambi condizionati su `postFacebook.length === 0`.

- [x] Task 6: Guida in-app
  - [x] `lib/guida/contenuti.ts`, voce `/app/impostazioni`: aggiunta una riga per "Foto sfondo hero" nello stesso stile delle altre sezioni.

- [x] Task 7: Test (AC: tutti)
  - [x] `lib/storage/foto-hero.test.ts` (nuovo, mirror `logo.test.ts`): 6 test, `caricaFotoHero`/`urlPubblicoFotoHero`/`leggiInfoFotoHero`.
  - [x] `app/app/(configurazione)/impostazioni/actions.test.ts`: 9 nuovi test per `caricaFotoHeroAction` (FORBIDDEN non-ADMIN/DIRIGENTE, VALIDATION nessun file/file vuoto/MIME/dimensione/magic-byte, successo ADMIN, successo DIRIGENTE, INTERNAL fail-closed).
  - [x] Confermato: nessun file `*.test.{ts,tsx}` importa `app/page.tsx`.

- [x] Task 8: Verifica finale (AC: tutti)
  - [x] `npx vitest run` (1182/1182), `npx tsc --noEmit` (0 errori), `npm run lint` (0 errori, 12 warning preesistenti + 1 nuovo `<img>` atteso mirror di `/app/logo`), `npm run build` (riuscita, `/` e `/app/impostazioni` presenti nell'output).
  - [x] Verificato per lettura diretta del codice (nessuna verifica visiva dal vivo possibile nel sandbox): con `postFacebook.length > 0` nessuno dei due nuovi rami del fallback si attiva (entrambi condizionati su `postFacebook.length === 0`); con `fotoHero.esiste` e nessun post, il ramo `.heroFotoPost` con lo scrim esistente si attiva; senza nessuno dei due, resta `.heroFoto` invariato.

### Review Findings

- [x] [Review][Patch] Test "accetta DIRIGENTE" non verificava davvero il perimetro di Ruoli (si appoggiava al mock permissivo di default) [app/app/(configurazione)/impostazioni/actions.test.ts:699] — risolto: aggiunta `expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"])`.
- [x] [Review][Patch] Test "file vuoto" mancava `expect(caricaFotoHeroMock).not.toHaveBeenCalled()`, presente in tutti gli altri casi di errore di validazione dello stesso file [app/app/(configurazione)/impostazioni/actions.test.ts:637] — risolto.
- [x] [Review][Patch] Anteprima `<img>` dell'admin senza `max-height`/`object-fit` — una foto verticale ad alta risoluzione avrebbe rotto il layout di `/app/impostazioni` [app/app/(configurazione)/impostazioni/impostazioni.module.css] — risolto, aggiunti `max-height: 200px` e `object-fit: contain`.
- [x] [Review][Defer] Nessuna funzione di rimozione della foto hero — deferred, nessun AC la richiede [lib/storage/foto-hero.ts]
- [x] [Review][Defer] `cacheControl` non impostato esplicitamente su `upload()` — deferred, stesso pattern preesistente di logo.ts/sponsor.ts [lib/storage/foto-hero.ts]
- [x] [Review][Defer] Verifica magic-byte JPEG limitata a 3 byte — deferred, pre-esistente in lib/storage/validazione-immagine.ts, non toccata qui
- [x] [Review][Defer] Policy INSERT/UPDATE senza `TO authenticated` esplicito — deferred, stesso pattern di ogni altra migrazione Storage del progetto [prisma/migrations/20260815000000_add_foto_hero_bucket/migration.sql]
- [x] [Review][Defer] Nessun test di integrazione RLS a livello DB — deferred, mai fatto per nessun bucket in questo progetto
- [x] [Review][Defer] `fileFinto` nei test non è un vero `File` — deferred, mirror esatto di logo.test.ts [lib/storage/foto-hero.test.ts]
- [x] [Review][Defer] `createClient()` non guardato da `.catch()` nel nuovo Promise.all — deferred, verificato: stesso pattern non protetto già in app/page.tsx stesso, non una regressione [app/app/(configurazione)/impostazioni/page.tsx]
- [x] [Review][Defer] Cache-buster vuoto se `aggiornatoIl` è null — deferred, pattern preesistente di logo.ts [lib/storage/foto-hero.ts]

## Dev Notes

### Perché questa storia non è "carica una foto, mostrala sempre"

`epics.md` è stato scritto prima che l'hero venisse modificato (stessa giornata, sessione successiva) per mostrare i post Facebook come sfondo. La foto caricata da questa storia è un **fallback**, non lo sfondo primario — vedi la sezione "Discrepanza" sopra per la decisione presa esplicitamente con l'utente. Non riaprire questa decisione durante lo sviluppo.

### Riuso deliberato di `.heroFotoPost` per la foto statica

`HeroPostFacebook.tsx` (Client Component) applica `backgroundImage` via `style` inline sulla stessa classe `styles.heroFotoPost` per mostrare la foto del post Facebook corrente. Questa storia fa lo stesso, ma da Server Component (`app/page.tsx` stesso), con un URL statico invece che ciclico — **stessa classe CSS, stesso scrim, nessuna duplicazione**. Non introdurre una `.heroFotoCaricata` separata: visivamente devono essere indistinguibili (entrambe "una foto vera a piena altezza con scrim"), è lo stesso identico ruolo visivo con una sorgente diversa.

### Perché `/app/impostazioni` e non `/app/logo`

`epics.md` lasciava esplicitamente aperta questa scelta. Risolta leggendo `lib/auth/route-guard.ts`: `/app/logo` (riga 214-219) è **ADMIN-only** a livello di rotta (deciso in Story 7.2 per il logo del Settore, che resta intenzionalmente Admin-only — non riaprire quella decisione). Questa storia richiede ADMIN**+DIRIGENTE** (AC #2) — su `/app/logo` un Dirigente verrebbe reindirizzato prima di raggiungere il form, stesso identico gap già trovato e corretto per `/app/impostazioni` in Story 18.13 (Dirigente bloccato dalla route-guard nonostante la Server Action lo ammettesse). `/app/impostazioni` è già ADMIN+DIRIGENTE e ospita esattamente questo tipo di contenuto (Contatti pubblici, Pagina Facebook, Token Facebook) — nessun cambio a `route-guard.ts` necessario.

### Migrazione Storage: fare bene alla prima, non correggere dopo

Il bucket `logo-applicazione` ha richiesto **tre** migrazioni per arrivare a uno stato corretto (bucket iniziale ADMIN-only per INSERT/UPDATE senza restrizione di path → fix path → fix SELECT pubblica). Il bucket `foto-squadra-gruppo` (Story 18.4) ha applicato la lezione SELECT-pubblica-fin-da-subito ma non ha un path fisso (path per-entità). Questa storia è il primo caso di **path fisso + necessità di SELECT pubblica dal primo giorno** (il logo non l'aveva scritta bene alla prima, `foto-hero` deve). Task 1 sopra specifica esattamente le tre policy (SELECT pubblica ristretta al path, INSERT/UPDATE ADMIN+DIRIGENTE ristrette allo stesso path) in un'unica migrazione.

### Cosa NON cambia in questa storia

Nessuna modifica a `HeroPostFacebook.tsx`, `lib/facebook-graph.ts`, alla logica del carosello Facebook, al consenso cookie, o a `lib/auth/route-guard.ts`. Nessuna nuova colonna Prisma (path fisso, esistenza via Storage `list()`, mirror esatto del logo — non un campo `ConfigurazioneApplicazione`).

### Project Structure Notes

- File nuovi: `prisma/migrations/<timestamp>_add_foto_hero_bucket/migration.sql`, `lib/storage/foto-hero.ts`, `lib/storage/foto-hero.test.ts`, `app/app/(configurazione)/impostazioni/FotoHeroForm.tsx`.
- File modificati: `app/app/(configurazione)/impostazioni/actions.ts`, `app/app/(configurazione)/impostazioni/actions.test.ts`, `app/app/(configurazione)/impostazioni/page.tsx`, `app/page.tsx`, `lib/guida/contenuti.ts`.
- Nessuna modifica a `home-pubblica.module.css` (riuso di `.heroFotoPost`/`.heroFoto` esistenti).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 18, Story 18.14] — testo originale di User Story/Note tecniche/AC, **AC #3 sostituito** in questa storia (vedi sezione Discrepanza).
- [Source: app/page.tsx righe 40, 107-214, 250-290] — `dynamic = "force-dynamic"`, `Promise.all` da estendere, blocco hero da modificare (righe 264-266/289 in particolare).
- [Source: app/home-pubblica.module.css righe 27-98] — `.hero`, `.heroFoto`/`.heroFoto::before` (placeholder, invariato), `.heroFotoPost`/`.heroFotoPost::after` (da riusare, non duplicare).
- [Source: app/HeroPostFacebook.tsx] — pattern di applicazione `backgroundImage` inline su `styles.heroFotoPost`, stesso principio da riusare da Server Component.
- [Source: lib/storage/logo.ts, app/app/(configurazione)/logo/actions.ts, LogoForm.tsx, page.tsx] — mirror diretto per `foto-hero.ts`/`caricaFotoHeroAction`/`FotoHeroForm.tsx`/anteprima con cache-buster.
- [Source: lib/auth/route-guard.ts righe 207, 214-219] — perimetro `/app/impostazioni` (ADMIN+DIRIGENTE) vs `/app/logo` (ADMIN-only), motivazione della scelta di pagina.
- [Source: prisma/migrations/20260718070000_add_logo_bucket, 20260718080000_logo_bucket_fix_select_policy, 20260718090000_logo_bucket_restrict_path, 20260725020000_logo_bucket_public_select_policy] — le tre correzioni storiche del bucket logo, da NON ripetere qui.
- [Source: prisma/migrations/20260813000000_add_foto_squadra_bucket] — precedente diretto di "SELECT pubblica fin da subito" con path (anche se per-entità, non fisso).
- [Source: prisma/migrations/20260809010000_add_sponsor_banner_bucket] — precedente diretto di policy ADMIN+DIRIGENTE senza funzione di possesso (mirror per INSERT/UPDATE di questa storia).
- [Source: app/app/(configurazione)/impostazioni/page.tsx, actions.ts] — struttura hub esistente da estendere con la quinta sezione (dopo Email Segreteria/Pagina Facebook/Contatti pubblici/Token Facebook).
- [Source: _bmad-output/implementation-artifacts/18-13-carosello-facebook.md] — precedente diretto del gap `/app/impostazioni` ADMIN-only-a-livello-di-rotta vs Server Action ADMIN+DIRIGENTE, già trovato e corretto lì (motivazione della scelta di pagina di questa storia).
- [Source: AGENTS.md, root del repo] — nota su Next.js non standard, non sostanzialmente applicabile (nessuna modifica a routing dinamico/parametri).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (dev-story workflow)

### Debug Log References

Nessuno - implementazione lineare, nessun blocco/HALT incontrato.

### Completion Notes List

- Tutti e 8 i Task completati esattamente come pianificato, nessuna deviazione sostanziale rispetto al piano scritto in fase di analisi.
- Migrazione Storage (`prisma/migrations/20260815000000_add_foto_hero_bucket/migration.sql`): bucket `foto-hero`, SELECT pubblica + INSERT/UPDATE ADMIN+DIRIGENTE ristrette al path fisso `foto-hero`, tutte scritte correttamente in un'unica migrazione (a differenza del bucket logo, che ne ha richieste tre in sequenza).
- `lib/storage/foto-hero.ts` mirror esatto di `lib/storage/logo.ts` (`caricaFotoHero`/`urlPubblicoFotoHero`/`leggiInfoFotoHero`).
- `caricaFotoHeroAction` aggiunta a `impostazioni/actions.ts`, `requireRuolo(["ADMIN", "DIRIGENTE"])` (non ADMIN-only come il logo).
- `impostazioni/page.tsx`: refactor minimo del `Promise.all` esistente per estrarre `createClient()` in un primo stadio (necessario perché `urlPubblicoFotoHero` è usata in modo sincrono nel JSX, non solo dentro un `.then()` isolato come prima per `configurazioneSocialFacebook`); nuova sezione "Foto sfondo hero" con anteprima e form, in fondo alla pagina.
- `app/page.tsx`: hero con fallback a 3 livelli (post Facebook > foto hero caricata > placeholder), riuso della classe `styles.heroFotoPost` esistente per la foto caricata (stesso scrim, nessuna nuova regola CSS) — priorità Facebook garantita per costruzione (entrambi i nuovi rami condizionati su `postFacebook.length === 0`).
- Guida in-app (`lib/guida/contenuti.ts`) aggiornata per la voce `/app/impostazioni`, regola permanente del progetto.
- 15 nuovi test (6 in `lib/storage/foto-hero.test.ts`, 9 in `impostazioni/actions.test.ts`). 1182/1182 test Vitest passati, 0 errori tsc/eslint (1 nuovo warning `<img>` atteso, mirror di `/app/logo/page.tsx`, non un errore), build produzione riuscita (`/` e `/app/impostazioni` presenti nell'output, entrambe dinamiche per via di cookie/sessione come le altre pagine equivalenti).
- Nessuna migrazione applicata al DB nel sandbox (nessun accesso Supabase), da applicare in produzione come le precedenti migrazioni Storage.
- Verifica visiva dal vivo NON eseguibile in questo sandbox (stesso limite noto delle altre story dell'Epic 18) — demandata all'utente: in particolare confermare che, dopo aver caricato una foto senza post Facebook configurati, lo sfondo dell'hero mostri la foto con testo/CTA leggibili sopra lo scrim.

### File List

- `prisma/migrations/20260815000000_add_foto_hero_bucket/migration.sql` (nuovo)
- `lib/storage/foto-hero.ts` (nuovo)
- `lib/storage/foto-hero.test.ts` (nuovo)
- `app/app/(configurazione)/impostazioni/FotoHeroForm.tsx` (nuovo)
- `app/app/(configurazione)/impostazioni/actions.ts`
- `app/app/(configurazione)/impostazioni/actions.test.ts`
- `app/app/(configurazione)/impostazioni/page.tsx`
- `app/app/(configurazione)/impostazioni/impostazioni.module.css`
- `app/page.tsx`
- `lib/guida/contenuti.ts`

### Change Log

- 2026-08-15: File di story creato (create-story workflow) — discrepanza con `epics.md` scoperta e risolta con l'utente (foto hero come fallback su Facebook, non priorità), scelta di pagina risolta leggendo `route-guard.ts`. Status: backlog → ready-for-dev.
- 2026-08-15: Implementata Story 18.14 (dev-story workflow) — nuovo bucket `foto-hero`, upload Admin/Dirigente in `/app/impostazioni`, fallback a 3 livelli nell'hero della home pubblica. 1182/1182 test Vitest passati (+15), 0 errori tsc/eslint, build produzione riuscita. Status: ready-for-dev → review.
- 2026-08-15: Code review completata (bmad-code-review, Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo) — 0 violazioni sugli AC (Acceptance Auditor pulito), 3 patch applicati (2 test di qualità, 1 vincolo CSS sull'anteprima), 10 defer (tutti pre-esistenti o coerenti con convenzioni già stabilite nel progetto, incluso un falso allarme su `createClient()` verificato contro il pattern identico già in uso in `app/page.tsx`). 1182/1182 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: review → done.
