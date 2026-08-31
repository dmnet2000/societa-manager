---
title: 'Story 20.18: Campi delle Palestre nella generazione in blocco degli Slot di girone'
type: 'feature'
created: '2026-08-30'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '4fa9d2ab4e3275101b9f0d52c1c92460f1b8fb74'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `SlotTorneo` (Story 20.9) è FK diretta solo verso `Palestra`, mai verso `Campo` (a differenza dello `Slot` "normale", Epic 2). La generazione in blocco (Story 20.12) crea un solo `SlotTorneo` per ciascuna Palestra esistente, ignorando i Campi — una Palestra a doppio campo produce oggi un unico Slot indistinto, impossibile da sdoppiare in due Slot paralleli (uno per Campo) per ospitare due incontri in contemporanea.

**Approach:** `SlotTorneo` guadagna `campoId` (FK opzionale verso `Campo`, Epic 2, riuso diretto). Il form di generazione in blocco (fase GIRONE) mostra una checklist con una riga selezionabile per ciascun Campo di ciascuna Palestra (o una riga "sola Palestra" se non ha Campi censiti), tutte preselezionate di default — l'Admin deseleziona quelle che non gli servono prima di inviare (deciso con l'utente, `AskUserQuestion`, 2026-08-30).

## Boundaries & Constraints

**Always:** l'insieme Palestra×Campo valido è SEMPRE ricalcolato server-side al momento della creazione — le righe selezionate inviate dal client vengono filtrate contro quell'insieme, mai fidate direttamente (stessa disciplina di Story 20.12). Ogni riga creata resta un `SlotTorneo` indipendente, cancellabile singolarmente come oggi (nessuna nuova entità "gruppo"). Ovunque un `SlotTorneo` con Campo assegnato viene mostrato, il nome del Campo compare accanto al nome della Palestra.

**Ask First:** nessuna — risolto con l'utente prima di questa spec.

