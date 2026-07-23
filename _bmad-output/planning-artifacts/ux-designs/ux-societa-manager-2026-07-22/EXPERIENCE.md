---
name: Mogliano Volley — Società Manager
status: final
sources:
  - _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/epics.md
updated: 2026-07-22
---

# Mogliano Volley — Società Manager — Experience Spine

> Applicazione web responsive unica (mobile + desktop), nessuna app nativa, nessun offline. Sei ruoli (Allenatore, Atleta, Genitore, Segreteria, Dirigente, Admin), ~200 atlete. Da leggere insieme a `DESIGN.md` (identità visiva); questo documento è il comportamento/l'architettura dell'informazione.

## Fondamenta

Società Manager è una singola web app responsive: stessa base di codice, stesse pagine, comportamento che si adatta da mobile a desktop — non due prodotti separati. Nessuna app nativa, nessun requisito offline (NFR3): l'assunzione è connessione dati normale, in palestra o a casa.

Nessun design system/libreria UI è nominato: il progetto oggi (`package.json`) non ha alcuna libreria di componenti (nessun Tailwind, nessun shadcn, nessun Material) — è CSS scritto a mano sopra lo scaffold grezzo di `create-next-app`. `DESIGN.md` è il riferimento di identità visiva (token colore/tipografia/forma); questa specifica non presuppone un framework di componenti da cui ereditare.

Solo light mode (nessuna variante dark in ambito). Soglia di accessibilità: WCAG AA come vincolo guida, non un audit formale certificato.

Scala: fino a ~200 atlete nel v1 — le liste (atlete di un gruppo, gruppi, certificati da confermare) sono sempre corte. Nessun pattern da scala grande (infinite scroll, virtualizzazione) è necessario in nessuna superficie.

## Architettura dell'Informazione

Le superfici si dividono in due cluster, secondo la stessa logica che separa i ruoli "operativi sul campo" da quelli "di gestione dell'insieme": chi vive il settore da dentro un gruppo (Allenatore, Atleta, Genitore) vede solo ciò che lo riguarda; chi lo gestisce nel suo complesso (Admin, Dirigente, Segreteria) ha una vista trasversale su gruppi/palestre/atlete.

### Viste scoped/personali (Allenatore · Atleta · Genitore)

| Superficie | Route | Raggiunta da | Scopo |
|---|---|---|---|
| Il mio orario | `/mio-orario` | Nav principale | Allenatore: slot dei propri gruppi; Atleta: slot del proprio gruppo, per settimana (FR-3, FR-4) |
| Registrazione presenze | `/presenze` | Nav / dal proprio orario | Allenatore segna presenza/assenza per uno slot del proprio gruppo, anche passato (FR-8) |
| Storico presenze | `/storico-presenze` | Nav / dalla scheda atleta | Allenatore o Atleta: cronologia presenze di una singola atleta (FR-9) |
| Certificato medico | `/certificato-medico` | Nav | Genitore/Atleta: upload del proprio certificato; stato corrente (FR-11) |
| Notifiche | `/notifiche` | Nav | Allenatore/Dirigente: avvisi di nuovo certificato caricato per il proprio gruppo (FR-12) |
| *(non ancora costruita)* Dati antropometrici | `(dati-atleta)/…` | Nav (Story 6.1) | Atleta/Allenatore: inserimento e storico misurazioni antropometriche/test fisici |
| *(non ancora costruita)* Grafico progresso | `(dati-atleta)/…` | Dalla scheda dati atleta (Story 6.2) | Andamento nel tempo delle misurazioni, multi-serie |

### Viste gestionali/d'insieme (Admin · Dirigente · Segreteria)

