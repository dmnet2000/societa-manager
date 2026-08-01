# Società Manager — Manuale Utente

Gestione Settore Volley · Polisportiva

*Guida pratica per ciascun ruolo: cosa si può fare, dove, e come.*

---

## Indice

- [Come è organizzata l'app](#come-e-organizzata)
- [Admin](#admin)
- [Dirigente](#dirigente)
- [Segreteria](#segreteria)
- [Allenatore](#allenatore)
- [Atleta](#atleta)
- [Genitore](#genitore)
- [Funzionalità comuni a tutti i ruoli](#comuni)
- [Concetti trasversali](#concetti)

<a id="come-e-organizzata"></a>
## Come è organizzata l'app

Ogni persona che usa l'app ha uno o più **Ruoli**: Admin, Dirigente, Segreteria, Allenatore, Atleta, Genitore. Il Ruolo determina quali pagine si vedono nella barra di navigazione e quali azioni si possono compiere — un allenatore non vede le pagine di amministrazione, un genitore vede solo ciò che serve per gestire il certificato medico della figlia o del figlio.

Una stessa persona può avere più Ruoli insieme (ad esempio Allenatore e Dirigente): in quel caso vede l'unione di tutte le pagine a cui i suoi Ruoli danno accesso.

Questo manuale è organizzato per Ruolo: cerca la tua sezione e leggi i casi d'uso che ti riguardano. In fondo trovi anche i "Concetti trasversali" — le idee di base (stagione, Gruppo, stato del certificato...) che tornano utili per capire il resto.

<a id="admin"></a>
## Admin

L'Admin è il super-utente tecnico del sistema: oltre a tutto ciò che può fare il Dirigente sull'organizzazione sportiva, gestisce utenti, ruoli e la configurazione tecnica dell'applicazione (email, logo, permessi). È l'unico Ruolo con accesso a **Amministrazione**, **Configurazione SMTP**, **Configurazione logo** e **Permessi certificati**.

### Gestire utenti, ruoli e accessi

Dalla pagina **Amministrazione** l'Admin vede l'elenco di tutti gli utenti registrati, con email, Ruoli e stato (Attivo/Disattivato). Può creare un nuovo utente direttamente da qui — email, password, uno o più Ruoli tramite checkbox — oppure modificare i Ruoli di un utente esistente con lo stesso set di checkbox e il pulsante "Salva Ruoli". Ogni utente ha un pulsante "Disattiva"/"Riattiva": un utente disattivato non può più accedere, anche se le sue credenziali restano tecnicamente valide. È disponibile anche "Reimposta password", che sovrascrive la password dell'utente con un valore concordato (richiede conferma esplicita prima di procedere) — utile se qualcuno resta bloccato fuori dal proprio account; l'interessato dovrà poi cambiarla dal menu profilo.

### Importare l'archivio Atlete da file federale

Dalla pagina **Import atlete**, l'Admin (o il Dirigente) carica il file Excel esportato dal portale federale. Il sistema riconosce le atlete tramite Codice Fiscale: crea quelle nuove, aggiorna quelle già presenti. Le date del file vengono normalizzate automaticamente. Se la data del certificato medico nel file è più recente di quella già a sistema viene aggiornata, altrimenti resta quella esistente, per non perdere dati inseriti manualmente. Le atlete Under 13 già presenti nella stagione precedente ma assenti dal nuovo export vengono comunque riportate nella nuova stagione (si possono poi escludere manualmente se non più attive). Dopo l'import compare un riepilogo con atlete create, aggiornate, riportate e righe scartate con il relativo motivo.

### Precaricare un Allenatore

Dalla pagina **Precaricamento allenatori**, l'Admin (o il Dirigente) inserisce Nome, Cognome e Codice Fiscale di un allenatore non ancora registrato, così che possa poi agganciarsi al proprio account in autonomia in fase di registrazione, inserendo lo stesso Codice Fiscale. La pagina mostra anche l'elenco completo degli Allenatori — precaricati o già registrati — con la possibilità di correggerne i dati o cancellare una scheda inserita per errore. La cancellazione è consentita solo se l'Allenatore non è ancora agganciato a un account e non è assegnato a nessun Gruppo; in caso contrario viene rifiutata con un messaggio esplicativo. Ogni modifica o cancellazione chiede conferma.

### Gestire Palestre e Campi

Dalla pagina **Palestre** si crea e modifica l'anagrafica delle Palestre (nome, indirizzo) e, per ciascuna, uno o più Campi. Si può opzionalmente incollare un link di condivisione Google Maps: il sistema ne estrae le coordinate e mostra sulla scheda sia un pulsante "Naviga" (apre l'app Maps del dispositivo) sia una mappa incorporata. Senza link, si usa comunque il solo indirizzo testuale per costruire link e mappa. Una Palestra con più Campi può ospitare due Gruppi in contemporanea, su Campi diversi.

### Creare i Gruppi e assegnare Allenatori/Atlete

Dalla pagina **Gruppi** si creano i Gruppi (nome, categoria) per la stagione corrente — se la stagione non esiste ancora a sistema viene creata automaticamente. Per ogni Gruppo si assegnano uno o più Allenatori e una o più Atlete tramite selettori dedicati. Ogni Atleta appartiene a un solo Gruppo per stagione: assegnarla a un secondo Gruppo la sposta, non la duplica. Accanto al nome di ogni Atleta compare un badge "Certificato in scadenza" se il certificato scade entro 30 giorni. Un'Atleta può essere rimossa dal Gruppo senza essere cancellata dall'anagrafica: resta disponibile per essere riassegnata.

### Caricare e gestire gli Slot (l'orario settimanale)

Dalla pagina **Slot** si crea uno Slot indicando giorno della settimana, ora inizio/fine, Campo e Gruppo — l'orario è deciso fuori dall'app e qui viene reso visibile a tutti. Uno Slot esistente può essere modificato o cancellato. La cancellazione è permessa solo se lo Slot non ha ancora Presenze registrate; altrimenti viene bloccata, per non perdere lo storico presenze.

### Configurare l'invio email (SMTP)

Dalla pagina **Configurazione SMTP** si inseriscono i parametri del server di posta usati dalle email automatiche (host, porta, connessione sicura, utenza, mittente). La password non viene mai mostrata precompilata: si lascia vuota per non modificarla. Una volta salvata una configurazione compare un modulo "Invia email di prova" per verificarne il funzionamento prima che le funzionalità automatiche vi facciano affidamento.

### Configurare logo e nome del settore

Dalla pagina **Configurazione logo** si carica un'immagine (PNG o JPG, max 2MB) che diventa il logo mostrato nella barra di navigazione, e si imposta il nome del settore mostrato in navigazione e nella pagina di login.

### Configurare i permessi sui certificati medici del Dirigente

Dalla pagina **Permessi certificati** l'Admin sceglie quali Gruppi il Dirigente può vedere nella propria Vista d'insieme relativamente allo stato dei certificati medici. Nessuna selezione significa visibilità su tutti i Gruppi (comportamento predefinito); selezionandone uno o più si restringe la visibilità a quei soli Gruppi.

L'Admin condivide inoltre con il Dirigente e l'Allenatore le pagine **Wizard nuova stagione**, **Campionati** e **Partite** — vedi le rispettive sezioni più avanti.

<a id="dirigente"></a>
## Dirigente

Il Dirigente ha una visione organizzativa del settore: gestisce, insieme all'Admin, palestre, gruppi, orari, iscrizioni e certificati medici, e dispone in più di una vista d'insieme aggregata sullo stato di tutti i Gruppi.

Il Dirigente condivide con l'Admin le pagine **Import atlete**, **Precaricamento allenatori**, **Palestre**, **Gruppi**, **Slot**, **Wizard nuova stagione**, **Campionati** e **Partite** — comportamento identico a quanto descritto nella sezione Admin.

### Confermare le iscrizioni

Dalla pagina **Conferma iscrizioni** il Dirigente vede l'elenco delle Atlete con Nome, Codice Fiscale e stato dell'iscrizione per la stagione corrente. Il pulsante "Conferma" è visibile solo alla Segreteria, la vera titolare di questa azione: se il Dirigente non ha questo permesso, la colonna mostra semplicemente "Non iscritta" senza pulsante. Il Dirigente (come l'Admin) può però "Escludere" un'iscrizione già confermata — utile ad esempio per un'Atleta Under 13 riportata automaticamente nella nuova stagione ma non più realmente attiva.

### Ricevere notifiche

Dalla pagina **Notifiche** il Dirigente vede l'elenco cronologico degli eventi rilevanti: nuovi certificati medici caricati per un'Atleta di un suo Gruppo, e nuove Atlete inserite da un Allenatore direttamente dalla pagina del proprio Gruppo.

### Confermare/validare i certificati medici

Dalla pagina **Conferma certificati** il Dirigente (come Segreteria e Admin) vede due elenchi: "Da confermare" e "Confermati". Per ogni Atleta da confermare si può visualizzare il file caricato (se presente), inserire o correggere data inizio validità, data fine validità (obbligatoria), mesi di validità, ed eventualmente allegare o sostituire una scansione — utile anche per registrare un certificato ricevuto fuori app. Confermando, lo stato del certificato passa a "Confermato" e l'Atleta si sposta nell'elenco dei confermati.

### Vista d'insieme

Dalla pagina **Vista d'insieme** il Dirigente vede, per ogni suo Gruppo, gli Slot assegnati (giorno/ora/palestra-campo) e un riepilogo aggregato dei certificati medici delle sue Atlete, suddiviso in quattro conteggi: in regola, in scadenza, scaduto, da verificare. I riquadri "in scadenza" e "scaduto" sono cliccabili quando contengono almeno un'Atleta: espandendoli compare l'elenco dei nomi, un riquadro alla volta. Se l'Admin ha configurato permessi granulari e un Gruppo è escluso dallo scope del Dirigente, la card mostra "Fuori dai permessi configurati" invece di conteggi.

<a id="segreteria"></a>
## Segreteria

La Segreteria è il punto di riferimento amministrativo: conferma le iscrizioni, ha una vista trasversale sugli orari di tutte le Palestre/Gruppi e valida i certificati medici caricati.

### Confermare l'iscrizione di un'Atleta

Dalla pagina **Conferma iscrizioni** la Segreteria è l'unica figura che può effettivamente premere "Conferma" per un'Atleta non ancora iscritta: da quel momento l'Atleta risulta iscritta per la stagione corrente, indipendentemente dallo stato del tesseramento federale (che l'app non traccia). Può anche "Escludere" un'iscrizione già confermata.

### Consultare gli orari di tutte le Palestre/Gruppi

Dalla pagina **Orari** la Segreteria vede l'elenco completo di tutti gli Slot esistenti, filtrabile per Palestra o per Gruppo. È una vista di sola lettura pensata per rispondere velocemente a chi chiede un orario. Ogni riga con una Palestra geolocalizzata mostra anche un link "Naviga".

### Confermare/validare i certificati medici

Stessa pagina **Conferma certificati** descritta per il Dirigente: elenco "Da confermare"/"Confermati", visualizzazione del file caricato, inserimento delle date di validità, allegato/sostituzione di una scansione e conferma.

<a id="allenatore"></a>
## Allenatore

L'Allenatore segue uno o più Gruppi: consulta il proprio orario, registra le presenze, consulta lo storico e i dati fisici delle proprie atlete, e può gestire in autonomia la composizione della propria squadra e i propri campionati/partite.

### I miei Gruppi

Dalla pagina **I miei Gruppi** l'Allenatore vede una scheda per ciascun Gruppo che gestisce, con l'elenco delle Atlete assegnate. Da qui può assegnare un'Atleta esistente al proprio Gruppo (con conferma, perché potrebbe spostarla da un altro Gruppo/Allenatore), rimuoverla, oppure — se non la trova nell'elenco — crearla direttamente compilando Cognome, Nome, data di nascita, Codice Fiscale (obbligatori) ed email/cellulare (opzionali): viene creata e assegnata automaticamente al proprio Gruppo in un solo passaggio, senza attendere l'intervento della Segreteria. Se il Codice Fiscale non è valido o appartiene a un'Atleta già esistente, l'inserimento viene rifiutato con un messaggio chiaro. Ogni Atleta con certificato in scadenza entro 30 giorni mostra il badge "Certificato in scadenza".

### Il mio orario

Dalla pagina **Il mio orario** l'Allenatore vede tutti gli Slot dei propri Gruppi, raggruppati per giorno della settimana, con orario, nome del Gruppo, Palestra/Campo e link "Naviga" se disponibile.

### Registrare le presenze di un allenamento

Dalla pagina **Presenze** l'Allenatore seleziona uno dei propri Slot e una data — anche passata, per recuperare un allenamento dimenticato — poi carica il roster delle Atlete del Gruppo con una checkbox ciascuna, precompilato con le presenze già eventualmente registrate. Se un'Atleta ha il certificato medico scaduto compare un badge informativo "Certificato scaduto", che non impedisce mai di registrare la presenza. Il pulsante "Salva presenze" registra sia le presenze sia le assenze esplicite per l'intero roster. Se la data scelta non corrisponde al giorno della settimana dello Slot selezionato, il sistema lo segnala con un errore.

### Consultare lo storico presenze

Dalla pagina **Storico presenze** l'Allenatore trova una griglia mensile: sceglie un Gruppo e un mese, e vede una tabella con le Atlete sulle righe e i giorni del mese sulle colonne, ciascuna cella con presente, assente o vuota (nessuno Slot quel giorno, o presenza non ancora registrata — mai un falso "assente").

### Ricevere notifiche

Stessa pagina **Notifiche** descritta per il Dirigente: nuovi certificati caricati e nuove Atlete inserite, per i propri Gruppi.

### Dati fisici delle proprie Atlete

Dalla pagina **Dati fisici**, sezione "Misurazioni delle mie Atlete", si seleziona un'Atleta tra le proprie e si accede al form di inserimento misurazioni e allo storico. Il form permette di scegliere rapidamente un parametro standard — Peso, Altezza, Reach a una mano, Reach a due mani, Salto con rincorsa, Salto a muro — con unità di misura già precompilata, oppure di inserire un tipo libero con la propria unità di misura. "Salto con rincorsa" e "Salto a muro" prevedono tre tentativi: vengono salvate tre misurazioni con la stessa data, e nel grafico di andamento viene mostrato il valore migliore per ciascuna data. Con almeno due misurazioni dello stesso tipo compare automaticamente un grafico dell'andamento nel tempo.

### Il mio profilo

Dalla pagina **Il mio profilo** l'Allenatore può caricare/aggiornare la propria foto profilo (JPG/PNG, max 5MB).

### Gestire Campionati e importare le gare

Dalla pagina **Campionati** l'Allenatore vede, per ciascun proprio Gruppo, i Campionati già collegati e due modi per aggiungerne: crearne uno nuovo, oppure collegare un Campionato già esistente creato da un altro Allenatore/Admin per un altro Gruppo. Per ogni Campionato collegato è disponibile "Importa gare (Excel)": si carica il file esportato dalla federazione. L'import è idempotente — ricaricare lo stesso file aggiorna le righe già importate invece di duplicarle, utile per aggiornare i risultati man mano che le giornate si giocano. Dopo l'import compare un riepilogo delle partite create/aggiornate/scartate.

### Vista partite settimana per settimana

Dalla pagina **Partite** l'Allenatore vede le partite dei propri Gruppi raggruppate per settimana, con giorno, ora, squadre, luogo (con link "Naviga" se disponibile), Gruppo e Campionato. Una settimana senza partite mostra esplicitamente "Nessuna partita questa settimana".

<a id="atleta"></a>
## Atleta

L'Atleta consulta il proprio orario, il proprio storico presenze, gestisce il proprio certificato medico e i propri dati fisici, e vede le partite del proprio Gruppo.

### Il mio orario

Stessa pagina **Il mio orario** descritta per l'Allenatore: qui mostra gli Slot del proprio Gruppo, raggruppati per giorno.

### Il mio storico presenze

Dalla pagina **Storico presenze**, sezione "Il mio storico", l'Atleta trova l'elenco cronologico di tutte le proprie presenze/assenze, con data, giorno, orario, Gruppo ed esito. In testa compare una percentuale di presenza e un trend (in calo/costante/in crescita).

### Caricare e gestire il proprio certificato medico

Dalla pagina **Certificato medico** l'Atleta (o il Genitore) carica il file del certificato (PDF, JPG o PNG, max 10MB). La card mostra lo stato attuale: nessun certificato caricato, certificato in attesa di conferma, certificato scaduto, certificato in scadenza (entro 30 giorni) o certificato in regola (con data di validità). Se esiste già un file caricato è disponibile un pulsante per visualizzarlo tramite un link temporaneo e sicuro. Caricare un nuovo file sostituisce quello precedente e riporta lo stato a "in attesa di conferma": serve una nuova validazione prima che torni "in regola". All'upload il sistema avvisa automaticamente allenatore e dirigente del Gruppo e invia un'email con il file allegato alla Segreteria.

### Dati fisici

Dalla pagina **Dati fisici**, sezione "Le mie misurazioni": stesso form e stessa logica descritti per l'Allenatore.

### Il mio profilo

Dalla pagina **Il mio profilo**: caricamento/aggiornamento della propria foto profilo (JPG/PNG, max 5MB).

### Vista partite del proprio Gruppo

Dalla pagina **Partite**: le partite di tutti i Campionati a cui il proprio Gruppo partecipa, raggruppate per settimana, in sola lettura, con link "Naviga" quando disponibile.

<a id="genitore"></a>
## Genitore

Il Genitore, in questa versione dell'app, gestisce esclusivamente il certificato medico della propria figlia/o: è l'unico Ruolo con una sola pagina accessibile.

### Caricare e gestire il certificato medico della figlia/o

Dalla pagina **Certificato medico** — l'unica raggiungibile — il Genitore vede, se agganciato a più di un'Atleta, un selettore per scegliere quale gestire; con una sola figlia agganciata la selezione è automatica. Il comportamento è identico a quello descritto per l'Atleta: caricamento file, visualizzazione dello stato corrente, pulsante per vedere il file già caricato, sostituzione con un nuovo upload che rimette lo stato "in attesa di conferma". L'aggancio a una figlia avviene in fase di registrazione, inserendo il Codice Fiscale della figlia/o: se non corrisponde a nessuna Atleta esistente, la registrazione viene bloccata con un messaggio chiaro invece di creare un aggancio errato.

<a id="comuni"></a>
## Funzionalità comuni a tutti i ruoli

### Registrazione e accesso

Dalla pagina di registrazione chiunque crea un account inserendo email, password e uno o più Ruoli (Allenatore, Atleta, Genitore, Segreteria, Dirigente, Admin). A seconda dei Ruoli scelti compaiono campi aggiuntivi: per Allenatore un Codice Fiscale opzionale, per Atleta il proprio Codice Fiscale obbligatorio, per Genitore il Codice Fiscale della figlia/o obbligatorio — in tutti i casi il Codice Fiscale deve corrispondere a un'anagrafica già presente a sistema. Dalla pagina di accesso si effettua il login con email e password, con i link "Password dimenticata?" e "Registrati".

### Recupero e reimpostazione password

Dalla pagina "Password dimenticata" si richiede l'invio di un'email con un link per reimpostare la password. Il link ricevuto porta alla pagina di reimpostazione, dove si inserisce la nuova password con conferma.

### Modificare la propria password

Raggiungibile dal menu profilo (non ha una voce di menu propria): si inserisce la nuova password con conferma (minimo 8 caratteri); non serve reinserire la password attuale e la sessione resta attiva.

### Barra di navigazione e menu profilo

Ogni utente autenticato vede una barra di navigazione — laterale su schermo largo, a "hamburger" su mobile — con solo le voci delle pagine a cui il proprio Ruolo (o l'unione dei propri Ruoli) dà accesso, più il logo e il nome del settore configurati dall'Admin. In fondo compare un menu attivato dal proprio indirizzo email, con "Modifica password" ed "Esci".

### Uscire dal sistema

Selezionando "Esci" dal menu profilo la sessione viene terminata e si viene rediretti alla pagina di accesso.

<a id="concetti"></a>
## Concetti trasversali

**Anno Agonistico (stagione).** L'unità temporale con cui l'app organizza tutto: va per convenzione dal 1° agosto al 30 giugno dell'anno successivo. Gruppo e Iscrizione sono legati direttamente a una stagione; Slot, Presenza, Campionato e Partita la ereditano indirettamente tramite il Gruppo a cui appartengono. Se una stagione non esiste ancora quando serve, viene calcolata e creata automaticamente in base alla data odierna.

**Gruppo.** Rappresenta una squadra/categoria (es. "Under 14 A"): ha un nome e una categoria, appartiene a una sola stagione, ha uno o più Allenatori assegnati e una o più Atlete assegnate — ciascuna Atleta sta in un solo Gruppo per stagione. Slot, Campionati e Partite sono sempre collegati a un Gruppo specifico.

**Cambio stagione.** All'inizio di una nuova stagione, Admin/Dirigente possono usare il "Wizard nuova stagione" per non ricostruire tutto da zero: propone una bozza di Gruppi e assegnazioni Allenatori copiati dalla stagione precedente, con un'anteprima prima di confermare. Un solo pulsante applica tutta la copia in un colpo; eventuali correzioni si fanno poi dalla normale pagina Gruppi. Il wizard si rifiuta di procedere se la stagione corrente ha già almeno un Gruppo, per non creare doppioni.

**Stato del Certificato Medico.** Ogni Atleta ha al più un certificato a sistema, con uno stato che può essere: **nessuno** (mai caricato/inserito), **in attesa** (file caricato ma non ancora validato), **confermato** — che in base alla data di scadenza viene mostrato come **in regola** (oltre 30 giorni), **in scadenza** (0-30 giorni) o **scaduto** (data già passata). Un certificato scaduto mostra un avviso ovunque compaiano le Atlete di un Gruppo, ma non blocca mai la registrazione delle presenze: è puramente informativo. Il sistema invia automaticamente promemoria via email a 30 e 7 giorni dalla scadenza, senza bisogno di intervento manuale.

**Notifica.** Riga generata automaticamente per segnalare un evento a chi gestisce un Gruppo (Allenatore e Dirigente): oggi due tipi — nuovo certificato caricato, e nuova Atleta inserita da un Allenatore. Consultabili in ordine cronologico dalla pagina Notifiche.
