---
baseline_commit: 4b05ac9c63e4ef425f43806ec7cb191b3f9b8d4a
---

# Story 9.26: Vista d'insieme per l'Allenatore sui propri Gruppi

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore,
I want una "Vista d'insieme" sui Gruppi che gestisco (conteggi in regola/in scadenza/scaduto dei certificati, come già esiste per il Dirigente),
so that posso valutare a colpo d'occhio la situazione certificati delle mie Atlete senza aprire ogni singola scheda.

**Note aggiuntive:** specchio diretto di `/vista-dirigente` (Story 5.1/5.2) ma scoped ai soli Gruppi dell'Allenatore, non a tutti i Gruppi del club. **Decisione tecnica presa con l'utente in fase di richiesta**: nuova pagina dedicata `/vista-allenatore` — **non** integrata in `/i-miei-gruppi` (Story 9.15, resta invariata per la gestione assegnazione Atlete). **Riuso diretto** del componente `GruppoCard` e della funzione `categorizzaStatoCertificato`, entrambi già esistenti in `app/(amministrazione)/vista-dirigente/` — stesso pattern di cross-import già stabilito in questo progetto (`conferma-certificati/page.tsx`, Story 9.23/9.25, importa già `categorizzaStatoCertificato` da quel modulo per lo stesso motivo). **Nessuna restrizione granulare** tipo `GruppoVisibileDirigente` (Story 5.2) si applica qui: un Allenatore ha già accesso pieno ai certificati delle Atlete dei propri Gruppi (policy RLS `allenatore_tutte_atlete_select`/`allenatore_proprie_atlete_certificato_select`, Story 9.12/9.15/9.19) — `conteggi` non sarà quindi **mai** `null` in questa pagina, il ramo "fuori dai permessi configurati" di `GruppoCard` semplicemente non si attiva mai qui. **Nessuna modifica a `GruppoCard.tsx`/`categorizza-stato-certificato.ts`** — riusati byte-per-byte invariati.

## Acceptance Criteria

1. **Given** un Allenatore agganciato al proprio profilo **When** visita `/vista-allenatore` **Then** vede una card per ciascun proprio Gruppo (stagione corrente) con i conteggi in regola/in scadenza/scaduto delle proprie Atlete, stesso drill-down cliccabile già esistente in `/vista-dirigente`
2. **Given** un Allenatore che non gestisce ancora nessun Gruppo **When** visita la pagina **Then** vede un messaggio esplicito, nessun errore
3. **Given** un Utente con un Ruolo diverso da ALLENATORE **When** tenta di visitare `/vista-allenatore` **Then** l'operazione viene rifiutata (route-guard, stesso pattern di ogni altra rotta a Ruolo singolo)
4. **And** nessuna regressione su `/vista-dirigente` né su `/i-miei-gruppi` (entrambe invariate) — suite Vitest invariata sui casi esistenti non impattati

## Tasks / Subtasks

