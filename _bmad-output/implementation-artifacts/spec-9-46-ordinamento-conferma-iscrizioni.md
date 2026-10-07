---
title: 'Story 9.46: ordinamento della lista in Conferma iscrizioni (Gruppo, Nome, Stato)'
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: 'eede1daa0c4f94d90e2e9b918dfa9443b6155b9d'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** in `/app/conferma-iscrizioni` la tabella delle Atlete è sempre in ordine alfabetico di nome: l'utente vuole poterla ordinare per Gruppo, per Nome e per Stato iscrizione (richiesta 2026-10-07).

**Approach:** intestazioni Nome, Gruppo e Stato Iscrizione cliccabili, come la tabella incontri del torneo (Story 20.24): primo clic crescente, secondo decrescente, freccia sulla colonna attiva, `aria-sort`. Ordinamento lato client, nessun round-trip; logica pura testata in `lib/`.

## Boundaries & Constraints

**Always:** un criterio alla volta; senza clic resta l'ordine attuale (nome). Nome: alfabetico italiano (`localeCompare` "it", senza distinzione maiuscole). Gruppo: per primo nome di Gruppo (i nomi di un'Atleta sono già ordinati); Atlete senza Gruppo sempre in fondo, in entrambe le direzioni. Stato: crescente = "Non iscritta" prima (da confermare in cima), decrescente = "Iscritta" prima; lo stato usato è quello caricato dalla pagina (una conferma/esclusione appena fatta non sposta la riga fino al ricaricamento). A parità: per nome. Righe riordinate mai smontate (key = id Atleta: lo stato locale di conferma resta). Ricerca esistente invariata e combinabile con l'ordinamento. Bottoni d'intestazione ≥44px, focus visibile, `aria-label` con la direzione. Guida in-app aggiornata. Tabella "Atlete rimosse" invariata.

**Ask First:** ordinare anche la tabella "Atlete rimosse"; ricordare l'ordinamento tra una visita e l'altra.

**Never:** query o dati nuovi lato server; modifiche a conferma/esclusione/rimozione; colonna Codice Fiscale ordinabile.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nome | "zoe", "Anna", "Èlia" | crescente: Anna, Èlia, zoe | — |
| Gruppo | A: ["U16"], B: [], C: ["U14","U18"] | crescente: C, A, B; decrescente: A, C, B | — |
| Stato | A iscritta, B non iscritta | crescente: B, A; decrescente: A, B | — |
| Parità | due Atlete stesso Gruppo | ordinate per nome | — |
| Secondo clic | Nome crescente attivo, clic su Nome | Nome decrescente | — |
| Cambio colonna | Nome decrescente, clic su Gruppo | Gruppo crescente | — |

</frozen-after-approval>

## Code Map

- `app/app/(iscrizioni)/conferma-iscrizioni/IscrizioniElenco.tsx:57-86` -- client component con ricerca e `<thead>` (Nome, Codice Fiscale, Gruppo, Stato Iscrizione) e `righe.map(IscrizioneRow)`: aggiungere stato `ordinamento`, bottoni nelle 3 intestazioni, righe ordinate prima del map (key invariata).
- `app/app/(iscrizioni)/conferma-iscrizioni/page.tsx:118-130` -- `righe` = `{ atleta, iscrizioneId, gruppi }` (iscritta ⇔ `iscrizioneId !== null`; `gruppi` già ordinati). Nessuna modifica prevista.
- `app/torneo/TabellaIncontriCategoria.tsx:95-160` + `lib/ordina-incontri-tabella.ts` -- modello: `prossimoOrdinamento` (toggle stessa colonna, nuova colonna → crescente), `aria-sort`, `aria-label` con direzione, freccia `aria-hidden`; CSS `.bottoneOrdinamento`/`.frecciaOrdinamento` in `app/torneo/torneo-pubblico.module.css:240-279` da replicare nel modulo della pagina.
- `app/app/(iscrizioni)/conferma-iscrizioni/conferma-iscrizioni.module.css:13-35` -- `.tabella th` da adattare al bottone (padding sul bottone).
- `lib/guida/contenuti.ts:69-79` -- voce `/app/conferma-iscrizioni`.

## Tasks & Acceptance

**Execution:**
- [x] `lib/ordina-righe-iscrizione.ts` + test -- `ordinaRigheIscrizione(righe, colonna, direzione)` e `prossimoOrdinamento` (o riuso di quello esistente se generico); matrice I/O completa.
- [x] `IscrizioniElenco.tsx` + `conferma-iscrizioni.module.css` -- intestazioni ordinabili e stili.
- [x] `lib/guida/contenuti.ts` -- frase sull'ordinamento.

**Acceptance Criteria:**
- Given l'elenco con ricerca attiva, when ordino per Gruppo, then restano visibili solo le righe cercate, nel nuovo ordine.
- Given ho appena confermato un'Atleta, when cambio ordinamento, then la riga mantiene lo stato "Iscritta" mostrato.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: nessun errore
- `npm run lint` -- expected: 0 errori
- `npm test` -- expected: tutti verdi

**Manual checks (dev locale rotto, al deploy):**
- clic sulle tre intestazioni, freccia e direzione; ricerca + ordinamento.

## Suggested Review Order

**Logica di ordinamento**

- Punto d'ingresso: confronto per colonna, Gruppi in ordine numerico e lessicografico, spareggio stabile.
  [`ordina-righe-iscrizione.ts:85`](../../lib/ordina-righe-iscrizione.ts#L85)

- Clic sulla stessa colonna inverte, nuova colonna crescente.
  [`ordina-righe-iscrizione.ts:26`](../../lib/ordina-righe-iscrizione.ts#L26)

**Tabella**

- Stato iniziale Nome crescente; righe riordinate senza smontarle; nota su revalidatePath.
  [`IscrizioniElenco.tsx:72`](../../app/app/(iscrizioni)/conferma-iscrizioni/IscrizioniElenco.tsx#L72)

- Intestazioni ordinabili con aria-sort, aria-label e freccia.
  [`IscrizioniElenco.tsx:84`](../../app/app/(iscrizioni)/conferma-iscrizioni/IscrizioniElenco.tsx#L84)

- Bottone d'intestazione 44px, hover solo con mouse.
  [`conferma-iscrizioni.module.css:49`](../../app/app/(iscrizioni)/conferma-iscrizioni/conferma-iscrizioni.module.css#L49)

**Guida e test**

- Guida in-app di Conferma iscrizioni.
  [`contenuti.ts:69`](../../lib/guida/contenuti.ts#L69)

- Test della logica e del componente.
  [`ordina-righe-iscrizione.test.ts:1`](../../lib/ordina-righe-iscrizione.test.ts#L1)
  [`IscrizioniElenco.test.tsx:1`](../../app/app/(iscrizioni)/conferma-iscrizioni/IscrizioniElenco.test.tsx#L1)
