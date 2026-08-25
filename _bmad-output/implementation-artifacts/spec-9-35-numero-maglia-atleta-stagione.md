---
title: "Story 9.35: Numero di maglia per Atleta, per stagione"
type: 'feature'
created: '2026-08-24'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '993c258acaaa7d1a5dc65d15b414201cf35e990e'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la Story 18.24 (elenco Atlete a blocchi su `/squadre`) deve poter mostrare un Numero di maglia per Atleta, ma oggi non esiste alcun campo simile - né sull'anagrafica `Atleta` (svincolata dalla stagione) né altrove.

**Approach:** deciso in `epics.md` (Story 9.35): nuovo campo `numero Int?` su `GruppoAtleta` (il legame stagionale Atleta+Gruppo+Stagione, già univoco per Story 9.21) - non su `Atleta`. Editabile ovunque l'elenco Atlete di un Gruppo è già gestito dallo stesso componente condiviso `AtletaTabellaRiga.tsx` (usato sia da `/gruppi`, Admin/Dirigente, sia da `/i-miei-gruppi`, Allenatore) - stessa Server Action, stesso perimetro Ruoli e stessa guardia di possesso già usati da `rimuoviAtleta` in `gruppi/actions.ts`.

## Boundaries & Constraints

**Always:** perimetro Ruoli `["ADMIN","DIRIGENTE","ALLENATORE"]` (mirror esatto `rimuoviAtleta`) - un Allenatore può impostare il Numero solo per Atlete del **proprio** Gruppo (`risolviPossessoGruppo`, stessa guardia già in uso). `numero` è specifico della coppia Atleta+Gruppo+Stagione (riga `GruppoAtleta`) - mai condiviso con un'altra stagione o un altro Gruppo della stessa Atleta. `updateMany` con `where` composito (`atletaId`+`gruppoId`+`annoAgonisticoId`) + `VALIDATION` esplicita se `count === 0` (mirror della disciplina già stabilita nell'epica per ogni update/delete scoping-sensibile).

**Ask First:** nessuna - i punti di scope sono già decisi in `epics.md`.

**Never:** nessun vincolo di unicità DB su `numero` (deciso esplicitamente in `epics.md` AC #3 - due Atlete dello stesso Gruppo possono avere lo stesso Numero senza essere bloccate). Rimuovere un'Atleta da un Gruppo (`rimuoviAtleta`, `deleteMany` su `GruppoAtleta`) cancella già il Numero insieme al resto della riga - nessuna azione aggiuntiva richiesta qui.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Allenatore/Admin/Dirigente imposta un Numero per un'Atleta del proprio Gruppo | intero positivo | salvato, visibile in entrambe le pagine (`/gruppi`, `/i-miei-gruppi`) | N/A |
| Campo lasciato vuoto | stringa vuota | `numero` impostato a `null` (facoltativo, mai obbligatorio) | N/A |
| Valore non numerico o negativo | input invalido | rifiutato | `VALIDATION` |
| Allenatore prova a impostare il Numero per un'Atleta di un Gruppo non proprio | id di un Gruppo altrui | rifiutato, stesso comportamento di `rimuoviAtleta` | `FORBIDDEN`/`VALIDATION` (mirror `risolviPossessoGruppo`) |
| L'assegnazione Atleta+Gruppo+Stagione non esiste più (rimossa nel frattempo) | `count === 0` sull'update | rifiutato esplicitamente, mai un no-op silenzioso | `VALIDATION` |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- `GruppoAtleta.numero Int?`
- **Nuova migrazione** `prisma/migrations/<timestamp>_add_numero_gruppo_atleta/migration.sql` -- `ALTER TABLE "gruppo_atlete" ADD COLUMN "numero" INTEGER;` (nullable fin da subito, nessun backfill necessario - campo nuovo e facoltativo)
- `app/app/(gruppi-allenatori)/gruppi/actions.ts` -- nuova `impostaNumeroAtletaAction(_prevState, formData)`: legge `gruppoId`/`atletaId`/`numero` (stringa vuota → `null`, altrimenti intero positivo validato), `requireRuolo(["ADMIN","DIRIGENTE","ALLENATORE"])`, risolve `gruppo.annoAgonisticoId`, `risolviPossessoGruppo` (mirror esatto `rimuoviAtleta`), poi `prisma.gruppoAtleta.updateMany({where:{atletaId, gruppoId, annoAgonisticoId}, data:{numero}})` con `VALIDATION` esplicita su `count === 0`. Test in `gruppi/actions.test.ts`.
- `app/app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx` -- tipo condiviso `Atleta` esteso con `numero: number | null`
- `app/app/(gruppi-allenatori)/gruppi/AtletaTabellaRiga.tsx` -- nuova colonna "Numero": piccolo `<form>` inline (input numerico + bottone "Salva", mirror compatto del pattern form-per-riga già in uso in `VoceMenuPubblicoRow.tsx`)
- `app/app/(gruppi-allenatori)/gruppi/GruppoRow.tsx` -- nuovo `<th>Numero</th>` nella tabella Atlete
- `app/app/(gruppi-allenatori)/i-miei-gruppi/MioGruppoCard.tsx` -- stesso nuovo `<th>Numero</th>` (mirror)
- `app/app/(gruppi-allenatori)/gruppi/page.tsx` -- `prisma.gruppoAtleta.findMany` esteso con `numero: true` nel `select`, valore incluso nella mappatura `atleteGruppo`
- `app/app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` -- stessa estensione (mirror)

## Tasks & Acceptance

**Execution:**
- [ ] `prisma/schema.prisma` + migrazione
- [ ] `gruppi/actions.ts` -- `impostaNumeroAtletaAction` + test
- [ ] `AtletaAssegnata.tsx` -- tipo esteso
- [ ] `AtletaTabellaRiga.tsx` -- colonna Numero
- [ ] `GruppoRow.tsx`/`MioGruppoCard.tsx` -- intestazione colonna
- [ ] `gruppi/page.tsx`/`i-miei-gruppi/page.tsx` -- query estesa

**Acceptance Criteria:** vedi `epics.md` Story 9.35 (Given/When/Then, verbatim - non duplicati qui).

## Spec Change Log

**2026-08-25 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer).** Nessun `intent_gap`/`bad_spec`, nessun loopback. Patch applicate e riverificate:

