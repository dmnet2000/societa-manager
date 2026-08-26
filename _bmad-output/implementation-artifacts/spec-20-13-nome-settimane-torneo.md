---
title: "Story 20.13: Nome personalizzato delle Settimane del Torneo"
type: 'feature'
created: '2026-08-26'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '89c040e7c57dc0babc7e294e93d767114516096f'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** "Settimana 1"/"Settimana 2" è oggi un'etichetta fissa hardcoded (`lib/settimana-torneo.ts`, derivata dall'enum `SettimanaTorneo`) — nessun campo modificabile esiste, mostrata così ovunque (admin `/app/torneo`, pubblica `/torneo`).

**Approach:** deciso in `epics.md` (Story 20.13): due nuovi campi opzionali su `EdizioneTorneo` (`nomeSettimana1`, `nomeSettimana2`), impostabili in una sezione dedicata sulla pagina di dettaglio Edizione (`/app/torneo/[edizioneId]`, mirror del pattern "Volantino" già lì presente), con fallback sull'etichetta generica esistente se non impostati.

## Boundaries & Constraints

**Always:** stesso perimetro di Ruolo già in uso in tutto il modulo Torneo (`requireRuolo(["ADMIN","DIRIGENTE"])`). Entrambi i campi restano facoltativi — nessuna Edizione è mai bloccata dal non averli impostati.

**Ask First:** dove vive esattamente la "sezione dedicata" — risolto in fase di sviluppo: nuovo `<section>` in `/app/torneo/[edizioneId]/page.tsx`, accanto a "Volantino" (stessa pagina di dettaglio Edizione, mirror diretto del pattern `VolantinoTorneoForm.tsx`), non una pagina/tab separata.

**Never:** `SettimanaTorneo` (enum Prisma) resta invariato — questa storia non tocca la creazione/modifica delle Categorie (Story 20.1/20.2), solo l'etichetta mostrata. Le `<select>` di scelta Settimana in `NuovaCategoriaTorneoForm.tsx`/`CategoriaTorneoRow.tsx` restano con l'etichetta generica ("Settimana 1"/"Settimana 2") — fuori scope, si applica solo ai punti di sola visualizzazione elencati nell'AC #3 di `epics.md`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin/Dirigente imposta un nome per Settimana 1 e/o 2 | testo non vuoto | salvato, visibile senza reload ovunque la Settimana è mostrata | N/A |
| Campo lasciato vuoto | stringa vuota | `null` (facoltativo), etichetta generica esistente resta invariata | N/A |
| Edizione senza nomi mai impostati | — | mostra "Settimana 1"/"Settimana 2" come oggi, nessuna regressione | N/A |

</frozen-after-approval>

## Code Map

