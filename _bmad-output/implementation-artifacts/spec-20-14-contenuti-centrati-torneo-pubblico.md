---
title: "Story 20.14: Contenuti centrati nella pagina pubblica del Torneo"
type: 'feature'
created: '2026-08-26'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '89c040e7c57dc0babc7e294e93d767114516096f'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la pagina pubblica `/torneo` (`app/torneo/page.tsx` + `app/torneo/torneo-pubblico.module.css`) distende oggi il proprio `<main>` a piena larghezza dello schermo — su monitor ampi il contenuto (Edizione, Categorie, gironi, tabellone) appare sbilanciato, richiesta esplicita dell'utente ("non mi piace la visualizzazione ... centrerei i contenuti") dopo la prima verifica dal vivo.

**Approach:** aggiungere `max-width` + centraggio orizzontale (`margin: 0 auto`) al solo `.main` di `torneo-pubblico.module.css`, mirror del valore (`1000px`) già usato come "larghezza massima di pagina" per il portale interno (`app/globals.css`, `.contenuto > main`). Scope confermato con l'utente (AskUserQuestion): **limitato alla sola pagina `/torneo`** — nessuna altra pagina pubblica del sito viene toccata o retrofittata con questo pattern.

## Boundaries & Constraints

**Always:** lo sfondo della pagina resta invariato (nessun riquadro/ombra propri per sezione — esito già stabilito da Story 20.10, qui solo riverificato). Il centraggio si applica solo su schermi larghi: sotto i 1000px il comportamento resta bit-per-bit identico a oggi (il `max-width` semplicemente non vincola nulla sotto quella soglia, nessuna media query aggiuntiva necessaria).

**Ask First:** nessuna.

**Never:** nessuna modifica a `app/app/(torneo)/torneo/torneo.module.css` (pagina interna/amministrativa, modulo CSS separato — stesso boundary di Story 20.6/20.10). Nessuna modifica ad altre pagine pubbliche (`/calendario`, `/squadre`, `/staff`, `/contatti`, home, `[...slug]`) né ad `app/globals.css` — questa storia non introduce un pattern condiviso, solo locale a `/torneo`. Nessuna modifica a `.matchCard`, `.tabellaClassifica`, `.matchGrid`, `.sezioneCategoria` o altre classi interne — solo il contenitore `.main` cambia.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Schermo largo (desktop, >1000px) | rendering `/torneo` | contenuto principale centrato in un blocco di larghezza massima 1000px, margini visibili ai lati | N/A |
| Schermo stretto (mobile, <1000px) | rendering `/torneo` | nessuna regressione — comportamento identico a oggi (`max-width` non vincolante) | N/A |
| Pagina interna amministrativa `/app/torneo/...` | qualunque stato | aspetto invariato bit-per-bit (modulo CSS diverso, non toccato) | N/A |

</frozen-after-approval>

## Code Map

- `app/torneo/torneo-pubblico.module.css` -- `.main` (oggi solo `padding: var(--space-8) var(--space-6);`): aggiungere `max-width: 1000px; margin-left: auto; margin-right: auto;`. Nessuna media query necessaria — `box-sizing: border-box` è già globale (`app/globals.css:139`), quindi il padding esistente resta incluso nel `max-width` senza causare overflow. Il valore `1000px` mirror del token "larghezza massima di pagina" già stabilito per il portale interno (`app/globals.css:99`, `.contenuto > main`), riusato qui come valore, non come selettore condiviso (pattern locale a questa pagina, non globale — nessuna pagina pubblica ha oggi un `<main>` centrato, prima occorrenza del pattern sul sito pubblico).
- `app/torneo/page.tsx` -- nessuna modifica prevista: la struttura JSX (`<main className={styles.main}>`) già usa la classe che riceve il nuovo `max-width`, nessun wrapper aggiuntivo necessario.
- Nessun altro file toccato.

## Tasks & Acceptance

**Execution:**
- [x] `app/torneo/torneo-pubblico.module.css` -- aggiungere `max-width`/`margin: 0 auto` a `.main`

**Acceptance Criteria:** vedi `epics.md` Story 20.14 (Given/When/Then, verbatim — non duplicati qui).

## Spec Change Log

**Ciclo di review 1 (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) — 2026-08-26.** Nessun finding ha richiesto di riaprire l'Intent (nessun `intent_gap`/`bad_spec`). Edge Case Hunter e Verification Gap Reviewer: nessun finding (modifica CSS statica, nessun percorso di regressione osservabile — coerente con la convenzione dell'intero modulo Torneo, zero test di rendering CSS in tutto `app/`).

