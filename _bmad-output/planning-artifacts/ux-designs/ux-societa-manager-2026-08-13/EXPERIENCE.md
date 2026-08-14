---
name: Mogliano Volley — Sito pubblico Settore Volley
status: final
sources:
  - _bmad-output/planning-artifacts/epics.md (Epic 18)
  - _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-08-13/.memlog.md
  - _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-08-13/mockups/home-poster-sportivo.html
  - _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md (sibling, stesso club — riferimento di brand, non di registro)
updated: 2026-08-14
---

# Mogliano Volley — Sito pubblico Settore Volley — Experience Spine

> Sito vetrina pubblico (senza login), 5 pagine, sibling del portale gestionale interno autenticato (stessa app Next.js, sotto `/app`, spine separata). Da leggere insieme a `DESIGN.md` (identità visiva, registro "Poster Sportivo"); questo documento è il comportamento/l'architettura dell'informazione.

## Fondamenta

Sito pubblico responsive, mobile-first, 5 pagine (Home, Squadre, Calendario, Staff, Contatti) più un ingresso secondario verso l'area riservata autenticata (link "Accedi"). Vive alla radice del dominio (`"/"`), nella stessa base di codice del portale gestionale interno, che dopo Story 18.1 si trova sotto `/app` — due registri visivi distinti (`DESIGN.md` di questa sessione per il pubblico, `../ux-societa-manager-2026-07-22/DESIGN.md` per `/app`) nella stessa applicazione. Nessuna libreria di componenti/design system è in uso in nessuna delle due superfici (CSS Modules scritti a mano, coerente con quanto già accertato per `/app`): `DESIGN.md` è il riferimento di identità visiva, non presuppone un framework di componenti da cui ereditare.

Nessun login, nessun dato personale raccolto se non la scelta cookie (Story 18.6). Nessuna dark mode: il sito è a registro unico chiaro-dominante, la drammaticità "poster" viene da blocchi di contenuto scuri deliberati (hero, match-card, footer, header), non da un tema. Nessun requisito offline. Soglia di accessibilità WCAG AA, stesso impegno dichiarato dal sibling `/app`, non un audit formale certificato.

Mobile-first è un vincolo esplicito del brief, non solo una buona pratica: la maggior parte dei visitatori controlla calendario/risultati dal telefono, spesso fuori casa prima di una partita — ogni superficie va progettata partendo dal layout mobile, non adattata da un layout desktop.

## Architettura dell'Informazione

| Superficie | Route | Raggiunta da | Scopo | Stato |
|---|---|---|---|---|
| Home | `/` | Root del dominio, voce "Home" | Hero + sezioni condizionali: sponsor, partite della settimana corrente, foto squadra per Gruppo, post social | Costruita (Story 18.1-18.5) |
| Squadre | `/squadre` | Nav | Elenco Gruppi stagione corrente + Allenatori assegnati, mai Atlete | Costruita (Story 18.8) |
| Calendario | `/calendario` | Nav | Tutte le partite della stagione, raggruppate per settimana, cronologiche | Backlog (Story 18.9) |
| Staff | `/staff` | Nav | Elenco Allenatori con i Gruppi seguiti nella stagione corrente | Backlog (Story 18.10) |
| Contatti | `/contatti` | Nav | Indirizzo, telefono, email, social — campi singolarmente opzionali | Backlog (Story 18.11) |
| Accedi | `/accedi` | Nav (voce secondaria "Accedi") | Confine verso l'area riservata autenticata (`/app`) — non fa parte del sito vetrina | Costruita, fuori scope di questa sessione |
| Preferenze cookie | Link sempre raggiungibile (footer o simile) | Riapre il banner di consenso in qualsiasi momento | Costruita (Story 18.6) |

Nav orizzontale nell'header (Home/Squadre/Calendario/Staff/Contatti + Accedi), con wrap su schermi stretti — nessun drawer/hamburger, vedi Responsive & Piattaforma per la nota critica sul mockup. Footer con blocco contatti, icone social, menu secondario che duplica in parte le voci di nav, riga di copyright. Nessuno stack modale a più di un livello: l'unico elemento sovrapposto del sito è il banner cookie, un'unica fascia fissa, mai combinato con altri overlay.

