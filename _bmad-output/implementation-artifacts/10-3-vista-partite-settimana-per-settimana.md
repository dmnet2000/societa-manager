---
baseline_commit: 11b6eabbb62b0e10dcc80cb6b55f4d1d866edece
---

# Story 10.3: Vista partite settimana per settimana (Allenatore, Dirigente, Admin)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore, Dirigente o Admin,
I want vedere le partite organizzate settimana per settimana,
so that posso pianificare la presenza a bordo campo e le trasferte.

**Note aggiuntive:** terza storia dell'Epic 10, dipende da Story 10.1 (`Campionato`/`GruppoCampionato`) e Story 10.2 (`Partita`, popolata dall'import Excel). Sola lettura — nessuna mutazione, nessuna Server Action, nessun Client Component richiesto. Story 10.4 (modifica singola partita) e Story 10.5 (vista Atleta/Genitore) sono storie separate successive, fuori scope qui.

## Acceptance Criteria

1. **Given** un Allenatore, Dirigente o Admin **When** visita la pagina `/partite` **Then** vede le partite raggruppate per settimana (lunedì-domenica), con giorno/ora/squadre/luogo per ciascuna
2. **Given** una Partita con `indirizzoImpianto` disponibile **When** visualizzata **Then** mostra un pulsante "Naviga" (stesso meccanismo/link di Story 9.6, `lib/link-naviga-palestra.ts`, riuso invariato)
3. **Given** un Allenatore **When** visita la pagina **Then** vede solo le partite dei Gruppi che gestisce (tramite `GruppoAllenatore`) — Admin/Dirigente vedono le partite di **tutti** i Gruppi della stagione corrente, in un'unica vista unificata (non sezioni separate per Gruppo)
4. **Given** una settimana compresa nell'intervallo tra la prima e l'ultima partita visibili, senza alcuna partita **When** visualizzata **Then** mostra un messaggio esplicito ("Nessuna partita questa settimana"), non una sezione vuota silenziosa
5. **And** nessuna regressione sul resto del comportamento esistente (Story 10.1, 10.2) — suite Vitest esistente invariata

## Tasks / Subtasks