- **PATCH** — convergenza di tutti e 3 i reviewer: l'`<input>` Numero (`defaultValue`, non controllato) non si aggiornava mai dopo un salvataggio riuscito (stessa istanza React prima/dopo `revalidatePath`) - un secondo salvataggio concorrente (altra tab, altro Utente) restava invisibile fino a un refresh manuale. Aggiunta `key={atleta.numero ?? "vuoto"}` sull'input: quando il valore cambia, React smonta/rimonta l'elemento, riapplicando `defaultValue` al dato fresco.
- **PATCH** — Blind Hunter: nessun feedback visibile su un salvataggio riuscito (a differenza degli altri form della pagina). Aggiunto un messaggio "Salvato." su `{success:true}`.
- **PATCH** — Blind Hunter: `numeroInputId` era chiavizzato solo su `atleta.id`, non su `gruppoId+atletaId` - un'Atleta assegnata a più Gruppi contemporaneamente (Story 9.21) poteva produrre id HTML duplicati tra righe diverse in `/gruppi`. Corretto in `numero-atleta-${gruppoId}-${atleta.id}`.
- **PATCH** — Blind Hunter: il ramo `count === 0` (assegnazione rimossa nel frattempo) non chiamava `revalidatePath`, lasciando la riga visibile/modificabile nella UI stantia con un vicolo cieco di retry infiniti. Aggiunta la stessa `revalidatePath` del ramo di successo.
- **PATCH** — convergenza Edge Case Hunter + Blind Hunter: `Number("1e2")`/`Number("0x7")` sono interi "validi" per `Number.isInteger` ma non cifre decimali semplici, mai digitabili dal widget reale (bypassabili solo con un FormData manomesso). Aggiunta una guardia `/^\d+$/` prima della conversione numerica.
- **PATCH (test)** — Blind Hunter: parità di test mancante con `rimuoviAtleta` nonostante la spec dichiari "mirror esatto" - aggiunti i 3 test mancanti sui rami di `risolviPossessoGruppo` (Allenatore senza profilo, Gruppo di una stagione passata, eccezione durante la verifica), un test sul refuso "Story 9.15"→"Story 9.35" nel commento corrispondente, un test su un vero valore decimale ("7.5", non solo una stringa non numerica), un test sulla notazione scientifica/esadecimale, e un'asserzione `revalidatePath` sul ramo `count === 0`.
- **DEFER** (loggati in `deferred-work.md`): nessun controllo di concorrenza (optimistic lock) - diversi scenari di race condition convergenti, stessa classe di rischio già accettata ripetutamente per un pannello di gestione interno a bassa concorrenza; solo il bottone (non l'input) disabilitato durante il pending; target di tocco 44px non applicato ai nuovi controlli (stesso registro "compatto" già in uso per l'intera tabella); nessuna protezione type-level sulla separazione `AtletaConStato`/`Atleta` condiviso; nessun vincolo `CHECK` DB per il range 1-999 (stesso principio già stabilito nel progetto).
- **REJECT**: gap sistemico di copertura test su `gruppi/page.tsx`/`i-miei-gruppi/page.tsx`/`AtletaTabellaRiga.tsx` (Verification Gap Reviewer) - nessuna pagina/componente di questa cartella ha mai avuto un test diretto, non specifico di questa storia. Duplicazione del type-guard letterale tra i due `page.tsx` (Blind Hunter) - pattern preesistente (stessa duplicazione già presente per iscritta/tesserata/certificato), non introdotto qui. Divergenza nell'ordine di validazione rispetto al mirror `rimuoviAtleta` (Blind Hunter) - nessun impatto di sicurezza, solo stilistico. Assenza di indicazione visiva per Numeri duplicati nella stessa tabella (Blind Hunter) - comportamento deliberatamente ammesso da AC #3, non un difetto.

Riverificato dopo le patch: `npx vitest run` (118 file, 1708 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 21 warning preesistenti non correlati), `npm run build` (riuscita).

## Design Notes

**Perché `numero` vive su `GruppoAtleta` e non su `Atleta`:** `GruppoAtleta` è già il legame stagionale univoco (Atleta+Gruppo+Stagione, Story 9.21) - lo stesso principio già seguito per ogni altro dato specifico-di-stagione nel progetto (es. `Iscrizione`/`Tesseramento`), mai un campo sull'anagrafica che dovrebbe poi essere "azzerato" ad ogni cambio stagione.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione
- `npx prisma validate` -- expected: schema valido (migrazione non eseguibile in questo ambiente, stesso limite delle story precedenti)

**Manual checks (obbligatorio):**
- Un Allenatore su `/i-miei-gruppi` imposta un Numero per un'Atleta del proprio Gruppo (verifica: salvato, visibile anche su `/gruppi` per lo stesso Admin/Dirigente), lo lascia vuoto per un'altra Atleta (verifica: nessun Numero mostrato), prova un valore non numerico (atteso: rifiutato).
