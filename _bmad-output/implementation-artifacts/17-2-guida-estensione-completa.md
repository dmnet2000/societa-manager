---
baseline_commit: 9a5319d4456e7ce3fcbb1760b66aefb0e6cb203f
---

# Story 17.2: Estensione della guida a tutte le pagine rimanenti

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Utente autenticato con un qualunque Ruolo,
I want trovare un contenuto guida e un aiuto contestuale su ogni pagina dell'app a cui ho accesso, non solo su `/sponsor` e `/palestre`,
so that possa capire come usare qualunque funzione dell'app senza dover chiedere aiuto a qualcun altro.

## Acceptance Criteria

1. **Given** un Utente autenticato **When** visita una qualunque delle 29 pagine coperte da questa storia **Then** vede l'icona "?" vicino al titolo, con un contenuto guida pertinente a quella specifica funzione.
2. **And** ciascuna delle 29 nuove voci ha lo stesso `ruoliAmmessi` della rotta corrispondente in `PROTECTED_ROUTES` (verificato dal test di coerenza già introdotto in Story 17.1, che scala automaticamente a ogni nuova voce).
3. **And** l'indice di `/guida` mostra automaticamente tutte le nuove voci per i Ruoli pertinenti, senza modifiche alla pagina `/guida` stessa (già generica, Story 17.1).
4. **And** nessuna pagina che oggi non legge `ruoli`/`user` deve rompersi se quella lettura fallisce (stesso principio fail-soft già stabilito per `/palestre` in Story 17.1 review).
5. **And** nessuna nuova migrazione, nessuna nuova Server Action — stesso principio read-only di Story 17.1.

## Tasks / Subtasks

