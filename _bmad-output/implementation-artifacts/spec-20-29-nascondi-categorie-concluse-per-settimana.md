---
title: 'Story 20.29: Nascondere le Categorie concluse per Settimana sulla vista pubblica del Torneo'
type: 'feature'
created: '2026-09-13'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'd9ea1ddf2ee5fafdb3998f1938b6f65a771c2608'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** su `/torneo` (vista pubblica) tutte le Categorie di un'Edizione restano sempre visibili, anche quelle gia' concluse (tabellone generato, classifica finale completa) - man mano che il torneo avanza, le Categorie concluse affollano la pagina senza dare piu' risalto a quelle ancora in corso. Richiesta esplicita dell'utente durante la gestione dal vivo di un torneo U14 a 6 squadre.

**Approach:** due nuovi campi booleani su `EdizioneTorneo` (`nascondiConcluseSettimana1`/`nascondiConcluseSettimana2`, mirror diretto di `nomeSettimana1`/`nomeSettimana2`, Story 20.13), impostabili dall'Admin con un bottone per Settimana nella pagina di dettaglio Edizione (`/app/torneo/[edizioneId]`, accanto alla sezione "Nomi delle Settimane"). Quando il flag della Settimana e' attivo, `/torneo` non renderizza piu' la sezione di una Categoria di quella Settimana se e solo se la sua classifica finale e' completa (`calcolaClassificaFinale` non `null`, stesso criterio gia' usato per "tabellone concluso" in `app/torneo/page.tsx`).

## Boundaries & Constraints

**Always:**
- Il nascondimento e' **persistente e uguale per tutti i visitatori** (scelta esplicita dell'utente durante il checkpoint) - due colonne su `EdizioneTorneo`, non uno stato client-side.
- Il criterio "Categoria conclusa" e' **esattamente** quello gia' calcolato in `app/torneo/page.tsx` (`tabelloneGenerato && classificaFinale !== null`) - nessuna nuova nozione di "conclusa".
- Il controllo Admin e' **un bottone/toggle per Settimana** (non per singola Categoria) - un solo click nasconde tutte le Categorie concluse di quella Settimana, comprese quelle che si concluderanno in seguito (il filtro e' sempre ricalcolato al volo a ogni caricamento pagina, mai una lista congelata di id).
- Default `false` su entrambi i campi (nessuna Categoria nascosta finche' l'Admin non lo decide esplicitamente) - nessuna regressione sulle Edizioni esistenti.
- Una Categoria ancora in corso (classifica finale non completa) **non e' mai nascosta**, anche a flag attivo - il flag agisce solo sulle Categorie gia' concluse.
- Se **tutte** le Categorie di un'Edizione risultano nascoste (tutte concluse + entrambi i flag attivi, o un'unica Settimana con tutte concluse e il suo flag attivo), la pagina mostra un messaggio esplicito dedicato (mai un'area vuota senza spiegazione, stesso principio di ogni altro "Never" gia' stabilito nell'epica) - distinto dal messaggio esistente "Nessuna categoria del Torneo pubblicata per questa edizione" (qui le Categorie esistono, sono solo nascoste).
- Vista amministrativa (`/app/torneo/...`) **non e' mai affetta**: l'Admin continua a vedere/gestire tutte le Categorie indipendentemente dai due flag, che sono un filtro esclusivo della vista pubblica.

**Ask First:** nessuna - le due decisioni aperte (persistenza lato Admin vs preferenza visitatore; bottone per Settimana vs bottone globale) sono state chiuse con l'utente durante la stesura di questa spec.

**Never:** nessuna modifica al criterio "conclusa" ne' al calcolo della classifica finale (Story 20.4/20.26, invariati). Nessun nuovo controllo di nascondimento per singola Categoria (fuori scope, il controllo resta per Settimana). Nessuna migrazione distruttiva: i due nuovi campi sono `Boolean @default(false)`, additivi, nessun backfill necessario.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin attiva il flag per Settimana 1 | Edizione con Categorie concluse e non concluse in Settimana 1 | Le Categorie concluse di Settimana 1 spariscono da `/torneo`; quelle non concluse restano visibili | N/A |
| Una Categoria di Settimana 1 si conclude DOPO l'attivazione del flag | Flag gia' attivo, classifica finale appena completata | Sparisce da `/torneo` al successivo caricamento, senza bisogno di un nuovo click Admin (nessuna lista congelata) | N/A |
| Admin disattiva il flag | Categorie concluse in precedenza nascoste | Tornano visibili immediatamente | N/A |
| Tutte le Categorie di entrambe le Settimane sono concluse e nascoste | Entrambi i flag attivi | Messaggio esplicito dedicato ("Tutte le Categorie di questa edizione sono concluse.") invece di un'area vuota | N/A |
| Categoria senza calendario/tabellone generato | Flag attivo per la sua Settimana | Resta visibile (mai conclusa senza classifica finale completa) | N/A |
| Admin apre `/app/torneo/[edizioneId]` | Qualunque stato dei flag | I due bottoni riflettono lo stato corrente (attivo/non attivo), etichetta esplicita per Settimana | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- `EdizioneTorneo`: due nuovi campi `nascondiConcluseSettimana1 Boolean @default(false)`, `nascondiConcluseSettimana2 Boolean @default(false)`, subito dopo `nomeSettimana1`/`nomeSettimana2`; nuova migrazione additiva (`prisma migrate dev`/equivalente Cloudflare D1, mirror della migrazione di Story 20.13).
- `lib/torneo.ts` -- nuova `aggiornaVisibilitaSettimanaTorneo(edizioneTorneoId, settimana, nascondiConcluse)` (mirror di `aggiornaNomiSettimaneTorneo`), oppure estensione di quest'ultima con i due nuovi campi se la Server Action li invia insieme ai nomi (decisione implementativa, non di intent).
- `app/app/(torneo)/torneo/actions.ts` -- nuova Server Action (o estensione di `aggiornaNomiSettimaneAction`) che valida/salva i due booleani.
- `app/app/(torneo)/torneo/[edizioneId]/NomiSettimaneTorneoForm.tsx` (o un form gemello dedicato) -- due checkbox/bottoni "Nascondi le Categorie concluse" accanto ai campi nome, uno per Settimana.
- `app/torneo/page.tsx` -- per ciascuna Categoria, se `classificaFinale !== null` (gia' calcolato) e il flag della sua `categoria.settimana` e' attivo, `return null` invece della sezione (o filtro a monte su `datiCategorie` prima del `.map`). Messaggio dedicato quando l'array filtrato risulta vuoto ma `datiCategorie` non lo era.

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + migrazione -- due campi booleani su `EdizioneTorneo`
- [x] `lib/torneo.ts` -- funzione di scrittura dei due flag + test
- [x] `actions.ts` -- Server Action di salvataggio + test
- [x] Form Admin -- due controlli "Nascondi le Categorie concluse" per Settimana, nella pagina Edizione
- [x] `app/torneo/page.tsx` -- filtro delle Categorie concluse per Settimana con flag attivo + messaggio dedicato quando tutto risulta nascosto

**Acceptance Criteria:**
- Given un'Edizione con Categorie concluse in Settimana 1, when l'Admin attiva "Nascondi le Categorie concluse" per Settimana 1, then quelle Categorie spariscono da `/torneo` mentre le Categorie di Settimana 2 restano invariate
- Given una Categoria ancora in corso nella Settimana con flag attivo, when la pagina pubblica viene renderizzata, then quella Categoria resta visibile
- Given entrambi i flag attivi e tutte le Categorie concluse, when un Visitatore apre `/torneo`, then vede un messaggio esplicito invece di un'area vuota
- Given l'Admin su `/app/torneo/[edizioneId]/[categoriaId]/...`, when i flag sono attivi, then vede comunque tutte le Categorie/incontri senza alcun filtro

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti verdi, inclusi i nuovi test
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Attivare/disattivare il flag per una Settimana con Categorie concluse e verificare la comparsa/sparizione immediata su `/torneo`.
- Verificare che l'area amministrativa mostri sempre tutte le Categorie indipendentemente dai flag.

## Suggested Review Order

**Modello dati**

- Due campi booleani additivi su `EdizioneTorneo`, default `false`, mirror diretto dei nomi Settimana.
  [`schema.prisma:906`](../../prisma/schema.prisma#L906)

- Migrazione additiva, nessun backfill: `NOT NULL DEFAULT false` copre già le Edizioni esistenti.
  [`migration.sql:9`](../../prisma/migrations/20260914000000_add_nascondi_concluse_settimana_edizione_torneo/migration.sql#L9)

**Logica di visibilità (predicato puro, testato)**

- Entry point: predicato puro estratto in review fix per essere testabile in isolamento, riusato da lettura e scrittura.
  [`torneo.ts:81`](../../lib/torneo.ts#L81)

- Scrittura del flag: un solo campo aggiornato per volta, mai i due insieme (un bottone = una Settimana).
  [`torneo.ts:54`](../../lib/torneo.ts#L54)

- Stato calcolato una sola volta per Categoria e riusato sia dal filtro sia dal rendering sottostante.
  [`app/torneo/page.tsx:199`](../../app/torneo/page.tsx#L199)

- Filtro a monte su `datiCategorieConStato`, applica il predicato prima del render.
  [`app/torneo/page.tsx:214`](../../app/torneo/page.tsx#L214)

**Server Action e form Admin**

- Validazione esplicita (settimana valida, `nascondiConcluse` mai default silenzioso), doppia `revalidatePath`.
  [`actions.ts:356`](../../app/app/(torneo)/torneo/actions.ts#L356)

- Bottone/toggle indipendente per Settimana, con conferma visiva `role="status"` dopo il salvataggio.
  [`NomiSettimaneTorneoForm.tsx:32`](../../app/app/(torneo)/torneo/[edizioneId]/NomiSettimaneTorneoForm.tsx#L32)

**Test e contenuti di supporto**

- 5 casi unitari sul predicato: flag spento, flag+conclusa, flag+in corso, isolamento tra Settimane, categoria senza tabellone.
  [`torneo.test.ts:282`](../../lib/torneo.test.ts#L282)

- Guida in-app aggiornata per il nuovo bottone (regola permanente del progetto).
  [`contenuti.ts:562`](../../lib/guida/contenuti.ts#L562)

