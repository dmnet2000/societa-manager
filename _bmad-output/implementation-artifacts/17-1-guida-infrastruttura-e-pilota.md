---
baseline_commit: e377b5df21ed0207ef1be2b89938446d01f053c8
---

# Story 17.1: Infrastruttura guida in-app e pilota su due pagine

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Utente autenticato con un qualunque Ruolo,
I want consultare una guida delle funzionalità a cui ho accesso, sia in una sezione dedicata sia direttamente nella pagina tramite un aiuto contestuale,
so that possa capire come usare l'app senza dover chiedere aiuto a qualcun altro.

## Acceptance Criteria

1. **Given** un Utente autenticato con un qualunque Ruolo **When** visita `/guida` **Then** vede un indice delle funzionalità a cui ha accesso (filtrato per Ruolo, stesso principio di `PROTECTED_ROUTES`), organizzato per voce.
2. **Given** l'Utente seleziona una voce dell'indice **Then** vede il contenuto guida di quella funzionalità (titolo + testo esplicativo).
3. **Given** l'Utente è su una delle due pagine pilota (`/sponsor` o `/palestre`) **When** clicca l'icona "?" vicino al titolo della pagina **Then** vede lo stesso contenuto guida di quella funzione in un pannello/tooltip, senza lasciare la pagina.
4. **And** una pagina senza contenuto guida associato non mostra l'icona "?" (nessun placeholder rotto).
5. **And** nessuna scrittura: la guida è interamente read-only, nessuna Server Action di creazione/modifica/cancellazione del contenuto.

## Tasks / Subtasks

