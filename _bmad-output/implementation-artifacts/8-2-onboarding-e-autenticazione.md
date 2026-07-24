---
baseline_commit: e3d8503240ab39760a04d285ea047ce770658541
---

# Story 8.2: Onboarding e Autenticazione

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a nuovo Utente di qualunque Ruolo,
I want vedere le pagine di accesso/registrazione/import/precaricamento con l'identità visiva della società,
so that la prima impressione dell'app sia curata quanto il resto, non un modulo grezzo.

## Acceptance Criteria

1. **Given** le pagine `/accedi`, `/registrati`, `/import-atlete`, `/precaricamento-allenatori`, **when** vengono visualizzate, **then** applicano i token di colore/tipografia/spaziatura/forma di `DESIGN.md` (nessun colore hardcoded fuori da `var(--color-*)`) tramite un CSS module dedicato.
2. **Given** le stesse pagine, **when** vengono usate normalmente, **then** il comportamento (validazione, Server Action, redirect, messaggi di errore) resta identico a prima — nessuna regressione, suite Vitest invariata.

## Contesto: perché questa storia esiste

Retrofit del design system (`DESIGN.md`/`EXPERIENCE.md`, prodotto tra Epic 4 ed Epic 5) sulle 4 pagine di Onboarding-Import rimaste allo scaffold grezzo di `create-next-app` (nessun CSS module, `<div>`/`<label>`/`<input>` senza classi). Restyle puro, secondo il vincolo trasversale dell'Epic 8: nessuna modifica a Server Action, validazione, query, redirect o struttura dati — solo `className`/CSS module aggiunti sopra il markup esistente. Story 8.1 (layout globale/nav-bar) è già completata e montata in `app/layout.tsx`: queste 4 pagine la ereditano già automaticamente, questa storia si occupa solo dello stile del contenuto di pagina.

## Tasks / Subtasks

