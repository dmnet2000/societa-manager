---
baseline_commit: d50a33c129815c6602164e20daff53030951b70d
---

# Story 15.2: Menu "Orari/Palestre"

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Utente con accesso a Orari e/o Palestre,
I want trovarli raggruppati sotto un'unica voce di menu "Orari/Palestre",
so that individuo più rapidamente le funzionalità di gestione di spazi/orari.

## Acceptance Criteria

1. **Given** un Ruolo con accesso a `/orari` e/o `/palestre` **When** apre la navigazione **Then** vede una voce padre "Orari/Palestre" che, espansa, mostra solo le rotte a cui ha accesso (Segreteria: solo Orari; Admin/Dirigente: solo Palestre — nessun Ruolo ha accesso a entrambe oggi)
2. **And** nessuna regressione sull'autorizzazione esistente delle due rotte (invariata, solo la presentazione in nav cambia)

## Tasks / Subtasks

- [x] Task 1: Valorizzare `gruppo` su `/orari` e `/palestre` (AC: #1)
  - [x] `lib/auth/route-guard.ts`: aggiungere `gruppo: "Orari/Palestre"` alle due righe esistenti (`{ prefix: "/orari", ruoliAmmessi: ["SEGRETERIA"], navLabel: "Orari" }` e `{ prefix: "/palestre", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Palestre" }`) — **nessun'altra modifica a quelle righe** (`ruoliAmmessi`/`navLabel`/`prefix` restano identici, l'autorizzazione non cambia, AC #2). Prima applicazione reale del campo `gruppo` introdotto come infrastruttura pura da Story 15.1 — `raggruppaVociNavigazione`/`isGruppoAttivo`/il rendering accordion in `NavBarClient.tsx` sono già stati scritti e testati con dati sintetici in quella storia, **non vanno riscritti né duplicati qui**, solo esercitati per la prima volta con dati reali.
  - [x] Nessuna modifica alle pagine `/orari` e `/palestre` stesse (`app/(orari-palestre)/orari/page.tsx`, `app/(orari-palestre)/palestre/`) — questa storia è puramente presentazione in nav, stesso principio già seguito da Story 15.1 per l'infrastruttura.
- [x] Task 2: **Breaking change consapevole sui test esistenti** (AC: #1, #2)
  - [x] `lib/auth/voci-navigazione.test.ts` → il test `"nessun nodo gruppo con i dati reali del progetto (infrastruttura pura in questa storia)"` (Story 15.1) diventa **falso per costruzione** una volta valorizzato `gruppo` su una riga reale — il suo intero scopo era certificare che Story 15.1 non avesse ancora attivato alcun gruppo. Riscriverlo per riflettere la nuova realtà (es. "esiste esattamente un nodo gruppo con i dati reali del progetto, 'Orari/Palestre'") invece di lasciarlo a fallire o cancellarlo senza sostituto — non perdere la garanzia di non-regressione che rappresentava.
  - [x] `lib/auth/voci-navigazione.test.ts` → il test `"un Admin vede tutte le voci Admin-ammesse"` include `"/palestre"` nell'elenco atteso via `hrefVoci` (che filtra solo `tipo: "voce"`) — una volta che `/palestre` diventa figlia di un gruppo, non compare più come voce diretta in quell'elenco, il test fallirebbe. Aggiornare l'assertion: `/palestre` va cercata dentro le `figlie` del nodo gruppo `"Orari/Palestre"`, non più in `hrefVoci`. Stesso principio "adattare, non cancellare" già seguito in Story 15.1 per lo stesso file.
  - [x] Verificare (leggendo l'intero file, non assumendo) se altri test esistenti in questo file o altrove nel progetto asseriscono `/orari`/`/palestre` come voce diretta — se sì, stesso trattamento.
- [x] Task 3: Nuovi test con i dati reali (AC: #1, #2)
  - [x] `filtraVociNavigazione(["SEGRETERIA"])` produce un nodo gruppo `"Orari/Palestre"` con **solo** `/orari` tra le figlie (non `/palestre` — Segreteria non ha accesso a `/palestre`).
  - [x] `filtraVociNavigazione(["ADMIN"])` (o `["DIRIGENTE"]`) produce un nodo gruppo `"Orari/Palestre"` con **solo** `/palestre` tra le figlie (non `/orari`).
  - [x] Nessun AC/task richiede esplicitamente un test per un Utente con **entrambi** i Ruoli SEGRETERIA e ADMIN/DIRIGENTE contemporaneamente (caso raro ma possibile, `UtenteRuolo` è molti-a-molti) — il filtro per Ruolo di `raggruppaVociNavigazione` (Story 15.1, già testato con dati sintetici per il caso "figlie parziali") lo gestisce già correttamente per costruzione (unione via `.some()`), non serve codice nuovo. Facoltativo aggiungere un test di conferma con dati reali se il tempo lo consente, non bloccante.
- [x] Task 4: Verifica (AC: #1, #2)
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npx eslint .` puliti
  - [x] `npm run build` pulito
  - [x] Verifica dal vivo (aspetto visivo reale del gruppo "Orari/Palestre" espanso/collassato, focus da tastiera) non eseguibile in questo ambiente sandbox — stesso limite di Story 15.1 e delle storie precedenti (12.4, 13.1, 14.1, 14.2). **A differenza di Story 15.1**, qui l'impatto pratico non è più trascurabile: questo è il primo gruppo reale mai visto da un utente vero — se possibile, chiedere all'utente una verifica manuale post-deploy (login come Segreteria e come Admin, controllare aspetto/espansione del gruppo "Orari/Palestre").

### Review Findings

- [x] [Review][Patch] Il test del caso a due Ruoli (Segreteria+Admin) usa `expect.arrayContaining` senza controllare la lunghezza esatta né che esista un **solo** nodo gruppo `"Orari/Palestre"` — un bug che duplicasse una figlia (es. `/palestre` inserita due volte) o producesse due nodi gruppo separati con la stessa etichetta passerebbe inosservato (`voci.find(...)` prende comunque il primo). Rafforzare con `toHaveLength(2)` sulle figlie e un controllo esplicito che `voci.filter(v => v.tipo === "gruppo" && v.label === "Orari/Palestre")` abbia lunghezza 1. [lib/auth/voci-navigazione.test.ts] — risolto: uguaglianza esatta con ordine (`toEqual` su array ordinato, non più `arrayContaining`), resa possibile dal fix dell'ordine in `route-guard.ts` (vedi sotto).
- [x] [Review][Patch] Nessun test con dati reali verifica che il gruppo "Orari/Palestre" **non compaia affatto** per un Ruolo senza accesso a nessuna delle due rotte (es. ALLENATORE) — un refuso futuro in `ruoliAmmessi` di `/orari`/`/palestre` che concedesse erroneamente l'accesso a un Ruolo estraneo produrrebbe un gruppo spurio non rilevato da nessun test esistente. [lib/auth/voci-navigazione.test.ts] — risolto: nuovo test dedicato.
- [x] [Review][Patch] Il test `"un Admin vede tutte le voci Admin-ammesse"` ora si limita a non richiedere più `/palestre` in `hrefVoci` — non asserisce esplicitamente che `/palestre` **non** compaia lì, a differenza del pattern `.not.toContain(...)` già in uso nello stesso file per `/smtp`/`/logo` (Story 9.24). Un regressione che facesse "trapelare" `/palestre` sia nel gruppo sia come voce diretta non verrebbe rilevata. Aggiungere `expect(href).not.toContain("/palestre")`. [lib/auth/voci-navigazione.test.ts] — risolto: aggiunte guardie `.not.toContain` per `/palestre` e `/orari`.
- [x] [Review][Patch] Nessun test verifica il caso più comune di sovrapposizione reale — un Utente con **entrambi** i Ruoli ADMIN e DIRIGENTE (che condividono la stessa unica rotta `/palestre`, a differenza del caso più esotico Segreteria+Admin già testato) produce comunque una sola figlia `/palestre` nel gruppo, non due duplicate. [lib/auth/voci-navigazione.test.ts] — risolto: nuovo test dedicato.
- [x] [Review][Patch] Il test `"esiste esattamente un nodo gruppo con i dati reali del progetto: Orari/Palestre"` verifica solo con `filtraVociNavigazione(["ADMIN"])` — il nome suggerisce una garanzia più ampia ("i dati reali del progetto") di quella che offre: non intercetterebbe un `gruppo` valorizzato per errore su una rotta invisibile ad ADMIN (es. una rotta solo-Segreteria/solo-Allenatore). Un controllo diretto su `PROTECTED_ROUTES.filter(r => r.gruppo)` (indipendente dal Ruolo) sarebbe una garanzia più robusta e realmente corrispondente al nome del test. [lib/auth/voci-navigazione.test.ts] — risolto: riscritto per scansionare `PROTECTED_ROUTES` direttamente.
- [x] [Review][Patch] `/palestre` è dichiarata prima di `/orari` in `PROTECTED_ROUTES` — `raggruppaVociNavigazione` preserva l'ordine di iterazione per le figlie, quindi per un ipotetico Utente con entrambi i Ruoli Segreteria+Admin (esplicitamente definito "raro ma possibile" nei Dev Notes della story) le figlie apparirebbero come `["Palestre", "Orari"]`, incoerente con l'ordine dell'etichetta padre "**Orari**/Palestre". Il test a due Ruoli usa `arrayContaining`, insensibile all'ordine, quindi non lo intercetta. Scambiare l'ordine delle due righe in `PROTECTED_ROUTES` (nessun altro test è order-sensitive su queste due rotte — verificato, il test di ordine esatto di Story 15.1 riguarda solo Allenatore). [lib/auth/route-guard.ts] — risolto: `/orari` ora dichiarata prima di `/palestre`. Anche estratto un helper condiviso `trovaGruppo` per i 4+ test che ripetevano lo stesso type guard inline (osservazione minore del Blind Hunter, risolta come effetto collaterale a costo zero mentre si toccavano comunque questi test).
- [x] [Review][Defer] `NavBarClient.tsx` (il componente che renderizza davvero l'accordion, incluso il fix CSS di specificità di Story 15.1, ora finalmente osservabile) non ha alcun test dedicato — ogni nuova asserzione di questo diff opera solo al livello delle funzioni pure (`voci-navigazione.ts`) [app/NavBarClient.tsx] — deferito: coerente con la convenzione "nessun test di rendering" già stabilita ripetutamente in questo progetto (Story 9.9/9.14/9.18, e già dismesso con lo stesso motivo nella review di Story 15.1).

**Dismessi come rumore/fuori scope/convenzioni già accettate (4):** `sprint-status.yaml` modificato nel working tree ma escluso volutamente dal diff sottoposto a review (bookkeeping, non logica applicativa — stessa esclusione deliberata già applicata in ogni review precedente di questa sessione); nessun test per l'ordine esatto del gruppo "Orari/Palestre" per Ruoli diversi da Allenatore — non richiesto da alcun AC/Task, il test di ordine esatto esistente copre già un Ruolo reale per lo scopo dichiarato (rilevare regressioni d'ordine nel ciclo `for`, non certificare ogni possibile Ruolo); nessun test mirato al fix CSS di specificità di Story 15.1 — stessa convenzione "nessun test di rendering" già accettata; story marcata `review` nonostante la verifica manuale post-deploy sia ancora da fare — pattern già ripetutamente accettato in questo progetto per ogni storia con limiti di verifica dal vivo in sandbox (12.4, 13.1, 14.1, 14.2, 15.1).

## Dev Notes

### Cosa NON reinventare (già costruito da Story 15.1)

Questa storia **non** scrive alcuna nuova logica di raggruppamento/accordion — tutto il meccanismo (`raggruppaVociNavigazione`, `isGruppoAttivo`, il rendering `tipo: "gruppo"` in `NavBarClient.tsx`, le classi CSS `.voceGruppo`/`.figlie`/`.voceFiglia`/`.chevron`) è stato scritto e testato (con dati sintetici) da Story 15.1, già `done` con code review completata. Il **solo** cambiamento di codice applicativo di questa storia è valorizzare `gruppo: "Orari/Palestre"` su due righe esistenti di `PROTECTED_ROUTES` — tutto il resto del lavoro è aggiornare i test che quella scelta rompe (Task 2) e aggiungerne di nuovi che verificano il comportamento con dati reali (Task 3). Se ti trovi a scrivere nuova logica di raggruppamento/rendering, fermati: probabilmente stai duplicando qualcosa che esiste già in `lib/auth/voci-navigazione.ts`/`app/NavBarClient.tsx`.

### Bug corretto in Story 15.1 rilevante per questa storia

La code review di Story 15.1 ha trovato e corretto un bug reale di specificità CSS: `.voceAttiva` da sola non aveva alcun effetto se combinata con `.voceGruppo`/`.voceFiglia` (dichiarate dopo nello stesso file, stessa specificità, vincevano nella cascata). Il fix (selettori composti `.voceGruppo.voceAttiva`/`.voceFiglia.voceAttiva`) è già in `app/NavBar.module.css` — **questa storia è la prima a rendere quel fix effettivamente visibile** (prima di Story 15.2 nessun gruppo reale esisteva, quindi il bug era invisibile). Non c'è nulla da fare qui per questo — è solo il motivo per cui la verifica dal vivo (Task 4) è più importante ora che in Story 15.1: se lo stato "attivo" del gruppo/figlia non si vedesse visivamente, sarebbe un segnale che quel fix ha una regressione, non un problema nuovo di questa storia.

### File esistenti da leggere per intero prima di modificare

- **`lib/auth/route-guard.ts`**: le due righe da toccare sono `{ prefix: "/orari", ruoliAmmessi: ["SEGRETERIA"], navLabel: "Orari" }` e `{ prefix: "/palestre", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Palestre" }` — verificarne la posizione esatta nell'array prima di modificare (potrebbe essere cambiata da modifiche successive a Story 15.1, non assumere i numeri di riga di questo documento come definitivi).
- **`lib/auth/voci-navigazione.test.ts`**: leggere per intero — in particolare il test `"nessun nodo gruppo con i dati reali del progetto"` e `"un Admin vede tutte le voci Admin-ammesse"` (Task 2), oltre alla nuova funzione helper `hrefVoci` e al test di ordine esatto per Allenatore aggiunti nella code review di Story 15.1 (quest'ultimo non tocca `/orari`/`/palestre`, Allenatore non vi ha accesso — non dovrebbe rompersi, ma verificarlo comunque eseguendo la suite).

### Project Structure Notes

- Modificati: `lib/auth/route-guard.ts` (2 righe, solo campo `gruppo` aggiunto), `lib/auth/voci-navigazione.test.ts` (2 test adattati + nuovi test).
- Nessuna modifica a `lib/auth/voci-navigazione.ts` o `app/NavBarClient.tsx`/`app/NavBar.module.css` (Story 15.1 li ha già costruiti e testati — questa storia li esercita, non li tocca).
- Nessun nuovo file previsto.

### References

- [Source: epics.md#Epic 15: Riorganizzazione Grafica — Navigazione e Slot, Story 15.2] — AC originali.
- [Source: _bmad-output/implementation-artifacts/15-1-infrastruttura-sotto-menu-navigazione.md] — infrastruttura da riusare, non reinventare; bug CSS corretto in review, ora rilevante.
- [Source: lib/auth/route-guard.ts] — righe da modificare, lette per intero.
- [Source: lib/auth/voci-navigazione.ts, lib/auth/voci-navigazione.test.ts] — meccanismo già pronto e relativi test da estendere.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno.

### Completion Notes List

- Implementate tutte le 4 Task/AC della story: `gruppo: "Orari/Palestre"` valorizzato su `/orari` e `/palestre` in `lib/auth/route-guard.ts` (uniche 2 righe di codice applicativo toccate, nessuna nuova logica — l'infrastruttura di Story 15.1 è stata riusata invariata, non riscritta).
- **Breaking change gestito come previsto**: eseguendo i test subito dopo il Task 1 sono falliti esattamente i 2 test anticipati dalla story (`"nessun nodo gruppo con i dati reali"`, `"un Admin vede tutte le voci Admin-ammesse"`) **più un terzo non esplicitamente elencato** (`"ogni voce ha un href e una label non vuoti"`, che iterava su tutte le voci assumendo sempre `tipo === "voce"`) — trovato seguendo l'istruzione del Task 2 di verificare l'intero file, non solo i due casi già previsti. Tutti e tre adattati (non cancellati), stessa copertura/intento.
- Nuovi test con dati reali: Segreteria vede solo `/orari` nel gruppo, Admin/Dirigente vedono solo `/palestre`, un Utente con entrambi i Ruoli (caso raro ma possibile, `UtenteRuolo` molti-a-molti) vede entrambe le figlie — quest'ultimo confermava un comportamento già garantito dal filtro `.some()` di Story 15.1, aggiunto per completezza come indicato "facoltativo" dalla story.
- Verifica dal vivo (aspetto visivo reale del gruppo espanso/collassato) non eseguibile in questo ambiente sandbox — a differenza di Story 15.1, qui l'impatto pratico non è trascurabile: è il primo gruppo reale mai renderizzato, incluso il bug CSS di specificità corretto nella review di Story 15.1 (ora finalmente esercitato). Richiede una verifica manuale post-deploy (login come Segreteria e come Admin/Dirigente).
- 921/921 test Vitest passati (era 916 prima di questa story, +5: 4 nuovi + 1 dei 3 test adattati che ora ha un caso in più — vedi File List), `eslint`/`tsc --noEmit` puliti, `npm run build` riuscita senza regressioni sulle route esistenti (`/orari`/`/palestre` ancora presenti, autorizzazione invariata).
- **Code review completata**: 6 patch applicati — ordine di `/orari`/`/palestre` in `PROTECTED_ROUTES` invertito così le figlie del gruppo corrispondono all'ordine dell'etichetta padre "Orari/Palestre" nel caso raro di doppio Ruolo (con conseguente rafforzamento del test da `arrayContaining` a uguaglianza esatta ordinata), nuovo test "nessun gruppo per Allenatore", nuovo test dedup Admin+Dirigente sulla stessa `/palestre`, il test "esiste esattamente un nodo gruppo" riscritto per scansionare `PROTECTED_ROUTES` direttamente (indipendente dal Ruolo, non più scoped a solo ADMIN), guardie `.not.toContain` esplicite aggiunte. Estratto anche un helper `trovaGruppo` condiviso (osservazione minore, risolta a costo zero). 1 defer (nessun test dedicato per `NavBarClient.tsx` — convenzione consolidata del progetto). 923/923 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita.

### File List

**Modificati:**
- `lib/auth/route-guard.ts` (`gruppo: "Orari/Palestre"` su `/orari` e `/palestre`; review: ordine invertito, `/orari` prima di `/palestre`)
- `lib/auth/voci-navigazione.test.ts` (3 test esistenti adattati, 4 nuovi test con dati reali; review: 2 nuovi test aggiuntivi, helper `trovaGruppo` condiviso, guardie `.not.toContain`, test a due Ruoli rafforzato a uguaglianza esatta ordinata, test "esiste esattamente un nodo gruppo" riscritto)

## Change Log

- 2026-08-05: Story implementata (Task 1-4 completi). Prima applicazione reale dell'infrastruttura di sotto-menu costruita in Story 15.1 — `/orari` e `/palestre` ora raggruppate sotto "Orari/Palestre", nessuna nuova logica scritta. Breaking change consapevole su 3 test esistenti (2 previsti dalla story + 1 trovato verificando l'intero file), adattati non cancellati. 921/921 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: review.
- 2026-08-05: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Nessuna violazione degli AC (Acceptance Auditor, verifica indipendente completa). 6 patch applicati: ordine `/orari`/`/palestre` invertito in `PROTECTED_ROUTES` per coerenza con l'etichetta "Orari/Palestre" nel caso raro di doppio Ruolo, 2 nuovi test (nessun gruppo per Allenatore, dedup Admin+Dirigente), invariante "esattamente 2 rotte con gruppo" spostata da un test scoped-a-un-Ruolo a una scansione diretta di `PROTECTED_ROUTES`, guardie `.not.toContain` esplicite, helper `trovaGruppo` condiviso. 1 defer (nessun test dedicato per `NavBarClient.tsx`, convenzione già accettata). 4 osservazioni dismesse (bookkeeping fuori scope, verifica manuale post-deploy ancora da fare — pattern già accettato ripetutamente in questo progetto). 923/923 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: done.
