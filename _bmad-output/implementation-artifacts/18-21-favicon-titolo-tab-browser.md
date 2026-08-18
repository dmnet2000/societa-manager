---
baseline_commit: 77712b7ba019aacd5c357a35e88900ca1e81fc6b
---

# Story 18.21: Favicon e titolo della scheda del browser dinamico dal nome del Settore

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Decisioni prese con l'utente prima di scrivere questa storia

`epics.md` lasciava aperti 3 punti. **Chiesti tutti esplicitamente all'utente prima della scrittura** (stessa prassi già seguita per la Story 18.20), risposte:

1. **Sorgente della favicon**: **il logo reale configurato da Admin** (`/app/logo`, `lib/storage/logo.ts`, bucket `logo-applicazione`, già usato in `HeaderPubblico.tsx`/`app/(configurazione)/logo/`), **non** l'asset placeholder statico che `epics.md` proponeva come "il logo reale del club esistente". **Correzione a un'affermazione fattualmente errata di `epics.md`**: verificato aprendo `public/icons/icon-192.png` (546 byte, 192×192) — è un quadrato a **tinta unita** (blu/viola), lo stesso placeholder descritto correttamente nel commento sorgente di `app/manifest.ts` ("placeholder a tinta unita... non il logo reale del club", Story 14.1), non il logo del club. Usarlo com'è come favicon non sarebbe "riconoscibile come il logo della società" (AC #1) — da qui la decisione di leggere invece il logo dinamico. **Fallback**: se nessun logo è mai stato caricato (`leggiInfoLogo(supabase).esiste === false`), si ricade sull'asset placeholder statico esistente (`/icons/icon-192.png`) — mai un'icona rotta/assente, stesso principio fail-soft già applicato ovunque nell'Epic 18.
2. **Nome dell'app nel manifest PWA** (`app/manifest.ts`, oggi statico `"Società Manager"`/`"Soc. Manager"`): **va reso dinamico anche lui**, non solo il titolo della scheda del browser — estende lo scope della storia rispetto al testo letterale dell'utente in `epics.md` (che parlava solo di "tab del browser"), su richiesta esplicita.
3. **Fallback quando `nomeSettore` non è configurato**: **`"Settore Volley"`** — stesso fallback già in uso in 3 punti del codice (`HeaderPubblico.tsx`, `FooterPubblico.tsx`, `app/page.tsx`: `nomeVisualizzato = nomeSettore ?? "Settore Volley"`), riusato identico qui per coerenza.

Non riaprire queste decisioni durante lo sviluppo.

## Story

As a Visitatore o Utente autenticato,
I want vedere un'icona (favicon) nella scheda del browser e il nome reale del Settore nel titolo della scheda,
so that riconosca subito il sito anche con più schede aperte, invece del testo generico "Società Manager".

## Acceptance Criteria

1. **Given** un Visitatore o Utente autenticato **When** apre qualunque pagina del sito (pubblica o area applicativa, `/` e `/app`) **Then** vede un'icona (favicon) nella scheda del browser — il logo reale della società se un Admin/Dirigente ne ha caricato uno (`leggiInfoLogo`/`urlPubblicoLogo`, `lib/storage/logo.ts`), altrimenti l'asset placeholder statico esistente (`/icons/icon-192.png`), mai un'icona rotta/assente
2. **And** il titolo della scheda del browser mostra il nome reale del Settore (`leggiNomeSettore()`, `lib/configurazione-applicazione.ts`), non più il testo statico `"Società Manager"`
3. **And** se il nome del Settore non è configurato (`nomeSettore` nullo), la scheda mostra `"Settore Volley"` invece di un titolo vuoto (stesso fallback già in uso in `HeaderPubblico.tsx`/`FooterPubblico.tsx`/`app/page.tsx`)
4. **And** il manifest PWA (`app/manifest.ts`, `name`/`short_name`) riflette lo stesso nome dinamico del Settore (con lo stesso fallback `"Settore Volley"`/abbreviazione coerente per `short_name`) invece del testo statico attuale — nessun impatto sull'icona del manifest (resta l'asset placeholder quadrato esistente, non il logo Admin: dimensioni fisse 192×192/512×512 richieste dallo standard PWA, il logo Admin non ha vincoli di dimensione/formato, Story 14.1)
5. **And** quando il logo cambia (nuovo upload o rimozione lato Admin), la favicon riflette il cambiamento senza restare bloccata su una versione in cache del browser — stesso meccanismo di cache-busting `?v=<aggiornatoIl>` già usato in `HeaderPubblico.tsx` per lo stesso asset
6. **And** nessuna regressione sulla generazione statica delle pagine che oggi non la richiedono (`/recupera-password`, `/reimposta-password` — le uniche due rotte `page.tsx` del progetto senza `force-dynamic`, verificato) — confermare nell'output di build che restano statiche dopo il passaggio da `metadata` a `generateMetadata` nel root layout

