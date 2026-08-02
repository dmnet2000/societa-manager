---
baseline_commit: ff94776815aac8cd3efa3963301d31237871993b
---

# Story 9.25: Ordinamento per stato nella sezione "Confermati"

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin/Dirigente/Segreteria che consulta `/conferma-certificati`,
I want poter ordinare la sezione "Confermati" cliccando su un'etichetta "Stato" in testa alla lista, con priorità Scaduto → In scadenza → In regola,
so that posso portare in cima chi richiede attenzione più urgente invece di scorrere l'intera lista in ordine alfabetico.

**Note aggiuntive:** estensione diretta della Story 9.23 (badge verde/giallo/rosso). **Decisione presa con l'utente in fase di richiesta**: un'unica etichetta cliccabile "Stato" in testa alla lista "Confermati" applica l'ordinamento per priorità (Scaduto, poi In scadenza, poi In regola; a parità di stato, ordine alfabetico per nome) — **non** un controllo di ordinamento generico multi-colonna/multi-direzione, solo questo singolo criterio applicato al click. Riusa `categorizzaStatoCertificato` (Story 5.1/9.19/9.23) e le classi badge già introdotte da Story 9.23 — nessun nuovo calcolo di stato, nessuna nuova migrazione. **Prima interazione client-side di ordinamento su una lista in questo progetto**: la sezione "Confermati" (oggi renderizzata interamente dentro il Server Component `page.tsx`, Story 9.23) va estratta in un nuovo Client Component per ospitare lo stato locale (ordinato per stato sì/no). La sezione "Da confermare" **non è toccata**.

## Acceptance Criteria

1. **Given** la sezione "Confermati" di `/conferma-certificati` **When** la pagina si carica per la prima volta **Then** l'ordine è quello attuale (per nome Atleta, ordine di `elencaAtlete`), un'etichetta cliccabile "Stato" è visibile in testa alla lista
2. **Given** la sezione "Confermati" **When** un Admin/Dirigente/Segreteria clicca l'etichetta "Stato" **Then** la lista si riordina mostrando prima i certificati Scaduti, poi quelli In scadenza, poi quelli In regola (a parità di stato, ordine alfabetico per nome)
3. **And** nessuna regressione sulla sezione "Da confermare" né sul comportamento di conferma esistente (Story 4.4/9.20/9.23) — suite Vitest invariata sui casi esistenti non impattati

## Tasks / Subtasks

