---
baseline_commit: a2d367c5948f60b17f6923169f659be87224f58e
---

# Story 8.1: Layout Globale e Barra di Navigazione

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Utente autenticato di qualunque Ruolo,
I want una barra di navigazione unica coerente con l'identità visiva della società, con le voci pertinenti al mio Ruolo,
so that posso spostarmi tra le pagine che mi riguardano senza conoscere o digitare gli URL a memoria.

## Acceptance Criteria

1. **Given** `app/layout.tsx`, **when** l'app viene visualizzata, **then** il `<title>`/metadata riflettono il nome del prodotto (non più "Create Next App"), `lang="it"`, e nessun font viene caricato da Google Fonts (rimossi `Geist`/`Geist_Mono` da `next/font/google` — `--font-system` già definito in `app/globals.css` da Story 5.1 resta l'unico stack tipografico).
2. **Given** un Utente autenticato con un Ruolo che ha accesso ad almeno una superficie protetta, **when** naviga una pagina qualsiasi dell'app, **then** vede una barra di navigazione orizzontale (sfondo `{colors.navy}`, componente `nav-bar` di `DESIGN.md`) con solo le voci delle superfici a cui il suo Ruolo (o i suoi Ruoli) ha accesso — la stessa mappa `PROTECTED_ROUTES` che `lib/auth/route-guard.ts` già applica per l'autorizzazione, non una lista duplicata mantenuta a mano separatamente.
3. **Given** un Utente con più Ruoli (es. Allenatore e Dirigente), **when** visualizza la barra di navigazione, **then** vede l'unione delle voci di entrambi i Ruoli, senza duplicati.
4. **Given** le pagine `/accedi` e `/registrati` (nessuna sessione autenticata) e la pagina `/non-autorizzato` (sessione autenticata, ma priva del Ruolo richiesto dalla pagina appena rifiutata), **when** vengono visualizzate, **then** non mostrano la barra di navigazione.
5. **Given** il logo applicazione configurabile dall'Admin (Story 7.2, bucket pubblico), **when** la barra di navigazione viene renderizzata per un Utente autenticato, **then** mostra il logo caricato (se presente) — nessuna immagine rotta se il logo non è mai stato caricato.
6. **Given** la navigazione da tastiera, **when** un Utente sposta il focus su una voce della barra, **then** è visibile un contorno di focus (`{colors.focus-ring-on-navy}`, bianco — sfondo navy richiede un ring bianco, non lo stesso usato altrove su sfondo chiaro).
7. **Given** la voce di navigazione corrispondente alla pagina correntemente visitata, **when** la barra viene renderizzata, **then** quella voce è visivamente distinta dalle altre (sfondo `{colors.button-bg}`, coerente con `DESIGN.md`: "la voce attiva usa sfondo `{colors.button-bg}`, non `{colors.primary}`").

## Contesto: perché questa storia esiste

Scoperto durante la pianificazione dell'Epic 8 (correzione di rotta 2026-07-23, non un requisito originale del PRD): `app/layout.tsx` è tuttora lo scaffold grezzo di `create-next-app` — nessuna barra di navigazione esiste in nessuna pagina dell'app, nonostante `EXPERIENCE.md` (righe 60-69) la specifichi in dettaglio ("un'unica barra orizzontale, sfondo `{colors.navy}`, voci visibili in base al Ruolo dell'utente autenticato, guardia di ruolo per pagina/route-group non un menu che nasconde voci lato client — nessuna barra laterale o drawer") e `DESIGN.md` (sezione Componenti → `nav-bar`) ne definisca i token visivi. Questa storia precede le altre 6 di Epic 8 (ora 8.2-8.7): una volta montata nel root layout, ogni pagina la eredita automaticamente — le storie successive si occupano solo dello stile del contenuto di pagina, non della navigazione.

## Tasks / Subtasks

