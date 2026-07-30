---
baseline_commit: 3367431da0936a7d0da091cfa173dfd949b03afa
---

# Story 9.14: Rimozione di un'Atleta da un Gruppo

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente,
I want poter rimuovere un'Atleta da un Gruppo a cui è stata assegnata per errore,
so that posso correggere un'assegnazione sbagliata senza dover intervenire manualmente sul database.

**Note aggiuntive:** oggi (`/gruppi`, Story 2.4) esiste solo `assegnaAtleta` (`app/(gruppi-allenatori)/gruppi/actions.ts`) — nessuna azione di rimozione, `GruppoRow.tsx` mostra le Atlete assegnate come semplice testo (`<li>{atleta.nome}</li>`, nessuna interattività). `GruppoAtleta` è una tabella di giunzione pura (`@@unique([atletaId, annoAgonisticoId])`, un'Atleta sta in un solo Gruppo per stagione, **nessuna riga dipendente altrove nello schema**) — rimuoverla è sicuro, stesso principio già stabilito per le altre tabelle di giunzione del progetto (`UtenteRuolo`, `GruppoVisibileDirigente`): **non** è il problema di hard-delete di un'entità di dominio già affrontato in Story 9.9 per `Allenatore` (qui non si cancella l'Atleta, solo il suo collegamento al Gruppo) né il problema di storico riscritto affrontato in Story 9.13 per `Slot` (nessuna Presenza dipende da `GruppoAtleta`).

## Acceptance Criteria

1. **Given** un'Atleta assegnata a un Gruppo **When** un Admin o Dirigente la rimuove dall'elenco delle Atlete di quel Gruppo **Then** l'assegnazione viene rimossa (riga `GruppoAtleta` cancellata) — l'Atleta resta nell'anagrafica e può essere riassegnata a un altro Gruppo nella stessa stagione
2. **And** nessuna regressione sul comportamento esistente di assegnazione Atleta a Gruppo (Story 2.4) — suite Vitest invariata, stesso perimetro di Ruoli (ADMIN/DIRIGENTE) di `assegnaAtleta`

## Tasks / Subtasks

- [x] Task 1: Server Action `rimuoviAtleta` (AC: #1)
  - [x] `rimuoviAtleta` — `requireRuolo(["ADMIN","DIRIGENTE"])`, validazione `gruppoId`/`atletaId`, stesso blocco di risoluzione `annoAgonisticoId` di `assegnaAtleta` riusato invariato
  - [x] `prisma.gruppoAtleta.deleteMany({ where: { atletaId, annoAgonisticoId, gruppoId } })` — idempotente, nessun guard aggiuntivo necessario
  - [x] `revalidatePath("/gruppi")`, stesso `GruppoActionState` esistente
  - [x] TDD: 8 nuovi test scritti falliti prima dell'implementazione, 27/27 test del file passati dopo (19 esistenti invariati + 8 nuovi)
- [x] Task 2: UI — pulsante di rimozione per Atleta nell'elenco (AC: #1)
  - [x] Nuovo `app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx` — `useActionState(rimuoviAtleta, undefined)` indipendente per Atleta, `window.confirm` prima dell'invio, stesso stile di `AllenatoreRow.tsx`/`SlotRow.tsx`
  - [x] `aria-label` sul pulsante con nome Atleta + nome Gruppo
  - [x] `GruppoRow.tsx` usa `<AtletaAssegnata>` invece del `<li>` semplice
  - [x] Nuove classi `.atletaAssegnata`/`.bottoneRimuovi` in `gruppi.module.css`, riuso di `.listaAssegnati`/`.errore` esistenti
- [x] Task 3: Test (AC: #1)
  - [x] 8 nuovi test per `rimuoviAtleta` (FORBIDDEN, validazione, Gruppo non trovato, rimozione riuscita, idempotenza su count 0, errori INTERNAL su entrambe le query)
  - [x] 19/19 test esistenti di `assegnaAtleta`/`assegnaAllenatore`/`creaGruppo` passati invariati
- [x] Task 4: Test e regressione (AC: #2)
  - [x] Suite Vitest completa: 707/707 test passati (63 file)
  - [x] `npx tsc --noEmit` ed ESLint puliti su tutti i file nuovi/modificati
  - [ ] Nessun test di rendering per `AtletaAssegnata.tsx`/`GruppoRow.tsx`, coerente con la convenzione già stabilita nel progetto

### Review Findings

- [x] [Review][Patch] `.bottoneRimuovi` (`padding: 1px var(--space-2); font-size: 11px`) è molto più piccolo del target touch accessibile — coincide con una lezione già documentata in questo progetto (min-height/align-self non bastano, il figlio cliccabile resta più piccolo) [app/(gruppi-allenatori)/gruppi/gruppi.module.css] — su un tablet a bordo campo (il contesto d'uso reale di questa app) un tocco su "Rimuovi" accanto a un elenco di nomi con `flex-wrap` rischia concretamente di colpire il nome adiacente o il pulsante sbagliato. **Risolto**: padding/font-size allineati a `.bottoneCompatto` (già lo standard compatto minimo di questa pagina).
- [x] [Review][Patch] Tipo `Atleta` (`{ id: string; nome: string }`) ridichiarato indipendentemente sia in `GruppoRow.tsx` sia in `AtletaAssegnata.tsx` — nessuna fonte di verità condivisa, un futuro campo aggiunto a uno dei due potrebbe disallinearsi silenziosamente dall'altro senza alcun segnale del compilatore. **Risolto**: `Atleta` esportato da `AtletaAssegnata.tsx`, `GruppoRow.tsx` lo importa invece di ridichiararlo.
- [x] [Review][Defer] `deleteMany` ritorna comunque `{ success: true }` anche quando `count` è 0 perché l'Atleta è stata riassegnata a un altro Gruppo tra il caricamento della pagina e il click — l'utente non riceve alcun errore ma l'operazione non ha fatto nulla (form ormai stantio) [app/(gruppi-allenatori)/gruppi/actions.ts] — deferred, stessa classe di ambiguità già accettata in Story 9.13 per `cancellaSlot`/`aggiornaSlot` su una riga cancellata concorrentemente.
- [x] [Review][Defer] Nessun coordinamento tra "Assegna Atleta" (form nella stessa riga) e "Rimuovi" per Atleta — `atleteDisponibili` non è filtrata per escludere le Atlete già assegnate a quel Gruppo (comportamento pre-esistente da Story 2.4, l'upsert di `assegnaAtleta` lo rende comunque sicuro), e i due `pending` non sono condivisi come in `AllenatoreRow.tsx`/`SlotRow.tsx` — un Admin che rimuove e riassegna la stessa Atleta quasi simultaneamente può incorrere in un esito arbitrario in base all'ordine di arrivo delle due richieste [app/(gruppi-allenatori)/gruppi/GruppoRow.tsx, AtletaAssegnata.tsx] — deferred, stessa classe di race a bassa probabilità (singolo Admin, azione volontaria doppia) già tollerata altrove nel progetto.
- [x] [Review][Defer] `console.error(err)` senza alcun identificativo (`gruppoId`/`atletaId`) per correlare un errore in produzione con la chiamata che l'ha causato [app/(gruppi-allenatori)/gruppi/actions.ts] — deferred, stessa convenzione identica in ogni altra Server Action del progetto, non introdotta qui.
- [x] [Review][Defer] Nessun `aria-busy`/testo "in corso" oltre a `disabled` durante la rimozione [app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx] — deferred, stessa convenzione già presente in ogni altro Client Component del progetto.
- [x] [Review][Defer] `revalidatePath("/gruppi")` fuori dal blocco `try/catch` della `deleteMany` — se lanciasse, l'eccezione non gestita si propagherebbe invece del contratto `{ error }` [app/(gruppi-allenatori)/gruppi/actions.ts] — deferred, stessa identica collocazione già usata in ogni altra Server Action del progetto (mai avvolta lì), non introdotta qui.
- [x] [Review][Defer] `window.confirm` è bypassabile da una sottomissione del form non innescata dall'evento React `onSubmit` (es. `form.submit()` diretto) [app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx] — deferred, stesso identico limite già presente nel pattern replicato (`AllenatoreRow.tsx`/`SlotRow.tsx`, Story 9.9/9.13), non introdotto qui.
- [x] [Review][Defer] Il messaggio di errore precedente resta visibile mentre un nuovo tentativo è `pending`, prima che `useActionState` risolva col nuovo stato [app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx] — deferred, comportamento intrinseco dello stesso pattern `useActionState` già usato identico in ogni altro Client Component del progetto.
- [x] [Review][Defer] `String(formData.get(...) ?? "")` non verifica che il valore non sia un `File` (submission manomessa/multipart) [app/(gruppi-allenatori)/gruppi/actions.ts] — deferred, stessa identica conversione già usata in ogni altra Server Action del progetto, non introdotta qui.
- [x] [Review][Defer] `aria-label` identico per due Atlete con lo stesso `nome` nello stesso Gruppo [app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx] — deferred, l'elenco mostra solo `nome` (mai `cognome`) fin da Story 2.4, stessa ambiguità di visualizzazione pre-esistente, non introdotta da questa storia.
- [x] [Review][Dismiss] Il testo di conferma non include "l'operazione non è reversibile" a differenza di `AllenatoreRow.tsx`/`SlotRow.tsx` — falso positivo: a differenza di quei due casi (hard-delete/blocco storico), rimuovere un'Atleta da un Gruppo **è** riassegnabile in qualunque momento (AC #1 lo dice esplicitamente), quindi l'omissione è più accurata, non un difetto.
- [x] [Review][Dismiss] `gruppoNome` passato come snapshot per riga potrebbe risultare stantio se un futuro Gruppo venisse rinominato mentre una rimozione è in corso — speculativo, nessuna funzionalità di rinomina Gruppo esiste oggi in questo progetto.

## Dev Notes

- **`GruppoAtleta` è sicura da cancellare**: a differenza di `Allenatore` (Story 9.9, hard-delete di un'entità di dominio, bloccato se agganciata a un account o assegnata a un Gruppo) e di `Slot` (Story 9.13, bloccato se ha Presenze registrate per non riscrivere lo storico), `GruppoAtleta` è una pura tabella di giunzione senza alcuna riga dipendente altrove nello schema (verificato in `prisma/schema.prisma`) — cancellarla non cancella l'Atleta né perde alcuno storico. Nessun guard/blocco condizionale necessario in questa storia.
- **Riuso obbligatorio, non reinventare**:
  - `assegnaAtleta` (`app/(gruppi-allenatori)/gruppi/actions.ts` righe 104-165, Story 2.4) — stessa validazione `gruppoId`/`atletaId`, stesso blocco di risoluzione `annoAgonisticoId` del Gruppo (righe 121-140), stesso perimetro di Ruoli.
  - `AllenatoreRow.tsx`/`SlotRow.tsx` (Story 9.9/9.13) — pattern esatto di `window.confirm` prima di un invio distruttivo, `aria-label` con nome per distinguere pulsanti identici su più righe.
  - `GruppoRow.tsx` (Story 2.2/2.3/2.4) — struttura esistente della cella Atlete da modificare, `.listaAssegnati` già esistente in `gruppi.module.css`.
- **Perché un componente separato (`AtletaAssegnata.tsx`) e non un'estensione inline di `GruppoRow.tsx`**: React vieta di chiamare Hook (`useActionState`) dentro un ciclo — ogni Atleta nell'elenco ha bisogno del proprio stato di azione indipendente (una rimozione in corso su un'Atleta non deve bloccare le altre), quindi serve un componente montato una volta per Atleta, non un `useActionState` condiviso a livello di `GruppoRow`.
- **Stesso perimetro di Ruoli**: `ADMIN`/`DIRIGENTE`, identico ad `assegnaAtleta` e alla rotta `/gruppi` già protetta (`lib/auth/route-guard.ts`) — nessuna modifica al route-guard necessaria. La Story 9.15 (separata, backlog) estenderà l'assegnazione (non la rimozione) anche all'Allenatore sul proprio Gruppo — **fuori scope qui**, non anticiparla.
- **File NON da toccare**: `app/(gruppi-allenatori)/gruppi/NuovoGruppoForm.tsx`, tutta la sezione Allenatori di `GruppoRow.tsx` (solo la sezione Atlete cambia).

### Project Structure Notes

- File nuovi: `app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx`.
- File modificati: `app/(gruppi-allenatori)/gruppi/actions.ts` (nuova `rimuoviAtleta`), `app/(gruppi-allenatori)/gruppi/actions.test.ts` (nuovi test), `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx` (usa `AtletaAssegnata` invece di `<li>` semplice), `app/(gruppi-allenatori)/gruppi/gruppi.module.css` (nuova classe pulsante rimozione).
- Nessuna migrazione — `GruppoAtleta` esiste già invariata.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.14 — Acceptance Criteria]
- [Source: app/(gruppi-allenatori)/gruppi/actions.ts righe 104-165 — assegnaAtleta, pattern di risoluzione annoAgonisticoId e validazione da riusare identico]
- [Source: app/(gruppi-allenatori)/gruppi/GruppoRow.tsx righe 104-109 — cella Atlete da modificare]
- [Source: app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx — pattern window.confirm/aria-label, Story 9.9]
- [Source: app/(orari-palestre)/slot/SlotRow.tsx — stesso pattern più recente, Story 9.13]
- [Source: prisma/schema.prisma — model GruppoAtleta (righe 484-496), nessuna riga dipendente altrove]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno — implementazione lineare, nessun problema incontrato.

### Completion Notes List

- Task 1: `rimuoviAtleta` riusa esattamente il blocco di risoluzione `annoAgonisticoId` già presente in `assegnaAtleta`, cancellazione idempotente via `deleteMany` (nessun guard di blocco necessario, `GruppoAtleta` non ha righe dipendenti). TDD: 8 test scritti falliti prima dell'implementazione.
- Task 2: `AtletaAssegnata.tsx` — componente separato per Atleta (necessario per un `useActionState` indipendente per riga, non estendibile in un ciclo dentro `GruppoRow.tsx`), stesso pattern `window.confirm`/`aria-label` di `AllenatoreRow.tsx`/`SlotRow.tsx` (Story 9.9/9.13).
- Task 3/4: 707/707 test passati, `tsc --noEmit` ed ESLint puliti sui file di questa storia.
- Code review (2026-07-29): Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo. Acceptance Auditor: 0 violazioni sui 2 AC. 0 decision-needed. 2 patch applicati (`.bottoneRimuovi` era molto più piccolo di un target touch accessibile — coincideva con una lezione già documentata in questo progetto, allineato a `.bottoneCompatto`; tipo `Atleta` ridichiarato indipendentemente in due file, ora esportato da `AtletaAssegnata.tsx` e importato in `GruppoRow.tsx`). 9 defer (tutti pre-esistenti/già accettati nei pattern di Story 2.4/9.9/9.13 — nessun coordinamento tra Assegna/Rimuovi, messaggio di successo anche su count 0, log senza identificativi, nessun aria-busy, revalidatePath fuori da try/catch, window.confirm bypassabile, messaggio d'errore stantio durante un retry, formData.get non verifica File, aria-label duplicato per nomi identici). 2 scartati come falsi positivi (testo di conferma senza "non reversibile" — l'azione è correttamente riassegnabile, non un hard-delete; gruppoNome stantio su un'ipotetica funzione di rinomina Gruppo che non esiste). 707/707 test passati, `tsc --noEmit` ed ESLint puliti dopo i fix.

### File List

- `app/(gruppi-allenatori)/gruppi/actions.ts` (modificato — nuova `rimuoviAtleta`)
- `app/(gruppi-allenatori)/gruppi/actions.test.ts` (modificato — 8 nuovi test)
- `app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx` (nuovo, poi corretto in code review — tipo `Atleta` esportato)
- `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx` (modificato — usa `AtletaAssegnata` invece del `<li>` semplice, importa `Atleta` invece di ridichiararlo)
- `app/(gruppi-allenatori)/gruppi/gruppi.module.css` (modificato — nuove classi `.atletaAssegnata`/`.bottoneRimuovi`, poi corretto in code review — dimensione del pulsante allineata a `.bottoneCompatto`)

## Change Log

- 2026-07-29: Implementata Story 9.14 — rimozione di un'Atleta da un Gruppo. Nuova Server Action `rimuoviAtleta` (idempotente, nessun guard di blocco necessario — `GruppoAtleta` è una tabella di giunzione pura senza righe dipendenti, a differenza di Allenatore/Slot nelle Story 9.9/9.13), nuovo componente `AtletaAssegnata.tsx` con pulsante di rimozione per Atleta. Nessuna migrazione. 707/707 test passati, 0 errori tsc/eslint. Status: review.
- 2026-07-29: Code review chiusa — 2 patch applicati (touch target del pulsante di rimozione, tipo `Atleta` deduplicato), 9 defer, 2 scartati. 707/707 test passati, 0 errori tsc/eslint dopo i fix. Status: done.
