# Società Manager — Panoramica del prodotto

Gestione Settore Volley · Polisportiva

*Stato allineato allo sprint tracking del 17 luglio 2026.*

## Perché esiste

Sostituisce WhatsApp, fogli Excel scollegati e telefonate con tre capacità mirate:

- **sapere sempre dove e quando ci si allena**
- **tracciare le presenze**
- **non perdere mai il controllo sulle scadenze dei certificati medici**

Principio guida: *niente rumore* — il sistema segnala le eccezioni reali (un certificato in scadenza, un cambio di programma), non genera notifiche per la routine.

## Stato di avanzamento

| | |
|---|---|
| Epic completate | 1 / 6 |
| Storie completate | 8 / 30 |
| Anno Agonistico | 1 agosto → 30 giugno |

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
| **Allenatore** | Sapere dove e quando allenarsi senza chiedere in segreteria; segnare le presenze in fretta; sapere se un certificato è in scadenza prima che diventi un problema. |
| **Atleta** | Sapere il proprio orario senza dipendere da un gruppo WhatsApp; caricare da sola il certificato medico; vedere i propri progressi. |
| **Genitore** | Sapere l'orario del figlio/a; caricare il certificato medico senza rincorse; ricevere un avviso per tempo sulla scadenza. |
| **Segreteria** | Confermare visite mediche e iscrizioni con il minimo sforzo, senza duplicare lavoro già fatto nel gestionale federale esterno. |
| **Dirigente** | Vista d'insieme su gruppi, allenatori e stato di compliance sanitaria, senza rincorrere ogni singolo caso. |
| **Admin** | Gestire utenti, ruoli e permessi senza dover intervenire manualmente sul database a ogni richiesta. |

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

### Epic 2 — Palestre, Gruppi e Orari 🟡 In corso (0/8)

Dirigente/Admin configurano palestre, campi, slot e gruppi con allenatori e atlete assegnati a inizio stagione; allenatori e atlete vedono il proprio orario; la segreteria ha una vista trasversale.

`FR-1 · FR-2 · FR-3 · FR-4 · FR-5 · FR-6 · FR-7 · FR-30`

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 2.1 | Anagrafica Palestre e Campi | Rappresentare gli impianti reali usati dalla polisportiva. | 🟡 Pronta per sviluppo |
| 2.2 | Creazione Gruppi | Organizzare le atlete in squadre/categorie per l'Anno Agonistico. | ⚪ Backlog |
| 2.3 | Assegnazione Allenatori a Gruppo | Ogni gruppo ha chi lo segue. | ⚪ Backlog |
| 2.4 | Assegnazione Atlete a Gruppo | Ogni atleta risulta inquadrata nel gruppo in cui si allena. | ⚪ Backlog |
| 2.5 | Caricamento Slot | L'orario deciso fuori dall'app diventa visibile a tutti nel sistema. | ⚪ Backlog |
| 2.6 | Vista orario personale — Allenatore | Sa sempre dove e quando allenarsi senza chiedere in segreteria. | ⚪ Backlog |
| 2.7 | Vista orario personale — Atleta | Vede il proprio orario senza dipendere da un gruppo WhatsApp. | ⚪ Backlog |
| 2.8 | Vista orari trasversale — Segreteria *(Should, v1.1)* | Risponde subito a chi chiede un orario. | ⚪ Backlog |

### Epic 3 — Presenze ⚪ Backlog (0/3)

Gli allenatori registrano le presenze per ogni allenamento; allenatori e atlete consultano lo storico, con indicatore di trend.

`FR-8 · FR-9 · FR-10`

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 3.1 | Registrazione presenze | Traccia di chi ha partecipato a ogni allenamento, anche a posteriori. | ⚪ Backlog |
| 3.2 | Storico presenze per Atleta | Visibilità sulla partecipazione di un'atleta nel tempo. | ⚪ Backlog |
| 3.3 | Storico presenze con trend/percentuale *(Could)* | Supporto rapido per le scelte di formazione. | ⚪ Backlog |

### Epic 4 — Compliance Visite Mediche ⚪ Backlog (0/6)

