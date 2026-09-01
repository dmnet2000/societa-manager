---
title: "Story 9.41: Precaricamento email per Segreteria e Dirigente (blocco registrazione)"
type: 'feature'
created: '2026-08-31'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '28195f72208ccd2ea9d4afb25122a89cf168470d'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** oggi chiunque può auto-registrarsi con Ruolo Segreteria e/o Dirigente (`app/(onboarding-import)/registrati/actions.ts`); l'unico freno è un gate "a posteriori" (`RUOLI_CON_AGGANCIO_CF`, `ruoloSensibile`) che crea comunque l'account (`attivo:false`) e aspetta che un Admin lo attivi manualmente da `/app/admin` - nessun controllo preventivo, a differenza del precaricamento Allenatore (CF, Story 1.4).

**Approach:** nuovo modello `PrecaricamentoRuolo` (email + Ruolo, mirror strutturale di `UtenteRuolo`, non di `Allenatore`: una riga per combinazione, non un array). Un Admin precarica un'email con Segreteria e/o Dirigente da una nuova pagina (mirror `/app/precaricamento-allenatori`). Una registrazione che include Segreteria e/o Dirigente è **rifiutata** se l'email non è precaricata per (tutti) quei Ruoli - controllo PRIMA della creazione dell'utente Supabase Auth. Chi supera il controllo parte `attivo:true` subito: per questi due Ruoli, il precaricamento sostituisce il gate "Ruoli sensibili" esistente, che resta invariato solo per Admin/Site Manager.

## Boundaries & Constraints

**Always:** il controllo di precaricamento per Segreteria/Dirigente avviene PRIMA di `admin.auth.admin.generateLink` (stesso ordine già seguito per il CF obbligatorio di Genitore/Atleta) - mai un account Supabase Auth creato per una registrazione poi rifiutata. Email sempre normalizzata (trim + minuscolo) sia in scrittura (precaricamento) sia in lettura (matching) - un'unica funzione condivisa fa la normalizzazione, mai reimplementata in più punti. Una "voce" precaricata è per email: se un'email ha più righe (una per Ruolo), la voce si considera agganciata (bloccata da modifica/cancellazione) se ALMENO UNA delle sue righe ha `utenteId` valorizzato - l'intera voce si blocca insieme, mai un blocco per singolo Ruolo. Il claim (valorizzazione di `utenteId`) avviene solo nel ramo "prima creazione" (`if (!utenteEsistente)`), mai su un reinvio - stessa posizione del claim Allenatore esistente, nessun rischio di doppio claim su un retry.

**Ask First:** nessuna - risolto con l'utente (`AskUserQuestion`, 2026-08-31): blocco rigido (non solo sblocco automatico); meccanismo unico condiviso Segreteria+Dirigente (non due elenchi separati).

