---
baseline_commit: e3d8503240ab39760a04d285ea047ce770658541
---

# Story 8.6: Gruppi, Dati Atleta e Iscrizioni

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin, Dirigente, Allenatore o Atleta,
I want vedere le pagine di gestione Gruppi, dati fisici, wizard nuova stagione e conferma iscrizioni con l'identità visiva della società,
so that anche le pagine più recenti (Epic 6) rimaste allo stile precedente siano allineate al resto.

## Acceptance Criteria

1. **Given** le pagine `/gruppi`, `/wizard-nuova-stagione`, `/dati-fisici`, `/conferma-iscrizioni`, **when** vengono visualizzate, **then** applicano i token di `DESIGN.md` tramite un CSS module dedicato (per `/dati-fisici`, coerente con `GraficoMisurazione.module.css` già esistente da Story 6.2).
2. **Given** le stesse pagine, **when** vengono usate normalmente, **then** il comportamento resta identico a prima — nessuna regressione, suite Vitest invariata.

## Note aggiuntive (scoperte in fase di creazione di questa storia, non requisiti originali del PRD)

- **Nessun mockup key-screen approvato per questa storia** (a differenza di 8.3/8.4/8.5) — restyle puro su tutte e 4 le pagine, stesso approccio già usato per `/palestre`, `/slot`, `/orari`, `/conferma-certificati`, `/notifiche` nelle storie precedenti.
- **Pattern tabellare già stabilito da riusare 1:1** (non reinventare): `.scrollWrapper`/`.tabella`/`.tabella th`/`.tabella td`/`.messaggioVuoto`, introdotto in `SlotTable.module.css` (Story 8.3) e riusato identico in `storico-presenze.module.css` (Story 8.4). `/gruppi` e `/conferma-iscrizioni` usano entrambe `<table>` — applicare lo stesso pattern, incluso il `.scrollWrapper` con `overflow-x: auto` (necessario per NFR3, mobile-first: senza, una tabella larga verrebbe tagliata silenziosamente da `overflow-x: hidden` su `<body>`, vedi `app/globals.css` e il review fix di Story 8.3).
- **`/dati-fisici` ha un vincolo particolare**: `GraficoMisurazione.tsx`/`GraficoMisurazione.module.css` (Story 6.2) sono **già** sotto il design system e vanno lasciati intatti — il commento in testa al CSS module lo dice esplicitamente ("il resto di `/dati-fisici` resta nello stile precedente... debito noto, non risolto qui"). Questa storia è quella che salda quel debito per il resto della pagina (`page.tsx`, `MisurazioneForm.tsx`), **senza toccare** `GraficoMisurazione.tsx`/`.module.css`. Nuovo CSS module dedicato (`dati-fisici.module.css`) per il resto della pagina, non un'estensione di `GraficoMisurazione.module.css`.
- **`GruppoRow.tsx` ha un caso senza precedenti nell'Epic 8**: due form (`assegna Allenatore`/`assegna Atleta`) annidati dentro celle `<td>` di una riga tabella — nessuna storia precedente ha restylato form dentro celle di tabella. Riusare `.campo`/`.bottone` (pattern Story 8.2-8.5) ma adattarli a un contesto più compatto (colonna stretta): usare buon senso di spaziatura, nessun requisito esplicito oltre "applica i token, nessun colore hardcoded".
- **`IscrizioneRow.tsx`**: nessun pattern badge dedicato in `EXPERIENCE.md` per lo stato iscrizione ("Iscritta"/"Non iscritta") — la sezione "Pattern di Stato" di `EXPERIENCE.md` copre solo il Certificato Medico (Story 8.5), non le Iscrizioni. Restyle testuale semplice (nessun badge da inventare), coerente con l'assenza di indicazioni esplicite.
- **Vincolo "solo className" per tutte e 4 le pagine** (nessuna eccezione dichiarata questa volta, a differenza di 8.3/8.5): nessuna modifica a `actions.ts`/`actions.test.ts`, nessuna nuova logica di business, nessuna nuova query. Solo `className` + wrapping strutturale minimo (`<section>`/`<div>` dove serve per applicare `.card`/`.sezione`), stesso principio di Story 8.2/8.4.

## Tasks / Subtasks

