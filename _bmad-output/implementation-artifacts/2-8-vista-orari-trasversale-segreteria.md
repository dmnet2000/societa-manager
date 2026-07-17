---
baseline_commit: NO_VCS
---

# Story 2.8: Vista orari trasversale — Segreteria

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Segreteria,
I want vedere tutti gli Slot di tutte le Palestre/Gruppi,
so that posso rispondere subito a chi chiede un orario, senza girare la domanda all'allenatore.

**Nota dal PRD**: FR-5 è marcata "Should — differibile a v1.1, non bloccante per il lancio". Non bloccante per il go-live non significa fuori scope: si implementa comunque, seguendo lo stesso standard di qualità delle storie precedenti (nessuna scorciatoia perché "è solo una Should").

## Acceptance Criteria

1. **Given** esistono Slot per uno o più Gruppi/Palestre nell'Anno Agonistico corrente, **when** la Segreteria apre la vista orari trasversale, **then** vede tutti gli Slot esistenti (di tutti i Gruppi, non solo i propri — a differenza di Story 2.6/2.7).
2. **Given** la vista è aperta, **when** la Segreteria seleziona un filtro per Palestra e/o per Gruppo, **then** l'elenco si restringe di conseguenza (i due filtri sono combinabili, non mutuamente esclusivi).
3. La vista è di sola lettura: nessuna Server Action, nessuna mutazione di `Slot`/`Gruppo`/`Palestra` in questa storia — coerente con AD-2 (Orari-Palestre resta l'unico proprietario della mutazione dello Slot).

## Tasks / Subtasks

- [x] Task 1: Pagina `app/(orari-palestre)/orari/page.tsx` (nuovo file) (AC: #1, #2, #3)
  - [x] Nuova pagina nello stesso route-group `app/(orari-palestre)/` di `palestre/`, `slot/`, `mio-orario/` — stesso modulo per AD-2 (capability map: FR-1..FR-5 vivono tutte in questo route-group; FR-5 è l'ultima).
  - [x] **Non riusare/allargare `/slot`** (Story 2.5): quella pagina include il form "Nuovo Slot", riservato ad Admin/Dirigente (`creaSlot` verifica già `requireRuolo(["ADMIN","DIRIGENTE"])` lato server) — allargarne il route-guard alla Segreteria le mostrerebbe un form di creazione che non può usare, violando AD-2 (un modulo non deve presentare affordance di mutazione a un Ruolo che non le possiede). Nuova pagina di sola lettura, separata.
  - [x] `export const dynamic = "force-dynamic"` — stesso motivo di `slot/page.tsx`/`mio-orario/page.tsx`.
  - [x] `lib/auth/route-guard.ts`: aggiungere `{ prefix: "/orari", ruoliAmmessi: ["SEGRETERIA"] }` — solo Segreteria per questa storia (FR-5 è specifico di questo Ruolo; Admin/Dirigente hanno già `/slot` per la vista completa con anche la creazione).
  - [x] **`searchParams` in Next.js 16 è una `Promise`** (verificato nella documentazione locale, `node_modules/next/dist/docs/`, prima di scrivere qualunque codice — non un oggetto sincrono come nelle versioni precedenti di Next.js): `export default async function OrariPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) { const params = await searchParams; ... }`.
  - [x] Leggere `palestraId`/`gruppoId` da `searchParams` (stringhe vuote se assenti o non stringa — un valore `string[]` da query duplicate va scartato, non è un caso valido per questi filtri).
  - [x] Risolvere l'Anno Agonistico corrente in sola lettura (`trovaAnnoAgonisticoCorrente()`, mai `risolviAnnoAgonisticoCorrente()` in una pagina GET — Dev Notes Story 1.6).
  - [x] Interrogare `Palestra` (per il filtro) e `Gruppo` (scopato per stagione corrente, per il filtro — stesso pattern già consolidato in `slot/page.tsx`/`mio-orario/page.tsx`) e lo `Slot` stesso, con `where` combinato: `gruppo: { annoAgonisticoId: annoCorrente.id, ...(gruppoId && { id: gruppoId }) }` e, se `palestraId` è presente, `campo: { palestraId }` — i due filtri sono indipendenti e combinabili (AND), coerente con AC #2.
  - [x] `Slot`/`Campo`/`Gruppo`/`Palestra` non sono protetti da RLS (AD-9) — tutte le letture Prisma dirette, nessun client Supabase necessario (stesso trattamento di `slot/page.tsx`, a differenza di `mio-orario/page.tsx` che deve identificare l'utente).
  - [x] Form di filtro: **`<form method="get">` HTML nativo, non `next/form`** (verificato: `next/form` non supporta `method="get"` esplicito — per un filtro via query-string senza JS va usato il tag HTML nativo, che Next.js gestisce comunque correttamente come navigazione GET standard letta da `searchParams`). Due `<select>` (Palestra, Gruppo), ciascuno con un'opzione "Tutte le Palestre"/"Tutti i Gruppi" (valore vuoto) come default, `defaultValue` impostato al filtro corrente per preservare la selezione dopo il submit; un bottone "Filtra".
  - [x] Tabella Giorno/Orario/Palestra-Campo/Gruppo — stesso formato di `slot/page.tsx`/`mio-orario/page.tsx`, riusare `ETICHETTA_GIORNO` da `lib/giorno-settimana.ts`. Messaggio se l'elenco (filtrato) risulta vuoto.
- [x] Task 2: Test
  - [x] `lib/auth/route-guard.test.ts`: aggiungere test per `/orari` (allow per `["SEGRETERIA"]`, redirect per almeno un altro Ruolo, es. `["ADMIN"]`) — lezione dalla code review di Story 2.6/2.7: ogni nuova rotta in `PROTECTED_ROUTES` deve avere un test dedicato fin da subito, non aggiunto dopo in review.
  - [x] Nessun test per `orari/page.tsx` — stessa decisione deliberata di Story 2.5/2.6/2.7 (pagina di sola lettura, composizione di query già validate, nessuna pagina/Server Component ha mai avuto test dedicati in questo progetto). La costruzione del `where` combinato con i due filtri è condizionale ma non abbastanza complessa da giustificare l'estrazione in un helper testabile (a differenza della vera business logic di Story 2.7, `unisciESordinaSlot` — qui non c'è deduplicazione né un comparator custom, solo spread condizionale).
- [x] Task 3: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] AC #1: creare almeno due Slot su Gruppi/Palestre diversi (riusando i flussi Admin già verificati in Story 2.1/2.2/2.5), registrare/loggare un utente Segreteria, aprire `/orari`, verificare che **entrambi** gli Slot compaiano (a differenza di `/mio-orario`, qui non c'è scoping per Utente).
  - [x] AC #2: applicare il filtro Palestra e verificare che l'elenco si restringa al solo Slot di quella Palestra; applicare (anche) il filtro Gruppo e verificare la combinazione corretta dei due filtri.
  - [x] Verificare che un Admin/Dirigente/Allenatore/Atleta non possa raggiungere `/orari` (redirect a `/non-autorizzato`, route-guard).
  - [x] Verificare che nessun form di creazione/modifica sia presente nella pagina (sola lettura, AC #3).

### Review Findings

Code review 2026-07-17 — 3 layer paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor).

- [x] [Review][Patch] La tabella Slot (header + righe + formattazione Giorno/Orario/Palestra-Campo/Gruppo) era duplicata identica in tre pagine (`slot/page.tsx`, `mio-orario/page.tsx`, `orari/page.tsx`) — la terza occorrenza supera la soglia oltre la quale conviene estrarre [app/(orari-palestre)/orari/page.tsx e le due pagine sorelle] — Blind Hunter, risolto estraendo `app/(orari-palestre)/SlotTable.tsx` (componente condiviso, `messaggioVuoto` opzionale per non alterare il comportamento esistente di `/slot`), riusato dalle tre pagine, riverificato dal vivo su tutte e tre (nessuna regressione)

- [x] [Review][Defer] Il `<select>` Gruppo non è ristretto ai Gruppi con Slot nella Palestra selezionata — combinazioni impossibili portano a un "Nessuno Slot trovato" non spiegato [app/(orari-palestre)/orari/page.tsx] — deferred, sproporzionato per una feature Should
- [x] [Review][Defer] "Nessuno Slot trovato" ambiguo tra filtro troppo restrittivo e assenza di stagione corrente — stessa categoria già accettata più volte [app/(orari-palestre)/orari/page.tsx] — deferred
- [x] [Review][Defer] Nessun indicatore di quale Anno Agonistico sia mostrato — gap sistemico trasversale a tutte le pagine orario, non introdotto da questa storia [app/(orari-palestre)/orari/page.tsx] — deferred
- [x] [Review][Defer] `palestraId`/`gruppoId` da `searchParams` non validati contro l'elenco corrente — rischio pressoché teorico, nessuna funzionalità di eliminazione esiste oggi per Palestra/Campo/Gruppo [app/(orari-palestre)/orari/page.tsx] — deferred
- [x] [Review][Defer] Nessuna navigazione/menu in tutta l'app verso `/slot`/`/mio-orario`/`/orari` — gap sistemico dell'intera applicazione [intera applicazione] — deferred

Dismessi come rumore/falsi positivi/già gestiti (4): costruzione del `where` combinato senza estrazione/test (decisione deliberata ed esplicita nel Task 2 della storia — non abbastanza complessa da giustificarlo, a differenza di `unisciESordinaSlot`); copertura dei test route-guard limitata a 2 ruoli rifiutati su 5 (in linea con — anzi superiore a — il livello di copertura già stabilito per le altre rotte a Ruolo singolo in questo file); assenza di un test per l'accesso non autenticato specifico di `/orari` (ridondante: la logica di controllo sessione precede il matching per rotta ed è già coperta genericamente una sola volta all'inizio del file); claim sulla verifica della documentazione `searchParams` non riscontrabile dall'ambiente isolato del reviewer (falso — verificato con un agente di ricerca dedicato durante la creazione della storia, citando il file esatto della documentazione locale, e confermato dal build/typecheck riusciti).

## Dev Notes

- **`searchParams` è una `Promise` in questa versione di Next.js (16.2.10)** — verificato nella documentazione locale prima di scrivere il codice, come richiesto da AGENTS.md per questo progetto ("questa NON è la Next.js che conosci"). Va sempre `await`-ata; usarla come oggetto sincrono è un errore di tipo che il build coglierebbe comunque (TypeScript), ma va evitato fin da subito. Questa è la prima pagina della codebase a leggere `searchParams` — nessun pattern preesistente da riusare, questa storia lo stabilisce.
- **Perché una pagina separata da `/slot` invece di allargarne il Ruolo ammesso**: `/slot` (Story 2.5) include il form "Nuovo Slot" nella stessa pagina — non esiste oggi una variante "sola lettura" di quella pagina. Allargare `lib/auth/route-guard.ts` per `/slot` alla Segreteria senza toccare `page.tsx` mostrerebbe comunque il form di creazione (la Server Action lo rifiuterebbe server-side, ma l'esperienza utente sarebbe comunque sbagliata — un form visibile che non si può mai usare). Una pagina dedicata, puramente di lettura, è la scelta corretta — stesso principio di `/mio-orario` (Story 2.6/2.7), che non riusa `/slot` per lo stesso motivo.
- **Nessun client Supabase in questa storia**: a differenza di `/mio-orario` (che deve identificare l'utente per Ruolo Allenatore/Atleta), questa vista non è scopata per utente — nessuna identità da risolvere, solo Prisma diretto su entità non-RLS (AD-9).
- **Pattern di riferimento più vicino**: `app/(orari-palestre)/slot/page.tsx` (Story 2.5) per la query Slot scopata per stagione e per il rendering tabellare; `lib/giorno-settimana.ts` (Story 2.5) per `ETICHETTA_GIORNO`, da riusare senza duplicare.
- **Scala**: NFR PRD §8, poche palestre/campi, poche decine di Gruppi/Slot al massimo — nessuna paginazione necessaria, i due filtri sono un affinamento di usabilità, non un requisito di performance.

### Project Structure Notes

- Nuova pagina nel route-group esistente: `app/(orari-palestre)/orari/page.tsx` (nessun nuovo route-group, stesso modulo di `palestre/`, `slot/`, `mio-orario/`).
- File nuovi attesi: `app/(orari-palestre)/orari/page.tsx`. File modificati: `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.8: Vista orari trasversale — Segreteria] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-5] — "La Segreteria vede tutti gli Slot di tutte le Palestre/Gruppi." (Should, differibile a v1.1 ma implementata comunque in questa storia).
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-2] — capability map: FR-1..FR-5 vivono in `app/(orari-palestre)/`.
- [Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md] — API `searchParams` in Next.js 16, verificata prima dell'implementazione.
- [Source: app/(orari-palestre)/slot/page.tsx, lib/giorno-settimana.ts] — pattern di riferimento per la query Slot e le etichette dei giorni (Story 2.5).
- [Source: app/(orari-palestre)/mio-orario/page.tsx] — precedente più vicino per una pagina di sola lettura separata da `/slot` (Story 2.6/2.7), stesso principio applicato qui.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `npx tsc --noEmit`: pulito (inclusa la tipizzazione `searchParams: Promise<...>`, verificata contro la documentazione locale prima dell'implementazione).
- `npx vitest run`: 246 test, tutti superati (2 nuovi in `route-guard.test.ts` per `/orari`, nessun altro test nuovo — decisione deliberata, vedi Task 2).
- `npm run lint`: pulito.
- `npm run build`: build di produzione riuscita, `/orari` confermata come route dinamica (`ƒ`).
- Verifica live (Playwright temporaneo + Prisma/Supabase diretti per il setup, poi rimossi): come Admin, creati due Palestra→Campo→Gruppo→Slot indipendenti. Registrato/loggato un utente Segreteria → `/orari` mostra entrambi gli Slot senza filtro (AC #1) → nessun form di creazione presente (AC #3) → filtro Palestra da solo restringe correttamente a un solo Slot → filtri Palestra+Gruppo combinati (stesso Slot) confermano l'AND → filtri Palestra+Gruppo incompatibili (punti a Slot diversi) mostrano correttamente "Nessuno Slot trovato", non un falso risultato. Un Admin non può raggiungere `/orari` (redirect `/non-autorizzato`). Un primo tentativo di verifica del filtro Palestra ha dato un falso negativo dovuto a un controllo scritto in modo impreciso nello script di verifica (testo dell'intera pagina, che include anche le `<option>` sempre presenti nei `<select>` di filtro, invece del solo `<tbody>` — stessa lezione già incontrata in Story 2.4) — non un difetto applicativo, corretto nello script e riverificato con successo. Dati di test rimossi al termine.
- Code review (3 layer paralleli) → 1 patch applicata (estrazione di `SlotTable.tsx` condiviso da `/slot`, `/mio-orario`, `/orari`), riverificata dal vivo su tutte e tre le pagine (nessuna regressione; un primo tentativo ha incontrato un timeout dovuto al riscaldamento del dev server appena riavviato, non un difetto applicativo — riverificato con successo al secondo tentativo). Suite completa dopo la patch: 246/246 test, `tsc`/`lint`/`build` verdi.

### Completion Notes List

- Implementato esattamente come da Dev Notes: pagina di sola lettura separata da `/slot` (non un ampliamento del suo Ruolo ammesso), per non esporre alla Segreteria un form di creazione che non può usare (AD-2).
- `searchParams` gestita correttamente come `Promise` (verificato nella documentazione locale prima di scrivere codice, come richiesto da AGENTS.md per questo progetto) — prima pagina della codebase a usare questa API.
- Filtro combinato Palestra+Gruppo espresso come `where` condizionale (AND, non OR) tramite spread condizionale sulle relazioni `gruppo`/`campo` — nessuna estrazione in helper testabile, la logica non è abbastanza complessa da giustificarlo (a differenza di `unisciESordinaSlot`, Story 2.7).
- Form di filtro con `<form method="get">` HTML nativo (non `next/form`, che non supporta `method="get"` esplicito) — nessun JavaScript richiesto, nessuna Server Action.
- Nessuna Server Action, nessuna mutazione introdotta da questa storia (AC #3).

### File List

- `app/(orari-palestre)/orari/page.tsx` (nuovo)
- `app/(orari-palestre)/SlotTable.tsx` (nuovo, review fix: tabella Slot condivisa tra `/slot`, `/mio-orario`, `/orari`)
- `app/(orari-palestre)/slot/page.tsx` (modificato in code review: usa `SlotTable`)
- `app/(orari-palestre)/mio-orario/page.tsx` (modificato in code review: usa `SlotTable`)
- `lib/auth/route-guard.ts` (modificato: aggiunta rotta `/orari`)
- `lib/auth/route-guard.test.ts` (modificato: test per `/orari`)

## Change Log

- 2026-07-17: Implementazione completa Story 2.8 (Task 1-3). Ottava e ultima storia dell'Epic 2 — nuova pagina `app/(orari-palestre)/orari/` nello stesso modulo di `palestre/`, `slot/`, `mio-orario/` (AD-2, capability map FR-1..FR-5). Pagina di sola lettura separata da `/slot`, non un suo ampliamento — evita di esporre alla Segreteria un form di creazione riservato ad Admin/Dirigente. Prima pagina della codebase a leggere `searchParams`, verificato trattarsi di una `Promise` in questa versione di Next.js consultando la documentazione locale prima di scrivere codice (AGENTS.md lo richiede esplicitamente per questo progetto). Filtro per Palestra e/o Gruppo espresso come `where` Prisma condizionale, combinabile (AND), tramite un `<form method="get">` HTML nativo senza JavaScript né Server Action. Tutti gli AC verificati dal vivo contro un backend Supabase reale, inclusa la combinazione corretta dei due filtri. Nessun bug applicativo reale scoperto durante lo sviluppo (un falso negativo nello script di verifica stesso, corretto). Status → review.
- 2026-07-17: Code review. 3 layer paralleli, 0 decisioni, 1 patch applicata (estrazione di `SlotTable.tsx`, terza occorrenza identica della stessa tabella tra `/slot`, `/mio-orario` e questa storia — sopra la soglia per cui vale estrarre), 5 finding deferiti (narrowing dinamica del filtro Gruppo, ambiguità del messaggio vuoto, assenza di un indicatore di stagione, filtri non validati contro id ormai inesistenti — rischio teorico senza alcuna funzionalità di eliminazione oggi, assenza di navigazione in tutta l'app — gap sistemico), 4 scartati come rumore/già gestiti. La patch riverificata dal vivo su tutte e tre le pagine coinvolte, nessuna regressione. Suite completa: 246/246 test, typecheck/lint/build verdi. Status → done. **Epic 2 completa (8/8 storie).**
