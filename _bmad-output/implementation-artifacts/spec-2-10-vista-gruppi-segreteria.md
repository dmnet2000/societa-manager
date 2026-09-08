---
title: 'Story 2.10: Vista Gruppi in sola lettura per Segreteria'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'ab9cf7f020d8a58196dd2d4922b2f5322bb49906'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Segreteria non ha alcuna pagina per vedere quali Atlete sono assegnate a quale Gruppo - `/app/gruppi` esiste ma è riservata ad Admin/Dirigente (creazione/modifica Gruppi, assegnazione Allenatori/Atlete, foto squadra).

**Approach:** estendere `/app/gruppi` anche a Segreteria, ma in sola lettura - stessa rotta/voce di menu, un ramo di rendering separato (nome Gruppo, categoria, elenco Atlete) senza alcuna delle azioni di gestione esistenti, mai riusando `GruppoRow.tsx` (fortemente accoppiato a modifica/creazione, fuori scope toccarlo).

## Boundaries & Constraints

**Always:** `ruoliAmmessi` di `/app/gruppi` (route-guard.ts) esteso a includere `SEGRETERIA`. In `GruppiPage`, un Utente con SOLO il Ruolo Segreteria (nessun Admin/Dirigente) vede un ramo di rendering nuovo e distinto: niente `<NuovoGruppoForm>`, niente `GruppoRow` (che espone modifica/creazione/foto) - solo una tabella Nome Gruppo/Categoria/Atlete (nomi, sola lettura). Un Utente con Admin/Dirigente (anche se ha anche Segreteria) vede la pagina attuale invariata - stessa precedenza già stabilita altrove nel progetto quando un Utente cumula più Ruoli con capacità diverse sulla stessa rotta. Stessi dati già letti da `GruppiPage` (gruppi/atlete/gruppoAtleteRows) riusati per il nuovo ramo - nessuna query duplicata.

**Ask First:** nessuna prevista.

**Never:** nessuna azione di scrittura raggiungibile da Segreteria su questa pagina (nessun form, nessun pulsante) - se una Server Action esistente (`aggiornaGruppoAction` ecc.) venisse comunque invocata con un `id` valido da un Utente Segreteria, il controllo `requireRuolo` server-side esistente la rifiuta già (invariato, nessuna modifica alle Server Action). Nessuna modifica a `GruppoRow.tsx`/`NuovoGruppoForm.tsx` né alle Server Action di gestione Gruppi. Nessuna informazione aggiuntiva oltre a nome Gruppo/categoria/elenco Atlete (niente certificati/iscrizioni/tesseramenti/foto in questo ramo - quei dati vivono già nelle pagine dedicate di Segreteria).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Utente con solo Ruolo Segreteria | apre `/app/gruppi` | Vede l'elenco Gruppi in sola lettura (nome, categoria, Atlete), nessuna azione | N/A |
| Utente con Ruolo Admin o Dirigente (anche insieme a Segreteria) | apre `/app/gruppi` | Vede la pagina di gestione attuale, invariata | N/A |
| Gruppo senza Atlete assegnate | 0 righe GruppoAtleta per quel Gruppo | Riga Gruppo mostrata comunque, elenco Atlete vuoto/trattino | N/A |

</frozen-after-approval>

## Code Map

- `lib/auth/route-guard.ts` -- `ruoliAmmessi` di `/app/gruppi` (riga ~205) esteso da `["ADMIN", "DIRIGENTE"]` a `["ADMIN", "DIRIGENTE", "SEGRETERIA"]`.
- `app/app/(gruppi-allenatori)/gruppi/page.tsx` -- calcolare `soloVisualizzazione = ruoli.includes("SEGRETERIA") && !ruoli.includes("ADMIN") && !ruoli.includes("DIRIGENTE")` (mirror del pattern già in uso in `conferma-iscrizioni/page.tsx` per `puoConfermare`); quando vero, saltare la risoluzione delle letture non necessarie al ramo sola-lettura (certificati/iscrizioni/tesseramenti/foto, allenatori) e renderizzare una tabella semplice invece di `NuovoGruppoForm`/`GruppoRow`.
- `lib/guida/contenuti.ts` -- estendere `ruoliAmmessi` e il corpo della guida per `/app/gruppi` per includere Segreteria e descrivere il ramo di sola lettura.

