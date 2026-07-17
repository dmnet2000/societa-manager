---
title: Gestione Settore Volley - Polisportiva
status: final
created: 2026-07-13
updated: 2026-07-15
---

# PRD: Gestione Settore Volley - Polisportiva
*Working title — conferma se vuoi un nome prodotto diverso.*

## 0. Scopo del Documento

Questo PRD traduce in requisiti implementabili il brief di prodotto (`brief.md` e `addendum.md`, cartella `_bmad-output/planning-artifacts/briefs/brief-societa-manager-2026-07-13/`) e la sessione di brainstorming da cui deriva. È scritto per un solo lettore/costruttore (l'utente stesso, sviluppatore unico con assistenza AI): la struttura privilegia chiarezza implementativa su formalismo. I requisiti funzionali (FR) sono numerati globalmente e raggruppati per feature; le assunzioni non confermate sono taggate `[ASSUMPTION]` inline e indicizzate in fondo (§9).

## 1. Vision

Un'applicazione web verticale per il settore volley di una polisportiva, che sostituisce la gestione oggi affidata a WhatsApp, fogli Excel scollegati e telefonate con tre capacità mirate: sapere sempre dove e quando ci si allena, tracciare le presenze delle atlete, e non perdere mai il controllo sulle scadenze dei certificati medici. Non è un gestionale generale — la segreteria della polisportiva ne ha già uno per iscrizioni federali e pagamenti — ma uno strato sottile che si concentra su ciò che oggi genera perdite di tempo e rischi reali (un'atleta in campo con certificato scaduto perché nessuno se n'è accorto).

Il principio guida è "niente rumore": il sistema segnala le eccezioni reali (un certificato in scadenza, un cambio di programma), non genera notifiche per la routine.

Nasce da un'esigenza pratica e personale di chi lo costruisce: recuperare il tempo oggi perso tra WhatsApp, Excel e telefonate, automatizzando quello che si può automatizzare senza costruire l'ennesimo gestionale generalista.

## 2. Utenti Target

### 2.1 Jobs To Be Done

- **Allenatore** — sapere dove e quando allenarsi senza chiedere in segreteria; segnare le presenze in modo rapido; sapere se un'atleta del suo gruppo ha il certificato in scadenza prima che diventi un problema.
- **Atleta** — sapere il proprio orario senza dipendere da un gruppo WhatsApp; caricare da sola il proprio certificato medico; vedere i propri progressi (presenze, test fisici).
- **Genitore** — sapere l'orario del figlio/a; caricare il certificato medico senza rincorse; ricevere un avviso per tempo sulla scadenza, non scoprirlo all'ultimo.
- **Segreteria/Amministrazione** — confermare visite mediche e iscrizioni con il minimo sforzo, senza duplicare lavoro già fatto nel gestionale esterno.
- **Dirigente/Responsabile settore** — avere una vista d'insieme su gruppi, allenatori e stato di compliance sanitaria, senza dover rincorrere ogni singolo caso.
- **Admin di sistema** — gestire utenti, ruoli e permessi senza dover intervenire manualmente sul database a ogni richiesta.

### 2.2 Key User Journeys

- **UJ-1. Elena, mamma di un'atleta Under 15, carica il nuovo certificato medico dal telefono la sera prima della scadenza, e senza altre telefonate l'allenatore e il dirigente vengono avvisati mentre la segreteria riceve una mail con il file allegato da confermare.**
- **UJ-2. Marco, allenatore di due gruppi, apre l'app la domenica sera, vede l'orario della settimana per entrambi i gruppi e segna le presenze di giovedì scorso che aveva dimenticato di registrare a fine allenamento.**
- **UJ-3. Il dirigente, a inizio agosto, importa il nuovo export Excel del portale federale: il sistema riconosce le atlete già presenti via codice fiscale, aggiorna i certificati con date più recenti, e riporta comunque le Under 13 assenti dall'export, lasciandogli la possibilità di escluderle a mano.**

## 3. Glossario

- **Anno Agonistico** — unità temporale strutturale del sistema, dal 1° agosto al 30 giugno successivo. Gruppi, iscrizioni e assegnazioni sono sempre riferiti a un Anno Agonistico.
- **Palestra** — impianto sportivo esterno, con orari già assegnati alla polisportiva (dato in ingresso, non calcolato dal sistema). Contiene uno o più **Campi**.
- **Campo** — sotto-unità di una Palestra; palestre con più campi possono ospitare due Gruppi in contemporanea nello stesso Slot.
- **Slot** — un intervallo orario (giorno, ora inizio/fine) in cui un Gruppo si allena su un Campo. Caricato direttamente, non generato da un algoritmo di assegnazione.
- **Gruppo** — insieme di atlete che si allenano insieme, associato a uno o più Allenatori, per un dato Anno Agonistico.
- **Certificato Medico** — documento di idoneità sportiva di un'Atleta, con validità su anno solare (non sull'Anno Agonistico), tracciato con data inizio/fine validità.
- **Iscrizione** — conferma amministrativa (a cura della Segreteria) che un'Atleta è regolarmente iscritta per l'Anno Agonistico corrente. Concetto distinto e non derivabile dalla validità del tesseramento federale.
- **Codice Fiscale** — chiave di matching univoca usata in import, onboarding e rollover stagionale per riconoscere Atlete, Allenatori e il legame Genitore-Atleta.

