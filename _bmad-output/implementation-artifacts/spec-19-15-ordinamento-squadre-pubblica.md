---
title: "Story 19.15: Ordinamento delle Squadre per la pagina pubblica"
type: 'feature'
created: '2026-08-24'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '256d215aa80c667519363f3e94a64cb3d2f170a9'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/squadre` (Story 18.8) ordina i Gruppi per `nome` (alfabetico) - nessun modo di scegliere un ordine diverso (es. "dalla Serie D in giù"), e la Story 18.24 (elenco Atlete a blocchi per categoria) ha bisogno di un ordine esplicito e gestibile per raggruppare correttamente i blocchi.

**Approach:** deciso in `epics.md` (Story 19.15, su richiesta esplicita dell'utente che ha rifiutato una lista di categorie congelata a priori): nuovo campo `ordine Int` su `Gruppo` - mirror esatto di `VoceMenuPubblico.ordine` (Story 19.6/19.7) - gestito da una nuova sezione Site Manager `/app/ordine-squadre` (`ADMIN`+`SITE_MANAGER`, mirror esatto del perimetro di `/app/menu-pubblico`) con bottoni Su/Giù (mirror `spostaVoceMenuPubblicoAction`/`VoceMenuPubblicoRow.tsx`, Story 19.7 - "nessuna libreria di drag-and-drop nel progetto" resta valido).

## Boundaries & Constraints

**Always:** `ordine` è scoped per stagione (`annoAgonisticoId`) - un nuovo Gruppo riceve `ordine = max(ordine) + 1` **tra i Gruppi della stessa stagione**, non un contatore globale (stagioni diverse hanno insiemi di Gruppi indipendenti, mai mostrati insieme in nessuna pagina esistente). Il riordino riscrive sempre l'intero set della stagione corrente in un'unica transazione (mirror `riordinaVociMenuPubblico`), mai un update singolo che lascerebbe uno stato intermedio con ordini duplicati osservabile. Il server rilegge sempre l'elenco completo già ordinato prima di calcolare lo scambio Su/Giù (mirror `spostaVoceMenuPubblicoAction`) - mai fidarsi di un indice/posizione inviato dal client.

**Ask First:** nessuna - i punti di scope sono già decisi in `epics.md`.

**Never:** questa storia non tocca `/app/gruppi` (creazione Gruppi, assegnazione Allenatori/Atlete) - stesso confine di competenza già stabilito per Site Manager in Story 19.4. Nessun vincolo di unicità DB su `ordine` (mirror `VoceMenuPubblico.ordine`, "un duplicato transitorio non è un problema che il DB debba impedire").

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin/Site Manager apre `/app/ordine-squadre` | Gruppi della stagione corrente | elenco nell'ordine attuale, bottoni Su/Giù per riga | N/A |
| Click su Su/Giù | riga non al margine | scambio di posizione con la vicina, persistito subito | N/A |
| Click su Su (prima riga) / Giù (ultima riga) | riga al margine | bottone disabilitato lato client; lato server nessuna operazione, non un errore | N/A |
| Migrazione applicata su Gruppi esistenti | N righe per stagione, nessun `ordine` pregresso | backfill alfabetico per `nome`, scoped per `annoAgonisticoId` | N/A |
| Creazione di un nuovo Gruppo da `/app/gruppi` | stagione con Gruppi già ordinati | il nuovo Gruppo riceve `ordine = max(ordine)+1` della stessa stagione, compare in coda | N/A |
| Utente senza `ADMIN`/`SITE_MANAGER` su `/app/ordine-squadre` | qualunque altro Ruolo | bloccato, stesso comportamento di `/app/menu-pubblico` | `FORBIDDEN` |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- `Gruppo.ordine Int`
- **Nuova migrazione** `prisma/migrations/<timestamp>_add_ordine_gruppo/migration.sql` -- `ALTER TABLE "gruppi" ADD COLUMN "ordine" INTEGER;` seguito da un `UPDATE` di backfill (`ROW_NUMBER() OVER (PARTITION BY "annoAgonisticoId" ORDER BY "nome" ASC)`, mirror concettuale ma prima istanza nel progetto di un backfill con window function), poi `ALTER TABLE "gruppi" ALTER COLUMN "ordine" SET NOT NULL;`
- **Nuovo file** `lib/ordine-squadre.ts` -- mirror strutturale di `lib/menu-pubblico.ts`: `elencaGruppiOrdinati(annoAgonisticoId)` (`orderBy: {ordine: "asc"}`), `riordinaGruppi(annoAgonisticoId, idInOrdine: string[])` (transazione, mirror `riordinaVociMenuPubblico`)
- **Nuovo file** `app/app/(configurazione)/ordine-squadre/actions.ts` -- `spostaGruppoAction` (mirror `spostaVoceMenuPubblicoAction`: legge l'elenco completo, trova l'indice, scambia con il vicino, ignora se al margine)
- **Nuovo file** `app/app/(configurazione)/ordine-squadre/page.tsx` -- mirror `menu-pubblico/page.tsx` (elenco + indicazione primo/ultimo per riga)
- **Nuovo file** `app/app/(configurazione)/ordine-squadre/GruppoOrdineRow.tsx` -- mirror `VoceMenuPubblicoRow.tsx` (solo i due bottoni Su/Giù, nessun altro campo modificabile qui)
- **Nuovo file** `app/app/(configurazione)/ordine-squadre/ordine-squadre.module.css` -- mirror `menu-pubblico.module.css`
- `lib/auth/route-guard.ts` -- nuova voce `prefix: "/app/ordine-squadre"`, `ruoliAmmessi: ["ADMIN", "SITE_MANAGER"]`, `navLabel: "Ordine squadre"`, `gruppo: "Gestione sito"` (mirror esatto di `/app/menu-pubblico`)
- `app/app/(gruppi-allenatori)/gruppi/actions.ts` -- `creaGruppo`: `prisma.gruppo.create` esteso con `ordine` calcolato (`aggregate({where:{annoAgonisticoId}, _max:{ordine:true}})`, poi `(max ?? -1) + 1`) prima dell'insert
- `app/squadre/page.tsx` -- `orderBy: { nome: "asc" }` sostituito con `orderBy: { ordine: "asc" }` (Story 18.8 esistente, unico consumatore pubblico del nuovo ordine finché la Story 18.24 non lo estende)

## Tasks & Acceptance

**Execution:**
- [ ] `prisma/schema.prisma` + migrazione con backfill
- [ ] `lib/ordine-squadre.ts` + test
- [ ] `ordine-squadre/actions.ts` + test
- [ ] `ordine-squadre/page.tsx` + `GruppoOrdineRow.tsx` + CSS
- [ ] `route-guard.ts` -- nuova voce
- [ ] `gruppi/actions.ts` -- `creaGruppo` con `ordine` in coda
- [ ] `app/squadre/page.tsx` -- `orderBy` aggiornato

**Acceptance Criteria:** vedi `epics.md` Story 19.15 (Given/When/Then, verbatim - non duplicati qui).

## Spec Change Log

**2026-08-24 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer).** Nessun `intent_gap`/`bad_spec`, nessun loopback. Il "punto di attenzione critico" esplicitamente indicato ai reviewer (coerenza dello scoping per stagione) è stato verificato corretto da tutti e 3 in ogni punto (calcolo `ordine` in `creaGruppo`, `riordinaGruppi`/`spostaGruppoAction`, backfill della migrazione) - nessun bug di scoping trovato. Patch applicate e riverificate:

- **PATCH** — convergenza di tutti e 3 i reviewer: il backfill (`ROW_NUMBER() OVER (PARTITION BY "annoAgonisticoId" ORDER BY "nome" ASC)`) non aveva un tie-breaker per due Gruppi omonimi nella stessa stagione (ordine relativo arbitrario/non riproducibile). Aggiunto `"id" ASC` come secondo criterio, deterministico per costruzione.
- **PATCH** — Edge Case Hunter: `elencaGruppiOrdinati` ordinava solo per `ordine` (nessun tie-breaker) - un pareggio (es. un duplicato non ancora corretto) rendeva l'indice calcolato da `spostaGruppoAction` su una rilettura potenzialmente diverso da quanto l'Admin vedeva nella pagina già renderizzata. Aggiunto `nome` come secondo criterio di ordinamento.
- **PATCH (documentazione)** — Blind Hunter: `ordine-squadre/page.tsx` avvolge `trovaAnnoAgonisticoCorrente()`/`elencaGruppiOrdinati()` in `.catch()` fail-soft, a differenza del mirror dichiarato `menu-pubblico/page.tsx` (che non lo fa) - deviazione corretta (coerente con il pattern dominante in tutto il resto del progetto per `trovaAnnoAgonisticoCorrente`, es. `/squadre`, `/calendario`) ma non commentata. Aggiunto un commento che spiega perché la deviazione dal mirror è intenzionale.
- **DEFER** (loggati in `deferred-work.md`, tutti convergenti su più reviewer): `creaGruppo` (aggregate+create) resta un check-then-act non atomico - un duplicato di `ordine` sarebbe permanente (non transitorio come nel riordino), ma una vera soluzione (SERIALIZABLE+retry o lock esplicito) è sproporzionata per un pannello a bassa concorrenza, stesso principio già accettato in Story 20.2, e lo stesso identico pattern esiste già irrisolto nel mirror dichiarato (`creaVoceMenuPubblico`); `riordinaGruppi` senza difesa-in-profondità sullo scoping (unico chiamante attuale già corretto); `wizard-nuova-stagione` copia `ordine` invariato senza mai ricalcolarlo, ma l'intera Server Action non ha mai avuto copertura di test (gap sistemico preesistente, sproporzionato da colmare qui); nessun indice composito `(annoAgonisticoId, ordine)` (tabella piccola, nessuna necessità dimostrata); nessun raggruppamento visivo per categoria in `/app/ordine-squadre` (esplicitamente fuori scope, competenza di Story 18.24).
- **REJECT**: `/app/gruppi` resta ordinata per `nome` (Blind Hunter) - confine di scope esplicito e dichiarato della spec ("questa storia non tocca /app/gruppi"), non un difetto. Nessun feedback di successo/`aria-live` dopo un riordino (Blind Hunter) - stesso limite ereditato identico dal mirror `VoceMenuPubblicoRow.tsx`, non introdotto qui. Riscrittura O(N) per singolo spostamento + nessun "sposta in cima/fondo" (Blind Hunter) - scelta di design esplicita e dichiarata nella spec (mirror `riordinaVociMenuPubblico`, "nessuna libreria di drag-and-drop"). `gruppiPrecedenti` letto senza `orderBy` esplicito nel wizard (Blind Hunter) - nessun bug reale (il valore copiato non dipende dall'ordine di iterazione).

Riverificato dopo le patch: `npx vitest run` (118 file, 1689 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 21 warning preesistenti non correlati), `npm run build` (riuscita, `/app/ordine-squadre` registrata).

## Design Notes

**Perché `ordine` è scoped per `annoAgonisticoId` e non globale:** `/squadre` e la futura `/app/ordine-squadre` mostrano sempre e solo i Gruppi della stagione corrente (mirror del filtro già in uso in `/app/gruppi`/`/squadre`) - un contatore globale attraverso tutte le stagioni esistite non avrebbe alcun significato osservabile e complicherebbe inutilmente il calcolo di "coda" per un nuovo Gruppo.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione, `/app/ordine-squadre` registrata
- `npx prisma validate` -- expected: schema valido (migrazione non eseguibile in questo ambiente, stesso limite delle story precedenti)

**Manual checks (obbligatorio):**
- Un Admin/Site Manager apre `/app/ordine-squadre`, sposta un Gruppo su/giù (verifica: persistito, bottone disabilitato al margine), verifica che `/squadre` rifletta il nuovo ordine. Un Utente senza i Ruoli ammessi prova ad aprire `/app/ordine-squadre` (atteso: bloccato).
