# Intent Doc: Gestione Settore Volley Polisportiva

## 1. Framing

Applicazione dedicata alla gestione del settore volley di una polisportiva. Non e' un gestionale generale: la segreteria della polisportiva utilizza gia' un gestionale esterno per iscrizioni federali e pagamenti, con cui questa app si integra limitandosi a un ruolo minimo. L'identita' del prodotto, emersa per esclusione, e' un nucleo verticale composto da tre pilastri: compliance sanitaria (certificati medici), gestione presenze e visibilita' degli orari per ruolo. Principio di design trasversale: "niente rumore" — alert non bloccanti, nessun effetto "gruppo WhatsApp", niente notifiche superflue.

## 2. Ruoli del sistema

- **Allenatore**: gestisce presenze del proprio gruppo, consulta storico presenze e dati atleta, riceve alert/promemoria certificati medici.
- **Atleta**: consulta il proprio orario, storico presenze, dati antropometrici/test fisici; puo' caricare il proprio certificato medico.
- **Genitore**: si aggancia all'atleta (figlio/a), carica il certificato medico, riceve notifiche e promemoria scadenze.
- **Segreteria/Amministrazione**: inserisce le visite mediche a sistema, conferma l'avvenuta iscrizione, consulta gli orari degli allenamenti nelle palestre. Uso volutamente limitato: le funzioni gestionali complete restano nel gestionale esterno.
- **Dirigente/Responsabile settore**: definisce/assegna allenatori ai gruppi, riceve notifiche e promemoria certificati medici, ha visibilita' complessiva su orari e presenze.
- **Admin di sistema**: gestisce utenti, permessi e configurazioni tecniche dell'app; ruolo distinto dalla Segreteria.

## 3. Requisiti MUST

- Tutti i ruoli previsti: Allenatore, Atleta, Genitore, Segreteria/Amministrazione, Dirigente/Responsabile settore, Admin di sistema.
- Struttura dati e logica interamente organizzate per anno agonistico (1 agosto - 30 giugno dell'anno successivo).
- Modello dati Palestra -> Campo -> Slot orario, senza alcun algoritmo/logica di assegnazione automatica degli slot (l'incastro orari-allenatori e' preparato fuori dall'app).
- Vista orario personale per Allenatore e Atleta (i propri allenamenti/orari).
- Gestione presenze con storico per atleta.
- Ciclo completo di gestione visite mediche: upload certificato (da Genitore e Atleta), notifica automatica ad allenatore/dirigente, invio mail alla segreteria con file allegato, conferma da segreteria, alert scadenza, promemoria automatici.
- Conferma iscrizione da parte della Segreteria.
- Onboarding basato su codice fiscale: registrazione autonoma per ruolo, import atlete da file Excel del portale federale volley, precaricamento allenatori con dati minimi, aggancio Genitore-Atleta tramite codice fiscale del figlio/a.
- Regole di rollover stagionale: merge del certificato medico tra dato a sistema e dato importato (vince la data piu' recente), riporto di default delle atlete Under 13 nella nuova stagione con possibilita' di esclusione manuale.

## 4. Requisiti SHOULD

- Sezione atleta con dati antropometrici e misurazioni dei test fisici nel tempo.
- Vista orari trasversale (su tutte le palestre/gruppi) per la Segreteria.
- Permessi granulari sui dati sanitari (controllo fine di chi vede cosa).

## 5. Requisiti COULD

- Storico presenze con indicatore di trend/percentuale, a supporto delle scelte di formazione in vista delle partite.
- Grafico di progresso dei test fisici nel tempo.
- Wizard per l'avvio nuova stagione con copia automatica delle assegnazioni (gruppi/allenatori) dell'anno precedente.

## 6. Fuori scope (WON'T)

- Algoritmo o griglia di assegnazione automatica slot-allenatore: l'incastro resta un lavoro umano/esterno all'app, non un problema da risolvere in-app.
- Ruolo Gestore palestra/impianto: gli slot orari delle palestre sono dati gia' assegnati esternamente, non decisi dalla polisportiva.
- Ruolo Medico sportivo/Staff sanitario: nessuna persona ricopre attualmente questo ruolo nella polisportiva.
- Funzioni gestionali complete di Segreteria (pagamenti, iscrizioni federali): gia' coperte dal gestionale esterno esistente; questa app copre solo l'uso minimo necessario (visite mediche, conferma iscrizione).

## 7. Regole di business critiche (vincoli non negoziabili)

- **Anno agonistico**: dal 1 agosto al 30 giugno dell'anno successivo; e' l'unita' temporale strutturale di tutto il sistema.
- **Certificato medico su anno solare**: la validita' del certificato segue l'anno solare, non l'anno agonistico.
- **Regola di merge in import**: durante l'import, se la data del certificato nel file Excel e' piu' recente di quella gia' a sistema, si aggiorna; altrimenti resta il dato a sistema. Vince sempre la data piu' recente.
- **Eccezione Under 13 nel rollover**: le atlete Under 13 possono non comparire nell'export Excel della nuova stagione (tesserino annuale non sempre presente); vanno comunque riportate di default nella nuova stagione, con possibilita' di esclusione manuale a inizio anno.
- **Alert scadenza certificato non bloccante**: e' solo informativo/visivo, non impedisce mai di segnare la presenza dell'atleta.
- **Promemoria scadenza certificato**: inviati a 30 giorni e a 7 giorni dalla scadenza, ai destinatari esatti: Genitore, Atleta, Allenatore, Dirigente.
- **Codice fiscale come chiave di matching**: usato in modo uniforme in import atlete, onboarding (registrazione, precaricamento allenatori, aggancio genitore-figlia) e rollover stagionale — motore unico di matching/merge in tutto il sistema.
- **Modello Palestra -> Campo -> Slot senza assegnazione automatica**: l'app carica e mostra palestre, campi e slot gia' definiti; l'incastro/assegnazione avviene fuori dall'app. Gli orari, una volta definiti, restano fissi per l'intero anno agonistico.
