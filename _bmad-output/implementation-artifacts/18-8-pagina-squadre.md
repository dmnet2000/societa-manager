---
baseline_commit: 7ac822a
---

# Story 18.8: Pagina pubblica "Squadre"

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Visitatore senza account,
I want vedere l'elenco delle squadre/categorie della società con lo staff tecnico assegnato,
so that possa conoscere l'organizzazione sportiva del settore volley.

## Acceptance Criteria

1. **Given** un Visitatore senza sessione **When** visita `/squadre` **Then** vede l'elenco dei Gruppi della stagione corrente (nome, categoria) con gli Allenatori assegnati a ciascuno (nome e cognome).
2. **And** nessun dato di Atleta (nome, elenco iscritti, conteggio, ecc.) è esposto in questa vista.
3. **And** un Gruppo senza Allenatori assegnati compare comunque, senza elenco staff — nessuna riga dell'elenco viene nascosta per questo.
4. **And** se nessun Gruppo esiste per la stagione corrente, la pagina mostra un messaggio esplicito invece di un'area vuota.

## Tasks / Subtasks

- [x] Task 1: Estrarre `HeaderPubblico.tsx` (Server Component riusabile) — refactor, nessun AC diretto ma precondizione per Task 3
  - [x] **Decisione presa con l'utente in apertura di questa storia (2026-08-13)**: `app/page.tsx` costruisce oggi header/footer inline (nessun layout condiviso, per scelta esplicita già documentata nei Dev Notes di Story 18.7). Questa è la seconda pagina pubblica reale — stesso punto in cui il progetto estrae sempre un componente condiviso "al secondo consumer reale" (es. `app/icone-azione-riga.tsx`, Story 9.30) invece di duplicare. Estrarre ora evita di ripetere la stessa duplicazione altre 3 volte nelle Story 18.9-18.11.
  - [x] Nuovo `app/HeaderPubblico.tsx` (Server Component **self-contained**, nessun prop obbligatorio) — mirror strutturale del blocco `<header>` esistente in `app/page.tsx` (righe 238-255 di quel file, prima del refactor): `createClient()` interno + `leggiInfoLogo(supabase)` + `leggiNomeSettore()` (entrambi con lo stesso `.catch()` fail-soft già in uso), `nomeVisualizzato = nomeSettore ?? "Settore Volley"` calcolato internamente. Renderizza `.brand` (logo condizionale + nome settore), `<NavPubblica />` (Story 18.7, già riusabile as-is), link "Accedi" — identico markup, solo spostato.
  - [x] Nuovo `app/HeaderPubblico.module.css` — le classi `.header`/`.brand`/`.logo`/`.nomeSettore`/`.accedi` **spostate** (non copiate) da `app/home-pubblica.module.css`, che le perde. Stesso principio già stabilito per `NavPubblica.module.css` (Story 18.7): un componente riusato da più pagine ha il proprio modulo dedicato, eccezione esplicita alla convenzione "un modulo per pagina" (quella convenzione si applica a *contenuto* di pagina, non a componenti condivisi).
  - [x] `app/page.tsx`: sostituire il blocco `<header>` inline con `<HeaderPubblico />`; rimuovere gli import diventati inutili in quel file (`leggiInfoLogo`, `urlPubblicoLogo` se non più usati altrove in quella pagina — verificare, `nomeVisualizzato`/`leggiNomeSettore()` restano invece necessari perché il resto della pagina li usa ancora per `<h1>` e per `<FooterPubblico>`, Task 2).

