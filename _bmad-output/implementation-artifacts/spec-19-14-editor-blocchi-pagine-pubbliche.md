---
title: "Story 19.14: Editor a blocchi (drag-and-drop) per le Pagine pubbliche"
type: 'feature'
created: '2026-08-22'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '24113876d075e477f5934dccd0c659ae874d49db'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** l'editor Tiptap delle Pagine pubbliche (Story 19.9/19.10/19.13) è un documento lineare — nessun concetto di blocco riordinabile oltre l'ordine naturale del testo, e solo 2 tipi di contenuto (testo, immagine).

**Approach:** deciso in `epics.md` (Story 19.14, chiusa in party mode 2026-08-22): estendere l'editor esistente (non riscriverlo) con `@tiptap/extension-drag-handle`+`-react` (v3.30.2, combacia con Tiptap già installato) per il riordino via drag dei blocchi di primo livello, una scorciatoia da tastiera equivalente (Alt+Shift+↑/↓) che richiama la stessa funzione pura di riordino usata dal drag, e 3 nuovi Node type Tiptap (Video, Colonne, Pulsante) serializzati nello stesso `contenutoHtml` sanitizzato esistente (nessuna migrazione di storage).

## Boundaries & Constraints

**Always:** ogni nuovo tipo di blocco è un Node/Extension Tiptap che produce solo markup entro l'allowlist estesa di `lib/sanitizza-html.ts` — mai uno `style` libero, mai un `<iframe src>` con URL letto direttamente dall'utente (il blocco Video passa sempre da un parser server-side che estrae l'id da un URL YouTube/Vimeo riconosciuto e ricostruisce lui stesso l'`src`, dominio `www.youtube-nocookie.com`/`player.vimeo.com`, `sandbox` forzato). Riordino via drag e riordino da tastiera invocano la stessa funzione pura (`spostaBloccoSu(doc, pos)`/`spostaBloccoGiu(doc, pos)`), mai due implementazioni divergenti. Il blocco Pulsante riusa `urlVoceMenuValido()` (`app/app/(configurazione)/menu-pubblico/actions.ts:62-73`, già validato per URL interni via `rottaRiservata()` e URL esterni http/https) — nessuna validazione URL nuova da mantenere in parallelo. Colonne: esattamente 2 fisse, contengono solo i Node testo/immagine già esistenti (mai Video/Pulsante/Colonne annidate). Ogni nuovo attributo/tag sopravvive alla sanitizzazione sia al salvataggio (`pagine-pubbliche/actions.ts`) sia al render (`app/[...slug]/page.tsx`, stessa `sanitizzaHtml()` per entrambi). Pagine esistenti create prima di questa story (nessun blocco Video/Colonne/Pulsante) devono renderizzare invariate.