- [x] Task 1: Refactor `TitoloPagina` condiviso (AC: #1)
  - [x] `app/AiutoContestuale.tsx`: nuovo componente esportato `TitoloPagina({ titolo, contenuto })` che rende `<div className={styles.intestazionePagina}><h1>{titolo}</h1><AiutoContestuale contenuto={contenuto} /></div>` — evita di duplicare la regola CSS `.intestazionePagina` in 29 CSS module diversi (era già successo due volte in Story 17.1, `sponsor.module.css`/`palestre.module.css`).
  - [x] `app/(sponsor)/sponsor/page.tsx` e `app/(orari-palestre)/palestre/page.tsx` aggiornate per usare `<TitoloPagina>` invece del wrapper manuale — rimuove `.intestazionePagina` da `sponsor.module.css`/`palestre.module.css` (ora vive solo in `aiuto-contestuale.module.css`).
  - [x] Nuovo helper `lib/guida/risolvi-ruoli-pagina.ts` (`risolviRuoliPerAiutoContestuale()`) per le pagine che non leggono già `ruoli`/`user` — factorizza il pattern fail-soft try/catch invece di ripeterlo in ogni page.tsx.
- [x] Task 2: Contenuto guida per le 29 rotte rimanenti (AC: #1, #2)
  - [x] `lib/guida/contenuti.ts`: una voce per ciascuna rotta elencata nelle Dev Notes, `ruoliAmmessi` copiato esattamente da `PROTECTED_ROUTES` per quella rotta, `corpo` scritto in italiano, sintetico, orientato all'utente finale (cosa fa la pagina, non come è costruita) — ogni pagina reale letta prima di scrivere il contenuto.
- [x] Task 3: Applicazione di `TitoloPagina` alle 29 pagine (AC: #1, #4)
  - [x] Per ciascuna delle 29 pagine: sostituito `<h1>Titolo</h1>` con `<TitoloPagina titolo="Titolo" contenuto={contenutoPerRotta("/rotta", ruoli)} />`. Dove la pagina già leggeva `ruoli`/`user` per la propria logica, riusato (nessuna chiamata `getUser()` duplicata: /conferma-iscrizioni, /conferma-certificati, /i-miei-gruppi, /mio-orario, /presenze, /storico-presenze, /certificato-medico, /dati-fisici, /vista-allenatore, /il-mio-profilo, /campionati, /partite). Dove non lo faceva, aggiunto `risolviRuoliPerAiutoContestuale()` (/import-atlete, /conferma-tesseramenti, /orari, /slot, /gruppi, /notifiche, /impostazioni, /smtp, /logo, /vista-dirigente, /wizard-nuova-stagione, /admin, /precaricamento-allenatori, /permessi-accesso, /permessi-certificati). `/import-atlete` convertita da Client a Server Component (era l'unica eccezione nel progetto): logica form estratta in `ImportAtleteForm.tsx`.
- [x] Task 4: Test (AC: #2, #3)
  - [x] Nessun nuovo test per-voce necessario: il test di coerenza `CONTENUTI_GUIDA` vs `PROTECTED_ROUTES` già scritto in Story 17.1 (`lib/guida/contenuti.test.ts`) valida automaticamente ogni nuova voce aggiunta — passa con tutte le 29 voci totali (2 già coperte in Story 17.1 + 27 nuove qui; il numero "29" nel titolo/AC di questa storia si riferisce alle rotte protette rimanenti da coprire, elencate per l'appunto in 27 righe nella tabella Dev Notes, non a un totale di 29 nuove voci).
  - [x] `npx vitest run` (1061 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, solo warning preesistenti non correlati), `npm run build` (completata; gli errori "Dynamic server usage"/WASM engine mostrati in console sono quirk noti dell'ambiente di build locale, già documentati per il deploy di produzione — non bloccano l'output, tutte le 29 rotte compaiono nella tabella finale come dinamiche).
  - [x] Nessun test diretto sulle 29 `page.tsx` modificate — coerente con la convenzione già stabilita (Story 16.x/17.1).
  - [x] Fix di lint non correlato: apostrofo non escapato (`react/no-unescaped-entities`) in `wizard-nuova-stagione/page.tsx` riga preesistente, adiacente a una riga toccata da questa storia — corretto in `&apos;` per riportare `npm run lint` a zero errori.

### Review Findings

- [x] [Review][Patch] `risolviRuoliPerAiutoContestuale()` eseguito in await sequenziale invece che in `Promise.all` su ~12 pagine (Blind Hunter) [app/(amministrazione)/admin/page.tsx e altre 11] — Risolto: l'utente ha scelto di applicare subito il fix su tutte e 12 le pagine (`/admin`, `/gruppi`, `/orari`, `/slot`, `/wizard-nuova-stagione`, `/precaricamento-allenatori`, `/notifiche`, `/impostazioni`, `/smtp`, `/logo`, `/vista-dirigente`, `/permessi-accesso`, `/permessi-certificati`). Ogni chiamata a `risolviRuoliPerAiutoContestuale()` è ora raggruppata in `Promise.all` con le altre letture indipendenti della stessa pagina (dove una lettura dipendeva da un'altra, es. `/smtp` — `leggiConfigurazioneSmtp(supabase)` — o `/impostazioni` con il fail-soft `.catch()` su `leggiEmailSegreteria()`, la catena interna resta sequenziale ma è comunque eseguita in parallelo con `ruoli`). `tsc`/`vitest`/`lint` puliti dopo il fix.
- [x] [Review][Defer] `/precaricamento-allenatori` con `permessiConfigurabili: true` non mostra l'icona "?" a un Ruolo non-ADMIN a cui è stato concesso l'accesso dinamicamente via `/permessi-accesso` [lib/guida/contenuti.ts, lib/auth/route-guard.ts:262] — deferred, pre-existing. `contenutoPerRotta` filtra sul solo `ruoliAmmessi` statico (`["ADMIN"]`), non su `rottaAbilitataPerRuolo`/permessi dinamici — gap architetturale già esplicitamente riconosciuto come fuori scope nel commento del test di coerenza di Story 17.1 ("fuori scope per una storia pilota su 2 rotte"). Questa storia lo rende concretamente raggiungibile scegliendo di coprire proprio questa rotta, ma risolverlo richiede di far leggere a `contenutoPerRotta` la stessa logica dinamica di `route-decision.ts`, una modifica architetturale più ampia del solo contenuto guida.
- [x] [Review][Defer] `/orari` e `/slot` condividono lo stesso `<h1>Orari</h1>` in pagina pur avendo contenuti guida disambiguati ("vista per Palestra/Gruppo" vs "gestione Slot") [app/(orari-palestre)/orari/page.tsx, app/(orari-palestre)/slot/page.tsx] — deferred, pre-existing. La sovrapposizione di naming risale alla Story 15.5 (navLabel "Orari" condiviso, decisione già accettata dall'utente all'epoca), non introdotta da questa storia.
- [x] [Review][Defer] Chiamata ridondante a Supabase Auth rispetto a `middleware.ts` (Blind Hunter) — deferred, architetturale. `middleware.ts` calcola già `ruoli` per ogni richiesta per la decisione di autorizzazione; propagarlo alle pagine (es. via header, mirror del pattern `x-pathname` già in uso) eviterebbe la seconda chiamata introdotta da `risolviRuoliPerAiutoContestuale()`. Ottimizzazione reale ma di portata maggiore di questa storia (richiede toccare `middleware.ts`).
- [x] [Review][Dismiss] Redesign del pulsante "?" in `aiuto-contestuale.module.css` (border-radius/background) non menzionato nel File List di questa storia — handled elsewhere. Il cambio è stato applicato in questa stessa sessione ma appartiene al Change Log post-review di Story 17.1 (fix segnalato dall'utente dal vivo), non a questa storia; documentato lì, non un'omissione di 17.2.
- [x] [Review][Dismiss] Nessun test end-to-end sulle pagine che ora dipendono da `risolviRuoliPerAiutoContestuale()`/dalla conversione Client→Server di `/import-atlete` — convenzione già accettata. Coerente con la convenzione esplicita già stabilita nel progetto (Story 16.x/17.1): nessun test diretto sui `page.tsx`, la logica di business (Server Action di `/import-atlete`) resta invariata e già coperta.
- [x] [Review][Dismiss] L'accuratezza del testo dei 27 nuovi contenuti guida è verificata solo dal test di coerenza `ruoliAmmessi`, non dal contenuto prosa (Acceptance Auditor) — limite pre-esistente di tutto il sistema guida (Story 17.1), non specifico di questa storia.

## Dev Notes

### Rotte da coprire (29, mirror esatto di `ruoliAmmessi` da `lib/auth/route-guard.ts`)

| Rotta | File pagina | ruoliAmmessi |
|---|---|---|
| `/import-atlete` | `app/(onboarding-import)/import-atlete/page.tsx` | ADMIN, DIRIGENTE |
| `/conferma-iscrizioni` | `app/(iscrizioni)/conferma-iscrizioni/page.tsx` | ADMIN, DIRIGENTE, SEGRETERIA |
| `/conferma-certificati` | `app/(certificati-medici)/conferma-certificati/page.tsx` | ADMIN, DIRIGENTE, SEGRETERIA |
| `/conferma-tesseramenti` | `app/(iscrizioni)/conferma-tesseramenti/page.tsx` | ADMIN, DIRIGENTE |
| `/orari` | `app/(orari-palestre)/orari/page.tsx` | SEGRETERIA |
| `/slot` | `app/(orari-palestre)/slot/page.tsx` | ADMIN, DIRIGENTE |
| `/gruppi` | `app/(gruppi-allenatori)/gruppi/page.tsx` | ADMIN, DIRIGENTE |
| `/i-miei-gruppi` | `app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` | ALLENATORE |
| `/mio-orario` | `app/(orari-palestre)/mio-orario/page.tsx` | ALLENATORE, ATLETA |
| `/presenze` | `app/(presenze)/presenze/page.tsx` | ALLENATORE |
| `/storico-presenze` | `app/(presenze)/storico-presenze/page.tsx` | ALLENATORE, ATLETA |
| `/certificato-medico` | `app/(certificati-medici)/certificato-medico/page.tsx` | GENITORE, ATLETA |
| `/notifiche` | `app/(certificati-medici)/notifiche/page.tsx` | ALLENATORE, DIRIGENTE |
| `/impostazioni` | `app/(configurazione)/impostazioni/page.tsx` | ADMIN |
| `/smtp` | `app/(configurazione)/smtp/page.tsx` | ADMIN |
| `/logo` | `app/(configurazione)/logo/page.tsx` | ADMIN |
| `/vista-dirigente` | `app/(amministrazione)/vista-dirigente/page.tsx` | DIRIGENTE |
| `/vista-allenatore` | `app/(gruppi-allenatori)/vista-allenatore/page.tsx` | ALLENATORE |
| `/dati-fisici` | `app/(dati-atleta)/dati-fisici/page.tsx` | ALLENATORE, ATLETA |
| `/wizard-nuova-stagione` | `app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx` | ADMIN, DIRIGENTE |
| `/il-mio-profilo` | `app/il-mio-profilo/page.tsx` | ALLENATORE, ATLETA |
| `/campionati` | `app/(partite-campionati)/campionati/page.tsx` | ADMIN, DIRIGENTE, ALLENATORE |
| `/partite` | `app/(partite-campionati)/partite/page.tsx` | ADMIN, DIRIGENTE, ALLENATORE, ATLETA, GENITORE |
| `/admin` | `app/(amministrazione)/admin/page.tsx` | ADMIN |
| `/precaricamento-allenatori` | `app/(onboarding-import)/precaricamento-allenatori/page.tsx` | ADMIN (nota: `permessiConfigurabili: true` in route-guard — usare comunque `ruoliAmmessi` scritto lì come fallback storico, stesso principio già chiarito nel commento di quella riga) |
| `/permessi-accesso` | `app/(amministrazione)/permessi-accesso/page.tsx` | ADMIN |
| `/permessi-certificati` | `app/(amministrazione)/permessi-certificati/page.tsx` | ADMIN |

`/sponsor` e `/palestre` già coperte (Story 17.1). `/guida` esplicitamente esclusa (non ha senso una voce guida su se stessa).

### Pattern da riusare (non reinventare)

- **Fail-soft su `getUser()` per pagine che oggi non lo leggono**: mirror esatto del fix applicato a `/palestre` in code review di Story 17.1 (try/catch, `ruoli` di default `[]` se la chiamata fallisce — l'icona "?" semplicemente non compare, il resto della pagina resta intatto).
- **Contenuto scritto leggendo la pagina reale**: stesso principio di Story 17.1 — non indovinare il contenuto guida dal solo `navLabel`, leggere il `page.tsx` (e gli eventuali form/azioni collegati) per capire cosa fa davvero la funzione prima di scriverne la spiegazione.

### Riferimenti

- [Source: app/AiutoContestuale.tsx, app/aiuto-contestuale.module.css] — componente e stile da questa storia estesi con `TitoloPagina`.
- [Source: lib/guida/contenuti.ts, lib/guida/contenuti.test.ts] — modello dati e test di coerenza, Story 17.1.
- [Source: lib/auth/route-guard.ts] — `PROTECTED_ROUTES`, fonte di verità per `ruoliAmmessi` di ogni nuova voce.
- [Source: _bmad-output/implementation-artifacts/17-1-guida-infrastruttura-e-pilota.md] — story precedente, incluse le correzioni di code review (click-esterno/Escape, `role`/`aria-controls`, fail-soft) da NON reintrodurre come nuovi bug nelle 29 pagine aggiunte qui.

### Project Structure Notes

- Modificato: `app/AiutoContestuale.tsx`, `app/aiuto-contestuale.module.css` (nuovo componente `TitoloPagina`).
- Modificato: `lib/guida/contenuti.ts` (29 nuove voci).
- Modificate: le 29 `page.tsx` elencate sopra + `app/(sponsor)/sponsor/page.tsx`/`sponsor.module.css` + `app/(orari-palestre)/palestre/page.tsx`/`palestre.module.css` (refactor a `TitoloPagina`).
- Nessuna nuova migrazione, nessuna modifica a `prisma/schema.prisma`.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno (nessun blocco tecnico riscontrato).

### Completion Notes List

- `TitoloPagina` estratto come componente condiviso; sponsor/palestre (Story 17.1) migrate allo stesso wrapper, `.intestazionePagina` ora vive una sola volta in `aiuto-contestuale.module.css`.
- Nuovo helper `risolviRuoliPerAiutoContestuale()` per le pagine senza lettura `ruoli` propria — stesso pattern fail-soft già validato in Story 17.1 review, ora centralizzato.
- `/import-atlete` era l'unica pagina del progetto interamente Client Component: convertita a Server Component wrapper + `ImportAtleteForm.tsx` per poter leggere `ruoli` lato server, senza introdurre codice server-only in un contesto client.
- Le pagine con più `return` (early-return per "account non collegato", es. `/storico-presenze`, `/certificato-medico`, `/i-miei-gruppi`, `/mio-orario`, `/dati-fisici`, `/vista-dirigente`, `/vista-allenatore`, `/wizard-nuova-stagione`, `/permessi-certificati`, `/campionati`, `/partite`) hanno `TitoloPagina` applicato a OGNI ramo di rendering, non solo al ramo principale — altrimenti l'icona "?" sarebbe mancata nel caso più comune per un nuovo Utente non ancora agganciato.
- Contenuti guida scritti leggendo il codice reale di ciascuna pagina (mai dedotti dal solo `navLabel`), in coerenza con la Dev Note di questa storia e con la regola permanente già salvata in memoria: la guida va aggiornata a ogni story futura che tocca una pagina già documentata.
- Fix di lint non correlato incluso in questa storia (vedi Task 4): apostrofo non escapato preesistente in `wizard-nuova-stagione/page.tsx`.
- Tutte e 29 le voci passano il test di coerenza generico introdotto in Story 17.1 (`contenuti.test.ts`), nessun nuovo test scritto — comportamento atteso, non un'omissione.

### File List

- `app/AiutoContestuale.tsx` (modificato — nuovo `TitoloPagina`)
- `app/aiuto-contestuale.module.css` (modificato — `.intestazionePagina` centralizzata)
- `lib/guida/contenuti.ts` (modificato — 29 nuove voci)
- `lib/guida/risolvi-ruoli-pagina.ts` (nuovo)
- `lib/guida/risolvi-ruoli-pagina.test.ts` (nuovo)
- `app/(sponsor)/sponsor/page.tsx`, `app/(sponsor)/sponsor/sponsor.module.css` (modificati — refactor a `TitoloPagina`)
- `app/(orari-palestre)/palestre/page.tsx`, `app/(orari-palestre)/palestre/palestre.module.css` (modificati — refactor a `TitoloPagina`)
- `app/(onboarding-import)/import-atlete/page.tsx` (modificato — conversione a Server Component)
- `app/(onboarding-import)/import-atlete/ImportAtleteForm.tsx` (nuovo — logica client estratta)
- `app/(iscrizioni)/conferma-iscrizioni/page.tsx` (modificato)
- `app/(certificati-medici)/conferma-certificati/page.tsx` (modificato)
- `app/(iscrizioni)/conferma-tesseramenti/page.tsx` (modificato)
- `app/(orari-palestre)/orari/page.tsx` (modificato)
- `app/(orari-palestre)/slot/page.tsx` (modificato)
- `app/(gruppi-allenatori)/gruppi/page.tsx` (modificato)
- `app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` (modificato)
- `app/(orari-palestre)/mio-orario/page.tsx` (modificato)
- `app/(presenze)/presenze/page.tsx` (modificato)
- `app/(presenze)/storico-presenze/page.tsx` (modificato)
- `app/(certificati-medici)/certificato-medico/page.tsx` (modificato)
- `app/(certificati-medici)/notifiche/page.tsx` (modificato)
- `app/(configurazione)/impostazioni/page.tsx` (modificato)
- `app/(configurazione)/smtp/page.tsx` (modificato)
- `app/(configurazione)/logo/page.tsx` (modificato)
- `app/(amministrazione)/vista-dirigente/page.tsx` (modificato)
- `app/(gruppi-allenatori)/vista-allenatore/page.tsx` (modificato)
- `app/(dati-atleta)/dati-fisici/page.tsx` (modificato)
- `app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx` (modificato)
- `app/il-mio-profilo/page.tsx` (modificato)
- `app/(partite-campionati)/campionati/page.tsx` (modificato)
- `app/(partite-campionati)/partite/page.tsx` (modificato)
- `app/(amministrazione)/admin/page.tsx` (modificato)
- `app/(onboarding-import)/precaricamento-allenatori/page.tsx` (modificato)
- `app/(amministrazione)/permessi-accesso/page.tsx` (modificato)
- `app/(amministrazione)/permessi-certificati/page.tsx` (modificato)

## Change Log

- 2026-08-10: File di story creato, stato ready-for-dev.
- 2026-08-10: Implementazione completata — `TitoloPagina` condiviso, 27 nuovi contenuti guida, wiring su tutte le pagine rimanenti dell'app. `tsc`/`vitest`/`lint`/`build` puliti. Stato → review.
- 2026-08-10: Code review adversariale completata (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo). 3 bug reali trovati indipendentemente da più layer — icona "?" mancante nel ramo di rendering principale (il caso comune) di `/campionati`, `/il-mio-profilo`, `/permessi-certificati` — corretti, più: indentazione malformata in `vista-allenatore`, `export const dynamic` mancante su `/import-atlete`, conteggio "31 voci totali" errato nel report (sono 29: 2 di Story 17.1 + 27 nuove). 1 decision-needed risolto con l'utente: `risolviRuoliPerAiutoContestuale()` in await sequenziale invece di `Promise.all` su 12 pagine — l'utente ha scelto di applicare il fix subito, ora parallelizzato ovunque. 3 deferred (gap `/precaricamento-allenatori` + `permessiConfigurabili`, naming condiviso `/orari`+`/slot` risalente a Story 15.5, chiamata Auth ridondante rispetto a `middleware.ts`), 3 dismessi come rumore/convenzioni già accettate. 1061/1061 test Vitest passati, 0 errori tsc/eslint. Stato → done.
