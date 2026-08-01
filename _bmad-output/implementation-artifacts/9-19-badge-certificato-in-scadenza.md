---
baseline_commit: ec718f3f76907f81233eb4fc95916b40bb77c033
---

# Story 9.19: Badge "certificato in scadenza" nell'elenco Atlete di Gruppo e in Vista Dirigente

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore, Admin/Dirigente,
I want vedere subito quali Atlete di un Gruppo hanno il certificato medico in scadenza entro un mese, ovunque sia mostrato l'elenco delle Atlete del Gruppo (o un suo riepilogo aggregato),
so that posso sollecitare per tempo il rinnovo senza dover controllare atleta per atleta.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-31), emersa durante la review di Story 9.17. **Perimetro deciso con l'utente**: solo `/gruppi` (Admin/Dirigente), `/i-miei-gruppi` (Allenatore, Story 9.15) e `/vista-dirigente` (Story 5.1/5.2) — escluse deliberatamente le altre pagine che citano nomi di Atlete (`/presenze`, `/dati-fisici`, `/conferma-iscrizioni`, `/conferma-certificati`, `/storico-presenze`).

**Decisione presa con l'utente in fase di creazione storia (2026-08-01)**: il badge richiede che il certificato sia **CONFERMATO** — stessa regola già applicata da `categorizzaStatoCertificato` (Story 5.1) in `/vista-dirigente`. Un certificato ri-caricato ma non ancora confermato dalla Segreteria (`IN_ATTESA`, Story 4.4) **non** mostra il badge "in scadenza" anche se la vecchia `dataFineValidita` preesistente rientra nei 30 giorni. Questa storia **riusa direttamente `categorizzaStatoCertificato`** (nessuna nuova funzione di calcolo): "in scadenza" = `categorizzaStatoCertificato(dataFineValidita, stato, oggi) === "IN_SCADENZA"`. Con questa scelta `/gruppi`/`/i-miei-gruppi` e `/vista-dirigente` usano esattamente la stessa regola — nessuna divergenza tra le pagine.

**Nota — richiesta correlata ma fuori scope**: durante questa stessa conversazione l'utente ha descritto un cambiamento al flusso di *caricamento* del certificato (campo data già in fase di upload lato Genitore/Atleta, con conferma Dirigente/Admin che resta un passaggio separato) — registrato come **Story 9.20** (backlog, `epics.md`), esplicitamente **non** parte di questa storia. Non toccare `caricaCertificato`/`collegaFileCertificato` (Story 4.1) in questa storia.

## Acceptance Criteria

1. **Given** un Allenatore o un Admin/Dirigente sulla pagina `/i-miei-gruppi` o `/gruppi` **When** visualizza l'elenco delle Atlete assegnate a un Gruppo **Then** ogni Atleta con il certificato medico **confermato** (`stato === "CONFERMATO"`) che scade tra 0 e 30 giorni da oggi mostra un badge "Certificato in scadenza" accanto al nome (stesso stile del badge "Certificato scaduto" già esistente in `/presenze`, variante warning — non danger)
2. **Given** un'Atleta senza certificato, con certificato scaduto, con certificato in regola (oltre 30 giorni), o con certificato non ancora confermato (`IN_ATTESA`) anche se la data rientrerebbe nei 30 giorni **When** visualizzata nello stesso elenco **Then** nessun badge "in scadenza" viene mostrato (un'Atleta con certificato scaduto mostra al più il badge "scaduto" già esistente altrove, non "in scadenza" — stati incompatibili per costruzione di `categorizzaStatoCertificato`)
3. **Given** un Dirigente sulla pagina `/vista-dirigente` **When** visualizza la card di un Gruppo con almeno un'Atleta "in scadenza" **Then** lo stat-tile "in scadenza" diventa cliccabile/espandibile e mostra i nomi delle Atlete in scadenza, stesso identico pattern del drill-down "scaduto" già esistente (Story 5.1 AC #6) — espandere un bucket richiude l'altro se già aperto (un solo drill-down visibile alla volta, stesso principio di un singolo stato locale)
4. **And** nessuna regressione sul comportamento esistente di `/gruppi`, `/i-miei-gruppi`, `/vista-dirigente` (Story 2.4/9.9/9.14/9.15/5.1/5.2) — suite Vitest invariata sui casi esistenti, incluso il comportamento per un Dirigente con visibilità ristretta (`gruppi_visibili_dirigente`, Story 5.2): un Gruppo fuori dai permessi configurati continua a mostrare "Fuori dai permessi configurati" invece di conteggi/badge (nessun dato falso)

