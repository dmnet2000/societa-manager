---
baseline_commit: b98b84517f5b1eebf3d58a761878ae71b37a0b2c
---

# Story 10.7: Il Campionato appartiene a un solo Gruppo (rimozione della condivisione)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore/Admin/Dirigente che gestisce i Campionati del proprio Gruppo,
I want che ogni Campionato appartenga esclusivamente al Gruppo che lo ha creato,
so that il modello rispecchi la realtà federale: due squadre della stessa società nello stesso girone (es. "U19 Girone 1") sono due iscrizioni distinte, non la stessa iscrizione condivisa.

**Note aggiuntive:** corregge una decisione presa in Story 10.1 (`GruppoCampionato` tabella di giunzione molti-a-molti, commento esplicito in `prisma/schema.prisma`) che non rispecchia il dominio reale — un Gruppo partecipa solo ai propri Campionati; se due Gruppi della stessa società giocano nello stesso girone, restano comunque due Campionati distinti a sistema. Resta **confermato senza modifiche** che un Gruppo può partecipare a più Campionati contemporaneamente (già supportato, Story 10.1 AC #5) — la relazione va ristretta a "molti Campionati per Gruppo" (FK diretta `Campionato.gruppoId`), non "molti Gruppi per Campionato". **Blocca Story 10.6** (cancellazione Campionato/Partita) — quella storia richiede questa già completata, solo allora cancellare un Campionato è sempre sicuro (nessun altro Gruppo può esserne proprietario).

**Decisione tecnica presa con l'utente in fase di creazione storia (2026-08-02):** rimuovere del tutto la tabella `gruppo_campionati`, sostituendola con una colonna `gruppoId` obbligatoria diretta su `Campionato` (non mantenere la tabella con un vincolo applicativo aggiuntivo). Se in produzione esistesse già un Campionato collegato a più di un Gruppo (mai raggiungibile in pratica tramite l'UI attuale a parte "Collega Campionato esistente", che questa stessa storia rimuove), la migrazione tiene il collegamento più vecchio (`createdAt` crescente) e va verificato manualmente dopo il deploy.

## Acceptance Criteria

1. **Given** un Allenatore (o Admin/Dirigente) che vuole aggiungere un Campionato al proprio Gruppo **When** visita `/campionati` **Then** può solo creare un nuovo Campionato per il proprio Gruppo — nessuna opzione per collegarsi a un Campionato di un altro Gruppo (rimossa la funzionalità "Collega Campionato esistente": `collegaCampionatoEsistente`, `CollegaCampionatoForm.tsx`)
2. **And** nessuna regressione sulla possibilità di un Gruppo di partecipare a più Campionati contemporaneamente (Story 10.1 AC #5) né sull'import gare (Story 10.2) — suite Vitest invariata sui casi esistenti non impattati da questa correzione
3. **Given** due Gruppi diversi nella stessa stagione **When** ciascuno crea un Campionato con lo stesso nome **Then** entrambe le creazioni riescono — **comportamento nuovo abilitato da questa storia**: oggi (Story 10.1) il controllo duplicati di `creaCampionato` è scoped all'intera stagione (`nome` + `annoAgonisticoId`, **non** al Gruppo), quindi due Gruppi diversi non possono oggi avere Campionati omonimi nella stessa stagione — bug scoperto in fase di analisi di questa storia, va corretto scopando il controllo a `nome` + `annoAgonisticoId` + `gruppoId`
4. **Given** un Allenatore/Admin/Dirigente **When** crea un secondo Campionato con lo stesso nome per lo **stesso** Gruppo nella stessa stagione **Then** l'operazione viene rifiutata (comportamento preesistente da Story 10.1, ora scoped al Gruppo invece che all'intera stagione)

## Tasks / Subtasks

