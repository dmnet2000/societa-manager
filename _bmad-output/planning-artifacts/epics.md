---
stepsCompleted: [step-01, step-02, step-03, step-04]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md
---

# Gestione Settore Volley - Polisportiva - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Gestione Settore Volley - Polisportiva, decomposing the requirements from the PRD and Architecture Spine into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1: Admin o Dirigente può creare/modificare una Palestra e i suoi Campi.
FR-2: Admin o Dirigente può creare uno Slot (giorno, ora inizio/fine, Palestra, Campo, Gruppo) direttamente, senza calcolo automatico.
FR-3: L'Allenatore vede gli Slot dei propri Gruppi.
FR-4: L'Atleta vede gli Slot del proprio Gruppo.
FR-5: La Segreteria vede tutti gli Slot di tutte le Palestre/Gruppi. (Should — differito v1.1)
FR-6: Dirigente o Admin può creare un Gruppo per l'Anno Agonistico corrente.
FR-7: Dirigente o Admin può assegnare uno o più Allenatori a un Gruppo.
FR-8: L'Allenatore registra presenza/assenza di ogni Atleta del Gruppo per uno Slot svolto (anche per slot passati).
FR-9: Allenatore e Atleta possono consultare lo storico presenze della singola Atleta.
FR-10: Lo storico presenze mostra un indicatore di percentuale/trend. (Could — differito)
FR-11: Genitore o Atleta può caricare il file del Certificato Medico dall'app.
FR-12: Il sistema notifica automaticamente Allenatore e Dirigente del Gruppo quando un nuovo Certificato Medico viene caricato.
FR-13: Il sistema invia una mail alla Segreteria con il file del Certificato Medico allegato, all'upload.
FR-14: La Segreteria può confermare/validare un Certificato Medico caricato (o inserirne uno manualmente se ricevuto fuori app).
FR-15: Il sistema mostra un alert visivo non bloccante quando il Certificato Medico di un'Atleta è scaduto.
FR-16: Il sistema invia promemoria automatici a 30 e 7 giorni dalla scadenza del Certificato Medico, verso Genitore, Atleta, Allenatore e Dirigente.
FR-17: La Segreteria può confermare l'Iscrizione di un'Atleta per l'Anno Agonistico corrente.
FR-18: Ogni ruolo (Allenatore, Atleta, Genitore, Segreteria, Dirigente, Admin) può registrarsi autonomamente nel sistema.
FR-19: Admin o Dirigente può importare l'export Excel del portale federale volley; il sistema riconosce le Atlete via Codice Fiscale.
FR-20: Admin o Dirigente può precaricare un Allenatore con dati minimi (nome, Codice Fiscale) prima che si registri autonomamente.
FR-21: In fase di registrazione, il Genitore si aggancia a un'Atleta esistente inserendo il Codice Fiscale del figlio/a.
FR-22: All'import di un nuovo export, se la data del Certificato Medico nel file è più recente di quella già a sistema, il sistema aggiorna il dato; altrimenti mantiene quello esistente.
FR-23: Le Atlete Under 13 assenti dall'export vengono comunque riportate di default nel nuovo Anno Agonistico, con possibilità di esclusione manuale.
FR-24: Atleta o Allenatore può inserire/consultare misurazioni antropometriche e di test fisici nel tempo. (Should — differito v1.1)
FR-25: I dati di FR-24 sono visualizzati come grafico di progresso nel tempo. (Could — differito)
FR-26: L'Admin di sistema può creare, disattivare e assegnare ruoli agli utenti.
FR-27: L'Admin di sistema può configurare permessi granulari su chi vede i dati relativi ai Certificati Medici. (Should — differito v1.1)
FR-28: Un wizard copia/adatta Gruppi e assegnazioni Allenatori dall'Anno Agonistico precedente come base per il nuovo. (Could — differito, dal secondo rollover in poi)
FR-29: Il Dirigente vede in un'unica vista i Gruppi, gli Slot assegnati e lo stato aggregato dei Certificati Medici per gruppo.
FR-30 (aggiunto in fase di story-writing, lacuna del PRD): Dirigente o Admin può assegnare una o più Atlete a un Gruppo, analogamente a FR-7 per gli Allenatori.

