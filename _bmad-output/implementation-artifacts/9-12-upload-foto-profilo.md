---
baseline_commit: dd5e787a1a292857816856f4ece58bcd637d0946
---

# Story 9.12: Upload foto profilo per Atleta e Allenatore

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Atleta o Allenatore con un account proprio,
I want poter caricare/sostituire una mia foto profilo,
so that il mio profilo nell'app abbia un volto riconoscibile, non solo un nome.

**Note aggiuntive:** Story aggiunta il 2026-07-28 su richiesta esplicita dell'utente. Decisioni prese con l'utente durante la creazione di questa storia (vedi Dev Notes per il dettaglio tecnico):

- Le foto sono visibili anche da Allenatore/Admin/Dirigente/Segreteria (non solo dal proprietario) — richiede policy di storage più ampie delle sole "self".
- Vincoli file: solo JPG/PNG, **max 5MB** (più stringente del certificato medico, che ammette anche PDF fino a 10MB).
- **In questa prima versione la foto compare SOLO nella nuova pagina self-service `/il-mio-profilo`** — mostrarla anche in altre pagine esistenti (`/presenze`, `/gruppi`, `/precaricamento-allenatori`, ecc.) è **esplicitamente rimandato a una story futura**, stesso pattern già seguito per la Story 9.6 (Geolocalizzazione Palestre: prima versione minima, poi estesa su richiesta). Non costruire alcuna UI in altre pagine in questa storia.
- Self-service puro: richiede un account proprio già collegato (Atleta con `autoAggancio=true`, Story 2.7; Allenatore con `utenteId` valorizzato, Story 1.4/9.5). Un'Atleta minorenne gestita solo dal Genitore (nessun account proprio) **non** ha questa funzionalità in questa storia — nessun upload "per conto di" da parte del Genitore.

## Acceptance Criteria

1. **Given** un Utente con Ruolo Atleta (collegata alla propria Atleta con `autoAggancio=true`) o Allenatore (collegato al proprio `Allenatore.utenteId`) autenticato **When** visita `/il-mio-profilo` **Then** vede una sezione per caricare/sostituire la propria foto profilo, con i vincoli dichiarati (JPG/PNG, max 5MB)
2. **Given** l'Utente seleziona un file valido e invia il form **When** il caricamento va a buon fine **Then** la foto viene salvata (o sostituisce quella precedente) e viene mostrata subito nella stessa pagina
3. **Given** l'Utente seleziona un file non valido (formato non ammesso, oltre 5MB, o il cui contenuto reale non corrisponde al formato dichiarato) **When** invia il form **Then** vede un messaggio di errore chiaro, nessun caricamento avviene
4. **Given** un Utente con Ruolo Atleta ma senza alcun aggancio `autoAggancio=true` (es. solo agganciata da un Genitore) e senza alcun Allenatore collegato **When** visita `/il-mio-profilo` **Then** vede un messaggio che il proprio account non è ancora collegato a un profilo Allenatore o Atleta (stesso messaggio già usato in `/dati-fisici`), nessun form di upload mostrato
5. **Given** le foto sono salvate in due bucket Storage **privati** (uno per Atleta, uno per Allenatore) **When** un Allenatore, Admin, Dirigente o Segreteria genera un URL firmato per una foto esistente **Then** riesce, indipendentemente dal fatto che sia la propria foto o quella di un'altra persona — verificato manualmente (nessuna infrastruttura di test automatico contro RLS reale in questo progetto, stessa convenzione già stabilita per le altre tabelle/bucket RLS)
6. **Given** un tentativo di caricare/sostituire la foto di un'Atleta o Allenatore diversi da sé stessi (es. richiesta manomessa che aggira l'applicazione) **When** la policy RLS di INSERT/UPDATE su `storage.objects` viene valutata **Then** il caricamento viene rifiutato — la RLS è l'unica autorità, mai un controllo applicativo come unica barriera (stesso principio già stabilito per `certificati-medici`)
7. **And** nessuna regressione sul resto del comportamento esistente (route guard, `/dati-fisici`, barra di navigazione) — suite Vitest esistente invariata, stesso vincolo delle altre storie di questo epic

## Tasks / Subtasks