**Never:** nessuna modifica al precaricamento Allenatore via Codice Fiscale (Story 1.4 e successive) né al gate "Ruoli sensibili" per Admin/Site Manager (self-registrazione + attivazione manuale Admin, invariato). Nessuna modifica alla registrazione Atleta/Genitore (CF obbligatorio, invariata). L'email della voce precaricata NON è modificabile una volta creata (solo i Ruoli lo sono) - per correggere un'email sbagliata si cancella (se non ancora agganciata) e si ricrea, coerente con la bassa frequenza d'uso attesa; scelta deliberata più stretta della bozza `epics.md`, per evitare la complessità di un rename atomico su una chiave composta senza alcun requisito esplicito a supportarlo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Precaricamento nuova email con Segreteria+Dirigente | form Admin valido | 2 righe `PrecaricamentoRuolo` create (stessa email, un Ruolo ciascuna), nessuna agganciata | N/A |
| Precaricamento di un'email già precaricata per lo stesso Ruolo | duplicato su (email, ruolo) | rifiutato | `VALIDATION` |
| Registrazione con Segreteria, email mai precaricata | 0 righe trovate per quel Ruolo | rifiutata PRIMA di `generateLink`, nessun account creato | `VALIDATION`, nomina il Ruolo |
| Registrazione con Segreteria+Dirigente, email precaricata solo per Segreteria | manca la riga Dirigente | rifiutata (tutti i Ruoli bloccati richiesti devono avere una riga) | `VALIDATION`, nomina il Ruolo mancante |
| Registrazione con Segreteria, email precaricata per quel Ruolo | riga trovata | procede, Utente creato `attivo:true`, riga agganciata (`utenteId` impostato) | N/A |
| Registrazione con Segreteria+Allenatore, email precaricata solo per Segreteria | Allenatore non richiede precaricamento | procede come sopra (il controllo riguarda solo i Ruoli bloccati presenti nella richiesta) | N/A |
| Registrazione con Segreteria+Admin, email precaricata per Segreteria, 0 Admin attivi | bootstrap Admin | `attivo:true` per l'eccezione bootstrap (invariato, non per il precaricamento) | N/A |
| Reinvio email di conferma (stesso `email`, Utente Prisma già esistente) | `utenteEsistente` truthy | il controllo di precaricamento viene rieseguito (righe esistono già, sempre superato) ma il claim NON viene rieseguito (fuori dal ramo `if (!utenteEsistente)`) | N/A |
| Modifica/cancellazione di una voce con almeno un Ruolo agganciato | `utenteId` valorizzato su una riga | rifiutata | `VALIDATION` |
| Modifica dei Ruoli di una voce non agganciata (es. toglie Dirigente, aggiunge nulla) | nessun Ruolo agganciato | righe ricreate per il nuovo insieme di Ruoli (almeno uno) | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- nuovo model `PrecaricamentoRuolo` (`id`, `email String`, `ruolo Ruolo`, `utenteId String?` **mai `@unique`** - a differenza di `Allenatore.utenteId`, un Utente può agganciare più righe, una per Ruolo -, `utente Utente? @relation(fields:[utenteId], references:[id], onDelete: SetNull)`, `createdAt`, `@@unique([email, ruolo])`, `@@map("precaricamento_ruoli")`) - mirror strutturale di `UtenteRuolo` (riga ~54), non di `Allenatore`. `Utente` (riga ~39) guadagna la relazione inversa `precaricamentiRuolo PrecaricamentoRuolo[]` (lista, non `?`).
- **Nuova migrazione** `prisma/migrations/20260831000000_add_precaricamento_ruolo/migration.sql` -- `CREATE TABLE "precaricamento_ruoli"` + `CREATE UNIQUE INDEX ..._email_ruolo_key` + FK `utenteId` verso `utenti(id)` `ON DELETE SET NULL ON UPDATE CASCADE` (mirror esatto `20260716100000_allenatore_utente_fk/migration.sql`) + `ENABLE ROW LEVEL SECURITY` + `REVOKE ALL ... FROM anon, authenticated` nella STESSA migrazione di creazione (a differenza della prima migrazione Allenatore, storica, corretta solo dopo - qui va giusto da subito, come da convenzione corrente).
- **Nuovo modulo** `lib/matching-email-ruolo/normalizza-email-ruolo.ts` -- `export function normalizzaEmailRuolo(email: string): string { return email.trim().toLowerCase(); }` - unica fonte di normalizzazione, riusata da tutti i punti sotto (mirror del principio "un modulo di matching condiviso", AD-5, applicato oggi a `lib/matching-codice-fiscale/`).
- **Nuovo modulo** `lib/matching-email-ruolo/trova-precaricamento-ruolo.ts` -- `export async function trovaPrecaricamentoRuolo(email: string, ruolo: Ruolo)`: normalizza con `normalizzaEmailRuolo`, poi `prisma.precaricamentoRuolo.findUnique({ where: { email_ruolo: { email: normalizzata, ruolo } } })` (mirror esatto di `trova-allenatore-per-codice-fiscale.ts`, stesso `import "server-only"`).
- **Nuovo modulo** `lib/matching-email-ruolo/index.ts` -- barrel: esporta `normalizzaEmailRuolo`, `trovaPrecaricamentoRuolo`.
- `app/(onboarding-import)/registrati/actions.ts` -- nuova costante `RUOLI_BLOCCATI_SENZA_PRECARICAMENTO: Ruolo[] = ["SEGRETERIA", "DIRIGENTE"]` (accanto a `RUOLI_CON_AGGANCIO_CF`, riga 25). Nuovo blocco di controllo, inserito subito dopo il blocco ATLETA (dopo riga 206, PRIMA del commento "Story 11.4: generateLink" riga 208): per ogni Ruolo di `ruoli` presente in `RUOLI_BLOCCATI_SENZA_PRECARICAMENTO`, chiama `trovaPrecaricamentoRuolo(email, ruolo)`; se manca anche un solo Ruolo, ritorna `VALIDATION` con messaggio che nomina il/i Ruolo/i mancanti (usa `ETICHETTA_RUOLO`, già definita riga 32) - PRIMA di `generateLink`. `ruoloSensibile` (riga 302) diventa `ruoli.some((r) => !RUOLI_CON_AGGANCIO_CF.includes(r) && !RUOLI_BLOCCATI_SENZA_PRECARICAMENTO.includes(r))` (Admin/Site Manager restano sensibili, Segreteria/Dirigente no). Dentro `if (!utenteEsistente) { try { ... } }` (riga 291), accanto al blocco di aggancio Allenatore (righe 360-370), nuovo blocco: per ogni Ruolo bloccato presente in `ruoli`, `prisma.precaricamentoRuolo.updateMany({ where: { email: normalizzaEmailRuolo(email), ruolo, utenteId: null }, data: { utenteId: utente.id } })` (guardia `utenteId: null` puramente difensiva, no-op se già agganciata - non può succedere per costruzione, vedi Design Notes).
- **Nuova cartella** `app/app/(onboarding-import)/precaricamento-ruoli/` -- mirror strutturale di `precaricamento-allenatori/`:
  - `page.tsx` -- Server Component, `dynamic = "force-dynamic"`, `prisma.precaricamentoRuolo.findMany({ orderBy: [{ email: "asc" }, { ruolo: "asc" }] })`, raggruppa per `email` in un array `{ email, ruoli: Ruolo[], utenteId: string | null }[]` (un Utente qualunque tra le righe, tutte condividono lo stesso `utenteId` o sono tutte `null` per costruzione - vedi Design Notes) PRIMA di passarlo a `PrecaricamentoRuoloRow`; mirror di `precaricamento-allenatori/page.tsx` per struttura/`TitoloPagina`/`contenutoPerRotta`.
  - `NuovoPrecaricamentoRuoloForm.tsx` -- client, `useActionState(precaricaRuolo, undefined)`, campi: email (`type=email`, required) + 2 checkbox (Segreteria, Dirigente - `RUOLI_BLOCCATI_SENZA_PRECARICAMENTO`, etichette italiane), almeno una richiesta (validata server-side).
  - `PrecaricamentoRuoloRow.tsx` -- client, mirror `AllenatoreRow.tsx` (toggle sola-lettura/modifica, `IconaModifica`/`IconaCancella`, `window.confirm` su cancella); mostra email, Ruoli (etichette separate da virgola), stato "Registrata"/"Precaricata" (`utenteId` valorizzato su una qualunque riga del gruppo).
  - `actions.ts` -- `precaricaRuolo` (crea N righe, una per Ruolo selezionato, rifiuta se una qualunque combinazione (email,ruolo) esiste già - usa `trovaPrecaricamentoRuolo`), `aggiornaPrecaricamentoRuolo` (input: `emailOriginale` hidden + nuovi Ruoli selezionati; rifiuta se una riga di `emailOriginale` è già agganciata; altrimenti `prisma.$transaction([deleteMany({where:{email:emailOriginale}}), createMany({data: nuoviRuoli.map(...)})])` - mirror pattern `prisma.$transaction` già in uso, es. `app/app/(amministrazione)/admin/actions.ts`), `cancellaPrecaricamentoRuolo` (`findMany` per email, rifiuta se una riga è agganciata, altrimenti `deleteMany({where:{email}})` - stesso accepted-risk check-then-act già presente altrove nel progetto per pannelli Admin a bassa concorrenza). Tutte e tre `requireRuolo(["ADMIN"])` (hardcoded, mirror del trattamento ORIGINALE di `/precaricamento-allenatori` pre-Epic 12, Story 9.22 - nessun bisogno di `permessiConfigurabili` per una rotta nuova, YAGNI).
