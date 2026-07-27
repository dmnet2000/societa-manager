---
baseline_commit: c7c4ff8a8daf53e109998e92b879318008799da3
---

# Story 9.9: Gestione Allenatori precaricati (vista, modifica, cancellazione)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin (o Dirigente, stesso perimetro già usato da `precaricaAllenatore`),
I want vedere l'elenco di tutti gli Allenatori (precaricati e già registrati), poterne modificare Nome/Cognome/Codice Fiscale, e cancellare quelli inseriti per errore,
so that posso correggere un precaricamento sbagliato (es. Codice Fiscale digitato male, doppione) senza dover intervenire manualmente sul database.

## Acceptance Criteria

1. **Given** la pagina `/precaricamento-allenatori` **When** un Admin o Dirigente la visualizza **Then** vede, oltre al form di creazione già esistente, un elenco di tutti gli Allenatori esistenti con Nome, Cognome, Codice Fiscale e se sono già agganciati a un account oppure ancora solo precaricati
2. **Given** un Admin o Dirigente modifica Nome, Cognome o Codice Fiscale di un Allenatore dall'elenco **When** salva **Then** i nuovi valori vengono persistiti, con la stessa validazione già usata per il precaricamento (campi obbligatori, Codice Fiscale nel formato valido e non duplicato su un altro Allenatore)
3. **Given** un Allenatore non ancora agganciato a nessun account e non assegnato a nessun Gruppo **When** un Admin o Dirigente lo cancella **Then** l'Allenatore viene rimosso dall'elenco
4. **Given** un Allenatore già agganciato a un account e/o assegnato a uno o più Gruppi **When** un Admin o Dirigente tenta di cancellarlo **Then** l'operazione è impedita con un messaggio che ne spiega il motivo (nessuna cancellazione silenziosa che romperebbe un aggancio o un'assegnazione esistente)
5. **And** il comportamento esistente del form di precaricamento (Story 1.4/9.5) resta identico — nessuna regressione, suite Vitest invariata

## Tasks / Subtasks

