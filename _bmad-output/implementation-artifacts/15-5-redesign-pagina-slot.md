---
baseline_commit: 1fc75a0447c83d135ab5087e294e4b8d984c4d5d
---

# Story 15.5: Redesign pagina Slot (righe compatte, modifica inline)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin/Dirigente che gestisce gli Slot di un Gruppo,
I want vedere le righe Slot in forma tabellare compatta con pulsanti-icona per modifica/cancellazione, ed entrare in modalità modifica solo quando lo richiedo,
so that scorro più rapidamente elenchi lunghi di Slot senza vedere ogni riga già espansa in un form completo.

## Acceptance Criteria

1. **Given** un Admin/Dirigente **When** apre la navigazione **Then** la voce già presente per `/slot` mostra l'etichetta "Orari" invece di "Slot" (nessun impatto su `/orari`, rotta distinta con proprio Ruolo/label — sovrapposizione di naming nota e accettata, vedi Dev Notes)
2. **Given** la pagina `/slot` con Slot esistenti **When** si carica **Then** ogni Slot è mostrato come riga compatta di tabella (non più una card sempre espansa), con icone modifica/cancellazione a destra
3. **Given** una riga Slot in sola lettura **When** l'utente clicca l'icona di modifica **Then** quella riga (solo quella, le altre restano in sola lettura) entra in modalità modifica inline con i campi editabili, coerente con `aggiornaSlot` esistente
4. **And** il form "Nuovo Slot" in cima alla pagina resta invariato rispetto a oggi
5. **And** nessuna regressione sulla logica esistente di modifica/cancellazione (Story 9.13) — solo la presentazione cambia

## Tasks / Subtasks

