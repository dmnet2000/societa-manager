# Società Manager — Panoramica del prodotto

Gestione Settore Volley · Polisportiva

*Stato allineato allo sprint tracking del 30 luglio 2026.*

## Perché esiste

Sostituisce WhatsApp, fogli Excel scollegati e telefonate con tre capacità mirate:

- **sapere sempre dove e quando ci si allena**
- **tracciare le presenze**
- **non perdere mai il controllo sulle scadenze dei certificati medici**

Principio guida: *niente rumore* — il sistema segnala le eccezioni reali (un certificato in scadenza, un cambio di programma), non genera notifiche per la routine.

## Stato di avanzamento

| | |
|---|---|
| Epic completate | 9 / 11 (Epic 9 e 10 restano aperte, vedi sotto) |
| Storie completate | 60 / 65 |
| In produzione | Sì, dal 25 luglio 2026 |
| Anno Agonistico | 1 agosto → 30 giugno |

Epic 9 ("Miglioramenti Post-Rilascio") ed Epic 11 ("Bug di Produzione") sono liste aperte: nascono dall'uso reale dell'app dopo il rilascio e crescono nel tempo, non hanno uno scope chiuso a priori come gli Epic 1-6.

## Come si usa, in pratica

Tre scenari reali che il prodotto deve reggere senza attrito (dal PRD):

**UJ-1 · Genitore — Elena carica un certificato la sera prima della scadenza**
Dal telefono, senza altre telefonate: allenatore e dirigente vengono avvisati subito, la segreteria riceve una mail con il file allegato pronta da confermare.

**UJ-2 · Allenatore — Marco recupera le presenze dimenticate**
Apre l'app la domenica sera, vede l'orario della settimana per i suoi due gruppi e segna le presenze di giovedì scorso che aveva dimenticato a fine allenamento.

**UJ-3 · Dirigente — Import dell'export federale a inizio stagione**
Il sistema riconosce le atlete già presenti via codice fiscale, aggiorna i certificati con date più recenti e riporta comunque le Under 13 assenti dall'export, lasciando la possibilità di escluderle a mano.

## Chi lo usa

Sei ruoli, ognuno con un accesso costruito sul proprio bisogno concreto — non un gestionale generale.

| Ruolo | Bisogno principale |
|---|---|
| **Allenatore** | Sapere dove e quando allenarsi senza chiedere in segreteria; segnare le presenze in fretta; sapere se un certificato è in scadenza prima che diventi un problema; gestire in autonomia il roster del proprio Gruppo. |
| **Atleta** | Sapere il proprio orario senza dipendere da un gruppo WhatsApp; caricare da sola il certificato medico; vedere i propri progressi. |
| **Genitore** | Sapere l'orario del figlio/a; caricare il certificato medico senza rincorse; ricevere un avviso per tempo sulla scadenza. |
| **Segreteria** | Confermare visite mediche e iscrizioni con il minimo sforzo, senza duplicare lavoro già fatto nel gestionale federale esterno. |
| **Dirigente** | Vista d'insieme su gruppi, allenatori e stato di compliance sanitaria, senza rincorrere ogni singolo caso. |
| **Admin** | Gestire utenti, ruoli, permessi e configurazione applicativa (SMTP, logo) senza dover intervenire manualmente sul database a ogni richiesta. |

## Roadmap per Epic

Ogni Epic corrisponde a un modulo dell'architettura (`app/(nome-modulo)/`).

### Epic 1 — Accesso, Popolamento e Iscrizioni ✅ Completata (8/8)

Ogni ruolo si registra e accede; Admin/Dirigente popolano atlete e allenatori (import Excel, precaricamento, aggancio genitore-atleta), gestiscono utenti/ruoli; la Segreteria conferma le iscrizioni — inclusa la gestione del passaggio tra stagioni.

`FR-17 · FR-18 · FR-19 · FR-20 · FR-21 · FR-22 · FR-23 · FR-26`

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 1.1 | Registrazione e login per ruolo | Ogni persona accede solo alle funzionalità del proprio ruolo. | ✅ Fatta |
| 1.2 | Gestione utenti e ruoli — Admin | Creare, disattivare e assegnare ruoli mantiene corretto l'accesso nel tempo. | ✅ Fatta |
| 1.3 | Import archivio Atlete da export federale | Niente inserimento manuale, atleta per atleta. | ✅ Fatta |
| 1.4 | Precaricamento Allenatori | L'allenatore si registra riconoscendo dati già presenti. | ✅ Fatta |
| 1.5 | Aggancio Genitore-Atleta in registrazione | Il genitore vede i dati della figlia/o senza passare da altri. | ✅ Fatta |
| 1.6 | Conferma iscrizione | Chiaro chi è regolarmente iscritto nella stagione corrente. | ✅ Fatta |
| 1.7 | Merge certificato in import | Un re-import non cancella mai dati più aggiornati già inseriti. | ✅ Fatta |
| 1.8 | Riporto Under 13 nel rollover | Nessuna Under 13 valida persa per un limite dell'export federale. | ✅ Fatta |

