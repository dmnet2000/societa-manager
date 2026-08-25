---
title: "Story 20.6: Sezione pubblica del Torneo Memorial"
type: 'feature'
created: '2026-08-24'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'a08d106ba97ab9af77b9a8964ca25b284a64189b'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le Story 20.1-20.5 costruiscono tutta la gestione interna del Torneo Memorial (Edizioni, Categorie, Squadre, risultati, tabellone, volantino) ma nulla di tutto questo è oggi visibile a un Visitatore del sito pubblico - l'unico modo di seguire il torneo è chiedere direttamente alla società.

**Approach:** nuova pagina pubblica top-level `/torneo` (stesso livello di `/squadre`, `/calendario`, `/staff`, `/contatti` - fuori da `/app`, nessuna sessione), sola lettura, che mostra l'**Edizione corrente** (nuova nozione: l'`EdizioneTorneo` con l'`anno` più alto - nessun campo "corrente" esplicito esiste oggi, mirror del criterio "anno più recente" già implicito in `elencaEdizioniTorneo` che ordina `anno: desc`), il suo volantino se presente, e per ciascuna Categoria: le Squadre iscritte, la classifica di girone (una volta generato il calendario), gli incontri con i risultati, e - una volta generato - il tabellone semifinali/finali con la classifica finale. Design "Poster Sportivo" (mirror `app/calendario/calendario.module.css` per le card-incontro, `app/squadre/squadre.module.css` per le sezioni/card di Categoria) - **mai** il CSS module interno `app/app/(torneo)/torneo/torneo.module.css` (stile amministrativo, non il design pubblico).

## Boundaries & Constraints

**Always:** pagina interamente in sola lettura - nessun form, nessuna Server Action richiamata da questa pagina (a differenza di ogni altra pagina di `/app/torneo/...`, che sono form di gestione). I dati (classifica di girone, classifica finale) sono **sempre ricalcolati al volo** con le stesse funzioni pure già esistenti (`calcolaClassificaGirone`, `calcolaClassificaFinale`) - mai una seconda implementazione, mai persistiti. `dynamic = "force-dynamic"` (dati mutabili in ogni momento dalla gestione interna) - stesso principio di ogni altra pagina pubblica del sito.

**Ask First:** nessuna - i punti di scope sono già decisi in `epics.md`.

**Never:** **mai** esporre `referente`/`contatto` di `SquadraTorneo` (dati di contatto personali di un referente di club esterno - stesso principio di privacy già applicato a `/squadre` che esclude ogni dato Atleta, e a `/staff` che esclude email/codice fiscale) - solo `nome`/`girone` di ogni Squadra sono pubblici. Mai riusare `RisultatoPartitaTorneoForm.tsx` o qualunque componente che invii a una Server Action protetta da Ruolo - questa pagina non ha sessione, un Visitatore non deve mai vedere né un form di modifica né un pulsante che fallirebbe silenziosamente con `FORBIDDEN`. Mai un placeholder/errore fuorviante quando l'Edizione corrente non esiste ancora (nessuna Edizione mai creata) - messaggio esplicito, mirror `/squadre` AC #4.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nessuna `EdizioneTorneo` esiste ancora | DB vuoto per il Torneo | messaggio esplicito, nessun errore | N/A |
| Edizione corrente senza volantino caricato | `leggiInfoVolantinoTorneo` → `esiste:false` | sezione volantino assente, nessun placeholder rotto | N/A |
| Categoria senza calendario di girone generato | 0 `PartitaTorneo` per la Categoria | elenco Squadre iscritte per girone, nessuna tabella classifica/incontri vuota fuorviante | N/A |
| Categoria con calendario generato ma incontri non ancora giocati | `PartitaTorneo` esistenti, nessun risultato completo | classifica di girone con tutti 0 punti, incontri mostrati come "In programma" | N/A |
| Categoria con tabellone generato, finali non ancora complete | `PartitaTorneo` fase ≠ GIRONE esistono, non tutte le finali hanno risultato | tabellone/semifinali/finali mostrati con i risultati disponibili, classifica finale assente con messaggio esplicito (mirror pagina interna) | N/A |

</frozen-after-approval>

## Code Map