→ Riferimento di composizione: `mockups/home-poster-sportivo.html` (mostra home completa + stato mobile secondario a 375px). Spec vince in caso di conflitto — vedi la nota sulla navigazione mobile in Responsive & Piattaforma, dove il mockup e la decisione reale divergono.

## Voce e Tono

Microcopy. La voce e il registro visivo vivono in `DESIGN.md`.

Il sibling `/app` ha un principio esplicito e opposto al registro qui scelto: "mai da poster... tono calmo e diretto" — quel documento cita imocovolley.it (maiuscole ed esclamativi diffusi) come riferimento esplicitamente scartato per l'interfaccia di lavoro. Qui, sul sito vetrina, quello stesso registro energico è la direzione scelta e voluta: maiuscolo ampio nei titoli (via `text-transform`, non nel markup), frasi brevi ed evocative nell'hero ("Ogni punto è una famiglia che tifa"). La differenza col portale interno non è "poster sì/no in astratto" — è che qui il visitatore sta leggendo una vetrina, non eseguendo un compito operativo su un dato sensibile (presenze, certificati).

Il tono resta comunque onesto sui contenuti mancanti: nessuna sezione forza un'apparenza di completezza quando i dati non ci sono — meglio nascondere una sezione vuota (sponsor, partite) o mostrare un messaggio esplicito (Squadre/Calendario/Staff senza dati) che inventare un placeholder generico "presto disponibile" ovunque.