### NonFunctional Requirements

NFR1: Sicurezza/Autenticazione — meccanismo base per ruolo via Supabase Auth (email+password).
NFR2: Privacy dati sanitari — i Certificati Medici sono dati sanitari (spesso di minorenni); accesso protetto da Row-Level Security (AD-4), non solo controlli applicativi; dato ospitato in regione EU.
NFR3: Piattaforma — applicazione web responsive, utilizzabile da smartphone in palestra con connessione dati normale; nessun requisito offline.
NFR4: Affidabilità — nessun requisito formale di uptime/SLA (progetto personale, non produzione critica 24/7).
NFR5: Scala — fino a ~200 Atlete per il settore volley nel v1; eventuale estensione pluri-settore (~1500 Atlete) è solo un'indicazione di ordine di grandezza, non un requisito v1.
NFR6: Vincolo di sviluppo — progetto personale, sviluppo in solitaria con assistenza AI, nessun budget/hosting dedicato: stack e infrastruttura devono restare semplici ed economici (piani Free).

### Additional Requirements

- **Stack (Architecture Spine):** Next.js 16 (App Router, TypeScript), Supabase (Postgres/Auth/Storage, piano Free, progetto in regione EU), Prisma 7 (schema/migrazioni, richiede driver adapter `@prisma/adapter-pg` e `prisma.config.ts`), Resend (email transazionali), Cloudflare Pages/Workers (hosting, via adapter `@opennextjs/cloudflare`, Cron Trigger per i promemoria).
- **Nessuno starter/scaffold dedicato**: si parte da `create-next-app` (App Router) standard — nessun template greenfield specifico oltre a questo.
- **AD-1**: applicazione unica, monolite Next.js — tutta la logica passa da Server Action/Route Handler nello stesso repo.
- **AD-2**: confini dei moduli per feature (Orari-Palestre, Gruppi-Allenatori, Presenze, Certificati-Medici, Iscrizioni, Onboarding-Import, Rollover-Stagionale, Dati-Atleta, Amministrazione); Orari-Palestre è l'unico proprietario della mutazione di Slot.
- **AD-3**: Prisma come modello dati canonico; ogni cambio di schema passa da migrazione Prisma.
- **AD-4**: Row-Level Security Postgres per CertificatoMedico, Atleta, Presenza, Iscrizione, basata su claim JWT Supabase Auth; Admin/Dirigente/Segreteria hanno policy di accesso ampio; rifiuti di autorizzazione restituiscono sempre `FORBIDDEN`, mai `NOT_FOUND`.
- **AD-5**: motore di matching Codice Fiscale come servizio unico condiviso (`trovaPerCodiceFiscale`, `unisciCertificato`), usato da Import, Onboarding e Rollover.
- **AD-6**: storage dei certificati medici privato con URL firmati (Supabase Storage).
- **AD-7**: promemoria scadenza via un solo Cloudflare Cron Trigger → un solo Route Handler.
- **AD-8**: Anno Agonistico (1 agosto – 30 giugno) come partizione temporale, referenziata da Gruppo e Iscrizione; Slot e Presenza ereditano la stagione transitivamente via Gruppo.
- **AD-9**: split di accesso ai dati — tabelle protette da RLS lette/scritte a runtime via client Supabase (non Prisma diretto), per rispettare i claim JWT.
- **AD-10**: Atleta ha un unico proprietario (Onboarding-Import) per i campi identitari; gli altri moduli scrivono solo le proprie entità correlate via FK.
- **Deploy**: un solo progetto Supabase (regione EU) e un solo progetto Cloudflare Pages (produzione); deploy di anteprima automatici per branch/PR come test informale, nessuno staging dedicato.
- **Deferred (Architecture)**: log di accesso/audit sui dati sanitari, permessi granulari fini oltre il ruolo base, dettaglio del wizard nuova stagione, estensione pluri-settore — nessuno di questi è nel v1.

### UX Design Requirements

Nessun documento UX prodotto per questo progetto (scelta esplicita: si è passati direttamente da PRD ad Architettura). Nessun UX-DR da estrarre.

### FR Coverage Map

