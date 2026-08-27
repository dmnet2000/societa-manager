---
title: "Story 9.40: Vista più compatta e ordinabile per l'elenco Utenti in /app/admin"
type: 'feature'
created: '2026-08-27'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'a032d3003d46851574454b05b7750967a456d7ca'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `UtenteRow.tsx` mostra oggi, per ogni Utente, un gruppo di 7 checkbox sempre visibili (mai una vista sola-lettura), e le azioni "Disattiva"/"Riattiva"/"Reimposta password" vivono in due colonne separate con header vuoto — richiesta esplicita dell'utente per un elenco più compatto, un pulsante "Modifica" per i Ruoli, azioni allineate sotto un'unica colonna "Funzioni", e possibilità di ordinare per Ruolo/Stato.

**Approach:** Ruoli mostrati in sola lettura (etichette separate da virgola) con un pulsante "Modifica" (icona matita, `IconaModifica` esistente) che porta SOLO quella riga in modalità modifica inline — mirror diretto del pattern già stabilito da Story 9.30/15.5/`CategoriaTorneoRow.tsx` (confermato con l'utente, non un popup/modale: prima occorrenza mai introdotta nel progetto). Le due colonne azione esistenti si fondono in un'unica colonna "Funzioni" (Modifica + Disattiva/Riattiva + Reimposta password allineati insieme). Due pulsanti di ordinamento ("Ruolo"/"Stato") sopra la tabella, mirror del pattern client-side esistente (`ListaConfermati.tsx`, Story 9.25: `aria-pressed` + riordino in memoria, nessun round-trip server) — un solo criterio attivo alla volta.

## Boundaries & Constraints

**Always:** ordinamento per Ruolo = priorità = indice nell'array condiviso `RUOLI_VALIDI` (`lib/ruoli.ts`, stesso ordine di `UtenteRow.tsx`); un Utente con più Ruoli usa il Ruolo di indice più basso (più prioritario) — confermato con l'utente. Ordinamento per Stato = Attivo prima di Disattivato. Entrambi con fallback alfabetico per email a parità (stesso criterio del `orderBy` server-side esistente).

**Ask First:** risolto in fase di pianificazione (AskUserQuestion) — toggle inline (non popup/modale); priorità Ruolo = ordine di `RUOLI_VALIDI`.

**Never:** nessuna modifica alla logica esistente (`aggiornaRuoliUtente`/`impostaAttivoUtente`/`reimpostaPasswordFissaUtente`/`correggiEmailUtenteAction`) — solo presentazione. Nessuna modifica alla colonna "Correggi email" (resta separata, non unita a "Funzioni"). Nessun ordinamento server-side/query param — client-side puro, mirror `ListaConfermati.tsx`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Utente con più Ruoli, ordina per Ruolo | es. Ruoli = [DIRIGENTE, ALLENATORE] | ordinato usando ALLENATORE (indice più basso in RUOLI_VALIDI) | N/A |
| Utente senza alcun Ruolo assegnato | `ruoli: []` | vista sola-lettura mostra un testo esplicito ("Nessun ruolo assegnato"), non una cella vuota fuorviante | N/A |
| Click su "Modifica" di una riga mentre un'altra è già in modifica | 2 righe distinte | solo la riga cliccata entra in modifica, l'altra resta invariata (stato locale per riga, mirror `CategoriaTorneoRow.tsx`) | N/A |
| Salvataggio Ruoli riuscito | submit "Salva Ruoli" | la riga torna in sola lettura con i nuovi Ruoli, mirror del comportamento `CategoriaTorneoRow.tsx` dopo un salvataggio riuscito | N/A |
| Click su "Ruolo" mentre "Stato" è già attivo | doppio click sui 2 pulsanti | solo un criterio alla volta attivo, il secondo click disattiva il primo | N/A |

</frozen-after-approval>

## Code Map

- `lib/ruoli.ts` -- `RUOLI_VALIDI` (già esportato): riusato tale e quale come sequenza di priorità, nessuna modifica al file.
- `lib/ordina-utenti-per-ruolo-stato.ts` -- nuovo file, mirror di `lib/ordina-certificati-per-stato.ts`: `PRIORITA_RUOLO: Record<Ruolo, number>` derivata da `RUOLI_VALIDI.indexOf(...)`, `ordinaUtentiPerRuolo<T extends {ruoli: Ruolo[]; email: string}>(utenti: T[]): T[]` (chiave = `Math.min(...ruoli.map(r => PRIORITA_RUOLO[r]))`, fallback `email.localeCompare`) e `ordinaUtentiPerStato<T extends {attivo: boolean; email: string}>(utenti: T[]): T[]` (Attivo prima, fallback email). Due funzioni pure separate (non una firma unica parametrizzata) per restare coerenti con `ordinaPerPrioritaStato` (una funzione = un criterio).
- `app/app/(amministrazione)/admin/UtenteRow.tsx` -- aggiungere `const [inModifica, setInModifica] = useState(false)` (mirror `CategoriaTorneoRow.tsx` righe 39/65/217-220: reset a `false` dentro il gestore di successo del submit Ruoli, pulsante "Annulla" per uscire senza salvare). Il `<td>` Ruoli (righe 91-118) diventa condizionale: `!inModifica` → etichette dei Ruoli assegnati separate da virgola (usare le `label` di `RUOLI`, non i `value` grezzi) o "Nessun ruolo assegnato" se vuoto, più il pulsante Modifica (icona matita, `IconaModifica` da `@/app/icone-azione-riga`, `aria-label`/`title` = `Modifica ruoli di {utente.email}`); `inModifica` → il form checkbox esistente (righe 92-117, invariato) + pulsante "Annulla". I `<td>` Disattiva/Riattiva (righe 120-136) e Reimposta password (righe 137-152) si fondono in un unico `<td>` "Funzioni" che ospita i due pulsanti esistenti (invariati nella logica) affiancati in un contenitore flex (nuova classe CSS), ciascuno con il proprio paragrafo d'errore esistente sotto.
- `app/app/(amministrazione)/admin/page.tsx` -- il `<table>` (righe 74-110) si sposta in un nuovo Client Component `ElencoUtenti.tsx` (mirror esatto della relazione `page.tsx`/`ListaConfermati.tsx` in `/conferma-certificati`): `page.tsx` continua a risolvere `utenti`/`listaUtentiAuth` come oggi, passa l'array già shape-ato a `<ElencoUtenti utenti={...} />`. Header `<thead>`: le 2 `<th></th>` vuote (righe 80-81) diventano una singola `<th>Funzioni</th>`.
- `app/app/(amministrazione)/admin/ElencoUtenti.tsx` -- nuovo Client Component, mirror di `ListaConfermati.tsx`: `useState<"ruolo" | "stato" | null>(null)` per il criterio attivo, `useMemo` che applica `ordinaUtentiPerRuolo`/`ordinaUtentiPerStato`/nessuno, 2 pulsanti `aria-pressed` ("Ruolo"/"Stato", stile mirror `.bottoneOrdina` di `conferma-certificati.module.css`) sopra la tabella, poi il `<table>` (spostato da `page.tsx`) con `.map` su `UtenteRow` (stessa `key` forzata su `ruoli.join(",")` già esistente).
- `app/app/(amministrazione)/admin/admin.module.css` -- nuova classe per il contenitore flex dei pulsanti "Funzioni" (gap piccolo, `flex-wrap`) e per la barra dei 2 pulsanti di ordinamento (mirror `.headerConfermati`/`.bottoneOrdina` di `conferma-certificati.module.css`, adattati ai token già in uso in questo file).

## Tasks & Acceptance

**Execution:**
- [x] `lib/ordina-utenti-per-ruolo-stato.ts` -- 2 funzioni pure di ordinamento + test
- [x] `app/app/(amministrazione)/admin/UtenteRow.tsx` -- toggle sola-lettura/modifica per i Ruoli, colonna "Funzioni" unificata
- [x] `app/app/(amministrazione)/admin/ElencoUtenti.tsx` -- nuovo Client Component, tabella + 2 pulsanti di ordinamento
- [x] `app/app/(amministrazione)/admin/page.tsx` -- delega la tabella a `ElencoUtenti`, header "Funzioni"
- [x] `app/app/(amministrazione)/admin/admin.module.css` -- classi per il contenitore Funzioni e la barra di ordinamento

**Acceptance Criteria:** vedi `epics.md` Story 9.40 (Given/When/Then, verbatim — non duplicati qui; la bozza AC lì presente va rifinita con i punti aperti ora risolti).

## Spec Change Log

**Ciclo di review 1 (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) — 2026-08-27.** Nessun finding ha richiesto di riaprire l'Intent. Verification Gap Reviewer: nessun gap (tutti i casi rilevanti della matrice I/O coperti dai test delle 2 funzioni pure; i comportamenti UI puri seguono la stessa convenzione di zero test di rendering componente già confermata più volte in questo progetto).

**PATCH (applicati)**:
1. Blind Hunter + Edge Case Hunter (convergenza indipendente): un errore di salvataggio Ruoli restava agganciato a `ruoliState` senza un flag di visibilità dedicato - "Annulla" seguito da un nuovo "Modifica" sulla stessa riga rimostrava l'errore del tentativo precedente prima di un nuovo submit. Stesso identico bug già risolto per il pattern gemello (`erroreModificaVisibile`, `CategoriaTorneoRow.tsx`, "Review fix Edge Case Hunter, Story 20.1") ma non riportato qui al momento dell'implementazione. Aggiunto `erroreRuoliVisibile`, resettato a `false` sia su "Modifica" (riapertura) sia su "Annulla", impostato in base all'esito solo alla fine di un vero ciclo di submit (adattato al fatto che `aggiornaRuoliUtente` non ha un sentinel di successo esplicito, diversamente dal pattern gemello - vedi commento in `UtenteRow.tsx`).
2. Blind Hunter: il commento sopra `.iconaBottone` descriveva erroneamente il genitore immediato del bottone come un `<td>` (in realtà `.ruoliVista`, che è flex) - corretto per riflettere la struttura DOM reale.
3. Blind Hunter: `PRIORITA_RUOLO` costruiva l'indice con `RUOLI_VALIDI.indexOf(ruolo)` dentro il proprio `.map` (ricerca lineare ridondante, O(n²) invece di O(n) - irrilevante sui soli 7 Ruoli di oggi, ma inutile) - sostituito con l'indice già disponibile come secondo argomento di `.map`.

Finding scartati (pattern preesistente non introdotto/aggravato da questa storia, comportamento impossibile dato il tipo enum chiuso di Prisma, o già coerente col precedente stabilito):
- Checkbox non disabilitate durante `ruoliPending` (solo i pulsanti lo sono) - stesso comportamento già presente prima di questa storia.
- Nessuno stato visivo per `[aria-pressed="true"]` sui pulsanti di ordinamento - verificato: lo stesso identico gap esiste già nel precedente diretto (`conferma-certificati.module.css`, `.bottoneOrdina`), non introdotto qui.
- Nessun live-region per annunciare il riordino agli screen reader - stesso livello di rifinitura del precedente diretto, non richiesto dagli AC.
- `.funzioni` riusata per due contenitori strutturalmente diversi (colonna Funzioni e riga Salva/Annulla) - entrambi lo stesso identico pattern layout (flex row + gap), coerente con il riuso di classi layout generiche già diffuso nel progetto (es. `.formCompatto`).
- Valori di `Ruolo` assenti da `RUOLI_VALIDI`/`PRIORITA_RUOLO` (sia nella vista sola-lettura sia nell'ordinamento) - impossibile: `Ruolo` è un enum Prisma chiuso, `RUOLI_VALIDI` ne è la lista completa (7/7), nessun valore libero può esistere a runtime.
- La `key` di `UtenteRow` include `ruoli.join(",")`, causando un remount (e la perdita di una modifica Ruoli in corso) se i Ruoli cambiano esternamente mentre la riga è in modifica - pattern preesistente (già nel commento originale "forza il remount... quando cambiano" prima di questa storia), non introdotto/aggravato qui.
- Nessun messaggio esplicito per un elenco Utenti vuoto - pattern preesistente (mai gestito prima di questa storia), e scenario non realistico (l'Admin che visualizza la pagina è esso stesso una riga Utente).
- Il criterio di ordinamento si "resetterebbe" dopo un salvataggio Ruoli riuscito (`revalidatePath`) - verificato non corretto: `ElencoUtenti` non è keyato sui dati e resta montato attraverso un refresh RSC, lo stato locale `criterio` sopravvive (solo la riga il cui `ruoli` è effettivamente cambiato remonta, per la key esistente).
- Etichette dei pulsanti di ordinamento poco esplicite ("Ruolo"/"Stato" senza icona/freccia) - stessa identica etichettatura minimale del precedente diretto (`ListaConfermati.tsx`, solo "Stato").
- Nessuna gestione esplicita del focus tra vista e modifica dei Ruoli - fuori scope, nessun AC lo richiede, stesso livello di rifinitura di ogni altro toggle sola-lettura/modifica del progetto.
- Vista Ruoli come stringa concatenata invece di badge compatti - preferenza estetica, nessun componente badge esiste nel progetto, fuori scope letterale della richiesta.

Riverificato dopo le patch: `npx vitest run` (121 file, 1867 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 21 warning preesistenti).

## Design Notes

**Perché due funzioni di ordinamento separate invece di una parametrizzata:** mirror esatto di `ordinaPerPrioritaStato` (`lib/ordina-certificati-per-stato.ts`) — un criterio, una funzione pura, stessa disciplina già stabilita nell'unico precedente di ordinamento client-side del progetto.

**Perché un nuovo Client Component (`ElencoUtenti.tsx`) e non lo stato direttamente in `page.tsx`:** `page.tsx` resta un Server Component async con accesso diretto a Prisma/Supabase Admin API — mirror esatto della stessa separazione già stabilita da `conferma-certificati/page.tsx` + `ListaConfermati.tsx` per lo stesso identico bisogno (dati risolti server-side, interattività di ordinamento client-side).

## Verification

**Commands:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`

**Manual checks (obbligatorio, da demandare all'utente dopo il deploy — dev locale rotto):** aprire `/app/admin`, verificare la vista Ruoli collassata e il pulsante Modifica; verificare che Disattiva/Riattiva e Reimposta password siano allineati sotto "Funzioni"; verificare l'ordinamento per Ruolo e per Stato con Utenti che hanno più Ruoli; verificare che un errore di salvataggio Ruoli non ricompaia riaprendo "Modifica" dopo "Annulla" (review fix).

## Suggested Review Order

**Toggle sola-lettura/modifica Ruoli — flusso principale**

- Stato locale + gestione della visibilità dell'errore (adattata all'assenza di un sentinel di successo in `aggiornaRuoliUtente`, review fix incluso).
  [`UtenteRow.tsx:36`](<../../app/app/(amministrazione)/admin/UtenteRow.tsx#L36>)

**Ordinamento — nuovo Client Component**

- `ElencoUtenti`: stato del criterio, `useMemo`, 2 pulsanti `aria-pressed`.
  [`ElencoUtenti.tsx:27`](<../../app/app/(amministrazione)/admin/ElencoUtenti.tsx#L27>)

- Funzioni pure di ordinamento (priorità Ruolo da `RUOLI_VALIDI`, review fix sulla costruzione dell'indice).
  [`ordina-utenti-per-ruolo-stato.ts:12`](<../../lib/ordina-utenti-per-ruolo-stato.ts#L12>)

**Peripherals**

- Copertura test delle 2 funzioni pure.
  [`ordina-utenti-per-ruolo-stato.test.ts:8`](<../../lib/ordina-utenti-per-ruolo-stato.test.ts#L8>)