## Tasks / Subtasks

- [x] Task 1: `app/layout.tsx` — da `metadata` statico a `generateMetadata` dinamico (AC: #1, #2, #3, #5)
  - [x] Sostituito `export const metadata: Metadata = {...}` con `export async function generateMetadata(): Promise<Metadata>` — root layout altrimenti invariato
  - [x] Dentro `generateMetadata()`: `Promise.all([leggiNomeSettore().catch(...), leggiInfoLogo(supabase).catch(...)])`, stesso pattern fail-soft di `HeaderPubblico.tsx` — **deviazione dal piano**: `supabase` viene da `createAdminClient()` (`@/lib/auth-admin/client`), non da `createClient()` come pianificato (vedi Dev Notes, "Scoperta reale: `createClient()` avvelenava la generazione statica")
  - [x] `title: nomeSettore ?? "Settore Volley"`
  - [x] `icons: { icon: info.esiste ? \`${urlPubblicoLogo(supabase)}?v=...\` : "/icons/icon-192.png", apple: "/icons/icon-192.png" }` — `apple`/`appleWebApp` invariati
  - [x] `description` invariata
- [x] Task 2: `app/manifest.ts` — nome dinamico (AC: #4)
  - [x] `export default function manifest()` → `export default async function manifest(): Promise<MetadataRoute.Manifest>` — firma accettata, nessun errore tsc/build
  - [x] `leggiNomeSettore().catch(() => null)` → `name: nomeSettore ?? "Settore Volley"`, `short_name: nomeSettoreAbbreviato(nomeVisualizzato)` — nuova funzione pura `nomeSettoreAbbreviato` in `lib/configurazione-applicazione.ts` (troncamento a 12 caratteri, nessuna libreria)
  - [x] `icons`/`start_url`/`scope`/`display`/`background_color`/`theme_color` invariati
- [x] Task 3: Verifica build statico/dinamico (AC: #6)
  - [x] `npm run build` eseguito **due volte** (baseline via `git stash` + con le modifiche) per un confronto diretto riga per riga dell'output `Route (app)` — vedi Dev Notes, "Scoperta reale" per il dettaglio
  - [x] **Regressione reale trovata e corretta**, non la "ricaduta attesa" ipotizzata in fase di creazione story: `createClient()` (pianificato in Task 1) chiama `cookies()` da `next/headers` (Dynamic API) — usarlo dentro `generateMetadata()` del ROOT layout marcava **tutte** le rotte come dinamiche, incluse `/recupera-password`, `/registrati`, `/_not-found` (da `○` a `ƒ` nel confronto baseline/con-modifiche). Non c'entra la "streaming metadata"/`cacheComponents` ipotizzata nella nota tecnica originale. Risolto sostituendo `createClient()` con `createAdminClient()` (`@/lib/auth-admin/client`, nessuna Dynamic API) — rebuild successivo conferma l'output identico alla baseline (stesse rotte `○`/`ƒ`, incluso `/reimposta-password` che era già `ƒ` **prima** di questa storia, non una regressione)
- [x] Task 4: Guida in-app (regola permanente del progetto)
  - [x] `lib/guida/contenuti.ts`, voce `rotta: "/app/logo"`: aggiunta una riga che spiega che il logo caricato diventa anche la favicon
- [x] Task 5: Test (AC: tutti)
  - [x] **Deviazione dal piano**: `app/manifest.test.ts` esisteva già (Story 14.1) — non rilevato in fase di create-story, aggiornato per `manifest()` ora async (`await`) + 4 nuovi casi (name dal nomeSettore configurato, fallback "Settore Volley" quando nullo, fallback quando la lettura DB fallisce, truncation dello `short_name`)
  - [x] `nomeSettoreAbbreviato` testata in isolamento in `lib/configurazione-applicazione.test.ts` (3 nuovi casi: invariato ≤12 caratteri, troncato se più lungo, stringa vuota)
  - [x] Suite Vitest esistente resta verde
- [x] Task 6: Verifica finale (AC: tutti)
  - [x] `npx vitest run` — 92 file, 1215 test, tutti passati
  - [x] `npx tsc --noEmit` pulito
  - [x] `npm run lint` — 0 errori, solo warning preesistenti (`<img>`) invariati, nessuno nuovo
  - [x] `npm run build` pulito (vedi Task 3) — output verificato per AC #6
  - [x] Verifica manuale dal vivo **non eseguibile in questo sandbox** (vedi Dev Notes): `npm run dev` strutturalmente rotto (motore Prisma WASM), `npm run cf:preview` non ritentato in questa sessione dopo il fix — demandata esplicitamente all'utente

### Review Findings

- [x] [Review][Patch] `generateMetadata` (`app/layout.tsx`) non ha alcun test automatico — a differenza della logica equivalente in `app/manifest.ts`, il fallback del title, il ramo favicon (logo presente/assente), il cache-buster e la gestione errori restano interamente non verificati; le Completion Notes della storia dichiarano il Task 5 di test come "AC: tutti" senza includerlo. [app/layout.tsx:20-65] — risolto: nuovo `app/layout.test.ts` (9 casi: title da nomeSettore, fallback "Settore Volley" configurato/DB-fail, favicon logo presente/assente/fail-soft, cache-buster, apple/appleWebApp invariati, description invariata, fallback su `createAdminClient()` che lancia).
- [x] [Review][Patch] `createAdminClient()` dentro `generateMetadata` (`app/layout.tsx:33`) non è protetto da try/catch, a differenza delle due chiamate async successive che hanno ciascuna un `.catch()` — se le variabili d'ambiente Supabase fossero mai mancanti/malformate, la chiamata lancerebbe sincronamente e romperebbe la generazione dei metadati per ogni singola rotta del sito (pubblica e `/app`), un raggio d'impatto più ampio di ogni altro punto del codice che già usa `createAdminClient()` senza guardia. [app/layout.tsx:33] — risolto: l'intero corpo di `generateMetadata` (dalla creazione del client in poi) è ora avvolto in un try/catch dedicato, che ricade sulla stessa metadata statica sicura (title/icon di fallback) usata prima di questa storia. Test di regressione aggiunto.
- [x] [Review][Patch] `leggiNomeSettore()`/`leggiInfoLogo()` vengono chiamate in modo indipendente e ridondante nella stessa richiesta — da `generateMetadata` (`app/layout.tsx`) e di nuovo da `HeaderPubblico.tsx` (rotte pubbliche)/`NavBar.tsx` (rotte `/app`), nessuna delle due funzioni è avvolta in `React.cache()` — questa storia raddoppia le letture live DB/Storage per ogni caricamento pagina rispetto a prima (il root layout non ne faceva nessuna). [app/layout.tsx:33-44, app/HeaderPubblico.tsx, app/NavBar.tsx] — parzialmente risolto: `leggiNomeSettore()` avvolta in `React.cache()` (`lib/configurazione-applicazione.ts`), verificato empiricamente che non introduce memoizzazione indesiderata fuori da un render React (probe dedicato in Vitest, rimosso dopo la verifica) — dedup reale nel runtime RSC di Next, nessun impatto sui test. `leggiInfoLogo(supabase)` **non** cachata: `generateMetadata` usa `createAdminClient()` mentre `HeaderPubblico`/`NavBar` usano `createClient()` (client diversi per design, per non "avvelenare" le rotte statiche con `cookies()` — vedi Dev Notes sopra) — `React.cache()` dedup per identità degli argomenti, quindi client diversi restano cache-miss; una vera unificazione richiederebbe una ristrutturazione più ampia, fuori scope per un patch di review. Aggiunta come deferred separato.
- [x] [Review][Patch] `nomeSettoreAbbreviato` (`lib/configurazione-applicazione.ts`) usa `.slice(0,12)` su unità UTF-16 senza consapevolezza dei confini di parola né ellissi, e può spezzare una coppia surrogata (es. un'emoji nel nome del Settore), producendo uno `short_name` malformato. [lib/configurazione-applicazione.ts:28-32] — risolto: troncamento tramite `Array.from(...).slice(0,12).join("")` (per code point, non per unità UTF-16) — i 3 test esistenti restano verdi invariati (nessuna differenza per stringhe solo-BMP).
- [x] [Review][Patch] `lib/guida/contenuti.ts` documenta solo l'effetto favicon/titolo di questa storia, non la modifica parallela in `app/manifest.ts` (AC #4) — il nome/nome abbreviato dell'app PWA mostrato nella home screen quando installata ora deriva anch'esso dal nome del Settore, non documentato nella guida in-app, contro la convenzione permanente del progetto (aggiornare la guida a ogni story che tocca una funzionalità già documentata). [lib/guida/contenuti.ts:206-212] — risolto: aggiunta una riga alla voce `/app/logo` che spiega l'effetto sul nome PWA e sul troncamento a 12 caratteri.
- [x] [Review][Patch] Il fallback `"Settore Volley"` è duplicato come stringa letterale sia in `app/layout.tsx` sia in `app/manifest.ts` invece di una costante condivisa (es. esportata da `lib/configurazione-applicazione.ts`) — libero di disallinearsi a una futura modifica. [app/layout.tsx:47, app/manifest.ts:32] — risolto: nuova costante `NOME_SETTORE_FALLBACK` esportata da `lib/configurazione-applicazione.ts`, importata in entrambi i punti al posto del letterale duplicato.
- [x] [Review][Defer] `info.aggiornatoIl` può essere `null` anche quando `info.esiste` è `true` (se Supabase Storage `list()` omettesse `updated_at`) — il cache-buster `?v=` degraderebbe silenziosamente a stringa vuota, vanificando l'anti-cache che il commento sorgente dichiara di garantire — deferred, pre-existing: stesso identico pattern già presente e mai guardato in `HeaderPubblico.tsx` (Story 7.2, review fix), qui riprodotto fedelmente, non introdotto da questa storia. [app/layout.tsx:55]
- [x] [Review][Defer] Nessun controllo automatico (CI/test) che verifichi che l'output di build resti statico per `/recupera-password`, `/registrati`, `/_not-found` — la verifica oggi è manuale (confronto `npm run build` con `git stash`, Task 3) — deferred, pre-existing: stesso principio già in uso per ogni story precedente che tocca il root layout, non una lacuna introdotta qui. [app/layout.tsx]

## Dev Notes

### Scoperta reale (durante lo sviluppo): `createClient()` avvelenava la generazione statica, non un problema di "streaming metadata"

La nota tecnica originale di questa storia (sotto, lasciata per cronologia) ipotizzava che la sola presenza di una query DB non cachata dentro `generateMetadata` potesse mettere a rischio il prerendering statico, e si affidava alla "streaming metadata" documentata da Next.js per escluderlo. **Verificato col build reale (`npm run build`, due volte: baseline via `git stash` vs con le modifiche, confronto riga per riga dell'output `Route (app)`) che l'ipotesi era incompleta**: la causa reale della regressione non era la query DB in sé, ma `createClient()` (`@/lib/supabase/server`) — che chiama internamente `cookies()` da `next/headers`, una **Dynamic API**. Chiamare `cookies()` in un Server Component (anche dentro `generateMetadata`) forza l'**intera rotta** a renderizzare dinamicamente, indipendentemente da qualunque meccanismo di streaming metadata. Usato nel ROOT layout, questo "avvelenava" ogni rotta del progetto: nel primo build con le modifiche, `/recupera-password`/`/registrati`/`/_not-found` sono passate da `○` (Static) a `ƒ` (Dynamic) rispetto alla baseline — regressione reale, esattamente il rischio che l'AC #6 voleva prevenire.

**Fix**: sostituito `createClient()` con `createAdminClient()` (`@/lib/auth-admin/client`, client service-role via `@supabase/supabase-js`, **nessuna** chiamata a `cookies()`/altre Dynamic API) — stesso pattern già stabilito da `lib/email/invia-email.ts`/`lib/facebook-graph.ts` per leggere dati da un contesto senza sessione. Nessuna sessione/cookie era comunque necessaria qui (solo lettura di un bucket Storage pubblico e di una riga di configurazione non-RLS). Rebuild successivo: output identico alla baseline (`/recupera-password`/`/registrati`/`/_not-found` di nuovo `○`; `/reimposta-password` resta `ƒ`, ma **era già `ƒ` nella baseline stessa**, prima di questa storia — non una regressione, semplice conferma che quella pagina non era mai stata statica).

**Lezione per story future**: la parte vera della documentazione Next.js sulla streaming metadata resta corretta e si applica (query DB non cachate in `generateMetadata` non forzano di per sé una rotta a diventare dinamica) — ma **qualunque chiamata a `cookies()`/`headers()` in un root layout, anche indiretta tramite un helper come `createClient()`, è un problema categoricamente diverso e più grave**, perché si propaga a ogni rotta figlia. Prima di aggiungere una lettura di sessione/cookie a un file che viene eseguito per ogni rotta (root layout, middleware/proxy), verificare sempre con un build reale comparato a una baseline, non fidarsi della sola documentazione generale.

<details>
<summary>Nota tecnica originale (fase di create-story, parzialmente superata — vedi sopra)</summary>

`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` (versione di Next.js installata in questo progetto, **non quella dell'addestramento** — AGENTS.md impone di verificare qui prima di assumere comportamenti standard) descrive esplicitamente la **streaming metadata**: se il resto della pagina è prerenderizzabile e `generateMetadata` introduce comportamento dinamico (una query DB non cachata, come qui), Next.js **non** blocca il prerendering — genera comunque lo shell statico e "streamma" i metadati risolti dopo, appesi al `<body>` invece che nel `<head>` iniziale. Questo comportamento vale di default; cambia solo se `cacheComponents` è attivo in `next.config.ts` — verificato che non lo è in questo progetto. **Questa parte resta corretta**, ma da sola non bastava: il problema reale era `cookies()` dentro `createClient()`, non la query DB (vedi sopra).

</details>

### Ambiente locale per la verifica dal vivo (Task 3/6) — stato noto, verificato in questa sessione (2026-08-16)

- `npm run dev` (`next dev`, Node puro) è **strutturalmente rotto** per ogni pagina che tocca Prisma: `lib/prisma.ts` forza incondizionatamente il motore WASM (`@prisma/client/wasm`, pensato per `workerd`/Cloudflare Workers), che Node.js puro non sa caricare (`ERR_UNKNOWN_FILE_EXTENSION` su `query_engine_bg.wasm`). Non ritentarlo per una verifica dal vivo.
- `npm run cf:preview` (`opennextjs-cloudflare build && wrangler dev`, runtime `workerd` reale) ha funzionato con successo nella Story 18.19/18.20 (stessa macchina, il giorno prima) — un tentativo di questa sessione è invece fallito con `EBUSY` su `.open-next/assets` (lock transitorio, non un limite strutturale). Ritentarlo cancellando prima `.open-next/` se necessario, prima di concludere che sia rotto.

### Perché non toccare `appleWebApp`/`icons.apple`

La Story 14.1 ha già stabilito (con una review dedicata) che Safari/iOS richiede `apple-touch-icon`/`apple-mobile-web-app-capable` dichiarati esplicitamente nella Metadata API (non basta il solo Web App Manifest) — comportamento verificato e già funzionante. L'utente ha parlato solo del "tab del browser" (favicon standard desktop), non dell'icona Home Screen iOS: questa storia lascia `apple`/`appleWebApp` invariati, tocca solo `icons.icon` (nuovo) e `title`.

### Perché il logo Admin non ha vincoli di dimensione/formato (a differenza delle icone del manifest PWA)

Story 14.1 (Dev Notes, decisione presa con l'utente): il logo reale del club caricato da Admin (`/app/logo`) non è quadrato (437×469 nell'asset reale del club) e nessuna libreria di image-processing è installata nel progetto per ridimensionarlo — per questo le icone del manifest PWA (Task 2, `app/manifest.ts`) restano l'asset placeholder quadrato esistente, non il logo Admin. La favicon (Task 1) invece **può** usare il logo Admin così com'è: i browser scalano automaticamente qualunque immagine passata a `icons.icon` nell'area della scheda (tipicamente 16×16/32×32), un lieve schiacciamento su un'immagine non quadrata è un compromesso visivo accettato implicitamente dalla Decisione #1 con l'utente, non un difetto da correggere qui.

### Nessun altro file esporta `metadata`/`generateMetadata` oggi

Verificato con una ricerca su tutto `app/`: `app/layout.tsx` è l'**unico** file del progetto che esporta `metadata`/`generateMetadata` — nessuna pagina (`page.tsx`) definisce un proprio `title`/`icons` che potrebbe entrare in conflitto con `title.template`/merge (regole di "Ordering"/"Merging" della Metadata API). Il cambiamento a `generateMetadata()` nel root layout si applica quindi uniformemente a ogni rotta (AC #1: "qualunque pagina... pubblica o area applicativa") senza casi speciali da gestire.

### Cosa NON cambia in questa storia

Nessuna modifica a `lib/storage/logo.ts`, `HeaderPubblico.tsx`, `app/(configurazione)/logo/*` (upload/gestione del logo, invariati — questa storia solo *legge* lo stesso logo già esistente, non ne cambia la gestione). Nessuna modifica a `icons.apple`/`appleWebApp` (vedi sopra). Nessuna modifica alle icone del manifest PWA, solo a `name`/`short_name` (Decisione #2). Nessuna nuova libreria di image-processing.

### Project Structure Notes

- Nessun file nuovo.
- File modificati: `app/layout.tsx` (statico → `generateMetadata`, `createAdminClient` non `createClient`), `app/manifest.ts` (statico → dinamico), `app/manifest.test.ts` (esistente, non anticipato in fase di create-story — aggiornato per l'async + 4 nuovi casi), `lib/configurazione-applicazione.ts` (nuova funzione pura `nomeSettoreAbbreviato`), `lib/configurazione-applicazione.test.ts` (3 nuovi casi), `lib/guida/contenuti.ts` (voce `/app/logo`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 18, Story 18.21] — testo originale, 3 punti aperti risolti con l'utente prima di questa storia (vedi sezione Decisioni sopra), inclusa la correzione della premessa errata sull'asset placeholder.
- [Source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md] — streaming metadata (parzialmente rilevante, vedi Dev Notes "Scoperta reale" per il limite di questa fonte).
- [Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md] — convenzioni favicon/icon/apple-icon della Metadata API.
- [Source: app/layout.tsx, app/manifest.ts, app/manifest.test.ts] — file modificati, letti per intero in questa sessione.
- [Source: lib/storage/logo.ts, lib/configurazione-applicazione.ts] — `leggiInfoLogo`/`urlPubblicoLogo`/`leggiNomeSettore`, riusati direttamente, non duplicati.
- [Source: lib/supabase/server.ts] — `createClient()`, individuata come causa reale della regressione (chiama `cookies()` da `next/headers`).
- [Source: lib/auth-admin/client.ts] — `createAdminClient()`, usata al posto di `createClient()` nel fix (nessuna Dynamic API), stesso pattern già in uso in `lib/email/invia-email.ts`/`lib/facebook-graph.ts`.
- [Source: app/HeaderPubblico.tsx] — pattern di riferimento per la lettura fail-soft in `Promise.all` e per il cache-buster `?v=`.
- [Source: _bmad-output/implementation-artifacts/14-1-manifest-e-icone-pwa.md] — origine dell'asset placeholder `public/icons/icon-192.png`/`icon-512.png`, decisione presa con l'utente sul logo reale non quadrato.
- [Source: next.config.ts] — confermato nessun flag `cacheComponents` attivo.
- [Source: AGENTS.md, root del repo] — Next.js non standard, verificare `node_modules/next/dist/docs/` prima di scrivere codice basato su convenzioni da addestramento.
- [Source: build reale (`npm run build`), confronto baseline via `git stash` vs con le modifiche] — fonte primaria che ha corretto l'ipotesi iniziale, non la documentazione da sola.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (create-story + dev-story workflow)

### Debug Log References

- Regressione scoperta e risolta durante Task 3: `npm run build` con `createClient()` (piano originale) produceva `/recupera-password`, `/registrati`, `/_not-found` come `ƒ` Dynamic invece di `○` Static (confrontato con una baseline via `git stash`). Causa: `createClient()` chiama `cookies()` (Dynamic API) — usata dentro `generateMetadata()` del root layout, tainta ogni rotta del progetto. Fix: `createAdminClient()` al posto di `createClient()`. Rebuild successivo: output identico alla baseline.

### Completion Notes List

- File di story creato (create-story workflow) — i 3 punti aperti di `epics.md` risolti esplicitamente con l'utente prima della scrittura: favicon dal logo Admin dinamico (non l'asset placeholder, correggendo una premessa fattualmente errata di `epics.md` verificata aprendo l'immagine reale), manifest PWA reso dinamico anche lui (scope esteso su richiesta esplicita), fallback "Settore Volley".
- Implementata (dev-story workflow): `app/layout.tsx` da `metadata` statico a `generateMetadata` async (title dal `nomeSettore`, favicon dal logo Admin con cache-buster e fallback sul placeholder statico); `app/manifest.ts` da sincrono a async (`name`/`short_name` dinamici, icone/resto invariati); nuova funzione pura `nomeSettoreAbbreviato` (`lib/configurazione-applicazione.ts`) per il troncamento a 12 caratteri dello `short_name`; guida in-app aggiornata (`/app/logo`).
- **Deviazione dal piano, scoperta durante lo sviluppo (Task 3)**: il piano originale usava `createClient()` (Supabase con cookie di sessione) in `generateMetadata()` — questo ha causato una regressione reale confermata col build (`/recupera-password`/`/registrati`/`/_not-found` da statiche a dinamiche), perché `createClient()` chiama `cookies()` (Dynamic API) che tainta l'intera rotta quando usata nel root layout. Corretto con `createAdminClient()` (nessuna Dynamic API, stesso pattern di `lib/email/invia-email.ts`). Vedi Dev Notes per il dettaglio completo — informazione utile per story future che toccano il root layout.
- **Deviazione dal piano**: `app/manifest.test.ts` esisteva già (Story 14.1), non anticipato in fase di create-story (l'analisi aveva assunto "nessun test per `app/manifest.ts`"). Aggiornato per l'async (`await manifest()`) + 4 nuovi casi (name dinamico, fallback su nomeSettore nullo, fallback su errore DB, truncation short_name).
- 1215/1215 test Vitest passati (92 file, +7 rispetto alla baseline: 4 in `app/manifest.test.ts`, 3 in `lib/configurazione-applicazione.test.ts`), `npx tsc --noEmit` pulito, `npm run lint` 0 errori (17 warning preesistenti invariati, nessuno nuovo), `npm run build` pulito con output verificato identico alla baseline per le rotte statiche/dinamiche esistenti (AC #6).
- Verifica visiva dal vivo NON eseguibile in questo sandbox (`npm run dev` strutturalmente rotto per il motore Prisma WASM; `npm run cf:preview` non ritentato in questa sessione dopo il fix di Task 3) — demandata esplicitamente all'utente: favicon coerente col logo caricato (o placeholder se assente), titolo scheda con nome Settore reale, fallback "Settore Volley" se non configurato.
- **Code review eseguita** (bmad-code-review, Blind Hunter + Edge Case Hunter + Verification Gap + Acceptance Auditor in parallelo): 0 decision-needed, 6 patch, 2 defer, 4 dismessi come rumore dopo verifica diretta del codice (in particolare: la tesi "le pagine statiche congelano i metadati al build" è stata smentita leggendo `node_modules/next/dist/docs/.../generate-metadata.md`, la versione di Next.js di questo progetto per l'AGENTS.md; il fallback su stringa vuota di `nomeSettore` è risultato irraggiungibile perché `salvaNomeSettoreAction` normalizza `""` a `null` prima di salvare). Tutti i 6 patch applicati su scelta dell'utente ("applica tutti"): test aggiunti per `generateMetadata` (prima interamente non testata, `app/layout.test.ts` nuovo, 9 casi), `createAdminClient()` avvolto in try/catch dedicato con fallback sicuro, `leggiNomeSettore()` deduplicata con `React.cache()` (verificato empiricamente che non introduce memoizzazione indesiderata fuori da un render React — probe dedicato in Vitest, rimosso dopo la verifica), `nomeSettoreAbbreviato` corretta per non spezzare coppie surrogate, guida in-app estesa (nome PWA), costante condivisa `NOME_SETTORE_FALLBACK` al posto del letterale duplicato. `leggiInfoLogo` resta non deduplicabile con `React.cache()` tra `generateMetadata`/`HeaderPubblico.tsx`/`NavBar.tsx` (client Supabase diversi per design), documentato come deferred. Verifica finale completa: 1235/1235 test Vitest passati (94 file, +9 rispetto all'ultimo stato noto del progetto — 1226 dopo la chiusura di Story 11.4 — tutti e 9 i nuovi test sono in `app/layout.test.ts`), `npx tsc --noEmit` pulito, `npm run lint` 0 errori (solo warning preesistenti invariati), `npm run build` pulito con output di generazione statica/dinamica verificato identico alla baseline (nessuna regressione su AC #6).

### File List

- `app/layout.tsx` (modificato)
- `app/layout.test.ts` (nuovo)
- `app/manifest.ts` (modificato)
- `app/manifest.test.ts` (modificato)
- `lib/configurazione-applicazione.ts` (modificato)
- `lib/configurazione-applicazione.test.ts` (modificato)
- `lib/guida/contenuti.ts` (modificato)

## Change Log

- 2026-08-16: File di story creato (create-story workflow) — i 3 punti aperti di `epics.md` risolti esplicitamente con l'utente prima della scrittura (favicon dal logo Admin dinamico, correggendo una premessa errata di `epics.md`; manifest PWA reso dinamico anche lui; fallback "Settore Volley"). Status: backlog → ready-for-dev.
- 2026-08-16: Implementata (dev-story workflow) — `app/layout.tsx`/`app/manifest.ts` dinamici, nuova `nomeSettoreAbbreviato`, guida in-app aggiornata. Regressione reale scoperta e corretta durante la verifica col build (`createClient()` → `createAdminClient()`, vedi Dev Notes "Scoperta reale"). 1215/1215 test Vitest passati (+7), 0 errori tsc/eslint, build produzione con output identico alla baseline sulle rotte statiche/dinamiche esistenti. Verifica visiva dal vivo non eseguibile nel sandbox, demandata all'utente. Status: ready-for-dev → review.
- 2026-08-18: Code review (Blind Hunter + Edge Case Hunter + Verification Gap + Acceptance Auditor, in parallelo) — 0 decision-needed, 6 patch, 2 defer, 4 dismessi (inclusa una tesi smentita leggendo la documentazione Next.js locale del progetto). Tutti i 6 patch applicati: test per `generateMetadata` (prima assenti), guardia try/catch su `createAdminClient()`, dedup `React.cache()` su `leggiNomeSettore()`, fix `nomeSettoreAbbreviato` su coppie surrogate, guida in-app estesa, costante fallback condivisa. 1235/1235 test Vitest passati (+9), 0 errori tsc/eslint, build produzione con output invariato. Status: review → done.