Genitori/atlete caricano il certificato medico; il sistema notifica automaticamente allenatore/dirigente/segreteria; la segreteria conferma; le scadenze sono segnalate in modo non invasivo, con promemoria a 30 e 7 giorni.

`FR-11 · FR-12 · FR-13 · FR-14 · FR-15 · FR-16`

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 4.1 | Upload certificato medico | Nessuna consegna di persona o rincorsa alla segreteria. | ⚪ Backlog |
| 4.2 | Notifica automatica upload | Allenatore e dirigente lo sanno subito, senza controllare a mano. | ⚪ Backlog |
| 4.3 | Mail automatica alla Segreteria | Verifica e conferma senza dover andare a cercare il file nell'app. | ⚪ Backlog |
| 4.4 | Conferma/validazione certificato | Lo stato a sistema riflette la realtà anche fuori dai casi caricati in app. | ⚪ Backlog |
| 4.5 | Alert scadenza non bloccante | Consapevolezza immediata, senza mai impedire di registrare la presenza. | ⚪ Backlog |
| 4.6 | Promemoria scadenza | Tempo per rinnovare, invece di scoprirlo all'ultimo. | ⚪ Backlog |

### Epic 5 — Vista Dirigente e Amministrazione Avanzata ⚪ Backlog (0/2)

Il Dirigente ha una vista d'insieme aggregata su gruppi, orari e stato dei certificati; l'Admin può affinare i permessi sui dati sanitari.

`FR-27 · FR-29`

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 5.1 | Vista d'insieme Dirigente | Il polso del settore senza rincorrere ogni singolo caso. | ⚪ Backlog |
| 5.2 | Permessi granulari su dati sanitari *(Should, v1.1)* | Restringere l'accesso oltre il ruolo base, se serve. | ⚪ Backlog |

### Epic 6 — Dati Atleta e Miglioramenti ⚪ Backlog (0/3)

Atlete e allenatori tracciano dati fisici nel tempo con grafici di progresso; un wizard riduce il lavoro di ricostruzione a inizio nuova stagione.

`FR-24 · FR-25 · FR-28`

| # | Storia | Beneficio | Stato |
|---|---|---|---|
| 6.1 | Dati antropometrici e test fisici *(Should)* | Seguire la crescita/preparazione dell'atleta nel tempo. | ⚪ Backlog |
| 6.2 | Grafico progresso test fisici *(Could)* | Miglioramenti (o cali) visibili subito, non solo numeri. | ⚪ Backlog |
| 6.3 | Wizard nuova stagione | Non ricostruire tutto da zero a ogni 1° agosto. | ⚪ Backlog |

## Glossario

Il vocabolario di dominio usato in tutta l'applicazione.

- **Anno Agonistico** — Unità temporale strutturale, dal 1° agosto al 30 giugno successivo. Gruppi, iscrizioni e assegnazioni sono sempre riferiti a un Anno Agonistico.
- **Palestra / Campo** — Impianto sportivo esterno con orari già assegnati alla polisportiva. Una Palestra contiene uno o più Campi; con più campi può ospitare due Gruppi in contemporanea.
- **Slot** — Un intervallo orario (giorno, ora inizio/fine) in cui un Gruppo si allena su un Campo. Caricato direttamente, non calcolato.
- **Gruppo** — Insieme di atlete che si allenano insieme, associato a uno o più Allenatori, per un dato Anno Agonistico.
- **Certificato Medico** — Documento di idoneità sportiva di un'Atleta, validità su anno solare (non sull'Anno Agonistico), con data inizio/fine.
- **Iscrizione** — Conferma amministrativa, a cura della Segreteria, che un'Atleta è regolarmente iscritta per l'Anno Agonistico corrente — distinta dal tesseramento federale.
- **Codice Fiscale** — Chiave di matching univoca usata in import, onboarding e rollover stagionale per riconoscere Atlete, Allenatori e il legame Genitore-Atleta.

## Stack tecnico

Next.js 16 · TypeScript · Prisma 7 · Supabase (Postgres/Auth/Storage) · Resend · Cloudflare Pages/Workers