- [x] Task 1: Nuova utility pura di ordinamento (AC: #2)
  - [ ] Nuovo `lib/ordina-certificati-per-stato.ts`:
    ```ts
    import type { StatoCertificatoAggregato } from "@/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato";

    // Priorita' di visualizzazione quando l'ordinamento per stato e' attivo:
    // Scaduto prima di tutto (piu' urgente), poi In scadenza, poi In regola.
    // SENZA_CERTIFICATO non e' raggiungibile in pratica per la sezione
    // "Confermati" (Story 9.23) ma incluso per completezza del tipo, ultimo.
    const PRIORITA_STATO: Record<StatoCertificatoAggregato, number> = {
      SCADUTO: 0,
      IN_SCADENZA: 1,
      IN_REGOLA: 2,
      SENZA_CERTIFICATO: 3,
    };

    export function ordinaPerPrioritaStato<
      T extends { stato: StatoCertificatoAggregato; nome: string }
    >(righe: T[]): T[] {
      return [...righe].sort((a, b) => {
        const diff = PRIORITA_STATO[a.stato] - PRIORITA_STATO[b.stato];
        if (diff !== 0) return diff;
        return a.nome.localeCompare(b.nome, "it");
      });
    }
    ```
    Nota: `categorizza-stato-certificato.ts` deve esportare `StatoCertificatoAggregato` (già definito lì, verificare che sia `export type`, non solo interno al modulo)
  - [x] Nuovo `lib/ordina-certificati-per-stato.test.ts`: 7 test (priorità, parità nome, accenti, array vuoto, già ordinato, non muta l'originale, SENZA_CERTIFICATO ultimo) — tutti passano
- [x] Task 2: Estrarre `ListaConfermati.tsx` (Client Component) (AC: #1, #2)
  - [x] Nuovo `app/(certificati-medici)/conferma-certificati/ListaConfermati.tsx`, `"use client"`, riceve `righe` serializzabili
  - [x] `CLASSE_BADGE`/`ETICHETTA_BADGE` spostati qui, invariati
  - [x] Stato locale `ordinatoPerStato` + `useMemo` per `righeVisualizzate`
  - [x] Header con `<button aria-pressed>` "Stato", toggle semplice
  - [x] Stesso markup di riga di prima, solo origine dati diversa
- [x] Task 3: Aggiornare `page.tsx` (AC: #1, #3)
  - [x] `CLASSE_BADGE`/`ETICHETTA_BADGE` rimossi da `page.tsx` (spostati)
  - [x] Calcolo server-side di `categorizzaStatoCertificato` + `console.warn` difensivo mantenuti invariati, ora passati come prop a `<ListaConfermati righe={...} />`
  - [x] Ramo "nessun certificato confermato" invariato, fuori da `ListaConfermati`
  - [x] Sezione "Da confermare"/`ConfermaCertificatoRow.tsx` non toccate
- [x] Task 4: CSS — header e bottone "Stato" (AC: #1, #2)
  - [x] Nuove classi `.headerConfermati` (allineato a destra, sopra la lista) e `.bottoneOrdina` (bottone senza bordo/sfondo, focus-visible standard)
- [x] Task 5: Verifica regressione (AC: #3)
  - [x] Suite Vitest completa: 802/802 test passati (+7 nuovi)
  - [x] `npx tsc --noEmit` pulito (0 errori); ESLint pulito su tutti i file modificati/nuovi
  - [x] Nessun test di rendering per `ListaConfermati.tsx` (convenzione già stabilita)

### Review Findings

- [x] [Review][Patch] La formattazione della data (`new Date(dataFineValidita).toLocaleDateString("it-IT")`) era stata spostata dentro `ListaConfermati.tsx` (Client Component) — a differenza di un Server Component (mai idratato), questo codice si riesegue anche in hydration nel browser: se il fuso orario del server differisse da quello del browser, il valore renderizzato lato server e quello ricalcolato in hydration potrebbero non coincidere (mismatch di idratazione), specialmente vicino alla mezzanotte locale. [app/(certificati-medici)/conferma-certificati/ListaConfermati.tsx, page.tsx] — risolto: la formattazione avviene ora in `page.tsx` (`timeZone: "UTC"` esplicito, stesso principio già applicato in `lib/raggruppa-per-settimana.ts`, Story 10.3), il Client Component riceve solo `dataFineValiditaFormattata: string | null` già pronta, nessuna chiamata a `new Date()`/`toLocaleDateString` lato client.
- [x] [Review][Defer] Nessun indicatore visivo di direzione sull'etichetta "Stato" (solo `aria-pressed`, il testo del bottone resta identico) — un Utente vedente non ha modo di sapere se l'ordinamento è attivo senza cliccare e osservare il riordino. Miglioramento UX, nessun AC lo richiede.
- [x] [Review][Defer] Nessun `aria-controls`/relazione esplicita tra il bottone "Stato" e la lista che governa — solo prossimità visiva. Nessun precedente di questo pattern nel progetto (es. il menu profilo non lo usa nemmeno).
- [x] [Review][Defer] Nessun test di interazione per `ListaConfermati.tsx` (click sul bottone, verifica che l'ordine renderizzato cambi) — coerente con la convenzione "nessun test di rendering" già stabilita per i Client Component in questo progetto, solo la funzione pura di ordinamento è testata.
- [x] [Review][Defer] Il bottone "Stato" compare anche con una sola riga confermata, dove l'ordinamento non ha alcun effetto osservabile — cosmetico, nessun danno.
- [x] [Review][Defer] `localeCompare(nome, "it")` senza opzioni esplicite di sensitivity, solo un caso di test per gli accenti — copertura minima ma coerente con il livello di test già accettato altrove nel progetto per confronti stringa simili.
- [x] [Review][Defer] `StatoCertificatoAggregato` è enumerato in tre punti indipendenti (mappa priorità in `ordina-certificati-per-stato.ts`, mappa classe badge e mappa etichetta badge in `ListaConfermati.tsx`) — l'esaustività di `Record<...>` di TypeScript impedisce di dimenticare una chiave, ma restano comunque tre punti di manutenzione per lo stesso concetto.
- [x] [Review][Dismiss] Il toggle non inverte l'ordine per stato al secondo click (torna all'ordine per nome, non a un ordine per stato invertito) — comportamento deliberato e già documentato esplicitamente nella storia ("Toggle semplice, non un ciclo", deciso con l'utente in fase di creazione), non un difetto.
- [x] [Review][Dismiss] "L'ordine di default per nome non è mai stabilito esplicitamente nel codice di questa storia" — verificato falso: `elencaAtlete` (`lib/db-rls/atleta.ts`) ordina già lato server per `nome` ascendente (`.order("nome", { ascending: true })`), comportamento preesistente non introdotto né da ristabilire in questa storia.
- [x] [Review][Dismiss] Allineamento CSS di `.headerConfermati` con la colonna badge "asserito solo in un commento, non verificato" — verificato: né `.headerConfermati` né `.rigaConfermata` hanno padding orizzontale proprio, quindi i bordi destri si allineano naturalmente sullo stesso contenitore; nessun disallineamento reale.
- [x] [Review][Dismiss] Rischio di divergenza tra `ReturnType<typeof categorizzaStatoCertificato>` (uso precedente in `page.tsx`) e `StatoCertificatoAggregato` (nuovo import diretto) — verificato falso: `categorizzaStatoCertificato` dichiara già esplicitamente `: StatoCertificatoAggregato` come tipo di ritorno, i due tipi sono garantiti identici da TypeScript, non solo coincidentalmente uguali oggi.
- [x] [Review][Dismiss] Nessun test di regressione dedicato per l'estrazione stessa (spostamento di ~40 righe da `page.tsx` a `ListaConfermati.tsx`) — coperto dalla suite Vitest completa (802/802 invariata/estesa) e dalla convenzione "nessun test di rendering" già accettata nel progetto.
- [x] [Review][Dismiss] Commento "SENZA_CERTIFICATO non raggiungibile in pratica" duplicato in due file — stesso stile di commenti contestuali duplicati già accettato ovunque nel progetto.
- [x] [Review][Dismiss] Una riga con stato anomalo (`SENZA_CERTIFICATO`) viene comunque ordinata e mostrata (in fondo, per priorità) — comportamento preesistente da Story 9.23 (già accettato con `console.warn` difensivo), non introdotto da questa storia.

## Dev Notes

- **Perimetro esatto**: nuovo `lib/ordina-certificati-per-stato.ts` (+ test), nuovo `app/(certificati-medici)/conferma-certificati/ListaConfermati.tsx`, `page.tsx` e `conferma-certificati.module.css` modificati. Nessuna migrazione, nessuna nuova Server Action, `categorizzaStatoCertificato` riusata **invariata**.
- **Perché estrarre un Client Component**: `page.tsx` è un Server Component async (`export default async function`) — non può avere `useState`. Il click sull'etichetta "Stato" richiede interattività locale (nessuna richiesta al server, nessuna Server Action, puro riordino in memoria dei dati già caricati) — da qui l'estrazione minima (solo la sezione "Confermati", non l'intera pagina).
- **Dati passati al Client Component devono essere serializzabili**: `dataFineValidita` va passato come `string | null` (già così oggi, `certificato?.dataFineValidita as string | undefined` — normalizzare a `null` invece di `undefined` per coerenza con la firma di `categorizzaStatoCertificato`), mai un oggetto `Date` o un record Prisma grezzo.
- **`categorizzaStatoCertificato` e il `console.warn` difensivo restano lato server** (in `page.tsx`, non in `ListaConfermati.tsx`) — è già stato calcolato una volta per riga in Story 9.23, non ricalcolarlo lato client; il Client Component riceve solo il risultato già pronto (`stato: StatoCertificatoAggregato`).
- **Toggle semplice, non un ciclo**: click su "Stato" attiva l'ordinamento per priorità; click successivo torna all'ordine per nome. Non implementare un terzo stato/direzione inversa — non richiesto, mantiene lo scope stretto come deciso con l'utente.
- **`StatoCertificatoAggregato` deve essere esportato** da `app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts` (verificare l'`export type` esistente, riga 9 di quel file — già presente, solo da importare correttamente nei nuovi file)
- **File NON da toccare**: `app/(certificati-medici)/conferma-certificati/ConfermaCertificatoRow.tsx` e la sezione "Da confermare" di `page.tsx` (fuori scope), `app/(certificati-medici)/conferma-certificati/actions.ts` (nessuna Server Action cambia), `app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts` (riusata invariata).

### Project Structure Notes

- File nuovi: `lib/ordina-certificati-per-stato.ts`, `lib/ordina-certificati-per-stato.test.ts`, `app/(certificati-medici)/conferma-certificati/ListaConfermati.tsx`.
- File modificati: `app/(certificati-medici)/conferma-certificati/page.tsx`, `app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css`.
- Nessun file eliminato, nessuna migrazione.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.25: Ordinamento per stato nella sezione "Confermati"]
- [Source: _bmad-output/implementation-artifacts/9-23-colore-semantico-certificati-confermati.md — storia precedente che ha introdotto CLASSE_BADGE/ETICHETTA_BADGE e il calcolo dello stato in page.tsx, da spostare/riusare qui]
- [Source: app/(certificati-medici)/conferma-certificati/page.tsx righe 1-28 (CLASSE_BADGE/ETICHETTA_BADGE da spostare), 116-159 (blocco "Confermati" da estrarre)]
- [Source: app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css righe 117-173 — .listaConfermati/.rigaConfermata/.nomeConData/badge* da riusare invariati in ListaConfermati.tsx]
- [Source: app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts — StatoCertificatoAggregato/categorizzaStatoCertificato, riusati invariati]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

### Completion Notes List

- Task 1: nuova utility pura `ordinaPerPrioritaStato` (`lib/ordina-certificati-per-stato.ts`), priorità SCADUTO→IN_SCADENZA→IN_REGOLA→SENZA_CERTIFICATO, tie-break `localeCompare("it")`. 7 test, tutti passano (inclusa non-mutazione dell'array originale).
- Task 2: nuovo Client Component `ListaConfermati.tsx` — `CLASSE_BADGE`/`ETICHETTA_BADGE` spostati da `page.tsx`, stato locale `ordinatoPerStato` + `useMemo`, header con `<button aria-pressed>` "Stato" (toggle semplice nome↔priorità).
- Task 3: `page.tsx` calcola ancora `categorizzaStatoCertificato`/il `console.warn` difensivo lato server (invariato da Story 9.23), passa un array serializzabile a `ListaConfermati`. Sezione "Da confermare" non toccata.
- Task 4: nuove classi CSS `.headerConfermati`/`.bottoneOrdina`, stesso registro di focus-visible del resto del progetto.
- Task 5: 802/802 test passati (+7 nuovi), `tsc --noEmit` pulito, ESLint pulito. Nessun test di rendering per il nuovo Client Component (convenzione già stabilita).
- Code review (2026-08-02): Blind Hunter + Edge Case Hunter + Acceptance Auditor — 0 decision-needed, 1 patch applicato (formattazione data spostata da `ListaConfermati.tsx`/Client Component, dove si sarebbe riesguita anche in hydration con rischio di mismatch se il fuso orario del server differisse da quello del browser, a `page.tsx`/Server Component con `timeZone: "UTC"` esplicito — stesso principio già applicato in Story 10.3). 7 defer (nessun indicatore visivo di direzione, nessun `aria-controls`, nessun test di interazione — convenzione, bottone visibile anche con 1 riga, `localeCompare` senza opzioni esplicite, `StatoCertificatoAggregato` enumerato in 3 punti), 6 scartati come falsi positivi verificati (toggle non-ciclico è deliberato, ordine di default per nome già garantito da `elencaAtlete`, allineamento CSS verificato corretto, nessun rischio di drift tra i due riferimenti di tipo — `categorizzaStatoCertificato` già dichiara esplicitamente `StatoCertificatoAggregato`, estrazione coperta dalla suite completa, commento duplicato già accettato). 802/802 test passati, 0 errori tsc/eslint dopo il fix.

### File List

- `lib/ordina-certificati-per-stato.ts` (nuovo)
- `lib/ordina-certificati-per-stato.test.ts` (nuovo)
- `app/(certificati-medici)/conferma-certificati/ListaConfermati.tsx` (nuovo — formattazione data rimossa in review)
- `app/(certificati-medici)/conferma-certificati/page.tsx` (modificato — CLASSE_BADGE/ETICHETTA_BADGE rimossi, sezione "Confermati" delegata a ListaConfermati, formattazione data con timeZone:"UTC" aggiunta in review)
- `app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css` (modificato — nuove classi header/bottone ordina)

## Change Log

- 2026-08-02: Implementata Story 9.25 — etichetta cliccabile "Stato" in testa alla lista "Confermati" di `/conferma-certificati`, ordina per priorità Scaduto→In scadenza→In regola (tie-break alfabetico). Prima interazione client-side di ordinamento su una lista in questo progetto — sezione "Confermati" estratta in un nuovo Client Component `ListaConfermati.tsx`, `categorizzaStatoCertificato` resta calcolata lato server (Story 9.23, invariata). "Da confermare" non toccata. 802/802 test passati, 0 errori tsc/eslint.
- 2026-08-02: Code review completata — 1 patch applicato (formattazione data spostata lato server con `timeZone: "UTC"` esplicito, evita un rischio di mismatch di idratazione introdotto dall'estrazione in Client Component), 7 defer, 6 scartati come falsi positivi verificati. 802/802 test passati, 0 errori tsc/eslint dopo il fix. Status: done.