## Tasks & Acceptance

**Execution:**
- [x] `lib/auth/route-guard.ts` -- estendere `ruoliAmmessi` di `/app/gruppi`
- [x] `app/app/(gruppi-allenatori)/gruppi/page.tsx` -- ramo di rendering in sola lettura per Segreteria
- [x] `lib/guida/contenuti.ts` -- aggiornamento guida
- [x] `lib/auth/voci-navigazione.test.ts` (non previsto nel Code Map iniziale, necessario) -- nuova voce di menu diretta per Segreteria
- [x] `lib/auth/route-decision.test.ts` (review fix, Verification Gap Reviewer) -- test mancante sul varco di autorizzazione per Segreteria+/app/gruppi

**Acceptance Criteria:**
- Given un Utente con solo Ruolo Segreteria, when apre `/app/gruppi`, then vede Gruppo/Categoria/elenco Atlete per ciascun Gruppo, senza alcun modulo di creazione/modifica
- Given un Utente con Ruolo Admin o Dirigente, when apre `/app/gruppi`, then la pagina resta quella di gestione attuale, nessuna regressione
- Given un Gruppo senza Atlete assegnate, when Segreteria visualizza la pagina, then quel Gruppo compare comunque con l'elenco vuoto

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npx vitest run` -- expected: tutti verdi

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire `/app/gruppi` con un Utente solo Segreteria: verificare il ramo di sola lettura.
- Aprire `/app/gruppi` con un Utente Admin: verificare che la pagina di gestione sia invariata.
- Verificare una stagione senza alcun Gruppo: il ramo di sola lettura deve mostrare il messaggio esplicito, non una tabella vuota.

## Suggested Review Order

**Il cuore della story: ramo di sola lettura**

- Ruoli risolti direttamente (review fix, Blind Hunter - vedi sotto) e branching `soloVisualizzazione`.
  [`page.tsx:34`](../../app/app/(gruppi-allenatori)/gruppi/page.tsx#L34)

- Review fix critico (Blind Hunter): `ruoli` calcolato in origine tramite `risolviRuoliPerAiutoContestuale()`, una funzione esplicitamente documentata come fail-soft "puramente cosmetica" - un errore di sessione transitorio l'avrebbe fatta tornare `[]`, facendo cadere `soloVisualizzazione` a `false` e mostrando la vista di gestione completa (form di creazione/modifica) a un Utente Segreteria. Sostituita con una lettura diretta non fail-soft, mirror letterale di `conferma-iscrizioni/page.tsx`.
  [`page.tsx:40`](../../app/app/(gruppi-allenatori)/gruppi/page.tsx#L40)

- Ramo di rendering in sola lettura, incluso il messaggio esplicito per l'elenco vuoto (trovato indipendentemente da Blind Hunter ed Edge Case Hunter).
  [`page.tsx:170`](../../app/app/(gruppi-allenatori)/gruppi/page.tsx#L170)

**Estensione del perimetro di autorizzazione**

- `ruoliAmmessi` esteso a Segreteria.
  [`route-guard.ts:205`](../../lib/auth/route-guard.ts#L205)

- Review fix (Verification Gap Reviewer): mancava il test sul vero varco di autorizzazione (`getRouteDecision`, usato da `middleware.ts`) per questa combinazione - il test sulla voce di menu non lo copre, sono funzioni diverse.
  [`route-decision.test.ts:336`](../../lib/auth/route-decision.test.ts#L336)
