---
title: "Story 20.1: Edizione del torneo e Categorie"
type: 'feature'
created: '2026-08-23'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '83ab00e26ee132d12ac6c6fa1bdcd7be0d6506b9'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** non esiste ancora alcun modello dati per il Torneo Memorial (Epic 20) - nessuna entità per rappresentare un'edizione annuale né le Categorie al suo interno.

**Approach:** deciso in `epics.md` (Story 20.1, regolamento e decisioni 2026-08-23): due nuove tabelle Prisma, `EdizioneTorneo` (anno) e `CategoriaTorneo` (nome, settimana 1|2, numero massimo squadre, appartenente a un'Edizione), con una nuova pagina di gestione Admin/Dirigente (`/app/torneo`) per il CRUD di entrambe - stesso pattern architetturale già in uso per `VoceMenuPubblico`/`Palestra` (Prisma diretto, RLS ENABLE + REVOKE espliciti, nessun client Supabase runtime).

## Boundaries & Constraints

**Always:** `EdizioneTorneo`/`CategoriaTorneo` seguono le convenzioni Prisma già in uso (PascalCase singolare italiano, `@@map` snake_case plurale, `id String @id @default(uuid())`, `createdAt`/`updatedAt`) e vanno in RLS ENABLE + REVOKE espliciti nella stessa migrazione di creazione (mai in una migrazione successiva separata) - stesso pattern di `VoceMenuPubblico`/`PaginaPubblica`. Ogni mutazione passa da una Server Action con `requireRuolo(["ADMIN","DIRIGENTE"])`, errori come `{ error: { code, message } }` (`FORBIDDEN` solo per rifiuti di autorizzazione). Le funzioni di lettura/scrittura vivono in un nuovo `lib/torneo.ts` (non `lib/db-rls/`, stesso principio di `lib/menu-pubblico.ts` - tabella non protetta da RLS runtime). `/app/torneo` va aggiunta a `PROTECTED_ROUTES`.

**Ask First:** nessuna - i punti di scope sono già decisi in `epics.md`.

**Never:** nessun collegamento a `Gruppo`/`AnnoAgonistico` (entità indipendente, decisione esplicita - vedi Design Notes). Nessuna gestione di Squadre/risultati/tabellone qui (story 20.2-20.4). Il vincolo "una Categoria non eliminabile se ha squadre iscritte" NON è implementabile in questa story (`SquadraTorneo` non esiste ancora, arriva in 20.2) - vedi Design Notes per lo scope reale del vincolo di eliminazione qui.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin/Dirigente crea un'Edizione | anno (intero) | riga `EdizioneTorneo` creata | `VALIDATION` se anno mancante/non numerico/già esistente |
| Admin/Dirigente elimina un'Edizione senza Categorie | nessuna Categoria collegata | riga eliminata | N/A |
| Admin/Dirigente elimina un'Edizione con Categorie | Categorie collegate | rifiutata | `VALIDATION`, messaggio esplicito |
| Admin/Dirigente crea una Categoria | nome, settimana (1\|2), numero massimo squadre (2-8) | riga `CategoriaTorneo` creata, agganciata all'Edizione | `VALIDATION` se nome vuoto, settimana non 1/2, numero fuori range 2-8 |
| Admin/Dirigente elimina una Categoria | nessuna dipendenza esistente in questa story | riga eliminata | N/A |
| Utente senza `ADMIN`/`DIRIGENTE` apre `/app/torneo` | - | redirect, stesso pattern di ogni altra rotta protetta | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- nuovo enum `SettimanaTorneo { SETTIMANA_1 SETTIMANA_2 }` (mirror `GiornoSettimana`, righe 599-607); nuovo modello `EdizioneTorneo` (`anno Int @unique`, `createdAt`, relazione inversa `categorie CategoriaTorneo[]`); nuovo modello `CategoriaTorneo` (`nome String`, `settimana SettimanaTorneo`, `numeroMassimoSquadre Int`, `edizioneTorneoId String` + relazione verso `EdizioneTorneo` - default Prisma `Restrict` su delete, come `Gruppo`→`AnnoAgonistico`, righe 443-458)
- **Nuova migrazione** `prisma/migrations/<timestamp>_add_torneo/migration.sql` -- `CREATE TABLE` per entrambe, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `REVOKE ALL ... FROM anon, authenticated` per entrambe, stessa struttura di `20260819000000_add_voce_menu_pubblico/migration.sql`
- **Nuovo file** `lib/torneo.ts` -- `elencaEdizioniTorneo()`, `elencaCategorieTorneo(edizioneTorneoId)`, funzioni pure di lettura via Prisma diretto, mirror `lib/menu-pubblico.ts:14-33` (nessuna validazione qui, vive nella Server Action)
- **Nuovo file** `app/app/(torneo)/torneo/actions.ts` -- `creaEdizioneTorneoAction`, `cancellaEdizioneTorneoAction` (guardia `deleteMany` con `where: { id, categorie: { none: {} } }`, mirror `cancellaSlot`, `app/app/(orari-palestre)/slot/actions.ts:190-231`), `creaCategoriaTorneoAction`, `aggiornaCategoriaTorneoAction`, `cancellaCategoriaTorneoAction` (nessuna guardia di dipendenza in questa story)
- **Nuovo file** `app/app/(torneo)/torneo/page.tsx` -- Server Component, elenco Edizioni + form di creazione, `dynamic = "force-dynamic"` (mirror `app/app/(orari-palestre)/slot/page.tsx`)
- **Nuovo file** `app/app/(torneo)/torneo/[edizioneId]/page.tsx` -- Server Component, elenco/CRUD Categorie della singola Edizione (mirror struttura master/detail già in uso, es. `sponsor/[id]/voucher`)
- **Nuovo file** `app/app/(torneo)/torneo/CategoriaTorneoRow.tsx` -- riga client con toggle sola-lettura/modifica inline, `useActionState` per update/delete, `window.confirm` prima della cancellazione (mirror `app/app/(orari-palestre)/slot/SlotRow.tsx`)
- `lib/auth/route-guard.ts` -- nuova voce in `PROTECTED_ROUTES` (append prima della riga `];`, ~456): `{ prefix: "/app/torneo", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Torneo" }` (mirror riga 183, `/app/gruppi`)
- **Nuovo file** `app/app/(torneo)/torneo/actions.test.ts` -- stile mock di `app/app/(orari-palestre)/slot/actions.test.ts` (righe 1-37: `vi.mock` di `require-ruolo`/`prisma`/`next/cache`, import dinamico post-mock), casi: FORBIDDEN, VALIDATION per ciascun campo, successo, blocco eliminazione Edizione con Categorie

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- enum + 2 modelli
- [x] migrazione -- tabelle + RLS ENABLE + REVOKE
- [x] `lib/torneo.ts` -- funzioni di lettura
- [x] `torneo/actions.ts` -- 5 Server Action (create/delete Edizione, create/update/delete Categoria)
- [x] `torneo/page.tsx` + `torneo/[edizioneId]/page.tsx` + `CategoriaTorneoRow.tsx`
- [x] `route-guard.ts` -- voce `/app/torneo`
- [x] `torneo/actions.test.ts`

**Acceptance Criteria:** vedi `epics.md` Story 20.1, con l'adeguamento di scope descritto in Design Notes (guardia di eliminazione Categoria rimandata a 20.2).

## Spec Change Log

**2026-08-23 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer).** Nessun `intent_gap`/`bad_spec` (nessuna modifica al blocco frozen), nessun loopback. Convergenze/finding indipendenti promossi a `patch`, applicati e riverificati:

