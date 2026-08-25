---
title: "Story 20.11: Numero progressivo delle gare del Torneo"
type: 'feature'
created: '2026-08-25'
status: 'done'
review_loop_iteration: 1
context: []
baseline_commit: 'cc03659b587c9a7b6f2317c9bd95ced07b941721'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** una `PartitaTorneo` (girone, semifinale, finale) non ha oggi alcun numero identificativo - non c'è modo per un Admin, un arbitro/segnapunti o un Visitatore di riferirsi a un incontro specifico per numero (es. "Gara 12"), come già avviene per le gare importate da un Campionato federale (`Partita.garaNumero`, Story 10.2 - lì è una stringa esterna importata da un file, qui va generato internamente).

**Approach:** deciso con l'utente tramite domande dirette (2026-08-25) - `PartitaTorneo` guadagna un campo `numero Int`, calcolato SEMPRE automaticamente al momento della generazione (mai un input manuale dell'Admin), come un'unica sequenza progressiva che attraversa **l'intera Edizione** (non la singola Categoria - un weekend di torneo ospita più Categorie in parallelo, stessa scelta di scoping già presa per `SlotTorneo`, Story 20.9) e **non riparte mai** tra girone e fasi successive (semifinali/finali generate in un secondo momento continuano semplicemente a salire).

## Boundaries & Constraints

