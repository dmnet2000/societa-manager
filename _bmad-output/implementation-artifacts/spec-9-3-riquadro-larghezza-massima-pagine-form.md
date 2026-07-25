---
title: 'Story 9.3: Riquadro con larghezza massima per le pagine-form'
type: 'feature'
created: '2026-07-25'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '1fd536f8889891140b8920ccfa2518989283b974'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le pagine il cui contenuto principale è un form autonomo (non una tabella/lista) non hanno alcun vincolo di larghezza sul `<main>` — su schermo largo i campi si stirano da un bordo all'altro della finestra, a differenza di `/accedi` che già usa il pattern `.pagina`/`.riquadro` (`app/(auth)/accedi/accedi.module.css`).

**Approach:** Introdurre due classi globali riusabili in `app/globals.css` (`.pagina-form` / `.riquadro-form`, stesso principio del pattern `.pagina`/`.riquadro` di `/accedi` ma con `max-width: 480px` — più largo dei 360px di `/accedi` perché questi form hanno più campi contemporaneamente visibili) e applicarle al `<main>` di ogni pagina-form individuata. `/accedi` resta invariata (non tocca il suo modulo CSS locale, già corretto). Documentare il pattern come voce riusabile in `DESIGN.md`.

## Boundaries & Constraints

**Always:**
- Il pattern si applica solo a `<main>`/wrapper di pagine il cui contenuto principale è un form autonomo su una singola entità: `/registrati`, `/import-atlete`, `/precaricamento-allenatori`, `/permessi-certificati`, `/smtp`, `/logo`.
- Per pagine con più stati di rendering (guard-clause su dati mancanti, es. `permessi-certificati/page.tsx` ha 3 blocchi `<main>` distinti per anno-agonistico-mancante / gruppi-vuoti / form), applicare le classi a TUTTI i blocchi `<main>` di quella pagina, non solo a quello con il form.
- `/accedi` resta l'unico punto con il proprio `.pagina`/`.riquadro` locale (360px) — non va rifattorizzato per riusare le nuove classi globali in questa storia (zero rischio di regressione sulla pagina di login).
- Su schermo stretto (mobile/tablet): `width: 100%` + `max-width`, nessuno scorrimento orizzontale — stesso comportamento già verificato su `/accedi`.
- Comportamento applicativo (validazione, Server Action, redirect, messaggi di errore, `useActionState`) di ogni pagina toccata resta identico bit-per-bit — solo wrapper JSX + classi CSS cambiano.
- Aggiungere una voce riusabile in `DESIGN.md` (sezione `## Componenti`, stesso formato prosa+YAML delle voci esistenti come `nav-bar`) per il nuovo pattern, includendo la motivazione del max-width diverso da `/accedi`.

**Ask First:** nessuna.

**Never:**
- Non toccare pagine il cui contenuto principale è una tabella/lista (`/palestre`, `/slot`, `/orari`, `/gruppi`, `/admin`, `/conferma-iscrizioni`, `/conferma-certificati`, `/storico-presenze`) anche se contengono form secondari inline — restano a piena larghezza.
- Non toccare pagine a struttura variabile/borderline: `/wizard-nuova-stagione` (corpo principale = lista di anteprima, non un form a campi) e `/certificato-medico` (form-selettore condizionale, struttura dipende dai dati) — escluse esplicitamente, stesso principio di `epics.md` Story 9.3.
- Non toccare pagine senza form (`/`, `/non-autorizzato`, `/notifiche`, `/mio-orario`, `/vista-dirigente`, `/dati-fisici`, `/presenze`, `/certificato-medico`).
- Non introdurre un nuovo token `--shadow` in `globals.css` — riusare lo stesso `box-shadow` hard-coded già presente in `accedi.module.css` per coerenza visiva (nessun token esiste ancora, fuori perimetro di questa storia).
- Non modificare la suite Vitest esistente — deve continuare a passare invariata.

</frozen-after-approval>

## Code Map