## 4. Feature

### 4.1 Orari e Palestre

**Descrizione:** Gestione dell'anagrafica Palestra → Campo → Slot. Nessuna logica di assegnazione automatica: l'incastro orari-allenatori è preparato altrove (fuori app, con assistenza AI generica) e qui viene solo caricato e mostrato. Realizza UJ-2.

#### FR-1: Anagrafica Palestre e Campi
Admin o Dirigente può creare/modificare una Palestra e i suoi Campi.
**Consequences:**
- Una Palestra ha 1 o più Campi.
- Due Gruppi possono essere assegnati allo stesso orario sulla stessa Palestra se su Campi diversi.

#### FR-2: Caricamento Slot
Admin o Dirigente può creare uno Slot (giorno, ora inizio/fine, Palestra, Campo, Gruppo) direttamente, senza calcolo automatico.
**Consequences:**
- Lo Slot resta fisso per l'intero Anno Agonistico una volta creato (nessuna rilevazione conflitti in continuo richiesta).

#### FR-3: Vista orario personale — Allenatore
L'Allenatore vede gli Slot dei propri Gruppi. Realizza UJ-2.

#### FR-4: Vista orario personale — Atleta
L'Atleta vede gli Slot del proprio Gruppo.

#### FR-5: Vista orari trasversale — Segreteria
La Segreteria vede tutti gli Slot di tutte le Palestre/Gruppi.
**Notes:** Should — utile per rispondere a richieste rapide, non bloccante per il v1.

### 4.2 Gruppi e Allenatori

**Descrizione:** Definizione dei Gruppi per Anno Agonistico e assegnazione di Allenatori e Atlete.

#### FR-6: Creazione Gruppi
Dirigente o Admin può creare un Gruppo per l'Anno Agonistico corrente.

#### FR-7: Assegnazione Allenatori a Gruppo
Dirigente o Admin può assegnare uno o più Allenatori a un Gruppo.

#### FR-30: Assegnazione Atlete a Gruppo
Dirigente o Admin può assegnare una o più Atlete a un Gruppo, analogamente a FR-7 per gli Allenatori.
**Consequences:**
- Un'Atleta appartiene a un solo Gruppo per Anno Agonistico.

