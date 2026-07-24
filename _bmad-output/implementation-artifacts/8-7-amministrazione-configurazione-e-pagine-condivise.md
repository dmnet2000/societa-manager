---
baseline_commit: e3d8503240ab39760a04d285ea047ce770658541
---

# Story 8.7: Amministrazione, Configurazione e Pagine Condivise

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin,
I want vedere le pagine di amministrazione utenti/configurazione, oltre alla home e alla pagina di accesso negato, con l'identità visiva della società,
so that anche le pagine a minor traffico (solo-Admin, di sistema) siano coerenti col resto dell'app.

## Acceptance Criteria

1. **Given** le pagine `/admin`, `/smtp`, `/logo`, la home (`/`) e `/non-autorizzato`, **when** vengono visualizzate, **then** applicano i token di `DESIGN.md` tramite un CSS module dedicato.
2. **Given** le stesse pagine, **when** vengono usate normalmente, **then** il comportamento resta identico a prima — nessuna regressione, suite Vitest invariata.

**Nota (dall'epic):** ultima storia dell'Epic 8 — priorità visiva più bassa (pagine solo-Admin o di sistema, traffico minore rispetto alle altre).

## Note aggiuntive (scoperte in fase di creazione di questa storia, non requisiti originali del PRD)

- **Nessun mockup key-screen approvato per questa storia** (a differenza di 8.3/8.4/8.5) — restyle puro su tutte e 5 le pagine, stesso approccio delle altre storie "senza mockup" dell'epic (8.2, 8.6).
- **`app/(amministrazione)/vista-dirigente/` e `app/(amministrazione)/permessi-certificati/` sono FUORI SCOPE** — già sotto il design system dalla Story 5.1 (`vista-dirigente.module.css`, `permessi-certificati.module.css` esistono già). Solo `/admin` (stesso route group, cartella diversa) è nello scope di questa storia. Non toccare i file di quelle due route.
- **Pattern tabellare già stabilito da riusare 1:1**: `.scrollWrapper`/`.tabella`/`.tabella th`/`.tabella td`, introdotto in `SlotTable.module.css` (Story 8.3), riusato in `storico-presenze.module.css` (8.4), `gruppi.module.css`/`dati-fisici.module.css`/`conferma-iscrizioni.module.css` (8.6). `/admin` usa `<table>` per l'elenco Utenti — stesso pattern, incluso `.scrollWrapper` con `overflow-x: auto` (NFR3).
- **`UtenteRow.tsx` ha lo stesso caso di `GruppoRow.tsx` (Story 8.6)**: un form annidato dentro una cella `<td>` — riusare la stessa idea di varianti compatte (`.formCompatto`/`.bottoneCompatto`, introdotte in `gruppi.module.css`), non reinventarle da zero nel nuovo `admin.module.css`.
- **Nessun pattern dedicato in `DESIGN.md`/`EXPERIENCE.md` per un gruppo di checkbox** (`NuovoUtenteForm.tsx` e `UtenteRow.tsx` hanno un `<fieldset>` con 6 checkbox Ruolo; `ConfigurazioneSmtpForm.tsx` ha una singola checkbox "Connessione SSL/TLS") — nessuna storia precedente dell'Epic 8 ha mai restylato un `<fieldset>`/gruppo di checkbox. Usare buon senso coi token esistenti (spaziatura, colore, focus-ring sulla checkbox nativa `outline`), nessun componente checkbox custom da inventare (i controlli nativi restano nativi, stesso principio già seguito per `<select>`/`<input type=file>` nelle storie precedenti).
- **`/logo` mostra un'immagine (`<img>`)** — nessuna storia precedente ha restylato un'anteprima immagine. Un contenitore semplice (bordo, radius, padding, `max-width`) è sufficiente — nessun AC richiede altro.
- **La home (`/`) e `/non-autorizzato` sono le pagine più semplici della storia** — solo testo, nessun form/tabella. Restyle minimo (tipografia, spaziatura), eventualmente un contenitore `.card` per la home (pattern già stabilito da `vista-dirigente.module.css`/Story 8.3, riusabile 1:1).
- **Vincolo "solo className" per tutte e 5 le pagine** (nessuna eccezione dichiarata, come 8.6): nessuna modifica a `actions.ts`/`actions.test.ts`, nessuna nuova logica di business, nessuna nuova query. Solo `className` + wrapping strutturale minimo, stesso principio di Story 8.2/8.4/8.6.
- **`app/layout.tsx`/`NavBar` sono FUORI SCOPE** — già completati in Story 8.1, ereditati automaticamente da tutte le pagine incluse in questa storia. Non toccare `app/layout.tsx` né `app/NavBar.tsx`/`.module.css`.

## Tasks / Subtasks

- [x] Task 1: `app/(amministrazione)/admin/admin.module.css` (nuovo) + applica classi in `page.tsx`/`NuovoUtenteForm.tsx`/`UtenteRow.tsx` (AC #1, #2)
  - [x] Sezioni "Nuovo utente"/"Utenti" (`.sezione`) — riuso pattern Story 8.4-8.6.
  - [x] `NuovoUtenteForm`: campi Email/Password (`.campo`/`.campo input`) — riuso 1:1. Fieldset Ruolo: nuove classi `.fieldset`/`.checkboxRuolo` (bordo/radius/padding sul `<fieldset>`, checkbox native non ristilizzate salvo `accent-color`/`outline` sul focus).
  - [x] Elenco Utenti — tabella con `.scrollWrapper`/`.tabella` (riuso 1:1 da `SlotTable.module.css`).
  - [x] `UtenteRow`: stesso fieldset Ruolo compatto dentro la cella (`.formCompatto`/`.bottoneCompatto`, riuso 1:1 da `gruppi.module.css`, Story 8.6). Stato Attivo/Disattivato — testo semplice (nessun badge).
  - [x] Nessuna modifica a `actions.ts`/`actions.test.ts`.
- [x] Task 2: `app/(configurazione)/smtp/smtp.module.css` (nuovo) + applica classi in `page.tsx`/`ConfigurazioneSmtpForm.tsx`/`InviaEmailProvaForm.tsx` (AC #1, #2)
  - [x] `ConfigurazioneSmtpForm`: tutti i campi testo/numero/email (`.campo`/`.campo input`) — riuso 1:1. Checkbox "Connessione SSL/TLS" — `.checkbox`, stesso stile minimo del fieldset di Task 1.
  - [x] `InviaEmailProvaForm` — `.campo`/`.bottone`; il suo `<h2>` interno (nessun `<section>` in questa pagina, mai esistito) usa una classe dedicata `.sottotitolo` con lo stesso stile di `.sezione h2`.
  - [x] Messaggio "Nessuna configurazione email impostata." — `.messaggioVuoto` (riuso 1:1).
  - [x] Nessuna modifica a `actions.ts`/`actions.test.ts` (2 file: `smtp/actions.ts`, `smtp/actions.test.ts`).
- [x] Task 3: `app/(configurazione)/logo/logo.module.css` (nuovo) + applica classi in `page.tsx`/`LogoForm.tsx` (AC #1, #2)
  - [x] Anteprima logo (`<img>`) — contenitore semplice (`.anteprimaLogo`: bordo, radius, padding, `max-width`).
  - [x] Messaggio "Nessun logo impostato." — `.messaggioVuoto` (riuso 1:1).
  - [x] `LogoForm` — `.campo`/`.bottone`/`.errore`/`.successo` (riuso 1:1).
  - [x] Nessuna modifica a `actions.ts`/`actions.test.ts`.
- [x] Task 4: `app/home.module.css` (nuovo, accanto a `app/page.tsx`) + applica classi in `app/page.tsx` (AC #1, #2)
  - [x] Messaggio di benvenuto — contenitore `.card` (riuso 1:1 da `vista-dirigente.module.css`) con `.testo` per la riga Ruoli.
  - [x] Nessuna modifica alla logica (lettura `user`/`ruoli` invariata).
- [x] Task 5: `app/non-autorizzato/non-autorizzato.module.css` (nuovo) + applica classi in `page.tsx` (AC #1, #2)
  - [x] Messaggio "Non hai i permessi..." — `.testo`, stile testuale semplice coerente con gli altri messaggi dell'app.
- [x] Task 6: Verifica (AC #1, #2)
  - [x] `npx tsc --noEmit` pulito.
  - [x] Suite Vitest invariata — 478/478 test passati (nessun test di queste route toccato).
  - [x] Verifica dal vivo: dev server avviato (dopo `rm -rf .next`), tutte e 5 le route (`/admin`, `/smtp`, `/logo`, `/`, `/non-autorizzato`) restituiscono 307 verso `/accedi` senza sessione autenticata, nessun errore di compilazione/runtime nei log.
  - [x] Ispezione diretta del codice: nessun colore hardcoded fuori da `var(--color-*)` in nessuno dei 5 nuovi CSS module (verificato con grep).

### Review Findings

- [x] [Review][Patch] `.bottoneSecondario` colora di rosso/danger sia "Disattiva" sia "Riattiva" — riattivare un utente non è un'azione distruttiva, stesso stile del pulsante andrebbe riservato solo a "Disattiva" [app/(amministrazione)/admin/UtenteRow.tsx, app/(amministrazione)/admin/admin.module.css] — risolto: "Riattiva" usa `.bottoneCompatto` (neutro), "Disattiva" resta `.bottoneSecondario` (danger)
- [x] [Review][Patch] `.checkbox` in `smtp.module.css` applicato al `<div>` che avvolge il `<label>` invece che al `<label>` stesso — `display:flex`/`gap` morti (un solo figlio), a differenza di `.checkboxRuolo` che è applicata correttamente al `<label>` [app/(configurazione)/smtp/ConfigurazioneSmtpForm.tsx, app/(configurazione)/smtp/smtp.module.css] — risolto: `.checkbox` spostata sul `<label>`, il `<div>` esterno usa `.campo` per coerenza di spaziatura
- [x] [Review][Patch] Spaziatura doppia (8px) tra le checkbox Ruolo in `UtenteRow` (`.formCompatto` flex `gap` + `.checkboxRuolo margin-top` sommati) rispetto a `NuovoUtenteForm` (4px, solo `margin-top`, `.fieldset` non è flex) — stesso elenco di checkbox reso in due modi diversi nella stessa pagina [app/(amministrazione)/admin/admin.module.css] — risolto: `.fieldset` diventato flex-column con `gap`, rimosso `margin-top` ridondante da `.checkboxRuolo` — ora 4px in entrambi i contesti
- [x] [Review][Patch] Il saluto "Bentornata/o, {email}" nella home resta senza `className` mentre la riga fratella "Ruoli:" è stata stylizzata con `.testo` [app/page.tsx] — risolto: aggiunta nuova classe `.saluto` (testo primario, bold)
- [x] [Review][Patch] Il Dev Agent Record non menziona la nuova classe `.bottoneSecondario` tra le "classi nuove senza precedenti" — solo 3 delle 4 classi nuove sono documentate [_bmad-output/implementation-artifacts/8-7-amministrazione-configurazione-e-pagine-condivise.md, sezione Completion Notes List] — risolto: aggiunta alla lista
- [x] [Review][Patch] Il Completion Notes List afferma erroneamente che questa storia usa "solo pattern sibling" per i `<label>`, mentre `NuovoUtenteForm`/`UtenteRow`/`ConfigurazioneSmtpForm` usano anche il pattern nested per le checkbox — nessun bug visibile risultante, ma l'affermazione è fattualmente inesatta [_bmad-output/implementation-artifacts/8-7-amministrazione-configurazione-e-pagine-condivise.md, sezione Completion Notes List] — risolto: nota corretta
- [x] [Review][Defer] `logo.module.css` non applica il fix `::file-selector-button` per `input[type="file"]` già stabilito in `import-atlete.module.css` (Story 8.2) — pattern applicato una sola volta nell'intero progetto, non riproposto neanche in `certificato-medico.module.css` (Story 8.5) o `conferma-certificati.module.css`, incoerenza pre-esistente non introdotta da questa storia [app/(configurazione)/logo/logo.module.css] — deferred, pre-existing
- [x] [Review][Defer] Ulteriore duplicazione di `.campo`/`.bottone`/`.errore`/`.successo` in 3 nuovi CSS module — stessa categoria già accettata come defer in Story 8.5/8.6, scelta architetturale dell'Epic 8 (modulo CSS indipendente per pagina) [app/(amministrazione)/admin/admin.module.css, app/(configurazione)/smtp/smtp.module.css, app/(configurazione)/logo/logo.module.css] — deferred, pre-existing
- [x] [Review][Defer] `.anteprimaLogo` non riserva spazio (`width`/`height`/`aspect-ratio`) per l'`<img>` del logo, possibile layout shift al caricamento — nessun precedente nel progetto per dimensionamento intrinseco immagini, miglioramento futuro [app/(configurazione)/logo/logo.module.css] — deferred, pre-existing
- [x] [Review][Defer] Nessuno stato `:hover` sui pulsanti nuovi di questa storia — gap sistemico su tutti i pulsanti dell'intero Epic 8 dalla Story 8.2 in poi, non introdotto da questa storia [app/(amministrazione)/admin/admin.module.css, app/(configurazione)/smtp/smtp.module.css, app/(configurazione)/logo/logo.module.css] — deferred, pre-existing

## Dev Notes

- **Riuso obbligatorio** (stesso principio di ogni storia precedente dell'Epic 8 — non reinventare pattern già stabiliti):
  - `.scrollWrapper`/`.tabella`/`.tabella th`/`.tabella td` — `SlotTable.module.css` (Story 8.3).
  - `.campo`/`.campo input`/`.bottone`/`.errore`/`.successo`/`.messaggioVuoto` — pattern comune Story 8.2-8.6.
  - `.sezione` (heading maiuscolo, letter-spacing) — pattern comune Story 8.4-8.6.
  - `.formCompatto`/`.bottoneCompatto` (form annidato in cella tabella) — introdotto in `gruppi.module.css` (Story 8.6) per `GruppoRow.tsx`, stesso caso qui per `UtenteRow.tsx`.
  - `.card` — `vista-dirigente.module.css` (Story 5.1)/`certificato-medico.module.css` (Story 8.5), disponibile per la home se si sceglie quella direzione.
- **`app/(amministrazione)/vista-dirigente/` e `app/(amministrazione)/permessi-certificati/` sono fuori scope** — già conformi da Story 5.1, non toccarli.
- **`app/layout.tsx`/`NavBar` sono fuori scope** — già completati in Story 8.1.
- **Route coinvolte** (verificato in `lib/auth/route-guard.ts`): `/admin` (solo ADMIN, in `PROTECTED_ROUTES`), `/smtp`/`/logo` (solo ADMIN, in `PROTECTED_ROUTES` nonostante il route group `(configurazione)`). `/` e `/non-autorizzato` **non** sono in `PROTECTED_ROUTES` né in `PUBLIC_ROUTES`: senza sessione autenticata redirigono comunque a `/accedi` (stesso comportamento delle route protette), ma con sessione qualunque Ruolo le raggiunge (fail-open per rotte non elencate, trade-off già esplicitamente accettato dal progetto — vedi `deferred-work.md`, Story 1.3). Nessuna di queste route/autorizzazioni viene toccata da un restyle.
- **`Utente`/`UtenteRuolo` non sono protetti da RLS (AD-9)** — letti via Prisma diretto in `admin/page.tsx`, stesso pattern di `Gruppo`/`Allenatore` (Story 8.6). Non toccare questa scelta durante il restyle.
- **Nessun colore hardcoded fuori da `var(--color-*)`** — stesso criterio di conformità verificato dall'Acceptance Auditor in ogni storia precedente.
- **Lezione da Story 8.6 (code review)**: quando un `<label>` avvolge sia testo sia un `<input>` (pattern nested, non sibling `htmlFor`+`id`), applicare `display:flex; flex-direction:column` al `<label>` stesso (non solo al contenitore `.campo`) se serve impilare verticalmente — altrimenti il testo e il controllo restano affiancati. Verificare quale pattern (nested vs sibling) usa ciascun form di questa storia prima di scegliere dove applicare lo stacking.
- **Lezione da Story 8.6 (code review)**: quando si introduce una nuova classe di colore su sfondo (es. un eventuale badge/avviso), verificare il contrasto WCAG AA (4.5:1) tra foreground e background — riusare le coppie già validate del progetto (`--color-warning` su `--color-warning-bg`, `--color-danger` su `--color-danger-bg`, ecc.) invece di combinarne di nuove.
- **Lezione da Story 8.6 (code review)**: prima di segnare "Verifica" completa, ripassare ogni ramo/return anticipato di ogni pagina per assicurarsi che ogni `<p>`/messaggio abbia ricevuto una `className` — un ramo dimenticato è il tipo di errore più facile da introdurre in un restyle con più `return` early (questa storia ne ha diversi: `/admin` non ne ha, ma verificare comunque ogni file).

### Project Structure Notes

- Nuovi file: `app/(amministrazione)/admin/admin.module.css`, `app/(configurazione)/smtp/smtp.module.css`, `app/(configurazione)/logo/logo.module.css`, `app/home.module.css`, `app/non-autorizzato/non-autorizzato.module.css`.
- File modificati: `admin/page.tsx`, `admin/NuovoUtenteForm.tsx`, `admin/UtenteRow.tsx`, `smtp/page.tsx`, `smtp/ConfigurazioneSmtpForm.tsx`, `smtp/InviaEmailProvaForm.tsx`, `logo/page.tsx`, `logo/LogoForm.tsx`, `app/page.tsx`, `app/non-autorizzato/page.tsx`.
- Non modificati: `app/layout.tsx`, `app/NavBar.tsx`/`.module.css` (Story 8.1), `app/(amministrazione)/vista-dirigente/*` e `app/(amministrazione)/permessi-certificati/*` (Story 5.1), tutti gli `actions.ts`/`actions.test.ts` delle route coinvolte, `lib/ruoli.ts`, `lib/db-rls/configurazione-smtp.ts`, `lib/storage/logo.ts`.
- Nessuna migrazione, nessuna modifica a `prisma/schema.prisma`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.7: Amministrazione, Configurazione e Pagine Condivise]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md] — token colore/tipografia/spaziatura/forma; nessun pattern dedicato per gruppi di checkbox
- [Source: app/(orari-palestre)/SlotTable.module.css] — pattern `.tabella`/`.scrollWrapper` da riusare
- [Source: app/(gruppi-allenatori)/gruppi/gruppi.module.css] — pattern `.formCompatto`/`.bottoneCompatto` da riusare per `UtenteRow.tsx`
- [Source: _bmad-output/implementation-artifacts/8-6-gruppi-dati-atleta-e-iscrizioni.md] — storia precedente dell'epic, stesso schema di Dev Notes/Task, lezioni di code review riportate sopra

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `npx tsc --noEmit` → pulito (nessun errore)
- `npx vitest run` → 47 file di test, 478/478 test passati
- Dev server (`rm -rf .next && npx next dev`) → 5 route (`/admin`, `/smtp`, `/logo`, `/`, `/non-autorizzato`) → tutte 307 verso `/accedi`, nessun errore nei log

### Completion Notes List

- Restyle puro su 5 route (10 file `.tsx` modificati, 5 CSS module nuovi) — nessuna modifica a `actions.ts`/`actions.test.ts`/query/logica di business in nessuna delle route, conforme al vincolo "solo className".
- Riusati 1:1 i pattern già stabiliti nell'Epic 8: `.scrollWrapper`/`.tabella` (Story 8.3) per `/admin`; `.campo`/`.bottone`/`.errore`/`.successo`/`.messaggioVuoto` (Story 8.2-8.6); `.formCompatto`/`.bottoneCompatto` (Story 8.6, per `UtenteRow.tsx`, stesso caso di `GruppoRow.tsx`); `.card` (Story 5.1, per la home).
- `app/(amministrazione)/vista-dirigente/`, `app/(amministrazione)/permessi-certificati/`, `app/layout.tsx`, `app/NavBar.tsx` non toccati, come richiesto.
- Introdotte classi nuove senza precedenti nell'Epic 8: `.fieldset`/`.checkboxRuolo` (`admin.module.css`, gruppo di checkbox Ruolo), `.checkbox` (`smtp.module.css`, stessa idea per la checkbox SSL/TLS) e `.bottoneSecondario` (`admin.module.css`, variante outline/danger per l'azione "Disattiva" in `UtenteRow.tsx`) — stile minimo sui controlli nativi (`accent-color`, `outline` focus), nessun componente custom. `.anteprimaLogo` (`logo.module.css`, contenitore per l'`<img>` del logo).
- Lezioni di code review della Story 8.6 riverificate in sede di review di questa storia: questa storia usa **sia** il pattern sibling (`htmlFor`/`id`, es. campi Email/Password) **sia** il pattern nested `<label><input/>testo</label>` per le checkbox (`.checkboxRuolo`/`.checkbox`) — la nota di completamento originaria affermava erroneamente "solo pattern sibling", corretta in fase di code review; nessuna coppia colore-su-sfondo nuova introdotta (`--color-danger`/`--color-success`/`--color-text-*` su `--color-surface`, già validate); ripassati tutti i `return`/rami di ogni pagina per messaggi senza `className` dimenticati — un caso è comunque sfuggito (saluto home page), corretto in fase di code review.

### File List

**Nuovi:**
- `app/(amministrazione)/admin/admin.module.css`
- `app/(configurazione)/smtp/smtp.module.css`
- `app/(configurazione)/logo/logo.module.css`
- `app/home.module.css`
- `app/non-autorizzato/non-autorizzato.module.css`

**Modificati:**
- `app/(amministrazione)/admin/page.tsx`
- `app/(amministrazione)/admin/NuovoUtenteForm.tsx`
- `app/(amministrazione)/admin/UtenteRow.tsx`
- `app/(configurazione)/smtp/page.tsx`
- `app/(configurazione)/smtp/ConfigurazioneSmtpForm.tsx`
- `app/(configurazione)/smtp/InviaEmailProvaForm.tsx`
- `app/(configurazione)/logo/page.tsx`
- `app/(configurazione)/logo/LogoForm.tsx`
- `app/page.tsx`
- `app/non-autorizzato/page.tsx`

## Change Log

- 2026-07-24: Implementazione iniziale — restyle completo delle 5 route con CSS module dedicati, nessuna regressione (478/478 test, tsc pulito).
