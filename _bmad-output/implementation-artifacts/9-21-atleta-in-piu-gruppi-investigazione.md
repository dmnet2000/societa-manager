---
baseline_commit: 94376f610c8665472b54d97d663826caf03ee766
---

# Story 9.21: Un'Atleta in più Gruppi contemporaneamente

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore/Dirigente,
I want poter assegnare un'Atleta a più di un Gruppo nella stessa stagione (es. Under 16 e anche Under 19, "aggregata" a una categoria superiore),
so that il sistema rispecchi un caso reale del volley giovanile, oggi non gestibile.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-08-01), emersa discutendo la Story 10.6/10.7. Nata come storia di investigazione (nessun AC nella versione originale di `epics.md`) — l'investigazione è stata completata in questa sessione (2026-08-03) **leggendo per intero ogni file coinvolto** invece di assumere dall'elenco originale dei moduli impattati. Risultato: la maggior parte dei moduli richiede **zero modifiche**, il vero collo di bottiglia è solo il vincolo di unicità DB e la semantica "sposta" di `assegnaAtleta`. Vedi `epics.md#Story 9.21` per il testo completo delle decisioni prese con l'utente durante l'investigazione.

**Scoperta chiave (verificata leggendo il codice, non assunta)**: ogni query su `GruppoAtleta` nei moduli consumatori è **già** filtrata per `gruppoId` specifico:
- `app/(presenze)/presenze/page.tsx` (riga ~101): `gruppoAtleta.findMany({ where: { gruppoId: slotSelezionato.gruppoId, ... } })`
- `app/(presenze)/storico-presenze/page.tsx` (riga ~239): `gruppoAtleta.findMany({ where: { gruppoId: gruppoIdSelezionato, ... } })`
- `app/(amministrazione)/vista-dirigente/page.tsx` (riga ~79): `.filter((riga) => riga.gruppoId === gruppo.id)`
- `app/(gruppi-allenatori)/vista-allenatore/page.tsx` (riga ~114): stesso identico filtro
- `app/(gruppi-allenatori)/gruppi/page.tsx` (riga ~124): `atleteDisponibili={atleteMinime}` — **già** l'elenco completo non filtrato, mai stato "solo le disponibili"
- `app/(dati-atleta)/dati-fisici/page.tsx` (riga ~178): **già** deduplicato con `[...new Set(gruppoAtleteRows.map(r => r.atletaId))]` sull'insieme dei Gruppi gestiti dall'Allenatore
- `app/(orari-palestre)/mio-orario/page.tsx` (riga ~122-129, **aggiunto in code review** — assente dall'elenco originale di questa investigazione, gap di completezza segnalato dall'Acceptance Auditor): `prisma.slot.findMany({ where: { gruppo: { annoAgonisticoId: ..., atlete: { some: { atletaId: { in: atletaIds } } } } } } })` — un attraversamento di relazione `some` su `Gruppo.atlete` (`GruppoAtleta[]`, `prisma/schema.prisma` riga 371), non un `gruppoId` fisso: già corretto per costruzione, mostrerà gli Slot di **tutti** i Gruppi dell'Atleta

Nessuno di questi presuppone "un'Atleta ha un solo Gruppo" — funzioneranno correttamente non appena il DB permetterà più righe `GruppoAtleta` per la stessa Atleta+stagione. **Wizard nuova stagione** (`app/(gruppi-allenatori)/wizard-nuova-stagione/actions.ts`, letto per intero): l'assunzione originale di `epics.md` era **errata** — oggi non copia affatto le assegnazioni Gruppo↔Atleta dalla stagione precedente (copia solo `Gruppo` e `GruppoAllenatore`, verificato riga per riga). Nessun cambiamento necessario lì.

## Acceptance Criteria

