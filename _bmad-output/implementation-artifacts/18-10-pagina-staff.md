---
baseline_commit: a957215
---

# Story 18.10: Pagina pubblica "Staff"

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Visitatore senza account,
I want vedere l'elenco degli Allenatori del settore volley e i Gruppi che seguono,
so that possa conoscere lo staff tecnico della società.

## Acceptance Criteria

1. **Given** un Visitatore senza sessione **When** visita `/staff` **Then** vede l'elenco degli Allenatori (nome, cognome) con i Gruppi della stagione corrente a cui sono assegnati.
2. **And** un Allenatore non assegnato a nessun Gruppo nella stagione corrente non compare nell'elenco (a differenza di `/squadre`, dove un Gruppo senza Allenatori resta comunque visibile).
3. **And** nessun dato riservato (email, codice fiscale, credenziali) è esposto in questa vista.
4. **And** se nessun Allenatore risulta assegnato a un Gruppo nella stagione corrente, la pagina mostra un messaggio esplicito invece di un'area vuota.

## Tasks / Subtasks

- [ ] Task 1: Query pubblica sola lettura Allenatore → Gruppi, lato opposto di `/squadre` (AC: #1, #2, #3)
  - [ ] `annoCorrente` risolto con `trovaAnnoAgonisticoCorrente()` (`@/lib/anno-agonistico`), **mai** `risolviAnnoAgonisticoCorrente` (side-effect di scrittura non ammissibile in una pagina GET — stesso vincolo già rispettato in `app/squadre/page.tsx`, Story 18.8, e in `app/calendario/page.tsx`, Story 18.9). Applicare `.catch()` fail-soft **fin da subito** (non rimandarlo a un fix di code review, come accaduto nella prima stesura di Story 18.8): `trovaAnnoAgonisticoCorrente().catch((err) => { console.error(err); return null; })`.
  - [ ] Query `prisma.allenatore.findMany` con **`select` esplicito** (mai `include`, convenzione public-page stabilita da Story 18.2 in poi) — **lato opposto** della relazione `GruppoAllenatore` rispetto a `app/squadre/page.tsx` (che parte da `Gruppo` e annida `allenatori`): qui si parte da `Allenatore` e si filtra/annida `gruppi`. Mirror diretto della forma già usata in `app/app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` (che filtra `Gruppo` per un singolo `allenatoreId`), ma invertita e senza scoping per singolo Allenatore:
    ```ts
    annoCorrente
      ? prisma.allenatore
          .findMany({
            where: {
              gruppi: { some: { gruppo: { annoAgonisticoId: annoCorrente.id } } },
            },
            orderBy: [{ nome: "asc" }, { cognome: "asc" }],
            select: {
              id: true,
              nome: true,
              cognome: true,
              gruppi: {
                where: { gruppo: { annoAgonisticoId: annoCorrente.id } },
                select: { gruppo: { select: { id: true, nome: true } } },
                orderBy: { gruppo: { nome: "asc" } },
              },
            },
          })
          .catch((err) => {
            console.error(err);
            return [];
          })
      : Promise.resolve([])
    ```
    Il `where` sull'Allenatore (`gruppi: { some: { gruppo: { annoAgonisticoId: ... } } } }`) è ciò che realizza **da solo** l'AC #2 (un Allenatore senza alcun Gruppo nella stagione corrente non compare mai nel risultato — non serve un `.filter()` applicativo dopo). Il `where` **ripetuto** dentro il `select` di `gruppi` serve a **restringere anche i Gruppi annidati** alla sola stagione corrente (senza di esso, un Allenatore con Gruppi in stagioni diverse mostrerebbe anche i Gruppi di stagioni passate insieme a quelli correnti — un Allenatore può avere storicamente più Gruppi in Anni Agonistici diversi, mai filtrati automaticamente dalla sola relazione).
  - [ ] AC #3 per costruzione: il `select` non tocca mai `codiceFiscale`, `utenteId`, né alcun campo di `Utente` (email) — non serve alcun filtro applicativo successivo, la query stessa è il confine di sicurezza (stesso principio già stabilito per `Atleta`/`GruppoAtleta` in Story 18.8, qui applicato a `Allenatore.codiceFiscale`/`Utente.email`).
  - [ ] Nessuna sessione/`createClient()` necessaria in questa pagina: `Allenatore`/`GruppoAllenatore` non sono protetti da RLS (AD-9, Prisma diretto), e a differenza di `/squadre` questa pagina non mostra foto di squadra — solo Prisma.

- [ ] Task 2: Nuova pagina `/staff` — **sostituire**, non estendere, il placeholder (AC: #1, #2, #4)
  - [ ] **Sostituire interamente** `app/staff/page.tsx` (oggi 20 righe, monta solo `<HeaderPubblico />` + `<InSviluppoPubblico titolo="Staff" />` + `<FooterPubblico />`, stopgap del 2026-08-13). Il commento nel file placeholder dice esplicitamente "sostituire con la pagina reale quando la Story 18.10 verrà implementata, non estendere questo file" — rimuovere completamente l'import e l'uso di `InSviluppoPubblico`.
  - [ ] `export const dynamic = "force-dynamic"` (mantenuto identico al placeholder — i dati possono cambiare in qualunque momento dalla console Admin, stesso motivo già in uso su `/`, `/squadre`).
  - [ ] Markup: `<HeaderPubblico />`, `<main>` con `<h1>Staff</h1>` + elenco `staff-list`, `<FooterPubblico />` — **nessun** `conSpazioCookieBanner` e nessun `<CookieBanner>` montato (stessa scelta già fatta per `/squadre` e `/calendario`: il banner cookie resta scoped alla sola home, decisione presa nella code review di Story 18.6, non riaperta qui).
  - [ ] Per ogni Allenatore risultante: una riga con nome+cognome, e sotto l'elenco dei nomi dei Gruppi (`gruppo.nome`) a cui è assegnato nella stagione corrente — nessun elenco vuoto possibile per costruzione (Task 1 garantisce che ogni Allenatore nel risultato ha `gruppi.length >= 1`).

- [ ] Task 3: Stato vuoto esplicito (AC: #4)
  - [ ] Quando `allenatori.length === 0` (nessun Allenatore assegnato a un Gruppo nella stagione corrente, incluso il caso `annoCorrente` stesso assente/null) → messaggio esplicito al posto dell'elenco, testo proposto: **"Nessun Allenatore assegnato a un Gruppo per la stagione in corso."** (coerente col tono diretto già stabilito in `EXPERIENCE.md` → Voce e Tono, mai un placeholder generico "presto disponibile"). Stesso principio già applicato in `app/squadre/page.tsx` (Story 18.8)/`app/calendario/page.tsx` (Story 18.9): l'intera pagina esiste solo per questo contenuto → messaggio testuale, non il pattern "sezione nascosta" di Sponsor/Partite/FotoSquadra in home (quello è per una sezione opzionale dentro una pagina più ampia).

- [ ] Task 4: Stile "Poster Sportivo" — componente `staff-list` (`DESIGN.md`/`EXPERIENCE.md`, 2026-08-13) applicato dall'inizio — nessun AC numerato dedicato, ma requisito esplicito di questa storia (vedi Dev Notes "Perché questa pagina va stilizzata subito, non da 18.12")
  - [ ] Nuovo `app/staff/staff.module.css` (un modulo per pagina, convenzione consolidata — vedi `Project Structure Notes`).
  - [ ] `<h1>Staff</h1>`: `typography.display-section` (40px/900 desktop) con `typography.display-section-mobile` (22px/900 sotto i 900px) — stesso token semantico già assegnato al `<h1>` di `/calendario` (Story 18.9 Dev Notes), coerente con `DESIGN.md.components.staff-list.heading-typography`/`heading-typography-mobile`, che citano esattamente questi due token.
  - [ ] Contenitore elenco: `background: #FFFFFF` (`{colors.bianco}`, `DESIGN.md.components.staff-list.background`).
  - [ ] Ogni riga Allenatore: `border-bottom: 1px solid #E5E9EE` (`{colors.bordo-chiaro}`, `DESIGN.md.components.staff-list.row-border-bottom`) — righe separate da bordo sottile, **non** card (coerente con un elenco denso, vedi `DESIGN.md` nota di rubric review).
  - [ ] Nome+cognome dell'Allenatore: `font-family: 'Arial Black','Arial Narrow',Impact,sans-serif; font-size: 22px; font-weight: 900; line-height: 1.15; letter-spacing: 0.5px` (`{typography.display-card}`, `DESIGN.md.components.staff-list.name-typography`), `color: #0B0E14` (`{colors.nero}`, `.name-color`).
  - [ ] Elenco Gruppi seguiti, sotto il nome: `font-family: 'Arial,sans-serif'; font-size: 14px; font-weight: 400; line-height: 1.8` (`{typography.body}`, `.gruppi-typography`), `color: #5B6472` (`{colors.grigio}`, `.gruppi-color`).
  - [ ] Nessun custom property CSS per la palette "Poster Sportivo" in `app/globals.css` — stessa decisione già presa in Story 18.9: valori hex letterali dentro `staff.module.css`, ciascuno annotato con un commento che cita il nome esatto del token `DESIGN.md` (vedi Dev Notes "Convenzione hex-con-commento"). Nessuno dei colori usati qui (`#0B0E14`, `#5B6472`, `#E5E9EE`, `#FFFFFF`) ha un corrispondente identico in `globals.css` — tutti hex letterali commentati, nessuna eccezione `var(--color-*)` applicabile qui (a differenza di `/calendario`, che riusa `var(--color-primary)`/`var(--color-navy)`/`var(--color-magenta)` per i 3 colori con hex identico).
  - [ ] Nessun elemento interattivo nella riga `staff-list` (nessun link, nessun pulsante) — nessun contorno di focus da implementare per questo componente specifico (a differenza di `match-card`/`Naviga` in `/calendario`).

- [ ] Task 5: Verifica (AC: tutti)
  - [ ] Nessun test diretto su `app/staff/page.tsx` (convenzione consolidata del progetto — nessun componente di rendering ne ha, stesso limite già accettato per `app/squadre/page.tsx`, `app/calendario/page.tsx`, `HeaderPubblico.tsx`, `FooterPubblico.tsx`, `NavPubblica.tsx`). Nessuna nuova utility condivisa introdotta da questa storia (a differenza di `raggruppaPerSettimana` in Story 18.9) — quindi nessun nuovo file `*.test.ts` atteso.
  - [ ] Verifica esplicita AC #3 in fase di implementazione/review: rileggere il `select` di Task 1 e confermare per ispezione che nessun campo `email`, `codiceFiscale`, `utenteId` (di `Allenatore` o `Utente`) compare in nessun punto della query né del markup — non un test automatico dedicato, ma un controllo esplicito da annotare nei Completion Notes (stesso livello di rigore già richiesto per l'AC #2 di Story 18.8, verificato "per costruzione" della query).
  - [ ] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

## Dev Notes

### Decisioni di analisi (vedi `epics.md#Epic 18`, Story 18.10)

- **Dipendente da Story 18.1** (done, home pubblica + `/app`) **e 18.7** (done — `/staff` è già raggiungibile dal menu pubblico **e già in `PUBLIC_ROUTES`**, `lib/auth/route-guard.ts` righe 40-50, aggiunta durante la code review di Story 18.7 in previsione di questa storia esattamente come `/squadre`/`/calendario`/`/contatti`). **Questa storia non deve toccare `lib/auth/route-guard.ts`** — verificato in analisi, la voce `"/staff"` è già presente (riga 48).
- **Scope limitato allo staff tecnico** (`Allenatore`, che ha `nome`/`cognome` separati nel modello dati — vedi `prisma/schema.prisma` righe 135-146). A differenza dei siti di riferimento (volleyrocasaldepazzi.it/gassalespiacenza.it), questo progetto **non ha oggi alcun campo nome/cognome per Utenti con Ruolo Dirigente/Admin/Segreteria** (`Utente` ha solo `email`, mai mostrata pubblicamente in nessuna pagina esistente): uno "staff dirigenziale" pubblico nominativo **non è coperto da questa storia** — non costruirlo, non aggiungere alcun campo nome/cognome a `Utente`. Richiederebbe una decisione di prodotto a parte (nuovo campo identitario su `Utente` o un modello dedicato, oltre a una decisione di privacy su cosa pubblicare), da aprire come storia separata se richiesto esplicitamente in futuro — **non in questa storia**.
- **Riuso in sola lettura pubblica di `Allenatore`/`GruppoAllenatore`** — stessi dati già letti in `/squadre` (Story 18.8), ma dal **lato opposto** della relazione: `/squadre` parte da `Gruppo` e annida i suoi `allenatori`; `/staff` parte da `Allenatore` e annida i suoi `gruppi`. Vedi Task 1 per la query esatta.

### La "regola opposta" rispetto a `/squadre` — il punto più facile da invertire per errore

`EXPERIENCE.md` → Pattern dei Componenti lo dice esplicitamente: *"Un Allenatore compare solo se assegnato ad almeno un Gruppo nella stagione corrente — regola opposta a Squadre, dove un Gruppo senza staff resta comunque visibile."* Le due regole **non sono simmetriche** e vanno implementate in direzioni opposte:

| Pagina | Entità principale elencata | Entità secondaria annidata | Riga senza alcuna secondaria assegnata |
|---|---|---|---|
| `/squadre` (Story 18.8, AC #3) | `Gruppo` | `allenatori` | **Compare comunque**, elenco Allenatori vuoto/assente nella card |
| `/staff` (questa storia, AC #2) | `Allenatore` | `gruppi` | **Non compare affatto** — filtrato dalla query stessa |

Questo significa che `/squadre` **non** filtra mai i `Gruppo` per presenza di Allenatori (nessun `where` su `allenatori`), mentre `/staff` **deve** filtrare gli `Allenatore` per presenza di almeno un Gruppo nella stagione corrente (`where: { gruppi: { some: { gruppo: { annoAgonisticoId: annoCorrente.id } } } } }`, vedi Task 1). Un dev agent che copia meccanicamente il pattern di `/squadre` (nessun filtro sull'entità principale, solo rendering condizionale della secondaria) violerebbe l'AC #2 di questa storia: un Allenatore senza Gruppi comparirebbe comunque con un elenco Gruppi vuoto, invece di sparire del tutto dall'elenco.

### `trovaAnnoAgonisticoCorrente`, mai `risolviAnnoAgonisticoCorrente`

Stesso identico gotcha già documentato nei Dev Notes di Story 18.8 e 18.9: `risolviAnnoAgonisticoCorrente` (`@/lib/anno-agonistico`) ha un side-effect di scrittura (crea l'Anno Agonistico se assente) inammissibile in una pagina GET pubblica. `trovaAnnoAgonisticoCorrente` è la sola lettura corretta, già usata identicamente da `/app/gruppi`, `/app/i-miei-gruppi`, `app/squadre/page.tsx`, `app/calendario/page.tsx`. **Applicare il `.catch()` fail-soft fin dalla prima stesura** (in Story 18.8 questo era mancante nella prima implementazione ed è stato un fix di code review — Blind Hunter + Edge Case Hunter lo hanno trovato indipendentemente, minacciava direttamente l'AC dello stato vuoto: un errore DB transiente faceva crashare l'intera pagina invece di degradare al messaggio esplicito. Story 18.9 lo ha già applicato fin da subito — fare lo stesso qui).

### Nessuna esposizione di email/credenziali (AC #3) — perché va verificato per costruzione, non con un filtro

A differenza di `/squadre` (AC #2, "nessun dato di Atleta"), che è garantito perché la query non tocca mai `GruppoAtleta`/`Atleta`, qui il rischio è più sottile: `Allenatore` ha una relazione opzionale verso `Utente` (`utenteId`/`utente`, righe 140-141 di `prisma/schema.prisma`) che **contiene** `email`. Il `select` di Task 1 **non deve mai** annidare `utente` — nessun `utente: { select: { email: true } } }` da nessuna parte, nemmeno per un futuro uso interno non ancora previsto. Stesso principio per `codiceFiscale` (`Allenatore.codiceFiscale`, dato identificativo sensibile, mai mostrato in nessuna pagina pubblica esistente del progetto). Il `select` esplicito proposto in Task 1 (`id`, `nome`, `cognome`, `gruppi: { select: { gruppo: { select: { id, nome } } } } }`) è già minimale e non include nessuno di questi campi — la verifica in Task 5 è un controllo di rilettura, non un filtro applicativo aggiuntivo necessario.

### Perché questa pagina va stilizzata "Poster Sportivo" subito, non rimandata a Story 18.12

Story 18.12 (`epics.md`, aggiunta 2026-08-13/14) applica retroattivamente il registro visivo "Poster Sportivo" (`DESIGN.md`/`EXPERIENCE.md` di questa stessa sessione UX, `ux-designs/ux-societa-manager-2026-08-13/`) **solo** a `/` e `/squadre` — le uniche pagine pubbliche già `done` prima che quella sessione UX fosse completata. `/staff` (questa storia) è ancora in backlog al momento in cui `DESIGN.md`/`EXPERIENCE.md` sono stati distillati e marcati `status: final`: per questa pagina il registro visivo esiste **già** quando la storia parte, quindi va costruita direttamente nello stile finale — **non plain-poi-restilizzata**. `EXPERIENCE.md` → Architettura dell'Informazione elenca esplicitamente `/staff` come "Backlog (Story 18.10)" con il componente `staff-list` già specificato in dettaglio in `DESIGN.md.components.staff-list` proprio per questo scopo — componente **aggiunto durante la rubric review** della sessione UX perché `/staff` non aveva ancora alcuna specifica visiva nonostante fosse esplicitamente nello scope (vedi `DESIGN.md` riga 395).

**Nota per il dev agent**: `home-pubblica.module.css`/`squadre.module.css` (già `done`) usano oggi i token del **DESIGN.md del portale interno** (`ux-societa-manager-2026-07-22/DESIGN.md`, `var(--color-primary)`, `var(--color-navy)`, ecc. definiti in `app/globals.css`) — **non** il nuovo `DESIGN.md` "Poster Sportivo" di questa sessione (2026-08-13), che Home e Squadre riceveranno solo con Story 18.12. `/calendario` (Story 18.9) è stata la prima pagina pubblica costruita direttamente nel nuovo registro; `/staff` (questa storia) segue lo stesso identico principio. Questa divergenza temporanea tra `/staff`/`/calendario` (nuovo registro, già in queste storie) e `/`/`/squadre` (vecchio registro provvisorio, fino a 18.12) è **attesa e intenzionale**, non un bug da correggere qui.

### Convenzione hex-con-commento — nessun custom property nuovo in `app/globals.css`

Nessun custom property CSS per la palette "Poster Sportivo" esiste ancora in `app/globals.css` (verificato: contiene solo i token del DESIGN.md 2026-07-22 del portale interno, es. `--color-text-primary: #101820`, diverso da `{colors.nero}` `#0B0E14` di questo documento). **Decisione già presa in Story 18.9, da riapplicare identica qui per coerenza nell'epica**: usare valori hex letterali dentro `staff.module.css`, ciascuno annotato con un commento che cita il nome esatto del token `DESIGN.md` — **non** aggiungere nuovi custom property a `app/globals.css`, che è condiviso con le pagine autenticate `/app` e appartiene al *diverso* DESIGN.md 2026-07-22: mescolare due vocabolari di token nello stesso scope globale creerebbe ambiguità per un futuro lettore su quale sistema di design appartenga una data variabile. A differenza di `/calendario` (che riusa `var(--color-primary)`/`var(--color-navy)`/`var(--color-magenta)` per i 3 colori con hex identico dichiarato in `DESIGN.md`), **nessuno** dei colori usati da `staff-list` (`{colors.bianco}` `#FFFFFF`, `{colors.nero}` `#0B0E14`, `{colors.grigio}` `#5B6472`, `{colors.bordo-chiaro}` `#E5E9EE`) coincide con un valore già presente in `app/globals.css` — tutti e quattro vanno scritti come hex letterali commentati, senza eccezioni `var(--color-*)` in questa pagina.

### Token esatti da usare per `staff-list` (fonte: `DESIGN.md.components.staff-list` + `DESIGN.md.Colori`/`Tipografia`)

- **Contenitore**: `background: #FFFFFF` (`{colors.bianco}`).
- **Riga per Allenatore**: `border-bottom: 1px solid #E5E9EE` (`{colors.bordo-chiaro}`) — elenco di righe separate da bordo sottile, **non** card (coerente con "un elenco denso di nome+Gruppi per Allenatore", `DESIGN.md` nota di rubric review, riga 395).
- **Nome Allenatore**: `font-family: 'Arial Black','Arial Narrow',Impact,sans-serif; font-size: 22px; font-weight: 900; line-height: 1.15; letter-spacing: 0.5px` (`{typography.display-card}`), `color: #0B0E14` (`{colors.nero}`).
- **Elenco Gruppi seguiti**: `font-family: Arial,sans-serif; font-size: 14px; font-weight: 400; line-height: 1.8` (`{typography.body}`), `color: #5B6472` (`{colors.grigio}`) — stesso ruolo semantico già assegnato a questo colore altrove in `DESIGN.md` ("testo secondario su sfondo chiaro").
- **`<h1>Staff</h1>`**: `typography.display-section` (40px/900 desktop, `letter-spacing: 0.5px`) con `typography.display-section-mobile` (22px/900) sotto i 900px — citato esplicitamente come `heading-typography`/`heading-typography-mobile` in `DESIGN.md.components.staff-list`, a differenza del `<h1>`/`<h2>` di `/calendario` che erano un'inferenza dello story-writer: qui il token per il titolo di pagina è dichiarato letteralmente nel componente.

### Pattern da riusare (non reinventare)

- **Query Allenatore↔Gruppi scoped alla stagione corrente**: `app/app/(gruppi-allenatori)/i-miei-gruppi/page.tsx` (righe 60-68, filtra `Gruppo` per un singolo `allenatoreId`) e `app/squadre/page.tsx` (Story 18.8, filtra `Gruppo` e annida `allenatori`) — questa storia inverte la direzione (parte da `Allenatore`, filtra per presenza di Gruppi nella stagione corrente), vedi Task 1 per la query completa.
- **`trovaAnnoAgonisticoCorrente()` con `.catch()` fail-soft fin dall'inizio**: lezione esplicita dalla code review di Story 18.8, già applicata in Story 18.9 — applicarla qui direttamente invece di aspettare una review.
- **`HeaderPubblico`/`FooterPubblico` self-contained, nessun prop di dati**: `app/HeaderPubblico.tsx`/`app/FooterPubblico.tsx` (Story 18.8) — montare senza `conSpazioCookieBanner` (mirror di `/squadre`/`/calendario`, non della home).
- **Messaggio esplicito invece di area vuota per l'intera pagina**: `app/squadre/page.tsx` (Story 18.8), `app/calendario/page.tsx` (Story 18.9) — diverso dal pattern "sezione nascosta" di Sponsor/Partite/FotoSquadra in home (quello è per una sezione opzionale dentro una pagina più ampia).
- **Un CSS module per pagina** (eccezione solo per componenti condivisi come `HeaderPubblico.module.css`/`FooterPubblico.module.css`/`NavPubblica.module.css`): `app/staff/staff.module.css` segue la stessa convenzione di `app/squadre/squadre.module.css`/`app/calendario/calendario.module.css`.
- **Convenzione hex-con-commento per il registro "Poster Sportivo"**: `app/calendario/calendario.module.css` (Story 18.9) — stesso principio, nessuna eccezione `var(--color-*)` applicabile qui (nessuno dei 4 colori di `staff-list` coincide con un valore già in `app/globals.css`).

### `app/staff/page.tsx` va SOSTITUITO, non esteso

Il file esiste già (creato durante la code review di Story 18.7 come stopgap, per evitare un 404 grezzo su una voce di menu già pubblica senza contenuto reale dietro). Il suo stesso commento sorgente dice esplicitamente: *"sostituire con la pagina reale quando la Story 18.10 verrà implementata, non estendere questo file"*. Il dev agent deve **riscrivere interamente** il file (nuovo `export default async function StaffPage()`), non aggiungere codice sopra/sotto `<InSviluppoPubblico />` — quel componente e il suo import vanno rimossi del tutto da questo file (resta invece invariato per `/contatti`, Story 18.11, non ancora implementata).

### AGENTS.md — Next.js non standard

Questo progetto usa una versione di Next.js con differenze rispetto al training data (`AGENTS.md`, root del repo): prima di scrivere codice di routing/parametri, consultare `node_modules/next/dist/docs/`. **Non applicabile in modo sostanziale a questa storia**: `app/staff/page.tsx` non ha segmenti dinamici (`[id]`) né `searchParams` — pagina pubblica senza sessione/Ruolo da filtrare, nessun selettore. Stessa conclusione già raggiunta per `/calendario` (Story 18.9 Dev Notes).

### Project Structure Notes

- Nuovi: `app/staff/staff.module.css`.
- Modificati: `app/staff/page.tsx` (sostituisce interamente il contenuto placeholder esistente, stesso path).
- Nessun altro file. Nessuna migrazione DB, nessuna nuova Server Action, nessuna modifica a `lib/auth/route-guard.ts` (rotta già pubblica), nessuna modifica a `app/page.tsx`/`app/squadre/page.tsx`/`app/calendario/page.tsx`, nessuna modifica a `prisma/schema.prisma`.
- Allineamento con la struttura di progetto: `app/staff/` segue lo stesso pattern piatto già usato da `app/squadre/`/`app/calendario/` (nessun route group, pagina pubblica diretta sotto `app/`) — diverso da `app/app/(gruppi-allenatori)/` (route group autenticato sotto `/app`, Epic 9).

### References

- [Source: epics.md#Epic 18: Sito pubblico Settore Volley, Story 18.10] — testo originale di User Story e AC, e nota "Scope limitato allo staff tecnico" con la motivazione esplicita dell'assenza di nome/cognome su `Utente` per Ruoli Admin/Dirigente/Segreteria.
- [Source: app/app/(gruppi-allenatori)/i-miei-gruppi/page.tsx, righe 35-68] — query Allenatore→Gruppi (singolo Allenatore, lato "proprio Gruppo") da cui è invertita/generalizzata la query di Task 1.
- [Source: app/squadre/page.tsx, Story 18.8] — query Gruppi→Allenatori (lato opposto), `select` esplicito (mai `include`), pattern `.catch()` fail-soft su `trovaAnnoAgonisticoCorrente()`, markup `<HeaderPubblico />`/`<main>`/`<FooterPubblico />` senza `conSpazioCookieBanner`.
- [Source: app/calendario/page.tsx, Story 18.9] — precedente diretto di pagina pubblica costruita già nel registro "Poster Sportivo" (non nel vecchio registro di Home/Squadre), stessa convenzione hex-con-commento in `calendario.module.css`, stesso principio "sostituire non estendere" applicato al placeholder.
- [Source: prisma/schema.prisma, righe 135-146 (Allenatore), 511-521 (GruppoAllenatore)] — `nome`/`cognome` campi separati su `Allenatore` (a differenza di `Atleta.nome`, unico); relazione opzionale `Allenatore.utente`/`utenteId` verso `Utente` (contiene `email`) da **non annidare mai** nel `select` pubblico.
- [Source: lib/auth/route-guard.ts, righe 40-50] — conferma `"/staff"` già in `PUBLIC_ROUTES` (aggiunta nella code review di Story 18.7).
- [Source: app/staff/page.tsx] — placeholder esistente da sostituire, commento sorgente "non estendere questo file".
- [Source: app/InSviluppoPubblico.tsx] — motivo del placeholder, conferma che va rimosso (non esteso) da questa pagina quando la storia reale arriva.
- [Source: ux-designs/ux-societa-manager-2026-08-13/DESIGN.md#components.staff-list, #Colori, #Tipografia, riga 395] — token esatti del componente `staff-list` (background bianco, row-border-bottom, name/gruppi typography+color, heading-typography/-mobile), nota di rubric review sull'aggiunta del componente.
- [Source: ux-designs/ux-societa-manager-2026-08-13/EXPERIENCE.md#Architettura dell'Informazione (riga 31), #Pattern dei Componenti (riga 70, "regola opposta a Squadre"), #Pattern di Stato (riga 96)] — riga "Staff" della tabella IA, regola di inclusione opposta a Squadre, stato vuoto "Nessun Allenatore assegnato".
- [Source: epics.md#Epic 18, Story 18.12] — conferma esplicita che il restyling retroattivo copre solo Home e Squadre, non Calendario/Staff/Contatti (queste ultime vanno costruite già nello stile finale).
- [Source: AGENTS.md, root del repo] — nota su Next.js non standard rispetto al training data, verificare `node_modules/next/dist/docs/` per routing/parametri se necessario (non sostanzialmente applicabile a questa storia, nessun segmento dinamico).
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-9] — `Allenatore`/`GruppoAllenatore` non protetti da RLS, Prisma diretto con connessione privilegiata; nessuna cartella `lib/` nuova richiesta da questa storia.
- [Source: _bmad-output/implementation-artifacts/18-8-pagina-squadre.md, Dev Notes e Review Findings] — pattern `select` vs `include`, gotcha `trovaAnnoAgonisticoCorrente` vs `risolviAnnoAgonisticoCorrente` (fix di code review), convenzione "nessun test diretto su componenti di rendering", `HeaderPubblico`/`FooterPubblico` self-contained.
- [Source: _bmad-output/implementation-artifacts/18-9-pagina-calendario.md, Dev Notes] — convenzione hex-con-commento senza nuovi custom property in `app/globals.css`, motivazione "stilizzare subito, non rimandare a 18.12", pattern "sostituire non estendere" il placeholder.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
