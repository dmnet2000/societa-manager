---
baseline_commit: ba58ded4b2d9faa4a5e499b24b8dadd166f21c16
---

# Story 18.17: Rendere meno invasivo il pulsante "Preferenze cookie" dopo una scelta registrata

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Visitatore che ha già scelto se accettare o rifiutare i cookie non essenziali,
I want che il piccolo pulsante "Preferenze cookie" sia meno invadente visivamente una volta fatta la scelta,
so that l'interfaccia resti pulita, senza però perdere la possibilità di rivedere/cambiare la scelta in qualsiasi momento.

## Decisione di conformità (chiarita con l'utente prima di scrivere questa storia)

`epics.md` Story 18.17 conteneva un punto di conformità esplicitamente non risolto: rimuovere del tutto il pulsante "Preferenze cookie" persistente riapre la Linee guida cookie del Garante Privacy italiano (possibilità di revocare il consenso in ogni momento, non solo alla prima visita — AC #3 originale di Story 18.6). **Chiesto esplicitamente all'utente**, che ha scelto l'opzione (b): **non rimuovere il pulsante**, renderlo solo meno invasivo/discreto mantenendo comunque un modo per riaprire le preferenze. Questa storia **sostituisce** l'AC #1 originale di `epics.md` ("non vede alcun pulsante persistente") con gli AC sotto — `epics.md` NON è stato aggiornato con questa decisione, fare riferimento a questo file come fonte di verità per questa story.

## Acceptance Criteria

1. **Given** un Visitatore che ha già accettato o rifiutato i cookie non essenziali (cookie `consenso_cookie` già impostato) **When** visita una pagina pubblica **Then** continua a vedere un pulsante "Preferenze cookie" raggiungibile per riaprire/cambiare la scelta in qualsiasi momento — **non rimosso**, nessuna regressione di conformità rispetto a Story 18.6 AC #3.
2. **And** il pulsante ha un trattamento visivo più discreto rispetto a oggi: niente più `border-top: 2px solid` + `box-shadow` pesante (che oggi lo fa assomigliare a una seconda fascia/mini-banner, stesso trattamento del banner completo) — sostituiti con un bordo sottile leggero su tutti i lati e un'ombra ridotta; opacità di riposo inferiore a 1 (es. 0.7) che sale a piena opacità su `:hover`/`:focus-visible`.
3. **And** il target di tocco resta minimo 44×44px (`min-height: 44px` già presente, non ridurre) — nessuna regressione rispetto a Story 18.6/18.12. Il pulsante non è dentro un contenitore flex con `align-items: center` (è `position: fixed` standalone), quindi non si applica il problema "min-height sul contenitore non basta" già noto in altri punti del progetto.
4. **And** il contorno di focus (`:focus-visible`, già definito in `.preferenze` insieme a `.bottone`/`.bottoneSecondario`) resta chiaramente visibile — verificare che l'opacità ridotta di riposo non lo attenui: la regola dovrà comunque portare opacità a 1 quando l'elemento riceve il focus, non solo su hover.
5. **And** nessuna modifica al banner iniziale (prima scelta, `valoreIniziale === undefined`) né alla logica di lettura/scrittura del cookie (`lib/cookie-consenso.ts`, invariata) — riguarda solo il trattamento visivo del pulsante di riapertura dopo una scelta già fatta, stesso perimetro (pagine pubbliche) di Story 18.6.
6. **And** nessun test esistente si rompe (nessun file `*.test.{ts,tsx}` importa oggi `CookieBanner.tsx`, verificare che resti vero).

## Tasks / Subtasks

- [x] Task 1: Alleggerire il trattamento visivo di `.preferenze` in `app/CookieBanner.module.css` (AC: #2, #3, #4)
  - [x] Righe 122-139 (classe `.preferenze`): rimosso `border-top: 2px solid #0f2438` e `box-shadow: 0 -4px 16px rgba(15, 36, 56, 0.12)` (trattamento "bar" mutuato da `.banner`).
  - [x] Sostituito con bordo leggero su tutti i lati (`border: 1px solid rgba(15, 36, 56, 0.15)`) e ombra più leggera (`box-shadow: 0 1px 4px rgba(15, 36, 56, 0.1)`), coerente con la palette blu-carbone già in uso nel file (Story 18.16).
  - [x] Footprint ridotto: `padding: 0 var(--space-3)` invece di `0 var(--space-4)`; `min-height: 44px` lasciato invariato (AC #3).
  - [x] Aggiunto `opacity: 0.7` di riposo con `transition: opacity 0.2s ease`, e regola combinata `.preferenze:hover, .preferenze:focus-visible { opacity: 1; }` (non `:focus` semplice).
  - [x] Aggiunto `.preferenze { transition: none }` al blocco `@media (prefers-reduced-motion: reduce)` esistente (mirror del trattamento già riservato a `.bottone`).
  - [x] Aggiornato il commento sorgente sopra `.preferenze` per riflettere il nuovo trattamento più leggero e il motivo (decisione con l'utente di Story 18.17).

- [x] Task 2: Verifica AC #1/#5 — nessuna regressione di comportamento/logica (AC: #1, #5)
  - [x] Confermato: `app/CookieBanner.tsx` non toccato in questa storia (solo CSS) — il ramo `if (!visibile)` resta invariato, il pulsante continua a esistere e a riaprire il banner completo al click.
  - [x] Confermato: `lib/cookie-consenso.ts` non toccato.
  - [x] Confermato: il banner iniziale (`valoreIniziale === undefined`) resta visivamente invariato — nessuna modifica a `.banner`, `.testo`, `.azioni`, `.bottone`, `.bottoneSecondario`.

- [x] Task 3: Verifica AC #3/#4 — target di tocco e focus (AC: #3, #4)
  - [x] `min-height: 44px` invariato sul pulsante, larghezza garantita dal testo "Preferenze cookie" + padding orizzontale (ampiamente ≥44px) — nessuna regressione sul target di tocco.
  - [x] `:focus-visible` (righe 117-121, invariata) resta nella stessa regola combinata di `.bottone`/`.bottoneSecondario`, outline `2px solid #0072a3` non toccato; la nuova regola `.preferenze:focus-visible { opacity: 1 }` (riga 152) garantisce piena opacità/leggibilità dell'outline anche quando il riposo è a 0.7.

- [x] Task 4: Verifica finale (AC: #6)
  - [x] `npx vitest run` — nessun file `*.test.{ts,tsx}` importa `CookieBanner.tsx`, suite invariata.
  - [x] `npx tsc --noEmit`, `npm run lint` puliti.
  - [x] `npm run build` verificato (vedi Completion Notes per il noto limite Prisma WASM locale, non legato a questa storia).

## Dev Notes

### Perché questa storia non è una rimozione

`epics.md` (Story 18.17 originale) segnalava esplicitamente un punto di conformità aperto: il pulsante "Preferenze cookie" esiste apposta (Story 18.6 AC #3) per rispettare le Linee guida del Garante Privacy sulla revoca del consenso in ogni momento. **Chiesto all'utente prima di procedere**: ha scelto di mantenere il pulsante ma renderlo meno invasivo (opzione (b) del punto aperto), non di rimuoverlo (opzione (a)). Non riaprire questa decisione durante lo sviluppo — è già stata presa esplicitamente con l'utente in questa sessione.

### Cosa cambia esattamente: solo CSS, un file

Un solo file toccato: `app/CookieBanner.module.css`, solo la classe `.preferenze` (righe 122-139) + eventualmente il blocco `@media (prefers-reduced-motion: reduce)` (righe 88-96) se si aggiunge una transizione. `app/CookieBanner.tsx` (logica, righe 43-53 per il ramo del pulsante) **non va toccato** — il markup/comportamento del pulsante resta lo stesso `<button>` con lo stesso `onClick={() => setVisibile(true)}`, cambia solo il suo aspetto quando non ha focus/hover.

### Perché non hover-only / non nascosto di default

Lo scope della decisione con l'utente era "meno invadente", non "nascosto finché non interagisci": un pulsante rivelato solo su hover sarebbe irraggiungibile/non scopribile su touch (smartphone — il progetto ha già un'apertura attiva sulla UX mobile, vedi Story 18.18 in backlog sul menu di navigazione). La soluzione scelta (opacità ridotta ma sempre presente e cliccabile, piena opacità su hover/focus) mantiene il pulsante sempre scopribile e utilizzabile su ogni dispositivo, riducendo solo il peso visivo a riposo.

### Convenzione colori (invariata da Story 18.16)

Il file usa già `#0f2438` (`{colors.blu-carbone}`) con hex letterali commentati (nessun custom property dedicato in `app/globals.css` per questa palette pubblica). Il nuovo bordo/ombra leggeri di questa storia devono restare coerenti con questa convenzione — hex letterale con commento, non introdurre nuovi custom property.

### Cosa NON cambia in questa storia

Nessuna modifica a `app/CookieBanner.tsx`, `lib/cookie-consenso.ts`, al banner iniziale, alla logica di refresh (`router.refresh()`), o a qualunque altra pagina pubblica. Nessuna nuova Server Action, nessuna migrazione, nessun nuovo componente.

### Project Structure Notes

- Nessun file nuovo creato — solo modifica a `app/CookieBanner.module.css`.
- File toccato: `app/CookieBanner.module.css`.
- Stessa convenzione "un modulo CSS per pagina/componente condiviso" già stabilita nell'Epic 18, nessuna deviazione.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 18, Story 18.17] — testo originale di User Story, punto di conformità aperto (non risolto lì, risolto in questa storia con l'utente).
- [Source: app/CookieBanner.tsx righe 12-19, 43-53] — commento che spiega perché il pulsante deve restare sempre raggiungibile (AC #3 di Story 18.6), ramo `if (!visibile)` che lo renderizza.
- [Source: app/CookieBanner.module.css righe 120-139] — classe `.preferenze` esistente da alleggerire, righe 113-118 per `:focus-visible` esistente da preservare, righe 88-96 per il blocco `prefers-reduced-motion` esistente.
- [Source: _bmad-output/implementation-artifacts/18-16-applicare-colore-partite.md] — precedente diretto della stessa convenzione hex-letterale-commentato su questo stesso file (Task 1 di quella storia ha toccato `CookieBanner.module.css` righe 25/39/63/132 per il colore blu-carbone).
- [Source: AGENTS.md, root del repo] — nota su Next.js non standard, non applicabile (nessuna modifica a routing/Server Action).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (dev-story workflow)

### Debug Log References

Nessuno - implementazione lineare, nessun blocco/HALT incontrato. Modifica CSS-only, un solo file.

### Completion Notes List

- Tutti e 4 i Task completati esattamente come pianificato, nessuna deviazione.
- Punto di conformità aperto in `epics.md` risolto **con l'utente prima di scrivere la storia**: mantenere il pulsante "Preferenze cookie" (non rimuoverlo, opzione (b) invece di (a)) ma renderlo meno invasivo.
- Task 1: `.preferenze` in `app/CookieBanner.module.css` — rimosso `border-top: 2px solid #0f2438` + `box-shadow: 0 -4px 16px rgba(15, 36, 56, 0.12)` (trattamento "a fascia" mutuato da `.banner`), sostituito con `border: 1px solid rgba(15, 36, 56, 0.15)` + `box-shadow: 0 1px 4px rgba(15, 36, 56, 0.1)`; padding ridotto da `var(--space-4)` a `var(--space-3)`; aggiunta `opacity: 0.7` di riposo → `1` su `:hover`/`:focus-visible` (non `:focus` semplice); `min-height: 44px` lasciato invariato (nessuna regressione sul target di tocco). Aggiunto `.preferenze { transition: none }` al blocco `prefers-reduced-motion` esistente.
- Task 2/3: verificato per lettura diretta che `app/CookieBanner.tsx` e `lib/cookie-consenso.ts` non sono toccati — il pulsante continua a esistere e a riaprire il banner completo al click, stesso comportamento di prima; il banner iniziale (prima scelta) resta visivamente invariato; la regola `:focus-visible` esistente (outline `2px solid #0072a3`) non è stata toccata, e la nuova `.preferenze:focus-visible { opacity: 1 }` garantisce che l'outline resti pienamente leggibile anche partendo da opacità 0.7.
- Task 4: 1167/1167 test Vitest passati (nessun file di test importa `CookieBanner.tsx`, nessuna regressione), 0 errori `tsc`/`eslint` (solo gli 11 warning `<img>`/`no-unused-vars` preesistenti, non introdotti da questa storia), build produzione riuscita (`/`, `/squadre`, `/calendario`, `/staff`, `/contatti` presenti nell'output). L'errore Prisma WASM mostrato durante `next build` è il quirk noto e già documentato dell'ambiente locale, non causato da questa storia.
- Verifica visiva dal vivo NON eseguibile in questo sandbox (stesso limite noto delle altre story dell'Epic 18) — demandata all'utente: confermare che il pulsante "Preferenze cookie" in basso a sinistra risulti visibilmente più leggero/discreto a riposo e torni pienamente visibile al passaggio del mouse o al focus da tastiera.

### File List

- `app/CookieBanner.module.css`

### Change Log

- 2026-08-15: File di story creato (create-story workflow) — punto di conformità cookie (rimuovere vs. rendere meno invasivo) risolto esplicitamente con l'utente prima della scrittura, scelta l'opzione (b). Status: backlog → ready-for-dev.
- 2026-08-15: Implementata Story 18.17 (dev-story workflow) — alleggerito il trattamento visivo di `.preferenze` in `app/CookieBanner.module.css` (bordo/ombra leggeri, opacità 0.7→1 su hover/focus), nessuna modifica a logica/comportamento. 1167/1167 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: ready-for-dev → review.
