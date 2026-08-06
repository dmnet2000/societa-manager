---
baseline_commit: 71f06278cbf5857463fc781f8a316c60b99059e5
---

# Story 10.8: Modifica nome Campionato e link al portale FIPAV

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore del proprio Gruppo (o Admin/Dirigente),
I want poter correggere il nome di un Campionato già creato e collegarci il link al portale FIPAV/Lega Pallavolo di quel girone,
so that possa sistemare un nome inserito male senza cancellare e ricreare il Campionato (perdendo le Partite importate), e chiunque acceda a `/campionati`/`/partite` possa consultare rapidamente la fonte federale ufficiale.

## Acceptance Criteria

1. **Given** un Allenatore (del proprio Gruppo) o Admin/Dirigente su `/campionati` **When** modifica nome e/o link FIPAV di un Campionato esistente **Then** i nuovi valori sono salvati e visibili senza reload.
2. **And** il nome resta obbligatorio (stesso vincolo di `creaCampionato`) — un nome vuoto viene rifiutato con un messaggio chiaro, nessuna scrittura.
3. **And** il link FIPAV è opzionale — può essere lasciato vuoto (Campionato senza link) o rimosso da un Campionato che ne aveva già uno.
4. **And** stesso perimetro di autorizzazione di `creaCampionato`/`cancellaCampionato` (Allenatore limitato al proprio Gruppo tramite `risolviAutorizzazioneGruppo`, Admin/Dirigente ad accesso ampio) — nessuna modifica al modello di autorizzazione esistente. ~~(refuso corretto in review: l'helper si chiama `risolviAutorizzazioneGruppo`, non `risolviPossessoGruppo` — quest'ultimo è un helper di un altro dominio, `app/(gruppi-allenatori)/gruppi/actions.ts`; il codice era già corretto, solo il testo dell'AC citava il nome sbagliato)~~
5. **And** nessuna regressione sulla cancellazione (Story 10.6) — invariata, non toccata da questo diff. ~~Il nome resta la chiave usata per il controllo di coerenza con la colonna `Campionato` del file Excel importato (Story 10.2)~~ — **premessa corretta in review (Acceptance Auditor)**: verificato che questo controllo non esiste nel codice reale (`lib/importa-gare/parser.ts` non legge una colonna "Campionato"; `importaGare` confronta `campionato.gruppoId`, non il nome) — imprecisione della story fin dall'apertura, non introdotta da questo diff (che non tocca il percorso di import).

## Tasks / Subtasks

- [x] Task 1: Campo `linkFipav` su `Campionato` (AC: #1, #3)
  - [x] `prisma/schema.prisma`, model `Campionato`: aggiungere `linkFipav String?` (nullable, testo libero — stesso principio di `Palestra.indirizzo`, nessuna validazione di dominio specifica).
  - [x] Nuova migrazione (`ALTER TABLE "campionati" ADD COLUMN "linkFipav" TEXT;`) — nessuna RLS/GRANT da toccare, `Campionato` è già strutturale/no-RLS (AD-9).
- [x] Task 2: Server Action `aggiornaCampionato` (AC: #1, #2, #3, #4)
  - [x] In `app/(partite-campionati)/campionati/actions.ts`, nuova funzione `aggiornaCampionato(_prevState, formData)` — mirror di `aggiornaPalestra` (`app/(orari-palestre)/palestre/actions.ts:111-146`) per lo stile Server Action di update (`requireRuolo` → validazione → `prisma.campionato.update` → `INTERNAL` generico → `revalidatePath`), ma con lo **stesso perimetro di autorizzazione già esistente in `creaCampionato`** (leggere quella funzione per intero prima di scrivere: Allenatore ammesso solo sul proprio Gruppo via `risolviPossessoGruppo`/`autorizzazione.ts`, Admin/Dirigente ad accesso ampio) — non copiare il perimetro Admin/Dirigente-only di `aggiornaPalestra`, che è un caso diverso.
  - [x] Legge `id`/`nome`/`linkFipav` da `formData`; `nome` trim + obbligatorio (stesso messaggio di `creaCampionato`); `linkFipav` trim, stringa vuota → `null` (stesso principio "vuoto rimuove il valore" di `salvaNomeSettoreAction`/`aggiornaAllenatore`).
  - [x] `prisma.campionato.update({ where: { id }, data: { nome, linkFipav } })`, `revalidatePath("/campionati")`.
- [x] Task 3: UI su `/campionati` (AC: #1)
  - [x] Decidere in apertura sviluppo (punto lasciato aperto in `epics.md`): toggle sola-lettura/modifica inline sul `<li>` esistente (coerente con `ImportaGareForm`/`EliminaCampionatoForm` già annidati lì, probabile scelta più semplice) oppure pattern "riga tabellare + icone" di `SlotRow.tsx`/`AllenatoreRow.tsx` (Story 15.5/9.30) — la lista Campionati oggi non è una tabella, valutare l'impatto prima di introdurne una solo per questa storia.
  - [x] Nuovo form/componente (nome da definire in sviluppo, es. `ModificaCampionatoForm.tsx`) accanto a `ImportaGareForm`/`EliminaCampionatoForm` nello stesso `<li>` (`page.tsx:87-97`).
- [x] Task 4: Test
  - [x] `app/(partite-campionati)/campionati/actions.test.ts` (esteso): stesso schema di casi già coperto da `creaCampionato` per l'autorizzazione (Admin/Dirigente ad accesso ampio, Allenatore solo sul proprio Gruppo, Allenatore su Gruppo altrui respinto), più VALIDATION su nome vuoto, successo con `linkFipav` valorizzato/vuoto/rimosso, INTERNAL su errore Prisma.
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

## Dev Notes

### Pattern da riusare (non reinventare)

- **Server Action di update singola entità**: mirror di `aggiornaPalestra` (`app/(orari-palestre)/palestre/actions.ts:111-146`, letto per intero) per lo *stile* (validazione → update → revalidatePath) — ma il *perimetro di autorizzazione* va preso da `creaCampionato`/`cancellaCampionato` nello stesso file (`app/(partite-campionati)/campionati/actions.ts`), non da `aggiornaPalestra` (quella è Admin/Dirigente-only, `Campionato` invece ammette anche l'Allenatore sul proprio Gruppo).
- **"Vuoto rimuove il valore"**: stesso principio già stabilito per `salvaNomeSettoreAction`/`salvaEmailSegreteriaAction` (Story 7.2/9.31) e `aggiornaAllenatore` — un campo opzionale lasciato vuoto salva `null`, non una stringa vuota letterale.

### Perimetro di autorizzazione — leggere `creaCampionato` per intero prima di scrivere `aggiornaCampionato`

Questa storia **non** introduce un nuovo modello di autorizzazione — deve replicare esattamente quello già in vigore per `creaCampionato`/`cancellaCampionato` (Allenatore limitato al proprio Gruppo, Admin/Dirigente ad accesso ampio, via `risolviPossessoGruppo`/`app/(partite-campionati)/autorizzazione.ts`). Non assumere un perimetro diverso solo perché il pattern-mirror scelto per lo *stile* (`aggiornaPalestra`) ne ha uno più ristretto.

### Punto aperto — layout della riga Campionato (da decidere in apertura sviluppo)

L'elenco Campionati in `/campionati` (`page.tsx`) è oggi un `<ul>`/`<li>` semplice (non una tabella), con `ImportaGareForm`/`EliminaCampionatoForm` già annidati in ogni `<li>`. A differenza di `/slot`/`/precaricamento-allenatori` (Story 15.5/9.30, dove un ridisegno tabellare era esplicitamente richiesto), qui non c'è alcuna richiesta di ridisegno — il modo più semplice e meno invasivo è probabilmente un form inline aggiunto allo stesso `<li>` (coerente con gli altri due form già lì), non l'introduzione di un pattern tabellare nuovo solo per due campi. Non assumere: confermare la scelta più semplice regga leggendo per intero `page.tsx`/`campionati.module.css` prima di implementare.

### Riferimenti

- [Source: app/(partite-campionati)/campionati/actions.ts] — `creaCampionato` (perimetro di autorizzazione da replicare), `cancellaCampionato` (stesso perimetro, mirror alternativo).
- [Source: app/(orari-palestre)/palestre/actions.ts:111-146] — `aggiornaPalestra`, mirror di stile per l'update.
- [Source: app/(partite-campionati)/campionati/page.tsx] — layout attuale della riga Campionato, da leggere per intero prima del Task 3.
- [Source: app/(partite-campionati)/campionati/EliminaCampionatoForm.tsx, ImportaGareForm.tsx] — form già annidati nello stesso `<li>`, pattern di riferimento per il nuovo form.
- [Source: prisma/schema.prisma, model Campionato] — forma esatta del model da estendere.

### Project Structure Notes

- Nuova migrazione: `prisma/migrations/<timestamp>_add_link_fipav_campionato/migration.sql`.
- Modificati: `prisma/schema.prisma`, `app/(partite-campionati)/campionati/actions.ts`, `app/(partite-campionati)/campionati/page.tsx`.
- Nuovo file UI (nome da definire in sviluppo, Task 3).

## Review Findings

Code review con 3 layer adversariali paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) sul diff completo della story (contro il baseline pre-story).

**Acceptance Auditor**: nessuna violazione degli AC — tutti e 5 verificati indipendentemente, incluso il controllo puntuale su AC #4 (perimetro di autorizzazione confrontato riga per riga con `creaCampionato`/`cancellaCampionato`, confermato corretto — non copiato erroneamente da `aggiornaPalestra`).

- [x] [Review][Patch] **Sicurezza**: `linkFipav` non aveva alcuna validazione server-side — un valore `javascript:...`/`data:...` sarebbe stato salvato e reso come `href` cliccabile (`target="_blank"`) in `ModificaCampionatoForm.tsx`. Trovato indipendentemente da Blind Hunter ed Edge Case Hunter. Corretto: nuova funzione `linkFipavValido` (schema http/https obbligatorio via `new URL()`, limite 500 caratteri), 5 nuovi test. [app/(partite-campionati)/campionati/actions.ts:102]
- [x] [Review][Patch] Nessun controllo di nome duplicato in `aggiornaCampionato`, a differenza di `creaCampionato`. Trovato indipendentemente da Blind Hunter ed Edge Case Hunter. Corretto: stesso controllo `findFirst` di `creaCampionato`, escluso il Campionato stesso dal confronto, 2 nuovi test. [app/(partite-campionati)/campionati/actions.ts:126-130]
- [x] [Review][Patch] Commento sopra `aggiornaCampionato` impreciso sul mirroring di `aggiornaPalestra`. Trovato dal Blind Hunter. Corretto: commento riscritto per dichiarare esplicitamente la differenza reale (`{ success: true }` esplicito, necessario per il ricollasso automatico). [app/(partite-campionati)/campionati/actions.ts:81-89]
- [x] [Review][Patch] Accessibilità: link "Portale FIPAV" senza `aria-label` per Campionato. Trovato dal Blind Hunter. Corretto: aggiunto `aria-label`. [app/(partite-campionati)/campionati/ModificaCampionatoForm.tsx:40-45]
- [x] [Review][Patch] AC #4 citava l'helper sbagliato (`risolviPossessoGruppo` invece di `risolviAutorizzazioneGruppo`). Trovato dall'Acceptance Auditor. Corretto nel testo dell'AC.
- [x] [Review][Patch] AC #5 assumeva un controllo di coerenza nome↔Excel mai esistito nel codice. Trovato dall'Acceptance Auditor. Corretto nel testo dell'AC.

- [x] [Review][Defer] Messaggio di errore residuo dopo "Annulla": se un submit fallisce (stato di errore) e l'utente clicca "Annulla" e poi riapre "Modifica", il vecchio errore ricompare immediatamente senza un nuovo invio — `useActionState` non espone un modo diretto per azzerare il proprio `state` (Edge Case Hunter). Deferred: cosmetico, richiede una piccola ristrutturazione della gestione dello stato locale per essere risolto pulitamente; nessun impatto sui dati, solo un messaggio fuorviante temporaneo. [app/(partite-campionati)/campionati/ModificaCampionatoForm.tsx]
- [x] [Review][Defer] `ModificaCampionatoForm`/`ImportaGareForm`/`EliminaCampionatoForm` sulla stessa riga hanno `pending` indipendenti, non coordinati — un utente potrebbe cliccare "Salva" mentre "Cancella" è in corso sulla stessa riga (Blind Hunter, che nota come questa stessa classe di bug fosse già stata corretta due volte in `SlotRow.tsx`, esplicitamente citato come pattern-sorgente di questa storia). Deferred: il gap esiste già oggi **tra** `ImportaGareForm`/`EliminaCampionatoForm` (pre-esistente, non introdotto da questa storia) — questa storia aggiunge un terzo form allo stesso pattern già presente, non introduce una categoria di problema nuova. Coordinare tutti e tre richiede sollevare lo stato a un componente genitore condiviso, fuori scope per una storia di solo nome/link. [app/(partite-campionati)/campionati/page.tsx]
- [x] [Review][Defer] Nessuna gestione specifica di `P2025` (Campionato cancellato concorrentemente tra la lettura e l'`update`) in `aggiornaCampionato`, a differenza di `cancellaCampionato` che tratta lo stesso errore come successo idempotente — un retry mostrerebbe lo stesso errore generico all'infinito (Edge Case Hunter + Blind Hunter, trovato indipendentemente da entrambi). Deferred: stessa classe di rischio a bassa probabilità (pochi utenti gestionali) già accettata ripetutamente in questo progetto. [app/(partite-campionati)/campionati/actions.ts]
- [x] [Review][Defer] Nessun controllo di concorrenza ottimistica — due modifiche concorrenti sullo stesso Campionato si sovrascrivono silenziosamente (ultimo che salva vince) (Edge Case Hunter). Deferred: stessa scala ridotta/pochi Admin-Dirigente-Allenatori già accettata ripetutamente in questo progetto, nessun altro punto del progetto ha un controllo `updatedAt`/CAS.

**Dismessi come rumore/convenzioni già accettate (1)**: migrazione mai eseguita contro un DB reale in questo sandbox (Blind Hunter) — limite già documentato e accettato per ogni storia con migrazione in questo progetto (Story 12.4/13.1/9.31), coperto dal processo di deploy esistente (Fase 3bis, `docs/deploy-produzione.md`).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- `npx prisma migrate dev` non raggiunge il DB in questo sandbox — migrazione scritta a mano (`ALTER TABLE "campionati" ADD COLUMN "linkFipav" TEXT;`), stesso limite di Story 12.4/13.1/9.31. `npx prisma generate` eseguito con successo (non richiede connessione DB), verificato che `linkFipav` compaia nel client generato.
- `npx prisma format` ha nuovamente riallineato colonne in modelli non correlati (`Atleta`/`GenitoreAtleta`/`Gruppo`) — stesso comportamento già visto in Story 9.31, ripristinata manualmente la formattazione originale per tenere il diff scoped al solo model `Campionato`.
- ESLint (`react-hooks/set-state-in-effect`) ha bloccato il primo tentativo di `ModificaCampionatoForm.tsx` (ricollasso automatico via `useEffect` con `setState`) — corretto riusando il pattern "adjust state during render" già stabilito da `SlotRow.tsx`/`PartitaRow.tsx` (Story 15.5/10.4), non un `useEffect`.

### Completion Notes List

- Implementate tutte le 4 Task/5 AC della story: campo `linkFipav` su `Campionato` (no-RLS, nullable), Server Action `aggiornaCampionato` (stile mirror di `aggiornaPalestra`, perimetro di autorizzazione mirror di `creaCampionato`/`cancellaCampionato` via `risolviAutorizzazioneGruppo` con `permettiStagionePassata: true`), `ModificaCampionatoForm.tsx` (toggle inline sullo stesso `<li>`, non un ridisegno tabellare — confermata la scelta più semplice lasciata aperta in Dev Notes), `page.tsx` aggiornato.
- Deviazione minore dal piano: la story lasciava il nome del componente UI "da definire in sviluppo" — scelto `ModificaCampionatoForm.tsx`, coerente con `NuovoCampionatoForm.tsx`/`EliminaCampionatoForm.tsx` già presenti nello stesso file.
- Nessun controllo di duplicato nome in `aggiornaCampionato` (a differenza di `creaCampionato`) — deliberatamente fuori scope, non richiesto da alcun AC di questa storia.
- Verifica dal vivo (click reale su "Modifica"/"Salva") non eseguibile in questo sandbox — stesso limite delle storie precedenti. Verificato tutto il resto: 959/959 test Vitest passati (era 948, +11), `eslint` pulito (dopo il fix `set-state-in-effect`), `npx tsc --noEmit` pulito, `npm run build` riuscita.

### File List

**Nuovi:**
- `prisma/migrations/20260806010000_add_link_fipav_campionato/migration.sql`
- `app/(partite-campionati)/campionati/ModificaCampionatoForm.tsx`

**Modificati:**
- `prisma/schema.prisma` (model `Campionato` + campo `linkFipav`)
- `app/(partite-campionati)/campionati/actions.ts` (+`aggiornaCampionato`)
- `app/(partite-campionati)/campionati/actions.test.ts` (+11 test)
- `app/(partite-campionati)/campionati/page.tsx` (`ModificaCampionatoForm` sostituisce il testo statico del nome)
- `app/(partite-campionati)/campionati/campionati.module.css` (+`.rigaCampionato`/`.linkFipav`/`.azioniCompatto`)

## Change Log

- 2026-08-06: File di story creato, stato ready-for-dev.
- 2026-08-06: Story implementata (Task 1-4 completi). Campo `linkFipav` su `Campionato`, Server Action `aggiornaCampionato` (perimetro di autorizzazione mirror di `creaCampionato`/`cancellaCampionato`), `ModificaCampionatoForm.tsx` (toggle inline, pattern "adjust state during render" per evitare `react-hooks/set-state-in-effect`). 959/959 test Vitest passati (era 948), 0 errori tsc/eslint, build produzione riuscita. Status: review, in attesa di code review adversariale.
- 2026-08-06: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Acceptance Auditor: nessuna violazione degli AC (AC #4 in particolare verificato riga per riga: il perimetro di autorizzazione non è stato copiato erroneamente da `aggiornaPalestra`). **6 patch applicati, incluso un problema di sicurezza reale**: `linkFipav` non aveva validazione server-side, un valore `javascript:`/`data:` sarebbe stato salvato e reso come `href` cliccabile — trovato indipendentemente da Blind Hunter ed Edge Case Hunter, corretto con `linkFipavValido` (schema http/https obbligatorio, limite 500 caratteri); nessun controllo di nome duplicato in `aggiornaCampionato` a differenza di `creaCampionato` — corretto; commento impreciso sul mirroring di `aggiornaPalestra` — corretto; link "Portale FIPAV" senza `aria-label` — corretto; 2 refusi nel testo degli AC #4/#5 (helper sbagliato, premessa sul controllo import mai esistito) — corretti. 4 defer (messaggio di errore residuo dopo "Annulla", `pending` non coordinato tra i tre form della stessa riga — gap pre-esistente tra Import/Elimina, nessuna gestione P2025 su update concorrente, nessuna concorrenza ottimistica) — coerenti con limiti/rischi già accettati ripetutamente in questo progetto, vedi `deferred-work.md`. 1 dismesso. 966/966 test Vitest passati (era 959, +7 sulla validazione/duplicato), 0 errori tsc/eslint dopo i fix, build produzione riuscita. Status: done.