- `prisma/migrations/20260826010000_add_nomi_settimane_edizione_torneo/migration.sql` -- `ALTER TABLE "edizioni_torneo" ADD COLUMN "nomeSettimana1" TEXT; ALTER TABLE "edizioni_torneo" ADD COLUMN "nomeSettimana2" TEXT;` (nullable, nessun backfill).
- `prisma/schema.prisma` -- `EdizioneTorneo.nomeSettimana1 String?`, `nomeSettimana2 String?`.
- `lib/settimana-torneo.ts` -- nuova `etichettaSettimanaPersonalizzata(settimana, edizione: {nomeSettimana1: string | null; nomeSettimana2: string | null}): string` — ritorna il nome custom (trim non vuoto) se impostato, altrimenti `ETICHETTA_SETTIMANA[settimana]` invariato.
- `lib/torneo.ts` -- nuova `aggiornaNomiSettimaneTorneo(edizioneTorneoId, dati: {nomeSettimana1: string | null; nomeSettimana2: string | null})`, mirror semplice `prisma.edizioneTorneo.update` (nessuno scope-parent da verificare, `EdizioneTorneo` è l'entità di primo livello).
- `app/app/(torneo)/torneo/actions.ts` -- nuova `aggiornaNomiSettimaneAction(_prevState, formData)`: `requireRuolo(["ADMIN","DIRIGENTE"])`, legge `edizioneTorneoId`/`nomeSettimana1`/`nomeSettimana2` da FormData (stringa vuota → `null`), `revalidatePath` su `/app/torneo/{edizioneTorneoId}` e `/torneo` (pubblica).
- `app/app/(torneo)/torneo/[edizioneId]/NomiSettimaneTorneoForm.tsx` -- nuovo componente, mirror di `VolantinoTorneoForm.tsx` (stesso `useActionState`, stesso `styles.formCompatto`/`formInline`/`bottoneCompatto`).
- `app/app/(torneo)/torneo/[edizioneId]/page.tsx` -- nuova `<section><h2>Nomi delle Settimane</h2><NomiSettimaneTorneoForm .../></section>`, accanto a "Volantino".
- `app/app/(torneo)/torneo/CategoriaTorneoRow.tsx:80` -- `ETICHETTA_SETTIMANA[categoria.settimana]` → `etichettaSettimanaPersonalizzata(categoria.settimana, edizione)`, nuova prop `edizione` (o i due campi singoli) passata da `[edizioneId]/page.tsx` (che ha già l'oggetto `edizione` caricato).
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/page.tsx:60` -- stessa sostituzione; questa pagina non carica oggi l'Edizione, va aggiunta una `trovaEdizioneTorneoPerId(edizioneId)` in `Promise.all` con le risoluzioni già presenti.
- `app/torneo/page.tsx:224` -- stessa sostituzione; `edizione` è già caricato in questa pagina (`trovaEdizioneTorneoCorrente`, riga 82).

## Tasks & Acceptance

**Execution:**
- [x] Migrazione + `schema.prisma`
- [x] `lib/settimana-torneo.ts` -- `etichettaSettimanaPersonalizzata` + test
- [x] `lib/torneo.ts` -- `aggiornaNomiSettimaneTorneo`
- [x] `torneo/actions.ts` -- `aggiornaNomiSettimaneAction` + test
- [x] `NomiSettimaneTorneoForm.tsx` + sezione in `[edizioneId]/page.tsx`
- [x] 3 siti di rendering aggiornati (`CategoriaTorneoRow.tsx`, `[categoriaId]/page.tsx`, `app/torneo/page.tsx`)

**Acceptance Criteria:** vedi `epics.md` Story 20.13 (Given/When/Then, verbatim — non duplicati qui).

## Spec Change Log

**Ciclo di review 1 (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) — 2026-08-26.** Nessun finding ha richiesto di riaprire l'Intent (nessun `intent_gap`/`bad_spec`). Verification Gap Reviewer: nessun gap. Patch applicate:
- `npx prisma format` per correggere l'allineamento colonne di `EdizioneTorneo` in `schema.prisma`, rotto dall'edit manuale.
- Costante `NOME_SETTIMANA_MAX` spostata da `actions.ts` (letterale duplicato) a `lib/settimana-torneo.ts` (condivisa, importata anche dal Client Component) — evita drift silenzioso tra validazione server e `maxLength` client.
- **PATCH** — Blind Hunter: `<input defaultValue={...}>` non controllato non ripropaga un nuovo `defaultValue` su re-render — dopo un salvataggio con un nome trimmato lato server, l'input avrebbe continuato a mostrare il testo grezzo digitato. Aggiunta una `key` sul `<form>` derivata dai valori salvati, per forzare lo smontaggio/rimontaggio degli input quando cambiano davvero (stesso principio già in uso in `CategoriaTorneoRow.tsx`).
- **PATCH** — Blind Hunter: `.formInline` non aveva `flex-wrap`, a differenza di `VolantinoTorneoForm` che si appoggia a un ancestor con wrap — con due campi invece di uno, rischio di overflow orizzontale su viewport stretti. Aggiunto `flex-wrap: wrap`.
- **PATCH (test)** — aggiunto un test che verifica che un nome valido con spazi iniziali/finali venga persistito trimmato dalla Server Action stessa (prima solo la funzione pura era testata per il trim).
- **PATCH** — guida in-app aggiornata con il limite di 100 caratteri, mirror dello stile già usato per il vincolo "fino a 2MB" del Volantino nella stessa voce.

Finding scartati/derogati (in `deferred-work.md`, tutti pattern pre-esistenti nel modulo Torneo, non introdotti/aggravati da questa storia): mancata `revalidatePath` della pagina di dettaglio per-Categoria (stessa lacuna già presente in `aggiornaCategoriaTorneoAction`), `trovaEdizioneTorneoPerId` chiamata fuori da try/catch (stesso gap del mirror `caricaVolantinoTorneoAction`), nessuna guardia `.catch()` sulle promise di `[categoriaId]/page.tsx` (nessuna delle 4 ne aveva già), messaggio di successo che non si nasconde su un nuovo edit (stesso comportamento di altri form del modulo). Scartati come già decisi/fuori scope: nessun test di rendering per componenti Client (convenzione già stabilita, confermata dal Verification Gap Reviewer: zero `*.test.tsx` in tutto `app/`), `<select>` di scelta Settimana non aggiornate coi nomi custom (esplicitamente fuori scope, spec Boundaries "Never"), ordine di validazione lunghezza-prima-di-esistenza (nessun impatto funzionale, entrambi i casi restituiscono comunque `VALIDATION`).

Riverificato dopo le patch: `npx vitest run` (120 file, 1852 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 21 warning preesistenti), `npx prisma validate` (schema valido), `npm run build` (riuscita).

## Design Notes

**Perché una funzione pura invece di modificare `ETICHETTA_SETTIMANA` stesso:** `ETICHETTA_SETTIMANA` resta la fonte di verità statica per l'etichetta generica (fallback) — renderla dinamica per-Edizione romperebbe la sua natura di costante globale condivisa. Una funzione dedicata (`etichettaSettimanaPersonalizzata`) che prende l'Edizione come parametro è la stessa disciplina già seguita per ogni altra funzione pura di questo modulo.

**Perché `[categoriaId]/page.tsx` guadagna una query in più:** oggi non carica l'Edizione (solo la Categoria), ma questa storia richiede il nome custom per la Settimana mostrata a riga 60 — l'unico modo di ottenerlo è caricare anche l'Edizione, stesso principio "risolvi in parallelo" già usato altrove (`Promise.all`).

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione
- `npx prisma validate` -- expected: schema valido (migrazione non eseguibile in questo ambiente)

**Manual checks (obbligatorio, da demandare all'utente dopo il deploy):**
- Un Admin imposta un nome per Settimana 1/2 su un'Edizione: verifica che compaia al posto dell'etichetta generica sia in admin (`/app/torneo/[edizioneId]`, riga Categoria, dettaglio Categoria) sia sulla pagina pubblica `/torneo`.
- Un'Edizione senza nomi impostati continua a mostrare "Settimana 1"/"Settimana 2" invariato.

## Suggested Review Order

**Etichetta e persistenza — flusso principale**

- Funzione pura, fonte di verità per l'etichetta con fallback.
  [`settimana-torneo.ts:43`](<../../lib/settimana-torneo.ts#L43>)

- Server Action: validazione, verifica esistenza Edizione, doppia `revalidatePath`.
  [`actions.ts:275`](<../../app/app/(torneo)/torneo/actions.ts#L275>)

**UI — form di modifica**

- Componente form, con la `key` che forza il refresh degli input non controllati dopo un salvataggio (fix di review).
  [`NomiSettimaneTorneoForm.tsx:23`](<../../app/app/(torneo)/torneo/[edizioneId]/NomiSettimaneTorneoForm.tsx#L23>)

**Adozione ai 3 siti di rendering**

- Riga Categoria (admin).
  [`CategoriaTorneoRow.tsx:94`](<../../app/app/(torneo)/torneo/CategoriaTorneoRow.tsx#L94>)

- Dettaglio Categoria (admin) — nuova query Edizione aggiunta.
  [`[categoriaId]/page.tsx:42`](<../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/page.tsx#L42>)

- Pagina pubblica.
  [`app/torneo/page.tsx:224`](<../../app/torneo/page.tsx#L224>)

**Peripherals**

- Migrazione dati (nessun cambio di schema oltre alle due nuove colonne nullable).
  [`migration.sql`](<../../prisma/migrations/20260826010000_add_nomi_settimane_edizione_torneo/migration.sql>)

- Copertura test della Server Action e della funzione pura.
  [`actions.test.ts:687`](<../../app/app/(torneo)/torneo/actions.test.ts#L687>)
