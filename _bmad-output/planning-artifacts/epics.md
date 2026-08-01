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

Documento UX prodotto in corso d'opera tra Epic 4 ed Epic 5 (`ux-designs/ux-societa-manager-2026-07-22/DESIGN.md`/`EXPERIENCE.md`) — non presente alla stesura originale di questo documento. Applicato alle pagine nuove create da Epic 5 in poi (Story 5.1, 5.2, e il componente grafico di Story 6.2); il retrofit sulle pagine preesistenti è oggetto dell'Epic 8 (correzione di rotta 2026-07-23, vedi `sprint-change-proposal-2026-07-23.md`).

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

### Epic 8: Applicazione del Design System
*(Aggiunto in corso d'opera — correzione di rotta 2026-07-23, vedi `sprint-change-proposal-2026-07-23.md`.)* Il sistema di design (`DESIGN.md`/`EXPERIENCE.md`, prodotto tra Epic 4 ed Epic 5) è stato applicato solo alle pagine nuove da allora in poi — questo epic lo retrofitta sulle 20 pagine preesistenti rimaste allo stile precedente. Puramente presentazionale: nessuna nuova tabella, RLS, Server Action o comportamento in nessuna delle sue storie — solo CSS module + markup sopra le pagine esistenti, stesso pattern già stabilito in Story 5.1/5.2. Tutti i test Vitest esistenti devono continuare a passare invariati.
**FRs covered:** nessuno (opera su NFR3, "applicazione web responsive... mobile-first", già esistente — nessun nuovo comportamento)

### Epic 9: Miglioramenti Post-Rilascio
*(Aggiunto in corso d'opera — 2026-07-25, raccolta di lacune/miglioramenti individuati durante la verifica dal vivo in produzione dopo il completamento di Epic 1-8, non pianificati nel PRD originale. Elenco aperto: le storie vengono aggiunte una alla volta man mano che emergono, non tutte definite in anticipo come negli epic precedenti.)*
**FRs covered:** nessuno finora (da aggiornare se una storia futura ne introduce)

### Epic 10: Gestione Partite e Campionati
*(Aggiunto in corso d'opera — 2026-07-25, richiesta estesa dell'utente, analisi completata e rotta in storie il 2026-07-28 all'avvio dello sviluppo, come esplicitamente richiesto.)* Un Allenatore crea Campionati per il proprio Gruppo e vi importa le gare da un file Excel esportato dalla federazione; Allenatore/Dirigente/Admin vedono e modificano le partite settimana per settimana; Atlete e Genitori vedono le partite della propria squadra/figlia, con navigazione Maps verso il luogo di gioco (riuso del meccanismo di Story 9.6).
**FRs covered:** nessuno nel PRD originale (epic aggiunto in corso d'opera, come Epic 7/8/9)

### Epic 11: Bug di Produzione
*(Aggiunto in corso d'opera — 2026-07-27, raccolta di difetti reali osservati in produzione (log di errore, comportamento scorretto), non richieste/miglioramenti. Elenco aperto come Epic 9.)*
**FRs covered:** nessuno (correzioni di difetti, non nuove funzionalità)

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

## Epic 8: Applicazione del Design System

*(Aggiunto in corso d'opera — correzione di rotta 2026-07-23, vedi `sprint-change-proposal-2026-07-23.md`.)*

Il sistema di design (`ux-designs/ux-societa-manager-2026-07-22/DESIGN.md`/`EXPERIENCE.md`) è stato applicato solo alle pagine costruite da Epic 5 in poi. Questo epic lo retrofitta sulle 20 pagine preesistenti, una storia per gruppo di pagine correlate (stessi confini di modulo di AD-2), più una storia fondativa (8.1) per il layout globale/barra di navigazione che finora non è mai esistita in nessuna forma. **Vincolo trasversale alle storie 8.2-8.7**: restyle puro — nessuna modifica a Server Action, query Prisma, RLS, comportamento o struttura dati; solo `className`/CSS module aggiunti sopra il markup esistente. La suite Vitest esistente deve continuare a passare invariata (nessun test verifica classi CSS).

### Story 8.1: Layout Globale e Barra di Navigazione

As a Utente autenticato di qualunque Ruolo,
I want una barra di navigazione unica coerente con l'identità visiva della società, con le voci pertinenti al mio Ruolo,
so that posso spostarmi tra le pagine che mi riguardano senza conoscere o digitare gli URL a memoria.

**Note aggiuntive (scoperto durante la pianificazione di questo epic, non un requisito originale del PRD):** `app/layout.tsx` è ancora lo scaffold grezzo di `create-next-app` (titolo "Create Next App", `lang="en"`, font Google Geist/Geist_Mono caricati via `next/font/google`) — nessuna barra di navigazione esiste in nessuna pagina dell'app, nonostante `EXPERIENCE.md` (righe 60-69) la specifichi in dettaglio ("un'unica barra orizzontale, sfondo `{colors.navy}`, voci visibili in base al Ruolo dell'utente autenticato, guardia di ruolo per pagina/route-group non un menu che nasconde voci lato client") e `DESIGN.md` (sezione Componenti → `nav-bar`) ne definisca i token visivi. Questa storia precede le altre 6 di questo epic: una volta montata nel root layout, ogni pagina la eredita automaticamente — le storie successive si occupano solo dello stile del contenuto di pagina, non della navigazione.

**Acceptance Criteria:**

**Given** `app/layout.tsx`
**When** l'app viene visualizzata
**Then** il `<title>`/metadata riflettono il nome del prodotto (non più "Create Next App"), `lang="it"`, e nessun font viene caricato da Google Fonts (rimossi `Geist`/`Geist_Mono` da `next/font/google` — `--font-system` già definito in `app/globals.css` da Story 5.1 resta l'unico stack tipografico)

**Given** un Utente autenticato con un Ruolo che ha accesso ad almeno una superficie (tabella IA di `EXPERIENCE.md`, righe 29-58)
**When** naviga una pagina qualsiasi dell'app
**Then** vede una barra di navigazione orizzontale (sfondo `{colors.navy}`, componente `nav-bar` di `DESIGN.md`) con solo le voci delle superfici a cui il suo Ruolo (o i suoi Ruoli) ha accesso — la stessa lista che il route guard (`lib/auth/route-guard.ts`) già applica per l'autorizzazione, non una lista di voci duplicata e mantenuta a mano separatamente

**Given** un Utente con più Ruoli (es. Allenatore e Dirigente)
**When** visualizza la barra di navigazione
**Then** vede l'unione delle voci di entrambi i Ruoli, senza duplicati

**Given** le pagine di sistema/pre-autenticazione (`/accedi`, `/registrati`, `/non-autorizzato`)
**When** vengono visualizzate
**Then** non mostrano la barra di navigazione (nessuna voce ha senso senza una sessione autenticata)

**Given** il logo applicazione configurabile dall'Admin (Story 7.2, bucket pubblico)
**When** la barra di navigazione viene renderizzata
**Then** mostra il logo caricato (se presente), coerente con `DESIGN.md` ("il componente mostra qualunque immagine sia stata caricata... non hardcoded")

**Given** la navigazione da tastiera
**When** un Utente sposta il focus su una voce della barra
**Then** è visibile un contorno di focus (`{colors.focus-ring-on-navy}`, bianco, coerente con `DESIGN.md` — sfondo navy richiede un ring bianco, non lo stesso usato altrove su sfondo chiaro)

### Story 8.2: Onboarding e Autenticazione

As a nuovo Utente di qualunque Ruolo,
I want vedere le pagine di accesso/registrazione/import/precaricamento con l'identità visiva della società,
so that la prima impressione dell'app sia curata quanto il resto, non un modulo grezzo.

**Acceptance Criteria:**

**Given** le pagine `/accedi`, `/registrati`, `/import-atlete`, `/precaricamento-allenatori`
**When** vengono visualizzate
**Then** applicano i token di colore/tipografia/spaziatura/forma di `DESIGN.md` (nessun colore hardcoded fuori da `var(--color-*)`) tramite un CSS module dedicato
**And** il comportamento (validazione, Server Action, redirect, messaggi di errore) resta identico a prima — nessuna regressione, suite Vitest invariata

### Story 8.3: Orari e Palestre

As a Allenatore, Atleta, Segreteria, Dirigente o Admin,
I want vedere le pagine di palestre/slot/orari con l'identità visiva della società,
so that consultare/gestire l'orario sia un'esperienza coerente col resto dell'app, specialmente da smartphone in palestra (NFR3).

**Acceptance Criteria:**

**Given** le pagine `/palestre`, `/slot`, `/orari`, `/mio-orario`
**When** vengono visualizzate
**Then** applicano i token di `DESIGN.md` tramite un CSS module dedicato
**And** `/mio-orario` segue il mockup key-screen già approvato (`ux-designs/ux-societa-manager-2026-07-22/mockups/key-mio-orario.html`)
**And** il comportamento resta identico a prima — nessuna regressione, suite Vitest invariata

### Story 8.4: Presenze

As a Allenatore o Atleta,
I want vedere le pagine di registrazione/storico presenze con l'identità visiva della società,
so that il Key Flow più usato dell'app (registrazione presenze a fine allenamento) sia curato quanto gli altri.

**Acceptance Criteria:**

**Given** le pagine `/presenze`, `/storico-presenze`
**When** vengono visualizzate
**Then** applicano i token di `DESIGN.md` tramite un CSS module dedicato
**And** `/presenze` segue il mockup key-screen già approvato (`ux-designs/ux-societa-manager-2026-07-22/mockups/key-presenze.html`)
**And** il comportamento (salvataggio esplicito, alert certificato scaduto non bloccante FR-15) resta identico a prima — nessuna regressione, suite Vitest invariata

### Story 8.5: Certificati Medici

As a Genitore, Atleta, Allenatore, Dirigente o Segreteria,
I want vedere le pagine legate al certificato medico con l'identità visiva della società,
so that un flusso che riguarda dati sanitari sensibili trasmetta la stessa cura del resto dell'app.

**Acceptance Criteria:**

**Given** le pagine `/certificato-medico`, `/conferma-certificati`, `/notifiche`
**When** vengono visualizzate
**Then** applicano i token di `DESIGN.md` tramite un CSS module dedicato
**And** `/certificato-medico` segue il mockup key-screen già approvato (`ux-designs/ux-societa-manager-2026-07-22/mockups/key-certificato-medico.html`)
**And** il comportamento resta identico a prima — nessuna regressione, suite Vitest invariata

### Story 8.6: Gruppi, Dati Atleta e Iscrizioni

As a Admin, Dirigente, Allenatore o Atleta,
I want vedere le pagine di gestione Gruppi, dati fisici, wizard nuova stagione e conferma iscrizioni con l'identità visiva della società,
so that anche le pagine più recenti (Epic 6) rimaste allo stile precedente siano allineate al resto.

**Acceptance Criteria:**

**Given** le pagine `/gruppi`, `/wizard-nuova-stagione`, `/dati-fisici`, `/conferma-iscrizioni`
**When** vengono visualizzate
**Then** applicano i token di `DESIGN.md` tramite un CSS module dedicato (per `/dati-fisici`, coerente con `GraficoMisurazione.module.css` già esistente da Story 6.2)
**And** il comportamento resta identico a prima — nessuna regressione, suite Vitest invariata

### Story 8.7: Amministrazione, Configurazione e Pagine Condivise

As a Admin,
I want vedere le pagine di amministrazione utenti/configurazione, oltre alla home e alla pagina di accesso negato, con l'identità visiva della società,
so that anche le pagine a minor traffico (solo-Admin, di sistema) siano coerenti col resto dell'app.

**Acceptance Criteria:**

**Given** le pagine `/admin`, `/smtp`, `/logo`, la home (`/`) e `/non-autorizzato`
**When** vengono visualizzate
**Then** applicano i token di `DESIGN.md` tramite un CSS module dedicato
**And** il comportamento resta identico a prima — nessuna regressione, suite Vitest invariata

**Note:** ultima storia dell'epic — priorità visiva più bassa (pagine solo-Admin o di sistema, traffico minore rispetto alle altre).

## Epic 9: Miglioramenti Post-Rilascio

*(Aggiunto in corso d'opera — 2026-07-25, vedi Epic List sopra. A differenza degli epic precedenti, l'elenco delle storie resta aperto: si aggiungono una alla volta man mano che emergono dalla verifica dal vivo in produzione, invece di essere definite tutte in anticipo.)*

### Story 9.1: Pulsante di logoff

As a Utente autenticato di qualunque Ruolo,
I want un pulsante per terminare la sessione visibile nella barra di navigazione,
so that posso uscire dal mio account in modo esplicito, specialmente su un dispositivo condiviso (es. un tablet in palestra usato da più Allenatori).

**Note aggiuntive:** lacuna scoperta dall'utente in produzione (2026-07-25) — `app/NavBar.tsx` (Story 8.1) non ha mai incluso un modo per terminare la sessione. `supabase.auth.signOut()` è già usato nel codice, ma solo internamente (`app/(auth)/accedi/actions.ts`, quando un account risulta disattivato dopo il login) — nessuna Server Action/pulsante lo espone all'Utente.

**Acceptance Criteria:**

**Given** un Utente autenticato con una sessione attiva
**When** visualizza la barra di navigazione
**Then** vede un pulsante/voce "Esci" (coerente con i token di `DESIGN.md`, stesso trattamento delle altre voci di `app/NavBar.tsx`)

**Given** l'Utente clicca il pulsante di logoff
**When** l'azione viene eseguita
**Then** la sessione Supabase Auth viene terminata (cookie invalidati) e l'Utente viene rediretto a `/accedi`

**Given** l'Utente ha appena effettuato il logoff
**When** tenta di raggiungere una pagina protetta (URL diretto o pulsante "indietro" del browser)
**Then** il Proxy (`middleware.ts`) lo rediretta a `/accedi` come qualunque Utente non autenticato — nessun accesso residuo tramite cache del browser

### Story 9.2: Navigazione responsive — hamburger su mobile, barra laterale verticale su desktop

As a Utente autenticato di qualunque Ruolo,
I want su schermo stretto le voci di navigazione raccolte dietro un pulsante hamburger, e su desktop una barra laterale verticale a sinistra invece della barra orizzontale attuale,
so that la navigazione non occupi spazio prezioso su mobile (niente scorrimento orizzontale) e su desktop sia più simile alle applicazioni gestionali che uso di solito, con più voci leggibili in verticale senza dover scorrere.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-25, integrata dopo una prima versione che manteneva la barra orizzontale su desktop). **Attenzione — inverte una decisione UX precedente su ENTRAMBI i punti**: `EXPERIENCE.md` (riga 69) specifica esplicitamente *"Nessuna barra laterale o drawer complesso: la navigazione è una singola barra orizzontale... Nessuno stack modale a più di un livello"*, decisione poi implementata fedelmente in Story 8.1 (`app/NavBar.tsx`, `.voci` con `overflow-x: auto` per lo scorrimento orizzontale su schermi stretti, mai una barra laterale). Questa storia sostituisce deliberatamente quella scelta sia su mobile (hamburger/drawer) sia su desktop (barra laterale) — va aggiornato anche `EXPERIENCE.md` per non lasciare il documento di riferimento in contraddizione col comportamento reale (stesso principio già seguito per altre correzioni di rotta di questo progetto, es. Epic 7/8). **Assunzione da confermare in fase di sviluppo** (non specificata esplicitamente dall'utente): la barra laterale su desktop è sempre visibile/aperta, senza bisogno di un pulsante per aprirla/chiuderla — a differenza del comportamento mobile, dove serve l'hamburger per fare spazio al contenuto.

**Acceptance Criteria:**

**Given** un Utente autenticato su schermo stretto (mobile/tablet, il caso che motiva questa storia)
**When** visualizza l'app
**Then** la barra superiore mostra solo logo/nome del settore e un pulsante hamburger — le voci di navigazione (incluso il pulsante di logoff, Story 9.1) sono nascoste finché non lo apre

**Given** l'Utente clicca/tocca il pulsante hamburger
**When** il menu si apre
**Then** vede l'elenco delle voci a cui il suo Ruolo ha accesso (stessa fonte `lib/auth/voci-navigazione.ts` già in uso, nessuna lista duplicata), inclusa la voce attiva evidenziata come oggi

**Given** il menu e' aperto
**When** l'Utente seleziona una voce, o tocca fuori dal menu, o preme Esc
**Then** il menu si chiude (nessuno stack di più livelli aperti insieme — vincolo ereditato da `EXPERIENCE.md`, unica parte di quella riga non invertita da questa storia)

**Given** la navigazione da tastiera
**When** il focus raggiunge il pulsante hamburger e poi le voci del menu aperto
**Then** l'ordine di tabulazione è logico e ogni elemento mostra il contorno di focus (`{colors.focus-ring-on-navy}`, coerente con Story 8.1)

**Given** uno schermo largo (desktop, sopra il breakpoint scelto in fase di sviluppo della storia)
**When** l'Utente visualizza l'app
**Then** vede una barra laterale verticale a sinistra (sempre visibile, non un hamburger) con le stesse voci/logo/nome del settore/pulsante di logoff, e il contenuto della pagina occupa lo spazio restante a destra

**Given** l'Utente su desktop naviga tra pagine diverse
**When** la pagina cambia
**Then** la barra laterale resta fissa/visibile (nessun ricaricamento visibile della barra stessa, coerente con l'esperienza di un'app gestionale)

### Story 9.3: Riquadro con larghezza massima per le pagine-form

As a Utente di qualunque Ruolo,
I want che le pagine il cui contenuto principale è un form autonomo (non una tabella/lista) siano racchiuse in un riquadro di larghezza massima, come già fatto per `/accedi`,
so that su schermo largo non debba percorrere con lo sguardo campi stirati da un bordo all'altro della finestra.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-25), stesso principio già applicato a `/accedi` (vedi `.pagina`/`.riquadro` in `accedi.module.css`, introdotti durante la correzione del logo/nome-settore) — questa storia lo estende come pattern di design system riusabile (nuova voce in `DESIGN.md`, nessuna esisteva finora per la larghezza massima di un contenitore) a tutte le altre pagine con lo stesso problema. Verificato dal vivo che `<main>` non ha mai un vincolo di larghezza in nessuna pagina (nessun wrapper nel root layout, vedi `app/layout.tsx`) — confermato almeno su `/registrati` e `/smtp` (stesso `<main>` grezzo), probabilmente su ogni altra pagina-form dell'app: l'elenco esatto va completato in fase di creazione della storia (stesso lavoro di inventario già fatto per l'Epic 8, questa volta per "pagina-form" invece che "pagina non ancora restylata"). **Esclude** le pagine il cui contenuto principale è una tabella/lista (es. `/admin`, `/gruppi`, `/palestre`) anche se contengono form secondari inline (es. riga di creazione in una tabella) — per quelle il riquadro stretto sarebbe controproducente, restano a piena larghezza.

**Acceptance Criteria:**

**Given** una pagina il cui contenuto principale è un form autonomo (es. `/registrati`, `/smtp`, `/logo`, elenco completo da confermare in fase di sviluppo)
**When** viene visualizzata su schermo largo
**Then** il form è racchiuso in un riquadro di larghezza massima centrato (stesso pattern `.pagina`/`.riquadro` di `/accedi`), non stirato a piena larghezza

**Given** la stessa pagina su schermo stretto (mobile/tablet)
**When** viene visualizzata
**Then** il riquadro occupa la larghezza disponibile con margine, senza scorrimento orizzontale (`width: 100%` + `max-width`, stesso comportamento già verificato su `/accedi`)

**And** il comportamento (validazione, Server Action, redirect, messaggi di errore) resta identico a prima — nessuna regressione, suite Vitest invariata (stesso vincolo delle storie di restyle puro dell'Epic 8)

### Story 9.4: Menu profilo con logoff e modifica password

As a Utente autenticato di qualunque Ruolo,
I want un menu profilo (icona/nome utente nella barra di navigazione) da cui accedere sia al logoff sia alla modifica della propria password,
so that ho un unico punto dove gestire il mio account, invece di un pulsante isolato, e posso cambiare la password senza dover chiedere aiuto all'Admin.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-25). **Sostituisce/estende la Story 9.1** (già `done`): il pulsante "Esci" isolato in `app/NavBar.tsx`/`app/NavBar.actions.ts` va spostato dentro questo nuovo menu, non duplicato — `esci()` (Server Action) resta riusabile invariata. **Nessuna funzionalità di modifica password esiste oggi in nessuna pagina dell'app** (verificato: nessun uso di `supabase.auth.updateUser()` nel codice) — questa storia introduce sia il menu sia la pagina/form di modifica password, due funzionalità distinte unite dallo stesso punto di accesso. Il meccanismo di modifica password più semplice con Supabase Auth è `supabase.auth.updateUser({ password })` sul client con la sessione dell'Utente corrente (nessuna verifica della password attuale richiesta da Supabase stesso) — **da decidere in fase di sviluppo** se richiedere comunque un secondo campo "conferma nuova password" lato form (validazione applicativa, non protezione reale) e se applicare una policy di lunghezza minima. **Interazione con Story 9.2** (barra laterale su desktop): il menu profilo va integrato in qualunque forma prenda la navigazione dopo quella storia — l'ordine di sviluppo consigliato è 9.2 prima di 9.4, per non ricostruire il posizionamento due volte.

**Acceptance Criteria:**

**Given** un Utente autenticato con una sessione attiva
**When** visualizza la barra di navigazione
**Then** vede un elemento "profilo" (icona o nome utente, non più il pulsante "Esci" isolato) che apre un menu al click/tocco

**Given** il menu profilo aperto
**When** l'Utente lo visualizza
**Then** contiene almeno due voci: "Modifica password" e "Esci"

**Given** l'Utente seleziona "Esci" dal menu profilo
**When** l'azione viene eseguita
**Then** il comportamento è identico a quello già validato in Story 9.1 (sessione terminata fail-closed, redirect a `/accedi`) — nessuna Server Action duplicata

**Given** l'Utente seleziona "Modifica password"
**When** inserisce una nuova password (e un campo di conferma, se deciso in sviluppo) e conferma
**Then** la password viene aggiornata (`supabase.auth.updateUser({ password })`) e l'Utente riceve conferma dell'avvenuta modifica, senza essere disconnesso

**Given** l'Utente inserisce una nuova password troppo corta o i due campi (se presenti) non coincidono
**When** invia il form
**Then** vede un messaggio di errore chiaro, nessuna chiamata a Supabase Auth (stesso pattern `{ error: { code, message } }` delle altre Server Action del progetto)

### Story 9.5: Campo Cognome per Allenatore (precaricamento)

As a Admin o Dirigente che precarica un Allenatore,
I want inserire anche il Cognome oltre a Nome e Codice Fiscale,
so that l'anagrafica Allenatore sia completa fin dal precaricamento, senza dover dedurre il cognome dal solo Codice Fiscale.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-25). Il model `Allenatore` (`prisma/schema.prisma`) ha oggi un solo campo `nome` (usato come nome completo in `app/(onboarding-import)/precaricamento-allenatori/`, Story 1.4) — nessun `cognome` esiste. Richiede una migrazione Prisma (nuovo campo, `Allenatore` non è protetta da RLS, AD-9 — via Prisma diretto, nessuna policy da aggiornare). **Osservazione emersa analizzando lo schema, non richiesta dall'utente**: anche il model `Atleta` ha oggi un solo campo `nome` (nessun `cognome`) — la stessa incoerenza esisterebbe fra le due entità se questa storia aggiungesse `cognome` solo per `Allenatore`; da valutare se estendere anche `Atleta` in una storia separata, o se sia una scelta accettata (fuori perimetro di questa richiesta). **Impatto da mappare in fase di sviluppo**: ogni punto che mostra `allenatore.nome` (es. `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx`, `app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx`) va verificato per capire se mostrare "Nome Cognome" concatenato o lasciare invariato.

**Acceptance Criteria:**

**Given** la pagina `/precaricamento-allenatori`
**When** un Admin o Dirigente compila il form
**Then** vede un campo "Cognome" obbligatorio, oltre ai due campi già esistenti (Nome, Codice Fiscale)

**Given** il form inviato senza Cognome
**When** la Server Action `precaricaAllenatore` lo valida
**Then** restituisce un errore di validazione, stesso pattern dei controlli già esistenti su Nome/Codice Fiscale vuoti

**Given** un Allenatore precaricato con successo
**When** viene salvato
**Then** il Cognome è persistito sul nuovo campo `Allenatore.cognome`, non concatenato dentro `nome`

**And** ogni pagina esistente che mostra il nome di un Allenatore continua a funzionare senza errori (nessuna regressione, suite Vitest invariata) — la decisione su cosa mostrare esattamente (solo nome, o "Nome Cognome") va presa in fase di sviluppo

### Story 9.6: Geolocalizzazione Palestre

As a Utente di qualunque Ruolo che deve raggiungere una Palestra,
I want che l'app mi permetta di navigare direttamente verso la Palestra con Maps,
so that non devo cercare a mano l'indirizzo in un'altra app.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-25). Il model `Palestra` (`prisma/schema.prisma`) ha oggi solo `nome`/`indirizzo` (testo libero), nessuna coordinata. **Da decidere in fase di sviluppo**: (a) se basta un link "Naviga" che apre Google/Apple Maps con una ricerca sul testo di `indirizzo` già esistente (nessun nuovo campo, nessuna geocodifica, soluzione più semplice e coerente con NFR6 - nessun servizio esterno a pagamento), oppure (b) se serve un campo coordinate dedicato (lat/lon) impostato a mano dall'Admin/Dirigente in fase di creazione/modifica Palestra (piu' preciso, ma richiede una migrazione e un modo per l'Admin di ottenere le coordinate, es. incollando un link Google Maps). **Collegamento con la nuova Epic "Gestione Partite/Campionati"** (vedi sotto): quella richiede geolocalizzazione anche per le partite in trasferta, che potrebbero non corrispondere a una Palestra già censita in questo progetto — il meccanismo scelto qui va progettato tenendo conto di quel riuso, o esplicitamente limitato alle sole Palestre proprie con una nota sul gap per le trasferte.

**Acceptance Criteria:**

**Given** una Palestra con posizione impostata (indirizzo o coordinate, a seconda della scelta di sviluppo)
**When** un Utente qualunque la visualizza (es. in `/palestre`, `/slot`, `/orari`, `/mio-orario`)
**Then** vede un link/pulsante "Naviga" che apre l'app Maps del dispositivo (Google Maps su Android, sceglie fra le app disponibili su iOS/desktop) puntato su quella posizione

**Given** un Admin o Dirigente che crea/modifica una Palestra
**When** compila il form
**Then** può impostare la posizione (nuovo campo se scelta l'opzione (b) sopra, altrimenti riusa l'indirizzo già esistente)

**Given** una Palestra senza posizione impostata
**When** viene visualizzata
**Then** nessun link "Naviga" rotto/vuoto viene mostrato (stesso principio guard-clause già usato per il logo, Story 7.2)

**Estensione post-done (2026-07-27), su feedback utente dal vivo:** la prima implementazione (opzione (a), solo link "Naviga" di ricerca testuale sull'`indirizzo`) non soddisfa la richiesta reale — l'utente vuole poter **scegliere la posizione da Google Maps** e **vederla** dentro l'app, non solo aprire un link esterno. Opzione (c) scelta (via/senza selettore mappa interattivo, che richiederebbe Google Maps JavaScript API con account di fatturazione, contro NFR6): l'Admin/Dirigente incolla un **link di condivisione Google Maps** in un nuovo campo del form Palestra; il server ne estrae latitudine/longitudine (nuove colonne `Palestra.latitudine`/`longitudine`, nullable — la tabella ha già righe reali, nessun `NOT NULL` possibile) e le persiste. **Solo in `/palestre`** (non in `/slot`, `/orari`, `/mio-orario`) compare anche una **mappa incorporata** (iframe `output=embed`, nessuna chiave API, gratuito) centrata sulla posizione. Se non è ancora stato incollato alcun link, l'app continua a funzionare con il solo `indirizzo` testuale (link "Naviga" di ricerca testuale come prima, mappa incorporata basata sulla stessa ricerca testuale) — mai una Palestra senza nulla da mostrare se ha almeno un `indirizzo`. Corretto anche un difetto minore introdotto dalla code review della prima versione: l'etichetta accessibile del link "Naviga" in `/slot`/`/orari`/`/mio-orario` includeva il nome del Campo ("Naviga verso Palestra X - Campo Y"), fuorviante perché la posizione riguarda l'edificio (Palestra), non il singolo campo da gioco al suo interno — tolto, resta solo il nome della Palestra.

**Acceptance Criteria aggiunti (estensione):**

**Given** un Admin o Dirigente che crea/modifica una Palestra incolla un link di condivisione Google Maps nel nuovo campo dedicato
**When** salva
**Then** l'app estrae latitudine/longitudine da quel link e le persiste su `Palestra.latitudine`/`Palestra.longitudine`

**Given** il testo incollato non è un link Google Maps riconoscibile (nessuna posizione estraibile)
**When** l'Admin/Dirigente salva
**Then** vede un errore di validazione chiaro, nessuna scrittura (stesso pattern `{ error: { code: "VALIDATION", message } }` delle altre Server Action)

**Given** una Palestra con latitudine/longitudine salvate
**When** viene visualizzata in `/palestre`
**Then** l'Admin/Dirigente vede una mappa incorporata (iframe, nessuna chiave API) centrata su quella posizione, oltre al link "Naviga" (ora basato sulle coordinate precise, non più solo sulla ricerca testuale)

**Given** una Palestra ha solo l'`indirizzo` testuale (nessun link Maps ancora incollato)
**When** viene visualizzata in `/palestre`
**Then** vede comunque una mappa incorporata basata sulla ricerca testuale dell'indirizzo — nessuna mappa mancante se esiste almeno l'indirizzo

**Given** `/slot`, `/orari`, `/mio-orario`
**When** una Palestra ha coordinate precise
**Then** il link "Naviga" punta alle coordinate (più preciso), senza alcuna mappa incorporata in queste pagine — solo `/palestre` la mostra

**And** l'etichetta accessibile del link "Naviga" fa riferimento solo al nome della Palestra, mai al Campo

### Story 9.7: Barra laterale ancora visibile dopo il logoff

As a Utente che effettua il logoff,
I want che la barra di navigazione (laterale su desktop, drawer/hamburger su mobile) sparisca insieme al resto della pagina quando atterro su `/accedi`,
so that non veda un menu di navigazione residuo per una sessione che non esiste più.

**Note aggiuntive:** segnalato dall'utente (2026-07-26), osservato dal vivo dopo l'introduzione della barra laterale persistente di Story 9.2: subito dopo aver eseguito `esci()` (Server Action di logoff, `app/NavBar.actions.ts`, Story 9.1) e essere atterrati su `/accedi`, la barra laterale resta visibile a sinistra invece di sparire insieme al resto della pagina (che invece cambia correttamente, mostrando il form di login). `app/NavBar.tsx` già ritorna `null` quando non c'è sessione (`if (!user) return null` — AC di Story 8.1/9.2), quindi il bug è quasi certamente un problema di invalidazione della cache di navigazione lato client di Next.js dopo il `redirect()` di una Server Action (il layout radice, di cui `NavBar` fa parte, potrebbe non essere ri-richiesto al server e mostrare l'ultimo output noto invece di quello aggiornato) — non una lacuna nella logica del componente stesso, ma **da confermare/investigare in fase di sviluppo**, non assumere la causa a priori. Distinto dal problema già catalogato in `deferred-work.md` per Story 9.1 (tasto "indietro" del browser dopo il logoff, bfcache): quello riguarda la navigazione all'indietro, questo la navigazione in avanti causata dal logoff stesso.

**Acceptance Criteria:**

**Given** un Utente autenticato con la barra laterale (desktop) visibile
**When** esegue il logoff dal pulsante "Esci"
**Then** atterra su `/accedi` e la barra laterale non è più visibile in nessun momento (nessun lampo/flash della barra prima che sparisca)

**Given** lo stesso scenario su schermo stretto (drawer/hamburger invece di barra laterale fissa, Story 9.2)
**When** il logoff viene eseguito
**Then** anche il drawer/hamburger di navigazione sparisce insieme al resto della pagina precedente

**And** nessuna regressione sul comportamento di logoff già esistente (Story 9.1): redirect a `/accedi`, sessione terminata lato Supabase, fail-closed in caso di errore

### Story 9.9: Gestione Allenatori precaricati (vista, modifica, cancellazione)

As a Admin,
I want vedere l'elenco di tutti gli Allenatori (precaricati e già registrati), poterne modificare Nome/Cognome/Codice Fiscale, e cancellare quelli inseriti per errore,
so that posso correggere un precaricamento sbagliato (es. Codice Fiscale digitato male, doppione) senza dover intervenire manualmente sul database.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-27). Oggi `/precaricamento-allenatori` (Story 1.4, campo Cognome aggiunto da Story 9.5) mostra solo il form di creazione — nessun elenco degli Allenatori già inseriti, nessun modo di correggerli o rimuoverli dalla UI. **Vincolo architetturale importante**: in tutto questo progetto nessuna entità viene mai cancellata realmente — il pattern esistente per "rimuovere" qualcosa è un flag booleano tipo `attivo` con azioni disattiva/riattiva (`Utente.attivo`, Story 1.2); l'unico uso di `.delete()`/`deleteMany()` nel codice riguarda righe di giunzione (`UtenteRuolo`, `GruppoVisibileDirigente`), mai un record di dominio reale. Cancellare fisicamente un `Allenatore` (`prisma.allenatore.delete`) avrebbe due conseguenze silenziose per via delle FK esistenti in `prisma/schema.prisma`: (a) `GruppoAllenatore.allenatoreId` ha `onDelete: Cascade` — cancellare l'Allenatore rimuoverebbe silenziosamente ogni sua assegnazione a un Gruppo; (b) se l'Allenatore è già agganciato a un account (`utenteId` non nullo, cioè si è già registrato), cancellarlo disconnetterebbe silenziosamente quell'Utente dal proprio profilo Allenatore, senza alcun avviso. **Decisione da prendere in fase di sviluppo** (raccomandazione, non ancora validata con l'utente): permettere la cancellazione libera solo per Allenatori non ancora agganciati (`utenteId` nullo — il caso reale "l'ho inserito per errore") e non assegnati a nessun Gruppo; bloccarla con un messaggio esplicativo negli altri casi, invece di introdurre in questa storia il primo hard-delete di un'entità di dominio del progetto senza alcuna rete di sicurezza. **Ruolo**: stesso perimetro già usato da `precaricaAllenatore` (ADMIN e DIRIGENTE, non solo ADMIN) salvo diversa indicazione — "lato admin" nella richiesta dell'utente da confermare se significa "area di amministrazione" (come oggi) o "solo Ruolo ADMIN, escluso Dirigente".

**Acceptance Criteria:**

**Given** la pagina `/precaricamento-allenatori`
**When** un Admin o Dirigente la visualizza
**Then** vede, oltre al form di creazione già esistente, un elenco di tutti gli Allenatori esistenti con Nome, Cognome, Codice Fiscale e se sono già agganciati a un account oppure ancora solo precaricati

**Given** un Admin o Dirigente modifica Nome, Cognome o Codice Fiscale di un Allenatore dall'elenco
**When** salva
**Then** i nuovi valori vengono persistiti, con la stessa validazione già usata per il precaricamento (campi obbligatori, Codice Fiscale nel formato valido e non duplicato su un altro Allenatore)

**Given** un Allenatore non ancora agganciato a nessun account e non assegnato a nessun Gruppo
**When** un Admin o Dirigente lo cancella
**Then** l'Allenatore viene rimosso dall'elenco

**Given** un Allenatore già agganciato a un account e/o assegnato a uno o più Gruppi
**When** un Admin o Dirigente tenta di cancellarlo
**Then** l'operazione è impedita con un messaggio che ne spiega il motivo (nessuna cancellazione silenziosa che romperebbe un aggancio o un'assegnazione esistente)

**And** il comportamento esistente del form di precaricamento (Story 1.4/9.5) resta identico — nessuna regressione, suite Vitest invariata

### Story 9.10: La voce di navigazione attiva non si aggiorna durante la navigazione

As a Utente autenticato che naviga tra le pagine dell'app,
I want che la voce evidenziata nella barra di navigazione (laterale su desktop, drawer su mobile) rifletta sempre la pagina che sto effettivamente visitando,
so that ho sempre un riferimento visivo corretto di dove mi trovo nell'app.

**Note aggiuntive:** segnalato dall'utente (2026-07-27), osservato dal vivo: la voce evidenziata resta ferma sulla prima pagina visitata (es. "Palestre") anche navigando altrove con i link della barra stessa. **Causa probabile, collegata alla stessa causa già confermata per Story 9.7**: `app/NavBar.tsx` (Server Component) calcola quale voce è "attiva" leggendo il pathname lato server (`pathname === voce.href`, header `x-pathname` impostato dal Proxy) e passa il risultato già calcolato (`vociConStato`) a `NavBarClient.tsx`. Se il layout radice (dove `<NavBar/>` è montato) resta nella Client Cache del router e non viene ri-eseguito ad ogni normale navigazione tra pagine con lo stesso layout (comportamento Next.js documentato, vedi Story 9.7 Dev Notes), la voce attiva calcolata lato server non si aggiorna mai dopo il primo caricamento — a differenza di Story 9.7 (dove il problema si manifesta solo dopo il logoff), qui accade ad **ogni** navigazione normale. `NavBarClient.tsx` legge già `usePathname()` lato client (riga 60, oggi usato solo per chiudere il drawer al cambio pagina) — potrebbe essere la base per calcolare la voce attiva direttamente lì invece che riceverla già calcolata dal server, rendendo l'evidenziazione indipendente dalla cache del layout. **Da confermare/decidere in fase di sviluppo**, non assumere la soluzione a priori.

**Acceptance Criteria:**

**Given** un Utente autenticato su una qualunque pagina dell'app
**When** clicca una voce diversa della barra di navigazione
**Then** la voce appena selezionata diventa quella evidenziata come attiva, quella precedente non lo è più

**Given** l'Utente naviga con il pulsante "indietro"/"avanti" del browser
**When** la pagina cambia
**Then** la voce attiva riflette comunque la pagina effettivamente visualizzata

**And** nessuna regressione sul resto del comportamento della barra di navigazione (apertura/chiusura drawer mobile, menu profilo, logoff) — stesso vincolo di test invariati delle altre storie di questo epic

### Story 9.13: Modifica e cancellazione di uno Slot già inserito

As a Admin o Dirigente,
I want poter modificare o cancellare uno Slot già inserito nell'orario,
so that posso correggere un giorno/orario/palestra sbagliato o rimuovere uno slot che non serve più, senza dover intervenire manualmente sul database.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-29). Oggi (`/slot`, Story 2.5) esiste solo `creaSlot` (`app/(orari-palestre)/slot/actions.ts`) — nessuna modifica/cancellazione una volta inserito. `Slot` ha `presenze Presenza[]` come relazione inversa (Story 3.1): cancellare uno Slot con Presenze già registrate solleva la stessa domanda già affrontata in Story 9.9 per `Allenatore` — verificare innanzitutto l'`onDelete` effettivo della FK `Presenza.slotId` (se `Cascade`, una cancellazione libera spazzerebbe via silenziosamente lo storico presenze di quello slot). **Decisione da prendere in fase di sviluppo** (raccomandazione, non ancora validata con l'utente, stesso principio già usato per Allenatore in Story 9.9): permettere la cancellazione libera solo se lo Slot non ha Presenze registrate, bloccarla con un messaggio esplicativo altrimenti.

**Acceptance Criteria:**

**Given** uno Slot esistente
**When** un Admin o Dirigente lo modifica (giorno, ora inizio/fine, campo, gruppo)
**Then** le modifiche vengono salvate con la stessa validazione già usata in creazione (formato ora HH:MM, ora fine successiva a ora inizio, campi obbligatori)

**Given** uno Slot senza Presenze registrate
**When** un Admin o Dirigente lo cancella
**Then** lo Slot viene rimosso dall'elenco

**Given** uno Slot con una o più Presenze già registrate
**When** un Admin o Dirigente tenta di cancellarlo
**Then** l'operazione è impedita con un messaggio esplicito (nessuna perdita silenziosa dello storico presenze) — comportamento da confermare in fase di sviluppo, stesso principio già stabilito per Allenatore in Story 9.9

**And** nessuna regressione sul comportamento esistente di creazione Slot (Story 2.5) — suite Vitest invariata, stesso perimetro di Ruoli (ADMIN/DIRIGENTE) di `creaSlot`

### Story 9.14: Rimozione di un'Atleta da un Gruppo

As a Admin o Dirigente,
I want poter rimuovere un'Atleta da un Gruppo a cui è stata assegnata per errore,
so that posso correggere un'assegnazione sbagliata senza dover intervenire manualmente sul database.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-29). Oggi (`/gruppi`, Story 2.4) esiste solo `assegnaAtleta` (`app/(gruppi-allenatori)/gruppi/actions.ts`) — nessuna azione di rimozione. `GruppoAtleta` è una tabella di giunzione pura (`@@unique([atletaId, annoAgonisticoId])`, un'Atleta sta in un solo Gruppo per stagione, nessuna riga dipendente collegata) — rimuoverla è sicuro, stesso principio già stabilito per le altre tabelle di giunzione del progetto (`UtenteRuolo`, `GruppoVisibileDirigente`): **non** introduce il problema di hard-delete di un'entità di dominio già affrontato in Story 9.9 per `Allenatore` (qui non si cancella l'Atleta, solo il suo collegamento al Gruppo).

**Acceptance Criteria:**

**Given** un'Atleta assegnata a un Gruppo
**When** un Admin o Dirigente la rimuove dall'elenco delle Atlete di quel Gruppo
**Then** l'assegnazione viene rimossa (riga `GruppoAtleta` cancellata) — l'Atleta resta nell'anagrafica e può essere riassegnata a un altro Gruppo nella stessa stagione

**And** nessuna regressione sul comportamento esistente di assegnazione Atleta a Gruppo (Story 2.4) — suite Vitest invariata, stesso perimetro di Ruoli (ADMIN/DIRIGENTE) di `assegnaAtleta`

### Story 9.15: Assegnazione Atlete al proprio Gruppo da parte dell'Allenatore

As a Allenatore assegnato a un Gruppo,
I want poter caricare in autonomia le Atlete sul mio Gruppo, senza passare da un Admin/Dirigente,
so that non devo aspettare l'intervento di qualcun altro per completare la composizione della mia squadra.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-29). Oggi `assegnaAtleta` (`app/(gruppi-allenatori)/gruppi/actions.ts`, Story 2.4) richiede `requireRuolo(["ADMIN", "DIRIGENTE"])` — un Allenatore non può assegnare Atlete al proprio Gruppo, nemmeno al Gruppo che gestisce lui stesso (`GruppoAllenatore`). Stesso principio di autorizzazione a due livelli già stabilito in Epic 10 (Story 10.1/10.2, `risolviAutorizzazioneGruppo`): un Allenatore deve poter agire solo sul **proprio** Gruppo (verificato tramite `GruppoAllenatore`), Admin/Dirigente restano ad accesso ampio su tutti i Gruppi come oggi.

**Acceptance Criteria:**

**Given** un Allenatore assegnato a un Gruppo (tramite `GruppoAllenatore`)
**When** assegna un'Atleta a quel Gruppo
**Then** l'assegnazione viene salvata, stessa validazione già esistente in `assegnaAtleta` (Story 2.4)

**Given** un Allenatore che non gestisce un dato Gruppo
**When** tenta di assegnargli un'Atleta
**Then** l'operazione viene rifiutata

**Given** un Admin o Dirigente
**When** assegna un'Atleta a un Gruppo
**Then** può farlo per qualunque Gruppo, non solo quelli gestiti da un Allenatore specifico — comportamento invariato

**And** nessuna regressione sul comportamento esistente di assegnazione Atleta a Gruppo (Story 2.4) — suite Vitest invariata

### Story 9.16: Parametri standard per i dati fisici delle Atlete

As a Allenatore o Atleta,
I want poter inserire rapidamente le misurazioni fisiche più comuni (peso, altezza, reach a una mano, reach a due mani, salto con rincorsa, salto a muro) senza dover scrivere ogni volta tipo/unità di misura a mano,
so that l'inserimento sia più veloce e i dati restino confrontabili nel tempo (stesso "tipo" testuale usato in ogni misurazione).

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-29). Oggi (`/dati-fisici`, Story 6.1) `MisurazioneAtleta` è già un modello generico (`tipo: String` libero, `valore: Float`, `unitaMisura: String`, `data: String`) — **nessuna migrazione necessaria** per aggiungere parametri "standard", si tratta di un miglioramento del form (`MisurazioneForm.tsx`) che oggi richiede di scrivere tipo/unità a mano ogni volta. Parametri richiesti dall'utente: peso, altezza, reach a una mano, reach a due mani, salto con rincorsa (tre misurazioni), salto a muro (tre misurazioni) — mantenendo la possibilità di inserire un tipo libero ("altro") come oggi, esplicitamente richiesto dall'utente. **Decisione da prendere in fase di sviluppo (non ancora chiarita con l'utente)**: salto con rincorsa/salto a muro richiedono "tre misurazioni" ciascuno — chiarire se vadano salvate come tre righe `MisurazioneAtleta` distinte (stesso tipo, stessa data, tre valori) mostrando poi il migliore/la media nello storico/grafico (Story 6.2), o se serva un meccanismo diverso — non presumere la risposta.

**Acceptance Criteria:**

**Given** un Allenatore o un'Atleta sulla pagina `/dati-fisici`
**When** compila il form di inserimento
**Then** può scegliere rapidamente tra i parametri standard (peso, altezza, reach a una mano, reach a due mani, salto con rincorsa, salto a muro) con l'unità di misura già precompilata per ciascuno, invece di doverla scrivere a mano

**Given** lo stesso form
**When** vuole registrare un parametro non standard
**Then** può ancora inserire un tipo libero con la propria unità di misura, esattamente come oggi (nessuna regressione)

**Given** un test "salto con rincorsa" o "salto a muro" (tre misurazioni)
**When** registrato
**Then** tutte e tre le misurazioni vengono salvate e visibili nello storico — dettaglio esatto di come (tre righe distinte, media, migliore) da definire in fase di sviluppo

**And** la data resta un campo obbligatorio per ogni misurazione, come oggi

**And** nessuna regressione sul comportamento esistente di inserimento/visualizzazione misurazioni (Story 6.1/6.2) — suite Vitest invariata

### Story 9.17: Vista griglia mensile delle presenze per Gruppo (lato Allenatore)

As a Allenatore,
I want vedere le presenze del mio Gruppo in una griglia mensile (Atlete sulle righe, giorni del mese sulle colonne),
so that posso vedere a colpo d'occhio le presenze di tutta la squadra in un mese, invece di controllare un'Atleta alla volta.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-29) sulla sezione "Storico delle mie Atlete" di `/storico-presenze` (Story 3.2/3.3, `app/(presenze)/storico-presenze/page.tsx`) — oggi mostra lo storico cronologico di **una** Atleta alla volta (select Atleta + tabella Data/Giorno/Orario/Gruppo/Presenza, `StoricoTable`). La nuova vista è per **Gruppo** (non per singola Atleta) e per **mese** (non l'intero storico): una griglia con una riga per Atleta del Gruppo e una colonna per ogni giorno del mese, cella con indicatore presente/assente. La sezione "Il mio storico" (vista Atleta/Genitore, stessa pagina) **non è in scope** qui, resta invariata. **Da chiarire in fase di sviluppo, non presumere**: questa griglia sostituisce la sezione "Storico delle mie Atlete" esistente (select singola Atleta) o si aggiunge come vista alternativa? La richiesta dell'utente ("fix lista presenza... layout griglia") suggerisce una sostituzione, ma va confermato prima di rimuovere la vista esistente. Riuso naturale: `leggiStoricoPresenzePerAtleta` (`lib/db-rls/presenza.ts`) filtra già per `atletaId` con RLS che scopa automaticamente l'Allenatore alle proprie Atlete/Gruppi (`allenatore_proprio_gruppo_select`, Story 3.1) — la query per la griglia dovrà estendere quel filtro a un intervallo di date (il mese) e a più Atlete contemporaneamente (quelle del Gruppo scelto), non necessariamente riusando la funzione esistente invariata.

**Acceptance Criteria:**

**Given** un Allenatore assegnato a uno o più Gruppi
**When** visita la nuova vista
**Then** può scegliere un Gruppo (tra quelli che gestisce) e un mese, e vede una griglia con le Atlete del Gruppo sulle righe e i giorni del mese sulle colonne

**Given** una cella della griglia corrispondente a un giorno in cui una Presenza è stata registrata per quella Atleta
**When** visualizzata
**Then** mostra un indicatore chiaro presente/assente

**Given** un giorno del mese in cui non è stata registrata alcuna Presenza per quella Atleta (nessuno Slot quel giorno, o presenza non ancora segnata)
**When** visualizzato
**Then** la cella è vuota/neutra, non un falso "assente"

**Given** un Allenatore che non gestisce un dato Gruppo
**When** tenta di vedere la griglia di quel Gruppo (manomissione dell'URL/form)
**Then** l'operazione è rifiutata, stesso principio di autorizzazione già stabilito per `/presenze` (Story 3.1)

**And** nessuna regressione sulla sezione "Il mio storico" (vista Atleta/Genitore, Story 3.2) — suite Vitest invariata

### Story 9.18: Creazione di una nuova Atleta da parte dell'Allenatore

As a Allenatore assegnato a un Gruppo,
I want poter inserire una nuova Atleta che non trovo nell'elenco, direttamente dalla pagina del mio Gruppo,
so that non devo aspettare che la Segreteria la registri altrove prima di poterla aggiungere alla squadra.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-30). Dati richiesti dall'utente: Cognome, Nome, data di nascita, Codice Fiscale (obbligatori); email e cellulare (opzionali, per comunicazioni). Punti tecnici emersi in analisi:
- **AD-10 esteso**: oggi (onboarding-import) è l'unico proprietario dichiarato della creazione dei campi identitari di Atleta (`lib/db-rls/atleta.ts`, `creaAtleta`). Chiesto esplicitamente all'utente se allargare questo confine o mantenere la creazione formalmente dentro (onboarding-import): risposta → estendere AD-10, il form resta sulla pagina del Gruppo (gruppi-allenatori) e la nuova Server Action richiama la stessa `creaAtleta()` condivisa (nessuna duplicazione della logica di creazione).
- **`nome`**: Atleta non ha una colonna `cognome` separata (a differenza di Allenatore, Story 9.5) — tutta l'anagrafica esistente (import federale, Story 1.2) salva "Cognome e Nome" concatenato in un'unica colonna `nome`. Il nuovo form mostra Cognome e Nome come due campi separati (migliore UX/validazione) ma li concatena nello stesso formato prima di scrivere su `nome`, per restare coerente con i dati già esistenti.
- **`sesso`**: colonna obbligatoria (NOT NULL) su Atleta, non presente nell'elenco di campi richiesto dall'utente. Il Codice Fiscale la codifica deterministicamente (giorno di nascita +40 per il sesso femminile) — va derivata dal Codice Fiscale con una nuova funzione di decodifica in `lib/matching-codice-fiscale/` (oggi esiste solo la validazione di formato, `isCodiceFiscaleValido`, nessuna logica di decodifica).
- **Notifica alla Segreteria**: il modello `Notifica` esistente (Story 4.2) è oggi a scopo singolo (`{id, atletaId, createdAt}`, pagina `/notifiche` mostra sempre "Nuovo certificato caricato per..."). Riusarlo senza modifiche mostrerebbe un messaggio falso per questo nuovo evento. Serve una nuova colonna `tipo` (enum, default `CERTIFICATO_CARICATO` per compatibilità con le righe esistenti, nuovo valore `NUOVO_ATLETA`) e la pagina `/notifiche` deve mostrare un testo diverso in base al tipo.
- **Codice Fiscale duplicato**: `Atleta.codiceFiscale` è già `@unique` — un tentativo di inserire un Codice Fiscale già esistente in anagrafica deve essere rifiutato con un messaggio chiaro (l'Atleta esiste già, non va duplicata), non un errore generico di vincolo DB.
- Assegnazione automatica: la nuova Atleta viene creata e assegnata contestualmente al Gruppo dell'Allenatore per l'Anno Agonistico corrente (stesso principio di risoluzione stagione già usato in `assegnaAtleta`, Story 2.4/9.15) — nessun passaggio manuale successivo di assegnazione.

**Acceptance Criteria:**

**Given** un Allenatore sulla pagina del proprio Gruppo, che non trova un'Atleta nell'elenco esistente
**When** apre il form "nuova Atleta" e compila Cognome, Nome, data di nascita, Codice Fiscale (obbligatori) ed eventualmente email e/o cellulare (opzionali)
**Then** una nuova Atleta viene creata (con `sesso` derivato dal Codice Fiscale) e assegnata automaticamente al Gruppo dell'Allenatore per la stagione corrente

**Given** lo stesso form
**When** il Codice Fiscale inserito non rispetta il formato valido, oppure appartiene a un'Atleta già esistente in anagrafica
**Then** l'inserimento viene rifiutato con un messaggio chiaro, nessuna Atleta duplicata viene creata

**Given** una nuova Atleta creata da un Allenatore con questo flusso
**When** l'inserimento va a buon fine
**Then** viene generata una notifica visibile alla Segreteria (e Admin/Dirigente) nella pagina `/notifiche`, con un testo che indica chiaramente che si tratta di una nuova Atleta (non di un certificato caricato) — nessuna regressione sulle notifiche esistenti di caricamento certificato (Story 4.2)

**Given** un Allenatore che non gestisce un dato Gruppo
**When** tenta di inserire una nuova Atleta su quel Gruppo (manomissione form/URL)
**Then** l'operazione viene rifiutata, stesso principio di autorizzazione già stabilito per `assegnaAtleta` (Story 9.15)

**And** nessuna regressione sul comportamento esistente di creazione Atleta da Onboarding-Import (Story 1.2) né di assegnazione Atleta a Gruppo (Story 2.4/9.15) — suite Vitest invariata

### Story 9.19: Badge "certificato in scadenza" nell'elenco Atlete di Gruppo e in Vista Dirigente

As a Allenatore, Admin/Dirigente,
I want vedere subito quali Atlete di un Gruppo hanno il certificato medico in scadenza entro un mese, ovunque sia mostrato l'elenco delle Atlete del Gruppo (o un suo riepilogo aggregato),
so that posso sollecitare per tempo il rinnovo senza dover controllare atleta per atleta.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-31), emersa durante la review di Story 9.17. Perimetro deciso con l'utente: solo `/gruppi` (Admin/Dirigente), `/i-miei-gruppi` (Allenatore, Story 9.15) e `/vista-dirigente` (Story 5.1/5.2, il "riepilogo" — già mostra un conteggio aggregato "in scadenza" per Gruppo, non ancora i nomi) — escluse deliberatamente le altre pagine che citano nomi di Atlete (roster `/presenze`, select `/dati-fisici`, `/conferma-iscrizioni`, `/conferma-certificati`, griglia `/storico-presenze`). Il progetto ha già, in tre punti diversi, la stessa logica "giorni alla scadenza" con soglia di 30 giorni (`calcolaGiorniAScadenza`, Story 4.6, già riusata due volte cross-modulo) — questa storia la riusa una volta di più (nessuna nuova soglia/funzione di calcolo da zero) e riusa il pattern di drill-down già esistente in `/vista-dirigente` (Story 5.1 AC #6) per il secondo bucket "in scadenza".

**Acceptance Criteria:**

**Given** un Allenatore o un Admin/Dirigente sulla pagina `/i-miei-gruppi` o `/gruppi`
**When** visualizza l'elenco delle Atlete assegnate a un Gruppo
**Then** ogni Atleta con il certificato medico che scade tra 0 e 30 giorni da oggi mostra un badge "Certificato in scadenza" accanto al nome (stesso stile del badge "Certificato scaduto" già esistente in `/presenze`, variante warning)

**Given** un'Atleta senza certificato, con certificato scaduto, o con certificato in regola (oltre 30 giorni)
**When** visualizzata nello stesso elenco
**Then** nessun badge "in scadenza" viene mostrato

**Given** un Dirigente sulla pagina `/vista-dirigente`
**When** visualizza la card di un Gruppo con almeno un'Atleta "in scadenza"
**Then** lo stat-tile "in scadenza" diventa cliccabile/espandibile e mostra i nomi delle Atlete in scadenza, stesso identico pattern del drill-down "scaduto" già esistente (Story 5.1 AC #6)

**And** nessuna regressione sul comportamento esistente di `/gruppi`, `/i-miei-gruppi`, `/vista-dirigente` (Story 2.4/9.9/9.14/9.15/5.1/5.2) — suite Vitest invariata

### Story 9.20: Data del nuovo certificato già in fase di caricamento

As a Genitore/Atleta che carica un nuovo Certificato medico,
I want poter indicare già in fase di caricamento la data (presumibilmente inizio/fine validità) del nuovo certificato,
so that il sistema conosce subito la scadenza corretta, invece di aspettare che la Segreteria/Admin/Dirigente la inserisca manualmente in un secondo momento tramite conferma.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-08-01), emersa durante la creazione di Story 9.19. Oggi (Story 4.1) `caricaCertificato` (`app/(certificati-medici)/certificato-medico/actions.ts`) accetta solo il file — `collegaFileCertificato` imposta lo stato `IN_ATTESA` senza toccare `dataFineValidita` (resta quella precedente, o `null` al primo upload); la data viene inserita solo in seguito da Segreteria/Admin/Dirigente tramite `confermaCertificato` (Story 4.4). Richiesta dell'utente: aggiungere un campo data al form di upload stesso lato Genitore/Atleta, così il certificato risulta con la data corretta fin da subito — resta comunque necessaria una conferma esplicita lato Dirigente/Admin (`stato` `CONFERMATO`) prima che il certificato sia trattato come valido/in regola nei conteggi e badge esistenti (`categorizzaStatoCertificato`, Story 5.1; `certificato-scaduto.ts`, Story 4.5). Decisioni di dettaglio non ancora chiarite con l'utente, da affrontare in fase di creazione storia: quali campi esatti (solo data fine validità, o anche data inizio come già previsto dal modello `dataInizioValidita`?), se il form deve validare la coerenza tra le date, se la Segreteria/Admin/Dirigente in fase di conferma può ancora correggere la data inserita dal Genitore/Atleta (probabile sì, stesso principio di `confermaCertificato` oggi) o deve solo confermarla invariata.

**Acceptance Criteria:** *(da affinare in fase di creazione storia)*

**Given** un Genitore/Atleta che carica un nuovo Certificato medico
**When** compila il form di upload
**Then** oltre al file può indicare la data di scadenza (ed eventualmente di inizio validità) del nuovo certificato, salvata insieme al file con stato `IN_ATTESA` (invariato)

**Given** un certificato caricato con la nuova data indicata dall'utente
**When** Segreteria/Admin/Dirigente lo rivede nel flusso di conferma esistente (Story 4.4)
**Then** la data proposta è già precompilata/visibile, la conferma resta un passaggio esplicito separato (nessuna auto-conferma all'upload)

**And** nessuna regressione sul comportamento esistente di caricamento (Story 4.1), conferma (Story 4.4) e calcolo stato certificato (Story 4.5/4.6/5.1) — suite Vitest invariata

### Story 9.21: Un'Atleta in più Gruppi contemporaneamente (investigazione impatto)

As a Allenatore/Dirigente,
I want poter assegnare un'Atleta a più di un Gruppo nella stessa stagione (es. Under 16 e anche Under 19, "aggregata" a una categoria superiore),
so that il sistema rispecchi un caso reale del volley giovanile, oggi non gestibile.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-08-01), emersa discutendo la Story 10.6/10.7. **Oggi non è possibile**: `GruppoAtleta` ha un vincolo di unicità a livello di database su `(atletaId, annoAgonisticoId)` (`prisma/schema.prisma`) — un'Atleta sta in un solo Gruppo per stagione; `assegnaAtleta` (Story 2.4/9.15) sposta l'assegnazione esistente invece di aggiungerne una seconda.

**Impatto atteso, da confermare in fase di analisi — questa è una storia di investigazione, non ancora di implementazione**: il presupposto "un'Atleta → un Gruppo" è tessuto in gran parte del progetto, non solo nella tabella di giunzione:
- **Presenze** (`/presenze`, Story 3.1): il roster di uno Slot è oggi "le Atlete del Gruppo dello Slot" — con più Gruppi, un'Atleta dovrebbe comparire nel roster di più Slot/Gruppi diversi, potenzialmente con più Slot nello stesso giorno/ora da gestire.
- **Storico presenze** (`/storico-presenze`, Story 3.2/9.17): la griglia mensile è per Gruppo — un'Atleta in più Gruppi avrebbe più righe/storie da consultare, non un'unica vista.
- **Dati fisici** (`/dati-fisici`, Story 6.1/9.16): l'elenco "le mie Atlete" per un Allenatore dovrebbe includere le Atlete di tutti i suoi Gruppi, già oggi possibile per Allenatori con più Gruppi — ma un'Atleta condivisa tra due Allenatori di Gruppi diversi comparirebbe nell'elenco di entrambi, da confermare se voluto.
- **Vista Dirigente** (`/vista-dirigente`, Story 5.1/5.2) e **badge certificato in scadenza** (Story 9.19): i conteggi per Gruppo (es. "3 in scadenza") conterebbero la stessa Atleta più volte se assegnata a più Gruppi — comportamento da decidere esplicitamente (conteggio duplicato voluto, o deduplica per Atleta a livello di intero club).
- **Wizard nuova stagione** (Story 5.3/8.7): la copia delle assegnazioni Gruppo↔Atleta dalla stagione precedente andrebbe estesa a copiare tutte le righe, non una sola per Atleta.

**Acceptance Criteria:** *(nessuno ancora — questa storia è un'investigazione: l'obiettivo del primo passaggio è produrre un elenco completo e confermato con l'utente di tutti i moduli impattati e le decisioni di comportamento da prendere, prima di scrivere qualunque AC implementativo)*

## Epic 10: Gestione Partite e Campionati

*(Aggiunto in corso d'opera — 2026-07-25, richiesta estesa dell'utente. Analisi completata e rotta in storie il 2026-07-28 all'avvio dello sviluppo, come esplicitamente richiesto dall'utente al momento dell'aggiunta ("fai l'analisi e genera le storie non appena inizi con lo sviluppo"). Le domande aperte identificate durante la cattura iniziale dei requisiti sono state risolte con l'utente prima di scrivere le storie sotto — vedi "Decisioni prese" in fondo a questa sezione.)*

**Requisiti originali (testo dell'utente, 2026-07-25):** nuova entità Campionato (un Gruppo può parteciparvi a più di uno contemporaneamente), l'Allenatore crea Campionati per il proprio Gruppo, import Excel delle gare (un file per squadra/campionato), vista partite settimana per settimana, modifica della singola partita (giorno/ora/palestra), visibilità per Atlete (proprio Gruppo) e Genitori (propria figlia, stesso aggancio di Story 1.5), navigazione Maps verso il luogo di gioco.

### Story 10.1: Creazione di un Campionato per un Gruppo

As a Allenatore del proprio Gruppo (o Admin/Dirigente per qualunque Gruppo),
I want creare un nuovo Campionato e collegarlo a uno o più Gruppi,
so that posso poi importare/gestire le partite di quella competizione per la mia squadra.

**Note aggiuntive:** relazione molti-a-molti Gruppo↔Campionato (un Gruppo può partecipare a più Campionati contemporaneamente, es. campionato + coppa; un Campionato può in teoria essere condiviso da più Gruppi/categorie, anche se nella pratica ogni girone federale è tipicamente specifico di una singola squadra). Un Campionato è legato a un Anno Agonistico (stesso principio di Gruppo, AD-8) — non ha senso far sopravvivere un Campionato al cambio di stagione.

**Acceptance Criteria:**

**Given** un Allenatore agganciato al proprio Gruppo
**When** crea un nuovo Campionato (nome) per quel Gruppo
**Then** il Campionato viene creato, associato all'Anno Agonistico corrente, e collegato al Gruppo

**Given** un Campionato già esistente (creato da un altro Allenatore/Admin per un altro Gruppo)
**When** un Allenatore vuole iscrivere il proprio Gruppo alla stessa competizione
**Then** può collegare il proprio Gruppo a un Campionato esistente scegliendolo da un elenco, invece di crearne uno duplicato con lo stesso nome

**Given** un Admin o Dirigente
**When** crea/collega un Campionato
**Then** può farlo per qualunque Gruppo, non solo i propri (stesso pattern di accesso ampio già usato per la gestione dei Gruppi, Story 2.2)

**Given** un Allenatore che non gestisce un dato Gruppo
**When** tenta di creare/collegare un Campionato per quel Gruppo
**Then** l'operazione viene rifiutata

### Story 10.2: Import Excel delle partite di un Campionato

As a Allenatore del Gruppo iscritto a un Campionato (o Admin/Dirigente),
I want caricare un file Excel con tutte le gare della propria squadra in quel Campionato,
so that non devo inserire manualmente ogni partita una per una.

**Note aggiuntive:** formato reale fornito dall'utente (`_bmad/resources/Gare.xls`, esportazione FIPAV/Lega Pallavolo, 20 righe di un intero girone di andata-ritorno). Colonne attese: `Campionato, Gara N, Giornata, Data, Ora, SquadraCasa, SquadraOspite, Risultato, Parziali, StatoDescrizione, Impianto, IndirizzoImpianto`. `Data` in formato gg/mm/aaaa (stessa normalizzazione già applicata all'import federale Atlete, Story 1.3). `Gara N` è l'identificativo federale univoco della gara — chiave naturale per un re-import idempotente (ricaricare lo stesso file per aggiornare risultati di giornate più recenti aggiorna le righe esistenti, non le duplica). `Impianto`/`IndirizzoImpianto` sono presenti su OGNI riga, incluse le partite in casa (l'export federale non distingue "nostro impianto" da "impianto avversario") — nessuna necessità di un'entità "luogo" dedicata o di riuso di `Palestra`: l'indirizzo importato è testo libero, usato direttamente dal meccanismo di navigazione Maps già esistente (`lib/link-naviga-palestra.ts`, Story 9.6 — già generico su `{ indirizzo }`, non specifico di `Palestra`, riusabile invariato). L'import avviene nel contesto di un Gruppo+Campionato già collegati (Story 10.1) — la colonna `Campionato` nel file serve come controllo di coerenza, non per creare/scegliere il Campionato.

**Acceptance Criteria:**

**Given** un Allenatore (o Admin/Dirigente) su un Campionato a cui il proprio Gruppo è iscritto
**When** carica un file Excel con le colonne attese
**Then** tutte le righe vengono importate come Partite collegate a quel Campionato e a quel Gruppo

**Given** un file con una riga il cui `Gara N` corrisponde a una Partita già importata in precedenza
**When** il file viene ricaricato (es. per aggiornare i risultati di giornate nel frattempo disputate)
**Then** la Partita esistente viene aggiornata sul posto, non duplicata

**Given** un file con colonne mancanti o un formato non riconosciuto
**When** caricato
**Then** l'import viene rifiutato con un messaggio di errore chiaro, nessuna Partita parzialmente importata

**Given** un import riuscito
**When** completato
**Then** viene mostrato un riepilogo (N create, M aggiornate) — stesso pattern già usato per l'import Atlete (Story 1.3)

### Story 10.3: Vista partite settimana per settimana (Allenatore, Dirigente, Admin)

As a Allenatore, Dirigente o Admin,
I want vedere le partite organizzate settimana per settimana,
so that posso pianificare la presenza a bordo campo e le trasferte.

**Acceptance Criteria:**

**Given** un Allenatore, Dirigente o Admin
**When** visita la pagina Partite
**Then** vede le partite raggruppate per settimana, con giorno/ora/avversario/luogo per ciascuna

**Given** una Partita con indirizzo disponibile
**When** visualizzata
**Then** mostra un pulsante "Naviga" (stesso meccanismo/link di Story 9.6, riuso invariato)

**Given** un Allenatore
**When** visita la pagina
**Then** vede solo le partite dei propri Gruppi — Admin/Dirigente vedono le partite di tutti i Gruppi

**Given** una settimana senza partite
**When** visualizzata
**Then** mostra un messaggio esplicito ("nessuna partita questa settimana"), non una sezione vuota silenziosa

### Story 10.4: Modifica di una singola partita

As a Allenatore del Gruppo (o Admin/Dirigente),
I want modificare giorno, ora e luogo di una singola partita,
so that posso correggere un rinvio o un cambio di programma comunicato dalla federazione.

**Acceptance Criteria:**

**Given** una Partita esistente
**When** l'Allenatore (del proprio Gruppo) o un Admin/Dirigente la modifica (data, ora, impianto, indirizzo)
**Then** le modifiche vengono salvate

**Given** un Allenatore che non gestisce il Gruppo a cui appartiene una Partita
**When** tenta di modificarla
**Then** l'operazione viene rifiutata

**And** nessuna modifica ai campi identitari della gara (`Gara N`, Campionato, squadre) — solo giorno/ora/luogo, come esplicitamente richiesto

### Story 10.5: Vista partite per Atleta e Genitore

As a Atleta o Genitore,
I want vedere le partite del proprio Gruppo/della propria figlia,
so that so quando e dove si gioca, con indicazioni per raggiungere il luogo.

**Acceptance Criteria:**

**Given** un'Atleta
**When** visita la vista partite
**Then** vede le partite di tutti i Campionati a cui il proprio Gruppo partecipa

**Given** un Genitore
**When** visita la vista partite
**Then** vede le partite del Gruppo della propria figlia (stesso aggancio Genitore↔Atleta già esistente, AD-10/Story 1.5)

**Given** una Partita con indirizzo
**When** visualizzata
**Then** mostra lo stesso pulsante "Naviga" già disponibile per Allenatore/Dirigente/Admin (Story 10.3)

**Given** un'Atleta o un Genitore
**When** visita la pagina
**Then** non ha alcuna possibilità di modifica (sola lettura, a differenza di Allenatore/Admin/Dirigente)

**Decisioni prese con l'utente (2026-07-28), in risposta alle domande aperte della cattura iniziale:**
- **Formato Excel**: file di riferimento reale fornito (`_bmad/resources/Gare.xls`) — vedi Story 10.2.
- **Luogo delle trasferte**: l'indirizzo è già una colonna del file Excel importato (`IndirizzoImpianto`, presente su ogni riga) — nessuna nuova entità "luogo"/riuso di `Palestra` per gli avversari, il pulsante "Naviga" (Story 9.6) va reso disponibile anche lato Atleta/Genitore, non solo Allenatore/Dirigente/Admin.
- **Autorizzazione**: Allenatore del proprio Gruppo + Admin/Dirigente ad accesso ampio su tutti i Gruppi — stesso pattern già usato per la gestione dei Gruppi (Story 2.2), qui esteso per includere anche l'Allenatore come gestore dei propri Campionati/Partite (a differenza della gestione Gruppi, oggi riservata a soli Admin/Dirigente).
- **RLS**: `Campionato`/`Partita` sono dato **strutturale** (non RLS), stesso trattamento di `Gruppo`/`Slot` (AD-9) — non riguardano dati sanitari/personali.
- **Anno Agonistico**: `Campionato` ha una FK diretta verso `AnnoAgonistico` (come `Gruppo`, AD-8) — un Campionato non sopravvive al cambio di stagione.

### Story 10.6: Cancellazione di una Partita o di un Campionato

As a Allenatore del Gruppo (o Admin/Dirigente),
I want poter cancellare una singola Partita inserita per errore, o cancellare un intero Campionato con le sue Partite importate,
so that posso correggere un import sbagliato o di test senza lasciare dati sporchi a sistema — oggi (Story 10.1/10.2) non esiste alcuna funzionalità di cancellazione per Campionato/Partita, solo creazione/import/aggiornamento.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-08-01), emersa mentre chiedeva come ripulire i dati di un import Excel di test. Oggi l'import (`importaGare`, Story 10.2) è idempotente sulle righe (ricaricare lo stesso file aggiorna, non duplica) ma non esiste alcun modo — né per Allenatore né per Admin/Dirigente — di rimuovere una Partita o un Campionato dall'app stessa.

**Dipendenza: richiede Story 10.7 già completata.** Il dubbio originale di questa storia (cancellare l'intero Campionato è rischioso se condiviso tra più Gruppi, `GruppoCampionato` molti-a-molti) è stato risolto dall'utente (2026-08-01): un Campionato appartiene a un solo Gruppo per definizione di dominio (due squadre nello stesso girone federale sono due Campionati distinti a sistema, es. "U19 Girone 1"/"U19 Girone 2"). Story 10.7 corregge il modello dati di conseguenza — **questa storia va implementata dopo la 10.7**, non prima: solo allora cancellare un Campionato è sempre sicuro (nessun altro Gruppo può esserne proprietario).

**Acceptance Criteria:** *(da affinare in fase di creazione storia)*

**Given** un Allenatore del Gruppo (o Admin/Dirigente) su una Partita esistente
**When** la cancella
**Then** la Partita viene rimossa, stessa autorizzazione a due livelli già stabilita per la modifica (Story 10.4)

**Given** un Allenatore del Gruppo (o Admin/Dirigente) su un proprio Campionato (dopo Story 10.7, un Campionato ha sempre un solo Gruppo proprietario)
**When** lo cancella
**Then** il Campionato e tutte le sue Partite vengono rimossi (cascata semplice, nessun rischio di impattare altri Gruppi)

**And** stessa conferma esplicita (`window.confirm` o equivalente) già richiesta per altre cancellazioni distruttive del progetto (Slot/Allenatore/Atleta, Story 9.9/9.13/9.14)

### Story 10.7: Il Campionato appartiene a un solo Gruppo (rimozione della condivisione)

As a Allenatore/Admin/Dirigente che gestisce i Campionati del proprio Gruppo,
I want che ogni Campionato appartenga esclusivamente al Gruppo che lo ha creato,
so that il modello rispecchi la realtà federale: due squadre della stessa società nello stesso girone (es. "U19 Girone 1") sono due iscrizioni distinte, non la stessa iscrizione condivisa.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-08-01), emersa discutendo la Story 10.6. **Corregge una decisione presa in Story 10.1** ("`GruppoCampionato` tabella di giunzione molti-a-molti — un Campionato può essere condiviso da più Gruppi", commento esplicito in `prisma/schema.prisma`) che non rispecchia il dominio reale secondo l'utente: un Gruppo partecipa solo ai propri Campionati; se due Gruppi della stessa società giocano nello stesso girone, restano comunque due Campionati distinti a sistema (stesso nome possibile, ma due righe). Resta invece confermato **senza modifiche** che un Gruppo può partecipare a più Campionati contemporaneamente (già supportato oggi, Story 10.1 AC #5) — la relazione molti-a-molti va quindi ristretta a "molti Campionati per Gruppo", non "molti Gruppi per Campionato".

**Decisione presa con l'utente (2026-08-01)**: rimuovere anche la funzionalità "Collega Campionato esistente" (`collegaCampionatoEsistente`, `CollegaCampionatoForm.tsx` in `/campionati`) — pensata apposta per condividere un Campionato tra Gruppi, non ha più senso d'uso con il modello 1:1.

**Acceptance Criteria:** *(da affinare in fase di creazione storia — punti da decidere: come trattare a livello di migrazione gli eventuali `GruppoCampionato` con più di un Gruppo già esistenti a sistema, se rari/assenti in produzione; se rimuovere del tutto la tabella `GruppoCampionato` sostituendola con un `gruppoId` diretto e obbligatorio su `Campionato`, o vietarne solo l'uso condiviso lasciando la tabella; conferma esplicita se due Campionati con lo stesso nome per Gruppi diversi devono restare permessi — oggi `creaCampionato` blocca solo i duplicati per nome *nello stesso Gruppo/stagione*, comportamento già corretto e da preservare)*

**Given** un Allenatore (o Admin/Dirigente) che vuole aggiungere un Campionato al proprio Gruppo
**When** visita `/campionati`
**Then** può solo creare un nuovo Campionato per il proprio Gruppo — nessuna opzione per collegarsi a un Campionato di un altro Gruppo

**And** nessuna regressione sulla possibilità di un Gruppo di partecipare a più Campionati contemporaneamente (Story 10.1 AC #5) né sull'import gare (Story 10.2) — suite Vitest invariata sui casi esistenti non impattati da questa correzione

## Epic 11: Bug di Produzione

*(Aggiunto in corso d'opera — 2026-07-27, su richiesta dell'utente. A differenza di Epic 9 (miglioramenti/richieste), questo epic raccoglie difetti reali osservati in produzione (log di errore, comportamento scorretto) — non nuove funzionalità. Elenco aperto come Epic 9: le storie vengono aggiunte una alla volta man mano che un bug viene segnalato, non definite tutte in anticipo. Ogni storia parte da un sintomo/evidenza osservata (log, screenshot, segnalazione utente), non da un requisito: la causa va confermata in fase di sviluppo prima di scrivere una patch, mai assunta a priori.)*

### Story 11.1: Errore interno al precaricamento Allenatore (POST /precaricamento-allenatori)

As a Admin o Dirigente che precarica un Allenatore,
I want che l'operazione vada a buon fine senza errori lato server,
so that posso completare il precaricamento in modo affidabile.

**Note aggiuntive:** segnalato dall'utente (2026-07-27) tramite un log di errore di produzione (Cloudflare Workers, `scriptName: societa-manager`, `requestId: a21da8b36ad04bdd`). Evidenza raccolta:
- `POST https://societa-manager.dmnet2000.workers.dev/precaricamento-allenatori`, `statusCode: 200` nonostante `level: error` — coerente con un errore catturato lato applicazione (non un errore HTTP) che ha comunque restituito una risposta normale.
- Il campo `message`/`error` del log è uno stack minificato (`worker.js:68008:19` ecc., frame come `Jr.handleRequestError`/`Jr.handleAndLogRequestError`) senza sourcemap — non identifica la riga di codice applicativo reale, solo che *qualcosa* ha sollevato un'eccezione durante la gestione della richiesta.

**Causa probabile ma NON confermata — da verificare in fase di sviluppo, non assumere**: questa rotta è la Server Action `precaricaAllenatore` (`app/(onboarding-import)/precaricamento-allenatori/actions.ts`), appena modificata da Story 9.5 per scrivere il nuovo campo `Allenatore.cognome` (`NOT NULL`, migrazione `prisma/migrations/20260727000000_add_cognome_allenatore`). Se la richiesta che ha generato questo log è arrivata in una finestra in cui il codice era già deployato ma la migrazione non ancora applicata al database di produzione (o viceversa), l'`INSERT` fallirebbe (colonna mancante o vincolo NOT NULL) — l'eccezione verrebbe presa dal `try/catch` già presente in `precaricaAllenatore` (che logga con `console.error(err)` e restituisce all'Utente il messaggio generico "Impossibile precaricare l'Allenatore. Riprova."), spiegando sia il `level: error` sia lo `statusCode: 200`. Da confermare: (a) se la migrazione risulta applicata in produzione ora, (b) riprodurre un precaricamento in produzione per vedere se l'errore persiste, (c) se possibile ottenere il testo/stack completo non minificato dell'errore originale (sourcemap Cloudflare) per una diagnosi certa invece che per deduzione.

**Acceptance Criteria:**

**Given** un Admin o Dirigente compila il form di precaricamento Allenatore con Nome, Cognome e Codice Fiscale validi
**When** invia il form
**Then** l'Allenatore viene creato con successo, nessun errore di livello `error` loggato lato server per quella richiesta

**Given** la causa reale viene identificata in fase di sviluppo
**When** viene corretta
**Then** la causa e la correzione vengono documentate in questa storia (per riconoscere la stessa classe di problema se si ripresenta, es. ordine deploy-codice/migrazione per le prossime storie con migrazione)

**Risolto (2026-07-27):** causa confermata — la migrazione `20260727000000_add_cognome_allenatore` (Story 9.5) non era stata applicata al database di produzione al momento del deploy del codice che la richiedeva. Risolto lanciando `prisma migrate deploy` sul DB di produzione; precaricamento riprovato con successo. Lezione: applicare la migrazione prima/contestualmente al deploy del codice, non dopo.

### Story 11.2: Errore 500 sulla pagina Palestre (GET /palestre)

As a Admin o Dirigente che visita `/palestre`,
I want che la pagina si carichi correttamente,
so that posso gestire le Palestre e i Campi.

**Note aggiuntive:** segnalato dall'utente (2026-07-27) tramite un log di produzione (Cloudflare Workers, `requestId: a21e2b57ba2fedc6`). Evidenza raccolta:
- `GET https://societa-manager.dmnet2000.workers.dev/palestre`, `statusCode: 500` — a differenza di Story 11.1 (`statusCode: 200`, errore catturato dentro una Server Action), qui l'errore non è gestito: `/palestre/page.tsx` non ha alcun `try/catch` attorno alla query Prisma, quindi un'eccezione lì si propaga come 500 vero e proprio.
- Stack minificato (`worker.js`, stessi frame generici `Jr.handleRequestError` ecc.) — stessa limitazione di diagnosi già incontrata in Story 11.1, nessuna riga di codice applicativo visibile.

**Causa probabile ma NON confermata — stessa classe di problema già risolta in Story 11.1, da verificare non assumere**: `/palestre` esegue `prisma.palestra.findMany(...)`, e lo schema `Palestra` è stato esteso da Story 9.6 (estensione) con `latitudine`/`longitudine` (migrazione `prisma/migrations/20260727010000_add_coordinate_palestra`). Se quella migrazione non fosse ancora applicata al database di produzione mentre il codice (e il Prisma Client rigenerato in fase di build, che include già le nuove colonne nello `SELECT`) è già live, la query fallirebbe con un errore Postgres "colonna inesistente" — non catturato da nessun `try/catch` in questa pagina (a differenza delle Server Action), risultando in un vero 500. Da confermare: verificare se questa migrazione risulta applicata in produzione, riprodurre la visita a `/palestre` dopo averla applicata.

**Acceptance Criteria:**

**Given** un Admin o Dirigente visita `/palestre`
**When** la pagina si carica
**Then** l'elenco delle Palestre viene mostrato correttamente, nessun errore 500

**Given** la causa reale viene identificata in fase di sviluppo
**When** viene corretta
**Then** la causa e la correzione vengono documentate in questa storia — se si confermasse ancora una volta un problema di ordine deploy-codice/migrazione (stessa classe di Story 11.1), valutare se serva un passo esplicito nel runbook di deploy (`docs/deploy-produzione.md`) per non ripetere lo stesso errore una terza volta

**Risolto (2026-07-27):** causa confermata — seconda occorrenza della stessa classe di problema di Story 11.1: la migrazione `20260727010000_add_coordinate_palestra` (Story 9.6 estensione) non era stata applicata al database di produzione al momento del deploy del codice che la richiedeva. Risolto lanciando `prisma migrate deploy` sul DB di produzione; `/palestre` riprovata con successo. Essendosi ripetuto due volte di fila, aggiunto un promemoria esplicito in `docs/deploy-produzione.md` (nuova Fase 3bis) per non ripeterlo una terza volta.

### Story 11.3: "Invalid login" sull'invio email (POST /smtp)

As a Admin che invia un'email di prova (o che si affida all'invio automatico, es. Story 4.3/4.6),
I want che l'invio funzioni con le credenziali SMTP configurate,
so that le email automatiche/di prova arrivino davvero a destinazione.

**Note aggiuntive:** segnalato dall'utente (2026-07-27) tramite un log di produzione (Cloudflare Workers, `requestId: a21ea0912943ba97`). Evidenza raccolta:
- `POST https://societa-manager.dmnet2000.workers.dev/smtp`, `statusCode: 200` — l'errore è catturato dal `try/catch` già esistente in `inviaEmailDiProva` (`app/(configurazione)/smtp/actions.ts`), che logga con `console.error(err)` e restituisce un messaggio generico all'Admin ("Impossibile inviare l'email di prova. Verifica i parametri.") — comportamento del codice già corretto, non un crash.
- Stack minificato ma **non generico questa volta**: `worker.js` mostra frame interni di Nodemailer/`smtp-connection` (`_actionAUTHComplete`, `_formatError`) e il messaggio letterale **"Invalid login"** — il messaggio standard SMTP quando il server di posta rifiuta le credenziali fornite (comando `AUTH` respinto).

**Causa probabile ma NON confermata — diversa classe dai bug precedenti (11.1/11.2), non un problema di migrazione**: analizzato `lib/email/invia-email.ts` e `lib/db-rls/configurazione-smtp.ts` — nessun difetto di codice individuato (la password viene salvata e passata a Nodemailer esattamente come inserita, con `.trim()` già applicato in `salvaConfigurazione`, nessuna trasformazione/troncamento in mezzo). Il sospetto più probabile è quindi **esterno**: credenziali sbagliate salvate nella configurazione (typo), oppure il provider di posta richiede una password specifica per app (es. Gmail/Outlook con verifica in due passaggi attivo non accettano la password normale dell'account via SMTP diretto). Da confermare in fase di sviluppo, non assumere quale delle due.

**Aggiornamento (2026-07-27)**: dopo aver corretto le credenziali, l'errore è avanzato — non più `AUTH` (login) ma **`MAIL FROM`** ("Mail command failed" nei frame `_actionMAIL` di Nodemailer/smtp-connection), cioè il server accetta il login ma rifiuta il comando successivo con l'indirizzo mittente. Causa probabile (non confermata): il campo "Indirizzo mittente" configurato non coincide con l'account SMTP autenticato ("Utente") — molti provider (Gmail, Outlook, ecc.) rifiutano di inviare "a nome di" un indirizzo diverso da quello con cui si è fatto login, a meno che non sia registrato come alias autorizzato presso il provider stesso.

**Acceptance Criteria:**

**Given** un Admin invia un'email di prova con credenziali SMTP corrette e accettate dal provider
**When** l'invio viene eseguito
**Then** l'email arriva a destinazione, nessun errore `AUTH`/`Invalid login`

**Given** la causa reale viene identificata in fase di sviluppo (credenziali errate salvate vs. limitazione del provider)
**When** viene corretta o chiarita
**Then** la causa e la correzione (o le istruzioni per l'Admin, se la causa è una password per-app da generare presso il provider) vengono documentate in questa storia

**Risolto (2026-07-27):** causa confermata — entrambe le ipotesi erano corrette in sequenza: prima le credenziali SMTP salvate erano sbagliate (`AUTH`/"Invalid login"), poi, dopo averle corrette, l'"Indirizzo mittente" configurato era diverso dall'account SMTP autenticato ("Utente"), causando il rifiuto del comando `MAIL FROM`. Nessun difetto di codice: entrambe cause di configurazione, corrette dall'utente direttamente in `/smtp`. Email di prova inviata con successo.