- `lib/auth/route-guard.ts` -- nuova voce in `PROTECTED_ROUTES` (mirror riga ~459): `{ prefix: "/app/precaricamento-ruoli", ruoliAmmessi: ["ADMIN"], navLabel: "Precaricamento Segreteria/Dirigente", gruppo: "Accounting" }`.
- `lib/guida/contenuti.ts` -- nuova voce `ContenutoGuida` per `/app/precaricamento-ruoli` (mirror struttura esistente) + una riga aggiuntiva nella voce esistente per `/registrati` (se presente) o per `/app/admin` che spieghi il nuovo comportamento di blocco per Segreteria/Dirigente.

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + nuova migrazione -- `PrecaricamentoRuolo`
- [x] `lib/matching-email-ruolo/` -- `normalizzaEmailRuolo`, `trovaPrecaricamentoRuolo`, barrel + test
- [x] `registrati/actions.ts` -- blocco di controllo pre-`generateLink`, `ruoloSensibile` esteso, claim post-creazione + test (`registrati/actions.test.ts`): Segreteria/Dirigente bloccati senza precaricamento, singolo/doppio Ruolo, misto con Ruolo non bloccato, `attivo:true` su match, nessuna regressione su Admin/Site Manager/Allenatore/Atleta/Genitore
- [x] `app/app/(onboarding-import)/precaricamento-ruoli/` -- page + form + row + actions + test (`actions.test.ts`)
- [x] `lib/auth/route-guard.ts` -- nuova voce rotta
- [x] `lib/guida/contenuti.ts` -- nuova voce + aggiornamento voce esistente

