---
baseline_commit: d47355b2f44a5f8183fe282e47da67fcd207ac9e
---

# Story 9.16: Parametri standard per i dati fisici delle Atlete

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore o Atleta,
I want poter inserire rapidamente le misurazioni fisiche più comuni (peso, altezza, reach a una mano, reach a due mani, salto con rincorsa, salto a muro) senza dover scrivere ogni volta tipo/unità di misura a mano,
so that l'inserimento sia più veloce e i dati restino confrontabili nel tempo (stesso "tipo" testuale usato in ogni misurazione).

**Note aggiuntive:** oggi (`/dati-fisici`, Story 6.1/6.2) `MisurazioneAtleta` è già un modello generico (`tipo: String` libero, `valore: Float`, `unitaMisura: String`, `data: String`) — **nessuna migrazione necessaria**. Il form richiede oggi di scrivere tipo/unità a mano ogni volta (`MisurazioneForm.tsx`). Parametri richiesti dall'utente: peso, altezza, reach a una mano, reach a due mani, salto con rincorsa (tre misurazioni), salto a muro (tre misurazioni) — mantenendo la possibilità di inserire un tipo libero ("Altro") come oggi.

**Decisione presa con l'utente in fase di creazione storia**: "salto con rincorsa"/"salto a muro" richiedono tre tentativi. Un solo invio del form salva **3 righe `MisurazioneAtleta` distinte** (stesso `tipo`/`data`, tre `valore` diversi) — tutte e tre restano visibili nella tabella storico esistente, invariata. Nel **grafico** di andamento (`GraficoMisurazione.tsx`, Story 6.2), per ogni data con più tentativi si mostra **solo il valore migliore** (il più alto) — non tre punti sovrapposti sulla stessa data, non la media.

## Acceptance Criteria

