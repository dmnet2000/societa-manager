---
title: "Story 18.23: Riordino dell'header pubblico e larghezza della didascalia Facebook su mobile"
type: 'feature'
created: '2026-08-21'
status: 'done'
review_loop_iteration: 1
context: []
baseline_commit: '5f3bb2c559443ea1457cde45ad83015313950b3d'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** su schermi stretti (~360-390px), l'header pubblico (`HeaderPubblico.tsx`/`.module.css`) non ha mai avuto una media query dedicata - solo il menu al suo interno (`NavPubblica.tsx`, Story 18.18) si adatta sotto i 900px. Da quando la Story 18.20 ha aggiunto il logo Polisportiva accanto ad "Accedi", la somma degli elementi supera la larghezza disponibile e `.header` (`flex-wrap: wrap`) butta l'intero `.headerRight` (logo Polisportiva + Accedi) su una seconda riga, sotto il brand - mai deciso a tavolino. In parallelo, `.infoPost` (didascalia del post Facebook nell'hero, `home-pubblica.module.css`) usa un inset orizzontale fisso `left:100px;right:100px` (introdotto in una sessione di tweak diretto, non da story) mai adattato sotto i 900px: su un `.heroBlocco` largo ~320-350px su mobile, quell'inset lascia alla didascalia meno di 150px di larghezza reale, disallineata rispetto alle foto del carosello che occupano tutta la larghezza del blocco.

**Approach:** risolto in una sessione di party mode (Mary/John/Sally/Winston/Amelia, 2026-08-21) prima di scrivere questa spec. Header: l'hamburger di `NavPubblica` si sposta visivamente a sinistra del brand sotto i 900px tramite `order` flexbox (nessun riordino del DOM/tab-order); `.header` guadagna `flex-wrap: nowrap` esplicito nella stessa media query. Se lo spazio resta insufficiente, cede prima il `gap` tra i gruppi, poi la dimensione del logo Polisportiva (max-height ridotta) - mai hamburger, "Accedi" o il font di `.nomeSettore`. Didascalia Facebook: l'inset orizzontale fisso di `.infoPost` si riduce sotto i 900px (stessa media query esistente che già tocca `padding`/`font-size`), così la didascalia torna a occupare la larghezza reale di `.heroBlocco`.

## Boundaries & Constraints

**Always:** comportamento ≥900px di header e didascalia Facebook invariato bit-per-bit (nessuna modifica ai valori/selettori fuori dalle media query `max-width: 900px` già esistenti o da introdurre). Tab-order/ordine per screen reader dell'header invariato - solo `order` CSS (visivo), mai un riordino del markup in `HeaderPubblico.tsx`. Target di tocco 44×44px di hamburger/Accedi/controlli del carosello (`.frecciaPost`/`.pausaPost`/`.pallinoPost`) invariati.

**Ask First:** nessuna aggiuntiva - la sessione di party mode ha già risolto ogni punto aperto (ordine di cedimento dello spazio, cosa si sposta e cosa no).

**Never:** non toccare `NavPubblica.tsx`/`.module.css` oltre a un eventuale `order` sull'elemento hamburger già esistente (il pannello dropdown mobile, ancorato a `.header` via `position:absolute`, non a `.hamburger` - nessun impatto atteso, ma non introdurre logica nuova lì). Non nascondere il logo Polisportiva su mobile (deciso esplicitamente in party mode: si rimpicciolisce, non sparisce - richiesta esplicita dell'utente in Story 18.20, non revocata qui). Non toccare la logica del carosello Facebook (`HeroPostFacebook.tsx`) - solo CSS di `.infoPost`/`.testoPost`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Visitatore apre una pagina pubblica su smartphone (~360-390px) | qualunque pagina che monta `HeaderPubblico` | hamburger, brand, logo Polisportiva, Accedi tutti sulla stessa riga, in quell'ordine | N/A |
| Spazio insufficiente sulla riga a un breakpoint intermedio | viewport stretto ma non estremo | cede prima il `gap`, poi il logo Polisportiva si rimpicciolisce | N/A |
| Nessun logo Polisportiva caricato | `logoPolisportiva.esiste === false` | riga con solo hamburger, brand, Accedi - nessun placeholder vuoto (invariato, Story 18.20) | N/A |
| Home pubblica su mobile con post Facebook disponibili | `.heroBlocco` largo ~320-350px | didascalia (`.infoPost`) occupa la larghezza reale del blocco, non una fascia stretta centrata | N/A |
| Nessun post Facebook disponibile | fallback placeholder "FOTO AZIONE" | invariato (nessuna didascalia da posizionare) | N/A |
| Stessa pagina su desktop (≥900px) | header e hero | layout identico bit-per-bit a prima di questa storia | N/A |
| Navigazione da tastiera/screen reader sull'header mobile | focus sequenziale | ordine di tab invariato (brand poi menu), nonostante l'hamburger appaia prima visivamente | N/A |

