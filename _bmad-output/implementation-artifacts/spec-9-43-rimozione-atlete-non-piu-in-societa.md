---
title: 'Story 9.43: Rimozione delle Atlete non più in società o passate ad altra società'
type: 'feature'
created: '2026-09-24'
status: 'done'
review_loop_iteration: 1
context: ['{project-root}/_bmad-output/planning-artifacts/epics.md']
baseline_commit: '5491b8ac8f1c66ddf37e4c8d301742e8e59bb981'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** oggi non esiste modo di segnare un'Atleta come "non più in società"/"trasferita" — l'unica uscita (`escludiIscrizione`, Story 1.8) vale per la sola stagione corrente, l'Atleta resta nell'anagrafica attiva e ricompare ovunque ogni nuova stagione.

**Approach:** archiviazione reversibile (mai cancellazione fisica) — `Atleta` guadagna `rimossaIl`/`motivoRimozione`/`notaRimozione`. `elencaAtlete`/`elencaAtletePubbliche`/`elencaAtletePerIds` (`lib/db-rls/atleta.ts`) escludono le rimosse per default con un nuovo parametro opzionale `{ includiRimosse: true }` per i 3 consumatori che devono vederle esplicitamente (`conferma-iscrizioni`, `certificato-medico`, `dati-fisici`) — nessuna modifica necessaria negli altri ~18 chiamanti, che ereditano l'esclusione gratis.

## Boundaries & Constraints

