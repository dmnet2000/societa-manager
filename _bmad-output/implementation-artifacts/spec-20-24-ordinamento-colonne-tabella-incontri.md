---
title: 'Story 20.24: Ordinamento a click sulle colonne della tabella incontri'
type: 'feature'
created: '2026-09-06'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'c9b3ca0f9d0ef3eca7ac3cf95c8e497f419bfc46'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la "vista tabellare completa" degli incontri di una Categoria (`TabellaIncontriCategoria.tsx`, pagina pubblica `/torneo`, Story 20.19) mostra le sue 6 colonne (Gara, Fase, Squadra Casa, Squadra Ospite, Risultato, Quando/Dove) in un solo ordine fisso (per data/ora dello Slot, Story 20.23) - un Visitatore non può riordinarla per trovare, ad esempio, tutti gli incontri di una Squadra o tutti quelli già conclusi.

**Approach:** aggiungere l'ordinamento a click sulle intestazioni di colonna - primo click ordina crescente, secondo click sulla stessa colonna ordina decrescente. Logica di confronto isolata in una nuova funzione pura testata (`lib/ordina-incontri-tabella.ts`, mirror di `ordina-partite-per-slot.ts`), stato locale al componente (già "use client"). Confermato con l'utente (due round di AskUserQuestion): questa è l'UNICA tabella del modulo Torneo nello scope - le classifiche (girone/finale, admin/pubbliche) restano invariate, le pagine admin non hanno tabelle di incontri (solo schede/form).

## Boundaries & Constraints

**Always:**
- Le 6 colonne sono tutte ordinabili: `numero` (numerico), `fase`/`squadraCasa`/`squadraOspite`/`risultato` (stringa, sullo stesso testo già mostrato - riusando `etichettaFasePartitaTorneo`/`formattaRisultatoPartitaTorneo` già esistenti, mai una seconda formattazione duplicata), `slot` (sulla coppia `data`/`ora` sottostante dello Slot, non sul testo formattato mostrato in cella).
- Un incontro senza Slot assegnato resta sempre in fondo quando si ordina per la colonna Quando/Dove, indipendentemente dalla direzione scelta - stesso principio già stabilito da `ordinaPartitePerSlot` (`lib/ordina-partite-per-slot.ts`), qui applicato come regola dedicata della nuova colonna `slot`.
- Stato iniziale (nessun click ancora effettuato): l'array arriva già ordinato dal chiamante (Story 20.23, per data/ora Slot) - nessun ordinamento aggiuntivo applicato finché l'utente non clicca un'intestazione.
- Click su un'intestazione non ancora attiva → ordina crescente su quella colonna; click sulla stessa intestazione già attiva → ordina decrescente; click su un'altra intestazione → nuova colonna, crescente (nessuno stato "terzo click torna al default").
- Ogni intestazione cliccabile è raggiungibile da tastiera (un `<button>` dentro il `<th>`) con `aria-label` descrittivo, e il `<th>` porta `aria-sort` (`"ascending"`/`"descending"`/`"none"`) coerente con lo stato corrente - mirror delle convenzioni di accessibilità già in uso nel progetto per i controlli interattivi.
- Un indicatore visivo (freccia) compare solo sulla colonna attualmente ordinata, mostrando la direzione corrente.

**Ask First:** nessuna - i limiti sopra sono già decisi con l'utente.

