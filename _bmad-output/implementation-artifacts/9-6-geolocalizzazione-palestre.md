---
baseline_commit: bc8e4aeec1846e9f56271b03c14dc9247518f78f
---

# Story 9.6: Geolocalizzazione Palestre

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Utente di qualunque Ruolo che deve raggiungere una Palestra,
I want che l'app mi permetta di navigare direttamente verso la Palestra con Maps,
so that non devo cercare a mano l'indirizzo in un'altra app.

## Acceptance Criteria

1. **Given** una Palestra con posizione impostata (indirizzo) **When** un Utente qualunque la visualizza (in `/palestre`, `/slot`, `/orari`, `/mio-orario`) **Then** vede un link/pulsante "Naviga" che apre l'app Maps del dispositivo puntato su quella posizione
2. **Given** un Admin o Dirigente che crea/modifica una Palestra **When** compila il form **Then** può impostare la posizione — riusa l'`indirizzo` già esistente (nessun nuovo campo)
3. **Given** una Palestra senza posizione impostata **When** viene visualizzata **Then** nessun link "Naviga" rotto/vuoto viene mostrato (stesso principio guard-clause già usato per il logo, Story 7.2)

### Estensione post-done (2026-07-27) — su feedback utente dal vivo

La prima versione (solo `indirizzo` testuale) non basta: l'utente vuole **scegliere la posizione da Google Maps** e **vederla** dentro l'app. Nuovi AC:

4. **Given** un Admin o Dirigente che crea/modifica una Palestra incolla un link di condivisione Google Maps nel nuovo campo dedicato **When** salva **Then** l'app estrae latitudine/longitudine da quel link e le persiste su `Palestra.latitudine`/`Palestra.longitudine`
5. **Given** il testo incollato non è un link Google Maps riconoscibile **When** l'Admin/Dirigente salva **Then** vede un errore di validazione chiaro, nessuna scrittura
6. **Given** una Palestra con latitudine/longitudine salvate **When** viene visualizzata in `/palestre` **Then** l'Admin/Dirigente vede una mappa incorporata (iframe, nessuna chiave API) centrata su quella posizione, oltre al link "Naviga" (ora basato sulle coordinate precise)
7. **Given** una Palestra ha solo l'`indirizzo` testuale (nessun link Maps ancora incollato) **When** viene visualizzata in `/palestre` **Then** vede comunque una mappa incorporata basata sulla ricerca testuale dell'indirizzo
8. **Given** `/slot`, `/orari`, `/mio-orario` **When** una Palestra ha coordinate precise **Then** il link "Naviga" punta alle coordinate (più preciso); nessuna mappa incorporata in queste pagine, solo `/palestre` la mostra
9. **And** l'etichetta accessibile del link "Naviga" fa riferimento solo al nome della Palestra, mai al Campo (fix di un difetto minore introdotto dalla code review della prima versione)

## Tasks / Subtasks