</frozen-after-approval>

## Code Map

- `app/HeaderPubblico.module.css` -- nuova/estesa `@media (max-width: 900px)`: `.header` guadagna `flex-wrap: nowrap`; regola per l'elemento hamburger di `NavPubblica` (`order: -1`, tramite un selettore che raggiunga il bottone dentro `.headerLe1`/`NavPubblica.module.css` - verificare in implementazione se serve una classe/hook aggiuntiva o se il selettore esistente basta); `gap` di `.headerLeft`/`.headerRight`/`.header` ridotti come prima leva; `.logoPolisportiva img`/`img.logoPolisportiva` con `max-height`/`max-width` ridotti (~28px) come seconda leva
- `app/NavPubblica.module.css` -- verificare se `.hamburger` necessita di una regola `order` propria dentro la stessa media query (probabile, l'elemento da riordinare vive qui) - nessun'altra modifica a questo file
- `app/home-pubblica.module.css` -- `@media (max-width: 900px)` esistente (righe 342-352 circa): aggiungere `left`/`right` ridotti su `.infoPost` accanto al `padding` già presente

## Tasks & Acceptance

**Execution:**
- [x] `HeaderPubblico.module.css` -- `flex-wrap: nowrap` su `.header` sotto i 900px
- [x] `HeaderPubblico.module.css`/`NavPubblica.module.css` -- `order` sull'hamburger per posizionarlo visivamente prima del brand, sotto i 900px
- [x] `HeaderPubblico.module.css` -- riduzione `gap` (prima leva) e dimensione logo Polisportiva (seconda leva) sotto i 900px
- [x] `home-pubblica.module.css` -- inset ridotto di `.infoPost` sotto i 900px

**Acceptance Criteria:** vedi epics.md Story 18.23 (7 AC, verbatim - non duplicati qui).

## Spec Change Log

**2026-08-21 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap), review_loop_iteration 1.** Nessun `intent_gap`/`bad_spec` (nessuna modifica al blocco frozen). 1 patch applicata (2 finding convergenti), 2 defer, resto reject:

