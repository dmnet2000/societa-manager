---
baseline_commit: 71f06278cbf5857463fc781f8a316c60b99059e5
---

# Story 10.8: Modifica nome Campionato e link al portale FIPAV

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore del proprio Gruppo (o Admin/Dirigente),
I want poter correggere il nome di un Campionato già creato e collegarci il link al portale FIPAV/Lega Pallavolo di quel girone,
so that possa sistemare un nome inserito male senza cancellare e ricreare il Campionato (perdendo le Partite importate), e chiunque acceda a `/campionati`/`/partite` possa consultare rapidamente la fonte federale ufficiale.

## Acceptance Criteria

1. **Given** un Allenatore (del proprio Gruppo) o Admin/Dirigente su `/campionati` **When** modifica nome e/o link FIPAV di un Campionato esistente **Then** i nuovi valori sono salvati e visibili senza reload.
2. **And** il nome resta obbligatorio (stesso vincolo di `creaCampionato`) — un nome vuoto viene rifiutato con un messaggio chiaro, nessuna scrittura.
3. **And** il link FIPAV è opzionale — può essere lasciato vuoto (Campionato senza link) o rimosso da un Campionato che ne aveva già uno.
4. **And** stesso perimetro di autorizzazione di `creaCampionato`/`cancellaCampionato` (Allenatore limitato al proprio Gruppo tramite `risolviPossessoGruppo`, Admin/Dirigente ad accesso ampio) — nessuna modifica al modello di autorizzazione esistente.
5. **And** nessuna regressione sull'import gare (Story 10.2) né sulla cancellazione (Story 10.6) — il nome resta la chiave usata per il controllo di coerenza con la colonna `Campionato` del file Excel importato (invariato).

## Tasks / Subtasks

- [ ] Task 1: Campo `linkFipav` su `Campionato` (AC: #1, #3)
  - [ ] `prisma/schema.prisma`, model `Campionato`: aggiungere `linkFipav String?` (nullable, testo libero — stesso principio di `Palestra.indirizzo`, nessuna validazione di dominio specifica).
  - [ ] Nuova migrazione (`ALTER TABLE "campionati" ADD COLUMN "linkFipav" TEXT;`) — nessuna RLS/GRANT da toccare, `Campionato` è già strutturale/no-RLS (AD-9).
- [ ] Task 2: Server Action `aggiornaCampionato` (AC: #1, #2, #3, #4)
  - [ ] In `app/(partite-campionati)/campionati/actions.ts`, nuova funzione `aggiornaCampionato(_prevState, formData)` — mirror di `aggiornaPalestra` (`app/(orari-palestre)/palestre/actions.ts:111-146`) per lo stile Server Action di update (`requireRuolo` → validazione → `prisma.campionato.update` → `INTERNAL` generico → `revalidatePath`), ma con lo **stesso perimetro di autorizzazione già esistente in `creaCampionato`** (leggere quella funzione per intero prima di scrivere: Allenatore ammesso solo sul proprio Gruppo via `risolviPossessoGruppo`/`autorizzazione.ts`, Admin/Dirigente ad accesso ampio) — non copiare il perimetro Admin/Dirigente-only di `aggiornaPalestra`, che è un caso diverso.
  - [ ] Legge `id`/`nome`/`linkFipav` da `formData`; `nome` trim + obbligatorio (stesso messaggio di `creaCampionato`); `linkFipav` trim, stringa vuota → `null` (stesso principio "vuoto rimuove il valore" di `salvaNomeSettoreAction`/`aggiornaAllenatore`).
  - [ ] `prisma.campionato.update({ where: { id }, data: { nome, linkFipav } })`, `revalidatePath("/campionati")`.
- [ ] Task 3: UI su `/campionati` (AC: #1)
  - [ ] Decidere in apertura sviluppo (punto lasciato aperto in `epics.md`): toggle sola-lettura/modifica inline sul `<li>` esistente (coerente con `ImportaGareForm`/`EliminaCampionatoForm` già annidati lì, probabile scelta più semplice) oppure pattern "riga tabellare + icone" di `SlotRow.tsx`/`AllenatoreRow.tsx` (Story 15.5/9.30) — la lista Campionati oggi non è una tabella, valutare l'impatto prima di introdurne una solo per questa storia.
  - [ ] Nuovo form/componente (nome da definire in sviluppo, es. `ModificaCampionatoForm.tsx`) accanto a `ImportaGareForm`/`EliminaCampionatoForm` nello stesso `<li>` (`page.tsx:87-97`).
- [ ] Task 4: Test
  - [ ] `app/(partite-campionati)/campionati/actions.test.ts` (esteso): stesso schema di casi già coperto da `creaCampionato` per l'autorizzazione (Admin/Dirigente ad accesso ampio, Allenatore solo sul proprio Gruppo, Allenatore su Gruppo altrui respinto), più VALIDATION su nome vuoto, successo con `linkFipav` valorizzato/vuoto/rimosso, INTERNAL su errore Prisma.
  - [ ] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

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

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-08-06: File di story creato, stato ready-for-dev.
