---
baseline_commit: 0180d83
---

# Story 18.3: Sezione Partite della settimana in home

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Visitatore senza account,
I want vedere sulla home pubblica le partite della settimana corrente dei Gruppi della società,
so that possa sapere quando e dove giocano le squadre senza dover fare login.

## Acceptance Criteria

1. **Given** un Visitatore senza sessione **When** visita la home pubblica (`"/"`) **Then** vede l'elenco delle partite della settimana corrente (lunedì-domenica, convenzione italiana) per tutti i Gruppi con partite programmate in quella settimana — squadre, data/ora, luogo.
2. **And** se nessun Gruppo ha partite nella settimana corrente, la sezione non compare in home (nessuna area vuota).
3. **And** nessun dato riservato è esposto in questa vista pubblica — nessuna colonna "Azioni"/modifica (quella esiste solo per Admin/Dirigente/Allenatore su `/app/partite`), nessun dato di Atlete/Utenti, solo i campi di `Partita` già mostrati in sola lettura sulla vista autenticata equivalente.

## Tasks / Subtasks

- [x] Task 1: Esportare il calcolo del lunedì della settimana (AC: #1)
  - [x] `lib/raggruppa-per-settimana.ts`: la funzione `lunediDellaSettimana` è oggi privata (non esportata) — esportarla invariata (stessa firma `(data: Date) => Date`, stessa logica `getUTCDay()`/offset). **Non modificarne il comportamento**, solo la visibilità: è già usata e testata indirettamente tramite `raggruppaPerSettimana` (Story 10.3), qui va riusata direttamente per calcolare i confini della sola settimana corrente senza dover generare l'intero intervallo di settimane della stagione (che presuppone un `AnnoAgonistico`, non pertinente a una vista pubblica di sola settimana).

- [x] Task 2: Query pubblica per la settimana corrente in `app/page.tsx` (AC: #1, #2, #3)
  - [x] Calcolare lunedì/domenica della settimana corrente con `lunediDellaSettimana(new Date())` (Task 1) + 6 giorni, in formato stringa ISO `YYYY-MM-DD` (stesso formato di `Partita.data`, mai un oggetto `Date` salvato — Story 10.2).
  - [x] Nuova query `prisma.partita.findMany({ where: { data: { gte: lunediIso, lte: domenicaIso } }, include: { gruppo: { select: { nome: true } } }, orderBy: [{ data: "asc" }, { ora: "asc" }] })` — mirror del filtro/orderBy già in uso in `app/app/(partite-campionati)/partite/page.tsx`, senza il filtro per Ruolo/Allenatore/Atleta (qui tutti i Gruppi, sempre — AC #1) e senza includere `campionato` (non necessario per i campi richiesti dall'AC).
  - [x] Passare il risultato attraverso `raggruppaPerSettimana` (Story 10.3, già esportata e testata) e prendere `settimane[0]?.partite ?? []` — riusa l'ordinamento corretto per orario già stabilito lì (`oraInMinuti`, gestisce anche orari non zero-paddati da un import Excel, Story 10.2/10.3) invece di fidarsi del solo `orderBy` di Prisma (stringa, non numerico) o duplicare quella logica di ordinamento.
  - [x] Sezione renderizzata solo se l'elenco risultante non è vuoto (AC #2), stesso pattern già usato per la sezione Sponsor (Story 18.2, `mostraSponsor`).

- [x] Task 3: Markup e stile (AC: #1, #3)
  - [x] Tabella di sola lettura (colonne: Giorno, Ora, Squadre, Luogo, Gruppo) — mirror del ramo `!puoModificare` già esistente in `app/app/(partite-campionati)/partite/page.tsx` (stesso `<tr>`, stesse colonne, nessuna colonna "Azioni": qui non esiste alcun Ruolo che possa modificare, a differenza di quella pagina dove il ramo di sola lettura convive con quello Admin/Allenatore).
  - [x] Riusare `formattaData`/`parseDataUtc` (già esportata da `lib/raggruppa-per-settimana.ts`) per la colonna Giorno — non duplicare il parsing.
  - [x] Riusare `costruisciLinkNaviga` (`lib/link-naviga-palestra.ts`, pura, nessuna chiamata di rete) per il link "Naviga" nella colonna Luogo quando `indirizzoImpianto` è presente — stesso comportamento della vista autenticata.
  - [x] Nuove classi in `app/home-pubblica.module.css` (non riusare `partite.module.css` — stessa convenzione già applicata in Story 18.2 per gli Sponsor: un CSS module per pagina, mai condiviso). Stessi token DESIGN.md, nessun colore nuovo.
  - [x] Sezione posizionata dopo la sezione Sponsor (Story 18.2) o prima, a discrezione dello sviluppo — nessun ordine specifico richiesto da alcun AC di nessuna delle due story.

- [x] Task 4: Test (AC: tutti)
  - [x] Nessun nuovo test per `raggruppaPerSettimana`/`lunediDellaSettimana` (già testate, comportamento invariato — solo la visibilità di `lunediDellaSettimana` cambia).
  - [x] Nessun test diretto su `page.tsx` (convenzione consolidata, nessuna pagina del progetto ne ha).
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

## Dev Notes

### Decisioni di analisi (vedi `epics.md#Epic 18`, Story 18.3)

- **Dipende da Story 18.1** (done): home pubblica esistente su `app/page.tsx`.
- **Segue lo stesso pattern di Story 18.2** (done, sezione Sponsor — appena rivista in code review): sezione condizionale ("nessuna area vuota" se il dato è assente), query con `select`/proiezione esplicita dei soli campi pubblici, CSS module dedicato non condiviso con la vista autenticata equivalente.
- **Solo la settimana corrente** (AC #1): nessuna estensione a storico/calendario completo — a differenza di `/app/partite` (Story 10.3), che mostra l'intera stagione raggruppata per settimana con navigazione implicita (tutte le settimane, non solo quella corrente).
- **"Per tutti i Gruppi"** (AC #1): a differenza di `/app/partite`, qui non c'è alcuno scoping per Ruolo/Allenatore/Atleta — un Visitatore vede le partite di ogni Gruppo della società, stessa ampiezza già garantita ad Admin/Dirigente su quella pagina.

### Scoperta tecnica chiave: `lunediDellaSettimana` esiste già, ma è privata

`lib/raggruppa-per-settimana.ts` (Story 10.3) ha già tutta la matematica corretta e testata per i confini di una settimana lunedì-domenica in UTC (`lunediDellaSettimana`, uso di `getUTCDay()`, offset), ma la funzione non è esportata — pensata finora solo per uso interno a `raggruppaPerSettimana`, che genera *tutte* le settimane di un intervallo (pensato per una stagione intera, non per "solo questa settimana"). Questa story ha bisogno del solo calcolo del lunedì corrente per costruire il filtro Prisma `where: { data: { gte, lte } }` in modo mirato (non recuperare l'intera stagione per poi scartare le settimane non correnti) — **esportare la funzione esistente (Task 1) invece di duplicarne la logica** (offset `(giorno + 6) % 7` non ovvio, già corretto e testato indirettamente).

**Poi**, per l'ordinamento all'interno della settimana trovata, questa story riusa comunque `raggruppaPerSettimana` stessa (già esportata) passandole solo le partite già filtrate per la settimana corrente — produce un array con al più una `SettimanaPartite` (`settimane[0]`), da cui si prende `.partite` già ordinata correttamente (gestisce orari non zero-paddati, `oraInMinuti`, Story 10.3 review fix). Questo evita di dover esportare *anche* la logica di ordinamento (`oraInMinuti`, altrettanto privata) — un solo nuovo export (Task 1) basta.

### Pattern da riusare (non reinventare)

- **Query e colonne**: `app/app/(partite-campionati)/partite/page.tsx`, ramo `!puoModificare` (righe `<tr>` di sola lettura) — mirror esatto delle colonne Giorno/Ora/Squadre/Luogo/Gruppo, senza "Azioni"/Campionato (non richiesti dall'AC).
- **Formattazione data**: `formattaData`/`parseDataUtc`, già esportate da `lib/raggruppa-per-settimana.ts`.
- **Link "Naviga"**: `costruisciLinkNaviga` (`lib/link-naviga-palestra.ts`) — pura, preferisce coordinate precise se presenti, altrimenti indirizzo testuale, nessuna chiamata di rete/servizio a pagamento (NFR6).
- **Pattern "nessuna sezione se vuota"** e **`select` esplicito sulla query pubblica**: entrambi stabiliti in Story 18.2 (review fix), da applicare identici qui — vedi quella story per il ragionamento completo su "perché un `select` esplicito, non solo la disciplina del mapping successivo".

### Riferimenti

- [Source: app/app/(partite-campionati)/partite/page.tsx] — query, colonne, ramo di sola lettura da mirrorare.
- [Source: lib/raggruppa-per-settimana.ts] — `raggruppaPerSettimana`, `parseDataUtc` (già esportate), `lunediDellaSettimana` (da esportare, Task 1).
- [Source: lib/link-naviga-palestra.ts, costruisciLinkNaviga] — link "Naviga" verso il luogo della partita.
- [Source: app/page.tsx, app/home-pubblica.module.css] — home pubblica esistente (Story 18.1/18.2) su cui innestare la nuova sezione.
- [Source: _bmad-output/implementation-artifacts/18-2-sponsor-pubblico-home.md] — pattern "nessuna sezione se vuota" + `select` esplicito, review findings da non ripetere (query senza `select`, tipo duplicato, sezione senza `aria-label`).
- [Source: epics.md#Epic 18: Sito pubblico Settore Volley, Story 18.3] — decisioni di analisi, testo originale.

### Project Structure Notes

- Modificati: `lib/raggruppa-per-settimana.ts` (esportare `lunediDellaSettimana`, nessun cambio di comportamento), `app/page.tsx` (nuova sezione), `app/home-pubblica.module.css` (nuove classi).
- Nessun nuovo file component (a differenza di Story 18.2/`SponsorPubblicoCard.tsx` — qui non serve, nessuna card con logica condizionale per-elemento oltre al link "Naviga", già gestito da una funzione pura).
- Nessuna migrazione DB, nessuna nuova Server Action, nessun nuovo bucket/policy Storage.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-08-12: File di story creato, stato ready-for-dev.
