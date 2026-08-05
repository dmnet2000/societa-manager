---
baseline_commit: fc435b9bca78230074fb3368c0fadec9f7a1a92b
---

# Story 15.4: Sezione "Accounting"

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin,
I want trovare le funzionalità amministrative sotto un'unica voce "Accounting" in fondo al menu,
so that la navigazione separa chiaramente le funzionalità operative quotidiane da quelle di configurazione/gestione riservate al mio Ruolo.

## Acceptance Criteria

1. **Given** un Admin **When** apre la navigazione **Then** vede "Accounting" come ultima voce (non più "Amministrazione"), che espansa mostra `/admin`, `/precaricamento-allenatori`, `/permessi-accesso`
2. **And** nessuna regressione sull'autorizzazione esistente delle tre rotte, incluso il meccanismo `permessiConfigurabili` di `/precaricamento-allenatori` (Epic 12) — se in futuro un altro Ruolo venisse abilitato su quella rotta, la vedrebbe comparire dentro "Accounting" espanso, senza ulteriori modifiche a questa storia
3. **And** `/permessi-certificati` (voce distinta, non menzionata nella richiesta originale) resta dov'è oggi, non spostata dentro "Accounting" — non assumere che vada inclusa solo perché tematicamente simile

## Tasks / Subtasks

