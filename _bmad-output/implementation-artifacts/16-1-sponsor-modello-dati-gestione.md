---
baseline_commit: 71f06278cbf5857463fc781f8a316c60b99059e5
---

# Story 16.1: Modello dati Sponsor e gestione Admin/Dirigente

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente,
I want inserire, modificare e disattivare Sponsor (banner pubblicitari o convenzioni) con immagine e descrizione,
so that possa tenere aggiornata la vetrina visibile a tutta la società senza intervenire sul database.

## Acceptance Criteria

1. **Given** un Admin o Dirigente su `/sponsor` **When** compila nome, tipo, descrizione, carica un'immagine (PNG/JPEG, stesso limite 2MB/magic-byte di `/logo`) e opzionalmente un link esterno **Then** il nuovo Sponsor viene creato e compare nell'elenco di gestione, attivo di default.
2. **Given** un Sponsor esistente **When** l'Admin/Dirigente ne modifica nome/descrizione/link (con o senza sostituire l'immagine) **Then** i nuovi valori sono salvati, l'immagine precedente viene sostituita solo se ne viene caricata una nuova.
3. **Given** un Sponsor attivo **When** l'Admin/Dirigente lo disattiva **Then** `attiva` passa a `false` — nessuna cancellazione della riga né dell'immagine nel bucket.
4. **And** un Sponsor disattivato può essere riattivato dallo stesso pannello di gestione.
5. **And** solo Admin/Dirigente possono accedere a `/sponsor` in gestione e invocare le Server Action di creazione/modifica/disattivazione (`requireRuolo(["ADMIN", "DIRIGENTE"])`, stesso perimetro di `/palestre`).
6. **And** stessa validazione immagine di `/logo` (Story 8.7): tipo MIME nell'allowlist, dimensione massima 2MB, contenuto verificato via magic byte (mai fidarsi solo dell'attributo `accept` lato client).

## Tasks / Subtasks

