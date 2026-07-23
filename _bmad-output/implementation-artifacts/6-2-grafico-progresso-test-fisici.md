---
baseline_commit: c075f9451eb28e814bb000eea5d631945e96a219
---

# Story 6.2: Grafico progresso test fisici

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Atleta o Allenatore,
I want vedere un grafico di progresso delle misurazioni nel tempo,
so that i miglioramenti (o i cali) sono immediatamente visibili, non solo un elenco di numeri.

## Acceptance Criteria

1. **Given** esistono almeno due misurazioni dello stesso `tipo` per un'Atleta (Story 6.1), **when** si apre `/dati-fisici`, **then** è mostrato un grafico che rappresenta l'andamento nel tempo di quel `tipo`.
2. **Given** più `tipo` diversi hanno ciascuno almeno due misurazioni per la stessa Atleta (es. "Altezza" e "Peso"), **when** si apre la pagina, **then** è mostrato un grafico **separato** per ciascun `tipo` (mai un unico grafico con più serie sovrapposte sullo stesso asse) — ogni `tipo` ha unità di misura potenzialmente incompatibili (cm, kg, sec…), un asse condiviso le renderebbe illeggibili.
3. **Given** un `tipo` ha una sola misurazione registrata, **when** si apre la pagina, **then** nessun grafico è mostrato per quel `tipo` specifico (dato insufficiente per un andamento) — la riga resta comunque visibile nella tabella storico di Story 6.1, invariata.
4. **Given** un'Atleta non ha ancora nessuna misurazione, **when** si apre la pagina, **then** non compare nessun grafico — resta il solo messaggio "Nessuna misurazione registrata" già stabilito da Story 6.1 (AC #7), nessun messaggio aggiuntivo specifico del grafico.
5. **Given** sia la sezione "Le mie misurazioni" (Atleta) sia la sezione "Misurazioni delle mie Atlete" (Allenatore) di `/dati-fisici` mostrano uno storico, **when** quello storico soddisfa AC #1, **then** il grafico corrispondente appare in quella sezione, usando esattamente gli stessi dati già filtrati da RLS per quella sezione (nessuna nuova tabella, nessuna nuova policy, nessun nuovo permesso).
6. **Given** un grafico è mostrato, **when** un lettore non percepisce colore/forma (screen reader), **then** un testo alternativo (titolo con `tipo` + `unitaMisura`, es. "Andamento Altezza (cm)") lo rende comprensibile comunque — coerente con la soglia WCAG AA di `EXPERIENCE.md`.

## Decisioni prese in fase di creazione di questa storia (elicitazione con l'utente)

L'AC originale in `epics.md` ("vedo un grafico che mostra l'andamento nel tempo per ciascun tipo di misurazione") è astratto e senza precedenti architetturali (FR-25 non ha alcuna decisione tecnica in `ARCHITECTURE-SPINE.md`: "nessuna decisione architetturale aggiuntiva necessaria"). Due punti sono stati chiariti esplicitamente con l'utente prima di scrivere questa storia — **non riaprirli in fase di sviluppo**:

1. **Nessuna nuova dipendenza npm (niente Recharts/D3/librerie di charting)** — un componente React che disegna un SVG inline a mano. Motivazione dell'utente: coerenza con la filosofia "zero dipendenze non necessarie" già seguita in tutto il progetto, dataset piccolo (hobby/piccola società, NFR di scala), storia "Could" non bloccante che non giustifica una nuova superficie di manutenzione.
2. **Un grafico separato per `tipo`, mai serie sovrapposte sullo stesso asse** — "multi-serie" in `EXPERIENCE.md` (riga 39: "Andamento nel tempo delle misurazioni, multi-serie") descrive la capacità di gestire più tipi di misurazione, non necessariamente un singolo grafico con più linee sullo stesso asse Y. Dato che `unitaMisura` è testo libero (Story 6.1, Prerequisito #3) e può variare arbitrariamente tra tipi (cm, kg, sec…), un asse Y condiviso tra tipi diversi produrrebbe un grafico fuorviante o illeggibile.
3. **Il nuovo componente grafico applica i design token dell'UX spec** (`ux-designs/ux-societa-manager-2026-07-22/DESIGN.md`), anche se `app/(dati-atleta)/dati-fisici/page.tsx` e `MisurazioneForm.tsx` (Story 6.1) non li usano ancora (quella pagina replica lo stile "grezzo" di `storico-presenze/page.tsx`, precedente alla finalizzazione dell'UX spec). **Decisione esplicita**: nessun refactor di Story 6.1 in questa storia — lo scarto stilistico tra il nuovo grafico e il resto della pagina è un debito noto, da registrare come deferred nel code review di questa storia, non da risolvere qui.

