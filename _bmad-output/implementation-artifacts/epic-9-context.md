# Epic 9 Context: Miglioramenti Post-Rilascio

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A differenza degli altri epic, questo non è pianificato in anticipo: è un elenco aperto di correzioni e miglioramenti che emergono uno alla volta dalla verifica dal vivo dell'app in produzione (bug di navigazione, richieste dirette dell'utente, gap scoperti analizzando il codice). Copre trasversalmente quasi tutti i moduli esistenti — navigazione/autenticazione, anagrafica Allenatori/Atlete, Gruppi, Slot, Certificati Medici, Presenze, Amministrazione, Impostazioni — invece di una singola funzionalità coesa. Lo scopo comune è correggere comportamenti reali osservati o richiesti dall'utente, non introdurre nuova architettura: la maggior parte delle storie riusa pattern e componenti già stabiliti nei moduli esistenti (Epic 1-8) piuttosto che inventarne di nuovi. Alcune storie in coda sono "solo story, nessuna implementazione" (investigazione/registrazione del requisito, sviluppo rimandato).

## Stories

- Story 9.1: Pulsante di logoff (superseded da 9.4, `esci()` riusata invariata)
- Story 9.2: Navigazione responsive — hamburger su mobile, barra laterale verticale su desktop
- Story 9.3: Riquadro con larghezza massima per le pagine-form
- Story 9.4: Menu profilo con logoff e modifica password
- Story 9.5: Campo Cognome per Allenatore (precaricamento)
- Story 9.6: Geolocalizzazione Palestre (estesa: link Maps incollato → coordinate → mappa incorporata in `/palestre`)
- Story 9.7: Barra laterale ancora visibile dopo il logoff
- Story 9.9: Gestione Allenatori precaricati (vista, modifica, cancellazione)
- Story 9.10: La voce di navigazione attiva non si aggiorna durante la navigazione
- Story 9.13: Modifica e cancellazione di uno Slot già inserito
- Story 9.14: Rimozione di un'Atleta da un Gruppo
- Story 9.15: Assegnazione Atlete al proprio Gruppo da parte dell'Allenatore
- Story 9.16: Parametri standard per i dati fisici delle Atlete
- Story 9.17: Vista griglia mensile delle presenze per Gruppo (lato Allenatore)
- Story 9.18: Creazione di una nuova Atleta da parte dell'Allenatore
- Story 9.19: Badge "certificato in scadenza" nell'elenco Atlete di Gruppo e in Vista Dirigente
- Story 9.20: Data del nuovo certificato già in fase di caricamento
- Story 9.21: Un'Atleta in più Gruppi contemporaneamente (investigazione + sblocco vincolo)
- Story 9.22: Rimozione dell'accesso Dirigente al precaricamento Allenatori
- Story 9.23: Colore semantico sui certificati confermati (verde/giallo/rosso)
- Story 9.24: Menu principale "Impostazioni" (raggruppa SMTP e Logo)
- Story 9.25: Ordinamento per stato nella sezione "Confermati"
- Story 9.26: Vista d'insieme per l'Allenatore sui propri Gruppi
- Story 9.27: Modifica delle date di un Certificato già confermato
- Story 9.28: Aggiunta di un nuovo Atleta anche da parte di Admin/Dirigente in `/gruppi`
- Story 9.29: Menu laterale fisso durante lo scroll della pagina
- Story 9.30: Interfaccia più compatta per `/precaricamento-allenatori`
- Story 9.31: Email Segreteria configurabile
- Story 9.32: Rimuovere un Allenatore da un Gruppo
- Story 9.33: Atlete su riga separata in `/gruppi` (elenco orizzontale)
- Story 9.34: Data di scadenza del certificato nell'elenco Atlete e nei drill-down
- Story 9.35: Numero di maglia per Atleta, per stagione
- Story 9.36: Sanificazione in maiuscolo di Cognome/Nome nella creazione di una nuova Atleta
- Story 9.37: Modifica di nome e categoria di un Gruppo esistente
- Story 9.38: Correzione dell'email di un Utente non ancora confermato, da parte dell'Admin
- Story 9.39: Normalizzazione in maiuscolo delle Atlete già esistenti in anagrafica
- Story 9.40: Vista più compatta e ordinabile per l'elenco Utenti in `/app/admin`
- Story 9.41: Precaricamento email per Segreteria e Dirigente (blocco registrazione)
- Story 9.42: Dopo il logoff, atterrare sulla home pubblica invece che su `/accedi`
- Story 9.43: Rimozione delle Atlete non più in società o passate ad altra società (solo story)
- Story 9.44: Partite della settimana del proprio Gruppo in evidenza sulla home interna (solo story)