- **PATCH** — Blind Hunter ed Edge Case Hunter hanno trovato indipendentemente lo stesso problema: senza `min-width:0` esplicito, il default `min-width:auto` sui flex item impedisce a `.headerLeft`/`.headerRight` di restringersi sotto la larghezza intrinseca del contenuto - con `.header` reso `nowrap`, un caso limite (nomeSettore configurato molto piu' lungo del previsto) avrebbe prodotto overflow orizzontale invece del wrap che si voleva eliminare, nessun fallback esistente. Aggiunto in [`HeaderPubblico.module.css`](../../app/HeaderPubblico.module.css): `min-width:0` su `.headerLeft`/`.brand`, `flex-wrap:nowrap` anche su `.headerLeft`/`.headerRight` (coerenza con `.header`), e una rete di sicurezza su `.nomeSettore` (`overflow:hidden;text-overflow:ellipsis;white-space:nowrap`) che tronca invece di rompere la riga - il font (dimensione/famiglia) resta invariato, nessuna violazione del vincolo "mai il font di `.nomeSettore`".
- **DEFER** — Blind Hunter ed Edge Case Hunter, indipendentemente: `.nav { order: -1 }` sposta l'hamburger visivamente prima del brand ma l'ordine di tab/lettura per screen reader resta invariato (brand poi nav) - conseguenza nota della scelta deliberata "solo CSS, nessun riordino DOM" presa in party mode, non un errore di implementazione. Un utente vedente da tastiera vedrebbe un disallineamento visivo/di focus (WCAG 1.3.2). Non risolto qui: andrebbe negoziato con l'utente, non deciso in code review. Loggato in `deferred-work.md`.
- **DEFER** — Blind Hunter: `.infoPost` resta `left:100px;right:100px` fisso per ogni larghezza ≥900px, incluso il range subito sopra il breakpoint dove `.heroBlocco` e' gia' ristretto - pre-esistente, fuori dal perimetro di questa storia (Boundaries: "≥900px invariato bit-per-bit"). Loggato in `deferred-work.md`.
- **REJECT** (varie, tutte "matches precedent" o out-of-scope): nessun test CSS/layout automatizzato possibile (Verification Gap - `vitest` gira in `environment:"node"`, nessun tooling browser-based esiste nel repo, stesso limite strutturale di ogni altra story CSS di questo progetto, gia' esplicitamente coperto dal manual check obbligatorio della spec); commenti narrativi estesi nel CSS (convenzione stabilita in tutto il progetto, non introdotta qui); nessun token di design per il nuovo valore 28px (nessun token esiste per questa decisione ad-hoc di party mode); salto netto invece di scalatura fluida al breakpoint (stesso pattern di ogni altra media query del progetto); guida in-app non aggiornata (la convenzione riguarda le rotte `/app/*` autenticate, non le pagine pubbliche non autenticate toccate qui); rischio di clipping del focus-ring sul logo rimpicciolito (rischio pratico minimo, gap ridotto comunque sufficiente).

Riverificato dopo la patch: `npx vitest run` (106 file, 1408 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori), `npm run build` (riuscita, nessuna regressione route table). `npm run cf:preview` tentato per la verifica visiva dal vivo richiesta dalla spec: fallito per il problema pre-esistente Prisma WASM/Windows di questa macchina (documentato in memoria di progetto), non correlato a questa storia - la verifica su un dispositivo reale/deploy resta da fare dall'utente prima di considerare l'AC #7 pienamente soddisfatto.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi (nessun test CSS dedicato atteso, solo nessuna regressione sui test esistenti)
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione sull'output di rotte statiche/dinamiche

**Manual checks (obbligatorio, non solo se manca la CLI):**
- `npm run cf:preview` (o produzione) su un viewport reale ~360-375px: header su una riga sola nell'ordine atteso, didascalia Facebook allineata alla larghezza del blocco fotografico
- Stesso viewport ≥900px: nessuna differenza percepibile rispetto a prima della storia

## Suggested Review Order

**L'header (il riordino visivo senza toccare l'a11y)**

- `flex-wrap:nowrap` + rete di sicurezza `min-width:0`/ellipsis per il caso limite di un `nomeSettore` molto lungo (patch di review).
  [`HeaderPubblico.module.css:179-227`](../../app/HeaderPubblico.module.css#L179-L227)
- `.nav { order: -1 }` - riordino visivo dell'hamburger, tab-order invariato per design (vedi defer su WCAG 1.3.2 in `deferred-work.md`).
  [`NavPubblica.module.css:94-105`](../../app/NavPubblica.module.css#L94-L105)

**La didascalia Facebook (nessuna regressione desktop)**

- Inset ridotto solo dentro `@media (max-width: 900px)` esistente, valori `left:100px;right:100px` usati ≥900px invariati (vedi defer sul range subito sopra il breakpoint in `deferred-work.md`).
  [`home-pubblica.module.css:342-357`](../../app/home-pubblica.module.css#L342-L357)
