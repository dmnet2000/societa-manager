---
baseline_commit: e634712483cdc9afe8b508e119574d628dfe4ff8
---

# Story 15.3: Menu "Atleti"

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Utente con accesso a una o più funzionalità di gestione anagrafica atlete,
I want trovarle raggruppate sotto un'unica voce di menu "Atleti",
so that non le cerco sparse nella lista piatta della navigazione.

## Acceptance Criteria

1. **Given** un Ruolo con accesso ad almeno una delle quattro rotte **When** apre la navigazione **Then** vede la voce padre "Atleti" che, espansa, mostra solo le rotte a cui ha accesso
2. **Given** un utente Segreteria **When** espande "Atleti" **Then** vede solo le 2 voci a cui ha accesso (`/conferma-iscrizioni`, `/conferma-certificati`), non le 4 — `/import-atlete` è ADMIN/DIRIGENTE-only e `/conferma-tesseramenti` esclude esplicitamente Segreteria fin da Story 13.1. **Correzione post-analisi (2026-08-05)**: `epics.md` assumeva originariamente che Segreteria avesse accesso anche a `/conferma-tesseramenti` (3 voci su 4) — verificato falso leggendo `lib/auth/route-guard.ts` (Story 13.1: "a differenza di /conferma-iscrizioni, Segreteria è esplicitamente esclusa"), corretto in `epics.md` prima di scrivere questa story. Non fidarsi di questo numero se letto altrove nella cronologia del progetto.
3. **And** nessuna regressione sull'autorizzazione esistente delle quattro rotte

## Tasks / Subtasks

- [x] Task 1: Valorizzare `gruppo` su `/import-atlete`, `/conferma-iscrizioni`, `/conferma-certificati`, `/conferma-tesseramenti` (AC: #1)
  - [x] `lib/auth/route-guard.ts`: aggiungere `gruppo: "Atleti"` a tutte e quattro le righe esistenti — **nessun'altra modifica** (`ruoliAmmessi`/`navLabel`/`prefix` restano identici, AC #3). Ruoli ammessi per riferimento (verificati nel codice, non assunti): `/import-atlete` = ADMIN+DIRIGENTE; `/conferma-iscrizioni` = ADMIN+DIRIGENTE+SEGRETERIA; `/conferma-certificati` = ADMIN+DIRIGENTE+SEGRETERIA; `/conferma-tesseramenti` = ADMIN+DIRIGENTE (Segreteria esclusa, Story 13.1).
  - [x] **Lezione da Story 15.2 (code review)**: `raggruppaVociNavigazione` preserva l'ordine di **dichiarazione** in `PROTECTED_ROUTES` per le figlie di un gruppo — in Story 15.2 le due rotte erano dichiarate nell'ordine sbagliato rispetto all'etichetta padre, scoperto e corretto solo in review. Le quattro rotte di questa storia sono oggi **sparse** in punti diversi dell'array (non adiacenti), a differenza di `/orari`/`/palestre` che erano già vicine. **Riordinarle esplicitamente in questa storia** (non lasciarlo a una futura review): spostarle in blocco, adiacenti, nell'ordine "Import atlete, Conferma iscrizioni, Conferma certificati, Conferma tesseramenti" (stesso ordine dell'elenco in `epics.md` e del nome del gruppo "Atleti" — nessun ordine implicito nell'etichetta stessa qui, a differenza di "Orari/Palestre", ma la coerenza con l'elenco della richiesta originale resta il criterio più sensato). Verificare che nessun altro ordine relativo tra rotte diverse da queste quattro cambi (le altre righe restano dove sono, si spostano solo queste quattro).
  - [x] Nessuna modifica alle quattro pagine stesse (`app/(onboarding-import)/import-atlete/`, `app/(iscrizioni)/conferma-iscrizioni/`, `app/(certificati-medici)/conferma-certificati/`, `app/(iscrizioni)/conferma-tesseramenti/`) — questa storia è puramente presentazione in nav.
