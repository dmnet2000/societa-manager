---
title: 'Story 1.10: Admin associa una seconda Atleta a un Genitore già registrato'
type: 'feature'
created: '2026-09-15'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '1c6ac5e0c4310e47326f8649de268fb8589922e3'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** l'aggancio Genitore↔Atleta (Story 1.5) avviene SOLO in fase di registrazione, con un unico campo Codice Fiscale - un Genitore con più figlie/i resta agganciato a una sola. Nessuna via, ne' self-service ne' Admin, per aggiungerne una seconda dopo la registrazione. Segnalato dall'utente: un Genitore con due figlie ne vede una sola nel gestionale.

**Approach:** prima estensione minima (self-service rimandato): lato Admin, nella pagina esistente `/app/admin` (elenco Utenti), un Genitore già registrato guadagna la possibilità di collegare un'Atleta aggiuntiva inserendo il suo Codice Fiscale - stessa validazione/lookup già usata in registrazione (Story 1.5, `isCodiceFiscaleValido`/`trovaPerCodiceFiscale`), stesso `GenitoreAtleta.create` (relazione molti-a-molti già esistente, nessuna migrazione). Le Atlete già collegate vengono mostrate per dare contesto prima di aggiungerne un'altra.

## Boundaries & Constraints

**Always:**
- Il modello dati non cambia: `GenitoreAtleta` è già una relazione molti-a-molti (`@@unique([utenteId, atletaId])`, Story 1.5) - questa story usa `prisma.genitoreAtleta.create` tale e quale, nessuna nuova migrazione.
- Il form/azione di aggiunta compare SOLO per un Utente con Ruolo `GENITORE` tra i suoi Ruoli - stesso principio del rendering condizionale già in `UtenteRow.tsx` (form "Correggi email", mostrato solo se rilevante per quella riga).
- Stessa disciplina AD-9 già documentata nel file (`app/app/(gruppi-allenatori)/gruppi/actions.ts`): `Atleta` è protetta da RLS - il nome delle Atlete già collegate va risolto via client Supabase (service-role, `createAdminClient()`, già importato in `admin/page.tsx` per `listUsers()`), MAI un `include` Prisma diretto su `Atleta`.
- Il lookup per Codice Fiscale riusa `trovaPerCodiceFiscale`/`isCodiceFiscaleValido` (`lib/matching-codice-fiscale/`) tale e quale - stessi identici messaggi di errore della registrazione (Story 1.5) per coerenza: CF non valido, nessuna Atleta trovata.
- Un tentativo di ricollegare un'Atleta già collegata allo stesso Genitore (viola `@@unique`) restituisce un errore esplicito ("Questa Atleta è già collegata a questo Genitore."), mai un errore generico ne' un falso successo silenzioso.
- Server Action riservata `requireRuolo("ADMIN")`, stesso perimetro di ogni altra azione in `admin/actions.ts`.

**Ask First:** nessuna - le due decisioni aperte (dove nella UI, se prevedere anche la rimozione di un aggancio) sono chiuse qui sotto: aggiunta come nuova colonna nella tabella Utenti esistente; nessuna rimozione in questa story (fuori scope, "associare" è la richiesta letterale - una story dedicata se servirà rimuovere un aggancio errato).

