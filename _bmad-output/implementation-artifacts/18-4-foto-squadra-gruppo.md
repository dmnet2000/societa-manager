---
baseline_commit: 964c32b
---

# Story 18.4: Foto di squadra per Gruppo

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin, Dirigente o Allenatore di un Gruppo,
I want caricare una foto di squadra per il mio Gruppo,
so that compaia sulla home pubblica del sito.

## Acceptance Criteria

1. **Given** un Admin, Dirigente, o Allenatore assegnato al Gruppo **When** carica un'immagine come foto di squadra per quel Gruppo **Then** l'immagine viene salvata e sostituisce quella precedente se già presente (stessa validazione MIME/dimensione/magic-byte già in uso per logo/Sponsor).
2. **And** un Allenatore non può caricare la foto di squadra di un Gruppo a cui non è assegnato.
3. **Given** un Visitatore senza sessione **When** visita la home pubblica **Then** vede le foto di squadra dei Gruppi che ne hanno caricata una (nessun placeholder per i Gruppi senza foto).

## Tasks / Subtasks

- [x] Task 1: Bucket Storage pubblico + RLS (AC: #1, #2, #3)
  - [x] Nuova migrazione `prisma/migrations/<timestamp>_add_foto_squadra_bucket/migration.sql`: bucket **pubblico** `foto-squadra-gruppo` (mirror di `sponsor-banner`, Story 16.1 — `public: true`, `file_size_limit: 2097152`, `allowed_mime_types: ['image/png','image/jpeg']`), **nessuna nuova colonna Prisma su `Gruppo`** (esistenza + `updatedAt` derivati da Storage `list()`, stesso principio di `leggiInfoLogo`/`esisteFotoProfilo`, non un flag DB).
  - [x] Path per-entità **piatto**: il nome oggetto è direttamente il `gruppoId`, nessuna sottocartella — stessa convenzione di `sponsor-banner` (`sponsorId` come path), **diversa** da `foto-profilo-*` (`{entitaId}/foto`, nidificato). Questo cambia come le policy leggono l'id nella Task successiva: `name` diretto, non `(storage.foldername(name))[1]`.
  - [x] Nuova funzione SQL `utente_possiede_gruppo(gruppo_id_param TEXT)` (`SECURITY DEFINER`, `STABLE`, `search_path = public`) — mirror esatto di `utente_possiede_allenatore` (`20260728000000_add_foto_profilo/migration.sql`), ma con un JOIN in più: `gruppo_allenatori` → `allenatori` → `utenti` su `utenti.supabaseAuthId = auth.uid()::text` filtrando `gruppo_allenatori.gruppoId = gruppo_id_param`. `REVOKE EXECUTE ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated` (stesso pattern, mai omesso).
  - [x] Policy **SELECT pubblica** (`USING (bucket_id = 'foto-squadra-gruppo')`, nessuna condizione di Ruolo) — **non opzionale**: la home pubblica (`app/page.tsx`) chiama `storage....list()` da anonimo per sapere quali Gruppi hanno una foto, e `list()` passa da RLS (a differenza del GET diretto sull'endpoint pubblico dell'oggetto, che la bypassa). Dimenticare questa policy riproduce esattamente il bug già commesso e corretto due volte per il bucket logo (`20260718080000_logo_bucket_fix_select_policy`, poi `20260725020000_logo_bucket_public_select_policy` per allargarla al pubblico non autenticato) — qui va scritta bene la prima volta.
  - [x] Policy **INSERT** e **UPDATE** (upsert:true richiede entrambe, stessa lezione di `20260718090000_logo_bucket_restrict_path`): `bucket_id = 'foto-squadra-gruppo' AND ( (auth.jwt()->'app_metadata'->'ruoli') ?| array['ADMIN','DIRIGENTE'] OR ( (auth.jwt()->'app_metadata'->'ruoli') ? 'ALLENATORE' AND utente_possiede_gruppo(name) ) )` — nota `utente_possiede_gruppo(name)`, non `(storage.foldername(name))[1]`, per il path piatto scelto sopra.

- [x] Task 2: Modulo Storage `lib/storage/foto-squadra.ts` (AC: #1, #3)
  - [x] `caricaFotoSquadra(supabase, gruppoId, file)`: mirror 1:1 di `caricaImmagineSponsor` (`lib/storage/sponsor.ts`) — `.upload(gruppoId, file, { upsert: true, contentType: file.type })`.
  - [x] `urlPubblicoFotoSquadra(supabase, gruppoId)`: mirror di `urlPubblicoImmagineSponsor` — `getPublicUrl(gruppoId)`, nessun URL firmato (bucket pubblico).
  - [x] `leggiInfoFotoSquadra(supabase, gruppoId): Promise<{ esiste: boolean; aggiornatoIl: string | null }>`: mirror di `leggiInfoLogo` (`lib/storage/logo.ts`), usata dai form di upload per-Gruppo (Task 4) per mostrare l'anteprima/stato corrente.
  - [x] `elencaGruppiConFoto(supabase): Promise<Map<string, string | null>>`: **una sola** chiamata `list("")` sull'intero bucket (non N chiamate `list()` per-Gruppo) — restituisce una Map `gruppoId -> updated_at`, usata dalla home pubblica (Task 5) per sapere quali Gruppi della stagione corrente hanno una foto senza N round-trip verso Storage. Nessun precedente diretto nel progetto per un "elenco bulk di esistenza" multi-entità (Sponsor/logo sono singleton o hanno l'esistenza garantita alla creazione) — prima occorrenza di questo problema, funzione nuova.
  - [x] Riusare `MIME_AMMESSI_IMMAGINE`/`DIMENSIONE_MASSIMA_IMMAGINE_BYTE`/`contenutoCorrispondeAlMimeImmagine` da `lib/storage/validazione-immagine.ts` — **non** una terza dichiarazione dell'allowlist (il commento in quel file avverte esplicitamente contro una terza duplicazione).

- [x] Task 3: Server Action `caricaFotoSquadraAction` (AC: #1, #2)
  - [x] Aggiunta a `app/app/(gruppi-allenatori)/gruppi/actions.ts` (**stesso modulo** di `risolviPossessoGruppo`, non importata da un altro modulo — principio AD-2 già applicato lì: un helper di un modulo non si condivide fuori, si mantiene una copia locale/nello stesso file se serve altrove nello stesso modulo `(gruppi-allenatori)`).
  - [x] Stessa identica sequenza a 3 passi già stabilita per `assegnaAtleta`/`rimuoviAtleta`/`creaEAssegnaAtleta` nello stesso file: `requireRuolo(["ADMIN","DIRIGENTE","ALLENATORE"])` → risolvere `gruppo.annoAgonisticoId` (`prisma.gruppo.findUnique({ select: { annoAgonisticoId: true } })`) → `risolviPossessoGruppo(gruppoId, annoAgonisticoId)`, early-return `{ error: possesso.error }` se non ok (AC #2: un Allenatore non assegnato o di una stagione diversa da quella corrente riceve `NON_GESTISCE_GRUPPO`/`FORBIDDEN`, stesso comportamento già testato per assegna/rimuovi Atleta).
  - [x] Validazione immagine: stessi 4 controlli in sequenza già estratti in `validaImmagine()` di `app/app/(sponsor)/sponsor/actions.ts` (istanza File non vuota → allowlist MIME → dimensione massima → contenuto/magic-byte) — replicare lo stesso helper locale (o promuoverlo a `lib/storage/validazione-immagine.ts` se si preferisce eliminare la duplicazione già esistente tra `sponsor/actions.ts` e `logo/actions.ts`; non obbligatorio per questa storia, a discrezione dello sviluppo).
  - [x] Nessun rollback da gestire (a differenza di `creaSponsor`): il Gruppo esiste già indipendentemente dalla foto, stesso principio di `aggiornaSponsor`/`caricaLogoAction` (upload sempre opzionale su un'entità che vive di suo).
  - [x] `revalidatePath("/app/gruppi")` e `revalidatePath("/app/i-miei-gruppi")` al successo (entrambe le pagine che mostrano lo stato della foto) — la home pubblica `"/"` è già `force-dynamic` (Story 18.1), nessun `revalidatePath` necessario lì.

- [x] Task 4: UI di upload per Admin/Dirigente e Allenatore (AC: #1, #2)
  - [x] `app/app/(gruppi-allenatori)/gruppi/page.tsx`: risolvere `leggiInfoFotoSquadra` per ogni Gruppo (`Promise.all` sui Gruppi già caricati, o riusare `elencaGruppiConFoto` una sola volta invece di N chiamate — preferibile, stesso motivo di efficienza della Task 2) e passare l'informazione a `GruppoRow.tsx`.
  - [x] `GruppoRow.tsx`: nuovo blocco (nuova `<tr colSpan={2}>`, stesso pattern già usato per `.rigaAtlete`/`.rigaAllenatori`) con form di upload (`useActionState` + `useRef` per il reset del file input dopo successo, stesso pattern già ripetuto 3 volte in questo file) + anteprima della foto corrente se presente (`<img>`, cache-busting `?v=` sull'`aggiornatoIl`, stesso principio già in uso per il logo in `app/page.tsx`).
  - [x] `app/app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` + `MioGruppoCard.tsx`: stesso blocco di upload, stesso principio di riuso diretto già applicato in questo file per altri pattern condivisi con `gruppi/page.tsx` (query di scoping "solo i miei Gruppi" già esistente, invariata).
  - [x] Nessuna funzionalità di rimozione della foto richiesta da alcun AC — solo upload/sostituzione.

- [x] Task 5: Sezione "Foto di squadra" in home pubblica (AC: #3)
  - [x] `app/page.tsx`: nuova query Gruppi scoped alla stagione corrente — `trovaAnnoAgonisticoCorrente()` (sola lettura, **mai** `risolviAnnoAgonisticoCorrente`, stesso vincolo già rispettato in Story 18.3/`/app/gruppi`) + `prisma.gruppo.findMany({ where: { annoAgonisticoId: annoCorrente.id }, select: { id: true, nome: true } })` (AD-8, stesso filtro di `/app/gruppi` — senza, un Gruppo di una stagione passata con una foto mai ripulita da Storage comparirebbe ancora in home).
  - [x] `elencaGruppiConFoto(supabase)` (Task 2) per sapere quali di quei Gruppi hanno una foto; filtrare l'elenco ai soli Gruppi presenti nella Map (AC #3, "nessun placeholder") prima di renderizzare.
  - [x] Sezione condizionale (`mostraFotoSquadra = gruppiConFoto.length > 0`), stesso principio già stabilito per `mostraSponsor`/`mostraPartite` (Story 18.2/18.3) — nessuna area vuota se zero Gruppi hanno una foto.
  - [x] Griglia di card, stesso idioma già stabilito in `app/home-pubblica.module.css` (`repeat(auto-fill, minmax(_px,1fr))`, `.titoloSezione` per l'intestazione, `aria-labelledby` invece di `aria-label` ridondante — review fix già applicato in Story 18.3, da riprodurre qui fin da subito invece di re-introdurre la stessa imperfezione).
  - [x] Cache-busting `?v=${encodeURIComponent(aggiornatoIl ?? "")}` sull'`<img src>` di ogni foto (stesso principio del logo — qui la sostituzione è un AC esplicito, a differenza del banner Sponsor che oggi non ce l'ha, Story 18.2, non toccare quel file in questa storia).
  - [x] Aggiornare il paragrafo statico "in arrivo" nell'hero (`app/page.tsx`, già segnalato in un commento lasciato apposta dalla Story 18.2/18.3): rimuovere "le foto delle squadre" dall'elenco, stesso trattamento già applicato a "i nostri sponsor"/"le partite della settimana".

- [x] Task 6: Test (AC: tutti)
  - [x] **Correzione rispetto al piano**: l'assunzione originale ("mai testati direttamente in questo progetto, nessun mock del client Storage stabilito") era sbagliata — `lib/storage/sponsor.test.ts` e `lib/storage/logo.test.ts` esistono gia' (mock `fromMock`/`uploadMock`/`getPublicUrlMock`/`listMock`, `vi.mock("server-only")`). Scoperto solo aprendo la cartella prima di scrivere il modulo, non durante la ricerca preliminare della story. Corretto: `lib/storage/foto-squadra.test.ts` scritto mirror di quei due file (upload con path/upsert/contentType corretti, propagazione errore RLS, URL pubblico deterministico, `elencaGruppiConFoto` Map/vuota/errore — `leggiInfoFotoSquadra` e i suoi 3 test rimossi in review, vedi Review Findings).
  - [x] `validaImmagineFotoSquadra` resta un helper locale non esportato in `gruppi/actions.ts` (non promosso a `lib/storage/validazione-immagine.ts`, non obbligatorio) — testato indirettamente tramite `caricaFotoSquadraAction` in `actions.test.ts` (11 nuovi test: FORBIDDEN, gruppoId mancante, file mancante, MIME non ammesso, contenuto non corrispondente al MIME dichiarato, Gruppo inesistente, Allenatore non assegnato, successo Admin/Dirigente, successo Allenatore proprietario, fallimento upload).
  - [x] Nessun test diretto su `page.tsx`/`GruppoRow.tsx`/`MioGruppoCard.tsx`/`FotoSquadraForm.tsx` (convenzione consolidata, confermato: nessuna pagina/componente di rendering del progetto ne ha — verificato che `GruppoRow.tsx` non ha mai avuto un file di test).
  - [x] `npx vitest run` (1094/1094 passati), `npx tsc --noEmit`, `npm run lint` (0 errori, solo warning preesistenti `<img>`/`no-img-element`), `npm run build` puliti.

### Review Findings

- [x] [Review][Decision] `utente_possiede_gruppo` (RLS) non verifica la stagione corrente, a differenza di `risolviPossessoGruppo` [prisma/migrations/20260813000000_add_foto_squadra_bucket/migration.sql] — **risolto con l'utente (2026-08-13): rimandato**. Un Allenatore di una stagione passata potrebbe ancora sovrascrivere la foto di un vecchio Gruppo chiamando direttamente l'API Storage di Supabase (bypassando l'app), ma quella foto non comparirebbe comunque mai in home pubblica (query scoped alla stagione corrente in `app/page.tsx`) ne' in nessuna pagina — impatto reale nullo, solo un blob pubblico non linkato da nessuna parte. Sistemarlo richiederebbe portare la logica "stagione corrente" (oggi solo in TypeScript, `calcola-intervallo-stagione-corrente.ts`) dentro la funzione SQL, un lavoro architetturale piu' ampio di questa story. Nessuna modifica di codice.
- [x] [Review][Patch] Verifica di possesso eseguita DOPO la validazione (costosa) dell'immagine in `caricaFotoSquadraAction` [app/app/(gruppi-allenatori)/gruppi/actions.ts] — risolto: riordinato, `risolviPossessoGruppo` ora gira prima di `validaImmagineFotoSquadra` (un Allenatore non autorizzato non paga piu' il costo della lettura magic-byte fino a 2MB prima di ricevere FORBIDDEN).
- [x] [Review][Patch] `leggiInfoFotoSquadra` era codice morto — nessun chiamante in produzione (tutte e tre le pagine usano `elencaGruppiConFoto`, mai la versione per-Gruppo) [lib/storage/foto-squadra.ts] — risolto: funzione e i suoi 3 test rimossi.
- [x] [Review][Patch] Bug CSS: doppia linea separatrice all'interno del blocco di un singolo Gruppo [app/app/(gruppi-allenatori)/gruppi/gruppi.module.css] — la nuova `rigaFotoSquadra` segue `rigaAllenatori`, che quindi non era piu' l'ultima riga del blocco ma manteneva ancora il `border-bottom` di base (`.tabella td`), violando l'invariante gia' documentato nel file ("il bordo separatore vive solo sull'ultima delle tre righe"). Risolto: `.rigaAllenatori > td` aggiunta all'esclusione `border-bottom: none`, `.rigaFotoSquadra > td` (ora l'ultima) lo mantiene. Trovato dall'Acceptance Auditor con citazione di riga precisa, non dagli altri due layer.
- [x] [Review][Patch] Copertura di test mancante: dimensione file >2MB [app/app/(gruppi-allenatori)/gruppi/actions.test.ts] — risolto: aggiunto test dedicato per l'unico ramo di `validaImmagineFotoSquadra` non ancora coperto.
- [x] [Review][Patch] Copertura di test mancante: `prisma.gruppo.findUnique` che lancia un'eccezione [app/app/(gruppi-allenatori)/gruppi/actions.test.ts] — stesso ramo gia' testato per `assegnaAtleta`/`rimuoviAtleta` nello stesso file, mancava qui. Risolto: aggiunto test.
- [x] [Review][Defer] `elencaGruppiConFoto` senza `limit`/paginazione su `list()` [lib/storage/foto-squadra.ts] — deferred, Supabase Storage limita a 100 oggetti per chiamata di default: oltre 100 Gruppi con foto caricata, alcuni sparirebbero silenziosamente dalla home e dai form. Trovato indipendentemente da Blind Hunter ed Edge Case Hunter. Scala attuale molto al di sotto della soglia (poche decine di Gruppi, stesso principio gia' accettato per Sponsor, Story 16.1/16.3 "questione di scala, non un bug").
- [x] [Review][Defer] Nessun cleanup della foto quando un Gruppo viene eliminato o cambia stagione [prisma/migrations/20260813000000_add_foto_squadra_bucket] — deferred, nessun AC lo richiede; l'oggetto resta nel bucket senza mai essere ripulito, contribuendo nel tempo al limite dei 100 oggetti sopra.
- [x] [Review][Dismiss] Cache-buster diventa un no-op (`?v=`) se `aggiornatoIl` fosse `null` con foto esistente — teorico, stesso identico pattern difensivo gia' accettato per logo/Partite, nessuno scenario concreto in cui l'oggetto Storage non abbia `updated_at`.
- [x] [Review][Dismiss] Testo hero "in arrivo" rimosso incondizionatamente invece che solo quando `mostraFotoSquadra` e' false — comportamento voluto e coerente, stesso trattamento gia' applicato deliberatamente a Sponsor (Story 18.2) e Partite (Story 18.3).
- [x] [Review][Dismiss] `contentType` dichiarato dal client (`file.type`) usato per il file servito pubblicamente — mirror esatto del pattern gia' esistente in `sponsor.ts`/`logo.ts`, non introdotto da questa storia.
- [x] [Review][Dismiss] Nessuna validazione lato client (dimensione/MIME) prima dell'invio del form — coerente con l'assenza di pre-validazione client in ogni altro upload del progetto (Sponsor, logo).
- [x] [Review][Dismiss] Possibile disallineamento colSpan tra `rigaFotoSquadra` e le altre righe — verificato: `colSpan={2}` corretto, combacia con le 2 colonne dell'header e delle altre righe del blocco.

## Dev Notes

### Decisioni di analisi (vedi `epics.md#Epic 18`, Story 18.4)

- **Dipende da Story 18.1** (done): home pubblica esistente su `app/page.tsx`.
- **Unica funzionalità di contenuto pubblico dell'Epic 18 apribile anche da un Ruolo diverso da Admin/Dirigente**: l'Allenatore assegnato al Gruppo può caricare la foto del proprio Gruppo — a differenza di Sponsor (Story 18.2, Admin/Dirigente-only) e della gestione Partite (Admin/Dirigente/Allenatore-tramite-Campionato, non tramite questa storia).
- **Nessuna nuova colonna Prisma su `Gruppo`**: seguendo esattamente il precedente di Sponsor/logo, l'esistenza della foto è derivata da Supabase Storage (`list()`), non da un flag DB — decisione di design, non un'omissione.

### Pattern da riusare (non reinventare) — vedi ricerca completa sotto

- **Validazione immagine**: `lib/storage/validazione-immagine.ts` (`MIME_AMMESSI_IMMAGINE`, `DIMENSIONE_MASSIMA_IMMAGINE_BYTE`, `contenutoCorrispondeAlMimeImmagine`) — stesso allowlist PNG/JPEG, stesso limite 2MB, stesso controllo magic-byte già in uso per Sponsor e logo. Nessun SVG ammesso (rischio XSS su un asset pubblico), commento esplicito nel file contro una terza duplicazione dell'allowlist.
- **Upload + URL pubblico per-entità**: `lib/storage/sponsor.ts` (`caricaImmagineSponsor`/`urlPubblicoImmagineSponsor`, Story 16.1) — path piatto = id dell'entità, `upsert:true`, nessun URL firmato. Mirror diretto per `foto-squadra.ts` (Task 2).
- **"Esiste + aggiornatoIl" per un'entità opzionale**: `lib/storage/logo.ts` (`leggiInfoLogo`, Story 7.2) — `list("", { search: PATH })`, `aggiornatoIl` usato come cache-buster `?v=` in `<img src>`. Nessun file esistente combina già questo pattern con il path per-entità di `sponsor.ts` (Sponsor ha l'immagine obbligatoria alla creazione, non serve verificarne l'esistenza) — comporli per `foto-squadra.ts` è diretto, non richiede nuovi concetti.
- **Verifica di appartenenza "Allenatore assegnato a questo Gruppo"**: `risolviPossessoGruppo` (`app/app/(gruppi-allenatori)/gruppi/actions.ts`, righe 39-96, Story 9.15) — Admin/Dirigente sempre `{ ok: true }`; altrimenti risolve l'Allenatore dell'Utente corrente, verifica che `annoAgonisticoIdGruppo` combaci con la stagione corrente (`GruppoAllenatore` non viene mai ripulito al cambio stagione, review fix Story 9.15 — senza questo controllo un Allenatore di una stagione passata resterebbe autorizzato), poi verifica `GruppoAllenatore` per la coppia esatta. Stessa identica chiamata a 3 passi già usata da `assegnaAtleta`/`rimuoviAtleta`/`creaEAssegnaAtleta` nello stesso file — replicarla, non reinventarla.
- **Azioni con upload opzionale su un'entità che esiste già di suo (nessun rollback)**: `aggiornaSponsor`/`caricaLogoAction` — a differenza di `creaSponsor` (che crea la riga DB e fa rollback se l'upload fallisce, perché senza immagine la vetrina si romperebbe), qui il Gruppo esiste indipendentemente dalla foto.
- **Sezione pubblica condizionale + query con `select` esplicito**: `mostraSponsor`/`mostraPartite` in `app/page.tsx` (Story 18.2/18.3) — "nessuna sezione se vuota", ogni query pubblica con `select` esplicito (mai un `include` che trascini campi non pubblici), `aria-labelledby` invece di `aria-label` ridondante quando la sezione ha un solo `<h2>` (review fix Story 18.3, da applicare fin da subito qui).

### Migrazioni Storage — lezioni già pagate nel progetto, da non ripetere

Riferimento diretto: `prisma/migrations/20260809010000_add_sponsor_banner_bucket/migration.sql` (bucket pubblico, singola migrazione che applica già tutte le lezioni sotto) e `prisma/migrations/20260728000000_add_foto_profilo/migration.sql` (funzione di possesso `utente_possiede_allenatore`, mirror da adattare per `utente_possiede_gruppo`).

1. **`upsert:true` richiede sia la policy INSERT sia la policy UPDATE** — dimenticare UPDATE ha causato un bug reale già corretto (`20260718090000`, bucket logo). Scrivere entrambe fin da subito.
2. **La policy SELECT non è opzionale nemmeno per un bucket pubblico**: `list()` (usato sia da `leggiInfoFotoSquadra` per-Gruppo sia da `elencaGruppiConFoto` per la home pubblica) passa da RLS, a differenza del GET diretto sull'endpoint pubblico dell'oggetto (`/storage/v1/object/public/...`) che la bypassa. Il bucket logo ha impiegato **due** migrazioni correttive per arrivarci (prima nessuna SELECT, poi SELECT solo ADMIN che rompeva `/accedi`/NavBar non autenticati) — qui la home pubblica è **sempre** anonima, quindi la policy SELECT va **pubblica fin dalla prima migrazione** (`USING (bucket_id = 'foto-squadra-gruppo')`, nessuna condizione di Ruolo).
3. **Il path scelto per questa storia è piatto** (`gruppoId` diretto, mirror di `sponsor-banner`), **non nidificato** come `foto-profilo-*` (`{entitaId}/foto`) — le policy INSERT/UPDATE devono quindi confrontare `name` direttamente con l'id, **non** `(storage.foldername(name))[1]` (che su un path piatto senza `/` restituirebbe `NULL`, rompendo silenziosamente ogni upload).
4. **Nessun `GRANT` esplicito su `storage.objects`**: l'estensione Storage di Supabase concede già le basi ad `authenticated`, solo `POLICY` — stesso principio verificato per tutti i bucket precedenti.

### Project Structure Notes

- Nuovi: `prisma/migrations/<timestamp>_add_foto_squadra_bucket/migration.sql`, `lib/storage/foto-squadra.ts`.
- Modificati: `app/app/(gruppi-allenatori)/gruppi/actions.ts` (nuova Server Action), `app/app/(gruppi-allenatori)/gruppi/page.tsx` + `GruppoRow.tsx` (UI upload Admin/Dirigente), `app/app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` + `MioGruppoCard.tsx` (UI upload Allenatore), `app/page.tsx` + `app/home-pubblica.module.css` (nuova sezione pubblica).
- Nessuna migrazione a `prisma/schema.prisma` stesso (nessuna nuova colonna, solo la migrazione Storage/RLS sopra).

### References

- [Source: lib/storage/sponsor.ts, lib/storage/logo.ts, lib/storage/validazione-immagine.ts] — pattern di upload/validazione/URL pubblico da mirrorare per `foto-squadra.ts`.
- [Source: prisma/migrations/20260809010000_add_sponsor_banner_bucket/migration.sql, prisma/migrations/20260728000000_add_foto_profilo/migration.sql, prisma/migrations/20260718080000_logo_bucket_fix_select_policy, prisma/migrations/20260718090000_logo_bucket_restrict_path, prisma/migrations/20260725020000_logo_bucket_public_select_policy] — lezioni RLS/Storage già pagate, da applicare fin dalla prima stesura.
- [Source: app/app/(gruppi-allenatori)/gruppi/actions.ts, risolviPossessoGruppo] — verifica di appartenenza Allenatore-Gruppo, stesso helper riusato dalla nuova Server Action.
- [Source: app/app/(gruppi-allenatori)/gruppi/page.tsx, GruppoRow.tsx, app/app/(gruppi-allenatori)/i-miei-gruppi/page.tsx, MioGruppoCard.tsx] — punti di inserimento UI per Admin/Dirigente e Allenatore.
- [Source: app/page.tsx, app/home-pubblica.module.css] — home pubblica esistente (Story 18.1/18.2/18.3) su cui innestare la nuova sezione, pattern `mostraSponsor`/`mostraPartite`/`aria-labelledby` da riprodurre.
- [Source: epics.md#Epic 18: Sito pubblico Settore Volley, Story 18.4] — decisioni di analisi, testo originale degli AC.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

### Completion Notes List

- Tutte le decisioni tecniche della ricerca preliminare (create-story) confermate valide in sviluppo: nessuna nuova colonna Prisma su `Gruppo`, path Storage piatto (`gruppoId`), funzione RLS `utente_possiede_gruppo` mirror di `utente_possiede_allenatore`, policy SELECT pubblica fin dalla prima migrazione.
- **Unica correzione rispetto al piano**: Task 6 assumeva erroneamente che i wrapper Storage non fossero mai testati direttamente nel progetto — in realtà `lib/storage/sponsor.test.ts`/`logo.test.ts` esistono e stabiliscono un mock del client Storage (`fromMock`/`uploadMock`/`getPublicUrlMock`/`listMock`). Scritti `lib/storage/foto-squadra.test.ts` e nuovi test per `caricaFotoSquadraAction` in `gruppi/actions.test.ts`, mirror degli stessi pattern.
- Nessuna migrazione applicata al DB in questo sandbox (nessun accesso Supabase diretto) — stessa limitazione già nota e documentata per tutte le migrazioni Storage precedenti (Sponsor Story 16.1, logo Story 7.2, foto-profilo Story 9.12). La migrazione `20260813000000_add_foto_squadra_bucket` va applicata dall'utente in produzione, stesso passo già seguito per quelle storie.
- `FotoSquadraForm.tsx` component condiviso tra `GruppoRow.tsx` (/app/gruppi) e `MioGruppoCard.tsx` (/app/i-miei-gruppi), stesso pattern cross-file già stabilito in questo modulo per `AtletaTabellaRiga.tsx` (Story 9.33) — importa sempre `gruppi.module.css` (il proprio, non quello del consumer), stesso principio verificato su `AtletaTabellaRiga.tsx`.
- **Code review completata** (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo) — 1 decision-needed risolto con l'utente (gap RLS stagione su `utente_possiede_gruppo`, rimandato: impatto nullo perché la home pubblica scopa comunque alla stagione corrente), 5 patch applicati (riordino verifica possesso prima della validazione immagine costosa, rimozione di `leggiInfoFotoSquadra` come codice morto, fix CSS doppia linea separatrice su `GruppoRow.tsx`, 2 test mancanti aggiunti), 3 defer (paginazione `list()` a 100 oggetti, nessun cleanup foto orfane, il gap RLS di cui sopra), 5 scartati come rumore/pattern pre-esistenti già accettati altrove. Vedi Review Findings sotto.
- Verifica: `npx vitest run` (1093/1093 passati), `npx tsc --noEmit`, `npm run lint` (0 errori, solo warning `<img>`/`no-img-element` preesistenti + coerenti con lo stile già in uso), `npm run build` puliti.

### File List

- Nuovi: `prisma/migrations/20260813000000_add_foto_squadra_bucket/migration.sql`, `lib/storage/foto-squadra.ts`, `lib/storage/foto-squadra.test.ts`, `app/app/(gruppi-allenatori)/gruppi/FotoSquadraForm.tsx`.
- Modificati: `app/app/(gruppi-allenatori)/gruppi/actions.ts` (nuova Server Action `caricaFotoSquadraAction`, review fix: verifica possesso prima della validazione immagine), `app/app/(gruppi-allenatori)/gruppi/actions.test.ts` (nuovi test, inclusi 2 aggiunti in review), `app/app/(gruppi-allenatori)/gruppi/page.tsx` (query `elencaGruppiConFoto`, nuove prop a `GruppoRow`), `app/app/(gruppi-allenatori)/gruppi/GruppoRow.tsx` (nuova riga Foto squadra), `app/app/(gruppi-allenatori)/gruppi/gruppi.module.css` (classi `.rigaFotoSquadra`/`.fotoSquadra`/`.anteprimaFotoSquadra`, review fix: `.rigaAllenatori` aggiunta all'esclusione `border-bottom`), `app/app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` (stessa query bulk), `app/app/(gruppi-allenatori)/i-miei-gruppi/MioGruppoCard.tsx` (form foto squadra), `app/page.tsx` (nuova sezione pubblica, query Gruppi/foto scoped alla stagione corrente, testo hero aggiornato), `app/home-pubblica.module.css` (classi `.sezioneFotoSquadra`/`.listaFotoSquadra`/`.schedaFotoSquadra`/`.immagineFotoSquadra`/`.nomeGruppoFoto`), `lib/storage/foto-squadra.ts`/`lib/storage/foto-squadra.test.ts` (review fix: rimossa `leggiInfoFotoSquadra`, mai chiamata, e i suoi 3 test).

## Change Log

- 2026-08-13: File di story creato (create-story workflow), stato ready-for-dev.
- 2026-08-13: Implementata (dev-story workflow) - tutti e 6 i Task completati. Bucket Storage pubblico + RLS (`utente_possiede_gruppo`), modulo `lib/storage/foto-squadra.ts`, Server Action `caricaFotoSquadraAction` in `gruppi/actions.ts`, UI di upload condivisa (`FotoSquadraForm.tsx`) su `/app/gruppi` e `/app/i-miei-gruppi`, nuova sezione pubblica "Foto di squadra" in `app/page.tsx` scoped alla stagione corrente. Corretta un'assunzione errata del piano su Task 6 (i wrapper Storage sono in realtà testati nel progetto) - 20 nuovi test scritti di conseguenza. 1094/1094 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: review.
- 2026-08-13: Code review completata (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo). 1 decision-needed risolto con l'utente (gap RLS stagione su `utente_possiede_gruppo` vs `risolviPossessoGruppo` - rimandato, impatto nullo dato lo scoping per stagione della home pubblica). 5 patch applicati: verifica possesso riordinata prima della validazione immagine costosa, `leggiInfoFotoSquadra` rimossa come codice morto (mai chiamata), bug CSS doppia linea separatrice su `GruppoRow.tsx` corretto (trovato dall'Acceptance Auditor), 2 test mancanti aggiunti (dimensione file >2MB, `prisma.gruppo.findUnique` che lancia). 3 defer (paginazione `list()` a 100 oggetti - trovato indipendentemente da 2 layer, nessun cleanup foto orfane, il gap RLS di cui sopra). 5 scartati come rumore/pattern pre-esistenti già accettati altrove nel progetto. 1093/1093 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: done.
