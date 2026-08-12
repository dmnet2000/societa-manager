---
baseline_commit: e5f1252
---

# Story 18.6: Banner di consenso cookie

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Visitatore del sito pubblico,
I want essere informato sull'uso dei cookie e poter scegliere se accettarli o rifiutarli,
so that la mia privacy sia rispettata e la società sia in regola con la normativa cookie/GDPR.

## Acceptance Criteria

1. **Given** un Visitatore senza una scelta precedente registrata **When** visita per la prima volta una pagina pubblica del sito **Then** vede un banner che informa sull'uso dei cookie, con la possibilità di accettare o rifiutare i cookie non essenziali — nessun cookie non essenziale viene impostato prima della scelta
2. **And** la scelta del Visitatore viene ricordata (es. cookie tecnico proprio o `localStorage`), così il banner non ricompare a ogni visita successiva
3. **And** un link/pulsante "Preferenze cookie" permette di rivedere o cambiare la scelta in qualsiasi momento, anche dopo la prima visita
4. **And** il banner non blocca la navigazione (nessun cookie wall) — il Visitatore può continuare a usare il sito senza dover scegliere immediatamente
5. **And** nessuno strumento non essenziale (embed social di Story 18.5, eventuali futuri strumenti di analytics) viene caricato prima del consenso esplicito — vincolo da rispettare in ogni storia futura che introduce cookie non essenziali sulle pagine pubbliche, non solo in questa

## Tasks / Subtasks