- [x] Task 1: Helper condiviso per il link "Naviga" (AC: #1, #3)
  - [x] Creato `lib/link-naviga-palestra.ts`: `costruisciLinkNaviga(indirizzo: string | null | undefined): string | null` — ritorna `null` se `indirizzo` è `null`/`undefined`/vuoto/solo spazi (AC #3), altrimenti `https://www.google.com/maps/search/?api=1&query=<indirizzo url-encoded>`
  - [x] Creato `lib/link-naviga-palestra.test.ts` (7 test): indirizzo valido con virgole, trim, accenti, `null`, `undefined`, stringa vuota, stringa solo spazi — tutti passano
- [x] Task 2: `/palestre` — `PalestraRow.tsx` (AC: #1, #3)
  - [x] Aggiunto link "Naviga" con guard-clause (`{linkNaviga && <a ...>Naviga</a>}`) in cima alla card, usando `costruisciLinkNaviga(palestra.indirizzo)`
  - [x] `target="_blank" rel="noopener noreferrer"`; nuova classe `.linkNaviga` in `palestre.module.css` (riusa `.bottone` + `display:inline-block`/`text-decoration:none`, assenti in `.bottone` perché finora usata solo su `<button>`)
- [x] Task 3: `/slot`, `/orari` — `SlotTable.tsx` condiviso (AC: #1, #3)
  - [x] Esteso il tipo esportato `SlotRiga`: `campo: { nome: string; palestra: { nome: string; indirizzo: string | null } }` — nessuna modifica alle query Prisma di `slot/page.tsx`/`orari/page.tsx` necessaria, confermato con `tsc --noEmit` (0 errori)
  - [x] Aggiunto link "Naviga" (nuova classe `.linkNaviga` in `SlotTable.module.css`, link testuale non pulsante pieno) nella cella "Palestra / Campo", stesso guard-clause
- [x] Task 4: `/mio-orario` — `mio-orario/page.tsx` (AC: #1, #3)
  - [x] Confermato: eredita l'estensione del tipo `SlotRiga` (import) senza modifiche di tipo qui
  - [x] Aggiunto link "Naviga" accanto a `{riga.campo.palestra.nome} - {riga.campo.nome}`, nuova classe `.linkNaviga` in `mio-orario.module.css` (stesso trattamento di `SlotTable.module.css`)
- [x] Task 5: Verifica AC #2 — nessuna modifica di codice attesa
  - [x] Confermato: `NuovaPalestraForm.tsx` (creazione, campo `indirizzo` non obbligatorio) e `PalestraRow.tsx` (modifica, stesso campo con `defaultValue`) hanno già un campo "Indirizzo" funzionante — AC #2 era già soddisfatto dal codice esistente prima di questa storia, nessuna modifica necessaria
- [x] Task 6: Regressione (AC: #1, #2, #3)
  - [x] Suite Vitest completa: 507/507 passati (500 baseline + 7 nuovi in `lib/link-naviga-palestra.test.ts`), zero regressioni
  - [x] `npx tsc --noEmit`: 0 errori. `eslint` su tutti i file toccati (`app/(orari-palestre)/**`, `lib/link-naviga-palestra.ts`/`.test.ts`): 0 errori

### Estensione post-done (2026-07-27)

- [x] Task 7: Migrazione Prisma — `Palestra.latitudine`/`longitudine` (AC: #4)
  - [x] Aggiunto `latitudine Float?`, `longitudine Float?` a `prisma/schema.prisma` (nullable, tabella `palestre` già popolata)
  - [x] Creata `prisma/migrations/20260727010000_add_coordinate_palestra/migration.sql`
- [x] Task 8: Parser puro del link Google Maps (AC: #4, #5)
  - [x] Creato `lib/estrai-coordinate-maps.ts`: `estraiCoordinateDaLinkMaps` (pin preciso `!3d/!4d` → centro vista `@lat,lng,` → query `?q=`/`?ll=`, con validazione range) e `isLinkMapsAccorciato`
  - [x] `lib/estrai-coordinate-maps.test.ts` (13 test): tutti e tre i formati, coordinate negative, fuori range, link senza coordinate, stringa vuota, link brevi riconosciuti/non riconosciuti
- [x] Task 9: Risoluzione link brevi + validazione lato Server Action (AC: #4, #5)
  - [x] `risolviLinkMaps` in `app/(orari-palestre)/palestre/actions.ts`: parsing diretto, fallback su `fetch(link, { redirect: "follow" })` + re-parsing su `response.url` solo per link brevi
  - [x] `creaPalestra`/`aggiornaPalestra` estese con `leggiCoordinateDaFormData`: vuoto → `null`/`null`, non valido → `VALIDATION` (nessuna scrittura), valido → persistito
- [x] Task 10: Helper di visualizzazione — preferire le coordinate (AC: #4, #6, #7, #8, #9)
  - [x] `costruisciLinkNaviga` ora a oggetto (`{ indirizzo, latitudine, longitudine }`), preferisce le coordinate se entrambe presenti
  - [x] Nuova `costruisciLinkMappaIncorporata` — stessa preferenza, URL `output=embed` (nessuna chiave API)
  - [x] `lib/link-naviga-palestra.test.ts` riscritto per la nuova firma (9 test)
- [x] Task 11: `/palestre` — `PalestraRow.tsx`/`NuovaPalestraForm.tsx` (AC: #4, #5, #6, #7)
  - [x] Campo "Link Google Maps (opzionale)" aggiunto a entrambi i form; `defaultValue` in `PalestraRow.tsx` ricostruito da `latitudine`/`longitudine` salvate
  - [x] Mappa incorporata (`<iframe>`, nuova classe `.mappaIncorporata`) aggiunta accanto al link "Naviga", stesso guard-clause
- [x] Task 12: `/slot`, `/orari`, `/mio-orario` — coordinate + fix etichetta (AC: #8, #9)
  - [x] `SlotRiga.campo.palestra` esteso con `latitudine`/`longitudine` (nessuna query Prisma toccata)
  - [x] Coordinate passate a `costruisciLinkNaviga` in `SlotTable.tsx`/`mio-orario/page.tsx`; nessuna mappa incorporata in queste pagine
  - [x] `aria-label` corretto in entrambi i file: rimosso il riferimento al Campo, resta solo il nome della Palestra
- [x] Task 13: Regressione estensione
  - [x] Suite Vitest completa: 528/528 passati (507 + 22 nuovi/estesi tra `estrai-coordinate-maps.test.ts`, `link-naviga-palestra.test.ts`, `palestre/actions.test.ts`), zero regressioni
  - [x] `npx tsc --noEmit` ed `eslint` sui file toccati: 0 errori

### Review Findings

- [x] [Review][Patch] Contrasto insufficiente sul testo del link "Naviga" [app/(orari-palestre)/SlotTable.module.css, app/(orari-palestre)/mio-orario/mio-orario.module.css] — corretto: colore cambiato da `var(--color-primary)` a `var(--color-button-bg)` (≥4.5:1 verificato) in entrambi i file
- [x] [Review][Patch] Margine superiore indesiderato sul link "Naviga" in `/palestre` [app/(orari-palestre)/palestre/PalestraRow.tsx, palestre.module.css] — corretto: aggiunto `margin-top: 0` a `.linkNaviga`
- [x] [Review][Patch] Nessuna etichetta accessibile che distingua i link "Naviga" ripetuti [app/(orari-palestre)/SlotTable.tsx, mio-orario/page.tsx, palestre/PalestraRow.tsx] — corretto: aggiunto `aria-label` con nome Palestra/Campo su tutti e tre i link
- [x] [Review][Patch] Testo e link concatenati senza spazio letterale [app/(orari-palestre)/SlotTable.tsx, mio-orario/page.tsx] — corretto: aggiunto uno spazio letterale (`{" "}`) prima del link, rimosso il `margin-left` CSS ora ridondante
- [x] [Review][Patch] Duplicazione CSS divergente tra i due `.linkNaviga` [app/(orari-palestre)/SlotTable.module.css, mio-orario/mio-orario.module.css] — corretto: `font-size` unificato a 12px in entrambi, commenti aggiornati per spiegare la scelta del colore invece di limitarsi a "stesso trattamento"
- [x] [Review][Defer] Nessun test verifica il rendering condizionale del link nei tre punti di utilizzo [app/(orari-palestre)/SlotTable.tsx, mio-orario/page.tsx, palestre/PalestraRow.tsx] — deferred, pre-existing (nessuna pagina/componente del progetto ha mai avuto test di rendering, solo funzioni pure e Server Action)
- [x] [Review][Defer] Nessun avviso "si apre in una nuova scheda" sui link `target="_blank"` [app/(orari-palestre)/SlotTable.tsx, mio-orario/page.tsx, palestre/PalestraRow.tsx] — deferred, nessun precedente di questo pattern esiste altrove nel progetto (nessun altro link esterno), da valutare come convenzione trasversale futura, non specifico di questa storia
- [x] [Review][Defer] Il link "Naviga" in `/palestre` riflette l'ultimo indirizzo salvato, non il valore live dell'input durante la modifica [app/(orari-palestre)/palestre/PalestraRow.tsx] — deferred, comportamento intrinseco del pattern Server Component + `revalidatePath` gia' usato in tutto il progetto (ogni campo non controllato si comporta cosi', non specifico di questa storia)

## Dev Notes

- **Decisione presa in questa storia (opzione (a) delle due proposte in `epics.md`)**: riusare l'`indirizzo` testuale già esistente di `Palestra` con un link di ricerca su Google Maps — **non** aggiungere un campo coordinate dedicato. Motivazione: `Palestra.indirizzo` è già `String?` in `prisma/schema.prisma` (nessuna migrazione necessaria), coerente con NFR6 (nessun servizio esterno a pagamento — nessuna geocodifica, solo un URL di ricerca) e con la preferenza già espressa in `epic-9-context.md` ("preferire la soluzione più semplice ... salvo necessità reale di coordinate precise"). Se in futuro (Epic 10, partite in trasferta non corrispondenti a una Palestra censita) servisse un indirizzo/coordinate ad-hoc non legato a un record `Palestra`, la stessa funzione `costruisciLinkNaviga` è riusabile passandole una stringa indirizzo qualunque — non è stata scritta in modo specifico a `Palestra`.
- **Nessuna migrazione Prisma per questa storia** — `indirizzo` esiste da Story 2.1, il form di creazione/modifica lo gestisce già (AC #2 soddisfatto senza codice nuovo, vedi Task 5).
- **Pattern guard-clause da riusare esattamente**: `{logoUrl && <img className={styles.logo} src={logoUrl} alt="" />}` in `app/NavBarClient.tsx:169` (Story 7.2) — stesso principio "mai un elemento rotto/vuoto mostrato", qui applicato al link "Naviga" invece che a un'immagine.
- **`SlotTable.tsx` è condiviso da tre pagine** (`slot/`, `orari/`, `mio-orario/` — quest'ultima solo per il tipo, non per il componente, vedi Story 8.3) — un solo punto da modificare per il tipo `SlotRiga` e per il rendering nella tabella condivisa; `mio-orario/page.tsx` ha markup proprio (non `<SlotTable>`) e va toccato separatamente per il rendering, ma eredita il tipo esteso senza modifiche.
- **`Palestra` non è protetta da RLS (AD-9)** — nessun impatto, questa storia non tocca query RLS-protette (Atleta) né Server Action, solo lettura Prisma diretta già esistente e rendering.
- **Fuori perimetro esplicito**: `app/(amministrazione)/vista-dirigente/page.tsx` mostra `campo.palestra.nome` solo dentro una stringa di testo concatenata (riepilogo compatto, non un elemento cliccabile) — non è tra le 4 pagine elencate nell'AC #1, non va toccato in questa storia.
- URL del link: `https://www.google.com/maps/search/?api=1&query=<indirizzo url-encoded>` — formato "universal" di Google Maps (non richiede coordinate, accetta testo libero), comportamento di apertura app-vs-browser gestito dal sistema operativo/browser del dispositivo, non da codice applicativo.

#### Review Findings — Estensione (2026-07-27)

- [x] [Review][Patch] `estraiCoordinateDaLinkMaps` non verificava il dominio dell'URL — accettava coordinate da **qualunque** link con una stringa a forma di coordinate (es. `https://esempio.com/?q=45,12`), violando l'AC #5 (nessun errore per link non riconoscibili) e aprendo un rischio di sicurezza sul percorso dei link brevi (il redirect risolto non veniva mai verificato) [lib/estrai-coordinate-maps.ts] — corretto: aggiunto un controllo di dominio (`google.com`, `www.google.com`, `maps.google.com`, `maps.app.goo.gl`, `goo.gl`, o sottodomini `*.google.com`) prima di applicare i pattern; si applica automaticamente anche al link risolto da `risolviLinkMaps` (stessa funzione riusata)
- [x] [Review][Patch] Nessun timeout sulla `fetch` di risoluzione dei link brevi — un host lento/irraggiungibile bloccherebbe la Server Action a tempo indefinito [app/(orari-palestre)/palestre/actions.ts] — corretto: aggiunto `signal: AbortSignal.timeout(5000)`
- [x] [Review][Patch] Il parser non riconosceva il formato `query=lat,lng` generato dalla stessa app (`costruisciLinkNaviga`) — un Admin che incollasse il proprio link "Naviga" nel campo Link Maps lo avrebbe visto rifiutato [lib/estrai-coordinate-maps.ts] — corretto: aggiunto `query` all'alternanza del pattern di query
- [x] [Review][Patch] Link brevi incollati senza schema (es. `maps.app.goo.gl/abc123`, senza `https://`) venivano scartati solo per quello, non per assenza di coordinate [lib/estrai-coordinate-maps.ts] — corretto: si ritenta con `https://` in testa se `new URL()` lancia
- [x] [Review][Patch] `PalestraRow.tsx` costruiva a mano un URL duplicato (`https://www.google.com/maps?q=...`) per il valore iniziale del campo di modifica, invece di riusare l'helper condiviso — rischio di disallineamento silenzioso con `estraiCoordinateDaLinkMaps` se uno dei due cambia formato [app/(orari-palestre)/palestre/PalestraRow.tsx] — corretto: riusa `costruisciLinkNaviga({ latitudine, longitudine })`
- [x] [Review][Patch] Duplicazione della condizione "ci sono entrambe le coordinate" tra `valoreQuery` e `costruisciLinkMappaIncorporata` nello stesso file [lib/link-naviga-palestra.ts] — corretto: calcolata una sola volta, `risolviQuery` ritorna anche `haCoordinate`
- [x] [Review][Patch] Mappa incorporata senza `referrerPolicy` [app/(orari-palestre)/palestre/PalestraRow.tsx] — corretto: aggiunto `referrerPolicy="no-referrer"`, difesa in profondità minima per contenuto di terze parti incorporato
- [x] [Review][Dismiss] "Nessun test per la nuova logica di parsing/rete" — falso: 17 test in `estrai-coordinate-maps.test.ts`, 9 in `link-naviga-palestra.test.ts`, 8 nuovi/estesi in `palestre/actions.test.ts` (incluso un caso con `fetch` mockato) — il reviewer non aveva ricevuto il diff dei file di test nel prompt di questa sessione di review, non è un gap reale
- [x] [Review][Dismiss] Formattazione `prisma/schema.prisma` presunta inconsistente sul blocco `Palestra` — verificato manualmente: il blocco era già allineato correttamente: colonna 12 per tutti i tipi; `npx prisma format` avrebbe riformattato anche molti model non toccati da questa storia (drift preesistente, fuori perimetro) — nessuna modifica applicata
- [x] [Review][Dismiss] Mancato `revalidatePath` per `/slot`, `/orari`, `/mio-orario` dopo l'aggiornamento delle coordinate di una Palestra — falso: tutte e tre le pagine hanno già `export const dynamic = "force-dynamic"` (nessuna cache Next.js da invalidare, verificato leggendo i file)
- [x] [Review][Dismiss] `aria-label` ambiguo quando una Palestra ha più Campi nella stessa tabella (stesso testo "Naviga verso Palestra X" per righe diverse) — intenzionale: rimozione del riferimento al Campo richiesta esplicitamente dall'utente in questa stessa sessione ("non capisco l'aggiunta del valore campo"); le altre colonne della riga (Giorno/Orario/Gruppo) distinguono comunque le righe, e la destinazione del link è realmente identica
- [x] [Review][Defer] Se il pattern con priorità più alta matcha ma produce coordinate fuori range, la funzione ritorna `null` invece di ritentare i pattern successivi — deferred, teorico (un vero link Google Maps ha sempre coordinate internamente coerenti tra i suoi pattern)
- [x] [Review][Defer] `(0,0)` ("Null Island") accettato come coordinata valida — deferred, richiederebbe la cifra letterale "0,0" nella posizione esatta di un pattern reale, probabilità trascurabile
- [x] [Review][Defer] Pattern del centro vista richiede la virgola finale (`@lat,lng,`) — un link `@lat,lngz` senza quella virgola non matcherebbe — deferred, i link Google Maps reali includono sempre quella virgola prima dello zoom
- [x] [Review][Defer] Messaggio di errore generico, non distingue "testo non riconoscibile" da "la fetch di risoluzione è fallita/andata in timeout" — deferred, miglioria UX minore, non bloccante
- [x] [Review][Defer] Nessun attributo `sandbox` sull'iframe della mappa — deferred, rischierebbe di rompere l'interattività della mappa (che richiede script) senza verifica dal vivo; il controllo di dominio già applicato riduce già il rischio di contenuto arbitrario incorporato

## Dev Notes — Estensione post-done (2026-07-27)

- **Perché non un selettore mappa interattivo**: richiederebbe Google Maps JavaScript API (`maps.googleapis.com/maps/api/js`), che serve una chiave API con account di fatturazione collegato anche se l'uso resta nel tier gratuito — in conflitto con NFR6 ("nessun budget/hosting dedicato... piani Free"). Scelto invece: l'Admin/Dirigente incolla un link di condivisione ottenuto da Google Maps per conto proprio, il server ne estrae le coordinate — zero costi, zero chiavi API.
- **Mappa incorporata (`iframe`) senza chiave API**: il formato classico `https://maps.google.com/maps?q=<query>&output=embed` (non l'ufficiale "Maps Embed API" che richiede comunque una chiave, seppur gratuita) funziona senza alcuna autenticazione, sia con coordinate (`q=<lat>,<lng>`) sia con testo libero (`q=<indirizzo>`) — permette il fallback richiesto dall'AC #7 con lo stesso meccanismo.
- **`Palestra.latitudine`/`longitudine` DEVONO essere nullable** — a differenza della tabella `allenatori` (Story 9.5, vuota al momento della migrazione), `palestre` ha già righe reali in produzione da Epic 2. Nessun `NOT NULL` possibile qui.
- **Formati di link Google Maps da riconoscere** (in ordine di priorità, il primo che matcha vince): (1) pin preciso `!3d<lat>!4d<lng>` — il più affidabile, presente quando si tocca/rilascia un punto specifico; (2) centro vista `/@<lat>,<lng>,<zoom>z` — presente in quasi tutti i link "Condividi"; (3) parametro di query `?q=<lat>,<lng>` o `?ll=<lat>,<lng>` — formati più vecchi. **Link brevi** (`maps.app.goo.gl/...`, `goo.gl/maps/...`, tipici della condivisione da mobile) non contengono le coordinate nell'URL stesso — vanno risolti con una richiesta HTTP che segue il redirect (`fetch(url, { redirect: "follow" })`, poi si legge `response.url`) prima di poter applicare i pattern sopra. Nessun costo, nessuna chiave API: è solo una richiesta HTTP verso un dominio Google pubblico.
- **Svuotare il campo "Link Google Maps" in modifica cancella la posizione** (stesso principio già in uso per `indirizzo`: campo vuoto → `null` esplicito) — non lascia le coordinate precedenti invariate per errore.
- **Bug di UX corretto in questa estensione**: l'`aria-label` "Naviga verso Palestra X - Campo Y" (aggiunto nella code review della prima versione per distinguere link ripetuti) era fuorviante — la posizione riguarda l'edificio (Palestra), il Campo è solo l'area di gioco al suo interno, non ha una posizione propria. Segnalato dall'utente dal vivo.
- **Perché solo `/palestre` mostra la mappa incorporata**: `/slot`/`/orari` sono tabelle con potenzialmente molte righe (uno slot per ogni combinazione giorno/orario/campo/gruppo) — un iframe per riga sarebbe pesante da caricare; `/palestre` ha invece una card per Palestra (poche decine al massimo), dove una mappa fa parte naturale della scheda di gestione.

### Project Structure Notes

- Nuovo file `lib/link-naviga-palestra.ts` (+ test), stesso livello/stile di `lib/giorno-settimana.ts`. Nessuna nuova cartella.
- File toccati: `app/(orari-palestre)/palestre/PalestraRow.tsx`, `app/(orari-palestre)/SlotTable.tsx`, `app/(orari-palestre)/mio-orario/page.tsx`. Nessuna modifica a `slot/page.tsx`/`orari/page.tsx` (le query Prisma già restituiscono `indirizzo`, serve solo allargare il tipo in `SlotTable.tsx`).
- Nessuna migrazione, nessuna nuova Server Action.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.6: Geolocalizzazione Palestre]
- [Source: _bmad-output/implementation-artifacts/epic-9-context.md — vincolo NFR6/soluzione più semplice, collegamento a Epic 10]
- [Source: prisma/schema.prisma#model Palestra — indirizzo già String?]
- [Source: app/(orari-palestre)/SlotTable.tsx, app/(orari-palestre)/slot/page.tsx, app/(orari-palestre)/orari/page.tsx, app/(orari-palestre)/mio-orario/page.tsx, app/(orari-palestre)/palestre/PalestraRow.tsx, app/(orari-palestre)/palestre/NuovaPalestraForm.tsx]
- [Source: app/NavBarClient.tsx:169 — pattern guard-clause `{logoUrl && ...}`, Story 7.2]
- [Source: lib/giorno-settimana.ts — stile di riferimento per un helper puro con test dedicato]

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

### Completion Notes List

- Opzione (a) confermata in fase di sviluppo (nessuna nuova informazione emersa che giustificasse l'opzione (b)): riuso di `Palestra.indirizzo` esistente, nessuna migrazione.
- `.linkNaviga` implementato in due varianti visive distinte per contesto: pulsante pieno (`.bottone` + `.linkNaviga` di supporto per `display`/`text-decoration`) in `/palestre` dove esistono già pulsanti pieni nella stessa card; link testuale colorato (`{colors.primary}`) in `SlotTable.module.css`/`mio-orario.module.css` dove non esiste alcun pulsante pieno nella stessa vista e un pulsante pieno dentro una cella di tabella sarebbe stato visivamente sproporzionato.
- Nessuna modifica alle query Prisma di `slot/page.tsx`/`orari/page.tsx`/`mio-orario/page.tsx`: `include: { palestra: true }` restituiva già `indirizzo` a runtime, mancava solo nel tipo `SlotRiga` (ora allargato).
- AC #2 era già soddisfatto dal codice esistente (campo Indirizzo nel form Palestra, presente da Story 2.1) — nessuna riga di codice necessaria per quell'AC.
- **Estensione (2026-07-27)**: `costruisciLinkNaviga` è passata da `(indirizzo: string | null)` a `(posizione: { indirizzo?, latitudine?, longitudine? })` — breaking change interno, aggiornati tutti e tre i call site (`PalestraRow.tsx`, `SlotTable.tsx`, `mio-orario/page.tsx`) e i test.
- Link brevi (`maps.app.goo.gl`) risolti con un `fetch` reale (non mockato nei test unitari salvo il caso dedicato con `fetch` stub) — nessun costo, nessuna chiave API, solo una richiesta HTTP verso un dominio Google pubblico.
- Mappa incorporata solo in `/palestre` (non in `/slot`/`/orari`/`/mio-orario`, tabelle con potenzialmente molte righe) — decisione confermata con l'utente prima di implementare.
- Selettore mappa interattivo esplicitamente scartato (richiederebbe Google Maps JavaScript API con account di fatturazione, contro NFR6) — confermato con l'utente prima di implementare.
- **Code review**: trovata e corretta una violazione reale dell'AC #5 — il parser non verificava che l'URL incollato fosse effettivamente un dominio Google Maps, accettando coordinate da qualunque link con una stringa a forma di `lat,lng` (anche non-Maps). Corretto con un controllo di dominio esplicito, che chiude anche il percorso di rischio sui link brevi (il redirect risolto viene ri-validato con lo stesso controllo).

### File List

- `lib/link-naviga-palestra.ts` (modificato — estensione: firma a oggetto, nuova `costruisciLinkMappaIncorporata`)
- `lib/link-naviga-palestra.test.ts` (modificato)
- `lib/estrai-coordinate-maps.ts` (nuovo)
- `lib/estrai-coordinate-maps.test.ts` (nuovo)
- `prisma/schema.prisma` (modificato — model Palestra: `latitudine`/`longitudine`)
- `prisma/migrations/20260727010000_add_coordinate_palestra/migration.sql` (nuovo)
- `app/(orari-palestre)/palestre/actions.ts` (modificato)
- `app/(orari-palestre)/palestre/actions.test.ts` (modificato)
- `app/(orari-palestre)/palestre/NuovaPalestraForm.tsx` (modificato)
- `app/(orari-palestre)/palestre/PalestraRow.tsx` (modificato)
- `app/(orari-palestre)/palestre/palestre.module.css` (modificato)
- `app/(orari-palestre)/SlotTable.tsx` (modificato)
- `app/(orari-palestre)/SlotTable.module.css` (modificato)
- `app/(orari-palestre)/mio-orario/page.tsx` (modificato)
- `app/(orari-palestre)/mio-orario/mio-orario.module.css` (modificato)

## Change Log

- 2026-07-27: Implementata Story 9.6 — link "Naviga" su Google Maps per le Palestre in `/palestre`, `/slot`, `/orari`, `/mio-orario`, riusando l'`indirizzo` testuale esistente (nessuna migrazione). 507/507 test passati.
- 2026-07-27: Code review completata — 5 patch applicati (contrasto colore link corretto a `--color-button-bg`, margine superiore rimosso, `aria-label` aggiunto sui tre link, spazio letterale prima del link, CSS duplicato unificato), 3 item deferiti in `deferred-work.md`. 507/507 test passati, 0 errori tsc/eslint. Status: done.
- 2026-07-27: **Riaperta ed estesa** su feedback utente dal vivo — aggiunta la possibilità di incollare un link Google Maps (nuove colonne `Palestra.latitudine`/`longitudine`, parser puro `estrai-coordinate-maps.ts`, risoluzione link brevi) e una mappa incorporata in `/palestre`; corretto l'`aria-label` che menzionava il Campo. 528/528 test passati. Status: review.
- 2026-07-27: Code review completata — 7 patch applicati (controllo di dominio Google Maps mancante, la correzione più importante: chiudeva una violazione reale dell'AC #5 e un rischio sui link brevi; timeout sulla fetch; riconoscimento del formato `query=` generato dall'app stessa; link brevi senza schema; riuso dell'helper invece di URL costruiti a mano; deduplicazione di una condizione; `referrerPolicy` sull'iframe), 5 defer, 3 scartati come falsi positivi (verificati e confermati non reali). 534/534 test passati, 0 errori tsc/eslint. Status: done.