- [x] Task 1: Ristrutturare `/precaricamento-allenatori` da "pagina-form" a "pagina con elenco" (AC: #1)
  - [x] `page.tsx` diventato un Server Component async (era Client Component) con `<main><section>...form...</section><section>...elenco...</section></main>`, stesso schema di `/palestre` — rimosso `.pagina-form`/`.riquadro-form`
  - [x] Form di creazione estratto in `NuovoAllenatoreForm.tsx` (Client Component), contenuto invariato
- [x] Task 2: Query dati ed elenco (AC: #1)
  - [x] `page.tsx`: `prisma.allenatore.findMany({ orderBy: [{ nome: "asc" }, { cognome: "asc" }], include: { gruppi: true } })`
  - [x] Nuovo componente `AllenatoreRow.tsx`: card con form di modifica inline (Nome/Cognome/Codice Fiscale precompilati) + "Stato" (Registrato/Precaricato) + form separato con pulsante "Cancella"
- [x] Task 3: Server Action `aggiornaAllenatore` (AC: #2, #5)
  - [x] Stesso schema di `aggiornaPalestra`, stessa validazione di `precaricaAllenatore`
  - [x] Controllo duplicato Codice Fiscale esclude l'Allenatore in modifica (`esistente.id !== id`)
  - [x] `precaricaAllenatore` non toccata
- [x] Task 4: Server Action `cancellaAllenatore` (AC: #3, #4)
  - [x] Carica l'Allenatore con `include: { gruppi: true }`, verifica `utenteId === null` e `gruppi.length === 0` prima di cancellare
  - [x] Messaggio specifico per ciascuna causa di blocco (agganciato vs assegnato a un Gruppo)
  - [x] `prisma.allenatore.delete()` solo nel caso sicuro
- [x] Task 5: Test (AC: #2, #3, #4, #5)
  - [x] 13 nuovi test (7 `aggiornaAllenatore`, 6 `cancellaAllenatore`) — successo, validazione, duplicato su altro Allenatore rifiutato, CF invariato sullo stesso Allenatore accettato, cancellazione riuscita/bloccata (agganciato/assegnato), Allenatore inesistente, fallimento DB
  - [x] Bug scoperto durante la scrittura dei test: `beforeEach` era annidato solo dentro `describe("precaricaAllenatore")`, non resettava i mock condivisi per i nuovi blocchi `describe` — spostato a livello di modulo
  - [x] Test esistenti di `precaricaAllenatore` invariati e passanti (AC #5)
- [x] Task 6: Regressione (AC: #5)
  - [x] Suite Vitest completa: 557/557 passati (538 baseline + ~19 nuovi/estesi), zero regressioni
  - [x] `npx tsc --noEmit` ed `eslint` sui file toccati: 0 errori

### Review Findings

- [x] [Review][Decision] Nessuna conferma prima della cancellazione irreversibile — è il primo hard-delete di un'entità di dominio in questo progetto, e oggi basta un click sul pulsante "Cancella" (nessun `window.confirm`, nessun secondo passaggio). I Dev Notes originali giustificavano questa scelta con "nessun pattern del genere esiste altrove nel progetto" — un'assenza di precedente, non un vero razionale. Vuoi aggiungere una conferma (es. un semplice `window.confirm()` nativo del browser, l'opzione più leggera) prima di procedere con la cancellazione, o lasciare così com'è (l'unica protezione resta il guard-clause server-side)? — risolto: aggiunto `window.confirm()` sul form di cancellazione in `AllenatoreRow.tsx`.
- [x] [Review][Patch] Race condition (TOCTOU) reale in `cancellaAllenatore` [app/(onboarding-import)/precaricamento-allenatori/actions.ts] — il controllo (`findUnique`) e la cancellazione (`delete`) sono due round-trip separati: un'assegnazione a un Gruppo o un aggancio account che avviene nella finestra tra i due passa inosservato e la cancellazione procede comunque, causando esattamente il danno silenzioso che il guard-clause doveva prevenire — risolto: sostituito con `deleteMany({ where: { id, utenteId: null, gruppi: { none: {} } } })` atomico, `findUnique` usato solo per costruire il messaggio quando `count === 0`.
- [x] [Review][Patch] `include: { gruppi: true }` nella query di `page.tsx` non è mai usato — né `AllenatoreRow` lo riceve/legge, né serve a `cancellaAllenatore` (che rilegge autonomamente) [app/(onboarding-import)/precaricamento-allenatori/page.tsx] — risolto: rimosso.
- [x] [Review][Patch] Messaggio di blocco cancellazione non cumulativo — se un Allenatore è sia agganciato sia assegnato a un Gruppo, viene riportata solo la prima causa (AC #4 usa "e/o") [app/(onboarding-import)/precaricamento-allenatori/actions.ts] — risolto: messaggio aggregato con entrambi i motivi quando entrambi veri.
- [x] [Review][Patch] Nessuna etichetta accessibile che distingua i pulsanti "Salva"/"Cancella" ripetuti su ogni riga dell'elenco — stesso tipo di correzione già applicata in Story 9.6 per i link "Naviga" ripetuti [app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx] — risolto: `aria-label` con nome completo su entrambi i pulsanti.
- [x] [Review][Patch] Nessuna protezione da doppio invio: i pulsanti "Salva" e "Cancella" della stessa riga non si disabilitano a vicenda mentre l'altro è in corso [app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx] — risolto: `azionePending = modificaPending || cancellaPending` applicato a entrambi i pulsanti.
- [x] [Review][Patch] Tipo di stato condiviso `PrecaricaAllenatoreState` riusato per `aggiornaAllenatore`/`cancellaAllenatore` — nome fuorviante (parla di "precaricamento", non di modifica/cancellazione) [app/(onboarding-import)/precaricamento-allenatori/actions.ts] — risolto: rinominato in `AllenatoreActionState`.
- [x] [Review][Defer] Race TOCTOU sul Codice Fiscale duplicato in `aggiornaAllenatore` [app/(onboarding-import)/precaricamento-allenatori/actions.ts] — deferred, stesso pattern pre-esistente già deferito per `precaricaAllenatore` (code review Story 9.5)
- [x] [Review][Defer] Messaggio "Riprova" fuorviante quando l'Allenatore non esiste più al momento della cancellazione (pagina non aggiornata, cancellato da un altro Admin nel frattempo) [app/(onboarding-import)/precaricamento-allenatori/actions.ts] — deferred, percorso raro, impatto basso
- [x] [Review][Defer] Nessuna restrizione sulla modifica del Codice Fiscale di un Allenatore già "Registrato" — rischio speculativo di disallineamento dell'identità usata per il matching, nessun AC lo vieta esplicitamente [app/(onboarding-import)/precaricamento-allenatori/actions.ts] — deferred
- [x] [Review][Defer] Nessuna paginazione sull'elenco Allenatori — deferred, coerente con la stessa scelta già deliberata altrove nel progetto (`/palestre`, `/admin`) per la scala ridotta di NFR5

## Dev Notes

- **Vincolo architetturale principale (già catturato in `epic-9-context.md`)**: in questo progetto nessuna entità viene mai cancellata realmente — il pattern esistente per "rimuovere" qualcosa è un flag `attivo` con disattiva/riattiva (`Utente.attivo`, Story 1.2, vedi `UtenteRow.tsx`/`admin/actions.ts` per il pattern UI). L'unico uso di `.delete()`/`deleteMany()` nel codice riguarda righe di giunzione (`UtenteRuolo`, `GruppoVisibileDirigente`), mai un record di dominio reale. Questa storia introduce il **primo** hard-delete di un'entità di dominio — per questo l'AC #4 lo confina esplicitamente al solo caso in cui non ci sia nulla da rompere (nessun aggancio, nessuna assegnazione).
- **Perché il guard-clause del Task 4 è obbligatorio, non opzionale**: `GruppoAllenatore.allenatoreId` ha `onDelete: Cascade` (`prisma/schema.prisma`) — cancellare un Allenatore assegnato a un Gruppo rimuoverebbe silenziosamente quella riga di assegnazione. Un Allenatore già agganciato (`utenteId` non nullo, si è registrato con `registrati/actions.ts`, righe ~248-251: `prisma.allenatore.update({ data: { utenteId: utente.id } })`) verrebbe scollegato silenziosamente dal proprio account se cancellato. Nessuna delle due deve mai accadere senza un avviso esplicito.
- **Ruolo**: stesso perimetro già usato da `precaricaAllenatore` (`requireRuolo(["ADMIN", "DIRIGENTE"])`) — non solo ADMIN. "Lato admin" nella richiesta originale dell'utente è inteso come "area di amministrazione", non come restrizione di Ruolo aggiuntiva; se in fase di sviluppo emergesse il dubbio, confermare con l'utente prima di restringere.
- **Pattern Server Action da replicare esattamente**: `aggiornaPalestra` (`app/(orari-palestre)/palestre/actions.ts`) per la struttura di `aggiornaAllenatore` (id + campi, validazione, try/catch, `revalidatePath`); `precaricaAllenatore` (stesso file di questa storia) per il pattern di validazione Nome/Cognome/Codice Fiscale da riusare identico.
- **`trovaAllenatorePerCodiceFiscale`** (`lib/matching-codice-fiscale/`) è già usata da `precaricaAllenatore` per il controllo duplicati — riusarla anche in `aggiornaAllenatore`, ma con l'accortezza del confronto `id` descritta nel Task 3 (altrimenti un Admin non potrebbe mai risalvare un Allenatore senza cambiargli il Codice Fiscale).
- **Nessuna conferma JS (`window.confirm`) per la cancellazione**: nessun pattern di dialogo di conferma esiste altrove nel progetto (coerente con l'approccio server-rendered/minima interattività) — il guard-clause server-side è già la protezione reale; aggiungerne uno lato client sarebbe un pattern nuovo non richiesto da alcun AC.
- **`Allenatore` non è protetta da RLS (AD-9)** — Prisma diretto, coerente con `precaricaAllenatore` esistente, nessun client `lib/db-rls/` da introdurre.
- **Fuori perimetro esplicito**: l'asimmetria `Allenatore` (avrà presto un flag di stato più ricco tramite questa storia) vs `Atleta` (resta solo con `nome`/senza gestione elenco equivalente) è nota e accettata, non va estesa qui.

### Project Structure Notes

- Nuovo file: `app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx`.
- File modificati: `page.tsx` (ristrutturazione layout, Task 1-2), `actions.ts` (+2 Server Action), `actions.test.ts`, `precaricamento-allenatori.module.css` (nuove classi per l'elenco — riusare lo stile di `gruppi.module.css`/`admin.module.css` per tabella/righe/pulsanti compatti, non inventarne uno nuovo).
- Nessuna migrazione (nessuna modifica allo schema — questa storia opera solo su righe esistenti di `Allenatore`, già esteso da Story 9.5).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.9: Gestione Allenatori precaricati (vista, modifica, cancellazione)]
- [Source: _bmad-output/implementation-artifacts/epic-9-context.md — vincolo hard-delete, FK Cascade]
- [Source: app/(onboarding-import)/precaricamento-allenatori/actions.ts, actions.test.ts, page.tsx — Story 1.4/9.5, da estendere non riscrivere]
- [Source: app/(orari-palestre)/palestre/actions.ts, PalestraRow.tsx, page.tsx — pattern elenco+modifica inline da replicare]
- [Source: app/(amministrazione)/admin/UtenteRow.tsx, actions.ts — pattern disattiva/riattiva, per lo stile della colonna "Stato"]
- [Source: app/(onboarding-import)/registrati/actions.ts:248-251 — dove `Allenatore.utenteId` viene impostato al momento dell'aggancio]
- [Source: prisma/schema.prisma#model Allenatore, model GruppoAllenatore — `onDelete: Cascade`]
- [Source: _bmad-output/implementation-artifacts/9-3-*, DESIGN.md — pattern "pagina-form" escluso per le pagine-tabella]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ruolo confermato invariato (`ADMIN`, `DIRIGENTE`) per entrambe le nuove Server Action, coerente con `precaricaAllenatore` esistente — nessuna restrizione aggiuntiva applicata senza conferma esplicita dell'utente.
- Decisione sulla cancellazione applicata esattamente come raccomandato in Dev Notes: bloccata se agganciato a un account e/o assegnato a un Gruppo, libera altrimenti — nessuna conferma JS lato client (nessun precedente nel progetto).
- Bug pre-esistente nel file di test scoperto e corretto durante questa storia: `beforeEach` era annidato solo nel primo `describe`, i mock non venivano resettati per gli altri — spostato a livello di modulo.
- Code review (2026-07-27): applicati 1 decisione + 6 patch, deferiti 4 elementi (vedi `deferred-work.md`). Decisione: aggiunto `window.confirm()` prima della cancellazione. Patch: race TOCTOU risolta con `deleteMany` atomico, `include: { gruppi: true }` inutilizzato rimosso da `page.tsx`, messaggio di blocco cancellazione ora cumulativo (entrambi i motivi se entrambi veri), `aria-label` aggiunto ai pulsanti Salva/Cancella per riga, doppio invio bloccato disabilitando entrambi i pulsanti mentre una delle due azioni è in corso, tipo `PrecaricaAllenatoreState` rinominato in `AllenatoreActionState`. Regressione completa dopo i patch: 558/558 test, `tsc --noEmit` pulito, ESLint pulito.

### File List

- `app/(onboarding-import)/precaricamento-allenatori/page.tsx` (riscritto — da Client a Server Component)
- `app/(onboarding-import)/precaricamento-allenatori/NuovoAllenatoreForm.tsx` (nuovo — form estratto da page.tsx)
- `app/(onboarding-import)/precaricamento-allenatori/AllenatoreRow.tsx` (nuovo)
- `app/(onboarding-import)/precaricamento-allenatori/actions.ts` (modificato — +`aggiornaAllenatore`, +`cancellaAllenatore`)
- `app/(onboarding-import)/precaricamento-allenatori/actions.test.ts` (modificato)
- `app/(onboarding-import)/precaricamento-allenatori/precaricamento-allenatori.module.css` (modificato)

## Change Log

- 2026-07-27: Implementata Story 9.9 — elenco Allenatori con modifica inline e cancellazione (confinata al caso sicuro: non agganciato, non assegnato a un Gruppo) in `/precaricamento-allenatori`, ora ristrutturata da pagina-form a pagina con elenco (Server Component). 557/557 test passati.
- 2026-07-28: Code review chiusa — 1 decisione + 6 patch applicati (conferma cancellazione, race TOCTOU, include inutilizzato, messaggio cumulativo, aria-label, doppio invio, rinomina tipo condiviso), 4 elementi deferiti. 558/558 test passati.