- [x] Task 1: `app/(gruppi-allenatori)/gruppi/gruppi.module.css` (nuovo) + applica classi in `page.tsx`/`GruppoRow.tsx`/`NuovoGruppoForm.tsx` (AC #1, #2)
  - [x] Sezione "Nuovo Gruppo" (`.sezione`) — `NuovoGruppoForm` riusa `.campo`/`.campo input`/`.bottone`/`.errore`/`.successo` (pattern Story 8.2-8.5).
  - [x] Sezione "Elenco Gruppi" — tabella con `.scrollWrapper`/`.tabella` (riuso 1:1 da `SlotTable.module.css`, Story 8.3).
  - [x] `GruppoRow`: liste Allenatori/Atlete assegnate (`<ul>`) + i due form di assegnazione dentro le celle, versione compatta (`.formCompatto`/`.bottoneCompatto`) di `.campo`/`.bottone`.
  - [x] Nessuna modifica a `actions.ts`/`actions.test.ts`.
- [x] Task 2: `app/(gruppi-allenatori)/wizard-nuova-stagione/wizard-nuova-stagione.module.css` (nuovo) + applica classi in `page.tsx`/`ConfermaWizardForm.tsx` (AC #1, #2)
  - [x] I 3 rami di `page.tsx` (blocco "già ha Gruppi" → `.avviso`, blocco "nessuna stagione precedente" → `.testo`, ramo principale con anteprima → `.testo`/`.lista`) — stessa gerarchia visiva invariata (nessun `<section>` introdotto, la pagina originale non ne aveva).
  - [x] Anteprima Gruppi da copiare (`<ul>`) — `.lista`.
  - [x] `ConfermaWizardForm` — `.bottone`/`.errore`.
  - [x] Nessuna modifica a `actions.ts`.
- [x] Task 3: `app/(dati-atleta)/dati-fisici/dati-fisici.module.css` (nuovo) + applica classi in `page.tsx`/`MisurazioneForm.tsx` (AC #1, #2)
  - [x] **Non toccato** `GraficoMisurazione.tsx`/`GraficoMisurazione.module.css` — invariati (Story 6.2).
  - [x] Sezioni "Le mie misurazioni"/"Misurazioni delle mie Atlete" (`.sezione`).
  - [x] `MisurazioneForm` — `.campo`/`.campo input`/`.bottone`/`.errore`/`.successo`.
  - [x] Selettore Atleta (Allenatore, form `method="get"`) — `.campoSelettore`/`.bottone`, stesso pattern di `/certificato-medico`/`/storico-presenze`.
  - [x] Tabella storico misurazioni — `.scrollWrapper`/`.tabella` (riuso 1:1).
  - [x] Messaggio vuoto "Nessuna misurazione registrata." — `.messaggioVuoto`.
  - [x] Nessuna modifica a `actions.ts`/`lib/misurazioni.ts`/`lib/db-rls/misurazione-atleta.ts`.
- [x] Task 4: `app/(iscrizioni)/conferma-iscrizioni/conferma-iscrizioni.module.css` (nuovo) + applica classi in `page.tsx`/`IscrizioneRow.tsx` (AC #1, #2)
  - [x] Tabella iscrizioni — `.scrollWrapper`/`.tabella` (riuso 1:1).
  - [x] `IscrizioneRow`: stato "Iscritta"/"Non iscritta" — testo semplice (nessun badge, nessun pattern dedicato in `EXPERIENCE.md` per questo stato), pulsanti "Conferma"/"Escludi" — `.bottone`/`.bottoneSecondario`.
  - [x] Messaggi di errore inline (`role="alert"`) — `.errore`.
  - [x] Nessuna modifica a `actions.ts`/`actions.test.ts`.
- [x] Task 5: Verifica (AC #1, #2)
  - [x] `npx tsc --noEmit` pulito.
  - [x] Suite Vitest invariata — 478/478 test passati (nessun test di queste route toccato).
  - [x] Verifica dal vivo parziale: dev server avviato (dopo `rm -rf .next`), le 4 route restituiscono 307 verso `/accedi` (nessuna sessione autenticata, comportamento invariato del route guard), nessun errore di compilazione/runtime nei log.
  - [x] Ispezione diretta del codice: nessun colore hardcoded fuori da `var(--color-*)` in nessuno dei 4 nuovi CSS module (verificato con grep).

### Review Findings

- [x] [Review][Patch] `.campo label` in `dati-fisici.module.css` non impila verticalmente etichetta+input in `MisurazioneForm.tsx` (pattern nested `<label>Testo<input/></label>`, un solo figlio per `.campo` — `flex-direction:column` non ha nulla da stackare), a differenza di tutti gli altri form della storia che usano `<label htmlFor>`+`<input id>` fratelli [app/(dati-atleta)/dati-fisici/MisurazioneForm.tsx, app/(dati-atleta)/dati-fisici/dati-fisici.module.css] — risolto: aggiunto `display:flex; flex-direction:column; gap:var(--space-1)` a `.campo label`
- [x] [Review][Patch] `<p>` "La stagione precedente non ha nessun Gruppo da copiare." dimenticato senza `className` — i due `<p>` fratelli nello stesso file sono stati styled con `.avviso`/`.testo` [app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx:81] — risolto: applicato `.testo`
- [x] [Review][Patch] `.errore` in `conferma-iscrizioni.module.css` è l'unico tra i 4 CSS module della storia senza `margin-top`, incoerenza di spaziatura col messaggio d'errore [app/(iscrizioni)/conferma-iscrizioni/conferma-iscrizioni.module.css] — risolto: aggiunto `margin-top: var(--space-2)`
- [x] [Review][Patch] `.avviso a` usa `var(--color-primary)` su sfondo `var(--color-warning-bg)` — contrasto 2.42:1, sotto la soglia WCAG AA (4.5:1); ogni altra coppia warning-bg del progetto usa `var(--color-warning)` (5.27:1, conforme) [app/(gruppi-allenatori)/wizard-nuova-stagione/wizard-nuova-stagione.module.css] — risolto: cambiato a `var(--color-warning)`
- [x] [Review][Defer] ~70 righe di CSS quasi duplicate tra i 4 nuovi module (`.sezione`/`.campo`/`.bottone`/`.errore`/`.successo`/`.tabella`) — coerente con la scelta architetturale dell'Epic 8 di un CSS module indipendente per pagina, stesso pattern già accettato in Story 8.5 (defer identico per `.bottone`/`.bottoneCarica`) [app/(gruppi-allenatori)/gruppi/gruppi.module.css, app/(dati-atleta)/dati-fisici/dati-fisici.module.css, app/(iscrizioni)/conferma-iscrizioni/conferma-iscrizioni.module.css] — deferred, pre-existing
- [x] [Review][Defer] `align-self: flex-start` su `.bottone` è CSS morto in ogni suo utilizzo (il genitore `<form>` non è mai un contenitore flex) — pattern copiato identico in ogni CSS module dell'Epic 8 dalla Story 8.2 in poi, zero impatto visivo, non una deviazione introdotta da questa storia [app/(gruppi-allenatori)/gruppi/gruppi.module.css, app/(dati-atleta)/dati-fisici/dati-fisici.module.css, app/(gruppi-allenatori)/wizard-nuova-stagione/wizard-nuova-stagione.module.css] — deferred, pre-existing

## Dev Notes

- **Riuso obbligatorio** (stesso principio di ogni storia precedente dell'Epic 8 — non reinventare pattern già stabiliti):
  - `.scrollWrapper`/`.tabella`/`.tabella th`/`.tabella td`/`.messaggioVuoto` — `SlotTable.module.css` (Story 8.3), riusato identico in `storico-presenze.module.css` (Story 8.4).
  - `.campo`/`.campo input`/`.campo select`/`.bottone`/`.errore`/`.successo` — pattern comune Story 8.2-8.5.
  - `.sezione` (heading maiuscolo, letter-spacing) — pattern comune Story 8.4-8.5.
- **`GraficoMisurazione.tsx`/`.module.css` sono fuori scope** — già conformi al design system da Story 6.2, questa storia tocca solo il resto di `/dati-fisici`.
- **Route coinvolte in questa storia sono tutte protette da RLS/route-guard esistenti** (nessuna modifica di autorizzazione): `/gruppi` (Admin/Dirigente), `/wizard-nuova-stagione` (Admin/Dirigente), `/dati-fisici` (Allenatore/Atleta/Genitore), `/conferma-iscrizioni` (Segreteria + Admin/Dirigente in sola lettura per l'esclusione, Story 1.8). Nessuna di queste ADvisor viene toccata da un restyle.
- **`GruppoAtleta`/`GruppoAllenatore`/`Gruppo`/`Allenatore` non sono protetti da RLS (AD-9)** — letti via Prisma diretto in `page.tsx`; `Atleta` invece è protetta da RLS (AD-4), letta solo tramite `elencaAtlete(supabase)`. Non toccare questa separazione durante il restyle (nessuna riga di `page.tsx` che legge dati va spostata/unita).
- **Nessun colore hardcoded fuori da `var(--color-*)`** — stesso criterio di conformità verificato dall'Acceptance Auditor in ogni storia precedente.
- **Lezione da Story 8.4 (code review)**: se questa storia introduce righe cliccabili con requisiti di dimensione minima di tocco, verificare esplicitamente `align-self` sul contenitore flex — non applicabile qui a meno che non si introducano nuovi elementi interattivi oltre a quelli già esistenti (nessun AC lo richiede).

### Project Structure Notes

- Nuovi file: `app/(gruppi-allenatori)/gruppi/gruppi.module.css`, `app/(gruppi-allenatori)/wizard-nuova-stagione/wizard-nuova-stagione.module.css`, `app/(dati-atleta)/dati-fisici/dati-fisici.module.css`, `app/(iscrizioni)/conferma-iscrizioni/conferma-iscrizioni.module.css`.
- File modificati: `gruppi/page.tsx`, `gruppi/GruppoRow.tsx`, `gruppi/NuovoGruppoForm.tsx`, `wizard-nuova-stagione/page.tsx`, `wizard-nuova-stagione/ConfermaWizardForm.tsx`, `dati-fisici/page.tsx`, `dati-fisici/MisurazioneForm.tsx`, `conferma-iscrizioni/page.tsx`, `conferma-iscrizioni/IscrizioneRow.tsx`.
- Non modificati: `dati-fisici/GraficoMisurazione.tsx`, `dati-fisici/GraficoMisurazione.module.css` (già conformi, Story 6.2), tutti gli `actions.ts`/`actions.test.ts` delle 4 route, `lib/anno-agonistico/*`, `lib/db-rls/*`, `lib/misurazioni/*`, `lib/ruoli.ts`.
- Nessuna migrazione, nessuna modifica a `prisma/schema.prisma`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.6: Gruppi, Dati Atleta e Iscrizioni]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md] — token colore/tipografia/spaziatura/forma
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/EXPERIENCE.md] — nessun Pattern di Stato dedicato per Iscrizioni (solo Certificato Medico)
- [Source: app/(orari-palestre)/SlotTable.module.css] — pattern `.tabella`/`.scrollWrapper` da riusare
- [Source: app/(presenze)/storico-presenze/storico-presenze.module.css] — stesso pattern, seconda occorrenza
- [Source: app/(dati-atleta)/dati-fisici/GraficoMisurazione.module.css] — commento esplicito sul debito di stile del resto della pagina, che questa storia risolve
- [Source: _bmad-output/implementation-artifacts/8-5-certificati-medici.md] — storia precedente dell'epic, stesso schema di Dev Notes/Task

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `npx tsc --noEmit` → pulito (nessun errore)
- `npx vitest run` → 47 file di test, 478/478 test passati
- Dev server (`rm -rf .next && npx next dev`) → 4 route (`/gruppi`, `/wizard-nuova-stagione`, `/dati-fisici`, `/conferma-iscrizioni`) → tutte 307 verso `/accedi`, nessun errore nei log

### Completion Notes List

- Restyle puro su 4 route (9 file `.tsx` modificati, 4 CSS module nuovi) — nessuna modifica a `actions.ts`/`actions.test.ts`/query/logica di business in nessuna delle 4 route, conforme al vincolo "solo className" dichiarato nella storia.
- Riusati 1:1 i pattern già stabiliti nell'Epic 8: `.scrollWrapper`/`.tabella` (da `SlotTable.module.css`, Story 8.3) per le 3 tabelle di questa storia (`/gruppi`, `/dati-fisici`, `/conferma-iscrizioni`); `.campo`/`.bottone`/`.errore`/`.successo` (Story 8.2-8.5).
- `GraficoMisurazione.tsx`/`GraficoMisurazione.module.css` (Story 6.2) non toccati, come richiesto.
- Introdotte due varianti compatte senza precedenti nell'Epic 8 per `GruppoRow.tsx` (form annidati in celle tabella): `.formCompatto`/`.bottoneCompatto`/`.listaAssegnati`, dimensionate più piccole del pattern `.campo`/`.bottone` standard per adattarsi alla colonna stretta.
- `IscrizioneRow.tsx`: nessun badge introdotto per "Iscritta"/"Non iscritta" (nessun pattern dedicato in `EXPERIENCE.md` per questo stato) — testo semplice, coerente con la nota della storia.
- `wizard-nuova-stagione/page.tsx`: nessun wrapping `<section>` aggiunto (la pagina originale non ne aveva alcuno, tutto direttamente in `<main>`) — solo classi applicate ai nodi esistenti, minimizzando le modifiche strutturali.

### File List

**Nuovi:**
- `app/(gruppi-allenatori)/gruppi/gruppi.module.css`
- `app/(gruppi-allenatori)/wizard-nuova-stagione/wizard-nuova-stagione.module.css`
- `app/(dati-atleta)/dati-fisici/dati-fisici.module.css`
- `app/(iscrizioni)/conferma-iscrizioni/conferma-iscrizioni.module.css`

**Modificati:**
- `app/(gruppi-allenatori)/gruppi/page.tsx`
- `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx`
- `app/(gruppi-allenatori)/gruppi/NuovoGruppoForm.tsx`
- `app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx`
- `app/(gruppi-allenatori)/wizard-nuova-stagione/ConfermaWizardForm.tsx`
- `app/(dati-atleta)/dati-fisici/page.tsx`
- `app/(dati-atleta)/dati-fisici/MisurazioneForm.tsx`
- `app/(iscrizioni)/conferma-iscrizioni/page.tsx`
- `app/(iscrizioni)/conferma-iscrizioni/IscrizioneRow.tsx`

## Change Log

- 2026-07-24: Implementazione iniziale — restyle completo delle 4 route con CSS module dedicati, nessuna regressione (478/478 test, tsc pulito).