## Requirements & Constraints

- Ogni alert/badge di stato certificato resta puramente informativo: non deve mai impedire la registrazione di una presenza, e il tono deve restare calmo/non allarmistico (frasi brevi, niente esclamativi/emoji, niente colori "danger" a livello di singola riga salvo eccezioni esplicite documentate).
- La notifica automatica di nuovo Certificato Medico caricato deve raggiungere la Segreteria in modo affidabile — oggi dipende dall'assegnazione del Ruolo, non da un indirizzo dedicato (motivazione di Story 9.31).
- I dati dei Certificati Medici sono dati sanitari, spesso di minorenni: qualunque nuova superficie che li mostri (badge, drill-down, export) eredita lo stesso livello di attenzione già richiesto per l'accesso esistente.
- Progetto personale a sviluppo singolo, nessun budget/hosting dedicato: soluzioni a basso costo/complessità operativa vanno preferite a servizi esterni a pagamento (es. niente Google Maps JavaScript API con fatturazione per la geolocalizzazione, Story 9.6).
- Scala contenuta (ordine di ~200 Atlete): nessuna storia di questo epic richiede ottimizzazioni per grandi volumi.
- Ogni nuova mutazione passa da una Server Action con lo stesso contratto di errore già in uso nel progetto: `{ error: { code, message } }`, con `code: 'FORBIDDEN'` riservato ai soli rifiuti di autorizzazione (mai `NOT_FOUND` per un dato esistente ma non accessibile).

## Technical Decisions

- **Split di accesso ai dati (RLS vs Prisma diretto)**: le tabelle sensibili (CertificatoMedico, Atleta, Presenza, Iscrizione, Notifica, configurazione SMTP) si leggono/scrivono solo tramite client Supabase con sessione utente, perché le policy RLS dipendono dai claim JWT; tabelle come Palestra, Campo, Slot, Gruppo, Allenatore, Utente/UtenteRuolo non sono protette da RLS e si accedono via Prisma diretto con connessione privilegiata — chiarisce perché molte storie di questo epic (Slot, Allenatore, Gruppo) non richiedono policy RLS mentre quelle su Atleta/Certificato sì.
- **Ruoli**: vivono in `UtenteRuolo` (Prisma, fonte di verità) e vengono sempre specchiati in `app_metadata` di Supabase Auth dopo ogni scrittura; middleware e route-guard leggono i Ruoli solo da `app_metadata`, mai con query dirette — rilevante per ogni storia che cambia i Ruoli ammessi a una rotta/azione (9.22, 9.38, 9.40, 9.41).
- **Proprietà dei campi identitari di Atleta**: creazione/aggiornamento passano sempre dalla funzione condivisa `creaAtleta`/`aggiornaAtleta`; solo Onboarding-Import e, dal 2026-07-31, Gruppi-Allenatori sono autorizzati a richiamarla — vincolo esplicito da rispettare in ogni nuova via di creazione/modifica Atleta.
- **Niente hard-delete di entità di dominio**: il pattern consolidato per "rimuovere" un'entità reale (Allenatore, Atleta, Slot) è un flag di stato/disattivazione con azione di ripristino, mai `delete` fisico se esistono righe dipendenti; la cancellazione fisica resta riservata alle sole tabelle di giunzione pure senza righe dipendenti (es. `UtenteRuolo`, `GruppoAtleta`, `GruppoAllenatore`, `GruppoVisibileDirigente`), sempre con `deleteMany` idempotente.
- **Stagione corrente**: risolta da un unico helper condiviso (Anno Agonistico), mai da calcoli di date duplicati per modulo — riusato da ogni storia che assegna/crea qualcosa "per la stagione corrente".
- **Convenzione badge di stato certificato**: tono warning (mai danger) a livello di singola Atleta per restare informativo e non allarmistico; il rosso pieno è un'eccezione esplicita e motivata solo dove il contesto lo giustifica (sezione "Confermati" di conferma-certificati). Ogni nuova visualizzazione dello stato certificato eredita questa regola salvo eccezione motivata allo stesso modo.
- **Pattern container form**: le pagine il cui contenuto principale è un form autonomo riusano il pattern già esistente per `/accedi` (riquadro centrato a larghezza massima, piena larghezza con margine su mobile) invece di inventarne uno nuovo.
- **Componente menu profilo**: già definito a livello di token di design (trigger, sfondo, raggio, ombra, colore voci) — nessuna nuova palette da introdurre.

