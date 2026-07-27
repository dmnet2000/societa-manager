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

## Epic 10: Gestione Partite e Campionati

*(Aggiunto in corso d'opera — 2026-07-25, richiesta estesa dell'utente. A differenza di Epic 9 (miglioramenti puntuali), questo è un epic sostanziale con nuove entità dati e superfici per più Ruoli — **l'analisi completa e la rottura in storie dettagliate sono deliberatamente rimandate all'avvio dello sviluppo di questo epic**, su richiesta esplicita dell'utente ("fai l'analisi e genera le storie non appena inizi con lo sviluppo"). Quanto segue è la cattura fedele dei requisiti così come dettati, non ancora elaborata in Acceptance Criteria/storie.)*

**Requisiti raccolti (testo dell'utente, 2026-07-25):**

- Nuova entità **Campionato**: un Gruppo (squadra) può partecipare a **più Campionati contemporaneamente** (relazione molti-a-molti Gruppo↔Campionato, non uno-a-uno).
- L'**Allenatore** può creare un nuovo Campionato per il proprio Gruppo.
- L'Allenatore può **caricare tramite file Excel** tutte le gare (partite) di un Campionato per la propria squadra — un file per squadra/campionato, non un import unico multi-squadra (da confermare in fase di analisi).
- Vista partite **settimana per settimana**.
- Possibilità di **modificare la singola partita**: giorno, ora, palestra.
- Le **Atlete** vedono nell'app le partite dei Campionati a cui il proprio Gruppo partecipa.
- I **Genitori** vedono le partite delle proprie figlie (stesso meccanismo di aggancio Genitore↔Atleta già esistente, AD-10/Story 1.5).
- **Geolocalizzazione** per navigare con Maps verso il luogo della partita (vedi Story 9.6 sopra per il meccanismo base — qui si aggiunge il caso delle trasferte, dove il luogo potrebbe non essere una Palestra propria già censita).

**Domande aperte da affrontare in fase di analisi (non richieste esplicitamente, emerse leggendo i requisiti):**
- Formato/colonne attese del file Excel di import (nessun esempio fornito finora — stesso tipo di gap già colmato nell'Epic 1 per l'import federale Atlete, Story 1.3, con un file di riferimento reale).
- Le partite in trasferta (fuori dalle Palestre proprie) richiedono un modo di registrare luogo/indirizzo dell'avversario, non solo scegliere fra le Palestre già censite in questo progetto.
- Autorizzazione: solo l'Allenatore del proprio Gruppo può creare/modificare i Campionati e le partite di quel Gruppo? Dirigente/Admin hanno accesso più ampio (stesso pattern già visto altrove nel progetto, es. FR-7)?
- Le partite sono dato "strutturale" (non RLS, come Gruppo/Slot, AD-9) o "personale" (RLS, come Presenza/Iscrizione, AD-4)? Probabilmente strutturale (non riguarda dati sanitari/personali), ma va confermato esplicitamente seguendo lo stesso principio già stabilito per le altre entità.
- Relazione con l'Anno Agonistico (AD-8): un Campionato è legato a una stagione specifica?

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