| Superficie | Route | Raggiunta da | Scopo |
|---|---|---|---|
| Palestre | `/palestre` | Nav | Admin/Dirigente: anagrafica palestre e campi (FR-1) |
| Slot | `/slot` | Nav | Admin/Dirigente: caricamento slot allenamento (FR-2) |
| Orari (vista trasversale) | `/orari` | Nav | Segreteria (e ruoli gestionali): tutti gli slot, filtrabili per palestra/gruppo (FR-5) |
| Gruppi | `/gruppi` | Nav | Admin/Dirigente: creazione gruppi, assegnazione allenatori e atlete (FR-6, FR-7, FR-30) |
| Conferma certificati | `/conferma-certificati` | Nav | Segreteria: valida un certificato caricato o ne inserisce uno manuale (FR-14) |
| Conferma iscrizioni | `/conferma-iscrizioni` | Nav | Segreteria: conferma l'iscrizione di un'atleta per l'anno corrente (FR-17) |
| Import atlete | `/import-atlete` | Nav | Admin/Dirigente: import export Excel federale, matching per codice fiscale (FR-19, FR-22, FR-23) |
| Precaricamento allenatori | `/precaricamento-allenatori` | Nav | Admin/Dirigente: precarica un allenatore prima della sua registrazione (FR-20) |
| Amministrazione | `/admin` | Nav | Admin: gestione utenti e ruoli (FR-26) |
| Configurazione SMTP | `/smtp` | Nav → Configurazione | Admin: parametri server email (FR-31) |
| Configurazione logo | `/logo` | Nav → Configurazione | Admin: upload logo applicazione (FR-32) |
| *(non ancora costruita)* Vista d'insieme Dirigente | `(amministrazione)/…` | Nav (Story 5.1) | Dirigente: card per gruppo con slot e stato aggregato certificati (FR-29) — vedi Key Flows, UJ-4 |
| *(non ancora costruita)* Permessi granulari | `(amministrazione)/…` | Nav → Amministrazione (Story 5.2) | Admin: configura permessi più fini sui dati sanitari, oltre il ruolo base (FR-27) |
| *(non ancora costruita)* Wizard nuova stagione | `(rollover-stagionale)/…` | Nav (Story 6.3) | Admin/Dirigente: bozza di gruppi/assegnazioni copiata dall'anno precedente, da rivedere e confermare (FR-28) |

### Superfici neutre / di sistema

| Superficie | Route | Scopo |
|---|---|---|
| Accesso | `/accedi` | Login, tutti i ruoli |
| Registrazione | `/registrati` | Registrazione autonoma per ruolo, aggancio genitore-atleta per codice fiscale (FR-18, FR-21) |
| Non autorizzato | `/non-autorizzato` | Atterraggio per un accesso rifiutato (`FORBIDDEN`, AD-4) |
| Cron promemoria certificati | `api/cron/promemoria-certificati` | Nessuna UI — job schedulato (FR-16, AD-7) |

Nessuna barra laterale o drawer complesso: la navigazione è una singola barra orizzontale (sfondo `{colors.navy}` per Componenti → nav-bar in `DESIGN.md`), le cui voci visibili dipendono dal ruolo dell'utente autenticato (guardia di ruolo per pagina/route-group, non un menu che nasconde voci lato client). Nessuno stack modale a più di un livello.

## Voce e Tono

Il principio guida del PRD è esplicito: **"niente rumore"** — il sistema segnala le eccezioni reali, non genera notifiche per la routine. La contro-metrica dichiarata (SM-C1) è che il numero di notifiche per utente non deve crescere: l'obiettivo è essere più silenziosi di un gruppo WhatsApp, non produrre più notifiche totali.

Gli alert sono sempre non bloccanti. FR-15, testuale: *"L'alert è puramente informativo: non impedisce mai la registrazione di una presenza."* Questo vincolo governa ogni microcopy di stato in questo prodotto — un avviso descrive, non blocca né allarma.

Il tono resta calmo e diretto, mai da poster. Il riferimento scartato in discovery (imocovolley.it, sito pubblico tifosi) usa maiuscole ed esclamativi diffusi — un registro esplicitamente non voluto qui, dove l'utente sta facendo un compito operativo (segnare presenze, caricare un file), non leggendo una notizia.

| Fare | Evitare |
|---|---|
| "Certificato scaduto" | "ATTENZIONE!! Certificato scaduto!!" |
| "Certificato in attesa di conferma" | "In sospeso ⏳" (icona al posto del testo) |
| "Presenze salvate." | "Presenze salvate con successo! 🎉" |
| Frasi brevi, complete, senza esclamativi | Punti esclamativi, tono da annuncio/poster |
| Una notifica per evento reale (nuovo certificato, promemoria 30/7gg) | Notifiche per ogni azione di routine (es. ogni presenza salvata) |