- [ ] Task 1: Modello dati `Sponsor` (AC: #1, #2, #3, #4)
  - [ ] `prisma/schema.prisma`: nuovo enum `TipoSponsor { BANNER CONVENZIONE }` e nuovo model `Sponsor`: `id`, `nome String`, `tipo TipoSponsor`, `descrizione String`, `linkEsterno String?`, `attiva Boolean @default(true)`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, `@@map("sponsor")`. Strutturale, no RLS (AD-9) — stesso trattamento di `Palestra`/`Gruppo`.
  - [ ] Nuova migrazione (`CREATE TABLE`, nessuna `ENABLE ROW LEVEL SECURITY`, nessun `GRANT`) — mirror esatto dello stile già usato per `Palestra`/`Tesseramento` (tabelle strutturali senza FK verso tabelle RLS-protette).
- [ ] Task 2: Storage immagine Sponsor (AC: #1, #2, #6)
  - [ ] Nuovo bucket Storage **pubblico** `sponsor-banner` (migrazione dedicata, mirror di `logo-applicazione`, Story 7.2 — verificare la migrazione originale del bucket logo per lo statement esatto di creazione bucket pubblico).
  - [ ] Nuovo file `lib/storage/sponsor.ts`: `caricaImmagineSponsor(supabase, sponsorId, file)` (path per-entità `{sponsorId}`, `upsert: true` — sostituisce fisicamente l'immagine precedente, stesso principio di `caricaLogo`) e `urlPubblicoImmagineSponsor(supabase, sponsorId)` (mirror di `urlPubblicoLogo`, deterministico). Riuso diretto (non riscrivere) di `MIME_AMMESSI`/`DIMENSIONE_MASSIMA_BYTE`/verifica magic-byte già definiti in `app/(configurazione)/logo/actions.ts` — estrarli in un helper condiviso se non già condivisibili, non duplicarli una terza volta (già presenti anche in `lib/storage/certificati.ts`).
- [ ] Task 3: Server Action di gestione (AC: #1, #2, #3, #4, #5, #6)
  - [ ] Nuovo file `app/(sponsor)/sponsor/actions.ts` (nuovo route group, coerente con la convenzione di raggruppamento tematico già in uso, es. `(configurazione)`, `(orari-palestre)`).
  - [ ] `creaSponsor`, `aggiornaSponsor`, `disattivaSponsor`/`riattivaSponsor` (o un'unica `impostaAttivaSponsor(id, attiva)` — decidere in sviluppo quale sia più coerente con `disattivaIscrizione`/pattern esistenti). Tutte `requireRuolo(["ADMIN", "DIRIGENTE"])`.
  - [ ] Stessa validazione immagine di `caricaLogoAction` (mirror, non reinventare): MIME allowlist, dimensione massima, verifica magic-byte.
- [ ] Task 4: Pagina di gestione `/sponsor` (AC: #1, #2, #3, #4, #5)
  - [ ] `app/(sponsor)/sponsor/page.tsx`: elenco Sponsor (attivi e disattivati, entrambi visibili qui a differenza della vetrina pubblica di Story 16.2), form "Nuovo Sponsor", per riga: modifica inline (nome/descrizione/link/immagine) + toggle attiva/disattiva.
  - [ ] `lib/auth/route-guard.ts`: nuova voce `{ prefix: "/sponsor", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Sponsor" }` — **nota**: questa è la rotta di *gestione*; la rotta *pubblica* di Story 16.2 potrebbe essere la stessa `/sponsor` con contenuto condizionale per Ruolo, o una rotta distinta — decisione lasciata esplicitamente a Story 16.2 (dipendente da questa), non anticiparla qui.
- [ ] Task 5: Test
  - [ ] `lib/storage/sponsor.test.ts` (nuovo): upload/URL pubblico, mirror dei test esistenti per `logo.ts`.
  - [ ] `app/(sponsor)/sponsor/actions.test.ts` (nuovo): FORBIDDEN per Ruoli non ammessi, validazione immagine (MIME/dimensione/magic-byte), creazione/modifica/disattivazione/riattivazione, INTERNAL su errori Prisma/Storage.
  - [ ] `lib/auth/route-decision.test.ts` (esteso): nuova voce `/sponsor` verificata per Ruoli ammessi/respinti.
  - [ ] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

## Dev Notes

### Decisioni di analisi (2026-08-06, prese con l'utente — vedi `epics.md#Epic 16`)

- **Disattivazione, non cancellazione**: `attiva Boolean @default(true)`, stesso pattern di ogni altra entità di dominio in questo progetto — mai un hard-delete.
- **Storage pubblico**: bucket `sponsor-banner` pubblico (come `logo-applicazione`), non privato/RLS come `certificati-medici` — i banner sponsor sono pubblicitari per natura, nessuna riservatezza.
- **Un solo model per entrambi i tipi**: `Sponsor.tipo` (`BANNER`/`CONVENZIONE`) distingue il comportamento in Story 16.2 (voucher disponibile solo per `CONVENZIONE`), non la struttura dati — stessi campi per entrambi i tipi.

### Pattern da riusare (non reinventare)

- **Upload immagine con validazione**: mirror di `caricaLogoAction`/`contenutoCorrispondeAlMimeDichiarato` (`app/(configurazione)/logo/actions.ts`, letto per intero in fase di analisi) — stessa allowlist MIME (PNG/JPEG), stesso limite 2MB, stessa verifica magic-byte a 8/3 byte.
- **Storage pubblico per-entità**: `lib/storage/logo.ts` per il pattern "bucket pubblico, `getPublicUrl` deterministico" ma con path fisso; `lib/storage/certificati.ts` per il pattern "path per-entità" ma bucket privato/RLS. Questa storia combina i due: pubblico + per-entità (path `{sponsorId}`, non un path fisso come logo, non privato come certificati).
- **Entità strutturale senza RLS**: mirror di `Palestra`/`Tesseramento` per la migrazione (nessuna `ENABLE ROW LEVEL SECURITY`, nessun `GRANT`) e per lo stile delle Server Action (`requireRuolo` → validazione → `prisma.sponsor.X` → `INTERNAL` generico → `revalidatePath`).

### Punto aperto — nome delle Server Action di attivazione/disattivazione

Da decidere in sviluppo: due funzioni separate (`disattivaSponsor`/`riattivaSponsor`, mirror di `disattivaIscrizione`) o una sola `impostaAttivaSponsor(id, attiva: boolean)`. Nessun precedente diretto nel progetto per un toggle bidirezionale sulla stessa entità (le altre entità "disattivabili" — es. `Iscrizione` — hanno solo una direzione, la riattivazione avviene implicitamente tramite `inserisciIscrizione` idempotente, non una funzione dedicata "riattiva"). Scegliere la soluzione più semplice, non bloccare lo sviluppo su questo dettaglio.

### Riferimenti

- [Source: app/(configurazione)/logo/actions.ts] — validazione immagine da mirrorare esattamente (MIME/dimensione/magic-byte).
- [Source: lib/storage/logo.ts] — pattern bucket pubblico.
- [Source: lib/storage/certificati.ts] — pattern path per-entità (bucket diverso, privato — solo lo schema del path è da mirrorare).
- [Source: app/(orari-palestre)/palestre/actions.ts] — stile Server Action create/update per entità strutturale.
- [Source: lib/db-rls/iscrizione.ts, disattivaIscrizione] — pattern di riferimento per un flag `attiva` toggle (una sola direzione lì, verificare se applicabile).
- [Source: epics.md#Epic 16: Sponsor e Convenzioni] — decisioni di analisi complete, testo originale della richiesta utente.

### Project Structure Notes

- Nuovo route group `app/(sponsor)/` — nessun gruppo tematico esistente adatto.
- Nuovi file: `prisma/migrations/<timestamp>_add_sponsor/migration.sql`, `prisma/migrations/<timestamp>_add_bucket_sponsor_banner/migration.sql`, `lib/storage/sponsor.ts`, `app/(sponsor)/sponsor/actions.ts`, `app/(sponsor)/sponsor/page.tsx` (+ eventuali componenti riga/form).
- Modificati: `prisma/schema.prisma`, `lib/auth/route-guard.ts`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-08-06: File di story creato, stato ready-for-dev.
