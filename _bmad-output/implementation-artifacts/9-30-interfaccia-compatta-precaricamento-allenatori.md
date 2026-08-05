---
baseline_commit: 11407e3fe2eb64131d7f8b0d6728617880b5b6a1
---

# Story 9.30: Interfaccia più compatta per /precaricamento-allenatori

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin che gestisce l'elenco degli Allenatori precaricati,
I want vedere le righe Allenatore in forma tabellare compatta con pulsanti-icona per modifica/cancellazione, ed entrare in modalità modifica solo quando lo richiedo,
so that scorro più rapidamente elenchi lunghi di Allenatori senza vedere ogni riga già espansa in un form completo.

## Acceptance Criteria

1. **Given** la pagina `/precaricamento-allenatori` con Allenatori precaricati **When** si carica **Then** ogni Allenatore è mostrato come riga compatta di tabella (non più una card sempre espansa), con icone modifica/cancellazione a destra
2. **Given** una riga Allenatore in sola lettura **When** l'utente clicca l'icona di modifica **Then** quella riga (solo quella, le altre restano in sola lettura) entra in modalità modifica inline con i campi Nome/Cognome/Codice Fiscale editabili, coerente con `aggiornaAllenatore` esistente
3. **And** il form "Nuovo Allenatore" in cima alla pagina resta invariato rispetto a oggi
4. **And** nessuna regressione sulla logica esistente di modifica/cancellazione (`aggiornaAllenatore`/`cancellaAllenatore`, Story 9.9) — solo la presentazione cambia

## Tasks / Subtasks

