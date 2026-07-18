---
baseline_commit: NO_VCS
---

# Story 3.3: Storico presenze con trend/percentuale

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore,
I want vedere un indicatore di percentuale/trend nello storico presenze,
so that ho un supporto rapido per le scelte di formazione.

## Acceptance Criteria

1. **Given** lo storico presenze di un'Atleta esiste (almeno una Presenza registrata, Story 3.2), **when** lo consulto — sia come Allenatore (sezione "Storico delle mie Atlete") sia come Atleta (sezione "Il mio storico"), stessa tabella condivisa — **then** vedo una percentuale di presenza (Presenze `presente=true` / totale registrazioni, arrotondata all'intero più vicino) accanto all'elenco cronologico.
2. Vedo anche un trend testuale tra "in calo", "costante", "in crescita", calcolato confrontando la percentuale di presenza della prima metà cronologica dello storico con quella della seconda metà (vedi Dev Notes per l'algoritmo esatto).
3. Se lo storico è vuoto (nessuna Presenza registrata), non viene mostrato alcun indicatore di percentuale/trend — resta invariato il messaggio "Nessuna Presenza registrata." già esistente (Story 3.2), nessuna divisione per zero.
4. Se lo storico ha una sola Presenza registrata (nessuna "metà" precedente con cui confrontare), il trend è "costante" per convenzione (dato insufficiente per un confronto) — la percentuale resta comunque mostrata (100% o 0% a seconda dell'unico valore).
5. Il confronto fra le due metà usa una soglia di 10 punti percentuali: una differenza entro la soglia risulta "costante", non "in crescita"/"in calo" — scelta implementativa deliberata per evitare che oscillazioni statisticamente irrilevanti (es. una sola presenza di differenza su pochi Slot) vengano etichettate come un trend reale. Non è un valore specificato da FR-10/PRD, è regolabile in futuro se si rivelasse poco utile in pratica.

## Prerequisiti architetturali di questa storia (da leggere prima di iniziare)

**Storia a footprint minimo**: nessuna nuova tabella, nessuna migrazione, nessuna nuova policy RLS, nessuna nuova query. `leggiStoricoPresenzePerAtleta` (Story 3.2, `lib/db-rls/presenza.ts`) già restituisce l'intero storico ordinato cronologicamente (`data` asc, `id` asc come spareggio) — questa storia aggiunge solo un **calcolo puro** (percentuale + trend) sopra i dati già caricati da `StoricoTable` in `app/(presenze)/storico-presenze/page.tsx`, e la sua resa in UI.

**Nota su FR-10 e priorità**: sia il PRD (§6.2 "Fuori Perimetro v1, differito") sia epics.md (`Note: Could — miglioramento incrementale, non bloccante`) classificano questa storia come differibile. È stata comunque messa in lavorazione ora su richiesta esplicita dell'utente, per chiudere l'Epic 3 — non è un cambio di scope del PRD, solo un riordino di sequenza.

**Nota su chi vede l'indicatore**: la user story dice "As a Allenatore", ma `StoricoTable` è un componente condiviso, già renderizzato identico sia nella sezione Atleta ("Il mio storico") sia nella sezione Allenatore ("Storico delle mie Atlete") — vedi `page.tsx` esistente. Costruire l'indicatore dentro `StoricoTable` (non duplicarlo per ramo) significa che compare per entrambi i Ruoli. Questa è la scelta di questa storia: coerente con il riuso del componente già stabilito in Story 3.2, ed FR-10 di per sé non esclude l'Atleta ("Lo storico presenze mostra un indicatore di percentuale/trend" — generico). Non introdurre un ramo condizionale per nascondere l'indicatore all'Atleta: nessun AC lo richiede e complicherebbe il componente senza motivo.

### Colocazione del modulo di calcolo — segue il precedente di `parser.ts`

Questa codebase ha già un precedente per logica pura, feature-specifica, colocata dentro la cartella della route invece che in `lib/` condiviso: `app/(onboarding-import)/import-atlete/parser.ts` (+ `.test.ts`). Nessuna delle funzioni di calcolo di questa storia è condivisa fra moduli (a differenza di `lib/anno-agonistico/`, `lib/matching-codice-fiscale/`, che AD-5/AD-8 vincolano esplicitamente come servizi condivisi) — segue lo stesso pattern:

```ts
// app/(presenze)/storico-presenze/calcola-statistiche-presenza.ts
export type Trend = "in-calo" | "costante" | "in-crescita";

export type StatistichePresenza = {
  percentuale: number; // 0-100, arrotondata (Math.round)
  trend: Trend;
};

const SOGLIA_PUNTI_PERCENTUALI = 10;

export function calcolaStatistichePresenza(
  storico: { presente: boolean }[]
): StatistichePresenza | null {
  if (storico.length === 0) return null;

  const percentuale = calcolaPercentuale(storico);

  if (storico.length === 1) {
    return { percentuale, trend: "costante" };
  }

  const metaIndex = Math.floor(storico.length / 2);
  const primaMeta = storico.slice(0, metaIndex);
  const secondaMeta = storico.slice(metaIndex);
  const diff = calcolaPercentuale(secondaMeta) - calcolaPercentuale(primaMeta);

  const trend: Trend =
    diff > SOGLIA_PUNTI_PERCENTUALI
      ? "in-crescita"
      : diff < -SOGLIA_PUNTI_PERCENTUALI
        ? "in-calo"
        : "costante";

  return { percentuale, trend };
}

function calcolaPercentuale(righe: { presente: boolean }[]): number {
  return Math.round(
    (righe.filter((r) => r.presente).length / righe.length) * 100
  );
}

export const ETICHETTA_TREND: Record<Trend, string> = {
  "in-calo": "in calo",
  costante: "costante",
  "in-crescita": "in crescita",
};
```

Nota sullo split a metà: `Math.floor(length / 2)` per `metaIndex` — con lunghezza dispari, la seconda metà (più recente) riceve la riga "in mezzo" in più. Scelta arbitraria ma innocua: non esiste un'unica divisione "corretta", e non è specificata da AC/PRD.

## Tasks / Subtasks

- [x] Task 1: `app/(presenze)/storico-presenze/calcola-statistiche-presenza.ts` (nuovo) (AC: #1, #2, #3, #4, #5)
  - [x] Implementare `calcolaStatistichePresenza` + `ETICHETTA_TREND` come da Prerequisito architetturale sopra (algoritmo, soglia, split a metà, caso singola riga, caso vuoto → `null`).
  - [x] Test TDD (`calcola-statistiche-presenza.test.ts`): storico vuoto → `null`; una sola riga presente/assente → percentuale 100/0, trend `costante`; due metà con differenza sopra soglia (entrambe le direzioni) → `in-crescita`/`in-calo`; differenza esattamente alla soglia (10 punti) e appena sotto → `costante` (verifica il confine `>`/`<` stretto, non `>=`/`<=`); percentuale con arrotondamento non esatto (es. 1/3 → 33%).
- [x] Task 2: Integrazione in `app/(presenze)/storico-presenze/page.tsx` (AC: #1, #2, #3, #4)
  - [x] Dentro `StoricoTable` (componente condiviso, vedi Prerequisito — nessun ramo per Ruolo), dopo aver caricato `storico` e prima della tabella: calcolare `calcolaStatistichePresenza(storico)`; se `null` (storico vuoto), nessun cambiamento — resta il solo messaggio "Nessuna Presenza registrata." esistente.
  - [x] Se non `null`, mostrare un paragrafo sopra la tabella, es. `<p>Percentuale presenza: {statistiche.percentuale}% — Trend: {ETICHETTA_TREND[statistiche.trend]}</p>`.
- [x] Task 3: Test (Vitest)
  - [x] Come elencato nel Task 1.
  - [x] Nessun test per `storico-presenze/page.tsx` — stessa decisione deliberata già applicata a ogni altra pagina di questo progetto (vedi Story 3.2 Task 3).
- [x] Task 4: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] Come Allenatore, con un'Atleta che ha uno storico misto (alcune presenze, alcune assenze, su più Slot/date), verificare che "Storico delle mie Atlete" mostri la percentuale e il trend corretti, coerenti con l'algoritmo (calcolare a mano il valore atteso e confrontare).
  - [x] Come Atleta (auto-agganciata, Story 2.7), verificare che "Il mio storico" mostri lo stesso indicatore per il proprio storico.
  - [x] Verificare che con un'Atleta senza alcuna Presenza registrata non compaia alcun indicatore (solo "Nessuna Presenza registrata.").
  - [x] Verificare che con un'Atleta con una sola Presenza registrata il trend mostrato sia "costante".
  - [x] Nessuna regressione sul resto della pagina (selettore Allenatore, esclusione Genitore via route-guard/RLS — già coperte da Story 3.2, non ri-verificare da zero, solo controllare che non siano rotte).

### Review Findings

- [x] [Review][Patch] **(Correttezza)** Doppio arrotondamento nel confronto di soglia del trend: `calcolaPercentuale` arrotonda la percentuale di ciascuna metà **prima** della sottrazione, non il tasso esatto — con storici la cui lunghezza non produce percentuali "tonde" per metà (es. 23 righe: prima meta 8/11=72.73%→73, seconda meta 10/12=83.33%→83), la differenza arrotondata (10) può risultare non `> 10` mentre la differenza reale (10.61) lo sarebbe, restituendo "costante" invece di "in-crescita" — contraddice l'intento della soglia (AC #5), nessun test della suite esistente lo copre (tutti i casi di confine usano metà con percentuali già multiple di 10) [app/(presenze)/storico-presenze/calcola-statistiche-presenza.ts] — risolto confrontando i tassi esatti (non arrotondati) di ciascuna metà, arrotondando solo la percentuale complessiva mostrata; aggiunto test di regressione con lo scenario 72.73%→83.33%
- [x] [Review][Patch] Le statistiche vengono calcolate su `storico` non filtrato, mentre la tabella renderizza solo le righe il cui `slotId` risolve a uno Slot esistente (`filter(r => r.slot !== undefined)`) — oggi innocuo grazie al vincolo `ON DELETE CASCADE` da `Presenza` verso `Slot` (una Presenza orfana non può esistere), ma se quel vincolo venisse mai rilassato la percentuale/trend mostrati includerebbero righe assenti dalla tabella visibile, senza alcun controllo che leghi i due calcoli [app/(presenze)/storico-presenze/page.tsx] — risolto calcolando `righeVisibili` una sola volta (map+filter estratto prima, riusato sia per le statistiche sia per la tabella), garantendo coerenza strutturale invece di affidarsi solo al vincolo DB
- [x] [Review][Defer] Il trend può cambiare a seguito di un semplice ri-invio (correzione) di una Presenza sulla stessa data, non di un cambio reale di presenza: `leggiStoricoPresenzePerAtleta` usa `id` come spareggio d'ordinamento per righe con la stessa `data`, ma `Presenza.id` viene rigenerato ad ogni upsert (Story 3.1) — se due Slot cadono nello stesso giorno per la stessa Atleta e una correzione tardiva sposta la posizione relativa di una riga vicino al punto di taglio a metà, il trend visualizzato può cambiare senza che sia cambiato nulla di sostanza. Scenario raro (richiede date coincidenti + correzione vicino al taglio), il fix richiederebbe allargare la firma di `calcolaStatistichePresenza` oltre `{ presente: boolean }[]` per ordinare esplicitamente per data — fuori dal footprint minimo di questa storia [app/(presenze)/storico-presenze/calcola-statistiche-presenza.ts] — deferred, scenario raro e fix fuori scope
- [x] [Review][Defer] Nessuna soglia minima di campione oltre il caso singola riga: con uno storico di 2-3 Presenze, un solo cambio può spostare la percentuale di una metà di 50-100 punti, superando ampiamente la soglia di 10 punti e producendo "in-crescita"/"in-calo" da un campione che il commento del codice stesso definirebbe statisticamente irrilevante — comportamento consentito dall'algoritmo così come specificato nei Prerequisiti architetturali della storia, già esplicitamente inquadrato nelle Dev Notes come "regolabile in futuro se si rivelasse poco utile in pratica" [app/(presenze)/storico-presenze/calcola-statistiche-presenza.ts] — deferred, trade-off già accettato esplicitamente nella storia
- [x] [Review][Defer] Nessuna indicazione del numero di Presenze (N) su cui si basano percentuale/trend — un Allenatore non può distinguere a colpo d'occhio "100% su 1 sola Presenza" da "100% su 50", rilevante per l'uso dichiarato (supporto rapido alle scelte di formazione, FR-10) ma nessun AC lo richiede [app/(presenze)/storico-presenze/page.tsx] — deferred, miglioramento UX non richiesto da AC
- [x] [Review][Defer] Nessuna distinzione visiva (colore/icona) tra le tre direzioni del trend, solo testo semplice — un Allenatore che scorre più Atlete deve leggere la parola per ciascuna riga invece di riconoscere un colore/icona, in tensione con il "rapido" della user story ma nessun AC lo richiede esplicitamente [app/(presenze)/storico-presenze/page.tsx] — deferred, miglioramento UX non richiesto da AC
- [x] [Review][Dismiss] Split a metà asimmetrico per lunghezza dispari (`Math.floor(length/2)`) — già esplicitamente documentato e accettato come scelta arbitraria ma innocua nelle Dev Notes della storia, non un difetto
- [x] [Review][Dismiss] Guard `{statistiche && (...)}` in `page.tsx` è difensivamente sempre-vero (il ramo `storico.length === 0` ritorna già prima, quindi `calcolaStatistichePresenza` non riceve mai un array vuoto in questo punto di chiamata) — codice difensivo innocuo, coerente con lo stile già adottato nel resto del progetto, non un difetto

## Dev Notes

- **Nessuna modifica a `lib/db-rls/presenza.ts`**: `leggiStoricoPresenzePerAtleta` resta invariata, questa storia consuma il suo output così com'è.
- **Nessuna modifica a RLS/migrazioni/route-guard**: la superficie di sicurezza di Story 3.2 (policy `atleta_propria_select` con gate su `autoAggancio`, esclusione Genitore) non è toccata da questa storia — puramente presentazionale sopra dati già autorizzati.
- **Algoritmo del trend è una scelta implementativa, non un requisito PRD rigido**: FR-10 dice solo "un indicatore di percentuale/trend" senza specificare la formula. Lo split a metà + soglia 10 punti percentuali documentato sopra è ragionevole e testabile, ma il dev è libero di aggiustare la soglia se la verifica dal vivo (Task 4) rivelasse un comportamento poco intuitivo con dataset piccoli — purché il comportamento resti deterministico e testato.
- **Pattern di riferimento più vicino**: `app/(onboarding-import)/import-atlete/parser.ts` per la colocazione di logica pura testabile dentro una cartella feature; `lib/giorno-settimana.ts` (`ETICHETTA_GIORNO`) per il pattern di mappa etichetta-per-enum già usato in questa pagina.
- **Ultima storia dell'Epic 3**: dopo questa, l'Epic 3 (Presenze) risulta completo (FR-8, FR-9, FR-10 tutti coperti) — nessuna storia successiva pianificata in questo epic.

### Project Structure Notes

- Nuovo file: `app/(presenze)/storico-presenze/calcola-statistiche-presenza.ts` (+ `.test.ts`).
- File modificato: `app/(presenze)/storico-presenze/page.tsx` (integrazione in `StoricoTable`).
- Nessuna migrazione, nessuna nuova tabella, nessuna modifica a `lib/db-rls/`, `lib/auth/route-guard.ts` invariato.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3: Storico presenze con trend/percentuale] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-10] — "Lo storico presenze mostra un indicatore di percentuale/trend, a supporto delle scelte di formazione." (Could, differito v1 — messo in lavorazione ora su richiesta esplicita per chiudere l'Epic 3).
- [Source: _bmad-output/implementation-artifacts/3-2-storico-presenze-per-atleta.md] — `StoricoTable`/`page.tsx` esistenti, `leggiStoricoPresenzePerAtleta`, su cui questa storia si appoggia senza modificarli.
- [Source: app/(onboarding-import)/import-atlete/parser.ts] — precedente di colocazione per logica pura testabile dentro una cartella feature.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Stack Supabase locale non attivo a inizio sessione**: `DATABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` puntano allo stack Supabase CLI locale (`127.0.0.1:54321`/`54322`, Docker), non a un progetto cloud — lo sviluppo di questo progetto avviene contro un'istanza locale. Docker Desktop non era in esecuzione: avviato manualmente, poi `supabase start` per portare su Postgres/Auth/Storage locali prima di poter eseguire la verifica dal vivo. Nessuna modifica di codice legata a questo, solo un prerequisito ambientale della sessione.
- Script di verifica dal vivo temporaneo (Prisma per il seed dati + Playwright per login/navigazione reale su `/storico-presenze` come Allenatore e come Atleta), eseguito e poi rimosso a fine sessione (nessun residuo nel repository). Dati di test rimossi interamente al termine (Palestra/Campo/Gruppo/Slot/Atlete/Allenatore/Presenze/Utenti di test, incluso l'utente Supabase Auth).
- Verificati dal vivo tutti gli scenari: percentuale/trend corretti per uno storico misto (40%→80%, diff 40 > soglia → "in crescita", percentuale complessiva 60%) sia nella sezione Allenatore sia nella sezione Atleta (stessa Atleta, sessioni diverse); nessun indicatore per un'Atleta senza Presenze (AC #3); percentuale 100% e trend "costante" per un'Atleta con una sola Presenza (AC #4).

### Completion Notes List

- Tutti e 4 i Task completati con TDD (RED confermato prima dell'implementazione: 9 test in `calcola-statistiche-presenza.test.ts`, inclusi i confini stretti della soglia a ±10 punti percentuali).
- Suite completa verde: `npx vitest run` (382 test, 38 file — 373 pre-esistenti + 9 nuovi), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun nuovo errore, un solo warning pre-esistente non collegato a questa storia), `npm run build` (produzione, `/storico-presenze` generata come route dinamica, nessuna regressione sulle altre route).
- Verifica dal vivo eseguita con successo su tutti gli scenari (AC #1-#5), sia come Allenatore sia come Atleta, inclusi i due casi limite (storico vuoto, storico con una sola Presenza).
- Nessuna deviazione dal design descritto nel Prerequisito architetturale della storia: nessuna modifica a `lib/db-rls/`, RLS, migrazioni o route-guard — footprint minimo confermato in pratica.
- **Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor)**: nessuna violazione degli AC (Acceptance Auditor), ma il Blind Hunter ha individuato un bug reale di correttezza — l'algoritmo del trend, cosi' come letteralmente specificato nei Prerequisiti architetturali della storia, arrotondava la percentuale di ciascuna metà **prima** di calcolare la differenza, potendo far scendere sotto soglia una differenza che sul tasso esatto la supera. Risolto confrontando i tassi non arrotondati, arrotondando solo la percentuale complessiva mostrata; aggiunto un test di regressione dedicato. Risolta anche una seconda inconsistenza latente (statistiche calcolate su un sottoinsieme diverso da quello renderizzato in tabella), oggi innocua grazie a un vincolo `ON DELETE CASCADE` ma resa strutturalmente coerente. 4 findings aggiuntivi differiti (nessuno bloccante, vedi Review Findings/deferred-work.md), 2 scartati come rumore innocuo. Suite completa riverificata verde dopo le patch (383 test, `tsc`, lint, build).

### File List

- `app/(presenze)/storico-presenze/calcola-statistiche-presenza.ts` (nuovo)
- `app/(presenze)/storico-presenze/calcola-statistiche-presenza.test.ts` (nuovo)
- `app/(presenze)/storico-presenze/page.tsx` (modificato: integrazione statistiche in `StoricoTable`)