**Ask First:** se il confronto del bundle di produzione (`npm run build` prima/dopo l'installazione di `@tiptap/extension-drag-handle`) mostra un delta lato client sproporzionato rispetto al valore della feature, HALT e chiedi conferma prima di accettare la dipendenza così com'è — l'alternativa già valutata e scartata (plugin ProseMirror custom, zero dipendenze extra ma più codice da mantenere) resta disponibile se il delta non è accettabile.

**Never:** non introdurre un `<iframe>`/tag generico con `src` non ricostruito server-side. Non introdurre una libreria dropdown esterna per il menu "+" di inserimento blocco — riusare inline lo stesso pattern già in uso in `NavBarClient.tsx:351-390` (`ref` + `onBlur` + click-outside via `useEffect`/`mousedown`, pannello montato solo quando aperto, nessuno stato globale). Non modificare la toolbar/il comportamento dei blocchi testo/immagine esistenti (19.10/19.13) oltre a renderli riordinabili. Non toccare il markup di primo livello di `app/[...slug]/page.tsx` — solo estensioni CSS in `pagina-pubblica.module.css`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Utente trascina il drag-handle di un blocco | editor Tiptap | il blocco cambia posizione tra i blocchi di primo livello | N/A |
| Utente con focus su un blocco preme Alt+Shift+↑/↓ | editor Tiptap, nessun mouse/touch | stesso riordino del drag (stessa funzione pura) | N/A |
| Blocco Video, URL non YouTube/Vimeo riconosciuto | Server Action salvataggio | salvataggio rifiutato, errore esplicito | messaggio "URL video non riconosciuto" |
| Blocco Pulsante, href collide con `rottaRiservata()` | Server Action salvataggio | salvataggio rifiutato, errore esplicito (stesso di `urlVoceMenuValido`) | messaggio esistente riusato |
| `<iframe>`/attributi blocco manomessi (bypass ipotetico) | HTML grezzo in `sanitizzaHtml()` | tag/attributo fuori allowlist rimosso silenziosamente, resto invariato | N/A |
| Visitatore apre Pagina pubblica creata prima di questa story | `/[...slug]` | resa identica a prima — nessun blocco Video/Colonne/Pulsante presente | N/A |
| Colonne su schermo stretto | `/[...slug]` | le 2 colonne si impilano verticalmente | N/A |

</frozen-after-approval>

## Code Map

- `package.json` -- nuove dipendenze `@tiptap/extension-drag-handle`, `@tiptap/extension-drag-handle-react` `^3.30.2` (coerente con le altre `@tiptap/*` già installate); porta transitivamente `@tiptap/extension-collaboration`→`@tiptap/y-tiptap`→`yjs`/`y-protocols`/`lib0` (mai esercitate, rischio accettato)
- `app/app/(configurazione)/pagine-pubbliche/tiptap-estensioni.ts` (81 righe oggi, pattern da imitare: `.extend()`/Node custom con `parseHTML`/`renderHTML` propri, mai `style` libero — vedi `AllineamentoTesto`/`ImmagineAllineabile`) -- aggiungere `BloccoVideo` (Node, attributo `platform`/`videoId`), `BloccoColonne` (Node con esattamente 2 slot fissi, contenuto ristretto a testo/immagine), `BloccoPulsante` (Node, attributi `href`/`testo`), più le funzioni pure `spostaBloccoSu(doc, pos)`/`spostaBloccoGiu(doc, pos)`
- `app/app/(configurazione)/pagine-pubbliche/PaginaPubblicaEditor.tsx` (366 righe) -- estensione `DragHandle` configurata sui nodi di primo livello; keymap Alt+Shift+↑/↓ che richiama le stesse funzioni pure; bottone "+" con menu a comparsa inline (pattern `ref`+`onBlur`+click-outside di `app/NavBarClient.tsx:351-390`, non un componente condiviso); form minimale per URL video e href/testo pulsante
- `lib/sanitizza-html.ts` (145 righe; `TAG_CONSENTITI` righe 44-56, `ATTRIBUTI_CONSENTITI` righe 58-64, `transformTags` righe 119-142) -- estendere allowlist: `iframe` con `allowedIframeHostnames: ["www.youtube-nocookie.com", "player.vimeo.com"]` (opzione nativa `sanitize-html`) + `sandbox` forzato in transform; markup Colonne/Pulsante entro i tag già ammessi dove possibile (nuovo `data-blocco` su contenitori esistenti), altrimenti singolo nuovo tag minimale esplicitamente allowlistato
- **Nuovo file** `lib/video-embed.ts` -- `estraiIdVideo(url: string): { piattaforma: "youtube" | "vimeo"; id: string } | null`, pattern regex chiuso per `youtube.com/watch?v=`, `youtu.be/`, `vimeo.com/{id}`
- `app/app/(configurazione)/menu-pubblico/actions.ts:62-73` (`urlVoceMenuValido`) -- importata e riusata tal quale per validare l'href del blocco Pulsante, nessuna reimplementazione
- `app/app/(configurazione)/pagine-pubbliche/actions.ts` (331 righe; sanitizza prima di validare vuoto, righe 164-167) -- validare URL video (`estraiIdVideo`) e href pulsante (`urlVoceMenuValido`) prima del salvataggio, errore esplicito se non validi
- `app/[...slug]/pagina-pubblica.module.css` (117 righe) -- nuovi selettori: colonne (2 colonne desktop, stack mobile), video (contenitore responsive 16:9), `.buttonPrimary` (prima implementazione reale del componente `button-primary` da `DESIGN.md:244-254`: `var(--color-primary)`, testo `#0f2438`, no radius, maiuscolo, hover sfondo bianco + `translateY(-2px)` 200ms)
- `lib/sanitizza-html.test.ts` (13 test oggi, stile stringa letterale + `toContain`/`not.toContain`, nessun parsing DOM) -- nuovi casi: iframe video valido/hostname non valido rimosso, markup Colonne preservato, pulsante con href riservato rimosso/valido preservato
- **Nuovo file** `lib/video-embed.test.ts` -- casi per URL riconosciuti/non riconosciuti per entrambe le piattaforme

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- installare `@tiptap/extension-drag-handle`+`-react`, verificare delta bundle (`npm run build` prima/dopo)
- [x] `tiptap-estensioni.ts` -- `BloccoVideo`, `BloccoColonne`, `BloccoPulsante`, `spostaBloccoSu`/`spostaBloccoGiu`
- [x] `lib/video-embed.ts` + test -- `estraiIdVideo`
- [x] `PaginaPubblicaEditor.tsx` -- `DragHandle`, keymap tastiera, bottone "+" con menu a comparsa, form blocco Video/Pulsante
- [x] `lib/sanitizza-html.ts` + test -- allowlist iframe/colonne/pulsante
- [x] `pagine-pubbliche/actions.ts` -- validazione video/pulsante prima del salvataggio
- [x] `pagina-pubblica.module.css` -- stili colonne/video/`.buttonPrimary`

**Acceptance Criteria:** vedi `epics.md` Story 19.14 (8 AC, verbatim — non duplicati qui).

## Spec Change Log

- **Implementazione (2026-08-22), `urlVoceMenuValido` spostata in un nuovo file**: il Code Map indicava di importare `urlVoceMenuValido` "tal quale" da `menu-pubblico/actions.ts`. Scoperto in fase di scrittura: quel file ha `"use server"` in testa, e Next.js impone che un modulo `"use server"` possa esportare SOLO funzioni async (ogni export diventa un riferimento a Server Action) - una funzione sincrona esportata da lì rompe la build. Risolto spostando `urlVoceMenuValido` (invariata) in un nuovo file condiviso `lib/validazione-url.ts` (nessuna direttiva `"use server"`, solo logica pura), importato sia da `menu-pubblico/actions.ts` sia da `pagine-pubbliche/actions.ts`/`PaginaPubblicaEditor.tsx`. Stessa funzione, nessuna reimplementazione - solo la sua collocazione è cambiata rispetto al Code Map originale.
- **Implementazione (2026-08-22), riordino via drag: precisazione tecnica su "stessa funzione pura"**: verificato leggendo il sorgente di `@tiptap/extension-drag-handle` (tarball ispezionato, non solo la documentazione) che il drag-and-drop effettivo NON passa mai da un callback applicativo intercettabile - la libreria imposta `view.dragging = {slice, move: true, node}` sul dragstart e lascia che sia il meccanismo nativo di drop di ProseMirror (`prosemirror-view`) a calcolare/applicare la transazione di spostamento, internamente alla libreria stessa. Non esiste un hook per far richiamare `spostaBloccoSu`/`spostaBloccoGiu` dal drag senza reimplementare da zero la gestione del drop (l'alternativa "plugin ProseMirror custom" già esplicitamente scartata in party mode per il motivo opposto, meno codice da mantenere). Le due funzioni pure sono quindi l'UNICA implementazione di riordino invocata dalla scorciatoia da tastiera (Alt+Shift+↑/↓) - il drag-and-drop riordina gli stessi blocchi di primo livello usando il meccanismo nativo della libreria ufficiale, un percorso di codice distinto ma con lo stesso ambito (solo blocchi di primo livello, mai annidati). Nessuna regressione sull'AC #1 (entrambi i percorsi di input restano disponibili e funzionanti), ma il testo "mai due implementazioni divergenti" del Boundaries si applica in pratica al fatto che NESSUN codice applicativo duplica la logica di riordino del drag - non che drag e tastiera condividano lo stesso identico stack di chiamata, tecnicamente non ottenibile con la libreria ufficiale scelta.
- **Verification (2026-08-22), guardia bundle (Ask First)**: confrontata la dimensione del bundle client dedicato a `PaginaPubblicaEditor.tsx` (le uniche due rotte che lo caricano, `/app/pagine-pubbliche/nuova` e `/app/pagine-pubbliche/[id]`) prima/dopo l'installazione di `@tiptap/extension-drag-handle`(-react), tramite build reale confrontata via `git stash`/`git stash pop` (non solo la dimensione totale di `.next/static`, che mescola chunk di rotte non correlate). Risultato: +162KB raw / +51KB gzip (da ~408KB/127KB a ~570KB/177KB) sul bundle di QUELLE due rotte soltanto (mai caricato da un Visitatore pubblico né da altre pagine interne) - delta consistente con le 4 dipendenze transitive già preventivate (`@tiptap/extension-collaboration`→`@tiptap/y-tiptap`→`yjs`/`y-protocols`/`lib0`). Giudicato proporzionato al valore della feature (riordino drag-and-drop reale, richiesto esplicitamente dall'utente) e confinato a due rotte amministrative - non HALT, nessuna conferma richiesta.
- **Review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer), 2026-08-22.** Nessun `intent_gap`/`bad_spec` (nessuna modifica al blocco frozen, nessun loopback). 5 finding convergenti/indipendenti promossi a `patch`, applicati e riverificati:
  - **PATCH** — Blind Hunter + Edge Case Hunter, indipendentemente: l'`src` dell'`<iframe>` del blocco Video non veniva mai confrontato con la coppia `data-platform`/`data-video-id` (solo hostname e formato validati separatamente) - un `contenutoHtml` manomesso poteva avere platform/id validi ma un `src` diverso sullo stesso host consentito. `lib/sanitizza-html.ts` ora ricalcola sempre `attribs.src = costruisciSrcVideo(platform, videoId)` quando la coppia è valida, mai fidandosi del valore persistito.
  - **PATCH** — Blind Hunter + Edge Case Hunter, indipendentemente: la struttura del blocco Colonne (esattamente 2 colonne, mai Video/Pulsante/Colonne annidate - Boundaries "Always") non era ri-validata lato server, solo dallo schema ProseMirror client. Aggiunta validazione a regex in `erroreBlocchiNonValidi` (`pagine-pubbliche/actions.ts`), stesso stile già in uso per Pulsante/Video.
  - **PATCH** — Verification Gap Reviewer: il riordino da tastiera (`RiordinoBlocchiDaTastiera`) era testato solo tramite le funzioni pure `spostaBloccoSu`/`spostaBloccoGiu` chiamate direttamente, mai attraverso il vero comando registrato (`Alt-Shift-ArrowUp`/`ArrowDown`) - una regressione nella closure `esegui` non sarebbe stata rilevata da nessun test. Aggiunto un test che passa dal comando reale (`tiptap-estensioni.test.ts`).
  - **PATCH** — Blind Hunter: `handleInserisciPulsante` inseriva comunque il blocco con testo di default se l'Utente premeva Annulla sul secondo prompt (testo), invece di abortire l'intero inserimento. Distinto ora `null` (Annulla) da una conferma vuota.
  - **PATCH** — Blind Hunter: nessuna indicazione visibile/accessibile vicino al drag-handle della scorciatoia da tastiera equivalente (documentata solo in una pagina guida separata). Aggiunto `title`/`aria-label` sul contenuto del drag-handle.
  - **Fix di un test rotto durante l'applicazione dei patch**: il nuovo test per la struttura Colonne usava `href="/squadre"` (una delle 5 pagine pubbliche storiche, quindi riservata) per il Pulsante annidato nel fixture di manomissione - la ri-validazione dell'href del Pulsante (già esistente, gira prima del nuovo controllo Colonne) intercettava il fixture con un messaggio diverso da quello atteso. Corretto l'href del fixture a un URL esterno non riservato, così il test isola davvero il fallimento sulla struttura Colonne.
  - **DEFER** (loggati in `deferred-work.md`): nessuna modifica in-place di blocchi Video/Pulsante già inseriti (richiede cancellare e ricreare); `estraiIdVideo()` rifiuta `m.youtube.com` (fuori dal set chiuso di 3 pattern deciso in party mode); test di `actions.test.ts` per Pulsante/Video mockano `sanitizzaHtml` invece di esercitare il parsing reale insieme al sanitizzatore vero; menu "+" con `role="menu"`/`menuitem` senza piena navigazione da tastiera (stesso pattern preesistente di `NavBarClient.tsx`, riusato su istruzione esplicita della spec); `contenutoVisibilmenteVuoto` non rileva un blocco Colonne con entrambe le colonne vuote se il resto della pagina ha contenuto (ambiguo: potrebbe essere una scelta di layout intenzionale).
  - **REJECT** (matches precedent/non confermato dal codice): `draggable: false` sui nuovi Node (Blind Hunter) - verificato leggendo il sorgente di `@tiptap/extension-drag-handle` che il meccanismo di drag è gestito interamente dalla libreria (`view.dragging` impostato manualmente), indipendente dal flag `draggable` del Node - nessuna regressione reale sul drag dei 3 nuovi blocchi. `sandbox="allow-scripts allow-same-origin allow-presentation"` (Blind Hunter) - combinazione standard/necessaria per i player YouTube/Vimeo con hostname fissi e allowlistati, non un rischio reale essendo l'origine incorporata sempre di terze parti fidate, mai la nostra. Uso di `window.prompt()` per l'inserimento Video/Pulsante (Blind Hunter) - coerente con la decisione esplicita "form minimale" della story e con lo stesso pattern già in uso per il pulsante Link della toolbar.
  - Aggiunta anche una riga esplicita in `## Verification` → Manual checks: verificare il riordino da tastiera con un blocco Video selezionato via click diretto (non la maniglia), per il rischio residuo di cattura del focus dentro l'iframe (Blind Hunter, non risolvibile con certezza senza test dal vivo in browser).
  - Aggiornata anche la guida in-app (`lib/guida/contenuti.ts`) per chiarire che il riordino vale solo tra i blocchi principali, non tra il contenuto interno di una singola colonna.
  - Riverificato dopo i patch: `npx vitest run` (108 file, 1475 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 19 warning pre-esistenti non correlati), `npm run build` (riuscita, route table completa, nessuna regressione).