- `app/globals.css` -- aggiungere `.pagina-form` / `.riquadro-form` (stesso schema di `.shell`/`.contenuto` già presenti, classi globali non-module)
- `app/(auth)/accedi/accedi.module.css` -- riferimento di sola lettura per il pattern esistente, non modificare
- `app/(onboarding-import)/registrati/page.tsx` -- wrappare `<main>` con le nuove classi
- `app/(onboarding-import)/import-atlete/page.tsx` -- wrappare `<main>` con le nuove classi
- `app/(onboarding-import)/precaricamento-allenatori/page.tsx` -- wrappare `<main>` con le nuove classi
- `app/(amministrazione)/permessi-certificati/page.tsx` -- wrappare tutti e 3 i blocchi `<main>` con le nuove classi
- `app/(configurazione)/smtp/page.tsx` -- wrappare `<main>` con le nuove classi
- `app/(configurazione)/logo/page.tsx` -- wrappare `<main>` con le nuove classi
- `_bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md` -- aggiungere voce riusabile per il pattern (sezione `## Componenti` + entry YAML `components:`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- `9-3-riquadro-larghezza-massima-pagine-form` → `review` a fine lavoro
- `_bmad-output/implementation-artifacts/deferred-work.md` -- eventuali compromessi emersi durante implementazione/review

## Tasks & Acceptance

**Execution:**
- [x] `app/globals.css` -- aggiungere `.pagina-form { display:flex; justify-content:center; padding: var(--space-8) var(--space-4); }` e `.riquadro-form { width:100%; max-width:480px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:var(--space-6); box-shadow: 0 1px 3px rgba(16,24,32,0.08); }` -- riusa gli stessi token di `accedi.module.css`, larghezza maggiore per form con più campi contemporaneamente visibili
- [x] `app/(onboarding-import)/registrati/page.tsx` -- `<main className="pagina-form"><div className="riquadro-form">...</div></main>` -- unico form, wrapping diretto
- [x] `app/(onboarding-import)/import-atlete/page.tsx` -- stesso wrapping -- include anche la sezione riepilogo risultati post-upload, resta dentro il riquadro
- [x] `app/(onboarding-import)/precaricamento-allenatori/page.tsx` -- stesso wrapping
- [x] `app/(amministrazione)/permessi-certificati/page.tsx` -- stesso wrapping su tutti e 3 i blocchi `<main>` (guard-clause anno mancante, guard-clause gruppi vuoti, form) -- coerenza visiva tra stati
- [x] `app/(configurazione)/smtp/page.tsx` -- stesso wrapping -- `ConfigurazioneSmtpForm` + `InviaEmailProvaForm` condizionale entrambi dentro lo stesso riquadro
- [x] `app/(configurazione)/logo/page.tsx` -- stesso wrapping -- `LogoForm` + `NomeSettoreForm` entrambi dentro lo stesso riquadro
- [x] `_bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md` -- nuova voce `## Componenti` (nome leggibile + entry YAML `components:`) per il pattern riquadro-form, con nota sulla differenza di max-width rispetto a `/accedi`
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- `9-3-riquadro-larghezza-massima-pagine-form: review` -- aggiornato dal chiamante (workflow orchestrator), non dal subagent implementatore

**Acceptance Criteria:**
- Given una delle 6 pagine-form elencate, when viene visualizzata su schermo largo (≥ 480px + margini), then il form è racchiuso in un riquadro centrato di `max-width: 480px`, non stirato a piena larghezza
- Given la stessa pagina su schermo stretto, when viene visualizzata, then il riquadro occupa `width: 100%` con margine (`padding` di `.pagina-form`), senza scorrimento orizzontale
- Given `permessi-certificati/page.tsx` in uno qualunque dei suoi 3 stati (anno mancante / gruppi vuoti / form), when viene visualizzata, then tutti e 3 gli stati mostrano lo stesso riquadro centrato, non solo quello con il form
- Given una qualunque delle 6 pagine toccate, when un Utente la usa (submit, validazione, redirect, errori), then il comportamento è identico a prima della modifica — nessuna regressione
- Given `/accedi`, when viene visualizzata dopo questa storia, then è visivamente e comportamentalmente invariata (continua a usare il proprio `.pagina`/`.riquadro` locale a 360px)
- Given la suite Vitest esistente, when eseguita dopo la modifica, then passa invariata (nessun nuovo test necessario: modifica puramente di wrapper/CSS, nessuna logica applicativa toccata)

## Design Notes

Il max-width di 480px (contro i 360px di `/accedi`) è una scelta pragmatica per accomodare form con più campi visibili insieme (es. `/smtp`: host+porta+utente+password; `/registrati`: email+password+fieldset ruoli+campi condizionali) senza wrapping eccessivo delle label. `/accedi` non viene rifattorizzato per riusare le classi globali: è già corretto, toccarlo aggiungerebbe rischio di regressione sulla pagina di login senza alcun beneficio (stesso principio "non owned by questa storia" già usato per escludere le pagine-tabella).

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test passano invariati (nessun nuovo test richiesto, modifica di solo wrapper/CSS)
- `npx tsc --noEmit -p tsconfig.json` -- expected: nessun errore
- `npx eslint .` -- expected: nessun nuovo errore rispetto alla baseline pre-modifica

**Manual checks (if no CLI):**
- Verificare a video (browser, resize finestra) che le 6 pagine mostrino il riquadro centrato su schermo largo e piena larghezza con margine su schermo stretto, e che `/accedi` sia visivamente invariata.

## Post-Done Amendment (2026-07-26)

L'utente ha visto il risultato dal vivo e chiarito che l'esclusione delle pagine-tabella (deliberata nello scope originale, vedi Boundaries & Constraints sopra) non corrispondeva a quello che voleva: anche quelle pagine non dovevano arrivare fino al bordo, e i singoli campi di testo non dovevano occupare tutta la larghezza disponibile, su nessuna pagina. Non è un difetto dell'esecuzione originale (lo scope era stato eseguito esattamente come specificato e approvato) — è un ampliamento di scope emerso dopo la verifica visiva.

**Modifica (in `app/globals.css`, nessuna pagina toccata singolarmente):**
- `.contenuto > main` (selettore trasversale sul tag, non una classe): `max-width: 1000px` centrato, applicato a OGNI pagina dell'app incluse le tabelle - scelto 1000px (non 1200px, testato e scartato) perché a 1200px il margine risultava invisibile sui laptop comuni (~1366-1440px di larghezza disponibile dopo la sidebar).
- `input:not([type=checkbox]):not([type=radio]), select, textarea { max-width: 400px }` (regola globale sul tag): corregge lo stretch di default del pattern `.campo` (flex-column senza `align-items` esplicito, ripetuto in ~15 file `*.module.css` mai centralizzati).

**Verifica:** 492/492 test, 0 errori TS, 0 nuovi errori lint (stessa baseline). Verificato dal vivo `/registrati` (nessuna regressione sul pattern riquadro-form a 480px). Le pagine-tabella autenticate non sono state verificate dal vivo nell'app reale (Supabase locale non in esecuzione in questa sessione, richiederebbe Docker) - verificate invece con una replica statica isolata (stessa struttura `.shell`/`.contenuto`/`<main>`+tabella+campo, stesso `globals.css` reale) che conferma il margine e il limite sugli input funzionare come atteso.

**DESIGN.md aggiornato** con due nuove voci trasversali ("Larghezza massima di pagina", "Larghezza massima dei campi di input") + entry YAML `pagina-max-width`/`campo-max-width`.

## Suggested Review Order

**Il pattern CSS (nuovo)**

- Entry point: le due classi globali riusabili, stesso schema di `.shell`/`.contenuto` (Story 9.2) — nota `overflow-wrap` aggiunto in review per testo dinamico lungo (errori/motivi di scarto) dentro il riquadro ora più stretto.
  [`globals.css:96`](../../app/globals.css#L96)

**Applicazione alle pagine-form (6 file, stesso identico wrapping)**

- Caso semplice: un solo `<main>`, un solo form, wrapping diretto.
  [`registrati/page.tsx:28`](../../app/(onboarding-import)/registrati/page.tsx#L28)

- Stesso wrapping, include anche la sezione riepilogo/scartati post-upload.
  [`import-atlete/page.tsx:11`](../../app/(onboarding-import)/import-atlete/page.tsx#L11)

- Stesso wrapping.
  [`precaricamento-allenatori/page.tsx:14`](../../app/(onboarding-import)/precaricamento-allenatori/page.tsx#L14)

- Caso più delicato: 3 blocchi `<main>` distinti (guard-clause anno mancante, guard-clause gruppi vuoti, form) — verificare che tutti e 3 abbiano ricevuto lo stesso wrapping.
  [`permessi-certificati/page.tsx:16`](../../app/(amministrazione)/permessi-certificati/page.tsx#L16),
  [`:38`](../../app/(amministrazione)/permessi-certificati/page.tsx#L38),
  [`:50`](../../app/(amministrazione)/permessi-certificati/page.tsx#L50)

- Due form correlati (config + invio prova) fusi in un solo riquadro — scelta discussa in review, vedi voce DESIGN.md sotto.
  [`smtp/page.tsx:29`](../../app/(configurazione)/smtp/page.tsx#L29)

- Due form correlati (logo + nome settore) fusi in un solo riquadro — stessa scelta di `/smtp`.
  [`logo/page.tsx:23`](../../app/(configurazione)/logo/page.tsx#L23)

**Documentazione del pattern (DESIGN.md)**

- Entry YAML `pagina-form`/`riquadro-form` in `components:` — completata in review con `padding`/`shadow` mancanti dalla prima stesura.
  [`DESIGN.md:119`](../planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md#L119)

- Prosa della voce — riformulata in review per non dichiarare "singola entità" quando `/smtp` e `/logo` uniscono due form correlati.
  [`DESIGN.md:205`](../planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md#L205)

**Peripherals**

- Nota di debito tecnico aggiunta in review: pattern duplicato a mano (`.pagina`/`.riquadro` di `/accedi` vs queste classi globali), nessuna convergenza tracciata.
  [`deferred-work.md:325`](./deferred-work.md#L325)

- Stato sprint aggiornato a `review`.
  [`sprint-status.yaml:134`](./sprint-status.yaml#L134)