- [x] Task 2: **Breaking change consapevole sui test esistenti** (AC: #1, #2, #3)
  - [x] `lib/auth/voci-navigazione.test.ts` → il test `"un Admin vede tutte le voci Admin-ammesse"` include `"/import-atlete"`, `"/conferma-iscrizioni"`, `"/conferma-certificati"` nell'elenco atteso via `hrefVoci` — tutte e tre non compariranno più lì una volta raggruppate (diventano figlie del gruppo "Atleti"). Rimuoverle dalla lista attesa e aggiungere `.not.toContain(...)` per tutte e tre, stesso pattern già introdotto nella review di Story 15.2.
  - [x] `lib/auth/voci-navigazione.test.ts` → il test `"esiste esattamente un nodo gruppo con i dati reali del progetto: Orari/Palestre"` (Story 15.2, poi rafforzato in review) verifica oggi `PROTECTED_ROUTES.filter(r => r.gruppo)` con `toHaveLength(2)` e `every(r => r.gruppo === "Orari/Palestre")` — **entrambe le assertion diventano false** una volta che 4 righe in più hanno `gruppo: "Atleti"` (6 route con `gruppo` in totale, non più tutte con lo stesso valore). Generalizzare: verificare separatamente le route con `gruppo === "Orari/Palestre"` (invariato, 2) e quelle con `gruppo === "Atleti"` (nuovo, 4), non più un singolo test che assume un solo gruppo esista nel progetto.
  - [x] Verificare (leggendo l'intero file, non assumendo) se altri test esistenti asseriscono una di queste 4 rotte come voce diretta — stesso trattamento se sì. Ricordare che in Story 15.2 è emerso un terzo test rotto non previsto inizialmente (quello su "ogni voce ha href/label non vuoti") — non dare per scontato che l'elenco sopra sia esaustivo.
- [x] Task 3: Nuovi test con i dati reali (AC: #1, #2)
  - [x] `filtraVociNavigazione(["SEGRETERIA"])` produce un nodo gruppo `"Atleti"` con **esattamente** `/conferma-iscrizioni` e `/conferma-certificati` tra le figlie (non `/import-atlete`, non `/conferma-tesseramenti`) — usare uguaglianza esatta con ordine (`toEqual` su array, coerente con l'ordine di dichiarazione scelto nel Task 1), non `arrayContaining` (lezione da Story 15.2).
  - [x] `filtraVociNavigazione(["ADMIN"])` (o `["DIRIGENTE"]`) produce un nodo gruppo `"Atleti"` con **tutte e quattro** le figlie, nell'ordine di dichiarazione del Task 1.
  - [x] Un Ruolo senza accesso a nessuna delle quattro rotte (es. ALLENATORE) non produce alcun nodo gruppo `"Atleti"` — stesso test già scritto in review di Story 15.2 per "Orari/Palestre", stesso principio qui (prevenire un gruppo spurio da un futuro refuso in `ruoliAmmessi`).
  - [x] Un Utente con Ruoli ADMIN e DIRIGENTE (che condividono tutte e quattro le rotte) vede quattro figlie, non otto duplicate — stesso test di dedup già scritto in review di Story 15.2 per Admin+Dirigente su `/palestre`, qui con quattro rotte invece di una.
- [x] Task 4: Verifica (AC: #1, #2, #3)
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npx eslint .` puliti
  - [x] `npm run build` pulito
  - [x] Verifica dal vivo (aspetto visivo reale del gruppo "Atleti" espanso/collassato per i vari Ruoli, in particolare che Segreteria veda solo 2 delle 4 voci) non eseguibile in questo ambiente sandbox — stesso limite delle storie precedenti (12.4, 13.1, 14.1, 14.2, 15.1, 15.2). Se possibile, chiedere all'utente una verifica manuale post-deploy (login come Segreteria, Admin, Dirigente).

### Review Findings

- [x] [Review][Patch] **Il caso che questa storia introduce per la prima volta — due gruppi coesistenti per lo stesso Ruolo — non è mai verificato end-to-end.** Segreteria vede oggi **entrambi** i gruppi "Atleti" (2 figlie) e "Orari/Palestre" (1 figlia) nello stesso array — comportamento di produzione reale, non ipotetico (confermato eseguendo direttamente `filtraVociNavigazione(["SEGRETERIA"])`). Ogni test esistente usa `trovaGruppo()` per isolare un solo gruppo per etichetta — nessuno verifica mai l'array completo quando due gruppi compaiono insieme (ordine tra i due nodi gruppo, nessuna contaminazione tra le figlie). I Dev Notes della story stessa citano esplicitamente "due gruppi coesistono" come la complessità principale rispetto a Story 15.2, eppure nessun test la esercita. [lib/auth/voci-navigazione.test.ts] — risolto: nuovo test con uguaglianza esatta sull'intero array per Segreteria.
- [x] [Review][Patch] Nessuna guardia d'ordine di primo livello copre alcun Ruolo che vede davvero il gruppo "Atleti" — l'unico test con uguaglianza esatta sull'intero array (`toEqual`) è scoped ad ALLENATORE, un Ruolo senza alcun accesso alle quattro rotte di questa storia. ADMIN/DIRIGENTE/SEGRETERIA (gli unici Ruoli che vedono "Atleti") sono verificati solo via `arrayContaining` (insensibile alla posizione) o via `trovaGruppo` (che scarta tutto il resto dell'array). Un futuro riordino accidentale del blocco "Atleti" rispetto a `/precaricamento-allenatori`/`/gruppi`/ecc. passerebbe ogni test esistente. [lib/auth/voci-navigazione.test.ts] — risolto: nuovo test con uguaglianza esatta sull'intero array (voci dirette e nodi gruppo insieme, 12 elementi) per Admin.
- [x] [Review][Patch] Nessun test verifica il caso di sovrapposizione **parziale** dei Ruoli sul gruppo "Atleti" — a differenza di "Orari/Palestre" (Ruoli disgiunti, Segreteria vs Admin/Dirigente), qui Segreteria e Admin condividono 2 delle 4 rotte (`conferma-iscrizioni`, `conferma-certificati`). Un Utente con entrambi i Ruoli dovrebbe comunque vedere tutte e 4 le figlie senza duplicati sulle 2 condivise — non testato. [lib/auth/voci-navigazione.test.ts] — risolto: nuovo test dedicato Segreteria+Admin.
- [x] [Review][Patch] Le Completion Notes affermano "4 nuovi test dedicati + 1 dei test adattati ora con un caso in più" — impreciso: il diff aggiunge esattamente 4 nuovi punti `it`/`it.each`, e la quinta istanza di test deriva semplicemente da `it.each(["ADMIN","DIRIGENTE"])` che produce 2 test a runtime da un solo punto di chiamata, non da un test preesistente che ha "guadagnato un caso". Correggere la spiegazione (il conteggio totale, 928, resta corretto). [_bmad-output/implementation-artifacts/15-3-menu-atleti.md] — risolto: formulazione corretta.
- [x] [Review][Defer] Il commento "Story 15.3: stesso gruppo di /import-atlete sopra ('Atleti')" è ripetuto identico su tre delle quattro righe in `route-guard.ts` — un solo commento sopra il blocco avrebbe detto la stessa cosa senza triplicarla [lib/auth/route-guard.ts] — deferito: igiene minore, nessun impatto funzionale, coerente con lo stile già presente altrove nel file (es. `/orari`/`/palestre`).
- [x] [Review][Defer] La correzione dell'AC #2 in `epics.md` è ora una frase densa che incorpora un changelog inline ("**correzione post-analisi (2026-08-05)**...") dentro quello che dovrebbe restare un criterio di accettazione atemporale — si legge più come un messaggio di commit inserito nella prosa della spec [_bmad-output/planning-artifacts/epics.md] — deferito: nessun impatto funzionale, `epics.md` di questo progetto contiene già note simili datate altrove (es. Story 9.23, Story 12.4), pattern consolidato per questo documento specifico.

**Dismessi come rumore/fuori scope/convenzioni già accettate (5):** il test "esistono esattamente i nodi gruppo attesi" usa ancora `arrayContaining` invece di `toEqual` — funzionalmente equivalente a un'uguaglianza esatta per questa invariante specifica (combinato con `toHaveLength`, verifica già un insieme esatto), nessuna copertura mancante reale; checkbox del Task 4 (verifica dal vivo) marcato `[x]` nonostante il testo dica "non eseguibile" — convenzione già consolidata e ripetuta in ogni storia di questa sessione (12.4, 13.1, 14.1, 14.2, 15.1, 15.2); posizione non documentata del gruppo "Atleti" tra le altre voci di primo livello — nessun AC la specifica, scelta implementativa libera non testabile; nessun test diretto che ri-conferma `matchProtectedRoute`/l'autorizzazione delle quattro rotte dopo il riordino — già verificato indipendentemente dall'Acceptance Auditor come strutturalmente non impattato (lookup per prefisso via `.find()`, indipendente dall'ordine), `route-decision.test.ts` esercita già le quattro rotte invariate; il test di dedup Admin+Dirigente è vicino a ridondante con `it.each` — stesso identico pattern già introdotto ed esplicitamente valutato positivamente nella review di Story 15.2 per il caso equivalente su `/palestre`, incoerente dismetterlo ora dopo averlo approvato lì.

## Dev Notes

### Cosa NON reinventare (già costruito da Story 15.1, già esercitato da Story 15.2)

Nessuna nuova logica di raggruppamento/accordion — tutto il meccanismo esiste da Story 15.1 ed è già stato esercitato con dati reali da Story 15.2 (primo gruppo, "Orari/Palestre", già `done` con code review completata). Questa storia aggiunge un **secondo** gruppo reale ("Atleti") con **quattro** figlie invece di due — la differenza principale rispetto a 15.2 è la scala (4 rotte sparse nell'array invece di 2 già vicine) e il fatto che ora **coesistono due gruppi distinti** nello stesso progetto, il che rompe alcune assunzioni "esiste un solo gruppo" scritte nei test di Story 15.2 (vedi Task 2).

### Lezioni dirette dalla code review di Story 15.2 (da applicare qui, non riscoprire)

- **Ordine delle figlie**: `raggruppaVociNavigazione` (Story 15.1) preserva l'ordine di dichiarazione in `PROTECTED_ROUTES`, non un ordine implicito nell'etichetta del gruppo. In Story 15.2 l'ordine sbagliato (`/palestre` prima di `/orari`) è stato scoperto solo in review e poi corretto. Questa storia lo anticipa esplicitamente nel Task 1: riordinare le quattro righe in blocco, adiacenti, nell'ordine desiderato, invece di lasciarle sparse dove sono oggi.
- **Test con `toEqual` esatto, non `arrayContaining`**: Story 15.2 ha rafforzato in review i test da `arrayContaining` (insensibile a ordine/duplicati) a uguaglianza esatta. Scrivere i nuovi test del Task 3 già così, non aspettare una review per correggerli.
- **Guardie `.not.toContain` esplicite**: quando una rotta smette di essere una voce diretta, il test che verificava la sua presenza va aggiornato non solo rimuovendo l'attesa positiva, ma aggiungendo un'attesa negativa esplicita (altrimenti una regressione che la facesse comparire sia come voce diretta sia dentro il gruppo passerebbe inosservata).
- **Test "un solo gruppo esiste"**: il test di Story 15.2 che certifica l'esistenza del gruppo direttamente su `PROTECTED_ROUTES` (non scoped a un Ruolo) va generalizzato qui per contare/verificare **due** gruppi distinti, non riscritto da zero — vedi Task 2.
- **Verificare l'intero file dei test**, non fermarsi ai casi già previsti in questa lista: in Story 15.2 è emerso un terzo test rotto non anticipato dalla story (`"ogni voce ha href/label non vuoti"`), trovato solo eseguendo la suite ed esaminando i fallimenti.

### File esistenti da leggere per intero prima di modificare

- **`lib/auth/route-guard.ts`**: le quattro righe da toccare/spostare sono sparse nell'array (verificare la posizione esatta prima di modificare, non assumere i numeri di riga di questo documento come definitivi — Story 15.2 ha già spostato righe vicine, i numeri sono cambiati rispetto a quando questa storia è stata scritta).
- **`lib/auth/voci-navigazione.test.ts`**: leggere per intero, in particolare tutti i test che toccano `ADMIN`/`SEGRETERIA`/il gruppo "Orari/Palestre" aggiunti/rafforzati nella review di Story 15.2 (helper `trovaGruppo` già disponibile e riusabile, non riscriverlo).

### Project Structure Notes

- Modificati: `lib/auth/route-guard.ts` (4 righe riordinate + campo `gruppo` aggiunto), `lib/auth/voci-navigazione.test.ts` (test esistenti adattati + nuovi test con dati reali).
- Nessuna modifica a `lib/auth/voci-navigazione.ts`, `app/NavBarClient.tsx`, `app/NavBar.module.css` (invariati da Story 15.1, già sufficienti).
- Nessun nuovo file previsto.

### References

- [Source: epics.md#Epic 15: Riorganizzazione Grafica — Navigazione e Slot, Story 15.3] — AC originali, corretti in questa sessione (2026-08-05) per il numero reale di voci visibili a Segreteria.
- [Source: _bmad-output/implementation-artifacts/15-2-menu-orari-palestre.md] — story precedente dello stesso epic, lezioni dirette da riusare (ordine figlie, test esatti, guardie `.not.toContain`, test "un solo gruppo" da generalizzare).
- [Source: lib/auth/route-guard.ts] — righe da modificare/riordinare, lette per intero.
- [Source: lib/auth/voci-navigazione.ts, lib/auth/voci-navigazione.test.ts] — meccanismo già pronto e helper `trovaGruppo` già disponibile.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno.

### Completion Notes List

- Implementate tutte le 4 Task/AC della story: `gruppo: "Atleti"` valorizzato su `/import-atlete`, `/conferma-iscrizioni`, `/conferma-certificati`, `/conferma-tesseramenti` in `lib/auth/route-guard.ts`, con le quattro righe riordinate in blocco adiacente (lezione applicata da Story 15.2, non riscoperta in review) nell'ordine "Import atlete, Conferma iscrizioni, Conferma certificati, Conferma tesseramenti" — `/conferma-certificati` spostata da una posizione lontana (vicino a `/notifiche`) per stare adiacente alle altre tre.
- **Breaking change gestito esattamente come anticipato dalla story**: solo i 2 test previsti sono falliti dopo il Task 1 (`"un Admin vede tutte le voci Admin-ammesse"`, `"esiste esattamente un nodo gruppo..."`) — **nessuna terza sorpresa questa volta**, a differenza di Story 15.2. Le lezioni applicate preventivamente nella scrittura della story (ordine deciso subito, test scritti con `toEqual` esatto fin da subito, guardie `.not.toContain` incluse da subito) hanno funzionato: zero finding di questo tipo attesi in code review.
- Il test "un solo gruppo esiste" di Story 15.2 è stato generalizzato (non riscritto da zero) per verificare **due** gruppi coesistenti (`Orari/Palestre` e `Atleti`), con una nota esplicita che una futura Story 15.4 ("Accounting") dovrà estenderlo ulteriormente per un terzo gruppo.
- Nuovi test con dati reali, tutti con uguaglianza esatta e ordine (non `arrayContaining`, lezione da Story 15.2): Segreteria vede 2 delle 4 figlie (`conferma-iscrizioni`, `conferma-certificati`), Admin/Dirigente vedono tutte e 4, Allenatore non vede alcun gruppo "Atleti", un Utente con Ruoli Admin+Dirigente vede 4 figlie non duplicate.
- **Corretta un'incongruenza in `epics.md`** scoperta in fase di creazione story (non durante l'implementazione): l'AC #2 originale assumeva che Segreteria avesse accesso a `/conferma-tesseramenti` (3 voci su 4) — verificato falso in `route-guard.ts` (Story 13.1 esclude esplicitamente Segreteria da quella rotta). Corretto prima di scrivere la story, non durante l'implementazione.
- Verifica dal vivo (aspetto visivo reale del gruppo "Atleti" per i vari Ruoli) non eseguibile in questo ambiente sandbox — stesso limite delle storie precedenti.
- 928/928 test Vitest passati prima della code review (era 923 prima di questa story, +5: 4 nuovi punti `it`/`it.each` — **correzione post-review**: la nota precedente diceva erroneamente "+1 dei test adattati ora con un caso in più", ma il quinto test deriva semplicemente da `it.each(["ADMIN","DIRIGENTE"])`, che produce 2 test a runtime da un solo punto di chiamata, non da un test preesistente che ha "guadagnato un caso"), `eslint`/`tsc --noEmit` puliti, `npm run build` riuscita senza regressioni sulle route esistenti. Dopo la code review: 931/931 (+3 nuovi test, vedi sotto).

### File List

**Modificati:**
- `lib/auth/route-guard.ts` (`gruppo: "Atleti"` su 4 righe, riordinate in blocco adiacente)
- `lib/auth/voci-navigazione.test.ts` (2 test esistenti adattati/generalizzati, 4 nuovi test con dati reali; review: 3 nuovi test aggiuntivi — due gruppi coesistenti per Segreteria, ordine completo per Admin, sovrapposizione parziale Segreteria+Admin)

## Change Log

- 2026-08-05: Story implementata (Task 1-4 completi). Secondo gruppo reale ("Atleti", 4 figlie) applicato all'infrastruttura di Story 15.1/15.2 — nessuna nuova logica scritta. Lezioni dalla code review di Story 15.2 applicate preventivamente (ordine delle figlie deciso nel Task 1, test con uguaglianza esatta fin da subito, guardie `.not.toContain`): solo i 2 test previsti sono stati rotti dal cambiamento, nessuna sorpresa. Corretta un'incongruenza in `epics.md` (Segreteria vede 2 non 3 delle 4 voci) scoperta in fase di creazione story. 928/928 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: review.
- 2026-08-05: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Nessuna violazione degli AC (Acceptance Auditor, verifica indipendente completa — inclusa la correzione di `epics.md`, confermata accurata). 4 patch applicati: nuovo test per il caso centrale di questa storia mai verificato end-to-end (due gruppi "Atleti"/"Orari/Palestre" coesistenti per Segreteria, con uguaglianza esatta sull'intero array), nuova guardia d'ordine completa per Admin (12 elementi, voci dirette e nodi gruppo insieme — l'unica precedente copriva solo Allenatore, un Ruolo senza accesso ad "Atleti"), nuovo test di sovrapposizione parziale Segreteria+Admin (2 delle 4 rotte condivise, a differenza del caso disgiunto di "Orari/Palestre"), formulazione delle Completion Notes corretta. 2 defer (commento ripetuto 3x in `route-guard.ts`, prosa dell'AC in `epics.md` che incorpora un changelog inline) — nessuno bloccante. 5 osservazioni dismesse come rumore/fuori scope/convenzioni già accettate. Nota operativa: il Blind Hunter ha segnalato un `git checkout` accidentale sui file durante la sua analisi, poi ripristinato — verificato indipendentemente che nessun danno sia rimasto (diff, test, marker di codice tutti intatti) prima di procedere. 931/931 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: done.
