---
baseline_commit: 54cc869ff8c27b0a6a8f816481f0b9929a388195
---

# Story 18.20: Logo della Polisportiva nell'header e nel footer pubblici, con link al sito

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Decisioni prese con l'utente prima di scrivere questa storia

`epics.md` lasciava aperti 4 punti. **Chiesti tutti esplicitamente all'utente prima della scrittura**, risposte:

1. **Link social**: nessuno — **solo un link al sito** della Polisportiva (non "link social", diversamente da quanto ipotizzato in `epics.md`). Un solo campo URL, nessuna icona/etichetta multi-piattaforma da introdurre.
2. **Dove compare**: **in entrambi i posti** — sia nell'header pubblico (nuovo, non previsto in `epics.md`) sia nel footer pubblico. Nell'header: **dopo il menu di navigazione, prima del pulsante "Accedi"** (richiesta letterale dell'utente).
3. **Perimetro Ruoli**: **Admin + Dirigente**, stesso perimetro della maggior parte dei contenuti pubblici dell'Epic 18 (non Admin-only come il logo del Settore).
4. **Il "sito" è un link esterno**: sì, un semplice `<a>` verso un URL esterno, nessuna integrazione reale — non è stato necessario chiederlo esplicitamente, univoco.

Non riaprire queste decisioni durante lo sviluppo.

## Story

As a Visitatore del sito pubblico,
I want vedere il logo della Polisportiva (l'associazione madre a cui appartiene il Settore Volley) con un link al suo sito,
so that possa raggiungere facilmente anche la Polisportiva, non solo il Settore Volley.

## Acceptance Criteria

1. **Given** un Admin o Dirigente **When** carica un'immagine PNG/JPEG entro 2MB come logo della Polisportiva **Then** l'immagine viene salvata e sostituisce quella precedente se già presente (stessa validazione MIME/dimensione/magic-byte già in uso per logo Settore/Sponsor/foto squadra/foto hero — `lib/storage/validazione-immagine.ts`, riuso diretto)
2. **And** un Admin o Dirigente può impostare/modificare/rimuovere l'URL del sito della Polisportiva (campo di testo opzionale, mirror `urlPaginaFacebook`)
3. **And** un Utente con un altro Ruolo (Allenatore, Segreteria, Atleta, Genitore) non può caricare il logo né modificare l'URL
4. **Given** un Visitatore senza sessione **When** visita qualunque pagina pubblica **Then** vede il logo della Polisportiva (se caricato) sia nell'header (tra il menu di navigazione e "Accedi") sia nel footer — se anche l'URL del sito è impostato, il logo è cliccabile e apre il sito in una nuova scheda; se il logo è caricato ma l'URL non è impostato, il logo compare comunque ma non è cliccabile; se il logo non è mai stato caricato, non compare nulla in nessuno dei due punti (nessuna area vuota "rotta")
5. **And** nessuna regressione: menu di navigazione (Story 18.7/18.18), pulsante "Accedi" (Story 18.1 AC #7), logo/nome del Settore Volley esistenti, icona Facebook e link "Preferenze cookie" nel footer (Story 18.5/18.17) restano invariati — questa storia aggiunge un elemento, non ne modifica altri

## Tasks / Subtasks

- [x] Task 1: Migrazione DB — campo `urlSitoPolisportiva` + bucket `logo-polisportiva` (AC: #1, #2, #3, #4)
  - [x] Nuovo file `prisma/migrations/20260815010000_add_polisportiva/migration.sql`.
  - [x] `ALTER TABLE "configurazione_applicazione" ADD COLUMN "urlSitoPolisportiva" TEXT;` — nullable, mirror `urlPaginaFacebook` (nessuna colonna NOT NULL su questa tabella, AD-9 no-RLS).
  - [x] Bucket Storage `logo-polisportiva`: `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('logo-polisportiva', 'logo-polisportiva', true, 2097152, ARRAY['image/png', 'image/jpeg']) ON CONFLICT (id) DO NOTHING;` — mirror esatto del bucket `foto-hero` (Story 18.14): path fisso singleton, non per-entità.
  - [x] Policy SELECT **pubblica fin da subito**, ristretta al path fisso (mirror `pubblico_foto_hero_select`, Story 18.14 — lezione già pagata due volte dal bucket logo, foto-hero l'ha già applicata fin da subito): `CREATE POLICY "pubblico_logo_polisportiva_select" ON storage.objects FOR SELECT USING (bucket_id = 'logo-polisportiva' AND name = 'logo-polisportiva');`
  - [x] Policy INSERT/UPDATE ristrette al path fisso, ruoli ADMIN+DIRIGENTE (mirror `admin_dirigente_foto_hero_insert`/`_update`, Story 18.14): `bucket_id = 'logo-polisportiva' AND name = 'logo-polisportiva' AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']` in `USING`/`WITH CHECK`.
  - [x] Nessuna funzione di possesso (solo Ruolo, mirror sponsor-banner/foto-hero). Nessuna policy DELETE (sostituzione via `upsert:true`, mai cancellazione esplicita).
  - [x] `prisma/schema.prisma`, model `ConfigurazioneApplicazione`: aggiungere `urlSitoPolisportiva String?` (con commento che spiega la storia, mirror del commento già presente su `urlPaginaFacebook`).
  - [x] Rigenerare il client Prisma (`npx prisma generate`) dopo la modifica a `schema.prisma` — resta su 6.19.3, mai 7.x (convenzione consolidata del progetto).

- [x] Task 2: `lib/storage/logo-polisportiva.ts` — mirror di `lib/storage/foto-hero.ts` (AC: #1, #4)
  - [x] `const BUCKET = "logo-polisportiva"; const PATH = "logo-polisportiva";`
  - [x] `caricaLogoPolisportiva(supabase, file)`, `urlPubblicoLogoPolisportiva(supabase)`, `leggiInfoLogoPolisportiva(supabase)` — mirror esatto di `caricaFotoHero`/`urlPubblicoFotoHero`/`leggiInfoFotoHero` (`InfoLogoPolisportiva = { esiste: boolean; aggiornatoIl: string | null }`).

- [x] Task 3: `lib/configurazione-applicazione.ts` — `leggiUrlSitoPolisportiva`/`salvaUrlSitoPolisportiva` (AC: #2)
  - [x] Mirror esatto della coppia `leggiUrlPaginaFacebook`/`salvaUrlPaginaFacebook` (righe 51-65) — stesso pattern `findUnique`/`upsert` sull'id fisso `ID_CONFIGURAZIONE_APPLICAZIONE`.

- [x] Task 4: Server Action in `app/app/(configurazione)/impostazioni/actions.ts` (AC: #1, #2, #3)
  - [x] `caricaLogoPolisportivaAction` — mirror esatto di `caricaFotoHeroAction` (Story 18.14): `requireRuolo(["ADMIN", "DIRIGENTE"])`, stessa sequenza di validazione (`MIME_AMMESSI_IMMAGINE`, `DIMENSIONE_MASSIMA_IMMAGINE_BYTE`, `contenutoCorrispondeAlMimeImmagine`), `LogoPolisportivaActionState` mirror `FotoHeroActionState`, `revalidatePath("/app/impostazioni")`.
  - [x] `salvaUrlSitoPolisportivaAction` — mirror esatto di `salvaUrlPaginaFacebookAction` (stesso `requireRuolo`, stessa funzione `urlValido` — **riusare quella già esistente per Pagina Facebook se già esportata/riusabile, altrimenti duplicarla identica** con lo stesso limite `LUNGHEZZA_MASSIMA_LINK_ESTERNO`/500 caratteri e stesso controllo `protocol === "http:" || "https:"`), stringa vuota = rimuove la configurazione, `revalidatePath("/app/impostazioni")`.

- [x] Task 5: Nuovi form + sezione "Polisportiva" in `/app/impostazioni` (AC: #1, #2, #3)
  - [x] Nuovo `app/app/(configurazione)/impostazioni/LogoPolisportivaForm.tsx` — mirror esatto di `FotoHeroForm.tsx` (Story 18.14), testo "Logo Polisportiva (PNG o JPG, max 2MB)"/"Carica logo".
  - [x] Nuovo `app/app/(configurazione)/impostazioni/SitoPolisportivaForm.tsx` — mirror esatto di `PaginaFacebookForm.tsx` (campo URL singolo, stesso schema di stato).
  - [x] In `page.tsx`: nuova sezione `<h2 className={styles.titoloSezione}>Polisportiva</h2>` dopo la sezione "Foto sfondo hero" (ultima esistente) — leggere `leggiInfoLogoPolisportiva(supabase)` e `leggiUrlSitoPolisportiva()` nel `Promise.all` esistente (stesso pattern fail-soft già in uso), mostrare anteprima `<img>` (mirror `.anteprimaFotoHero`, con cache-buster) se il logo esiste, poi entrambi i form.
  - [x] Nuove classi `.anteprimaLogoPolisportiva` (mirror `.anteprimaFotoHero`) in `impostazioni.module.css` se serve un trattamento diverso, altrimenti riusare `.anteprimaFotoHero` direttamente (stessa forma di anteprima, nessuna differenza sostanziale) — **preferire il riuso diretto**, non duplicare la classe se non necessario.

- [x] Task 6: Mostrare il logo nell'header pubblico (AC: #4, #5)
  - [x] `app/HeaderPubblico.tsx`: aggiungere `leggiInfoLogoPolisportiva(supabase)` e `leggiUrlSitoPolisportiva()` al `Promise.all` esistente (stesso pattern fail-soft).
  - [x] Markup: tra `<NavPubblica />` e `<Link href="/accedi">` (posizione letterale richiesta dall'utente) — `{logoPolisportiva.esiste && (urlSitoPolisportiva ? <a href={urlSitoPolisportiva} target="_blank" rel="noopener noreferrer" className={styles.logoPolisportiva}><img src={...} alt="Logo della Polisportiva" /></a> : <img className={styles.logoPolisportiva} src={...} alt="Logo della Polisportiva" />)}` — `alt` non vuoto (a differenza del logo Settore, `alt=""`, che è decorativo perché il nome è già scritto accanto in testo — qui non c'è un'etichetta testuale equivalente, l'immagine stessa veicola l'informazione).
  - [x] Nuova classe `.logoPolisportiva` in `HeaderPubblico.module.css` — dimensione simile a `.logo` esistente (`max-height:40px`), per coerenza visiva tra i due loghi nello stesso header.
  - [x] Verificare che `NavPubblica`/`.accedi` non siano toccati — l'header ora ha 4 elementi visibili (brand, nav, logo Polisportiva, Accedi) invece di 3: confermare che `flex-wrap`/`gap` esistenti bastino, nessuna modifica al layout flex necessaria (stesso principio già verificato per l'hamburger di Story 18.18).

- [x] Task 7: Mostrare il logo nel footer pubblico (AC: #4, #5)
  - [x] `app/FooterPubblico.tsx`: aggiungere `createClient()` (non presente oggi in questo file — nessuna chiamata Storage esisteva prima) + `leggiInfoLogoPolisportiva(supabase)` + `leggiUrlSitoPolisportiva()` al `Promise.all` esistente.
  - [x] Markup: dopo il paragrafo copyright, prima dell'icona Facebook — stessa struttura condizionale del Task 6 (link se URL presente, altrimenti solo `<img>`).
  - [x] Nuova classe `.logoPolisportiva` in `FooterPubblico.module.css` (dimensione coerente col contesto footer, es. `max-height:40px`, `margin-top: var(--space-4)` mirror `.iconaSocial`).

- [x] Task 8: Guida in-app (regola permanente del progetto)
  - [x] `lib/guida/contenuti.ts`, voce `/app/impostazioni`: aggiungere una riga per la nuova sezione "Polisportiva", stesso stile delle altre righe già presenti in quella voce.

- [x] Task 9: Test (AC: tutti)
  - [x] `lib/storage/logo-polisportiva.test.ts` (nuovo, mirror `lib/storage/foto-hero.test.ts`): `caricaLogoPolisportiva`/`urlPubblicoLogoPolisportiva`/`leggiInfoLogoPolisportiva`.
  - [x] `lib/configurazione-applicazione.test.ts` (esistente, aggiungere casi): `leggiUrlSitoPolisportiva`/`salvaUrlSitoPolisportiva`, mirror dei test già presenti per `leggiUrlPaginaFacebook`/`salvaUrlPaginaFacebook`.
  - [x] `app/app/(configurazione)/impostazioni/actions.test.ts` (esistente, aggiungere casi): `caricaLogoPolisportivaAction` (mirror dei 9 test già scritti per `caricaFotoHeroAction`, Story 18.14) e `salvaUrlSitoPolisportivaAction` (mirror dei test già scritti per `salvaUrlPaginaFacebookAction`).
  - [x] Confermare che nessun file `*.test.{ts,tsx}` importa oggi `HeaderPubblico.tsx`/`FooterPubblico.tsx`/`app/page.tsx` (stessa convenzione già consolidata nell'Epic 18).

- [x] Task 10: Verifica finale (AC: tutti)
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti — build produzione deve continuare a includere tutte le 5 rotte pubbliche nell'output.
  - [x] Verifica manuale (o ragionamento sul codice, se il sandbox non consente verifica visiva dal vivo): logo assente in entrambi i posti se mai caricato; logo presente ma non cliccabile se l'URL non è impostato; logo cliccabile (nuova scheda) se entrambi presenti; nessuna regressione su menu/Accedi/icona Facebook/link cookie.

## Dev Notes

### Perché header E footer, non solo footer come in `epics.md`

`epics.md` proponeva solo il footer. **Chiesto esplicitamente all'utente**, che ha risposto "in entrambi i posti" — nell'header con una posizione precisa: dopo il menu di navigazione, prima di "Accedi". Non assumere che uno dei due punti sia sufficiente o opzionale: entrambi sono richiesti.

### Perché nessun link "social", solo il sito

`epics.md` ipotizzava "logo con link al sito e ai social (se presenti)". **Chiesto esplicitamente all'utente**, che ha risposto "solo link alla pagina web" — nessun campo/icona social da introdurre per la Polisportiva. Questo semplifica lo scope: un solo campo URL (`urlSitoPolisportiva`), nessuna nuova icona multi-piattaforma.

### `FooterPubblico.tsx` non ha mai avuto bisogno di un client Supabase finora

Verificato leggendo il file: oggi `FooterPubblico.tsx` legge solo `configurazione_applicazione` via Prisma diretto (`leggiNomeSettore`/`leggiUrlPaginaFacebook`), nessuna chiamata Storage. Questa storia introduce la prima lettura Storage in questo componente (`leggiInfoLogoPolisportiva`, che richiede un client Supabase) — va aggiunto `createClient()` al suo `Promise.all`, mirror del pattern già stabilito in `HeaderPubblico.tsx` (che invece lo ha già, per il logo del Settore).

### Perché `alt` non vuoto per il logo Polisportiva (a differenza del logo Settore)

Il logo del Settore Volley in `HeaderPubblico.tsx` usa `alt=""` perché è decorativo: il nome del Settore è già scritto in testo accanto (`.nomeSettore`), l'immagine è ridondante per uno screen reader. Il logo della Polisportiva non ha alcuna etichetta testuale equivalente accanto (né in header né in footer) — l'immagine stessa veicola l'informazione "questo è il logo/link della Polisportiva", quindi richiede un `alt` descrittivo (`"Logo della Polisportiva"`), non vuoto.

### Riuso deliberato del pattern foto-hero (Story 18.14), non del pattern logo Settore (Story 7.2)

Il logo Settore (`lib/storage/logo.ts`, bucket `logo-applicazione`) è Admin-only e ha impiegato **tre** migrazioni per arrivare a policy corrette (path non ristretto, poi fix path, poi fix SELECT troppo restrittiva). Il bucket `foto-hero` (Story 18.14) ha già applicato tutte le lezioni in un'unica migrazione corretta fin da subito (SELECT pubblica + INSERT/UPDATE ADMIN+DIRIGENTE, entrambe ristrette al path fisso). Questa storia mirror `foto-hero`, non `logo.ts` — stesso perimetro Ruoli (ADMIN+DIRIGENTE, non ADMIN-only) e stessa disciplina di migrazione.

### Cosa NON cambia in questa storia

Nessuna modifica a `NavPubblica.tsx`, `.accedi`, il logo/nome del Settore Volley esistenti, l'icona Facebook o il link "Preferenze cookie" nel footer. Nessuna modifica a `lib/auth/route-guard.ts` (`/app/impostazioni` è già ADMIN+DIRIGENTE dalla Story 18.13). Nessuna modifica a `app/page.tsx`/altre pagine pubbliche oltre a `HeaderPubblico.tsx`/`FooterPubblico.tsx` (componenti condivisi, l'effetto si propaga automaticamente a tutte e 5 le pagine pubbliche che li montano).

### Project Structure Notes

- File nuovi: `prisma/migrations/20260815010000_add_polisportiva/migration.sql`, `lib/storage/logo-polisportiva.ts`, `lib/storage/logo-polisportiva.test.ts`, `app/app/(configurazione)/impostazioni/LogoPolisportivaForm.tsx`, `app/app/(configurazione)/impostazioni/SitoPolisportivaForm.tsx`.
- File modificati: `prisma/schema.prisma`, `lib/configurazione-applicazione.ts`, `lib/configurazione-applicazione.test.ts`, `app/app/(configurazione)/impostazioni/actions.ts`, `app/app/(configurazione)/impostazioni/actions.test.ts`, `app/app/(configurazione)/impostazioni/page.tsx`, `app/HeaderPubblico.tsx`, `app/HeaderPubblico.module.css`, `app/FooterPubblico.tsx`, `app/FooterPubblico.module.css`, `lib/guida/contenuti.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 18, Story 18.20] — testo originale, 4 punti aperti risolti con l'utente prima di questa storia (vedi sezione Decisioni sopra).
- [Source: _bmad-output/implementation-artifacts/18-14-foto-sfondo-hero.md] — precedente diretto per bucket/migrazione/Server Action/form di upload (mirror quasi 1:1).
- [Source: lib/configurazione-applicazione.ts righe 51-65] — mirror per `leggiUrlSitoPolisportiva`/`salvaUrlSitoPolisportivaAction`.
- [Source: app/HeaderPubblico.tsx, app/FooterPubblico.tsx] — componenti condivisi da modificare, letti per intero prima di scrivere questa storia.
- [Source: app/app/(configurazione)/logo/actions.ts] — mirror storico di `caricaLogoAction` (Admin-only), non riusato qui deliberatamente (perimetro diverso, vedi Dev Notes).
- [Source: AGENTS.md, root del repo] — nota su Next.js non standard, non sostanzialmente applicabile.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (dev-story workflow)

### Debug Log References

Nessuno - implementazione lineare, nessun blocco/HALT incontrato.

### Completion Notes List

- Tutti e 10 i Task completati esattamente come pianificato, nessuna deviazione.
- Migrazione (`prisma/migrations/20260815010000_add_polisportiva/migration.sql`): campo `urlSitoPolisportiva` + bucket `logo-polisportiva` mirror esatto di `foto-hero` (Story 18.14), migrazione corretta fin da subito (SELECT pubblica + INSERT/UPDATE ADMIN+DIRIGENTE, tutte ristrette al path fisso).
- `lib/storage/logo-polisportiva.ts`, `lib/configurazione-applicazione.ts` (`leggiUrlSitoPolisportiva`/`salvaUrlSitoPolisportiva`), `caricaLogoPolisportivaAction`/`salvaUrlSitoPolisportivaAction` in `impostazioni/actions.ts` — tutti mirror esatti dei precedenti diretti (`foto-hero.ts`/`caricaFotoHeroAction`, `urlPaginaFacebook`/`salvaUrlPaginaFacebookAction`).
- Rinominata `urlPaginaFacebookValido` → `urlEsternoValido` in `actions.ts` (riuso diretto per `salvaUrlSitoPolisportivaAction`, invece di duplicare la stessa validazione — nome generico più accurato, unico call-site esistente aggiornato).
- Nuova sezione "Polisportiva" su `/app/impostazioni` (2 form: upload logo + URL sito), riuso diretto di `.anteprimaFotoHero` per l'anteprima (nessuna nuova classe CSS necessaria, stessa forma).
- `HeaderPubblico.tsx`: logo Polisportiva aggiunto tra `<NavPubblica />` e `<Link href="/accedi">` (posizione letterale richiesta dall'utente) — cliccabile solo se anche l'URL è impostato, altrimenti solo `<img>`.
- `FooterPubblico.tsx`: prima chiamata Storage in questo componente (`createClient()` aggiunto per la prima volta) — logo Polisportiva dopo il copyright, prima dell'icona Facebook, stessa struttura condizionale dell'header.
- Guida in-app (`lib/guida/contenuti.ts`) aggiornata per la voce `/app/impostazioni`, regola permanente del progetto.
- 26 nuovi test (6 in `lib/storage/logo-polisportiva.test.ts`, 6 in `lib/configurazione-applicazione.test.ts`, 14 in `impostazioni/actions.test.ts`). 1208/1208 test Vitest passati, 0 errori tsc/eslint (nuovi warning `<img>` attesi, mirror degli stessi warning preesistenti su ogni altra `<img>` del progetto), build produzione riuscita (tutte le 5 rotte pubbliche presenti nell'output).
- Nessuna migrazione applicata al DB nel sandbox (nessun accesso Supabase), da applicare in produzione come le precedenti.
- Verifica visiva dal vivo NON eseguibile in questo sandbox — demandata all'utente (ora possibile con `npm run cf:preview`, usato con successo per la Story 18.19): confermare che il logo compaia correttamente in entrambi i punti, sia cliccabile solo quando l'URL è impostato, e che l'header non vada in disordine con il quarto elemento aggiunto (brand, nav, logo Polisportiva, Accedi).

### File List

- `prisma/migrations/20260815010000_add_polisportiva/migration.sql` (nuovo)
- `prisma/schema.prisma`
- `lib/storage/logo-polisportiva.ts` (nuovo)
- `lib/storage/logo-polisportiva.test.ts` (nuovo)
- `lib/configurazione-applicazione.ts`
- `lib/configurazione-applicazione.test.ts`
- `app/app/(configurazione)/impostazioni/actions.ts`
- `app/app/(configurazione)/impostazioni/actions.test.ts`
- `app/app/(configurazione)/impostazioni/page.tsx`
- `app/app/(configurazione)/impostazioni/LogoPolisportivaForm.tsx` (nuovo)
- `app/app/(configurazione)/impostazioni/SitoPolisportivaForm.tsx` (nuovo)
- `app/HeaderPubblico.tsx`
- `app/HeaderPubblico.module.css`
- `app/FooterPubblico.tsx`
- `app/FooterPubblico.module.css`
- `lib/guida/contenuti.ts`

### Change Log

- 2026-08-15: File di story creato (create-story workflow) — i 4 punti aperti di `epics.md` risolti esplicitamente con l'utente prima della scrittura (nessun social, solo il sito; logo in header E footer; ADMIN+DIRIGENTE). Status: backlog → ready-for-dev.
- 2026-08-15: Implementata Story 18.20 (dev-story workflow) — logo Polisportiva caricabile da Admin/Dirigente, mostrato nell'header (dopo il menu, prima di Accedi) e nel footer di ogni pagina pubblica, cliccabile se l'URL del sito è impostato. 1208/1208 test Vitest passati (+26), 0 errori tsc/eslint, build produzione riuscita. Status: ready-for-dev → review.
- 2026-08-15: Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor, in parallelo con la review della Story 18.19) — 2 patch applicate, 0 difetti bloccanti rimasti aperti. 1208/1208 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: review → done.

## Review Findings

- [x] [Review][Patch] Selettore CSS `.logoPolisportiva img` non colpiva mai la variante senza link — `HeaderPubblico.tsx`/`FooterPubblico.tsx` applicano la classe in due varianti: sull'`<a>` che avvolge un `<img>` nudo (link presente) oppure direttamente sull'`<img>` (nessun link, `urlSitoPolisportiva` non impostato). Il selettore discendente da solo colpiva solo la prima variante — nel secondo caso il logo compariva senza alcun vincolo `max-height`/`max-width`. Risolto in entrambi i file CSS con `.logoPolisportiva img, img.logoPolisportiva { ... }`.
- [x] [Review][Patch] `max-width` disallineato tra header (120px) e footer (160px), nonostante il commento sorgente in `FooterPubblico.module.css` dichiarasse esplicitamente "stessa dimensione... per coerenza tra i due punti in cui compare". Unificato a 120px in entrambi i file.