## UX & Interaction Patterns

- **Navigazione (decisione invertita nel 2026-07-25)**: non più una singola barra orizzontale su ogni schermo — su mobile/tablet barra superiore + pulsante hamburger che apre un drawer verticale; su desktop barra laterale verticale sempre visibile. Le voci restano determinate dal Ruolo lato server (route-guard), mai nascoste solo lato client. Nessuno stack modale a più di un livello aperto insieme.
- **Alert/badge non bloccanti**: non aprono mai un dialog di conferma al click; al massimo rivelano/navigano verso un dettaglio (pattern drill-down già stabilito in Vista Dirigente, riusato per i badge "in scadenza"/"scaduto").
- **Tono e microcopy**: frasi brevi e dirette, mai esclamativi o emoji, mai un registro da "poster" — un avviso descrive, non allarma.
- **Precedenti diretti da rispecchiare invece di reinventare**: rimozione da un Gruppo (mirror Atleta↔Allenatore), riga tabellare compatta con toggle sola-lettura/modifica + icone condivise (già usato da Slot/Allenatori precaricati/Categoria Torneo), ordinamento client-side a singolo criterio con stato locale (già introdotto per "Confermati").

## Cross-Story Dependencies

- Story 9.4 sostituisce/estende 9.1 (stesso `esci()` riusato) e dipende dall'ordine di sviluppo con 9.2 (posizionamento del menu profilo nella nuova navigazione).
- Story 9.7, 9.10 e 9.29 condividono la stessa causa radice sospetta (cache di navigazione del layout radice dopo Story 9.2) — vanno lette insieme.
- Story 9.9 introduce il pattern vista/modifica/cancellazione con guardia sulle dipendenze, riusato poi da 9.13 (Slot) e 9.32 (Allenatore su Gruppo).
- Story 9.14 introduce la rimozione da tabella di giunzione pura, riusata da 9.32.
- Story 9.15 e 9.18 introducono l'autorizzazione a due livelli per l'Allenatore sul proprio Gruppo, riusata/estesa da 9.21, 9.28, 9.35, 9.36.
- Story 9.19 è estesa da 9.23/9.25 (colore/ordinamento) e ulteriormente da 9.27 e 9.34 (data di scadenza visibile).
- Story 9.21 sblocca il vincolo di unicità Atleta↔Gruppo, precondizione implicita per il campo Numero di 9.35.
- Story 9.24 introduce l'hub `/impostazioni`, dove 9.31 aggiunge il nuovo campo Email Segreteria.
- Story 9.36 (sanificazione in creazione) e 9.39 (backfill dati esistenti) sono complementari sullo stesso campo `Atleta.nome`.
- Story 9.6 nota un possibile riuso/collegamento con l'Epic 10 "Gestione Partite e Campionati" per la geolocalizzazione delle trasferte; Story 9.44 riusa direttamente pattern già scritti per la home pubblica e per `/app/partite` (entrambi nell'ambito Partite/Campionati).