- [x] Task 1: `app/(auth)/accedi/accedi.module.css` (nuovo) + applica classi in `app/(auth)/accedi/page.tsx` (AC #1, #2)
  - [x] Form container, coppie label/input, messaggio di errore (`role="alert"`, invariato), pulsante submit, link "Registrati".
  - [x] Nessuna modifica a `actions.ts`, a `useActionState`, agli `id`/`name` dei campi, ai `required`, al testo del messaggio di errore.
- [x] Task 2: `app/(onboarding-import)/registrati/registrati.module.css` (nuovo) + applica classi in `page.tsx` (AC #1, #2)
  - [x] Form container, `<fieldset>`/`<legend>` "Ruolo (uno o più)" (riusa il pattern `.fieldset` già stabilito in `permessi-certificati.module.css`, stesso `border`/`border-radius: var(--radius-md)`/`padding: var(--space-4)`), righe checkbox ruolo, i 3 campi condizionali (Codice Fiscale Allenatore/Atleta/Genitore), messaggio di errore, pulsante submit, link "Accedi".
  - [x] Nessuna modifica alla logica `toggleRuolo`/`ruoliSelezionati`/render condizionale dei campi — solo `className` aggiunte agli elementi già esistenti.
- [x] Task 3: `app/(onboarding-import)/import-atlete/import-atlete.module.css` (nuovo) + applica classi in `page.tsx` (AC #1, #2)
  - [x] Form upload file, pulsante submit, sezione riepilogo import (`role="status"`, invariato: conteggi create/aggiornate/riportate, lista righe scartate).
  - [x] Nessuna modifica a `importaAtlete`/`actions.ts`/`parser.ts` — solo `className`.
- [x] Task 4: `app/(onboarding-import)/precaricamento-allenatori/precaricamento-allenatori.module.css` (nuovo) + applica classi in `page.tsx` (AC #1, #2)
  - [x] Form (nome, Codice Fiscale), messaggio di errore, messaggio di successo (`role="status"`, invariato), pulsante submit.
- [x] Task 5: Pulsante primario — riusa la classe già stabilita, non reinventarla
  - [x] I 4 pulsanti submit di questa storia usano lo stesso pattern esatto già in produzione in `permessi-certificati.module.css` (`.bottone`): `background: var(--color-button-bg)`, `color: var(--color-surface)`, `border-radius: var(--radius-sm)`, `text-transform: uppercase`, `font-weight: 700`, `font-size: 12.5px`, `letter-spacing: 0.03em`, `:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }` — coerente con `DESIGN.md` → Componenti → `button-primary`.
  - [x] Il testo sorgente del pulsante resta in maiuscolo/minuscolo naturale nel JSX (es. "Accedi", "Registrati", "Importa", "Precarica") — la resa maiuscola è solo `text-transform` CSS, mai la stringa stessa (regola esplicita di `DESIGN.md`, screen reader/braille).
- [x] Task 6: Verifica dal vivo (manuale)
  - [x] Le 4 pagine mostrano i colori/tipografia del design system, nessun colore hardcoded fuori da `var(--color-*)` (ispezione diretta dei 5 CSS module creati — nessun valore esadecimale/rgb inline).
  - [x] Dev server avviato (dopo `rm -rf .next`, coerente con la nota di manutenzione nota da sessioni precedenti): `/accedi` e `/registrati` (200, nessuna sessione richiesta) verificate via HTML servito — le classi CSS module risultano applicate (`accedi-module__...__form/campo/bottone/link`, `registrati-module__...__form/campo/fieldset/rigaRuolo/bottone/link`), nessun errore di rendering. `/import-atlete` e `/precaricamento-allenatori` restituiscono 307 verso `/accedi` (nessuna sessione autenticata in questa verifica) — comportamento invariato del route guard esistente, non una regressione di questa storia.
  - [x] Non verificato con una sessione autenticata reale (Admin/Dirigente) il rendering interno di `/import-atlete`/`/precaricamento-allenatori` dietro login — a differenza di Story 8.1 non è stato allestito un ambiente Docker+Supabase locale con utenti di test per questa storia (restyle a basso rischio, nessuna Server Action toccata); il markup e le classi applicate sono comunque identiche in struttura a quelle verificate dal vivo per `/accedi`/`/registrati`.
  - [x] Suite Vitest completa invariata: 468/468 test passati (nessun nuovo test — Client Component, mai testati con un test-runner React in questa codebase, coerente con Story 8.1 Dev Notes).
  - [x] `npx tsc --noEmit` pulito.

## Dev Notes

- **Restyle puro, zero comportamento nuovo** — stesso vincolo di ogni storia 8.2-8.7 (epics.md, Epic 8): nessuna modifica a Server Action, query, RLS, redirect, validazione. Solo `className`/CSS module sopra il markup esistente. Non toccare `actions.ts` in nessuna delle 4 route.
- **`role="alert"`/`role="status"` sui messaggi di stato restano invariati** — sono già presenti in tutte e 4 le pagine (`accedi`, `registrati`, `import-atlete`, `precaricamento-allenatori`); aggiungere solo `className` per il colore (`var(--color-danger)` su errore, `var(--color-success)` su successo), mai rimuovere o spostare l'attributo `role`.
- **Nessun pattern di campo testo/file/password esiste ancora nel codebase sotto il design system** — a differenza del pulsante primario (già stabilito, vedi Task 5) o del fieldset (già stabilito in `permessi-certificati.module.css`), non esiste ancora nessun `<input type="text|email|password|file">` stilizzato in nessuna pagina costruita da Story 5.1 in poi. `DESIGN.md` → Componenti non elenca esplicitamente un componente "campo form" (solo `nav-bar`, `badge`, `stat-tile`, `attendance-row`, `button-primary`). Questa storia introduce quindi il primo pattern di campo input del sistema — **deriva coerenza dai token base già esistenti**, non inventare una direzione nuova: bordo `var(--color-border)`, `border-radius: var(--radius-sm)`, testo `var(--color-text-primary)`/label in `var(--color-text-secondary)`, focus con `var(--color-focus-ring)` (stesso identico anello — 2px, offset 2px — già usato su pulsanti e stat-tile cliccabili). Il pattern che si stabilisce qui diventerà il riferimento implicito per i form successivi dell'Epic 8 (es. Story 8.7 → `/smtp`, `/logo`, `/admin`).
- **Non stilizzare `<h1>`/`<main>` con classi dedicate** — precedente consistente in tutte le pagine già costruite sul design system (`vista-dirigente/page.tsx`, `permessi-certificati/page.tsx`): `<h1>` resta senza `className`, stile browser di default. Non introdurre qui un nuovo pattern "titolo di pagina" non richiesto da nessun AC né presente altrove.
- **Nessuna dipendenza tra le 4 pagine** — possono essere implementate in qualunque ordine; nessuna condivide componenti (a differenza di Story 8.1, dove `NavBar` è condiviso).

### Project Structure Notes

- Nuovi file: `app/(auth)/accedi/accedi.module.css`, `app/(onboarding-import)/registrati/registrati.module.css`, `app/(onboarding-import)/import-atlete/import-atlete.module.css`, `app/(onboarding-import)/precaricamento-allenatori/precaricamento-allenatori.module.css` — CSS module colocato con la pagina, nome file = nome route, stesso pattern esatto di `vista-dirigente.module.css`/`permessi-certificati.module.css` (Story 5.1/5.2).
- File modificati: i 4 `page.tsx` corrispondenti (solo aggiunta `import styles from "./<nome>.module.css"` + `className`) — nessuna modifica a `actions.ts`, `actions.test.ts`, `parser.ts`, `parser.test.ts`.
- Nessuna migrazione, nessuna modifica a `prisma/schema.prisma`, nessun nuovo test Vitest previsto.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8: Applicazione del Design System, Story 8.2] — AC originali, vincolo trasversale restyle puro.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md] — token colore/tipografia/spaziatura/forma; sezione Componenti → `button-primary` (uppercase via CSS, non stringa; focus-ring); nessun componente "campo form" esplicitamente definito (gap, vedi Dev Notes).
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/EXPERIENCE.md] — righe 60-67 (tabella superfici di sistema: `/accedi`, `/registrati`) e righe 43-58 (viste gestionali: `/import-atlete`, `/precaricamento-allenatori`); Primitive di Interazione → "Errori di validazione form, sempre associati al campo" (già rispettato dal markup esistente, non da reintrodurre).
- [Source: app/(amministrazione)/permessi-certificati/permessi-certificati.module.css] — pattern `.bottone` (button-primary) e `.fieldset` da riusare identici.
- [Source: app/(amministrazione)/vista-dirigente/page.tsx, app/(amministrazione)/permessi-certificati/page.tsx] — precedente "`<h1>` senza className".
- [Source: app/globals.css] — tutte le custom property `--color-*`/`--radius-*`/`--space-*` da Story 5.1, uniche disponibili.
- [Source: _bmad-output/implementation-artifacts/8-1-layout-globale-e-barra-di-navigazione.md] — Story precedente dell'epic: nav-bar già montata in `app/layout.tsx`, ereditata automaticamente da queste 4 pagine; nessuna azione richiesta qui sulla navigazione.
- [Source: app/(auth)/accedi/page.tsx, app/(onboarding-import)/registrati/page.tsx, app/(onboarding-import)/import-atlete/page.tsx, app/(onboarding-import)/precaricamento-allenatori/page.tsx] — markup corrente da restylare, letto integralmente in fase di creazione di questa storia.

### Review Findings

- [x] [Review][Patch] Checkbox di ruolo e link testuali ("Registrati"/"Accedi") non mostravano un contorno di focus da tastiera dedicato — `DESIGN.md` → "Stato di focus" elenca esplicitamente checkbox e link fra gli elementi interattivi che devono mostrare `{colors.focus-ring}`, non solo pulsante/campo testo [app/(onboarding-import)/registrati/registrati.module.css, app/(auth)/accedi/accedi.module.css] — risolto aggiungendo `:focus-visible` (stesso `outline: 2px solid var(--color-focus-ring); outline-offset: 2px;` già usato su `.bottone`/`.campo input`) su `.rigaRuolo input` e su `.link a` in entrambi i file; verificato `tsc`/Vitest invariati dopo la patch
- [x] [Review][Patch] Le righe di "Righe scartate" nel riepilogo import (`.scartate`) non avevano alcuna spaziatura verticale fra loro — con più righe scartate il risultato rischiava di leggersi come un unico blocco di testo indistinto [app/(onboarding-import)/import-atlete/import-atlete.module.css] — risolto con `.scartate li + li { margin-top: var(--space-1); }`
- [x] [Review][Patch] Il pulsante nativo ("Scegli file"/browser-default) dell'`<input type="file">` in `/import-atlete` non riceveva alcuno stile da `.campo input` (i browser non applicano border/padding/radius al sotto-elemento nativo del file picker), restando nell'aspetto grezzo del browser mentre ogni altro controllo della pagina applicava i token del design system [app/(onboarding-import)/import-atlete/import-atlete.module.css] — risolto con una regola dedicata `::file-selector-button` coerente con `button-primary` (`var(--color-button-bg)`, `var(--radius-sm)`, tipografia pulsante)
- [x] [Review][Defer] Valori tipografici hardcoded (non custom property) in tutti e 4 i CSS module di questa storia — pattern preesistente identico in ogni CSS module del progetto (nessuna custom property tipografica esiste in `app/globals.css`), non introdotto da questa storia [app/(auth)/accedi/accedi.module.css e gli altri 3 CSS module]
- [x] [Review][Defer] Nessun valore di fallback nelle funzioni `var(--color-*)` — stesso pattern identico in ogni CSS module esistente dalla Story 5.1 in poi, non introdotto da questa storia [tutti i CSS module di questa storia]
- [x] [Review][Defer] Nessuna rete di sicurezza sui nomi di classe CSS module (`styles.qualcosaDiSbagliato` compila comunque come `string`) — limite strutturale TypeScript/Next.js su ogni CSS module del progetto, non specifico di questa storia [tutti i CSS module di questa storia]
- [x] [Review][Defer] Nessun test automatico protegge `role="alert"`/`role="status"` dalle 4 pagine da regressioni future — coerente con la convenzione già stabilita dal progetto (solo funzioni pure hanno test Vitest, mai Client Component testati con un test-runner React, esplicitato in Story 8.1) [app/(auth)/accedi/page.tsx e gli altri 3 page.tsx]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- Dev server riavviato dopo `rm -rf .next` per la verifica dal vivo (stessa nota di manutenzione già nota da sessioni precedenti su corruzione di `.next/dev/types`).
- Verifica dal vivo limitata a HTTP/HTML servito (nessun ambiente Docker+Supabase locale allestito per questa storia, a differenza di Story 8.1) — restyle puro a basso rischio, nessuna Server Action toccata.

### Completion Notes List

- Introdotto il primo pattern di campo form (`.campo`) del sistema di design in questa codebase: bordo `var(--color-border)`, `border-radius: var(--radius-sm)`, focus `var(--color-focus-ring)` — derivato dai token base, nessun componente "campo" era definito in `DESIGN.md`.
- Riusato 1:1 il pattern `.bottone` (button-primary) e `.fieldset` già stabiliti in `permessi-certificati.module.css` (Story 5.2) — nessuna nuova variante introdotta.
- Nessuna modifica a `actions.ts`/`parser.ts` in nessuna delle 4 route — solo `className` aggiunte sopra il markup esistente, comportamento identico.
- `npx tsc --noEmit` pulito. Suite Vitest: 468/468 test passati, nessun nuovo test (invariata rispetto a Story 8.1 — nessuna Server/Client Component testata con test-runner React in questa codebase).

### File List

- `app/(auth)/accedi/accedi.module.css` (nuovo)
- `app/(auth)/accedi/page.tsx` (modificato: `className` su form/campi/errore/pulsante/link)
- `app/(onboarding-import)/registrati/registrati.module.css` (nuovo)
- `app/(onboarding-import)/registrati/page.tsx` (modificato: `className` su form/campi/fieldset/righe ruolo/errore/pulsante/link)
- `app/(onboarding-import)/import-atlete/import-atlete.module.css` (nuovo)
- `app/(onboarding-import)/import-atlete/page.tsx` (modificato: `className` su form/campo/errore/pulsante/riepilogo/righe scartate)
- `app/(onboarding-import)/precaricamento-allenatori/precaricamento-allenatori.module.css` (nuovo)
- `app/(onboarding-import)/precaricamento-allenatori/page.tsx` (modificato: `className` su form/campi/errore/successo/pulsante)