**Never:** nessuna modifica al form/percorso di creazione singola (semifinali/finali, Story 20.9) — resta legato solo a Palestra, bit per bit invariato. Nessun vincolo di unicità nuovo su `SlotTorneo`. Nessuna modifica all'assegnazione manuale/automatica esistente oltre alla sola visualizzazione del Campo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fase GIRONE, Palestra con 2 Campi, entrambi selezionati | 2 righe checklist selezionate | 2 `SlotTorneo` creati, `campoId` distinto per ciascuno | N/A |
| Fase GIRONE, Palestra con 2 Campi, un solo Campo selezionato | 1 riga selezionata per quella Palestra | 1 `SlotTorneo` creato con quel `campoId` | N/A |
| Fase GIRONE, Palestra senza Campi censiti | riga "sola Palestra" selezionata | 1 `SlotTorneo` con `campoId` null (comportamento pre-esistente) | N/A |
| Fase GIRONE, tutte le righe deselezionate | selezione vuota inviata | creazione rifiutata | `VALIDATION` |
| Fase GIRONE, nessuna Palestra censita | 0 Palestre nel gestionale | creazione rifiutata (comportamento Story 20.12 invariato) | `VALIDATION` |
| Selezione manomessa (id inesistente o combinazione Palestra/Campo non valida) | valori arbitrari nel FormData | riga ignorata, mai creata (filtrata silenziosamente contro l'insieme server-side) | N/A |
| Fase SEMIFINALE/FINALE_VINCENTI/FINALE_PERDENTI | comportamento Story 20.9 invariato | 1 riga per la Palestra scelta esplicitamente, nessun `campoId` | invariato |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- `SlotTorneo` guadagna `campoId String?` + relazione `campo Campo? @relation(fields:[campoId], references:[id])` (nessun `onDelete` esplicito, Restrict di default, mirror `palestraId` riga ~1077); `Campo` (riga ~429) guadagna la relazione inversa `slotTorneo SlotTorneo[]` (mirror `slotTorneo` già su `Palestra`, riga ~420).
- **Nuova migrazione** `prisma/migrations/20260830000000_add_campo_slot_torneo/migration.sql` -- `ALTER TABLE "slot_torneo" ADD COLUMN "campoId" TEXT` + FK verso `campi(id)` `ON DELETE RESTRICT ON UPDATE CASCADE` (mirror `palestraId` in `20260825020000_add_slot_torneo/migration.sql` riga 27). Nessun CHECK nuovo, nessuna modifica RLS (già abilitata sulla tabella).
- `lib/torneo.ts` -- nuova `creaSlotTorneoPerSelezione(dati:{edizioneTorneoId,etichetta,data,ora,selezioni:{palestraId:string,campoId:string|null}[]})` sostituisce `creaSlotTorneoPerTutteLePalestre` (righe 385-406) nel percorso GIRONE: rilegge `prisma.palestra.findMany({include:{campi:{select:{id:true}}}})`, ricostruisce l'insieme valido di combinazioni `palestraId|campoId` (o `palestraId|""` per una Palestra senza Campi), filtra le selezioni ricevute contro quell'insieme, poi `createMany` sulle righe superstiti (`campoId` incluso); ritorna `{count, nessunaPalestraCensita}` per distinguere "0 Palestre esistenti" da "selezione vuota dopo il filtro" (sostituisce lo shape `{count}` esistente). `elencaSlotTorneo` (righe 413-419) e `elencaPartiteTorneo` (righe 224-234): `include` aggiunge `campo: true` accanto a `palestra: true`.
- `app/app/(torneo)/torneo/actions.ts` -- `creaSlotTorneoAction` (righe 683-713), ramo `fase === "GIRONE"`: legge `formData.getAll("selezioneSlotGirone")` invece di chiamare la vecchia funzione, mappa ogni valore `"palestraId|campoId"` (`campoId` vuoto → `null`) e chiama `creaSlotTorneoPerSelezione`; selezione vuota o `risultato.count === 0` (e non `nessunaPalestraCensita`) → `VALIDATION` "Seleziona almeno un Campo o una Palestra per generare gli Slot di girone."; `risultato.nessunaPalestraCensita` → messaggio invariato "Nessuna Palestra configurata...". Import `creaSlotTorneoPerTutteLePalestre` sostituito da `creaSlotTorneoPerSelezione`.
- `app/app/(torneo)/torneo/NuovoSlotTorneoForm.tsx` -- prop `palestre` estesa a `{id,nome,campi:{id,nome}[]}[]`; quando `fase === "GIRONE"`, al posto della sola nota testuale, calcola le righe selezionabili (una per Campo, o una per Palestra se `campi.length === 0`) e le rende come `<input type="checkbox" name="selezioneSlotGirone" value={`${p.id}|${c?.id ?? ""}`} defaultChecked />` con etichetta "NomePalestra" o "NomePalestra - NomeCampo"; nota testuale aggiornata di conseguenza.
- `app/app/(torneo)/torneo/[edizioneId]/slot/page.tsx` -- query palestre estesa a `prisma.palestra.findMany({orderBy:{nome:"asc"}, include:{campi:{orderBy:{nome:"asc"}}}})` per fornire i Campi al form.
- `app/app/(torneo)/torneo/SlotTorneoRow.tsx` -- tipo `Slot` guadagna `campo: {nome:string} | null`; cella Palestra mostra anche "- NomeCampo" quando presente (mirror di come `indirizzoPalestra` è già concatenato, righe 52-57).
- `.../risultati/RisultatoPartitaTorneoForm.tsx` -- tipo `SlotTorneoOpzione` (righe 17-23) guadagna `campo: {nome:string} | null`; l'`<option>` del select (riga 215) e il riepilogo (riga 237) mostrano il nome del Campo accanto alla Palestra quando presente.
- `app/torneo/page.tsx` -- tipo `SlotPubblico` (righe 25-35) guadagna `campo: {nome:string} | null`; `MetaSlot` (righe 42-65) mostra il nome del Campo accanto alla Palestra nello span quando presente.
- `lib/guida/contenuti.ts` -- paragrafo esistente su "Slot orari/Palestre" (riga 451) aggiornato per menzionare la scelta dei Campi.

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + nuova migrazione -- `campoId` su `SlotTorneo` -- schema
- [x] `lib/torneo.ts` -- `creaSlotTorneoPerSelezione` + `include: campo` su `elencaSlotTorneo`/`elencaPartiteTorneo` + test (`lib/torneo.test.ts`)
- [x] `torneo/actions.ts` -- ramo GIRONE aggiornato + test (`actions.test.ts`): selezione parziale (un solo Campo su due), selezione vuota, selezione manomessa/combinazione non valida, nessuna Palestra censita
- [x] `NuovoSlotTorneoForm.tsx` -- checklist Palestra×Campo, preselezionata di default
- [x] `[edizioneId]/slot/page.tsx` -- query palestre con Campi inclusi
- [x] `SlotTorneoRow.tsx`, `RisultatoPartitaTorneoForm.tsx`, `app/torneo/page.tsx` -- mostrare il Campo accanto alla Palestra ovunque uno Slot è visualizzato
- [x] `lib/guida/contenuti.ts` -- aggiornare il paragrafo Slot

**Acceptance Criteria:** vedi `epics.md` Story 20.18 (Given/When/Then, verbatim).

## Spec Change Log

Review a 3 agenti in parallelo (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) su diff isolato dal `baseline_commit` (978 righe). Nessun `intent_gap`/`bad_spec` — nessun loopback.

**PATCH (applicati):**
1. `creaSlotTorneoPerSelezione` (`lib/torneo.ts`) non deduplicava `selezioni` prima di `createMany` (convergenza indipendente di tutti e 3 i reviewer) - una combinazione Palestra/Campo valida inviata due volte (POST manomessa/diretta alla Server Action, non riproducibile dalla checklist renderizzata) produceva due righe `SlotTorneo` identiche. Aggiunta dedup tramite `Map` keyed sulla stessa codifica delle combinazioni valide, PRIMA del filtro - preserva la prima occorrenza, scarta i duplicati esatti. Test aggiunto.
2. `prisma.palestra.findMany({ include: { campi: {...} } })` tirava dentro ogni colonna scalare di Palestra (nome/indirizzo/lat/lng/createdAt) mai letta - cambiato in `select: { id: true, campi: {...} } }`. Assert del test aggiornato.
3. La checklist Palestra×Campo (`NuovoSlotTorneoForm.tsx`) non aveva un `<fieldset>/<legend>` - ogni checkbox veniva annunciata isolata da uno screen reader. Avvolta in `<fieldset><legend>Campi e Palestre per la fase a gironi</legend>...</fieldset>`, con `.fieldsetSenzaBordo` per azzerare lo stile nativo del `<fieldset>` senza alterare il layout.
4. `calcolaRigheSelezioneGirone` (la funzione pura che genera le righe della checklist) non aveva alcun test, a differenza di ogni altra logica nuova di questa story - dimostrato concretamente scambiabile senza che nessun test fallisse. Esportata + nuovo `NuovoSlotTorneoForm.test.ts` (solo logica pura, nessun rendering) con 3 casi (2 Campi, 0 Campi, elenco vuoto).
5. Intestazione colonna tabella Slot ancora "Palestra" nonostante una cella possa mostrare "Palestra - Campo" - rinominata in "Palestra / Campo".
6. Encoding `"palestraId|campoId"` reimplementato indipendentemente in 3 punti (form, action, lib) senza un'unica fonte di verità - estratto in `lib/selezione-slot-girone.ts` (`codificaSelezioneSlotGirone`/`decodificaSelezioneSlotGirone`, plain, riusato da tutti e 3 i punti) + test dedicati.

**REJECT (nessuna azione, con motivazione):**
- Nessun pulsante "seleziona tutti/deseleziona tutti" sulla checklist: nessun AC lo richiede, il default "tutto selezionato" copre già il caso comune (mirror del comportamento "tutte le Palestre" pre-esistente).
- Ordinamento Slot ancora solo per data/ora, non raggruppato per Palestra/Campo: nessun AC richiede un raggruppamento visivo, comportamento di ordinamento invariato da Story 20.9/20.17.
- Checklist calcolata una sola volta lato server (stale se un'altra scheda aggiunge una Palestra/Campo nel frattempo): stesso pattern pre-esistente di OGNI lista server-rendered del progetto, non una regressione specifica di questa storia.
- Cambiare la fase e tornare a GIRONE resetta le deselezioni manuali (checkbox non controllate, remount): mirror del comportamento già accettato per ogni altro campo condizionalmente renderizzato in questo stesso form (es. Tabellone).
- Guida in-app non menziona che semifinali/finali restano senza scelta del Campo: esplicitamente fuori scope (Boundaries "Never"), documentare una non-funzionalità non è necessario.
- FK `campoId` Restrict non testabile finché `Campo` non ha un percorso di cancellazione: nessuna cancellazione di Campo esiste nel progetto, nota puramente speculativa.

## Design Notes

**Perché `"palestraId|campoId"` come encoding del `value` della checkbox e non un formato più strutturato:** semplice da costruire/parsare (`split("|")`), nessun carattere speciale in gioco essendo entrambi UUID — non serve altro per un elenco piatto di checkbox HTML.

**Perché ricalcolare l'insieme valido server-side invece di fidarsi degli id ricevuti dal client:** stessa disciplina "mai fidarsi del client per lo scoping" già stabilita in Story 20.12 (spec Boundaries "Always") — qui il rischio aggiuntivo è un `campoId` che non appartiene alla `palestraId` indicata (tampering, o un Campo cancellato nel frattempo in un'altra scheda); la riga viene semplicemente scartata, mai creata con una combinazione incoerente.

**Perché `{count, nessunaPalestraCensita}` e non un solo `count`:** l'azione deve distinguere due messaggi utente diversi (AC #4 vs AC #8 di epics.md) a partire dallo stesso `count === 0` — la causa ("0 Palestre esistono" vs "selezione vuota dopo il filtro") non è altrimenti recuperabile dal solo conteggio.

## Verification

**Commands:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx prisma validate`

**Manual checks (obbligatorio):** non eseguibile in questa sessione — ambiente di sviluppo locale rotto (Prisma WASM + Windows, vedi memoria `project_dev_locale_prisma_wasm_rotto`), Epic 20 mai deployata in produzione. Verificato solo via test automatici + tsc + lint + build + prisma validate.

## Suggested Review Order

**Schema/migrazione**

- Entry point: nuova FK opzionale `campoId`/`campo` su `SlotTorneo`, mirror `palestraId`.
  [`schema.prisma:1091`](../../prisma/schema.prisma#L1091)

- Relazione inversa richiesta da Prisma, nessun impatto sul dominio Orari-Palestre.
  [`schema.prisma:651`](../../prisma/schema.prisma#L651)

- `ALTER TABLE` + FK `ON DELETE RESTRICT`, nessun CHECK/RLS nuovo.
  [`20260830000000_add_campo_slot_torneo/migration.sql:12`](../../prisma/migrations/20260830000000_add_campo_slot_torneo/migration.sql#L12)

**Encoding condiviso Palestra×Campo**

- Unica fonte di verità per `"palestraId|campoId"`, riusata da client/action/lib (review fix).
  [`selezione-slot-girone.ts:13`](../../lib/selezione-slot-girone.ts#L13)

**Logica server: selezione e creazione in blocco**

- Rilegge sempre Palestra×Campo server-side, dedup prima del filtro (review fix), distingue `nessunaPalestraCensita` da selezione vuota.
  [`torneo.ts:408`](../../lib/torneo.ts#L408)

- Ramo GIRONE: parsa `selezioneSlotGirone` (checkbox multiple) invece di un singolo `palestraId`.
  [`actions.ts:695`](../../app/app/(torneo)/torneo/actions.ts#L695)

- `include`/`select` estesi con `campo` per esporre il dato a tutte le viste a valle.
  [`torneo.ts:235`](../../lib/torneo.ts#L235)
  [`torneo.ts:474`](../../lib/torneo.ts#L474)

**UI: checklist di generazione**

- Righe Palestra×Campo (funzione pura, esportata per test) - una riga per Campo o una per Palestra senza Campi.
  [`NuovoSlotTorneoForm.tsx:22`](../../app/app/(torneo)/torneo/NuovoSlotTorneoForm.tsx#L22)

- Checklist con preselezione di default, avvolta in `<fieldset>/<legend>` (review fix, a11y).
  [`NuovoSlotTorneoForm.tsx:157`](../../app/app/(torneo)/torneo/NuovoSlotTorneoForm.tsx#L157)

- Query Palestre estesa con i Campi per alimentare la checklist.
  [`[edizioneId]/slot/page.tsx:37`](../../app/app/(torneo)/torneo/[edizioneId]/slot/page.tsx#L37)

**Visualizzazione del Campo assegnato**

- Intestazione tabella Admin aggiornata (review fix).
  [`[edizioneId]/slot/page.tsx:77`](../../app/app/(torneo)/torneo/[edizioneId]/slot/page.tsx#L77)

- Nome Campo mostrato accanto alla Palestra nell'elenco Slot Admin.
  [`SlotTorneoRow.tsx:60`](../../app/app/(torneo)/torneo/SlotTorneoRow.tsx#L60)

- Stesso trattamento nel form di assegnazione Slot su un incontro e sulla pagina pubblica `/torneo` (non riportati singolarmente, stesso pattern).

**Peripherals**

- Paragrafo guida in-app aggiornato per la nuova checklist.
  [`contenuti.ts:451`](../../lib/guida/contenuti.ts#L451)

- Test: `lib/torneo.test.ts`, `app/app/(torneo)/torneo/actions.test.ts`, `lib/selezione-slot-girone.test.ts`, `NuovoSlotTorneoForm.test.ts`.
