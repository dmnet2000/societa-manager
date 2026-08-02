---
baseline_commit: b66c22acc1fcd7abc29b6a1fd5985eaa8f6f1526
---

# Story 9.24: Menu principale "Impostazioni" (raggruppa SMTP e Logo)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin,
I want una voce di navigazione principale "Impostazioni" che raggruppi "Configurazione SMTP" e "Configurazione logo",
so that la barra di navigazione resti pulita invece di avere due voci separate per due impostazioni correlate.

**Note aggiuntive:** oggi `/smtp` e `/logo` (Story 7.1/7.2) sono due voci separate e piatte in `PROTECTED_ROUTES` (`lib/auth/route-guard.ts` righe 64-65), entrambe ADMIN-only. **Decisione tecnica presa con l'utente in fase di creazione**: implementare come **pagina hub** `/impostazioni` (una nuova voce di navigazione unica) con due link a `/smtp` e `/logo` — **non** un sottomenu espandibile nella barra laterale (che sarebbe il primo pattern di navigazione annidata del progetto: oggi `NavBarClient.tsx` renderizza una lista piatta, nessun concetto di gruppo/sottomenu esiste). `/smtp` e `/logo` restano **esattamente come sono** (stesse rotte, stessa route-guard, stesso comportamento) ma **spariscono dalla barra di navigazione come voci dirette** — raggiungibili solo passando da `/impostazioni`. Nessun'altra voce (es. `/permessi-certificati`, anch'essa ADMIN-only) viene inclusa in questo raggruppamento — solo SMTP e Logo, come richiesto esplicitamente dall'utente.

## Acceptance Criteria

1. **Given** un Admin **When** guarda la barra di navigazione **Then** vede una sola voce "Impostazioni" al posto delle due voci separate "Configurazione SMTP" e "Configurazione logo"
2. **Given** un Admin **When** visita `/impostazioni` **Then** vede due link verso "Configurazione SMTP" (`/smtp`) e "Configurazione logo" (`/logo`)
3. **Given** un Admin **When** visita direttamente `/smtp` o `/logo` (es. link salvato, indirizzo digitato a mano) **Then** la pagina funziona esattamente come oggi, nessuna regressione — queste rotte restano protette e raggiungibili, solo non più elencate direttamente in barra
4. **And** nessuna regressione sul comportamento di autorizzazione esistente (Admin-only su `/smtp`/`/logo`, invariato) né sulle altre voci di navigazione — suite Vitest invariata sui casi esistenti non impattati

## Tasks / Subtasks

- [x] Task 1: Route-guard — nuova voce + flag "nascosta dalla nav" (AC: #1, #3, #4)
  - [x] Tipo di `PROTECTED_ROUTES` esteso con `nascostaDallaNav?: boolean`
  - [x] Nuova voce `/impostazioni` (ADMIN-only) aggiunta nella posizione occupata prima da `/smtp`
  - [x] `/smtp` e `/logo` ora con `nascostaDallaNav: true`, `ruoliAmmessi`/`navLabel`/`prefix` invariati
  - [x] Due nuovi test in `route-guard.test.ts` per `/impostazioni` (ADMIN allow, altri Ruoli redirect)
- [x] Task 2: Nascondere `/smtp`/`/logo` dall'elenco di navigazione (AC: #1)
  - [x] `filtraVociNavigazione` estesa con `!route.nascostaDallaNav`
  - [x] Test Admin aggiornato (`/smtp`/`/logo` rimossi, `/impostazioni` aggiunto) + nuovo test esplicito che `/smtp`/`/logo` non compaiono più
- [x] Task 3: Pagina hub `/impostazioni` (AC: #2)
  - [x] Nuovo `app/(configurazione)/impostazioni/page.tsx` — Server Component statico, nessun controllo di Ruolo, riusa `.pagina-form`/`.riquadro-form` globali
  - [x] Nuovo `app/(configurazione)/impostazioni/impostazioni.module.css` — `.lista`/`.link` con focus-visible
- [x] Task 4: Verifica regressione (AC: #4)
  - [x] Suite Vitest completa: 793/793 test passati (+3 nuovi: 2 in `route-guard.test.ts`, 1 in `voci-navigazione.test.ts`)
  - [x] `npx tsc --noEmit` pulito (0 errori); ESLint pulito su tutti i file modificati/nuovi
  - [x] Confermato: nessuna modifica a `app/(configurazione)/smtp/*`, `app/(configurazione)/logo/*`

### Review Findings

- [x] [Review][Patch] Visitando direttamente `/smtp` o `/logo` (es. dalla pagina hub), nessuna voce della barra di navigazione risultava evidenziata — `/smtp`/`/logo` non sono più voci dirette (`nascostaDallaNav`) e `isVoceAttiva` non sapeva che appartengono a "Impostazioni", perdendo l'orientamento "dove mi trovo" già garantito per ogni altra pagina dell'app. [lib/auth/voci-navigazione.ts] — risolto: nuova mappa `VOCI_FIGLIE_NASCOSTE` (`/impostazioni` → `["/smtp", "/logo"]`), `isVoceAttiva` ora riconosce anche queste come figlie della voce "Impostazioni". 2 nuovi test.
- [x] [Review][Patch] La pagina hub ripeteva le etichette "Configurazione SMTP"/"Configurazione logo" come stringhe letterali invece di leggerle da `PROTECTED_ROUTES.navLabel` — contraddiceva il commento stesso su `PROTECTED_ROUTES` ("stessa fonte di verità... evita una lista di voci duplicata"): rinominare `navLabel` in futuro non avrebbe aggiornato questa pagina. [app/(configurazione)/impostazioni/page.tsx] — risolto: le etichette sono ora lette da `PROTECTED_ROUTES` per i due prefissi `/smtp`/`/logo`.
- [x] [Review][Patch] Il link cliccabile nella pagina hub (`padding: var(--space-3) 0` + testo 14px, nessun `min-height`) risultava sotto i 44px di target di tocco minimo — stesso difetto già incontrato e corretto in questo progetto (lezione: `min-height` da solo non basta, va garantito sull'elemento cliccabile stesso). [app/(configurazione)/impostazioni/impostazioni.module.css] — risolto: `.link` ora `display: flex; align-items: center; min-height: 44px;`.
- [x] [Review][Defer] Nessun link/breadcrumb di ritorno da `/smtp`/`/logo` verso `/impostazioni` — richiederebbe toccare `smtp/page.tsx`/`logo/page.tsx`, esplicitamente fuori scope di questa storia (Dev Notes: "File NON da toccare"); mitigato dal pulsante "indietro" del browser, non bloccante.
- [x] [Review][Defer] `<ul className={styles.lista}>` con `list-style: none` senza `role="list"` — VoiceOver/Safari possono perdere il ruolo implicito di lista. Stesso pattern identico replicato in ogni altra lista di questo progetto (nessuna ha mai `role="list"`), non introdotto né specifico di questa storia.
- [x] [Review][Defer] Il tipo inline di `PROTECTED_ROUTES` (ora 4 campi con commento multi-riga) inizia a essere poco leggibile nel punto di dichiarazione — refactor di forma (estrarre un `type RouteDefinition` nominato), nessun impatto funzionale, da valutare se un quinto campo venisse aggiunto in futuro.
- [x] [Review][Defer] Nessun test per `/impostazioni` con un Utente che ha sia ADMIN sia DIRIGENTE (pattern presente per altre rotte in `route-guard.test.ts`) — la logica di intersezione `.some()` è generica e già coperta da quei test su altre rotte, duplicazione di basso valore.
- [x] [Review][Defer] L'ordine preservato di `/impostazioni` in `PROTECTED_ROUTES` (nella posizione di `/smtp`) è verificato solo in prosa nei Dev Notes, mai da un test (`arrayContaining` è intenzionalmente order-insensitive, stesso stile già stabilito in tutto il file) — nessun impatto comportamentale osservabile oggi.
- [x] [Review][Dismiss] Nessun test di rendering per la nuova pagina `/impostazioni` — coerente con la convenzione "nessun test di rendering" già stabilita e dichiarata esplicitamente nel Task 5 di questa storia.
- [x] [Review][Dismiss] Diff di review scoped ai soli file della File List della storia — scelta deliberata di scoping, non un difetto del codice.
- [x] [Review][Dismiss] Nessun commento "trip-wire" che giustifichi l'assenza di `force-dynamic` sulla pagina hub — la pagina è genuinamente statica, nessun rischio reale oggi.
- [x] [Review][Dismiss] Nessuna evidenza esplicita di aver consultato `node_modules/next/dist/docs/` (AGENTS.md) per questa pagina — Server Component + `next/link` usati qui sono identici al pattern già presente in `smtp/page.tsx`/`logo/page.tsx`, nessuna API nuova o potenzialmente breaking introdotta.

## Dev Notes

- **Perimetro esatto**: `lib/auth/route-guard.ts` (1 campo nuovo + 1 nuova voce + flag su 2 voci esistenti), `lib/auth/voci-navigazione.ts` (1 riga di filtro), `lib/auth/voci-navigazione.test.ts` (test aggiornati), `lib/auth/route-guard.test.ts` (1 nuovo test), nuova cartella `app/(configurazione)/impostazioni/`. Nessuna migrazione, nessuna nuova Server Action, nessuna modifica a `NavBarClient.tsx`/`NavBar.tsx` (il componente già renderizza qualunque array `voci` riceva, non serve toccarlo — riceve un elenco più corto, non una struttura diversa).
- **`VoceNavigazione` resta invariato** (`{ href: string; label: string }`, `lib/auth/voci-navigazione.ts` riga 4) — questa storia non introduce alcuna struttura annidata/gruppo nel tipo di dato della navigazione, deliberatamente (vedi Note aggiuntive sulla decisione presa con l'utente). Se in futuro servisse un vero sottomenu, sarà una storia/decisione separata.
- **`getRouteDecision` non va toccato** (`lib/auth/route-guard.ts` righe 140+) — legge solo `ruoliAmmessi`, il nuovo campo `nascostaDallaNav` è ignorato da quella funzione per costruzione (nessun rischio di introdurre un bypass di autorizzazione).
- **Perché una pagina hub e non un sottomenu**: deciso esplicitamente con l'utente in fase di creazione — un sottomenu espandibile nella sidebar richiederebbe un nuovo pattern di interazione (stato apri/chiudi, auto-espansione quando su una sotto-pagina, gestione da tastiera/aria-expanded) mai costruito prima in questo progetto; la pagina hub riusa invece pattern già esistenti (route protetta + pagina con link, stesso principio di ogni altra pagina dell'app) con un rischio di implementazione molto più basso.
- **`/permessi-certificati` NON va toccata** — resta una voce diretta separata in barra, non inclusa nel raggruppamento "Impostazioni" nonostante sia anch'essa ADMIN-only. Nessun AC di questa storia lo richiede; decisione esplicita dell'utente in fase di creazione.
- **File NON da toccare**: `app/(configurazione)/smtp/*`, `app/(configurazione)/logo/*` (comportamento identico, solo la loro voce di navigazione diretta sparisce), `app/NavBar.tsx`/`app/NavBarClient.tsx` (nessuna modifica: continuano a renderizzare l'array `voci` così com'è, più corto ma stessa forma), `lib/auth/route-guard.ts` → `getRouteDecision`/`matchProtectedRoute` (logica di autorizzazione invariata).

### Project Structure Notes

- File nuovi: `app/(configurazione)/impostazioni/page.tsx`, `app/(configurazione)/impostazioni/impostazioni.module.css`.
- File modificati: `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`, `lib/auth/voci-navigazione.ts`, `lib/auth/voci-navigazione.test.ts`.
- Nessun file eliminato, nessuna migrazione.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.24: Menu principale "Impostazioni" (raggruppa SMTP e Logo)]
- [Source: lib/auth/route-guard.ts righe 24-89 — PROTECTED_ROUTES, voci /smtp (riga 64) e /logo (riga 65) da modificare/spostare, posizione della nuova voce /impostazioni]
- [Source: lib/auth/route-guard.ts righe 140-165 — getRouteDecision, conferma che legge solo ruoliAmmessi/prefix, invariato da questa storia]
- [Source: lib/auth/voci-navigazione.ts — filtraVociNavigazione (righe 12-16) da estendere con un filtro aggiuntivo, VoceNavigazione (riga 4) da NON estendere]
- [Source: lib/auth/voci-navigazione.test.ts righe 33-52 — test da aggiornare (rimuovere /smtp,/logo dall'atteso, aggiungere /impostazioni) e nuovo test da aggiungere]
- [Source: app/(configurazione)/smtp/page.tsx — pattern .pagina-form/.riquadro-form e "nessun controllo di Ruolo nel componente" da replicare identico in impostazioni/page.tsx]
- [Source: app/globals.css righe 116-129 — classi globali .pagina-form/.riquadro-form da riusare invariate]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

### Completion Notes List

- Task 1: `PROTECTED_ROUTES` esteso con `nascostaDallaNav?: boolean`; nuova voce `/impostazioni` (ADMIN-only) nella posizione prima occupata da `/smtp`; `/smtp`/`/logo` ora `nascostaDallaNav: true` (autorizzazione invariata). 2 nuovi test.
- Task 2: `filtraVociNavigazione` esclude le voci `nascostaDallaNav`. Test Admin aggiornato + nuovo test esplicito che `/smtp`/`/logo` non compaiono più.
- Task 3: nuova pagina hub `/impostazioni` (Server Component statico, riusa `.pagina-form`/`.riquadro-form` globali) con due link a `/smtp`/`/logo`.
- Task 4: 793/793 test passati (+3 nuovi), `tsc --noEmit` pulito, ESLint pulito. Nessuna modifica a `smtp/*`/`logo/*`.
- Code review (2026-08-02): Blind Hunter + Edge Case Hunter + Acceptance Auditor — 0 decision-needed, 3 patch applicati (`isVoceAttiva` estesa con `VOCI_FIGLIE_NASCOSTE` cosi' "Impostazioni" resta evidenziata visitando `/smtp`/`/logo`, prima nessuna voce lo era; pagina hub ora legge le etichette da `PROTECTED_ROUTES.navLabel` invece di ripeterle come stringhe letterali; touch target del link portato a 44px con `display:flex`/`align-items:center`/`min-height:44px`, stesso difetto gia' noto in questo progetto). 5 defer (nessun link di ritorno da smtp/logo, `role="list"` mancante - pattern gia' esistente ovunque, tipo `PROTECTED_ROUTES` sempre piu' inline, nessun test ADMIN+DIRIGENTE combinati, ordine nav verificato solo in prosa), 4 scartati come rumore/gia' accettati. 795/795 test passati, 0 errori tsc/eslint dopo i fix.

### File List

- `lib/auth/route-guard.ts` (modificato — campo `nascostaDallaNav`, nuova voce `/impostazioni`, flag su `/smtp`/`/logo`)
- `lib/auth/route-guard.test.ts` (modificato — 2 nuovi test per `/impostazioni`)
- `lib/auth/voci-navigazione.ts` (modificato — filtro `nascostaDallaNav` + `isVoceAttiva` estesa in review)
- `lib/auth/voci-navigazione.test.ts` (modificato — test Admin aggiornato + nuovi test, incluso review fix)
- `app/(configurazione)/impostazioni/page.tsx` (nuovo — etichette lette da `PROTECTED_ROUTES` dopo review)
- `app/(configurazione)/impostazioni/impostazioni.module.css` (nuovo — touch target 44px dopo review)

## Change Log

- 2026-08-02: Implementata Story 9.24 — nuova pagina hub `/impostazioni` (ADMIN-only) che raggruppa "Configurazione SMTP" e "Configurazione logo", non più elencate direttamente in barra (`nascostaDallaNav` su `/smtp`/`/logo`, autorizzazione invariata). Nessun sottomenu espandibile (deciso con l'utente in fase di creazione). 793/793 test passati, 0 errori tsc/eslint.
- 2026-08-02: Code review completata — 3 patch applicati (voce nav evidenziata su /smtp,/logo tramite /impostazioni, etichette derivate da PROTECTED_ROUTES invece di duplicate, touch target 44px), 5 defer, 4 scartati come rumore. 795/795 test passati, 0 errori tsc/eslint dopo i fix. Status: done.