- [x] Task 1: Migrazione Prisma — `Campionato.gruppoId` diretto, rimozione `GruppoCampionato` (AC: #1, #2)
  - [x] Modificare `prisma/schema.prisma`:
    ```prisma
    // Story 10.7 (Epic 10): FK diretta a Gruppo - un Campionato appartiene
    // esclusivamente al Gruppo che lo ha creato (corregge la relazione
    // molti-a-molti di Story 10.1, che non rispecchiava il dominio reale:
    // due squadre della stessa societa' nello stesso girone federale sono
    // due Campionati distinti a sistema). Un Gruppo puo' comunque
    // partecipare a piu' Campionati (relazione inversa Gruppo.campionati,
    // invariato da Story 10.1 AC #5). onDelete: Cascade - un Campionato
    // non ha senso senza il suo Gruppo (stesso comportamento della FK
    // gruppoId rimossa da gruppo_campionati).
    model Campionato {
      id               String         @id @default(uuid())
      nome             String
      annoAgonisticoId String
      annoAgonistico   AnnoAgonistico @relation(fields: [annoAgonisticoId], references: [id])
      gruppoId         String
      gruppo           Gruppo         @relation(fields: [gruppoId], references: [id], onDelete: Cascade)
      createdAt        DateTime       @default(now())
      partite          Partita[]

      @@map("campionati")
    }
    ```
    - **Rimuovere interamente** il model `GruppoCampionato`
    - Su `model Gruppo`: sostituire il campo `campionati GruppoCampionato[]` con `campionati Campionato[]` (relazione inversa diretta ora che `Campionato` ha `gruppoId`)
  - [x] Nuova migrazione scritta a mano `prisma/migrations/20260802000000_campionato_gruppo_diretto/migration.sql` (stesso stile a mano delle migrazioni esistenti dell'Epic 10 — niente `prisma migrate dev`):
    ```sql
    -- Story 10.7: Campionato appartiene direttamente a un solo Gruppo (era
    -- un molti-a-molti tramite gruppo_campionati, Story 10.1) - corregge il
    -- modello dati per rispecchiare il dominio reale. Backfill: se un
    -- Campionato risultasse collegato a piu' di un Gruppo (mai raggiungibile
    -- in pratica se non tramite "Collega Campionato esistente", rimossa da
    -- questa stessa storia), viene tenuto il collegamento piu' vecchio.

    ALTER TABLE "campionati" ADD COLUMN "gruppoId" TEXT;

    UPDATE "campionati" c
    SET "gruppoId" = sub."gruppoId"
    FROM (
      SELECT DISTINCT ON ("campionatoId") "campionatoId", "gruppoId"
      FROM "gruppo_campionati"
      ORDER BY "campionatoId", "createdAt" ASC
    ) sub
    WHERE c."id" = sub."campionatoId";

    -- Se questo fallisce per NOT NULL, esistono Campionati senza alcuna riga
    -- in gruppo_campionati (dati orfani) - da investigare manualmente prima
    -- di procedere, non forzare un default silenzioso.
    ALTER TABLE "campionati" ALTER COLUMN "gruppoId" SET NOT NULL;

    ALTER TABLE "campionati" ADD CONSTRAINT "campionati_gruppoId_fkey" FOREIGN KEY ("gruppoId") REFERENCES "gruppi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    DROP TABLE "gruppo_campionati";
    ```
  - [x] Tentare `npx prisma migrate deploy` in locale; se non disponibile un'istanza Supabase locale (limite già incontrato in Story 10.1/10.2/10.3), eseguire almeno `npx prisma validate` + `npx prisma generate` e documentarlo nel Debug Log — **verifica reale della migrazione (incluso il backfill su dati esistenti) demandata all'utente dopo il deploy**, avvisarlo esplicitamente di controllare se un qualunque Campionato in produzione aveva più di un Gruppo collegato prima della migrazione (query suggerita: contare le righe `gruppo_campionati` per `campionatoId` prima di applicare, se possibile farlo eseguire all'utente)
- [x] Task 2: Server Actions — `app/(partite-campionati)/campionati/actions.ts` (AC: #1, #3, #4)
  - [x] `creaCampionato`: sostituire la doppia scrittura transazionale (`tx.campionato.create` + `tx.gruppoCampionato.create`) con un **singolo** `prisma.campionato.create({ data: { nome, annoAgonisticoId: anno.id, gruppoId } })` — nessuna `$transaction` più necessaria (una sola scrittura)
  - [x] Correggere il controllo duplicati (AC #3/#4): scopare il `findFirst` esistente aggiungendo `gruppoId` al `where` (oggi manca, bug scoperto in analisi — vedi AC #3)
  - [x] Aggiornare il messaggio di errore del duplicato: non ha più senso suggerire "collegalo invece di crearne uno nuovo" (funzionalità rimossa) — nuovo testo `"Esiste già un Campionato con questo nome per questo Gruppo in questa stagione."`
  - [x] **Rimuovere interamente** la funzione `collegaCampionatoEsistente` e il relativo export
  - [x] Aggiornare `app/(partite-campionati)/campionati/actions.test.ts`: rimosso il `describe("collegaCampionatoEsistente", ...)` e i mock `gruppoCampionatoCreateMock`/`txGruppoCampionatoCreateMock`/`$transaction`; aggiornati i mock/asserzioni di `creaCampionato` per la singola `campionato.create` con `gruppoId` nel payload; nuovi test per AC #3 (due Gruppi, stesso nome, stessa stagione → entrambi successo) e AC #4 (stesso Gruppo, stesso nome → `VALIDATION`)
- [x] Task 3: Import gare — `app/(partite-campionati)/campionati/importa-gare-actions.ts` (AC: #2)
  - [x] Sostituito il controllo `prisma.gruppoCampionato.findUnique(...)` con una verifica diretta sul Campionato (`prisma.campionato.findUnique({ where: { id: campionatoId }, select: { gruppoId: true } })`, stesso messaggio d'errore)
  - [x] Aggiornato `app/(partite-campionati)/campionati/importa-gare-actions.test.ts`: sostituito il mock `gruppoCampionato.findUnique` con `campionato.findUnique` che ritorna `{ gruppoId }`; aggiunto un nuovo test per il mismatch Campionato↔Gruppo diverso (Story 10.7)
  - [x] **Non toccata** la chiave composita `gruppoId_campionatoId_garaNumero` di `Partita` né la logica di upsert idempotente
- [x] Task 4: Pagina — `app/(partite-campionati)/campionati/page.tsx` (AC: #1)
  - [x] Semplificata la query: rimosso il secondo `prisma.campionato.findMany` (`tuttiCampionati`) e il calcolo `disponibili`/`collegatiIds` — un solo `prisma.gruppo.findMany({ where: {...}, include: { campionati: { orderBy: { nome: "asc" } } } })`
  - [x] JSX: `gruppo.campionati.map((campionato) => ...)` diretto (non più annidato via `gc.campionato`)
  - [x] Rimosso il rendering di `<CollegaCampionatoForm />` e il relativo import
  - [x] Eliminato il file `app/(partite-campionati)/campionati/CollegaCampionatoForm.tsx`
- [x] Task 5: Verifica commenti/documentazione obsoleti (AC: #1, #2)
  - [x] `prisma/schema.prisma`: corretto il commento sopra `model Campionato` (il vecchio `model GruppoCampionato` è stato rimosso insieme al suo commento "molti-a-molti")
  - [x] `ARCHITECTURE-SPINE.md`: verificato — non cita `Campionato`/`GruppoCampionato` (documento scritto prima dell'aggiunta dell'Epic 10, stessa situazione già notata in Story 10.1), nessun aggiornamento necessario. `10-1-creazione-campionato-per-un-gruppo.md` non modificato (storico).
- [x] Task 6: Test e regressione (AC: #2)
  - [x] Suite Vitest completa: 789/789 test passati (era 795/795 prima di questa storia: -8 test di `collegaCampionatoEsistente` rimossa, +2 nuovi test AC #3/mismatch Gruppo Story 10.7)
  - [x] `npx tsc --noEmit` pulito (0 errori); ESLint pulito su tutti i file di questa storia (7 problemi residui nel progetto sono tutti pre-esistenti, in file non toccati qui — stesso conteggio già osservato in Story 10.1)
  - [x] Confermato: `app/(partite-campionati)/partite/page.tsx` non ha richiesto modifiche, suite verde senza intervento

### Review Findings

- [x] [Review][Patch] La migrazione scartava silenziosamente eventuali collegamenti Gruppo↔Campionato alternativi senza un controllo preventivo: se un Campionato in produzione fosse risultato collegato a più di un Gruppo (raggiungibile solo tramite "Collega Campionato esistente", rimossa da questa stessa storia), il backfill avrebbe tenuto il collegamento più vecchio e distrutto per sempre gli altri con la `DROP TABLE` successiva — la "verifica manuale dopo il deploy" prevista dalla storia sarebbe arrivata troppo tardi, a dati già persi. Le Partite già importate per il Gruppo "perdente" sarebbero inoltre rimaste visibili in `/partite` ma non più re-importabili (il Gruppo non risulterebbe più iscritto a quel Campionato). [prisma/migrations/20260802000000_campionato_gruppo_diretto/migration.sql] — risolto: aggiunto un blocco `DO $$ ... END $$` che interrompe la migrazione con un errore esplicito se un qualunque Campionato risulta collegato a più di un Gruppo, prima di alterare qualunque dato — la verifica manuale avviene ora prima della perdita di dati, non dopo.
- [x] [Review][Patch] `deferred-work.md` (voce del code review di Story 2.2) elencava ancora un indice secondario mancante su `gruppo_campionati.campionatoId` — tabella rimossa interamente da questa storia, la voce non è più applicabile. [_bmad-output/implementation-artifacts/deferred-work.md:414] — risolto: voce barrata con nota "tabella rimossa in Story 10.7", stessa convenzione già usata altrove nel file per voci risolte.
- [x] [Review][Defer] Il nuovo `onDelete: Cascade` da `Campionato` a `Gruppo` fa sì che cancellare un Gruppo cancellerebbe ora a cascata anche i suoi Campionati (prima, con la relazione molti-a-molti, un Campionato condiviso sarebbe sopravvissuto) — nessuna funzionalità di cancellazione Gruppo esiste oggi (verificato con una ricerca nel codice), rischio dormiente rilevante solo se una storia futura introducesse quella funzionalità. Le Partite venivano già cancellate a cascata direttamente tramite `Partita.gruppoId` indipendentemente da questo cambiamento (Story 10.2) - l'aumento reale del raggio d'azione è limitato alle sole righe `Campionato`. [prisma/schema.prisma]
- [x] [Review][Defer] Nessun vincolo univoco a livello DB dietro al controllo duplicati di `creaCampionato` (AC #3/#4) — due chiamate concorrenti per lo stesso Gruppo+nome+stagione potrebbero entrambe superare il controllo e creare due Campionati duplicati (race TOCTOU). Stessa classe di rischio già accettata ripetutamente in questo progetto (Story 1.3/1.4/9.9/10.1), bassa probabilità reale (piccola società, pochi Admin/Allenatori attivi contemporaneamente). [app/(partite-campionati)/campionati/actions.ts]
- [x] [Review][Defer] `creaCampionato` risolve l'Anno Agonistico corrente due volte (una dentro `risolviAutorizzazioneGruppo` per il controllo duplicati, una tramite `risolviAnnoAgonisticoCorrente()` per la creazione) — pattern preesistente dalla Story 10.1, non introdotto né toccato da questa storia. [app/(partite-campionati)/campionati/actions.ts]
- [x] [Review][Defer] Nessun indice secondario sulla nuova colonna `Campionato.gruppoId` (l'indice univoco di `gruppo_campionati`, ora rimosso, lo forniva implicitamente) — stesso gap ricorrente già accettato ripetutamente in questo progetto (Story 2.1/2.2/2.3/2.4/10.1), scala ridotta. [prisma/schema.prisma]

## Dev Notes

- **Perimetro contenuto**: `GruppoCampionato`/`gruppoCampionato` compaiono solo in 3 file di produzione (`app/(partite-campionati)/campionati/{actions.ts, page.tsx, importa-gare-actions.ts}`) e nei relativi 2 file di test — nessun altro modulo del progetto lo referenzia (verificato con una ricerca esaustiva in fase di creazione storia). `app/(partite-campionati)/partite/page.tsx` e `lib/raggruppa-per-settimana.ts` (Story 10.3) leggono `Partita.gruppoId`/`Partita.campionato` direttamente, mai `GruppoCampionato` — fuori scope, non toccare.
- **Perché FK diretta e non "tieni la tabella + vincolo applicativo"**: deciso esplicitamente con l'utente in fase di creazione — un `@@unique([campionatoId])` su `gruppo_campionati` avrebbe ottenuto lo stesso vincolo, ma avrebbe lasciato un modello dati che dichiara "molti-a-molti" quando in realtà non lo è più, incoerente con la nota della storia in `epics.md`. La FK diretta è anche lo schema minimo necessario per **Story 10.6** (cancellazione Campionato), che dipende da questa storia proprio per poter cancellare un Campionato "in sicurezza" (nessun altro Gruppo proprietario da considerare).
- **Bug scoperto in analisi, non nella storia originale (AC #3/#4)**: il controllo duplicati di `creaCampionato` (Story 10.1) filtra oggi solo per `nome` + `annoAgonisticoId`, **non** per `gruppoId` — blocca quindi (erroneamente, nel nuovo modello 1:1) due Gruppi diversi che vogliono chiamare il proprio Campionato allo stesso modo nella stessa stagione. `epics.md` (nota della Story 10.7) presume che il controllo sia già scoped al Gruppo — non lo è, verificato leggendo `actions.ts` riga per riga. Va corretto come parte di questa storia (Task 2), non solo la migrazione.
- **`risolviAutorizzazioneGruppo` (`app/(partite-campionati)/autorizzazione.ts`) resta invariata** — l'autorizzazione a due livelli (Admin/Dirigente ampio, Allenatore scoped al proprio Gruppo via `GruppoAllenatore`) non cambia con questa storia; il `gruppoId` verificato è sempre quello del **Gruppo che sta agendo**, non del Campionato. Nessuna modifica a questo file.
- **`ImportaGareForm.tsx`/`NuovoCampionatoForm.tsx` non richiedono modifiche** — entrambi passano `gruppoId`/`campionatoId` come prima, l'unico cambiamento è lato server (Task 2/3). Non toccare questi due Client Component.
- **File NON da toccare**: `app/(gruppi-allenatori)/gruppi/*` (AD-2, fuori proprietà di questo modulo), `lib/anno-agonistico/*`, `app/(partite-campionati)/partite/*` (Story 10.3, legge solo `Partita`), `lib/importa-gare/parser.ts` (Story 10.2, il parsing del file non cambia), `_bmad-output/implementation-artifacts/10-1-*.md`/`10-2-*.md`/`10-3-*.md` (storici).

### Project Structure Notes

- File nuovi: `prisma/migrations/20260802000000_campionato_gruppo_diretto/migration.sql`.
- File modificati: `prisma/schema.prisma` (model `Campionato` esteso con `gruppoId`, `GruppoCampionato` rimosso, `Gruppo.campionati` cambia tipo), `app/(partite-campionati)/campionati/actions.ts`, `app/(partite-campionati)/campionati/actions.test.ts`, `app/(partite-campionati)/campionati/importa-gare-actions.ts`, `app/(partite-campionati)/campionati/importa-gare-actions.test.ts`, `app/(partite-campionati)/campionati/page.tsx`.
- File eliminati: `app/(partite-campionati)/campionati/CollegaCampionatoForm.tsx`.
- Nessun nuovo modulo — questa storia corregge esclusivamente il modulo `(partite-campionati)` già esistente dalla Story 10.1.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 10.7: Il Campionato appartiene a un solo Gruppo — AC, note e decisione presa il 2026-08-01 sulla rimozione di "Collega Campionato esistente"]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 10.6: Cancellazione di una Partita o di un Campionato — dipendenza esplicita "questa storia va implementata dopo la 10.7"]
- [Source: prisma/schema.prisma righe 363-409 — model Gruppo/Campionato/GruppoCampionato/Partita attuali, commenti originali su AD-8/AD-9]
- [Source: prisma/migrations/20260728010000_add_campionato/migration.sql — stile di migrazione a mano da replicare (ON DELETE CASCADE per relazioni di proprietà, RESTRICT verso AnnoAgonistico)]
- [Source: app/(partite-campionati)/campionati/actions.ts — creaCampionato/collegaCampionatoEsistente attuali, righe 1-140]
- [Source: app/(partite-campionati)/campionati/importa-gare-actions.ts — verifica collegamento Gruppo↔Campionato, righe 44-51]
- [Source: app/(partite-campionati)/campionati/page.tsx — query gruppi+campionati e calcolo "disponibili" da rimuovere, righe 59-93]
- [Source: app/(partite-campionati)/autorizzazione.ts — risolviAutorizzazioneGruppo, invariata da questa storia]
- [Source: app/(partite-campionati)/partite/page.tsx — conferma che questa pagina legge solo Partita.gruppoId/campionato, mai GruppoCampionato]
- [Source: _bmad-output/implementation-artifacts/10-1-creazione-campionato-per-un-gruppo.md — storia originale che ha introdotto GruppoCampionato, pattern Server Action/autorizzazione da preservare]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- `npx prisma migrate deploy` tentato in locale: `P1001: Can't reach database server at 127.0.0.1:54322` — nessuna istanza Supabase locale in esecuzione in questa sessione (stesso limite già incontrato in Story 10.1/10.2/10.3). `npx prisma validate` (schema valido) e `npx prisma generate` (Client rigenerato con successo) eseguiti al suo posto. **Verifica reale della migrazione (incluso il backfill da `gruppo_campionati`) demandata all'utente dopo il deploy** — da controllare esplicitamente se un qualunque Campionato in produzione risultava collegato a più di un Gruppo prima della migrazione (mai raggiungibile in pratica se non tramite "Collega Campionato esistente", rimossa da questa stessa storia).

### Completion Notes List

- Task 1: `Campionato` ha ora un campo `gruppoId` diretto (obbligatorio, `onDelete: Cascade`); `GruppoCampionato` rimossa interamente da `schema.prisma`; `Gruppo.campionati` cambia tipo da `GruppoCampionato[]` a `Campionato[]`. Migrazione scritta a mano `20260802000000_campionato_gruppo_diretto` (backfill da `gruppo_campionati` con `DISTINCT ON` + `ORDER BY createdAt ASC` per tenere il collegamento più vecchio in caso di condivisione pregressa, poi `DROP TABLE`). Schema validato, Prisma Client rigenerato; migrazione non applicata dal vivo (nessun Supabase locale disponibile).
- Task 2: `creaCampionato` ora fa una singola `prisma.campionato.create` (niente più `$transaction` con due scritture separate). Controllo duplicati (AC #3/#4) corretto per essere scoped anche a `gruppoId` — bug scoperto in fase di creazione storia: il controllo originale (Story 10.1) bloccava erroneamente due Gruppi diversi con lo stesso nome di Campionato nella stessa stagione. `collegaCampionatoEsistente` rimossa interamente. 15 test in `creaCampionato` (14 preesistenti aggiornati + 1 nuovo per AC #3).
- Task 3: `importaGare` verifica ora `campionato.gruppoId === gruppoId` invece di una riga `gruppo_campionati` — stesso messaggio d'errore, stesso comportamento osservabile. Aggiunto un test per il mismatch Campionato↔Gruppo diverso.
- Task 4: `page.tsx` semplificata a una sola query (`prisma.gruppo.findMany` con `include: { campionati }` diretto, niente più calcolo `disponibili`); rimosso l'uso e il file `CollegaCampionatoForm.tsx`.
- Task 5: commenti obsoleti su "molti-a-molti Gruppo↔Campionato" rimossi insieme al model `GruppoCampionato`; `ARCHITECTURE-SPINE.md` verificato — non cita `Campionato`, nessun aggiornamento necessario (stessa situazione già notata in Story 10.1).
- Task 6: 789/789 test passati (partiva da 795/795: -8 test di `collegaCampionatoEsistente` rimossa, +2 nuovi test AC #3/mismatch Story 10.7), `tsc --noEmit` pulito, ESLint pulito sui file di questa storia (7 problemi residui nel progetto sono tutti pre-esistenti, in file non toccati qui). `app/(partite-campionati)/partite/page.tsx` confermato invariato, suite verde senza intervento.

### File List

- `prisma/schema.prisma` (modificato — `Campionato.gruppoId` diretto, `GruppoCampionato` rimosso, `Gruppo.campionati` cambia tipo)
- `prisma/migrations/20260802000000_campionato_gruppo_diretto/migration.sql` (nuovo)
- `app/(partite-campionati)/campionati/actions.ts` (modificato — `creaCampionato` semplificata + fix controllo duplicati, `collegaCampionatoEsistente` rimossa)
- `app/(partite-campionati)/campionati/actions.test.ts` (modificato — riscritto per la nuova forma di `creaCampionato`, rimossi i test di `collegaCampionatoEsistente`, nuovo test AC #3)
- `app/(partite-campionati)/campionati/importa-gare-actions.ts` (modificato — controllo Gruppo↔Campionato via `campionato.gruppoId`)
- `app/(partite-campionati)/campionati/importa-gare-actions.test.ts` (modificato — mock aggiornato, nuovo test di mismatch)
- `app/(partite-campionati)/campionati/page.tsx` (modificato — query semplificata, rimosso uso di `CollegaCampionatoForm`)
- `app/(partite-campionati)/campionati/ImportaGareForm.tsx` (modificato — solo commento, riferimento a `CollegaCampionatoForm` rimosso)
- `app/(partite-campionati)/campionati/CollegaCampionatoForm.tsx` (eliminato)

## Change Log

- 2026-08-02: Implementata Story 10.7 — `Campionato` ha ora un `gruppoId` diretto e obbligatorio (era un molti-a-molti tramite `GruppoCampionato`, Story 10.1), corregge il modello dati per rispecchiare il dominio reale (un Campionato appartiene a un solo Gruppo). Rimossa la funzionalità "Collega Campionato esistente" (`collegaCampionatoEsistente`/`CollegaCampionatoForm.tsx`). Corretto un bug scoperto in analisi: il controllo duplicati di `creaCampionato` non era scoped al Gruppo, bloccando erroneamente due Gruppi diversi con lo stesso nome di Campionato nella stessa stagione. Sblocca Story 10.6 (cancellazione Campionato/Partita). 789/789 test passati, 0 errori tsc/eslint sui file di questa storia. Migrazione (incluso il backfill da `gruppo_campionati`) non applicata localmente (nessuna istanza Supabase disponibile in questa sessione) — verifica dal vivo demandata all'utente dopo il deploy.
- 2026-08-02: Code review completata (Blind Hunter + Edge Case Hunter + Acceptance Auditor) — 0 decision-needed, 2 patch applicati (guardia di sicurezza `DO $$...END$$` nella migrazione che interrompe con errore esplicito se un Campionato risultasse collegato a più di un Gruppo, prima di alterare qualunque dato; voce obsoleta su un indice mancante di `gruppo_campionati` barrata in `deferred-work.md`, tabella ormai rimossa), 4 defer (blast radius cascade su ipotetica cancellazione Gruppo — nessuna funzionalità del genere esiste oggi; race TOCTOU sul controllo duplicati — stessa classe già accettata ripetutamente nel progetto; doppia risoluzione dell'Anno Agonistico corrente — pattern preesistente dalla Story 10.1; indice secondario mancante su `Campionato.gruppoId` — stesso gap ricorrente già accettato altrove), 5 scartati come falsi positivi/rumore verificati (RESTRICT vs CASCADE non è un'incoerenza ma segue la convenzione già stabilita nel progetto; migrazione mai eseguita dal vivo — limite già disclosurato e accettato in Story 10.1/10.2/10.3; nessun test per la migrazione SQL — convenzione già stabilita; gestione futura ipotetica di un vincolo univoco non ancora esistente — speculativo; commento aggiornato in `ImportaGareForm.tsx` — pulizia di un riferimento morto necessaria, zero impatto comportamentale). Status: done.