### Epic 2 — Palestre, Gruppi e Orari ✅ Completata (8/8)

Dirigente/Admin configurano palestre, campi, slot e gruppi con allenatori e atlete assegnati a inizio stagione; allenatori e atlete vedono il proprio orario; la segreteria ha una vista trasversale.

`FR-1 · FR-2 · FR-3 · FR-4 · FR-5 · FR-6 · FR-7 · FR-30`

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 2.1 | Anagrafica Palestre e Campi | Rappresentare gli impianti reali usati dalla polisportiva. | ✅ Fatta |
| 2.2 | Creazione Gruppi | Organizzare le atlete in squadre/categorie per l'Anno Agonistico. | ✅ Fatta |
| 2.3 | Assegnazione Allenatori a Gruppo | Ogni gruppo ha chi lo segue. | ✅ Fatta |
| 2.4 | Assegnazione Atlete a Gruppo | Ogni atleta risulta inquadrata nel gruppo in cui si allena. | ✅ Fatta |
| 2.5 | Caricamento Slot | L'orario deciso fuori dall'app diventa visibile a tutti nel sistema. | ✅ Fatta |
| 2.6 | Vista orario personale — Allenatore | Sa sempre dove e quando allenarsi senza chiedere in segreteria. | ✅ Fatta |
| 2.7 | Vista orario personale — Atleta | Vede il proprio orario senza dipendere da un gruppo WhatsApp. | ✅ Fatta |
| 2.8 | Vista orari trasversale — Segreteria *(Should, v1.1)* | Risponde subito a chi chiede un orario. | ✅ Fatta |

### Epic 3 — Presenze ✅ Completata (3/3)

Gli allenatori registrano le presenze per ogni allenamento; allenatori e atlete consultano lo storico, con indicatore di trend.

`FR-8 · FR-9 · FR-10`

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 3.1 | Registrazione presenze | Traccia di chi ha partecipato a ogni allenamento, anche a posteriori. | ✅ Fatta |
| 3.2 | Storico presenze per Atleta | Visibilità sulla partecipazione di un'atleta nel tempo. | ✅ Fatta |
| 3.3 | Storico presenze con trend/percentuale *(Could)* | Supporto rapido per le scelte di formazione. | ✅ Fatta |

### Epic 4 — Compliance Visite Mediche ✅ Completata (6/6)

Genitori/atlete caricano il certificato medico; il sistema notifica automaticamente allenatore/dirigente/segreteria; la segreteria conferma; le scadenze sono segnalate in modo non invasivo, con promemoria a 30 e 7 giorni.

`FR-11 · FR-12 · FR-13 · FR-14 · FR-15 · FR-16`

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 4.1 | Upload certificato medico | Nessuna consegna di persona o rincorsa alla segreteria. | ✅ Fatta |
| 4.2 | Notifica automatica upload | Allenatore e dirigente lo sanno subito, senza controllare a mano. | ✅ Fatta |
| 4.3 | Mail automatica alla Segreteria | Verifica e conferma senza dover andare a cercare il file nell'app. | ✅ Fatta |
| 4.4 | Conferma/validazione certificato | Lo stato a sistema riflette la realtà anche fuori dai casi caricati in app. | ✅ Fatta |
| 4.5 | Alert scadenza non bloccante | Consapevolezza immediata, senza mai impedire di registrare la presenza. | ✅ Fatta |
| 4.6 | Promemoria scadenza | Tempo per rinnovare, invece di scoprirlo all'ultimo. | ✅ Fatta |

### Epic 5 — Vista Dirigente e Amministrazione Avanzata ✅ Completata (2/2)

Il Dirigente ha una vista d'insieme aggregata su gruppi, orari e stato dei certificati; l'Admin può affinare i permessi sui dati sanitari.

`FR-27 · FR-29`

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 5.1 | Vista d'insieme Dirigente | Il polso del settore senza rincorrere ogni singolo caso. | ✅ Fatta |
| 5.2 | Permessi granulari su dati sanitari *(Should, v1.1)* | Restringere l'accesso oltre il ruolo base, se serve. | ✅ Fatta |

### Epic 6 — Dati Atleta e Miglioramenti ✅ Completata (3/3)

Atlete e allenatori tracciano dati fisici nel tempo con grafici di progresso; un wizard riduce il lavoro di ricostruzione a inizio nuova stagione.