- **PATCH** — Blind Hunter: le Boundaries dicevano esplicitamente "lettura/scrittura" per `lib/torneo.ts`, ma la prima implementazione aveva lasciato le scritture in `actions.ts` (contraddizione interna tra Boundaries e Code Map, mai segnalata). Spostate `creaEdizioneTorneo`/`cancellaEdizioneTorneo`/`creaCategoriaTorneo`/`aggiornaCategoriaTorneo`/`cancellaCategoriaTorneo` in `lib/torneo.ts`, allineandosi al vero precedente (`lib/menu-pubblico.ts` possiede anche le sue scritture).
- **PATCH** — Blind Hunter + Edge Case Hunter, indipendentemente: nessuna validazione di range su `anno` (accettava "0", "99999"). Aggiunto range 2000-2100, stesso principio già applicato a `numeroMassimoSquadre`.
- **PATCH** — Blind Hunter + Edge Case Hunter, indipendentemente: `creaCategoriaTorneoAction` non verificava che `edizioneTorneoId` esistesse prima della creazione (un id non più valido cadeva nel catch generico come INTERNAL). Aggiunta verifica esplicita, `VALIDATION "Edizione non trovata."`.
- **PATCH** — Blind Hunter + Edge Case Hunter, indipendentemente: `aggiornaCategoriaTorneoAction`/`cancellaCategoriaTorneoAction` operavano solo per `id`, mai verificando che appartenesse davvero all'`edizioneTorneoId` inviato - un mismatch avrebbe potuto operare su/rivalidare la pagina sbagliata. `updateMany`/`deleteMany` ora scoped su entrambi i campi; `count === 0` è un `VALIDATION` esplicito (cambia il comportamento precedente di `cancellaCategoriaTorneoAction`, che trattava P2025 come successo idempotente - un mismatch merita un segnale, non un successo silenzioso).
- **PATCH** — Verification Gap Reviewer: `lib/torneo.ts` non aveva alcun test, a differenza di ogni altro modulo `lib/*.ts` di dominio del progetto (mirror diretto `lib/menu-pubblico.test.ts`) - rischio concreto dimostrato (perdere il filtro `edizioneTorneoId` avrebbe fatto trapelare Categorie tra Edizioni senza che nessun test se ne accorgesse). Aggiunto `lib/torneo.test.ts`.
- **PATCH** — Blind Hunter: `lib/settimana-torneo.ts` (mirror `lib/giorno-settimana.ts`, che HA un test) non aveva un test dedicato. Aggiunto `lib/settimana-torneo.test.ts`.
- **PATCH** — Blind Hunter: `elencaCategorieTorneo` ordinava solo per nome, perdendo il raggruppamento per settimana centrale al dominio. Ordinamento ora `[{settimana: "asc"}, {nome: "asc"}]`.
- **PATCH** — Blind Hunter: nessun link da `/app/torneo/[edizioneId]` all'elenco Edizioni. Aggiunto.
- **PATCH** — Edge Case Hunter (2 finding sullo stesso componente): `CategoriaTorneoRow.tsx` mostrava un errore di modifica "stantio" riaprendo il form dopo un tentativo fallito precedente, e un errore di cancellazione restava visibile a tempo indeterminato anche dopo una modifica riuscita sulla stessa riga - `useActionState` non si resetta smontando solo la porzione di JSX. Aggiunti due flag di visibilità dedicati, azzerati esplicitamente quando si rientra in modifica o dopo un salvataggio riuscito.
- **DEFER** (loggati in `deferred-work.md`): nessun vincolo di unicità sul nome Categoria dentro la stessa Edizione (ambiguo, decisione di prodotto).
- **REJECT** (matches precedent/non confermato): nessun `CREATE INDEX` sulla colonna FK `edizioneTorneoId` nella migrazione (Blind Hunter) - verificato: NESSUNA migrazione esistente del progetto (Palestra→Campo, Gruppo→AnnoAgonistico) ha mai un indice esplicito sulla propria colonna FK, stesso pattern seguito qui, non una regressione. Nessuna voce di test "ordine di navigazione per Dirigente" da aggiornare (Blind Hunter) - verificato: nessun test di ordine esaustivo specifico per Dirigente esiste in `voci-navigazione.test.ts` (solo Allenatore e Admin), nulla da aggiornare. Nessun test diretto per i 4 nuovi componenti client/2 pagine (Blind Hunter) - stesso precedente confermato ripetutamente nel progetto (nessun componente client/pagina ha mai un test diretto). Il numero minimo di 2 per `numeroMassimoSquadre` non era esplicitamente richiesto dall'utente (Blind Hunter) - non un difetto, solo un'assunzione di lavoro ragionevole (un girone da 1 squadra non ha senso), annotata sotto per trasparenza invece di essere silenziosa.