- [x] Task 1: Route protetta `/partite` (AC: #1, #3)
  - [x] `lib/auth/route-guard.ts`: aggiunta `{ prefix: "/partite", ruoliAmmessi: ["ADMIN", "DIRIGENTE", "ALLENATORE"], navLabel: "Partite" }` a `PROTECTED_ROUTES`, subito dopo l'entry `/campionati` — stesso set di Ruoli
  - [x] `lib/auth/route-guard.test.ts`: 2 nuovi test (allow ADMIN/DIRIGENTE/ALLENATORE, redirect ATLETA/SEGRETERIA) — stesso pattern del test già esistente per `/campionati`. 55/55 test del file passati
- [x] Task 2: Utility pura di raggruppamento per settimana (AC #1, #4)
  - [x] Nuovo `lib/raggruppa-per-settimana.ts`, funzione generica `raggruppaPerSettimana<T extends { data: string; ora: string }>(partite: T[]): SettimanaPartite<T>[]` — settimane lunedì-domenica, range completo tra il lunedì minimo e massimo (incluse le settimane senza partite, `partite: []`), array vuoto in ingresso → `[]`, etichetta italiana via `toLocaleDateString("it-IT", ...)` (anno ripetuto solo se la settimana attraversa un cambio di anno, verificato con uno script Node ad-hoc: "20 ottobre - 26 ottobre 2025" vs "29 dicembre 2025 - 4 gennaio 2026")
  - [x] Nuovo `lib/raggruppa-per-settimana.test.ts` (6 test, TDD: scritti falliti prima dell'implementazione): array vuoto, settimana singola con partite ordinate, domenica assegnata al lunedì precedente, buco nel calendario con settimane intermedie vuote generate, ordinamento data+ora nella stessa settimana, etichetta a cavallo di due anni
- [x] Task 3: Pagina `/partite` (Server Component, sola lettura) (AC: #1, #2, #3, #4)
  - [x] Nuovo `app/(partite-campionati)/partite/page.tsx` — stesso identico pattern di risoluzione Ruoli/Gruppi di `campionati/page.tsx` (trova Anno corrente, risolve Ruoli/Allenatore, `filtroAllenatore`)
  - [x] Query `prisma.partita.findMany({ where: { gruppo: { annoAgonisticoId, ...filtroAllenatore } }, include: { gruppo, campionato }, orderBy: [{ data: "asc" }, { ora: "asc" }] })`, array vuoto se nessun Anno corrente
  - [x] `raggruppaPerSettimana(partite)` sul risultato, render per settimana (intestazione + tabella o messaggio "Nessuna partita questa settimana")
  - [x] Riga per Partita: data formattata (`toLocaleDateString("it-IT")`), ora, "SquadraCasa - SquadraOspite" (deciso con l'utente), Luogo (impianto + link "Naviga" via `costruisciLinkNaviga`, reso solo se non null), Gruppo, Campionato
  - [x] `export const dynamic = "force-dynamic"` aggiunto
  - [x] Nuovo `app/(partite-campionati)/partite/partite.module.css` — classi riusate da `SlotTable.module.css`/`campionati.module.css` (`.scrollWrapper`, `.tabella`, `.testo`, `.linkNaviga`) + nuove (`.settimana`, `.messaggioVuoto`)
  - [x] `npx tsc --noEmit` ed ESLint puliti sui file nuovi
- [x] Task 4: Test e regressione (AC: #5)
  - [x] Suite Vitest completa: 680/680 test passati (63 file), tutti i test esistenti invariati
  - [x] `npx tsc --noEmit` pulito; ESLint sull'intero progetto: 7 problemi residui, tutti pre-esistenti in file non toccati da questa storia (stesso conteggio già osservato in Story 10.1)
  - [x] Nessun test di rendering per `page.tsx` (Server Component, nessuna interattività client) — coerente con la convenzione già stabilita nel progetto

### Review Findings

- [x] [Review][Patch] `raggruppaPerSettimana` va in crash (`RangeError: Invalid time value`) su qualunque `Partita.data` non parsabile, e non ha alcun limite sul numero di settimane generate tra la prima e l'ultima data visibile [lib/raggruppa-per-settimana.ts] — `Partita.data` è una colonna `String` senza vincolo di formato a livello DB; `parseDataUtc`/`formattaDataIso` assumono sempre un input valido e `.toISOString()` lancia su una `Invalid Date`, abbattendo l'intera pagina `/partite` per tutti (Admin, Dirigente, ogni Allenatore) per una singola riga corrotta (modifica manuale del DB, script, un futuro percorso di import diverso da `parseDataItaliana`). Anche una data valida ma estrema (es. anno 9999) farebbe generare centinaia di migliaia di settimane, appendendo la richiesta. Rilevato indipendentemente sia da Blind Hunter sia da Edge Case Hunter. **Risolto**: righe con `data` non parsabile filtrate e scartate con un `console.error` invece di propagare l'eccezione; nuovo limite difensivo `MAX_SETTIMANE = 260` (~5 anni) tronca un intervallo aberrante — verificato dal vivo che, senza questo limite, un test con una data estrema (anno 9999) non terminava. 3 nuovi test.
- [x] [Review][Patch] Ordinamento delle partite della stessa settimana basato su confronto stringa grezzo di `ora` [lib/raggruppa-per-settimana.ts, comparator dentro `raggruppaPerSettimana`] — `lib/importa-gare/parser.ts` (`testoCella`) non normalizza/valida il formato di "Ora", solo la presenza; un valore non zero-paddato (es. "9:00" invece di "09:00") ordinerebbe lessicograficamente dopo "20:30" ("9" > "2"), violando l'ordine cronologico atteso dall'AC #1. Stesso problema anche nell'`orderBy: { ora: "asc" }` lato query, ma irrilevante ai fini dell'output finale perché `raggruppaPerSettimana` riordina comunque in memoria. **Risolto**: comparator riscritto per confrontare i minuti da mezzanotte (`oraInMinuti`, un formato non riconosciuto va in fondo invece di rompere l'ordinamento). 1 nuovo test.
- [x] [Review][Patch] Etichette di settimana/data non ancorate esplicitamente a UTC nella formattazione (`toLocaleDateString("it-IT", ...)` senza `timeZone: "UTC"`) [lib/raggruppa-per-settimana.ts `formattaEtichetta`, app/(partite-campionati)/partite/page.tsx `formattaData`] — il raggruppamento in settimane è calcolato correttamente in UTC (`getUTCDay()`), ma la sola formattazione per la UI userebbe il fuso orario locale del processo Node se diverso da UTC, potendo mostrare una data/etichetta sfalsata di un giorno rispetto ai confini `inizio`/`fine` effettivi — verificato concretamente dall'Acceptance Auditor forzando `TZ=America/New_York`. Stessa classe di bug "invisibile finché non si osserva dal vivo" già incontrata più volte in questo progetto (SSL, motore Prisma WASM, secrets Cloudflare — vedi `project_deploy_produzione.md`). **Risolto**: `timeZone: "UTC"` esplicito su entrambe le chiamate `toLocaleDateString` (etichetta di settimana e data di riga); `parseDataUtc` esportata da `lib/raggruppa-per-settimana.ts` e riusata da `page.tsx` invece di una seconda implementazione indipendente dello stesso parsing. 1 nuovo test (con `TZ=America/New_York` forzato).
- [x] [Review][Defer] Blocco di risoluzione Ruoli/Gruppo (utente, `eGestionale`, `Allenatore`, messaggio di errore) duplicato verbatim tra `campionati/page.tsx` (Story 10.1) e `partite/page.tsx`, nessun helper condiviso [app/(partite-campionati)/partite/page.tsx] — deferred, stesso pattern di duplicazione già tollerato in almeno tre pagine del progetto (`dati-fisici/page.tsx` incluso), non una regressione introdotta qui; diverso da `risolviAutorizzazioneGruppo` (Story 10.2), che è logica di autorizzazione riusabile su un singolo Gruppo, non glue code di rendering pagina.
- [x] [Review][Defer] Nessun test automatico copre direttamente `filtroAllenatore` (il filtro Prisma che soddisfa l'AC #3) [app/(partite-campionati)/partite/page.tsx] — deferred, coerente con la convenzione già stabilita in tutto il progetto: nessuna pagina Server Component di questo codebase ha mai un test delle proprie query Prisma interne (solo le Server Action esportate vengono testate), non un gap specifico di questa storia.
- [x] [Review][Defer] Un errore di `supabase.auth.getUser()` viene solo loggato, l'esecuzione prosegue e un Admin/Dirigente colpito da un problema transitorio di autenticazione vedrebbe il messaggio "account non collegato a un profilo Allenatore" invece di un'indicazione di errore reale [app/(partite-campionati)/partite/page.tsx] — deferred, stesso identico gap già deferito per la pagina gemella `campionati/page.tsx` in Story 10.1, severità bassa.
- [x] [Review][Defer] Cella "Luogo" vuota se `impianto` è assente ma `indirizzoImpianto` è presente (il link "Naviga" compare comunque, senza alcun nome visibile del luogo) [app/(partite-campionati)/partite/page.tsx] — deferred, bassa probabilità: l'export federale reale popola sempre entrambi i campi insieme (Story 10.2 Dev Notes, verificato sul file reale), puramente cosmetico se mai osservato.
- [x] [Review][Dismiss] `prisma.allenatore.findFirst({ where: { utente: { supabaseAuthId: user.id } } })` senza `orderBy` potrebbe in teoria scegliere arbitrariamente tra più righe `Allenatore` collegate allo stesso utente — falso positivo: `Allenatore.utenteId` è `@unique` e `Utente.supabaseAuthId` è `@unique` (schema.prisma righe 40, 133), quindi al massimo una riga `Allenatore` può mai corrispondere a un dato utente — lo scenario non è raggiungibile.

## Dev Notes

- **Nessuna nuova entità/migrazione in questa storia**: `Campionato`/`GruppoCampionato`/`Partita` esistono già (Story 10.1/10.2). Questa storia è puramente una vista di lettura sopra dati già presenti.
- **Riuso obbligatorio, non reinventare**:
  - Pattern di risoluzione Ruoli/Gruppi: `app/(partite-campionati)/campionati/page.tsx` righe 14-55 (Story 10.1) — stessa distinzione Admin/Dirigente (accesso ampio) vs Allenatore (filtro `allenatori.some`), stesso messaggio di errore se l'Allenatore non è agganciato.
  - Link "Naviga": `lib/link-naviga-palestra.ts` (`costruisciLinkNaviga`, Story 9.6) — accetta `{ indirizzo, latitudine?, longitudine? }`; `Partita` ha solo `indirizzoImpianto` (nessuna coordinata), quindi `costruisciLinkNaviga({ indirizzo: partita.indirizzoImpianto })` usa sempre il ramo indirizzo testuale, mai quello a coordinate — comportamento corretto e già gestito dalla funzione esistente, nessuna modifica a quel file.
  - Markup del link "Naviga": `app/(orari-palestre)/SlotTable.tsx` righe 52-74 è il riferimento più vicino (stessa struttura `<a target="_blank" rel="noopener noreferrer" aria-label="...">`).
  - Formattazione data italiana per la UI: `app/(certificati-medici)/certificato-medico/page.tsx` riga 169-171 (`toLocaleDateString("it-IT")`) — **diverso** da `lib/data-italiana.ts`/`parseDataItaliana` (quello parsa `gg/mm/aaaa` **in ingresso** dall'Excel, qui serve il percorso opposto: formattare per la UI una stringa `YYYY-MM-DD` già in database).
- **`trovaAnnoAgonisticoCorrente()` vs `risolviAnnoAgonisticoCorrente()`**: questa è una pagina GET, quindi **sempre** `trovaAnnoAgonisticoCorrente()` (mai crea nulla) — stessa distinzione già stabilita nei Dev Notes di Story 1.6/2.2/10.1, **non invertire**.
- **Perché "Casa vs Ospite" e non un singolo campo "avversario"**: `Partita.squadraCasa`/`squadraOspite` sono testo libero importato dal file Excel federale (Story 10.2) — non esiste alcun campo che indichi quale delle due squadre appartiene alla società (il `Gruppo.nome` di questo progetto è per categoria, es. "Under 16 Femminile", non il nome della squadra come appare nell'export federale, es. "VOLLEY MOGLIANO"). Dedurre l'avversario tramite un confronto testuale con un nome hardcoded sarebbe fragile (varia tra file per maiuscole/sigle/categoria) — **deciso esplicitamente con l'utente in fase di creazione storia**: mostrare sempre entrambe le squadre, l'utente riconosce a colpo d'occhio la propria.
- **Settimana lunedì-domenica, non domenica-sabato**: convenzione italiana/europea standard, coerente con `toLocaleDateString("it-IT")` usato per le etichette.
- **Range di settimane "vuote" (AC #4)**: solo le settimane **comprese tra** la prima e l'ultima partita visibili per il chiamante (non un intervallo fisso tipo "settimana corrente ± N"). Se il chiamante non vede alcuna partita, non c'è alcun intervallo da generare — la pagina mostra un messaggio generale ("Nessuna partita programmata"), non una lista di `SettimanaPartite` vuote.
- **`force-dynamic` obbligatorio**: senza, un import riuscito su `/campionati` (Story 10.2, `importaGare` chiama solo `revalidatePath("/campionati")`) non aggiornerebbe la cache di `/partite`. Non modificare `importaGare` per aggiungere `revalidatePath("/partite")` — `force-dynamic` risolve il problema alla radice per questa pagina, stesso pattern già scelto per `/campionati`/`/gruppi`.
- **Vista unificata, non per-Gruppo**: a differenza di `campionati/page.tsx` (una riga di tabella per Gruppo, con i propri Campionati elencati dentro), questa pagina mostra un'unica timeline settimanale con **tutte** le Partite visibili mescolate insieme (ordinate per data/ora), col nome del Gruppo e del Campionato su ogni riga per disambiguare — **deciso in fase di creazione storia** come lettura naturale dell'AC #3 ("vede le partite di tutti i Gruppi"), non ancora esplicitamente confermato con l'utente nel dettaglio ma a basso rischio/reversibile (puro markup, nessuna migrazione).
- **File NON da toccare**: `app/(partite-campionati)/campionati/*` (Story 10.1/10.2, invariati), `app/(partite-campionati)/autorizzazione.ts` (quell'helper è per l'autorizzazione di **mutazione** su un singolo Gruppo — `risolviAutorizzazioneGruppo(gruppoId)` — non applicabile a una pagina di lettura multi-Gruppo come questa), `lib/importa-gare/*`, `lib/data-italiana.ts` (nessun cambiamento necessario, si usa `toLocaleDateString` per l'output, non `parseDataItaliana`).

### Project Structure Notes

- File nuovi: `lib/raggruppa-per-settimana.ts` (+ `.test.ts`), `app/(partite-campionati)/partite/page.tsx`, `app/(partite-campionati)/partite/partite.module.css`.
- File modificati: `lib/auth/route-guard.ts` (nuova voce `PROTECTED_ROUTES`), `lib/auth/route-guard.test.ts` (nuovo test).
- Nessuna modifica a `prisma/schema.prisma` o a migrazioni — nessuna nuova entità.
- Nessun Client Component: pagina interamente Server Component (sola lettura, nessuna interattività oltre ai link `<a>` "Naviga").

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 10.3 — Acceptance Criteria e decisioni tecniche, righe 1036-1058, 1102-1107]
- [Source: app/(partite-campionati)/campionati/page.tsx — pattern di risoluzione Ruoli/Gruppi da riusare identico, righe 14-55]
- [Source: lib/link-naviga-palestra.ts — costruisciLinkNaviga, riuso invariato (Story 9.6)]
- [Source: app/(orari-palestre)/SlotTable.tsx — markup del link "Naviga", righe 52-74]
- [Source: app/(certificati-medici)/certificato-medico/page.tsx — pattern toLocaleDateString("it-IT"), righe 169-171]
- [Source: lib/auth/route-guard.ts — PROTECTED_ROUTES, righe 74-78 (voce /campionati, stesso set di Ruoli da riusare)]
- [Source: prisma/schema.prisma — model Partita (righe 405-433), Campionato (369-379), Gruppo (348-363)]
- [Source: _bmad-output/implementation-artifacts/10-2-import-excel-partite-campionato.md — Dev Agent Record, motivo di force-dynamic e revalidatePath("/campionati") limitato a quella pagina]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- Verificata empiricamente (script Node ad-hoc) la formattazione `toLocaleDateString("it-IT")` per l'etichetta di settimana, sia nel caso comune (stesso anno: "20 ottobre - 26 ottobre 2025") sia nel caso a cavallo d'anno ("29 dicembre 2025 - 4 gennaio 2026") — usata poi per scrivere le asserzioni esatte dei test prima di implementare la funzione.

### Completion Notes List

- Task 1: `/partite` aggiunta a `PROTECTED_ROUTES` (ADMIN, DIRIGENTE, ALLENATORE) — stesso set di `/campionati`.
- Task 2: `lib/raggruppa-per-settimana.ts` — settimane lunedì-domenica, range completo tra il lunedì minimo e massimo tra le partite visibili (incluse le settimane senza partite, `partite: []`, per AC #4), etichetta italiana. TDD: 6 test scritti falliti prima dell'implementazione, poi tutti passanti.
- Task 3: `app/(partite-campionati)/partite/page.tsx` — stesso identico pattern di risoluzione Ruoli/Gruppi di `campionati/page.tsx` (Story 10.1), vista unificata (non per-Gruppo) con Gruppo/Campionato mostrati per riga per disambiguare quando Admin/Dirigente vede più Gruppi o un Gruppo ha più Campionati. Mostra sempre "SquadraCasa - SquadraOspite" invece di un "avversario" calcolato (deciso con l'utente in fase di creazione storia: nessun campo distingue quale squadra sia la società). `force-dynamic` per restare coerente con `importaGare` (Story 10.2) che revalida solo `/campionati`. Nessun Client Component: pagina interamente Server Component, nessuna interattività oltre ai link `<a>` "Naviga" (href calcolato server-side).
- Task 4: 680/680 test passati, `tsc --noEmit` pulito, ESLint pulito sui file di questa storia (7 problemi residui pre-esistenti in file non toccati, stesso conteggio di Story 10.1).
- Code review (2026-07-29): Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo. 0 decision-needed. 3 patch applicati: `raggruppaPerSettimana` ora filtra le righe con `data` non parsabile invece di andare in crash (`RangeError`), e tronca l'intervallo di settimane generate a `MAX_SETTIMANE = 260` (~5 anni) invece di appendere la richiesta su una data estrema ma valida (verificato dal vivo: senza il limite un test con anno 9999 non terminava); ordinamento delle partite della stessa settimana riscritto per confrontare i minuti da mezzanotte invece di una stringa grezza (un orario non zero-paddato tipo "9:00" ordinava male); `timeZone: "UTC"` reso esplicito su entrambe le formattazioni data/etichetta (l'Acceptance Auditor ha verificato concretamente uno sfasamento di un giorno forzando `TZ=America/New_York`), `parseDataUtc` esportata e riusata da `page.tsx` invece di una seconda implementazione indipendente. 4 defer (duplicazione del blocco di risoluzione Ruoli/Gruppo tra `campionati/page.tsx` e `partite/page.tsx` - stesso pattern già tollerato altrove; nessun test diretto su `filtroAllenatore` - convenzione di progetto, nessuna pagina Server Component viene testata così; errore `getUser()` solo loggato - stesso gap già deferito per `campionati/page.tsx`; cella Luogo vuota se `impianto` manca ma `indirizzoImpianto` è presente - bassa probabilità). 1 scartato come falso positivo verificato (`findFirst` su Allenatore "potrebbe scegliere arbitrariamente tra duplicati" — impossibile, `Allenatore.utenteId` e `Utente.supabaseAuthId` sono entrambi `@unique`). 685/685 test passati, `tsc --noEmit` ed ESLint puliti dopo i fix.

### File List

- `lib/auth/route-guard.ts` (modificato — nuova voce `PROTECTED_ROUTES` per `/partite`)
- `lib/auth/route-guard.test.ts` (modificato — 2 nuovi test per `/partite`)
- `lib/raggruppa-per-settimana.ts` (nuovo, poi corretto in code review — validazione difensiva, limite `MAX_SETTIMANE`, ordinamento numerico dell'ora, `timeZone: "UTC"`, `parseDataUtc` esportata)
- `lib/raggruppa-per-settimana.test.ts` (nuovo, poi esteso in code review — 5 nuovi test)
- `app/(partite-campionati)/partite/page.tsx` (nuovo, poi corretto in code review — riusa `parseDataUtc`, `timeZone: "UTC"`)
- `app/(partite-campionati)/partite/partite.module.css` (nuovo)

## Change Log

- 2026-07-29: Implementata Story 10.3 — vista `/partite` di sola lettura, raggruppata per settimana (lunedì-domenica, incluse le settimane vuote nell'intervallo). Nuova utility pura `lib/raggruppa-per-settimana.ts`, riuso invariato del pattern di autorizzazione Ruoli/Gruppi di `campionati/page.tsx` e del link "Naviga" di `lib/link-naviga-palestra.ts` (Story 9.6). Nessuna nuova entità/migrazione. 680/680 test passati, 0 errori tsc/eslint sui file di questa storia. Status: review.
- 2026-07-29: Code review chiusa — 3 patch applicati (crash su data non parsabile, limite sul numero di settimane generate, ordinamento numerico dell'ora, `timeZone: "UTC"` esplicito), 4 defer, 1 scartato come falso positivo verificato. 685/685 test passati, 0 errori tsc/eslint dopo i fix. Status: done.