**Acceptance Criteria:** vedi `epics.md` Story 9.41 (Given/When/Then, verbatim) - nota: l'AC #7 lì presente ("email e/o Ruoli" modificabili) è ristretto qui ai soli Ruoli, vedi Boundaries "Never" sopra.

### Review Findings

- [x] [Review][Patch] Messaggio di rifiuto non pluralizza "il Ruolo" quando mancano sia Segreteria sia Dirigente insieme (es. "il Ruolo Segreteria, Dirigente") — correggere in "i Ruoli" quando >1, più test per il caso doppio-mancante [app/(onboarding-import)/registrati/actions.ts:239]
- [x] [Review][Patch] Il loop di controllo precaricamento (righe 229-234) non è avvolto in try/catch, a differenza di ogni altro lookup pre-`generateLink` nella stessa funzione (CF Genitore/Atleta) — un errore DB transiente propagherebbe non gestito invece del consueto `{error:{code:"INTERNAL",...}}` [app/(onboarding-import)/registrati/actions.ts:229-234]
- [x] [Review][Patch] Nessun test `getRouteDecision` dedicato per `/app/precaricamento-ruoli` (ADMIN allow / non-ADMIN redirect) — ogni altra rotta reale in `PROTECTED_ROUTES` ne ha uno, questa rotta nuova ne è priva [lib/auth/route-decision.test.ts]
- [x] [Review][Patch] `aggiornaPrecaricamentoRuolo` con `emailOriginale` che non corrisponde a nessuna riga esistente crea silenziosamente nuove righe invece di rifiutare con "Voce non trovata" [app/app/(onboarding-import)/precaricamento-ruoli/actions.ts:112-129]
- [x] [Review][Patch] Commento doc obsoleto in `registrati/actions.test.ts` (~riga 1084) descrive ancora DIRIGENTE/SEGRETERIA come privi di aggancio e soggetti al gate — non più vero dopo questa storia [app/(onboarding-import)/registrati/actions.test.ts]
- [x] [Review][Patch] Nessun test per lo scenario della matrice I/O congelata "Segreteria+Admin, email precaricata solo per Segreteria, 0 Admin attivi" (bootstrap) — logica verificata corretta per ispezione ma non coperta da test [app/(onboarding-import)/registrati/actions.test.ts]
- [x] [Review][Patch] `RUOLI_BLOCCATI_SENZA_PRECARICAMENTO` duplicata verbatim in due file — spostarla in `lib/matching-email-ruolo` (già importato da entrambi) per evitare drift futuro [app/(onboarding-import)/registrati/actions.ts, app/app/(onboarding-import)/precaricamento-ruoli/actions.ts]
- [x] [Review][Defer] Race TOCTOU nel claim di `PrecaricamentoRuolo` durante `registrati()` (due registrazioni concorrenti sulla stessa email) — deferred, pre-existing: stesso livello di rischio "vicino al teorico" già esplicitamente accettato altrove nella stessa funzione (eccezione bootstrap Admin)
- [x] [Review][Defer] Loop di claim su più Ruoli bloccati non transazionale (un fallimento a metà lascia un claim parziale) — deferred, pre-existing: coperto dalla policy "nessun rollback automatico" già esplicitamente documentata nello stesso blocco try/catch (righe 456-469), stessa scelta già applicata all'aggancio Allenatore/GenitoreAtleta
- [x] [Review][Defer] Race TOCTOU (check-then-act) in `aggiornaPrecaricamentoRuolo`/`cancellaPrecaricamentoRuolo` — deferred, pre-existing: esplicitamente etichettato nel codice stesso come "accepted-risk check-then-act" mirror di un pattern già in uso altrove nel progetto per pannelli Admin a bassa concorrenza
- [x] [Review][Defer] Nessuna validazione server-side del formato email in `precaricaRuolo`/`aggiornaPrecaricamentoRuolo` — deferred: nessuna utility di validazione email esiste altrove nel progetto da riusare, introdurne una ora sarebbe una nuova decisione di design non meccanica; rischio basso (pannello solo-Admin, auto-correggibile)
- [x] [Review][Defer] Nessuna colonna "Aggiunto il" / paginazione / eco email-Ruoli nel messaggio di successo su `/app/precaricamento-ruoli` — deferred: parità esatta con la pagina mirror `/app/precaricamento-allenatori`, verificata priva delle stesse tre cose - nessuna regressione, gap preesistente nel pattern replicato

