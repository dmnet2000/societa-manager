---
baseline_commit: 0180d83
---

# Story 18.3: Sezione Partite della settimana in home

Status: done

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

### Review Findings

- [x] [Review][Patch] Bug di fuso orario nel calcolo della "settimana corrente" [app/page.tsx:66] — `lunediDellaSettimana(new Date())` usa `getUTCDay()` sull'istante UTC reale, non sul giorno locale italiano: nella finestra tra la mezzanotte italiana e quella UTC (fino a 2h ogni lunedì, ora legale CEST), il calcolo restituisce ancora il lunedì della settimana PRECEDENTE — proprio la finestra in cui un visitatore di lunedì mattina vedrebbe la settimana sbagliata. Trovato indipendentemente da Blind Hunter ed Edge Case Hunter. Risolto: "oggi" ora calcolato con `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" })` prima di calcolare il lunedì, stesso pattern già in uso in `certificato-scaduto.ts` (Story 4.5).
- [x] [Review][Patch] Duplicazione locale di `formattaDataIso` [app/page.tsx:37] — identica alla funzione privata omonima già esistente in `lib/raggruppa-per-settimana.ts`, in contraddizione con il principio di riuso ("invece di duplicarne la matematica") che l'intero diff dichiara di seguire — lo stesso trattamento (esportare invece di duplicare) è già stato applicato a `lunediDellaSettimana` (Task 1). Risolto: `formattaDataIso` ora esportata da `lib/raggruppa-per-settimana.ts` e riusata, la definizione locale in `app/page.tsx` rimossa.
- [x] [Review][Patch] `aria-label` ridondante sulla `<section>` Partite [app/page.tsx:238] — duplica testualmente l'unico `<h2>` interno; a differenza della sezione Sponsor (due `<h2>`, serve per forza `aria-label` esplicito), qui basterebbe `aria-labelledby` puntato all'id dell'`<h2>`. Risolto: `aria-labelledby="titolo-partite-settimana"` + `id` sull'`<h2>`.
- [x] [Review][Patch] File List della story non menziona il restyle dei titoli Sponsor [app/page.tsx, app/home-pubblica.module.css] — la nuova classe `.titoloSezione` è stata applicata retroattivamente anche a "I nostri sponsor"/"Convenzioni" (Story 18.2), cambiamento innocuo (solo stile tipografico, nessun colore nuovo) ma non dichiarato nel File List di questa storia. Risolto: File List aggiornato.
- [x] [Review][Defer] Nessun campo di esclusione per singola Partita, a differenza di `Sponsor.attiva` [prisma/schema.prisma] — deferred, un Admin/Dirigente non può oggi nascondere una singola partita dalla home pubblica (es. amichevole); richiederebbe un nuovo campo di schema, nessun AC di questa storia lo richiede.
- [x] [Review][Defer] Gestione di `impianto` nullable incoerente tra testo visibile (nessun fallback) e `aria-label` (fallback "il luogo della partita", che non copre comunque una stringa vuota) [app/page.tsx:259-269] — deferred, mirror esatto e voluto del pattern già esistente in `app/app/(partite-campionati)/partite/page.tsx` (Dev Notes di questa storia lo richiedeva esplicitamente), non introdotto da questa storia.
- [x] [Review][Defer] Nessun `take`/limite sulla query pubblica `prisma.partita.findMany` [app/page.tsx:112] — deferred, stesso pattern già accettato per la query Sponsor (Story 16.1/16.3), scala attuale ridotta.
- [x] [Review][Defer] Nessun ordinamento secondario deterministico tra Gruppi diversi a parità di data/ora [lib/raggruppa-per-settimana.ts] — deferred, limite pre-esistente di `raggruppaPerSettimana`/`oraInMinuti` (Story 10.3); il Task 1 di questa storia vietava esplicitamente di estendere l'export oltre `lunediDellaSettimana`.

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

claude-sonnet-5

### Debug Log References

### Completion Notes List

- Tutti e 4 i Task risultavano già implementati e marcati `[x]` nel codice esistente all'apertura di questo giro (dev-story workflow): `lunediDellaSettimana` esportata (Task 1), query pubblica settimana-corrente + `raggruppaPerSettimana` in `app/page.tsx` (Task 2), sezione condizionale `mostraPartite` (AC #2). Questo giro ha verificato lo stato reale del codice contro ogni AC/Task invece di fidarsi solo dei checkbox, ed eseguito la suite completa.
- **Deviazione nota dal Task 3 letterale**: la story descrive una `<table>` di sola lettura; il markup attuale usa invece una griglia di card (`.listaPartite`/`.schedaPartita`), stessi identici campi (Giorno/Ora/Squadre/Luogo/Gruppo, nessuna colonna "Azioni") — richiesta successiva esplicita dell'utente (2026-08-12) di allineare il layout al tipo di siti di riferimento indicati per l'Epic 18 (volleyrocasaldepazzi.it, gassalespiacenza.it), più leggibile su mobile di una tabella scorrevole. Nessun AC violato: stessi dati, stesso principio di sola lettura.
- Verifica: `npx vitest run` (1075/1075 passati), `npx tsc --noEmit`, `npm run lint` (0 errori, solo warning preesistenti non correlati), `npm run build` puliti.

### File List

- Modificati: `lib/raggruppa-per-settimana.ts` (esportate `lunediDellaSettimana` e `formattaDataIso`, review fix), `app/page.tsx` (sezione Partite della settimana; restyle non dichiarato in precedenza dei titoli Sponsor "I nostri sponsor"/"Convenzioni" con la nuova `.titoloSezione`, review fix Acceptance Auditor), `app/home-pubblica.module.css` (classi `.listaPartite`/`.schedaPartita`/ecc. e `.titoloSezione` condivisa)

## Change Log

- 2026-08-12: File di story creato, stato ready-for-dev.
- 2026-08-13: Verificata implementazione esistente contro ogni AC/Task (dev-story workflow) - nessun task incompleto trovato, suite di regressione eseguita, File List/Dev Agent Record completati. 1075/1075 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: review.
- 2026-08-13: Code review completata (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo, diff isolato cab1951..e5f1252 sui 3 file di questa storia). 4 patch applicati: bug di fuso orario nel calcolo "settimana corrente" (UTC vs Europe/Rome, trovato indipendentemente da 2 layer, stessa causa/soluzione già nota in certificato-scaduto.ts Story 4.5), formattaDataIso esportata da lib/raggruppa-per-settimana.ts invece di duplicata localmente, aria-labelledby invece di aria-label ridondante sulla sezione Partite, File List aggiornato per il restyle non dichiarato dei titoli Sponsor. 4 defer (nessun campo di esclusione per singola Partita, gestione impianto nullable ereditata pari pari da /app/partite, nessun take/limite sulla query pubblica, nessun ordinamento secondario deterministico tra Gruppi). 4 scartati come rumore/falsi positivi (incluso un errore di trascrizione nel diff incollato al Blind Hunter, verificato e corretto contro il file reale). 1075/1075 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: done.