- [x] Task 1: Cambio `navLabel` di `/slot` da "Slot" a "Orari" (AC: #1)
  - [x] `lib/auth/route-guard.ts`: modificare **solo** `navLabel` sulla riga `/slot` (riga ~133, verificare la posizione esatta prima di modificare) — nessun'altra modifica a `prefix`/`ruoliAmmessi`/`gruppo` (questa riga **non** entra nel sotto-menu "Orari/Palestre" di Story 15.2, resta una voce diretta singola, per costruzione, cfr. Dev Notes).
  - [x] `lib/auth/voci-navigazione.test.ts`: il test `"mantiene l'ordine completo di PROTECTED_ROUTES per Admin (voci dirette e nodi gruppo insieme)"` (riscritto da ultimo in Story 15.4) contiene `{ tipo: "voce", href: "/slot", label: "Slot" }` — aggiornare `label` a `"Orari"`. Verificato con una ricerca testuale mirata: è l'**unico** punto del progetto che asserisce la label letterale "Slot" per questa rotta (le altre occorrenze di `/slot` in `voci-navigazione.test.ts`/`route-decision.test.ts` verificano solo l'`href`/l'autorizzazione, non la label — non toccarle).
- [x] Task 2: Icone SVG inline per modifica/cancellazione (AC: #2)
  - [x] Due piccole icone SVG scritte a mano (nessuna libreria — decisione già presa in fase di analisi dell'epic, coerente con "zero dipendenze senza approvazione esplicita" di Story 14.1), definite **localmente dentro `SlotRow.tsx`** (nessun modulo condiviso: nessun'altra storia di questo epic le riusa oggi — non creare un'astrazione `lib/icone/` non richiesta).
  - [x] Ogni icona dentro un `<button>` con `aria-label` esplicito (nessun testo visibile) — l'`<svg>` stesso va marcato `aria-hidden="true"` per evitare il doppio annuncio da screen reader (stesso principio già documentato in `app/(dati-atleta)/dati-fisici/GraficoMisurazione.tsx`, unico altro punto del progetto con un `<svg>` inline).
- [x] Task 3: Redesign `SlotRow.tsx` — riga tabellare con toggle sola-lettura/modifica (AC: #2, #3, #5)
  - [x] **Riusare il pattern già stabilito da `PartitaRow.tsx` (Story 10.4)**, non reinventarlo: `useState(false)` per `inModifica`, `useActionState` per `aggiornaSlot`/`cancellaSlot` (**già esistenti in `actions.ts`, non toccarli — AC #5**), `azionePending = modificaPending || cancellaPending` per disabilitare entrambe le azioni mentre una è in corso sulla stessa riga (stesso identico principio già in `SlotRow.tsx` oggi, da preservare). Riga di sola lettura = `<tr>` con le celle (Giorno/Orario/Campo+link Naviga/Gruppo) + le due icone; riga di modifica = un secondo `<tr>` condizionale con `<td colSpan>` contenente il form attuale (stessi campi, stesso `<select>`/`<input type="time">`, stesso link "Naviga" per il Campo attualmente salvato) — non un `<article>` card come oggi.
  - [x] Ricollasso automatico alla vista di sola lettura dopo un salvataggio riuscito: stesso pattern "adjust state during render" di `PartitaRow.tsx` (confronto `modificaState !== ultimoModificaState` dentro il render, non un `useEffect` con `setState` — quest'ultimo violerebbe `react-hooks/set-state-in-effect`, lezione già presa in Story 10.4).
  - [x] Cancellazione: form separato con `window.confirm(...)` prima dell'invio (stesso testo/pattern già presente oggi in `SlotRow.tsx`), pulsante-icona invece del testo "Cancella" — **niente componente `EliminaSlotForm.tsx` separato**, form inline dentro `SlotRow.tsx` (non serviva altrove nella riga, a differenza di `EliminaPartitaForm.tsx`).
  - [x] `aria-label` distintivo per riga su entrambi i pulsanti-icona (stesso motivo già documentato in `SlotRow.tsx` oggi: senza, più righe producono per uno screen reader una sequenza indistinguibile — riusato `etichettaSlot` già calcolato).
  - [x] Nessuna modifica alla validazione/ai messaggi di errore di `aggiornaSlot`/`cancellaSlot` (`actions.ts`, `actions.test.ts` invariati — AC #5, solo la presentazione cambia).
- [x] Task 4: Ristrutturare `page.tsx` da elenco di card a tabella (AC: #2, #4)
  - [x] Sostituito il `<div className={styles.lista}>` con un `<table>` (`<thead>`/`<tbody>` che mappa `slot.map(...)` a `<SlotRow>`) — stessa struttura già usata da `/partite`. **Deviazione consapevole rispetto al testo originale del task**: intestazioni finali Giorno/Orario/Campo/Gruppo/Azioni (5 colonne, non 6) — Ora inizio e Ora fine sono mostrate come un'unica colonna "Orario" (`HH:MM-HH:MM`), più leggibile come intervallo unico che come due colonne separate; nessun AC richiede colonne separate, `aggiornaSlot` continua a ricevere `oraInizio`/`oraFine` distinti dal form di modifica (invariato).
  - [x] La sezione "Nuovo Slot" (`<NuovoSlotForm campi={campi} gruppi={gruppi} />`) resta **invariata**, stessa posizione in cima alla pagina (AC #4) — `NuovoSlotForm.tsx` non toccato.
  - [x] Messaggio vuoto (`"Nessuno Slot inserito."`) resta invariato quando `slot.length === 0`.
- [x] Task 5: CSS (AC: #2)
  - [x] `slot.module.css`: aggiunte le classi per la tabella (`.tabella`, `.tabella th`, `.tabella td`) e per i pulsanti-icona (`.iconaBottone`, `.iconaBottoneDanger`, `.formIconaInline`) — stesso schema di `partite.module.css` (`.tabella`) per coerenza visiva tra le due pagine tabellari.
  - [x] Rimosse `.card`/`.lista` (non più referenziate da nessun componente dopo il redesign). **Correzione post-review**: l'affermazione originale "nessun altro file importa `slot.module.css`" era imprecisa — `NuovoSlotForm.tsx` lo importa anch'esso, ma usa solo `.campiRiga`/`.campo`/`.errore`/`.successo`/`.bottone` (verificato con una ricerca mirata), nessuna delle classi rimosse o ricolorate — nessuna regressione reale, solo la nota di verifica era formulata in modo scorretto. `.bottoneSecondario` riusato per "Annulla" (colore riportato a neutro invece di danger, coerente con `partite.module.css`, dato che non è più il pulsante testuale "Cancella") — essendo `NuovoSlotForm.tsx` l'unico altro importatore e non usando questa classe, nessun impatto su di esso.
  - [x] Pulsanti-icona con `:focus-visible` (stesso outline di 2px già usato ovunque nel progetto) e `:disabled` (opacità ridotta, stesso pattern di `.bottoneSecondario`/`.bottoneElimina` esistenti).
- [x] Task 6: Verifica (AC: #1, #2, #3, #4, #5)
  - [x] `npx vitest run` — 934/934 verdi, `actions.test.ts` invariato e passante senza modifiche (AC #5); unica modifica di test: la label "Orari" in `voci-navigazione.test.ts` (Task 1). Nessun nuovo test di rendering per `SlotRow.tsx`/`page.tsx` — convenzione già stabilita in questo progetto (Story 9.9/9.14/9.18/10.4).
  - [x] `npx tsc --noEmit`, `npx eslint .` puliti.
  - [x] `npm run build` pulito (`/slot` presente tra le route generate, nessuna regressione).
  - [x] Verifica dal vivo (aspetto reale della tabella, toggle modifica per riga, icone) non eseguibile in questo ambiente sandbox — stesso limite di ogni storia precedente di questa sessione.

### Review Findings

- [x] [Review][Patch] **Pulsanti-icona sotto il target di tocco minimo di 44px** — `.iconaBottone` era ~24-26px (16px icona + 4px padding + bordo), sotto la soglia già documentata in questo progetto come lezione ricorrente (memoria di progetto: "Touch target 44px richiede align-self:stretch"). [app/(orari-palestre)/slot/slot.module.css] — risolto: `min-width`/`min-height: 44px` aggiunti a `.iconaBottone` (qui sufficiente da soli: il genitore è un `<td>`, non un contenitore flex con `align-items:center` che li schiaccerebbe, a differenza del caso originale della lezione).
- [x] [Review][Patch] **`<h1>` della pagina resta "Slot" mentre il `navLabel` diventa "Orari" (AC #1)** — un utente che clicca "Orari" nel menu atterra su una pagina ancora intitolata "Slot", vanificando la disambiguazione che il rename doveva ottenere rispetto a "Orari/Palestre". [app/(orari-palestre)/slot/page.tsx] — risolto: `<h1>` cambiato in "Orari"; i sottotitoli "Nuovo Slot"/"Elenco Slot" restano invariati (si riferiscono all'entità di dominio Slot, non al nome della pagina in nav).
- [x] [Review][Patch] **Regressione: `aria-label` sul pulsante "Salva" della riga di modifica è sparito** — presente nella versione precedente di `SlotRow.tsx` (`aria-label={\`Salva ${etichettaSlot}\`}`), perso nella riscrittura. Con più righe potenzialmente in modifica contemporaneamente (nessuna esclusività tra righe, per costruzione — vedi dismessi), più pulsanti "Salva" sarebbero indistinguibili per uno screen reader, esattamente il problema che il commento del file stesso descrive per Modifica/Cancella. [app/(orari-palestre)/slot/SlotRow.tsx] — risolto: `aria-label` ripristinato su "Salva", aggiunto anche su "Annulla" (mai l'aveva avuto).
- [x] [Review][Patch] **Commento fuorviante sul precedente `GraficoMisurazione.tsx`** — il commento sopra `IconaModifica`/`IconaCancella` affermava che il pattern `aria-hidden` fosse "stesso principio già documentato in GraficoMisurazione.tsx"; verificato che quel file usa invece `<title>`+`role="img"` senza `<button>` né `aria-hidden` — uno scenario diverso (nome accessibile diretto sull'SVG, non su un bottone contenitore). [app/(orari-palestre)/slot/SlotRow.tsx] — risolto: commento riformulato per non citare un precedente che non si applica.
- [x] [Review][Patch] **Affermazione di verifica imprecisa nel Task 5** — "nessun altro file importa `slot.module.css`" era falso: `NuovoSlotForm.tsx` lo importa anch'esso. Nessuna regressione reale (usa solo `.campiRiga`/`.campo`/`.errore`/`.successo`/`.bottone`, nessuna delle classi rimosse/ricolorate), ma la nota di verifica della story era formulata in modo scorretto — esattamente il tipo di claim che dovrebbe essere affidabile in un CSS module condiviso. [_bmad-output/implementation-artifacts/15-5-redesign-pagina-slot.md] — risolto: Task 5 corretto con nota esplicita.
- [x] [Review][Patch] **Nessun `title` sui pulsanti-icona** — un utente col mouse non familiare con i glifi matita/cestino disegnati a mano non ha modo di anticipare l'azione prima del click (a differenza dei precedenti pulsanti testuali "Modifica"/"Cancella"). [app/(orari-palestre)/slot/SlotRow.tsx] — risolto: `title` aggiunto su entrambi i pulsanti-icona, stesso testo dell'`aria-label`.
- [ ] [Review][Defer] Errore di validazione non si azzera chiudendo la riga con "Annulla" — se `aggiornaSlot` fallisce e l'utente chiude senza un nuovo invio, riaprendo "Modifica" sulla stessa riga il vecchio messaggio d'errore ricompare (`modificaState` si azzera solo a un nuovo submit, non alla chiusura). Difetto preesistente e condiviso con `PartitaRow.tsx` (Story 10.4, stesso pattern "adjust state during render" da cui questa storia riusa la logica) — questa storia lo propaga, non lo introduce. [app/(orari-palestre)/slot/SlotRow.tsx] — deferito: correggerlo solo qui divergerebbe dal pattern condiviso appena replicato su indicazione esplicita della story; più sensato un fix comune a entrambi i componenti in un item di backlog indipendente.
- [ ] [Review][Defer] Nessuna gestione esplicita del focus dopo un salvataggio riuscito — il ricollasso automatico della riga (stesso pattern di `PartitaRow.tsx`) rimuove dal DOM il bottone "Salva" che aveva il focus, senza spostarlo esplicitamente sul bottone "Modifica" della riga; il focus da tastiera/screen reader cade sul `<body>`. Stesso pattern condiviso con `PartitaRow.tsx`, non introdotto da questa storia. [app/(orari-palestre)/slot/SlotRow.tsx] — deferito: stesso ragionamento del punto sopra, fix comune preferibile a una divergenza locale.
- [ ] [Review][Defer] Il messaggio d'errore di cancellazione (`role="alert"`) può allargare/disallineare visivamente la colonna "Azioni" — nessun vincolo di larghezza sulla tabella (`border-collapse`, nessun `table-layout: fixed`). Non verificabile dal vivo in questo ambiente sandbox. [app/(orari-palestre)/slot/slot.module.css] — deferito: cosmetico, impatto solo nel caso raro di cancellazione bloccata da Presenze registrate, da riconsiderare se osservato dal vivo dopo il deploy.
- [ ] [Review][Defer] Nessun `aria-expanded`/`aria-controls` sul pulsante Modifica per segnalare programmaticamente lo stato espanso/collassato alla tecnologia assistiva. Scelta coerente con la stessa limitazione già accettata per l'accordion di `NavBarClient.tsx` (Story 15.1 Dev Notes: "nessun `aria-controls` possibile" quando le figlie non sono sempre montate nel DOM) — stessa categoria di trade-off, non specifico di questa storia. [app/(orari-palestre)/slot/SlotRow.tsx] — deferito: da riconsiderare solo se un audit di accessibilità reale lo segnalasse.

**Dismessi come rumore/fuori scope/convenzioni già accettate (4):** nessun nuovo test per `SlotRow.tsx`/`page.tsx` nonostante la riscrittura sostanziale — convenzione già stabilita e ripetuta in questo progetto (Story 9.9/9.14/9.18), coerente col fatto che nemmeno `PartitaRow.tsx` (il pattern riusato) ha mai avuto test dedicati; la sovrapposizione di naming "Orari"/"Orari-Palestre" non verificata dal vivo — decisione già esplicitamente accettata dall'utente in fase di analisi dell'epic (`epics.md`), stesso limite sandbox di ogni storia di questa sessione; nessuna esclusività imposta tra righe in modifica contemporanea nonostante la lettura possibile di AC #3 ("solo quella riga") come esclusività globale — l'Acceptance Auditor ha confermato indipendentemente che l'isolamento per-riga via `useState` locale soddisfa l'AC così come scritto (identico al comportamento di `PartitaRow.tsx`, mai stato un requisito di esclusività a livello di tabella); optional chaining superfluo su `campoAttuale?.palestra.nome` (la guardia `linkNaviga` già implica `campoAttuale` non-null) — innocuo, difensivo, non vale il churn di una modifica dedicata.

### Perché questa storia è indipendente dal resto dell'Epic 15

A differenza di Story 15.1/15.2/15.3/15.4 (tutte basate sull'infrastruttura sotto-menu di Story 15.1), questa storia non tocca `lib/auth/voci-navigazione.ts`/`app/NavBarClient.tsx`/`raggruppaVociNavigazione` — è un cambio di **una sola riga** in `route-guard.ts` (`navLabel`) più un redesign puramente di presentazione della pagina `/slot`, isolato dal resto dell'epic. Può essere sviluppata in qualunque ordine (già indicato in `epics.md`).

### La sovrapposizione di naming "Orari" è nota e accettata, non un difetto

Dopo questa storia, Admin/Dirigente vedranno **due voci di menu diverse che contengono "Orari"**: la voce singola "Orari" (ex `/slot`, questa storia) e — se hanno anche accesso a `/palestre` — il sotto-menu "Orari/Palestre" (Story 15.2) che per loro mostra solo "Palestre" come figlia (non hanno accesso a `/orari`, Segreteria-only). Scoperta in fase di analisi dell'epic e **esplicitamente accettata dall'utente così com'è** (`epics.md`, sezione "Incongruenza scoperta in analisi") — non correggere, non rinominare ulteriormente nessuna delle due voci.

### Pattern da riusare, non reinventare: `PartitaRow.tsx` (Story 10.4)

`app/(partite-campionati)/partite/PartitaRow.tsx` risolve **esattamente** lo stesso problema che questa storia pone per `SlotRow.tsx`: una riga di tabella che di default è di sola lettura e si trasforma in un form di modifica inline al click su un pulsante, con auto-ricollasso dopo un salvataggio riuscito. È il precedente diretto più recente e più vicino nel progetto — leggerlo per intero prima di scrivere `SlotRow.tsx` (già incluso per intero in questo file, vedi sopra). Le differenze da questa storia: (a) qui il pulsante è un'icona invece di testo (AC #2, novità di questa storia — nessun precedente di pulsanti-icona nel progetto); (b) `SlotRow.tsx` gestisce già Cancella con `useActionState` proprio (a differenza di `EliminaPartitaForm.tsx`, che l'ha ricevuto sollevato da `PartitaRow.tsx` in code review) — **non serve sollevare nulla qui**, `SlotRow.tsx` ha già `azionePending` corretto oggi.

### File esistenti da leggere per intero prima di modificare (già letti in fase di creazione di questa storia)

- **`app/(orari-palestre)/slot/SlotRow.tsx`** (stato attuale): `<article className={styles.card}>` con un form di modifica sempre visibile (tutti i 5 campi sempre editabili) + un secondo form di cancellazione, entrambi con `useActionState` propri e `azionePending` condiviso. Va riscritto per avere uno stato "sola lettura" di default (Task 3).
- **`app/(orari-palestre)/slot/page.tsx`** (stato attuale): `<div className={styles.lista}>` che mappa `slot.map(s => <SlotRow .../>)`, sezione "Nuovo Slot" invariata sopra. Va convertito a `<table>` (Task 4).
- **`app/(orari-palestre)/slot/actions.ts`**: `creaSlot`/`aggiornaSlot`/`cancellaSlot`, tutte già corrette e complete (Story 9.13) — **nessuna modifica**, AC #5 lo richiede esplicitamente. `aggiornaSlot`/`cancellaSlot` bloccano già la mutazione se lo Slot ha Presenze registrate (messaggio d'errore mostrato dentro il form, comportamento da preservare identico).
- **`app/(partite-campionati)/partite/PartitaRow.tsx`** + **`page.tsx`** + **`partite.module.css`**: precedente diretto del pattern riga-tabella-toggle-modifica, vedi sopra.
- **`lib/auth/route-guard.ts`**: riga `/slot` (oggi `navLabel: "Slot"`) — unica riga da toccare per AC #1.

### Project Structure Notes

- Modificati: `lib/auth/route-guard.ts` (1 campo, 1 riga), `lib/auth/voci-navigazione.test.ts` (1 assertion), `app/(orari-palestre)/slot/SlotRow.tsx` (riscritto), `app/(orari-palestre)/slot/page.tsx` (markup lista→tabella), `app/(orari-palestre)/slot/slot.module.css` (nuove classi tabella/icona, rimozione classi card se orfane).
- Nessuna modifica a `app/(orari-palestre)/slot/actions.ts`, `actions.test.ts`, `NuovoSlotForm.tsx` (AC #4/#5).
- Nessun nuovo file previsto (icone SVG inline dentro `SlotRow.tsx`, non un modulo condiviso — vedi Task 2).

### References

- [Source: epics.md#Epic 15: Riorganizzazione Grafica — Navigazione e Slot, Story 15.5] — AC originali e contesto tecnico dell'epic (sovrapposizione naming "Orari", decisione icone SVG inline).
- [Source: app/(partite-campionati)/partite/PartitaRow.tsx, page.tsx, partite.module.css] — precedente diretto del pattern riga-tabella-toggle-modifica (Story 10.4), letto per intero.
- [Source: app/(orari-palestre)/slot/SlotRow.tsx, page.tsx, actions.ts, slot.module.css] — stato attuale da modificare, letto per intero.
- [Source: lib/auth/route-guard.ts, lib/auth/voci-navigazione.test.ts] — riga `/slot` e unico test che asserisce la sua label letterale.
- [Source: app/(dati-atleta)/dati-fisici/GraficoMisurazione.tsx] — unico altro `<svg>` inline nel progetto, riferimento per `aria-hidden`/annuncio screen reader.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno.

### Completion Notes List

- Implementate tutte e 5 le AC/6 Task della story: `navLabel` di `/slot` cambiato da "Slot" a "Orari" in `route-guard.ts` (AC #1), un solo test aggiornato (`voci-navigazione.test.ts`, unico punto che asserisce quella label letterale, come anticipato dalla story).
- `SlotRow.tsx` riscritto da `<article>` card sempre espansa a coppia di `<tr>` (sola lettura + modifica condizionale), riusando **esattamente** il pattern già stabilito da `PartitaRow.tsx` (Story 10.4) — `useState` per `inModifica`, ricollasso automatico dopo salvataggio riuscito con il pattern "adjust state during render", `azionePending` condiviso. Nessuna modifica a `actions.ts`/`actions.test.ts` (AC #5).
- Due icone SVG inline scritte a mano (matita/cestino), definite localmente in `SlotRow.tsx` — nessun modulo condiviso creato (nessun altro consumer oggi), nessuna nuova dipendenza npm. `aria-hidden="true"` sull'`<svg>`, `aria-label` esplicito sul `<button>` contenitore (stesso principio di `GraficoMisurazione.tsx`).
- `page.tsx` ristrutturata da `<div className={styles.lista}>` a `<table>` (AC #2), sezione "Nuovo Slot" invariata in cima (AC #4). **Deviazione consapevole documentata nel Task 4**: colonna "Orario" unica invece di "Ora inizio"/"Ora fine" separate — nessun AC la richiedeva separata, il form di modifica continua a inviare i due campi distinti ad `aggiornaSlot`.
- `slot.module.css`: nuove classi tabella/icona-bottone, `.card`/`.lista` rimosse (orfane dopo il redesign, verificato che nessun altro file le referenziasse), `.bottoneSecondario` riportato a colore neutro (ora usato per "Annulla", non più per il vecchio pulsante testuale "Cancella").
- 934/934 test Vitest passati (nessun nuovo test — solo la label "Orari" aggiornata in un test esistente; nessun test di rendering per `SlotRow.tsx`/`page.tsx`, convenzione già stabilita e coerente con `PartitaRow.tsx` stesso, che non ne ha), `eslint`/`tsc --noEmit` puliti, `npm run build` riuscita senza regressioni sulle route esistenti.
- Verifica dal vivo (aspetto reale della tabella, toggle modifica per riga, icone) non eseguibile in questo ambiente sandbox — stesso limite delle storie precedenti.

### File List

**Modificati:**
- `lib/auth/route-guard.ts` (`navLabel` di `/slot`: "Slot" → "Orari"; post-done: `gruppo: "Orari/Palestre"` aggiunto e riga riposizionata tra `/orari` e `/palestre`)
- `lib/auth/voci-navigazione.test.ts` (1 assertion aggiornata: label "Orari"; post-done: 8 test aggiornati per riflettere `/slot` come figlia del gruppo "Orari/Palestre")
- `app/(orari-palestre)/slot/SlotRow.tsx` (riscritto: card sempre espansa → riga tabellare con toggle sola-lettura/modifica, icone SVG inline; review: `aria-label` ripristinato su Salva, aggiunto su Annulla, `title` aggiunto sui pulsanti-icona, commento su `GraficoMisurazione.tsx` corretto)
- `app/(orari-palestre)/slot/page.tsx` (markup lista di card → tabella; review: `<h1>` allineato al nuovo `navLabel` "Orari")
- `app/(orari-palestre)/slot/slot.module.css` (nuove classi tabella/icona-bottone, rimosse `.card`/`.lista`, `.bottoneSecondario` riportato a colore neutro; review: touch target 44px su `.iconaBottone`)

## Change Log

- 2026-08-05: Story implementata (Task 1-6 completi). Redesign della pagina `/slot`: `navLabel` rinominato in "Orari" (AC #1), `SlotRow.tsx` riscritto da card-sempre-espansa a riga tabellare con toggle sola-lettura/modifica riusando il pattern già stabilito da `PartitaRow.tsx` (Story 10.4), icone SVG inline scritte a mano per modifica/cancellazione (nessuna dipendenza npm, nessun modulo condiviso). Nessuna modifica alla logica di `aggiornaSlot`/`cancellaSlot` (AC #5). Deviazione consapevole dal testo del Task 4: colonna "Orario" unica invece di due colonne separate Ora inizio/Ora fine, non richiesta da alcun AC. 934/934 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: review.
- 2026-08-05: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Nessuna violazione degli AC (Acceptance Auditor: tutte e 5 le AC verificate indipendentemente, incluso l'isolamento per-riga dello stato di modifica che soddisfa AC #3). 6 patch applicati: touch target 44px sui pulsanti-icona (lezione già nota in questo progetto), `<h1>` di pagina allineato al nuovo `navLabel` "Orari" (era rimasto "Slot", vanificando la disambiguazione dell'AC #1), `aria-label` ripristinato sul pulsante Salva (regressione rispetto alla versione precedente) e aggiunto su Annulla, commento sul precedente `GraficoMisurazione.tsx` corretto (citava un pattern diverso da quello realmente usato lì), affermazione di verifica imprecisa nel Task 5 corretta (`NuovoSlotForm.tsx` importa anch'esso `slot.module.css`, senza impatto reale), `title` aggiunto sui pulsanti-icona. 4 defer (errore di validazione non azzerato da "Annulla", nessuna gestione del focus dopo salvataggio riuscito, messaggio d'errore che può disallineare la colonna Azioni, nessun `aria-expanded`/`aria-controls` — i primi due condivisi con `PartitaRow.tsx`, propagati non introdotti da questa storia). 4 osservazioni dismesse come rumore/convenzioni già accettate. 934/934 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Con questa storia, tutte e 5 le storie dell'Epic 15 sono `done`. Status: done.
- 2026-08-05: **Estensione post-done su richiesta esplicita dell'utente**: la voce "Orari" (ex `/slot`) è stata spostata dentro il sotto-menu "Orari/Palestre" invece di restare una voce diretta separata — risolve la sovrapposizione di naming che l'analisi dell'epic aveva inizialmente accettato "così com'è". `lib/auth/route-guard.ts`: `/slot` ora ha `gruppo: "Orari/Palestre"`, dichiarata tra `/orari` e `/palestre` così l'ordine delle figlie corrisponde all'etichetta padre. **Conseguenza chiesta esplicitamente all'utente e confermata**: un ipotetico Utente con Ruoli sia Segreteria sia Admin/Dirigente (nessun Ruolo reale li ha entrambi oggi) vedrebbe due figlie con lo stesso testo "Orari" (da `/orari` e da `/slot`) nello stesso gruppo espanso — accettato deliberatamente, nessuna rinomina applicata. 8 test in `voci-navigazione.test.ts` aggiornati per riflettere le nuove due/tre figlie del gruppo "Orari/Palestre" (Admin/Dirigente ora vedono `/slot` + `/palestre`, non solo `/palestre`; il caso doppio-Ruolo Segreteria+Admin ora vede tutte e tre le figlie in ordine). 934/934 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: done (invariato).