1. **Given** un Allenatore o un'Atleta sulla pagina `/dati-fisici` **When** apre il form di inserimento **Then** può scegliere un parametro standard (Peso, Altezza, Reach a una mano, Reach a due mani, Salto con rincorsa, Salto a muro) da un selettore, con l'unità di misura già precompilata — invece di scrivere tipo/unità a mano
2. **Given** lo stesso form **When** seleziona "Altro" (o non seleziona un parametro standard) **Then** può ancora inserire un tipo libero con la propria unità di misura, esattamente come oggi (nessuna regressione)
3. **Given** il form con "Salto con rincorsa" o "Salto a muro" selezionato **When** compila i tre campi tentativo e invia una sola volta **Then** vengono create 3 righe `MisurazioneAtleta` distinte (stesso tipo/data, tre valori), tutte visibili nella tabella storico
4. **Given** più misurazioni dello stesso tipo con la stessa data (es. le 3 righe del punto #3) **When** visualizzato il grafico di andamento per quel tipo **Then** viene mostrato un solo punto per quella data, con il valore più alto tra quelli registrati
5. **And** la data resta un campo obbligatorio per ogni misurazione, come oggi
6. **And** nessuna regressione sul comportamento esistente di inserimento/visualizzazione misurazioni a parametro singolo (Story 6.1/6.2) — suite Vitest invariata sui casi esistenti

## Tasks / Subtasks

- [x] Task 1: Catalogo dei parametri standard (AC: #1, #3)
  - [x] Nuovo file `lib/misurazioni/parametri-standard.ts`: costante `PARAMETRI_STANDARD` (array di `{ tipo: string; unitaMisura: string; tentativi: 1 | 3 }`), 6 voci esatte: `{ tipo: "Peso", unitaMisura: "kg", tentativi: 1 }`, `{ tipo: "Altezza", unitaMisura: "cm", tentativi: 1 }`, `{ tipo: "Reach a una mano", unitaMisura: "cm", tentativi: 1 }`, `{ tipo: "Reach a due mani", unitaMisura: "cm", tentativi: 1 }`, `{ tipo: "Salto con rincorsa", unitaMisura: "cm", tentativi: 3 }`, `{ tipo: "Salto a muro", unitaMisura: "cm", tentativi: 3 }`. Esporta anche il tipo `ParametroStandard`.
  - [x] Ri-esportato da `lib/misurazioni/index.ts` (stesso pattern già usato per `raggruppaPerTipo`/`calcolaCoordinateGrafico`).
  - [x] Nessun test necessario per un dato statico (stessa scelta implicita già fatta per altre costanti del progetto, es. `RUOLI_VALIDI` in `lib/ruoli.ts`) — la logica che *usa* il catalogo (Task 2/3) va invece testata.
- [x] Task 2: Estendere `MisurazioneForm.tsx` con il selettore di parametro (AC: #1, #2, #3)
  - [x] `<select>` "Parametro" con le 6 voci di `PARAMETRI_STANDARD` + opzione `"Altro"` (valore vuoto/sentinella, `useState` locale), selezionata di default per preservare il comportamento odierno (AC #2).
  - [x] Parametro standard con `tentativi: 1`: campo `tipo`/`unitaMisura` **read-only precompilati** (`readOnly`, non `disabled` — cosi' il valore resta incluso in `FormData`), resta un solo campo `valore` (invariato).
  - [x] Parametro standard con `tentativi: 3` (Salto con rincorsa/Salto a muro): sostituito il campo `valore` con **tre campi** "Tentativo 1/2/3", tutti `name="valore"` (`FormData.getAll("valore")` li raccoglie in ordine).
  - [x] "Altro": comportamento identico a oggi — campi `tipo`/`unitaMisura`/`valore` liberi ed editabili (nessuna regressione, AC #2).
  - [x] Nuova classe `.campiTentativo` in `dati-fisici.module.css` (stesso principio di `.campiRiga`, Story 9.13) per disporre i tre campi tentativo in riga.
- [x] Task 3: Estendere `inserisciMisurazioneAction`/`inserisciMisurazione` per N valori (AC: #3, #5, #6)
  - [x] `app/(dati-atleta)/dati-fisici/actions.ts`: `formData.getAll("valore")` invece di `formData.get("valore")` — restituisce sempre un array (lunghezza 1 nel caso a parametro singolo/"Altro", invariato; lunghezza 3 per Salto con rincorsa/Salto a muro). Ogni elemento validato individualmente con la stessa logica già esistente (virgola→punto, `Number.isFinite`, non vuoto) — se **anche un solo** valore non è valido, l'intera azione fallisce con lo stesso messaggio di errore già esistente (`"Il valore è obbligatorio e deve essere numerico."`), **nessuna riga scritta** (fail-fast, non un inserimento parziale).
  - [x] `lib/db-rls/misurazione-atleta.ts`: `inserisciMisurazione` accetta `valori: number[]` invece di `valore: number` in `DatiMisurazione` — un `insert` con un array di righe (stesso `tipo`/`data`/`unitaMisura`, un `id` generato per riga) invece di una singola riga, in una sola chiamata Supabase.
  - [x] Nessun cambiamento a `leggiMisurazioniPerAtleta` (sola lettura, invariata) né alla tabella storico esistente in `page.tsx` (mostra già ogni riga individualmente, il rendering di 3 righe con stessa data/tipo funziona senza modifiche).
- [x] Task 4: Riduzione "migliore per data" nel grafico (AC: #4)
  - [x] Nuovo file `lib/misurazioni/riduci-migliore-per-data.ts`: funzione pura `riduciMiglioreProData(punti: Misurazione[]): Misurazione[]` — raggruppa per `data` (stringa, uguaglianza diretta, stesso formato `YYYY-MM-DD` già garantito da `FORMATO_DATA` in `actions.ts`), per ogni gruppo tiene la riga con `valore` più alto (a parità, la prima incontrata), preserva l'ordine cronologico già garantito da `leggiMisurazioniPerAtleta` (Story 6.1). Con un solo punto per data (caso di oggi: Peso/Altezza/Reach/"Altro") la funzione è un no-op — nessuna regressione. 6 test.
  - [x] Ri-esportato da `lib/misurazioni/index.ts`.
  - [x] `app/(dati-atleta)/dati-fisici/page.tsx`: `riduciMiglioreProData` applicata a `gruppo.punti` **solo** prima di passarli a `<GraficoMisurazione>` — la tabella storico sotto (AC #3, mostra tutte e 3 le righe) resta sui dati non ridotti (`misurazioni`), invariata.
- [x] Task 5: Test (AC: #1-#6)
  - [x] `lib/misurazioni/riduci-migliore-per-data.test.ts`: 6 test (array vuoto, no-op a 1 punto/data, solo il massimo con piu' punti/data, date diverse mai fuse, ordine cronologico preservato, parita' tiene il primo).
  - [x] `app/(dati-atleta)/dati-fisici/actions.test.ts` (**nuovo file**): 10 test — validazioni esistenti invariate (atletaId/tipo/valore/unitaMisura/data mancanti o non validi, virgola decimale), successo a valore singolo, successo a 3 valori, fail-fast su un valore invalido su 3 (nessuna scrittura), errore INTERNAL sull'insert.
  - [x] `lib/db-rls/misurazione-atleta.test.ts` (**nuovo file**, non esisteva): 3 test — insert singolo (invariato), insert multi-riga con id distinti, propagazione errore.
  - [x] Nessun test di rendering per `MisurazioneForm.tsx`, coerente con la convenzione già stabilita nel progetto.
  - [x] Suite Vitest completa: 736/736 test passati (66 file), `npx tsc --noEmit` ed ESLint puliti su tutti i file nuovi/modificati.

### Review Findings

- [x] [Review][Dismiss] Nessun grafico al primo inserimento di un parametro a 3 tentativi — `raggruppaPerTipo` include il gruppo perché ha 3 righe grezze (tutte con la stessa data), ma dopo `riduciMiglioreProData` resta 1 solo punto (1 sola data distinta) e il guard esistente di `GraficoMisurazione.tsx` (`punti.length < 2`) lo scarta silenziosamente. **Deciso con l'utente**: comportamento accettato così com'è — nessun grafico finché non esistono almeno 2 date distinte, coerente con quanto già avviene oggi per ogni altro parametro a misurazione singola; la tabella storico mostra comunque subito le 3 righe.
- [x] [Review][Patch] Nessuna validazione server-side sul numero di valori inviati rispetto a `PARAMETRI_STANDARD[tipo].tentativi` — un campo "valore" del tutto assente dal submit fa sì che `formData.getAll("valore")` restituisca `[]`, il ciclo di validazione non itera mai (bypassa il controllo "obbligatorio") e viene salvato un insert vuoto con esito `{ success: true }` — **fix**: nuovo controllo `valoriGrezzi.length !== tentativiAttesi` (da `PARAMETRI_STANDARD`, default 1) prima del ciclo di validazione. 2 nuovi test (campo assente, conteggio non corrispondente). [app/(dati-atleta)/dati-fisici/actions.ts]
- [x] [Review][Patch] Cambiando parametro nel selettore, il campo "Valore" (o i tre "Tentativo N") non si azzera — **fix**: aggiunta `key` legata a `parametroSelezionato` (e all'indice per i 3 campi tentativo), stesso pattern già usato per `tipo`/`unitaMisura`. [app/(dati-atleta)/dati-fisici/MisurazioneForm.tsx]
- [x] [Review][Patch] `riduciMiglioreProData` applicata incondizionatamente a ogni tipo di misurazione, non solo ai due parametri a 3 tentativi — **fix**: applicata solo quando `PARAMETRI_STANDARD.find(p => p.tipo === gruppo.tipo)?.tentativi === 3`, altrimenti passati i punti non ridotti (comportamento pre-storia invariato per Peso/Altezza/Reach/"Altro"). [app/(dati-atleta)/dati-fisici/page.tsx]
- [x] [Review][Patch] Commento impreciso: "un insert multi-riga... una singola chiamata atomica" in `lib/db-rls/misurazione-atleta.ts` sovrastima la garanzia reale di un `insert` multi-riga via PostgREST — **fix**: commento corretto (un solo round-trip HTTP, non una garanzia transazionale), nessun cambio di comportamento. [lib/db-rls/misurazione-atleta.ts]
- [x] [Review][Defer] `PARAMETRI_STANDARD` confronta `tipo` per uguaglianza esatta nel form, mentre `raggruppaPerTipo` normalizza (trim/lowercase) per il raggruppamento — un tipo "Altro" digitato con maiuscole/spazi diversi da uno standard (es. " Peso") si raggruppa con quello standard nel grafico/tabella ma non verrebbe mai riconosciuto come parametro standard dal selettore — deferred, impatto pratico nullo (nessun flusso di modifica/ripresentazione esiste in questa storia) [lib/misurazioni/parametri-standard.ts]
- [x] [Review][Defer] Nessun annuncio per screen reader quando i campi tipo/unità diventano read-only dopo la scelta di un parametro standard — deferred, nessun'altra pagina di questo progetto usa `aria-live` per scenari di campo condizionalmente bloccato, stesso livello di accessibilità di base già esistente
- [x] [Review][Defer] L'errore di validazione sui 3 tentativi è un unico messaggio generico, non indica quale dei tre campi è invalido — deferred, coerente con la convenzione già stabilita in tutto il progetto (un solo messaggio di errore per form, mai annotazioni per singolo campo)

## Dev Notes

- **Perché nessuna migrazione**: `MisurazioneAtleta.tipo`/`unitaMisura` sono già `String` libere (Story 6.1) — un "parametro standard" è solo un valore precompilato per questi due campi lato form, non un nuovo vincolo/tabella. Il catalogo (Task 1) vive in `lib/`, non nel DB.
- **Perché `FormData.getAll("valore")` e non tre nomi di campo distinti** (`valore1`/`valore2`/`valore3`): HTML supporta nativamente più `<input>` con lo stesso `name` dentro un `<form>` — `FormData` li raccoglie in ordine di apparizione. Questo mantiene un'unica Server Action con un'unica firma per entrambi i casi (1 o 3 valori), invece di rami paralleli con nomi di campo diversi da tenere sincronizzati.
- **Perché "il migliore" è il valore più alto, non il più basso**: entrambi i parametri a 3 tentativi (salto con rincorsa, salto a muro) sono test di elevazione — più alto è sempre meglio. Questa non è una regola generale per ogni "tipo" futuro (un ipotetico test a tempo avrebbe "meglio" = più basso), ma è l'unico caso concreto richiesto da questa storia; non generalizzare oltre i due parametri esistenti.
- **Perché la riduzione "migliore per data" tocca solo il grafico, non la tabella**: l'utente vuole vedere tutti e 3 i tentativi nello storico (trasparenza sui dati grezzi), ma un grafico con 3 punti sovrapposti sulla stessa ascissa (data) sarebbe illeggibile — stessa logica già usata da `raggruppaPerTipo` (Story 6.2), che already filtra/trasforma i dati SOLO per la vista a grafico, mai per la tabella.
- **Fail-fast su N valori**: se in "Salto con rincorsa" un solo tentativo è vuoto o non numerico, l'intera azione fallisce (nessuna riga scritta) — coerente con l'invariante "un invio, o tutte le righe o nessuna" già implicita nel comportamento a valore singolo esistente (oggi un valore non valido non scrive nulla).
- **File NON da toccare**: `lib/db-rls/misurazione-atleta.ts` → `leggiMisurazioniPerAtleta` (sola lettura, invariata), `lib/misurazioni/raggruppa-per-tipo.ts` (raggruppamento per tipo invariato — la riduzione "migliore per data" è un passo *successivo* e separato, Task 4), `GraficoMisurazione.tsx` (riceve già `punti: Misurazione[]`, non serve modificarlo se Task 4 riduce l'array PRIMA di passarlo come prop).

### Project Structure Notes

- File nuovi: `lib/misurazioni/parametri-standard.ts`, `lib/misurazioni/riduci-migliore-per-data.ts`, `lib/misurazioni/riduci-migliore-per-data.test.ts`, `app/(dati-atleta)/dati-fisici/actions.test.ts`.
- File modificati: `lib/misurazioni/index.ts` (nuovi re-export), `app/(dati-atleta)/dati-fisici/MisurazioneForm.tsx` (selettore parametro + campi condizionali, diventa Client Component con stato — verificare se già lo è: ha già `"use client"` per `useActionState`, quindi `useState` si aggiunge senza cambiare la direttiva), `app/(dati-atleta)/dati-fisici/actions.ts` (`getAll` invece di `get`, validazione per N valori), `lib/db-rls/misurazione-atleta.ts` (`inserisciMisurazione` per N valori), `app/(dati-atleta)/dati-fisici/page.tsx` (applica `riduciMiglioreProData` solo ai `punti` passati al grafico), `app/(dati-atleta)/dati-fisici/dati-fisici.module.css` (eventuale nuova classe per il layout a 3 campi tentativo).
- Riuso invariato: `raggruppaPerTipo`, `calcolaCoordinateGrafico`, `GraficoMisurazione.tsx`, `leggiMisurazioniPerAtleta`.
- Nuovo modulo? No — resta dentro `(dati-atleta)` e `lib/misurazioni`/`lib/db-rls`, che possiedono già `MisurazioneAtleta`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.16 — Acceptance Criteria]
- [Source: app/(dati-atleta)/dati-fisici/MisurazioneForm.tsx — form da estendere con il selettore di parametro]
- [Source: app/(dati-atleta)/dati-fisici/actions.ts — inserisciMisurazioneAction, validazione da estendere a N valori (getAll)]
- [Source: lib/db-rls/misurazione-atleta.ts — inserisciMisurazione/leggiMisurazioniPerAtleta, Story 6.1]
- [Source: lib/misurazioni/raggruppa-per-tipo.ts — pattern di funzione pura testata da riusare per riduci-migliore-per-data.ts (Story 6.2)]
- [Source: app/(dati-atleta)/dati-fisici/GraficoMisurazione.tsx — riceve punti gia' pronti, nessuna modifica prevista se la riduzione avviene prima in page.tsx]
- [Source: app/(dati-atleta)/dati-fisici/page.tsx — SezioneMisurazioni, punto di integrazione tra raggruppaPerTipo e GraficoMisurazione]
- [Source: app/(orari-palestre)/slot/SlotRow.tsx / Story 9.13 — precedente di `.campiRiga` per un problema di leggibilità di più campi in un form, stesso principio riusabile per `.campiTentativo`]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno (ciclo TDD lineare — ogni test scritto per primo è fallito per il motivo atteso: modulo mancante per `riduciMiglioreProData`, firma non aggiornata per `inserisciMisurazione`/`inserisciMisurazioneAction`).

### Completion Notes List

- Catalogo `PARAMETRI_STANDARD` (6 voci) in `lib/misurazioni/parametri-standard.ts`, ri-esportato da `lib/misurazioni/index.ts`. Nessuna migrazione (`MisurazioneAtleta.tipo`/`unitaMisura` già `String` libere, Story 6.1).
- `MisurazioneForm.tsx`: nuovo `<select>` "Parametro" (`useState` locale) — parametro standard a 1 tentativo precompila `tipo`/`unitaMisura` come `readOnly` (non `disabled`, per restare in `FormData`); parametro a 3 tentativi (Salto con rincorsa/Salto a muro) mostra 3 campi `name="valore"`; "Altro" invariato rispetto a prima.
- `actions.ts`: `formData.getAll("valore")` invece di `get` — un solo valore non valido su N fa fallire l'intera azione (fail-fast, nessuna riga scritta). `lib/db-rls/misurazione-atleta.ts`: `inserisciMisurazione` ora accetta `valori: number[]`, un `insert` multi-riga in una sola chiamata Supabase.
- `riduci-migliore-per-data.ts`: nuova funzione pura, applicata **solo** ai punti passati a `<GraficoMisurazione>` in `page.tsx` — la tabella storico resta sui dati non ridotti, invariata.
- Colmata una lacuna pre-esistente (Story 6.1): non esisteva alcun test per `inserisciMisurazioneAction`/`inserisciMisurazione` prima di questa storia — creati `actions.test.ts` (10 test) e `misurazione-atleta.test.ts` (3 test) da zero.
- Nessun test di rendering per `MisurazioneForm.tsx`, coerente con la convenzione del progetto.
- Suite completa: 736/736 test (66 file), `tsc --noEmit` pulito, ESLint pulito su tutti i file di questa storia.

### File List

**Nuovi:**

- `lib/misurazioni/parametri-standard.ts`
- `lib/misurazioni/riduci-migliore-per-data.ts`
- `lib/misurazioni/riduci-migliore-per-data.test.ts`
- `app/(dati-atleta)/dati-fisici/actions.test.ts`
- `lib/db-rls/misurazione-atleta.test.ts`

**Modificati:**

- `lib/misurazioni/index.ts`
- `app/(dati-atleta)/dati-fisici/page.tsx`
- `app/(dati-atleta)/dati-fisici/MisurazioneForm.tsx`
- `app/(dati-atleta)/dati-fisici/actions.ts`
- `lib/db-rls/misurazione-atleta.ts`
- `app/(dati-atleta)/dati-fisici/dati-fisici.module.css`

## Change Log

- 2026-07-31: Implementata Story 9.16 — parametri standard per i dati fisici delle Atlete. Nuovo catalogo `PARAMETRI_STANDARD` (6 voci), form esteso con selettore + campi condizionali (3 tentativi per Salto con rincorsa/Salto a muro, `FormData.getAll("valore")`), `inserisciMisurazione` esteso per N valori (insert multi-riga), nuova funzione pura `riduciMiglioreProData` applicata solo al grafico di andamento. Nessuna migrazione. Colmata lacuna pre-esistente: creati i test mancanti per `inserisciMisurazioneAction`/`inserisciMisurazione` (Story 6.1 non ne aveva). 736/736 test passati, 0 errori tsc/eslint. Status: review.
- 2026-07-31: Code review chiusa (Blind Hunter + Edge Case Hunter + Acceptance Auditor) — 1 decision risolta con l'utente (nessun grafico al primo inserimento di un parametro a 3 tentativi: accettato così com'è, coerente col comportamento già esistente per ogni altro parametro), 4 patch applicati (validazione server-side sul numero di valori attesi, che colma anche il bypass su campo "valore" assente; `key` sui campi valore/tentativo per azzerarli al cambio parametro; `riduciMiglioreProData` limitata ai soli parametri a 3 tentativi invece che a tutti; commento impreciso corretto), 3 defer (miglioramenti UX/a11y fuori scope), 3 scartati come rumore. 738/738 test passati, 0 errori tsc/eslint dopo i fix. Status: done.