**Always:**
- `rimossaIl DateTime?`, `motivoRimozione MotivoRimozioneAtleta?` (nuovo enum: `NON_PIU_IN_SOCIETA`, `TRASFERITA`), `notaRimozione String?` — tutti nullable, migrazione additiva, nessun backfill.
- `elencaAtlete`/`elencaAtletePubbliche`/`elencaAtletePerIds`: nuovo parametro opzionale `{ includiRimosse?: boolean }`, default `false` → `.is("rimossaIl", null)`. Con `true`, nessun filtro (tutte, incluse le rimosse) — un'unica query, mai due round-trip.
- `rimuoviAtleta`/`ripristinaAtleta` (nuove Server Action, `conferma-iscrizioni/actions.ts`): `requireRuolo(["ADMIN","DIRIGENTE","SEGRETERIA"])` (mirror esatto di `escludiIscrizione`, non di `confermaIscrizione` che è Segreteria-only).
- `rimuoviAtleta`: motivo obbligatorio (uno dei due valori enum), nota facoltativa, conferma esplicita a due passaggi (nome Atleta visibile) prima dell'invio — mai un solo click. Disattiva anche l'Iscrizione della stagione corrente se presente (`disattivaIscrizione`, stesso meccanismo di `escludiIscrizione`).
- `ripristinaAtleta`: azzera i 3 campi, conferma esplicita, nessun ripristino automatico dell'Iscrizione (l'Atleta torna "non iscritta", da riconfermare).
- `IscrizioniElenco.tsx`: nuova sezione a scomparsa "Atlete rimosse" (motivo/data/nota, bottone Ripristina) — mirror del pattern disclosure di `TabellaPartiteGruppo.tsx` (`useState`+`useId`+`aria-expanded`/`aria-controls`). La ricerca esistente (`corrispondeRicercaAtleta`) filtra anche questa sezione.
- Import federale (`import-atlete/actions.ts`): `trovaPerCodiceFiscale` già vede le rimosse (usa `select("*")`, non `elencaAtlete` — nessuna modifica a quella funzione). Nuovo terzo ramo dopo il match: se `esistente.rimossaIl`, NON chiamare `aggiornaAtleta` né `creaAtleta` — contare in un nuovo campo del riepilogo (`ImportaAtleteState`, es. `rimosseRiconosciute`), mai un duplicato né un ripristino silenzioso.
- Rollover Under 13 (stesso file, righe 119-154): deve controllare esplicitamente `rimossaIl` prima di riportare un'Atleta — NON assumere che il nuovo default di `elencaAtlete` (riga 133) da solo garantisca la non-riattivazione; verificare riga per riga l'esatta logica di "chi viene riportato" prima di fidarsi del solo filtro.
- Cron `promemoria-certificati/route.ts`: itera su `elencaCertificati`, non su `elencaAtlete` — il filtro di `elencaAtlete` da solo NON basta (l'investigazione lo conferma: oggi un `atleta` non trovato ha comunque un fallback "un'Atleta" e l'email parte). Quando `atlete.find(...)` (riga 117) non trova l'Atleta, saltare esplicitamente quel certificato (`saltati++`, `continue`) invece di procedere con l'invio.
- `certificato-medico/page.tsx`/`dati-fisici/page.tsx`: chiamano `elencaAtlete(supabase, { includiRimosse: true })`, poi controllano `.rimossaIl` sull'Atleta risolta per scegliere tra il messaggio esistente ("non collegata") e un nuovo messaggio esplicito ("Questa Atleta non è più tesserata con la società.") — nessuna email, nessuna perdita di accesso account.
- `/squadre` (pubblica): `elencaAtletePubbliche` col nuovo default esclude già le rimosse, nessuna modifica al file chiamante.
- Guida in-app `/app/conferma-iscrizioni` (`lib/guida/contenuti.ts`): nuova riga nel `corpo` che spiega la differenza "Escludi" (solo stagione) vs "Rimuovi dalla società" (definitiva, ripristinabile).
- Policy RLS `atlete`: `admin_dirigente_segreteria_update` (righe 19-26, migrazione `20260716080000`) non restringe per colonna — verificare che copra già i 3 nuovi campi, nessuna nuova policy attesa salvo la verifica lo smentisca.

**Ask First:** nessuna — le 4 decisioni rilevanti sono già chiuse con l'utente (epics.md, Story 9.43, 2026-09-24).

**Never:** nessuna cancellazione fisica dell'Atleta. Nessuna modifica allo storico (Presenze/Misurazioni/Certificati/Iscrizioni/Tesseramenti passati). Nessuna email automatica al Genitore. Nessun campo strutturato per la nuova società (solo nota libera).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Rimozione con motivo valido | Segreteria conferma, motivo scelto | `rimossaIl`/`motivoRimozione` impostati, Iscrizione corrente disattivata, sparisce dagli elenchi operativi | N/A |
| Rimozione senza motivo | Motivo non selezionato | Rifiutata, nessuna scrittura | `{ error: { code: "VALIDATION" } }` |
| Ripristino | Segreteria conferma su un'Atleta rimossa | I 3 campi tornano `null`, ricompare negli elenchi (non iscritta) | N/A |
| Ruolo non ammesso (Allenatore/Atleta/Genitore) | Chiama l'azione direttamente | Rifiutato lato server | `{ error: { code: "FORBIDDEN" } }` |
| Import federale, codice fiscale di un'Atleta rimossa | File con quel codice fiscale | Nessun duplicato, nessun ripristino; segnalata nel riepilogo | conteggio `rimosseRiconosciute`, mai un errore bloccante |
| Rollover Under 13, Atleta rimossa mancante dall'export | Era iscritta l'anno scorso, Under 13, ora rimossa | NON riportata/riattivata | N/A |
| Cron promemoria, Certificato di un'Atleta rimossa | Certificato in scadenza di un'Atleta rimossa | Nessuna email inviata, contata in `saltati` | N/A |
| Genitore apre `/app/certificato-medico` per una figlia rimossa | Atleta collegata ma rimossa | Messaggio esplicito "non più tesserata", nessun crash | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma:94-137` -- model `Atleta`, inserire i 3 nuovi campi dopo `cellulare` (riga 114), prima di `createdAt`; nuovo enum `MotivoRimozioneAtleta`.
- `lib/db-rls/atleta.ts:76-152` -- `elencaAtlete`/`elencaAtletePubbliche`/`elencaAtletePerIds`, aggiungere `{ includiRimosse?: boolean }` a ciascuna.
- `app/app/(iscrizioni)/conferma-iscrizioni/actions.ts:56-78` -- `escludiIscrizione`, mirror esatto per le nuove `rimuoviAtleta`/`ripristinaAtleta`.
- `app/app/(iscrizioni)/conferma-iscrizioni/page.tsx:3,28-34,91-98` -- chiamata `elencaAtlete` con `includiRimosse: true`, split attive/rimosse, props aggiuntive a `IscrizioniElenco`.
- `app/app/(iscrizioni)/conferma-iscrizioni/IscrizioniElenco.tsx` (65 righe) -- nuova sezione a scomparsa, ricerca estesa alle rimosse.
- `app/app/(iscrizioni)/conferma-iscrizioni/IscrizioneRow.tsx:73-118,84-92` -- nuovo bottone "Rimuovi dalla società" accanto a "Escludi".
- `app/app/(partite-campionati)/partite/TabellaPartiteGruppo.tsx` (115 righe) -- mirror del pattern disclosure (`useState`/`useId`/`aria-expanded`).
- `app/app/(partite-campionati)/campionati/EliminaCampionatoForm.tsx:19-30` -- pattern di conferma esplicita più vicino, da ESTENDERE (non riusare 1:1: qui serve un motivo obbligatorio, `window.confirm` nativo non supporta input strutturati).
- `app/app/(onboarding-import)/import-atlete/actions.ts:10,80-117,119-154,18-27,167` -- terzo ramo "esistente rimossa", verifica rollover, estensione tipo `ImportaAtleteState`.
- `lib/matching-codice-fiscale/trova-per-codice-fiscale.ts:19-41` -- invariata (già vede le rimosse via `select("*")`), solo il chiamante cambia.
- `app/api/cron/promemoria-certificati/route.ts:62,86-130,111-115,117` -- skip esplicito quando `atlete.find(...)` non risolve.
- `app/app/(certificati-medici)/certificato-medico/page.tsx:5,60-82` -- `includiRimosse: true` + messaggio esplicito.
- `app/app/(dati-atleta)/dati-fisici/page.tsx:6,136-146,177,187-202` -- stesso trattamento.
- `lib/guida/contenuti.ts:67-78` -- nuova riga nel `corpo`.
- `prisma/migrations/20260716080000_atlete_restrict_delete/migration.sql:19-26` -- policy `admin_dirigente_segreteria_update` da verificare (non da modificare salvo la verifica lo richieda).

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + nuova migrazione -- 3 campi nullable + enum `MotivoRimozioneAtleta` su `Atleta`
- [x] `lib/db-rls/atleta.ts` -- `{ includiRimosse }` su `elencaAtlete`/`elencaAtletePubbliche`/`elencaAtletePerIds`, default `false`
- [x] `app/app/(iscrizioni)/conferma-iscrizioni/actions.ts` -- `rimuoviAtleta`/`ripristinaAtleta`, mirror `escludiIscrizione`
- [x] `app/app/(iscrizioni)/conferma-iscrizioni/page.tsx` -- `includiRimosse: true`, split attive/rimosse
- [x] `IscrizioniElenco.tsx`/`IscrizioneRow.tsx` (nuovo `RimuoviAtletaForm.tsx`/`RipristinaAtletaForm.tsx`) -- dialog conferma con motivo obbligatorio + nota, sezione a scomparsa "Atlete rimosse", ricerca estesa
- [x] `app/app/(onboarding-import)/import-atlete/actions.ts` -- terzo ramo import, verifica esplicita rollover (confermato già protetto dal filtro di `elencaAtlete`, nessuna modifica di logica necessaria lì), `ImportaAtleteState` esteso
- [x] `app/api/cron/promemoria-certificati/route.ts` -- skip esplicito su Atleta non risolta
- [x] `certificato-medico/page.tsx` + `dati-fisici/page.tsx` -- `includiRimosse: true` + messaggio esplicito
- [x] `lib/guida/contenuti.ts` -- riga guida "Rimuovi dalla società" vs "Escludi"
- [x] Verificata (non serviva modificarla) la policy RLS `update` su `atlete` -- `USING`/`WITH CHECK` non restringono per colonna, copre già i 3 nuovi campi
- [x] Test: `lib/db-rls/atleta.test.ts` (nuovo parametro + `segnaAtletaRimossa`/`annullaRimozioneAtleta`), `conferma-iscrizioni/actions.test.ts` (`rimuoviAtleta`/`ripristinaAtleta`), `import-atlete/actions.test.ts` (terzo ramo + rollover con Atleta rimossa), nuovo `promemoria-certificati/route.test.ts` (primo test di un Route Handler in questo progetto, nessun precedente). **Gap dichiarato**: nessun test automatico per l'ultima riga della matrice sotto (messaggio esplicito su `/app/certificato-medico`/`/app/dati-fisici`) - questo progetto non ha mai testato l'output renderizzato di un Server Component (nessuna libreria tipo `@testing-library/react` presente, `vitest.config.ts` usa `environment: "node"`), aggiungerla sarebbe una nuova dipendenza/infrastruttura di test fuori scope per questa story. Verificato manualmente via lettura del codice + `tsc`, non con un test automatico.

**Acceptance Criteria:**
- Vedi Story 9.43 completa in `_bmad-output/planning-artifacts/epics.md` (righe 1658-1696) — 11 AC con le 4 decisioni chiuse il 2026-09-24, riportate qui per intero come parte del contratto di questa spec (non ridigitate per brevità, il file è la fonte).

## Spec Change Log

- 2026-09-24 (review): `rimuoviAtleta` non usa più un `iscrizioneId` passato dal client — risolve l'Iscrizione attiva della stagione corrente lato server (`disattivaIscrizioneAttivaPerAtleta`, nuova funzione in `lib/db-rls/iscrizione.ts`), PRIMA di segnare l'Atleta rimossa (ordine invertito per sicurezza in caso di fallimento parziale a metà). Motivazione: bug convergente trovato indipendentemente da Verification Gap Reviewer e Blind Hunter — lo stato locale di `IscrizioneRow.tsx` resta `iscrizioneId: null` subito dopo una `confermaIscrizione` senza reload, quindi un click immediato su "Rimuovi dalla società" non disattivava l'Iscrizione appena creata (violazione AC #2); risolve anche un finding indipendente dell'Edge Case Hunter sulla mancata verifica che l'`iscrizioneId` ricevuto appartenesse davvero ad `atletaId`.
- 2026-09-24 (review): guardia di idempotenza aggiunta a `segnaAtletaRimossa` (`.is("rimossaIl", null)`) — una rimozione ripetuta (tab rimasta aperta, due Admin in contemporanea) non sovrascrive più silenziosamente motivo/nota/data della rimozione originale (Blind Hunter).
- 2026-09-24 (review): validazione server-side della lunghezza di `nota` (troncata a 500 caratteri) — il `maxLength={500}` di `RimuoviAtletaForm.tsx` era solo lato client (Blind Hunter + Edge Case Hunter, convergenti).
- 2026-09-24 (review): `RimuoviAtletaForm.tsx` ristrutturato (pannello interno `Pannello`, `key` incrementale sulla riapertura) — "Annulla" ora azzera davvero lo state di un tentativo fallito precedente, che prima ricompariva subito alla riapertura (Blind Hunter).
- 2026-09-24 (review): tipo condiviso `MotivoRimozioneAtleta` (`lib/db-rls/atleta.ts`) al posto di union inline duplicate; `MOTIVI_RIMOZIONE_ATLETA` come unica fonte dei valori validi (sostituisce `MOTIVI_RIMOZIONE_VALIDI` locale in `actions.ts`); `RimuoviAtletaForm.tsx` deriva le etichette da un `Record<MotivoRimozioneAtleta, string>` esaustivo a livello di tipo (Blind Hunter).
- 2026-09-24 (review): `caricaCertificato` (`certificato-medico/actions.ts`) ora risolve l'Atleta con `includiRimosse: true` e salta esplicitamente l'invio dell'email alla Segreteria se risulta rimossa — stesso bug già corretto nel cron, non coperto dal Code Map originale di questa spec (Verification Gap Reviewer).
- 2026-09-24 (review): `@@index([rimossaIl])` aggiunto alla stessa migrazione — nuovo filtro di default su quasi ogni lettura di `atlete` (Blind Hunter).
- 2026-09-24 (review): `<h2>Atlete rimosse</h2>` aggiunto alla sezione a scomparsa — il CSS `.sezioneRimosse h2` esisteva già ma non veniva mai renderizzato (Blind Hunter).
- 2026-09-24 (review): guida in-app aggiornata anche per `/app/import-atlete`, `/app/certificato-medico`, `/app/dati-fisici` — mancavano, solo `/app/conferma-iscrizioni` era stata aggiornata nell'implementazione iniziale (Blind Hunter).
- 2026-09-24 (review): 4 findings non risolti, loggati in `deferred-work.md` — caso "figlie miste attive/rimosse" in `certificato-medico`, messaggio generico riusato in `dati-fisici` (Allenatore), `rimosseRiconosciute` solo conteggio aggregato senza dettaglio per riga, race teorica sull'import (probabilità pressoché nulla).

## Design Notes

**Perché `{ includiRimosse }` su `elencaAtlete` e non una funzione separata `elencaAtleteRimosse`:** un solo punto di lettura resta la singola fonte di verità del filtro (stesso principio già enunciato in epics.md) — una funzione gemella duplicherebbe la query e rischierebbe di disallinearsi (es. un nuovo campo selezionato in una ma non nell'altra). Il parametro booleano è già un pattern noto nel progetto (opzioni `{ permettiStagionePassata }` di `risolviAutorizzazioneGruppo`).

**Perché la scoperta sul cron e sul rollover non era ovvia dalla sola lettura della story:** entrambe richiedevano di seguire la logica riga per riga oltre il punto di lettura `elencaAtlete` stesso (il cron itera `elencaCertificati`, non `elencaAtlete`; il rollover ha una logica propria di "chi riportare" che potrebbe non passare mai da un controllo esplicito su `rimossaIl` se ci si fida solo del filtro a monte) — per questo sono Boundaries esplicite, non assunzioni.

## Suggested Review Order

1. `prisma/schema.prisma` + `prisma/migrations/20260924010000_add_rimozione_atleta/migration.sql` — nuovi campi/enum/indice su `Atleta`, punto di partenza per capire il resto.
2. `lib/db-rls/atleta.ts` — `{ includiRimosse }`, `segnaAtletaRimossa`/`annullaRimozioneAtleta` (con la guardia di idempotenza), tipo condiviso `MotivoRimozioneAtleta`.
3. `lib/db-rls/iscrizione.ts` — nuova `disattivaIscrizioneAttivaPerAtleta` (lookup server-side, sostituisce l'`iscrizioneId` passato dal client).
4. `app/app/(iscrizioni)/conferma-iscrizioni/actions.ts` — `rimuoviAtleta`/`ripristinaAtleta`, ordine disattiva-poi-segna-rimossa, troncamento nota.
5. `app/app/(iscrizioni)/conferma-iscrizioni/RimuoviAtletaForm.tsx` + `RipristinaAtletaForm.tsx` + `IscrizioneRow.tsx` + `IscrizioniElenco.tsx` — UI, conferma a due passaggi, sezione a scomparsa.
6. `app/app/(onboarding-import)/import-atlete/actions.ts` — terzo ramo (Atleta rimossa riconosciuta), rollover invariato (già protetto).
7. `app/api/cron/promemoria-certificati/route.ts` + `app/app/(certificati-medici)/certificato-medico/actions.ts` — i due skip espliciti (cron e upload) sullo stesso bug.
8. `app/app/(certificati-medici)/certificato-medico/page.tsx` + `app/app/(dati-atleta)/dati-fisici/page.tsx` — messaggio esplicito per Atleta rimossa (con i due gap dichiarati in `deferred-work.md`).
9. `lib/guida/contenuti.ts` — le 4 voci di guida toccate.
10. File di test (`*.test.ts`) — a supporto della lettura dei punti sopra, non da rivedere isolatamente.

## Verification

**Commands:**
- `npx prisma validate` -- expected: schema valido
- `npx vitest run` -- expected: tutti i test passano, inclusi quelli nuovi
- `npx tsc --noEmit` -- expected: nessun errore
- `npx eslint <file toccati>` -- expected: nessun errore

**Manual checks (dopo il deploy, dev locale non disponibile su questa macchina):**
- Rimuovere un'Atleta di prova, verificare che sparisca da tutte le pagine elencate in AC #3/#4 e che lo storico presenze resti visibile
- Ripristinarla, verificare che ricompaia come "non iscritta"
- Provare un import Excel con il codice fiscale di un'Atleta rimossa, verificare il riepilogo