- [x] Task 1: Lettura server-side del consenso + rendering condizionale (AC: #1, #2)
  - [x] In `app/page.tsx` letto il cookie con `cookies()` da `next/headers` — stesso pattern di `lib/supabase/server.ts`.
  - [x] **Deviazione consapevole dal piano**: `CookieBanner` è sempre montato (non condizionato come `mostraSponsor`/`mostraPartite`) — solo la sua *visibilità iniziale* dipende dal cookie (`mostraSubito`). Necessario per AC #3: se il componente sparisse del tutto una volta dato il consenso, non ci sarebbe alcun modo di riaprirlo senza un secondo meccanismo condiviso tra Server e Client. Nuovo modulo `lib/cookie-consenso.ts` centralizza nome cookie (`consenso_cookie`), durata (~6 mesi, 15768000s) e la funzione pura `eConsensoRegistrato` (true per `"accettato"`/`"rifiutato"`, false altrimenti) — unica fonte di verità condivisa tra lettura server e scrittura client.

- [x] Task 2: Componente banner interattivo (AC: #1, #2, #4)
  - [x] `app/CookieBanner.tsx` (`"use client"`), stessa separazione Server/Client di `NavBar.tsx`/`NavBarClient.tsx`. Pulsanti "Accetta"/"Rifiuta" impostano `document.cookie` direttamente (nessuna Server Action, preferenza non sensibile) e aggiornano lo stato locale.
  - [x] Nessun overlay/backdrop — banner fisso in fondo alla pagina, resto della pagina resta interamente utilizzabile (AC #4).

- [x] Task 3: Punto di richiamo "Preferenze cookie" (AC: #3)
  - [x] **Deviazione consapevole dal piano**: invece di un link separato nel footer di `page.tsx` (che avrebbe richiesto stato condiviso tra due Client Component distinti), il trigger "Preferenze cookie" è lo stato alternativo dello stesso `CookieBanner` — quando `visibile` è `false`, il componente renderizza solo un piccolo pulsante "Preferenze cookie" (sempre presente, non nel footer ma fisso in basso a sinistra) che riporta `visibile` a `true`. Stesso risultato dell'AC, implementazione più semplice (un solo componente, nessuno stato da sincronizzare tra due).

- [x] Task 4: Stile (AC: #1, #4)
  - [x] `app/CookieBanner.module.css` — ombra/raggio della superficie transitoria mirror del menu profilo (Story 9.4), nessun colore nuovo, pulsanti con `min-height: 44px` diretto (non affidato allo stretch del contenitore).

- [x] Task 5: Test (AC: tutti)
  - [x] `lib/cookie-consenso.test.ts` — 4 test su `eConsensoRegistrato` (accettato/rifiutato/undefined/valore sconosciuto).
  - [x] Nessun test di rendering su `CookieBanner.tsx`/`page.tsx` (convenzione consolidata del progetto).
  - [x] `npx vitest run` (1066/1066 passati), `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

### Review Findings

- [x] [Review][Decision] Ambito del banner limitato a "/" — **risolto con l'utente (2026-08-12): confermato lo scope attuale (solo "/")**. Nessun cookie non essenziale è oggi impostato su `/accedi`/`/registrati`/`/recupera-password`/`/reimposta-password`, quindi nessun rischio di conformità concreto ora — da riconsiderare quando servirà davvero (es. Story 18.5). Nessuna modifica di codice.
- [x] [Review][Patch] Cookie di consenso scritto senza `SameSite` esplicito [app/CookieBanner.tsx:12] — risolto: aggiunto `SameSite=Lax` esplicito alla scrittura del cookie.
- [x] [Review][Patch] Nessun helper esplicito "consenso agli strumenti non essenziali" riusabile dalla futura Story 18.5 (AC #5) [lib/cookie-consenso.ts] — risolto: nuova `haAccettatoCookieNonEssenziali`, testata.
- [x] [Review][Patch] Banner/pulsante fisso può sovrapporsi al footer senza margine di sicurezza [app/CookieBanner.module.css, app/home-pubblica.module.css] — risolto: `padding-bottom` aggiuntivo su `.footer` pari all'altezza del pulsante fisso.
- [x] [Review][Patch] `z-index: 100` non riconciliato con la scala esistente dell'app (NavBar drawer/overlay a 20/21) [app/CookieBanner.module.css] — risolto: abbassato a `30`.
- [x] [Review][Patch] Riaprire "Preferenze cookie" non mostra la scelta attualmente registrata (AC #3 "rivedere") [app/CookieBanner.tsx] — risolto: nuovo prop tipizzato `valoreIniziale` (da `parseValoreConsenso`), il banner riaperto mostra "Hai attualmente accettato/rifiutato i cookie non essenziali."
- [x] [Review][Patch] Copertura di test minima su `eConsensoRegistrato` (stringa vuota, case-sensitivity non testate) [lib/cookie-consenso.test.ts] — risolto: aggiunti i 2 casi mancanti + test per le 2 nuove funzioni.
- [x] [Review][Defer] Nessun `aria-live`/annuncio per il banner (`role="region"` non è assertivo) [app/CookieBanner.tsx] — deferred, richiede una decisione di design UX su come annunciarlo senza essere invasivo; non urgente dato che il banner non è bloccante (AC #4) e resta comunque raggiungibile via navigazione a landmark/tab.

## Dev Notes

### Decisioni di analisi (vedi `epics.md#Epic 18`, Story 18.6)

- **Dipende da Story 18.1** (done): richiede la home pubblica esistente su `app/page.tsx`.
- **Scope oggi**: nessun cookie/script non essenziale è realmente impostato in nessuna pagina del progetto in questo momento (verificato in analisi: nessun uso di `localStorage`/`document.cookie` in `app/`, grep eseguito su tutto l'albero). Questa storia introduce l'infrastruttura **prima** che serva davvero — il rischio concreto arriva con la Story 18.5 (embed social, che imposta cookie di terze parti Instagram/Facebook), oggi ancora in backlog.
- **`/app` (dashboard interna autenticata) esplicitamente fuori scope**: l'unico cookie lì è quello di sessione Supabase, strettamente necessario e già esente dall'obbligo di consenso — nessuna modifica prevista in quell'area.

### Punto aperto per lo sviluppo (non bloccante — chiarire con l'utente se necessario)

Il banner va montato **solo su `"/"`** (unica pagina di contenuto pubblico oggi, raccomandazione di questa storia) o **anche sulle pagine di autenticazione pubbliche** (`/accedi`, `/registrati`, `/recupera-password`, `/reimposta-password`, tutte raggiungibili senza login)? `app/layout.tsx` (root layout) è condiviso da *tutte* le rotte del progetto, incluso `/app/*` — montare il banner lì lo mostrerebbe anche nell'area autenticata, esplicitamente fuori scope. Raccomandazione di questa storia: montarlo solo in `app/page.tsx` (mirror del punto sopra: nessuna di quelle pagine di auth imposta oggi cookie non essenziali), lasciando l'estensione alle pagine di auth come possibile follow-up se l'utente lo richiede esplicitamente.

### Pattern da riusare (non reinventare)

- **Lettura cookie lato server**: `cookies()` da `next/headers`, stesso pattern già in uso in `lib/supabase/server.ts` (asincrono in questo progetto).
- **Rendering condizionale "nessun elemento se la condizione non è soddisfatta"**: `mostraSponsor`/`mostraPartite` in `app/page.tsx` (Story 18.2/18.3).
- **Separazione Server/Client per l'interattività**: `app/NavBar.tsx` (Server) / `app/NavBarClient.tsx` (Client, Story 9.2) — stesso principio per `app/page.tsx` (Server, invariato salvo il nuovo render condizionale) / `app/CookieBanner.tsx` (Client, nuovo).
- **Ombra/raggio per superfici transitorie**: DESIGN.md → Elevazione e Profondità, valore già stabilito per il menu profilo (Story 9.4): `0 1px 3px rgba(16,24,32,0.08)` + `--radius-sm`.
- **Alert/avviso non bloccante**: principio FR-15 (EXPERIENCE.md riga 75) — nessun overlay/backdrop, il Visitatore resta libero di usare il sito.
- **Pulsanti**: stile `.bottone`/`.bottoneSecondario` già presente in più moduli CSS del progetto (es. `sponsor.module.css`) — uppercase, `--radius-sm`, focus-visible.

### Riferimenti

- [Source: lib/supabase/server.ts] — pattern di lettura/scrittura cookie server-side (`cookies()` da `next/headers`) da riusare per la lettura.
- [Source: app/page.tsx, app/home-pubblica.module.css] — home pubblica esistente (Story 18.1/18.2/18.3) su cui innestare il banner e il link "Preferenze cookie" nel footer.
- [Source: app/NavBar.tsx, app/NavBarClient.tsx] — pattern di separazione Server/Client da mirrorare per `CookieBanner.tsx`.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md, sezione "Elevazione e Profondità" e "Componenti" → Menu profilo] — ombra/raggio per superfici transitorie, token colore.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/EXPERIENCE.md, riga 75] — principio "alert non bloccante" (FR-15).
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 18: Sito pubblico Settore Volley, Story 18.6] — decisioni di analisi, testo originale, punto di raccordo con Story 18.5.

### Project Structure Notes

- Nuovi: `app/CookieBanner.tsx` (Client Component), `app/CookieBanner.module.css`.
- Modificati: `app/page.tsx` (lettura cookie server-side, rendering condizionale del banner, link "Preferenze cookie" nel footer).
- Nessuna migrazione DB, nessuna nuova Server Action, nessun nuovo bucket/policy Storage — prima storia del progetto che introduce un cookie non di sessione, ma resta puramente lato browser (nessuna tabella/RLS coinvolta).

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

### Completion Notes List

- Implementati tutti e 5 i Task. Due deviazioni consapevoli dal piano originale, entrambe necessarie per soddisfare correttamente l'AC #3 (vedi note inline nei Task 1/3): `CookieBanner` è sempre montato (solo la visibilità iniziale dipende dal cookie) e il trigger "Preferenze cookie" vive nello stesso componente invece che nel footer di `page.tsx`.
- Verifica dal vivo: avviato `next dev` e interrogato `/` con `curl` in due stati — senza cookie (banner completo con "Consenso cookie"/"Accetta"/"Rifiuta" presente nell'HTML) e con `Cookie: consenso_cookie=accettato` (solo il pulsante "Preferenze cookie" presente) — entrambi corretti. L'interattività client (click sui pulsanti, `document.cookie`) non è verificabile via `curl` (nessun motore JS) — codice comunque type-checked/lintato; verifica interattiva completa in browser demandata all'utente, stessa limitazione già nota nel progetto per la verifica dal vivo in questo sandbox (motore Prisma WASM non caricabile sotto `next dev`, che infatti ha prodotto gli attesi errori Prisma sulle sezioni Sponsor/Partite durante questa verifica — irrilevanti per questa storia, sezioni fail-soft esistenti, non toccate).
- 1066/1066 test Vitest passati (era 1062, +4 nuovi su `eConsensoRegistrato`), 0 errori tsc/eslint, build produzione riuscita.

### File List

- Nuovi: `lib/cookie-consenso.ts`, `lib/cookie-consenso.test.ts`, `app/CookieBanner.tsx`, `app/CookieBanner.module.css`
- Modificati: `app/page.tsx`, `app/home-pubblica.module.css`

## Change Log

- 2026-08-12: File di story creato, stato ready-for-dev.
- 2026-08-12: Implementata (dev-story workflow) - lettura cookie server-side, componente banner con trigger "Preferenze cookie" integrato, stile mirror del menu profilo, funzione pura `eConsensoRegistrato` testata. 1066/1066 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Stato: review.
- 2026-08-13: Code review completata (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo). 1 decision-needed risolto con l'utente (ambito del banner confermato solo su "/" - nessun rischio di conformità concreto oggi, nessun cookie non essenziale altrove). 6 patch applicati: `SameSite=Lax` esplicito sul cookie, nuova `haAccettatoCookieNonEssenziali` per la futura Story 18.5 (AC #5), `padding-bottom` di sicurezza sul footer contro la sovrapposizione col pulsante fisso, `z-index` riallineato alla scala esistente dell'app (100→30), nuovo prop tipizzato `valoreIniziale`/`parseValoreConsenso` cosi' "Preferenze cookie" mostra la scelta attualmente registrata (AC #3 "rivedere"), 5 nuovi test (stringa vuota, case-sensitivity, 2 nuove funzioni). 1 defer (nessun `aria-live` sul banner - decisione UX non urgente, annotato in `deferred-work.md`). 4 dismessi come rumore/decisioni gia' documentate (lettura cookie non avvolta in try/catch - non puo' fallire in una pagina `force-dynamic`; nessun fallback no-JS - coerente con l'intero resto dell'app; nessuna pagina Cookie Policy - gia' una decisione esplicita nei Dev Notes; nuance di ri-consenso per la futura Story 18.5 - speculativo su codice non ancora esistente). 1075/1075 test Vitest passati (+9 da questa review), 0 errori tsc/eslint, build produzione riuscita. Status: done.