- [x] Task 1: Modello dei contenuti guida (AC: #1, #2, #4, #5)
  - [x] Nuovo file `lib/guida/contenuti.ts`: array `CONTENUTI_GUIDA` di oggetti `{ rotta: string; titolo: string; ruoliAmmessi: Ruolo[]; corpo: string[] }` (`corpo` = elenco di paragrafi, resi come `<p>` separati — niente Markdown, coerente con la decisione di analisi "nessuna nuova dipendenza"). `rotta` usa lo stesso valore di `prefix` in `PROTECTED_ROUTES` (`lib/auth/route-guard.ts`) — chiave di collegamento tra una pagina reale e il suo contenuto guida, non una mappa duplicata.
  - [x] Contenuto pilota per due voci reali: `/sponsor` (`ruoliAmmessi`: tutti e sei, mirror di `PROTECTED_ROUTES` per quella rotta) e `/palestre` (`ruoliAmmessi: ["ADMIN", "DIRIGENTE"]`, mirror di `PROTECTED_ROUTES`). Testo scritto in italiano, sintetico, orientato all'utente finale (cosa fa la pagina, non come è costruita).
  - [x] Funzioni pure esportate: `contenutiPerRuoli(ruoli: Ruolo[]): ContenutoGuida[]` (filtra `CONTENUTI_GUIDA` per intersezione con `ruoliAmmessi`, AC #1) e `contenutoPerRotta(rotta: string, ruoli: Ruolo[]): ContenutoGuida | null` (AC #3/#4 — `null` se la rotta non ha un contenuto o l'Utente non ha un Ruolo ammesso, cosa che nasconde l'icona "?" invece di mostrarne una vuota/errata).
- [x] Task 2: Pagina `/guida` (AC: #1, #2)
  - [x] `lib/auth/route-guard.ts`: nuova voce `{ prefix: "/guida", ruoliAmmessi: [...tutti e sei], navLabel: "Guida" }` — mirror esatto della voce `/sponsor` (Story 16.2/16.3, prima rotta universale del progetto) per `ruoliAmmessi`.
  - [x] Nuovo route group `app/(guida)/guida/page.tsx`: Server Component, legge `ruoli` dell'Utente (`parseRuoli(user?.app_metadata?.ruoli)`, stesso pattern di `/sponsor`/`/campionati`), chiama `contenutiPerRuoli(ruoli)`, rende un indice (elenco di voci) + il contenuto di ciascuna voce (tutto in pagina, non richiede uno stato client — nessuna interazione necessaria per l'AC #1/#2 così come scritti, un ancoraggio `#slug` per voce è sufficiente per "seleziona una voce dell'indice").
- [x] Task 3: Componente aiuto contestuale riusabile (AC: #3, #4)
  - [x] Nuovo file `app/AiutoContestuale.tsx` (root di `app/`, non sotto `app/(guida)/` — consumato da pagine sparse in tutto il progetto, mirror del posizionamento di `app/SponsorCarosello.tsx`/`app/NavBarClient.tsx`). `"use client"` (stato locale apri/chiudi del pannello). Props: `{ contenuto: ContenutoGuida | null }` — se `null`, il componente non renderizza nulla (AC #4, nessun placeholder).
  - [x] Icona "?" (bottone, `aria-label` esplicito tipo `"Aiuto: <titolo>"`, `aria-expanded`) accanto al `<h1>` della pagina; al click apre un pannello/tooltip col `corpo` del contenuto guida. Chiudibile (click sull'icona di nuovo, o Escape).
  - [x] Applicato a `app/(sponsor)/sponsor/page.tsx` e `app/(orari-palestre)/palestre/page.tsx`: ciascuna pagina calcola il proprio `contenutoPerRotta("/sponsor"|"/palestre", ruoli)` (`/palestre/page.tsx` non leggeva `ruoli` prima di questa storia, aggiunto) e passa il risultato ad `<AiutoContestuale>` accanto al proprio `<h1>`.
- [x] Task 4: Test
  - [x] `lib/guida/contenuti.test.ts` (nuovo): `contenutiPerRuoli` (filtro corretto per singolo/multi Ruolo, nessun risultato per un Ruolo senza voci ammesse), `contenutoPerRotta` (trova il contenuto giusto, `null` per una rotta senza contenuto, `null` se il Ruolo dell'Utente non è tra `ruoliAmmessi` di quella voce anche se la rotta esiste).
  - [x] `lib/auth/route-decision.test.ts` (esteso): nuova voce `/guida` verificata per tutti e sei i Ruoli, mirror dei test già esistenti per `/sponsor`.
  - [x] `lib/auth/voci-navigazione.test.ts` (esteso): 3 test di ordine completo aggiornati (Allenatore, Segreteria, Admin) con la nuova voce diretta `/guida` nella posizione corretta, subito dopo `/sponsor` (stessa lezione già imparata in Story 16.2 per `/sponsor`).
  - [x] Nessun test diretto su `page.tsx`/`AiutoContestuale.tsx` (Server/Client Component) — coerente con la convenzione già stabilita in questo progetto (confermato più volte, es. Story 16.2/16.3); la logica di filtro/lookup testabile è isolata in Task 1.
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

## Dev Notes

### Decisioni di analisi (2026-08-10, prese con l'utente — vedi `epics.md#Epic 17`)

- **Sezione dedicata `/guida`**: indice + contenuto per funzionalità, filtrato per Ruolo (mirror di `PROTECTED_ROUTES`).
- **Help contestuale**: icona "?" vicino al titolo della pagina, apre un pannello/tooltip — non un testo sempre visibile (scartato esplicitamente, troppo invasivo).
- **Contenuto sorgente unico**: la stessa voce di `lib/guida/contenuti.ts` alimenta sia `/guida` sia il pannello contestuale — un solo posto da aggiornare.
- **Nessuna nuova dipendenza Markdown/MDX, nessuna nuova tabella DB**: contenuto scritto in codice (TypeScript), guida interamente read-only — coerente con NFR6 "soluzione più semplice" già seguita ripetutamente (es. Story 16.3, carosello senza libreria esterna).
- **Copertura incrementale**: questa storia è fondativa + pilota su due pagine reali (`/sponsor` universale, `/palestre` Admin/Dirigente-only) per validare entrambi gli scoping. Le altre pagine del progetto (decine) restano da coprire in story successive, non ancora create — elenco aperto, stesso principio di Epic 9.

### Regola di processo permanente (non solo per questa storia)

Da qui in avanti, ogni volta che una story futura aggiunge o modifica una funzionalità visibile all'utente su una pagina che ha già un contenuto in `lib/guida/contenuti.ts`, quel contenuto va aggiornato nello stesso diff — non è un task esplicito di questa storia (che ne crea solo due voci), ma vale per ogni storia successiva. Salvata anche come memoria persistente dell'agente di sviluppo.

### Pattern da riusare (non reinventare)

- **Filtro per Ruolo su un indice**: mirror di `filtraVociNavigazione`/`raggruppaVociNavigazione` (`lib/auth/voci-navigazione.ts`, Story 15.1) per il principio "confronta i Ruoli dell'Utente con `ruoliAmmessi` di ogni voce" — non necessariamente la stessa implementazione (quella produce voci di navigazione, non contenuto guida), ma lo stesso principio di filtro.
- **Estrazione di logica pura testabile da un componente altrimenti non testabile**: mirror di `raggruppaSponsorPerTipo`/`risolviNomeVoucher`/`convenzioneVoucherValida` (`lib/sponsor/`, Story 16.2/16.3) — stesso principio per `contenutiPerRuoli`/`contenutoPerRotta`.
- **Rotta universale visibile a tutti i Ruoli**: mirror esatto di `/sponsor` (Story 16.2) per la voce `/guida` in `route-guard.ts`.
- **Componente client riusabile applicato a pagine esistenti**: mirror di `app/SponsorCarosello.tsx` (Story 16.3) per posizionamento (root di `app/`) e per il principio "dati già risolti/passati come prop, non un fetch client-side" (qui il contenuto guida è statico in codice, ancora più semplice — nessun fetch necessario nemmeno server-side).

### Riferimenti

- [Source: lib/auth/route-guard.ts] — `PROTECTED_ROUTES`, fonte di verità per rotta→Ruoli ammessi, da riusare come riferimento per lo scoping dei contenuti guida.
- [Source: app/(sponsor)/sponsor/page.tsx] — pattern di lettura `ruoli` in una pagina condivisa a tutti i Ruoli.
- [Source: app/(orari-palestre)/palestre/page.tsx] — pagina pilota Admin/Dirigente-only, da leggere per intero prima di aggiungere l'icona "?" (verificare se già legge `user`/`ruoli` o va aggiunto).
- [Source: app/SponsorCarosello.tsx, app/sponsor-carosello.module.css] — mirror di componente client riusabile con proprio CSS module dedicato.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 17: Guida in-app e help contestuale] — decisioni di analisi complete.

### Project Structure Notes

- Nuovo route group `app/(guida)/guida/` — nessun gruppo tematico esistente adatto.
- Nuovo file `lib/guida/contenuti.ts` (+ test) — nuova cartella logica `lib/guida/`, nessuna dipendenza da Prisma/React.
- Nuovo file `app/AiutoContestuale.tsx` (+ CSS module dedicato) — root di `app/`, consumato da più route group in questa e future storie.
- Modificati: `lib/auth/route-guard.ts`, `app/(sponsor)/sponsor/page.tsx`, `app/(orari-palestre)/palestre/page.tsx`.
- Nessuna nuova migrazione, nessuna modifica a `prisma/schema.prisma`.

## Review Findings

Code review con 3 layer adversariali paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) sul diff scoped alla sola Story 17.1.

**Acceptance Auditor**: nessuna violazione degli AC — tutti e 5 verificati indipendentemente (indice `/guida` filtrato per Ruolo, icona "?" su entrambe le pagine pilota senza placeholder, guida interamente read-only). Ha anche rieseguito la suite (136/136) e `tsc --noEmit` per verificare le affermazioni di completamento.

- [x] [Review][Patch] **Bug CSS reale**: il titolo del pannello (`.titoloPannello`) veniva reso nello stesso colore attenuato del corpo invece che in `--color-text-primary` — `.pannello p` (dichiarata dopo, specificità più alta) sovrascriveva `.titoloPannello`. Trovato dal Blind Hunter, insieme a una regola CSS morta collegata (`.pannello p:first-of-type`, no-op). Corretto: `.titoloPannello` dichiarata dopo `.pannello p` per vincere la cascata, regola morta rimossa. [app/aiuto-contestuale.module.css]
- [x] [Review][Patch] Nessun modo di chiudere il pannello cliccando fuori — il progetto ha già un pattern completo per questo in `NavBarClient.tsx` (listener `mousedown` su `document` con rilevamento click-esterno via ref), non riusato. Trovato indipendentemente da Blind Hunter ed Edge Case Hunter. Corretto: effetto a livello di documento che gestisce sia il click esterno sia Escape in un unico posto, mirror del pattern già in `NavBarClient.tsx`, attivo solo mentre il pannello è aperto. [app/AiutoContestuale.tsx]
- [x] [Review][Patch] `role="dialog"` errato per un pannello non modale (nessun `aria-modal`, nessun focus-trap, nessuno spostamento del focus) — e `aria-expanded` sul pulsante senza un `aria-controls` che lo colleghi al pannello. Trovato dal Blind Hunter. Corretto: rimosso `role="dialog"`, aggiunto un `id` univoco al pannello e `aria-controls` sul pulsante che lo referenzia. [app/AiutoContestuale.tsx]
- [x] [Review][Patch] Il pulsante "?" era annidato dentro il `<h1>` della pagina — il nome accessibile del titolo per uno screen reader diventava "Palestre Aiuto: Palestre" invece di "Palestre". Trovato indipendentemente da Blind Hunter ed Edge Case Hunter, su entrambe le pagine pilota. Corretto: `<AiutoContestuale>` spostato come fratello dopo il `</h1>`, non più figlio, con un contenitore flex per l'allineamento visivo invariato. [app/(sponsor)/sponsor/page.tsx, app/(orari-palestre)/palestre/page.tsx]
- [x] [Review][Patch] `/palestre` non aveva mai chiamato Supabase Auth prima di questa storia (gestita solo da `route-guard.ts`) — ora lo fa incondizionatamente solo per decidere se mostrare l'icona "?", un fallimento di quella chiamata romperebbe l'intera pagina di gestione per una funzione puramente cosmetica. Trovato dal Blind Hunter. Corretto: risoluzione di `ruoli` avvolta in un try/catch fail-soft (mirror del pattern già usato in `il-mio-profilo/page.tsx`/`SezioneFoto` per un errore di Storage non bloccante) — un fallimento disabilita solo l'icona "?" (nessun contenuto guida), non l'intera pagina. [app/(orari-palestre)/palestre/page.tsx]
- [x] [Review][Patch] L'eventuale `error` di `getUser()` veniva scartato silenziosamente sia in `guida/page.tsx` sia in `palestre/page.tsx`, a differenza di `/sponsor/page.tsx` (che questa storia dichiara esplicitamente di mirrorare e che invece logga l'errore). Trovato indipendentemente da Blind Hunter ed Edge Case Hunter (2 occorrenze separate). Corretto: `console.error(error)` aggiunto in entrambe le pagine, coerente con `/sponsor`; per `/palestre` risolto insieme al punto precedente (stesso try/catch). [app/(guida)/guida/page.tsx, app/(orari-palestre)/palestre/page.tsx]
- [x] [Review][Patch] Commento fuorviante su `force-dynamic` in `guida/page.tsx`: giustificato con "elenco filtrato per Ruolo" ma `CONTENUTI_GUIDA` è dato statico — il vero motivo è che la pagina legge la sessione dell'Utente ad ogni richiesta. Trovato dal Blind Hunter. Corretto: commento riscritto per riflettere il motivo reale. [app/(guida)/guida/page.tsx]
- [x] [Review][Patch] `ruoliAmmessi` di `lib/guida/contenuti.ts` è una copia manuale di quanto già definito in `PROTECTED_ROUTES` (`route-guard.ts`), senza alcuna verifica automatica che restino sincronizzati — un futuro cambio di Ruoli ammessi su `/sponsor`/`/palestre` (già successo una volta, Story 16.2) potrebbe disallinearsi silenziosamente dal contenuto guida corrispondente. Trovato dal Blind Hunter, con una nota aggiuntiva sul caso ancora più delicato di una futura rotta `permessiConfigurabili` (dove `ruoliAmmessi` in `route-guard.ts` non è nemmeno più la fonte autoritativa). Non risolto con un refactor architetturale (renderebbe `contenutoPerRotta`/`contenutiPerRuoli` asincrone per gestire correttamente il caso `permessiConfigurabili` — fuori scope per una storia pilota su 2 rotte). Corretto in modo mirato: nuovo test che verifica, per ogni voce di `CONTENUTI_GUIDA`, che la rotta esista in `PROTECTED_ROUTES` e che `ruoliAmmessi` coincida (come insieme) — cattura la deriva invece di prevenirla architetturalmente, sufficiente per lo scope pilota di questa storia. [lib/guida/contenuti.test.ts]
- [x] [Review][Patch] Nessuna verifica che i valori di `rotta` in `CONTENUTI_GUIDA` siano univoci — due voci con la stessa rotta produrrebbero chiavi React duplicate e ancore `#slug` duplicate in `/guida`, rompendo la navigazione. Trovato dall'Edge Case Hunter. Corretto: nuovo test che verifica l'unicità di tutte le `rotta`. [lib/guida/contenuti.test.ts]

- [x] [Review][Defer] Nessuna copertura di test automatica sul comportamento a runtime di `AiutoContestuale.tsx` (toggle, Escape, click esterno, `aria-expanded`) — solo le funzioni pure di `lib/guida/contenuti.ts` sono testate (Blind Hunter). Deferred: stesso identico gap già deferito per `SponsorCarosello.tsx` (Story 16.3) — testare un componente React con interazione richiederebbe introdurre React Testing Library (nessuna libreria di test di componenti esiste oggi nel progetto), nuova dipendenza, decisione da prendere con l'utente. [app/AiutoContestuale.tsx]
- [x] [Review][Defer] `slugPerRotta` assume che nessuna rotta pilota abbia un secondo segmento di percorso (`.replace(/^\//, "")` non gestirebbe `/sponsor/abc`) — limite già documentato in un commento, non ancora un problema reale con le sole due rotte pilota di oggi (Blind Hunter). Deferred: da rivisitare quando Epic 17 coprirà una rotta con sotto-percorsi. [app/(guida)/guida/page.tsx]
- [x] [Review][Defer] `contenutoPerRotta` confronta la rotta per uguaglianza esatta, mentre l'autorizzazione altrove nel progetto (`route-guard.ts`) confronta per prefisso (`pathname.startsWith(...)`) — incoerenza tra due nozioni di "rotta" nello stesso progetto, innocua oggi (nessuna voce guida punta a una rotta con sotto-pagine) ma un rischio latente man mano che Epic 17 si estende (Blind Hunter). Deferred: stesso principio del punto sopra, da rivisitare quando servirà davvero. [lib/guida/contenuti.ts]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

Nessuno - nessun blocco incontrato. Stesso errore benigno preesistente del motore Prisma WASM durante il prerendering statico già osservato nelle story precedenti (non introdotto/aggravato da questa story) - la build completa comunque con successo, `/guida` presente nell'elenco finale.

### Completion Notes List

- Task 1: `lib/guida/contenuti.ts` con `CONTENUTI_GUIDA` (contenuto scritto in codice, nessuna nuova dipendenza Markdown/CMS come deciso in analisi) e due funzioni pure `contenutiPerRuoli`/`contenutoPerRotta`. Contenuto pilota per `/sponsor` (tutti i Ruoli) e `/palestre` (Admin/Dirigente), mirror esatto di `ruoliAmmessi` in `PROTECTED_ROUTES` per quelle rotte. 9 nuovi test.
- Task 2: nuova voce `/guida` in `route-guard.ts` (tutti e sei i Ruoli, mirror di `/sponsor`), nuova pagina `app/(guida)/guida/page.tsx` con indice ancorato (`#slug`) + contenuto per voce, filtrato per Ruolo via `contenutiPerRuoli`.
- Task 3: nuovo componente client riusabile `app/AiutoContestuale.tsx` (icona "?" + pannello, chiudibile con click o Escape, nessun placeholder se `contenuto` è `null`). Applicato a `/sponsor` (già leggeva `ruoli`) e `/palestre` (non leggeva `ruoli`/`user` prima di questa story - aggiunta la lettura minima necessaria, la pagina resta comunque Admin/Dirigente-only via `route-guard.ts`, invariato).
- Task 4: test estesi per `/guida` in `route-decision.test.ts` (tutti i Ruoli) e `voci-navigazione.test.ts` (3 test di ordine completo aggiornati - Allenatore, Segreteria, Admin - con la nuova voce diretta subito dopo `/sponsor`). 1055/1055 test Vitest passati (era 1040), 0 errori tsc/eslint, build produzione riuscita.
- **Regola di processo permanente** (Dev Notes della story, salvata anche come memoria persistente dell'agente): da ora in avanti, ogni story che tocca `/sponsor` o `/palestre` deve verificare se il proprio contenuto in `lib/guida/contenuti.ts` va aggiornato di conseguenza.
- Verifica dal vivo (apertura pannello "?", navigazione ancore in `/guida`) non eseguibile in questo sandbox (nessun browser reale) - demandata all'utente.

### File List

- `lib/guida/contenuti.ts` (nuovo)
- `lib/guida/contenuti.test.ts` (nuovo, poi esteso in code review: test di coerenza con `PROTECTED_ROUTES` + unicità rotte)
- `lib/auth/route-guard.ts` (modificato: nuova voce `/guida`)
- `lib/auth/route-decision.test.ts` (modificato: nuovi test `/guida`)
- `lib/auth/voci-navigazione.test.ts` (modificato: 3 test di ordine completo aggiornati con `/guida`)
- `app/(guida)/guida/page.tsx` (nuovo, poi modificato in code review: log errore `getUser()`, commento `force-dynamic` corretto)
- `app/(guida)/guida/guida.module.css` (nuovo)
- `app/AiutoContestuale.tsx` (nuovo, poi riscritto in code review: click-esterno/Escape mirror `NavBarClient.tsx`, `role="dialog"` rimosso, `aria-controls`/`id`)
- `app/aiuto-contestuale.module.css` (nuovo, poi modificato in code review: bug CSS specificità sul titolo del pannello, CSS morto rimosso)
- `app/(sponsor)/sponsor/page.tsx` (modificato: aiuto contestuale, poi corretto in code review: spostato fuori dal `<h1>`)
- `app/(sponsor)/sponsor/sponsor.module.css` (modificato in code review: nuova classe `.intestazionePagina`)
- `app/(orari-palestre)/palestre/page.tsx` (modificato: lettura `ruoli` aggiunta + aiuto contestuale, poi corretto in code review: try/catch fail-soft, spostato fuori dal `<h1>`)
- `app/(orari-palestre)/palestre/palestre.module.css` (modificato in code review: nuova classe `.intestazionePagina`)

## Change Log

- 2026-08-10: File di story creato, stato ready-for-dev.
- 2026-08-10: Implementata - modello contenuti guida, pagina `/guida` scoped per Ruolo, componente aiuto contestuale applicato a `/sponsor` e `/palestre` come pilota. 1055/1055 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: review.
- 2026-08-10: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor) - nessuna violazione degli AC. 9 patch applicati: bug CSS reale (titolo del pannello nel colore sbagliato) + CSS morto, click-esterno/Escape per chiudere il pannello (mirror `NavBarClient.tsx`), `role="dialog"` errato sostituito con `aria-controls`/`id`, pulsante "?" spostato fuori dal `<h1>` (inquinava il nome accessibile del titolo), `/palestre` reso resiliente a un fallimento di Supabase Auth (try/catch fail-soft, prima poteva rompere l'intera pagina per una funzione cosmetica), log dell'errore `getUser()` allineato a `/sponsor`, commento `force-dynamic` corretto, 2 nuovi test di coerenza (`CONTENUTI_GUIDA` vs `PROTECTED_ROUTES`, nessuna rotta duplicata). 3 defer (nessuna copertura di test su `AiutoContestuale` - richiederebbe React Testing Library, `slugPerRotta` non gestisce rotte annidate, `contenutoPerRotta` confronta per uguaglianza esatta invece che per prefisso). 1057/1057 test Vitest passati (era 1055), 0 errori tsc/eslint, build produzione riuscita. Status: done.
- 2026-08-10: Estensione post-review segnalata dall'utente dal vivo ("il '?' per la guida sia stilizzato in modo più coerente alla pagina"): `.pulsante` usava `border-radius: 50%` (cerchio pieno), in violazione esplicita di DESIGN.md ("Nessuna forma a pillola nel sistema"). Riallineato allo stile già stabilito per i pulsanti-icona del progetto (`.freccia` del carosello Sponsor, icone modifica/cancella): bordo + sfondo superficie + `radius-sm`, non un badge colorato a sé. 1057/1057 test Vitest passati (invariato). Status invariato: done.