1. **Given** un'Atleta già assegnata a un Gruppo nella stagione corrente **When** un Admin/Dirigente/Allenatore la assegna a un secondo Gruppo della stessa stagione tramite `assegnaAtleta` **Then** viene aggiunta anche al nuovo Gruppo, resta assegnata anche al Gruppo precedente (nessuno spostamento, entrambe le righe `GruppoAtleta` coesistono)
2. **Given** la stessa Atleta già assegnata a un Gruppo **When** la si "riassegna" allo stesso identico Gruppo **Then** nessuna riga duplicata viene creata (no-op idempotente, comportamento invariato rispetto ad oggi)
3. **And** `rimuoviAtleta` continua a rimuovere solo l'assegnazione al Gruppo specifico indicato, senza toccare le assegnazioni della stessa Atleta in altri Gruppi (comportamento già corretto oggi, invariato)
4. **And** l'Atleta compare nel roster di Presenze e nella griglia di Storico presenze di ciascuno dei Gruppi a cui è assegnata, senza alcun controllo di sovrapposizione oraria tra gli Slot — nessun codice nuovo in quei moduli
5. **And** l'elenco Dati fisici, Vista Dirigente, Vista Allenatore e il badge "certificato in scadenza" mostrano/contano l'Atleta per ciascun Gruppo a cui è assegnata (deduplica solo se lo stesso Allenatore gestisce entrambi i Gruppi in Dati fisici) — nessun codice nuovo in quei moduli
6. **And** nessuna regressione su `creaEAssegnaAtleta` (Story 9.18) né sul Wizard nuova stagione (invariato, non tocca le assegnazioni Gruppo↔Atleta) — suite Vitest invariata sui casi esistenti non impattati

## Tasks / Subtasks