| Fare | Evitare |
|---|---|
| "Ogni punto è una famiglia che tifa" (hero, evocativo, breve) | Punti esclamativi multipli, urla in maiuscolo nel markup |
| "Nessuna partita in programma questa settimana" (stato vuoto, diretto) | "Oops! Non ci sono partite 😢" |
| "Prossima partita" (etichetta chiara) | "GUARDA CHI GIOCHIAMO!!!" |
| Un solo CTA per hero ("Scopri le squadre") | Più pulsanti in competizione nello stesso blocco |
| "Preferenze cookie" sempre raggiungibile, linguaggio neutro | Testo persuasivo/manipolativo sul banner cookie ("dark pattern" per spingere l'accettazione) |

## Pattern dei Componenti

Comportamentale — le specifiche visive vivono in `DESIGN.md.Componenti`.

| Componente | Uso | Regole comportamentali |
|---|---|---|
| Header/nav | Ogni pagina pubblica | Voce della pagina corrente visivamente distinguibile (sottolineatura persistente). Click su "Accedi" porta a `/accedi`, fuori dal sito vetrina — non conta come voce di sezione. Su schermo stretto: wrap orizzontale, ogni voce resta raggiungibile e cliccabile, nessuna voce tagliata (`epics.md` Story 18.7 AC #4). |
| Hero | Home | Un solo CTA primario ("Scopri le squadre" → `/squadre`). Nessuna rotazione automatica di più slide/messaggi (nessun carosello). |
| Fascia "prossima partita" | Home | Compare solo se esiste almeno una partita nella settimana corrente per qualunque Gruppo (`epics.md` Story 18.3 AC #2) — nessuna area vuota. Nessuna azione cliccabile oltre l'eventuale link implicito della sezione stessa: è un teaser informativo, non un form. |
| Team-card | Squadre (elenco completo), Home (galleria parziale) | **Due contesti diversi, non lo stesso elenco**: su `/squadre` una card per **ogni** Gruppo della stagione corrente, foto quando presente, nessuna riga nascosta anche senza Allenatore assegnato (`epics.md` Story 18.8 AC #3). In Home, la sezione foto-squadra mostra **solo** i Gruppi che hanno caricato una foto — non è un elenco completo con placeholder per gli assenti, è una galleria parziale (`epics.md` Story 18.4 AC #3). Non confondere le due regole in sviluppo: stesso componente visivo, criterio di inclusione diverso per pagina. |
| Match-card | Home (teaser settimana corrente), Calendario (elenco completo raggruppato per settimana) | Stessi campi ovunque: squadre, data/ora, luogo, nessuna colonna "azioni", nessun dato riservato (`epics.md` Story 18.9 AC #2). In Calendario, raggruppate per settimana con un'intestazione di settimana leggibile, ordine cronologico. |
| Fascia sponsor | Home | Compare solo se ci sono Sponsor attivi (`epics.md` Story 18.2 AC #2) — nessuna area vuota, nessun placeholder generico al posto della sezione mancante. |
| `social-embed` | Home | Caricato **solo dopo consenso esplicito** del Visitatore (Story 18.6 AC #5, vincolo trasversale a ogni story che introduce cookie non essenziale). Se non configurato o irraggiungibile, la sezione non compare e non rompe il resto della pagina (fail-soft, `epics.md` Story 18.5 AC #3). L'iframe del widget richiede un `title` descrittivo esplicito (vedi Soglia di Accessibilità) — un widget di terze parti senza etichetta accessibile è un rischio noto per screen reader. |
| Banner cookie | Ogni pagina pubblica, prima visita | Compare una sola volta finché non c'è una scelta registrata (localStorage o cookie tecnico proprio). Non blocca la navigazione — il Visitatore può continuare a usare il sito senza scegliere subito (`epics.md` Story 18.6 AC #4). "Preferenze cookie" resta raggiungibile in ogni momento successivo per rivedere la scelta. |
| `staff-list` | Staff | Un Allenatore compare solo se assegnato ad almeno un Gruppo nella stagione corrente — regola opposta a Squadre, dove un Gruppo senza staff resta comunque visibile (`epics.md` Story 18.10 AC #2). Nessun dato riservato (email, credenziali). |
| `contact-block` | Contatti | Ogni campo (indirizzo, telefono, email, social) è indipendentemente opzionale: un campo mai configurato **non renderizza nulla**, non un placeholder "non disponibile" (`epics.md` Story 18.11, coerente col pattern già noto del singleton `ConfigurazioneApplicazione`). Stato vuoto esplicito solo se **letteralmente nessun campo** è mai stato configurato. Icone social, se presenti, rispettano lo stesso vincolo di area cliccabile 44px del footer. |

## Fotografia Placeholder

Sezione dedicata perché nessuna foto reale esiste ancora in nessun punto del sito: il trattamento visivo (trama diagonale + didascalia, vedi `DESIGN.md.Componenti → placeholder-foto`) non è un segnaposto da sviluppo da sostituire silenziosamente — è il contenuto reale e presentabile fino a quando non arrivano foto vere, e va trattato con la stessa cura del resto del registro visivo.

Due contesti con regole diverse, da non confondere in sviluppo:

1. **Hero (Home)** — placeholder presumibilmente di lunga durata: nessuna storia del prodotto introduce oggi un flusso di caricamento per una foto d'azione dell'hero. Resta così finché non viene aperta una story dedicata.
2. **Foto squadra (team-card, Squadre e Home)** — placeholder **solo nella fase di lancio**, prima che gli Allenatori/Admin/Dirigente comincino a caricare foto reali per Gruppo (Story 18.4, già disponibile). Una volta che il flusso è in uso, un Gruppo senza foto propria **non mostra il placeholder**: il comportamento reale, già specificato dall'epica, è l'assenza di immagine in quella card (nessun placeholder per i Gruppi senza foto, `epics.md` Story 18.4 AC #3). Il pattern hatch documentato in `DESIGN.md` va quindi trattato come uno stato transitorio pre-adozione, non come fallback permanente per-riga.

Un terzo pattern, distinto e più semplice, copre i loghi sponsor non ancora caricati: un box con bordo tratteggiato ed etichetta testuale ("SPONSOR 0X"), non la trama fotografica — coerente col fatto che uno sponsor senza logo è un caso di configurazione incompleta lato Admin, non un'assenza di contenuto strutturale come una foto squadra non ancora scattata.

## Pattern di Stato

| Stato | Superficie | Trattamento |
|---|---|---|
| Nessuno Sponsor attivo | Home, sezione sponsor | Sezione intera nascosta, nessuna area vuota (`epics.md` Story 18.2 AC #2) |
| Nessuna partita nella settimana corrente | Home, fascia "prossima partita" | Sezione intera nascosta (`epics.md` Story 18.3 AC #2) |
| Nessun Gruppo con foto caricata | Home, galleria foto squadra | Sezione ridotta o assente se nessun Gruppo ha una foto — galleria parziale, mai un placeholder per Gruppo mancante (`epics.md` Story 18.4 AC #3) |
| Embed social non configurato o irraggiungibile | Home, sezione social | Sezione non compare, resto della pagina non si rompe (fail-soft, `epics.md` Story 18.5 AC #3) |
| Prima visita, nessuna scelta cookie registrata | Ogni pagina pubblica | Banner di consenso non bloccante, unico per sessione di prima visita (`epics.md` Story 18.6 AC #1-2) |
| Nessun Gruppo nella stagione corrente | Squadre | Messaggio esplicito al posto dell'elenco vuoto (`epics.md` Story 18.8 AC #4) |
| Gruppo senza Allenatori assegnati | Squadre | Riga/card comunque visibile, senza elenco staff (`epics.md` Story 18.8 AC #3) |
| Nessuna partita programmata nella stagione | Calendario | Messaggio esplicito al posto dell'elenco vuoto (`epics.md` Story 18.9 AC #3) |
| Nessun Allenatore assegnato a un Gruppo nella stagione corrente | Staff | Messaggio esplicito — quell'Allenatore semplicemente non compare nell'elenco se non assegnato (`epics.md` Story 18.10 AC #2, #4) |
| Nessun campo Contatti mai configurato | Contatti | Messaggio esplicito, **solo** se letteralmente nessun campo esiste; un singolo campo mancante non genera alcun placeholder (`epics.md` Story 18.11) |
| Caricamento dati (cold load) | Ogni pagina | `[ASSUMPTION]` nessuno stato di caricamento client visibile non è specificato in discovery: dato che tutte le pagine leggono dati pubblici in sola lettura, l'assunzione di lavoro più semplice è il rendering lato server (Server Component/Route Handler Next.js), senza uno stato di caricamento lato client separato — coerente con NFR6 ("soluzione più semplice") già citato per altre decisioni dell'Epic 18. Da confermare in sviluppo se emerge un caso reale di fetch lato client. |
| Errore di lettura dati (DB/Prisma) | Sponsor, Partite, Squadre, Staff | `[ASSUMPTION]` aggiunto in rubric review: nessuna storia dell'epica specifica un trattamento per un errore di lettura distinto da "nessun dato" — oggi solo l'embed social (Story 18.5 AC #3) ha un comportamento fail-soft esplicito. Ipotesi di lavoro più semplice, coerente con NFR6: trattare un errore di lettura come lo stato vuoto già definito per quella superficie (nessuna sezione/messaggio esplicito già previsto), loggando l'errore lato server — non distinguibile per il Visitatore da "nessun dato oggi". Da confermare in sviluppo se serve un messaggio diverso da "nessun dato" per un errore reale. |

## Primitive di Interazione

- **Micro-animazioni di stato, mai decorative** — sottolineatura di nav che si espande all'hover (250ms), pulsante primario che si solleva 2px e cambia sfondo all'hover (200ms), team-card che si solleva 6px all'hover (250ms), icona social che cambia colore all'hover. Nessuna animazione di ingresso pagina, nessun parallax, nessun carosello automatico — coerente col requisito esplicito del brief ("non invasivo") e con lo stesso principio "motion minimo" già del sibling `/app`. `@media (prefers-reduced-motion: reduce)` riduce ogni transizione a un cambio di stato quasi istantaneo (il segnale — sottolineatura, colore — resta, il movimento no) — aggiunto in accessibility review, nessuna delle due bozze iniziali lo menzionava.
- **Click/tap diretto, nessun gesto nascosto** — nessuno swipe, nessun long-press con significato di prodotto. Pubblico anonimo e misto (genitori, potenziali iscritti, tifosi): solo tap/click e scroll, gli unici gesti impliciti affidabili per un visitatore che non ha familiarità col prodotto.
- **Target di tocco minimo 44×44px** — già implementato nella nav pubblica shippata (`app/NavPubblica.module.css`, `.voce{min-height:44px}` con `display:inline-flex` sul link stesso, non su un contenitore esterno — lezione già documentata nel progetto: `min-height` su un elemento non-flex non basta se il figlio cliccabile non riempie l'altezza dichiarata). Stesso vincolo va rispettato per pulsanti primari, box countdown se mai cliccabili, le azioni del banner cookie, **le icone social del footer/contatti (38px di resa visiva nel mockup, sotto soglia — l'area cliccabile va allargata via hit-area/padding indipendentemente dall'icona)** e **il link "Accedi" (padding attuale ~28-30px di altezza resa, sotto soglia)** — questi ultimi due aggiunti esplicitamente in accessibility review, mancavano dall'elenco nella prima stesura.
- **Nessun contenuto essenziale dietro hover-only** — coerente col mobile-first: ogni informazione (categoria squadra, metadati partita) è visibile di default, l'hover è solo un rinforzo (sollevamento, sottolineatura), mai l'unico modo per rivelare un dato su desktop.
- **Consenso cookie, mai una scelta forzata** — il banner non blocca lo scroll o la navigazione; "Rifiuta" ha lo stesso peso di interazione di "Accetta" (nessun dark pattern di dimensione/colore che spinga verso l'accettazione).

## Soglia di Accessibilità

Comportamentale — il contrasto visivo vive in `DESIGN.md` (coppie testo/sfondo calcolate, non solo dichiarate).

- WCAG AA come soglia guida su tutto il sito pubblico, stesso impegno dichiarato dal sibling `/app` — non un audit formale certificato con strumenti dedicati.
- Coppie di contrasto calcolate in `DESIGN.md → Colori`: testo `{colors.blu-carbone}`/`{colors.bianco}` su `{colors.azzurro}` (5.51:1), testo chiaro su `{colors.blu-carbone}` (4.76:1-11.58:1 a seconda del tono — range ricalcolato dopo il cambio da quasi-nero a blu carbone, Story 18.15, il tono più basso/`{colors.testo-scuro-muto}` ha richiesto una seconda correzione di hex per restare sopra AA sul nuovo sfondo), link "Accedi" su blu-carbone (4.97:1) — tutte sopra soglia AA dopo la correzione. **Rimane esplicitamente da verificare** (non ancora calcolabile oggi) il contrasto del titolo hero sopra una foto reale, quando arriverà: l'ombra testo prevista nel mockup è un aiuto, non una garanzia per ogni scatto futuro — vedi `DESIGN.md → Componenti → hero`.
- `[ASSUMPTION]` Contorno di focus visibile su ogni elemento interattivo alla navigazione da tastiera (SC 2.4.7): il mockup di riferimento non definisce alcuno stato `:focus-visible` (è un mockup puramente visivo), i token di focus in `DESIGN.md` sono un'estrapolazione necessaria per rispettare questo impegno, non una decisione già presa nel mockup stesso — estesi in accessibility review anche a icone social e azione "Rifiuta" del banner cookie, inizialmente scoperte.
- Target di tocco minimo 44×44px per l'uso mobile-first (vedi Primitive di Interazione, elenco esteso in accessibility review a icone social e link "Accedi") — rilevante in particolare per la nav (già implementata) e per le azioni del banner cookie, spesso toccate distrattamente mentre si naviga verso un'altra sezione.
- Nessuna informazione comunicata dal solo colore: lo stato attivo della nav usa sottolineatura **oltre** al colore; le sezioni condizionali (sponsor, partite, foto squadra) compaiono/scompaiono per contenuto reale, non per un indicatore visivo separato da interpretare.
- L'embed dei post social (Story 18.5) e qualunque script di terze parti restano dietro consenso esplicito — anche per motivi di accessibilità, non solo privacy: un widget di terze parti caricato senza controllo può introdurre trappole di focus da tastiera non gestite da questo sistema di design. Requisito minimo di mitigazione (aggiunto in accessibility review): l'iframe del widget deve avere un `title` descrittivo (vedi `DESIGN.md → Componenti → social-embed`); da verificare in sviluppo se il provider scelto supporta l'uscita da tastiera (Tab/Escape) senza intrappolare il focus.

## Responsive & Piattaforma

Mobile-first per requisito esplicito del brief: la maggior parte dei visitatori consulta calendario/risultati dal telefono. Un solo breakpoint esplicito nel mockup di riferimento, a 900px: sopra, griglie a 2-3 colonne (team-grid, match-grid, footer-grid); sotto, colonna singola e titolo hero ridotto (`{typography.display-hero-mobile}`, 44px).

| Ambito | Comportamento |
|---|---|
| Desktop (≥900px) | Nav orizzontale su una riga. `team-grid` a 3 colonne, `match-grid` a 2 colonne, `footer-grid` a 3 colonne. Hero a `{typography.display-hero}` (68px). |
| Mobile (<900px) | Nav orizzontale **con wrap** (vedi nota critica sotto — non hamburger). Griglie a colonna singola. Hero a `{typography.display-hero-mobile}` (44px), ulteriore riduzione fluida verso ~32px sotto i ~480px (`[ASSUMPTION]`, vedi `DESIGN.md → Layout e Spaziatura`). |

**Nota critica — navigazione mobile, mockup vs decisione reale**: il mockup di riferimento (`mockups/home-poster-sportivo.html`) include un frame dimostrativo a 375px con un'icona hamburger (`.m-burger`) e nasconde `nav.main` interamente sotto i 900px. Questo **non** riflette la decisione reale del prodotto: la Story 18.7 (menu di navigazione multi-pagina) è già stata implementata lo stesso giorno di questa sessione (2026-08-13) con **elenco orizzontale con wrap**, esplicitamente **senza** drawer/hamburger — commento nel codice sorgente (`app/NavPubblica.module.css`): *"nessun drawer/hamburger come la NavBar interna autenticata (Story 9.2), pensata per un elenco più lungo e ruolo-dipendente: qui bastano 5 voci corte, vanno semplicemente a capo su schermi stretti."* Il restyling secondo il registro Poster Sportivo deve mantenere questo comportamento — riverniciare colori/tipografia del pattern esistente (wrap), non introdurre il pattern hamburger mostrato nel mockup statico. `epics.md` Story 18.7 AC #4 impone comunque che "nessuna voce" resti "tagliata o irraggiungibile" su schermi stretti, requisito già soddisfatto dal wrap orizzontale shippato.

I ruoli gestionali (Admin/Dirigente/Allenatore) che caricano foto squadra o configurano sponsor/social/contatti lo fanno da `/app` (portale interno, spine separata) — questo documento riguarda solo l'esperienza del Visitatore anonimo sulle pagine pubbliche.

## Ispirazione e Anti-pattern

- **Ripreso da volleyrocasaldepazzi.it / gassalespiacenza.it:** la tipologia di sito (header+menu, hero, news/social, calendario/risultati, sponsor, footer contatti/social) — riferimento di tipologia salvato esplicitamente in discovery per l'intera Epic 18, prima ancora della scelta del registro visivo.
- **Ripreso dal registro "Poster Sportivo" (direzione scelta in discovery, confronto di 4 alternative):** tagli diagonali netti, tipografia condensata pesante maiuscola, blocchi di contenuto in blu carbone assertivi, azzurro come blocco colore pieno, magenta come lampo puntuale riservato.
- **Scartato — le altre 3 direzioni esplorate in discovery (Editoriale Pulito, Dinamico Moderno, Caldo e Appartenenza):** presentate in artifact comparativo, non scelte. Non riprendere elementi di quelle varianti (es. gli angoli molto arrotondati di "Caldo e Appartenenza", i gradienti diffusi di "Dinamico Moderno") in questo sistema — la coerenza del registro "Poster Sportivo" dipende dal non mescolare tratti presi da direzioni concorrenti scartate.
- **Scartato — imocovolley.it come modello di interfaccia** (nota ereditata dal sibling `/app`, dove è citato come riferimento di tono esplicitamente scartato per l'interfaccia interna): qui il registro energico **è** la direzione scelta, ma questo non significa "tutto ciò che imocovolley.it fa" è ammesso — restano fuori scope pattern non richiesti dal brief (es. sezione palmares/storico trofei, non presente in nessuna story dell'Epic 18).
- **Scartato — hamburger/drawer per la nav mobile:** mostrato nel frame dimostrativo del mockup di riferimento ma esplicitamente non scelto per l'implementazione reale (Story 18.7) — vedi Responsive & Piattaforma.
- **Scartato — badge numero-maglia magenta su team-card:** presente nel mockup come dato illustrativo (numero maglia di un'Atleta), ma il dato non esiste nel modello pubblico (`/squadre` non mostra mai Atlete) — non riprodurre l'elemento visivo senza il dato che lo giustificava.

## Key Flows

### Flow 1 — Chiara (Genitore, venerdì sera, prima della partita di sabato)

> "Chiara, mamma di un'atleta Under 16, apre il sito dal telefono venerdì sera per sapere orario e palazzetto della partita di sabato, senza dover scrivere al gruppo WhatsApp dei genitori."

1. Chiara apre `/` dal telefono, venerdì sera.
2. Vede l'hero (foto placeholder + messaggio della stagione) e sotto, subito visibile senza troppo scroll, la fascia "Prossima partita" in azzurro pieno.
3. Legge squadre, data/ora, e luogo direttamente nella fascia — nessun tap necessario per l'informazione essenziale.
4. Vuole conferma dell'indirizzo esatto: tocca "Calendario" nella nav (wrap orizzontale, ogni voce raggiungibile anche su schermo stretto).
5. Su `/calendario` ritrova la stessa partita nella settimana corrente, con lo stesso formato di match-card.
6. **Climax:** Chiara chiude il sito senza aver scritto un solo messaggio nel gruppo genitori — l'informazione che le serviva (dove, quando) era già nella prima schermata utile, in meno di un minuto dall'apertura.

Nota di fallimento: se nessuna partita è programmata quella settimana (es. sosta del campionato), la fascia "Prossima partita" non compare in home (`epics.md` Story 18.3 AC #2) — Chiara vede comunque il resto della home normalmente, nessun errore, nessuna area vuota che sembri un bug.

### Flow 2 — Davide (papà di una bambina di 8 anni, valuta l'iscrizione)

> "Davide sta cercando uno sport per sua figlia. Prima di chiamare la segreteria, vuole capire se la società ha una categoria adatta all'età e con quale allenatore, per arrivare alla telefonata già informato."

1. Davide trova il sito cercando "volley Mogliano" o tramite un post social condiviso da un conoscente.
2. Apre `/squadre` dalla nav e scorre l'elenco dei Gruppi della stagione corrente, cercando una categoria Under adatta a 8 anni.
3. Trova il Gruppo giusto (es. "Minivolley"), vede il nome dell'Allenatore assegnato — se non ce n'è ancora uno, il Gruppo compare comunque, senza che questo sembri un errore (`epics.md` Story 18.8 AC #3).
4. Passa a `/staff` per farsi un'idea più ampia dello staff tecnico della società, non solo di quel Gruppo.
5. Apre `/contatti` per trovare un numero di telefono o un'email: solo i campi che la società ha effettivamente configurato compaiono, nessun "non disponibile" a riempire lo spazio.
6. **Climax:** Davide compone il numero già sapendo che categoria chiedere e con quale allenatore probabilmente parlerà sua figlia — la telefonata alla segreteria (l'unico passo davvero necessario per iscriversi, il sito non è self-service) diventa una conversazione mirata, non una raccolta di informazioni da zero.

Nota di fallimento: se la sezione Contatti non ha ancora alcun campo configurato (caso limite, società appena aperta al pubblico), Davide vede un messaggio esplicito invece di una pagina vuota (`epics.md` Story 18.11) — sa che deve cercare altrove (es. il post social che lo ha portato al sito) per un contatto, non che il sito sia rotto.
