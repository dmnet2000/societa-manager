---
baseline_commit: ff94776815aac8cd3efa3963301d31237871993b
---

# Story 9.25: Ordinamento per stato nella sezione "Confermati"

Status: ready-for-dev

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

- [ ] Task 1: Nuova utility pura di ordinamento (AC: #2)
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
  - [ ] Nuovo `lib/ordina-certificati-per-stato.test.ts`: righe miste riordinate correttamente (SCADUTO prima di IN_SCADENZA prima di IN_REGOLA), parità di stato → ordine alfabetico per nome (case-sensitivity/accenti gestiti da `localeCompare("it")`), array vuoto → `[]`, array già ordinato → invariato, **non muta l'array originale** (verificare che l'input passato non venga modificato, `[...righe].sort` crea una copia)
- [ ] Task 2: Estrarre `ListaConfermati.tsx` (Client Component) (AC: #1, #2)
  - [ ] Nuovo `app/(certificati-medici)/conferma-certificati/ListaConfermati.tsx`, `"use client"`. Riceve `righe: { atletaId: string; nome: string; dataFineValidita: string | null; stato: StatoCertificatoAggregato }[]` come prop (dati già serializzabili, nessuna Date/oggetto Prisma)
  - [ ] Spostare qui `CLASSE_BADGE`/`ETICHETTA_BADGE` (oggi in `page.tsx`, righe 13-28) — invariati nel contenuto, solo il file cambia
  - [ ] Stato locale: `const [ordinatoPerStato, setOrdinatoPerStato] = useState(false);`
  - [ ] `const righeVisualizzate = ordinatoPerStato ? ordinaPerPrioritaStato(righe) : righe;` (usare `useMemo` per evitare di riordinare ad ogni render se non necessario — dipendenze `[righe, ordinatoPerStato]`)
  - [ ] Header sopra la lista: un `<button>` (mai un `<span>` cliccabile, per tastiera/screen reader) con testo "Stato", `aria-pressed={ordinatoPerStato}`, `onClick={() => setOrdinatoPerStato((v) => !v)}` — click attiva l'ordinamento per priorità, click successivo torna all'ordine per nome (toggle semplice, non un ciclo a più stati)
  - [ ] Renderizzare `righeVisualizzate.map(...)` con lo stesso markup oggi in `page.tsx` (righe 144-155: `<li className={styles.rigaConfermata}>` con `<span className={styles.nomeConData}>` + badge condizionale) — **nessuna modifica visiva alle righe stesse**, solo l'header nuovo e l'origine dei dati (`righeVisualizzate` invece di `confermati` iterato direttamente)
- [ ] Task 3: Aggiornare `page.tsx` (AC: #1, #3)
  - [ ] Rimuovere `CLASSE_BADGE`/`ETICHETTA_BADGE` da `page.tsx` (spostati in `ListaConfermati.tsx`)
  - [ ] Nel blocco "Confermati", **mantenere invariato** il calcolo server-side di `categorizzaStatoCertificato` per riga (incluso il `console.warn` difensivo per `SENZA_CERTIFICATO`, Story 9.23 review fix) — costruire un array `righeConfermati: { atletaId: string; nome: string; dataFineValidita: string | null; stato: StatoCertificatoAggregato }[]` e passarlo a `<ListaConfermati righe={righeConfermati} />` invece del `.map` JSX diretto oggi presente (righe 121-157)
  - [ ] Il ramo "nessun certificato confermato" (`confermati.length === 0`, messaggio vuoto) resta invariato e **fuori** da `ListaConfermati` — quel componente viene montato solo quando c'è almeno una riga
  - [ ] **Non toccare** la sezione "Da confermare" (righe 79-114) né `ConfermaCertificatoRow.tsx`
- [ ] Task 4: CSS — header e bottone "Stato" (AC: #1, #2)
  - [ ] `app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css`: nuove classi `.headerConfermati` (flex, `justify-content: space-between`, `align-items: center`, stesso font/colore di `.sezione h2` per l'etichetta statica a sinistra se presente, o solo il bottone a destra allineato con la colonna badge) e `.bottoneOrdina` (bottone senza bordo/sfondo proprio, `font-size: 11px`, `font-weight: 700`, `text-transform: uppercase`, `color: var(--color-text-secondary)`, `cursor: pointer`, `focus-visible` con `outline: 2px solid var(--color-focus-ring); outline-offset: 2px;` — stesso pattern accessibilità di ogni altro bottone del progetto). Nessun'icona/freccia necessaria per l'AC di questa storia (solo il testo "Stato" cliccabile)
- [ ] Task 5: Verifica regressione (AC: #3)
  - [ ] Suite Vitest completa: tutti i test esistenti devono continuare a passare, più i nuovi test di `ordina-certificati-per-stato.test.ts`
  - [ ] `npx tsc --noEmit` ed ESLint puliti
  - [ ] Nessun test di rendering per `ListaConfermati.tsx` (coerente con la convenzione "nessun test di rendering" già stabilita nel progetto per i Client Component) — solo la funzione pura di ordinamento è testata

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

### Debug Log References

### Completion Notes List

### File List
