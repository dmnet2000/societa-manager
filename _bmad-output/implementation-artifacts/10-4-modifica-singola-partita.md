---
baseline_commit: f40691ba7cb7d04c2544d969df33b52f3cda857d
---

# Story 10.4: Modifica di una singola partita

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore del Gruppo (o Admin/Dirigente),
I want modificare giorno, ora e luogo di una singola Partita,
so that posso correggere un rinvio o un cambio di programma comunicato dalla federazione (richiesta di spostamento gara), senza dover ricaricare l'intero file Excel del Campionato.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-08-02) come naturale prosecuzione in ordine dell'Epic 10 dopo la Story 10.6 (cancellazione). L'utente ha chiesto esplicitamente di "aggiungere anche la possibilità di modificare la partita in caso di richieste di spostamento gara" — **confermato con l'utente**: questo è esattamente lo scope già previsto per questa storia in `epics.md` (modifica di data/ora/impianto/indirizzo di una Partita esistente), nessuna funzionalità aggiuntiva richiesta (né un campo "motivo", né un flusso di richiesta/approvazione separato).

## Acceptance Criteria

1. **Given** una Partita esistente **When** l'Allenatore (del proprio Gruppo) o un Admin/Dirigente la modifica (data, ora, impianto, indirizzo impianto) **Then** le modifiche vengono salvate e la pagina `/partite` le mostra aggiornate
2. **Given** un Allenatore che non gestisce il Gruppo a cui appartiene la Partita **When** tenta di modificarla **Then** l'operazione viene rifiutata (`FORBIDDEN`, "Non gestisci questo Gruppo."), stessa regola di rifiuto già stabilita per creazione/import/cancellazione (`risolviAutorizzazioneGruppo`)
3. **And** nessuna modifica ai campi identitari della gara (`garaNumero`, `campionatoId`, `squadraCasa`, `squadraOspite`) — il form di modifica espone **solo** i campi `data`/`ora`/`impianto`/`indirizzoImpianto`, come esplicitamente richiesto
4. **Given** una Partita il cui Gruppo appartiene a una stagione non corrente **When** un Admin/Dirigente/Allenatore tenta di modificarla **Then** l'operazione viene rifiutata (`VALIDATION`, "Gruppo non trovato per la stagione corrente.") — **a differenza della Story 10.6** (cancellazione, dove questo blocco è stato rimosso per Admin/Dirigente su richiesta esplicita dell'utente), qui il blocco resta invariato per **tutti** i Ruoli, stesso comportamento di creazione/import (Story 10.1/10.2): modificare una partita di una stagione chiusa non è un caso d'uso di questa storia
5. **And** nessuna regressione sul comportamento esistente di `/partite` (Story 10.3, vista raggruppata per settimana) né sulla cancellazione (Story 10.6, `cancellaPartita`/`EliminaPartitaForm.tsx`) — suite Vitest invariata sui casi esistenti non impattati

## Tasks / Subtasks

