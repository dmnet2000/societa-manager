---
title: "Story 9.36: Sanificazione in maiuscolo di Cognome/Nome nella creazione di una nuova Atleta"
type: 'feature'
created: '2026-08-26'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '69a468b3e93f4a0781bb2cfe542c33a757415923'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** nella Server Action condivisa `creaEAssegnaAtleta` (creazione di una nuova Atleta da `/gruppi` o `/i-miei-gruppi`, Story 9.18/9.28), Cognome e Nome vengono solo `.trim()`-ati — a differenza del Codice Fiscale, già normalizzato in maiuscolo. L'anagrafica Atleta risulta quindi incoerente a seconda di come l'operatore digita i dati.

**Approach:** deciso in `epics.md` (Story 9.36): sanificare Cognome e Nome in maiuscolo prima della concatenazione in `nome`, stessa convenzione già in uso per il Codice Fiscale nello stesso file.

## Boundaries & Constraints

**Always:** la sanificazione si applica ai due campi separati (`cognome`, `nome`) PRIMA della concatenazione in `` `${cognome} ${nome}` `` — non un `.toUpperCase()` post-concatenazione (comportamento equivalente per il risultato finale, ma la scelta pre-concatenazione mantiene la sanificazione localizzata dove gli altri campi vengono già normalizzati, righe 542-547).

**Ask First:** nessuna — i punti di scope sono già decisi in `epics.md`.

**Never:** questa storia non tocca `email`/`cellulare` (dati di contatto, non anagrafici, esplicitamente esclusi dall'AC). Non tocca l'import federale (`app/(onboarding-import)/import-atlete/parser.ts`, Story 1.3) — pipeline indipendente con propria normalizzazione, fuori scope. Non tocca `creaAtleta`/`DatiAtletaIdentitari` (`lib/db-rls/atleta.ts`) — riceve già `nome` concatenato, nessuna modifica di firma necessaria.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cognome/Nome in minuscolo o misto | `"rossi"` / `"Maria"` | `Atleta.nome` salvato come `"ROSSI MARIA"` | N/A |
| Cognome/Nome già in maiuscolo | `"ROSSI"` / `"MARIA"` | comportamento invariato, `"ROSSI MARIA"` | N/A |
| Cognome/Nome con accenti/lettere estese | `"città"` / `"José"` | `.toUpperCase()` nativo JS applicato senza errori (`"CITTÀ"` / `"JOSÉ"`) | N/A |
| Cognome o Nome vuoto | stringa vuota | rifiutato con lo stesso messaggio di validazione già esistente (invariato — la sanificazione non altera l'ordine delle validazioni) | `VALIDATION` |

</frozen-after-approval>

## Code Map

- `app/app/(gruppi-allenatori)/gruppi/actions.ts` -- `creaEAssegnaAtleta` (righe 542-543): `cognome`/`nome` letti da `FormData` con solo `.trim()` — aggiungere `.toUpperCase()` dopo `.trim()`, stesso stile di `codiceFiscale` (righe 545-547). Nessun'altra riga della funzione da toccare: la concatenazione a riga 665 (`` nome: `${cognome} ${nome}` ``) riceve già i valori sanificati a monte, nessuna modifica lì necessaria.
- `app/app/(gruppi-allenatori)/gruppi/actions.test.ts` -- `describe("creaEAssegnaAtleta", ...)` (riga 1268): `campiValidi` (righe 1272-1273, `cognome: "Rossi"`, `nome: "Maria"`) e l'asserzione del percorso di successo (riga ~1436, `nome: "Rossi Maria"`) vanno aggiornati per riflettere il nuovo output atteso (`"ROSSI MARIA"`). Aggiungere un nuovo test dedicato che verifica esplicitamente la sanificazione (input misto/minuscolo → output maiuscolo).

## Tasks & Acceptance

**Execution:**
- [x] `gruppi/actions.ts` -- aggiungere `.toUpperCase()` a `cognome`/`nome` (righe 542-543)
- [x] `gruppi/actions.test.ts` -- aggiornare `campiValidi`/asserzioni esistenti, aggiungere test dedicato di sanificazione

**Acceptance Criteria:** vedi `epics.md` Story 9.36 (Given/When/Then, verbatim — non duplicati qui).

## Spec Change Log

**Ciclo di review 1 (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) — 2026-08-26.** Nessun finding ha richiesto di riaprire l'Intent (nessun `intent_gap`/`bad_spec`). Verification Gap Reviewer: nessun gap. Patch applicate:
- Il test dedicato "fully lowercase" (ridondante con il percorso di successo già aggiornato, che usa input misto "Rossi"/"Maria") è stato sostituito con due test più mirati sugli scenari NON ancora coperti dalla matrice I/O: input già interamente maiuscolo (AC #2, idempotenza) e caratteri accentati/estesi ("città"/"José" → "CITTÀ JOSÉ").

Finding scartati/derogati (in `deferred-work.md`, tutti fuori scope esplicito di questa storia o pattern pre-esistenti non aggravati): divergenza di maiuscole con l'import federale (Story 1.3, già escluso da Boundaries), `.toUpperCase()` non locale-aware ("ß"→"SS", stesso pattern già in uso per il Codice Fiscale), nessun backfill dei record `Atleta.nome` legacy, nessuna affordance visiva lato client, stessa asimmetria già nota tra Allenatore/Atleta. Guida in-app: nessuna voce esistente descrive oggi il form "Nuova Atleta" (gap pre-esistente da Story 9.18/9.28, non introdotto da questa storia) - nessun aggiornamento necessario.

Riverificato dopo le patch: `npx vitest run` (120 file, 1829 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 21 warning preesistenti), `npm run build` (riuscita).

## Design Notes

**Perché non un helper condiviso:** la normalizzazione è un singolo `.toUpperCase()` aggiunto a una riga già esistente, stesso stile già in uso per il Codice Fiscale nella stessa funzione — non c'è duplicazione da estrarre, l'operazione è nativa JS senza logica propria.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi quelli aggiornati/nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione

**Manual checks (se possibile in questa sessione):**
- Creazione di una nuova Atleta con Cognome/Nome in minuscolo da `/gruppi` o `/i-miei-gruppi`: verifica che l'Atleta risultante mostri il nome in maiuscolo ovunque compare (elenco Atlete, drill-down).

## Suggested Review Order

- Entry point: sanificazione `.toUpperCase()` aggiunta a `cognome`/`nome`, stesso stile già in uso per `codiceFiscale` due righe sotto.
  [`actions.ts:542`](<../../app/app/(gruppi-allenatori)/gruppi/actions.ts#L542>)

- Percorso di successo esistente aggiornato: l'input misto "Rossi"/"Maria" ora produce "ROSSI MARIA", prova end-to-end con tutti gli effetti collaterali (assegnazione, notifica, revalidatePath).
  [`actions.test.ts:1436`](<../../app/app/(gruppi-allenatori)/gruppi/actions.test.ts#L1436>)

- Nuovo test: input già interamente maiuscolo resta invariato (AC #2, idempotenza).
  [`actions.test.ts:1466`](<../../app/app/(gruppi-allenatori)/gruppi/actions.test.ts#L1466>)

- Nuovo test: caratteri accentati/estesi sanificati senza errori.
  [`actions.test.ts:1484`](<../../app/app/(gruppi-allenatori)/gruppi/actions.test.ts#L1484>)