- [x] Task 1: Route-guard (AC: #3)
  - [x] Nuova voce `/vista-allenatore` (`ruoliAmmessi: ["ALLENATORE"]`, stessa `navLabel` di `/vista-dirigente`)
  - [x] 2 nuovi test in `route-guard.test.ts` (ALLENATORE allow, ADMIN/DIRIGENTE redirect)
  - [x] `voci-navigazione.test.ts`: nessuna modifica necessaria, verificato che i test esistenti restino verdi
- [x] Task 2: Nuova pagina `/vista-allenatore` (AC: #1, #2)
  - [x] Nuova cartella `app/(gruppi-allenatori)/vista-allenatore/page.tsx`, `force-dynamic`
  - [x] Risoluzione Allenatore identica a `i-miei-gruppi/page.tsx` (stesso messaggio se non collegato)
  - [x] `annoCorrente` via `trovaAnnoAgonisticoCorrente()` (sola lettura)
  - [x] Query Gruppi propri con `include` Slot/Campo/Palestra (per `GruppoCard`)
  - [x] `Promise.all` per `gruppoAtleteRows`/`elencaAtlete`/`elencaCertificati` — nessuna query `gruppoVisibileDirigente`
  - [x] Stesso ciclo di calcolo conteggi/drill-down di `vista-dirigente/page.tsx`, `conteggi` sempre calcolato (mai `null`)
  - [x] `GruppoCard`/`categorizzaStatoCertificato`/`.lista` importati cross-modulo da `vista-dirigente/`, nessuna copia
- [x] Task 3: Verifica regressione (AC: #4)
  - [x] Suite Vitest completa: 804/804 test passati (+2 nuovi)
  - [x] `npx tsc --noEmit` pulito (0 errori); ESLint pulito su tutti i file
  - [x] Confermato: nessuna modifica a `/vista-dirigente`/`/i-miei-gruppi`
  - [x] Nessun test di rendering per la nuova pagina (convenzione già stabilita)

### Review Findings

- [x] [Review][Patch] Nessun Anno Agonistico corrente (`annoCorrente === null`) veniva confuso con "l'Allenatore non gestisce nessun Gruppo" — entrambi collassavano nello stesso messaggio "Non gestisci ancora nessun Gruppo.", fattualmente impreciso nel primo caso (a differenza di `vista-dirigente/page.tsx`, che distingue esplicitamente i due casi). Questo forzava anche un'asserzione non-null (`annoCorrente!.id`) tenuta in piedi solo da un controllo su una variabile diversa (`gruppiPropri.length`), senza che TypeScript potesse verificarlo. [app/(gruppi-allenatori)/vista-allenatore/page.tsx] — risolto: aggiunto un `if (!annoCorrente) return ...` esplicito con lo stesso messaggio di `vista-dirigente/page.tsx` ("Nessun Anno Agonistico corrente..."), prima della query dei Gruppi — il narrowing di TypeScript elimina anche il bisogno dell'asserzione `!`.
- [x] [Review][Patch] `GIORNO_BREVE` e il template di formattazione dello slot erano duplicati identici in due file (`vista-dirigente/page.tsx` e il nuovo `vista-allenatore/page.tsx`) — stesso principio di estrazione già seguito in questo progetto quando la stessa logica serve in ≥2 punti (Story 9.19, `calcolaAtleteConCertificatoInScadenza`). [app/(amministrazione)/vista-dirigente/page.tsx, app/(gruppi-allenatori)/vista-allenatore/page.tsx] — risolto: estratta in nuova utility pura condivisa `lib/formatta-slot-orario.ts` (2 test), riusata da entrambe le pagine — nessun cambio di comportamento osservabile.
- [x] [Review][Defer] `supabase.auth.getUser()` in errore viene solo loggato, poi trattato come "nessuna sessione" — un Utente con una sessione realmente autenticata ma un errore transitorio vedrebbe il messaggio "account non collegato a un profilo Allenatore" invece di un errore distinto. Pattern preesistente identico già presente in `i-miei-gruppi/page.tsx` (Story 9.15), replicato qui deliberatamente per coerenza (vedi Dev Notes "stesso pattern esatto"), non introdotto da questa storia.
- [x] [Review][Defer] Nessun test dedicato alla logica di scoping/aggregazione della pagina (solo `route-guard` è testato) — coerente con la convenzione "nessun test di rendering" già stabilita nel progetto per le pagine, `vista-dirigente/page.tsx` stessa non ha mai avuto un test dedicato.
- [x] [Review][Defer] `.filter()` dentro `.map()` per associare Atlete a Gruppo (O(gruppi × atlete) invece di una `Map` pre-raggruppata) — stesso pattern identico già presente invariato in `vista-dirigente/page.tsx`, scala ridotta (poche decine di Atlete per Gruppo).
- [x] [Review][Defer] Cast `as string | null`/`as StatoCertificato | null` sui campi di `certificato` — stesso pattern identico già presente in `vista-dirigente/page.tsx`, non introdotto da questa storia.
- [x] [Review][Dismiss] `certificatoPerAtletaId` (una `Map` per `atletaId`) sovrascriverebbe silenziosamente in caso di Certificati duplicati per la stessa Atleta — verificato falso: `CertificatoMedico.atletaId` è univoco per costruzione (Story 1.7, "un solo Certificato corrente per Atleta"), nessun duplicato possibile.
- [x] [Review][Dismiss] Un Certificato nascosto da una policy RLS (non da `GruppoVisibileDirigente`, che non si applica qui) verrebbe letto come "senza certificato" invece che segnalato come "fuori permessi" — scenario puramente teorico (bug ipotetico di una policy RLS), l'assunzione "un Allenatore ha già accesso pieno ai certificati dei propri Gruppi" è una decisione architetturale esplicita già validata in fase di creazione storia, non un gap di questo diff.
- [x] [Review][Dismiss] Due voci di navigazione con la stessa etichetta "Vista d'insieme" per un Utente con entrambi i Ruoli ALLENATORE e DIRIGENTE — caso limite già esplicitamente accettato e documentato nella storia stessa (Task 1) e nel commento in `route-guard.ts`.
- [x] [Review][Dismiss] `numeroAtlete` potrebbe gonfiarsi con righe `GruppoAtleta` duplicate — verificato falso: `@@unique([atletaId, annoAgonisticoId])` sullo schema impedisce più righe per la stessa Atleta nella stessa stagione, indipendentemente dal Gruppo.
- [x] [Review][Dismiss] Nessuna verifica che la voce di navigazione sia effettivamente raggiungibile/derivata correttamente — meccanismo generico (`filtraVociNavigazione`/`PROTECTED_ROUTES`) già ampiamente testato altrove nel progetto (Story 8.1/9.10/9.24), non specifico di questa storia.
- [x] [Review][Dismiss] Rischio di collisione di prefissi tra rotte — speculativo, nessuna collisione reale esiste tra `/vista-allenatore` e le rotte esistenti, il matching a prefisso è già testato estensivamente altrove.

## Dev Notes

- **Perimetro esatto**: 1 nuova voce in `lib/auth/route-guard.ts` (+ 1 test), nuova cartella `app/(gruppi-allenatori)/vista-allenatore/page.tsx`. Nessuna migrazione, nessuna nuova Server Action, nessuna nuova funzione pura, nessun file CSS nuovo (riuso cross-modulo di `vista-dirigente.module.css` e del componente `GruppoCard.tsx`).
- **Perché il riuso cross-modulo è già un pattern accettato**: `app/(certificati-medici)/conferma-certificati/page.tsx` (Story 9.23) importa già `categorizzaStatoCertificato` da `@/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato` — questa storia estende lo stesso principio a `GruppoCard.tsx` (componente puramente presentazionale, nessuna mutazione, nessun accoppiamento specifico al Ruolo DIRIGENTE se non nel ramo `conteggi === null`, che qui non si attiva mai).
- **`GruppoCard` non necessita ALCUNA modifica**: accetta già `conteggi: {...} | null` — per questa storia sarà sempre l'oggetto calcolato (mai `null`), il ramo "Fuori dai permessi configurati" resta morto codice per questa pagina ma non causa danno (non è mai raggiunto). Non aggiungere logica per "nascondere" quel ramo: non necessario, non richiesto da alcun AC.
- **Pattern di risoluzione Allenatore identico a `/i-miei-gruppi`**: stesso blocco `prisma.allenatore.findFirst` + messaggio "non ancora collegato" — copiare quel pattern esatto, non reinventarlo.
- **Nessuna restrizione `GruppoVisibileDirigente`**: quella tabella/quel concetto (Story 5.2) è specifico del Ruolo DIRIGENTE e dei permessi granulari sui dati sanitari per Dirigente — non ha alcun significato per un Allenatore che vede sempre e solo i propri Gruppi (accesso già naturalmente scoped dall'assegnazione `GruppoAllenatore`). Non introdurre alcuna query/verifica analoga qui.
- **Route group `(gruppi-allenatori)`, non `(amministrazione)`**: questa è una pagina self-service Allenatore (AD-2, stesso principio di `/i-miei-gruppi`, `/mio-orario`, `/il-mio-profilo`) — pur riusando componenti dal modulo `(amministrazione)`, la pagina stessa appartiene al modulo dell'Allenatore.
- **File NON da toccare**: `app/(amministrazione)/vista-dirigente/page.tsx`, `GruppoCard.tsx`, `categorizza-stato-certificato.ts`, `vista-dirigente.module.css` (riusati invariati, solo importati), `app/(gruppi-allenatori)/i-miei-gruppi/*` (pagina distinta, resta come oggi).

### Project Structure Notes

- File nuovi: `app/(gruppi-allenatori)/vista-allenatore/page.tsx`.
- File modificati: `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`.
- Nessun file eliminato, nessuna migrazione, nessun nuovo file CSS.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.26: Vista d'insieme per l'Allenatore sui propri Gruppi]
- [Source: app/(amministrazione)/vista-dirigente/page.tsx — struttura completa da replicare (query, ciclo di calcolo conteggi/drill-down, righe 25-189), da NON modificare, solo da leggere come riferimento]
- [Source: app/(amministrazione)/vista-dirigente/GruppoCard.tsx — componente da riusare invariato via import cross-modulo]
- [Source: app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts — funzione da riusare invariata]
- [Source: app/(gruppi-allenatori)/i-miei-gruppi/page.tsx — pattern di risoluzione Allenatore/Gruppi propri da replicare (righe 17-59)]
- [Source: lib/auth/route-guard.ts riga 88 — voce /vista-dirigente esistente, pattern da replicare per /vista-allenatore]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

### Completion Notes List

- Task 1: nuova voce `/vista-allenatore` (ALLENATORE-only) in `PROTECTED_ROUTES`, stessa `navLabel` di `/vista-dirigente`. 2 nuovi test.
- Task 2: nuova pagina `app/(gruppi-allenatori)/vista-allenatore/page.tsx` — risoluzione Allenatore identica a `i-miei-gruppi/page.tsx`, query Gruppi propri con `include` Slot/Campo/Palestra, stesso ciclo di calcolo conteggi/drill-down di `vista-dirigente/page.tsx` (incluso il `console.warn` difensivo). `GruppoCard`/`categorizzaStatoCertificato`/`.lista` riusati invariati via import cross-modulo — zero modifiche a `vista-dirigente/*`.
- Task 3: 804/804 test passati (+2 nuovi), `tsc --noEmit` pulito, ESLint pulito. Nessuna modifica a `/vista-dirigente`/`/i-miei-gruppi`.
- Code review (2026-08-02): Blind Hunter + Edge Case Hunter + Acceptance Auditor — 0 decision-needed, 2 patch applicati (caso "nessun Anno Agonistico corrente" distinto da "nessun Gruppo assegnato" con messaggio esplicito dedicato, come in `vista-dirigente/page.tsx`, eliminando anche un'asserzione non-null non sicura; `GIORNO_BREVE`/formattazione slot duplicati in due file estratti in una nuova utility pura condivisa `lib/formatta-slot-orario.ts`, riusata anche da `vista-dirigente/page.tsx` — stesso principio di estrazione già seguito in Story 9.19). 4 defer (gestione errore `getUser()` — pattern preesistente replicato deliberatamente, nessun test dedicato alla logica della pagina — convenzione, filter-in-map O(gruppi×atlete) — pattern preesistente, cast di tipo sui campi certificato — pattern preesistente), 5 scartati come falsi positivi verificati (Map certificatoPerAtletaId sicura per vincolo univoco su schema, scenario RLS ipotetico fuori scope, doppia etichetta nav già accettata esplicitamente, numeroAtlete protetto da vincolo univoco su schema, raggiungibilità nav già garantita dal meccanismo generico testato altrove). 806/806 test passati, 0 errori tsc/eslint dopo i fix.

### File List

- `lib/auth/route-guard.ts` (modificato — nuova voce `/vista-allenatore`)
- `lib/auth/route-guard.test.ts` (modificato — 2 nuovi test)
- `app/(gruppi-allenatori)/vista-allenatore/page.tsx` (nuovo — messaggio "nessun Anno Agonistico" e riuso di `formattaSlotOrario` aggiunti in review)
- `lib/formatta-slot-orario.ts` (nuovo, in review — estrazione condivisa)
- `lib/formatta-slot-orario.test.ts` (nuovo, in review)
- `app/(amministrazione)/vista-dirigente/page.tsx` (modificato in review — riusa `formattaSlotOrario` invece della duplicazione locale, nessun cambio di comportamento)

## Change Log

- 2026-08-02: Implementata Story 9.26 — nuova pagina `/vista-allenatore` (ALLENATORE-only), specchio di `/vista-dirigente` scoped ai propri Gruppi. Riuso diretto di `GruppoCard`/`categorizzaStatoCertificato`, nessuna modifica a quei file. Nessuna restrizione granulare tipo `GruppoVisibileDirigente` (non applicabile). 804/804 test passati, 0 errori tsc/eslint.
- 2026-08-02: Code review completata — 2 patch applicati (messaggio distinto per "nessun Anno Agonistico corrente" + rimozione asserzione non-null; estrazione di `formattaSlotOrario` condivisa, riusata anche da `vista-dirigente/page.tsx`), 4 defer, 5 scartati come falsi positivi verificati. 806/806 test passati, 0 errori tsc/eslint dopo i fix. Status: done.