**Never:** nessuna modifica al flusso di registrazione (Story 1.5, invariato). Nessuna capacità di rimozione di un aggancio esistente in questa story. Nessuna nuova policy RLS (il join `GenitoreAtleta` non è protetto da RLS, stesso principio già documentato per `GruppoAtleta`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin collega una seconda Atleta a un Genitore | CF valido, Atleta esistente, non già collegata a questo Genitore | Nuova riga `GenitoreAtleta`, Atleta compare subito nell'elenco "collegate" | N/A |
| CF non corrisponde a nessuna Atleta | CF formalmente valido ma inesistente | Messaggio esplicito, nessun aggancio creato | `VALIDATION` |
| CF malformato | Non 16 caratteri alfanumerici | Messaggio esplicito, stesso testo della registrazione | `VALIDATION` |
| Atleta già collegata a QUESTO Genitore | CF di un'Atleta già presente nel suo elenco | Errore esplicito "già collegata", nessun duplicato | `VALIDATION` |
| Stessa Atleta collegata a un ALTRO Genitore | CF di un'Atleta già collegata a un Genitore diverso | Consentito (molti-a-molti già esistente, es. genitori separati) | N/A |
| Utente senza Ruolo GENITORE | Riga di un Allenatore/Segreteria/ecc. | Nessun form di aggancio mostrato per quella riga | N/A |

</frozen-after-approval>

## Code Map

- `lib/db-rls/atleta.ts` -- nuova `elencaAtletePerIds(supabase, ids: string[])`: risolve `{id, nome}` per un elenco di id via client Supabase (mirror di `elencaAtlete`, nessun nuovo campo esposto oltre al nome).
- `app/app/(amministrazione)/admin/page.tsx` -- per ogni Utente con Ruolo GENITORE, legge `genitoriAtlete` (Prisma, solo `atletaId`, nessun include su Atleta) e risolve i nomi via `elencaAtletePerIds` con `createAdminClient()` (già importato/usato per `listUsers()`); passa l'elenco `{id, nome}[]` a `ElencoUtenti`/`UtenteRow`.
- `app/app/(amministrazione)/admin/actions.ts` -- nuova `aggiungiAtletaGenitoreAction(prevState, formData)`: `requireRuolo("ADMIN")`, valida `utenteId`+`codiceFiscale`, `trovaPerCodiceFiscale(createAdminClient(), cf)`, `prisma.genitoreAtleta.create`, cattura P2002 (unique) come errore "già collegata" esplicito, `revalidatePath("/app/admin")`.
- `app/app/(amministrazione)/admin/UtenteRow.tsx` -- nuova cella/sezione (visibile solo se `ruoli.includes("GENITORE")`): elenco Atlete già collegate (nomi) + form compatto Codice Fiscale + bottone "Collega", mirror stilistico del form "Correggi email" già presente nella stessa riga.
- `app/app/(amministrazione)/admin/ElencoUtenti.tsx` -- nuova colonna header "Figli collegati" nella tabella.

## Tasks & Acceptance

**Execution:**
- [ ] `lib/db-rls/atleta.ts` -- `elencaAtletePerIds` + test
- [ ] `admin/page.tsx` -- risoluzione Atlete collegate per ogni Genitore, passate come prop
- [ ] `admin/actions.ts` -- `aggiungiAtletaGenitoreAction` + test (CF valido/non valido/non trovato/già collegata/successo)
- [ ] `UtenteRow.tsx` -- cella "Figli collegati" condizionale + form di aggiunta
- [ ] `ElencoUtenti.tsx` -- colonna header aggiornata

**Acceptance Criteria:**
- Given un Genitore già collegato a un'Atleta, when l'Admin inserisce il Codice Fiscale di una seconda Atleta esistente e conferma, then il Genitore risulta collegato a entrambe
- Given un Codice Fiscale che non corrisponde a nessuna Atleta, when l'Admin lo inserisce, then vede un messaggio esplicito e nessun aggancio viene creato
- Given un'Atleta già collegata a quel Genitore, when l'Admin inserisce di nuovo il suo Codice Fiscale, then vede un errore esplicito "già collegata", nessun duplicato
- Given un Utente senza Ruolo GENITORE, when l'Admin apre `/app/admin`, then non vede alcun form di aggancio per quella riga

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti verdi, inclusi i nuovi test
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Collegare una seconda Atleta a un Genitore di test e verificare che compaia nell'elenco "Figli collegati" e che il Genitore la veda nel proprio profilo/storico presenze.
- Verificare che un Genitore senza Ruolo GENITORE (es. rimosso via checkbox Ruoli) non mostri più il form.

## Suggested Review Order

**Server Action (scrittura, il cuore della story)**

- Entry point: validazione, verifica esistenza+ruolo del target (review fix), lookup CF, creazione del collegamento, gestione esplicita del duplicato.
  [`actions.ts:547`](../../app/app/(amministrazione)/admin/actions.ts#L547)

**Lettura (mostrare i figli già collegati)**

- Nuovo helper RLS-safe: risolve nome per id senza mai includere `Atleta` via Prisma diretto (AD-9).
  [`atleta.ts:133`](../../lib/db-rls/atleta.ts#L133)

- Wiring in pagina: include `genitoriAtlete` (solo `atletaId`), risoluzione batch dei nomi, fail-soft su errore (review fix).
  [`page.tsx:66`](../../app/app/(amministrazione)/admin/page.tsx#L66)

**UI**

- Cella condizionale (solo Ruolo GENITORE), form di aggiunta con reset automatico dopo successo (review fix) e placeholder per le altre righe (review fix).
  [`UtenteRow.tsx:322`](../../app/app/(amministrazione)/admin/UtenteRow.tsx#L322)

**Test**

- Copertura completa: autorizzazione, validazione, duplicato stesso Genitore (rifiutato) vs Genitore diverso (consentito, review fix), Utente non trovato/non Genitore (review fix).
  [`actions.test.ts:1054`](../../app/app/(amministrazione)/admin/actions.test.ts#L1054)