- `lib/torneo.ts` -- nuova `trovaEdizioneTorneoCorrente()`: `prisma.edizioneTorneo.findFirst({ orderBy: { anno: "desc" } })`, mirror di `elencaEdizioniTorneo` (stesso ordinamento, `findFirst` invece di `findMany`)
- `lib/risultato-partita-torneo.ts` -- estrarre `formattaRisultatoPartitaTorneo(partita)` da `RisultatoPartitaTorneoForm.tsx` (funzione locale `formattaRisultato`, non esportata) come unica fonte di verità riusabile sia dal form interno sia dalla nuova pagina pubblica - stessa disciplina DRY già applicata a `haRisultatoCompleto`/`terzoSetNecessario` nella stessa epica. `RisultatoPartitaTorneoForm.tsx` aggiornato per importarla invece di ridefinirla.
- **Nuovo file** `app/torneo/page.tsx` -- pagina pubblica top-level, mirror strutturale di `app/calendario/page.tsx` (fetch parallelo, `.catch()` fail-soft, `HeaderPubblico`/`FooterPubblico`, `dynamic = "force-dynamic"`). Fetch: `trovaEdizioneTorneoCorrente()` → se null, messaggio esplicito e fine; altrimenti `Promise.all` di `leggiInfoVolantinoTorneo`/`urlPubblicoVolantinoTorneo` (bucket pubblico, stesso `createClient()` già in uso per `foto-squadra` in `/squadre/page.tsx`, nessun client privilegiato necessario) + `elencaCategorieTorneo(edizione.id)`, poi per tutte le Categorie in parallelo `elencaSquadreTorneo`/`elencaPartiteTorneo` (mirror dei due campi già letti dalle pagine interne `risultati/page.tsx`/`tabellone/page.tsx`, qui però passati come props/dati statici, mai a un form)
- **Nuovo file** `app/torneo/torneo-pubblico.module.css` -- mirror di `app/calendario/calendario.module.css` (`.matchGrid`/`.matchCard`/`.squadre`/`.vs`/`.meta` per gli incontri) e `app/squadre/squadre.module.css` (card di sezione/titolo/messaggioVuoto) - **non** importa/riusa `app/app/(torneo)/torneo/torneo.module.css`
- **Nuovo file** `lib/torneo.test.ts` (estensione) -- test per `trovaEdizioneTorneoCorrente`
- **Nuovo file** `lib/risultato-partita-torneo.test.ts` (estensione) -- test per `formattaRisultatoPartitaTorneo` (già coperto indirettamente da `RisultatoPartitaTorneoForm`, ma mai come funzione pura isolata finora)

## Tasks & Acceptance

**Execution:**
- [ ] `lib/torneo.ts` -- `trovaEdizioneTorneoCorrente` + test
- [ ] `lib/risultato-partita-torneo.ts` -- estrazione `formattaRisultatoPartitaTorneo` + aggiornamento `RisultatoPartitaTorneoForm.tsx` + test
- [ ] `app/torneo/page.tsx` + `torneo-pubblico.module.css`

**Acceptance Criteria:** vedi `epics.md` Story 20.6 (Given/When/Then, verbatim - non duplicati qui).

## Spec Change Log

**2026-08-24 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer).** Nessun `intent_gap`/`bad_spec`, nessun loopback. Patch applicate e riverificate:

