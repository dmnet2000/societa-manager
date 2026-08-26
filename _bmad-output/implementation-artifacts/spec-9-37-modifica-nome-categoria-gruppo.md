---
title: "Story 9.37: Modifica di nome e categoria di un Gruppo esistente"
type: 'feature'
created: '2026-08-26'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'd16c44ca6cdd4adb580c83aa4b2c167fdaf18c61'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** oggi non esiste alcun modo di correggere nome/categoria di un Gruppo già creato — solo `creaGruppo` esiste in `gruppi/actions.ts`, nessuna `aggiornaGruppo`. Un errore di inserimento richiederebbe cancellare e ricreare il Gruppo, perdendo Allenatori/Atlete/Slot/Campionati già assegnati.

**Approach:** deciso in `epics.md` (Story 9.37): nuova Server Action `aggiornaGruppoAction`, mirror del pattern update-singola-entità già stabilito da `aggiornaPalestra`. UI: toggle sola-lettura/modifica inline in `GruppoRow.tsx`, mirror parziale di `CategoriaTorneoRow.tsx` (Story 20.1) adattato ai vincoli di layout esistenti (rigaPrincipale a 2 sole colonne).

## Boundaries & Constraints

**Always:** stesso perimetro di Ruolo di `creaGruppo` (`requireRuolo(["ADMIN","DIRIGENTE"])`) — nessun Allenatore ha accesso. Nome e categoria restano entrambi obbligatori, stessi messaggi di validazione distinti già usati da `creaGruppo`.

**Ask First:** nessuna — i punti di scope sono già decisi in `epics.md`.

**Never:** nessun controllo di duplicato nome+categoria — stesso comportamento già accettato oggi da `creaGruppo`, deliberatamente non introdotto qui.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin/Dirigente modifica nome/categoria di un Gruppo esistente | valori validi | salvato, visibile senza reload su `/app/gruppi`, `/app/i-miei-gruppi`, `/app/foto-squadre` | N/A |
| Nome o categoria vuoti | stringa vuota/whitespace | rifiutato, nessuna scrittura, messaggio specifico per campo | `VALIDATION` |
| Allenatore tenta la modifica | qualunque valore | rifiutato, nessuna azione disponibile lato UI, azione server rifiuta comunque da sola | `FORBIDDEN` |
| Gruppo cancellato nel frattempo (id non più esistente) | id valido ma non trovato | rifiutato con messaggio dedicato, non un generico "riprova" | `VALIDATION` |

</frozen-after-approval>

## Code Map

