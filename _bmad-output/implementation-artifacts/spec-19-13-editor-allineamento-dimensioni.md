---
title: "Story 19.13: Giustificazione testo/immagini, pagina centrata e ridimensionamento immagini"
type: 'feature'
created: '2026-08-21'
status: 'done'
review_loop_iteration: 1
context: []
baseline_commit: '6498066074ecd32eb5ed689bd7c30708845d787d'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** l'editor Tiptap delle Pagine pubbliche (Story 19.10) non permette di allineare/giustificare il testo, non permette di allineare o ridimensionare le immagini inserite, e il rendering pubblico (`app/[...slug]/page.tsx`) mostra sempre titolo e contenuto allineati al bordo sinistro della pagina invece che centrati.

**Approach:** deciso in `epics.md` (Story 19.13, "procedi" - giudizio delegato dall'utente il 2026-08-21, un dettaglio corretto durante questa implementazione, vedi sotto):
1. **Allineamento testo** (paragrafi e titoli H2/H3): nuova estensione Tiptap che estende `@tiptap/extension-text-align` (riusa i comandi/scorciatoie ufficiali `setTextAlign`/`toggleTextAlign`) ma sovrascrive `addGlobalAttributes` per renderizzare un attributo `data-align` invece dello `style="text-align:..."` di default - coerente con la scelta di non introdurre mai uno `style` libero nel sanitizzatore (`lib/sanitizza-html.ts`, gia' colpito una volta da un bug di produzione per una dipendenza mai verificata a runtime, Story 19.9). La resa visiva vive in CSS (`pagina-pubblica.module.css`, selettori per attributo), non inline.
2. **Ridimensionamento immagini**: **corretto durante l'implementazione** - `@tiptap/extension-image` (gia' installato, v3.30.2) include gia' una NodeView di ridimensionamento nativa (opzione `resize`, maniglie di trascinamento) - va solo abilitata via `.configure({ resize: {...} })`, nessuna UI di toolbar aggiuntiva. Salva `width`/`height` come attributi HTML semplici (gia' presenti di default nell'estensione), non stile inline.
3. **Allineamento immagini**: nuovo attributo custom `align` su un'estensione dell'Image di Tiptap (mirror dello stesso principio del punto 1: `data-align` invece di `style`), 3 valori (sinistra/centro/destra), stile via CSS.
4. **Pagina centrata**: `pagina-pubblica.module.css` - `max-width` + `margin:auto` applicati sia a `.titolo` sia a `.contenuto` (nessun nuovo contenitore/wrapper nel markup, nessuna modifica a `page.tsx`).

## Boundaries & Constraints

**Always:** nessun attributo `style` libero introdotto nel sanitizzatore - ogni nuova formattazione (allineamento testo, allineamento immagine) passa da un attributo `data-align` con un valore validato contro un insieme chiuso di stringhe letterali (`left`/`center`/`right` per le immagini, `left`/`center`/`right`/`justify` per il testo), mai da CSS libero. Il ridimensionamento immagine usa `width`/`height` come attributi HTML numerici (non stile), validati come stringhe di sole cifre nel sanitizzatore. Ogni nuovo attributo sopravvive alla sanitizzazione sia al salvataggio (Server Action, Story 19.10) sia al render (`app/[...slug]/page.tsx`, difesa in profondita' gia' stabilita in Story 19.9) - stessa `sanitizzaHtml()` per entrambi i passaggi, nessuna seconda funzione.

**Ask First:** nessuna aggiuntiva - i 4 punti aperti originali della story sono stati risolti esplicitamente dall'utente ("procedi", 2026-08-21).

**Never:** non toccare `app/[...slug]/page.tsx` (nessuna modifica di markup/wrapper - la centratura e' solo CSS su classi gia' esistenti). Non introdurre "float"/testo che scorre attorno alle immagini (deciso: solo allineamento block-level via CSS, niente wrap del testo). Non toccare la toolbar/le funzionalita' esistenti dell'editor (H2/H3, grassetto/corsivo, elenchi, link, upload immagine) - solo aggiunte, nessuna rimozione/modifica di comportamento esistente. Non introdurre `allowedStyles`/CSS libero in `lib/sanitizza-html.ts` - ogni nuovo permesso e' un attributo con valore validato esplicitamente in `transformTags`, mai una proprieta' CSS generica.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Utente seleziona testo e clicca "Giustifica" (o Sinistra/Centro/Destra) | editor Tiptap | il paragrafo/titolo selezionato ottiene `data-align="justify"` (o il valore scelto), pulsante attivo riflette lo stato corrente | N/A |
| Utente rimuove l'allineamento (click di nuovo sullo stesso pulsante attivo) | editor Tiptap | `data-align` rimosso dal nodo, torna al comportamento di default (sinistra, invariato) | N/A |
| Utente seleziona un'immagine e clicca "Centra" (o Sinistra/Destra) | editor Tiptap, nodo immagine selezionato | l'immagine ottiene `data-align="center"` (o il valore scelto) | N/A |
| Utente trascina una maniglia d'angolo di un'immagine selezionata | editor Tiptap | l'immagine si ridimensiona, `width`/`height` salvati come attributi numerici sul nodo | N/A |
| `data-align` o `width`/`height` manomessi/fuori dall'insieme valido (bypass ipotetico del salvataggio) | HTML grezzo in ingresso a `sanitizzaHtml()` | attributo rimosso silenziosamente (non l'intero tag), resto del contenuto invariato | N/A (nessun errore visibile, coerente con la sanitizzazione esistente) |
| Visitatore apre una Pagina pubblica esistente creata prima di questa storia (nessun `data-align`/`width`/`height` su nessun nodo) | `/[...slug]` pubblica | resa identica a prima di questa storia - nessuna classe/allineamento applicato di default | N/A |
| Visitatore apre una Pagina pubblica su schermo largo | `/[...slug]` pubblica | titolo e contenuto centrati nella pagina (non piu' allineati al bordo sinistro) | N/A |

</frozen-after-approval>

## Code Map

- `package.json` -- nuova dipendenza `@tiptap/extension-text-align` (stessa versione `3.30.2` delle altre dipendenze `@tiptap/*` gia' installate)
- **Nuovo file** `app/app/(configurazione)/pagine-pubbliche/tiptap-estensioni.ts` -- `AllineamentoTesto` (estende `@tiptap/extension-text-align`, `addGlobalAttributes` sovrascritto per renderizzare `data-align` invece di `style`, tipi `["paragraph", "heading"]`) e `ImmagineAllineabile` (estende `@tiptap/extension-image` gia' importata in `PaginaPubblicaEditor.tsx`, aggiunge l'attributo `align` con lo stesso principio `data-align`, configurata con `resize: { enabled: true, alwaysPreserveAspectRatio: true, minWidth: 40, minHeight: 40 }`)
- `app/app/(configurazione)/pagine-pubbliche/PaginaPubblicaEditor.tsx` -- sostituire l'import diretto di `TiptapImage` con `ImmagineAllineabile`, aggiungere `AllineamentoTesto.configure({ types: ["paragraph", "heading"] })` alle `extensions`; nuovi bottoni toolbar: 4 per l'allineamento testo (Sinistra/Centro/Destra/Giustifica, `editor.chain().focus().toggleTextAlign(...)`, `aria-pressed` da `editor.isActive({ textAlign: ... })`), 3 per l'allineamento immagine (Sinistra/Centro/Destra, `editor.chain().focus().updateAttributes("image", { align: ... }).run()`, disabilitati quando `!editor.isActive("image")`)
- `lib/sanitizza-html.ts` -- `ATTRIBUTI_CONSENTITI` esteso: `data-align` su `p`/`h2`/`h3`/`img`, `width`/`height` su `img`; `transformTags` esteso con validazione a insieme chiuso per ciascun tag (mirror del transform gia' esistente su `a` per `rel`) - `data-align` rimosso se non e' uno dei valori letterali attesi, `width`/`height` rimossi se non sono stringhe di sole cifre
- `app/[...slug]/pagina-pubblica.module.css` -- `.titolo`/`.contenuto`: `max-width` (gia' presente su `.contenuto`, da aggiungere a `.titolo`) + `margin: 0 auto` su entrambi; nuovi selettori per attributo `.contenuto p[data-align]`/`.contenuto h2[data-align]`/`.contenuto h3[data-align]` (4 valori) e `.contenuto img[data-align]` (3 valori, `display:block` + `margin` per centrare/spingere a sinistra/destra)
- `lib/sanitizza-html.test.ts` -- nuovi casi: `data-align` valido preservato su p/h2/h3/img, valore non valido rimosso, `width`/`height` numerici preservati su img, valori non numerici rimossi

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- `@tiptap/extension-text-align`
- [x] `tiptap-estensioni.ts` -- `AllineamentoTesto` + `ImmagineAllineabile`
- [x] `PaginaPubblicaEditor.tsx` -- estensioni + 7 nuovi bottoni toolbar
- [x] `lib/sanitizza-html.ts` -- allowlist + transform estesi
- [x] `pagina-pubblica.module.css` -- centratura + stili per attributo
- [x] `lib/sanitizza-html.test.ts` -- nuovi casi

**Acceptance Criteria:** vedi epics.md Story 19.13 (6 AC, verbatim - non duplicati qui).

## Spec Change Log

**2026-08-21 — implementazione.** Un'aggiunta non elencata nel Code Map, necessaria per l'AC "trascina una maniglia d'angolo": la NodeView di ridimensionamento nativa di `@tiptap/extension-image` non applica alcuno stile alle maniglie quando non le si passa una `className` esplicita (verificato nel sorgente, `node_modules/@tiptap/core/src/lib/ResizableNodeView.ts`) - senza CSS le maniglie restano a dimensione 0, invisibili e non trascinabili. Aggiunta una manciata di regole in [`pagine-pubbliche.module.css`](../../app/app/(configurazione)/pagine-pubbliche/pagine-pubbliche.module.css) (solo l'editor, mai il rendering pubblico) sugli attributi `data-resize-handle`/`data-resize-*` che la NodeView imposta comunque - nessuna `className` custom richiesta, nessun impatto sul sanitizzatore (questi attributi sono generati/consumati lato client, mai serializzati nell'HTML salvato).

**2026-08-21 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap), review_loop_iteration 1.** Nessun `intent_gap`/`bad_spec` (nessuna modifica al blocco frozen). 2 patch applicate (3 finding convergenti/correlati), 2 defer, resto reject:

- **PATCH (severità media)** — Edge Case Hunter: `SOLO_CIFRE` (`/^\d+$/`) accettava `width`/`height="0"`, producendo un'immagine invisibile (0×0) se il valore avesse mai bypassato la NodeView di resize (che impone un minimo di 40px solo lato client, durante il trascinamento) - il vero cancello (`sanitizzaHtml()`) non replicava lo stesso minimo. Aggiunta `dimensioneImmagineValida()` in [`lib/sanitizza-html.ts`](../../lib/sanitizza-html.ts): range 40-4000px, stesso minimo della NodeView, tetto massimo aggiunto per difesa in profondità. 3 nuovi test.
- **PATCH (severità bassa)** — Blind Hunter + Verification Gap Reviewer, indipendentemente: l'insieme `["left","center","right"]` per l'allineamento immagine era duplicato letteralmente in `tiptap-estensioni.ts` (client) e `lib/sanitizza-html.ts` (sanitizzatore), a rischio di divergenza silenziosa futura; il transform `img` del sanitizzatore reimplementava inline la stessa logica del factory già usato per `p`/`h2`/`h3` invece di riusarlo. Estratto [`lib/allineamenti.ts`](../../lib/allineamenti.ts) (unica fonte di verità per entrambi gli insiemi, importato da entrambi i lati), `img` ora riusa lo stesso `rimuoviAllineamentoNonValido()` di `p`/`h2`/`h3`.
- **DEFER** — Blind Hunter: le maniglie di ridimensionamento (`[data-resize-handle]`, ~10-12px) sono sotto la soglia di 44px già documentata come regola del progetto per altri elementi cliccabili - rischio ritenuto basso (editor amministrativo, uso desktop atteso), una vera correzione richiederebbe un `createCustomHandle` dedicato. Loggato in `deferred-work.md`.
- **DEFER** — Verification Gap: `sprint-status.yaml`/`epics.md` non riflettevano lo stato reale (implementazione completa) mentre la spec era già `in-review` - corretto in questo stesso giro di finalizzazione (non un vero defer separato, sistemato qui).
- **REJECT** (varie, tutte "matches precedent"/out-of-scope): nessun toggle/unset per l'allineamento immagine dalla toolbar (Edge Case Hunter) - comportamento esplicitamente descritto nel Code Map originale, in-scope così com'è; nessun limite superiore su width/height nel Boundaries letterale della spec (poi comunque aggiunto per difesa in profondità, vedi patch sopra); nessun test diretto per `PaginaPubblicaEditor.tsx`/`tiptap-estensioni.ts` (nessun componente client del progetto ha mai un test diretto, confermato); interazione `height:auto`/`width` HTML esplicito (i browser sintetizzano l'aspect-ratio dagli attributi, nessun conflitto reale).

Riverificato dopo le patch: `npx vitest run` (106 file, 1416 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori), `npm run build` (riuscita, nessuna regressione route table).

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione

**Manual checks (obbligatorio, non solo se manca la CLI):**
- Dopo il deploy: un Site Manager/Admin/Dirigente apre l'editor di una Pagina pubblica, giustifica un paragrafo, centra/ridimensiona un'immagine, salva; apre la Pagina pubblica e verifica che testo/immagine appaiano come impostato e che titolo+contenuto siano centrati nella pagina

## Suggested Review Order

**Il sanitizzatore (il cancello reale)**

- Validazione a insieme chiuso di `data-align` (factory condiviso `p`/`h2`/`h3`/`img`) e range 40-4000px per `width`/`height` - nessuno `style` libero introdotto.
  [`lib/sanitizza-html.ts:73-134`](../../lib/sanitizza-html.ts#L73-L134)
- Unica fonte di verità per gli insiemi di allineamento, condivisa col lato client.
  [`lib/allineamenti.ts`](../../lib/allineamenti.ts)

**Le estensioni Tiptap (nessun `style` inline prodotto)**

- Verificare che `data-align` (non `style`) sia davvero ciò che viene renderizzato per testo e immagini; ridimensionamento nativo (`resize`) configurato con lo stesso minimo di 40px del sanitizzatore.
  [`tiptap-estensioni.ts`](../../app/app/(configurazione)/pagine-pubbliche/tiptap-estensioni.ts)
- 7 nuovi bottoni toolbar (allineamento testo/immagine).
  [`PaginaPubblicaEditor.tsx:239-311`](../../app/app/(configurazione)/pagine-pubbliche/PaginaPubblicaEditor.tsx#L239-L311)

**Il rendering pubblico (nessuna regressione sulle Pagine esistenti)**

- Una Pagina senza `data-align`/`width`/`height` su nessun nodo deve restare visivamente identica a prima di questa storia; titolo+contenuto centrati.
  [`pagina-pubblica.module.css:13-116`](../../app/[...slug]/pagina-pubblica.module.css#L13-L116)