- [x] Task 1: Estrarre le icone SVG condivise (matita/cestino) in un modulo comune (AC: #1)
  - [x] Nuovo file `app/icone-azione-riga.tsx` con `IconaModifica`/`IconaCancella` — spostate qui **verbatim** da `app/(orari-palestre)/slot/SlotRow.tsx` (Story 15.5), stesse `viewBox`/`path`/`aria-hidden="true"`. Questo è il **secondo** consumer reale di queste icone (dopo `SlotRow.tsx`) — soglia superata per estrarle in un modulo condiviso invece di duplicarle una seconda volta (decisione presa in fase di creazione story).
  - [x] `app/(orari-palestre)/slot/SlotRow.tsx`: rimosse le definizioni locali di `IconaModifica`/`IconaCancella`, importate dal nuovo modulo condiviso (`@/app/icone-azione-riga`). **Refactor puro, nessun cambio di comportamento** — `tsc --noEmit`/`eslint` puliti su entrambi i file.
- [x] Task 2: Redesign `AllenatoreRow.tsx` — riga tabellare con toggle sola-lettura/modifica (AC: #1, #2, #4)
  - [x] Riusato il pattern già stabilito da `PartitaRow.tsx`/`SlotRow.tsx`: `useState(false)` per `inModifica`, `useActionState` per `aggiornaAllenatore`/`cancellaAllenatore` (invariati), `azionePending` condiviso. Riga di sola lettura = `<tr>` con Nome/Cognome/Codice Fiscale/Stato + le due icone; riga di modifica = `<tr>` condizionale con `<td colSpan={5}>` contenente il form (3 campi).
  - [x] Ricollasso automatico dopo salvataggio riuscito, stesso pattern "adjust state during render".
  - [x] Cancellazione: form inline con `window.confirm(...)` (stesso testo, menziona `nomeCompleto`), pulsante-icona.
  - [x] `aria-label` e `title` su entrambi i pulsanti-icona fin da subito (lezione dalla review di Story 15.5).
  - [x] `aria-label` su "Salva"/"Annulla" fin da subito (altra lezione dalla review di Story 15.5).
  - [x] Nessuna modifica a `actions.ts` (AC #4).
- [x] Task 3: Ristrutturare `page.tsx` da elenco di card a tabella (AC: #1, #3)
  - [x] Sostituito `<div className={styles.lista}>` con `<table>` (`<thead>`/`<tbody>`), stessa struttura di `/slot`.
  - [x] Sezione "Nuovo Allenatore" invariata in cima (AC #3) — `NuovoAllenatoreForm.tsx` non toccato.
  - [x] Aggiunto messaggio "elenco vuoto" (`.messaggioVuoto`, "Nessun Allenatore precaricato.") per coerenza con `/slot`/`/palestre` — non esisteva prima, aggiunto senza sforzo aggiuntivo significativo.
- [x] Task 4: CSS (AC: #1)
  - [x] `precaricamento-allenatori.module.css`: aggiunte `.tabella`/`.tabella th`/`.tabella td`, `.iconaBottone` (con touch target 44px fin da subito)/`.iconaBottoneDanger`/`.formIconaInline`, stesso schema di `slot.module.css`.
  - [x] Rimosse `.card`/`.lista`/`.stato` (orfane dopo il redesign) — **verificato esplicitamente `NuovoAllenatoreForm.tsx`**: usa solo `.campo`/`.form`/`.errore`/`.successo`/`.bottone`, nessuna delle classi rimosse/toccate.
  - [x] `.bottoneSecondario` riportato a colore neutro (ora "Annulla", non più "Cancella") — `NuovoAllenatoreForm.tsx` non usa questa classe, nessun impatto.
  - [x] `.campiRiga`/`.campiRiga .campo` aggiunte per i campi in linea nella riga di modifica — selettore **annidato** (`.campiRiga .campo`, non `.campo` da solo) per non alterare `NuovoAllenatoreForm.tsx`, che usa `.campo` fuori da `.campiRiga` (impilato verticalmente, invariato).
- [x] Task 5: Verifica (AC: #1, #2, #3, #4)
  - [x] `npx vitest run`: 934/934 verdi (nessuna regressione dal refactor del Task 1 su `SlotRow.tsx`). Nessun nuovo test — stessa convenzione già stabilita (nessun test di rendering per `PartitaRow.tsx`/`SlotRow.tsx`).
  - [x] `npx tsc --noEmit`, `npx eslint .` puliti.
  - [x] `npm run build` pulito — sia `/precaricamento-allenatori` sia `/slot` presenti tra le route generate.
  - [x] Verifica dal vivo non eseguibile in questo ambiente sandbox — stesso limite di ogni storia precedente di questa sessione.

### Review Findings

- [x] [Review][Patch] **Nessuno scroll orizzontale confinato per la tabella** — la riga (Nome + Cognome + Codice Fiscale a 16 caratteri + Stato + due pulsanti-icona da 44px) può eccedere la larghezza di un viewport mobile stretto; senza un contenitore dedicato la tabella avrebbe rotto il layout della pagina invece di scorrere solo al proprio interno. Stesso gap presente anche in `/slot` (Story 15.5), qui propagato invece di essere corretto. [app/(onboarding-import)/precaricamento-allenatori/page.tsx, precaricamento-allenatori.module.css] — risolto: `<table>` avvolta in un `<div className={styles.tabellaScroll}>` con `overflow-x: auto`.
- [ ] [Review][Defer] **Errore di validazione non si azzera chiudendo la riga con "Annulla"** (`modificaState`) — identificato indipendentemente da Blind Hunter ed Edge Case Hunter: se `aggiornaAllenatore` fallisce e l'utente chiude senza un nuovo invio, riaprendo "Modifica" sulla stessa riga il vecchio messaggio d'errore ricompare. Stesso identico difetto già deferito nella review di Story 15.5 per `SlotRow.tsx`/`PartitaRow.tsx` (pattern "adjust state during render" condiviso) — questa storia lo propaga a un **terzo** componente, non lo introduce ex novo. [app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx] — deferito: correggerlo solo qui divergerebbe ulteriormente dal pattern ormai condiviso da 3 componenti; più sensato un fix comune (es. un hook condiviso `useRigaConModifica`) in un item di backlog indipendente, non 3 patch locali scoordinate.
- [ ] [Review][Defer] **Nessuna gestione del focus dopo salvataggio/annulla riuscito** — stesso pattern condiviso con `SlotRow.tsx`/`PartitaRow.tsx`, già deferito per Story 15.5, ora presente in un terzo componente. [app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx] — deferito: stesso ragionamento del punto sopra, fix comune preferibile a 3 divergenze locali.
- [ ] [Review][Defer] **`/slot` ha lo stesso gap di scroll orizzontale non confinato**, scoperto mentre si applicava il fix a questa storia — la sua tabella non è avvolta in un contenitore `overflow-x: auto`. [app/(orari-palestre)/slot/page.tsx, slot.module.css] — deferito: fuori dallo scope di questa storia (non è tra i file toccati dal diff), da applicare come fix di follow-up simmetrico.
- [ ] [Review][Defer] Asimmetria cosmetica minore: l'errore di `cancellaState` ora si trova nella stretta cella "Azioni" (5ª colonna) mentre l'errore di `modificaState` resta a piena larghezza nella riga di modifica (`colSpan={5}`) — effetto collaterale cosmetico della migrazione card→tabella, AC #4 ("solo la presentazione cambia") rispettato, nessuna violazione. [app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx] — deferito: verifica visiva consigliata dopo il deploy, non bloccante.

**Dismessi come rumore/pre-esistente/convenzioni già accettate (9):** errore di cancellazione fallita permanente/non richiudibile — comportamento già presente nel codice originale prima di questa storia (nessuna `cancellaState` veniva mai azzerata), non una regressione introdotta da questo diff; nessuna esclusività imposta tra righe in modifica contemporanea nonostante la lettura possibile di AC #2 come esclusività globale — stessa lettura già dismessa nella review di Story 15.5, l'Acceptance Auditor conferma qui indipendentemente che l'isolamento per-riga soddisfa l'AC così come scritto; nessun test di componente aggiunto — convenzione già stabilita e ripetuta (nessun test per `PartitaRow.tsx`/`SlotRow.tsx`); spaziatura tra le due icone affidata a un nodo di testo JSX `{" "}` invece che a un `gap` CSS — non è realmente fragile come descritto (un'espressione JSX esplicita non viene mai rimossa dallo whitespace-stripping, a differenza del testo letterale), pattern identico già presente in `SlotRow.tsx`; `display: inline` su `.formIconaInline` che avvolge un bottone `inline-flex`, potenziale disallineamento verticale — pattern identico già spedito in Story 15.5, speculativo senza verifica dal vivo; `colSpan={5}` come "numero magico" duplicato tra `<thead>` e riga di modifica — stesso pattern già presente in `SlotRow.tsx`/`PartitaRow.tsx`, coerente con l'intero codebase; osservazione sul processo/stato della story in `sprint-status.yaml` — non è un difetto di codice, fuori perimetro di una code review; sicurezza della classe condivisa `.campo` verificata "solo" tramite commento/grep — osservazione generica di manutenibilità applicabile a qualunque classe CSS condivisa in qualunque progetto, la verifica è stata comunque rifatta correttamente questa volta (confermato indipendentemente dall'Acceptance Auditor via grep); gap di evidenza nel transcript del diff di `SlotRow.tsx` segnalato dall'Acceptance Auditor — artefatto di troncamento del copia-incolla, non un problema di codice, già risolto dall'auditor stesso leggendo il file live.

## Dev Notes

### Decisione presa con l'utente in fase di creazione story (2026-08-05)

La richiesta originale ("magari mettere in line tutti i campi") lasciava aperta la scelta tra un fix leggero (solo campi in linea, card sempre modificabile) e il redesign completo già applicato a `/slot` (Story 15.5, tabella + toggle sola-lettura/modifica). **Chiesto esplicitamente e confermato**: redesign completo, stesso pattern di `/slot`. Non implementare la versione leggera.

### Perché le icone vanno estratte in un modulo condiviso adesso

`SlotRow.tsx` (Story 15.5) ha definito `IconaModifica`/`IconaCancella` **localmente**, con la nota esplicita "nessun modulo condiviso: nessun'altra storia di questo epic le riusa oggi — non creare un'astrazione non richiesta". Questa storia è il primo caso reale in cui un secondo componente ha bisogno delle stesse identiche icone — la soglia per estrarle (due consumer reali, non ipotetici) è ora superata. Vedi Task 1.

### Pattern da riusare, non reinventare: `SlotRow.tsx` (Story 15.5) / `PartitaRow.tsx` (Story 10.4)

`app/(orari-palestre)/slot/SlotRow.tsx` è il precedente più recente e più vicino: stesso identico problema (card sempre espansa → riga tabellare con toggle), stesse lezioni di code review già applicate (touch target 44px, `aria-label`/`title` sui pulsanti-icona, `aria-label` su Salva non perso questa volta). Leggerlo per intero prima di scrivere `AllenatoreRow.tsx` — la struttura del nuovo componente sarà quasi identica, con tre campi invece di cinque e senza il link "Naviga"/il calcolo `campoAttuale`/`gruppoAttuale` (`AllenatoreRow.tsx` non ha equivalenti — Allenatore non ha relazioni Campo/Gruppo dirette in questa pagina).

### File esistenti da leggere per intero prima di modificare (già letti in fase di creazione di questa storia)

- **`app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx`** (stato attuale): `<article className={styles.card}>` con un form di modifica sempre visibile (tutti i 3 campi sempre editabili, più un `<p className={styles.stato}>` di sola lettura) + un secondo form di cancellazione, entrambi con `useActionState` propri e `azionePending` condiviso — stesso stato in cui si trovava `SlotRow.tsx` prima della Story 15.5.
- **`app/(onboarding-import)/precaricamento-allenatori/page.tsx`** (stato attuale): `<div className={styles.lista}>` che mappa `allenatori.map(a => <AllenatoreRow .../>)`, sezione "Nuovo Allenatore" invariata sopra. Va convertito a `<table>` (Task 3).
- **`app/(onboarding-import)/precaricamento-allenatori/actions.ts`**: `precaricaAllenatore`/`aggiornaAllenatore`/`cancellaAllenatore`, tutte già corrette e complete (Story 9.9) — **nessuna modifica**, AC #4 lo richiede esplicitamente. `cancellaAllenatore` blocca già la cancellazione se l'Allenatore è agganciato a un account o assegnato a un Gruppo (messaggio d'errore cumulativo mostrato dentro il form, comportamento da preservare identico).
- **`app/(onboarding-import)/precaricamento-allenatori/NuovoAllenatoreForm.tsx`**: importa lo stesso `precaricamento-allenatori.module.css` — non toccare, ma verificare che nessuna classe rimossa/ricolorata nel Task 4 lo influenzi (stesso controllo già fatto per `NuovoSlotForm.tsx` in Story 15.5 review, dove l'affermazione "nessun altro file importa questo CSS module" si era rivelata imprecisa).
- **`app/(orari-palestre)/slot/SlotRow.tsx`** + **`page.tsx`** + **`slot.module.css`**: precedente diretto del pattern riga-tabella-toggle-modifica con icone, incluse tutte le lezioni di code review già applicate (Story 15.5).

### Project Structure Notes

- Nuovo file: `app/icone-azione-riga.tsx` (icone condivise).
- Modificati: `app/(orari-palestre)/slot/SlotRow.tsx` (refactor: icone locali → import dal modulo condiviso), `app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx` (riscritto), `app/(onboarding-import)/precaricamento-allenatori/page.tsx` (markup lista→tabella), `app/(onboarding-import)/precaricamento-allenatori/precaricamento-allenatori.module.css` (nuove classi tabella/icona, rimozione classi card se orfane).
- Nessuna modifica a `app/(onboarding-import)/precaricamento-allenatori/actions.ts`, `NuovoAllenatoreForm.tsx` (AC #3/#4).

### References

- [Source: epics.md#Epic 9: Miglioramenti Post-Rilascio, Story 9.30] — AC originali, aggiornate in questa sessione con la decisione di redesign completo (2026-08-05).
- [Source: app/(orari-palestre)/slot/SlotRow.tsx, page.tsx, slot.module.css] — precedente diretto del pattern riga-tabella-toggle-modifica con icone (Story 15.5), letto per intero.
- [Source: app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx, page.tsx, actions.ts, NuovoAllenatoreForm.tsx, precaricamento-allenatori.module.css] — stato attuale da modificare, letto per intero.
- [Source: _bmad-output/implementation-artifacts/15-5-redesign-pagina-slot.md] — story precedente, lezioni dirette di code review da applicare proattivamente qui (touch target 44px, aria-label/title sui pulsanti-icona, aria-label su Salva).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno.

### Completion Notes List

- Implementate tutte e 4 le AC/5 Task della story: icone matita/cestino estratte in `app/icone-azione-riga.tsx` (secondo consumer reale, `SlotRow.tsx` refactorizzato per importarle invece di definirle localmente — refactor puro verificato con `tsc`/`eslint`/suite completa).
- `AllenatoreRow.tsx` riscritto da `<article>` card sempre espansa a coppia di `<tr>` (sola lettura + modifica condizionale), riusando **esattamente** il pattern di `PartitaRow.tsx`/`SlotRow.tsx` — nessuna modifica a `actions.ts` (AC #4).
- Lezioni della code review di Story 15.5 applicate **proattivamente fin dalla stesura** (non scoperte in review questa volta): touch target 44px su `.iconaBottone` fin da subito, `title` oltre ad `aria-label` sui pulsanti-icona, `aria-label` su "Salva" mai perso.
- `page.tsx` ristrutturata da lista di card a tabella (AC #1), sezione "Nuovo Allenatore" invariata in cima (AC #3). Aggiunto messaggio "elenco vuoto" per coerenza con `/slot`/`/palestre` (non richiesto esplicitamente ma a costo marginale).
- **Attenzione CSS non banale**: `.campo` è condiviso con `NuovoAllenatoreForm.tsx`, che lo usa **fuori** da un contenitore `.campiRiga` (impilato verticalmente). Applicare `flex: 1 1 150px` direttamente su `.campo` (come fatto in `slot.module.css`, dove *ogni* uso di `.campo` è già dentro `.campiRiga`) avrebbe distorto `NuovoAllenatoreForm.tsx` (flex-grow in un contenitore a colonna avrebbe fatto crescere i campi in altezza). Risolto con un selettore annidato (`.campiRiga .campo`), lasciando la regola base `.campo` invariata — `NuovoAllenatoreForm.tsx` verificato esplicitamente, nessun impatto.
- `.card`/`.lista`/`.stato` rimosse (orfane dopo il redesign, verificato che `NuovoAllenatoreForm.tsx` non le usasse). `.bottoneSecondario` riportato a colore neutro (ora "Annulla").
- Nessun nuovo test — stessa convenzione già stabilita (nessun test di rendering per `PartitaRow.tsx`/`SlotRow.tsx`, coerente).
- 934/934 test Vitest passati (nessuna regressione dal refactor di `SlotRow.tsx`), `eslint`/`tsc --noEmit` puliti, `npm run build` riuscita con sia `/precaricamento-allenatori` sia `/slot` tra le route generate.
- Verifica dal vivo non eseguibile in questo ambiente sandbox — stesso limite delle storie precedenti.

### File List

**Nuovi:**
- `app/icone-azione-riga.tsx` (icone `IconaModifica`/`IconaCancella` condivise, estratte da `SlotRow.tsx`)

**Modificati:**
- `app/(orari-palestre)/slot/SlotRow.tsx` (refactor: icone locali → import dal modulo condiviso, nessun cambio di comportamento)
- `app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx` (riscritto: card sempre espansa → riga tabellare con toggle sola-lettura/modifica, icone condivise)
- `app/(onboarding-import)/precaricamento-allenatori/page.tsx` (markup lista di card → tabella, aggiunto messaggio elenco vuoto; review: tabella avvolta in wrapper `overflow-x: auto`)
- `app/(onboarding-import)/precaricamento-allenatori/precaricamento-allenatori.module.css` (nuove classi tabella/icona-bottone/campiRiga, rimosse `.card`/`.lista`/`.stato`, `.bottoneSecondario` riportato a colore neutro; review: nuova classe `.tabellaScroll`)

## Change Log

- 2026-08-05: Story implementata (Task 1-5 completi). Interfaccia di `/precaricamento-allenatori` compattata: `AllenatoreRow.tsx` riscritto da card-sempre-espansa a riga tabellare con toggle sola-lettura/modifica, riusando il pattern già stabilito da `PartitaRow.tsx`/`SlotRow.tsx` (decisione di redesign completo, non solo campi in linea, confermata esplicitamente dall'utente in fase di creazione story). Icone matita/cestino estratte in un modulo condiviso `app/icone-azione-riga.tsx` (secondo consumer reale, `SlotRow.tsx` refactorizzato di conseguenza). Lezioni di code review di Story 15.5 (touch target 44px, title/aria-label sui pulsanti-icona) applicate proattivamente fin dalla stesura, non scoperte in review. Nessuna modifica alla logica di `aggiornaAllenatore`/`cancellaAllenatore` (AC #4). Attenzione CSS: `.campo` condiviso con `NuovoAllenatoreForm.tsx` fuori da `.campiRiga` — risolto con selettore annidato per non distorcere quel form. 934/934 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: review.
- 2026-08-05: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Nessuna violazione degli AC (Acceptance Auditor: tutte e 4 le AC verificate indipendentemente, incluso il refactor delle icone byte-per-byte identico). 1 patch applicato: tabella avvolta in un wrapper `overflow-x: auto` (`.tabellaScroll`) — la riga può eccedere un viewport mobile stretto, stesso gap presente anche in `/slot` (deferito come follow-up simmetrico). 4 defer: errore di validazione non azzerato da "Annulla" e nessuna gestione del focus — entrambi identificati indipendentemente da 2 layer, stesso pattern condiviso già deferito per `SlotRow.tsx`/`PartitaRow.tsx` in Story 15.5, ora presente in un **terzo** componente (fix comune preferibile a patch locali scoordinate); `/slot` privo dello stesso wrapper di scroll orizzontale; asimmetria cosmetica minore nel posizionamento dell'errore di cancellazione. 9 osservazioni dismesse come rumore/pre-esistente/convenzioni già accettate. 934/934 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: done.