**Never:** nessuna modifica alle tabelle di classifica (girone/finale, admin/pubbliche) né alle pagine admin del Torneo (Edizioni/Categorie/Squadre/Slot) - fuori scope esplicito, confermato con l'utente. Nessun componente/hook generico riusabile per altre tabelle - nessun'altra tabella del modulo ne ha bisogno oggi (evitare un'astrazione prematura). Nessuna richiesta server-side per l'ordinamento - puramente client-side su dati già caricati.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Click su "Squadra Casa" (mai ordinata prima) | nessun ordinamento attivo | righe ordinate alfabeticamente crescente su Squadra Casa | N/A |
| Click su "Squadra Casa" una seconda volta | colonna già attiva, crescente | righe ordinate decrescente sulla stessa colonna | N/A |
| Click su "Gara" dopo aver ordinato per un'altra colonna | colonna diversa attiva | nuova colonna (Gara) attiva, ordine crescente, indicatore si sposta | N/A |
| Click su "Quando/Dove" con incontri senza Slot presenti | mix di incontri con/senza Slot | incontri con Slot ordinati per data/ora (crescente o decrescente secondo il click); incontri senza Slot sempre in fondo in entrambi i casi | N/A |
| Nessun click ancora effettuato | stato iniziale | righe nell'ordine ricevuto dal chiamante (data/ora Slot, Story 20.23), nessuna freccia mostrata | N/A |

</frozen-after-approval>

## Code Map

- **Nuovo file** `lib/ordina-incontri-tabella.ts` -- `ordinaIncontriPerColonna(partite, colonna, direzione)` (pura, mirror `ordina-partite-per-slot.ts`); tipo `ColonnaOrdinamentoIncontri = "numero" | "fase" | "squadraCasa" | "squadraOspite" | "risultato" | "slot"`; comparatore dedicato per `slot` che riusa la stessa logica "senza Slot sempre in fondo" di `ordinaPartitePerSlot`; per `fase`/`risultato` chiama `etichettaFasePartitaTorneo`/`formattaRisultatoPartitaTorneo` (già esistenti) per ottenere lo stesso testo mostrato in cella
- **Nuovo file** `lib/ordina-incontri-tabella.test.ts` -- copertura della matrice I/O sopra, incluso il caso misto con/senza Slot in entrambe le direzioni
- `app/torneo/TabellaIncontriCategoria.tsx` -- stato locale `ordinamento: {colonna, direzione} | null`; ogni `<th>` diventa cliccabile (`<button>` interno) con `aria-sort`/`aria-label`, click handler che aggiorna lo stato (nuova colonna → crescente, stessa colonna → toggle direzione); righe renderizzate da `ordinamento ? ordinaIncontriPerColonna(partite, ...) : partite`; indicatore visivo (freccia) solo sulla colonna attiva

## Tasks & Acceptance

**Execution:**
- [x] `lib/ordina-incontri-tabella.ts` -- funzione pura + tipi
- [x] `lib/ordina-incontri-tabella.test.ts` -- copertura della matrice I/O
- [x] `TabellaIncontriCategoria.tsx` -- intestazioni cliccabili, stato di ordinamento, indicatore visivo, `aria-sort`

**Acceptance Criteria:**
- Given la tabella con nessun ordinamento attivo, when un Visitatore clicca un'intestazione di colonna, then le righe si riordinano crescente su quella colonna e un indicatore visivo compare su di essa
- Given una colonna già ordinata crescente, when la si clicca di nuovo, then l'ordine si inverte a decrescente sulla stessa colonna
- Given incontri con e senza Slot assegnato, when si ordina per "Quando/Dove" in entrambe le direzioni, then quelli senza Slot restano sempre in fondo

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti verdi, incluso il nuovo file di test
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori

**Manual checks (obbligatorio, dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire la vista tabellare di una Categoria con incontri misti (con/senza Slot, con/senza risultato). Cliccare ciascuna delle 6 intestazioni e verificare l'ordinamento crescente/decrescente al doppio click, l'indicatore visivo e che gli incontri senza Slot restino sempre in fondo ordinando per "Quando/Dove".
- Verificare la navigabilità da tastiera (Tab + Invio/Spazio) di ogni intestazione cliccabile.

## Suggested Review Order

**Logica pura di ordinamento**

- Entry point: dispatch per colonna, riusa le formattazioni già esistenti per fase/risultato, comparatore dedicato per lo Slot.
  [`ordina-incontri-tabella.ts:85`](../../lib/ordina-incontri-tabella.ts#L85)

- Macchina a stati del toggle (estratta in review, Verification Gap Reviewer, per essere testabile senza harness di componenti React).
  [`ordina-incontri-tabella.ts:46`](../../lib/ordina-incontri-tabella.ts#L46)

**Integrazione nel componente**

- Stato locale e handler di click, delega la decisione a `prossimoOrdinamento`.
  [`TabellaIncontriCategoria.tsx:90`](../../app/torneo/TabellaIncontriCategoria.tsx#L90)

- Intestazioni cliccabili con `aria-sort`/`aria-label`/indicatore visivo.
  [`TabellaIncontriCategoria.tsx:128`](../../app/torneo/TabellaIncontriCategoria.tsx#L128)

**Stile**

- Bottone dentro il `<th>`, touch target 44px diretto sul bottone stesso (non su un contenitore), stato `:hover`/`:focus-visible` aggiunti in review.
  [`torneo-pubblico.module.css:198`](../../app/torneo/torneo-pubblico.module.css#L198)

**Peripherals**

- Test della funzione pura e della macchina a stati (19 casi, incluse le direzioni decrescenti aggiunte in review per tutte le colonne).
  [`ordina-incontri-tabella.test.ts`](../../lib/ordina-incontri-tabella.test.ts)