- [x] Task 1: Valorizzare `gruppo: "Accounting"` e riposizionare le tre rotte in fondo all'array (AC: #1)
  - [x] `lib/auth/route-guard.ts`: aggiungere `gruppo: "Accounting"` a `/admin`, `/precaricamento-allenatori`, `/permessi-accesso` — **nessun'altra modifica** a `ruoliAmmessi`/`navLabel`/`prefix`/`permessiConfigurabili` (autorizzazione invariata, AC #2). **Non rinominare** `navLabel: "Amministrazione"` di `/admin` — l'etichetta visibile della voce padre del gruppo viene dal valore di `gruppo` stesso (`"Accounting"`), non dal `navLabel` di una riga; `/admin` diventa semplicemente la prima figlia del gruppo, con la sua etichetta "Amministrazione" invariata (stesso principio "nessun cambio a navLabel" già seguito in Story 15.2/15.3).
  - [x] **Diverso dalle storie precedenti**: qui non basta rendere le tre rotte adiacenti tra loro (come in 15.2/15.3) — l'AC #1 richiede esplicitamente che "Accounting" sia **l'ultima voce del menu**. `raggruppaVociNavigazione` (Story 15.1) posiziona il nodo gruppo all'indice della **prima** rotta di quel gruppo incontrata in `PROTECTED_ROUTES` — quindi le tre righe vanno spostate in fondo all'intero array (dopo l'attuale ultima riga, `/permessi-accesso`), non semplicemente vicine tra loro in un punto qualsiasi. `/admin` oggi è la **prima** riga dell'array, `/precaricamento-allenatori` è vicino all'inizio — entrambe richiedono uno spostamento lungo, non un piccolo riordino locale come in Story 15.3.
  - [x] Ordine tra le tre rotte spostate: `/admin`, `/precaricamento-allenatori`, `/permessi-accesso` (stesso ordine di AC #1/epics.md).
  - [x] Nessuna modifica a `/permessi-certificati` (AC #3) — resta dov'è, non fa parte di questo gruppo nonostante la somiglianza tematica del nome.
  - [x] Nessuna modifica alle tre pagine stesse (`app/(amministrazione)/admin/`, `app/(onboarding-import)/precaricamento-allenatori/`, `app/(amministrazione)/permessi-accesso/`) — presentazione in nav soltanto.
- [x] Task 2: **Breaking change consapevole sui test esistenti — il più esteso finora in questo epic** (AC: #1, #2, #3)
  - [x] `lib/auth/voci-navigazione.test.ts` → il test `"un Admin vede tutte le voci Admin-ammesse"` include `"/admin"` e `"/precaricamento-allenatori"` nell'elenco atteso via `hrefVoci` — rimuoverle, aggiungere `.not.toContain("/admin")`, `.not.toContain("/precaricamento-allenatori")`, `.not.toContain("/permessi-accesso")` (quest'ultima non era mai stata nell'elenco positivo, ma la guardia negativa va comunque aggiunta ora che diventa una figlia di gruppo).
  - [x] `lib/auth/voci-navigazione.test.ts` → il test `"esistono esattamente i nodi gruppo attesi con i dati reali del progetto"` (generalizzato in Story 15.2, esteso in Story 15.3 per due gruppi) verifica oggi **due** gruppi (`Orari/Palestre`, `Atleti`) — estendere per un **terzo** (`Accounting`, 3 rotte), non riscrivere da zero. La story 15.3 aveva lasciato una nota esplicita in questo test proprio per questo caso ("una futura Story 15.4 aggiungerà un terzo valore").
  - [x] `lib/auth/voci-navigazione.test.ts` → il test `"mantiene l'ordine completo di PROTECTED_ROUTES per Admin (voci dirette e nodi gruppo insieme)"` (aggiunto nella code review di Story 15.3) va **riscritto quasi per intero**: oggi si aspetta `/admin` come prima voce e `/precaricamento-allenatori` come voce diretta a metà elenco — con questa storia entrambe spariscono da quelle posizioni e un nuovo nodo gruppo "Accounting" (3 figlie) compare **per ultimo**. Questo è il test con l'impatto più grande di tutta la storia — non sottovalutarlo. Ricalcolare l'intero elenco atteso leggendo `PROTECTED_ROUTES` per ADMIN nell'ordine finale dopo il Task 1 (stesso metodo già usato per costruire questo test in Story 15.3: filtrare per `!nascostaDallaNav && ruoliAmmessi.includes("ADMIN")`, raggruppare per `gruppo`, mappare in sequenza) — non indovinare l'elenco, verificarlo eseguendo `npx vitest run` e correggendo finché non passa con un elenco scritto a mano e controllato, non copincollato alla cieca dall'output del test fallito.
  - [x] Verificare (leggendo l'intero file) se altri test asseriscono `/admin`/`/precaricamento-allenatori`/`/permessi-accesso` come voce diretta — stesso trattamento se sì. Story 15.2 ha trovato un terzo test rotto non anticipato, Story 15.3 invece esattamente zero sorprese: non dare per scontato quale dei due casi capiterà qui.
- [x] Task 3: Nuovi test con i dati reali (AC: #1, #2)
  - [x] `filtraVociNavigazione(["ADMIN"])` produce un nodo gruppo `"Accounting"` con tutte e tre le figlie (`/admin`, `/precaricamento-allenatori`, `/permessi-accesso`), nell'ordine del Task 1, **posizionato per ultimo** nell'array risultante (non solo "presente", verificare esplicitamente che sia l'ultimo elemento).
  - [x] Un Ruolo senza alcuna delle tre rotte (es. ALLENATORE) non produce alcun nodo gruppo `"Accounting"` — stesso principio già stabilito in Story 15.2/15.3.
  - [x] Nessun test necessario per una combinazione di Ruoli su questo gruppo: tutte e tre le rotte sono `ruoliAmmessi: ["ADMIN"]` (nessuna condivisione con altri Ruoli come invece accadeva per Atleti/Orari-Palestre) — non c'è alcun caso di sovrapposizione/dedup da testare qui, non inventarne uno artificiale.
- [x] Task 4: Verifica (AC: #1, #2, #3)
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npx eslint .` puliti
  - [x] `npm run build` pulito
  - [x] Verifica dal vivo (aspetto visivo reale di "Accounting" in fondo al menu, espanso/collassato) non eseguibile in questo ambiente sandbox — stesso limite delle storie precedenti. Terzo gruppo reale mai visto da un utente vero (dopo Orari/Palestre e Atleti), stesso principio di attenzione già seguito per il primo gruppo in Story 15.2.

### Review Findings

- [x] [Review][Patch] Le Completion Notes affermavano "5 nuovi punti `it` aggiunti" — impreciso: il diff aggiunge esattamente **2** nuovi punti `it` (`"Admin vede il gruppo Accounting..."`, `"Allenatore non vede alcun gruppo Accounting..."`); gli altri 3 sono modifiche a test preesistenti riscritti/estesi, non nuove aggiunte. Il conteggio totale (933) restava corretto, solo la spiegazione era fuorviante per chi legge solo quella riga. [_bmad-output/implementation-artifacts/15-4-sezione-accounting.md] — risolto: formulazione corretta con nota esplicita di correzione post-review.
- [x] [Review][Patch] Nessun test verificava l'assenza di Dirigente dal gruppo "Accounting" — le tre rotte sono `ruoliAmmessi: ["ADMIN"]` soltanto, ma Dirigente ha accesso a molte altre rotte ADMIN-adiacenti (`/gruppi`, `/slot`, `/wizard-nuova-stagione`, `/campionati`); un futuro allargamento accidentale di `ruoliAmmessi` su una delle tre rotte sarebbe stato rilevato solo dal test generico di conteggio, non da un test scoped al Ruolo — a differenza di Atleti/Orari-Palestre, che hanno già copertura simmetrica Admin+Dirigente perché quei gruppi condividono davvero dei Ruoli. [lib/auth/voci-navigazione.test.ts] — risolto: nuovo test `"Dirigente non vede alcun gruppo Accounting (le tre rotte sono ADMIN-only)"`.
- [x] [Review][Patch] L'esclusione di `/permessi-certificati` dal gruppo "Accounting" (AC #3) era verificata solo incidentalmente dal test di ordine completo per Admin (che include `/permessi-certificati` come voce diretta mid-array) — nessuna guardia esplicita e isolata nel test dedicato al gruppo Accounting; se un futuro refactor separasse quel test di ordine completo (pattern di "generalizzazione" già visto più volte in questo epic), AC #3 perderebbe silenziosamente la sua unica copertura. [lib/auth/voci-navigazione.test.ts] — risolto: aggiunta `expect(gruppo?.figlie.map(f => f.href)).not.toContain("/permessi-certificati")` dentro il test `"Admin vede il gruppo Accounting..."`.
- [x] [Review][Patch] Una `expect.arrayContaining([...])` era stata collassata su un'unica riga di ~115 caratteri nel test `"un Admin vede tutte le voci Admin-ammesse"`, inconsistente con ogni altra chiamata `arrayContaining` multi-elemento nello stesso file (un elemento per riga). Nessun impatto funzionale (nessun prettier configurato nel progetto) ma diff-hygiene non necessaria in una storia che altrimenti non toccava la formattazione. [lib/auth/voci-navigazione.test.ts] — risolto: riportato a un elemento per riga.
- [x] [Review][Defer] La sicurezza del riordino (nessuna regressione su `matchProtectedRoute`) dipende da un invariante mai imposto da un test: nessun `prefix` di `PROTECTED_ROUTES` è oggi prefisso stringa di un altro (verificato a mano), ma `Array.prototype.find` renderebbe l'ordine dell'array significativo per il matching se questo invariante venisse violato in futuro (es. un'ipotetica `/admin-report` aggiunta prima di `/admin`). Questa storia sposta 3 rotte attraverso gran parte dell'array, aumentando la superficie in cui l'ordine conta, senza introdurre alcun test di regressione per collisioni di match-order. [lib/auth/route-guard.ts] — deferito: rischio architetturale preesistente e trasversale a tutto `PROTECTED_ROUTES`, non introdotto né aggravato in modo specifico da questa storia — più adatto a un item di backlog indipendente che tocchi `matchProtectedRoute`/`route-decision.test.ts`, non a questa story mirata al solo riordino "Accounting".

**Dismessi come rumore/fuori scope/convenzioni già accettate (5):** nessun test asserisce esplicitamente `permessiConfigurabili === true` su `/precaricamento-allenatori` dopo lo spostamento — il test generico preesistente su quel campo (`route-decision.test.ts`, righe 738-741, non toccato da questa storia) esercita comunque lo stato reale di `route-guard.ts` e sarebbe comunque fallito in caso di regressione, protezione reale anche se non aggiunta da questa storia specificamente per l'occasione; il `.not.toContain("/permessi-accesso")` aggiunto nel test "un Admin vede tutte le voci Admin-ammesse" testa uno scenario mai stato positivamente asserito prima — difensivo ma non dannoso, coerente con la scelta esplicita dichiarata nei Dev Notes; la ripetuta enfasi documentale ("era la prima riga dell'array" ripetuto 5 volte tra Dev Notes/Completion Notes/Change Log) è ridondanza di stile, nessun impatto; il blocco di commento di 14 righe per `/precaricamento-allenatori` è stato spostato per intero invece di un diff più piccolo — nitpick di diff-hygiene, nessun rischio funzionale, contenuto verificato identico; il test generico "esistono esattamente i nodi gruppo attesi" userebbe solo l'aritmetica delle lunghezze per rilevare una rotta miscategorizzata tra gruppi — falso: il test di ordine completo per Admin (`toEqual`, non `arrayContaining`) è sensibile all'ordine e al contenuto esatto e rileverebbe comunque una rotta spostata nel gruppo sbagliato, la premessa del finding non regge alla luce del test già esistente.

## Dev Notes

### Perché questa storia è meccanicamente più grande di 15.2/15.3 nonostante lo stesso pattern

Story 15.2 (2 rotte già vicine) e Story 15.3 (4 rotte sparse ma raggruppate in un punto qualsiasi) non richiedevano che il gruppo finisse in una posizione *specifica* dell'elenco. Questa storia sì (AC #1: "ultima voce del menu") — `/admin` parte dalla **prima** posizione dell'intero array. Questo rende il test di ordine esatto per ADMIN (aggiunto nella code review di Story 15.3, non nella story originale) il punto di maggiore impatto: va ricalcolato quasi da zero, non solo aggiustato. Vedi Task 2.

### Perché non serve toccare `navLabel` di `/admin`

Il nome visibile della voce padre di un gruppo è il valore della stringa `gruppo` stessa (`raggruppaVociNavigazione`, Story 15.1) — non il `navLabel` di nessuna riga. Rinominare "Amministrazione" in "Accounting" (punto 3 della richiesta originale) si ottiene semplicemente valorizzando `gruppo: "Accounting"` su `/admin` — il suo `navLabel: "Amministrazione"` resta invariato e diventa l'etichetta della **figlia**, non della voce padre. Stesso principio "nessun cambio a navLabel" già rispettato in Story 15.2/15.3 per le proprie rotte.

### `/permessi-certificati` resta fuori (AC #3)

Esiste una rotta `/permessi-certificati` (ADMIN-only, gestione permessi di lettura certificati medici) tematicamente simile a `/permessi-accesso` ma **non menzionata** nella richiesta originale dell'utente per "Accounting" (`epics.md`). Non includerla per somiglianza di nome — è un errore facile da fare leggendo la lista delle rotte ADMIN-only, esplicitamente escluso in fase di analisi dell'epic.

### File esistenti da leggere per intero prima di modificare

- **`lib/auth/route-guard.ts`**: `/admin` (riga iniziale dell'array), `/precaricamento-allenatori` (vicino all'inizio, ha già `permessiConfigurabili: true` da Epic 12 — non toccare quel campo), `/permessi-accesso` (oggi l'ultima riga dell'array). Verificare le posizioni esatte prima di modificare — sono cambiate rispetto a quando questa storia è stata scritta (Story 15.2/15.3 hanno già riordinato altre righe).
- **`lib/auth/voci-navigazione.test.ts`**: leggere per intero, in particolare il test di ordine esatto per ADMIN e quello sui "nodi gruppo attesi" aggiunti/estesi nella code review di Story 15.3 — entrambi da estendere per il terzo gruppo, non duplicare in un test parallelo.

### Project Structure Notes

- Modificati: `lib/auth/route-guard.ts` (3 righe, `gruppo` aggiunto + spostate in fondo all'array), `lib/auth/voci-navigazione.test.ts` (test esistenti adattati/estesi + nuovi test con dati reali).
- Nessuna modifica a `lib/auth/voci-navigazione.ts`, `app/NavBarClient.tsx`, `app/NavBar.module.css` (invariati da Story 15.1).
- Nessun nuovo file previsto.

### References

- [Source: epics.md#Epic 15: Riorganizzazione Grafica — Navigazione e Slot, Story 15.4] — AC originali.
- [Source: _bmad-output/implementation-artifacts/15-3-menu-atleti.md] — story precedente, lezioni dirette (ordine, test esatti, generalizzazione del test "nodi gruppo attesi" già preparata per un terzo valore).
- [Source: lib/auth/route-guard.ts] — righe da modificare/spostare, lette per intero.
- [Source: lib/auth/voci-navigazione.test.ts] — test di ordine esatto per ADMIN (aggiunto in review di Story 15.3) da riscrivere quasi per intero.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Implementate tutte le 4 Task/AC della story: `gruppo: "Accounting"` valorizzato su `/admin`, `/precaricamento-allenatori`, `/permessi-accesso` in `lib/auth/route-guard.ts`, spostate in blocco alla **fine** dell'intero array (non solo adiacenti tra loro, a differenza di Story 15.2/15.3) — `/admin` partiva dalla primissima posizione dell'array, `/precaricamento-allenatori` era vicino all'inizio.
- `navLabel: "Amministrazione"` di `/admin` **non rinominato**, come previsto dai Dev Notes della story: l'etichetta della voce padre del gruppo viene dal valore di `gruppo` ("Accounting"), non dal `navLabel` di una riga — `/admin` diventa semplicemente la prima figlia, con la sua etichetta invariata.
- **Breaking change gestito esattamente come anticipato dalla story**: solo i 3 test previsti sono falliti dopo il Task 1 (`"un Admin vede tutte le voci Admin-ammesse"`, `"esistono esattamente i nodi gruppo attesi..."`, `"mantiene l'ordine completo... per Admin"`) — nessuna sorpresa, coerente con l'esperienza di Story 15.3. Il test di ordine completo per Admin (il più impattato, come previsto) è stato ricalcolato leggendo `PROTECTED_ROUTES` per intero dopo lo spostamento, non copiato dall'output del test fallito — verificato con `npx vitest run` che il calcolo manuale fosse corretto al primo tentativo.
- Il test "esistono esattamente i nodi gruppo attesi" è stato esteso per un **terzo** gruppo (Accounting) esattamente come la nota lasciata da Story 15.3 anticipava ("una futura Story 15.4 aggiungerà un terzo valore").
- Nuovi test con dati reali: gruppo Accounting con tutte e tre le figlie posizionato esplicitamente per **ultimo** nell'array (non solo "presente"), Allenatore non vede alcun gruppo Accounting. Nessun test di sovrapposizione/dedup tra Ruoli necessario qui (tutte e tre le rotte sono `ADMIN`-only, nessuna condivisione con altri Ruoli come invece accadeva per Atleti/Orari-Palestre) — comportamento esplicitamente previsto dalla story, non un'omissione.
- Verifica dal vivo (aspetto visivo reale di "Accounting" in fondo al menu) non eseguibile in questo ambiente sandbox — stesso limite delle storie precedenti.
- 933/933 test Vitest passati (era 931 prima di questa story, +2 netti — **correzione post-review**: la nota precedente diceva erroneamente "5 nuovi punti `it` aggiunti", ma il diff aggiunge esattamente 2 nuovi punti `it`; gli altri 3 sono modifiche a test preesistenti riscritti/estesi, non nuove aggiunte), `eslint`/`tsc --noEmit` puliti, `npm run build` riuscita senza regressioni sulle route esistenti.

### File List

**Modificati:**
- `lib/auth/route-guard.ts` (`gruppo: "Accounting"` su 3 righe, spostate in fondo all'array)
- `lib/auth/voci-navigazione.test.ts` (3 test esistenti adattati/estesi/riscritti, 2 nuovi test con dati reali; review: 1 nuovo test aggiuntivo — Dirigente non vede Accounting — più 2 assertion aggiunte a test esistenti — guardia `/permessi-certificati` nel test del gruppo Accounting, formattazione `arrayContaining` corretta)

## Change Log

- 2026-08-05: Story implementata (Task 1-4 completi). Terzo gruppo reale ("Accounting", 3 figlie) applicato all'infrastruttura di Story 15.1/15.2/15.3 — nessuna nuova logica scritta. A differenza delle storie precedenti, l'AC richiedeva che il gruppo fosse l'ultima voce del menu, non solo che le rotte fossero adiacenti — `/admin` (dalla primissima posizione dell'array) e `/precaricamento-allenatori` spostate in fondo. Il test di ordine completo per Admin (introdotto in review di Story 15.3) è stato l'impatto maggiore, come anticipato dalla story stessa, riscritto e verificato correttamente al primo tentativo. `/permessi-certificati` esplicitamente esclusa dal gruppo (AC #3) nonostante la somiglianza di nome con `/permessi-accesso`. 933/933 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: review.
- 2026-08-05: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Nessuna violazione degli AC (Acceptance Auditor: AC #1/#2/#3 verificati indipendentemente, `permessiConfigurabili` e `navLabel` invariati, `navLabel` mai usato come etichetta di gruppo). Nessun edge case non gestito (Edge Case Hunter). 4 patch applicati dal Blind Hunter: formulazione delle Completion Notes corretta (2, non 5, nuovi punti `it`), nuovo test Dirigente-non-vede-Accounting (nessuna copertura role-scoped esisteva per l'assenza, a differenza di Atleti/Orari-Palestre), guardia esplicita `/permessi-certificati` isolata dentro il test del gruppo Accounting (AC #3 era coperta solo incidentalmente dal test di ordine completo), formattazione di una `arrayContaining` riportata a un elemento per riga. 1 defer (invariante "nessun prefix è prefisso di un altro" mai testato per `matchProtectedRoute` — rischio architetturale preesistente e trasversale, non specifico di questa storia). 5 osservazioni dismesse come rumore/fuori scope/premesse non verificate alla luce dei test già esistenti. 934/934 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: done.