`FR-24 · FR-25 · FR-28`

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 6.1 | Dati antropometrici e test fisici *(Should)* | Seguire la crescita/preparazione dell'atleta nel tempo. | ✅ Fatta |
| 6.2 | Grafico progresso test fisici *(Could)* | Miglioramenti (o cali) visibili subito, non solo numeri. | ✅ Fatta |
| 6.3 | Wizard nuova stagione | Non ricostruire tutto da zero a ogni 1° agosto. | ✅ Fatta |

### Epic 7 — Configurazione Applicazione ✅ Completata (2/2)

*(Aggiunto in corso d'opera — correzione di rotta del 18 luglio 2026.)* L'Admin configura i parametri tecnici e di branding dell'applicazione (invio email, logo) da un'interfaccia dedicata, senza intervento diretto su codice/infrastruttura.

`FR-31 · FR-32`

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 7.1 | Configurazione SMTP | L'Admin cambia il provider email applicativo senza toccare variabili d'ambiente/codice. | ✅ Fatta |
| 7.2 | Configurazione logo applicazione | Il branding della polisportiva è modificabile da interfaccia. | ✅ Fatta |

### Epic 8 — Applicazione del Design System ✅ Completata (7/7)

*(Aggiunto in corso d'opera — correzione di rotta del 23 luglio 2026.)* Puramente presentazionale: il design system prodotto tra Epic 4 ed Epic 5 viene applicato retroattivamente alle pagine preesistenti. Nessun nuovo comportamento.

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 8.1 | Layout Globale e Barra di Navigazione | Coerenza visiva su ogni pagina, navigazione riconoscibile. | ✅ Fatta |
| 8.2 | Onboarding e Autenticazione | Prima impressione coerente col resto dell'app. | ✅ Fatta |
| 8.3 | Orari e Palestre | Le pagine più usate quotidianamente aggiornate al nuovo stile. | ✅ Fatta |
| 8.4 | Presenze | Coerenza visiva sul flusso di registrazione presenze. | ✅ Fatta |
| 8.5 | Certificati Medici | Coerenza visiva sul flusso più delicato (dati sanitari). | ✅ Fatta |
| 8.6 | Gruppi, Dati Atleta e Iscrizioni | Coerenza visiva sulle pagine di gestione squadra. | ✅ Fatta |
| 8.7 | Amministrazione, Configurazione e Pagine Condivise | Ultime pagine allineate, nessuno stile "vecchio" residuo. | ✅ Fatta |

### Epic 9 — Miglioramenti Post-Rilascio 🟢 Aperta (15/18)

*(Aggiunto in corso d'opera — 25 luglio 2026, raccolta di lacune/miglioramenti individuati durante l'uso reale dopo il rilascio. Elenco aperto: le storie vengono aggiunte una alla volta man mano che emergono.)*

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 9.1 | Pulsante di logoff | Uscire dall'app senza dover cancellare i cookie a mano. | ✅ Fatta |
| 9.2 | Navigazione responsive (hamburger mobile, barra laterale desktop) | Usabile anche da telefono, non solo da desktop. | ✅ Fatta |
| 9.3 | Riquadro con larghezza massima per le pagine-form | Leggibilità dei form anche su schermi larghi. | ✅ Fatta |
| 9.4 | Menu profilo con logoff e modifica password | Azioni personali raggruppate in un solo punto. | ✅ Fatta |
| 9.5 | Campo Cognome per Allenatore | Identificare un Allenatore anche a parità di nome. | ✅ Fatta |
| 9.6 | Geolocalizzazione Palestre | Navigare verso l'impianto con un tap, senza cercare l'indirizzo. | ✅ Fatta |
| 9.7 | Barra laterale ancora visibile dopo il logoff | Nessun elemento di navigazione "fantasma" fuori sessione. | ✅ Fatta |
| 9.8 | Durata della sessione di login | Non essere disconnessi troppo spesso durante l'uso normale. | ✅ Fatta |
| 9.9 | Gestione Allenatori precaricati (vista, modifica, cancellazione) | Correggere un precaricamento sbagliato senza intervenire sul database. | ✅ Fatta |
| 9.10 | Voce di navigazione attiva aggiornata durante la navigazione | La barra laterale riflette sempre la pagina corrente. | ✅ Fatta |
| 9.11 | Recupero password | Chi non riesce ad accedere può reimpostare la password da solo. | ✅ Fatta |
| 9.12 | Upload foto profilo | Riconoscere a colpo d'occhio Allenatori/Atlete nelle liste. | ✅ Fatta |
| 9.13 | Modifica e cancellazione di uno Slot già inserito | Correggere un orario sbagliato senza ricrearlo da zero. | ✅ Fatta |
| 9.14 | Rimozione di un'Atleta da un Gruppo | Correggere un'assegnazione sbagliata senza intervenire sul database. | ✅ Fatta |
| 9.15 | Assegnazione Atlete al proprio Gruppo da parte dell'Allenatore | L'Allenatore completa la sua squadra in autonomia, senza aspettare Admin/Dirigente. | ✅ Fatta |
| 9.16 | Parametri standard per i dati fisici delle Atlete | Inserimento più rapido delle misurazioni più comuni. | ⚪ Backlog |
| 9.17 | Vista griglia mensile delle presenze per Gruppo (Allenatore) | Presenze di tutta la squadra a colpo d'occhio in un mese. | ⚪ Backlog |
| 9.18 | Creazione di una nuova Atleta da parte dell'Allenatore | Aggiungere un'Atleta non ancora registrata direttamente dal proprio Gruppo. | ⚪ Backlog |

### Epic 10 — Gestione Partite e Campionati 🟡 In corso (3/5)

*(Aggiunto in corso d'opera — 25 luglio 2026, richiesta estesa dell'utente.)* Un Allenatore crea Campionati per il proprio Gruppo e vi importa le gare da un file Excel esportato dalla federazione; Allenatore/Dirigente/Admin vedono e modificano le partite settimana per settimana; Atlete e Genitori vedono le partite della propria squadra/figlia, con navigazione Maps verso il luogo di gioco.

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 10.1 | Creazione di un Campionato per un Gruppo | Rappresentare le competizioni reali a cui partecipa una squadra. | ✅ Fatta |
| 10.2 | Import Excel delle partite di un Campionato | Nessun inserimento manuale, gara per gara, dal calendario federale. | ✅ Fatta |
| 10.3 | Vista partite settimana per settimana | Sapere subito cosa gioca la squadra questa settimana. | ✅ Fatta |
| 10.4 | Modifica di una singola partita | Correggere giorno/ora/palestra senza reimportare tutto il calendario. | ⚪ Backlog |
| 10.5 | Vista partite per Atleta e Genitore | Sapere quando gioca la propria figlia senza chiedere all'allenatore. | ⚪ Backlog |

### Epic 11 — Bug di Produzione ✅ Completata (3/3)

*(Aggiunto in corso d'opera — 27 luglio 2026, raccolta di difetti reali osservati in produzione, non richieste/miglioramenti. Elenco aperto come Epic 9.)*

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 11.1 | Errore interno al precaricamento Allenatore | Il precaricamento funziona anche nei casi limite osservati in produzione. | ✅ Fatta |
| 11.2 | Errore 500 sulla pagina Palestre | La pagina Palestre resta disponibile invece di andare in errore. | ✅ Fatta |
| 11.3 | "Invalid login" sull'invio email | La configurazione SMTP funziona coi provider realmente usati. | ✅ Fatta |

## Glossario

Il vocabolario di dominio usato in tutta l'applicazione.

- **Anno Agonistico** — Unità temporale strutturale, dal 1° agosto al 30 giugno successivo. Gruppi, iscrizioni e assegnazioni sono sempre riferiti a un Anno Agonistico.
- **Palestra / Campo** — Impianto sportivo esterno con orari già assegnati alla polisportiva. Una Palestra contiene uno o più Campi; con più campi può ospitare due Gruppi in contemporanea.
- **Slot** — Un intervallo orario (giorno, ora inizio/fine) in cui un Gruppo si allena su un Campo. Caricato direttamente, non calcolato.
- **Gruppo** — Insieme di atlete che si allenano insieme, associato a uno o più Allenatori, per un dato Anno Agonistico.
- **Certificato Medico** — Documento di idoneità sportiva di un'Atleta, validità su anno solare (non sull'Anno Agonistico), con data inizio/fine.
- **Iscrizione** — Conferma amministrativa, a cura della Segreteria, che un'Atleta è regolarmente iscritta per l'Anno Agonistico corrente — distinta dal tesseramento federale.
- **Codice Fiscale** — Chiave di matching univoca usata in import, onboarding e rollover stagionale per riconoscere Atlete, Allenatori e il legame Genitore-Atleta.
- **Campionato** — Competizione federale a cui uno o più Gruppi partecipano in un dato Anno Agonistico (Epic 10). Un Gruppo può partecipare a più Campionati contemporaneamente (es. campionato + coppa).
- **Partita** — Singola gara di un Campionato per un Gruppo (giorno, ora, palestra, squadre, risultato), tipicamente importata in blocco da un file Excel esportato dalla federazione.

## Stack tecnico

Next.js 16.2 · TypeScript · Prisma 6 (Postgres) · Supabase (Postgres/Auth/Storage, progetto EU) · Nodemailer (SMTP applicativo, provider configurabile dall'Admin) · Cloudflare Workers (hosting, via adapter `@opennextjs/cloudflare`).
