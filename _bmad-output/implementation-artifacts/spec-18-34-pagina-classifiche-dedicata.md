---
title: 'Story 18.34: Sezione classifiche spostata su una pagina pubblica dedicata "Classifiche"'
type: 'feature'
created: '2026-09-28'
status: 'done'
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/planning-artifacts/epics.md']
baseline_commit: '85ac41990dab5f327422ed3fca3f584536b2871a'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la sezione classifica (Story 18.33) vive oggi solo in fondo alla home pubblica — un Visitatore deve scorrere tutta la home per trovarla, e non è raggiungibile da un link diretto/dal menu.

**Approach:** nuova pagina pubblica `/classifiche` che riusa invariata tutta l'infrastruttura di fetch/parsing/cache già costruita (Story 18.33), con TUTTE le 13 colonne lette dal parser (non solo le 6 compatte della card home). La sezione classifica sparisce dalla home (la sezione "Risultati della settimana scorsa", distinta, resta invariata). Una nuova voce "Classifiche" compare nel menu pubblico dinamico (Story 19.6/19.7/19.8) via migrazione di seed, mirror esatto di come "Torneo" ha ottenuto la sua voce (Story 20.6).

## Boundaries & Constraints

**Always:**
- Logica di fetch/parsing/cache (query Campionati con `linkFipav`, `leggiLiveFipav` per Campionato, `classifichePerCampionatoDaLetture`) riusata invariata da `lib/sincronizza-gare-fipav/` — la query Prisma + il fetch in parallelo per Campionato (oggi inline in `app/page.tsx`) vanno estratti in una funzione condivisa in `lib/sincronizza-gare-fipav/leggi-live-fipav.ts`, chiamata sia da `app/page.tsx` sia dalla nuova `app/classifiche/page.tsx` — mai due implementazioni parallele della stessa query+fetch.
- `app/page.tsx`: la sezione JSX "Classifica" (oggi `styles.sezioneClassifiche`) viene rimossa per intero. La sezione "Risultati della settimana scorsa" (distinta, stessa Story 18.33) resta invariata, stesso posto, stesso comportamento — non dipende dalla sezione classifica rimossa se non per la lettura condivisa (`letturePerCampionato`), che resta necessaria a entrambe.
- `/classifiche`: stesso principio fail-soft di Story 18.33 (fetch fallito per un Campionato → quella card omessa, mai un errore visibile) e stesso principio "nessun blocco per un Campionato senza `linkFipav`".
- `/classifiche` mostra **tutte** le 13 colonne del parser (Pos./Squadra/Punti/PG/PV/PP/SF/SS/QS/PF/PS/QP/Penal.) — a differenza della card home (che ne mostrava solo 6 per compattezza), una pagina dedicata non ha quel vincolo.
- `/classifiche` mostra un messaggio esplicito ("Nessuna classifica disponibile al momento") quando nessuna card è disponibile (nessun Campionato con `linkFipav`, o tutti i fetch falliti) — a differenza della home (dove l'assenza è silenziosa perché la pagina ha comunque altro contenuto), qui la pagina esiste apposta per questo, mirror del principio già in `/calendario` (Story 18.9 AC #3).
- Nuova migrazione additiva su `voci_menu_pubblico`: inserisce "Classifiche" → `/classifiche` subito dopo "Calendario" (ordine dinamico via lookup SQL sull'ordine attuale di `/calendario`, non un numero fisso — mirror concettuale ma più robusto di `20260825010000_add_torneo_voce_menu_pubblico`, che usava un valore fisso), spostando avanti di uno le voci successive.
- Stesso pattern strutturale delle altre pagine pubbliche (`app/calendario/page.tsx`): `export const dynamic = "force-dynamic"`, `HeaderPubblico`/`FooterPubblico`, `<h1>` visibile (non nascosto come in home), propria CSS module.

**Ask First:** nessuna — le 5 decisioni rilevanti sono già chiuse (epics.md, Story 18.34, 2026-09-28, con la scelta di default poiché l'utente ha detto "procedi" senza rispondere singolarmente).

**Never:** nessuna modifica alla logica di fetch/parsing stessa (`leggiLiveFipav`, `analizzaHtmlClassificaFipav`, `classifichePerCampionatoDaLetture`) — solo dove/come viene chiamata. Nessun selettore Campionato/Girone (pagina unica, tutte le card insieme). Nessuna modifica alla sezione "Risultati della settimana scorsa".

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Almeno un Campionato con `linkFipav`, fetch riuscito | Lettura riuscita | `/classifiche` mostra una card per quel Campionato, tutte le 13 colonne | N/A |
| Nessun Campionato con `linkFipav`, o tutti i fetch falliti | `classifichePerCampionatoDaLetture` restituisce `[]` | Messaggio esplicito "Nessuna classifica disponibile al momento", nessuna area vuota senza spiegazione | N/A |
| Un Campionato fallisce, altri riescono | Fetch fallito per uno | Quel Campionato omesso, gli altri mostrati regolarmente | N/A |
| Home pubblica dopo questa storia | Visita a "/" | Nessuna sezione "Classifica" — "Risultati della settimana scorsa" (se presente) resta invariata | N/A |
| Menu pubblico dopo il deploy | Nessuna azione manuale | Voce "Classifiche" già presente, subito dopo "Calendario" | N/A |

</frozen-after-approval>

## Code Map

- `lib/sincronizza-gare-fipav/leggi-live-fipav.ts` -- nuova funzione `leggiCampionatiConLetturaFipav(annoAgonisticoId: string): Promise<LetturaPerCampionato[]>` (tipo già esportato da `vista-home-live.ts`) — estrae la query `prisma.campionato.findMany({ where: { annoAgonisticoId, linkFipav: { not: null } }, orderBy: { nome: "asc" }, select: {...} })` + il fetch live in parallelo per Campionato, oggi inline in `app/page.tsx` (righe ~226-291, blocco `campionatiConLinkFipav`/`letturePerCampionato`) — stesso identico comportamento (fail-soft, `.catch(() => null)` per Campionato), solo spostato per essere riusabile.
- `app/page.tsx` -- sostituire il blocco inline con una chiamata alla funzione sopra; rimuovere per intero la sezione JSX "Classifica" (`styles.sezioneClassifiche`, righe ~453-518) e le variabili `classifichePerCampionato`/`mostraClassifiche` associate (non più usate lì); `risultatiSettimanaScorsaDaLetture` continua a ricevere `letturePerCampionato` dalla nuova funzione condivisa, invariato.
- Nuovo file `app/classifiche/page.tsx` -- mirror strutturale di `app/calendario/page.tsx` (righe 1-30 per il pattern `dynamic`/`HeaderPubblico`/`trovaAnnoAgonisticoCorrente().catch()`/`<h1>` visibile/messaggio vuoto): chiama `leggiCampionatiConLetturaFipav` + `classifichePerCampionatoDaLetture` (riusata invariata da `vista-home-live.ts`), renderizza una card per Campionato con TUTTE le 13 colonne (mirror della tabella già in `app/page.tsx:477-513`, estesa).
- Nuovo file `app/classifiche/classifiche.module.css` -- classi di layout pagina (`.main`/`.titolo`/`.messaggioVuoto`), mirror di `app/calendario/calendario.module.css`. Le classi specifiche della card classifica (`.schedaClassifica`/`.tabellaClassifica`/`.titoloClassifica`/`.listaClassifiche`/`.sezioneClassifiche`) restano riusabili da `app/home-pubblica.module.css` (import diretto da lì, evita di duplicare ~60 righe di CSS) — a discrezione dello sviluppo se preferire lo spostamento in un file condiviso invece del riuso cross-file, nessun AC lo impone.
- Nuovo file di migrazione (nome libero, es. `2026092xxxxxxx_add_classifiche_voce_menu_pubblico`) -- mirror concettuale di `prisma/migrations/20260825010000_add_torneo_voce_menu_pubblico/migration.sql`, ma con l'ordine di "Calendario" risolto via query invece di un valore fisso (Boundaries sopra).
- `app/NavPubblica.tsx`/`lib/menu-pubblico.ts` -- NESSUNA modifica (il menu è già interamente dinamico, la nuova voce basta inserirla nella tabella).

## Tasks & Acceptance

**Execution:**
- [x] `lib/sincronizza-gare-fipav/leggi-live-fipav.ts` -- nuova `leggiCampionatiConLetturaFipav`, estratta da `app/page.tsx`, + test
- [x] `app/page.tsx` -- usa la funzione condivisa, rimuove la sezione "Classifica"
- [x] `app/classifiche/page.tsx` (nuovo) + `app/classifiche/classifiche.module.css` (nuovo) -- pagina pubblica con tutte le 13 colonne, messaggio esplicito se vuota
- [x] Nuova migrazione -- voce "Classifiche" nel menu pubblico dinamico, dopo "Calendario"
- [x] Test: verificare che la funzione condivisa produca lo stesso risultato per entrambi i chiamanti (home e `/classifiche`), che un Campionato fallito venga omesso, che la migrazione inserisca la voce nell'ordine corretto (test SQL diretto o verifica manuale, a discrezione dello sviluppo dato che questo progetto non ha test automatici sulle migrazioni) -- coperto con test unitari su `leggiCampionatiConLetturaFipav` (stessa funzione, unico chiamante testato, entrambe le pagine ereditano il comportamento); migrazione verificata solo per lettura/ragionamento manuale (nessun harness SQL nel progetto, dev locale non disponibile su questa macchina, vedi Verification)

**Acceptance Criteria:**
- Vedi Story 18.34 completa in `_bmad-output/planning-artifacts/epics.md` (Epic 18) — 6 AC con le 5 decisioni chiuse il 2026-09-28, riportate qui per intero come parte del contratto di questa spec.

## Design Notes

**Perché estrarre la query+fetch in una funzione condivisa invece di duplicarla:** `app/page.tsx` e `app/classifiche/page.tsx` avrebbero altrimenti la stessa query Prisma e lo stesso pattern di fetch in parallelo scritti due volte — un futuro cambio (es. un nuovo campo selezionato, un cambio del `.catch()`) rischierebbe di aggiornarne solo una copia. Stesso principio già seguito per `sincronizzaCampionatoFipav` (Story 10.12) e `vista-home-live.ts` (Story 18.33).

**Perché tutte le 13 colonne su `/classifiche` ma solo 6 restavano sulla card home:** la card home doveva stare in una sezione tra molte altre (hero, risultati, partite della settimana, foto squadra) — compattezza necessaria. Una pagina dedicata non ha quel vincolo, ed è l'occasione naturale per mostrare l'intera classifica come un Visitatore se l'aspetterebbe da una pagina che si chiama "Classifiche".

## Verification

**Commands:**
- `npx prisma validate` -- expected: schema valido
- `npx vitest run` -- expected: tutti i test passano, inclusi quelli nuovi
- `npx tsc --noEmit` -- expected: nessun errore
- `npx eslint <file toccati>` -- expected: nessun errore

**Manual checks (dopo il deploy, dev locale non disponibile su questa macchina):**
- Visitare `/classifiche`, verificare che mostri le stesse classifiche di prima (ora con tutte le colonne) e che la home non le mostri più
- Verificare che la voce "Classifiche" compaia nel menu pubblico, dopo "Calendario", senza alcuna azione manuale
- Verificare che "Risultati della settimana scorsa" in home resti invariata

## Review Log

Review a 3 layer (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) completata 2026-09-28 su `.tmp-diff-18-34.txt` (baseline `85ac41990dab5f327422ed3fca3f584536b2871a`).

**Patch applicate:**
- **[Blind Hunter, il più serio]** `/classifiche` mancava da `PUBLIC_ROUTES` (`lib/auth/route-guard.ts`) — un Visitatore anonimo che apriva la pagina (o cliccava la voce "Classifiche" nel menu) veniva reindirizzato a `/accedi` invece di vedere la pagina pubblica: stesso identico bug già capitato 3 volte prima nel progetto (`/torneo`, `/sponsor`, e le 4 rotte di Story 18.7), ogni volta dimenticato all'introduzione di una nuova pagina pubblica. Corretto anche `rottaRiservata` di conseguenza (riusa `isPublicRoute`/`PUBLIC_ROUTES`, stessa fix). Aggiunti 2 test di regressione (`route-guard.test.ts`, `route-decision.test.ts`) per intercettare in futuro la stessa dimenticanza.
- **[Blind Hunter]** Guida in-app (`lib/guida/contenuti.ts`) ancora descriveva la classifica come mostrata "sulla home pubblica" — aggiornata per riflettere lo spostamento su `/classifiche` (regola permanente del progetto dall'Epic 17).
- **[Edge Case Hunter + Blind Hunter, convergenti]** Migrazione fragile: la subquery su `url = '/calendario'` falliva silenziosamente (UPDATE no-op + INSERT con `ordine` NULL) se quella riga fosse mancante/rinominata, e non era deterministica con eventuali righe `/calendario` duplicate (nessun vincolo di unicità su `url`). Corretto con `COALESCE(..., MAX(ordine), 0)` + `ORDER BY "ordine" ASC LIMIT 1`: degrada a fine elenco invece di far fallire il deploy, sceglie deterministicamente in caso di duplicati.
- **[Edge Case Hunter + Verification Gap Reviewer, convergenti]** `.sezioneClassifiche` in `app/home-pubblica.module.css` era CSS morto (JSX rimossa) — rimosso, commento della sezione aggiornato per riflettere che le classi rimanenti hanno ora un solo consumer (`app/classifiche/page.tsx`, cross-file).
- **[Blind Hunter]** Colonne abbreviate (PG/PV/PP/SF/SS/QS/PF/PS/QP/Penal.) si affidavano solo all'attributo `title` (inaffidabile per screen reader, irraggiungibile su touch) — aggiunto `<abbr title="...">` dentro ogni `<th>`.
- **[Blind Hunter]** Commento fuorviante in `app/classifiche/page.tsx` ("quarta pagina pubblica reale") — corretto; probabile causa root del bug `PUBLIC_ROUTES` sopra (mirror di `/calendario` senza notare che `/torneo`/`/sponsor` avevano già dovuto patchare `route-guard.ts` a parte).

**Deferred (loggati in `deferred-work.md`, sezione "spec-18-34"):** dipendenza circolare di tipo (innocua, solo `import type`) tra `leggi-live-fipav.ts`/`vista-home-live.ts`; nome ormai impreciso di `home-pubblica.module.css` (riusato cross-file da `/classifiche`); nessun indicatore "aggiornato al" su `/classifiche`; nessuna guardia di idempotenza sulla migrazione (stesso limite già presente nelle migrazioni sorelle).

**Non trattati come gap (già accettati a livello di progetto, non regressioni introdotte qui):** nessun test di rendering per `app/classifiche/page.tsx`/`app/page.tsx` (nessuna infrastruttura di test per Server Component nel progetto, disclosed fin dalla spec); nessuna guardia di idempotenza sulle migrazioni di seed del menu (pattern preesistente, non introdotto da questa storia).

**Verifica finale:** `npx tsc --noEmit` pulito, `npx prisma validate` valido, `npx eslint` pulito sui file toccati, `npx vitest run` → 145 file / 2293 test tutti superati (2292 + 1 nuovo test di regressione).
