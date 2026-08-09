---
baseline_commit: 71f06278cbf5857463fc781f8a316c60b99059e5
---

# Story 16.1: Modello dati Sponsor e gestione Admin/Dirigente

Status: done

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

- [x] Task 1: Modello dati `Sponsor` (AC: #1, #2, #3, #4)
  - [x] `prisma/schema.prisma`: nuovo enum `TipoSponsor { BANNER CONVENZIONE }` e nuovo model `Sponsor`: `id`, `nome String`, `tipo TipoSponsor`, `descrizione String`, `linkEsterno String?`, `attiva Boolean @default(true)`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, `@@map("sponsor")`. Strutturale, no RLS (AD-9) — stesso trattamento di `Palestra`/`Gruppo`.
  - [x] Nuova migrazione (`CREATE TABLE`, nessuna `ENABLE ROW LEVEL SECURITY`, nessun `GRANT`) — mirror esatto dello stile già usato per `Palestra`/`Tesseramento` (tabelle strutturali senza FK verso tabelle RLS-protette).
- [x] Task 2: Storage immagine Sponsor (AC: #1, #2, #6)
  - [x] Nuovo bucket Storage **pubblico** `sponsor-banner` (migrazione dedicata, mirror di `logo-applicazione`, Story 7.2 — verificare la migrazione originale del bucket logo per lo statement esatto di creazione bucket pubblico).
  - [x] Nuovo file `lib/storage/sponsor.ts`: `caricaImmagineSponsor(supabase, sponsorId, file)` (path per-entità `{sponsorId}`, `upsert: true` — sostituisce fisicamente l'immagine precedente, stesso principio di `caricaLogo`) e `urlPubblicoImmagineSponsor(supabase, sponsorId)` (mirror di `urlPubblicoLogo`, deterministico). Riuso diretto (non riscrivere) di `MIME_AMMESSI`/`DIMENSIONE_MASSIMA_BYTE`/verifica magic-byte già definiti in `app/(configurazione)/logo/actions.ts` — estrarli in un helper condiviso se non già condivisibili, non duplicarli una terza volta (già presenti anche in `lib/storage/certificati.ts`).
- [x] Task 3: Server Action di gestione (AC: #1, #2, #3, #4, #5, #6)
  - [x] Nuovo file `app/(sponsor)/sponsor/actions.ts` (nuovo route group, coerente con la convenzione di raggruppamento tematico già in uso, es. `(configurazione)`, `(orari-palestre)`).
  - [x] `creaSponsor`, `aggiornaSponsor`, `disattivaSponsor`/`riattivaSponsor` (o un'unica `impostaAttivaSponsor(id, attiva)` — decidere in sviluppo quale sia più coerente con `disattivaIscrizione`/pattern esistenti). Tutte `requireRuolo(["ADMIN", "DIRIGENTE"])`.
  - [x] Stessa validazione immagine di `caricaLogoAction` (mirror, non reinventare): MIME allowlist, dimensione massima, verifica magic-byte.
- [x] Task 4: Pagina di gestione `/sponsor` (AC: #1, #2, #3, #4, #5)
  - [x] `app/(sponsor)/sponsor/page.tsx`: elenco Sponsor (attivi e disattivati, entrambi visibili qui a differenza della vetrina pubblica di Story 16.2), form "Nuovo Sponsor", per riga: modifica inline (nome/descrizione/link/immagine) + toggle attiva/disattiva.
  - [x] `lib/auth/route-guard.ts`: nuova voce `{ prefix: "/sponsor", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Sponsor" }` — **nota**: questa è la rotta di *gestione*; la rotta *pubblica* di Story 16.2 potrebbe essere la stessa `/sponsor` con contenuto condizionale per Ruolo, o una rotta distinta — decisione lasciata esplicitamente a Story 16.2 (dipendente da questa), non anticiparla qui.
- [x] Task 5: Test
  - [x] `lib/storage/sponsor.test.ts` (nuovo): upload/URL pubblico, mirror dei test esistenti per `logo.ts`.
  - [x] `app/(sponsor)/sponsor/actions.test.ts` (nuovo): FORBIDDEN per Ruoli non ammessi, validazione immagine (MIME/dimensione/magic-byte), creazione/modifica/disattivazione/riattivazione, INTERNAL su errori Prisma/Storage.
  - [x] `lib/auth/route-decision.test.ts` (esteso): nuova voce `/sponsor` verificata per Ruoli ammessi/respinti.
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

## Dev Notes

### Decisioni di analisi (2026-08-06, prese con l'utente — vedi `epics.md#Epic 16`)

- **Disattivazione, non cancellazione**: `attiva Boolean @default(true)`, stesso pattern di ogni altra entità di dominio in questo progetto — mai un hard-delete *lato utente* (nessuna Server Action di cancellazione esposta). Eccezione interna decisa in code review (2026-08-09): `creaSponsor` rimuove la riga appena creata se l'upload dell'immagine obbligatoria fallisce subito dopo — rollback di una creazione mai completata, non cancellazione di uno Sponsor esistente. Vedi commento su `model Sponsor` in `prisma/schema.prisma`.
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

## Review Findings

Code review con 3 layer adversariali paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) sul diff completo della story (contro il baseline `71f06278cbf5857463fc781f8a316c60b99059e5`).

**Acceptance Auditor**: nessuna violazione degli AC di comportamento — validazione immagine, obbligatorietà dell'immagine solo in creazione, toggle attiva/disattiva senza cancellazione, perimetro `requireRuolo(["ADMIN","DIRIGENTE"])` su rotta e Server Action tutti verificati corretti. Due problemi trovati fuori dagli AC stessi (vedi sotto).

- [x] [Review][Decision] La riga `Sponsor` viene rimossa (`prisma.sponsor.delete`) se l'upload dell'immagine fallisce subito dopo la creazione, come rollback best-effort — contraddice testualmente le Dev Notes ("mai un hard-delete"), che riguardavano però la cancellazione manuale da UI, non un rollback di una creazione mai completata dal punto di vista dell'utente (l'AC #1 richiede l'immagine obbligatoria: uno Sponsor senza immagine non è mai stato "creato" con successo). Trovato indipendentemente da Acceptance Auditor e Blind Hunter. **Deciso con l'utente (2026-08-09): mantenere il rollback** (nessuna riga orfana senza immagine visibile in gestione) — corretto il commento su `model Sponsor` in `prisma/schema.prisma` e le Dev Notes con un'eccezione esplicita ("mai hard-delete lato utente"). [app/(sponsor)/sponsor/actions.ts:121]

- [x] [Review][Patch] **Sicurezza**: tabella `sponsor` creata senza `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` né `REVOKE ALL ... FROM anon, authenticated` — riproduce esattamente il difetto delle 17 tabelle strutturali già scoperte esposte via PostgREST e corrette il 2026-08-04 (`20260804030000_fix_rls_disabled_public_tables`). Trovato indipendentemente da Acceptance Auditor e Blind Hunter. Corretto: aggiunti `ENABLE ROW LEVEL SECURITY` + `REVOKE ALL ... FROM anon, authenticated` alla migrazione di creazione (nessuna migrazione di fix separata, la tabella non è mai esistita in produzione). Commento su `model Sponsor` corretto di conseguenza. [prisma/migrations/20260809000000_add_sponsor/migration.sql]
- [x] [Review][Patch] **Sicurezza**: `linkEsterno` privo di validazione server-side dello schema — un valore `javascript:...`/`data:...` verrebbe salvato e reso come `href` cliccabile nella vetrina pubblica di Story 16.2. Stesso identico rischio già trovato e corretto in Story 10.8 (`linkFipavValido`). Trovato indipendentemente da Edge Case Hunter e Blind Hunter. Corretto: nuova funzione `linkEsternoValido` (mirror esatto di `linkFipavValido` — schema http/https obbligatorio via `new URL()`, limite 500 caratteri), 4 nuovi test. [app/(sponsor)/sponsor/actions.ts:29]
- [x] [Review][Patch] `impostaAttivaSponsor` tratta qualunque valore di `attiva` diverso da `"true"` (incluso mancante/malformato) come `false` invece di validarlo esplicitamente — una richiesta manomessa disattiva silenziosamente uno Sponsor senza errore. Trovato indipendentemente da Edge Case Hunter e Blind Hunter. Corretto: validazione esplicita (`"true"`/`"false"` obbligatori, altrimenti `VALIDATION`), 5 nuovi test. [app/(sponsor)/sponsor/actions.ts:201]
- [x] [Review][Patch] Nessun limite di lunghezza massima su `nome`/`descrizione` — campi `TEXT` non vincolati, poi resi in una vetrina pubblica (Story 16.2). Trovato dal Blind Hunter. Corretto: `LUNGHEZZA_MASSIMA_NOME` (100) e `LUNGHEZZA_MASSIMA_DESCRIZIONE` (1000), stesso principio di `LUNGHEZZA_MASSIMA_NOME_SETTORE`/`LUNGHEZZA_MASSIMA_LINK_FIPAV`, 2 nuovi test. [app/(sponsor)/sponsor/actions.ts:25-32]

- [x] [Review][Defer] Nessun controllo che i valori di `FormData` (`nome`/`descrizione`/`linkEsterno`) siano effettivamente stringhe (un campo `File` verrebbe stringificato e persistito come `"[object File]"`) — pattern identico e già accettato in ogni Server Action del progetto fin da Story 1.1/2.1 (Edge Case Hunter). Deferred: stesso rischio basso già accettato ripetutamente, non introdotto da questa storia. [app/(sponsor)/sponsor/actions.ts:25]
- [x] [Review][Defer] Se sia l'upload dell'immagine sia il `delete` di compensazione in `creaSponsor` falliscono, la riga resta orfana senza immagine (Edge Case Hunter + Blind Hunter, trovato indipendentemente da entrambi). Deferred: stesso principio "nessun rollback automatico"/doppio-fallimento già accettato ripetutamente (Story 4.1); esito finale dipende comunque dalla decisione sul finding [Review][Decision] sopra. [app/(sponsor)/sponsor/actions.ts:118-128]
- [x] [Review][Defer] `SponsorRow`: nessun fallback `onError` sull'`<img>` se l'immagine risultasse 404 (Edge Case Hunter). Deferred: stesso livello di rifinitura UI già accettato altrove nel progetto (nessuna pagina ha mai un fallback `onError` su immagini). [app/(sponsor)/sponsor/SponsorRow.tsx:45]
- [x] [Review][Defer] Policy SELECT del bucket `sponsor-banner` ristretta ad ADMIN/DIRIGENTE — se la vetrina pubblica di Story 16.2 dovesse mai usare `list()`/metadati invece di `getPublicUrl()` diretto (come fa oggi questa storia), servirebbe una policy SELECT pubblica aggiuntiva, stesso bug già risolto in due passaggi per il bucket logo (Story 7.2) (Blind Hunter). Deferred: nessun codice oggi è bloccato da questo — nota lasciata esplicitamente per l'apertura di Story 16.2. [prisma/migrations/20260809010000_add_sponsor_banner_bucket/migration.sql]
- [x] [Review][Defer] `aggiornaSponsor`: se l'aggiornamento testo riesce ma il nuovo upload immagine fallisce, l'utente vede solo l'errore immagine senza sapere che gli altri campi sono comunque stati salvati (Blind Hunter). Deferred: stessa categoria di nuance di messaggistica su aggiornamento parziale già accettata altrove nel progetto (es. Story 9.33 round 4, "pending non coordinato"), nessun AC la richiede. [app/(sponsor)/sponsor/actions.ts:170-181]
- [x] [Review][Defer] Nessun controllo di unicità sul nome dello Sponsor (Blind Hunter). Deferred: nessun AC lo richiede, stesso trattamento già accettato per `Palestra.nome` (nessun vincolo di unicità). [app/(sponsor)/sponsor/actions.ts]
- [x] [Review][Defer] Limiti immagine (2MB, PNG/JPEG) duplicati a mano tra `lib/storage/validazione-immagine.ts` (TS) e la migrazione SQL del bucket (`file_size_limit`/`allowed_mime_types`) (Blind Hunter). Deferred: stesso pattern preesistente e mai unificato già presente identico per il bucket logo, non introdotto da questa storia. [lib/storage/validazione-immagine.ts, prisma/migrations/20260809010000_add_sponsor_banner_bucket/migration.sql]

**Dismessi come rumore/convenzioni già accettate (4)**: nessuna validazione dell'`id` prima della chiamata Prisma in `aggiornaSponsor`/`impostaAttivaSponsor` (Blind Hunter) — Prisma lancia `P2025` per un id inesistente, già catturato dal blocco `catch` generico, stesso pattern esplicitamente accettato per `aggiornaPalestra`; nessun null-guard su `urlPubblicoImmagineSponsor`/`getPublicUrl` (Blind Hunter) — mirror esatto di `urlPubblicoLogo`, mai flaggato in nessuna review precedente, la firma del SDK garantisce sempre `{ data: { publicUrl } }`; `INSERT ... ON CONFLICT (id) DO NOTHING` sul bucket (Edge Case Hunter) — stesso pattern identico già in uso per il bucket logo, nessun percorso di innesco realistico per un bucket mai esistito prima; duplicazione del CSS (`sponsor.module.css`) rispetto a `palestre.module.css`/`gruppi.module.css` (Blind Hunter) — convenzione esplicita e deliberata di questo progetto (ogni route group ha il proprio CSS module, mai condiviso), non un difetto.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

Nessuno - nessun blocco incontrato. Build di produzione mostra un errore `PrismaClientKnownRequestError`/`ERR_UNKNOWN_FILE_EXTENSION` sul motore Prisma WASM durante il tentativo di prerendering statico di una pagina che legge `ConfigurazioneApplicazione` - limite noto e preesistente del sandbox (nessun accesso reale al motore WASM da Node in questo ambiente, stesso limite già documentato per Story 13.1 estensione), non introdotto da questa story e non relativo a `Sponsor`. La build completa comunque con successo (tutte le route, incluso `/sponsor`, presenti nell'elenco finale).

### Completion Notes List

- Modello dati `Sponsor` (enum `TipoSponsor`, model strutturale no-RLS AD-9) aggiunto a `prisma/schema.prisma` + migrazione scritta a mano (nessun accesso DB nel sandbox, stesso limite già noto da Story 12.4/13.1). `npx prisma generate` eseguito con successo per aggiornare il client.
- Bucket Storage pubblico `sponsor-banner` (path per-entità = id Sponsor) con policy RLS SELECT/INSERT/UPDATE ADMIN|DIRIGENTE su `storage.objects` - nessuna policy DELETE (mai un hard-delete). Applicata subito la lezione della Story 7.2 (policy SELECT necessaria anche per un bucket pubblico, per l'existence-check di `upload(..., {upsert:true})`), senza bisogno di una migrazione correttiva separata.
- Validazione immagine (`MIME_AMMESSI`/`DIMENSIONE_MASSIMA_BYTE`/verifica magic-byte) estratta da `app/(configurazione)/logo/actions.ts` in un nuovo helper condiviso `lib/storage/validazione-immagine.ts`, riusato sia da `/logo` (refactor, comportamento invariato) sia da `/sponsor` - non duplicata una terza volta, come richiesto dalle Dev Notes.
- Server Action `creaSponsor`/`aggiornaSponsor`/`impostaAttivaSponsor` (toggle unico bidirezionale, scelto come soluzione più semplice per il punto aperto della story). `creaSponsor`: la riga Sponsor viene creata prima dell'upload (serve il suo id per il path per-entità) - se l'upload dell'immagine fallisce, la riga viene rimossa best-effort invece di restare orfana senza immagine (decisione presa in sviluppo, non nella story originale: a differenza di logo/certificati, uno Sponsor senza immagine romperebbe la vetrina pubblica in modo permanente).
- Pagina di gestione `/sponsor` (form creazione + elenco con modifica inline e toggle attiva/disattiva, mirror di `/palestre`), nuova voce in `lib/auth/route-guard.ts` (nessun "gruppo": voce diretta, non fa parte di "Accounting").
- Test aggiunti: `lib/storage/sponsor.test.ts`, `app/(sponsor)/sponsor/actions.test.ts`, estensione di `lib/auth/route-decision.test.ts` e `lib/auth/voci-navigazione.test.ts` (aggiornato il test di ordine completo per Admin con la nuova voce diretta `/sponsor`). 997/997 test Vitest passati (era 961), 0 errori tsc/eslint (unico errore lint preesistente in `wizard-nuova-stagione/page.tsx`, non toccato), build produzione riuscita.
- Verifica dal vivo (creazione/modifica/upload reale su Supabase Storage) non eseguibile in questo sandbox (nessun accesso DB/Storage reale) - demandata all'utente dopo il deploy, stesso limite già accettato per le story precedenti con migrazioni scritte a mano.

### File List

- `prisma/schema.prisma` (modificato: enum `TipoSponsor` + model `Sponsor`)
- `prisma/migrations/20260809000000_add_sponsor/migration.sql` (nuovo)
- `prisma/migrations/20260809010000_add_sponsor_banner_bucket/migration.sql` (nuovo)
- `lib/storage/validazione-immagine.ts` (nuovo)
- `lib/storage/sponsor.ts` (nuovo)
- `lib/storage/sponsor.test.ts` (nuovo)
- `app/(configurazione)/logo/actions.ts` (modificato: refactor per usare `lib/storage/validazione-immagine.ts`)
- `app/(configurazione)/logo/actions.test.ts` (modificato: mock `server-only` aggiunto)
- `app/(sponsor)/sponsor/actions.ts` (nuovo)
- `app/(sponsor)/sponsor/actions.test.ts` (nuovo)
- `app/(sponsor)/sponsor/page.tsx` (nuovo)
- `app/(sponsor)/sponsor/NuovoSponsorForm.tsx` (nuovo)
- `app/(sponsor)/sponsor/SponsorRow.tsx` (nuovo)
- `app/(sponsor)/sponsor/sponsor.module.css` (nuovo)
- `lib/auth/route-guard.ts` (modificato: nuova voce `/sponsor`)
- `lib/auth/route-decision.test.ts` (modificato: nuovi test `/sponsor`)
- `lib/auth/voci-navigazione.test.ts` (modificato: nuova voce `/sponsor` nel test di ordine completo Admin)

## Change Log

- 2026-08-06: File di story creato, stato ready-for-dev.
- 2026-08-09: Implementata - modello dati Sponsor, storage bucket pubblico per-entità, Server Action di gestione, pagina `/sponsor`. 997/997 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: review.
- 2026-08-09: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor) - 1 decision (risolta con l'utente: mantenuto il rollback di `creaSponsor` come eccezione esplicita al principio "mai hard-delete", corretti i commenti), 4 patch applicati (RLS/REVOKE mancanti sulla tabella `sponsor` - stesso difetto delle 17 tabelle corrette il 2026-08-04; `linkEsterno` senza validazione server-side - mirror di `linkFipavValido`, Story 10.8; `impostaAttivaSponsor` senza validazione esplicita del campo `attiva`; nessun limite di lunghezza su nome/descrizione), 7 defer, 4 dismessi come rumore/convenzioni già accettate. 1008/1008 test Vitest passati (era 997), 0 errori tsc/eslint, build produzione riuscita. Epic 16: 1 storia su 2 done (16.2 vetrina pubblica + voucher ancora in backlog, dipendente da questa). Status: done.
