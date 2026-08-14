---
baseline_commit: a957215
---

# Story 18.9: Pagina pubblica "Calendario"

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Visitatore senza account,
I want vedere il calendario completo delle partite della stagione, non solo quelle della settimana corrente,
so that possa consultare anche le partite passate o delle settimane successive.

## Acceptance Criteria

1. **Given** un Visitatore senza sessione **When** visita `/calendario` **Then** vede le partite di ogni settimana della stagione corrente (non solo quella in corso), raggruppate per settimana e ordinate cronologicamente, per tutti i Gruppi — squadre, data/ora, luogo.
2. **And** i campi mostrati per ogni partita restano gli stessi di Story 18.3 (nessuna colonna "Azioni", nessun dato riservato).
3. **And** se la stagione corrente non ha alcuna partita programmata, la pagina mostra un messaggio esplicito invece di un'area vuota.

## Tasks / Subtasks

- [x] Task 1: Query pubblica sola lettura sull'intera stagione (AC: #1, #2, #3)
  - [x] `annoCorrente` risolto con `trovaAnnoAgonisticoCorrente()` (`@/lib/anno-agonistico`), **mai** `risolviAnnoAgonisticoCorrente` (side-effect di scrittura non ammissibile in una pagina GET — stesso vincolo già documentato per `/app/partite`, `/app/gruppi` e `app/squadre/page.tsx`, Story 18.8 Dev Notes). Applicare `.catch()` fail-soft fin da subito (non rimandarlo a un fix di code review come accaduto in Story 18.8: `trovaAnnoAgonisticoCorrente().catch((err) => { console.error(err); return null; })`).
  - [x] Query `prisma.partita.findMany` con **`select` esplicito** (mai `include`) — mirror del filtro/orderBy già in uso in `app/app/(partite-campionati)/partite/page.tsx` (`where: { gruppo: { annoAgonisticoId: annoCorrente.id } } }`, `orderBy: [{ data: "asc" }, { ora: "asc" }]`), ma **senza** lo scoping per Ruolo/Allenatore/Atleta di quella pagina (qui è sempre "tutti i Gruppi", nessuna sessione da risolvere) — stesso principio già seguito dalla query Partite della settimana in `app/page.tsx` (Story 18.3). Campi selezionati: `id`, `data`, `ora`, `squadraCasa`, `squadraOspite`, `impianto`, `indirizzoImpianto`, `gruppo: { select: { nome: true } } }` — **esattamente gli stessi campi già letti da `app/page.tsx` per il teaser** (AC #2: "gli stessi campi di Story 18.3"), **senza** `campionato` (che `/app/partite` include ma la home pubblica no) e senza alcuna colonna "Azioni". `.catch(() => [])` fail-soft, stesso pattern di ogni query pubblica del progetto.
  - [x] Query condizionata a `annoCorrente` esistente (`annoCorrente ? prisma.partita.findMany(...) : Promise.resolve([])`, mirror esatto di `app/squadre/page.tsx`).
  - [x] `raggruppaPerSettimana(partite)` (`@/lib/raggruppa-per-settimana`, già esportata e testata, Story 10.3) — **riuso diretto, nessuna nuova utility**: genera automaticamente ogni settimana lunedì-domenica tra la prima e l'ultima partita della stagione, incluse le settimane senza alcuna partita (comportamento già documentato nel file sorgente della funzione) — questo soddisfa da solo "raggruppate per settimana e ordinate cronologicamente" (AC #1) senza logica aggiuntiva.
  - [x] Nessuna sessione/`createClient()` necessaria in questa pagina: a differenza di `app/squadre/page.tsx` (che legge le foto squadra da Supabase Storage), `/calendario` non mostra foto — solo Prisma diretto (`Partita`/`Gruppo`, non protetti da RLS, AD-9).

- [x] Task 2: Nuova pagina `/calendario` — **sostituire**, non estendere, il placeholder (AC: #1, #2)
  - [x] **Sostituire interamente** `app/calendario/page.tsx` (oggi 21 righe, monta solo `<HeaderPubblico />` + `<InSviluppoPubblico titolo="Calendario" />` + `<FooterPubblico />`, stopgap del 2026-08-13). Il commento nel file placeholder dice esplicitamente "sostituire con la pagina reale quando la Story 18.9 verrà implementata, non estendere questo file" — rimuovere completamente l'import e l'uso di `InSviluppoPubblico`.
  - [x] `export const dynamic = "force-dynamic"` (mantenuto identico al placeholder — i dati possono cambiare in qualunque momento dalla console Admin/Allenatore, stesso motivo già in uso su `/`, `/squadre`, e sul placeholder stesso).
  - [x] Markup: `<HeaderPubblico />`, `<main>` con `<h1>Calendario</h1>` + un blocco per settimana, `<FooterPubblico />` — **nessun** `conSpazioCookieBanner` e nessun `<CookieBanner>` montato (stessa scelta già fatta per `/squadre` in Story 18.8: il banner cookie resta scoped alla sola home, decisione presa nella code review di Story 18.6, non riaperta qui).
  - [x] Wrapper locale `formattaData(data: string)` (`parseDataUtc(data).toLocaleDateString("it-IT", { timeZone: "UTC" })`) — stesso identico pattern già duplicato in `app/page.tsx` e in `app/app/(partite-campionati)/partite/page.tsx` (`parseDataUtc` riusata, `@/lib/raggruppa-per-settimana`, mai un secondo parsing indipendente).
  - [x] Per ogni settimana di `raggruppaPerSettimana`: una sezione con intestazione `settimana.etichetta` (stringa già formattata dalla funzione, es. "11 - 17 agosto 2026"), e per ogni `partita` una match-card con: data formattata + ora, `squadraCasa` - `squadraOspite`, `impianto` + link "Naviga" quando `costruisciLinkNaviga({ indirizzo: partita.indirizzoImpianto })` (`@/lib/link-naviga-palestra`) restituisce un URL, `gruppo.nome` — **stessi campi esatti già mostrati dalla sezione "Partite della settimana" di `app/page.tsx`** (AC #2), nessuna colonna/azione aggiuntiva.
  - [x] Una settimana senza partite (gap nel calendario, es. sosta campionato in mezzo alla stagione) mostra un messaggio testuale interno alla sezione — mirror esatto di `app/app/(partite-campionati)/partite/page.tsx` ("Nessuna partita questa settimana."), non l'intera pagina che sparisce.

- [x] Task 3: Stato vuoto esplicito per l'intera stagione (AC: #3)
  - [x] Quando `settimane.length === 0` (nessuna partita in tutta la stagione, incluso il caso `annoCorrente` stesso assente/null) — messaggio esplicito al posto dell'elenco, testo proposto: **"Nessuna partita programmata per la stagione in corso."** (coerente col tono diretto già stabilito in `EXPERIENCE.md` → Voce e Tono, es. "Nessuna partita in programma questa settimana" per lo stato vuoto settimanale; mai un placeholder generico "presto disponibile"). Stesso principio già applicato in `/app/partite`/`/app/gruppi`/`app/squadre/page.tsx`: intera pagina esiste solo per questo contenuto → messaggio testuale, non il pattern "sezione nascosta" di Sponsor/Partite/FotoSquadra in home (quello è per una sezione opzionale dentro una pagina più ampia).
  - [x] Questo è distinto dal messaggio "Nessuna partita questa settimana" del Task 2 (quello copre una singola settimana vuota dentro una stagione che ha comunque altre partite altrove; questo copre la stagione interamente vuota).

- [x] Task 4: Stile "Poster Sportivo" (`DESIGN.md`/`EXPERIENCE.md`, 2026-08-13) applicato dall'inizio — nessun AC numerato dedicato, ma requisito esplicito di questa storia (vedi Dev Notes "Perché questa pagina va stilizzata subito, non da 18.12")
  - [x] Nuovo `app/calendario/calendario.module.css` (un modulo per pagina, convenzione consolidata — vedi `Project Structure Notes`).
  - [x] Match-card (`components.match-card` di `DESIGN.md`) per ogni partita — vedi Dev Notes "Token esatti da usare" per i valori hex/typography completi da applicare.
  - [x] `<h1>Calendario</h1>` con `typography.display-section` (`DESIGN.md`).
  - [x] Intestazione di settimana (`<h2>{settimana.etichetta}</h2>`) con `typography.label-heading` + colore `{colors.grigio}` (`#5B6472`) — stesso ruolo semantico già assegnato a quel colore in `DESIGN.md` ("testo secondario su sfondo chiaro: numerazione di sezione").
  - [x] Griglia `match-grid`: 2 colonne desktop (≥900px), colonna singola sotto i 900px — unico breakpoint esplicito di `EXPERIENCE.md` → Responsive & Piattaforma, stesso pattern già usato per `team-grid`/`footer-grid`.
  - [x] Contorno di focus visibile sul link "Naviga" (unico elemento interattivo della pagina): `{colors.focus-ring-chiaro}` (`#FFFFFF`) — il link vive su sfondo `{colors.nero}` della match-card, stessa regola contestuale già applicata da `DESIGN.md` (focus scuro→bianco, mai lo stesso colore del testo circostante).

- [x] Task 5: Verifica (AC: tutti)
  - [x] Nessun test diretto su `app/calendario/page.tsx` (convenzione consolidata del progetto — nessun componente di rendering ne ha, stesso limite già accettato per `app/squadre/page.tsx`, `HeaderPubblico.tsx`, `FooterPubblico.tsx`, `NavPubblica.tsx`). `raggruppaPerSettimana`/`parseDataUtc` restano coperte dai test esistenti (`lib/raggruppa-per-settimana.test.ts`, Story 10.3) — nessuna nuova asserzione necessaria, questa storia non ne cambia il comportamento.
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

## Dev Notes

### Decisioni di analisi (vedi `epics.md#Epic 18`, Story 18.9)

- **Dipendente da Story 18.1** (done, home pubblica + `/app`) **e 18.7** (done — `/calendario` è già raggiungibile dal menu pubblico **e già in `PUBLIC_ROUTES`**, `lib/auth/route-guard.ts` righe 40-50, aggiunta in previsione di questa storia esattamente come `/squadre`/`/staff`/`/contatti`). **Questa storia non deve toccare `lib/auth/route-guard.ts`** — verificato in analisi, la voce `"/calendario"` è già presente.
- **Evoluzione della sezione "Partite della settimana" di `app/page.tsx`** (Story 18.3, done) verso una pagina dedicata con **tutte** le settimane della stagione, stesso identico pattern già costruito per `/app/partite` (Epic 10, Story 10.3): query sull'intera stagione + `raggruppaPerSettimana` invece del solo filtro lunedì-domenica corrente di Story 18.3.
- **Nessuna modifica a `app/page.tsx`/alla sezione "Partite della settimana" esistente in questa storia** — l'epica lascia esplicitamente aperta la scelta se aggiungere un link "Vedi calendario completo" dalla home o rimuovere del tutto la sezione home a favore del link ("decisione di dettaglio da confermare in apertura sviluppo, nessun AC la impone"). **Decisione presa in fase di creazione di questa storia**: nessuna delle due, per restare nello scope esatto dei 3 AC — un cambio alla home riaprirebbe Story 18.3 (già `done`) e anticiperebbe il restyling di Story 18.12 (che copre esplicitamente Home e Squadre, non Calendario). Se in futuro si vorrà quel link, sarà una modifica mirata e minima a `app/page.tsx`, fuori da questa storia.
- **Nessuna modifica a `raggruppaPerSettimana`/`parseDataUtc`/`lunediDellaSettimana`/`formattaDataIso`** (`lib/raggruppa-per-settimana.ts`) — tutte già esportate e già usate da `/app/partite` e da `app/page.tsx`, riuso diretto senza alcuna modifica di firma o comportamento.

### Query: mirror di `/app/partite`, con `select` invece di `include`, senza scoping per Ruolo

`app/app/(partite-campionati)/partite/page.tsx` (righe 140-152) usa `include` (pagina autenticata, dietro route-guard) e uno scoping condizionale per Ruolo (Admin/Dirigente vedono tutto, Allenatore solo i propri Gruppi, Atleta/Genitore solo i propri). `/calendario` è pubblica: **nessuna sessione, nessuno scoping per Ruolo** — sempre tutti i Gruppi, come già fa la query Partite della settimana di `app/page.tsx` (Story 18.3, righe 153-171). La query da scrivere è quindi il filtro `where`/`orderBy` di `/app/partite` (scope stagione intera via `annoAgonisticoId`), ma con il `select` e l'assenza di scoping-Ruolo già stabiliti da `app/page.tsx`:

```ts
annoCorrente
  ? prisma.partita
      .findMany({
        where: { gruppo: { annoAgonisticoId: annoCorrente.id } },
        orderBy: [{ data: "asc" }, { ora: "asc" }],
        select: {
          id: true,
          data: true,
          ora: true,
          squadraCasa: true,
          squadraOspite: true,
          impianto: true,
          indirizzoImpianto: true,
          gruppo: { select: { nome: true } },
        },
      })
      .catch((err) => {
        console.error(err);
        return [];
      })
  : Promise.resolve([])
```

Questo è **esattamente** il `select` già in uso in `app/page.tsx` per la sezione Partite della settimana (Story 18.3) — nessun campo nuovo, nessun `campionato` (che `/app/partite` include ma che né la home pubblica né questa pagina devono mostrare, AC #2).

### `trovaAnnoAgonisticoCorrente`, mai `risolviAnnoAgonisticoCorrente`

Stesso identico gotcha già documentato nei Dev Notes di Story 18.8: `risolviAnnoAgonisticoCorrente` (`@/lib/anno-agonistico`) ha un side-effect di scrittura (crea l'Anno Agonistico se assente) inammissibile in una pagina GET pubblica. `trovaAnnoAgonisticoCorrente` è la sola lettura corretta, già usata identicamente da `/app/partite`, `/app/gruppi`, `app/squadre/page.tsx` e dalla sezione Foto squadra di `app/page.tsx`. **Applicare il `.catch()` fail-soft fin dalla prima stesura** (in Story 18.8 questo era mancante nella prima implementazione ed è stato un fix di code review — Blind Hunter + Edge Case Hunter lo hanno trovato indipendentemente, minacciava direttamente l'AC dello stato vuoto: un errore DB transiente faceva crashare l'intera pagina invece di degradare al messaggio esplicito).

### `raggruppaPerSettimana` — firma e comportamento (non reinventare)

`lib/raggruppa-per-settimana.ts`, Story 10.3, già esportata e testata (`lib/raggruppa-per-settimana.test.ts`):

```ts
export function raggruppaPerSettimana<T extends { data: string; ora: string }>(
  partiteInput: T[]
): SettimanaPartite<T>[]

type SettimanaPartite<T> = {
  chiave: string;      // ISO del lunedì, es. "2026-08-11"
  etichetta: string;   // stringa già formattata in italiano, es. "11 - 17 agosto 2026"
  inizio: string;
  fine: string;
  partite: T[];        // ordinate per data poi ora (confronto numerico, non stringa)
};
```

Genera **ogni** settimana lunedì-domenica tra la prima e l'ultima partita presente (comportamento diverso da un semplice `.filter()`/`.groupBy()`: include anche le settimane senza alcuna partita in mezzo alla stagione, con un limite difensivo di 260 settimane/~5 anni). Scarta con un `console.error` le righe con `data` non parsabile invece di far crashare la pagina. `parseDataUtc(data: string): Date` è esportata dallo stesso file e va riusata per il wrapper locale `formattaData` (mai un secondo parsing indipendente, stesso principio già seguito in `app/page.tsx` e `/app/partite`).

### `app/calendario/page.tsx` va SOSTITUITO, non esteso

Il file esiste già (creato durante la code review di Story 18.7 come stopgap, per evitare un 404 grezzo su una voce di menu già pubblica senza contenuto reale dietro). Il suo stesso commento sorgente dice esplicitamente: *"sostituire con la pagina reale quando la Story 18.9 verrà implementata, non estendere questo file"*. Il dev agent deve **riscrivere interamente** il file (nuovo `export default function CalendarioPage()`), non aggiungere codice sopra/sotto `<InSviluppoPubblico />` — quel componente e il suo import vanno rimossi del tutto da questo file (restano invece invariati per `/staff`/`/contatti`, Story 18.10/18.11, non ancora implementate).

### Perché questa pagina va stilizzata "Poster Sportivo" subito, non rimandata a Story 18.12

Story 18.12 (`epics.md`, aggiunta 2026-08-13/14) applica retroattivamente il registro visivo "Poster Sportivo" (`DESIGN.md`/`EXPERIENCE.md` di questa stessa sessione UX, `ux-designs/ux-societa-manager-2026-08-13/`) **solo** a `/` e `/squadre` — le uniche pagine pubbliche già `done` prima che quella sessione UX fosse completata. `/calendario` (questa storia), `/staff` e `/contatti` sono ancora in backlog al momento in cui `DESIGN.md`/`EXPERIENCE.md` sono stati distillati e marcati `status: final`: per queste pagine il registro visivo esiste **già** quando la storia parte, quindi vanno costruite direttamente nello stile finale — **non plain-poi-restilizzate**. `EXPERIENCE.md` → Architettura dell'Informazione elenca esplicitamente `/calendario` come "Backlog (Story 18.9)" con lo stesso `match-card` già specificato in dettaglio in `DESIGN.md.components.match-card` proprio per questo scopo.

**Nota per il dev agent**: `home-pubblica.module.css`/`NavPubblica.module.css` (già `done`) usano oggi i token del **DESIGN.md del portale interno** (`ux-societa-manager-2026-07-22/DESIGN.md`, `var(--color-primary)`, `var(--color-navy)`, ecc. definiti in `app/globals.css`) — **non** il nuovo `DESIGN.md` "Poster Sportivo" di questa sessione (2026-08-13), che la home riceverà solo con Story 18.12. Questa divergenza temporanea tra `/calendario` (nuovo registro, questa storia) e `/`/`/squadre` (vecchio registro provvisorio, fino a 18.12) è **attesa e intenzionale**, non un bug da correggere qui.

### Token esatti da usare per `match-card` (fonte: `DESIGN.md.components.match-card` + `DESIGN.md.Colori`)

Nessun custom property CSS per la palette "Poster Sportivo" esiste ancora in `app/globals.css` (verificato: contiene solo i token del DESIGN.md 2026-07-22 del portale interno, es. `--color-text-primary: #101820`, diverso da `{colors.nero}` `#0B0E14` di questo documento). **Decisione presa in fase di creazione di questa storia**: usare valori hex letterali dentro `calendario.module.css`, ciascuno annotato con un commento che cita il nome esatto del token `DESIGN.md` (stesso principio già seguito nel progetto di citare la fonte del token nei commenti CSS) — **non** aggiungere nuovi custom property a `app/globals.css`, che è condiviso con le pagine autenticate `/app` e appartiene al *diverso* DESIGN.md 2026-07-22: mescolare due vocabolari di token nello stesso scope globale creerebbe ambiguità per un futuro lettore su quale sistema di design appartenga una data variabile. Story 18.12, quando dovrà affrontare lo stesso problema per Home/Squadre, dovrebbe seguire lo stesso principio per coerenza (non enumerato qui, fuori scope di questa storia).

**Eccezione**: tre colori hanno **lo stesso valore esadecimale** già presente in `app/globals.css` per esplicita dichiarazione di `DESIGN.md` ("stessi colori sociali reali... stessi valori esadecimali del portale interno") — questi **possono** riusare i custom property esistenti invece di ripetere l'hex:
- `{colors.azzurro}` `#00A3E0` = `var(--color-primary)` (stesso identico valore)
- `{colors.navy}` `#312682` = `var(--color-navy)` (stesso identico valore)
- `{colors.magenta}` `#E6007C` = `var(--color-magenta)` (stesso identico valore)

Tutti gli altri token sotto **non** hanno un corrispondente identico in `globals.css` (es. `--color-text-primary` è `#101820`, diverso da `{colors.nero}` `#0B0E14` — non intercambiabili) e vanno scritti come hex letterali commentati:

- **Card**: `background: #0B0E14` (`{colors.nero}`); `color: #FFFFFF` (`{colors.bianco}`, testo); `clip-path: polygon(0 0,100% 0,100% 100%,4% 100%)` (taglio diagonale asimmetrico angolo in basso a sinistra); `border-radius: 0` (`{rounded.none}`, nessun angolo arrotondato — divergenza deliberata dal resto del sistema, vedi `DESIGN.md` → Forme). Il "corner-accent" (triangolo azzurro 15% opacità nell'angolo in alto a destra) è un dettaglio decorativo minore, non legato ad alcun AC — implementarlo se ragionevolmente rapido (es. pseudo-elemento `::before` con `clip-path` triangolare e `opacity: 0.15`), altrimenti ometterlo senza che sia un difetto bloccante.
- **Categoria/girone** (`gruppo.nome`): `font: 700 11px Arial, sans-serif; letter-spacing: 1.5px` (`{typography.label-tag}`), `color: var(--color-primary)` (`{colors.azzurro}`, eccezione sopra).
- **Nomi squadra** (`squadraCasa`/`squadraOspite`): `font-family: 'Arial Black','Arial Narrow',Impact,sans-serif; font-size: 22px; font-weight: 900; line-height: 1.15; letter-spacing: 0.5px` (`{typography.display-card}`).
- **Separatore "vs"** (se lo si rende come elemento visivo tra le due squadre, es. `Squadra Casa` **vs** `Squadra Ospite`): stessa identica `{typography.display-card}` delle squadre (**mai** più piccolo — a dimensione ridotta il contrasto magenta-su-nero scenderebbe sotto soglia AA, vedi `DESIGN.md` → Colori), `color: var(--color-magenta)` (`{colors.magenta}`, eccezione sopra). Nota: i dati attuali (`squadraCasa`/`squadraOspite`) sono due stringhe separate, non un'unica stringa "Casa vs Ospite" — un separatore "vs" testuale tra i due `<span>` è un'aggiunta visiva opzionale coerente con `DESIGN.md`, non un campo dati nuovo.
- **Metadati (data/ora/luogo)**: `font: 400 13px Arial, sans-serif; line-height: 1.4` (`{typography.meta}`), `color: #AEB6C2` (`{colors.testo-chiaro-muto}` — nessun corrispondente in `globals.css`, hex letterale).
- **Link "Naviga"**: `color: var(--color-primary)` o bianco a seconda della leggibilità su nero (verificare in sviluppo che il contrasto risultante superi 4.5:1 su `#0B0E14`; `var(--color-primary)` = `#00A3E0` su `#0B0E14` è già lo stesso valore verificato 6.73:1 per `{colors.azzurro}` su nero in `DESIGN.md` → Colori, quindi va bene). `:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 2px; }` (`{colors.focus-ring-chiaro}`).

### Titolo pagina e intestazioni di settimana — inferenza esplicita, non nel documento UX letteralmente

`DESIGN.md`/`EXPERIENCE.md` specificano in dettaglio il componente `match-card`, ma **non** uno stile esplicito per il proprio `<h1>` della pagina Calendario né per l'intestazione di ciascuna settimana (nessuna pagina interna diversa da `/squadre`/`/staff`/`/contatti`/Home ha una sezione "componente" dedicata in `DESIGN.md`). Questa è un'inferenza dello story-writer, non un token citato letteralmente per questo caso d'uso — segnalata come tale:
- **`<h1>Calendario</h1>`**: `typography.display-section` (`DESIGN.md`: "titoli di sezione", 40px/900 desktop, `typography.display-section-mobile` 22px/900 sotto i 900px) — stesso token già usato concettualmente per intestazioni di sezione a piena pagina come "Partite della settimana"/"I nostri sponsor" nella home (oggi renderizzate con lo stile provvisorio pre-restyling, ma il token semanticamente corretto per quel ruolo è `display-section`).
- **`<h2>{settimana.etichetta}</h2>`** (intestazione per singola settimana): `typography.label-heading` (14px/900, `letter-spacing: 1.5px`) + `color: #5B6472` (`{colors.grigio}`) — `DESIGN.md` descrive esplicitamente questo colore come "testo secondario su sfondo chiaro: **numerazione di sezione**", ruolo semantico che corrisponde esattamente a un'intestazione di raggruppamento settimanale su una pagina a sfondo chiaro (`{colors.bianco}`, coerente con "sezione Partite" elencata tra le superfici bianche in `DESIGN.md` → Colori).

### Pattern da riusare (non reinventare)

- **Query Partite scoped alla stagione, `select` non `include`**: `app/page.tsx` (Story 18.3, sezione Partite della settimana) per il `select` esatto; `app/app/(partite-campionati)/partite/page.tsx` (Story 10.3+) per il filtro `annoAgonisticoId`/`orderBy` sull'intera stagione.
- **`raggruppaPerSettimana`/`parseDataUtc`**: `lib/raggruppa-per-settimana.ts` — riuso diretto, nessuna modifica.
- **Link "Naviga"**: `costruisciLinkNaviga` (`@/lib/link-naviga-palestra`) — stesso identico uso di `app/page.tsx` e `/app/partite`.
- **Messaggio esplicito invece di area vuota per l'intera pagina**: `app/squadre/page.tsx` (Story 18.8), `/app/gruppi`, `/app/partite` — diverso dal pattern "sezione nascosta" di Sponsor/Partite/FotoSquadra in home (quello è per una sezione opzionale dentro una pagina più ampia).
- **`trovaAnnoAgonisticoCorrente()` con `.catch()` fail-soft fin dall'inizio**: lezione esplicita dalla code review di Story 18.8 (fix trovato indipendentemente da due layer di review) — applicarla qui direttamente invece di aspettare una review.
- **`HeaderPubblico`/`FooterPubblico` self-contained, nessun prop di dati**: `app/HeaderPubblico.tsx`/`app/FooterPubblico.tsx` (Story 18.8) — montare senza `conSpazioCookieBanner` (mirror di `/squadre`, non della home).
- **Un CSS module per pagina** (eccezione solo per componenti condivisi come `HeaderPubblico.module.css`/`FooterPubblico.module.css`/`NavPubblica.module.css`): `app/calendario/calendario.module.css` segue la stessa convenzione di `app/squadre/squadre.module.css`.

### AGENTS.md — Next.js non standard

Questo progetto usa una versione di Next.js con differenze rispetto al training data (`AGENTS.md`, root del repo): prima di scrivere codice di routing/parametri, consultare `node_modules/next/dist/docs/`. **Non applicabile in modo sostanziale a questa storia**: `app/calendario/page.tsx` non ha segmenti dinamici (`[id]`) né `searchParams` (a differenza di `/app/partite`, che ha un filtro `atletaId` via query string per Genitori con più figlie — `/calendario` pubblica non ha alcuna sessione/Ruolo da filtrare, quindi nessun selettore). Se in fase di sviluppo emergesse comunque un bisogno di `searchParams`/parametri dinamici, ricordare che in questa versione (Next.js 16.2.10) `searchParams` è una `Promise` da `await`-are (vedi commento in `app/app/(partite-campionati)/partite/page.tsx` riga 31-33, già verificato in Story 2.8 — non da ri-verificare).

### Project Structure Notes

- Nuovi: `app/calendario/page.tsx` (sostituisce interamente il contenuto placeholder esistente, stesso path), `app/calendario/calendario.module.css`.
- Modificati: nessun altro file. Nessuna migrazione DB, nessuna nuova Server Action, nessuna modifica a `lib/auth/route-guard.ts` (rotta già pubblica), nessuna modifica a `app/page.tsx`, nessuna modifica a `lib/raggruppa-per-settimana.ts` (riuso invariato).
- Allineamento con la struttura di progetto: `app/calendario/` segue lo stesso pattern piatto già usato da `app/squadre/` (nessun route group, pagina pubblica diretta sotto `app/`) — diverso da `app/app/(partite-campionati)/partite/` (route group autenticato sotto `/app`, Epic 10/AD-2).

### References

- [Source: epics.md#Epic 18: Sito pubblico Settore Volley, Story 18.9] — testo originale di User Story e AC, e nota "Rotto in 5 storie"/contesto Epic 18 per continuità con 18.1-18.8 (done) e 18.10-18.12 (backlog).
- [Source: app/app/(partite-campionati)/partite/page.tsx] — query Partite scoped a `annoAgonisticoId` su tutta la stagione, `raggruppaPerSettimana`, wrapper `formattaData`, messaggio "Nessuna partita questa settimana." per singola settimana vuota.
- [Source: lib/raggruppa-per-settimana.ts] — `raggruppaPerSettimana`, `parseDataUtc`, `SettimanaPartite<T>`, comportamento su settimane vuote e limite `MAX_SETTIMANE`.
- [Source: app/page.tsx, righe 147-171 e 292-347] — query Partite della settimana (Story 18.3) con il `select` esatto da mirrorare, e markup del teaser (campi mostrati, link Naviga, nessuna colonna Azioni).
- [Source: app/calendario/page.tsx] — placeholder esistente da sostituire, commento sorgente "non estendere questo file".
- [Source: app/InSviluppoPubblico.tsx] — motivo del placeholder, conferma che va rimosso (non esteso) da questa pagina quando la storia reale arriva.
- [Source: lib/auth/route-guard.ts, righe 40-50] — conferma `"/calendario"` già in `PUBLIC_ROUTES`.
- [Source: _bmad-output/implementation-artifacts/18-8-pagina-squadre.md, Dev Notes e Review Findings] — pattern `select` vs `include`, gotcha `trovaAnnoAgonisticoCorrente` vs `risolviAnnoAgonisticoCorrente` (fix di code review da applicare qui fin da subito), convenzione "nessun test diretto su componenti di rendering", `HeaderPubblico`/`FooterPubblico` self-contained.
- [Source: ux-designs/ux-societa-manager-2026-08-13/DESIGN.md#components.match-card, #Colori, #Tipografia] — token esatti del componente match-card (background nero, clip-path, typography display-card/label-tag/meta, colori azzurro/magenta/testo-chiaro-muto con contrasti calcolati).
- [Source: ux-designs/ux-societa-manager-2026-08-13/EXPERIENCE.md#Architettura dell'Informazione, #Pattern dei Componenti, #Pattern di Stato, #Responsive & Piattaforma] — riga "Calendario" della tabella IA, riga "Match-card" (stesso componente riusato tra home e Calendario, raggruppato per settimana), riga stato vuoto "Nessuna partita programmata nella stagione", breakpoint 900px per `match-grid`.
- [Source: epics.md#Epic 18, Story 18.12] — conferma esplicita che il restyling retroattivo copre solo Home e Squadre, non Calendario/Staff/Contatti (queste ultime vanno costruite già nello stile finale).
- [Source: AGENTS.md, root del repo] — nota su Next.js non standard rispetto al training data, verificare `node_modules/next/dist/docs/` per routing/parametri se necessario (non sostanzialmente applicabile a questa storia, nessun segmento dinamico).
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-9, #Structural Seed] — `Partita`/`Gruppo` non protetti da RLS, Prisma diretto; nessuna cartella `lib/` nuova richiesta da questa storia.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

Nessuno — implementazione lineare, nessun blocco incontrato. Tutte le decisioni erano già prese nei Dev Notes (query, gotcha `trovaAnnoAgonisticoCorrente`, convenzione CSS hex-con-commento, "sostituire non estendere" il placeholder).

### Completion Notes List

- `app/calendario/page.tsx` riscritto interamente (rimosso `InSviluppoPubblico` e il suo import), mirror esatto del pattern già stabilito da `app/squadre/page.tsx` (Story 18.8): `trovaAnnoAgonisticoCorrente()` con `.catch()` fail-soft fin dalla prima stesura, query `prisma.partita.findMany` con `select` esplicito (stessi campi del teaser di `app/page.tsx`), nessuna sessione/`createClient()` (pagina senza foto).
- `raggruppaPerSettimana`/`parseDataUtc` riusate invariate da `lib/raggruppa-per-settimana.ts` — nessuna modifica a quel file, nessuna nuova asserzione di test necessaria (comportamento non cambiato).
- Due stati vuoti distinti implementati come da Dev Notes: "Nessuna partita programmata per la stagione in corso." (intera stagione vuota, AC #3) vs "Nessuna partita questa settimana." (singola settimana vuota dentro una stagione che ne ha altre, mirror di `/app/partite`).
- Nuovo `app/calendario/calendario.module.css` con il registro "Poster Sportivo" applicato dall'inizio: match-card su sfondo `#0B0E14` con taglio diagonale (`clip-path`), corner-accent decorativo incluso (dettaglio minore, non bloccante), tipografia condensata per titolo/nomi squadra, divisore "vs" in `var(--color-magenta)`, focus-visible bianco sul link "Naviga". Convenzione hex-con-commento rispettata: solo azzurro/navy/magenta riusano `var(--color-primary)`/`var(--color-navy)`/`var(--color-magenta)` (stesso valore esadecimale del DESIGN.md 2026-07-22), tutto il resto è hex letterale commentato — nessun nuovo custom property in `app/globals.css`.
- Nessun test diretto su `app/calendario/page.tsx` (convenzione consolidata, nessuna pagina pubblica di rendering ne ha).
- Verifica: `npx tsc --noEmit` pulito, `npx vitest run` 1113/1113 passati (nessuna regressione), `npm run lint` 0 errori (11 warning pre-esistenti in file non toccati da questa storia, tutti `no-img-element`), `npm run build` riuscito (`/calendario` presente nell'output come rotta dinamica `ƒ`). Gli errori "Dynamic server usage"/motore WASM mostrati durante `next build` sono quirk noti dell'ambiente locale, già documentati per il deploy — non bloccano l'output.

### File List

- `app/calendario/page.tsx` (sostituito interamente; 1 patch da code review)
- `app/calendario/calendario.module.css` (nuovo)

## Senior Developer Review (AI)

**Esito**: 2 finding, entrambi minori — 1 patch applicato, 1 defer.

- **Applicato**: `aria-label` del link "Naviga" usava `partita.impianto ?? "il luogo della partita"` (nullish coalescing) mentre il rendering visivo dello stesso campo usava un controllo truthy (`partita.impianto && ...`) — un `impianto` stringa vuota (colonna nullable senza vincolo type-level di non-vuotezza) avrebbe nascosto lo span visivo ma prodotto `aria-label="Naviga verso "` (vuoto, spazio finale) invece del fallback testuale. Non raggiungibile oggi dai percorsi di scrittura esistenti (import/`modificaPartita` normalizzano stringa vuota a `null`), ma non è un invariante a livello di tipo. Corretto allineando a `partita.impianto || "il luogo della partita"`.
- **Defer**: `formattaData` è ora triplicata verbatim (stessa identica funzione già in `app/page.tsx` e `app/app/(partite-campionati)/partite/page.tsx`) invece di essere esportata una sola volta da `lib/raggruppa-per-settimana.ts` insieme a `parseDataUtc`. Non è un bug — è la stessa convenzione già accettata esplicitamente nei Dev Notes di questa storia ("stesso identico pattern già duplicato... mai un secondo parsing indipendente" riferito a `parseDataUtc`, non a `formattaData` stesso) — lasciato come nota aperta per un'eventuale estrazione futura, fuori scope di questa storia.

## Change Log

- 2026-08-14: Implementazione completa (Task 1-5), tutti gli AC soddisfatti, Status → review.
- 2026-08-14: Code review (Blind Hunter + Edge Case Hunter in parallelo) — 1 patch applicato (aria-label impianto vuoto), 1 defer (formattaData triplicata, convenzione già accettata). 1113/1113 test Vitest passati dopo il fix, 0 errori tsc/eslint. Status → done.
