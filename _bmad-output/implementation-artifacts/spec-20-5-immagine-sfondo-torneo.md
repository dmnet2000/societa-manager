---
title: "Story 20.5: Immagine di sfondo del torneo (volantino)"
type: 'feature'
created: '2026-08-24'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'bb8acea21d12cb11dd10e8333c43a83dee2bd20e'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** un'Edizione del Torneo (Story 20.1) non ha alcun modo di caricare un'immagine di sfondo/volantino - la futura sezione pubblica (Story 20.6) non avrebbe nulla da mostrare.

**Approach:** deciso in `epics.md` (Story 20.5): nuovo bucket Supabase Storage pubblico dedicato `volantino-torneo`, path PER-ENTITÀ (`edizioneTorneoId`, nessuna sottocartella) - mirror esatto di `lib/storage/foto-squadra.ts` (Story 18.4, stesso principio "un file per entità, upsert sostituisce"), non del pattern singleton di `foto-hero.ts` (una sola foto per l'intero sito). Riuso diretto della validazione MIME/dimensione esistente (`lib/storage/validazione-immagine.ts`, PNG/JPEG, 2MB), nessuna nuova regola.

## Boundaries & Constraints

**Always:** stesso perimetro Ruoli delle altre Server Action Torneo (`requireRuolo(["ADMIN","DIRIGENTE"])`). Upload con `upsert: true` (sostituzione fisica, mai accumulo di versioni) - stesso comportamento di ogni altro bucket Storage del progetto. Validazione file in 4 passaggi identici a `caricaFotoHeroAction`/`caricaFotoSquadraAction` (presenza, MIME dichiarato, dimensione, contenuto reale via `contenutoCorrispondeAlMimeImmagine`) - stessi messaggi di errore letterali già in uso altrove nel progetto (AC di `epics.md`: "stesso messaggio di errore già in uso altrove"). Verifica che l'Edizione esista prima di caricare (mirror del controllo "Categoria non trovata" già stabilito nelle altre azioni Torneo).

**Ask First:** nessuna - i punti di scope sono già decisi in `epics.md`/`epic-20-context.md`.

**Never:** nessuna nuova colonna Prisma su `EdizioneTorneo` (esistenza/data aggiornamento derivate da Storage `list()`, stesso principio di `foto-hero`/`foto-squadra`/`logo`). Nessuna sezione pubblica qui (Story 20.6, che consumerà `urlPubblicoVolantinoTorneo`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin/Dirigente carica un'immagine valida per un'Edizione senza volantino | PNG/JPEG ≤2MB | immagine salvata, sostituisce nulla (prima volta) | N/A |
| Admin/Dirigente carica una nuova immagine per un'Edizione con volantino già presente | PNG/JPEG ≤2MB | la nuova immagine sostituisce fisicamente la precedente (stesso path) | N/A |
| File con MIME non ammesso, oltre 2MB, o contenuto non corrispondente al MIME dichiarato | file non valido | rifiutato | `VALIDATION`, stesso messaggio già in uso in `caricaFotoHeroAction` |
| Upload per un `edizioneTorneoId` non più esistente | Edizione cancellata in un'altra scheda | rifiutato | `VALIDATION`, messaggio esplicito |

</frozen-after-approval>

## Code Map

- **Nuova migrazione** `prisma/migrations/<timestamp>_add_volantino_torneo_bucket/migration.sql` -- `INSERT INTO storage.buckets` (`volantino-torneo`, pubblico, 2MB, PNG/JPEG, mirror `20260813000000_add_foto_squadra_bucket`); policy SELECT pubblica (nessuna condizione di Ruolo - servirà alla Story 20.6, sito pubblico anonimo); policy INSERT/UPDATE solo `ADMIN`/`DIRIGENTE` (mirror `sponsor-banner`/`foto-hero` - nessuna funzione di "possesso" necessaria, a differenza di `foto-squadra-gruppo` dove anche l'Allenatore può caricare: qui il perimetro Torneo è sempre e solo Admin/Dirigente); nessuna policy DELETE (mirror di ogni altro bucket del progetto, sostituzione via upsert, mai cancellazione esplicita)
- **Nuovo file** `lib/storage/volantino-torneo.ts` -- `caricaVolantinoTorneo(supabase, edizioneTorneoId, file)`, `urlPubblicoVolantinoTorneo(supabase, edizioneTorneoId)`, `leggiInfoVolantinoTorneo(supabase, edizioneTorneoId): Promise<{esiste: boolean; aggiornatoIl: string | null}>` (mirror letterale di `lib/storage/foto-squadra.ts`, `list("", {search: edizioneTorneoId})` per l'esistenza, come `leggiInfoFotoHero`)
- **Nuovo file** `lib/storage/volantino-torneo.test.ts` -- mirror `lib/storage/foto-hero.test.ts`/`foto-squadra.test.ts`
- `app/app/(torneo)/torneo/actions.ts` -- nuova `caricaVolantinoTorneoAction(_prevState, formData)`: stessa sequenza di validazione a 4 passaggi di `caricaFotoHeroAction` (`app/(configurazione)/impostazioni/actions.ts:277-328`), `trovaEdizioneTorneoPerId` prima dell'upload, `revalidatePath('/app/torneo/{edizioneId}')`
- **Nuovo file** `app/app/(torneo)/torneo/[edizioneId]/VolantinoTorneoForm.tsx` -- mirror `FotoSquadraForm.tsx` (`app/(gruppi-allenatori)/gruppi/`): props `edizioneTorneoId`, `volantinoEsiste`, `volantinoUrl`, `volantinoAggiornatoIl`; anteprima `<img>` con cache-busting `?v=` se esistente, hidden field `edizioneTorneoId`, bottone "Carica"/"Sostituisci"
- `app/app/(torneo)/torneo/[edizioneId]/page.tsx` -- nuova sezione "Volantino" (legge `leggiInfoVolantinoTorneo`/`urlPubblicoVolantinoTorneo` con lo stesso client Supabase, `createClient()`, e lo stesso pattern fail-soft `.catch(() => ({esiste:false, aggiornatoIl:null}))` già in uso in `impostazioni/page.tsx`)

## Tasks & Acceptance

**Execution:**
- [ ] migrazione -- bucket `volantino-torneo` + policy SELECT/INSERT/UPDATE
- [ ] `lib/storage/volantino-torneo.ts` + test
- [ ] `torneo/actions.ts` -- `caricaVolantinoTorneoAction` + test
- [ ] `[edizioneId]/VolantinoTorneoForm.tsx`
- [ ] `[edizioneId]/page.tsx` -- sezione Volantino

**Acceptance Criteria:** vedi `epics.md` Story 20.5 (Given/When/Then, verbatim - non duplicati qui).

## Spec Change Log

**2026-08-24 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer).** Nessun `intent_gap`/`bad_spec`, nessun loopback. Patch applicate e riverificate:

- **PATCH** — Blind Hunter: la sequenza di validazione a 4 passaggi (presenza/dimensione/MIME/magic-byte) era reinlineata per intero in `caricaVolantinoTorneoAction`, quarta duplicazione nel progetto (dopo `logo/actions.ts`, `impostazioni/actions.ts`, `gruppi/actions.ts`). Estratta come `validaFileImmagine()` in `lib/storage/validazione-immagine.ts`, unica fonte di verità per i nuovi chiamanti (i 3 preesistenti non toccati, fuori scope di questa storia).
- **PATCH** — Edge Case Hunter (2 finding convergenti): l'upload usava la stringa grezza `edizioneTorneoId` letta da `formData`, non l'id canonico appena verificato da `trovaEdizioneTorneoPerId`. `caricaVolantinoTorneo`/`revalidatePath` ora usano `edizione.id` — stesso principio "mai fidarsi del client per lo scoping" già stabilito nel resto dell'epica.
- **PATCH** — Blind Hunter: la classe CSS del contenitore (`.fotoSquadra`, copiata dal mirror senza adattarla) rinominata in `.sezioneVolantino` — nome fuorviante per una sezione che riguarda il Volantino del Torneo, non una foto di Gruppo.
- **PATCH** — Blind Hunter: l'`alt` dell'anteprima era il testo statico "Volantino del Torneo" (il mirror `FotoSquadraForm.tsx` parametrizza invece l'alt); ora include l'anno dell'Edizione (`edizioneAnno`, nuova prop) per distinguere più Edizioni aperte in tab diverse.
- **PATCH** — Blind Hunter: selettore CSS morto `.formCompatto select` (nessun `<select>` in questo form, copiato dal mirror senza pulizia) — rimosso.
- **PATCH** (test) — Blind Hunter: il limite di 2MB era testato solo appena sopra la soglia (`+1`, rifiutato); aggiunto un test per il file di dimensione esattamente pari al limite (accettato, `file.size > LIMITE` non `>=`).
- **DEFER** (loggati in `deferred-work.md`): nessuna pulizia dell'oggetto Storage quando l'Edizione viene cancellata (stesso gap mai risolto per `sponsor-banner`/`foto-squadra-gruppo`); race TOCTOU tra verifica esistenza e upload (stessa classe di rischio già accettata per la guardia squadre di Story 20.2); cache-busting basato su `updated_at` invece di un hash di contenuto (comportamento invariato ereditato da `foto-hero.ts`/`foto-squadra.ts`, non un rischio nuovo).
- **REJECT**: tutti i restanti finding (nessun messaggio di successo esplicito oltre l'anteprima, nessuna conferma prima della sostituzione, catch generico che non distingue errore permanente/transitorio, validazione magic-byte non garantisce un'immagine decodificabile, variante MIME `image/jpg` rifiutata, nessun limite di body-size lato framework, nessun test per il componente client, nessun test per il fail-soft di `page.tsx`, nessuna policy DELETE) — tutti pattern ereditati identici dai mirror esistenti (`foto-hero.ts`/`foto-squadra.ts`/`FotoSquadraForm.tsx`/`impostazioni/page.tsx`), nessuno introdotto da questa storia, nessun precedente nel progetto da rompere qui.

Riverificato dopo le patch: `npx vitest run` (116 file, 1672 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 20 warning preesistenti non correlati), `npm run build` (riuscita, `/app/torneo/[edizioneId]` registrata).

## Design Notes

**Perché un bucket per-entità e non un campo Prisma:** stesso principio già stabilito per foto-hero/foto-squadra/logo/sponsor-banner in questo progetto - Storage Supabase è la fonte di verità per i file binari, Prisma non traccia mai un riferimento diretto (né un path né un flag "ha immagine"), l'esistenza si deriva sempre da una lettura Storage (`list()`).

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione
- `npx prisma migrate dev` (o equivalente) -- expected: migrazione applicata senza errori (probabilmente non eseguibile in questo ambiente, stesso limite delle story precedenti)

**Manual checks (obbligatorio):**
- Un Admin/Dirigente apre un'Edizione, carica un'immagine PNG/JPEG valida come volantino (verifica: anteprima mostrata), la sostituisce con un'altra immagine (verifica: la nuova immagine appare, cache-busting funzionante), prova un file non valido (PDF, o un'immagine oltre 2MB) (atteso: rifiutato con messaggio esplicito).
