---
baseline_commit: 5e402d0c62794bbfd8c9caafb4fe68e8be045925
---

# Story 9.17: Vista griglia mensile delle presenze per Gruppo (lato Allenatore)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore,
I want vedere le presenze del mio Gruppo in una griglia mensile (Atlete sulle righe, giorni del mese sulle colonne),
so that posso vedere a colpo d'occhio le presenze di tutta la squadra in un mese, invece di controllare un'Atleta alla volta.

**Note aggiuntive:** oggi (`/storico-presenze`, Story 3.2/3.3) la sezione "Storico delle mie Atlete" mostra un `<select>` per scegliere UNA Atleta e la sua cronologia completa (Data/Giorno/Orario/Gruppo/Presenza, `StoricoTable`). La nuova vista è per **Gruppo** (non per singola Atleta) e per **mese** (non l'intero storico).

**Decisione presa con l'utente in fase di creazione storia**: questa griglia **sostituisce** la sezione "Storico delle mie Atlete" (non si aggiunge come vista parallela). La sezione "Il mio storico" (vista Atleta/Genitore, stessa pagina) **resta invariata**, fuori scope.

## Acceptance Criteria

1. **Given** un Allenatore assegnato a uno o più Gruppi **When** visita `/storico-presenze` **Then** la sezione "Storico delle mie Atlete" è sostituita da una griglia: può scegliere un Gruppo (tra quelli che gestisce) e un mese, e vede una griglia con le Atlete del Gruppo sulle righe e i giorni del mese sulle colonne
2. **Given** una cella della griglia corrispondente a un giorno in cui una Presenza è stata registrata per quella Atleta **When** visualizzata **Then** mostra un indicatore chiaro presente/assente
3. **Given** un giorno del mese in cui non è stata registrata alcuna Presenza per quella Atleta (nessuno Slot quel giorno, o presenza non ancora segnata) **When** visualizzato **Then** la cella è vuota/neutra, non un falso "assente"
4. **Given** un Allenatore che non gestisce un dato Gruppo **When** tenta di vedere la griglia di quel Gruppo (manomissione dell'URL/form) **Then** l'operazione è rifiutata, stesso principio di autorizzazione già stabilito per `/presenze` (Story 3.1)
5. **And** nessuna regressione sulla sezione "Il mio storico" (vista Atleta/Genitore, Story 3.2) — suite Vitest invariata

## Tasks / Subtasks

- [x] Task 1: Helper puro per i giorni del mese (AC: #1, #3)
  - [x] Nuovo file `lib/mese-calendario.ts`: funzione pura `giorniDelMese(meseIso: string): string[]` — restituisce l'elenco di tutte le date `"YYYY-MM-DD"` di quel mese (28/29/30/31 giorni, incluso l'anno bisestile), in ordine crescente. Implementata con `Date.UTC()`/`getUTCDate()` (stesso principio di sicurezza sul fuso orario di `lib/giorno-settimana.ts`, non una tabella manuale). 7 test.
  - [x] Esportata anche `meseCorrente()` (formato `"YYYY-MM"`, UTC) per il default del form.
- [x] Task 2: Nuova query db-rls per la griglia (AC: #1, #2, #3)
  - [x] `lib/db-rls/presenza.ts`: nuova funzione `leggiPresenzeGriglia(supabase, slotIds: string[], atletaIds: string[], giorni: string[]): Promise<{ atletaId: string; data: string; presente: boolean }[]>` — legge da `"presenze"` filtrando `.in("slotId", slotIds)`, `.in("atletaId", atletaIds)`, `.gte("data", giorni[0])`, `.lte("data", giorni[giorni.length - 1])`. **Guardia esplicita**: se `slotIds` o `atletaIds` è vuoto, restituisce `[]` senza interrogare Supabase.
  - [x] **Perché filtrare anche per `slotIds` di QUESTO Gruppo**: implementato come da Dev Notes — evita che le Presenze di un Gruppo precedente (Atleta riassegnata, Story 9.15) compaiano nella griglia del nuovo Gruppo.
  - [x] `leggiStoricoPresenzePerAtleta`/`registraPresenze`/`leggiPresenzePerSlotEData` non toccate. 10/10 test in `presenza.test.ts` (6 preesistenti invariati + 4 nuovi per `leggiPresenzeGriglia`).
- [x] Task 3: Sostituire la sezione Allenatore in `/storico-presenze` con la griglia (AC: #1, #4)
  - [x] `app/(presenze)/storico-presenze/page.tsx`: rimosso il blocco `sezioneAllenatore` a select singola Atleta + `StoricoTable` — `StoricoTable`/`sezioneAtleta` invariati (AC #5). Rimosso anche il searchParam `atletaId`, non più usato da questa pagina.
  - [x] Risolti i Gruppi propri dell'Allenatore per la stagione corrente, stesso pattern di `i-miei-gruppi/page.tsx` (Story 9.15).
  - [x] Nuovi `searchParams`: `gruppoId` e `mese` (default `meseCorrente()` se assente).
  - [x] **AC #4**: `gruppoId` non tra i Gruppi propri → alert inline ("Gruppo non trovato tra i tuoi."), nessuna query alla griglia.
  - [x] Risolti in parallelo Slot del Gruppo, roster corrente ed `elencaAtlete`, poi `giorniDelMese(mese)`, poi `leggiPresenzeGriglia(...)`.
  - [x] `Map` chiave `` `${atletaId}|${data}` `` per lookup O(1) per cella.
  - [x] Intestazione sezione: "Griglia mensile presenze".
- [x] Task 4: Markup e CSS della griglia (AC: #2, #3)
  - [x] Tabella con una riga per Atleta e una colonna per ogni giorno di `giorniDelMese(mese)` (intestazione: solo il numero del giorno).
  - [x] Cella presente: "✓" (`.cellaPresente`, `--color-success`). Cella assente: "✗" (`.cellaAssente`, `--color-danger`). Nessuna Presenza registrata: cella vuota, nessuna classe (AC #3).
  - [x] Riusati `.scrollWrapper`/`.tabella` esistenti; nuove classi solo per le celle indicatore.
- [x] Task 5: Test (AC: #1, #2, #3)
  - [x] `lib/mese-calendario.test.ts`: 7 test (mese a 28/29/30/31 giorni incluso febbraio bisestile e non, formato/ordine, dicembre, `meseCorrente()`).
  - [x] `lib/db-rls/presenza.test.ts` (esisteva già): 4 nuovi test per `leggiPresenzeGriglia` (filtri attesi, array vuoto senza query per `slotIds`/`atletaIds` vuoti, propagazione errore) — 6 test preesistenti invariati, 10/10 totali.
  - [x] Nessun test di rendering per `page.tsx`, coerente con la convenzione già stabilita nel progetto.
  - [x] Suite Vitest completa: 749/749 test passati (67 file), inclusi i 3 test preesistenti di `calcola-statistiche-presenza.test.ts` invariati (AC #5). `npx tsc --noEmit` ed ESLint puliti su tutti i file nuovi/modificati.

### Review Findings

- [x] [Review][Patch] `meseSelezionato` dai `searchParams` non è validato nel formato — un valore manomesso (es. `?mese=abc` o `?mese=2026-13`) produce `NaN` a cascata in `giorniDelMese` — **fix**: nuovo `FORMATO_MESE` (`page.tsx`) valida prima dell'uso, fallback a `meseCorrente()` se non valido (stesso trattamento di un parametro assente); `giorniDelMese` stessa ora lancia un errore esplicito per un formato non valido (difesa in profondità per qualunque chiamante). 1 nuovo test. [app/(presenze)/storico-presenze/page.tsx, lib/mese-calendario.ts]
- [x] [Review][Patch] `leggiPresenzeGriglia` non ha una guardia per `giorni` vuoto — **fix**: `giorni.length === 0` aggiunto alla guardia esistente, nessuna query se vuoto. 1 nuovo test. [lib/db-rls/presenza.ts]
- [x] [Review][Defer] `<input type="month">` ha supporto browser non universale (degrada a testo libero in alcuni casi) e nessun `min`/`max` — mitigato in buona parte dal fix sopra (fallback al mese corrente per qualunque valore malformato), eventuale `min`/`max` resta un miglioramento cosmetico — deferred
- [x] [Review][Defer] Il ramo di autorizzazione `gruppoValido` (AC #4) non ha test dedicati — nessuna pagina di questo progetto ha mai avuto test per la propria logica di autorizzazione lato GET (stesso limite di `presenze/page.tsx`, `dati-fisici/page.tsx`, ecc.) — deferred, convenzione già stabilita nel progetto
- [x] [Review][Defer] Stesso messaggio "Gruppo non trovato tra i tuoi" mostrato sia per un Gruppo manomesso sia per un link obsoleto quando non esiste un Anno Agonistico corrente — casistica rara, entrambi i casi negano correttamente l'accesso — deferred
- [x] [Review][Defer] `leggiPresenzeGriglia` riceve l'intero array `giorni` (28-31 elementi) ma usa solo il primo/ultimo — un parametro `{ inizio, fine }` sarebbe più esplicito — deferred, refactor di forma dell'API senza impatto funzionale (chiuso dal fix della guardia sopra)
- [x] [Review][Defer] `prisma.slot.findMany` legge tutti gli Slot mai creati per il Gruppo, non filtrati per il mese selezionato, solo per costruire `slotIds` — inefficienza minima, scala ridotta del progetto (nessun impatto pratico) — deferred
- [x] [Review][Defer] Nessun `<caption>`/legenda sulla tabella della griglia per screen reader (solo i glifi "✓"/"✗") — stesso livello di accessibilità di base già esistente in ogni altra tabella del progetto (nessuna ha mai avuto `<caption>`) — deferred
- [x] [Review][Defer] Due righe Presenza per la stessa Atleta+data provenienti da due Slot diversi dello stesso Gruppo nello stesso giorno di calendario (es. doppia sessione lo stesso giorno) — la `Map` tiene silenziosamente solo l'ultima incontrata, nascondendo un dato discordante — casistica rara (richiede due sessioni di allenamento lo stesso Gruppo lo stesso giorno), la rappresentazione corretta in cella richiederebbe una decisione di prodotto non coperta da alcun AC — deferred
- [x] [Review][Dismiss] I Dev Notes originali vietavano letteralmente `new Date(...)` per `giorniDelMese`, il codice usa `Date.UTC()`/`getUTCDate()` — approccio comunque fuso-orario-safe (stesso principio di `lib/giorno-settimana.ts`), i Task/Completion Notes della storia descrivono correttamente questo approccio come quello scelto — imprecisione nella prosa dei Dev Notes originali, non un difetto nel codice
- [x] [Review][Dismiss] Pattern "risolvi i miei Gruppi" duplicato tra `storico-presenze/page.tsx` e `i-miei-gruppi/page.tsx` — scelta deliberata e documentata nei Dev Notes (AD-2, non importato tra moduli), stesso principio già stabilito in Story 9.15
- [x] [Review][Dismiss] Nessun `try/catch` attorno alle query in `page.tsx` — stesso identico pattern non-guardato già usato in ogni altra pagina GET del progetto (`presenze/page.tsx`, `dati-fisici/page.tsx`, `i-miei-gruppi/page.tsx`)
- [x] [Review][Dismiss] Catena di mock Supabase in `presenza.test.ts` con ordine di chiamata fisso (`.in().in().gte().lte()`) — stesso identico stile di mocking già usato nello stesso file per le altre funzioni (`eqSlotMock`), non un pattern nuovo introdotto da questa storia
- [x] [Review][Dismiss] La rimozione del searchParam `atletaId` rompe eventuali bookmark/link salvati — conseguenza esplicita e accettata della decisione "sostituisce, non aggiunge" presa con l'utente in fase di creazione storia, non una svista

## Dev Notes

- **Perché sostituire e non aggiungere**: deciso esplicitamente con l'utente in fase di creazione storia — la richiesta originale ("fix lista presenza... layout griglia") indicava una sostituzione, non un'aggiunta. La sezione "Il mio storico" (Atleta/Genitore) non è toccata.
- **Perché non serve distinguere "nessuno Slot quel giorno" da "presenza non ancora segnata"**: l'AC #3 tratta i due casi allo stesso modo (cella vuota/neutra) — non serve incrociare il calendario Slot/giorno-della-settimana del Gruppo per sapere se quel giorno c'era allenamento. Basta verificare se esiste una riga `Presenza` per quell'Atleta+data (tra gli Slot di questo Gruppo): se sì, presente/assente; se no, vuota. Molto più semplice di quanto ipotizzato in fase di analisi dell'epic.
- **Riuso del pattern "risolvi i miei Gruppi"**: identico a `app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` (Story 9.15) — stesso filtro `annoAgonisticoId` + `allenatori: { some: { allenatoreId } } }`. Non importare da quel modulo (AD-2, moduli diversi) — replicare localmente qui, stesso principio già seguito per l'autorizzazione a due livelli in altre storie.
- **`giorniDelMese` non deve usare `new Date(...)` con parsing implicito di fuso orario** per evitare l'esatta classe di bug già documentata in questo progetto per le date — usare aritmetica esplicita su anno/mese/giorno (numero di giorni nel mese calcolabile senza `Date`, es. tabella `[31,28,31,30,31,30,31,31,30,31,30,31]` con la regola dei bisestili applicata solo a febbraio).
- **File NON da toccare**: `StoricoTable` (in `page.tsx`), `calcola-statistiche-presenza.ts` (percentuale/trend — non richiesti per la griglia, restano usati solo da "Il mio storico"), `lib/db-rls/presenza.ts` → `registraPresenze`/`leggiPresenzePerSlotEData`/`leggiStoricoPresenzePerAtleta` (invariate).

### Project Structure Notes

- File nuovi: `lib/mese-calendario.ts`, `lib/mese-calendario.test.ts`, `lib/db-rls/presenza.test.ts` (se non già esistente).
- File modificati: `app/(presenze)/storico-presenze/page.tsx` (sezione Allenatore sostituita), `app/(presenze)/storico-presenze/storico-presenze.module.css` (nuove classi cella), `lib/db-rls/presenza.ts` (nuova funzione `leggiPresenzeGriglia`, le altre invariate).
- Riuso invariato: `elencaAtlete`, pattern "risolvi i miei Gruppi" (Story 9.15), `.scrollWrapper`/`.tabella` esistenti.
- Nuovo modulo? No — resta dentro `(presenze)`, che possiede già Presenza; `Gruppo`/`Slot`/`GruppoAtleta`/`GruppoAllenatore` non sono di proprietà esclusiva di nessun modulo (non-RLS, AD-9), già letti direttamente da `/presenze` e `/storico-presenze` oggi.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.17 — Acceptance Criteria]
- [Source: app/(presenze)/storico-presenze/page.tsx — sezione Allenatore da sostituire, StoricoTable/sezioneAtleta da NON toccare]
- [Source: lib/db-rls/presenza.ts — leggiStoricoPresenzePerAtleta, pattern di query RLS-safe da estendere per leggiPresenzeGriglia]
- [Source: app/(gruppi-allenatori)/i-miei-gruppi/page.tsx — Story 9.15, pattern "risolvi i miei Gruppi" e roster corrente da riusare identico]
- [Source: app/(presenze)/presenze/page.tsx — pattern di autorizzazione "Slot non tra i propri" (AC #4 di questa storia, stesso principio per Gruppo)]
- [Source: lib/giorno-settimana.ts — precedente di helper data puro senza uso di Date/fuso orario, stesso principio per giorniDelMese]
- [Source: app/(presenze)/storico-presenze/calcola-statistiche-presenza.ts — NON richiesto per la griglia, resta usato solo da "Il mio storico"]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno (ciclo TDD lineare — ogni test scritto per primo è fallito per il motivo atteso: modulo mancante per `giorniDelMese`/`meseCorrente`, funzione mancante per `leggiPresenzeGriglia`).

### Completion Notes List

- `lib/mese-calendario.ts`: `giorniDelMese`/`meseCorrente` implementate con `Date.UTC()`/metodi `getUTC*`, mai `Date` locale — stesso principio di sicurezza sul fuso orario già stabilito in `lib/giorno-settimana.ts`.
- `lib/db-rls/presenza.ts`: nuova `leggiPresenzeGriglia`, filtrata anche per gli Slot del Gruppo scelto (non solo `atletaId`) per non mostrare Presenze di un Gruppo precedente dopo una riassegnazione (Story 9.15). Guardia esplicita per array vuoti, nessuna query in quel caso.
- `app/(presenze)/storico-presenze/page.tsx`: sezione "Storico delle mie Atlete" sostituita da "Griglia mensile presenze" (Gruppo + Mese, default mese corrente) — decisione presa con l'utente in fase di creazione storia. `StoricoTable`/sezione "Il mio storico" invariate. Rimosso il searchParam `atletaId`, non più usato.
- Cella presente/assente con indicatore colorato (`.cellaPresente`/`.cellaAssente`); nessuna Presenza registrata → cella vuota, nessuno stile (AC #3).
- Nessun test di rendering per `page.tsx`, coerente con la convenzione del progetto.
- Suite completa: 749/749 test (67 file), `tsc --noEmit` pulito, ESLint pulito su tutti i file di questa storia (rimossa anche una variabile `atletaIdSelezionato` diventata inutilizzata dopo la sostituzione della sezione).

### File List

**Nuovi:**

- `lib/mese-calendario.ts`
- `lib/mese-calendario.test.ts`

**Modificati:**

- `lib/db-rls/presenza.ts`
- `lib/db-rls/presenza.test.ts`
- `app/(presenze)/storico-presenze/page.tsx`
- `app/(presenze)/storico-presenze/storico-presenze.module.css`

## Change Log

- 2026-07-31: Implementata Story 9.17 — griglia mensile delle presenze per Gruppo (lato Allenatore). Sostituita la sezione "Storico delle mie Atlete" in `/storico-presenze` con una griglia (Gruppo + Mese, Atlete sulle righe, giorni sulle colonne); nuovo helper puro `giorniDelMese`/`meseCorrente` (fuso-orario-safe); nuova query `leggiPresenzeGriglia` filtrata per Slot del Gruppo + Atlete + intervallo di date. "Il mio storico" (Atleta/Genitore) invariato. Nessuna migrazione. 749/749 test passati, 0 errori tsc/eslint. Status: review.
- 2026-07-31: Code review chiusa (Blind Hunter + Edge Case Hunter + Acceptance Auditor) — 0 decision-needed, 2 patch applicati (validazione formato `mese` con fallback al mese corrente, `giorniDelMese` lancia ora un errore esplicito per un formato non valido invece di una cascata di `NaN` silenziosa; guardia su `giorni` vuoto in `leggiPresenzeGriglia`), 7 defer (miglioramenti UX/a11y/perf minori fuori scope), 5 scartati come rumore (scelte già deliberate e documentate o convenzioni già stabilite nel progetto). 751/751 test passati, 0 errori tsc/eslint dopo i fix. Status: done.
