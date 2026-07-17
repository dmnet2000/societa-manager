---
baseline_commit: NO_VCS
---

# Story 2.7: Vista orario personale — Atleta

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Atleta,
I want vedere gli Slot del mio Gruppo,
so that so sempre quando e dove mi alleno.

## Acceptance Criteria

1. **Given** sono assegnata a un Gruppo (Story 2.4) con Slot definiti (Story 2.5) per l'Anno Agonistico corrente, **when** apro la mia vista orario, **then** vedo gli Slot del mio Gruppo, ordinati per giorno della settimana (FR-4).
2. **Given** il mio account Utente non è ancora collegato a un profilo Atleta (nessun aggancio riuscito in fase di registrazione), **when** apro la vista, **then** vedo un messaggio chiaro invece di un errore o di una pagina vuota senza spiegazione — stesso trattamento di AC #2, Story 2.6.
3. La vista è di sola lettura: nessuna mutazione di `Slot`/`Gruppo`/`GruppoAtleta` in questa storia.

## ⚠️ Prerequisito bloccante scoperto in fase di creazione della storia

**Non esiste oggi alcun meccanismo che colleghi un Utente con Ruolo ATLETA al proprio record `Atleta`.** Verificato esplicitamente prima di scrivere questa storia (a differenza di `Allenatore.utenteId` e di `GenitoreAtleta` per il Ruolo Genitore):

- `Atleta` non ha alcuna colonna `utenteId` né alcuna relazione verso `Utente` (`prisma/schema.prisma`).
- `app/(onboarding-import)/registrati/page.tsx`/`actions.ts` non hanno **alcun** campo o logica condizionale per il Ruolo ATLETA (a differenza di `codiceFiscaleAllenatore` per ALLENATORE e `codiceFiscaleFiglio`, obbligatorio, per GENITORE).
- Questo gap era già stato scoperto e deliberatamente rimandato in fase di code review della Story 1.5: `_bmad-output/implementation-artifacts/deferred-work.md` → *"Il Ruolo Atleta non ha alcun meccanismo di auto-aggancio al proprio record Atleta tramite Codice Fiscale (a differenza di Genitore e Allenatore) — nessuna FR lo richiede oggi, possibile lacuna di prodotto da valutare in futuro."*

AC #1 di questa storia è **impossibile da implementare** senza questo meccanismo: per trovare "il Gruppo della mia Atleta" serve prima sapere quale riga `Atleta` corrisponde all'Utente loggato. Questo non è opzionale né rimandabile a una storia futura — è un prerequisito reale della storia corrente, non un ampliamento di scope. **Task 1 lo risolve esplicitamente**, prima di toccare la vista vera e propria (Task 2).

## Tasks / Subtasks