- [x] Task 1: Migrazione schema — allentare il vincolo di unicità (AC: #1, #2)
  - [x] `prisma/schema.prisma`: `GruppoAtleta.@@unique([atletaId, annoAgonisticoId])` → `@@unique([atletaId, gruppoId, annoAgonisticoId])` (riga 502) — permette più righe per la stessa Atleta+stagione su Gruppi diversi, ma blocca comunque un duplicato esatto (stessa Atleta+Gruppo+stagione due volte)
  - [x] Nuova migrazione scritta a mano `prisma/migrations/20260803000000_gruppo_atleta_multi_gruppo/migration.sql` (`DROP` del vecchio indice univoco `gruppo_atlete_atletaId_annoAgonisticoId_key`, `CREATE UNIQUE INDEX` sul nuovo composito) — **non applicata localmente** (nessuna istanza Supabase disponibile in questa sessione, stesso limite già incontrato per altre storie di questo Epic), verifica reale demandata all'utente dopo `prisma migrate deploy` in produzione
  - [x] `npx prisma generate` per rigenerare il Prisma Client con il nuovo nome di chiave composita (`atletaId_gruppoId_annoAgonisticoId`) — confermato: generazione riuscita
- [x] Task 2: `assegnaAtleta` diventa sempre additiva (AC: #1, #2)
  - [x] `app/(gruppi-allenatori)/gruppi/actions.ts`, `assegnaAtleta` (righe ~232-245): l'upsert cambia chiave da `atletaId_annoAgonisticoId` a `atletaId_gruppoId_annoAgonisticoId` — `create` invariato, `update` diventa un no-op reale (stesso `gruppoId` della chiave, nessun campo cambia davvero) invece del "move" di oggi
  - [x] Aggiornare il commento sopra l'upsert (righe 232-238, spiega ancora "un'Atleta ha un solo Gruppo per Anno Agonistico... riassegnare a un Gruppo diverso sostituisce l'assegnazione precedente" — non più vero)
  - [x] `creaEAssegnaAtleta` (stessa funzione file, upsert riga ~482-495): stessa chiave da aggiornare per coerenza — l'`update` resta di fatto irraggiungibile (una nuova Atleta appena creata non può già avere una riga `GruppoAtleta`), nessun cambio di comportamento reale qui, solo allineamento al nuovo nome di chiave (altrimenti errore di compilazione Prisma dopo la rigenerazione del client)
  - [x] `app/(gruppi-allenatori)/gruppi/actions.test.ts`: aggiornare il test `"upserts on (atletaId, annoAgonisticoId) using the Gruppo's own season (AC #1, #2, #3)"` (riga 363) — rinominare e aggiornare l'asserzione `toHaveBeenCalledWith` sulla nuova chiave; aggiungere un nuovo test esplicito "assigning an Atleta already in a different Gruppo adds her there too, without touching the other assignment" (verifica che l'upsert usi la chiave composita col nuovo `gruppoId`, non tocchi/cancelli righe di altri Gruppi); aggiornare gli altri riferimenti a `atletaId_annoAgonisticoId` nel file (riga ~373, ~891) — confermato: 56/56 test nel file (1 nuovo)
- [x] Task 3: Correggere i commenti stale su "assegnare sposta" (AC: #1)
  - [x] `app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` (righe 112-116): il commento spiega ancora "assegnarle sposta l'assegnazione... riassegnazione self-service esplicitamente accettata" — non più vero con la semantica additiva. La logica di filtro sotto (`idAssegnati` = solo Atlete di QUESTO Gruppo) resta **corretta e invariata** anche col nuovo comportamento (è già l'elenco giusto: un'Atleta di un altro Gruppo va mostrata come disponibile per l'aggiunta) — correggere solo il commento, non il codice
- [x] Task 4: Verifica regressione e conferma finale dell'investigazione (AC: #4, #5, #6)
  - [x] Suite Vitest completa: tutti i test passano, nessuna regressione sui test esistenti di `assegnaAtleta`/`rimuoviAtleta`/`creaEAssegnaAtleta` — 847/847 (era 846/846, +1 nuovo)
  - [x] `npx tsc --noEmit` pulito (verificato anche con una grep mirata: nessun riferimento residuo alla vecchia chiave `atletaId_annoAgonisticoId` in nessun file `.ts` del progetto); ESLint pulito sui file toccati
  - [x] Nessuna modifica a `presenze/page.tsx`, `storico-presenze/page.tsx`, `dati-fisici/page.tsx`, `vista-dirigente/page.tsx`, `vista-allenatore/page.tsx`, `gruppi/page.tsx`, `rimuoviAtleta`, `wizard-nuova-stagione/actions.ts` — confermato dall'investigazione che non ne serve nessuna
  - [x] Verifica manuale dal vivo demandata all'utente dopo il deploy (nessuna istanza Supabase locale disponibile in questa sessione): assegnare un'Atleta a un secondo Gruppo, verificare che compaia in entrambi su `/gruppi`, `/presenze` (roster di Slot di entrambi i Gruppi), `/storico-presenze` (griglia di entrambi), `/dati-fisici` (se Allenatori diversi), `/vista-dirigente`/`/vista-allenatore` (conteggio duplicato)

## Dev Notes

- **Perimetro esatto**: `prisma/schema.prisma` (vincolo `GruppoAtleta`) + nuova migrazione; `app/(gruppi-allenatori)/gruppi/actions.ts` (`assegnaAtleta`, `creaEAssegnaAtleta` — solo la chiave dell'upsert) + `actions.test.ts`; `app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` (solo commento). **Nessun altro file da toccare** — l'investigazione (vedi sopra, verificata leggendo ogni file) ha escluso esplicitamente `presenze`, `storico-presenze`, `dati-fisici`, `vista-dirigente`, `vista-allenatore`, `gruppi/page.tsx`, `rimuoviAtleta`, `wizard-nuova-stagione`.
- **Perché il nome della chiave composita cambia**: Prisma genera automaticamente il nome della chiave `@@unique` concatenando i nomi dei campi nell'ordine dichiarato (`atletaId_annoAgonisticoId` oggi). Cambiando l'ordine/i campi dichiarati (`[atletaId, gruppoId, annoAgonisticoId]`), il nome diventa `atletaId_gruppoId_annoAgonisticoId` — ogni `where: { atletaId_annoAgonisticoId: {...} }` esistente nel codice smette di compilare dopo `npx prisma generate`, quindi **tutti** i punti che la usano (due nel file `actions.ts`, più i mock nei test) vanno aggiornati insieme, non solo `assegnaAtleta`.
- **Perché l'`update` dell'upsert diventa un no-op reale invece che sparire**: la chiave composita include ora anche `gruppoId`, quindi l'upsert su `(atletaId, gruppoId, annoAgonisticoId)` per un'Atleta già in quello specifico Gruppo trova la riga esistente e la "aggiorna" con **esattamente gli stessi valori** (AC #2, idempotenza) — non serve rimuovere il ramo `update`, resta corretto e utile per il caso "riassegna la stessa Atleta allo stesso Gruppo" (es. doppio click), semplicemente non può più toccare una riga di un **altro** Gruppo perché quella riga non condivide più la stessa chiave.
- **Perché `rimuoviAtleta` non richiede alcuna modifica**: già oggi usa `deleteMany({ where: { atletaId, annoAgonisticoId, gruppoId } })` (Story 9.14) — scoped sui tre campi, incluso `gruppoId`, esattamente il comportamento "rimuovi solo da questo Gruppo" richiesto da AC #3. Verificato leggendo il file, non assunto.
- **Perché il Wizard nuova stagione non serve toccarlo**: l'assunzione originale in `epics.md` ("la copia delle assegnazioni Gruppo↔Atleta andrebbe estesa a copiare tutte le righe, non una sola") presupponeva che il Wizard copiasse già le assegnazioni Atleta oggi — **falso**, verificato leggendo `confermaWizardNuovaStagione` per intero: l'unico `$transaction` costruito copia solo `prisma.gruppo.create` e `prisma.gruppoAllenatore.create` per ogni Gruppo precedente, nessun riferimento a `gruppoAtleta` in tutto il file. Le Atlete vanno sempre riassegnate manualmente ad ogni nuova stagione, comportamento già così oggi anche per il caso a un solo Gruppo — non una regressione di questa storia, né qualcosa da "estendere".
- **Decisioni di comportamento confermate con l'utente** (vedi `epics.md#Story 9.21` per il testo completo): conteggio duplicato per Gruppo (non deduplicato) in Vista Dirigente/Vista Allenatore/badge certificato; nessun controllo di sovrapposizione oraria tra Slot di Gruppi diversi in Presenze; un'Atleta condivisa compare nell'elenco Dati fisici di entrambi gli Allenatori se diversi. Tutti e tre risultano già il comportamento naturale del codice esistente (nessun codice da scrivere per implementarli), confermati per lettura diretta.
- **File NON da toccare**: `app/(presenze)/presenze/page.tsx`, `app/(presenze)/storico-presenze/page.tsx`, `app/(dati-atleta)/dati-fisici/page.tsx`, `app/(amministrazione)/vista-dirigente/page.tsx`, `app/(gruppi-allenatori)/vista-allenatore/page.tsx`, `app/(gruppi-allenatori)/gruppi/page.tsx`, `app/(gruppi-allenatori)/wizard-nuova-stagione/actions.ts`, `rimuoviAtleta` (stessa funzione di `actions.ts`, ma nessuna modifica al suo corpo).

### Project Structure Notes

- File nuovi: `prisma/migrations/20260803000000_gruppo_atleta_multi_gruppo/migration.sql`.
- File modificati: `prisma/schema.prisma` (vincolo `GruppoAtleta`), `app/(gruppi-allenatori)/gruppi/actions.ts` (`assegnaAtleta`/`creaEAssegnaAtleta`, solo la chiave dell'upsert + commenti), `app/(gruppi-allenatori)/gruppi/actions.test.ts` (chiave aggiornata + nuovo test), `app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` (solo commento).
- Nessun file eliminato.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.21: Un'Atleta in più Gruppi contemporaneamente — decisioni complete prese con l'utente in fase di investigazione]
- [Source: prisma/schema.prisma riga 492-504 — model GruppoAtleta, vincolo da modificare]
- [Source: app/(gruppi-allenatori)/gruppi/actions.ts righe 182-260 — assegnaAtleta/rimuoviAtleta, upsert da aggiornare]
- [Source: app/(gruppi-allenatori)/gruppi/actions.ts righe 328-500 circa — creaEAssegnaAtleta, stessa chiave da allineare]
- [Source: app/(gruppi-allenatori)/gruppi/actions.test.ts riga 363 — test dell'upsert da rinominare/aggiornare]
- [Source: app/(gruppi-allenatori)/i-miei-gruppi/page.tsx righe 103-120 — commento stale su "assegnarle sposta l'assegnazione"]
- [Source: app/(presenze)/presenze/page.tsx riga 101, app/(presenze)/storico-presenze/page.tsx riga 239, app/(amministrazione)/vista-dirigente/page.tsx riga 79, app/(gruppi-allenatori)/vista-allenatore/page.tsx riga 114, app/(gruppi-allenatori)/gruppi/page.tsx riga 124, app/(dati-atleta)/dati-fisici/page.tsx riga 178 — query già scoped per gruppoId, verificate per confermare che NON servono modifiche]
- [Source: app/(gruppi-allenatori)/wizard-nuova-stagione/actions.ts, confermaWizardNuovaStagione — letto per intero, non copia GruppoAtleta oggi, l'assunzione originale di epics.md era errata]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

### Completion Notes List

- Investigazione completata con l'utente in questa sessione (decisioni raccolte via domande mirate, non assunte) prima di scrivere qualunque AC — vedi `epics.md#Story 9.21` per il testo completo.
- Scoperta chiave confermata leggendo ogni file coinvolto: 6 dei moduli elencati nell'assunzione originale (`presenze`, `storico-presenze`, `dati-fisici`, `vista-dirigente`, `vista-allenatore`, `gruppi/page.tsx`) non necessitavano alcuna modifica — tutte le query `GruppoAtleta` sono già scoped per `gruppoId` specifico o già deduplicate correttamente. L'assunzione su `wizard-nuova-stagione` era errata: non copia le assegnazioni Gruppo↔Atleta oggi, verificato leggendo `confermaWizardNuovaStagione` per intero.
- Perimetro reale implementato: migrazione schema (vincolo `GruppoAtleta` da `[atletaId, annoAgonisticoId]` a `[atletaId, gruppoId, annoAgonisticoId]`) + `assegnaAtleta`/`creaEAssegnaAtleta` (stessa chiave aggiornata nell'upsert, comportamento ora sempre additivo invece di "sposta") + un commento stale corretto in `i-miei-gruppi/page.tsx` (la logica di filtro sotto era già corretta, solo il commento descriveva il vecchio comportamento).
- `rimuoviAtleta` non toccata: già scoped su `gruppoId` (Story 9.14), continua a rimuovere solo dal Gruppo specifico senza toccare altre assegnazioni della stessa Atleta.
- Nuovo test esplicito che verifica il comportamento additivo (assegnare a un secondo Gruppo non tocca la prima assegnazione, un solo upsert chiamato).
- Migrazione scritta a mano, non applicata localmente (nessuna istanza Supabase disponibile in questa sessione, stesso limite di altre storie di questo Epic) — `npx prisma generate` eseguito con successo contro il nuovo schema.
- Verifica finale: 847/847 test Vitest passati (era 846/846, +1 nuovo), `tsc --noEmit` pulito (confermato anche con una grep mirata: zero riferimenti residui alla vecchia chiave in tutto il progetto), ESLint pulito sui file toccati.

### File List

- `prisma/schema.prisma` (modificato — vincolo `GruppoAtleta` + commento a livello di modello)
- `prisma/migrations/20260803000000_gruppo_atleta_multi_gruppo/migration.sql` (nuovo)
- `app/(gruppi-allenatori)/gruppi/actions.ts` (modificato — `assegnaAtleta`/`creaEAssegnaAtleta`, chiave upsert + commenti)
- `app/(gruppi-allenatori)/gruppi/actions.test.ts` (modificato — chiave aggiornata in 2 test esistenti, 2 nuovi test)
- `app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` (modificato — solo commento)
- `app/(gruppi-allenatori)/i-miei-gruppi/MioGruppoCard.tsx` (modificato in code review — solo commento)
- `lib/utenti/email-destinatari-atleta.ts` (modificato in code review — `findFirst` → `findMany`, bug reale trovato in review)
- `lib/utenti/email-destinatari-atleta.test.ts` (modificato in code review — mock aggiornato, 1 nuovo test)

### Review Findings

- [x] [Review][Patch] `elencaEmailCollegateAdAtleta` (`lib/utenti/email-destinatari-atleta.ts`) usava `gruppoAtleta.findFirst` senza filtro `gruppoId` — con un'Atleta ora assegnabile a più Gruppi, sceglieva una riga arbitraria e notificava gli Allenatori di **un solo** Gruppo, regredendo silenziosamente il promemoria scadenza certificato (Story 4.6, cron `promemoria-certificati`) per un'Atleta multi-Gruppo — risolto: `findFirst` → `findMany`, unione degli Allenatori di tutte le righe trovate, stesso pattern di dedup già esistente. Trovato indipendentemente da Blind Hunter ed Edge Case Hunter.
- [x] [Review][Patch] Commento stale in `MioGruppoCard.tsx` (righe 77-81): la giustificazione del `window.confirm()` parlava ancora di "spostare" un'Atleta — risolto, corretto per riflettere il comportamento additivo (Story 9.21)
- [x] [Review][Patch] Commento stale a livello di modello in `prisma/schema.prisma` (righe 486-491): affermava ancora "un'Atleta ha un solo Gruppo per Anno Agonistico (AC #2)" come vincolo DB, in contraddizione diretta col commento aggiornato 3 righe sotto sullo stesso `@@unique` — risolto
- [x] [Review][Patch] Nessun test di regressione dedicato per lo scenario esplicitamente citato da AC #3 (Atleta in due Gruppi, rimossa da uno solo, resta nell'altro) — risolto: nuovo test su `rimuoviAtleta`
- [x] [Review][Patch] Gap di completezza nell'investigazione: `app/(orari-palestre)/mio-orario/page.tsx` (vista orario personale di Atleta/Genitore) non era menzionato nell'elenco dei moduli verificati, nonostante interroghi `GruppoAtleta` transitivamente (`Gruppo.atlete`) — risolto: aggiunto all'elenco "Scoperta chiave" con verifica esplicita (già corretto per costruzione, attraversamento di relazione `some`, non un `gruppoId` fisso)

**Dismessi come rumore/fuori scope/convenzioni già accettate (7):** migrazione non applicata/testata localmente — limite già accettato in tutta questa sessione (nessuna istanza Supabase disponibile); nessun piano di rollback/down-migration — nessun precedente in questo progetto; timestamp di migrazione scritto a mano invece che generato da `prisma migrate dev` — stessa convenzione già stabilita per ogni migrazione di questa sessione; `update: { gruppoId }` nell'upsert descritto come "auto-assegnazione inutile" — intenzionale e già giustificato nei Dev Notes (garantisce l'idempotenza di AC #2); nessun segnale UI che un'Atleta è già in un altro Gruppo — nessun AC lo richiede, fuori scope; test che verifica solo gli argomenti della chiamata mock e non lo stato finale — coerente con la convenzione di test unitari (mock, non integrazione) già in uso in tutto il progetto; presunta asimmetria nell'aggiornamento dei commenti tra `i-miei-gruppi/page.tsx` e `gruppi/page.tsx` — falso positivo, quest'ultimo non aveva alcun commento equivalente da correggere.

## Change Log

- 2026-08-03: Investigazione completata con l'utente, trasformata in story implementativa e sviluppata nella stessa sessione. Perimetro reale molto più ridotto dell'assunzione originale di epics.md: solo vincolo DB + `assegnaAtleta`/`creaEAssegnaAtleta` (ora additive invece di "sposta") + un commento. Nessuna modifica a Presenze/Storico presenze/Dati fisici/Vista Dirigente/Vista Allenatore/Wizard nuova stagione — confermato non necessaria leggendo ogni file. 847/847 test passati (1 nuovo), 0 errori tsc/eslint. Status: review.
- 2026-08-03: Code review completata (Blind Hunter + Edge Case Hunter + Acceptance Auditor) - tutte le 7 affermazioni "zero modifiche necessarie" verificate indipendentemente corrette da entrambi Edge Case Hunter e Acceptance Auditor (che ha anche confermato il naming Prisma della migrazione). Trovato e risolto un bug reale non pre-esistente: `elencaEmailCollegateAdAtleta` usava `findFirst` senza `gruppoId`, notificando gli Allenatori di un solo Gruppo invece di tutti (regressione silenziosa del promemoria certificati, Story 4.6). 4 patch totali applicati (bug findFirst/findMany, 2 commenti stale corretti, 1 test di regressione AC #3 aggiunto) + 1 gap di completezza dell'investigazione colmato (mio-orario/page.tsx, confermato comunque già corretto). 7 scartati come falsi positivi/fuori scope/convenzioni già accettate. 849/849 test passati (2 nuovi), 0 errori tsc/eslint dopo i fix. Status: done.
