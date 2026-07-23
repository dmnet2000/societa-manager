---
baseline_commit: 4572f6f8c8fa1299d2e254dc2ebaf6e9b2af5f44
---

# Story 6.3: Wizard nuova stagione

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente,
I want un wizard che copi/adatti Gruppi e assegnazioni Allenatori dall'Anno Agonistico precedente,
so that non ricostruisco tutto da zero a ogni 1° agosto.

## Acceptance Criteria

1. **Given** un Anno Agonistico precedente esiste con Gruppi e assegnazioni Allenatori (Epic 2), **when** un Admin/Dirigente apre `/wizard-nuova-stagione` e la stagione corrente non ha ancora nessun Gruppo, **then** vede un'anteprima di sola lettura che elenca i Gruppi (nome, categoria) e gli Allenatori assegnati che verranno copiati.
2. **Given** l'anteprima è mostrata, **when** l'Admin/Dirigente conferma, **then** per ciascun Gruppo dell'anno precedente viene creato un nuovo Gruppo omonimo (stesso nome, stessa categoria) nella stagione corrente, con le stesse assegnazioni Allenatore (l'Allenatore esistente viene ricollegato al nuovo Gruppo, non ricreato).
3. **Given** la stagione corrente ha **già** almeno un Gruppo (wizard già eseguito in precedenza, o Gruppi creati manualmente da `/gruppi`), **when** si apre `/wizard-nuova-stagione`, **then** il wizard rifiuta di procedere con un messaggio esplicito — nessuna anteprima, nessuna creazione, nessuna logica di merge/duplicazione.
4. **Given** non esiste nessun Anno Agonistico precedente (primo utilizzo assoluto dell'app), **when** si apre `/wizard-nuova-stagione`, **then** è mostrato un messaggio esplicito ("Nessuna stagione precedente trovata"), nessuna anteprima.
5. **Given** un Gruppo dell'anno precedente non ha nessun Allenatore assegnato, **when** viene copiato, **then** il nuovo Gruppo viene comunque creato senza assegnazioni — l'assegnazione di un Allenatore resta un passaggio successivo opzionale, già gestito da `/gruppi` (Story 2.3).
6. **Given** un Utente con Ruolo diverso da Admin/Dirigente, **when** tenta di aprire `/wizard-nuova-stagione`, **then** viene rifiutato dal Proxy (redirect a `/non-autorizzato`).

## Decisioni prese in fase di creazione di questa storia (elicitazione con l'utente)

L'AC originale in `epics.md` ("il sistema propone una bozza... che posso correggere prima di confermare") è astratto (`ARCHITECTURE-SPINE.md`: "dettaglio di cosa viene copiato/adattato dall'anno precedente non ancora deciso"). Due punti sono stati chiariti esplicitamente con l'utente prima di scrivere questa storia — **non riaprirli in fase di sviluppo**:

1. **"Correggere" = copia diretta, poi modifica con `/gruppi` già esistente — nessuna UI di editing pre-conferma.** Il wizard mostra un'anteprima di **sola lettura** (elenco Gruppi/Allenatori che verranno copiati) con un unico pulsante "Conferma" che crea tutto in un colpo. Non esiste alcuna checkbox per includere/escludere singoli Gruppi/assegnazioni, né campi editabili inline prima del salvataggio. Le correzioni post-copia (rinominare un Gruppo, cambiare/aggiungere/rimuovere un'assegnazione Allenatore) si fanno **dopo**, con la pagina `/gruppi` già esistente (Story 2.2/2.3) — riuso al 100%, zero UI di editing nuova da costruire.
2. **Se la stagione corrente ha già almeno un Gruppo, il wizard si rifiuta di procedere (AC #3)** — nessuna logica di confronto/merge per nome+categoria, nessun uso incrementale/ripetuto. Il wizard è pensato per il primo bootstrap della stagione, non per un allineamento continuo.
3. **Route/modulo**: questa storia vive in `app/(gruppi-allenatori)/`, non in un nuovo `app/(rollover-stagionale)/` (che `ARCHITECTURE-SPINE.md` menzionava come modulo di riferimento, ma che **non è mai stato creato** — FR-22/23, originariamente mappate lì, sono finite in `(onboarding-import)/import-atlete/` nelle Story 1.7/1.8, una divergenza già accettata in questo progetto). Questa scelta rispetta **AD-2** alla lettera: "Gruppi-Allenatori possiede la creazione del Gruppo e l'assegnazione degli Allenatori" — un modulo diverso che scrivesse direttamente su `Gruppo`/`GruppoAllenatore` violerebbe quella regola di ownership. Non è una decisione da riaprire con l'utente (è una conseguenza diretta di un vincolo architetturale già scritto), ma è documentata qui per evitare che un futuro sviluppatore la interpreti come un errore rispetto al Capability Map.

## Tasks / Subtasks

- [x] Task 1: `app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx` (nuovo) (AC: #1, #3, #4, #5)
  - [x] Risolvi l'intervallo della stagione corrente con `calcolaIntervalloStagioneCorrente(new Date())` (sola lettura, **mai** `risolviAnnoAgonisticoCorrente` in una pagina GET — Dev Notes Story 1.6/2.2, stesso principio).
  - [x] `annoCorrente = await trovaAnnoAgonisticoCorrente()` — può essere `null` se la stagione non è mai stata "toccata" da nessuna scrittura finora (nessun Gruppo, nessuna Iscrizione): trattalo come "zero Gruppi", non come errore.
  - [x] AC #3: se `annoCorrente` esiste, conta i `Gruppo` con quel `annoAgonisticoId` (Prisma diretto, AD-9). Se `> 0` → messaggio esplicito di blocco, **nessuna** query ulteriore (niente anteprima calcolata inutilmente).
  - [x] `annoPrecedente = await trovaAnnoAgonisticoPrecedente({ dataInizio: intervalloCorrente.dataInizio })` (riusa la funzione di Story 1.8 **identica**, nessuna nuova funzione — restituisce `null` se non esiste nessuna stagione precedente).
  - [x] AC #4: se `annoPrecedente` è `null` → messaggio esplicito "Nessuna stagione precedente trovata", nessuna anteprima.
  - [x] Altrimenti: carica i Gruppi di `annoPrecedente` con le loro assegnazioni Allenatore in una sola query (`prisma.gruppo.findMany({ where: { annoAgonisticoId: annoPrecedente.id }, include: { allenatori: { include: { allenatore: true } } } })` — Gruppo/GruppoAllenatore/Allenatore **non** sono protetti da RLS, AD-9, `include` Prisma diretto è corretto qui a differenza di Atleta/Presenza/CertificatoMedico), mostra l'anteprima di sola lettura (AC #1) + un form con un solo pulsante "Conferma" che invoca la Server Action del Task 2.
- [x] Task 2: `app/(gruppi-allenatori)/wizard-nuova-stagione/actions.ts` (nuovo) (AC: #2, #3)
  - [x] `confermaWizardNuovaStagione` — Server Action, `requireRuolo(["ADMIN", "DIRIGENTE"])` (stesso pattern di `creaGruppo`/`assegnaAllenatore`, `app/(gruppi-allenatori)/gruppi/actions.ts`).
  - [x] Ricalcola `annoCorrente` con `risolviAnnoAgonisticoCorrente()` (find-or-create, **solo** nel percorso di scrittura — stesso principio già stabilito per `creaGruppo`), poi **ri-verifica** che non abbia già Gruppi (stessa condizione dell'AC #3, ma qui a scopo difensivo contro una race/doppio-click tra il caricamento della pagina e la conferma — non fidarsi solo del controllo già fatto in `page.tsx`) — se ne ha già, errore `{ code: "VALIDATION", message: "Questa stagione ha già dei Gruppi." }`, nessuna scrittura.
  - [x] Ricalcola `annoPrecedente` con la stessa logica del Task 1 (stesso `calcolaIntervalloStagioneCorrente` + `trovaAnnoAgonisticoPrecedente`) — se `null`, errore, nessuna scrittura.
  - [x] Per ciascun Gruppo di `annoPrecedente` (con le sue `allenatori`): crea un nuovo `Gruppo` (`nome`, `categoria`, `annoAgonisticoId` = quello corrente) e, per ciascuna assegnazione Allenatore esistente, una riga `GruppoAllenatore` collegata al **nuovo** Gruppo (stesso `allenatoreId`, l'Allenatore non viene ricreato). **Tutto dentro un unico `prisma.$transaction`** (stesso pattern di `salvaGruppiVisibiliDirigente`, Story 5.2) — se una scrittura fallisce a metà, nessuna copia parziale resta a metà stagione.
  - [x] AC #5: un Gruppo senza assegnazioni Allenatore viene comunque creato (il suo array `allenatori` è semplicemente vuoto, nessun caso speciale da gestire).
  - [x] `revalidatePath("/gruppi")` (i nuovi Gruppi diventano visibili lì) e `revalidatePath("/wizard-nuova-stagione")` (la pagina ora mostrerà il blocco dell'AC #3 se riaperta).
- [x] Task 3: Route guard (AC: #6)
  - [x] `lib/auth/route-guard.ts`: aggiungi `{ prefix: "/wizard-nuova-stagione", ruoliAmmessi: ["ADMIN", "DIRIGENTE"] }` a `PROTECTED_ROUTES`.
  - [x] Test in `route-guard.test.ts`: consenti Admin e Dirigente, rifiuta ogni altro Ruolo verso `/non-autorizzato`.
- [x] Task 4: Test (Vitest)
  - [x] Nessuna funzione pura nuova introdotta da questa storia (nessuna logica derivata testabile in isolamento — il reshaping Prisma `include` → anteprima è banale mappatura, non calcolo, stesso principio già applicato a `page.tsx` di `/gruppi`/`/dati-fisici`, mai testato oltre il route guard). Solo il test del route guard sopra.
- [x] Task 5: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] Setup: Docker + Supabase CLI locale + dev server. Crea un Anno Agonistico precedente con 2 Gruppi (uno con 1 Allenatore assegnato, uno senza nessun Allenatore), un Utente Admin (o Dirigente).
  - [x] AC #1: apri `/wizard-nuova-stagione` con la stagione corrente ancora senza Gruppi; verifica che l'anteprima elenchi correttamente i 2 Gruppi con nome/categoria/Allenatore (o "nessun Allenatore" per il secondo).
  - [x] AC #2/#5: conferma; verifica (query diretta sul DB) che nella stagione corrente esistano ora 2 nuovi Gruppi omonimi, il primo con la stessa assegnazione Allenatore, il secondo senza assegnazioni.
  - [x] AC #3: riapri `/wizard-nuova-stagione` dopo la conferma; verifica il messaggio di blocco esplicito, nessuna nuova copia.
  - [x] AC #4: verificato per ispezione di codice + copertura test unitaria preesistente di `trovaAnnoAgonisticoPrecedente` (Story 1.8) — non riproducibile con una nuova run isolata in questa sessione senza rimuovere righe `Gruppo` ancora referenziate dai dati appena verificati per AC #2/#3 (vincolo FK `RESTRICT` su `AnnoAgonistico`).
  - [x] AC #6: un Utente con Ruolo Allenatore che tenta `/wizard-nuova-stagione` → redirect a `/non-autorizzato`, verificato.
  - [x] Dati e Utenti di test rimossi a fine sessione, stato del DB locale ripristinato a com'era prima della verifica.

### Review Findings

- [x] [Review][Patch] Il messaggio di successo dopo la conferma non è mai visibile — Next.js ri-renderizza subito la stessa rotta e il ramo di blocco (AC #3) sostituisce anteprima/form prima che l'utente veda conferma [app/(gruppi-allenatori)/wizard-nuova-stagione/ConfermaWizardForm.tsx, actions.ts] — risolto con un `redirect("/gruppi")` sul successo (i Gruppi appena copiati sono visibili lì, conferma più solida di un banner transitorio); verificato dal vivo
- [x] [Review][Patch] Se la stagione precedente esiste ma non ha nessun Gruppo, la pagina mostra un elenco vuoto con il pulsante "Conferma" comunque attivo, invece di un messaggio esplicito — il click produce un errore scollegato solo dopo il submit [app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx] — risolto con un controllo esplicito `gruppiPrecedenti.length === 0` prima di renderizzare form/anteprima
- [x] [Review][Patch] `prisma.gruppo.count`/`trovaAnnoAgonisticoPrecedente`/`prisma.gruppo.findMany` non sono avvolti in try/catch in `confermaWizardNuovaStagione` — un errore DB transitorio propaga come eccezione non gestita invece del contratto tipizzato `{ error }` usato dal resto dell'azione [app/(gruppi-allenatori)/wizard-nuova-stagione/actions.ts] — risolto ampliando il blocco try/catch esistente
- [x] [Review][Patch] Il messaggio di blocco (AC #3) non ha un link a `/gruppi` — costa poco e riduce l'attrito per un flusso una-tantum [app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx] — risolto aggiungendo un `<Link href="/gruppi">`; verificato dal vivo
- [x] [Review][Defer] Il controllo "la stagione ha già Gruppi" è un check-then-insert senza vincolo unico a livello DB — due submit concorrenti (doppio click, due tab) potrebbero entrambi superare il controllo e copiare due volte [app/(gruppi-allenatori)/wizard-nuova-stagione/actions.ts] — deferred, stessa classe di race a bassa probabilità già accettata più volte in questo progetto (Story 1.3/1.4/1.5, singolo Admin/Dirigente attivo)
- [x] [Review][Defer] `page.tsx` e `confermaWizardNuovaStagione` calcolano l'intervallo di stagione indipendentemente — se il confine del 1° agosto viene attraversato tra il caricamento della pagina e il click su "Conferma", ciò che viene copiato potrebbe differire silenziosamente dall'anteprima mostrata [app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx, actions.ts] — deferred, finestra temporale estremamente stretta (esattamente la mezzanotte UTC del 1° agosto), stessa classe di race a bassa probabilità già accettata altrove in questo progetto
- [x] [Review][Defer] Nessuna funzionalità per rinominare/eliminare un Gruppo esiste in nessuna pagina dell'app (`/gruppi` mostra `nome`/`categoria` come testo statico, non editabile) — un Gruppo copiato con una `categoria` non più corretta (es. una fascia d'età che cambia da una stagione all'altra) non ha alcun percorso di correzione, nemmeno tramite "modifica dopo con /gruppi" come previsto dalla decisione presa in fase di creazione di questa storia [app/(gruppi-allenatori)/gruppi/GruppoRow.tsx] — deferred, gap preesistente da Story 2.2 (non introdotto da questa storia), diventa solo più visibile perché il wizard crea più Gruppi automaticamente

## Dev Notes

- **Nessuna migrazione, nessun nuovo model Prisma** — questa storia scrive solo righe `Gruppo`/`GruppoAllenatore` già esistenti (Story 2.2/2.3), con gli Server Action già stabiliti come riferimento diretto (`creaGruppo`, `assegnaAllenatore`).
- **Riuso identico di `trovaAnnoAgonisticoPrecedente`** (Story 1.8, `lib/anno-agonistico/trova-anno-agonistico-precedente.ts`) e `calcolaIntervalloStagioneCorrente`/`trovaAnnoAgonisticoCorrente`/`risolviAnnoAgonisticoCorrente` (già esistenti) — nessuna nuova funzione nel modulo `lib/anno-agonistico/`.
- **Mai `risolviAnnoAgonisticoCorrente` in `page.tsx`** (un GET non deve creare la stagione come effetto collaterale, Dev Notes Story 1.6/2.2) — solo `confermaWizardNuovaStagione` (Server Action) la richiama.
- **Nessuna copia di `GruppoAtleta`** (assegnazioni Atleta-Gruppo) — l'AC parla esplicitamente solo di "Gruppi e assegnazioni Allenatori"; il roster Atlete di una nuova stagione dipende dalle Iscrizioni confermate (Story 1.6) e dal riporto Under-13 (Story 1.8), un processo distinto e già esistente che questa storia non tocca.
- **Blocco totale se la stagione ha già Gruppi (AC #3), nessuna logica di merge** — decisione esplicita dell'utente, vedi sopra. Ri-verificato sia in `page.tsx` (lettura) sia in `confermaWizardNuovaStagione` (scrittura, difesa contro race/doppio-click).
- **`$transaction` per l'intera copia** — coerente con `salvaGruppiVisibiliDirigente` (Story 5.2): un fallimento a metà non deve lasciare una stagione con solo alcuni Gruppi copiati.

### Project Structure Notes

- Nuovi file: `app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx`, `app/(gruppi-allenatori)/wizard-nuova-stagione/actions.ts`.
- File modificato: `lib/auth/route-guard.ts` (+ `.test.ts`).
- Nessuna migrazione, nessuna modifica a `prisma/schema.prisma`.
- Route scelta deliberatamente in `(gruppi-allenatori)`, non in un nuovo `(rollover-stagionale)` — vedi Decisioni sopra (rispetto di AD-2, ownership del modulo).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.3: Wizard nuova stagione] — user story e AC originale (astratto, espanso sopra).
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-28] — "wizard che copi/adatti Gruppi e assegnazioni Allenatori dall'Anno Agonistico precedente" (Could, "utile dal secondo rollover in poi").
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md] — AD-2 ("Gruppi-Allenatori possiede la creazione del Gruppo e l'assegnazione degli Allenatori"); nota "Wizard Nuova Stagione (FR-28, Could) — dettaglio... non ancora deciso".
- [Source: app/(gruppi-allenatori)/gruppi/actions.ts] — `creaGruppo`/`assegnaAllenatore`: pattern Server Action da replicare (requireRuolo, nessuna RLS, `$transaction` di riferimento in Story 5.2 per operazioni multi-riga).
- [Source: lib/anno-agonistico/trova-anno-agonistico-precedente.ts] — `trovaAnnoAgonisticoPrecedente` (Story 1.8), riusata identica.
- [Source: lib/anno-agonistico/calcola-intervallo-stagione-corrente.ts, risolvi-anno-agonistico-corrente.ts] — `calcolaIntervalloStagioneCorrente`/`trovaAnnoAgonisticoCorrente`/`risolviAnnoAgonisticoCorrente`, tutte già esistenti, nessuna nuova funzione.
- [Source: prisma/schema.prisma] — `Gruppo`, `GruppoAllenatore` (`@@unique([gruppoId, allenatoreId])`), `AnnoAgonistico` — nessuna modifica.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- Verifica dal vivo: il messaggio di successo di `ConfermaWizardForm` non è mai visibile in pratica — Next.js ri-esegue il Server Component della stessa rotta subito dopo il Server Action e, poiché i Gruppi ora esistono, il ramo "bloccato" di `page.tsx` prende immediatamente il posto dell'anteprima/form (smontando il componente client che teneva lo stato di successo). Non bloccante per nessun AC (AC #2 riguarda la creazione dei dati, verificata via query diretta e via il blocco alla riapertura, AC #3) — segnalato per code review come possibile finding.
- Seed temporaneo (`tmp-seed-6-3.mjs`, cancellato a fine sessione) con Anno Agonistico precedente + 2 Gruppi (uno con Allenatore, uno senza) + Admin + Allenatore; script Playwright temporaneo (`tmp-verify-6-3.mjs`, cancellato) + una query diretta sul DB per AC #2/#5. Dati rimossi a fine verifica, incluso l'Anno Agonistico corrente creato da `risolviAnnoAgonisticoCorrente` durante la conferma.

### Completion Notes List

- 5/6 AC verificati dal vivo end-to-end (AC #1, #2, #3, #5, #6); AC #4 verificato per ispezione di codice + test unitario preesistente di `trovaAnnoAgonisticoPrecedente` (vincolo pratico: impossibile isolare uno scenario "nessuna stagione precedente" senza rimuovere righe `Gruppo` ancora in uso dal resto della verifica, bloccate da FK `RESTRICT`).
- Code review: 4 patch applicate e verificate dal vivo — redirect a `/gruppi` sul successo (il banner di successo non era mai visibile in pratica), messaggio esplicito se la stagione precedente non ha Gruppi, try/catch ampliato su tutte le letture in `confermaWizardNuovaStagione`, link a `/gruppi` nel messaggio di blocco. 3 findings deferred (race check-then-insert a bassa probabilità, race sul confine di stagione, nessuna funzionalità di rename/delete Gruppo preesistente da Story 2.2).
- Nessuna migrazione, nessun nuovo model — solo Server Action + pagina sopra `Gruppo`/`GruppoAllenatore` già esistenti (Story 2.2/2.3), riuso identico di `trovaAnnoAgonisticoPrecedente` (Story 1.8).
- Route `/wizard-nuova-stagione` in `app/(gruppi-allenatori)/`, non nel mai-creato `(rollover-stagionale)`, per rispetto di AD-2 (come deciso in fase di creazione della storia).
- Suite Vitest completa: 463/463 test passati. `npx tsc --noEmit` pulito.

### File List

- `app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx` (nuovo)
- `app/(gruppi-allenatori)/wizard-nuova-stagione/actions.ts` (nuovo)
- `app/(gruppi-allenatori)/wizard-nuova-stagione/ConfermaWizardForm.tsx` (nuovo)
- `lib/auth/route-guard.ts` (modificato: prefisso `/wizard-nuova-stagione`)
- `lib/auth/route-guard.test.ts` (modificato: test Admin/Dirigente ammessi, altri Ruoli rifiutati)