## Pattern dei Componenti

Comportamentale — le specifiche visive vivono in `DESIGN.md` → Componenti.

| Componente | Uso | Regole comportamentali |
|---|---|---|
| Alert non bloccante (badge stato certificato) | Riga presenza, scheda atleta | Non blocca mai un'azione in corso (salvare una presenza resta sempre possibile, FR-15). Non apre un dialog di conferma al click: al massimo naviga verso il dettaglio del certificato. |
| Cluster stat-tile aggregato | Vista d'insieme Dirigente (Story 5.1) | Una card per Gruppo con tre contatori (in regola / in scadenza / scaduto). Il tap/click su una card rivela le atlete nominate coinvolte in quello stato — vedi UJ-4. `[NOTA UX APERTA]`: se questa rivelazione avviene per espansione inline della card o per navigazione a una vista filtrata non è specificato in discovery; entrambe soddisfano il requisito (vedere i nomi senza telefonate), la scelta implementativa è aperta. |
| Wizard bozza-revisione-conferma | Wizard nuova stagione (Story 6.3, non ancora costruito) | Tre stadi: bozza generata automaticamente dall'anno agonistico precedente → revisione editabile dall'utente → conferma esplicita che applica le modifiche. `[NOTA UX APERTA]`: cosa viene esattamente copiato/adattato (solo gruppi e assegnazioni allenatori? anche atlete? quali campi vengono riproposti come modificabili prima della conferma?) non è deciso — l'epic lo segna esplicitamente come dettaglio da definire, e anche l'Architecture Spine lo elenca tra i punti differiti. Non inventare qui la logica di copia: va decisa quando si affronta la Story. |
| Grafico progresso multi-serie | Scheda dati atleta (Story 6.2, non ancora costruito) | Multi-serie (una per tipo di misurazione: altezza, peso, test fisici), pochi punti per serie (misurazioni periodiche, non ad alta frequenza). Nessuna libreria di grafici è installata nel progetto oggi. `[NOTA UX APERTA]`: raccomandato un passaggio dedicato con la skill `dataviz` quando questa Story viene costruita, per scegliere approccio/libreria e palette coerenti con `DESIGN.md` — non viene anticipata qui una scelta tecnica. |
| Riga presenza con checkbox | Registrazione presenze | Tocco sulla checkbox stessa (o sull'intera riga su mobile, per target di tocco più ampio) alterna presente/assente. Nessuna conferma richiesta per singola riga; il salvataggio è un'azione esplicita a fine lista (pulsante primario). |

## Pattern di Stato

Stato del certificato medico, ricavato dal modello dati reale (`prisma/schema.prisma`, `CertificatoMedico`, enum `StatoCertificato`). → Riferimento di composizione: `mockups/key-certificato-medico.html` (stati IN_ATTESA e CONFERMATO affiancati). Spec vince in caso di conflitto.

| Stato | Condizione | Trattamento |
|---|---|---|
| Nessun certificato caricato | Nessuna riga `CertificatoMedico` per l'atleta | Nessun badge; testo discreto tipo "Nessun certificato caricato" dove rilevante (scheda atleta), nessun allarme — è uno stato iniziale normale, non un'anomalia. |
| `IN_ATTESA` | Certificato caricato (Story 4.1) ma non ancora validato dalla Segreteria; nessuna `dataFineValidita` ancora | Da comunicare come "in attesa di conferma", tono neutro/informativo. `[NOTA UX APERTA]`: la variante badge da `DESIGN.md` (success/warning/danger) non copre esplicitamente questo stato "in corso" — nessuna delle tre varianti gli è stata assegnata in discovery. Non forzare warning/danger per questo stato senza una decisione dedicata. |
| `CONFERMATO`, `dataFineValidita` futura (oltre 30gg) | Validato dalla Segreteria, in regola | Badge/conteggio **success**. |
| `CONFERMATO`, `dataFineValidita` entro 30 o 7 giorni | Finestra dei promemoria FR-16 | Badge/conteggio **warning** ("in scadenza"). |
| `CONFERMATO`, `dataFineValidita` nel passato | Scaduto — stato *derivato* a runtime dalla data, non un valore enum a sé (l'enum copre solo `IN_ATTESA`/`CONFERMATO`) | A livello di singola atleta: badge **warning** ("Certificato scaduto"), mai danger — non deve allarmare proprio mentre si registra la presenza (FR-15). A livello di conteggio aggregato (Vista Dirigente): tile **danger** — qui il tono più marcato è corretto, perché il pubblico è chi deve agire (sollecitare), non chi sta facendo l'attività quotidiana. |

Stati vuoti (liste corte, ~200 atlete di scala — mai una lista lunga da paginare):

| Stato vuoto | Superficie | Trattamento |
|---|---|---|
| Nessuna atleta nel gruppo | Gruppi, Registrazione presenze | Messaggio diretto ("Nessuna atleta assegnata a questo gruppo") + link all'assegnazione (ruoli gestionali) |
| Nessuno slot ancora caricato | Il mio orario, Orari | "Nessun allenamento programmato" — non un errore, può essere presto-stagione |
| Nessun certificato da confermare | Conferma certificati | "Nessun certificato in attesa" — stato di riposo positivo, non "vuoto da riempire" |
| Nessuna misurazione ancora (Story 6.1/6.2) | Scheda dati atleta | Nessun grafico da mostrare finché non esistono almeno due misurazioni (precondizione esplicita della Story 6.2); messaggio che invita a inserire la prima misurazione |

## Primitive di Interazione

- **Target di tocco generosi, minimo 44×44px** — priorità mobile per i ruoli scoped (Allenatore/Atleta/Genitore, i due Key Flow canonici li vedono su telefono, spesso di sera): checkbox di presenza, righe elenco e pulsanti primari dimensionati almeno 44×44px, coerente con WCAG 2.5.8 (Target Size Minimum) e le convenzioni delle piattaforme mobile — non solo per il mouse. Rilevante perché una lista di 15-25 atlete con target sotto-dimensionati produce errori di tocco reali (riga sbagliata spuntata), non solo un problema estetico.
- **Motion minimo** — solo transizioni di stato essenziali (hover, focus, apertura di un form/wizard), mai animazione decorativa, mai transizione di ingresso pagina. Decisione esplicita di discovery, coerente col principio "niente rumore": un'interfaccia che si muove poco si legge più in fretta.
- **Click/tap diretto, nessun gesto nascosto** — nessuno swipe-to-delete, nessun long-press con significato di prodotto: con un pubblico misto (genitori, dirigenti, non necessariamente utenti "power") i soli gesti impliciti (tap, scroll) restano più affidabili.
- **Salvataggio esplicito, non ottimistico silenzioso** — la registrazione presenze ha un pulsante "Salva" esplicito a fine lista: dato che FR-8 permette di registrare anche per slot passati/dimenticati, un salvataggio esplicito rende chiaro all'allenatore quando l'azione è effettivamente completata.
- **Errori di validazione form, sempre associati al campo** — nessun errore di validazione (import Excel, configurazione SMTP, upload certificato, assegnazione gruppi) è comunicato solo tramite colore del bordo: il messaggio di errore è testo associato esplicitamente al campo (non un'icona/colore da soli). Al fallimento di un submit, il focus si sposta al primo campo in errore, oppure un riepilogo viene annunciato (`aria-live`) se gli errori sono su più campi — rilevante in particolare per l'upload del certificato medico (dato sanitario di un minore), dove un errore comunicato solo visivamente sarebbe una barriera reale per chi usa uno screen reader. Stesso principio "niente rumore" applicato agli errori: un messaggio diretto, non un'accozzaglia di segnali ridondanti.

## Soglia di Accessibilità

Comportamentale — il contrasto visivo vive in `DESIGN.md` (coppie testo/sfondo verificate ≥ soglia WCAG AA in ogni variante di colore).

- WCAG AA come soglia guida su tutta la superficie web responsive — vincolo dichiarato in discovery, non un audit formale certificato con strumenti dedicati.
- Target di tocco minimo 44×44px per l'uso mobile-first dei ruoli scoped (vedi Primitive di Interazione), implicito nel fatto che i due Key Flow canonici (UJ-1, UJ-2) avvengono entrambi da telefono.
- Ogni stato di alert (badge certificato **e** stat-tile aggregata — qualunque componente che usa colore semantico) deve restare comprensibile anche senza colore da solo (testo esplicito "Certificato scaduto"/"in scadenza"/"scaduto", non un pallino o un bordo colorato senza etichetta) — coerente con l'uso di `{typography.badge-label}`/`{typography.stat-label}` testuale in ogni variante di `DESIGN.md`, mai un'icona o un colore da soli come portatori di significato.
- **Stato di focus visibile da tastiera** (SC 2.4.7) su ogni elemento interattivo — contorno `{colors.focus-ring}`/`{colors.focus-ring-on-navy}` definito in `DESIGN.md` → Componenti, mai rimosso senza sostituto equivalente. Non è in contraddizione con "prodotto touch/click-first": un utente che naviga da tastiera esiste comunque, anche se non è il caso d'uso primario dei Key Flow narrati.
- Nessun requisito di navigazione da tastiera avanzata (scorciatoie stile "command palette") è emerso in discovery: non è un prodotto keyboard-first, è un prodotto touch/click-first — questo non esenta però dal fornire un focus visibile di base (punto sopra).

## Responsive & Piattaforma

Una sola strategia di breakpoint è sufficiente: il contenuto è prevalentemente liste e form (orari, presenze, certificati), non dashboard multi-colonna complesse — anche la superficie più densa (Vista d'insieme Dirigente, Story 5.1) è una griglia di card per gruppo che si ridispone (reflow), non un layout a colonne fisse che richieda breakpoint intermedi dedicati.

| Ambito | Comportamento |
|---|---|
| Mobile (viewport stretto) | Colonna singola. Nav bar orizzontale compatta (una voce può scomparire su viewport molto stretti, come già previsto nel mockup di esplorazione colore). Cluster di stat-tile e griglie di card si impilano verticalmente. |
| Desktop (viewport largo) | Le stesse superfici si allargano: cluster di stat-tile e griglie di card si dispongono su più colonne per usare lo spazio orizzontale; le liste restano a colonna singola (non diventano tabelle multi-colonna dense). |

I ruoli scoped (Allenatore, Atleta, Genitore) usano l'app prevalentemente da telefono, la sera, secondo i Key Flow canonici del PRD. I ruoli gestionali (Admin, Dirigente, Segreteria) hanno compiti più "da scrivania" (import Excel, configurazione SMTP, caricamento slot) — ma restano nella stessa app responsiva: anche queste pagine devono restare utilizzabili da mobile, perché non esiste una versione separata "solo desktop". Un import Excel fatto da telefono è un caso limite accettabile, non uno da bloccare.

## Key Flows

### UJ-1 — Elena (Genitore)

→ Riferimento di composizione: `mockups/key-certificato-medico.html`. Spec vince in caso di conflitto.

> "Elena, mamma di un'atleta Under 15, carica il nuovo certificato medico dal telefono la sera prima della scadenza, e senza altre telefonate l'allenatore e il dirigente vengono avvisati mentre la segreteria riceve una mail con il file allegato da confermare."

1. Elena apre `/certificato-medico` dal telefono, la sera.
2. Carica il file del nuovo certificato per la figlia (FR-11).
3. Il sistema salva il file nello storage privato con URL firmati (AD-6) e aggiorna lo stato del certificato a `IN_ATTESA`.
4. Allenatore e Dirigente del gruppo ricevono una notifica automatica dell'upload, senza che Elena debba scrivere a nessuno (FR-12).
5. La Segreteria riceve una mail con il file allegato, pronta da confermare (FR-13).
6. **Climax:** Elena chiude l'app senza aver fatto nessuna telefonata — l'intera catena (allenatore, dirigente, segreteria) è già stata informata dal sistema al posto suo.

Nota di fallimento: se la Segreteria, in fase di conferma (FR-14), trova i dati incoerenti (es. data illeggibile), il certificato resta `IN_ATTESA` finché non viene corretto o ricaricato — Elena non riceve un "errore" bloccante, ma lo stato resta visibilmente in sospeso sulla sua scheda.

### UJ-2 — Marco (Allenatore)

→ Riferimento di composizione: `mockups/key-mio-orario.html` (passi 1-2) e `mockups/key-presenze.html` (passi 4-5). Spec vince in caso di conflitto.

> "Marco, allenatore di due gruppi, apre l'app la domenica sera, vede l'orario della settimana per entrambi i gruppi e segna le presenze di giovedì scorso che aveva dimenticato di registrare a fine allenamento."

1. Marco apre `/mio-orario` la domenica sera dal telefono.
2. Vede gli slot della settimana per entrambi i suoi gruppi in un'unica vista (FR-3).
3. Nota che le presenze di giovedì scorso non sono mai state registrate.
4. Apre `/presenze` per quello slot passato — il sistema lo consente esplicitamente (FR-8: "anche per Slot passati").
5. Segna presenza/assenza per ogni atleta del gruppo e salva.
6. **Climax:** le presenze di giovedì risultano registrate come se non fosse mai passato del tempo — nessuna finestra "troppo tardi", nessun blocco per il ritardo: il sistema si adatta al ritmo reale di un allenatore, non il contrario.

### UJ-3 — Il Dirigente (import stagionale, senza nome nel PRD)

> "Il dirigente, a inizio agosto, importa il nuovo export Excel del portale federale: il sistema riconosce le atlete già presenti via codice fiscale, aggiorna i certificati con date più recenti, e riporta comunque le Under 13 assenti dall'export, lasciandogli la possibilità di escluderle a mano."

1. Il Dirigente apre `/import-atlete` a inizio agosto, con il nuovo export Excel del portale federale in mano.
2. Carica il file per l'Anno Agonistico corrente (FR-19).
3. Il sistema riconosce le atlete già a sistema tramite codice fiscale (motore condiviso `trovaPerCodiceFiscale`, AD-5) e ne crea di nuove per chi non è ancora presente.
4. Per ogni atleta, se la data di certificato nell'export è più recente di quella già a sistema, il sistema la aggiorna; altrimenti mantiene quella esistente (FR-22, `unisciCertificato`).
5. Le atlete Under 13 assenti dall'export (limite noto del portale federale) vengono comunque riportate di default nella nuova stagione (FR-23).
6. **Climax:** il Dirigente vede l'elenco delle Under 13 riportate automaticamente e può escluderne a mano solo quelle davvero non più attive — non deve reinserire nessuno a mano, e non perde nessuna atleta valida per un limite tecnico dell'export che non dipende da lui.

### UJ-4 — Roberto (Dirigente, Vista d'insieme — Story 5.1, superficie non ancora costruita)

→ Riferimento di composizione: `mockups/key-vista-dirigente.html` (drill-down inline, passi 2-4). Spec vince in caso di conflitto.

1. Lunedì mattina, prima di entrare in ufficio, Roberto (dirigente, spesso anche allenatore) apre la Vista d'insieme dal telefono.
2. Vede una card per ciascun Gruppo, con i contatori aggregati dello stato certificati: in regola / in scadenza / scaduto (FR-29).
3. Nota 2 certificati scaduti nella card "Under 15 Femminile".
4. Tocca la card e vede i nomi delle atlete coinvolte in quello stato specifico.
5. **Climax:** niente telefonate, niente ricerca nel gruppo WhatsApp per capire di chi si tratta — i nomi sono già lì, nella stessa vista.
6. Scrive all'allenatore del gruppo chiedendogli di sollecitare i genitori delle due atlete quel pomeriggio.
7. Chiude l'app con un piano d'azione chiaro, in meno di un minuto dall'apertura.

Nota: nessuno stato di fallimento narrato per questo flow in discovery — il caso "nessun certificato scaduto in nessun gruppo" è semplicemente una vista pulita, senza card da approfondire, non un'anomalia da gestire.