## Tasks / Subtasks

- [x] Task 1: Estendere `AtletaAssegnata.tsx` col badge condiviso (AC: #1, #2)
  - [x] `app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx`: estendere il tipo esportato `Atleta` con `certificatoInScadenza: boolean`.
  - [x] Rendere il badge nel `<li>`, subito dopo `<span>{atleta.nome}</span>`, solo se `atleta.certificatoInScadenza` è `true` — stesso testo "Certificato in scadenza" (AC #1), nessun `aria-live`/`role="alert"` (informativo, non un annuncio dinamico — stesso principio già documentato per il badge "scaduto" in `PresenzeForm.tsx`).
  - [x] Nuova classe `.badge` in `app/(gruppi-allenatori)/gruppi/gruppi.module.css` — stesso stile warning di `app/(presenze)/presenze/presenze.module.css` (righe 139-152: `background: var(--color-warning-bg)`, `color: var(--color-warning)`, mai danger); `margin-left: auto` deliberatamente omesso rispetto all'originale, il badge qui non è l'ultimo elemento della riga (segue un `<form>`), l'auto-margin avrebbe spinto anche il form all'estrema destra.
  - [x] Una sola modifica copre sia `/gruppi` (`GruppoRow.tsx`) sia `/i-miei-gruppi` (`MioGruppoCard.tsx`) — entrambi riusano `AtletaAssegnata.tsx` invariato per il resto.
- [x] Task 2: Calcolare `certificatoInScadenza` in `/gruppi` (AC: #1, #2, #4)
  - [x] `app/(gruppi-allenatori)/gruppi/page.tsx`: aggiunta `elencaCertificati(supabase)` (già esistente in `lib/db-rls/certificato-medico.ts`, nessuna modifica alla funzione) al `Promise.all` esistente.
  - [x] Importata `categorizzaStatoCertificato` da `app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts` (cross-modulo, stesso pattern di riuso già stabilito per `calcolaGiorniAScadenza`/`parseDataItaliana` in Epic 9/10 — nessuna nuova funzione scritta).
  - [x] Costruita una `Map<atletaId, certificato>` dai risultati di `elencaCertificati` (stesso pattern già usato in `vista-dirigente/page.tsx`).
  - [x] `certificatoInScadenza` calcolato **una sola volta per l'intero elenco Atlete** (`atleteMinime`, non solo per il roster assegnato al Gruppo) con un `oggi = new Date()` unico per il render — coerente sia in `atleteGruppo` (roster, mostra il badge tramite `AtletaAssegnata`) sia nel dropdown `atleteDisponibili` (campo presente sul tipo ma non renderizzato lì, innocuo).
  - [x] `atleteMinime` estesa da `{id, nome}` a `{id, nome, certificatoInScadenza}` — propagato al type predicate del `.filter()` che costruisce `atleteGruppo`.
- [x] Task 3: Calcolare `certificatoInScadenza` in `/i-miei-gruppi` (AC: #1, #2, #4)
  - [x] `app/(gruppi-allenatori)/i-miei-gruppi/page.tsx`: stessa aggiunta di Task 2 (`elencaCertificati(supabase)` nel `Promise.all` esistente, stessa `categorizzaStatoCertificato`, stesso calcolo su `atleteMinime`).
  - [x] Nessun filtro per Gruppo aggiunto sul calcolo — confermato in Task 5 che la policy RLS `allenatore_proprie_atlete_certificato_select` è già scoped al Gruppo dell'Allenatore, `elencaCertificati` non richiede scoping applicativo aggiuntivo qui.
- [x] Task 4: Drill-down "in scadenza" in `/vista-dirigente` (AC: #3, #4)
  - [x] `app/(amministrazione)/vista-dirigente/page.tsx`: `GruppoCardData` estesa con `atleteInScadenza: string[]`, popolato nello stesso ciclo `for (const atletaId of atleteIdDelGruppo)` esistente quando `stato === "IN_SCADENZA"` — stessa risoluzione nome/`console.warn` difensivo già presente per `atleteScadute`, stesso `.sort((a, b) => a.localeCompare(b))` finale.
  - [x] Ramo Dirigente-escluso (Gruppo fuori da `gruppi_visibili_dirigente`): aggiunto `atleteInScadenza: []` all'oggetto restituito, coerente con `atleteScadute: []` già presente.
  - [x] `app/(amministrazione)/vista-dirigente/GruppoCard.tsx`: `GruppoCardData` (tipo esportato) estesa con `atleteInScadenza: string[]`. Stato locale sostituito da `useState<"scaduto" | "scadenza" | null>(null)` — un solo bucket espanso alla volta (AC #3), toggle chiude il bucket se già aperto.
  - [x] Il tile "in scadenza" (prima un `<div>` non cliccabile) è ora un `<button>` identico nella struttura al tile "scaduto": `haInScadenza = gruppo.atleteInScadenza.length > 0`, `onClick`/`disabled`/`aria-expanded`/`aria-controls` con un secondo `drillDownScadenzaId`.
  - [x] Blocco `drillDown` reso condizionale sul bucket attivo: `espanso === "scadenza" && haInScadenza` (nuovo, titolo "Certificato in scadenza:") ed `espanso === "scaduto" && haScadute` (esistente, aggiornato all'ID separato) — stessa `styles.drillDown`/`drillDownLista`, nessuna nuova classe CSS necessaria.
- [x] Task 5: Verifica RLS (AC: #1, #4)
  - [x] `elencaCertificati(supabase)` già chiamata da `/vista-dirigente` oggi — nessuna nuova policy SELECT necessaria lì.
  - [x] Verificate le tre migrazioni (`20260717090000_add_certificato_medico`, `20260722000000_certificati_allenatore_select`, `20260724000000_dirigente_certificati_scoped_select`): `admin_segreteria_select` (ADMIN/SEGRETERIA, ampio), `dirigente_select_scoped` (DIRIGENTE, scoped a `gruppi_visibili_dirigente`), `allenatore_proprie_atlete_certificato_select` (ALLENATORE, scoped al proprio Gruppo tramite `allenatore_possiede_atleta`) — **coprono già tutti e quattro i Ruoli che accedono a `/gruppi`/`/i-miei-gruppi`**. Nessuna nuova migrazione necessaria, confermato leggendo le policy (non assunto per analogia, come richiesto dalla lezione di Story 9.18).
  - [x] Confermato inoltre che `/gruppi`/`/i-miei-gruppi` non chiamano `requireRuolo` a livello pagina (route-gating via middleware, non per-pagina) — i quattro Ruoli sopra sono esattamente quelli già ammessi dalle Server Action esistenti in `gruppi/actions.ts`.
- [x] Task 6: Verifica manuale e suite (AC: #1-#4)
  - [x] Suite Vitest completa eseguita: 778/778 test passati, nessuna regressione (nessuna Server Action toccata, nessuna firma di funzione pura esistente cambiata).
  - [x] Nessun nuovo test di rendering aggiunto per `page.tsx`/`GruppoCard.tsx`/`AtletaAssegnata.tsx`/`MioGruppoCard.tsx`/`GruppoRow.tsx` — coerente con la convenzione già stabilita nel progetto (Story 9.9/9.14/9.18). Nessuna nuova funzione pura né Server Action introdotta (riuso di `categorizzaStatoCertificato`, già coperta da `categorizza-stato-certificato.test.ts`, Story 5.1) — nessun nuovo file di test necessario.
  - [x] `npx tsc --noEmit` pulito su tutto il progetto. ESLint pulito sui 5 file toccati.
  - [x] Verifica manuale dal vivo: non eseguibile in questa sessione (nessuna istanza Supabase locale disponibile) — stesso limite già incontrato in Story 9.6/9.12/9.13/9.15, coperta qui da tsc/ESLint/suite Vitest sopra; da confermare con l'utente dopo il deploy: un'Atleta con certificato CONFERMATO e `dataFineValidita` entro 30 giorni mostra il badge in `/gruppi` e `/i-miei-gruppi`; lo stesso Gruppo in `/vista-dirigente` mostra il drill-down "in scadenza" cliccabile, un solo bucket espanso alla volta.

### Review Findings

- [x] [Review][Decision] Mutua esclusione dei due drill-down in `GruppoCard.tsx` non confermata con l'utente — **risolto**: l'utente ha confermato esplicitamente (2026-08-01) di voler mantenere la mutua esclusione così com'è implementata (un solo elenco di nomi visibile alla volta). Nessuna modifica al codice. [app/(amministrazione)/vista-dirigente/GruppoCard.tsx:32]
- [x] [Review][Patch] Logica di join certificato→stato duplicata in 3 file (Map + cast + `categorizzaStatoCertificato`) — **risolto**: estratto nuovo helper condiviso `lib/certificato-in-scadenza-per-atleta.ts` (`calcolaAtleteConCertificatoInScadenza`, 5 nuovi test), riusato da `gruppi/page.tsx` e `i-miei-gruppi/page.tsx` (le due copie identiche introdotte da questa storia). `vista-dirigente/page.tsx` non toccato: la sua costruzione della Map è strutturalmente diversa (serve i 4 bucket completi, non solo il booleano "in scadenza"), preesisteva a questa storia e non era stata duplicata da questo diff. [lib/certificato-in-scadenza-per-atleta.ts, app/(gruppi-allenatori)/gruppi/page.tsx, app/(gruppi-allenatori)/i-miei-gruppi/page.tsx]
- [x] [Review][Defer] Cast non verificati su `certificato.dataFineValidita`/`stato` da `elencaCertificati` (client Supabase non tipizzato) — deferred, pre-esistente (stesso pattern già presente in `vista-dirigente/page.tsx` prima di questa storia), ora replicato in 2 nuovi punti. [app/(gruppi-allenatori)/gruppi/page.tsx:79-80, app/(gruppi-allenatori)/i-miei-gruppi/page.tsx:93-94]
- [x] [Review][Defer] `aria-controls` punta a un id che non esiste nel DOM quando il drill-down è chiuso — deferred, pre-esistente (stesso pattern già presente sul tile "scaduto" prima di questa storia), ora duplicato anche sul tile "in scadenza". [app/(amministrazione)/vista-dirigente/GruppoCard.tsx:74-75,85-86]
- [x] [Review][Defer] Nessuno stile `:disabled` (opacità/dimming) su `.statTile` — deferred, gap pre-esistente (nessuna regola `:disabled` in `vista-dirigente.module.css` prima di questa storia), ora presente anche sul nuovo pulsante "in scadenza" quando il conteggio è 0. [app/(amministrazione)/vista-dirigente/vista-dirigente.module.css:69-90]
- [x] [Review][Defer] Fallback "Atleta sconosciuta" silenzioso (solo `console.warn`) esteso a un secondo bucket — deferred, pre-esistente (stesso pattern già usato per `atleteScadute`), ora replicato per `atleteInScadenza`. [app/(amministrazione)/vista-dirigente/page.tsx:140-150]

## Dev Notes

- **Perché nessuna nuova funzione di calcolo**: il progetto ha già tre implementazioni della soglia "30 giorni alla scadenza" cross-modulo (`calcolaGiorniAScadenza` → `categorizzaStatoCertificato` → `certificato-scaduto.ts`/`stato-certificato-visualizzato.ts`). La decisione presa con l'utente (badge legato a `CONFERMATO`) fa coincidere esattamente la regola di questa storia con `categorizzaStatoCertificato === "IN_SCADENZA"`, già scritta e già testata (Story 5.1) — riusarla direttamente, importata cross-modulo da `(amministrazione)` in `(gruppi-allenatori)`, è coerente con il pattern già stabilito nel progetto (es. `lib/link-naviga-palestra.ts` riusato da 3 moduli, `parseDataItaliana` estratta ed estesa in Epic 10).
- **`AtletaAssegnata.tsx` è il punto di leva**: è già condiviso invariato tra `/gruppi` (`GruppoRow.tsx`) e `/i-miei-gruppi` (`MioGruppoCard.tsx`) dalla Story 9.15 — estendere il suo tipo `Atleta` con un campo booleano copre entrambe le pagine con una sola modifica al componente, più una modifica per pagina solo per popolare il dato (Task 2/3).
- **Nessuna delle due pagine legge oggi `CertificatoMedico`**: sia `gruppi/page.tsx` sia `i-miei-gruppi/page.tsx` oggi fanno `Promise.all` solo su `Gruppo`/`Allenatore`/`Atleta`(RLS)/`GruppoAtleta` — mai un `include` Prisma diretto su `certificati_medici` (AD-4/AD-9: `CertificatoMedico` è RLS-protetta, letta solo tramite `elencaCertificati(supabase)`, mai Prisma diretto). Stesso identico pattern di join-in-memoria già usato in `presenze/page.tsx`/`vista-dirigente/page.tsx`.
- **`vista-dirigente/page.tsx` già categorizza ogni Atleta con `categorizzaStatoCertificato`** nello stesso ciclo che oggi produce `conteggi`/`atleteScadute` (righe 120-141) — `atleteInScadenza` è un array parallelo popolato nello stesso ciclo, zero nuove query.
- **Un solo bucket espanso alla volta in `GruppoCard.tsx`**: lo stato locale passa da `boolean` a un discriminante a tre valori (`"scaduto" | "scadenza" | null`) — decisione esplicita nell'AC #3 per evitare due drill-down aperti contemporaneamente che allungherebbero la card in modo scomodo su schermi stretti (nessun precedente contrario nel progetto).
- **RLS — lezione critica da Story 9.18, ma non direttamente applicabile qui**: la Story 9.18 ha scoperto in code review che un nuovo *scrittore* (Allenatore che chiama una Server Action INSERT) può fallire silenziosamente se manca la policy RLS corrispondente, mascherato da un catch generico e invisibile alla suite (mock). Questa storia è invece una **lettura** (`elencaCertificati`, già esistente e già usata da `/vista-dirigente` per Admin/Dirigente) estesa a due nuove pagine per gli **stessi** Ruoli che già hanno una policy SELECT dedicata su `certificati_medici` (`admin_segreteria_select`, `dirigente_select_scoped`, `allenatore_proprie_atlete_certificato_select`) — il rischio è strutturalmente più basso, ma **va comunque confermato leggendo le tre policy prima di dare per scontato che bastino** (Task 5), non assunto per analogia.
- **`allenatore_proprie_atlete_certificato_select` è già scoped al Gruppo dell'Allenatore** (tramite `allenatore_possiede_atleta`, la stessa funzione usata per la policy SELECT su `atlete` pre-Story 9.15) — **non** la nuova policy ampia `allenatore_tutte_atlete_select` (Story 9.15, quella riguarda solo la tabella `atlete`, non `certificati_medici`). Risultato pratico: in `/i-miei-gruppi`, `elencaCertificati` restituisce solo i Certificati delle Atlete effettivamente nei Gruppi dell'Allenatore — esattamente il sottoinsieme che questa pagina mostra (roster assegnato + dropdown "disponibili", che può includere Atlete di *altri* Gruppi grazie alla Story 9.15: per quelle il Certificato non sarà nella Map, `certificatoInScadenza` risulterà `false` di default, innocuo perché il dropdown non renderizza il badge).
- **`/gruppi` con Dirigente a visibilità ristretta**: `dirigente_select_scoped` filtra già `certificati_medici` per Gruppo visibile (stessa funzione `dirigente_vede_certificato_atleta` di Story 5.2) — un Dirigente ristretto che apre `/gruppi` (a differenza di `/vista-dirigente`, che mostra esplicitamente "Fuori dai permessi configurati") vedrà semplicemente **nessun badge** per le Atlete dei Gruppi fuori dal proprio perimetro, invece di un messaggio esplicito di esclusione. Non è una fuga di dati (RLS filtra correttamente, nessun errore) ed è un comportamento preesistente per qualunque dato RLS-protetto su quella pagina (oggi `/gruppi` non mostra affatto stato-certificato) — **accettato così, non un AC di questa storia**: `/gruppi` non ha mai avuto (né questa storia introduce) la stessa consapevolezza di scoping esplicita di `/vista-dirigente`. Non tentare di replicare qui il messaggio "Fuori dai permessi configurati" (fuori scope, nessun AC lo richiede).
- **File NON da toccare**: `certificato-scaduto.ts`/`PresenzeForm.tsx`/`presenze.module.css` (badge "scaduto" esistente, solo riferimento di stile — copiare il blocco CSS, non importarlo cross-modulo), `calcolaGiorniAScadenza`/`stato-certificato-visualizzato.ts` (altri due riusi esistenti, invariati), `caricaCertificato`/`collegaFileCertificato`/`confermaCertificato` (Story 4.1/4.4 — la richiesta correlata dell'utente su questi file è **Story 9.20**, backlog separato), `creaEAssegnaAtleta`/`assegnaAtleta`/`rimuoviAtleta` (Story 9.14/9.15/9.18, invariate).

### Project Structure Notes

- Nessun file nuovo previsto (solo estensioni di file esistenti) salvo l'eventuale nuova migrazione RLS se Task 5 rivelasse un gap (da confermare, non assunto).
- File modificati attesi: `app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx`, `app/(gruppi-allenatori)/gruppi/gruppi.module.css`, `app/(gruppi-allenatori)/gruppi/page.tsx`, `app/(gruppi-allenatori)/i-miei-gruppi/page.tsx`, `app/(amministrazione)/vista-dirigente/page.tsx`, `app/(amministrazione)/vista-dirigente/GruppoCard.tsx`, `app/(amministrazione)/vista-dirigente/vista-dirigente.module.css` (se serve una regola dedicata per il secondo `<button>` — probabile riuso 1:1 delle classi `.statTile`/`.cliccabile`/`.drillDown*` esistenti, nessuna nuova classe attesa).
- Nessun nuovo modulo, nessuna nuova entità/colonna, nessun cambiamento ad AD esistenti (a differenza di Story 9.18/AD-10) — questa storia resta interamente dentro i confini già stabiliti di `(gruppi-allenatori)` e `(amministrazione)`, con un riuso cross-modulo di una funzione pura già esistente (pattern già consolidato nel progetto).

### References

- [Source: app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts — categorizzaStatoCertificato da riusare invariata]
- [Source: app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza.ts — funzione di base sottostante, invariata]
- [Source: app/(amministrazione)/vista-dirigente/page.tsx righe 82-161 — ciclo esistente da estendere con atleteInScadenza]
- [Source: app/(amministrazione)/vista-dirigente/GruppoCard.tsx — pattern esatto del drill-down "scaduto" da replicare per "in scadenza", stato locale da estendere a tre valori]
- [Source: app/(presenze)/presenze/certificato-scaduto.ts + PresenzeForm.tsx riga 57-59 + presenze.module.css righe 139-152 — stile badge warning di riferimento, da copiare non importare]
- [Source: app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx — componente condiviso da estendere, copre sia /gruppi sia /i-miei-gruppi]
- [Source: app/(gruppi-allenatori)/gruppi/page.tsx, app/(gruppi-allenatori)/i-miei-gruppi/page.tsx — pagine da estendere con elencaCertificati]
- [Source: lib/db-rls/certificato-medico.ts — elencaCertificati(supabase) esistente, invariata]
- [Source: prisma/migrations/20260717090000_add_certificato_medico, 20260722000000_certificati_allenatore_select, 20260724000000_dirigente_certificati_scoped_select — policy SELECT esistenti su certificati_medici da verificare (Task 5)]
- [Source: _bmad-output/implementation-artifacts/9-18-creazione-nuova-atleta-da-allenatore.md — lezione RLS su nuovi scrittori (Review Findings), qui non direttamente applicabile (lettura, non scrittura) ma da tenere presente]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.19 — Acceptance Criteria; #Story 9.20 — richiesta correlata registrata come backlog separato]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno — implementazione lineare, nessuna sorpresa rispetto ai Dev Notes scritti in fase di create-story (verifica RLS Task 5 ha confermato l'ipotesi già scritta, nessuna nuova migrazione necessaria).

### Completion Notes List

- **Badge condiviso**: `AtletaAssegnata.tsx` esteso col campo `certificatoInScadenza: boolean` sul tipo `Atleta` — un'unica modifica copre sia `/gruppi` sia `/i-miei-gruppi` (entrambi riusano il componente invariato per il resto, Story 9.15).
- **Regola "in scadenza"**: riusa direttamente `categorizzaStatoCertificato` (Story 5.1, `=== "IN_SCADENZA"`) — nessuna nuova funzione di calcolo, decisione presa esplicitamente con l'utente (badge richiede `CONFERMATO`, stessa regola di `/vista-dirigente`, nessuna divergenza tra le pagine).
- **`/gruppi` e `/i-miei-gruppi`**: entrambe estese con `elencaCertificati(supabase)` nel `Promise.all` esistente (mai Prisma diretto su `certificati_medici`, AD-4/AD-9), calcolo di `certificatoInScadenza` una sola volta per l'intero elenco Atlete (roster + dropdown "disponibili", coerente e innocuo in entrambi i punti).
- **`/vista-dirigente`**: nuovo bucket `atleteInScadenza` popolato nello stesso ciclo esistente che produce `conteggi`/`atleteScadute` (zero nuove query). `GruppoCard.tsx`: stato locale esteso da `boolean` a `"scaduto" | "scadenza" | null` — un solo drill-down espanso alla volta (AC #3), tile "in scadenza" ora un `<button>` con lo stesso pattern `aria-expanded`/`aria-controls` del tile "scaduto".
- **RLS (Task 5)**: verificate le tre policy SELECT esistenti su `certificati_medici` (`admin_segreteria_select`, `dirigente_select_scoped`, `allenatore_proprie_atlete_certificato_select`) — coprono già tutti i Ruoli che accedono a `/gruppi`/`/i-miei-gruppi` (ADMIN/SEGRETERIA/DIRIGENTE/ALLENATORE). Nessuna nuova migrazione necessaria (a differenza del gap critico scoperto in Story 9.18 per un nuovo *scrittore* — qui è una lettura, sui Ruoli già coperti).
- **Nessuna migrazione, nessuna nuova entità/colonna, nessun cambiamento ad AD esistenti** — storia interamente dentro i confini già stabiliti di `(gruppi-allenatori)` e `(amministrazione)`.
- **Story 9.20** (backlog, `epics.md`): registrata durante la creazione di questa storia per la richiesta correlata ma distinta dell'utente (campo data già in fase di upload del certificato) — non implementata qui.
- 783/783 test passati dopo la code review (5 nuovi test per l'helper estratto `calcolaAtleteConCertificatoInScadenza`; 778/778 all'implementazione iniziale, nessun nuovo test — nessuna nuova funzione pura/Server Action introdotta, convenzione "nessun test di rendering" già stabilita nel progetto), `npx tsc --noEmit` pulito su tutto il progetto, ESLint pulito su tutti i file toccati.
- **Code review**: 1 decision-needed risolta con l'utente (mutua esclusione dei due drill-down in `GruppoCard.tsx` confermata come voluta, nessuna modifica al codice), 1 patch applicata (estratto `lib/certificato-in-scadenza-per-atleta.ts` per eliminare la duplicazione identica tra `gruppi/page.tsx` e `i-miei-gruppi/page.tsx`), 4 defer (tutti pattern pre-esistenti replicati coerentemente, non introdotti da questa storia — vedi `deferred-work.md`), 6 scartati come falsi positivi/già deliberati in spec.

### File List

**Nuovi:**

- `lib/certificato-in-scadenza-per-atleta.ts`
- `lib/certificato-in-scadenza-per-atleta.test.ts`

**Modificati:**

- `app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx`
- `app/(gruppi-allenatori)/gruppi/gruppi.module.css`
- `app/(gruppi-allenatori)/gruppi/page.tsx`
- `app/(gruppi-allenatori)/i-miei-gruppi/page.tsx`
- `app/(amministrazione)/vista-dirigente/page.tsx`
- `app/(amministrazione)/vista-dirigente/GruppoCard.tsx`

## Change Log

- 2026-08-01: Implementata Story 9.19 — badge "Certificato in scadenza" (richiede stato CONFERMATO) su `/gruppi` e `/i-miei-gruppi` tramite `AtletaAssegnata.tsx` esteso; drill-down "in scadenza" su `/vista-dirigente` (`GruppoCard.tsx`, stato locale a tre valori, un solo bucket espanso alla volta). Riuso diretto di `categorizzaStatoCertificato` (Story 5.1), nessuna nuova funzione di calcolo. Verificate le policy RLS SELECT esistenti su `certificati_medici` — già sufficienti, nessuna nuova migrazione. 778/778 test passati, 0 errori tsc/eslint. Status: review.
- 2026-08-01: Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor, Acceptance Auditor: 0 violazioni) — 1 decision-needed risolta con l'utente (mutua esclusione dei drill-down confermata come voluta), 1 patch applicata (estratto helper condiviso `lib/certificato-in-scadenza-per-atleta.ts`, 5 nuovi test), 4 defer (pattern pre-esistenti, aggiunti a `deferred-work.md`), 6 scartati come falsi positivi/già deliberati in spec (perimetro badge "scaduto" escluso, campo `certificatoInScadenza` innocuo nel dropdown, import cross-modulo già precedentato, esperienza Dirigente-ristretto già accettata, convenzione "nessun test di rendering" già stabilita, Map con `atletaId` duplicato impossibile per vincolo UNIQUE DB). 783/783 test passati, 0 errori tsc/eslint. Status: done.