## Spec Change Log

**Ciclo di review 1 (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Acceptance Auditor) — 2026-08-31/09-01.** Nessun finding ha richiesto di riaprire l'Intent. Acceptance Auditor: nessuna violazione di AC, solo 2 gap minori (commento test obsoleto, scenario bootstrap+precaricamento non testato). Verification Gap Reviewer: 1 gap reale (nessun test `getRouteDecision` per la rotta nuova, a differenza di ogni altra rotta reale in `PROTECTED_ROUTES`).

**PATCH (applicati, 7)**:
1. Blind Hunter + Acceptance Auditor (convergenza indipendente): messaggio di rifiuto non pluralizzava "il Ruolo" quando mancavano sia Segreteria sia Dirigente insieme ("il Ruolo Segreteria, Dirigente") - ora "i Ruoli" quando >1 mancante, con test dedicato per il caso doppio-mancante.
2. Edge Case Hunter: il loop di controllo precaricamento non era avvolto in try/catch, a differenza di ogni altro lookup pre-`generateLink` nella stessa funzione (CF Genitore/Atleta) - un errore DB transiente propagava non gestito invece del consueto `{error:{code:"INTERNAL",...}}`. Avvolto, stesso pattern del resto della funzione.
3. Verification Gap Reviewer: nessun test `getRouteDecision` dedicato per `/app/precaricamento-ruoli` (ADMIN allow / non-ADMIN redirect) - un `ruoliAmmessi` sbagliato su questa rotta (es. includesse SEGRETERIA/DIRIGENTE) sarebbe passato inosservato, esponendo l'elenco delle email precaricate. Aggiunti 2 test, mirror di `/impostazioni`.
4. Edge Case Hunter: `aggiornaPrecaricamentoRuolo` con `emailOriginale` senza righe esistenti (typo, voce già cancellata) creava silenziosamente nuove righe invece di rifiutare (`deleteMany` su un `where` senza corrispondenze è un no-op, `createMany` procedeva comunque). Aggiunta guardia esplicita "Voce non trovata" + test; il test preesistente "transaction fails" aggiornato per continuare a esercitare quel percorso (usava `findManyMock.mockResolvedValue([])`, ora intercettato prima dalla nuova guardia).
5. Acceptance Auditor: commento doc obsoleto in `registrati/actions.test.ts` descriveva ancora DIRIGENTE/SEGRETERIA come privi di aggancio e soggetti al gate "Ruoli sensibili" - non più vero dopo questa storia (il corpo dei test già usava SITE_MANAGER al loro posto). Commento riallineato.
6. Acceptance Auditor: nessun test per lo scenario esplicito della matrice I/O congelata "Segreteria+Admin, email precaricata solo per Segreteria, 0 Admin attivi -> bootstrap". Logica già corretta per ispezione (percorsi indipendenti), aggiunto test di conferma.
7. Blind Hunter: `RUOLI_BLOCCATI_SENZA_PRECARICAMENTO` duplicata verbatim in due file "use server" (impossibilitati a esportare una costante). Spostata in un nuovo modulo `lib/matching-email-ruolo/ruoli-bloccati-senza-precaricamento.ts` (non "use server"), importata da entrambi - elimina il rischio di drift futuro.