- [x] Task 1: Server Action `aggiornaPartita` (AC: #1, #2, #3, #4)
  - [x] Aggiunta a `app/(partite-campionati)/partite/actions.ts` (accanto a `cancellaPartita`): `requireRuolo(["ADMIN","DIRIGENTE","ALLENATORE"])` → valida `partitaId` → `prisma.partita.findUnique` (risolve `gruppoId`) → `risolviAutorizzazioneGruppo(partita.gruppoId)` **SENZA** `{ permettiStagionePassata: true }` (vedi Dev Notes — non copiare l'opzione da `cancellaPartita`) → valida `data`/`ora` → `prisma.partita.update` sui soli 4 campi → `revalidatePath("/partite")`
  - [x] Validazione `data`: **riusare `lib/parse-data-iso.ts` (`FORMATO_DATA_ISO`/`parseDataIsoValida`)**, già esistente ed estratta apposta (Story 9.20 code review) per essere generica — non reinventare un regex/round-trip locale. Attenzione: `parseDataIsoValida` restituisce un `Date`, ma per `Partita.data` va comunque salvata la stringa `raw` originale (`YYYY-MM-DD`), non `data.toISOString().slice(0,10)` — usare il valore restituito solo per il controllo "è una data di calendario reale", scartare l'oggetto `Date` stesso (stesso principio già seguito da `confermaCertificato`, `app/(certificati-medici)/conferma-certificati/actions.ts` righe 58-68, che però lì salva il `Date` perché `dataFineValidita` è una colonna `DateTime`, non `String` come qui)
  - [x] Validazione `ora`: stessa regex `FORMATO_ORA` di `app/(orari-palestre)/slot/actions.ts` riga 17 (`^([01]\d|2[0-3]):[0-5]\d$`) — duplicata localmente in questo file (nessun helper condiviso esiste ancora tra i due moduli, non crearne uno per un singolo riuso)
  - [x] `impianto`/`indirizzoImpianto`: stesso pattern di `app/(orari-palestre)/palestre/actions.ts` righe 77/120 — `String(formData.get(...) ?? "").trim() || null` (campi nullable, stringa vuota → `null`, non stringa vuota salvata)
  - [x] Nuovi test in `app/(partite-campionati)/partite/actions.test.ts` (stesso file, nuovo `describe("aggiornaPartita")`): FORBIDDEN ruolo mancante, VALIDATION partitaId mancante/Partita inesistente, FORBIDDEN Allenatore non proprietario, VALIDATION Gruppo di stagione passata (Admin incluso — a differenza del test equivalente di `cancellaPartita`), VALIDATION formato data non valido, VALIDATION data di calendario inesistente, VALIDATION formato ora non valido, successo Allenatore proprietario, successo Admin/Dirigente, `impianto`/`indirizzoImpianto` vuoti salvati come `null`, INTERNAL su errore Prisma
- [x] Task 2: `PartitaRow.tsx` — Client Component con toggle Modifica/Annulla (AC: #1, #3)
  - [x] Nuovo `app/(partite-campionati)/partite/PartitaRow.tsx` — estrae il rendering della riga oggi inline in `page.tsx` righe 117-152 (nessun cambio alla markup di **visualizzazione**, deve restare pixel-identica) in un componente che riceve una singola `partita` (vedi Dev Notes per la forma esatta delle prop, **inclusa sia la data grezza `YYYY-MM-DD` sia quella già formattata** — non confonderle) e usa `useState<boolean>` locale (`inModifica`) per alternare tra riga di sola visualizzazione e riga di modifica
  - [x] Riga di visualizzazione (default): identica a oggi, con l'aggiunta di un bottone "Modifica" nella cella Azioni, accanto a `<EliminaPartitaForm>` già presente (Story 10.6) — include anche il calcolo del link "Naviga" (`costruisciLinkNaviga({ indirizzo: partita.indirizzoImpianto })`, oggi calcolato in `page.tsx` dentro il `.map`, riga 114-116) spostato dentro `PartitaRow` insieme al resto del markup di riga; `lib/link-naviga-palestra.ts` è una utility pura, nessun problema a chiamarla da un Client Component
  - [x] Riga di modifica (mostrata solo quando `inModifica === true`): un secondo `<tr>` con un singolo `<td colSpan={7}>` contenente il form — `useActionState(aggiornaPartita, undefined)`, campi `data` (`<input type="date">`, `defaultValue` = `partita.data` **grezza**, non quella formattata), `ora` (`<input type="time">`), `impianto`/`indirizzoImpianto` (`<input type="text">`, opzionali), più `squadraCasa`/`squadraOspite`/`gruppo.nome`/`campionato.nome` mostrati come testo di sola lettura (contesto per l'utente, NON campi di form — AC #3) — bottoni "Salva" e "Annulla" (quest'ultimo `type="button"`, `onClick` riporta `inModifica` a `false` senza inviare nulla)
  - [x] `useEffect` che osserva lo stato dell'azione: quando `modificaState?.success === true`, richiama `setInModifica(false)` per ricollassare automaticamente alla vista dopo un salvataggio riuscito (nessun precedente identico in questo progetto — comporre da `useActionState` + `useState` già stabiliti, non introdurre una libreria nuova)
  - [x] Nessun `window.confirm`: la modifica non è un'operazione distruttiva (a differenza di `cancellaPartita`/`cancellaSlot`), stesso principio già implicito nel non aver mai richiesto conferma per `aggiornaSlot`/`aggiornaAllenatore`
- [x] Task 3: Aggiornamento `page.tsx` (AC: #1)
  - [x] `app/(partite-campionati)/partite/page.tsx`: sostituire il blocco inline righe 117-152 (dentro `settimana.partite.map(...)`) con `<PartitaRow key={partita.id} partita={{ ...campi necessari, inclusa partita.data grezza }} />` — nessun altro cambio alla pagina (query, raggruppamento per settimana, filtro Ruolo/Gruppo tutti invariati)
- [x] Task 4: CSS (AC: #1)
  - [x] `app/(partite-campionati)/partite/partite.module.css`: nuove classi per il form di modifica — stesso registro di `app/(orari-palestre)/slot/slot.module.css` (`.form`, `.campiRiga`, `.campo` con `flex: 1 1 150px; min-width: 150px`, input/select stilizzati) duplicato localmente (nessun meccanismo `composes` in questa codebase, stesso principio già seguito da ogni altro CSS module del progetto) + un `.bottoneSecondario` per "Annulla" (stile neutro, non danger — a differenza di `.bottoneElimina` già presente)
- [x] Task 5: Verifica regressione (AC: #5)
  - [x] Suite Vitest completa: tutti i test passano, nessuna regressione sui test esistenti di Story 10.3 (`raggruppa-per-settimana`, route-guard) e Story 10.6 (`cancellaPartita`/`cancellaCampionato`) — 839/839 (era 826/826, +13 nuovi test `aggiornaPartita`)
  - [x] `npx tsc --noEmit` pulito; ESLint pulito sul modulo `(partite-campionati)` — un errore ESLint (`react-hooks/set-state-in-effect`) emerso durante l'implementazione del `useEffect` di collasso automatico proposto nei Dev Notes, risolto sostituendolo con il pattern "adjust state during render" raccomandato da React (confronto `modificaState`/`ultimoModificaState` durante il render invece di un `setState` sincrono dentro l'effect) — vedi Completion Notes
  - [x] Nessun test di rendering per `PartitaRow.tsx` (Client Component — convenzione già stabilita, coerente con `SlotRow.tsx`/`AllenatoreRow.tsx`, nessuno dei due ha un file di test dedicato)
  - [x] Confermato: nessuna modifica a `cancellaPartita`/`cancellaCampionato`/`risolviAutorizzazioneGruppo`/`raggruppaPerSettimana`/`EliminaPartitaForm.tsx`

## Dev Notes

- **Perimetro esatto**: `app/(partite-campionati)/partite/actions.ts` (+ test) esteso con `aggiornaPartita`; nuovo `app/(partite-campionati)/partite/PartitaRow.tsx`; `page.tsx` modificata solo per delegare il rendering della riga a `PartitaRow`; nuove classi CSS in `partite.module.css`. Nessuna migrazione, nessuna nuova entità — `Partita` esiste già (Story 10.2), tutti i campi toccati (`data`, `ora`, `impianto`, `indirizzoImpianto`) sono già nel modello (`prisma/schema.prisma` righe 413-441).
- **CRITICO — `risolviAutorizzazioneGruppo` senza `permettiStagionePassata`**: la Story 10.6 (appena chiusa) ha esteso `app/(partite-campionati)/autorizzazione.ts` con un'opzione `{ permettiStagionePassata?: boolean }` che permette ad Admin/Dirigente di **cancellare** Campionati/Partite di Gruppi di stagioni passate (decisione confermata dall'utente per il caso d'uso "pulizia dati"). Questa storia **non** deve passare quell'opzione — modificare una partita di una stagione chiusa non è nello scope richiesto, e il comportamento di default della funzione (blocco per tutti, AC #4) è già quello corretto qui, identico a `creaCampionato`/`importaGare`. Il dev agent che copia `cancellaPartita` come riferimento **deve rimuovere** il secondo argomento — errore facile da introdurre per copia-incolla distratta.
- **Formati `data`/`ora` — non confondere grezzo vs formattato**: `Partita.data` è una stringa `"YYYY-MM-DD"` (vedi `lib/importa-gare/parser.ts` riga 148, commento esplicito "mai salvare un oggetto Date"), esattamente il formato richiesto da `defaultValue`/`value` di un `<input type="date">` — **nessuna conversione necessaria per il form**. `page.tsx` oggi (riga 21-23, `formattaData`) converte questa stringa in una data localizzata `it-IT` (es. "02/08/2026") **solo per la visualizzazione** — quella stringa formattata **non** è utilizzabile come `defaultValue` dell'input di modifica (un input `type="date"` richiede rigorosamente `YYYY-MM-DD`, un valore diverso viene silenziosamente ignorato dal browser, mostrando il campo vuoto). `PartitaRow` deve quindi ricevere **entrambe** le rappresentazioni: la stringa grezza (per l'edit) e quella già formattata (per la visualizzazione) — non derivarle l'una dall'altra nel componente.
- **`ora` non è validata al momento dell'import** (Story 10.3, Review Finding già documentato in `10-3-vista-partite-settimana-per-settimana.md`): il parser Excel (`lib/importa-gare/parser.ts` riga 125-126, `testoCella`) accetta qualunque testo non vuoto, quindi righe importate potrebbero avere un formato non zero-paddato (es. "9:00"). Questa storia introduce la **prima** validazione reale sul formato (`FORMATO_ORA`, stessa regex di `slot/actions.ts`) — solo per i salvataggi futuri via questo form; le righe già in DB con un formato non standard restano finché non vengono modificate, non è una regressione introdotta qui.
- **Nessun `timeZone: "UTC"` da aggiungere qui**: a differenza di `raggruppaPerSettimana`/`formattaData` (Story 10.3, che costruiscono un oggetto `Date` per raggruppare/formattare), `aggiornaPartita` **non** deve mai costruire/derivare la stringa da salvare da un `Date` — la stringa `"YYYY-MM-DD"` ricevuta dal form (il parametro `raw` passato a `parseDataIsoValida`) va salvata così com'è dopo la sola validazione, scartando il `Date` restituito dalla funzione (usato solo per confermare che sia una data di calendario reale) — evita di reintrodurre lo stesso rischio di sfasamento di fuso orario già risolto in Story 10.3.
- **Campi identitari esclusi dal form (AC #3)**: `garaNumero` fa parte della chiave `@@unique([gruppoId, campionatoId, garaNumero])` (`prisma/schema.prisma` riga 439) — modificarlo qui aprirebbe a conflitti di unicità e a un disallineamento con un futuro re-import Excel (Story 10.2, `importaGare` fa upsert su quella stessa chiave). `squadraCasa`/`squadraOspite`/`campionatoId` sono testo/riferimento importati dalla federazione, fuori scope per esplicita richiesta utente sia in questa storia sia nell'AC originale di `epics.md`.
- **Perché un Client Component per riga e non un form unico**: ogni Partita ha bisogno del proprio stato locale indipendente (`inModifica`, `useActionState`) — stesso motivo per cui Story 9.9/9.13 hanno introdotto `AllenatoreRow.tsx`/`SlotRow.tsx` invece di un unico form globale sopra una tabella statica.
- **Perché non una pagina di modifica dedicata (`/partite/[id]/modifica`)**: questo progetto non ha **nessuna** rotta dinamica Next.js (`[id]`) in tutto il codebase — introdurne una per questa storia sarebbe un nuovo pattern architetturale non necessario, quando il pattern "riga con toggle Modifica/Annulla" (Slot, Allenatore) è già stabilito, testato due volte, e sufficiente. Non introdurre una rotta dinamica.
- **File NON da toccare**: `app/(partite-campionati)/autorizzazione.ts` (riusata invariata, nessun nuovo parametro necessario), `app/(partite-campionati)/campionati/*` (Story 10.1/10.2/10.6/10.7, nessuna di quelle Server Action cambia), `lib/raggruppa-per-settimana.ts` (il raggruppamento per settimana non cambia — solo il rendering della singola riga viene estratto), `EliminaPartitaForm.tsx` (resta accanto al nuovo bottone "Modifica" nella stessa cella Azioni, invariato).

### Project Structure Notes

- File nuovi: `app/(partite-campionati)/partite/PartitaRow.tsx`.
- File modificati: `app/(partite-campionati)/partite/actions.ts` (+ `aggiornaPartita`), `app/(partite-campionati)/partite/actions.test.ts` (+ test), `app/(partite-campionati)/partite/page.tsx` (rendering riga delegato a `PartitaRow`), `app/(partite-campionati)/partite/partite.module.css` (+ classi form di modifica).
- Nessun file eliminato, nessuna migrazione.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 10.4: Modifica di una singola partita]
- [Source: app/(partite-campionati)/autorizzazione.ts — risolviAutorizzazioneGruppo, opzione permettiStagionePassata introdotta in Story 10.6 ma da NON usare qui]
- [Source: app/(partite-campionati)/partite/actions.ts — cancellaPartita, pattern Server Action/autorizzazione da replicare per aggiornaPartita]
- [Source: app/(orari-palestre)/slot/SlotRow.tsx — pattern esatto di riga con form di modifica inline + FORMATO_ORA da riusare]
- [Source: app/(orari-palestre)/slot/actions.ts — validaCampiSlot/aggiornaSlot, pattern di validazione e update da replicare]
- [Source: app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx — secondo precedente dello stesso pattern riga-con-form-inline]
- [Source: app/(orari-palestre)/palestre/actions.ts righe 77/120 — pattern trim() || null per campi nullable]
- [Source: lib/parse-data-iso.ts — FORMATO_DATA_ISO/parseDataIsoValida, validazione round-trip di una data ISO già pronta e generica, da riusare invariata (non reinventare)]
- [Source: lib/importa-gare/parser.ts riga 148 — Partita.data salvata come stringa "YYYY-MM-DD", mai un oggetto Date]
- [Source: app/(partite-campionati)/partite/page.tsx righe 21-23, 117-152 — formattaData (solo visualizzazione) e blocco riga da estrarre in PartitaRow]
- [Source: prisma/schema.prisma righe 413-441 — model Partita, vincolo @@unique([gruppoId, campionatoId, garaNumero])]
- [Source: _bmad-output/implementation-artifacts/10-6-cancellazione-partita-o-campionato.md — Senior Developer Review (AI), origine dell'opzione permettiStagionePassata e motivazione per cui non si applica qui]
- [Source: _bmad-output/implementation-artifacts/10-3-vista-partite-settimana-per-settimana.md — Review Findings, origine del problema "ora non validata all'import" e della lezione timeZone: "UTC"]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

### Completion Notes List

- `aggiornaPartita` aggiunta a `actions.ts`, autorizzazione a due livelli invariata (`risolviAutorizzazioneGruppo` **senza** `permettiStagionePassata`, a differenza di `cancellaPartita`) — blocco su Gruppi di stagioni passate confermato invariato per tutti i Ruoli (AC #4), test dedicato per Admin incluso.
- Validazione `data` con `parseDataIsoValida` (riuso invariato, nessuna reinvenzione), `ora` con `FORMATO_ORA` duplicata localmente (stesso principio già seguito per `slot/actions.ts`, nessun helper condiviso creato per un singolo riuso). `impianto`/`indirizzoImpianto` con pattern `trim() || null`.
- 13 nuovi test in `actions.test.ts` (`describe("aggiornaPartita")`); il `beforeEach` condiviso con `cancellaPartita` è stato spostato a livello di modulo (era annidato solo dentro `describe("cancellaPartita")`) per essere riusato da entrambi i describe, stesso pattern già in uso in `app/(gruppi-allenatori)/gruppi/actions.test.ts`.
- `PartitaRow.tsx` (nuovo Client Component) estrae la riga oggi inline in `page.tsx`, markup di visualizzazione invariato — riceve sia `partita.data` grezza (per `defaultValue` dell'`<input type="date">`) sia `dataFormattata` (per la visualizzazione), come previsto dai Dev Notes. Bottone "Modifica" aggiunto nella cella Azioni accanto a `<EliminaPartitaForm>` (invariato).
- Deviazione dai Dev Notes: il `useEffect` con `setInModifica(false)` sincrono proposto per ricollassare la riga dopo un salvataggio riuscito viola la regola ESLint `react-hooks/set-state-in-effect` (cascading renders) — non presente nei precedenti citati (`SlotRow`/`AllenatoreRow`) perché lì l'effect chiama solo `formRef.current?.reset()` (DOM imperativo, non uno state setter React). Risolto con il pattern "adjust state during render" raccomandato da React: confronto `modificaState !== ultimoModificaState` fatto direttamente nel corpo della funzione di rendering, non in un effect.
- `page.tsx` aggiornata solo per delegare il rendering della riga a `PartitaRow` (query/raggruppamento/filtro Ruolo invariati). Nuove classi CSS (`.form`/`.campiRiga`/`.campo`/`.bottone`/`.bottoneSecondario`) aggiunte a `partite.module.css`, stesso registro di `slot.module.css`.
- Verifica finale: 839/839 test Vitest passati (era 826/826 prima di questa storia), `tsc --noEmit` pulito, ESLint pulito sul modulo `(partite-campionati)`.

### File List

- `app/(partite-campionati)/partite/actions.ts` (modificato — nuova `aggiornaPartita`)
- `app/(partite-campionati)/partite/actions.test.ts` (modificato — nuovo `describe("aggiornaPartita")`, `beforeEach` promosso a livello di modulo)
- `app/(partite-campionati)/partite/PartitaRow.tsx` (nuovo)
- `app/(partite-campionati)/partite/page.tsx` (modificato — rendering riga delegato a `PartitaRow`)
- `app/(partite-campionati)/partite/partite.module.css` (modificato — nuove classi form di modifica)
- `app/(partite-campionati)/partite/EliminaPartitaForm.tsx` (modificato in code review — reso controllato, `useActionState` sollevato in `PartitaRow`)

### Review Findings

- [x] [Review][Patch] "Modifica"/"Cancella" non mutuamente esclusi sulla stessa riga (race concorrente) [app/(partite-campionati)/partite/PartitaRow.tsx] — risolto: `cancellaPartita` sollevato in `PartitaRow` (stesso principio di `SlotRow.tsx`, `azionePending = modificaPending || cancellaPending`), `EliminaPartitaForm` reso controllato (`action`/`state`/`disabled` come prop), Modifica/Cancella/Salva/Annulla tutti disabilitati durante `azionePending || inModifica`
- [x] [Review][Patch] `aggiornaPartita` non gestisce P2025 (Partita cancellata concorrentemente), a differenza di `cancellaPartita` nello stesso file [app/(partite-campionati)/partite/actions.ts] — risolto: branch P2025 aggiunto, restituisce lo stesso messaggio "Partita non trovata." gia' usato sopra, nuovo test dedicato
- [x] [Review][Patch] `formRef` inutilizzato in `PartitaRow.tsx` (assegnato al form ma `.current` mai letto) [app/(partite-campionati)/partite/PartitaRow.tsx] — risolto: rimosso (era gia' superfluo, rimosso anche come parte del sollevamento di `cancellaPartita`)
- [x] [Review][Defer] `findUnique`/`risolviAutorizzazioneGruppo` non avvolti in try/catch in `aggiornaPartita` [app/(partite-campionati)/partite/actions.ts] — deferred, pre-existing (stesso gap identico in `cancellaPartita`, stesso file, non introdotto da questa diff)
- [x] [Review][Defer] Nessuna concorrenza ottimistica (`updatedAt` non verificato, last-write-wins silenzioso) [app/(partite-campionati)/partite/actions.ts] — deferred, pre-existing (pattern sistemico assente in tutte le Server Action di modifica del progetto, nessun precedente di optimistic locking)
- [x] [Review][Defer] `impianto`/`indirizzoImpianto` senza limite di lunghezza lato server [app/(partite-campionati)/partite/actions.ts] — deferred, pre-existing (coerente con la convenzione gia' in uso su ogni altro campo testo libero del progetto, nessun precedente di `maxLength`)
- [x] [Review][Defer] Doppio round-trip per risolvere il Gruppo (`partita.findUnique` + `risolviAutorizzazioneGruppo` che rifà il proprio `gruppo.findUnique`) [app/(partite-campionati)/partite/actions.ts] — deferred, pre-existing (rispecchia lo stesso pattern gia' presente in `cancellaPartita`)

**Dismessi come rumore/fuori scope (4):** nessuna validazione che la nuova `data` ricada nella finestra del Campionato (speculativo, non richiesto da nessun AC); modificare `data` sposta silenziosamente la riga in un'altra sezione-settimana (comportamento corretto per come `raggruppaPerSettimana` è definito, nessun pattern di notifica/toast esiste altrove nel progetto); `colSpan={7}` come numero magico (cosmetico, nessun pattern di colSpan dinamico altrove nel progetto); spaziatura tra i bottoni "Modifica"/"Cancella" affidata a un solo `{" "}` invece di un contenitore flex (cosmetico, coerente con lo stile delle altre celle-azioni del progetto).

## Change Log

- 2026-08-03: Implementata `aggiornaPartita` (Server Action) + `PartitaRow.tsx` (toggle Modifica/Annulla) + CSS form di modifica. 839/839 test passati, 0 errori tsc/eslint. Status: review.
- 2026-08-03: Code review completata (Blind Hunter + Edge Case Hunter + Acceptance Auditor) - Acceptance Auditor: 0 violazioni sugli AC. 3 patch applicati (race Modifica/Cancella non mutuamente esclusi risolta sollevando `cancellaPartita` in `PartitaRow` con `azionePending` condiviso, stesso principio di `SlotRow.tsx`; `aggiornaPartita` ora gestisce P2025 come `cancellaPartita`; `formRef` morto rimosso). 4 defer (try/catch mancante su `findUnique`/`risolviAutorizzazioneGruppo` - preesistente in `cancellaPartita`; nessuna concorrenza ottimistica - sistemico; `impianto`/`indirizzoImpianto` senza limite di lunghezza - convenzione preesistente; doppio round-trip Gruppo - preesistente). 4 scartati come fuori scope/cosmetici. 840/840 test passati (1 nuovo), 0 errori tsc/eslint dopo i fix. Status: done.