- [x] Task 1: Aggancio Atleta↔Utente in fase di registrazione (prerequisito per AC #1/#2)
  - [x] **Decisione architetturale: riusare `GenitoreAtleta`, non aggiungere `Atleta.utenteId`.** Motivazione (da riportare nei commenti del codice, non solo qui):
    1. `Atleta` è protetta da RLS (AD-4/AD-9) e le sue colonne sono di proprietà esclusiva di Onboarding-Import (AD-10). Scrivere un nuovo campo `utenteId` direttamente sulla riga `Atleta` in fase di registrazione richiederebbe una scrittura RLS-protetta in un momento (durante il matching, prima ancora che l'Utente abbia una sessione) in cui non esiste ancora una policy RLS che lo permetta — le policy attuali su `atlete` (`prisma/migrations/20260716080000_atlete_restrict_delete/migration.sql`) ammettono `UPDATE` solo per `ADMIN`/`DIRIGENTE`/`SEGRETERIA`. Andrebbe inventata una nuova policy RLS solo per questo, con tutto il rischio che comporta toccare le policy della tabella più sensibile del sistema.
    2. `GenitoreAtleta` è **già** esattamente la tabella di giunzione Utente↔Atleta di cui questa storia ha bisogno: non protetta da RLS (Story 1.5), gestita via Prisma diretto, con un lookup service-role già implementato e testato (`trovaPerCodiceFiscale`, `lib/matching-codice-fiscale/`) per il caso "nessuna sessione ancora disponibile durante la registrazione". Riusarla per il collegamento di un'Atleta a se stessa richiede **zero migrazioni, zero nuove policy RLS** — solo una nuova riga nella tabella esistente.
    3. Il nome "GenitoreAtleta" resta storicamente legato al caso d'uso originale (Story 1.5), ma la sua **funzione** reale è "correla un Utente (di qualunque Ruolo) a un'Atleta" — non c'è alcuna colonna o vincolo che presupponga che l'Utente sia un genitore. Non rinominare il modello in questa storia (rischio/costo sproporzionato al beneficio): documentare esplicitamente questa scelta nei commenti del codice toccato, così un futuro lettore non la scambi per un bug.
  - [x] `app/(onboarding-import)/registrati/page.tsx`: aggiungere un campo condizionale `codiceFiscaleAtleta` (mostrato quando il checkbox `ruoli` con valore `ATLETA` è selezionato) — stesso pattern esatto del campo `codiceFiscaleFiglio` per GENITORE (obbligatorio quando quel Ruolo è selezionato, non opzionale come `codiceFiscaleAllenatore`). Etichetta: "Il tuo Codice Fiscale" (non "della figlia/o": qui l'Atleta si registra per se stessa).
  - [x] `app/(onboarding-import)/registrati/actions.ts`: replicare **esattamente** il blocco già esistente per GENITORE (righe ~59-113), adattato per ATLETA:
    - Se `ruoli.includes("ATLETA")`: `codiceFiscaleAtleta` obbligatorio → altrimenti `VALIDATION` "Il tuo Codice Fiscale è obbligatorio per il Ruolo Atleta.".
    - Validare il formato con `isCodiceFiscaleValido` (funzione già esistente, riusata) → altrimenti `VALIDATION` "Codice Fiscale non valido (deve essere di 16 caratteri alfanumerici).".
    - Risolvere **prima del `signUp`** (stesso motivo di GENITORE: un mismatch deve bloccare l'intera registrazione, nessun account "a metà") tramite `trovaPerCodiceFiscale(createAdminClient(), codiceFiscaleAtleta)` (funzione già esistente, **non** scriverne una nuova — è esattamente lo stesso lookup, solo con un CF diverso) → se `null`, `VALIDATION` "Nessuna Atleta trovata con questo Codice Fiscale. Verifica di aver inserito il tuo Codice Fiscale corretto.".
    - Dopo il `signUp` riuscito: `prisma.genitoreAtleta.create({ data: { utenteId: utente.id, atletaId: atletaAtletaDaAgganciare.id } })` — stesso identico pattern del blocco GENITORE già esistente, **variabile separata** (non riusare `atletaDaAgganciare`, che resta il nome storico del blocco Genitore — usare `atletaPropriaDaAgganciare` o simile per chiarezza, dato che ora possono coesistere entrambi i blocchi se un Utente selezionasse sia GENITORE sia ATLETA).
    - Nessuna interazione tra i due blocchi: se un Utente selezionasse sia GENITORE sia ATLETA (caso raro ma non impedito dal form), entrambi i CF vanno risolti e agganciati indipendentemente, esattamente come già accade oggi tra ALLENATORE e GENITORE (vedi test esistente "hooks up both Allenatore and Genitore independently").
- [x] Task 2: Estendere `app/(orari-palestre)/mio-orario/page.tsx` (Story 2.6) per servire anche l'Atleta (AC: #1, #2, #3)
  - [x] **Non creare una pagina/route separata** — Story 2.6 aveva esplicitamente rimandato questa decisione a questa storia. Le due viste sono quasi identiche (stessa tabella Giorno/Orario/Palestra-Campo/Gruppo); l'unica differenza reale è **come** si risolvono i propri Gruppi. Estendere la pagina esistente è la scelta più semplice, non introduce duplicazione.
  - [x] `lib/auth/route-guard.ts`: allargare `{ prefix: "/mio-orario", ... }` da `["ALLENATORE"]` a `["ALLENATORE", "ATLETA"]`.
  - [x] Risolvere gli `atletaId` collegati all'Utente loggato: `prisma.genitoreAtleta.findMany({ where: { utente: { supabaseAuthId: user.id } }, select: { atletaId: true } })` (stesso client Supabase già presente solo per l'identità di sessione, **nessuna lettura di `Atleta` stessa**: né qui né altrove in questa pagina si legge mai una colonna della tabella `atlete` — l'unico dato che serve è l'id di correlazione, ottenuto da `GenitoreAtleta`, tabella non protetta da RLS. Questo evita del tutto il problema "nessuna policy RLS SELECT per Ruolo ATLETA/GENITORE su `atlete`" — mai necessaria in questa storia).
  - [x] Query Slot per l'Atleta, simmetrica a quella già esistente per l'Allenatore ma tramite la relazione `GruppoAtleta` invece di `GruppoAllenatore`: `prisma.slot.findMany({ where: { gruppo: { annoAgonisticoId: annoCorrente.id, atlete: { some: { atletaId: { in: atletaIds } } } } }, include: {...}, orderBy: [...] })` — stesso `include`/`orderBy` del ramo Allenatore già esistente.
  - [x] Eseguire le due query (ramo Allenatore, se `allenatore` esiste; ramo Atleta, se `atletaIds.length > 0`) in `Promise.all`, poi **unire i risultati deduplicando per `id`** (un singolo Utente potrebbe teoricamente avere sia un profilo Allenatore sia un'Atleta collegata — caso limite accettato, non richiede logica speciale, solo l'unione) e **riordinare** il risultato unito per `giorno` (usando l'ordine di dichiarazione di `GIORNI_SETTIMANA`, `lib/giorno-settimana.ts` — l'ordine di un `Promise.all` di due query separate non è comunque garantito coerente tra loro dopo l'unione, va riordinato esplicitamente in JS) poi `oraInizio`.
  - [x] **AC #2 unificato**: se né `allenatore` né `atletaIds` risolvono a nulla, mostrare un unico messaggio che copre entrambi i casi: "Il tuo account non è ancora collegato a un profilo Allenatore o Atleta. Contatta la segreteria." — non serve distinguere quale Ruolo specifico manca: il route-guard garantisce già che l'Utente abbia almeno uno tra ALLENATORE/ATLETA per raggiungere la pagina.
  - [x] Il resto della pagina (identificazione utente, gestione dell'errore di `getUser()`, struttura della tabella, messaggio di elenco vuoto) resta invariato rispetto a Story 2.6 — non riscrivere quello che già funziona.
- [x] Task 3: Test (Vitest)
  - [x] `app/(onboarding-import)/registrati/actions.test.ts`: file esistente, aggiungere test per il Ruolo ATLETA speculari a quelli già presenti per GENITORE — `VALIDATION` quando `codiceFiscaleAtleta` manca; `VALIDATION` per formato non valido; lookup fallito (nessuna Atleta trovata) → `VALIDATION`, nessun account creato; successo → `prisma.genitoreAtleta.create` chiamato con `{ utenteId, atletaId }`; errore `INTERNAL` fail-closed se il lookup o l'hookup falliscono; un Utente con **sia** ATLETA sia GENITORE aggancia entrambi indipendentemente (mirroring del test esistente per ALLENATORE+GENITORE).
  - [x] `lib/auth/route-guard.test.ts`: aggiornare il test esistente su `/mio-orario` — ora deve ammettere anche `["ATLETA"]`, non solo `["ALLENATORE"]` (lezione dalla code review di Story 2.6: ogni rotta in `PROTECTED_ROUTES` deve avere un test aggiornato).
  - [x] Nessun test per `mio-orario/page.tsx` — stessa decisione deliberata di Story 2.6 (pagina di sola lettura, nessuna pagina/Server Component ha mai avuto test dedicati in questo progetto).
- [x] Task 4: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] AC #1: creare un'Atleta di test (Prisma diretto, fixture), assegnarla a un Gruppo con uno Slot (riusando il flusso Admin già verificato in Story 2.4/2.5), registrare un utente con Ruolo ATLETA e il Codice Fiscale corrispondente, login, verificare che `/mio-orario` mostri lo Slot del suo Gruppo.
  - [x] AC #2: registrare un utente con Ruolo ATLETA senza fornire un Codice Fiscale corrispondente (o con uno inesistente — la registrazione stessa fallirà con l'errore di validazione, quindi il test equivalente è: verificare che la registrazione venga rifiutata con il messaggio dedicato, **non** che un account "a metà" atterri su `/mio-orario` — a differenza di Story 2.6, qui l'aggancio è obbligatorio e risolto prima del `signUp`, quindi lo stato "Utente esiste ma non collegato" non è raggiungibile tramite il normale flusso di registrazione per questo Ruolo; verificare comunque che il messaggio AC #2 in `/mio-orario` sia corretto simulando lo stato con un Utente Ruolo ATLETA creato senza passare da `registrati` — es. tramite seed diretto).
  - [x] Regressione: verificare che un Allenatore (Story 2.6) veda ancora correttamente il proprio orario dopo l'estensione della pagina.
  - [x] Verificare che un Admin/Dirigente/Segreteria/Genitore non possa raggiungere `/mio-orario` (redirect a `/non-autorizzato`, route-guard).

### Review Findings

Code review 2026-07-17 — 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor).

- [x] [Review][Patch] `allenatore` e `atletaIds` risolti in sequenza invece che in `Promise.all` — le due query non dipendono l'una dall'altra, e il commento originale di Story 2.6 anticipava esplicitamente che questo pattern sarebbe stato ripreso da questa storia [app/(orari-palestre)/mio-orario/page.tsx] — Blind Hunter, risolto con `Promise.all`, riverificato dal vivo (nessuna regressione)
- [x] [Review][Patch] La logica di unione/deduplicazione/riordino dei due elenchi Slot (Allenatore + Atleta) era vera business logic (non solo composizione di query) senza alcuna copertura di test [app/(orari-palestre)/mio-orario/page.tsx] — Blind Hunter, risolto estraendo `unisciESordinaSlot` in `lib/orario/unisci-slot.ts`, funzione pura testabile, coperta da 6 test TDD, riusata nella pagina

- [x] [Review][Defer] Nessuna esclusività sull'auto-aggancio Atleta↔Utente (più account potrebbero collegarsi alla stessa Atleta) — stesso comportamento già accettato per `GenitoreAtleta`/Genitore (Story 1.5 AC #4), impatto limitato a dati di sola lettura non sensibili [app/(onboarding-import)/registrati/actions.ts] — deferred
- [x] [Review][Defer] Stesso Codice Fiscale in entrambi i campi ATLETA+GENITORE → violazione `@@unique` non gestita esplicitamente — stesso pattern "nessun rollback automatico" già accettato in tutto `registrati/actions.ts` fin da Story 1.1 [app/(onboarding-import)/registrati/actions.ts] — deferred
- [x] [Review][Defer] Ordine dei campi nel form non allineato all'ordine di validazione (cosmetico) [app/(onboarding-import)/registrati/page.tsx, actions.ts] — deferred
- [x] [Review][Defer] Fusione self+figlio senza etichetta per Utente con doppio Ruolo — già esplicitamente accettato e documentato nelle Dev Notes della storia [app/(orari-palestre)/mio-orario/page.tsx] — deferred
- [x] [Review][Defer] `orderBy` Prisma ridondante dopo il riordino JS — innocuo [app/(orari-palestre)/mio-orario/page.tsx] — deferred

Dismessi come rumore/falsi positivi/già gestiti (4): messaggio AC #2 generico "Allenatore o Atleta" non specifico per Ruolo (decisione deliberata ed esplicita nel Task 2 della storia, il route-guard garantisce già che l'Utente abbia almeno uno dei due Ruoli); over-fetch `select("*")` in `trovaPerCodiceFiscale` (funzione preesistente non toccata da questo diff, già segnalata in `deferred-work.md` per Story 1.5 — questo diff la riusa, non la introduce); "oracolo" di esistenza del Codice Fiscale esposto una seconda volta (stesso pattern preesistente del blocco GENITORE, non una nuova classe di rischio); profondità dei test solo mockati per il vincolo `@@unique` (categoria già ripetutamente accettata nel progetto, Story 1.3 in poi — mitigata qui dalla verifica dal vivo che ha confermato la creazione reale della riga `GenitoreAtleta` contro Postgres).

## Dev Notes

- **Il prerequisito del Task 1 non è un'invenzione di scope**: è un blocco reale, scoperto verificando esplicitamente lo stato del codice prima di scrivere questa storia (vedi sezione dedicata sopra). Ometterlo renderebbe AC #1 semplicemente impossibile da soddisfare.
- **Perché `GenitoreAtleta` e non un nuovo modello dedicato (es. `AtletaUtente`)**: sarebbe stata l'alternativa "più pulita" nominalmente, ma duplicherebbe al 100% la forma di una tabella già esistente, funzionalmente identica, per zero beneficio reale — l'unico argomento contro il riuso è il nome fuorviante, non la semantica. Vedi Task 1 per il ragionamento completo.
- **Nessuna lettura di `Atleta` in questa storia, né in `registrati/actions.ts` (già così, tramite `trovaPerCodiceFiscale`, che restituisce solo `{id, codiceFiscale}`) né in `mio-orario/page.tsx`**: coerente con AD-4 (RLS) — l'unico dato letto da `Atleta` è l'`id`, mai nome/CF/altri campi identitari, sempre tramite funzioni già esistenti e già verificate per il bypass service-role in fase di registrazione (Story 1.5).
- **Pattern di riferimento più vicino**: il blocco GENITORE già esistente in `app/(onboarding-import)/registrati/actions.ts` (Story 1.5) per il Task 1 — da replicare quasi letteralmente, non reinventare; `app/(orari-palestre)/mio-orario/page.tsx` (Story 2.6, già patchata in code review per l'identity-resolution collassata in un'unica query) per il Task 2.
- **Perché l'unione e il riordino manuale in JS invece di un'unica query Prisma**: `Slot` non ha una relazione diretta e uniforme verso "il proprietario" — il ramo Allenatore attraversa `GruppoAllenatore`, il ramo Atleta attraversa `GruppoAtleta`, due relazioni strutturalmente diverse sullo stesso `Gruppo`. Non esiste una singola clausola `where` che esprima entrambe con un `OR` pulito senza duplicare l'intera struttura della query — due query separate, poi unite e deduplicate per `id`, è più leggibile che una query con un `OR` innestato su due relazioni diverse.
- **Scala**: NFR PRD §8, un'Atleta appartiene a un solo Gruppo per stagione (vincolo `GruppoAtleta`, Story 2.4) — l'elenco Slot è tipicamente più corto di quello di un Allenatore con più Gruppi.

### Project Structure Notes

- Nessun nuovo route group o pagina. File modificati: `app/(onboarding-import)/registrati/page.tsx`, `app/(onboarding-import)/registrati/actions.ts`, `app/(onboarding-import)/registrati/actions.test.ts`, `app/(orari-palestre)/mio-orario/page.tsx`, `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.7: Vista orario personale — Atleta] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-4] — "L'Atleta vede gli Slot del proprio Gruppo."
- [Source: _bmad-output/implementation-artifacts/deferred-work.md, sezione "Deferred from: code review of 1-5-aggancio-genitore-atleta-in-registrazione"] — origine del gap che questa storia risolve.
- [Source: app/(onboarding-import)/registrati/actions.ts, blocco GENITORE] — pattern di riferimento esatto per il Task 1.
- [Source: app/(orari-palestre)/mio-orario/page.tsx] — pagina esistente da estendere (Story 2.6), non ricreare.
- [Source: prisma/migrations/20260716080000_atlete_restrict_delete/migration.sql] — policy RLS attuali su `atlete` (verificate: nessun accesso SELECT/UPDATE per ATLETA/GENITORE), motivazione della decisione architetturale del Task 1.
- [Source: lib/matching-codice-fiscale] — `trovaPerCodiceFiscale`, `isCodiceFiscaleValido`, funzioni esistenti da riusare senza modifiche.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `npx tsc --noEmit`: pulito.
- `npx vitest run`: 238 test, tutti superati (7 nuovi in `registrati/actions.test.ts` per l'aggancio ATLETA; 6 test pre-esistenti aggiornati da `ruoli: ["ATLETA"]` a `["DIRIGENTE"]` dove il Ruolo era incidentale al test e non più compatibile con il nuovo Codice Fiscale obbligatorio; `route-guard.test.ts` aggiornato per `/mio-orario`).
- `npm run lint`: pulito.
- `npm run build`: build di produzione riuscita, `/mio-orario` ancora confermata come route dinamica.
- Verifica live (Playwright temporaneo + Prisma/Supabase diretti per il setup, poi rimossi): come Admin, creata un'Atleta di test, Palestra→Campo, Gruppo, assegnata l'Atleta al Gruppo (Story 2.4), creato uno Slot (Story 2.5). Registrato un utente con Ruolo ATLETA e Codice Fiscale corrispondente → verificato che la registrazione crea davvero la riga `GenitoreAtleta` di auto-aggancio → login → `/mio-orario` mostra correttamente lo Slot del proprio Gruppo (AC #1). Creato via seed diretto un Utente Ruolo ATLETA senza aggancio (stato non raggiungibile tramite il normale flusso di registrazione, che blocca prima del `signUp` in caso di mismatch) → login → messaggio dedicato mostrato correttamente (AC #2). Regressione: un Allenatore (Story 2.6) registrato e collegato vede ancora correttamente il proprio orario dopo l'estensione della pagina. Un utente Segreteria non può raggiungere `/mio-orario` (redirect `/non-autorizzato`). Tutti i test superati al primo tentativo. Dati di test rimossi al termine (inclusi gli utenti Supabase Auth).
- Code review (3 layer paralleli) → 2 patch applicate con TDD (risoluzione identità in `Promise.all`, estrazione di `unisciESordinaSlot` in un modulo testabile), riverificate dal vivo (nessuna regressione sull'Atleta collegata). Suite completa dopo le patch: 244/244 test, `tsc`/`lint`/`build` verdi.

### Completion Notes List

- **Prerequisito bloccante risolto** (vedi sezione dedicata nella storia): aggiunto l'aggancio Atleta↔Utente in fase di registrazione, mancante prima di questa storia. Riusata deliberatamente `GenitoreAtleta` (non un nuovo modello/colonna) — zero migrazioni, zero nuove policy RLS, riuso del lookup service-role già esistente e testato (`trovaPerCodiceFiscale`).
- `registrati/actions.ts`: nuovo blocco per Ruolo ATLETA, speculare a quello GENITORE già esistente (CF obbligatorio, risolto prima del `signUp`, fail-closed su mismatch), variabile separata (`atletaPropriaDaAgganciare`) per coesistere indipendentemente con il blocco GENITORE se un Utente selezionasse entrambi i Ruoli.
- `mio-orario/page.tsx` (Story 2.6) estesa, non ricreata: risoluzione degli `atletaId` collegati tramite `GenitoreAtleta` (nessuna lettura di `Atleta` stessa, solo l'id di correlazione — evita completamente il problema delle policy RLS mancanti per ATLETA/GENITORE su `atlete`), query Slot simmetrica a quella Allenatore ma via `GruppoAtleta`, unione e riordino manuale dei risultati delle due query, messaggio AC #2 unificato per entrambi i casi di non-aggancio.
- `route-guard.ts`: `/mio-orario` allargata a `["ALLENATORE", "ATLETA"]`; `route-guard.test.ts` aggiornato di conseguenza (lezione dalla code review di Story 2.6).
- Nessuna Server Action nuova per la vista in sé (resta di sola lettura, Task 2); la logica di business testata in questa storia è tutta nel percorso di registrazione (`registrati/actions.ts`).

### File List

- `app/(onboarding-import)/registrati/page.tsx` (modificato: campo condizionale `codiceFiscaleAtleta`)
- `app/(onboarding-import)/registrati/actions.ts` (modificato: blocco di aggancio ATLETA via `GenitoreAtleta`)
- `app/(onboarding-import)/registrati/actions.test.ts` (modificato: 7 nuovi test ATLETA, 6 test pre-esistenti aggiornati)
- `app/(orari-palestre)/mio-orario/page.tsx` (modificato: ramo Atleta, unione/riordino con il ramo Allenatore)
- `lib/auth/route-guard.ts` (modificato: `/mio-orario` allargata a `["ALLENATORE", "ATLETA"]`)
- `lib/auth/route-guard.test.ts` (modificato: test aggiornati per `/mio-orario`)
- `lib/orario/unisci-slot.ts` (nuovo, review fix: unione/dedup/riordino Slot estratti in funzione pura testabile)
- `lib/orario/unisci-slot.test.ts` (nuovo)

## Change Log

- 2026-07-17: Implementazione completa Story 2.7 (Task 1-4). Settima storia dell'Epic 2 — a differenza delle storie precedenti, questa richiedeva prima di risolvere un prerequisito bloccante scoperto in fase di creazione della storia (verificato esplicitamente, non presunto): nessun meccanismo esisteva per collegare un Utente Ruolo ATLETA al proprio record `Atleta`, gap già segnalato e rimandato nella code review di Story 1.5. Risolto riusando `GenitoreAtleta` (già non-RLS, già dotata di un lookup service-role testato) invece di introdurre `Atleta.utenteId`, che avrebbe richiesto una nuova policy RLS di scrittura sulla tabella più sensibile del sistema. La vista `/mio-orario` (Story 2.6) è stata estesa, non duplicata, con risoluzione simmetrica Allenatore/Atleta via `Promise.all`, unione deduplicata per id e riordino esplicito lato server. Nessuna lettura di `Atleta` in nessun punto toccato da questa storia — solo l'id di correlazione tramite `GenitoreAtleta`. Tutti gli AC verificati dal vivo contro un backend Supabase reale, inclusa la regressione della vista Allenatore (Story 2.6). Nessun bug applicativo reale scoperto durante lo sviluppo, oltre al prerequisito architetturale già anticipato. Status → review.
- 2026-07-17: Code review. 3 layer paralleli, 0 decisioni, 2 patch applicate (risoluzione identità Allenatore/Atleta in `Promise.all` invece di sequenziale — il pattern che il commento di Story 2.6 anticipava per questa storia; estrazione della logica di unione/dedup/riordino Slot in `lib/orario/unisci-slot.ts`, funzione pura coperta da 6 test — la prima vera business logic non banale introdotta in una pagina di sola lettura dell'Epic 2), 5 finding deferiti (assenza di esclusività sull'auto-aggancio, stesso comportamento permissivo già accettato per Genitore; race P2002 su CF duplicato tra due Ruoli, stesso pattern "nessun rollback" già accettato; ordine campi form cosmetico; fusione self+figlio senza etichetta, già documentata nelle Dev Notes; `orderBy` ridondante innocuo), 4 scartati come rumore/già gestiti. Entrambe le patch riverificate dal vivo, nessuna regressione. Suite completa: 244/244 test, typecheck/lint/build verdi. Status → done.