Finding scartati come `defer` (pre-esistenti/rischio già accettato esplicitamente altrove nel progetto, non introdotti/aggravati da questa storia) - vedi checklist sopra e `deferred-work.md`: race TOCTOU nel claim durante `registrati()`; loop di claim multi-Ruolo non transazionale (coperto dalla policy "nessun rollback automatico" già documentata nello stesso blocco); race TOCTOU in `aggiornaPrecaricamentoRuolo`/`cancellaPrecaricamentoRuolo` (etichettata nel codice stesso come accepted-risk); nessuna validazione server-side del formato email (nessuna utility di validazione email esiste altrove nel progetto da riusare); nessuna colonna "Aggiunto il"/paginazione/eco di successo (parità esatta con la pagina mirror `/precaricamento-allenatori`, verificata).

Finding dismissed come noise/già gestito: l'invariante "tutte le righe di un'email condividono lo stesso `utenteId`" è effettivamente raggiungibile anche via un secondo percorso non descritto nelle Design Notes originali (un Admin aggiunge un nuovo Ruolo a un'email che ha già una riga agganciata per un Ruolo diverso) - ma lo stato risultante è già gestito correttamente dalla guardia esistente (Boundaries "Always": una qualunque riga agganciata blocca l'intera voce), nessun comportamento errato, solo un percorso aggiuntivo verso uno stato già previsto.

Verifica dopo i patch: 1927/1927 test Vitest (+13 rispetto alla prima implementazione), tsc/lint puliti (0 errori, stessi 21 warning preesistenti non correlati), build riuscita (`/app/precaricamento-ruoli` presente nell'output), `prisma validate` ok.

## Design Notes

**Perché una riga per (email, ruolo) e non un array `Ruolo[]` sulla email:** nessun precedente nel progetto di un array dell'enum `Ruolo` stesso (esiste solo `ruoliAggiuntivi String[]` su `Allenatore`, testo libero non collegato all'enum di autenticazione) - `UtenteRuolo` è già il mirror esatto e collaudato per "più Ruoli per una singola chiave", stesso `@@unique([x, ruolo])`. Riusarlo riduce la superficie di novità a zero.

**Perché tutte le righe di un'email condividono sempre lo stesso `utenteId` (mai un mix agganciato/non agganciato in pratica):** il claim (vedi Code Map) valorizza `utenteId` SOLO per i Ruoli bloccati effettivamente presenti in `ruoli` al momento della registrazione - se un'email è precaricata per [SEGRETERIA, DIRIGENTE] ma la persona si registra selezionando solo Segreteria, la riga Dirigente resta `utenteId: null`. Questo è uno stato raggiungibile (non impedito da un vincolo DB) - la UI/guardia lo tratta come "voce agganciata" (una riga con `utenteId` basta a bloccare modifica/cancellazione, Boundaries "Always") proprio per restare semplice e non introdurre una gestione per-riga della UI di modifica.

**Perché il controllo di precaricamento si riesegue anche su un reinvio (nessuna ottimizzazione "salta se già verificato"):** il reinvio non ha modo di sapere, prima di interrogare Supabase, se `data.user` esiste già (quella distinzione arriva solo dopo `generateLink` con `utenteEsistente`) - rieseguire il controllo è innocuo (le righe precaricate esistono ancora, il controllo passa di nuovo) e evita di introdurre un ramo condizionale in più.

**Perché `requireRuolo(["ADMIN"])` senza il secondo argomento `rotta` (niente `permessiConfigurabili`):** quel meccanismo (Epic 12) esiste per rotte che un Admin potrebbe voler aprire ad altri Ruoli via UI senza redeploy - nessun requisito lo chiede qui, ed è lo stesso identico punto di partenza scelto per `/precaricamento-allenatori` alla sua introduzione (Story 9.22, poi migrato solo più tardi in Story 12.4 su richiesta esplicita). Aggiungerlo ora sarebbe design per un requisito ipotetico.

## Verification

**Commands:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx prisma validate`

**Manual checks (obbligatorio):** non eseguibile in questa sessione - ambiente di sviluppo locale rotto (Prisma WASM + Windows, vedi memoria `project_dev_locale_prisma_wasm_rotto`). Verificato solo via test automatici + tsc + lint + build + prisma validate. Da verificare dal vivo dopo il deploy: precaricare un'email, registrarsi con quell'email e Ruolo Segreteria/Dirigente, verificare login immediato senza attivazione Admin; tentare la registrazione con un'email non precaricata e verificare il rifiuto esplicito.