## Tasks / Subtasks

- [x] Task 1: `lib/misurazioni/raggruppa-per-tipo.ts` (nuovo, funzione pura) (AC: #1, #2, #3, #4)
  - [x] `raggruppaPerTipo(misurazioni: Misurazione[]): { tipo: string; unitaMisura: string; punti: Misurazione[] }[]` — riceve l'array già ordinato cronologicamente da `leggiMisurazioniPerAtleta` (Story 6.1), lo raggruppa per `tipo` preservando l'ordine di prima comparsa di ciascun `tipo` (deterministico, nessun sort aggiuntivo necessario dato l'input già ordinato), **filtra fuori** i gruppi con meno di 2 punti (AC #3: dato insufficiente per un grafico). Input vuoto → output vuoto (AC #4, nessun crash).
  - [x] `unitaMisura` del gruppo: quella della **prima** misurazione di quel `tipo` incontrata (Story 6.1 non impone che `unitaMisura` sia costante per lo stesso `tipo` nel tempo — un errore di battitura passato userebbe un'unità diversa da quella corrente; non è compito di questa storia validare/normalizzare retroattivamente, solo mostrare qualcosa di sensato senza crashare).
  - [x] Test Vitest: raggruppamento base con più tipi; tipo con 1 sola misurazione escluso; array vuoto → array vuoto; ordine di prima comparsa preservato quando i tipi si alternano nello storico (es. Altezza, Peso, Altezza, Peso).
- [x] Task 2: `lib/misurazioni/calcola-coordinate-grafico.ts` (nuovo, funzione pura) (AC: #1, #2)
  - [x] `calcolaCoordinateGrafico(valori: number[], dimensioni: { larghezza: number; altezza: number; padding: number }): { x: number; y: number }[]` — converte una serie di valori in coordinate SVG. Posizione X **basata sull'indice** (spaziatura equidistante), non sulla data reale: nessuna aritmetica di date richiesta (coerente con la convenzione già stabilita in questo progetto di trattare `data` come stringa opaca, Story 2.5/3.1/6.1 — qui non serve nemmeno leggerla, l'ordine cronologico è già garanzia di `raggruppaPerTipo`/`leggiMisurazioniPerAtleta`). Posizione Y scalata su min/max della serie **all'interno di quel singolo grafico** (non tra grafici diversi, coerente con AC #2: assi indipendenti per tipo).
  - [x] Caso limite: tutti i valori uguali (`min === max`) → linea orizzontale piatta a metà altezza (evitare divisione per zero nello scaling).
  - [x] Test Vitest: due punti con valori diversi; valori tutti uguali (linea piatta); valori con andamento sia crescente sia decrescente (verificare che Y più alto → coordinata `y` più bassa, convenzione SVG con origine in alto a sinistra).
- [x] Task 3: `app/(dati-atleta)/dati-fisici/GraficoMisurazione.tsx` (nuovo, componente di presentazione) (AC: #1, #2, #6)
  - [x] Props: `{ tipo: string; unitaMisura: string; punti: Misurazione[] }` (un singolo gruppo già filtrato da `raggruppaPerTipo`).
  - [x] Dimensioni SVG fisse (nessun AC richiede il responsive-resize del grafico stesso, solo che la pagina resti mobile-friendly): `larghezza: 280, altezza: 120, padding: 24` passate a `calcolaCoordinateGrafico`; `viewBox="0 0 280 120"` con `width="100%"` sull'elemento `<svg>` per restare fluido nel contenitore (coerente con "fruibile per dispositivi mobile", vincolo generale del progetto).
  - [x] Usa `calcolaCoordinateGrafico` per ottenere le coordinate, renderizza un `<svg>` con una `<polyline>` (Design Token: stroke `var(--color-primary)`, coerente con `DESIGN.md`).
  - [x] Etichette min/max sull'asse Y (valore + `unitaMisura`), nessuna etichetta per singolo punto (troppo rumore per un grafico piccolo — nessun AC lo richiede).
  - [x] AC #6: un `<title>` SVG (o `aria-label` sul contenitore) con testo "Andamento {tipo} ({unitaMisura})" per l'accessibilità.
  - [x] Nuovo `app/(dati-atleta)/dati-fisici/GraficoMisurazione.module.css` — applica i token di `DESIGN.md` (colori, spacing, radius) per questo componente specifico, come deciso in fase di creazione della storia (vedi sopra) — non toccare lo stile del resto della pagina.
- [x] Task 4: Wire-up in `app/(dati-atleta)/dati-fisici/page.tsx` (modifica) (AC: #1, #2, #3, #4, #5)
  - [x] In `SezioneMisurazioni` (usata identica sia per la sezione Atleta sia per quella Allenatore, AC #5): dopo aver ottenuto `misurazioni` da `leggiMisurazioniPerAtleta`, calcolare `raggruppaPerTipo(misurazioni)` e renderizzare un `<GraficoMisurazione>` per ciascun gruppo risultante (array vuoto → nessun grafico renderizzato, il messaggio "Nessuna misurazione registrata" esistente resta l'unico stato per AC #4/lo storico completamente vuoto).
  - [x] Nessuna nuova lettura RLS: `raggruppaPerTipo` opera sullo stesso array `misurazioni` già caricato per la tabella storico — nessuna query aggiuntiva.
- [x] Task 5: Test (Vitest)
  - [x] Coperti da Task 1/2 (le due funzioni pure introdotte da questa storia). Nessun test automatico per `GraficoMisurazione.tsx`/il wire-up in `page.tsx` oltre quello — stesso principio già stabilito in Story 5.1/5.2/6.1 (solo funzioni pure hanno test Vitest in questa codebase).
- [x] Task 6: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] Setup: stesso Gruppo/Atleta/Allenatore/Atleta-agganciata di Story 6.1 (Docker + Supabase CLI locale + dev server).
  - [x] AC #1/#2: inserisci due misurazioni "Altezza" (date diverse, valori diversi) e due misurazioni "Peso" (date diverse, valori diversi) per la stessa Atleta; verifica che appaiano **due grafici separati** (uno per Altezza, uno per Peso), non un unico grafico con entrambe le serie.
  - [x] AC #3: inserisci una terza misurazione di tipo "Salto in alto" (una sola volta); verifica che **non** appaia un grafico per "Salto in alto", ma la riga compaia comunque nella tabella storico.
  - [x] AC #4: su un'Atleta senza nessuna misurazione, verifica che non compaia nessun grafico e resti solo il messaggio "Nessuna misurazione registrata".
  - [x] AC #5: verifica che sia la sezione Allenatore sia la sezione Atleta (stessa Atleta, stesso Utente collegato via `autoAggancio`) mostrino gli stessi grafici con gli stessi dati.
  - [x] AC #6: ispeziona l'HTML per confermare la presenza del `<title>`/`aria-label` con "Andamento {tipo} ({unitaMisura})" su ciascun grafico.
  - [x] Dati e Utenti di test rimossi a fine sessione, stato del DB locale ripristinato a com'era prima della verifica (stesso principio già applicato in Story 6.1).

### Review Findings

- [x] [Review][Patch] `raggruppaPerTipo` raggruppa per uguaglianza esatta di stringa su `tipo` — due misurazioni dello stesso tipo logico con maiuscole/spazi diversi (es. "Altezza" vs "altezza ") finiscono in due gruppi separati, ciascuno potenzialmente sotto la soglia di 2 punti, sopprimendo silenziosamente un grafico che l'utente si aspetterebbe di vedere [lib/misurazioni/raggruppa-per-tipo.ts] — risolto normalizzando la chiave di raggruppamento (trim + lowercase), il testo mostrato resta quello della prima occorrenza; verificato dal vivo
- [x] [Review][Patch] `aria-label` sull'`<svg>` e `<title>` figlio portano lo stesso testo — ridondanza che alcuni screen reader annunciano due volte per lo stesso grafico [app/(dati-atleta)/dati-fisici/GraficoMisurazione.tsx] — risolto rimuovendo `aria-label`, resta solo `<title>`; verificato dal vivo
- [x] [Review][Patch] `GraficoMisurazione` non verifica `punti.length >= 2` autonomamente, si affida solo al filtro a monte di `raggruppaPerTipo` — se mai richiamato con un array vuoto, `Math.min`/`Math.max` produrrebbero `Infinity`/`-Infinity` mostrati letteralmente in UI ("Min: Infinity cm") [app/(dati-atleta)/dati-fisici/GraficoMisurazione.tsx] — risolto con una guardia `if (punti.length < 2) return null;`
- [x] [Review][Patch] Il ramo `valori.length === 1` di `calcolaCoordinateGrafico` non è coperto da nessun test [lib/misurazioni/calcola-coordinate-grafico.test.ts] — risolto aggiungendo il test mancante
- [x] [Review][Defer] `calcolaCoordinateGrafico` non valida che `padding * 2 < larghezza/altezza` — se un chiamante futuro passasse dimensioni sbagliate lo scaling andrebbe negativo (geometria invertita/collassata) [lib/misurazioni/calcola-coordinate-grafico.ts] — deferred, l'unico chiamante reale usa valori fissi e sicuri (280/120/24), rischio solo per un ipotetico riuso futuro della funzione esportata
- [x] [Review][Defer] `calcolaCoordinateGrafico` non filtra valori non finiti (NaN/Infinity) — produrrebbe coordinate NaN se mai ricevesse un valore non valido [lib/misurazioni/calcola-coordinate-grafico.ts] — deferred, non raggiungibile oggi: `actions.ts` di Story 6.1 già valida `Number.isFinite(valore)` prima che qualunque dato raggiunga il database
- [x] [Review][Defer] Nessun limite/decimazione sul numero di punti per tipo — uno storico lungo (anni di misurazioni mensili) affollerebbe un grafico a dimensione fissa 280×120 [lib/misurazioni/raggruppa-per-tipo.ts, app/(dati-atleta)/dati-fisici/GraficoMisurazione.tsx] — deferred, stesso principio già accettato per l'assenza di `LIMIT`/paginazione nello storico testuale (Story 6.1, deferred identico), scala NFR del progetto (~200 atlete) rende il caso poco plausibile

## Dev Notes

- **Nessuna nuova tabella, policy RLS o route** — questa storia consuma dati già letti da `leggiMisurazioniPerAtleta` (Story 6.1, `lib/db-rls/misurazione-atleta.ts`), aggiungendo solo logica di presentazione. `/dati-fisici` resta l'unica rotta coinvolta, già protetta da `route-guard.ts` (ALLENATORE + ATLETA) da Story 6.1 — nessuna modifica lì.
- **Nessuna nuova dipendenza npm** — decisione esplicita dell'utente (vedi sopra), SVG inline scritto a mano.
- **Un grafico per `tipo`, mai serie sovrapposte** — decisione esplicita dell'utente (vedi sopra), per evitare di mescolare unità di misura incompatibili sullo stesso asse.
- **Posizione X per indice, non per data** — coerente con la convenzione già stabilita nel progetto di evitare aritmetica sulle stringhe `data` (Story 2.5/3.1/6.1); l'ordine cronologico è già garantito a monte da `leggiMisurazioniPerAtleta`.
- **Debito noto, non da risolvere qui**: il nuovo `GraficoMisurazione.tsx` userà i design token dell'UX spec, ma il resto di `/dati-fisici` (Story 6.1) resta nello stile "grezzo" precedente — segnalare questo scarto come deferred nel code review di questa storia, non aprire un refactor di Story 6.1.
- **`unitaMisura` non normalizzata tra misurazioni dello stesso `tipo`** — gap già noto e deferred dal code review di Story 6.1 (fragilità di maiuscole/minuscole/spazi su campo libero); questa storia non lo risolve, usa semplicemente la prima occorrenza incontrata per l'etichetta del grafico.

### Project Structure Notes

- Nuova cartella `lib/misurazioni/` (con `index.ts` barrel, stesso pattern di `lib/matching-codice-fiscale/`, `lib/anno-agonistico/`): `raggruppa-per-tipo.ts` (+ test), `calcola-coordinate-grafico.ts` (+ test).
- Nuovi file: `app/(dati-atleta)/dati-fisici/GraficoMisurazione.tsx`, `app/(dati-atleta)/dati-fisici/GraficoMisurazione.module.css`.
- File modificato: `app/(dati-atleta)/dati-fisici/page.tsx` (wire-up in `SezioneMisurazioni`).
- Nessuna modifica a `lib/auth/route-guard.ts`, `prisma/schema.prisma`, nessuna nuova migrazione.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.2: Grafico progresso test fisici] — user story e AC originale (astratto, espanso sopra).
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-25] — "Atleta o Allenatore può vedere un grafico di progresso delle misurazioni nel tempo" (Could, non bloccante v1).
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md] — "FR-24, FR-25 ... nessuna decisione architetturale aggiuntiva necessaria: si inseriscono nei moduli esistenti"; Capability Map "Dati Atleta (FR-24, FR-25) | app/(dati-atleta)/ | AD-2".
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/EXPERIENCE.md] — riga 39 ("Grafico progresso... Andamento nel tempo delle misurazioni, multi-serie"), riga 118 ("Nessuna misurazione ancora (Story 6.1/6.2)... Nessun grafico da mostrare finché non esistono almeno due misurazioni").
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md] — token colore (`--color-primary` = `#00A3E0`), forma (`--radius-sm`/`--radius-md`), spacing (`--space-*`), da applicare solo al nuovo componente.
- [Source: _bmad-output/implementation-artifacts/6-1-dati-antropometrici-e-test-fisici.md] — storia precedente: `Misurazione` type (`{ id, tipo, valore, unitaMisura, data }`), `leggiMisurazioniPerAtleta` già ordina cronologicamente con spareggio deterministico, pattern a doppia sezione di `page.tsx` da riusare identico (`SezioneMisurazioni`), findings deferred (season-scoping, no-try/catch, ecc.) non riaperti qui.
- [Source: lib/matching-codice-fiscale/index.ts, lib/anno-agonistico/index.ts] — pattern di cartella con barrel `index.ts` per più funzioni pure correlate, da replicare per `lib/misurazioni/`.
- [Source: app/(amministrazione)/vista-dirigente/vista-dirigente.module.css] — esempio di CSS module che applica i token di `DESIGN.md` (`var(--color-*)`, `var(--space-*)`, `var(--radius-*)`), stesso pattern da seguire per `GraficoMisurazione.module.css`.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- Verifica dal vivo: seed temporaneo (`tmp-seed-6-2.mjs`, cancellato a fine sessione) con Gruppo/Atleta/Allenatore/Atleta-agganciata (stesso pattern di Story 6.1); script Playwright temporaneo (`tmp-verify-6-2.mjs`, cancellato a fine sessione) ha verificato tutti i 6 AC in un singolo passaggio pulito (11/11 controlli OK, incluso l'ordine di inserimento: nessun grafico → due grafici separati Altezza/Peso dopo 4 inserimenti → ancora due grafici dopo una misurazione singola di un terzo tipo → stessi grafici visibili anche dalla sezione Atleta). Dati di test e AnnoAgonistico creato rimossi a fine verifica.

### Completion Notes List

- Tutti i 6 AC implementati e verificati dal vivo (Playwright temporaneo, cancellato a fine sessione).
- Nessuna nuova dipendenza npm, nessuna nuova tabella/policy RLS/route — solo logica di presentazione sopra i dati già letti da `leggiMisurazioniPerAtleta` (Story 6.1), come deciso in fase di creazione della storia.
- Un grafico SVG separato per `tipo` (mai serie sovrapposte sullo stesso asse), design token applicati solo al nuovo componente `GraficoMisurazione`/`.module.css` — il resto di `/dati-fisici` (Story 6.1) resta invariato, scarto stilistico noto e accettato.
- Suite Vitest completa: 459/459 test passati (12 nuovi: 6 `raggruppaPerTipo` + 6 `calcolaCoordinateGrafico`). `npx tsc --noEmit` pulito.

### File List

- `lib/misurazioni/raggruppa-per-tipo.ts` (nuovo)
- `lib/misurazioni/raggruppa-per-tipo.test.ts` (nuovo)
- `lib/misurazioni/calcola-coordinate-grafico.ts` (nuovo)
- `lib/misurazioni/calcola-coordinate-grafico.test.ts` (nuovo)
- `lib/misurazioni/index.ts` (nuovo)
- `app/(dati-atleta)/dati-fisici/GraficoMisurazione.tsx` (nuovo)
- `app/(dati-atleta)/dati-fisici/GraficoMisurazione.module.css` (nuovo)
- `app/(dati-atleta)/dati-fisici/page.tsx` (modificato: wire-up in `SezioneMisurazioni`)