**PATCH (applicati, entrambi cosmetici/documentali, nessun impatto funzionale)** — Blind Hunter:
1. Nessuna annotazione Story sulla nuova regola, a differenza di ogni altra regola del file (`.metaSlot`, `.numeroGara`, `.sezioneCategoria` hanno tutte un commento `Story 20.X`). Aggiunto un commento sopra `.main` che referenzia Story 20.14, chiarisce che è l'unica eccezione esplicita e confermata con l'utente al "mirror stilistico" dichiarato nell'header del file (le pagine gemelle `/calendario`/`/squadre` restano a piena larghezza, nessun retrofit — scope già confermato via AskUserQuestion in fase di pianificazione), e referenzia la provenienza del valore `1000px` (`app/globals.css`, `.contenuto > main`, Story 9.3 — stesso numero, non lo stesso selettore/pattern condiviso).
2. `margin-left: auto; margin-right: auto;` → `margin: 0 auto;` (shorthand), coerente con lo stesso pattern di centraggio già in uso in `app/[...slug]/pagina-pubblica.module.css` (`.titolo`/`.contenuto`). Nessun cambio di comportamento (margin verticale già 0 tramite il reset globale `* { margin: 0 }`).

Finding scartati (rumore/gia' deciso dallo scope confermato con l'utente, non un gap reale): header/footer pubblici restano a piena larghezza mentre `.main` è centrato (pattern web standard "barra di navigazione piena larghezza + contenuto centrato", header/footer sono componenti condivisi da ogni pagina pubblica — toccarli avrebbe violato il Boundary "Never: nessuna modifica ad altre pagine pubbliche"); nessuna verifica visiva dal vivo registrata nel commento (già esplicitamente demandata all'utente post-deploy, stessa convenzione di ogni story di questa epica, vedi spec `## Verification`); volantino ora implicitamente limitato a 1000px (conseguenza intenzionale di "il contenuto principale... è contenuto in un blocco centrato", `.volantino` resta `max-width: 100%` del proprio contenitore, nessuna distorsione); nessuna decisione registrata sul propagare il centraggio alle altre pagine pubbliche (già risolto esplicitamente con l'utente: scope limitato alla sola `/torneo`); gutter proporzionalmente più ampio su monitor molto larghi (stesso trade-off già accettato dal pattern gemello 1000px del portale interno, non specifico di questa modifica); `.matchGrid`/`.tabellaClassifica` non rivisti per il nuovo limite (verificato: entrambi fluidi — `grid-template-columns: repeat(2, 1fr)` e `width: 100%` — si restringono senza overflow, stesso comportamento già presente su qualunque viewport più stretto di 1000px oggi); guida in-app non aggiornata (verificato: `lib/guida/contenuti.ts` non documenta l'aspetto/larghezza della pagina pubblica, solo funzionalità di gestione — nessuna voce da aggiornare).

Riverificato dopo le patch: `npx vitest run` (120 file, 1852 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 21 warning preesistenti).

## Design Notes

**Perché `1000px` e non un altro valore:** riuso diretto del valore già stabilito come "larghezza massima di pagina" nel portale interno (`app/globals.css`, estensione Story 9.3, 2026-07-26) — stesso principio di margine visibile anche su laptop 13"-14", non solo su monitor molto larghi. Nessun nuovo valore inventato.

**Perché solo `.main` e non un nuovo elemento wrapper:** `.main` è già il contenitore diretto di tutto il contenuto della pagina (`<main className={styles.main}>...</main>` in `page.tsx`) — aggiungere `max-width`/`margin: 0 auto` direttamente sulla classe esistente ottiene il centraggio senza toccare il JSX.

## Verification

**Commands:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`

**Manual checks (obbligatorio, da demandare all'utente dopo il deploy — AC #3 lo richiede esplicitamente "verificato dal vivo dopo il deploy, non solo in sandbox"):** aprire `/torneo` su schermo largo (desktop) e verificare il contenuto centrato con margini laterali visibili; ridurre la finestra sotto 1000px e verificare nessuna differenza rispetto al comportamento attuale; verificare che lo sfondo resti coerente con le altre pagine pubbliche (nessun riquadro/ombra per sezione).

## Suggested Review Order

- Contenitore centrato: `max-width`/`margin: 0 auto` aggiunti a `.main`, unica modifica della storia.
  [`torneo-pubblico.module.css:20`](../../app/torneo/torneo-pubblico.module.css#L20)