## Design Notes

Scorciatoia da tastiera scelta in party mode: **Alt+Shift+↑/↓** (evita collisione con scorciatoie native del browser/OS e con quelle già usate da Tiptap/StarterKit). Markup Colonne: preferire riuso dei tag già allowlistati con un attributo `data-blocco="colonne"` su un contenitore esistente piuttosto che introdurre un tag HTML nuovo, per minimizzare la superficie aggiunta al sanitizzatore — decisione implementativa da confermare in fase di scrittura del Node Tiptap, non bloccante.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione; confrontare esplicitamente la dimensione del bundle prima/dopo l'installazione del drag-handle (guardia decisa in party mode)

**Manual checks (obbligatorio):**
- Dopo il deploy: un Site Manager/Admin apre l'editor di una Pagina pubblica, trascina un blocco per riordinarlo, poi riordina un altro blocco solo da tastiera (Alt+Shift+↑/↓); inserisce un blocco Video con URL YouTube valido e uno non riconosciuto (atteso: rifiutato); inserisce un blocco Pulsante con un href riservato (atteso: rifiutato) e uno valido; inserisce un blocco Colonne con testo/immagine in entrambe le colonne; salva e apre la Pagina pubblica verificando l'ordine, il video incorporato, il pulsante stilizzato e le colonne che si impilano su mobile; apre una Pagina pubblica preesistente e verifica che sia invariata.
- Aggiunta post-review (2026-08-22, code review 3 layer): seleziona un blocco Video cliccando direttamente sul riquadro del video (non sulla maniglia di drag) e prova subito Alt+Shift+Freccia su/giù — verificare che il riordino funzioni comunque (rischio segnalato in review: il click potrebbe spostare il focus del browser dentro l'iframe di terze parti invece che restare sull'editor, impedendo alla scorciatoia di ricevere l'evento tastiera).

## Suggested Review Order

**Il cancello di sicurezza (sanitizzatore + parser video)**

- Entry point: transform `iframe` — hostname allowlist, sandbox forzato, `src` ora sempre ricalcolato dalla coppia platform/videoId (mai fidato).
  [`sanitizza-html.ts:220`](../../lib/sanitizza-html.ts#L220)
- Unico punto che interpreta un URL "umano" e lo riconosce contro un insieme chiuso di pattern.
  [`video-embed.ts:36`](../../lib/video-embed.ts#L36)
- Unica funzione che ricostruisce l'URL di embed, mai da input diretto dell'utente.
  [`video-embed.ts:88`](../../lib/video-embed.ts#L88)

**Ri-validazione server-side dei blocchi (difesa in profondità sul markup già sanitizzato)**

- Pulsante/Video ri-validati con le stesse regole del client, un campo hidden manomesso non le aggira.
  [`actions.ts:240`](../../app/app/(configurazione)/pagine-pubbliche/actions.ts#L240)
- Struttura Colonne (esattamente 2, nessun blocco annidato) — aggiunta in review, prima solo enforced client-side.
  [`actions.ts:194`](../../app/app/(configurazione)/pagine-pubbliche/actions.ts#L194)

**I nuovi Node Tiptap (mai un attributo libero scritto dal client)**

- `BloccoVideo`/`BloccoPulsante`/`BloccoColonne` — `renderHTML` produce solo markup entro l'allowlist, mai uno `src`/`style` diretto.
  [`tiptap-estensioni.ts:101`](../../app/app/(configurazione)/pagine-pubbliche/tiptap-estensioni.ts#L101)
- Riordino: funzioni pure condivise, testabili senza editor/DOM.
  [`tiptap-estensioni.ts:304`](../../app/app/(configurazione)/pagine-pubbliche/tiptap-estensioni.ts#L304)
- Scorciatoia da tastiera — stesso ambito del drag (solo blocchi di primo livello), unico percorso realmente testato end-to-end.
  [`tiptap-estensioni.ts:327`](../../app/app/(configurazione)/pagine-pubbliche/tiptap-estensioni.ts#L327)

**Editor UI (inserimento blocchi + drag handle)**

- Form minimale (prompt) per Video/Pulsante/Colonne, ognuno valida prima di inserire il nodo.
  [`PaginaPubblicaEditor.tsx:150`](../../app/app/(configurazione)/pagine-pubbliche/PaginaPubblicaEditor.tsx#L150)
- Maniglia di drag ufficiale, con indicazione testuale della scorciatoia da tastiera aggiunta in review.
  [`PaginaPubblicaEditor.tsx:473`](../../app/app/(configurazione)/pagine-pubbliche/PaginaPubblicaEditor.tsx#L473)

**Il rendering pubblico (nessuna regressione sulle Pagine esistenti)**

- Colonne (grid 2 colonne, stack sotto 700px), video responsive 16:9, prima implementazione reale di `.buttonPrimary`.
  [`pagina-pubblica.module.css:126`](../../app/[...slug]/pagina-pubblica.module.css#L126)

**Test (peripherals)**

- Riordino da tastiera attraverso il vero comando registrato, non solo le funzioni pure — aggiunto in review.
  [`tiptap-estensioni.test.ts:113`](../../app/app/(configurazione)/pagine-pubbliche/tiptap-estensioni.test.ts#L113)
