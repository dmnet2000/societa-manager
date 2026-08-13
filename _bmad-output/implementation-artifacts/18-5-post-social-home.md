---
baseline_commit: 964c32b
---

# Story 18.5: Sezione post social in home

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Visitatore senza account,
I want vedere sulla home pubblica gli ultimi post pubblicati sui canali social della società,
so that possa seguire le novità della società senza dover uscire dal sito.

## Acceptance Criteria

1. **Given** un Admin o Dirigente **When** configura l'URL della Pagina Facebook pubblica della società nella sezione dedicata su `/app/impostazioni` **Then** il valore viene salvato sul singleton `ConfigurazioneApplicazione` esistente.
2. **Given** un Visitatore senza sessione che ha già dato consenso ai cookie non essenziali (Story 18.6) **When** visita la home pubblica **Then** vede una sezione con gli ultimi post della Pagina Facebook configurata, tramite il *Page Plugin* ufficiale di Facebook (iframe, nessun token/API da gestire).
3. **And** se l'URL non è configurato, la sezione non compare (nessuna area vuota) — stesso principio già applicato a Sponsor/Partite/Foto squadra (Story 18.2/18.3/18.4).
4. **And** se il Visitatore non ha ancora dato consenso ai cookie non essenziali, o li ha rifiutati, la sezione non compare e nessuno script/iframe di terze parti viene caricato (Story 18.6 AC #5) — se poi accetta tramite "Preferenze cookie" **senza ricaricare la pagina**, la sezione compare senza bisogno di un reload completo.
5. **And** un problema di rete/servizio lato Facebook (Pagina non raggiungibile, URL configurato non valido) non deve rompere il resto della home pubblica (fail-soft) — stesso principio già applicato alle altre sezioni.

## Tasks / Subtasks

- [x] Task 1: Campo di configurazione `urlPaginaFacebook` (AC: #1)
  - [x] Nuova migrazione `prisma/migrations/<timestamp>_add_url_pagina_facebook/migration.sql`: `ALTER TABLE "configurazione_applicazione" ADD COLUMN "urlPaginaFacebook" TEXT;` — mirror esatto di `20260806000000_add_email_segreteria/migration.sql` (colonna nullable, tabella già strutturale/no-RLS, nessun `GRANT` da toccare).
  - [x] `lib/configurazione-applicazione.ts`: `leggiUrlPaginaFacebook(): Promise<string | null>` e `salvaUrlPaginaFacebook(url: string | null): Promise<void>` — mirror 1:1 di `leggiEmailSegreteria`/`salvaEmailSegreteria` nello stesso file (stesso `ID_CONFIGURAZIONE_APPLICAZIONE`, stesso upsert atomico).

- [x] Task 2: Server Action di salvataggio (AC: #1)
  - [x] `salvaUrlPaginaFacebookAction` in `app/app/(configurazione)/impostazioni/actions.ts` (stesso file di `salvaEmailSegreteriaAction`) — **`requireRuolo(["ADMIN", "DIRIGENTE"])`, non `requireRuolo("ADMIN")`**: a differenza di `salvaEmailSegreteriaAction` (ADMIN-only), l'AC #1 di questa storia ammette esplicitamente anche il Dirigente (stesso array a due Ruoli già usato altrove, es. `wizard-nuova-stagione/actions.ts`).
  - [x] Validazione URL: mirror di `linkEsternoValido` (`app/app/(sponsor)/sponsor/actions.ts`) / `linkFipavValido` (`app/app/(partite-campionati)/campionati/actions.ts`) — richiede protocollo `http:`/`https:` esplicito (mai `javascript:`/`data:`, il valore verrà incorporato in un URL di embed), limite di lunghezza (es. 500 caratteri, stesso ordine di grandezza degli altri link esterni del progetto). Stringa vuota = l'Admin/Dirigente vuole rimuovere la configurazione (`valore || null`, stesso principio di `salvaEmailSegreteriaAction`), non un valore letterale vuoto da validare come URL.
  - [x] `revalidatePath("/app/impostazioni")` al successo, stesso pattern di `salvaEmailSegreteriaAction`.

- [x] Task 3: UI Admin/Dirigente su `/app/impostazioni` (AC: #1)
  - [x] `app/app/(configurazione)/impostazioni/page.tsx`: nuova sezione `<h2>Pagina Facebook</h2>` dopo quella "Email Segreteria" esistente, stesso pattern (avviso soft se non configurato + form) — aggiungere `leggiUrlPaginaFacebook()` allo stesso `Promise.all` già presente (con lo stesso `.catch` fail-soft già stabilito per `emailSegreteria`, review fix Story 9.31/17.2).
  - [x] Nuovo componente `PaginaFacebookForm.tsx` (stesso modulo `impostazioni.module.css`) — mirror 1:1 di `EmailSegreteriaForm.tsx` (`useActionState(salvaUrlPaginaFacebookAction, undefined)`, `<input type="url">` invece di `type="email"`).

- [x] Task 4: Costruzione dell'URL di embed (AC: #2)
  - [x] Nuovo `lib/embed-facebook.ts`: `costruisciLinkPaginaFacebookIncorporata(urlPagina: string): string` — mirror di `costruisciLinkMappaIncorporata` (`lib/link-naviga-palestra.ts`, Story 9.6): funzione pura, nessuna chiamata di rete, costruisce l'URL del *Page Plugin* ufficiale (`https://www.facebook.com/plugins/page.php?href=<urlPagina url-encoded>&tabs=timeline&...`) — nessuna libreria npm da aggiungere (verificato: nessuna dipendenza di embed social nel progetto), stesso principio "nessun token/API" già richiesto dall'epica.

- [x] Task 5: Sezione pubblica in home, con gating sul consenso cookie (AC: #2, #3, #4, #5)
  - [x] `app/page.tsx`: `leggiUrlPaginaFacebook().catch((err) => { console.error(err); return null; })` aggiunta al `Promise.all` principale esistente, stesso pattern fail-soft delle altre query pubbliche.
  - [x] Riusare la lettura del cookie di consenso già presente in questa pagina (Story 18.6, `cookieStore.get(NOME_COOKIE_CONSENSO)?.value`) con `haAccettatoCookieNonEssenziali` (`lib/cookie-consenso.ts`, **già scritta apposta per questa storia** — review fix Story 18.6, Blind Hunter: "da riusare così com'è, non da ri-derivare confrontando di nuovo la stringa 'accettato'") per calcolare `consentitoSocial`.
  - [x] **Nessuna sezione se non configurato O se il consenso non è stato dato** (AC #3/#4): stesso identico messaggio visivo (sezione assente) per entrambi i casi, nessuna UI intermedia tipo "accetta i cookie per vedere i post" — scelta di semplicità (nessun AC la richiede), coerente con NFR6. Implementato come `{urlPaginaFacebook && consentitoSocial && (...)}` direttamente nel JSX (non una variabile `mostraSocial` separata come inizialmente ipotizzato) — TypeScript narrowa `urlPaginaFacebook` da `string | null` a `string` dentro il blocco, evitando un'asserzione non-null `!` nel `src` dell'iframe.
  - [x] Sezione condizionale, stesso principio di `mostraSponsor`/`mostraPartite`/`mostraFotoSquadra`, `aria-labelledby` (non `aria-label` ridondante) puntato a un `<h2 id="titolo-social">`, stesso pattern review-fixato in Story 18.3.
  - [x] `<iframe>`: `src={costruisciLinkPaginaFacebookIncorporata(urlPaginaFacebook)}`, `loading="lazy"`, `title="Ultimi post dalla nostra Pagina Facebook"`, `referrerPolicy="no-referrer"` — stessi attributi già stabiliti per l'unico altro iframe del progetto (`PalestraRow.tsx`, `costruisciLinkMappaIncorporata`, Story 9.6). Nessun `onError`/fallback necessario (AC #5): un fallimento di rendering lato Facebook resta contenuto nell'iframe stesso, non si propaga al resto della pagina — stesso limite già accettato per le immagini Sponsor/Foto squadra (nessun `onError`, deferred nelle story precedenti).
  - [x] **Ultimo residuo del paragrafo hero "in arrivo"** (`app/page.tsx`, `.sottotitolo`): questa è l'ultima delle 4 sezioni promesse lì (Sponsor/Partite/Foto squadra già rimosse nelle story precedenti) — rimuovere l'intero paragrafo `<p className={styles.sottotitolo}>` (non solo una clausola: non resterebbe altro testo sensato dopo aver tolto "gli ultimi post dai nostri canali social").

- [x] Task 6: Reattività al cambio di consenso senza reload completo (AC: #4)
  - [x] `app/CookieBanner.tsx`: aggiungere `const router = useRouter()` (`next/navigation`) e chiamare `router.refresh()` subito dopo `impostaConsenso(...)` in **entrambi** i pulsanti "Accetta"/"Rifiuta" — `app/page.tsx` è un Server Component `force-dynamic` che legge il cookie a ogni richiesta: un *soft refresh* di Next.js lo rifà girare lato server con il nuovo valore del cookie, senza un reload completo della pagina e senza perdere lo stato client (es. il banner che si richiude). **Scoperta tecnica di questa storia**: `CookieBanner.tsx` (Story 18.6) scrive il cookie ma non innesca mai un refresh — nessun problema finché nessuna sezione dipendeva dal consenso; questa storia è la prima a renderlo visibile, va risolto qui invece di introdurre un Context/CustomEvent ad-hoc (nessun precedente di quel tipo nel progetto, `router.refresh()` è la soluzione idiomatica più semplice per questo framework, coerente con NFR6).

- [x] Task 7: Test (AC: tutti)
  - [x] `lib/embed-facebook.test.ts`: `costruisciLinkPaginaFacebookIncorporata` — funzione pura, testare che l'URL prodotto contenga il parametro `href` correttamente url-encodato e punti al dominio `facebook.com/plugins/page.php`.
  - [x] `lib/configurazione-applicazione.test.ts` esiste già (testa `leggiNomeSettore`/`leggiEmailSegreteria`/`salva*`) — aggiungere `leggiUrlPaginaFacebook`/`salvaUrlPaginaFacebook` allo stesso file, stesso mirror di test già presente per `emailSegreteria`.
  - [x] `app/app/(configurazione)/impostazioni/actions.test.ts` esiste già (testa `salvaEmailSegreteriaAction`) — aggiungere `salvaUrlPaginaFacebookAction` allo stesso file: FORBIDDEN per Ruoli non ammessi (incluso **ALLENATORE**, per verificare che l'array a due Ruoli sia quello giusto), VALIDATION su URL malformato/protocollo non http(s)/troppo lungo, successo con persistenza + `revalidatePath`, stringa vuota → `null`.
  - [x] Nessun test diretto su `page.tsx`/`PaginaFacebookForm.tsx`/`CookieBanner.tsx` (convenzione consolidata, nessuna pagina/componente di rendering del progetto ne ha).
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

### Review Findings

- [x] [Review][Patch] `.iframeSocial` senza `width`/`height` — l'iframe ricade sul default del browser (~300×150), tagliando il contenuto che il Page Plugin di Facebook renderizza internamente a 340×500 (i parametri `width`/`height` nell'URL controllano solo il contenuto *dentro* l'iframe, non la scatola dell'elemento nella pagina ospite) [app/home-pubblica.module.css:267] — trovato indipendentemente da Blind Hunter ed Edge Case Hunter, entrambi con riferimento diretto al precedente `.mappaIncorporata` (`PalestraRow.tsx`, Story 9.6) che imposta `height: 240px` esplicito, omesso qui nella prima stesura. Risolto: `width: 340px; height: 500px; display: block;` aggiunti, allineati 1:1 ai parametri dell'URL di embed.
- [x] [Review][Patch] Blocco di commento JSX duplicato sopra la sezione social [app/page.tsx:387-401] — due commenti quasi identici uno di seguito all'altro, residuo di editing non ripulito. Risolto: consolidati in uno solo.
- [x] [Review][Patch] Testo del `CookieBanner` non aggiornato — diceva ancora "potremo **in futuro** mostrare... post dai nostri canali social", frase scritta in Story 18.6 in previsione di questa storia, ora diventata realtà presente [app/CookieBanner.tsx] — stessa categoria di testo obsoleto già ripulita nell'hero di `app/page.tsx` in questa stessa storia, ma dimenticata qui. Risolto: rimosso "in futuro", riformulato al presente.
- [x] [Review][Patch] Test "allows DIRIGENTE, not just ADMIN" fuorviante — `requireRuolo` è interamente mockato per autorizzare sempre, quindi il test non può distinguere ADMIN da DIRIGENTE; l'unica verifica reale dell'array di Ruoli è già il `toHaveBeenCalledWith(["ADMIN","DIRIGENTE"])` nel test FORBIDDEN [app/app/(configurazione)/impostazioni/actions.test.ts] — risolto: test rimosso, commento esplicativo aggiunto al test FORBIDDEN.
- [x] [Review][Patch] Copertura di test mancante: protocollo `data:` — le Dev Notes dichiarano esplicitamente "mai `javascript:`/`data:`" ma solo `javascript:` era testato [app/app/(configurazione)/impostazioni/actions.test.ts] — risolto: aggiunto test.
- [x] [Review][Patch] Test "oltre i 500 caratteri" non testava il confine esatto (526 caratteri, non 501) — un off-by-one in `LUNGHEZZA_MASSIMA_LINK_ESTERNO` non sarebbe mai stato rilevato [app/app/(configurazione)/impostazioni/actions.test.ts] — risolto: sostituito con due test al confine esatto (500 accettato, 501 rifiutato).
- [x] [Review][Defer] `router.refresh()` rifà girare l'intero `Promise.all` di `app/page.tsx` (tutte le query pubbliche) a ogni click su Accetta/Rifiuta, anche quando il visitatore riconferma una scelta già in vigore [app/CookieBanner.tsx] — deferred, nessun AC lo vieta, costo accettabile per un'interazione rara (una tantum per visitatore, non ripetuta ad ogni pagina) rispetto alla complessità di un refresh più mirato.
- [x] [Review][Defer] Nessuna ri-validazione dell'URL al momento del render — `urlPaginaFacebook` letto dal DB va dritto nell'iframe senza rieseguire `urlPaginaFacebookValido()`, la validazione avviene solo al salvataggio [app/page.tsx] — deferred, rischio basso oggi (`encodeURIComponent` neutralizza l'injection, unico scrittore è la Server Action già validata), stesso principio già accettato per `linkEsterno`/`linkFipav` in altre story.
- [x] [Review][Defer] `urlPaginaFacebookValido` verifica solo protocollo/lunghezza, non che l'host sia effettivamente un dominio Facebook [app/app/(configurazione)/impostazioni/actions.ts] — deferred, un Admin/Dirigente che incolla un URL sbagliato lo scopre visitando la home pubblica (l'iframe non mostrerà nulla di utile), nessun rischio di sicurezza; stesso livello di validazione già accettato per `linkEsterno`/`linkFipav` (nessuno di quelli verifica il dominio).
- [x] [Review][Defer] Nessun attributo `allow`/`scrolling` sull'iframe rispetto al markup ufficiale del Page Plugin di Facebook — deferred, cosmetico, da verificare/aggiustare con un test dal vivo quando l'URL reale della Pagina sarà configurato in produzione.
- [x] [Review][Defer] Nessuna difesa in profondità (CSP/`frame-src`) oltre al condizionale JSX per il gating del consenso cookie — deferred, nessuna CSP esiste nel progetto (prima occorrenza in cui sarebbe rilevante), introdurne una è un lavoro trasversale più ampio di questa storia.
- [x] [Review][Dismiss] Diff dello schema Prisma con riformattazione whitespace non correlata su altri modelli (`Atleta`, `GenitoreAtleta`, `Gruppo`, `Campo`) — effetto collaterale di `prisma format` dopo l'aggiunta del campo, cosmetico (confermato da tsc/test puliti), nessun campo non voluto toccato.
- [x] [Review][Dismiss] Nessun test diretto sulla logica di gating in `app/page.tsx`/`CookieBanner.tsx` — convenzione consolidata del progetto (nessuna pagina/componente di rendering ha mai test diretti), la logica pura sottostante (`haAccettatoCookieNonEssenziali`, `costruisciLinkPaginaFacebookIncorporata`) è testata a parte.

## Dev Notes

### Decisione presa con l'utente in apertura di questa storia (2026-08-13) — deviazione dal testo originale dell'epica

L'epica (`epics.md#Epic 18`, Story 18.5) parla genericamente di "embed ufficiale della piattaforma (widget Instagram/Facebook)" con un campo "piattaforma" configurabile. **In fase di analisi è emerso che Instagram e Facebook non sono equivalenti** per il requisito "ultimi post", senza token/API (vincolo esplicito dell'epica, NFR6):

- **Facebook**: il *Page Plugin* ufficiale mostra automaticamente gli ultimi post di una Pagina pubblica con un semplice iframe (basta l'URL della Pagina) — nessun token, nessuna manutenzione.
- **Instagram**: non esiste un widget ufficiale gratuito equivalente per "gli ultimi post di un profilo" — il loro embed gratuito (`embed.js`) funziona solo per **un singolo post specifico** (permalink). Un feed automatico multi-post richiederebbe le API ufficiali Meta (**token da gestire e rinnovare**, escluso esplicitamente dall'epica) oppure un servizio terzo di scraping (rischio ToS/affidabilità, non previsto da NFR6).

**Decisione presa con l'utente**: questa storia implementa **solo Facebook** (feed automatico reale, via Page Plugin). Instagram è **rimandato a una story futura**, da riaprire solo se si accetta di gestire un token API o un servizio terzo — nessuna traccia di "piattaforma"/multi-provider in questa implementazione (un solo campo `urlPaginaFacebook`, non un campo "piattaforma" + "handle" generico). Se in futuro Instagram verrà aggiunto, richiederà una nuova colonna/migrazione dedicata, non un'estensione di questo campo.

### Pattern da riusare (non reinventare)

- **Campo di configurazione singolo su `ConfigurazioneApplicazione`**: mirror esatto di `emailSegreteria` (Story 9.31) — stessa migrazione (`ALTER TABLE ... ADD COLUMN ... TEXT`, nullable), stesse funzioni `leggiX`/`salvaX` in `lib/configurazione-applicazione.ts`, stesso upsert atomico su `ID_CONFIGURAZIONE_APPLICAZIONE`.
- **Server Action di salvataggio**: mirror di `salvaEmailSegreteriaAction` (`app/app/(configurazione)/impostazioni/actions.ts`) — **unica differenza**: `requireRuolo(["ADMIN", "DIRIGENTE"])` invece di `requireRuolo("ADMIN")`, per rispettare l'AC #1 di questa storia (Admin **o** Dirigente, a differenza di Email Segreteria che resta ADMIN-only).
- **UI Admin**: mirror di `EmailSegreteriaForm.tsx`/della sezione "Email Segreteria" già su `/app/impostazioni` (Story 9.31) — stesso hub+form, stesso pattern di avviso soft "non configurato".
- **Validazione URL esterno**: mirror di `linkEsternoValido` (`app/app/(sponsor)/sponsor/actions.ts`, Story 16.1 review fix) / `linkFipavValido` (`app/app/(partite-campionati)/campionati/actions.ts`, Story 10.8 review fix) — protocollo `http`/`https` obbligatorio, limite di lunghezza. Stesso motivo di sicurezza: il valore finisce incorporato in un URL di embed, un `javascript:`/`data:` non validato sarebbe un problema anche qui.
- **Costruzione URL di embed via iframe**: mirror di `costruisciLinkMappaIncorporata` (`lib/link-naviga-palestra.ts`, Story 9.6) — funzione pura `string -> string`, nessuna chiamata di rete, e degli attributi `<iframe>` già stabiliti in `PalestraRow.tsx` (`loading="lazy"`, `title` esplicito, `referrerPolicy="no-referrer"`).
- **Sezione pubblica condizionale + query con fail-soft**: mirror di `mostraSponsor`/`mostraPartite`/`mostraFotoSquadra` in `app/page.tsx` (Story 18.2/18.3/18.4) — stesso principio "nessuna sezione se vuota", `.catch()` inline dentro il `Promise.all`, `aria-labelledby` invece di `aria-label` ridondante.
- **Gating sul consenso cookie**: `haAccettatoCookieNonEssenziali` (`lib/cookie-consenso.ts`) — scritta apposta in Story 18.6 in previsione di questa storia (commento esplicito nel file: "unico controllo che una futura Story 18.5... dovrà usare"), da riusare così com'è.

### Scoperta tecnica di questa storia: `CookieBanner.tsx` non innesca mai un refresh

`app/page.tsx` è `force-dynamic` e legge il cookie di consenso a ogni richiesta lato server (Story 18.6) — ma `CookieBanner.tsx` (Client Component) si limita a scrivere `document.cookie` e aggiornare il proprio stato locale, **senza mai innescare un nuovo giro di rendering del Server Component genitore**. Finché nessuna sezione dipendeva dal consenso, questo gap era invisibile; questa storia lo rende concreto (AC #4: la sezione social deve comparire subito dopo un'accettazione, senza richiedere un reload manuale). **Fix minimo**: `router.refresh()` (Next.js, `next/navigation`) subito dopo la scrittura del cookie in `CookieBanner.tsx` — un *soft refresh* che rifà girare `app/page.tsx` lato server con il nuovo valore del cookie, senza perdere lo stato client esistente (es. il banner che si richiude). Nessun Context/CustomEvent ad-hoc necessario: `router.refresh()` è lo strumento idiomatico di Next.js App Router per esattamente questo scenario, coerente con NFR6 (soluzione più semplice).

### Project Structure Notes

- Nuovi: `prisma/migrations/<timestamp>_add_url_pagina_facebook/migration.sql`, `lib/embed-facebook.ts`, `lib/embed-facebook.test.ts`, `app/app/(configurazione)/impostazioni/PaginaFacebookForm.tsx`.
- Modificati: `lib/configurazione-applicazione.ts` (nuove `leggiUrlPaginaFacebook`/`salvaUrlPaginaFacebook`), `app/app/(configurazione)/impostazioni/actions.ts` (nuova Server Action), `app/app/(configurazione)/impostazioni/page.tsx` (nuova sezione), `app/page.tsx` (nuova sezione pubblica, rimozione paragrafo hero residuo), `app/home-pubblica.module.css` (nuove classi sezione), `app/CookieBanner.tsx` (`router.refresh()`).
- Nessuna migrazione Storage/bucket in questa storia (a differenza di Sponsor/logo/Foto squadra) — solo una colonna Prisma, nessun asset binario da caricare.

### References

- [Source: lib/configurazione-applicazione.ts, app/app/(configurazione)/impostazioni/actions.ts, EmailSegreteriaForm.tsx] — pattern di campo di configurazione singolo da mirrorare (Story 9.31).
- [Source: app/app/(sponsor)/sponsor/actions.ts (linkEsternoValido), app/app/(partite-campionati)/campionati/actions.ts (linkFipavValido)] — validazione URL esterno da riusare.
- [Source: lib/link-naviga-palestra.ts (costruisciLinkMappaIncorporata), app/app/(orari-palestre)/palestre/PalestraRow.tsx] — unico precedente di embed via iframe nel progetto, attributi da riprodurre.
- [Source: lib/cookie-consenso.ts (haAccettatoCookieNonEssenziali), app/CookieBanner.tsx, app/page.tsx] — infrastruttura di consenso cookie (Story 18.6) e gap di reattività da colmare in questa storia.
- [Source: app/page.tsx, app/home-pubblica.module.css] — home pubblica esistente (Story 18.1-18.4) su cui innestare la nuova sezione.
- [Source: epics.md#Epic 18: Sito pubblico Settore Volley, Story 18.5] — testo originale dell'epica; vedi sopra per la deviazione concordata con l'utente (solo Facebook).

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

### Completion Notes List

- Implementazione seguita esattamente come pianificato in fase di analisi, nessuna deviazione sostanziale rispetto al piano — unica differenza tecnica minore: la sezione pubblica usa `{urlPaginaFacebook && consentitoSocial && (...)}` direttamente nel JSX invece di una variabile `mostraSocial` separata, per ottenere il narrowing TypeScript di `urlPaginaFacebook` (`string | null` → `string`) senza un'asserzione non-null nel `src` dell'iframe.
- Rigenerato il client Prisma (`npx prisma generate`, resta su 6.19.3 come da vincolo documentato nello schema — mai aggiornare a 7.x, incompatibile con Cloudflare Workers) dopo la modifica a `schema.prisma`; nessuna migrazione applicata al DB in questo sandbox (nessun accesso Supabase diretto), stessa limitazione già nota per Sponsor/logo/Foto squadra. La migrazione `20260813010000_add_url_pagina_facebook` va applicata dall'utente in produzione.
- Rimosso come CSS morto anche `.sottotitolo` in `app/home-pubblica.module.css`, non menzionato esplicitamente nel piano ma conseguenza diretta della rimozione del paragrafo hero (Task 5): nessun altro elemento lo usava dopo la rimozione.
- `router.refresh()` aggiunto a entrambi i pulsanti "Accetta"/"Rifiuta" di `CookieBanner.tsx` (Task 6) — verificato che non introduce regressioni sul comportamento esistente della Story 18.6 (il banner si richiude comunque subito via `setVisibile(false)`, il refresh è un effetto aggiuntivo non bloccante).
- **Code review completata** (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo) — 0 decision-needed, 5 patch applicati (`.iframeSocial` senza `width`/`height`, causa un clipping reale del feed - trovato indipendentemente da 2 layer; commento JSX duplicato; testo `CookieBanner` non aggiornato al presente; test "allows DIRIGENTE" fuorviante rimosso; 2 test mancanti aggiunti - protocollo `data:`, confine esatto 500/501 caratteri), 5 defer (costo di `router.refresh()` a ogni click, nessuna ri-validazione URL a runtime, nessuna verifica del dominio Facebook, nessun `allow`/`scrolling` sull'iframe, nessuna CSP), 2 scartati come rumore (whitespace di `prisma format` su altri modelli, convenzione consolidata "nessun test diretto su page.tsx"). Vedi Review Findings sopra.
- Verifica: `npx vitest run` (1109/1109 passati), `npx tsc --noEmit`, `npm run lint` (0 errori dopo aver corretto 3 apici non escapati in `impostazioni/page.tsx`, solo warning `<img>`/`no-img-element` preesistenti), `npm run build` puliti.

### File List

- Nuovi: `prisma/migrations/20260813010000_add_url_pagina_facebook/migration.sql`, `lib/embed-facebook.ts`, `lib/embed-facebook.test.ts`, `app/app/(configurazione)/impostazioni/PaginaFacebookForm.tsx`.
- Modificati: `prisma/schema.prisma` (campo `urlPaginaFacebook` su `ConfigurazioneApplicazione`), `lib/configurazione-applicazione.ts` + `.test.ts` (nuove `leggiUrlPaginaFacebook`/`salvaUrlPaginaFacebook`), `app/app/(configurazione)/impostazioni/actions.ts` + `.test.ts` (nuova Server Action `salvaUrlPaginaFacebookAction`, review fix: 2 test aggiunti, 1 rimosso), `app/app/(configurazione)/impostazioni/page.tsx` (nuova sezione, apici escapati per eslint), `app/page.tsx` (nuova sezione pubblica con gating sul consenso cookie, rimozione paragrafo hero residuo, review fix: commento duplicato consolidato), `app/home-pubblica.module.css` (nuove classi `.sezioneSocial`/`.iframeSocial`, rimossa `.sottotitolo` come CSS morto, review fix: `width`/`height` aggiunti a `.iframeSocial`), `app/CookieBanner.tsx` (`router.refresh()` su Accetta/Rifiuta, review fix: testo "in futuro" aggiornato al presente).

## Change Log

- 2026-08-13: File di story creato (create-story workflow) — decisione presa con l'utente in apertura: solo Facebook (Page Plugin, feed automatico reale) in questa storia, Instagram rimandato a una story futura (nessun equivalente ufficiale gratuito per un feed multi-post senza token). Stato ready-for-dev.
- 2026-08-13: Implementata (dev-story workflow) - tutti e 7 i Task completati. Campo `urlPaginaFacebook` su `ConfigurazioneApplicazione`, Server Action ADMIN-o-DIRIGENTE, sezione Admin su `/app/impostazioni`, `lib/embed-facebook.ts` (Page Plugin ufficiale, nessun token), sezione pubblica in home con gating sul consenso cookie (Story 18.6), `router.refresh()` aggiunto a `CookieBanner.tsx` per la reattività senza reload completo. Rimosso l'ultimo residuo del paragrafo hero "in arrivo" e il relativo CSS morto. 1108/1108 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: review.
- 2026-08-13: Code review completata (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo). 0 decision-needed. 5 patch applicati: `.iframeSocial` senza `width`/`height` (bug reale, trovato indipendentemente da 2 layer - il feed Facebook sarebbe stato tagliato a ~150px in produzione), commento JSX duplicato in `app/page.tsx`, testo del `CookieBanner` non aggiornato ("in futuro" → presente), test "allows DIRIGENTE" fuorviante rimosso (mock non poteva distinguere i due Ruoli), 2 test mancanti aggiunti (protocollo `data:`, confine esatto 500/501 caratteri). 5 defer (costo di `router.refresh()` a ogni click, nessuna ri-validazione URL a runtime, nessuna verifica del dominio Facebook, nessun `allow`/`scrolling` sull'iframe, nessuna CSP nel progetto). 2 scartati come rumore. 1109/1109 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: done.
