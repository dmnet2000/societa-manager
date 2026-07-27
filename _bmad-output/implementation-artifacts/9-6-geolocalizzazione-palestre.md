---
baseline_commit: f900d530b0e43285357f43c66a188d81e7162498
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

### File List

- `lib/link-naviga-palestra.ts` (nuovo)
- `lib/link-naviga-palestra.test.ts` (nuovo)
- `app/(orari-palestre)/palestre/PalestraRow.tsx` (modificato)
- `app/(orari-palestre)/palestre/palestre.module.css` (modificato)
- `app/(orari-palestre)/SlotTable.tsx` (modificato)
- `app/(orari-palestre)/SlotTable.module.css` (modificato)
- `app/(orari-palestre)/mio-orario/page.tsx` (modificato)
- `app/(orari-palestre)/mio-orario/mio-orario.module.css` (modificato)

## Change Log

- 2026-07-27: Implementata Story 9.6 — link "Naviga" su Google Maps per le Palestre in `/palestre`, `/slot`, `/orari`, `/mio-orario`, riusando l'`indirizzo` testuale esistente (nessuna migrazione). 507/507 test passati.
- 2026-07-27: Code review completata — 5 patch applicati (contrasto colore link corretto a `--color-button-bg`, margine superiore rimosso, `aria-label` aggiunto sui tre link, spazio letterale prima del link, CSS duplicato unificato), 3 item deferiti in `deferred-work.md`. 507/507 test passati, 0 errori tsc/eslint. Status: done.