*(Requisito aggiunto in fase di story-writing/epics: lacuna del PRD originale — l'assegnazione Atleta-Gruppo era presupposta dal Glossario ma non coperta da un FR esplicito, necessaria per FR-4 e FR-8.)*

### 4.3 Presenze

**Descrizione:** Registrazione e consultazione delle presenze per Slot/Gruppo. Realizza UJ-2.

#### FR-8: Registrazione presenze
L'Allenatore registra presenza/assenza di ogni Atleta del Gruppo per uno Slot svolto.
**Consequences:**
- La registrazione è possibile anche per Slot passati (es. dimenticati), non solo in tempo reale.

#### FR-9: Storico presenze per Atleta
Allenatore e Atleta possono consultare lo storico presenze della singola Atleta.

#### FR-10: Storico presenze con trend/percentuale
Lo storico presenze mostra un indicatore di percentuale/trend, a supporto delle scelte di formazione.
**Notes:** Could — miglioramento del v1, non bloccante.

### 4.4 Compliance Visite Mediche

**Descrizione:** Ciclo di vita completo del certificato medico, dall'upload alla conferma, con promemoria non invasivi. Realizza UJ-1.

#### FR-11: Upload certificato medico
Genitore o Atleta può caricare il file del Certificato Medico dall'app.

#### FR-12: Notifica automatica upload
Il sistema notifica automaticamente Allenatore e Dirigente del Gruppo quando un nuovo Certificato Medico viene caricato. Realizza UJ-1.

#### FR-13: Mail automatica alla Segreteria
Il sistema invia una mail alla Segreteria con il file del Certificato Medico allegato, all'upload. Realizza UJ-1.

#### FR-14: Conferma/validazione certificato
La Segreteria può confermare/validare un Certificato Medico caricato, aggiornandone lo stato a sistema.
**Consequences:**
- La Segreteria può anche inserire manualmente un Certificato Medico ricevuto fuori dall'app (es. consegnato cartaceo), a copertura dei casi in cui Genitore o Atleta non ha effettuato l'upload.

#### FR-15: Alert scadenza non bloccante
Il sistema mostra un alert visivo quando il Certificato Medico di un'Atleta è scaduto.
**Consequences:**
- L'alert è puramente informativo: non impedisce mai la registrazione di una presenza (FR-8).

#### FR-16: Promemoria scadenza
Il sistema invia promemoria automatici a 30 e a 7 giorni dalla scadenza del Certificato Medico, verso Genitore, Atleta, Allenatore e Dirigente.

### 4.5 Iscrizioni

#### FR-17: Conferma iscrizione
La Segreteria può confermare l'Iscrizione di un'Atleta per l'Anno Agonistico corrente. Concetto indipendente dalla validità del tesseramento federale.

### 4.6 Onboarding e Import

**Descrizione:** Registrazione per ruolo e popolamento iniziale via Codice Fiscale come chiave di matching unica. Realizza UJ-3.

#### FR-18: Registrazione autonoma per ruolo
Ogni ruolo (Allenatore, Atleta, Genitore, Segreteria, Dirigente, Admin) può registrarsi autonomamente nel sistema.
**Notes:** `[ASSUMPTION]` meccanismo di autenticazione base (es. email + password); nessuna preferenza specifica indicata — vedi §9.

#### FR-19: Import archivio Atlete da export federale
Admin o Dirigente può importare l'export Excel del portale federale volley; il sistema riconosce le Atlete via Codice Fiscale.
**Consequences:**
- Le date nell'export (formato stringa gg/mm/aaaa) sono normalizzate in fase di parsing (dettaglio tecnico in `addendum.md`).

#### FR-20: Precaricamento Allenatori
Admin o Dirigente può precaricare un Allenatore con dati minimi (nome, Codice Fiscale) prima che si registri autonomamente.

#### FR-21: Aggancio Genitore-Atleta
In fase di registrazione, il Genitore si aggancia a un'Atleta esistente inserendo il Codice Fiscale del figlio/a.

### 4.7 Rollover Stagionale

**Descrizione:** Regole non negoziabili applicate al passaggio da un Anno Agonistico al successivo (1° agosto). Realizza UJ-3.

#### FR-22: Merge certificato in import
All'import di un nuovo export, se la data del Certificato Medico nel file è più recente di quella già a sistema, il sistema aggiorna il dato; altrimenti mantiene quello esistente.

#### FR-23: Riporto Under 13
Le Atlete Under 13 assenti dall'export (perché il tesserino annuale non sempre vi compare) vengono comunque riportate di default nel nuovo Anno Agonistico, con possibilità di esclusione manuale da parte di Admin/Dirigente/Segreteria.

### 4.8 Dati Atleta

**Descrizione:** Dati antropometrici e test fisici, utili per allenatore e atleta nel tempo.

#### FR-24: Dati antropometrici e test fisici
Atleta o Allenatore può inserire/consultare misurazioni antropometriche e di test fisici nel tempo.
**Notes:** Should — non bloccante per il v1.

#### FR-25: Grafico progresso test fisici
I dati di FR-24 sono visualizzati come grafico di progresso nel tempo.
**Notes:** Could.

### 4.9 Amministrazione e Permessi

#### FR-26: Gestione utenti e ruoli
L'Admin di sistema può creare, disattivare e assegnare ruoli agli utenti.

#### FR-27: Permessi granulari su dati sanitari
L'Admin di sistema può configurare permessi granulari su chi vede i dati relativi ai Certificati Medici.
**Notes:** Should — importante data la sensibilità del dato, ma non bloccante per il v1. `[NOTE FOR PM]` rivalutare se anticipare a Must in fase di architettura, data la sensibilità dei dati sanitari di minorenni.

### 4.10 Nuova Stagione (v2)

#### FR-28: Wizard nuova stagione
Un wizard copia/adatta Gruppi e assegnazioni Allenatori dall'Anno Agonistico precedente come base per il nuovo, riducendo il lavoro di ricostruzione.
**Notes:** Could — dettaglio di cosa viene copiato da definire in fase di architettura (vedi `addendum.md`).

### 4.11 Vista Dirigente

**Descrizione:** Vista d'insieme che realizza il JTBD centrale del Dirigente (§2.1): sapere come sta il settore senza rincorrere ogni singolo caso.

#### FR-29: Vista d'insieme Dirigente
Il Dirigente vede in un'unica vista i Gruppi, gli Slot assegnati e lo stato aggregato dei Certificati Medici per gruppo.

## 5. Non-Obiettivi (Espliciti)

- Il sistema non calcola l'incastro ottimale slot-allenatore: resta un lavoro umano, svolto fuori dall'app.
- Il sistema non introduce il ruolo Gestore palestra/impianto: gli slot orari delle palestre sono un dato già assegnato esternamente alla polisportiva, non deciso da essa.
- Il sistema non introduce il ruolo Medico sportivo/Staff sanitario: nessuno ricopre oggi questo ruolo in polisportiva — da riconsiderare se la situazione cambia.
- Il sistema non replica le funzioni gestionali complete della Segreteria (pagamenti, iscrizioni federali): restano nel gestionale esterno esistente; qui la Segreteria opera solo su FR-14 e FR-17.
- Il sistema non traccia la Data Validità Tesseramento federale: confermato non correlata all'Iscrizione (§3 Glossario).

## 6. Perimetro MVP

### 6.1 In Perimetro (v1)
FR-1, FR-2, FR-3, FR-4, FR-6, FR-7, FR-8, FR-9, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-26, FR-29, FR-30.

**Vincolo di consegna:** la v1 (elenco sopra) deve essere pronta per il 1° agosto, avvio del prossimo Anno Agonistico — un vincolo di consegna distinto dal meccanismo di rollover ricorrente descritto in §4.7.

### 6.2 Fuori Perimetro v1 (differito)
- **FR-5** (vista orari trasversale Segreteria) — utile ma non bloccante, rimandabile a v1.1.
- **FR-10** (trend/percentuale presenze) — miglioramento incrementale.
- **FR-24, FR-25** (dati atleta e grafico test fisici) — funzionalità aggiuntiva, non critica per il lancio.
- **FR-27** (permessi granulari sanitari) — `[NOTE FOR PM]` rivalutare priorità in architettura data la sensibilità del dato.
- **FR-28** (wizard nuova stagione) — utile solo dal secondo rollover in poi, non per il primo lancio.

## 7. Metriche di Successo

**Primaria**
- **SM-1**: Zero casi di atlete che risultano "in campo" (presenza registrata) senza che lo stato del Certificato Medico fosse visibile a chi le allena. Valida FR-8, FR-15.

**Secondaria**
- **SM-2**: Tempo percepito speso a rincorrere certificati/comunicazioni manuali significativamente ridotto rispetto a oggi (WhatsApp/Excel/telefonate). Valida FR-11–FR-16.

**Contro-metrica (da non ottimizzare)**
- **SM-C1**: Numero di notifiche per utente — non deve crescere. L'obiettivo è meno rumore rispetto a un gruppo WhatsApp, non più notifiche totali. Controbilancia SM-1/SM-2.

## 8. NFR Trasversali

- **Sicurezza/Autenticazione**: meccanismo base per ruolo. `[ASSUMPTION]` — dettaglio (es. email+password) da confermare in architettura.
- **Privacy dati sanitari**: gestione "ragionevole" di base per i Certificati Medici (dati sensibili, spesso di minorenni). `[ASSUMPTION]` — nessun vincolo di residenza/hosting dati indicato; da approfondire in architettura data la natura del dato.
- **Piattaforma**: applicazione web, utilizzabile da smartphone in palestra con connessione dati normale — nessun requisito di funzionamento offline.
- **Affidabilità**: nessun requisito formale di uptime/SLA — progetto personale, non a produzione critica 24/7.
- **Scala**: fino a ~200 Atlete per il settore volley; l'eventuale estensione pluri-settore (~1500 Atlete) è solo un'indicazione di ordine di grandezza per l'architettura, non un requisito del v1.
- **Vincolo di sviluppo**: progetto personale, sviluppo in solitaria (con assistenza AI), nessun budget o hosting dedicato — orienta l'architettura verso stack e infrastruttura semplici ed economici, bassa complessità operativa (dettaglio in `addendum.md` del brief).

## 9. Domande Aperte e Assunzioni

Punti non confermati, ereditati dal brief/brainstorming: alcune sono assunzioni fatte per procedere (taggate `[ASSUMPTION]` inline nel testo, es. §8, FR-18), altre sono domande la cui risposta è demandata alla fase di architettura. Nessuna è bloccante per l'avvio dello sviluppo.

1. **Autenticazione** (FR-18, §8) — assunto un meccanismo base per ruolo (es. email+password); dettaglio definitivo da confermare in architettura.
2. **Conservazione/hosting dati sanitari** (§8) — i Certificati Medici sono dati sensibili, spesso di minorenni; assunta una gestione "base" (nessun vincolo di residenza/hosting indicato). La scelta di dove e come conservarli merita attenzione dedicata in fase di architettura, oltre la gestione assunta qui.
3. **Contenuto del Wizard Nuova Stagione** (FR-28) — cosa viene copiato/adattato esattamente dall'Anno Agonistico precedente, da definire in architettura.
4. **Log di accesso/audit sui dati sanitari** — idea emersa in brainstorming per l'Admin di sistema, mai discussa a fondo né decisa. Non incluso nel v1; da rivalutare in architettura se la sensibilità del dato lo richiede.