- **PATCH** — Edge Case Hunter: fallimento parziale che produceva uno stato auto-contraddittorio (la sezione Girone diceva "nessuna squadra iscritta" mentre il Tabellone sottostante, che legge i nomi Squadra da `partite` non da `squadre`, continuava a mostrare risultati/classifica finale reali con quegli stessi nomi). `elencaSquadreTorneo`/`elencaPartiteTorneo` per Categoria ora condividono un unico `try/catch`: un fallimento di una delle due azzera sempre entrambe insieme.
- **PATCH** — Edge Case Hunter: `createClient()` era l'unica risoluzione della pagina priva di un `.catch()` fail-soft — un suo fallimento faceva collassare l'intera pagina anche con l'Edizione già trovata con successo. Ora degrada a "nessun volantino" (unico uso di `supabase` in questa pagina), coerente con ogni altra lettura.
- **PATCH** — Blind Hunter: la costante `TABELLONI` (etichette "Finale 1°/2° posto" ecc.) era duplicata letteralmente tra la pagina interna e quella pubblica. Estratta in `lib/tabelloni-torneo.ts` (`TABELLONI_TORNEO`), riusata da entrambe — stessa disciplina DRY già applicata nell'epica a `haRisultatoCompleto`/`terzoSetNecessario`/`formattaRisultatoPartitaTorneo`.
- **PATCH** — Blind Hunter: nessun messaggio esplicito per un girone con calendario generato ma senza incontri per quel girone specifico (area vuota senza spiegazione). Aggiunto "Nessun incontro in questo girone.", mirror del messaggio già in uso nella pagina interna (`risultati/page.tsx`).
- **PATCH** — Blind Hunter: le `<section>` di Categoria/Girone/Tabellone non avevano `aria-labelledby`/`id` collegato all'heading, a differenza del mirror dichiarato (`/calendario`). Aggiunti su tutti e 3 i livelli di sezionamento.
- **PATCH** — Blind Hunter: il fallback "In programma" era testo semplice mentre l'equivalente nel form interno mirror è avvolto in `<em>` per distinzione visiva. Allineato in tutti e 4 i punti in cui compare.
- **PATCH** — Blind Hunter: dichiarazione di `edizioneFindFirstMock` fuori posto in `lib/torneo.test.ts` (dopo il blocco `vi.mock` che la referenzia, funzionante solo per l'hoisting delle factory `vi.mock` ma inconsistente con ogni mock gemello). Spostata in testa al file con gli altri.
- **DEFER** (loggati in `deferred-work.md`): nessuna barriera a livello di query (`select`) per `referente`/`contatto` di `SquadraTorneo` (convergenza di tutti e 3 i reviewer; nessuna fuga reale oggi, la correzione strutturale richiederebbe allentare la firma tipizzata di `calcolaClassificaGirone`/`calcolaClassificaFinale`, condivisa con le pagine interne, sproporzionato al rischio attuale); "Edizione corrente" = anno più alto può nascondere il torneo appena concluso (già segnalato nella spec come punto aperto); `/torneo` non è collegata da alcuna voce del menu pubblico dinamico — **passo operativo, non un difetto di codice**: un Admin/Site Manager deve aggiungerla da `/app/menu-pubblico` dopo il deploy.
- **REJECT**: tutti i restanti finding (fan-out di 2×N query per Categoria senza batching — micro-ottimizzazione sproporzionata per un pannello con poche Categorie, stesso principio già rigettato in Story 20.2/20.3; nessun test per `app/torneo/page.tsx` o per l'invariante "squadraCasa.girone === squadraOspite.girone in fase GIRONE" — gap sistemico, nessuna pagina pubblica del progetto ha mai avuto un test diretto; `trovaEdizioneTorneoCorrente` testata solo verificando l'argomento `orderBy` passato a Prisma, non l'esito con più righe candidate — è il limite intrinseco di un unit test su un wrapper ORM mockato, stessa filosofia di test già in uso in tutto il progetto; etichetta "Semifinale" hard-coded senza costante condivisa — cosmetico, nessun rischio di incoerenza di dominio).

Riverificato dopo le patch: `npx vitest run` (116 file, 1677 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 21 warning preesistenti non correlati), `npm run build` (riuscita, `/torneo` registrata come rotta pubblica).

## Design Notes

**Perché "Edizione corrente" = anno più alto:** nessun AC/decisione precedente definisce esplicitamente questa nozione (le Story 20.1-20.5 gestiscono sempre un'Edizione per id esplicito, mai "quella corrente"). Criterio scelto per coerenza con l'unico precedente nel codice (`elencaEdizioniTorneo`, `orderBy: anno desc`) - se il regolamento reale richiede un criterio diverso (es. un flag esplicito "edizione attiva" indipendente dall'anno), va corretto in una story successiva.

**Perché nessun componente client/interattivo:** la pagina non ha alcuna sessione né azione di scrittura - un Server Component puro è sufficiente e più semplice, nessun `useActionState`/form necessario, a differenza di ogni pagina di `/app/torneo/...`.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione, `/torneo` registrata come rotta pubblica

**Manual checks (obbligatorio):**
- Un Visitatore apre `/torneo` prima che esista qualunque Edizione (atteso: messaggio esplicito). Dopo aver creato un'Edizione con volantino, Categorie, Squadre, calendario di girone, risultati e tabellone (dal lato gestione interna), lo stesso Visitatore vede: il volantino, l'elenco Categorie con classifica di girone aggiornata, gli incontri con i risultati, il tabellone con le finali e la classifica finale una volta completa - senza mai un form o un pulsante di modifica.