Riverificato dopo le patch: `npx vitest run` (111 file, 1524 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 19 warning preesistenti non correlati), `npm run build` (riuscita, `/app/torneo` e `/app/torneo/[edizioneId]` registrate).

## Design Notes

**Guardia di eliminazione Categoria - adeguamento rispetto a `epics.md`:** l'AC originale della story (scritta prima dell'analisi tecnica) lega la cancellazione dell'Edizione alle "Categorie con squadre iscritte" - ma `SquadraTorneo` non esiste finché non viene introdotta dalla Story 20.2. In questa story: l'Edizione non è eliminabile se ha Categorie (qualunque), la Categoria è liberamente eliminabile (nessuna dipendenza esiste ancora). La Story 20.2 dovrà aggiungere la guardia equivalente su Categoria (non eliminabile se ha Squadre) quando quella relazione esisterà.

**Assunzione di lavoro non esplicitamente richiesta (annotata in review):** il numero minimo di `numeroMassimoSquadre` (2) non è nel testo dell'utente (solo "al massimo 8 squadre") - scelto perché un girone con una sola squadra non avrebbe senso. Se il reale minimo utile è diverso (es. 4, per avere almeno 2 squadre per girone), va corretto in una story successiva.

**Struttura pagine:** `/app/torneo` elenca le Edizioni (poche righe, un'edizione per anno) con form di creazione; cliccando un'Edizione si apre `/app/torneo/[edizioneId]` con l'elenco/CRUD delle sue Categorie - stesso schema master/detail di altre aree del progetto, evita di affollare un'unica pagina con due entità.

**Implementation Notes (2026-08-23):** file aggiuntivi non elencati esplicitamente nel Code Map ma necessari per completare il mirror-pattern dichiarato: `lib/settimana-torneo.ts` (mirror `lib/giorno-settimana.ts` - etichette italiane/validazione di `SettimanaTorneo`, riusato da form/riga/Server Action), `torneo/NuovaEdizioneTorneoForm.tsx` + `torneo/EliminaEdizioneTorneoForm.tsx` (mirror `NuovoSlotForm.tsx`/`EliminaCampionatoForm.tsx`), `torneo/NuovaCategoriaTorneoForm.tsx` (mirror `NuovoSlotForm.tsx`), `torneo/torneo.module.css` (mirror `slot.module.css`). `route-guard.ts`: la voce `/app/torneo` è stata dichiarata dopo `/app/guida` (non in fondo all'array come da bozza iniziale del Code Map) perché l'AC #1 di Story 15.4 richiede che il gruppo "Accounting" resti l'ultima voce del menu - `lib/auth/voci-navigazione.test.ts` aggiornato di conseguenza (nuova voce nell'assert di ordine completo). Verificato: `npx vitest run` (109 file, 1508 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, solo warning preesistenti non correlati), `npm run build` (riuscita). `npx prisma migrate dev` NON eseguibile in questo ambiente (DB locale Supabase non in esecuzione su questa macchina, nota già in memoria progetto "Dev locale rotto") - `npx prisma validate` e `npx prisma generate` eseguiti con successo, la migrazione SQL segue lo stesso schema letterale delle precedenti tabelle strutturali (RLS ENABLE + REVOKE nella stessa migrazione).

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione
- `npx prisma migrate dev` (o equivalente di progetto) -- expected: migrazione applicata senza errori

**Manual checks (obbligatorio):**
- Un Admin/Dirigente apre `/app/torneo`, crea un'Edizione (anno), entra nel dettaglio e crea 2-3 Categorie (nome, settimana, numero massimo), modifica una Categoria, elimina una Categoria; prova a eliminare l'Edizione con Categorie ancora presenti (atteso: rifiutato), elimina le Categorie e poi l'Edizione (atteso: riuscito). Un Utente senza Ruolo Admin/Dirigente prova ad aprire `/app/torneo` (atteso: redirect).

## Suggested Review Order

**Il modello dati e il vincolo di unicità/dipendenza (il cancello reale)**

- Entry point: enum + 2 modelli, FK di default `Restrict` (mirror `Gruppo`→`AnnoAgonistico`).
  [`prisma/schema.prisma`](../../prisma/schema.prisma)
- RLS ENABLE + REVOKE nella stessa migrazione di creazione, nessuna eccezione.
  [`prisma/migrations/20260823000000_add_torneo/migration.sql`](../../prisma/migrations/20260823000000_add_torneo/migration.sql)

**Le funzioni di lettura/scrittura (`lib/torneo.ts` - spostate qui in review, prima erano in `actions.ts`)**

- Cancellazione Edizione atomica (`deleteMany` con where composto, anti-TOCTOU).
  [`torneo.ts:42`](../../lib/torneo.ts#L42)
- Update/delete Categoria scoped su `id` + `edizioneTorneoId` insieme (fix di review: un mismatch ora fallisce esplicitamente).
  [`torneo.ts:75`](../../lib/torneo.ts#L75)

**Le Server Action (validazione, mai il vero cancello da sole)**

- Range `anno` (fix di review) + gestione P2002.
  [`actions.ts:37`](../../app/app/(torneo)/torneo/actions.ts#L37)
- Verifica esistenza Edizione prima di creare una Categoria (fix di review).
  [`actions.ts:197`](../../app/app/(torneo)/torneo/actions.ts#L197)
- `count === 0` → `VALIDATION` esplicito su update/delete Categoria (fix di review, cambia il comportamento precedente).
  [`actions.ts:243`](../../app/app/(torneo)/torneo/actions.ts#L243)

**UI (stato stantio corretto in review, nessun impatto sui dati)**

- Due flag di visibilità errore dedicati, azzerati rientrando in modifica o dopo un salvataggio riuscito.
  [`CategoriaTorneoRow.tsx:43`](../../app/app/(torneo)/torneo/CategoriaTorneoRow.tsx#L43)
- Link di ritorno all'elenco Edizioni (fix di review).
  [`[edizioneId]/page.tsx`](../../app/app/(torneo)/torneo/[edizioneId]/page.tsx)

**Perimetro Ruoli**

- `/app/torneo` in `PROTECTED_ROUTES`, ADMIN/DIRIGENTE.
  [`route-guard.ts:404`](../../lib/auth/route-guard.ts#L404)
