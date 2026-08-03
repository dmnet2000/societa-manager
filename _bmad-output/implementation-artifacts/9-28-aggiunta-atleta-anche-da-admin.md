---
baseline_commit: f40691ba7cb7d04c2544d969df33b52f3cda857d
---

# Story 9.28: Aggiunta di un nuovo Atleta anche da parte di Admin/Dirigente in /gruppi

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente sulla pagina `/gruppi`,
I want poter creare una nuova Atleta non ancora in anagrafica e assegnarla contestualmente a un Gruppo, esattamente come già può fare un Allenatore su `/i-miei-gruppi`,
so that non devo passare dall'Onboarding-Import né chiedere a un Allenatore di farlo per me quando gestisco direttamente i Gruppi.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-08-03). Verificato in analisi (in questa stessa sessione, leggendo per intero i file coinvolti): la Server Action condivisa `creaEAssegnaAtleta` (`app/(gruppi-allenatori)/gruppi/actions.ts` righe 333-424, Story 9.18) chiama **già** `requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"])` — il backend è **già pronto per tutti e tre i Ruoli**, nessuna modifica lato server necessaria. Il form UI che la richiama (Story 9.18) è però cablato **solo** in `MioGruppoCard.tsx` (pagina `/i-miei-gruppi`, card per Gruppo, uso Allenatore) — un commento esplicito in quel file (righe 14-17) documenta che al momento della Story 9.15 fu una scelta deliberata mantenere `GruppoRow.tsx` (pagina `/gruppi`, riga di tabella, uso Admin/Dirigente) **invariata**. Questa storia ribalta esplicitamente quella scelta su richiesta dell'utente: `GruppoRow.tsx` oggi importa solo `assegnaAtleta` (assegna un'Atleta già esistente in anagrafica) da `./actions`, non `creaEAssegnaAtleta` — Admin/Dirigente non hanno quindi, dalla UI, alcun modo di creare una nuova Atleta e assegnarla contestualmente, pur potendolo già fare tecnicamente lato server.

## Acceptance Criteria

1. **Given** un Admin o Dirigente sulla pagina `/gruppi`, su una riga Gruppo dove non trova un'Atleta nell'elenco esistente (nel `<select>` "Assegna Atleta") **When** apre/compila il form "Nuova Atleta" (Cognome, Nome, data di nascita, Codice Fiscale obbligatori; email e cellulare opzionali — stessi campi già presenti su `/i-miei-gruppi`) e lo invia **Then** una nuova Atleta viene creata (con `sesso` derivato dal Codice Fiscale, stesso comportamento di `creaEAssegnaAtleta`/Story 9.18) e assegnata automaticamente a quel Gruppo per la stagione corrente, visibile subito nella lista Atlete assegnate della riga
2. **Given** lo stesso form su `/gruppi` **When** il Codice Fiscale inserito non rispetta il formato valido, oppure appartiene a un'Atleta già esistente in anagrafica **Then** l'inserimento viene rifiutato con lo stesso messaggio d'errore chiaro già restituito da `creaEAssegnaAtleta` su `/i-miei-gruppi`, nessuna Atleta duplicata viene creata
3. **And** il form "Assegna Atleta" esistente su `/gruppi` (Atleta già in anagrafica) resta invariato e continua a funzionare accanto al nuovo form "Nuova Atleta" — nessuna regressione su `assegnaAtleta`/`AtletaAssegnata.tsx` (rimozione, Story 9.14), su `creaEAssegnaAtleta` da `/i-miei-gruppi` (Story 9.18, `MioGruppoCard.tsx` non toccato) né sulla notifica alla Segreteria già generata da `creaEAssegnaAtleta` (Story 9.18) — suite Vitest invariata sui casi esistenti

## Tasks / Subtasks

- [ ] Task 1: `GruppoRow.tsx` — nuovo form "Nuova Atleta" nella cella Atlete (AC: #1, #2, #3)
  - [ ] `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx`: importare anche `creaEAssegnaAtleta` da `./actions` (riga 4, accanto ad `assegnaAllenatore, assegnaAtleta` già importati)
  - [ ] Aggiungere un terzo `useActionState(creaEAssegnaAtleta, undefined)` indipendente (`nuovaAtletaState, nuovaAtletaFormAction, nuovaAtletaPending`) + `useRef<HTMLFormElement>` dedicato — **non riusare** lo stato/ref del form "Assegna Atleta" esistente (`atletaState`/`atletaFormRef`), sono due Server Action distinte con esiti indipendenti, stesso principio già seguito da `MioGruppoCard.tsx` (due `useActionState` paralleli, righe 27 e 42)
  - [ ] Stesso `useEffect` di reset già presente per gli altri due form della riga (righe 44-48/50-55): al successo (`"success" in nuovaAtletaState`), `nuovaAtletaFormRef.current?.reset()`
  - [ ] Nuovo `<form>` nella `<td>` Atlete (dopo il form "Assegna Atleta" esistente, righe 111-138), con `<input type="hidden" name="gruppoId" value={gruppo.id} />` e i 6 campi (`cognome`, `nome`, `dataNascita` — `type="date"`, `codiceFiscale`, `email` opzionale, `cellulare` opzionale) — stessi `name` attribute di `MioGruppoCard.tsx` righe 126-151, wrapping `<label>testo<input .../></label>` **senza** `id`/`htmlFor` espliciti (stesso motivo per cui `MioGruppoCard.tsx` non li usa: un `id` letterale duplicato tra le righe di più Gruppi nella stessa tabella violerebbe l'unicità del DOM — a differenza dei due form "Assegna" esistenti in questo file che usano `id={`assegna-...-${gruppo.id}`}` proprio per restare unici per riga)
  - [ ] Nessuna `window.confirm`: creare una nuova Atleta non è un'operazione distruttiva né una riassegnazione da un altro Gruppo — stesso principio già esplicito nel commento di `MioGruppoCard.tsx` righe 37-41
  - [ ] Bottone submit con classe `.bottoneCompatto` (coerente con gli altri due form della riga), `disabled={nuovaAtletaPending}`, testo "Crea e assegna" (stesso testo di `MioGruppoCard.tsx` riga 157)
  - [ ] Messaggio d'errore: `{nuovaAtletaState && "error" in nuovaAtletaState && <p role="alert" className={styles.errore}>{nuovaAtletaState.error.message}</p>}`, stesso pattern degli altri due form della riga
- [ ] Task 2: CSS — supporto `<input>` in `.formCompatto` (AC: #1)
  - [ ] `app/(gruppi-allenatori)/gruppi/gruppi.module.css`: `.formCompatto` oggi styla solo `.formCompatto select` (righe 176-184, i due form esistenti hanno solo `<select>`) — il nuovo form ha 6 `<input>` di tipo diverso (`text`/`date`/`email`/`tel`), serve una regola `.formCompatto input` con lo stesso font/colore/bordo/padding già usato per `select` (righe 176-184) e per `.campo input` (righe 34-42, versione non compatta) — riusare gli stessi token, non inventarne di nuovi
- [ ] Task 3: Verifica regressione (AC: #3)
  - [ ] Suite Vitest completa: nessun test esistente di `creaEAssegnaAtleta`/`assegnaAtleta` in `app/(gruppi-allenatori)/gruppi/actions.test.ts` deve cambiare — **nessuna modifica alla Server Action è prevista da questa storia**, è già ADMIN/DIRIGENTE/ALLENATORE-ready e già completamente testata (vedi Dev Notes)
  - [ ] `npx tsc --noEmit` pulito; ESLint pulito sul modulo `(gruppi-allenatori)`
  - [ ] Nessun test di rendering per `GruppoRow.tsx` (Client Component — convenzione già stabilita in questo progetto, coerente con `MioGruppoCard.tsx`/`SlotRow.tsx`/`AllenatoreRow.tsx`/`PartitaRow.tsx`, nessuno ha un file di test dedicato)
  - [ ] Verifica manuale dal vivo demandata all'utente dopo il deploy (nessuna istanza Supabase locale disponibile in questa sessione, stesso limite già incontrato per altre storie di questo Epic): un Admin/Dirigente su `/gruppi` crea una nuova Atleta e la vede assegnata, la notifica compare in `/notifiche`

## Dev Notes

- **Nessuna modifica al backend**: `creaEAssegnaAtleta` (`lib/db-rls/atleta.ts` → `creaAtleta`, richiamata da `app/(gruppi-allenatori)/gruppi/actions.ts` righe 333-424) è **già** autorizzata per `["ADMIN", "DIRIGENTE", "ALLENATORE"]` (riga 337) — questa storia è **puramente UI**: esporre un form già esistente altrove (stesso identico markup/logica di `MioGruppoCard.tsx`) anche in `GruppoRow.tsx`. Nessuna nuova Server Action, nessuna migrazione, nessuna colonna, nessun cambio a `lib/db-rls/atleta.ts`.
- **Perché il backend è già pronto ma la UI no**: la Story 9.15 (assegnazione Atlete al proprio Gruppo da parte dell'Allenatore) introdusse `MioGruppoCard.tsx` come variante "a card" di `GruppoRow.tsx` per l'Allenatore, lasciando esplicitamente `GruppoRow.tsx` invariata (commento righe 14-17 di `MioGruppoCard.tsx`: *"quella pagina resta ADMIN/DIRIGENTE-only, invariata"*). La Story 9.18 aggiunse poi il form "Nuova Atleta" **solo** a `MioGruppoCard.tsx`, con `requireRuolo` allargato ad ADMIN/DIRIGENTE "per coerenza futura" ma senza cablare la UI lato Admin/Dirigente in quel momento — questa storia completa quel lavoro rimasto a metà, su richiesta esplicita dell'utente.
- **Backend già completamente testato**: `app/(gruppi-allenatori)/gruppi/actions.test.ts` righe 717+ (`describe("creaEAssegnaAtleta")`) copre già FORBIDDEN (ruolo non ammesso), tutte le validazioni (gruppoId/cognome/nome/dataNascita/codiceFiscale mancanti o non validi, sesso non derivabile, Gruppo inesistente) e i casi di successo — il mock di `requireRuolo` in questi test è generico (verifica solo l'array di Ruoli passato, non un Ruolo specifico chiamante), quindi la copertura è già valida indipendentemente da quale Ruolo (Admin, Dirigente o Allenatore) la invochi. **Non aggiungere test duplicati per questa storia** a meno che il Task 1 introduca un comportamento nuovo lato Server Action (non previsto).
- **Due `useActionState` indipendenti nella stessa riga**: `GruppoRow.tsx` avrà quindi **tre** `useActionState` paralleli per riga (`assegnaAllenatore`, `assegnaAtleta`, `creaEAssegnaAtleta`) — stesso principio già in uso nel file (due oggi) e in `MioGruppoCard.tsx` (due, di cui uno è lo stesso `creaEAssegnaAtleta`). Ogni form ha il proprio `ref` e il proprio `useEffect` di reset, nessuno stato condiviso tra i tre.
- **`id`/`htmlFor` del nuovo form**: a differenza dei due form "Assegna" esistenti in `GruppoRow.tsx` (che usano `id={`assegna-allenatore-${gruppo.id}`}`/`id={`assegna-atleta-${gruppo.id}`}` per restare unici tra le righe della stessa tabella), il form "Nuova Atleta" va scritto con `<label>` che avvolge direttamente l'`<input>` (nessun `id` esplicito) — stesso pattern già usato da `MioGruppoCard.tsx` per lo stesso form, evita di dover generare 6 id univoci per riga per un form che in `MioGruppoCard.tsx` non ne ha mai avuto bisogno.
- **Dove posizionare il nuovo form**: dentro la `<td>` Atlete esistente (righe 100-139 di `GruppoRow.tsx`), dopo il form "Assegna Atleta" già presente — stessa colonna, non una nuova `<td>` (la tabella ha già 4 colonne fisse: nome, categoria, allenatori, atlete; aggiungerne una quinta solo per questo form romperebbe l'allineamento dell'header `<thead>` in `page.tsx`, non ispezionato in dettaglio ma da NON toccare per questa storia).
- **File NON da toccare**: `MioGruppoCard.tsx`/`i-miei-gruppi.module.css` (Story 9.15/9.18, invariati — la UI Allenatore è un percorso distinto e già funzionante), `lib/db-rls/atleta.ts`, `creaEAssegnaAtleta`/`assegnaAtleta`/`assegnaAllenatore` in `actions.ts` (nessuna Server Action modificata), `AtletaAssegnata.tsx` (rimozione, Story 9.14, invariato), `page.tsx` (nessun nuovo dato da recuperare — `creaEAssegnaAtleta` già chiama `revalidatePath("/gruppi")` oltre a `revalidatePath("/i-miei-gruppi")`, riga 323-324, quindi la pagina si aggiorna già correttamente dopo la creazione).

### Project Structure Notes

- File modificati: `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx` (nuovo form + import `creaEAssegnaAtleta`), `app/(gruppi-allenatori)/gruppi/gruppi.module.css` (nuova regola `.formCompatto input`).
- Nessun file nuovo, nessun file eliminato, nessuna migrazione, nessuna nuova Server Action.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.28: Aggiunta di un nuovo Atleta anche da parte di Admin/Dirigente in /gruppi]
- [Source: app/(gruppi-allenatori)/gruppi/actions.ts righe 328-424 — creaEAssegnaAtleta, già autorizzata ADMIN/DIRIGENTE/ALLENATORE, nessuna modifica prevista]
- [Source: app/(gruppi-allenatori)/gruppi/actions.test.ts righe 717+ — describe("creaEAssegnaAtleta"), copertura già esistente e sufficiente]
- [Source: app/(gruppi-allenatori)/i-miei-gruppi/MioGruppoCard.tsx — form "Nuova Atleta" di riferimento, markup/logica da riprodurre 1:1]
- [Source: app/(gruppi-allenatori)/gruppi/GruppoRow.tsx — file da estendere, pattern dei due useActionState esistenti]
- [Source: app/(gruppi-allenatori)/gruppi/gruppi.module.css righe 163-212 — .formCompatto/.bottoneCompatto da riusare/estendere]
- [Source: _bmad-output/implementation-artifacts/9-18-creazione-nuova-atleta-da-allenatore.md — story originale del form, decisioni su AD-10/sesso/notifica]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

### Completion Notes List

### File List
