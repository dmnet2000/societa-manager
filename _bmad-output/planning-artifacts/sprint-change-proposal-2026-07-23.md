# Sprint Change Proposal — 2026-07-23

## 1. Issue Summary

Il sistema di design (`DESIGN.md`/`EXPERIENCE.md`, `ux-designs/ux-societa-manager-2026-07-22/`, finalizzato tra Epic 4 ed Epic 5) è stato applicato solo alle pagine **nuove** create da quel momento in poi (Story 5.1 `vista-dirigente`, Story 5.2 `permessi-certificati`, e il solo componente grafico della Story 6.2 `GraficoMisurazione`). Le storie successive (Epic 6) hanno continuato a replicare deliberatamente lo stile "grezzo" precedente delle pagine che imitavano (es. Story 6.1 `dati-fisici` ha esplicitamente replicato `storico-presenze/page.tsx`, pre-UX), e nessuna storia ha mai retrofittato le pagine di Epic 1/2/3/4/7 già esistenti.

**Verifica concreta:** su 23 pagine totali dell'app, solo 2 (`vista-dirigente`, `permessi-certificati`) usano un CSS module con i token di `DESIGN.md`; una terza (`dati-fisici`) lo usa solo per il componente grafico. Le restanti 20 pagine sono HTML non stilizzato, senza alcun token di colore/spaziatura/forma applicato.

**Categoria:** gap di rollout — un artefatto pianificato (UX spec) è stato prodotto e adottato solo per il lavoro nuovo, mai retrofittato sul lavoro pregresso. Rilevato dall'utente confrontando visivamente le pagine di Epic 5/6 con il resto dell'app.

## 2. Impact Analysis

- **Nessun Epic esistente invalidato.** Tutte le storie 1.x–7.x restano funzionalmente corrette e `done` — questo non è un difetto funzionale, è un debito visivo. Nessun rollback, nessuna riapertura di story già chiuse.
- **Nuovo Epic 8 (UI/UX — Applicazione del Design System)**: 6 nuove storie, una per gruppo di pagine correlate (stessi confini di modulo di AD-2), che applicano `DESIGN.md`/`EXPERIENCE.md` alle 20 pagine rimaste. Puramente presentazionale: nessuna nuova tabella, RLS, Server Action o comportamento — solo CSS module + markup, stesso pattern già stabilito in `vista-dirigente.module.css`/`permessi-certificati.module.css`.
- **PRD:** nessun nuovo FR — questo epic non introduce comportamento, opera su NFR3 (già esistente: "applicazione web responsive... mobile-first") e sull'artefatto UX già prodotto. Nessuna modifica al perimetro v1/v1.1.
- **Architettura:** nessun impatto — nessun nuovo modulo, nessuna nuova AD. Le pagine restano negli stessi route group esistenti.
- **Epics.md:** la sezione "UX Design Requirements" afferma erroneamente "Nessun documento UX prodotto per questo progetto" — questa affermazione è ormai obsoleta (il documento UX è stato prodotto dopo Epic 4) e va corretta.
- **Mockup già disponibili**: 3 dei 4 mockup "key screen" prodotti durante il workflow UX (`key-mio-orario.html`, `key-presenze.html`, `key-certificato-medico.html`) coprono pagine ancora da restilizzare — riducono il rischio/ambiguità delle Story 8.2/8.3/8.4, che hanno già un riferimento visivo approvato da seguire.

## 3. Recommended Approach

**Direct Adjustment** (Opzione 1 del checklist): nessun rollback, nessuna revisione MVP. Si aggiunge un nuovo Epic 8 al backlog, eseguito con lo stesso workflow BMAD delle storie precedenti (create-story → dev-story → code-review per ciascuna storia).

**Rischio:** basso — modifica puramente presentazionale (CSS module + markup), nessuna Server Action/RLS/migrazione toccata, pattern già collaudato due volte (Story 5.1, 5.2). **Effort:** medio — 6 storie, ~20 pagine, ma meccanico e ripetitivo (stesso lavoro già fatto su 3 pagine, da estendere) più che rischioso o ambiguo.

## 4. Detailed Change Proposals

### Epics (`epics.md`)