- [x] Task 1: Migrazione Postgres/Storage (AC: #5, #6)
  - [x] Nuova migrazione `prisma/migrations/20260728000000_add_foto_profilo/migration.sql`
  - [x] Due nuovi bucket **privati** (`public: false`): `foto-profilo-atlete` e `foto-profilo-allenatori`, `file_size_limit: 5242880` (5MB), `allowed_mime_types: ARRAY['image/jpeg', 'image/png']`
  - [x] Nuova funzione `SECURITY DEFINER` `utente_possiede_allenatore(allenatore_id_param TEXT)` — stesso stile di `utente_possiede_atleta`, con `REVOKE`/`GRANT EXECUTE`
  - [x] Riusata `atleta_possiede_presenza` esistente per l'Atleta — nessuna nuova funzione
  - [x] Policy su `storage.objects` per `foto-profilo-atlete`: `foto_profilo_atlete_ampia_select`, `foto_profilo_atlete_propria_select`, `foto_profilo_atlete_propria_insert`, `foto_profilo_atlete_propria_update`
  - [x] Policy su `storage.objects` per `foto-profilo-allenatori`: `foto_profilo_allenatori_ampia_select`, `foto_profilo_allenatori_propria_insert`, `foto_profilo_allenatori_propria_update`
  - [x] Nessun GRANT esplicito aggiunto (coerente col resto del progetto)
  - [x] `npx prisma migrate deploy` tentato in locale: **nessuna istanza Supabase locale in esecuzione** in questa sessione (`P1001: Can't reach database server`) — stesso limite già incontrato in altre storie di questo epic (es. 9.6). La migrazione è scritta e sintatticamente coerente con lo stile delle precedenti; verifica di applicazione/RLS reale rimandata alla verifica manuale dal vivo (Task 6), come da AC #5/#6.
- [x] Task 2: Modulo storage condiviso (AC: #1, #2, #3)
  - [x] Nuovo `lib/storage/foto-profilo.ts`, che esporta:
    - `BUCKET_FOTO_ATLETA = "foto-profilo-atlete"`, `BUCKET_FOTO_ALLENATORE = "foto-profilo-allenatori"`
    - `MIME_AMMESSI_FOTO = ["image/jpeg", "image/png"]`, `DIMENSIONE_MASSIMA_FOTO_BYTE = 5 * 1024 * 1024`
    - `contenutoCorrispondeAlMimeDichiaratoFoto(file: File): Promise<boolean>` — stessa logica di magic-byte di `lib/storage/certificati.ts` (righe 15-34), ma con una mappa locale ristretta a `image/jpeg`/`image/png` (non riesportare/estendere quella di `certificati.ts`, che resta privata a quel modulo — piccola duplicazione di 2 righe accettabile, evita di introdurre un validatore generico per un solo altro punto di utilizzo)
    - `caricaFotoProfilo(supabase, bucket: string, entitaId: string, file: File): Promise<void>` — path fisso `${entitaId}/foto` (nessuna estensione nel path, `contentType: file.type` esplicito, `upsert: true`) — stesso identico pattern di `caricaLogo` (`lib/storage/logo.ts` righe 17-28), qui generico sul bucket (parametro) invece di un path letterale fisso come il logo, perché qui il path varia per entità
    - `esisteFotoProfilo(supabase, bucket: string, entitaId: string): Promise<{ esiste: boolean; aggiornatoIl: string | null }>` — stesso pattern di `leggiInfoLogo` (`lib/storage/logo.ts` righe 51-65): `list(entitaId, { search: "foto" })`, poi cerca l'oggetto con `name === "foto"`
    - `generaUrlFirmatoFotoProfilo(supabase, bucket: string, entitaId: string, scadenzaSecondi = 300): Promise<string>` — stesso pattern di `generaUrlFirmato` (`lib/storage/certificati.ts` righe 112-126), path `${entitaId}/foto`
  - [x] Nuovo `lib/storage/foto-profilo.test.ts` — mock del client Supabase (`storage.from(...).upload/list/createSignedUrl`), casi: upload riuscito/fallito, esiste=true/false, URL firmato riuscito/fallito, magic-byte JPEG/PNG validi e contenuto non corrispondente (12 test)
- [x] Task 3: Route protetta (AC: #1, #4)
  - [x] `lib/auth/route-guard.ts`: aggiungere `{ prefix: "/il-mio-profilo", ruoliAmmessi: ["ALLENATORE", "ATLETA"], navLabel: "Il mio profilo" }` a `PROTECTED_ROUTES` — compare automaticamente in navigazione tramite `filtraVociNavigazione` (nessuna lista duplicata, AD-2/Story 8.1)
  - [x] `lib/auth/route-guard.test.ts`: nuovo caso per `/il-mio-profilo` (Allenatore o Atleta ammessi, altri Ruoli rediretti a `/non-autorizzato`)
- [x] Task 4: Pagina e risoluzione identità (AC: #1, #4)
  - [x] Nuovo `app/il-mio-profilo/page.tsx` (Server Component, `export const dynamic = "force-dynamic"` — dati potenzialmente diversi ad ogni visita, stesso motivo di `/dati-fisici`/`/storico-presenze`)
  - [x] **Riusa esattamente** il pattern di risoluzione identità già in `app/(dati-atleta)/dati-fisici/page.tsx` (righe 86-114): `createClient()` → `supabase.auth.getUser()` → `Promise.all([prisma.allenatore.findFirst({ where: { utente: { supabaseAuthId: user.id } } }), prisma.genitoreAtleta.findMany({ where: { utente: { supabaseAuthId: user.id }, autoAggancio: true }, select: { atletaId: true } })])` — **non reinventare questa risoluzione**, è già scritta e testata concettualmente in quella pagina
  - [x] Se né `allenatore` né `atletaIds` risolvono (AC #4): stesso messaggio guard-clause verbatim di `dati-fisici/page.tsx` riga 121-124 ("Il tuo account non è ancora collegato a un profilo Allenatore o Atleta. Contatta la segreteria.")
  - [x] Se `atletaIds.length > 0`: sezione "La mia foto" per l'Atleta — usa `atletaIds[0]` (primo risolto, mai un merge, stesso principio di `dati-fisici`/`storico-presenze`), chiama `esisteFotoProfilo(supabase, BUCKET_FOTO_ATLETA, atletaIds[0])` e, se esiste, `generaUrlFirmatoFotoProfilo(...)` per mostrare l'`<img>` corrente
  - [x] Se `allenatore` risolto: sezione "La mia foto" per l'Allenatore, stesso schema con `BUCKET_FOTO_ALLENATORE`/`allenatore.id`
  - [x] Struttura pagina: `<main className="pagina-form"><div className="riquadro-form">` (Story 9.3) — coerente con `/modifica-password` (pagina di gestione del proprio account), non con `/dati-fisici` (pagina-tabella a piena larghezza)
- [x] Task 5: Form e Server Action di upload (AC: #2, #3, #6)
  - [x] Nuovo `app/il-mio-profilo/FotoProfiloForm.tsx` (Client Component, `useActionState`) — riceve `tipo: "ATLETA" | "ALLENATORE"` come prop, azione legata con `.bind(null, tipo)` (stesso pattern di `reimpostaPassword.bind(null, tokenHash)` in Story 9.11), un solo campo `<input type="file" accept="image/jpeg,image/png">`, reset del form al successo (stesso pattern di `CaricaCertificatoForm.tsx`/`ModificaPasswordForm.tsx`)
  - [x] Nuovo `app/il-mio-profilo/actions.ts`, Server Action `caricaFotoProfilo(tipo, _prevState, formData)`:
    - `requireRuolo(["ATLETA", "ALLENATORE"])` come primo passo (difesa in profondità, non affidarsi solo al route guard — stesso principio di ogni altra Server Action del progetto)
    - Risolve **di nuovo, lato server, indipendentemente da `tipo`**: quale Atleta (autoAggancio) o Allenatore appartiene alla sessione corrente — **mai accettare un `entitaId` dal form/client**, solo il discriminatore `tipo` (che seleziona quale dei due risultati risolti usare) — stesso principio anti-manomissione già applicato ovunque nel progetto (es. `aggiornaRuoliUtente`, Story 1.2/9.9)
    - Se `tipo === "ATLETA"` ma nessun `autoAggancio` risolto (o viceversa per `"ALLENATORE"`): errore `{ code: "NON_COLLEGATO", message: "Il tuo account non è collegato a un profilo Allenatore o Atleta." }` — **non** `FORBIDDEN` (non è un rifiuto di autorizzazione per Ruolo, è un'assenza di aggancio dati — stessa distinzione già fatta altrove nel progetto tra `FORBIDDEN` e altri codici di errore)
    - Validazione file: presenza, `MIME_AMMESSI_FOTO`, `DIMENSIONE_MASSIMA_FOTO_BYTE`, `contenutoCorrispondeAlMimeDichiaratoFoto` — stesso ordine e stessi messaggi di stile di `caricaCertificato` (`app/(certificati-medici)/certificato-medico/actions.ts` righe 54-82), adattati al vincolo 5MB/JPG/PNG di questa storia
    - Chiama `caricaFotoProfilo(supabase, bucket, entitaId, file)` (dal modulo Task 2) con il bucket/entitaId risolti
    - `revalidatePath("/il-mio-profilo")` al successo
  - [x] Nuovo `app/il-mio-profilo/actions.test.ts`: non-Atleta/Allenatore → `FORBIDDEN`; Atleta/Allenatore senza aggancio risolto → `NON_COLLEGATO`; file mancante/formato non ammesso/troppo grande/contenuto non corrispondente → `VALIDATION`, nessuna chiamata storage; upload riuscito (sia ramo Atleta sia ramo Allenatore) → successo, `caricaFotoProfilo` chiamato col bucket/entitaId corretti; upload che lancia → errore generico, nessun crash (10 test)
- [x] Task 6: Test e regressione (AC: #7)
  - [x] Suite Vitest completa: 616/616 passati (24 nuovi: 12 `foto-profilo.test.ts`, 10 `il-mio-profilo/actions.test.ts`, 2 `route-guard.test.ts`), nessun test esistente modificato
  - [x] `npx tsc --noEmit` pulito; ESLint pulito sui file nuovi/modificati di questa storia (l'unico errore/i warning residui del progetto sono pre-esistenti, in file non toccati da questa storia — verificato con `git status` sul file dell'errore)
  - [x] Verifica manuale dal vivo (dopo deploy, stesso pattern già seguito per le altre storie di questo epic che toccano RLS/Storage, es. 9.6): upload riuscito per un'Atleta autoAgganciata e per un Allenatore agganciato, messaggio "non collegato" per un Utente senza aggancio, generazione di un URL firmato da un Ruolo gestionale (Admin/Dirigente/Segreteria/Allenatore) per la foto di un'altra persona (verifica RLS reale, non automatizzabile in questo progetto) — **demandata all'utente dopo il deploy**, non ancora eseguita in questa sessione (nessuna istanza Supabase locale disponibile, vedi Task 1)

### Review Findings

- [x] [Review][Defer] Le policy `foto_profilo_*_ampia_select` danno a **qualunque** Allenatore visibilità su **tutte** le foto di **tutte** le Atlete (nessuno scoping per Gruppo) — a differenza di ogni altro percorso dati rivolto all'Allenatore nel progetto (es. `allenatore_possiede_atleta`, sempre scoped al proprio Gruppo) [prisma/migrations/20260728000000_add_foto_profilo/migration.sql] — risolto con l'utente: confermata esplicitamente la scelta originale, accesso ampio mantenuto invariato per tutti e quattro i Ruoli gestionali, nessuna modifica alla migrazione.
- [x] [Review][Patch] `<img alt="">` sulla foto profilo corrente in `SezioneFoto` — non decorativa (è il volto della persona), a differenza del precedente citato (`app/(configurazione)/logo/page.tsx`, che usa `alt="Logo attuale"`) — nessun testo alternativo per chi usa uno screen reader [app/il-mio-profilo/page.tsx] — risolto: `alt="La tua foto profilo attuale"`.
- [x] [Review][Patch] `esisteFotoProfilo`/`generaUrlFirmatoFotoProfilo` in `SezioneFoto` non sono avvolte in un `try/catch`: un errore transitorio di Storage manda in crash l'intera pagina `/il-mio-profilo`, incluso il form di upload stesso — a differenza del precedente diretto (`app/(auth)/accedi/page.tsx`, doppio `try/catch` proprio per non far sparire l'intera pagina per un errore transitorio su una lettura decorativa) [app/il-mio-profilo/page.tsx] — risolto: entrambe le chiamate avvolte in `try/catch`, errore loggato, la pagina/form di upload restano funzionanti.
- [x] [Review][Patch] Ramo `if (tipo === "ATLETA") {...} else {...}` non esaustivo — qualunque valore diverso da `"ATLETA"` viene trattato silenziosamente come `"ALLENATORE"`, invece di un `else if` esplicito + un errore per un valore imprevisto. Non sfruttabile oggi (l'unica barriera è il tipo TypeScript), ma fragile a un refactor futuro [app/il-mio-profilo/actions.ts] — risolto: `else if (tipo === "ALLENATORE")` + `else` con errore `VALIDATION`, nuovo test per il ramo difensivo.
- [x] [Review][Patch] Nessun `orderBy` sulle due query Prisma indipendenti che risolvono "qual è la mia Atleta" (`page.tsx` con `findMany`, `actions.ts` con `findFirst`) — se un'anomalia di dati producesse mai 2+ righe `GenitoreAtleta` con `autoAggancio=true` per lo stesso Utente, le due query potrebbero risolvere una riga diversa in modo non deterministico (pagina che mostra un'Atleta, azione che carica per un'altra) [app/il-mio-profilo/page.tsx, app/il-mio-profilo/actions.ts] — risolto: stesso `orderBy: { atletaId: "asc" }` aggiunto a entrambe.
- [x] [Review][Patch] `actions.test.ts` non verifica mai che il ramo "altro" resti intatto (es. per `tipo="ATLETA"` nessuna asserzione che `allenatoreFindFirstMock` non sia mai stato chiamato) né che `requireRuolo` sia chiamato con l'insieme di Ruoli corretto — una regressione che interrogasse entrambe le entità o autorizzasse il Ruolo sbagliato passerebbe comunque la suite [app/il-mio-profilo/actions.test.ts] — risolto: 3 nuovi test (asserzione ramo-altro-non-chiamato su entrambi i casi di successo, chiamata a `requireRuolo` con l'array corretto, ramo `tipo` difensivo).
- [x] [Review][Patch] `<img>` della foto attuale senza attributi `width`/`height` HTML (solo dimensione via CSS) — piccola finestra di CLS prima che lo stylesheet dipinga [app/il-mio-profilo/page.tsx] — risolto: `width={120} height={120}` aggiunti.
- [x] [Review][Patch] Nessun commento in `lib/storage/foto-profilo.ts` che spieghi (a) che `caricaFotoProfilo` si fida ciecamente che il chiamante abbia già validato MIME/dimensione (a differenza di `certificati.ts`, che documenta esplicitamente questa responsabilità), (b) perché `entitaId` non richiede sanitizzazione a differenza di `file.name` in `certificati.ts` (`entitaId` è sempre risolto lato server da Prisma, mai da input utente) — un futuro manutentore che copiasse questo file come modello non saprebbe se l'omissione è deliberata [lib/storage/foto-profilo.ts] — risolto: commento aggiunto sopra `caricaFotoProfilo`.
- [x] [Review][Defer] `requireRuolo()` non è avvolta in un `try/catch` in `caricaFotoProfilo` — se lanciasse (es. fallimento di rete in `getUser()` interno), l'eccezione non verrebbe catturata prima del blocco `try` principale [app/il-mio-profilo/actions.ts] — deferred, pattern pre-esistente e identico in OGNI Server Action del progetto (mai una singola storia lo ha corretto in isolamento), fuori perimetro di questa storia.
- [x] [Review][Defer] Nessuna validazione lato client di formato/dimensione oltre al filtro `accept` dell'`<input type="file">` (banalmente aggirabile con "Tutti i file") — l'utente scopre il rifiuto solo dopo il round-trip completo del file al server [app/il-mio-profilo/FotoProfiloForm.tsx] — deferred, miglioramento UX a bassa priorità, nessun AC lo richiede (il messaggio di errore server-side soddisfa già l'AC #3).
- [x] [Review][Defer] `utente_possiede_allenatore` (nuova) non verifica `Utente.attivo` — un Allenatore disattivato con sessione ancora valida potrebbe comunque caricare/vedere la propria foto [prisma/migrations/20260728000000_add_foto_profilo/migration.sql] — deferred: stesso trade-off già accettato a livello di intero progetto (Story 1.2, `attivo` controllato solo al login, mai specchiato per le policy RLS esistenti — `allenatore_possiede_atleta`/`atleta_possiede_presenza`/`utente_possiede_atleta` hanno la stessa caratteristica) — sproporzionato correggerlo qui in isolamento per un'azione a basso rischio (foto, non una credenziale) lasciando invariate tutte le funzioni sorelle.
- [x] [Review][Defer] Doppio round-trip a `supabase.auth.getUser()` per invio (uno dentro `requireRuolo`, uno esplicito nell'azione) [app/il-mio-profilo/actions.ts] — deferred, inefficienza minore coerente con lo stesso pattern già presente in ogni altra Server Action del progetto, non una regressione.

## Dev Notes

- **Perché due bucket privati e non uno pubblico come il logo**: il logo (Story 7.2) è pubblico perché è branding, mostrato a chiunque anche senza sessione (`/accedi`). Le foto profilo qui riguardano persone reali, **incluse minorenni** (Atlete) — stessa cautela già applicata ai certificati medici (AD-6, bucket privato + URL firmati). Nessuna colonna/tabella DB nuova: path fisso per entità (`{id}/foto`, `upsert: true`), esistenza verificata con `list()` — stesso pattern del logo (Story 7.2, "nessuna tabella DB", vedi `ARCHITECTURE-SPINE.md` Capability Map), qui reso privato e applicato due volte (Atleta/Allenatore).
- **Perché "propria foto ovunque" non fa parte di questa storia**: l'utente ha scelto esplicitamente che Allenatore/Admin/Dirigente/Segreteria possano VEDERE le foto (quindi le policy RLS ampie di Task 1 sono necessarie ORA), ma ha anche scelto esplicitamente di **non** costruire alcuna UI che le mostri in `/presenze`, `/gruppi`, `/precaricamento-allenatori` ecc. in questa prima versione — la fondazione di accesso è pronta, l'esposizione UI altrove è un lavoro futuro mirato (stesso schema in due passaggi già usato per la Story 9.6). **Non aggiungere `<img>` in nessuna pagina esistente in questa storia.**
- **Riuso obbligatorio del pattern di risoluzione identità**: `app/(dati-atleta)/dati-fisici/page.tsx` (righe 86-114) risolve già esattamente "sono un Allenatore?"/"sono un'Atleta (autoAggancio)?" nello stesso identico modo di cui questa storia ha bisogno — **leggerlo per intero prima di scrivere `page.tsx`** e riusare la stessa query Prisma/lo stesso `Promise.all`, non reinventarla con una forma diversa.
- **Perché `atleta_possiede_presenza` per l'Atleta ma una nuova funzione per l'Allenatore**: `atleta_possiede_presenza(atletaId)` (Story 3.2, `20260718010000_genitori_atlete_auto_aggancio/migration.sql`) verifica già esattamente "sono io stessa (autoAggancio=true), non un Genitore" — riusarla identica. Per l'Allenatore **non esiste alcun equivalente**: le funzioni esistenti (`allenatore_possiede_atleta`, `allenatore_possiede_slot*`) verificano il possesso di un'ALTRA entità (Atleta/Slot) tramite Gruppo, non "è il mio proprio record Allenatore" — da qui la necessità di `utente_possiede_allenatore`, nuova.
- **Perché servono sia INSERT sia UPDATE nelle policy Storage**: `caricaFotoProfilo` usa `upsert: true` (sostituzione, non accumulo di versioni — a differenza di `certificati.ts`, che usa `upsert: false` e mantiene ogni vecchia versione fino a rimozione esplicita). Supabase Storage richiede la policy UPDATE anche per un upload con `upsert: true` su un path già esistente — **scoperto come review fix nella Story 7.2** (`20260718090000_logo_bucket_restrict_path/migration.sql`): la prima versione di quella storia aveva dimenticato la policy UPDATE. Non ripetere lo stesso errore qui: scrivere entrambe fin dall'inizio.
- **Il discriminatore `tipo` nel form, mai un `entitaId`**: il form invia solo `tipo: "ATLETA" | "ALLENATORE"` (quale sezione ha inviato), **mai** l'id dell'Atleta/Allenatore — la Server Action risolve sempre da sé, dalla sessione, quale entità appartiene all'Utente corrente (stesso identico principio anti-manomissione già applicato in `aggiornaRuoliUtente`/`reimpostaPasswordFissaUtente`, Story 1.2/9.9/9.11: mai fidarsi di un id proveniente dal client per un'operazione su un'entità specifica).
- **`NON_COLLEGATO` vs `FORBIDDEN`**: `FORBIDDEN` (`ARCHITECTURE-SPINE.md`, Consistency Conventions) è riservato esclusivamente ai rifiuti di autorizzazione per Ruolo. Un Utente con Ruolo ATLETA ma senza aggancio `autoAggancio=true` non viene rifiutato per il suo Ruolo (ce l'ha) — gli manca il dato di collegamento. Stesso codice/messaggio già usato nel guard-clause di `dati-fisici/page.tsx`, qui replicato nella Server Action per lo stesso scenario.
- **File NON da toccare**: `lib/storage/certificati.ts`, `lib/storage/logo.ts` (entrambi riusati solo come riferimento di pattern, mai importati/modificati), `app/(dati-atleta)/dati-fisici/page.tsx` (la risoluzione identità va **replicata** con lo stesso codice, non estratta in un helper condiviso in questa storia — un refactoring di quel tipo non è richiesto da nessun AC e allargherebbe inutilmente il perimetro; se emergesse una terza pagina con lo stesso bisogno, valutare l'estrazione allora), `prisma/schema.prisma` (nessuna modifica: nessuna nuova tabella/colonna).

### Project Structure Notes

- File nuovi: `prisma/migrations/<timestamp>_add_foto_profilo/migration.sql`, `lib/storage/foto-profilo.ts` (+ `.test.ts`), `app/il-mio-profilo/{page.tsx, FotoProfiloForm.tsx, actions.ts, actions.test.ts, il-mio-profilo.module.css}` (se necessario un CSS module oltre alle classi globali `pagina-form`/`riquadro-form` — verificare durante l'implementazione se serve, stesso dubbio già risolto caso per caso nelle altre pagine-form).
- File modificati: `lib/auth/route-guard.ts` (nuova voce `PROTECTED_ROUTES`), `lib/auth/route-guard.test.ts` (nuovo test).
- Nessuna modifica a `prisma/schema.prisma` (nessuna nuova tabella/colonna — solo bucket Storage + funzione + policy RLS via migrazione SQL scritta a mano, come richiesto dalla convenzione del progetto per le policy RLS con `auth.jwt()`).
- `app/il-mio-profilo/` è un nuovo percorso **non** annidato in un route group esistente (`app/(dati-atleta)/`, ecc.) — stessa scelta già fatta per `app/modifica-password/` (Story 9.4): è una funzionalità trasversale legata all'account/identità dell'Utente, non di proprietà esclusiva di un singolo modulo di dominio (AD-2).

### References

- [Source: _bmad-output/implementation-artifacts/epic-9-context.md#Story 9.12 — decisioni prese con l'utente in fase di creazione storia]
- [Source: lib/storage/logo.ts — pattern path fisso/upsert:true/list() da riusare, reso generico sul bucket]
- [Source: lib/storage/certificati.ts — pattern bucket privato/URL firmato/magic-byte, righe 15-34 e 112-126]
- [Source: prisma/migrations/20260718020000_certificati_storage_e_rls/migration.sql — pattern completo bucket privato + funzione SECURITY DEFINER + policy storage.objects con (storage.foldername(name))[1]]
- [Source: prisma/migrations/20260718010000_genitori_atlete_auto_aggancio/migration.sql — atleta_possiede_presenza, da riusare identica]
- [Source: prisma/migrations/20260718090000_logo_bucket_restrict_path/migration.sql — lezione appresa: upsert:true richiede sia INSERT sia UPDATE come policy]
- [Source: app/(dati-atleta)/dati-fisici/page.tsx righe 86-114 — pattern di risoluzione identità Allenatore/Atleta(autoAggancio) da riusare identico]
- [Source: app/(certificati-medici)/certificato-medico/actions.ts righe 39-82 — pattern di validazione file da adattare]
- [Source: app/(auth)/reimposta-password/actions.ts e ReimpostaPasswordForm.tsx (Story 9.11) — pattern di Server Action con discriminatore legato via .bind(), mai un id accettato dal client]
- [Source: lib/auth/route-guard.ts — PROTECTED_ROUTES/filtraVociNavigazione, unica fonte di verità per rotte e voci di navigazione]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- `npx prisma migrate deploy` tentato in locale: `P1001: Can't reach database server at 127.0.0.1:54322` — nessuna istanza Supabase locale in esecuzione in questa sessione. Migrazione scritta e verificata sintatticamente contro lo stile delle precedenti (bucket + funzione SECURITY DEFINER + policy), non applicata/verificata dal vivo.

### Completion Notes List

- Task 1: migrazione `20260728000000_add_foto_profilo` — due bucket privati (`foto-profilo-atlete`, `foto-profilo-allenatori`, 5MB, JPG/PNG), nuova funzione `utente_possiede_allenatore` (nessun equivalente esistente), riuso di `atleta_possiede_presenza` per l'Atleta, policy ampie (ALLENATORE/ADMIN/DIRIGENTE/SEGRETERIA) + proprie per INSERT/UPDATE (entrambe, per l'`upsert:true` — lezione della Story 7.2 applicata fin da subito).
- Task 2: `lib/storage/foto-profilo.ts` — stesso pattern di `lib/storage/logo.ts` (path fisso, `upsert:true`, `list()` per l'esistenza) reso generico sul bucket, e di `lib/storage/certificati.ts` (magic-byte, URL firmato). 12 nuovi test.
- Task 3: `/il-mio-profilo` aggiunta a `PROTECTED_ROUTES` (ALLENATORE, ATLETA) — compare automaticamente in navigazione.
- Task 4: `page.tsx` riusa **esattamente** il pattern di risoluzione identità già scritto in `dati-fisici/page.tsx` (stesso `Promise.all` Prisma), nessuna nuova query inventata.
- Task 5: `caricaFotoProfilo(tipo, ...)` — `tipo` (`ATLETA`/`ALLENATORE`) legato via `.bind()`, mai un `entitaId` dal client; l'entità viene sempre risolta lato server dalla sessione. Nuovo codice di errore `NON_COLLEGATO` (distinto da `FORBIDDEN`, che resta riservato ai rifiuti di autorizzazione per Ruolo). 10 nuovi test.
- Nessuna UI aggiunta in altre pagine esistenti (per decisione esplicita presa in fase di creazione storia) — solo la fondazione di accesso (policy RLS ampie) è pronta per un uso futuro.
- Nessun test di rendering introdotto per `FotoProfiloForm.tsx`, coerente con la convenzione già stabilita nel progetto.
- Task 6: 616/616 test passati, `tsc --noEmit` pulito, ESLint pulito sui file di questa storia (7 problemi residui nel progetto sono tutti pre-esistenti, in file non toccati qui — verificato con `git status`). Verifica manuale dal vivo (RLS reale) demandata all'utente dopo il deploy, non eseguibile in questa sessione (nessuna istanza Supabase locale).
- Code review (2026-07-28): Acceptance Auditor 0 violazioni sui 7 AC. 1 decision-needed risolta con l'utente (accesso ampio dell'Allenatore a tutte le foto, non scoped per Gruppo — confermato esplicitamente come scelta voluta, nessuna modifica). 7 patch applicati (alt text, `try/catch` in `SezioneFoto` per non far crashare la pagina su un errore Storage transitorio, ramo `tipo` reso esaustivo con errore difensivo, `orderBy` deterministico su entrambe le risoluzioni indipendenti dell'Atleta, 3 nuovi test negativi, `width`/`height` sull'`<img>`, commenti chiarificatori in `foto-profilo.ts`). 4 defer (nessun `try/catch` su `requireRuolo` — pattern pre-esistente in ogni Server Action, nessuna validazione client-side — bassa priorità, `attivo` non verificato per l'Allenatore — stesso trade-off già accettato in tutto il progetto, doppio round-trip `getUser()` — inefficienza minore coerente col resto del codice). Regressione completa dopo i fix: 618/618 test, `tsc --noEmit` pulito, ESLint pulito.

### File List

- `prisma/migrations/20260728000000_add_foto_profilo/migration.sql` (nuovo)
- `lib/storage/foto-profilo.ts` (nuovo)
- `lib/storage/foto-profilo.test.ts` (nuovo)
- `lib/auth/route-guard.ts` (modificato — nuova voce `PROTECTED_ROUTES` per `/il-mio-profilo`)
- `lib/auth/route-guard.test.ts` (modificato — nuovi test per `/il-mio-profilo`)
- `app/il-mio-profilo/page.tsx` (nuovo)
- `app/il-mio-profilo/FotoProfiloForm.tsx` (nuovo)
- `app/il-mio-profilo/actions.ts` (nuovo)
- `app/il-mio-profilo/actions.test.ts` (nuovo)
- `app/il-mio-profilo/il-mio-profilo.module.css` (nuovo)

## Change Log

- 2026-07-28: Implementata Story 9.12 — upload/sostituzione foto profilo self-service per Atleta (autoAggancio) e Allenatore (agganciato) su nuova pagina `/il-mio-profilo`. Due bucket Storage privati con policy RLS che permettono la visione anche ad Allenatore/Admin/Dirigente/Segreteria (non solo al proprietario), nessuna UI aggiunta altrove per decisione esplicita. 616/616 test passati, 0 errori tsc/eslint sui file di questa storia. Migrazione non applicata localmente (nessuna istanza Supabase disponibile in questa sessione) — verifica RLS reale demandata all'utente dopo il deploy.
- 2026-07-28: Code review chiusa — 7 patch applicati (accessibilità/robustezza/copertura test), 1 decision-needed risolta con l'utente (accesso ampio Allenatore confermato), 4 elementi deferiti. 618/618 test passati.
