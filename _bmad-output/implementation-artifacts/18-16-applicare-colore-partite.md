---
baseline_commit: b62ae033996cf0d90e31893359bd5c445ca352a8
---

# Story 18.16: Applicare al codice reale il nuovo colore del registro "Poster Sportivo" (blu carbone + azzurro medio dei blocchi partite)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Visitatore senza account,
I want che il sito pubblico live rifletta la palette aggiornata (nessun nero, blocchi partite in un azzurro medio dedicato, testo delle partite leggibile e ben allineato),
so that il sito che vedo corrisponda a quanto deciso nella revisione UX, non a una versione superata.

## Acceptance Criteria

1. **Given** un Visitatore **When** visita qualunque pagina pubblica (`/`, `/squadre`, `/calendario`, `/staff`, `/contatti`) **Then** nessun elemento usa più `#0B0E14`/`#0b0e14` (verificabile con una ricerca testuale nel codice) — ogni occorrenza è sostituita da `#0F2438` (`{colors.blu-carbone}`) o, per le match-card, da `#2E6F99` (`{colors.azzurro-partite}`) secondo l'inventario dei Task.
2. **And** ogni occorrenza di `#1C2433`/`#1c2433` (`{colors.placeholder-hatch-alt}`) diventa `#17384F`.
3. **And** la didascalia dei placeholder-foto (hero e team-card) ha opacità 0.55, non più 0.5.
4. **And** le match-card di `/` e `/calendario` hanno lo stesso layout: divisore "vs" colorato `{colors.magenta-chiaro}` tra le squadre, metadati (data/ora, luogo, categoria) allineati a sinistra via `gap` — non più `justify-content: space-between` in nessuna delle due pagine.
5. **And** nessuna regressione funzionale: le regole di visibilità condizionale, il wrap della nav, i target di tocco 44px e i contorni di focus restano invariati — questa storia cambia solo colori/layout interno delle match-card, non aggiunge/rimuove alcuna condizione già validata (18.2 AC#2, 18.3 AC#2, 18.4 AC#3, 18.9 AC#3).
6. **And** ogni test esistente che verifica contenuto/comportamento resta valido; nessun test attuale dipende dal testo piatto `"{squadraCasa} - {squadraOspite}"` sostituito in questa storia (verificato: nessun file `*.test.{ts,tsx}` importa `app/page.tsx`).
7. **And** il colore della riga di copyright nel footer pubblico (`app/FooterPubblico.module.css`) usa il valore corretto di `{colors.testo-scuro-muto}` (`#838E9E`), non il vecchio `#7B8697` che `DESIGN.md` ha già superato durante la sessione UX di Story 18.15 — scoperto leggendo il codice reale mentre si preparava questa storia, non presente nell'inventario originale della Story 18.15.

## Tasks / Subtasks

- [x] Task 1: Header, Footer, Cookie banner, Contatti, Staff — sostituzione diretta nero → blu carbone (AC: #1, #2, #5, #7)
  - [x] `app/HeaderPubblico.module.css` riga 28: `.header{background:#0b0e14}` → `#0f2438`.
  - [x] `app/FooterPubblico.module.css`: riga 11 `.footer{background:#0b0e14}` → `#0f2438`; riga 44 sfondo idle icona social `#1c2433` → `#17384f`; riga 57 `.iconaSocial:hover{color:#0b0e14}` → `#0f2438`.
  - [x] **Correzione aggiuntiva scoperta preparando questa storia, non presente nell'inventario originale di Story 18.15**: `app/FooterPubblico.module.css` riga 17-20, `color: #7b8697` (commento sorgente: "`{colors.testo-scuro-muto}` `#7B8697`") — questo è il valore **vecchio**, da prima della correzione fatta in `DESIGN.md` durante la sessione UX di Story 18.15 (`{colors.testo-scuro-muto}` è stato corretto a `#838E9E` perché `#7B8697` scende a 4.29:1 sul nuovo sfondo `{colors.blu-carbone}`, sotto soglia AA). Il codice non ha mai recepito quella correzione. Sostituire `#7b8697` con `#838e9e` e aggiornare il commento sorgente.
  - [x] `app/CookieBanner.module.css`: righe 25 e 132 (`border-top: 2px solid #0b0e14`) → `#0f2438`; righe 39 e 63 (`color: #0b0e14`) → `#0f2438`.
  - [x] `app/contatti/contatti.module.css`: righe 74, 86 (`.valore`/`.link{color:#0b0e14}`) → `#0f2438`; riga 113 (`.iconaSocial{background:#1c2433}`) → `#17384f`; riga 123 (`.iconaSocial:hover{color:#0b0e14}`) → `#0f2438`.
  - [x] `app/staff/staff.module.css` riga 70: `.nomeAllenatore{color:#0b0e14}` → `#0f2438`.
  - [x] Aggiornare ogni commento sorgente che cita `{colors.nero}`/`#0B0E14` con `{colors.blu-carbone}`/`#0F2438` (i commenti sono la fonte di verità per i futuri sviluppatori, non lasciarli disallineati dal valore reale).

- [x] Task 2: Hero (`app/home-pubblica.module.css`) — nero → blu carbone, pattern placeholder, opacità didascalia (AC: #1, #2, #3)
  - [x] Riga 22: `.hero{background:#0b0e14}` → `#0f2438`.
  - [x] Righe 34-37: `.heroFoto{background:repeating-linear-gradient(45deg,#0b0e14,#0b0e14 14px,#1c2433 14px,#1c2433 28px)}` → `#0f2438`/`#17384f`.
  - [x] Riga 55: `.heroFoto::before{color:rgba(255,255,255,0.5)}` → `rgba(255,255,255,0.55)`.
  - [x] Riga 106: `.heroCta{color:#0b0e14}` → `#0f2438`.
  - [x] Riga 380: `.nomeGruppoFoto{color:#0b0e14}` → `#0f2438`.

- [x] Task 3: `app/squadre/squadre.module.css` — pattern placeholder team-card, opacità didascalia (AC: #1, #2, #3)
  - [x] Righe 116-119: `.placeholderFoto{background:repeating-linear-gradient(-45deg,#0b0e14,#0b0e14 10px,#1c2433 10px,#1c2433 20px)}` → `#0f2438`/`#17384f`.
  - [x] Riga 137: `.placeholderFoto::before{color:rgba(255,255,255,0.5)}` → `rgba(255,255,255,0.55)`.

- [x] Task 4: `app/calendario/calendario.module.css` — match-card su `{colors.azzurro-partite}` (AC: #1, #4, #5)
  - [x] Riga 88: `.matchCard{background:#0b0e14}` → `#2e6f99` (`{colors.azzurro-partite}`, letterale, nessun custom property equivalente).
  - [x] Righe 113-119 (`.categoria{color:var(--color-primary)}`): sostituire con `color:#eaf4fb` letterale (`{colors.testo-chiaro-partite}` — l'azzurro pieno scenderebbe a 1.90:1 su questo sfondo più chiaro, sotto soglia AA).
  - [x] Riga 140 (`.vs{color:var(--color-magenta)}`): sostituire con `color:#ffcbe6` letterale (`{colors.magenta-chiaro}` — il magenta pieno scenderebbe a 1.21:1 su questo sfondo, quasi la stessa luminanza dello sfondo).
  - [x] Riga 155 (`.meta{color:#aeb6c2}`): sostituire con `#eaf4fb` (`{colors.testo-chiaro-partite}`).
  - [x] **Nessuna modifica di layout qui**: `.squadre{display:flex;gap:var(--space-2)}` e `.meta{display:flex;flex-wrap:wrap;gap:var(--space-3)}` sono **già** allineati a sinistra via `gap` (non `space-between`) — questa pagina è già corretta strutturalmente, cambia solo colore.

- [x] Task 5: `app/home-pubblica.module.css` — match-card su `{colors.azzurro-partite}` + parità con `/calendario` (AC: #1, #4, #5, #6)
  - [x] Riga 258: `.schedaPartita{background:#0b0e14}` → `#2e6f99` (`{colors.azzurro-partite}`).
  - [x] Riga 292 (`.dataPartita`): rimuovere `justify-content: space-between`, sostituire con `gap: var(--space-3)` (mirror esatto di `.meta` in `calendario.module.css` riga 147-156) — oggi spinge data e ora ai due margini opposti della card, causa probabile del feedback dell'utente ("il testo lo sposterei più a sinistra"). Colore da `#aeb6c2` a `#eaf4fb` (`{colors.testo-chiaro-partite}`).
  - [x] Riga 311 (`.luogoPartita{color:#aeb6c2}`): → `#eaf4fb`.
  - [x] Righe 317-323 (`.gruppoPartita{color:var(--color-primary)}`): → `color:#eaf4fb` letterale (stesso motivo del Task 4: l'azzurro pieno scenderebbe sotto soglia).
  - [x] **Nuovo divisore "vs"** in `.squadrePartita` — oggi (riga 296-304) è testo piatto senza alcun elemento colorato: aggiungere una regola `.vs{color:#ffcbe6;font-size:inherit;font-weight:inherit}` (mirror esatto di `.vs` in `calendario.module.css` riga 139-143, stesso principio "mai più piccolo di `{typography.display-card}`" per non scendere sotto la soglia 3:1 già stretta a 3.88:1). Richiede la modifica di markup in Task 6.

- [x] Task 6: `app/page.tsx` — markup del divisore "vs" nella match-card della home (AC: #4)
  - [x] Righe 337-339: sostituire il testo piatto `{partita.squadraCasa} - {partita.squadraOspite}` con `{partita.squadraCasa} <span className={styles.vs}>vs</span> {partita.squadraOspite}` — mirror esatto del markup già usato in `app/calendario/page.tsx` per lo stesso componente logico (verificare il markup esatto lì prima di scrivere, per usare la stessa struttura/spaziatura).
  - [x] Nessuna altra riga di `app/page.tsx` va toccata: le condizioni di visibilità (`mostraSponsor`/`mostraPartite`/`mostraFotoSquadra`/social) restano testualmente identiche (AC #5).

- [x] Task 7: Verifica AC #1/#2/#3/#7 — nessun residuo del vecchio colore
  - [x] Ricerca testuale nel repo (`app/`) per `0b0e14`/`0B0E14` (case-insensitive) — zero risultati attesi al termine di Task 1-5.
  - [x] Ricerca testuale per `1c2433`/`1C2433` — zero risultati attesi.
  - [x] Ricerca testuale per `rgba(255, 255, 255, 0.5)` (o `0.5)` sulle due regole `::before` di placeholder-foto) — zero risultati attesi, entrambe devono essere `0.55`.
  - [x] Ricerca testuale per `7b8697`/`7B8697` — zero risultati attesi (footer copyright, Task 1).

- [x] Task 8: Verifica AC #4 — parità visiva/strutturale tra le due match-card
  - [x] Confrontare `home-pubblica.module.css` (`.schedaPartita`/`.dataPartita`/`.squadrePartita`/`.vs`/`.luogoPartita`/`.gruppoPartita`) e `calendario.module.css` (`.matchCard`/`.meta`/`.squadre`/`.vs`/`.categoria`) dopo le modifiche: stesso sfondo (`#2e6f99`), stesso colore testo secondario (`#eaf4fb`), stesso colore divisore "vs" (`#ffcbe6`), stesso principio di layout `gap`-based (nessuna delle due usa più `space-between` per i metadati).
  - [x] Verificare visivamente (o via resize) che il testo nella match-card della home sia ora raggruppato a sinistra invece che spinto ai margini.

- [x] Task 9: Verifica AC #5 — nessuna regressione funzionale
  - [x] Confermare per lettura diretta che le condizioni `mostraSponsor`/`mostraPartite`/`mostraFotoSquadra`/social in `app/page.tsx` restano testualmente identiche a prima di questa storia (righe invariate rispetto a Story 18.12).
  - [x] Confermare che `app/NavPubblica.tsx`, `app/CookieBanner.tsx`, `app/calendario/page.tsx`, `app/squadre/page.tsx`, `app/contatti/page.tsx`, `app/staff/page.tsx` non sono toccati a livello di logica/markup **oltre** a `app/page.tsx` riga 337-339 (Task 6) — questa storia è colore/layout CSS puro più un singolo markup minimo.
  - [x] Verificare manualmente che nessun target di tocco 44px o contorno di focus sia stato alterato (nessun Task tocca `min-height`, `padding`, o `:focus-visible`).

- [x] Task 10: Verifica AC #6 — suite di test invariata
  - [x] `npx vitest run` — nessuno dei file toccati ha test diretti (stessa convenzione già consolidata nelle Story 18.9-18.12: nessun file `*.test.{ts,tsx}` importa `HeaderPubblico.tsx`/`FooterPubblico.tsx`/`CookieBanner.tsx`/`app/page.tsx`/`app/squadre/page.tsx`/`app/calendario/page.tsx`/`app/contatti/page.tsx`/`app/staff/page.tsx` — verificare che resti vero prima di concludere, non assumerlo). L'unico test che tocca le rotte pubbliche (`lib/auth/route-decision.test.ts`) non dipende da markup/CSS/colore.
  - [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti — build produzione deve continuare a includere `/`, `/squadre`, `/calendario`, `/staff`, `/contatti` nell'output.

### Review Findings

- [x] [Review][Patch] `.linkNaviga` fallisce il contrasto AA sul nuovo sfondo match-card [app/calendario/calendario.module.css, app/home-pubblica.module.css] — risolto: colore portato a `#eaf4fb` ({colors.testo-chiaro-partite}), stesso token già usato per `.categoria`/`.gruppoPartita`/`.meta`.
- [x] [Review][Patch] `box-shadow` con RGB decimale del vecchio nero mai convertito [app/CookieBanner.module.css:29,134, app/squadre/squadre.module.css:65] — risolto: `rgba(11, 14, 20, X)` → `rgba(15, 36, 56, X)` (equivalente decimale di `#0F2438`).
- [x] [Review][Patch] Commento contrasto ".accedi" non aggiornato al valore ricalcolato in DESIGN.md [app/HeaderPubblico.module.css:75] — risolto: aggiornato a 4.97:1 con nota sul valore storico.
- [x] [Review][Patch] Commento focus-ring ".accedi" cita ancora {colors.nero} [app/HeaderPubblico.module.css:101-102] — risolto: aggiornato a {colors.blu-carbone}.
- [x] [Review][Patch] Commento ".bottone" dice ancora "testo nero" dopo il cambio colore [app/CookieBanner.module.css:59] — risolto: aggiornato a {colors.blu-carbone}.
- [x] [Review][Defer] `NavPubblica.module.css` ha lo stesso commento stale {colors.nero} — deferred, pre-existing (file non toccato da questa storia, gap ereditato dalla Story 18.15) [app/NavPubblica.module.css:75]
- [x] [Review][Defer] Vincolo "mai più piccolo di display-card" su `.vs` applicato solo via commento, non in CSS — deferred, pre-existing (stesso pattern già presente in calendario da Story 18.9, non introdotto da questa storia)
- [x] [Review][Defer] Duplicazione quasi verbatim di `.vs`/`.categoria`/`.meta`/`.linkNaviga` tra calendario.module.css e home-pubblica.module.css invita a divergenze future — deferred, pre-existing (convenzione "un modulo CSS per pagina" già stabilita nelle Story 18.9-18.15, ristrutturarla è fuori scope per una storia di soli colori)

## Dev Notes

### Perché questa storia esiste: due iterazioni della stessa sessione UX, non due story diverse

La Story 18.15 ha rimosso il nero (`{colors.nero}` → `{colors.blu-carbone}` `#0F2438`) su richiesta esplicita dell'utente dopo aver visto il sito live. Nella stessa sessione, subito dopo, l'utente ha dato un secondo feedback vedendo l'artifact di conferma: non gradiva il colore dei blocchi "partite" (sia la fascia teaser in home sia le match-card di `/calendario`) né l'allineamento del testo interno — "non mi piace il colore delle partite e il testo lo sposterei più a sinistra... il colore di fondo più sul bluetto e chiaro". Confrontate 3 alternative in artifact comparativo, scelta **B — azzurro medio `#2E6F99`**. Questo ha introdotto un secondo colore di sfondo scuro (`{colors.azzurro-partite}`), distinto dal `{colors.blu-carbone}` di header/hero/footer, riservato **esclusivamente** alle match-card. Questa storia applica **entrambi** i cambi al codice reale in un solo passaggio, non solo il primo.

### Scoperta reale fatta preparando questa storia: le due match-card non sono implementate allo stesso modo

`DESIGN.md` descrive un solo componente `match-card` condiviso da home e calendario, ma leggendo il codice **oggi** (non solo `DESIGN.md`) le due implementazioni divergono:

| Aspetto | `/` (Story 18.3/18.12) | `/calendario` (Story 18.9) |
|---|---|---|
| Divisore "vs" | **Assente** — testo piatto `"{squadraCasa} - {squadraOspite}"`, nessuno span colorato | Presente (`.vs{color:var(--color-magenta)}`) |
| Layout metadati | `.dataPartita{justify-content:space-between}` — data e ora spinte ai due margini opposti | `.meta{display:flex;flex-wrap:wrap;gap:var(--space-3)}` — già a sinistra |

`/calendario` era già corretta rispetto a `DESIGN.md` (gap-based, divisore "vs" presente); `/` non lo era. Questa storia **porta `/` alla pari con `/calendario`** invece di introdurre un terzo pattern — Task 5/6 aggiungono a `home-pubblica.module.css`/`app/page.tsx` esattamente ciò che `calendario.module.css`/`app/calendario/page.tsx` hanno già. **Prima di scrivere il markup del Task 6, leggere il JSX reale di `app/calendario/page.tsx` per lo stesso blocco squadre/vs** — non indovinare la struttura, copiarla.

Il feedback "il testo lo sposterei più a sinistra" è quasi certamente riferito a `.dataPartita` (data/ora spinte ai margini in home), non a un divisore "vs" che in home non esisteva ancora — non esiste alcun elemento "vs" da riallineare in home, solo da aggiungere ex novo con il colore corretto.

### `next-match-strip` non esiste nel codice — non introdurlo qui

`DESIGN.md.components.next-match-strip` descrive una fascia azzurra a piena larghezza con countdown, separata dalla griglia di match-card. **Non è mai stata implementata**: Story 18.3 ha costruito solo `.listaPartite`/`.schedaPartita` (una griglia di card), non una fascia dedicata. Questa storia **non introduce** quel componente — richiederebbe una nuova sezione con logica di countdown mai richiesta da alcun AC esistente, fuori scope. Si limita a ricolorare le match-card che esistono davvero.

### Convenzione CSS (invariata, stessa di Story 18.9-18.12): hex letterali commentati, quattro eccezioni riusabili

Nessun custom property per questa palette esiste in `app/globals.css` (appartiene al `DESIGN.md` 2026-07-22 del portale interno, vocabolario diverso). Le uniche quattro eccezioni riusabili restano `{colors.azzurro}`=`var(--color-primary)`, `{colors.navy}`=`var(--color-navy)`, `{colors.magenta}`=`var(--color-magenta)`, `{colors.bianco}`=`var(--color-surface)` — **nessuna nuova eccezione aggiunta da questa storia**: `{colors.blu-carbone}` (`#0F2438`), `{colors.azzurro-partite}` (`#2E6F99`), `{colors.testo-chiaro-partite}` (`#EAF4FB`), `{colors.magenta-chiaro}` (`#FFCBE6`) e `{colors.placeholder-hatch-alt}` (`#17384F`) sono tutti letterali con commento. **Attenzione particolare nei Task 4/5**: dove il codice attuale riusa `var(--color-primary)`/`var(--color-magenta)` (perché coincidevano per hex con `{colors.azzurro}`/`{colors.magenta}` pieni), questa storia introduce colori **nuovi e diversi** (`{colors.testo-chiaro-partite}`, `{colors.magenta-chiaro}`) che non coincidono con alcun custom property esistente — vanno scritti come hex letterale, non lasciati come `var(--color-primary)`/`var(--color-magenta)` (sarebbe un colore sbagliato, non solo una convenzione violata: l'azzurro pieno scende a 1.90:1 su questo sfondo, il magenta pieno a 1.21:1).

### Cosa NON cambia in questa storia

Nessuna nuova Server Action, nessuna migrazione, nessun nuovo componente React, nessuna nuova rotta. `app/NavPubblica.tsx`, `app/CookieBanner.tsx`, la logica di query di ogni pagina pubblica, le 4 condizioni di visibilità di `app/page.tsx`, i target di tocco 44px e i contorni di focus restano **testualmente identici** — questa storia è colore/layout CSS puro più un singolo markup minimo (Task 6).

### Project Structure Notes

- Nessun file nuovo creato — solo modifiche a file `.module.css` esistenti più una riga di markup in `app/page.tsx`.
- File toccati: `app/HeaderPubblico.module.css`, `app/FooterPubblico.module.css`, `app/CookieBanner.module.css`, `app/contatti/contatti.module.css`, `app/staff/staff.module.css`, `app/home-pubblica.module.css`, `app/page.tsx`, `app/squadre/squadre.module.css`, `app/calendario/calendario.module.css`.
- Stessa convenzione "un modulo CSS per pagina/componente condiviso" già stabilita, nessuna deviazione.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 18, Story 18.16] — testo originale di User Story e AC (verbatim in questo file), inventario file con numeri di riga.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 18, Story 18.15] — decisione che ha introdotto `{colors.blu-carbone}`, prima fase di questo lavoro a due fasi.
- [Source: ux-designs/ux-societa-manager-2026-08-13/DESIGN.md, frontmatter `colors`, sezioni "Colori" e "Componenti" (`next-match-strip`, `match-card`)] — valori esatti dei 5 token coinvolti (`blu-carbone` `#0F2438`, `azzurro-partite` `#2E6F99`, `testo-chiaro-partite` `#EAF4FB`, `magenta-chiaro` `#FFCBE6`, `placeholder-hatch-alt` `#17384F`) e contrasti calcolati (bianco su azzurro-partite 5.46:1, testo-chiaro-partite su azzurro-partite 4.89:1, magenta-chiaro su azzurro-partite 3.88:1 vincolato a testo grande).
- [Source: ux-designs/ux-societa-manager-2026-08-13/.memlog.md] — cronologia completa delle due iterazioni (decisione blu-carbone, poi decisione azzurro-partite), inclusi i valori di contrasto ricalcolati a mano per ogni coppia.
- [Source: app/HeaderPubblico.module.css riga 28, app/FooterPubblico.module.css righe 11/44/57, app/CookieBanner.module.css righe 25/39/63/132, app/contatti/contatti.module.css righe 74/86/113/123, app/staff/staff.module.css riga 70] — occorrenze esatte di `#0b0e14`/`#1c2433` verificate leggendo il codice reale (grep case-insensitive su `app/`), non assunte da `DESIGN.md`.
- [Source: app/home-pubblica.module.css righe 22/34-37/55/106/258/292/311/317-323/380] — occorrenze hero + match-card della home, incluso il testo piatto squadre (righe 296-304 rese come `.squadrePartita`) senza divisore "vs".
- [Source: app/squadre/squadre.module.css righe 116-119/137] — pattern placeholder team-card.
- [Source: app/calendario/calendario.module.css righe 88/111-120/122-133/135-143/145-156] — match-card di calendario, **già corretta strutturalmente** (gap-based, divisore "vs" presente) — riferimento diretto per i Task 5/6.
- [Source: app/page.tsx righe 317-360] — markup della sezione "Partite della settimana" in home, incluse le righe esatte del testo piatto squadre da sostituire (Task 6).
- [Source: _bmad-output/implementation-artifacts/18-9-pagina-calendario.md, 18-12-restyling-poster-sportivo.md] — precedenti diretti della stessa convenzione hex-letterale-commentato e della stessa disciplina "verificare il codice reale, non assumere da DESIGN.md".
- [Source: AGENTS.md, root del repo] — nota su Next.js non standard, non sostanzialmente applicabile (nessuna modifica a routing/parametri/Server Action).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (dev-story workflow)

### Debug Log References

Nessuno - implementazione lineare, nessun blocco/HALT incontrato.

### Completion Notes List

- Tutti e 10 i Task completati esattamente come pianificato, nessuna deviazione.
- Task 1-5: sostituzione diretta di tutte le occorrenze di `#0b0e14`→`#0f2438` (`{colors.blu-carbone}`) e `#1c2433`→`#17384f` (`{colors.placeholder-hatch-alt}`) su Header/Footer/CookieBanner/Contatti/Staff/Hero/Squadre; opacità didascalia placeholder-foto 0.5→0.55 (hero + team-card); footer copyright `#7b8697`→`#838e9e` (correzione AC #7 mai recepita dalla sessione UX di Story 18.15).
- Task 4/5: match-card di `/calendario` e `/` portate sullo stesso `{colors.azzurro-partite}` `#2e6f99`, con i tre colori interni derivati come hex letterali (`#eaf4fb` testo secondario, `#ffcbe6` divisore "vs") invece di riusare `var(--color-primary)`/`var(--color-magenta)` - l'azzurro/magenta pieno scenderebbe sotto soglia AA su questo sfondo più chiaro (motivazione già presente nei Dev Notes/commenti sorgente).
- Task 5/6: `.dataPartita` in home passata da `justify-content: space-between` a `gap: var(--space-3)` (mirror di `.meta` di calendario) e aggiunto un nuovo divisore "vs" (`.vs` in `home-pubblica.module.css` + `<span className={styles.vs}>vs</span>` in `app/page.tsx`), portando la match-card della home alla pari strutturale con quella di `/calendario` (prima divergevano: nessun divisore "vs" in home, metadati spinti ai margini).
- Aggiornati anche i commenti sorgente che citavano `{colors.nero}`/hex vecchi in file toccati da Task 2-5 (non solo Task 1), per coerenza con AC #1 (ricerca testuale zero risultati) e per non lasciare la documentazione in codice disallineata dal valore reale - incluso un residuo in `contatti.module.css` (commento `:focus-visible`) non esplicitamente elencato nell'inventario originale ma contenente l'hex `#1C2433`.
- Verifica Task 7: ricerca testuale case-insensitive per `0b0e14`, `1c2433`, `rgba(255, 255, 255, 0.5)` → zero risultati in `app/`. `7b8697` resta solo in un commento esplicativo (FooterPubblico.module.css) che descrive il valore storico superato, non un valore live.
- Verifica Task 9: `git diff --stat` conferma che `app/page.tsx` ha un solo hunk (le 3 righe del Task 6) - nessun'altra logica/markup toccato.
- 1135/1135 test Vitest passati, 0 errori `tsc`/`eslint` (solo warning `<img>`/`no-unused-vars` preesistenti, non introdotti da questa storia), build produzione riuscita (`/`, `/squadre`, `/calendario`, `/staff`, `/contatti` presenti nell'output). Gli errori Prisma WASM/"Dynamic server usage" mostrati durante `next build` sono il quirk noto e già documentato dell'ambiente locale (motore Prisma WASM), non causati da questa storia.
- Verifica visiva dal vivo NON eseguibile in questo sandbox (stesso limite noto delle Story precedenti dell'Epic 18) - demandata all'utente.
- **Code review completata** (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo) - 5 patch applicati, 3 defer, 7 scartati come rumore/già gestiti dagli AC. Il finding più rilevante: `.linkNaviga` (link "Naviga" nelle match-card) era rimasto su `var(--color-primary)` (azzurro pieno), che sul nuovo sfondo `{colors.azzurro-partite}` scende a ~1.90:1 - lo stesso identico fallimento di contrasto già corretto in questa storia per `.categoria`/`.gruppoPartita`/`.vs`, ma non applicato a `.linkNaviga` (trovato indipendentemente da Blind Hunter ed Edge Case Hunter). Altri 4 patch: `box-shadow` con RGB decimale del vecchio nero mai convertito (`rgba(11,14,20,X)` → `rgba(15,36,56,X)`, non intercettato da Task 7 perché non è una stringa hex), 3 commenti sorgente stale in `HeaderPubblico.module.css`/`CookieBanner.module.css` non aggiornati dal cambio di token. 3 defer (tutti pre-esistenti, non introdotti da questa storia): commento stale identico in `NavPubblica.module.css` (file mai toccato da questa storia), vincolo "mai più piccolo di display-card" su `.vs` enforced solo via commento (stesso pattern dell'originale di Story 18.9), duplicazione `.vs`/`.categoria`/`.meta`/`.linkNaviga` tra i due file (probabile causa root del finding sul contrasto). L'Acceptance Auditor ha anche segnalato che il markup del divisore "vs" in home non è un mirror strutturale 1:1 di calendario (testo+span vs flex+3-span) - valutato: AC #4 richiede solo il divisore colorato + i metadati gap-based (entrambi soddisfatti), il markup letterale del Task 6 è stato seguito verbatim; non bloccante, scartato come rumore. 1135/1135 test Vitest passati dopo i fix, 0 errori tsc/eslint, nessuna regressione. Status: done.

### File List

- `app/HeaderPubblico.module.css`
- `app/FooterPubblico.module.css`
- `app/CookieBanner.module.css`
- `app/contatti/contatti.module.css`
- `app/staff/staff.module.css`
- `app/home-pubblica.module.css`
- `app/squadre/squadre.module.css`
- `app/calendario/calendario.module.css`
- `app/page.tsx`

### Change Log

- 2026-08-14: Implementata Story 18.16 (dev-story workflow) - applicato al codice reale il nuovo colore del registro "Poster Sportivo" (blu carbone + azzurro medio dei blocchi partite). Status: ready-for-dev → review.
- 2026-08-14: Code review completata (bmad-code-review, 3 layer paralleli) - 5 patch applicati (fix contrasto `.linkNaviga`, box-shadow RGB decimale, 3 commenti stale), 3 defer (pre-esistenti), 7 scartati come rumore. Status: review → done.
