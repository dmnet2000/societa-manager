---
title: "Story 9.45: Modifica dei dati anagrafici di un'Atleta già esistente"
type: 'feature'
created: '2026-09-29'
status: 'done'
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/planning-artifacts/epics.md']
baseline_commit: '29246429c70aa8a78e25f040b7be179a9254d946'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** oggi non si può correggere i dati anagrafici (Nome, Data di nascita, Codice Fiscale, Email, Cellulare) di un'Atleta già censita — `creaEAssegnaAtleta` permette solo di crearne una nuova. `aggiornaAtleta` (`lib/db-rls/atleta.ts`) esiste già ma è usata solo dal re-import federale.

**Approach:** nuova Server Action `aggiornaDatiAtletaAction` che riusa `aggiornaAtleta` con la stessa validazione di `creaEAssegnaAtleta` (maiuscolo, CF validato, sesso ri-derivato, duplicato con auto-esclusione). Perimetro **solo ADMIN e SEGRETERIA** (confermato con l'utente 2026-09-29) — deviazione voluta dalla precedenza Story 2.10 su `/gruppi` (Admin/Dirigente = gestione, Segreteria = sola lettura): qui Segreteria scrive, Dirigente/Allenatore restano esclusi. UI in un componente condiviso `ModificaDatiAtletaForm.tsx`, usato sia nel ramo di gestione (`AtletaTabellaRiga.tsx`) sia nel ramo di sola lettura Segreteria di `page.tsx`.

## Boundaries & Constraints

**Always:** Nome/Cognome come un solo campo testo (mirror del valore già concatenato in `Atleta.nome`, che non ha colonna `cognome` separata — split automatico ambiguo su cognomi composti). Sanificato in maiuscolo (Story 9.36). Sesso sempre ri-derivato dal CF, mai campo separato. Prima di `aggiornaAtleta`, leggere la riga attuale e ripassare `dataPrimoTesseramento` invariato: `serializza()` lo forza a `null` se assente dall'oggetto (unico campo opzionale con questo comportamento — gli altri, es. `luogoNascita`/`categoria`/`matricola`, restano intatti se omessi). Duplicato CF controllato con `.neq("id", atletaId)`.

**Ask First:** nessuna — perimetro Ruoli e campi già chiusi con l'utente.

**Never:** nessuna modifica ai campi esclusivi dell'import federale (luogo/provincia nascita, indirizzo, CAP, categoria, matricola, data primo tesseramento). Nessun accesso per Dirigente/Allenatore/Atleta/Genitore. Nessuna migrazione.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin/Segreteria salva dati validi | Nome/Data nascita/CF validi | riga aggiornata, campi federali invariati | N/A |
| Campo obbligatorio vuoto o CF non valido | input invalido | rifiutato, nessuna scrittura | `VALIDATION` |
| CF modificato già usato da un'altra Atleta | CF duplicato | rifiutato | `VALIDATION` |
| Salvataggio senza cambiare il proprio CF | stesso CF | accettato | N/A |
| Dirigente/Allenatore tenta l'azione | Ruolo non ammesso | rifiutato | `FORBIDDEN` |
| Atleta non trovata | id invalido | rifiutato | `VALIDATION` |

</frozen-after-approval>

## Code Map

- `lib/db-rls/atleta.ts` -- `elencaAtlete`: select esteso con `dataNascita, email, cellulare` (oltre a `codiceFiscale` già presente); i ~18 chiamanti esistenti ignorano i campi extra come già fanno con `codiceFiscale`/`categoria`.
- `gruppi/actions.ts` -- nuova `aggiornaDatiAtletaAction`: `requireRuolo(["ADMIN","SEGRETERIA"])` → valida `atletaId, nome, dataNascita, codiceFiscale, email, cellulare` (mirror `creaEAssegnaAtleta`, righe 601-666) → legge riga attuale per `dataPrimoTesseramento` (mirror `trovaPerCodiceFiscale`) → duplicato con `.neq` → `aggiornaAtleta(...)` → `revalidatePath("/app/gruppi")`. Test in `gruppi/actions.test.ts`.
- `gruppi/ModificaDatiAtletaForm.tsx` (nuovo) -- toggle sola-lettura/modifica (mirror `GruppoRow.tsx` righe 45-71) + form + `useActionState`.
- `AtletaTabellaRiga.tsx` -- prop opzionali `puoModificare?`, `datiAnagrafici?`; se presenti, cella Nome mostra `<ModificaDatiAtletaForm>` invece del testo (riga 77). Assenti per default → `/i-miei-gruppi` invariato.
- `GruppoRow.tsx` -- prop `puoModificareAtleta`, passato a ogni `AtletaTabellaRiga` con `atleta.datiAnagrafici`.
- `gruppi/page.tsx` -- `puoModificareAtleta = ruoli.includes("ADMIN") || ruoli.includes("SEGRETERIA")`; se vero, `datiAnagraficiPerId` (Map) da `atlete`; ramo gestione: unito in `atleteGruppo` → `GruppoRow`; ramo `soloVisualizzazione` (righe 175-253): `<td>{atleta.nome}</td>` → `<ModificaDatiAtletaForm>`.

## Tasks & Acceptance

**Execution:**
- [x] `lib/db-rls/atleta.ts` -- select esteso in `elencaAtlete`
- [x] `gruppi/actions.ts` -- `aggiornaDatiAtletaAction` + test sulla matrice I/O
- [x] `ModificaDatiAtletaForm.tsx` -- nuovo componente
- [x] `AtletaTabellaRiga.tsx` -- prop `puoModificare`/`datiAnagrafici`
- [x] `GruppoRow.tsx` -- prop `puoModificareAtleta`, passthrough
- [x] `page.tsx` -- calcolo permesso, `datiAnagraficiPerId`, integrazione in entrambi i rami

**Acceptance Criteria:**
- Given un Admin o una Segreteria su `/gruppi`, when salvano dati validi, then la riga è aggiornata senza reload e senza impatto su Presenze/Certificati/Iscrizioni/Gruppi associati
- Given un Dirigente o un Allenatore, when tentano l'azione, then è sempre rifiutata (`FORBIDDEN`)
- Given la suite Vitest esistente, when la storia è completata, then `creaEAssegnaAtleta`, il re-import federale e `/i-miei-gruppi` restano invariati

## Verification

**Commands:**
- `npm run test` -- expected: suite verde, inclusi i nuovi test su `aggiornaDatiAtletaAction`
- `npm run lint` -- expected: nessun nuovo errore

## Suggested Review Order

**Server Action: validazione e la trappola `dataPrimoTesseramento`**

- Entry point - stesso schema di validazione di `creaEAssegnaAtleta` (maiuscolo, CF, sesso ri-derivato), nuovo perimetro Ruoli.
  [`actions.ts:810`](../../app/app/(gruppi-allenatori)/gruppi/actions.ts#L810)

- Legge la riga attuale prima di scrivere: serve sia a rilevare "Atleta non trovata" sia a preservare `dataPrimoTesseramento` (altrimenti azzerato in silenzio da `serializza()`).
  [`actions.ts:885`](../../app/app/(gruppi-allenatori)/gruppi/actions.ts#L885)

- Controllo duplicato Codice Fiscale con auto-esclusione (`.neq`) - salvare senza cambiare il proprio CF non si rifiuta contro se stessa.
  [`actions.ts:915`](../../app/app/(gruppi-allenatori)/gruppi/actions.ts#L915)

- `dataPrimoTesseramento` ripassato invariato nella chiamata finale a `aggiornaAtleta` - il punto in cui la trappola viene effettivamente evitata.
  [`actions.ts:944`](../../app/app/(gruppi-allenatori)/gruppi/actions.ts#L944)

- Review fix: seconda `revalidatePath` per `/i-miei-gruppi` - stessi dati Atleta visibili anche li' all'Allenatore.
  [`actions.ts:1061`](../../app/app/(gruppi-allenatori)/gruppi/actions.ts#L1061)

**Perimetro Ruoli: deviazione voluta da Story 2.10**

- `puoModificareAtleta` calcolato una sola volta (ADMIN o SEGRETERIA) - qui Segreteria scrive, a differenza della sola-lettura che ha su tutto il resto di questa pagina.
  [`page.tsx:82`](../../app/app/(gruppi-allenatori)/gruppi/page.tsx#L82)

**UI: componente condiviso in due rami di rendering diversi**

- `ModificaDatiAtletaForm` - toggle sola-lettura/modifica, mirror del pattern gia' stabilito per la modifica di un Gruppo.
  [`ModificaDatiAtletaForm.tsx:24`](../../app/app/(gruppi-allenatori)/gruppi/ModificaDatiAtletaForm.tsx#L24)

- Ramo di gestione (Admin/Dirigente): cella Nome mostra il form solo se `puoModificare` e `datiAnagrafici` sono entrambi presenti - assente per default, `/i-miei-gruppi` invariato.
  [`AtletaTabellaRiga.tsx:93`](../../app/app/(gruppi-allenatori)/gruppi/AtletaTabellaRiga.tsx#L93)

- Ramo di sola lettura Segreteria: stesso identico form, integrato direttamente nella tabella bare (nessun altro componente condiviso con Admin/Dirigente qui).
  [`page.tsx:272`](../../app/app/(gruppi-allenatori)/gruppi/page.tsx#L272)

- `datiAnagraficiPerId` costruita solo quando serve, per non passare Codice Fiscale/Email/Cellulare a un render che non li usa.
  [`page.tsx:182`](../../app/app/(gruppi-allenatori)/gruppi/page.tsx#L182)

**Data layer**

- `elencaAtlete`: select esteso con `dataNascita, email, cellulare` - i ~18 chiamanti esistenti ignorano i campi extra.
  [`atleta.ts:118`](../../lib/db-rls/atleta.ts#L118)

**Documentazione**

- Guida in-app aggiornata: nuova capacita' "Modifica" e correzione della riga che dichiarava Segreteria priva di ogni azione di scrittura.
  [`contenuti.ts:135`](../../lib/guida/contenuti.ts#L135)

**Peripherals**

- Nuovi test su `aggiornaDatiAtletaAction`, inclusa la verifica esplicita che `.neq()` sia invocato (self-exclusion) e la doppia `revalidatePath`.
  [`actions.test.ts:1727`](../../app/app/(gruppi-allenatori)/gruppi/actions.test.ts#L1727)

- Test di `elencaAtlete` aggiornato per i 3 nuovi campi selezionati.
  [`atleta.test.ts:138`](../../lib/db-rls/atleta.test.ts#L138)