**Always:** `numero` è unico per `edizioneTorneoId` (vincolo `@@unique` a livello DB, il vero cancello - stesso principio "mai fidarsi solo della disciplina applicativa" già in uso in tutta l'epica). Il numero è SEMPRE calcolato server-side al momento della generazione (`generaCalendarioGironiAction`, `generaTabelloneAction`, `generaFinaliSeCompletate`) - mai accettato da un form/input dell'Admin. La sequenza è calcolata leggendo il numero massimo già assegnato nell'Edizione (`MAX(numero) WHERE edizioneTorneoId = ...`) e incrementando da lì per tutte le righe di un'unica generazione (una lettura, poi N numeri consecutivi assegnati localmente prima dell'insert in blocco).

**Ask First:** nessuna - tutti i punti erano aperti, chiariti con l'utente tramite `AskUserQuestion` prima di questa spec.

**Never:** nessun campo `numero` editabile a mano in nessun form (decisione esplicita dell'utente - "solo automatico"). Nessuna numerazione che riparte per Categoria o per fase (decisione esplicita - "per Edizione" e "stessa sequenza"). Nessun retry automatico lato server in caso di collisione concorrente sul numero (stesso principio "accettato, pannello a bassa concorrenza" già applicato a ogni altra race condition di questa epica, es. Story 20.9 Deferred) - una collisione (P2002 sul nuovo vincolo) restituisce un messaggio esplicito che invita l'Admin a riprovare, mai un crash o un messaggio fuorviante.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Prima generazione di calendario nell'Edizione (nessuna PartitaTorneo esistente) | edizione vuota | le partite generate ricevono i numeri 1, 2, 3, ... in sequenza | N/A |
| Seconda Categoria della stessa Edizione genera il proprio calendario dopo la prima | edizione con partite già numerate 1..N | la nuova Categoria riceve numeri N+1, N+2, ... - MAI 1, 2, 3 | N/A |
| Generazione del tabellone (4 semifinali) di una Categoria | classifica di girone completa | le 4 semifinali ricevono i 4 numeri successivi al massimo attuale dell'Edizione (continuano la stessa sequenza del girone, mai una numerazione propria) | N/A |
| Generazione automatica delle 2 finali (side-effect) | entrambe le semifinali di un tabellone complete | le 2 finali ricevono i 2 numeri successivi | N/A |
| Due generazioni concorrenti nella stessa Edizione producono lo stesso numero (race, check-then-act non atomico) | collisione reale, rara | il vincolo unico DB rifiuta l'insert (P2002 sul nuovo vincolo, distinto da quello esistente su categoriaTorneoId+squadraCasaId+squadraOspiteId) | messaggio esplicito "riprova", mai confuso con "calendario già generato" |
| Visualizzazione di un incontro (Admin o pubblico) | qualunque partita generata da questa storia in poi | il numero è sempre mostrato ("Gara N") | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- `PartitaTorneo` guadagna `edizioneTorneoId String` (denormalizzato da `categoriaTorneo.edizioneTorneoId` - necessario per esprimere `@@unique([edizioneTorneoId, numero])` senza attraversare la FK verso `categorie_torneo`) + relazione `edizioneTorneo EdizioneTorneo @relation(fields: [edizioneTorneoId], references: [id])` (FK senza `onDelete` esplicito, default Restrict, stesso trattamento di ogni altra FK strutturale Torneo) + `numero Int` + `@@unique([edizioneTorneoId, numero])`. `EdizioneTorneo` guadagna la relazione inversa `partite PartitaTorneo[]` (stesso trattamento di "categorie"/"slot" già presenti, con lo stesso commento esplicativo "relazione inversa richiesta da Prisma").
- **Nuova migrazione** -- `ALTER TABLE partite_torneo ADD COLUMN "edizioneTorneoId" TEXT` (nullable inizialmente) + `ADD COLUMN "numero" INTEGER` (nullable inizialmente) + backfill per eventuali righe pre-esistenti (`UPDATE ... SET "edizioneTorneoId" = ct."edizioneTorneoId" FROM categorie_torneo ct WHERE pt."categoriaTorneoId" = ct.id`, poi `numero` assegnato con `ROW_NUMBER() OVER (PARTITION BY "edizioneTorneoId" ORDER BY "createdAt")` - stesso principio "migrazione sicura anche se la tabella non è vuota" già applicato in Story 20.7 per `EdizioneTorneo.nome`) + `ALTER COLUMN ... SET NOT NULL` su entrambe + `ADD CONSTRAINT ..._fkey` (mirror esatto delle FK Torneo esistenti, vedi `20260825020000_add_slot_torneo/migration.sql` per la sintassi/naming esatti) + `CREATE UNIQUE INDEX "partite_torneo_edizioneTorneoId_numero_key" ON "partite_torneo"("edizioneTorneoId", "numero")` (stessa sintassi `CREATE UNIQUE INDEX`, non `ADD CONSTRAINT ... UNIQUE` - mirror esatto di come Prisma ha già generato l'indice unico esistente su `categoriaTorneoId`+`squadraCasaId`+`squadraOspiteId`, vedi `20260823020000_add_partita_torneo/migration.sql` riga 38, per la convenzione di naming da replicare).
- `lib/torneo.ts` -- nuova funzione `prossimoNumeroPartitaTorneo(edizioneTorneoId: string): Promise<number>` (`prisma.partitaTorneo.findFirst({ where: { edizioneTorneoId }, orderBy: { numero: "desc" }, select: { numero: true } })`, ritorna `(riga?.numero ?? 0) + 1`). `creaPartiteTorneo`: il tipo del parametro `righe` guadagna `edizioneTorneoId: string` e `numero: number` (entrambi obbligatori, non opzionali - il chiamante li calcola sempre prima di invocare questa funzione). `elencaPartiteTorneo`: `orderBy` semplificato a `[{ numero: "asc" }]` (sostituisce l'attuale `[{ squadraCasa: { girone } }, { squadraCasa: { nome } }, { squadraOspite: { nome } }]` - dato che `numero` è una sequenza globale assegnata per blocchi consecutivi per girone/fase, ordinare per `numero` produce già un raggruppamento naturale equivalente, con il vantaggio aggiuntivo di riflettere l'ordine reale di generazione/gioco).
- `app/app/(torneo)/torneo/actions.ts` -- nuovo helper privato `erroreNumeroPartitaTorneoDuplicato(err: unknown): boolean` (controlla `err.code === "P2002"` E `err.meta?.target` contiene `"numero"` - Prisma su Postgres popola `meta.target` come array dei nomi colonna del vincolo violato). Applicato in tre punti:
  1. `generaCalendarioGironiAction`: dopo aver costruito le coppie di girone (`generaCoppieGirone` invariata), leggere `const prossimoNumero = await prossimoNumeroPartitaTorneo(categoria.edizioneTorneoId)` e mappare ogni riga con `edizioneTorneoId: categoria.edizioneTorneoId, numero: prossimoNumero + indice` prima di `creaPartiteTorneo`. Nel blocco `catch`, se `erroreNumeroPartitaTorneoDuplicato(err)` è vero, ritornare `{ error: { code: "INTERNAL", message: "Numero gara in conflitto con un'altra generazione avvenuta nello stesso istante. Riprova." } }` PRIMA del controllo esistente (altrimenti una collisione sul nuovo vincolo verrebbe scambiata per "calendario già generato", messaggio falso: la Categoria non ha ancora nessuna partita).
  2. `generaTabelloneAction`: stesso schema - `prossimoNumeroPartitaTorneo(categoria.edizioneTorneoId)` prima di costruire le 4 righe delle semifinali, stessa distinzione nel `catch` (altrimenti una collisione verrebbe scambiata per "tabellone già generato").
  3. `generaFinaliSeCompletate` (ha già `edizioneTorneoId` come parametro): stesso schema per le 2 righe delle finali. Nel `catch` esistente, la re-verifica "le finali esistono già davvero" (idempotenza) va eseguita SOLO se `!erroreNumeroPartitaTorneoDuplicato(err)` - una collisione sul numero non è mai un caso di idempotenza, va sempre ripropagata (`throw err`, che risale fino al `catch` di `salvaRisultatoPartitaTorneoAction`, già gestito con un messaggio "Riprova" generico esistente, invariato).
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/RisultatoPartitaTorneoForm.tsx` (componente condiviso con `tabellone/page.tsx`, invariato altrove) -- tipo `Partita` guadagna `numero: number`; mostrare "Gara {numero}" nella riga di riepilogo esistente (`<p><strong>{squadraCasa}</strong> vs...`), come uno `<span>` con una nuova classe `.numeroGara` in `torneo.module.css` (stile semplice, `font-weight:700; color: var(--color-text-secondary)`).
- `app/torneo/page.tsx` (pubblico) -- in ognuna delle 4 varianti di `matchCard` già esistenti (girone, semifinale, finaleVincenti, finalePerdenti), aggiungere un nuovo `<div className={styles.numeroGara}>Gara {partita.numero}</div>` come primo figlio (sopra `.squadre` per il girone, sopra `.categoria` per semifinale/finale). Nuova classe `.numeroGara` in `torneo-pubblico.module.css`: `composes: categoria;` (stessa tipografia label-tag già in uso per l'etichetta di fase, mirror del pattern `composes` già stabilito nel progetto, es. `.bottoneDanger` in `torneo.module.css` amministrativo).

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + migrazione (colonna + backfill + FK + vincolo unico)
- [x] `lib/torneo.ts` -- `prossimoNumeroPartitaTorneo`, `creaPartiteTorneo` esteso, `elencaPartiteTorneo` riordinato + test
- [x] `torneo/actions.ts` -- numerazione nelle 3 generazioni + distinzione P2002 numero/idempotenza + test
- [x] `RisultatoPartitaTorneoForm.tsx` + `torneo.module.css` -- "Gara N" nella riga admin
- [x] `app/torneo/page.tsx` + `torneo-pubblico.module.css` -- "Gara N" sulle 4 varianti di match-card pubbliche
- [x] `lib/guida/contenuti.ts` -- aggiornare la sezione `/app/torneo` per menzionare il numero di gara (regola permanente di questa sessione: aggiornare la guida in-app ad ogni story che tocca una funzionalità già documentata)

**Acceptance Criteria:** vedi `epics.md` Story 20.11 (Given/When/Then - **da scrivere in questa stessa story**, l'entry attuale in epics.md contiene solo As-a/I-want/So-that e i "punti aperti" ora risolti; aggiungere gli AC completi verbatim usando le decisioni di questo spec prima di chiudere la storia, stesso obbligo già seguito per ogni story precedente di questa sessione).

## Design Notes

**Perché una colonna denormalizzata `edizioneTorneoId` su `PartitaTorneo` invece di derivarla sempre da `categoriaTorneo.edizioneTorneoId`:** un vincolo `@@unique` in Postgres non può attraversare una relazione - serve una colonna reale sulla stessa tabella. Stesso principio già accettato per `SlotTorneo.edizioneTorneoId` (Story 20.9), anche se lì la motivazione era diversa (Slot non appartiene affatto a una Categoria). Qui la colonna è puramente denormalizzata (il valore "vero" resta comunque derivabile da `categoriaTorneo.edizioneTorneoId` e DEVE sempre coincidere) - va scritta una sola volta alla creazione (mai aggiornata dopo, `PartitaTorneo.categoriaTorneoId` stesso non cambia mai dopo la creazione in questa epica).

**Perché "leggi il massimo, poi incrementa localmente" invece di una sequence Postgres nativa:** la sequenza deve essere condivisa tra CATEGORIE diverse ma è comunque per-Edizione (non globale a tutto il database) - una `SEQUENCE` Postgres nativa sarebbe globale o richiederebbe una gestione manuale multi-sequence altrettanto complessa quanto il semplice `MAX(numero)+1` già usato altrove nel progetto per pattern simili (nessun precedente diretto in questo progetto, ma coerente con la filosofia generale "niente meccanismi DB avanzati quando basta una query semplice", vista la bassa concorrenza attesa su un pannello amministrativo).

**Perché la collisione P2002 sul nuovo vincolo NON deve mai essere interpretata come idempotenza:** a differenza del vincolo esistente su `(categoriaTorneoId, squadraCasaId, squadraOspiteId)` (dove una violazione significa quasi sempre "questa esatta generazione è già avvenuta, richiesta duplicata"), una violazione sul vincolo `(edizioneTorneoId, numero)` significa quasi sempre l'opposto: QUESTA generazione non è mai avvenuta, è un'altra generazione CONCORRENTE (di un'altra Categoria, o della stessa in un'altra richiesta) ad aver preso nel frattempo lo stesso numero. Trattarla come idempotenza restituirebbe un messaggio falso ("già generato") su una Categoria che in realtà non ha ricevuto nessuna partita.

## Verification

**Commands:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx prisma validate`

**Manual checks (obbligatorio):** non eseguibile in questa sessione - ambiente di sviluppo locale rotto (Prisma WASM + Windows), Epic 20 mai deployata in produzione.

## Spec Change Log

Implementazione delegata a un agente in background (interrotto da un errore di rete transitorio a verifica quasi completata, non un problema di codice - ripreso e verificato personalmente file per file). Review a 3 agenti in parallelo (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) su diff isolato dal baseline (1207 righe).

**Verificato esplicitamente, nessun problema:** ordine dei controlli P2002 (numero PRIMA di idempotenza) corretto in tutti e 3 i punti di generazione; allineamento indice/array in `numero: prossimoNumero + indice` in tutti e 3 i punti (nessun array intermedio disallineato); migrazione sicura anche su tabella non vuota (backfill deterministico con tie-break su `id`), sintassi/naming dei vincoli mirror esatto delle migrazioni Torneo esistenti; cambio di `orderBy` di `elencaPartiteTorneo` (girone/nome → `numero asc`) verificato non avere effetti collaterali su nessun consumatore (classifiche, auto-assegnazione Slot, generazione finali); `edizioneTorneoId` denormalizzato non può mai disallinearsi (nessuna azione permette di spostare una Partita tra Categorie); tutti i 7 AC di epics.md verificati puntualmente, implementati e testati; nessun campo `numero` editabile a mano in nessun form.

**PATCH (applicato):**
1. Nessun test verificava esplicitamente la continuazione della sequenza (AC #4, valore di `prossimoNumeroPartitaTorneo` > 1) per la generazione automatica delle finali - tutti gli altri due punti (girone, tabellone) avevano già un test dedicato per questo scenario, solo le finali no. Aggiunto test mirror in `salvaRisultatoPartitaTorneoAction > automatic finali generation`.

**REJECT (nessuna azione, con motivazione verificata):**
- Edge Case Hunter aveva segnalato "nessun test per `erroreNumeroPartitaTorneoDuplicato` con `err.meta` assente/malformato" - verificato che è FALSO: i test preesistenti per l'idempotenza (mirror di Story 20.3/20.4, non toccati da questa storia) usano già `Object.assign(new Error(...), { code: "P2002" })` SENZA alcun `meta`, in tutti e 3 i punti di generazione (righe ~1714, 2173, 2845, 2902 di `actions.test.ts`) - il fallback "meta assente → non è una collisione di numero → tratta come idempotenza" è quindi già esercitato da test esistenti, solo non etichettato esplicitamente come tale.
- Fragilità teorica di `Array.isArray(target)` su provider Prisma diversi da Postgres (Blind Hunter/Edge Case Hunter) - verificato che `prisma/schema.prisma` dichiara `provider = "postgresql"` come unico datasource del progetto: scenario non raggiungibile oggi, nessuna azione.

**DEFER (annotati in `deferred-work.md`):**
- Race TOCTOU tra lettura del massimo e insert nei 3 punti di generazione - stesso pattern "check-then-act, il vero cancello è il vincolo DB" già accettato ovunque nell'epica.
- Caso limite raro (Blind Hunter): doppio-submit della stessa richiesta di generazione può produrre un messaggio d'errore impreciso ("conflitto numero" invece di "già generato") al primo tentativo, autocorretto al retry successivo - nessuna inconsistenza permanente.