- [x] Task 2: Estrarre `FooterPubblico.tsx` (Server Component riusabile) — refactor, nessun AC diretto
  - [x] Nuovo `app/FooterPubblico.tsx` (Server Component, un solo prop opzionale) — mirror del blocco `<footer>` esistente in `app/page.tsx` (righe 424-428 prima del refactor): `leggiNomeSettore()` interno (fail-soft), `<p>&copy; {anno} {nomeVisualizzato}</p>`.
  - [x] Prop `conSpazioCookieBanner?: boolean` (default `false`) — **non estendere l'ambito del `CookieBanner`** (Story 18.6, decisione già presa con l'utente in quella storia: "montarlo solo su `/`", vedi Dev Notes) a `/squadre` in questa storia. Il padding-bottom di sicurezza esistente in `.footer` (spazio riservato al pulsante fisso "Preferenze cookie", Story 18.6 review fix) va quindi applicato **solo** quando il footer è renderizzato sulla home (che monta ancora `<CookieBanner>`), non su `/squadre` (che non lo monta e non ne ha bisogno). Implementare con una seconda classe CSS modificatore (es. `.footerConCookieBanner`), non con lo stesso padding fisso su ogni pagina.
  - [x] Nuovo `app/FooterPubblico.module.css` — classe `.footer` spostata da `home-pubblica.module.css` (stesso principio di Task 1), più la nuova `.footerConCookieBanner` (solo il `padding-bottom` extra, il resto ereditato da `.footer`).
  - [x] `app/page.tsx`: sostituire il `<footer>` inline con `<FooterPubblico conSpazioCookieBanner />` (la home continua a montare `<CookieBanner>` subito dopo, invariato).