- `app/app/(gruppi-allenatori)/gruppi/actions.ts:182` -- nuova `aggiornaGruppoAction`, mirror `aggiornaPalestra`. Distingue l'errore Prisma P2025 ("Gruppo non trovato") dal generico `INTERNAL`. Tripla `revalidatePath` (`/app/gruppi`, `/app/i-miei-gruppi`, `/app/foto-squadre` — stesso motivo già documentato per `caricaFotoSquadraAction` nello stesso file).
- `app/app/(gruppi-allenatori)/gruppi/GruppoRow.tsx` -- toggle sola-lettura/modifica: bottone testuale "Modifica" nella cella categoria (non un'icona in una nuova colonna, per non toccare i `colSpan={2}` usati altrove nel file), riga di modifica condizionale con `colSpan={2}`. Gestione visibilità errore dedicata (`erroreModificaGruppoVisibile`) per evitare che un errore precedente ricompaia riaprendo il form dopo "Annulla".
- `app/app/(gruppi-allenatori)/gruppi/gruppi.module.css` -- nuove classi `.rigaModificaGruppo`, `.formModificaGruppo`, `.bottoneSecondario` (mirror letterale di `torneo.module.css`, nessun import cross-modulo).
- `app/app/(gruppi-allenatori)/gruppi/actions.test.ts` -- `describe("aggiornaGruppoAction", ...)`.
- `lib/guida/contenuti.ts` -- riga aggiunta alla guida di `/app/gruppi` per la nuova capacità "Modifica".

## Tasks & Acceptance

**Execution:**
- [x] `gruppi/actions.ts` -- `aggiornaGruppoAction` + validazioni + tripla `revalidatePath`
- [x] `gruppi/GruppoRow.tsx` -- toggle sola-lettura/modifica
- [x] `gruppi/gruppi.module.css` -- classi dedicate
- [x] `gruppi/actions.test.ts` -- test per ogni ramo della I/O Matrix sopra
- [x] `lib/guida/contenuti.ts` -- guida aggiornata

**Acceptance Criteria:** vedi `epics.md` Story 9.37 (Given/When/Then, verbatim — non duplicati qui).

## Spec Change Log

**Ciclo di review 1 (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) — 2026-08-26.** Nessun finding ha richiesto di riaprire l'Intent (nessun `intent_gap`/`bad_spec`). Patch applicate:
- **PATCH** — convergenza Blind Hunter + Edge Case Hunter: un errore di un tentativo precedente ricompariva riaprendo "Modifica" dopo "Annulla" (il componente mirror `CategoriaTorneoRow.tsx` risolveva già questo caso, mirror incompleto). Aggiunto `erroreModificaGruppoVisibile`, resettato all'apertura del form.
- **PATCH** — Blind Hunter: un Gruppo cancellato nel frattempo (Prisma P2025) mostrava un generico "Riprova" fuorviante. Distinto con un messaggio dedicato "Gruppo non trovato."
- **PATCH** — Verification Gap Reviewer: mancava `revalidatePath("/app/foto-squadre")`, che mostra anch'essa nome/categoria di ogni Gruppo (stesso motivo già documentato per `caricaFotoSquadraAction` nello stesso file). Aggiunta la terza `revalidatePath` + test dedicato.
- **PATCH** — Blind Hunter: la riga di modifica riusava `.rigaAtlete` (classe semanticamente dedicata all'elenco Atlete). Introdotta `.rigaModificaGruppo` dedicata.
- **PATCH** — Blind Hunter: bottone "Salva" senza `aria-label` distintivo (mirror incompleto di `CategoriaTorneoRow.tsx`). Aggiunto.
- **PATCH** — guida in-app di `/app/gruppi` aggiornata con la nuova capacità "Modifica" (convenzione permanente del progetto).
- **PATCH (test)** — aggiunto test di trimming e test dedicato per il ramo "Gruppo non trovato".

Finding scartati/derogati (in `deferred-work.md`): `defaultValue` non aggiornato se il Gruppo cambia server-side a form aperto e nessuna gestione del focus (entrambi già presenti identici nel componente mirror `CategoriaTorneoRow.tsx`, non introdotti qui); nessun limite di lunghezza su nome/categoria (stesso gap già in `creaGruppo`). Scartati come già decisi/fuori scope: nessun controllo di duplicato nome+categoria (deciso esplicitamente in `epics.md`), concetto di multi-tenancy/organizzazione (non applicabile, progetto single-tenant), nessun test di rendering per `GruppoRow.tsx` (convenzione già stabilita per ogni Client Component di questo progetto), nessun messaggio di successo esplicito e nessuna gestione del focus (entrambi assenti anche nel componente mirror, non una regressione).

Riverificato dopo le patch: `npx vitest run` (120 file, 1837 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 21 warning preesistenti), `npm run build` (riuscita).

## Design Notes

**Perché un bottone testuale invece del pattern icona di `icone-azione-riga.tsx`:** `rigaPrincipale` ha solo 2 colonne (Nome/Categoria, Story 9.33) — introdurre una terza colonna "azioni" avrebbe richiesto aggiornare ogni `colSpan={2}` usato altrove nel file (righe Atlete/Allenatori/FotoSquadra). Un bottone testuale dentro la cella Categoria esistente evita quella cascata invasiva, a costo di divergere visivamente dal pattern icona usato in `CategoriaTorneoRow.tsx`/`SlotRow.tsx`/`AllenatoreRow.tsx`.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione

**Manual checks (obbligatorio, da demandare all'utente — nessun ambiente Supabase disponibile in questa sessione):**
- Un Admin/Dirigente su `/app/gruppi` modifica nome/categoria di un Gruppo esistente: verifica che i nuovi valori siano visibili senza reload, e che restino coerenti su `/app/i-miei-gruppi` (per un Allenatore assegnato) e `/app/foto-squadre`.
- Un Allenatore non vede alcuna opzione di modifica su `/app/i-miei-gruppi` (pagina non toccata da questa storia).

## Suggested Review Order

**Azione Server — flusso principale**

- Entry point: validazione, distinzione tra Gruppo non trovato e altri errori.
  [`actions.ts:182`](<../../app/app/(gruppi-allenatori)/gruppi/actions.ts#L182>)

**UI — toggle sola-lettura/modifica**

- Gestione stato: toggle + visibilità errore dedicata (fix del bug "errore stantio" trovato in review).
  [`GruppoRow.tsx:45`](<../../app/app/(gruppi-allenatori)/gruppi/GruppoRow.tsx#L45>)

- Markup: bottone "Modifica" nella cella esistente, riga di modifica condizionale.
  [`GruppoRow.tsx:131`](<../../app/app/(gruppi-allenatori)/gruppi/GruppoRow.tsx#L131>)

**Peripherals**

- Copertura test della nuova azione.
  [`actions.test.ts:296`](<../../app/app/(gruppi-allenatori)/gruppi/actions.test.ts#L296>)

- Classi CSS dedicate.
  [`gruppi.module.css`](<../../app/app/(gruppi-allenatori)/gruppi/gruppi.module.css>)

- Guida in-app aggiornata.
  [`contenuti.ts`](<../../lib/guida/contenuti.ts>)