FR-1: Epic 2 - Anagrafica Palestre e Campi
FR-2: Epic 2 - Caricamento Slot
FR-3: Epic 2 - Vista orario personale Allenatore
FR-4: Epic 2 - Vista orario personale Atleta
FR-5: Epic 2 - Vista orari trasversale Segreteria
FR-6: Epic 2 - Creazione Gruppi
FR-7: Epic 2 - Assegnazione Allenatori a Gruppo
FR-8: Epic 3 - Registrazione presenze
FR-9: Epic 3 - Storico presenze per Atleta
FR-10: Epic 3 - Storico presenze con trend/percentuale
FR-11: Epic 4 - Upload certificato medico
FR-12: Epic 4 - Notifica automatica upload
FR-13: Epic 4 - Mail automatica alla Segreteria
FR-14: Epic 4 - Conferma/validazione certificato
FR-15: Epic 4 - Alert scadenza non bloccante
FR-16: Epic 4 - Promemoria scadenza
FR-17: Epic 1 - Conferma iscrizione
FR-18: Epic 1 - Registrazione autonoma per ruolo
FR-19: Epic 1 - Import archivio Atlete da export federale
FR-20: Epic 1 - Precaricamento Allenatori
FR-21: Epic 1 - Aggancio Genitore-Atleta
FR-22: Epic 1 - Merge certificato in import
FR-23: Epic 1 - Riporto Under 13
FR-24: Epic 6 - Dati antropometrici e test fisici
FR-25: Epic 6 - Grafico progresso test fisici
FR-26: Epic 1 - Gestione utenti e ruoli
FR-27: Epic 5 - Permessi granulari su dati sanitari
FR-28: Epic 6 - Wizard nuova stagione
FR-29: Epic 5 - Vista d'insieme Dirigente
FR-30: Epic 2 - Assegnazione Atlete a Gruppo (aggiunta in fase di story-writing)
FR-31: Epic 7 - Configurazione SMTP per invio email (aggiunta in corso d'opera, correzione di rotta 2026-07-18)
FR-32: Epic 7 - Configurazione logo applicazione (aggiunta in corso d'opera, correzione di rotta 2026-07-18)

## Epic List

### Epic 1: Accesso, Popolamento e Iscrizioni
Ogni ruolo può registrarsi e accedere; Admin/Dirigente popolano atlete e allenatori (import Excel, precaricamento, aggancio genitore-atleta), gestiscono utenti/ruoli, e la Segreteria conferma le iscrizioni — inclusa la corretta gestione del passaggio da una stagione all'altra (merge certificati per data più recente, riporto Under 13).
**FRs covered:** FR-17, FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-26

### Epic 2: Palestre, Gruppi e Orari
Dirigente/Admin configurano palestre/campi/slot e gruppi con allenatori e atlete assegnati a inizio stagione; allenatori e atlete vedono il proprio orario; la segreteria ha una vista trasversale.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-30

### Epic 3: Presenze
Gli allenatori registrano le presenze per ogni allenamento; allenatori e atlete consultano lo storico, con indicatore di trend.
**FRs covered:** FR-8, FR-9, FR-10

### Epic 4: Compliance Visite Mediche
Genitori/Atlete caricano il certificato medico; il sistema notifica automaticamente allenatore/dirigente/segreteria; la segreteria conferma; il sistema segnala le scadenze in modo non invasivo, con promemoria a 30/7 giorni.
**FRs covered:** FR-11, FR-12, FR-13, FR-14, FR-15, FR-16

### Epic 5: Vista Dirigente e Amministrazione Avanzata
Il Dirigente ha una vista d'insieme aggregata su gruppi, orari e stato dei certificati; l'Admin può affinare i permessi sui dati sanitari.
**FRs covered:** FR-27, FR-29

### Epic 6: Dati Atleta e Miglioramenti
Atlete e allenatori tracciano dati fisici nel tempo con grafici di progresso; un wizard riduce il lavoro di ricostruzione a inizio nuova stagione.
**FRs covered:** FR-24, FR-25, FR-28

### Epic 7: Configurazione Applicazione
*(Aggiunto in corso d'opera — correzione di rotta 2026-07-18, vedi `sprint-change-proposal-2026-07-18.md`.)* L'Admin configura i parametri tecnici e di branding dell'applicazione (invio email, logo) da un'interfaccia dedicata, senza intervento diretto su codice/infrastruttura. **Precede Story 4.3** in ordine di esecuzione (dipendenza: FR-13 richiede FR-31), pur restando numerato per ultimo nel documento per non alterare la numerazione degli epic già completati.
**FRs covered:** FR-31, FR-32

## Epic 1: Accesso, Popolamento e Iscrizioni

Ogni ruolo può registrarsi e accedere; Admin/Dirigente popolano atlete e allenatori (import Excel, precaricamento, aggancio genitore-atleta), gestiscono utenti/ruoli, e la Segreteria conferma le iscrizioni — inclusa la corretta gestione del passaggio da una stagione all'altra (merge certificati per data più recente, riporto Under 13).

### Story 1.1: Registrazione e login per ruolo

As a Allenatore, Atleta, Genitore, Segreteria, Dirigente o Admin,
I want potermi registrare e accedere al sistema con il mio ruolo,
So that posso usare le funzionalità dedicate al mio ruolo.

**Acceptance Criteria:**

**Given** non ho ancora un account
**When** mi registro con email, password e ruolo dichiarato
**Then** viene creato un Utente con quel Ruolo e posso accedere
**And** al login successivo vedo solo le funzionalità previste per il mio ruolo (route guard per ruolo, AD-2)

### Story 1.2: Gestione utenti e ruoli — Admin

As a Admin di sistema,
I want creare, disattivare e assegnare ruoli agli utenti,
So that posso mantenere corretto l'accesso al sistema nel tempo.

**Acceptance Criteria:**

**Given** sono autenticato come Admin
**When** creo un nuovo utente, ne disattivo uno esistente, o gli assegno/rimuovo un ruolo
**Then** la modifica è immediatamente efficace sui permessi di accesso di quell'utente
**And** un utente disattivato non può più accedere al sistema

### Story 1.3: Import archivio Atlete da export federale

As a Admin o Dirigente,
I want importare l'export Excel del portale federale volley,
So that non devo inserire a mano ogni atleta.

**Acceptance Criteria:**

**Given** ho un file Excel nel formato del portale federale
**When** carico il file per l'Anno Agonistico corrente
**Then** il sistema crea o aggiorna le Atlete riconoscendole per Codice Fiscale (motore condiviso AD-5, `trovaPerCodiceFiscale`)
**And** le date nel file (formato gg/mm/aaaa) sono normalizzate in ISO 8601 prima del salvataggio
**And** Onboarding-Import resta l'unico proprietario dei campi identitari di Atleta (AD-10)

### Story 1.4: Precaricamento Allenatori

As a Admin o Dirigente,
I want precaricare un Allenatore con dati minimi (nome, Codice Fiscale),
So that l'allenatore può registrarsi in autonomia riconoscendo i propri dati già presenti.

**Acceptance Criteria:**

**Given** conosco nome e Codice Fiscale di un allenatore non ancora registrato
**When** lo precarico nel sistema
**Then** viene creato un record Allenatore minimale in attesa di registrazione
**And** quando l'allenatore si registra (Story 1.1) con lo stesso Codice Fiscale, il suo account si aggancia al record precaricato invece di crearne uno duplicato

### Story 1.5: Aggancio Genitore-Atleta in registrazione

As a Genitore,
I want agganciarmi a mia figlia/o inserendo il suo Codice Fiscale in fase di registrazione,
So that posso vedere le sue informazioni senza passare da altri.

**Acceptance Criteria:**

**Given** mia figlia/o è già presente come Atleta (importata in Story 1.3)
**When** mi registro come Genitore e inserisco il Codice Fiscale della figlia/o
**Then** il mio account viene collegato a quell'Atleta
**And** se il Codice Fiscale non corrisponde a nessuna Atleta esistente, ricevo un messaggio chiaro invece di un aggancio silenzioso errato

### Story 1.6: Conferma iscrizione

As a Segreteria,
I want confermare l'Iscrizione di un'Atleta per l'Anno Agonistico corrente,
So that risulta chiaro chi è regolarmente iscritto in questa stagione.

**Acceptance Criteria:**

**Given** un'Atleta presente a sistema per l'Anno Agonistico corrente
**When** la Segreteria conferma l'Iscrizione
**Then** l'Atleta risulta "iscritta" per quell'Anno Agonistico, indipendentemente dallo stato del tesseramento federale (che non viene tracciato)

### Story 1.7: Merge certificato in import

As a Admin o Dirigente,
I want che l'import aggiorni la data del Certificato Medico solo se più recente di quella a sistema,
So that non perdo dati più aggiornati già inseriti manualmente.

**Acceptance Criteria:**

**Given** un'Atleta ha già una data di Certificato Medico a sistema
**When** importo un export con una data di certificato diversa per la stessa Atleta
**Then** il sistema aggiorna la data solo se quella nel file è più recente (motore condiviso AD-5, `unisciCertificato`), altrimenti mantiene quella esistente
**And** viene creata qui la tabella minima CertificatoMedico (date di validità), che l'Epic 4 estenderà con upload/notifiche/stato

### Story 1.8: Riporto Under 13 nel rollover

As a Admin, Dirigente o Segreteria,
I want che le Atlete Under 13 assenti dall'export vengano comunque riportate nella nuova stagione,
So that non perdo atlete valide per una limitazione dell'export federale, ma posso comunque escluderle se serve.

**Acceptance Criteria:**

**Given** un'Atleta Under 13 presente nella stagione precedente non compare nel nuovo export
**When** eseguo l'import per la nuova stagione
**Then** l'Atleta viene comunque riportata (nuova Iscrizione proposta per il nuovo Anno Agonistico)
**And** Admin/Dirigente/Segreteria possono escluderla manualmente se non è più attiva

## Epic 2: Palestre, Gruppi e Orari

Dirigente/Admin configurano palestre/campi/slot e gruppi con allenatori e atlete assegnati a inizio stagione; allenatori e atlete vedono il proprio orario; la segreteria ha una vista trasversale.

### Story 2.1: Anagrafica Palestre e Campi

As a Admin o Dirigente,
I want creare e modificare una Palestra con i suoi Campi,
So that posso rappresentare gli impianti reali usati dalla polisportiva.

**Acceptance Criteria:**

**Given** conosco il nome/indirizzo di una palestra
**When** la creo nel sistema
**Then** posso aggiungerle uno o più Campi
**And** una palestra con più campi può ospitare due Gruppi in contemporanea sullo stesso orario, su Campi diversi

### Story 2.2: Creazione Gruppi

As a Dirigente o Admin,
I want creare un Gruppo per l'Anno Agonistico corrente,
So that posso organizzare le atlete in squadre/categorie.

**Acceptance Criteria:**

**Given** l'Anno Agonistico corrente è definito
**When** creo un Gruppo (nome, categoria)
**Then** il Gruppo è associato a quell'Anno Agonistico (AD-8)
**And** se l'Anno Agonistico corrente non esiste ancora a sistema, viene derivato e creato automaticamente dalle date di calendario (1 agosto – 30 giugno) prima di creare il Gruppo, così la catena FK di AD-8 non resta orfana al primo utilizzo

### Story 2.3: Assegnazione Allenatori a Gruppo

As a Dirigente o Admin,
I want assegnare uno o più Allenatori a un Gruppo,
So that ogni gruppo ha chi lo segue.

**Acceptance Criteria:**

**Given** un Gruppo esiste (Story 2.2) e un Allenatore è registrato (Epic 1)
**When** assegno l'Allenatore al Gruppo
**Then** l'Allenatore risulta responsabile di quel Gruppo per l'Anno Agonistico corrente

### Story 2.4: Assegnazione Atlete a Gruppo

As a Dirigente o Admin,
I want assegnare una o più Atlete a un Gruppo,
So that ogni atleta risulta inquadrata nel gruppo in cui si allena.

**Acceptance Criteria:**

**Given** un Gruppo esiste e un'Atleta è presente a sistema (Epic 1)
**When** assegno l'Atleta al Gruppo
**Then** l'Atleta risulta membro di quel Gruppo per l'Anno Agonistico corrente
**And** un'Atleta appartiene a un solo Gruppo per Anno Agonistico

### Story 2.5: Caricamento Slot

As a Admin o Dirigente,
I want creare uno Slot (giorno, ora inizio/fine, Palestra, Campo, Gruppo) direttamente,
So that l'orario degli allenamenti, già deciso fuori dall'app, sia visibile a tutti nel sistema.

**Acceptance Criteria:**

**Given** Palestra/Campo (Story 2.1) e Gruppo (Story 2.2) esistono
**When** creo uno Slot specificando giorno, orario, campo e gruppo
**Then** lo Slot è salvato e resta fisso per l'intero Anno Agonistico (AD-8)
**And** Orari-Palestre resta l'unico proprietario della mutazione dello Slot (AD-2) — nessun altro modulo lo scrive direttamente

### Story 2.6: Vista orario personale — Allenatore

As a Allenatore,
I want vedere gli Slot dei miei Gruppi,
So that so sempre dove e quando allenarmi senza chiedere in segreteria.

**Acceptance Criteria:**

**Given** sono assegnato a uno o più Gruppi (Story 2.3) con Slot definiti (Story 2.5)
**When** apro la mia vista orario
**Then** vedo tutti gli Slot dei miei Gruppi, per settimana

### Story 2.7: Vista orario personale — Atleta

As a Atleta,
I want vedere gli Slot del mio Gruppo,
So that so sempre quando e dove mi alleno.

**Acceptance Criteria:**

**Given** sono assegnata a un Gruppo (Story 2.4) con Slot definiti
**When** apro la mia vista orario
**Then** vedo gli Slot del mio Gruppo, per settimana

### Story 2.8: Vista orari trasversale — Segreteria

As a Segreteria,
I want vedere tutti gli Slot di tutte le Palestre/Gruppi,
So that posso rispondere subito a chi chiede un orario, senza girare la domanda all'allenatore.

**Acceptance Criteria:**

**Given** esistono Slot per uno o più Gruppi/Palestre
**When** apro la vista orari della Segreteria
**Then** vedo tutti gli Slot esistenti, filtrabili per palestra o gruppo

**Note:** Should — differibile a v1.1, non bloccante per il lancio

## Epic 3: Presenze

Gli allenatori registrano le presenze per ogni allenamento; allenatori e atlete consultano lo storico, con indicatore di trend.

### Story 3.1: Registrazione presenze

As a Allenatore,
I want registrare presenza/assenza di ogni Atleta del mio Gruppo per uno Slot svolto,
So that ho traccia di chi ha partecipato a ogni allenamento.

**Acceptance Criteria:**

**Given** il mio Gruppo ha Atlete assegnate (Story 2.4) e uno Slot svolto (Story 2.5)
**When** segno presenza/assenza per ogni Atleta di quello Slot
**Then** la Presenza è salvata, collegata ad Atleta e Slot
**And** posso registrare anche per Slot passati (es. dimenticati), non solo in tempo reale

### Story 3.2: Storico presenze per Atleta

As a Allenatore o Atleta,
I want consultare lo storico presenze della singola Atleta,
So that ho visibilità sulla sua partecipazione nel tempo.

**Acceptance Criteria:**

**Given** esistono Presenze registrate per un'Atleta (Story 3.1)
**When** apro lo storico presenze di quell'Atleta
**Then** vedo l'elenco cronologico di presenze/assenze per Slot

### Story 3.3: Storico presenze con trend/percentuale

As a Allenatore,
I want vedere un indicatore di percentuale/trend nello storico presenze,
So that ho un supporto rapido per le scelte di formazione.

**Acceptance Criteria:**

**Given** lo storico presenze di un'Atleta esiste (Story 3.2)
**When** lo consulto
**Then** vedo una percentuale di presenza e un trend (in calo/costante/in crescita)

**Note:** Could — miglioramento incrementale, non bloccante

## Epic 4: Compliance Visite Mediche

Genitori/Atlete caricano il certificato medico; il sistema notifica automaticamente allenatore/dirigente/segreteria; la segreteria conferma; il sistema segnala le scadenze in modo non invasivo, con promemoria a 30/7 giorni.

### Story 4.1: Upload certificato medico

As a Genitore o Atleta,
I want caricare il file del Certificato Medico dall'app,
So that non devo consegnarlo di persona o rincorrere la segreteria.

**Acceptance Criteria:**

**Given** sono autenticato come Genitore (della propria figlia/o) o come Atleta
**When** carico il file del Certificato Medico
**Then** il file è salvato in modo privato (bucket Storage non pubblico, AD-6) e collegato all'Atleta
**And** l'accesso al file avviene solo tramite URL firmati a scadenza breve, generati dopo verifica dei permessi

### Story 4.2: Notifica automatica upload

As a Allenatore o Dirigente,
I want essere avvisato quando viene caricato un nuovo Certificato Medico per un'Atleta del mio Gruppo,
So that lo so subito, senza dover controllare manualmente.

**Acceptance Criteria:**

**Given** un Certificato Medico viene caricato (Story 4.1) per un'Atleta di un Gruppo
**When** l'upload si completa
**Then** l'Allenatore e il Dirigente di quel Gruppo ricevono una notifica automatica

### Story 4.3: Mail automatica alla Segreteria

As a Segreteria,
I want ricevere una mail con il Certificato Medico allegato quando viene caricato,
So that posso verificarlo e confermarlo senza dover andare a cercarlo nell'app.

**Acceptance Criteria:**

**Given** un Certificato Medico viene caricato (Story 4.1)
**When** l'upload si completa
**Then** la Segreteria riceve un'email con il file allegato

### Story 4.4: Conferma/validazione certificato

As a Segreteria,
I want confermare/validare un Certificato Medico caricato, o inserirne uno ricevuto fuori app,
So that lo stato a sistema riflette la realtà anche per i casi non passati dall'upload in app.

**Acceptance Criteria:**

**Given** un Certificato Medico è stato caricato (Story 4.1) o ricevuto cartaceo
**When** la Segreteria lo conferma/valida (o lo inserisce manualmente)
**Then** lo stato del Certificato Medico a sistema è aggiornato di conseguenza

### Story 4.5: Alert scadenza non bloccante

As a Allenatore,
I want vedere un alert visivo quando il Certificato Medico di un'Atleta è scaduto,
So that ne sono consapevole, ma senza che questo mi impedisca di registrare la presenza.

**Acceptance Criteria:**

**Given** il Certificato Medico di un'Atleta risulta scaduto (data fine validità nel passato)
**When** l'Allenatore visualizza il Gruppo o registra le presenze (Story 3.1)
**Then** vede un alert visivo per quell'Atleta
**And** l'alert non impedisce in nessun caso di registrare la presenza (informativo, non bloccante)

### Story 4.6: Promemoria scadenza

As a Genitore, Atleta, Allenatore o Dirigente,
I want ricevere un promemoria 30 e 7 giorni prima della scadenza del Certificato Medico,
So that ho il tempo di rinnovarlo senza scoprirlo all'ultimo.

**Acceptance Criteria:**

**Given** un Certificato Medico ha una data di scadenza
**When** mancano esattamente 30 o 7 giorni alla scadenza
**Then** il sistema invia un promemoria a Genitore, Atleta, Allenatore e Dirigente
**And** l'invio è gestito da un solo Cloudflare Cron Trigger giornaliero → un solo Route Handler (AD-7), non da timer sparsi

## Epic 5: Vista Dirigente e Amministrazione Avanzata

Il Dirigente ha una vista d'insieme aggregata su gruppi, orari e stato dei certificati; l'Admin può affinare i permessi sui dati sanitari.

### Story 5.1: Vista d'insieme Dirigente

As a Dirigente,
I want vedere in un'unica vista i Gruppi, gli Slot assegnati e lo stato aggregato dei Certificati Medici per gruppo,
So that ho il polso del settore senza rincorrere ogni singolo caso.

**Acceptance Criteria:**

**Given** esistono Gruppi con Slot (Epic 2) e Certificati Medici tracciati (Epic 4)
**When** apro la vista d'insieme
**Then** vedo, per ogni mio Gruppo, gli Slot assegnati e un riepilogo aggregato dello stato dei certificati (es. quante atlete in regola, quante in scadenza, quante scadute)

### Story 5.2: Permessi granulari su dati sanitari

As a Admin di sistema,
I want configurare permessi granulari su chi vede i dati relativi ai Certificati Medici,
So that posso restringere l'accesso oltre il controllo di base per ruolo, se serve.

**Acceptance Criteria:**

**Given** le policy RLS di base per ruolo esistono (AD-4)
**When** l'Admin configura un permesso più fine (es. limitare la visibilità a un sottoinsieme di dati anche dentro lo stesso ruolo)
**Then** la nuova policy si applica senza richiedere modifiche al modello dati esistente

**Note:** Should — differibile a v1.1, non bloccante per il lancio

## Epic 6: Dati Atleta e Miglioramenti

Atlete e allenatori tracciano dati fisici nel tempo con grafici di progresso; un wizard riduce il lavoro di ricostruzione a inizio nuova stagione.

### Story 6.1: Dati antropometrici e test fisici

As a Atleta o Allenatore,
I want inserire e consultare misurazioni antropometriche e di test fisici nel tempo,
So that posso seguire la crescita/preparazione dell'atleta.

**Acceptance Criteria:**

**Given** un'Atleta è presente a sistema (Epic 1)
**When** inserisco una misurazione (es. altezza, peso, risultato di un test fisico) con data
**Then** la misurazione è salvata e consultabile in ordine cronologico per quell'Atleta

**Note:** Should — differibile a v1.1, non bloccante per il lancio

### Story 6.2: Grafico progresso test fisici

As a Atleta o Allenatore,
I want vedere un grafico di progresso delle misurazioni nel tempo,
So that i miglioramenti (o i cali) sono immediatamente visibili, non solo un elenco di numeri.

**Acceptance Criteria:**

**Given** esistono almeno due misurazioni per un'Atleta (Story 6.1)
**When** apro la sua scheda dati fisici
**Then** vedo un grafico che mostra l'andamento nel tempo per ciascun tipo di misurazione

**Note:** Could — miglioramento incrementale, non bloccante

### Story 6.3: Wizard nuova stagione

As a Admin o Dirigente,
I want un wizard che copi/adatti Gruppi e assegnazioni Allenatori dall'Anno Agonistico precedente,
So that non ricostruisco tutto da zero a ogni 1° agosto.

**Acceptance Criteria:**

**Given** un Anno Agonistico precedente esiste con Gruppi e Allenatori assegnati (Epic 2)
**When** avvio il wizard per il nuovo Anno Agonistico
**Then** il sistema propone una bozza di Gruppi e assegnazioni Allenatori basata sull'anno precedente, che posso correggere prima di confermare

**Note:** Could — utile dal secondo rollover in poi, non per il primo lancio

## Epic 7: Configurazione Applicazione

*(Aggiunto in corso d'opera — correzione di rotta 2026-07-18, vedi `sprint-change-proposal-2026-07-18.md`. Precede Story 4.3 in ordine di esecuzione: FR-13 richiede FR-31.)*

L'Admin configura i parametri tecnici e di branding dell'applicazione (invio email, logo) da un'interfaccia dedicata, senza intervento diretto su codice/infrastruttura.

### Story 7.1: Configurazione SMTP

As a Admin,
I want configurare i parametri del server SMTP per l'invio email dall'app,
So that il sistema può inviare le email transazionali (es. alla Segreteria) usando la mia casella email esistente, senza dipendere da un provider terzo.

**Acceptance Criteria:**

**Given** sono autenticato come Admin
**When** apro la sezione di configurazione email e inserisco host/porta/utente/password/mittente
**Then** i parametri vengono salvati e usati dal sistema per i successivi invii email
**And** se i parametri non sono ancora configurati, ogni funzionalità che dipende dall'invio email lo segnala chiaramente invece di fallire silenziosamente

### Story 7.2: Configurazione logo applicazione

As a Admin,
I want caricare/aggiornare il logo dell'applicazione,
So that l'app riflette l'identità visiva della società.

**Acceptance Criteria:**

**Given** sono autenticato come Admin
**When** carico un'immagine come logo dall'interfaccia di configurazione
**Then** il logo viene salvato e sostituisce quello precedente (se esistente)

**Note:** Could — branding non bloccante per il lancio, rimandabile a v1.1 (FR-32 fuori perimetro v1, PRD §6.2)