- [x] Task 3: Nuova rotta `/squadre` (AC: #1, #2, #3, #4)
  - [x] Nuovo `app/squadre/page.tsx` — Server Component, `export const dynamic = "force-dynamic"` (stesso motivo già documentato in `app/page.tsx`: i dati possono cambiare in qualunque momento dalla console Admin).
  - [x] `annoCorrente` risolto con `trovaAnnoAgonisticoCorrente()` (**mai** `risolviAnnoAgonisticoCorrente`, che ha un side-effect di scrittura non ammissibile in una pagina GET — stesso vincolo già rispettato in `/app/gruppi/page.tsx` e in `app/page.tsx` per la sezione Foto squadra, Story 18.4).
  - [x] Query Gruppi con `select` esplicito (non `include` come in `/app/gruppi/page.tsx`, che precede la convenzione public-page stabilita da Story 18.2 in poi — qui va applicata fin da subito) — mirror del filtro/ordinamento già in uso in `/app/gruppi/page.tsx` (Gruppi ordinati per `nome: "asc"`, Allenatori annidati ordinati `[{ allenatore: { nome: "asc" } }, { allenatore: { cognome: "asc" } }]`), proiettato solo sui campi pubblici (AC #2, per costruzione: la query non tocca mai `GruppoAtleta`/`Atleta`, non serve un filtro applicativo successivo):
    ```ts
    annoCorrente
      ? prisma.gruppo.findMany({
          where: { annoAgonisticoId: annoCorrente.id },
          orderBy: { nome: "asc" },
          select: {
            id: true,
            nome: true,
            categoria: true,
            allenatori: {
              select: { allenatore: { select: { id: true, nome: true, cognome: true } } },
              orderBy: [{ allenatore: { nome: "asc" } }, { allenatore: { cognome: "asc" } }],
            },
          },
        })
      : Promise.resolve([])
    ```
  - [x] Foto di squadra (nota dell'epica, non un AC separato — Story 18.4 già done): `elencaGruppiConFoto(supabase)` (una sola chiamata Storage per l'intera pagina, stesso principio già in uso in `app/page.tsx`) + `urlPubblicoFotoSquadra(supabase, gruppo.id)` per il singolo Gruppo che ne ha una — **a differenza** della sezione Foto squadra della home (che filtra via i Gruppi senza foto), qui ogni Gruppo va comunque mostrato (AC #3 parla di "senza Allenatori", ma lo stesso principio di non-nascondere si applica coerentemente anche alla foto: un Gruppo senza foto mostra solo nome/categoria/staff, non sparisce dall'elenco).
  - [x] AC #3: un Gruppo con `allenatori.length === 0` compare comunque nell'elenco — nessun `.filter()` sull'array dei Gruppi, solo un rendering condizionale dell'eventuale lista Allenatori all'interno della card di quel Gruppo (`{gruppo.allenatori.length > 0 && (<ul>...</ul>)}`, nessun messaggio "nessun allenatore" richiesto da alcun AC).
  - [x] AC #4: `gruppi.length === 0` (dopo la risoluzione di `annoCorrente`, incluso il caso `annoCorrente` stesso assente) → messaggio esplicito invece di un'area vuota — stesso principio già stabilito per `/app/gruppi`/`/app/partite` quando non c'è alcuna riga da mostrare (non il pattern "nessuna sezione" di Sponsor/Partite/FotoSquadra in home, che è per una *sezione opzionale* dentro una pagina più ampia: qui l'intera pagina esiste solo per questo contenuto, quindi serve un messaggio testuale, non una sparizione silenziosa).
  - [x] Markup: `<HeaderPubblico />`, `<main><h1>Squadre</h1>...</main>`, `<FooterPubblico />` (nessun `conSpazioCookieBanner`, nessun `<CookieBanner>` — vedi Task 2).
  - [x] Nuovo `app/squadre/squadre.module.css` — griglia di card, stesso idioma già stabilito in `home-pubblica.module.css` per `.listaFotoSquadra`/`.schedaFotoSquadra` (`repeat(auto-fill, minmax(_px,1fr))`), card con nome/categoria/eventuale foto/eventuale elenco Allenatori. Nessun colore nuovo, stessi token DESIGN.md.

- [x] Task 4: Test (AC: tutti)
  - [x] Nessun test diretto su `HeaderPubblico.tsx`/`FooterPubblico.tsx`/`app/squadre/page.tsx` (convenzione consolidata del progetto, nessun componente di rendering ne ha — stesso limite già accettato per `NavBarClient.tsx`/`CookieBanner.tsx`/`NavPubblica.tsx`).
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti — in particolare verificare che il refactor di `app/page.tsx` (Task 1/2) non abbia rotto nulla della home pubblica esistente (nessun test diretto la copre, ma la build/tsc intercetterebbero un errore di markup/import).

### Review Findings

- [x] [Review][Patch] `trovaAnnoAgonisticoCorrente()` senza `.catch()` — un errore DB transiente faceva crashare l'intera pagina invece di degradare al messaggio esplicito già previsto dall'AC #4 [app/squadre/page.tsx] — trovato indipendentemente da Blind Hunter ed Edge Case Hunter. Risolto: `.catch()` fail-soft aggiunto, stesso principio già applicato alla query Gruppi subito sotto nello stesso file.
- [x] [Review][Patch] Doppio lookup nella Map (`fotoPerGruppo.has(...)` seguito da `fotoPerGruppo.get(...)`) invece di un solo `get()` riusato [app/squadre/page.tsx] — trovato dal Blind Hunter. Risolto: un solo `get()`, `undefined` distingue "nessuna foto" con la stessa precisione di `has()`.
- [x] [Review][Patch] Commento di `squadre.module.css` afferma "un CSS module per pagina, mai condiviso" senza citare l'eccezione già introdotta nello stesso commit (`HeaderPubblico.module.css`/`FooterPubblico.module.css`) — un futuro lettore che apre questo file per primo riceve un'affermazione fuorviante della regola [app/squadre/squadre.module.css] — trovato dal Blind Hunter. Risolto: commento aggiornato con il rimando esplicito.
- [x] [Review][Defer] `leggiNomeSettore()` letta 3 volte per singola richiesta sulla home (pagina + `HeaderPubblico` + `FooterPubblico`), 2 volte su `/squadre` — **non un difetto**: decisione esplicita già presa con l'utente in fase di creazione di questa storia (vedi Dev Notes "Estrazione HeaderPubblico/FooterPubblico"), per mantenere i componenti self-contained e riusabili senza prop-drilling. Costo trascurabile su una tabella singleton non protetta da RLS.
- [x] [Review][Defer] `elencaGruppiConFoto(supabase)` eseguita anche quando `annoCorrente` è `null` (il suo risultato non può mai essere usato, `gruppi` è già `[]`) [app/squadre/page.tsx] — deferred, inefficienza minima, scala ridotta del progetto.
- [x] [Review][Defer] Un fallimento della query Gruppi (`.catch(() => [])`) produce lo stesso messaggio "Nessuna squadra disponibile" di una stagione realmente vuota — indistinguibile per il visitatore/operatore [app/squadre/page.tsx] — deferred, stesso pattern fail-soft già accettato in tutto il progetto per ogni query pubblica.
- [x] [Review][Defer] Nessun `loading="lazy"` sul nuovo `<img>` della foto di squadra [app/squadre/page.tsx] — deferred, stesso gap già presente nella sezione Foto squadra della home (Story 18.4), non introdotto né peggiorato da questa storia.
- [x] [Review][Defer] `orderBy` su Gruppi/Allenatori senza tiebreaker su `id` — ordine non garantito stabile in caso di valori duplicati [app/squadre/page.tsx] — deferred, nessuno scenario concreto di duplicazione nota, stesso pattern già in uso in `/app/gruppi/page.tsx`.
- [x] [Review][Defer] Il messaggio di stato vuoto non distingue "nessuna stagione corrente configurata" da "stagione corrente senza Gruppi" — due problemi amministrativi diversi con lo stesso testo visitatore [app/squadre/page.tsx] — deferred, nessun AC richiede di distinguerli.
- [x] [Review][Dismiss] `conSpazioCookieBanner` come "leaky abstraction" — decisione di design già presa esplicitamente nei Dev Notes della storia (approvata in fase di creazione), non un difetto.
- [x] [Review][Dismiss] Fail-soft con solo `console.error`, nessun error-reporting condiviso — convenzione già stabilita in ogni query pubblica del progetto, non specifica di questa storia.
- [x] [Review][Dismiss] `createClient()` in `HeaderPubblico.tsx` non avvolto in try/catch — stesso identico pattern già presente ovunque nel progetto (mai guardato in nessuna pagina), nessun precedente di guardia su questa chiamata.
- [x] [Review][Dismiss] Possibile disallineamento tra `HeaderPubblico` e `FooterPubblico` se `nomeSettore` cambia a metà richiesta — teorico, esplicitamente etichettato come tale dallo stesso reviewer, nessuno scenario concreto.

## Dev Notes

### Decisioni di analisi (vedi `epics.md#Epic 18`, Story 18.8)

- **Dipendente da Story 18.1** (done) e **18.7** (done — la rotta `/squadre` è già raggiungibile dal menu pubblico E già in `PUBLIC_ROUTES`, aggiunta lì durante la code review di 18.7 proprio in previsione di questa storia: **questa storia non deve toccare `lib/auth/route-guard.ts`**, verificare solo che la voce sia già presente).
- **Riuso in sola lettura pubblica di `Gruppo`/`GruppoAllenatore`** — stessi dati già letti in `/app/gruppi` (Epic 9), ma con `select` invece di `include` (convenzione public-page stabilita da Story 18.2) e **senza** l'elenco Atlete (dato RLS-protetto, mai esposto pubblicamente — stesso principio già applicato a Partite/Sponsor/Foto squadra).
- **Foto di squadra** (Story 18.4, già done): mostrata quando presente, per nota esplicita dell'epica — non è un AC formale di questa storia, ma un comportamento atteso dato che la funzionalità esiste già.
- **`CookieBanner` resta scoped alla sola home** — decisione già presa con l'utente nella code review di Story 18.6 ("ambito banner confermato solo su `/`"), non riaperta né estesa da questa storia. `/squadre` non carica alcuno strumento non essenziale, coerente con quella decisione.

### Estrazione `HeaderPubblico`/`FooterPubblico` — perché ora, non prima

Fino a Story 18.7, `app/page.tsx` era l'**unica** pagina pubblica reale — duplicare la sua logica di header/footer non aveva senso perché non c'era nulla con cui condividerla. Questa storia introduce la **seconda** pagina pubblica reale (`/squadre`), e altre 3 arriveranno (Story 18.9-18.11): è il punto naturale per estrarre, stesso principio già seguito ripetutamente in questo progetto quando un secondo consumer reale di una stessa logica si presenta (es. `app/icone-azione-riga.tsx`, estratto al secondo consumer in Story 9.30 invece che alla prima occorrenza). **Decisione presa con l'utente in apertura di questa storia**: estrarre ora, refactorizzando anche `app/page.tsx` per usare i nuovi componenti, invece di duplicare ancora e rimandare.

`HeaderPubblico`/`FooterPubblico` sono **self-contained** (nessuna dipendenza dai dati già caricati dalla pagina che li monta): ciascuno risolve `leggiNomeSettore()` (e `HeaderPubblico` anche `leggiInfoLogo()`) per conto proprio, con lo stesso `createClient()`/`.catch()` fail-soft già in uso. Questo introduce una piccola ridondanza di letture (es. sulla home, `nomeSettore` viene letto sia da `HeaderPubblico` sia da `FooterPubblico` sia dalla pagina stessa per il proprio `<h1>` — 3 letture invece di 1) ma mantiene ogni componente indipendente e riusabile senza dover far transitare `nomeVisualizzato` come prop attraverso ogni pagina futura. Sono letture singole su una tabella singleton non protetta da RLS (`ConfigurazioneApplicazione`, AD-9), costo trascurabile — stesso ordine di grandezza di altre letture già duplicate nel progetto senza essere mai state consolidate con una cache di richiesta (nessun uso di `React.cache()` nel progetto).

### `conSpazioCookieBanner` — perché un prop, non una classe fissa

Il `padding-bottom` di sicurezza esistente su `.footer` (Story 18.6 review fix) esiste **solo** per non far sovrapporre il pulsante fisso "Preferenze cookie" al testo del copyright. Se `FooterPubblico` diventa condiviso ma `CookieBanner` resta montato solo sulla home (vedi sopra), applicare quel padding extra su *ogni* pagina che monta `FooterPubblico` sprecherebbe spazio su pagine che non hanno mai quel pulsante fisso. Da qui il prop booleano opzionale, passato `true` solo dalla home.

### Pattern da riusare (non reinventare)

- **Estrazione di un componente riusabile al secondo consumer**: `app/icone-azione-riga.tsx` (Story 9.30) — stesso principio, applicato qui a header/footer pubblici.
- **Query Gruppi + Allenatori scoped alla stagione corrente**: `/app/gruppi/page.tsx` (righe della query Gruppi, `trovaAnnoAgonisticoCorrente`) — stesso filtro/ordinamento, convertito da `include` a `select` per il confine di sicurezza pubblico.
- **Foto di squadra per-Gruppo**: `lib/storage/foto-squadra.ts` (`elencaGruppiConFoto`, `urlPubblicoFotoSquadra`) e il relativo pattern di rendering condizionale già in `app/page.tsx` (Story 18.4) — qui applicato senza il `.filter()` che nasconde i Gruppi senza foto (diverso dalla sezione home: qui ogni Gruppo resta visibile).
- **Messaggio esplicito invece di area vuota quando l'intera pagina non ha contenuto**: `/app/gruppi`/`/app/partite` (nessuna riga → messaggio testuale) — diverso dal pattern "nessuna sezione" di Sponsor/Partite/FotoSquadra in home (quello è per una sezione opzionale dentro una pagina più ampia, non l'intera pagina).
- **Componente condiviso con proprio CSS module dedicato**: `NavPubblica.tsx`/`NavPubblica.module.css` (Story 18.7) — stesso principio per `HeaderPubblico`/`FooterPubblico`.

### Project Structure Notes

- Nuovi: `app/HeaderPubblico.tsx`, `app/HeaderPubblico.module.css`, `app/FooterPubblico.tsx`, `app/FooterPubblico.module.css`, `app/squadre/page.tsx`, `app/squadre/squadre.module.css`.
- Modificati: `app/page.tsx` (rimosso il markup inline di header/footer, sostituito con `<HeaderPubblico />`/`<FooterPubblico conSpazioCookieBanner />`), `app/home-pubblica.module.css` (rimosse le classi spostate: `.header`, `.brand`, `.logo`, `.nomeSettore`, `.accedi`, `.footer`).
- Nessuna modifica a `lib/auth/route-guard.ts` (rotta già pubblica dalla Story 18.7), nessuna migrazione DB, nessuna nuova Server Action.

### References

- [Source: app/page.tsx] — blocco header/footer esistente da estrarre, pattern `Promise.all`/fail-soft da riprodurre in `HeaderPubblico`/`FooterPubblico`.
- [Source: app/NavPubblica.tsx, app/NavPubblica.module.css, Story 18.7] — precedente diretto di componente pubblico condiviso con modulo CSS dedicato.
- [Source: app/app/(gruppi-allenatori)/gruppi/page.tsx] — query Gruppi/Allenatori scoped alla stagione corrente da mirrorare (convertendo `include` in `select`).
- [Source: lib/storage/foto-squadra.ts, elencaGruppiConFoto/urlPubblicoFotoSquadra] — foto di squadra, stesso pattern già in uso in `app/page.tsx` (Story 18.4).
- [Source: prisma/schema.prisma, Allenatore/GruppoAllenatore] — `nome`/`cognome` campi separati su `Allenatore` (a differenza di `Atleta.nome`, unico).
- [Source: _bmad-output/implementation-artifacts/18-6-consenso-cookie.md] — decisione "banner solo su `/`", non riaperta da questa storia.
- [Source: epics.md#Epic 18: Sito pubblico Settore Volley, Story 18.8] — testo originale degli AC.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

### Completion Notes List

- Implementazione seguita esattamente come pianificato in fase di analisi, nessuna deviazione. `HeaderPubblico`/`FooterPubblico` estratti self-contained come da Dev Notes (ciascuno con la propria lettura `leggiNomeSettore()`/`leggiInfoLogo()`, nessun prop di dati obbligatorio); `app/page.tsx` refactorizzato per usarli, `leggiInfoLogo`/`urlPubblicoLogo`/`Link` non più necessari lì (rimossi dagli import), `nomeSettore`/`leggiNomeSettore()` invece mantenuti perché ancora usati dall'`<h1>` della home.
- `FooterPubblico` riceve `conSpazioCookieBanner` (default `false`) — solo `app/page.tsx` lo passa `true`, `/squadre` no (`CookieBanner` resta scoped alla sola home, decisione già presa in Story 18.6, non riaperta qui).
- Classi CSS `.header`/`.brand`/`.logo`/`.nomeSettore`/`.accedi`/`.footer` **spostate** (non copiate) da `home-pubblica.module.css` a `HeaderPubblico.module.css`/`FooterPubblico.module.css` — nessun residuo lasciato in `home-pubblica.module.css`, verificato.
- Query Gruppi/Allenatori in `app/squadre/page.tsx` con `select` esplicito (mai `include`), mirror del filtro/ordinamento di `/app/gruppi/page.tsx` — nessun campo di `Atleta`/`GruppoAtleta` toccato dalla query, AC #2 soddisfatto per costruzione.
- **Code review completata** (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo) — 0 decision-needed, 3 patch applicati (`trovaAnnoAgonisticoCorrente()` senza `.catch()` — trovato indipendentemente da 2 layer, minacciava direttamente l'intento dell'AC #4; doppio lookup Map; commento CSS fuorviante sulla convenzione "un modulo per pagina"), 6 defer (letture triplicate di `nomeSettore` — decisione già presa esplicitamente in fase di analisi, non un difetto; query Foto squadra eseguita a vuoto quando non c'è stagione; fallimento query indistinguibile da stagione vuota; nessun `loading="lazy"`; `orderBy` senza tiebreaker; messaggio vuoto non distingue le due cause), 4 scartati come rumore/decisioni già prese/convenzioni consolidate. Vedi Review Findings sopra.
- Verifica: `npx vitest run` (1113/1113 passati, nessun nuovo test necessario — convenzione consolidata "nessun test diretto su componenti di rendering"), `npx tsc --noEmit`, `npm run lint` (0 errori, solo warning `<img>`/`no-img-element` preesistenti + 2 nuovi coerenti con lo stesso stile), `npm run build` puliti (`/squadre` compare correttamente come rotta dinamica nell'output).

### File List

- Nuovi: `app/HeaderPubblico.tsx`, `app/HeaderPubblico.module.css`, `app/FooterPubblico.tsx`, `app/FooterPubblico.module.css`, `app/squadre/page.tsx`, `app/squadre/squadre.module.css`.
- Modificati: `app/page.tsx` (rimosso il markup inline di header/footer, sostituito con `<HeaderPubblico />`/`<FooterPubblico conSpazioCookieBanner />`; rimossi import `leggiInfoLogo`/`urlPubblicoLogo`/`Link` non più usati; rimossa `info` dal `Promise.all`), `app/home-pubblica.module.css` (rimosse le classi spostate: `.header`, `.brand`, `.logo`, `.nomeSettore`, `.accedi`, `.footer`), `app/squadre/page.tsx` (review fix: `.catch()` su `trovaAnnoAgonisticoCorrente()`, lookup Map singolo), `app/squadre/squadre.module.css` (review fix: commento chiarito).

## Change Log

- 2026-08-13: File di story creato (create-story workflow) — decisione presa con l'utente in apertura: estrarre `HeaderPubblico`/`FooterPubblico` come componenti Server condivisi (refactorizzando anche `app/page.tsx`) invece di duplicare header/footer una terza volta, stesso principio già seguito nel progetto per l'estrazione "al secondo consumer reale". `CookieBanner` resta scoped alla sola home (decisione già presa in Story 18.6, non riaperta). Stato ready-for-dev.
- 2026-08-13: Implementata (dev-story workflow) - tutti e 4 i Task completati. `HeaderPubblico.tsx`/`FooterPubblico.tsx` estratti (self-contained, propria lettura dati) con moduli CSS dedicati, `app/page.tsx` refactorizzato per usarli. Nuova rotta `app/squadre/page.tsx`: elenco Gruppi della stagione corrente con Allenatori assegnati (query `select`, mai `include`), foto di squadra quando presente, messaggio esplicito se nessun Gruppo esiste. 1113/1113 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita (`/squadre` presente nell'output). Status: review.
- 2026-08-13: Code review completata (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo). 0 decision-needed. 3 patch applicati: `trovaAnnoAgonisticoCorrente()` senza `.catch()` corretto (trovato indipendentemente da 2 layer, minacciava l'intento dell'AC #4 — un errore DB crashava l'intera pagina invece di degradare al messaggio esplicito), doppio lookup Map ridotto a uno, commento CSS su `squadre.module.css` chiarito. 6 defer (letture triplicate di `nomeSettore` — decisione già presa, non un difetto; query Foto squadra a vuoto senza stagione; fallimento query indistinguibile da stagione vuota; nessun `loading="lazy"`; `orderBy` senza tiebreaker; messaggio vuoto non distingue le due cause). 4 scartati come rumore/decisioni già prese/convenzioni consolidate. 1113/1113 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: done.