- [x] Task 1: Fix `app/layout.tsx` (AC #1)
  - [x] Metadata: `title` "Società Manager" (o simile, non "Create Next App"), `description` coerente.
  - [x] `<html lang="it">` (non `"en"` — l'intera app è in italiano).
  - [x] Rimuovi `Geist`/`Geist_Mono` da `next/font/google` e le relative variabili CSS applicate a `className` — `--font-system` (già in `app/globals.css` da Story 5.1, applicato a `body`) resta l'unico stack tipografico, coerente con `DESIGN.md`: "nessun font viene caricato, si usa solo lo stack di sistema".
- [x] Task 2: Estendi `lib/auth/route-guard.ts` — `navLabel` per ogni voce di `PROTECTED_ROUTES` (AC #2)
  - [x] Cambia il tipo: `{ prefix: string; ruoliAmmessi: Ruolo[]; navLabel: string }[]`.
  - [x] Aggiungi `navLabel` a ciascuna delle 20 voci esistenti (nessuna esclusa — la tabella IA di `EXPERIENCE.md`, righe 29-58, elenca "Nav" come punto di accesso per ognuna): `/admin` → "Amministrazione", `/import-atlete` → "Import atlete", `/precaricamento-allenatori` → "Precaricamento allenatori", `/conferma-iscrizioni` → "Conferma iscrizioni", `/palestre` → "Palestre", `/gruppi` → "Gruppi", `/slot` → "Slot", `/mio-orario` → "Il mio orario", `/orari` → "Orari", `/presenze` → "Presenze", `/storico-presenze` → "Storico presenze", `/certificato-medico` → "Certificato medico", `/notifiche` → "Notifiche", `/conferma-certificati` → "Conferma certificati", `/smtp` → "Configurazione SMTP", `/logo` → "Configurazione logo", `/vista-dirigente` → "Vista d'insieme", `/permessi-certificati` → "Permessi certificati", `/dati-fisici` → "Dati fisici", `/wizard-nuova-stagione` → "Wizard nuova stagione".
  - [x] Nessuna modifica alla logica di `getRouteDecision`/`matchProtectedRoute` — `navLabel` è un campo puramente descrittivo, non usato per l'autorizzazione.
- [x] Task 3: `lib/auth/voci-navigazione.ts` (nuovo, funzione pura) (AC #2, #3)
  - [x] `filtraVociNavigazione(ruoli: Ruolo[]): { href: string; label: string }[]` — filtra `PROTECTED_ROUTES` tenendo solo le voci il cui `ruoliAmmessi` interseca `ruoli`, mappa a `{ href: prefix, label: navLabel }`. Nessuna deduplica esplicita necessaria: ogni prefisso compare una sola volta in `PROTECTED_ROUTES` per costruzione (AC #3 soddisfatto automaticamente).
  - [x] Ruoli vuoti (utente non autenticato, o autenticato ma senza alcun Ruolo riconosciuto) → array vuoto.
  - [x] Test Vitest: Allenatore vede solo le proprie voci; Allenatore+Dirigente vede l'unione senza duplicati; ruoli vuoti → array vuoto; Admin vede tutte le voci Admin-ammesse.
- [x] Task 4: `proxy.ts` — esponi il pathname corrente ai Server Component (AC #4, #7)
  - [x] Dopo aver costruito `response`, imposta `response.headers.set("x-pathname", request.nextUrl.pathname)` — permette a `app/layout.tsx` (Server Component, nessun accesso diretto al pathname nella App Router root layout) di leggerlo via `headers()` (`next/headers`), necessario solo per nascondere la barra su `/non-autorizzato` (AC #4) ed evidenziare la voce attiva (AC #7) — `/accedi`/`/registrati` restano nascosti naturalmente per assenza di sessione, nessun controllo aggiuntivo serve lì.
- [x] Task 5: `app/NavBar.tsx` (nuovo, Server Component) + `app/NavBar.module.css` (AC #2, #3, #4, #5, #6, #7)
  - [x] Legge la sessione (`createClient()` da `@/lib/supabase/server`, `supabase.auth.getUser()`) e i Ruoli (`parseRuoli(user?.app_metadata?.ruoli)`, `lib/ruoli.ts`) — stesso pattern di `requireRuolo`.
  - [x] Nessun Utente autenticato → `return null` (AC #4, copre `/accedi`/`/registrati` senza bisogno del pathname).
  - [x] Legge il pathname corrente da `headers().get("x-pathname")` (Task 4) — se `=== NON_AUTORIZZATO_PATH` (`lib/auth/route-guard.ts`) → `return null` (AC #4).
  - [x] `filtraVociNavigazione(ruoli)` (Task 3) per le voci da mostrare.
  - [x] Logo: `leggiInfoLogo(supabase)` + `urlPubblicoLogo(supabase)` (`lib/storage/logo.ts`, Story 7.2, già esistenti) — mostra l'`<img>` solo se `info.esiste` (stesso guard-clause già usato in `app/(configurazione)/logo/page.tsx`, mai un'immagine rotta).
  - [x] Markup: `<nav>` sfondo `var(--color-navy)`, nome prodotto (`{typography.nav-title}` — 14px/900, colore bianco), `<ul>` di `<Link>` (`{typography.nav-item}` — 13px/700; voce attiva confrontando `pathname.startsWith(voce.href)` → sfondo `var(--color-button-bg)`, testo bianco; voci inattive testo `var(--color-surface-alt)` su sfondo navy, coerente con `DESIGN.md`).
  - [x] Focus: `:focus-visible` con `outline: 2px solid var(--color-focus-ring-on-navy); outline-offset: 2px` su ogni `<Link>` (AC #6 — non lo stesso `--color-focus-ring` usato su sfondo chiaro altrove nell'app, qui il ring dev'essere bianco per contrasto sul navy).
  - [x] Lista voci in overflow orizzontale scorrevole (`overflow-x: auto`) sotto una soglia di larghezza — un Admin con molte voci ammesse (fino a 12) non deve rompere il layout su mobile (coerente con NFR3, mobile-first).
- [x] Task 6: Wire-up in `app/layout.tsx` (AC #2, #4)
  - [x] Monta `<NavBar />` sopra `{children}`, dentro `<body>`.
- [x] Task 7: Test (Vitest)
  - [x] Coperti da Task 3 (`filtraVociNavigazione`, unica funzione pura nuova introdotta da questa storia). Nessun test automatico per `NavBar.tsx`/`layout.tsx`/`proxy.ts` oltre quello — stesso principio già stabilito nel resto di questa codebase (solo funzioni pure hanno test Vitest; i Server Component di pagina non sono mai stati testati con un test-runner React).
- [x] Task 8: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] Setup: Docker + Supabase CLI locale + dev server. Utenti di test per: solo Allenatore, Admin, Allenatore+Dirigente (multi-Ruolo).
  - [x] AC #1: ispeziona l'HTML — `<html lang="it">`, `<title>Società Manager</title>`, nessun riferimento a `fonts.googleapis.com`/`fonts.gstatic.com`/`geist` nell'HTML servito.
  - [x] AC #2: come Allenatore, verificato che la barra mostri solo le voci ammesse (`Il mio orario`, `Presenze`, `Storico presenze`, `Notifiche`, `Dati fisici`) e non "Amministrazione"/"Certificato medico"; come Admin, verificate le voci Admin-ammesse.
  - [x] AC #3: come Utente Allenatore+Dirigente, verificata l'unione delle voci di entrambi i Ruoli, nessuna duplicata.
  - [x] AC #4: verificato che `/accedi` non mostri la barra (nessuna sessione); verificato che un Allenatore reindirizzato a `/non-autorizzato` (tentando `/admin`) non veda la barra lì.
  - [x] AC #5: verificato che il logo (caricato via `/logo`, Story 7.2) appaia nella barra subito dopo l'upload; nessuna immagine rotta quando nessun `<img>` è presente per un Ruolo senza logo caricato in quella sessione di test.
  - [x] AC #7: verificato che la voce della pagina corrente abbia la classe di stato attivo (sfondo `button-bg`) e le altre no.
  - [x] AC #6 (contorno di focus da tastiera) verificato per ispezione della regola CSS `:focus-visible` (già collaudata identica su `permessi-certificati.module.css`/`vista-dirigente.module.css`, Story 5.1/5.2) — non verificato con uno screenshot/interazione da tastiera reale in questa sessione.
  - [x] Dati di test rimossi a fine sessione (3 Utenti). **Nota**: il bucket `logo-applicazione` conteneva già un logo caricato da una sessione precedente non pulita (Story 7.2) — l'upload di verifica di questa storia lo ha sostituito con `logo-mogliano-volley.png` (stesso file di riferimento della UX spec); non essendo nota la versione precedente, non è stato ripristinato un logo "originale" — irrilevante (istanza Supabase locale, dato non di produzione).

### Review Findings

- [x] [Review][Patch] `supabase.auth.getUser()` in `NavBar.tsx` non è avvolto in try/catch — a differenza dello stesso identico pattern in `proxy.ts` (esplicitamente fail-closed), un errore di rete verso Supabase Auth farebbe fallire il rendering dell'intero root layout, cioè di ogni pagina dell'app, non solo della barra [app/NavBar.tsx] — risolto con try/catch fail-closed (nessuna sessione su errore); verificato dal vivo
- [x] [Review][Patch] `leggiInfoLogo(supabase)` in `NavBar.tsx` non è avvolto in try/catch — un errore transitorio di Supabase Storage farebbe fallire il rendering di ogni pagina, non solo del logo (rischio nuovo introdotto da questa storia: prima `leggiInfoLogo` era chiamata solo dentro `/logo/page.tsx`, un fallimento lì restava isolato a quella pagina) [app/NavBar.tsx] — risolto con try/catch (nessun logo su errore); verificato dal vivo
- [x] [Review][Defer] `x-pathname` è impostato su `response.headers` in `proxy.ts`, non su `request.headers` come da pattern Next.js documentato per rendere un valore leggibile via `headers()` in un Server Component — staticamente "non dovrebbe funzionare", ma verificato dal vivo 3 volte contro il dev server reale (nascondimento su `/non-autorizzato` e stato attivo, inclusa un'ispezione diretta dell'HTML) e confermato funzionante in questa versione di Next.js/Turbopack [proxy.ts, app/NavBar.tsx] — deferred come nota di manutenzione futura (potrebbe comportarsi diversamente con un aggiornamento di Next.js o un runtime diverso), non un bug da correggere ora
- [x] [Review][Defer] Nessun `aria-current="page"` sulla voce di navigazione attiva (solo una classe CSS) — miglioramento di accessibilità reale, ma nessun AC lo richiede esplicitamente [app/NavBar.tsx]
- [x] [Review][Defer] Nessuna funzionalità di logout/account in nessuna pagina dell'app — gap di prodotto reale (mai esistita in nessuna storia precedente), ma esplicitamente fuori perimetro di questa storia, nessun AC la richiede [app/NavBar.tsx]
- [x] [Review][Defer] Un Utente già autenticato che visita `/accedi`/`/registrati` vede comunque la barra (solo `/non-autorizzato` è esplicitamente escluso) — coerente con il comportamento preesistente del route guard (un Utente autenticato non viene reindirizzato via da una rotta pubblica, invariato da Story 1.1), nessun AC richiede altro [app/NavBar.tsx]
- [x] [Review][Defer] Riuso 1:1 di `PROTECTED_ROUTES` come fonte delle voci di navigazione confonde "autorizzato ad accedere" con "merita una voce di primo livello" (es. il wizard stagionale una-tantum accanto a Gruppi/Palestre) — decisione esplicita e approvata di questa storia (AC #2: "la stessa lista... non una lista duplicata"), non da riaprire senza una nuova elicitazione [lib/auth/voci-navigazione.ts]
- [x] [Review][Defer] Elenco voci piatto, non raggruppato per "Nav → Configurazione"/"Nav → Amministrazione" come annotato in `EXPERIENCE.md` — semplificazione deliberata, coerente con il vincolo dello stesso documento ("nessuna barra laterale o drawer complesso"); nessun meccanismo di raggruppamento è mai stato specificato [lib/auth/voci-navigazione.ts]
- [x] [Review][Defer] Il confronto prefisso-pathname per lo stato attivo in `NavBar.tsx` duplica la logica di `matchProtectedRoute` (non esportata) invece di riusarla — nit DRY minore, basso rischio di divergenza [app/NavBar.tsx, lib/auth/route-guard.ts]
- [x] [Review][Defer] Due chiamate di rete sequenziali non parallelizzate (sessione + Storage logo) su ogni pagina autenticata, nessuna cache — coerente con NFR4 (nessun requisito di uptime/performance formale, progetto personale) [app/NavBar.tsx]
- [x] [Review][Defer] `overflow-x: auto` annidato sia su `.navBar` sia su `.voci` — ridondante, potenziale doppia scrollbar orizzontale su viewport stretti, innocuo [app/NavBar.module.css]
- [x] [Review][Defer] Cache-buster `?v=` vuoto se `aggiornatoIl` è `null`, e doppia chiamata Storage (`leggiInfoLogo` + `urlPubblicoLogo`) per la stessa informazione — pattern preesistente identico già in produzione in `/logo/page.tsx` (Story 7.2), non introdotto da questa storia [lib/storage/logo.ts]

## Dev Notes

- **Restyle/infrastruttura di navigazione, non nuovo comportamento applicativo** — nessuna nuova tabella, RLS, migrazione. `PROTECTED_ROUTES` (già esistente) resta l'unica fonte di verità sia per l'autorizzazione (route guard) sia per le voci di navigazione (questa storia) — evita la duplicazione esplicitamente vietata dall'AC #2.
- **Perché `x-pathname` via header e non `usePathname()`** — `usePathname()` (da `next/navigation`) richiede un Client Component; `NavBar` ha invece bisogno di dati letti lato server (sessione, Ruoli, logo) che non devono attraversare il bordo client/server solo per conoscere il pathname. Un header iniettato dal Proxy (già eseguito su ogni richiesta, stesso file che calcola già `getRouteDecision`) è il modo più diretto per un Server Component di leggere il pathname corrente in Next.js App Router — pattern comune, non un'invenzione ad hoc.
- **Perché non basta nascondere la barra solo per "nessuna sessione"** — `/non-autorizzato` è raggiunta da un Utente **già autenticato** (con un Ruolo, solo non quello richiesto dalla pagina appena rifiutata) — la sola condizione "nessun `user`" non la nasconderebbe lì, da cui la necessità del controllo aggiuntivo sul pathname (Task 4/5).
- **Nessuna modifica a `getRouteDecision`/ai test esistenti di `route-guard.test.ts`** — `navLabel` è additivo, non cambia alcuna decisione di autorizzazione già testata.
- **Ordine delle voci**: invariato, quello già presente in `PROTECTED_ROUTES` (ordine di introduzione storica delle Story) — `EXPERIENCE.md` raggruppa le superfici in "scoped/personali" vs "gestionali/d'insieme" solo a scopo di documentazione, non prescrive un ordine di rendering nella barra.
- **Molte voci per Ruoli ampi (Admin fino a 12)** — `EXPERIENCE.md` esclude esplicitamente sidebar/drawer ("nessuna barra laterale o drawer complesso... singola barra orizzontale"): la soluzione è lo scroll orizzontale della lista voci su viewport stretti (Task 5), non un menu che nasconde voci lato client (esplicitamente vietato dallo stesso paragrafo).

### Project Structure Notes

- Nuovi file: `app/NavBar.tsx`, `app/NavBar.module.css` (colocati con `app/layout.tsx`, non in un route-group — componente cross-cutting, non di un singolo modulo/feature, prima volta che questo progetto ha un componente condiviso a questo livello), `lib/auth/voci-navigazione.ts` (+ test).
- File modificati: `app/layout.tsx`, `lib/auth/route-guard.ts` (solo aggiunta campo `navLabel`, nessuna modifica a `route-guard.test.ts` necessaria), `proxy.ts`.
- Nessuna migrazione, nessuna modifica a `prisma/schema.prisma`.

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-07-23.md §6] — motivazione e approvazione di questa storia come prerequisito di Epic 8.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/EXPERIENCE.md] — righe 29-58 (tabella IA completa, colonna "Raggiunta da" = "Nav" per ogni superficie), righe 60-69 ("nessuna barra laterale o drawer... singola barra orizzontale... voci visibili dipendono dal ruolo").
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md] — sezione Componenti → `nav-bar` (sfondo navy, logo configurabile, voce attiva `button-bg`, focus-ring-on-navy); token `--color-navy`, `--color-button-bg`, `--color-surface-alt`, `--color-focus-ring-on-navy` (già in `app/globals.css`, Story 5.1).
- [Source: lib/auth/route-guard.ts, lib/auth/require-ruolo.ts, lib/ruoli.ts] — `PROTECTED_ROUTES`, pattern di lettura sessione/Ruoli da riusare identico.
- [Source: lib/storage/logo.ts] — `leggiInfoLogo`/`urlPubblicoLogo` (Story 7.2), riusate identiche per il logo in barra.
- [Source: proxy.ts] — Proxy esistente (Next.js 16 `proxy.ts`, non più `middleware.ts`), da estendere con l'header `x-pathname`, non da riscrivere.
- [Source: app/globals.css] — `--font-system`, `--color-*` già definiti da Story 5.1, riusati per `NavBar.module.css`.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- Riavvio del dev server richiesto dopo la modifica di `proxy.ts` (le modifiche al Proxy non sempre vengono applicate in modo affidabile a caldo in dev mode).
- Un primo controllo automatico sullo stato "attivo" della voce di navigazione (AC #7) ha riportato un fallimento isolato; l'ispezione diretta dell'HTML ha confermato che la classe era correttamente applicata (`voce voceAttiva`) — una ri-esecuzione immediata dello stesso script ha confermato il successo, coerente con la stessa flakiness da "primo compile Turbopack di una route" già osservata in storie precedenti di questa sessione.
- Seed/verifica temporanei (`tmp-seed-8-1.mjs`, `tmp-verify-8-1.mjs`, `tmp-verify-logo-8-1.mjs`, `tmp-debug-logo.mjs`, cancellati a fine sessione) hanno verificato tutti gli AC tranne il contorno di focus da tastiera (AC #6, verificato per ispezione della regola CSS, non con un'interazione reale).

### Completion Notes List

- 6/7 AC verificati dal vivo end-to-end (AC #1, #2, #3, #4, #5, #7); AC #6 verificato per ispezione della regola `:focus-visible` (pattern identico già collaudato in Story 5.1/5.2).
- Nessuna nuova tabella/RLS/migrazione — `PROTECTED_ROUTES` (già esistente) resta l'unica fonte di verità sia per l'autorizzazione sia per le voci di navigazione.
- `app/layout.tsx` non carica più font da Google Fonts, `lang="it"`, metadata corretti. `proxy.ts` espone `x-pathname` (nuovo header di risposta) per permettere a `NavBar` (Server Component) di conoscere il pathname corrente senza attraversare il bordo client/server.
- Suite Vitest completa: 468/468 test passati (5 nuovi: `filtraVociNavigazione`). `npx tsc --noEmit` pulito.

### File List

- `app/layout.tsx` (modificato: metadata, `lang`, rimozione font Google, mount `<NavBar />`)
- `app/NavBar.tsx` (nuovo)
- `app/NavBar.module.css` (nuovo)
- `lib/auth/route-guard.ts` (modificato: campo `navLabel` su ogni voce di `PROTECTED_ROUTES`)
- `lib/auth/voci-navigazione.ts` (nuovo)
- `lib/auth/voci-navigazione.test.ts` (nuovo)
- `proxy.ts` (modificato: header di risposta `x-pathname`)
