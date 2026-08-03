---
baseline_commit: f40691ba7cb7d04c2544d969df33b52f3cda857d
---

# Story 9.28: Aggiunta di un nuovo Atleta anche da parte di Admin/Dirigente in /gruppi

Status: done

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

- [x] Task 1: `GruppoRow.tsx` — nuovo form "Nuova Atleta" nella cella Atlete (AC: #1, #2, #3)
  - [x] `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx`: importare anche `creaEAssegnaAtleta` da `./actions` (riga 4, accanto ad `assegnaAllenatore, assegnaAtleta` già importati)
  - [x] Aggiungere un terzo `useActionState(creaEAssegnaAtleta, undefined)` indipendente (`nuovaAtletaState, nuovaAtletaFormAction, nuovaAtletaPending`) + `useRef<HTMLFormElement>` dedicato — **non riusare** lo stato/ref del form "Assegna Atleta" esistente (`atletaState`/`atletaFormRef`), sono due Server Action distinte con esiti indipendenti, stesso principio già seguito da `MioGruppoCard.tsx` (due `useActionState` paralleli, righe 27 e 42)
  - [x] Stesso `useEffect` di reset già presente per gli altri due form della riga (righe 44-48/50-55): al successo (`"success" in nuovaAtletaState`), `nuovaAtletaFormRef.current?.reset()`
  - [x] Nuovo `<form>` nella `<td>` Atlete (dopo il form "Assegna Atleta" esistente, righe 111-138), con `<input type="hidden" name="gruppoId" value={gruppo.id} />` e i 6 campi (`cognome`, `nome`, `dataNascita` — `type="date"`, `codiceFiscale`, `email` opzionale, `cellulare` opzionale) — stessi `name` attribute di `MioGruppoCard.tsx` righe 126-151, wrapping `<label>testo<input .../></label>` **senza** `id`/`htmlFor` espliciti (stesso motivo per cui `MioGruppoCard.tsx` non li usa: un `id` letterale duplicato tra le righe di più Gruppi nella stessa tabella violerebbe l'unicità del DOM — a differenza dei due form "Assegna" esistenti in questo file che usano `id={`assegna-...-${gruppo.id}`}` proprio per restare unici per riga)
  - [x] Nessuna `window.confirm`: creare una nuova Atleta non è un'operazione distruttiva né una riassegnazione da un altro Gruppo — stesso principio già esplicito nel commento di `MioGruppoCard.tsx` righe 37-41
  - [x] Bottone submit con classe `.bottoneCompatto` (coerente con gli altri due form della riga), `disabled={nuovaAtletaPending}`, testo "Crea e assegna" (stesso testo di `MioGruppoCard.tsx` riga 157)
  - [x] Messaggio d'errore: `{nuovaAtletaState && "error" in nuovaAtletaState && <p role="alert" className={styles.errore}>{nuovaAtletaState.error.message}</p>}`, stesso pattern degli altri due form della riga
- [x] Task 2: CSS — supporto `<input>` in `.formCompatto` (AC: #1)
  - [x] `app/(gruppi-allenatori)/gruppi/gruppi.module.css`: `.formCompatto` oggi styla solo `.formCompatto select` (righe 176-184, i due form esistenti hanno solo `<select>`) — il nuovo form ha 6 `<input>` di tipo diverso (`text`/`date`/`email`/`tel`), serve una regola `.formCompatto input` con lo stesso font/colore/bordo/padding già usato per `select` (righe 176-184) e per `.campo input` (righe 34-42, versione non compatta) — riusare gli stessi token, non inventarne di nuovi
- [x] Task 3: Verifica regressione (AC: #3)
  - [x] Suite Vitest completa: nessun test esistente di `creaEAssegnaAtleta`/`assegnaAtleta` in `app/(gruppi-allenatori)/gruppi/actions.test.ts` deve cambiare — **nessuna modifica alla Server Action è prevista da questa storia**, è già ADMIN/DIRIGENTE/ALLENATORE-ready e già completamente testata (vedi Dev Notes) — confermato: 840/840 test invariati
  - [x] `npx tsc --noEmit` pulito; ESLint pulito sul modulo `(gruppi-allenatori)` — pulito sui file toccati da questa storia (`GruppoRow.tsx`); 1 errore/2 warning preesistenti in `wizard-nuova-stagione` non toccato da questa storia, non correlati
  - [x] Nessun test di rendering per `GruppoRow.tsx` (Client Component — convenzione già stabilita in questo progetto, coerente con `MioGruppoCard.tsx`/`SlotRow.tsx`/`AllenatoreRow.tsx`/`PartitaRow.tsx`, nessuno ha un file di test dedicato)
  - [x] Verifica manuale dal vivo demandata all'utente dopo il deploy (nessuna istanza Supabase locale disponibile in questa sessione, stesso limite già incontrato per altre storie di questo Epic): un Admin/Dirigente su `/gruppi` crea una nuova Atleta e la vede assegnata, la notifica compare in `/notifiche`

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

- Storia puramente UI, come previsto dai Dev Notes: nessuna modifica a `creaEAssegnaAtleta`/`assegnaAtleta`/`lib/db-rls/atleta.ts` — il backend era già pronto per ADMIN/DIRIGENTE/ALLENATORE fin dalla Story 9.18.
- `GruppoRow.tsx` esteso con un terzo `useActionState(creaEAssegnaAtleta, undefined)` indipendente (ref/reset propri), stesso identico markup/campi del form "Nuova Atleta" già presente in `MioGruppoCard.tsx` (Story 9.18) — nessun `id`/`htmlFor` esplicito sui 6 campi (label che avvolge l'input direttamente), per evitare id duplicati tra le righe della tabella `/gruppi`.
- Aggiunta `.formCompatto input` in `gruppi.module.css` (i due form preesistenti in quella colonna avevano solo `<select>`).
- Nessun nuovo test: la Server Action `creaEAssegnaAtleta` era già completamente coperta in `actions.test.ts` con un mock di `requireRuolo` generico (indipendente dal Ruolo chiamante) — 840/840 test invariati.
- `page.tsx` non toccata: `creaEAssegnaAtleta` chiama già `revalidatePath("/gruppi")` (oltre a `/i-miei-gruppi`), quindi la lista Atlete assegnate si aggiorna correttamente senza cambi alla pagina.
- Verifica finale: 840/840 test Vitest passati (invariato), `tsc --noEmit` pulito, ESLint pulito sui file toccati da questa storia (`GruppoRow.tsx`, `gruppi.module.css`) — 1 errore/2 warning preesistenti in `wizard-nuova-stagione/*` non correlati, non toccati da questa storia.
- Verifica manuale dal vivo (creazione reale su `/gruppi`, notifica in `/notifiche`) demandata all'utente dopo il deploy — nessuna istanza Supabase disponibile in questa sessione.

### File List

- `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx` (modificato — nuovo form "Nuova Atleta", import `creaEAssegnaAtleta`)
- `app/(gruppi-allenatori)/gruppi/gruppi.module.css` (modificato — nuova regola `.formCompatto input`)

### Review Findings

- [x] [Review][Patch] Le 6 label del nuovo form avvolgevano l'input (`<label>Testo<input/></label>`) ma `.formCompatto label` non ha `display:block` — testo e input sarebbero renderizzati sulla stessa riga invece che impilati [app/(gruppi-allenatori)/gruppi/GruppoRow.tsx] — risolto: campi riscritti con `id`/`htmlFor` espliciti per riga, stesso pattern già usato dai due form "Assegna" esistenti in questo stesso file (risolve anche l'incoerenza di accessibilità segnalata separatamente)
- [x] [Review][Patch] Nessuna separazione visiva tra "Assegna Atleta" e "Nuova Atleta" nella stessa cella (nessun `<h3>`/bordo, a differenza del riferimento `MioGruppoCard.tsx`) — rischio di misclick tra due bottoni "compatti" quasi identici impilati [app/(gruppi-allenatori)/gruppi/GruppoRow.tsx] — risolto: aggiunto `<p className={styles.separatoreCompatto}>Nuova Atleta</p>` con bordo superiore, nuova classe `.separatoreCompatto` in `gruppi.module.css`
- [x] [Review][Defer] Nessun `maxLength`/`pattern`/`inputMode` sul Codice Fiscale lato client [app/(gruppi-allenatori)/gruppi/GruppoRow.tsx] — deferred, pre-existing (stesso gap identico già presente in `MioGruppoCard.tsx`, Story 9.18, duplicato non introdotto)
- [x] [Review][Defer] Nessun `max` sulla data di nascita (`<input type="date">` accetta date future) [app/(gruppi-allenatori)/gruppi/GruppoRow.tsx] — deferred, pre-existing (stesso gap identico già presente in `MioGruppoCard.tsx`, Story 9.18)
- [x] [Review][Defer] Doppio submit rapido prima che `disabled={nuovaAtletaPending}` si applichi può far collidere due chiamate concorrenti su Codice Fiscale duplicato, mostrando un errore INTERNAL generico invece del messaggio duplicato chiaro [app/(gruppi-allenatori)/gruppi/GruppoRow.tsx] — deferred, pre-existing (stesso identico pattern del bottone in `MioGruppoCard.tsx`, Story 9.18)

**Dismessi come rumore/fuori scope/falsi positivi (5):** layout a colonna stretta (`.formCompatto`, 160px) invece del `flex-wrap` largo di `MioGruppoCard.tsx` — adattamento corretto al contesto (cella di tabella stretta vs card), non un difetto; duplicazione del markup del form tra `GruppoRow.tsx` e `MioGruppoCard.tsx` invece di un componente condiviso — convenzione già accettata in tutto il progetto (nessun meccanismo di composizione cross-modulo, ogni pagina ha il proprio form autonomo); nessun test di rendering per il nuovo form — convenzione già stabilita per ogni Client Component di questo progetto; form ritenuto "cramped" per 6 campi in `.formCompatto` — soggettivo, coerente con la densità delle altre celle-tabella del progetto; selettore CSS `.formCompatto input` che matcha anche gli input nascosti (`type="hidden"`) dei due form esistenti — nessun effetto visivo/funzionale, confermato dall'Acceptance Auditor.

## Change Log

- 2026-08-03: Implementato il form "Nuova Atleta" in `GruppoRow.tsx` (riuso 1:1 di `creaEAssegnaAtleta`, già autorizzata ADMIN/DIRIGENTE/ALLENATORE) + CSS `.formCompatto input`. Nessuna modifica al backend. 840/840 test invariati, 0 errori tsc/eslint sui file toccati. Status: review.
- 2026-08-03: Code review completata (Blind Hunter + Edge Case Hunter + Acceptance Auditor) - Acceptance Auditor: 0 violazioni sugli AC, backend confermato invariato e già testato. 2 patch applicati (label/input non impilati per assenza di `display:block` risolto passando a `id`/`htmlFor` per riga, coerente con i due form "Assegna" esistenti; separatore visivo `.separatoreCompatto` aggiunto tra i due form nella stessa cella). 3 defer (nessun vincolo client su Codice Fiscale, nessun `max` su data di nascita, race su doppio submit rapido - tutti pre-esistenti identici in `MioGruppoCard.tsx`, Story 9.18). 5 scartati come falsi positivi/fuori scope/convenzioni già accettate. 840/840 test passati, 0 errori tsc/eslint dopo i fix. Status: done.