- Correzione della sezione "UX Design Requirements": non più "nessun documento prodotto", ma riferimento a `ux-designs/ux-societa-manager-2026-07-22/DESIGN.md`/`EXPERIENCE.md`.
- Nuovo **Epic 8: Applicazione del Design System**, **FRs covered: nessuno** (opera su NFR3, nessun nuovo comportamento) — unico epic di questo progetto senza FR propri, per costruzione (è un retrofit visivo, non una nuova funzionalità).
- 6 nuove storie, ciascuna scoping un gruppo di pagine per confine di modulo (AD-2):

  | Story | Pagine | Note |
  |---|---|---|
  | 8.1 Onboarding e Autenticazione | `/accedi`, `/registrati`, `/import-atlete`, `/precaricamento-allenatori` | Primo contatto per ogni nuovo utente — priorità visiva alta |
  | 8.2 Orari e Palestre | `/palestre`, `/slot`, `/orari`, `/mio-orario` | `/mio-orario` ha già un mockup approvato (`key-mio-orario.html`) |
  | 8.3 Presenze | `/presenze`, `/storico-presenze` | `/presenze` ha già un mockup approvato (`key-presenze.html`) |
  | 8.4 Certificati Medici | `/certificato-medico`, `/conferma-certificati`, `/notifiche` | `/certificato-medico` ha già un mockup approvato (`key-certificato-medico.html`) |
  | 8.5 Gruppi, Dati Atleta e Iscrizioni | `/gruppi`, `/wizard-nuova-stagione`, `/dati-fisici` (page/form, il grafico è già fatto), `/conferma-iscrizioni` | Completa il residuo di Epic 2/6 |
  | 8.6 Amministrazione, Configurazione e Pagine Condivise | `/admin`, `/smtp`, `/logo`, home (`/`), `/non-autorizzato` | Pagine solo-Admin o di sistema, priorità visiva più bassa — ultima |

- Ogni storia condivide lo stesso vincolo esplicito (da scrivere nel Dev Notes di ciascuna, per prevenire scope creep): **restyle puro** — nessuna modifica a Server Action, query Prisma, RLS, comportamento o struttura dati; solo `className`/CSS module aggiunti sopra il markup esistente. Tutti i test Vitest esistenti devono continuare a passare invariati (nessuno di essi verifica classi CSS).
- FR Coverage Map: nessuna riga aggiunta (nessun FR coperto).

### PRD

- Nessuna modifica — non introduce nuovo comportamento, nessun nuovo FR/NFR.

### Architettura

- Nessuna modifica — nessun nuovo modulo/AD, le pagine restano nei route group/architettura esistenti.

### Sprint tracking (`sprint-status.yaml`)

- Nuovo blocco `epic-8: backlog` con le 6 storie sopra, tutte `backlog`, inserito in coda al file (dopo `epic-6-retrospective`).

## 5. Implementation Handoff

**Scope: Minor.** Nessuna revisione strategica (PM/Architect), nessuna riorganizzazione di backlog oltre all'aggiunta in coda. Procede direttamente con `create-story` → `dev-story` → `code-review` per Story 8.1, poi le successive nell'ordine sopra (priorità visiva discendente: primo contatto utente → pagine quotidiane → pagine di sistema/Admin).

**Success criteria:** ogni pagina elencata applica i token di colore/spacing/forma di `DESIGN.md` (nessun colore hardcoded fuori da `var(--color-*)`) tramite un CSS module dedicato, con comportamento funzionale identico a prima (nessuna regressione, suite Vitest invariata) e verifica dal vivo (Playwright temporaneo) che conferma che l'aspetto visivo segua `DESIGN.md`/`EXPERIENCE.md` e, dove disponibile, il mockup key-screen approvato.

## 6. Addendum — Story fondativa scoperta durante la pianificazione dettagliata (stesso giorno)

Durante la stesura dei task della prima storia di questo epic, è emerso un gap più fondamentale delle 20 pagine non stilizzate: **nessuna barra di navigazione esiste in nessuna pagina dell'app**, nonostante `EXPERIENCE.md` (righe 60-69) la specifichi in dettaglio e `DESIGN.md` ne definisca i token visivi (componente `nav-bar`). `app/layout.tsx` è tuttora lo scaffold grezzo di `create-next-app` (titolo "Create Next App", `lang="en"`, font Google Geist/Geist_Mono caricati via `next/font/google`, in diretta contraddizione con `DESIGN.md`: "nessun font viene caricato, solo lo stack di sistema").

**Decisione (approvata dall'utente):** aggiunta una nuova **Story 8.1: Layout Globale e Barra di Navigazione**, prerequisito alle 6 storie già proposte, che ora diventano **8.2–8.7** (stessa mappatura pagine-per-storia della tabella sopra, solo rinumerate). Una volta montata nel root layout, la barra di navigazione viene ereditata automaticamente da ogni pagina — le storie 8.2-8.7 restano scoping solo sul contenuto di pagina, non sulla navigazione. Nessun altro impatto sul resto della proposta (PRD, Architettura, rischio/effort invariati — la nuova storia è dello stesso tipo presentazionale delle altre sei).
