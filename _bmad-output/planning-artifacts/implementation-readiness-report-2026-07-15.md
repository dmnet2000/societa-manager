---
stepsCompleted: [step-01, step-02, step-03, step-04, step-05, step-06]
documentsIncluded:
  prd: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md
  architecture: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md
  epics: _bmad-output/planning-artifacts/epics.md
  ux: null
---

# Implementation Readiness Assessment Report

**Date:** 2026-07-15
**Project:** Gestione Settore Volley - Polisportiva

## PRD Analysis

### Functional Requirements

FR-1: Admin o Dirigente può creare/modificare una Palestra e i suoi Campi. Una Palestra ha 1 o più Campi; due Gruppi possono essere assegnati allo stesso orario sulla stessa Palestra se su Campi diversi.
FR-2: Admin o Dirigente può creare uno Slot (giorno, ora inizio/fine, Palestra, Campo, Gruppo) direttamente, senza calcolo automatico. Lo Slot resta fisso per l'intero Anno Agonistico una volta creato.
FR-3: L'Allenatore vede gli Slot dei propri Gruppi.
FR-4: L'Atleta vede gli Slot del proprio Gruppo.
FR-5: La Segreteria vede tutti gli Slot di tutte le Palestre/Gruppi. (Should — differito v1.1)
FR-6: Dirigente o Admin può creare un Gruppo per l'Anno Agonistico corrente.
FR-7: Dirigente o Admin può assegnare uno o più Allenatori a un Gruppo.
FR-8: L'Allenatore registra presenza/assenza di ogni Atleta del Gruppo per uno Slot svolto. La registrazione è possibile anche per Slot passati.
FR-9: Allenatore e Atleta possono consultare lo storico presenze della singola Atleta.
FR-10: Lo storico presenze mostra un indicatore di percentuale/trend, a supporto delle scelte di formazione. (Could — differito)
FR-11: Genitore o Atleta può caricare il file del Certificato Medico dall'app.
FR-12: Il sistema notifica automaticamente Allenatore e Dirigente del Gruppo quando un nuovo Certificato Medico viene caricato.
FR-13: Il sistema invia una mail alla Segreteria con il file del Certificato Medico allegato, all'upload.
FR-14: La Segreteria può confermare/validare un Certificato Medico caricato, aggiornandone lo stato a sistema. La Segreteria può anche inserire manualmente un Certificato Medico ricevuto fuori dall'app.
FR-15: Il sistema mostra un alert visivo quando il Certificato Medico di un'Atleta è scaduto. L'alert è puramente informativo: non impedisce mai la registrazione di una presenza (FR-8).
FR-16: Il sistema invia promemoria automatici a 30 e a 7 giorni dalla scadenza del Certificato Medico, verso Genitore, Atleta, Allenatore e Dirigente.
FR-17: La Segreteria può confermare l'Iscrizione di un'Atleta per l'Anno Agonistico corrente. Concetto indipendente dalla validità del tesseramento federale.
FR-18: Ogni ruolo (Allenatore, Atleta, Genitore, Segreteria, Dirigente, Admin) può registrarsi autonomamente nel sistema.
FR-19: Admin o Dirigente può importare l'export Excel del portale federale volley; il sistema riconosce le Atlete via Codice Fiscale. Le date nell'export (formato stringa gg/mm/aaaa) sono normalizzate in fase di parsing.
FR-20: Admin o Dirigente può precaricare un Allenatore con dati minimi (nome, Codice Fiscale) prima che si registri autonomamente.
FR-21: In fase di registrazione, il Genitore si aggancia a un'Atleta esistente inserendo il Codice Fiscale della figlia/o.
FR-22: All'import di un nuovo export, se la data del Certificato Medico nel file è più recente di quella già a sistema, il sistema aggiorna il dato; altrimenti mantiene quello esistente.
FR-23: Le Atlete Under 13 assenti dall'export (tesserino annuale non sempre presente) vengono comunque riportate di default nel nuovo Anno Agonistico, con possibilità di esclusione manuale da parte di Admin/Dirigente/Segreteria.
FR-24: Atleta o Allenatore può inserire/consultare misurazioni antropometriche e di test fisici nel tempo. (Should — differito v1.1)
FR-25: I dati di FR-24 sono visualizzati come grafico di progresso nel tempo. (Could — differito)
FR-26: L'Admin di sistema può creare, disattivare e assegnare ruoli agli utenti.
FR-27: L'Admin di sistema può configurare permessi granulari su chi vede i dati relativi ai Certificati Medici. (Should — differito v1.1) `[NOTE FOR PM]` rivalutare se anticipare a Must data la sensibilità dei dati sanitari di minorenni.
FR-28: Un wizard copia/adatta Gruppi e assegnazioni Allenatori dall'Anno Agonistico precedente come base per il nuovo. (Could — differito, dal secondo rollover in poi)
FR-29: Il Dirigente vede in un'unica vista i Gruppi, gli Slot assegnati e lo stato aggregato dei Certificati Medici per gruppo.

Total FRs: 29 (dal PRD)

### Non-Functional Requirements

NFR1: Sicurezza/Autenticazione — meccanismo base per ruolo. `[ASSUMPTION]` dettaglio (es. email+password) da confermare in architettura.
NFR2: Privacy dati sanitari — gestione "ragionevole" di base per i Certificati Medici (dati sensibili, spesso di minorenni). `[ASSUMPTION]` nessun vincolo di residenza/hosting dati indicato nel PRD; da approfondire in architettura data la natura del dato.
NFR3: Piattaforma — applicazione web, utilizzabile da smartphone in palestra con connessione dati normale — nessun requisito di funzionamento offline.
NFR4: Affidabilità — nessun requisito formale di uptime/SLA — progetto personale, non a produzione critica 24/7.
NFR5: Scala — fino a ~200 Atlete per il settore volley; l'eventuale estensione pluri-settore (~1500 Atlete) è solo un'indicazione di ordine di grandezza per l'architettura, non un requisito del v1.
NFR6: Vincolo di sviluppo — progetto personale, sviluppo in solitaria (con assistenza AI), nessun budget o hosting dedicato — orienta l'architettura verso stack e infrastruttura semplici ed economici, bassa complessità operativa.

Total NFRs: 6 (dal PRD)

### Additional Requirements

- Vincolo di consegna: la v1 deve essere pronta per il 1° agosto, avvio del prossimo Anno Agonistico (distinto dal meccanismo di rollover ricorrente).
- Non-Obiettivi espliciti: nessun algoritmo di assegnazione automatica slot-allenatore; nessun ruolo Gestore palestra/impianto o Medico sportivo/Staff sanitario; nessuna replica delle funzioni gestionali complete di Segreteria (pagamenti, iscrizioni federali); nessun tracciamento della Data Validità Tesseramento federale.
- Privacy: i Certificati Medici sono dati sanitari, in parte di minorenni — la conservazione merita attenzione dedicata in architettura oltre la gestione "base" assunta nel PRD.
- Domande aperte nel PRD: meccanismo di autenticazione definitivo; politica di hosting/conservazione dei dati sanitari; contenuto esatto del Wizard Nuova Stagione (FR-28); se/come introdurre un log di accesso/audit sui dati sanitari.

### PRD Completeness Assessment

Il PRD è complessivo (29 FR, 6 NFR, non-obiettivi espliciti, perimetro MVP con Must/Should/Could, glossario, 3 user journey) e già stato riconciliato con il brief/addendum di origine durante la sua finalizzazione. Nessuna assunzione irrisolta risulta bloccante: tutte sono esplicitamente rimandate all'architettura (che le ha effettivamente affrontate — vedi Architecture Analysis). Un solo gap è emerso successivamente, in fase di story-writing: manca un FR esplicito per "assegnare un'Atleta a un Gruppo" (colmato con FR-30, aggiunta in epics.md, vedi Epic Coverage Validation).

## Epic Coverage Validation

### Coverage Matrix

| FR Number | PRD Requirement (sintesi) | Epic Coverage | Status |
| --- | --- | --- | --- |
| FR-1 | Anagrafica Palestre e Campi | Epic 2, Story 2.1 | ✓ Covered |
| FR-2 | Caricamento Slot | Epic 2, Story 2.5 | ✓ Covered |
| FR-3 | Vista orario Allenatore | Epic 2, Story 2.6 | ✓ Covered |
| FR-4 | Vista orario Atleta | Epic 2, Story 2.7 | ✓ Covered |
| FR-5 | Vista orari trasversale Segreteria (Should) | Epic 2, Story 2.8 | ✓ Covered |
| FR-6 | Creazione Gruppi | Epic 2, Story 2.2 | ✓ Covered |
| FR-7 | Assegnazione Allenatori a Gruppo | Epic 2, Story 2.3 | ✓ Covered |
| FR-8 | Registrazione presenze | Epic 3, Story 3.1 | ✓ Covered |
| FR-9 | Storico presenze per Atleta | Epic 3, Story 3.2 | ✓ Covered |
| FR-10 | Storico presenze con trend (Could) | Epic 3, Story 3.3 | ✓ Covered |
| FR-11 | Upload certificato medico | Epic 4, Story 4.1 | ✓ Covered |
| FR-12 | Notifica automatica upload | Epic 4, Story 4.2 | ✓ Covered |
| FR-13 | Mail automatica alla Segreteria | Epic 4, Story 4.3 | ✓ Covered |
| FR-14 | Conferma/validazione certificato | Epic 4, Story 4.4 | ✓ Covered |
| FR-15 | Alert scadenza non bloccante | Epic 4, Story 4.5 | ✓ Covered |
| FR-16 | Promemoria scadenza | Epic 4, Story 4.6 | ✓ Covered |
| FR-17 | Conferma iscrizione | Epic 1, Story 1.6 | ✓ Covered |
| FR-18 | Registrazione autonoma per ruolo | Epic 1, Story 1.1 | ✓ Covered |
| FR-19 | Import archivio Atlete da export federale | Epic 1, Story 1.3 | ✓ Covered |
| FR-20 | Precaricamento Allenatori | Epic 1, Story 1.4 | ✓ Covered |
| FR-21 | Aggancio Genitore-Atleta | Epic 1, Story 1.5 | ✓ Covered |
| FR-22 | Merge certificato in import | Epic 1, Story 1.7 | ✓ Covered |
| FR-23 | Riporto Under 13 | Epic 1, Story 1.8 | ✓ Covered |
| FR-24 | Dati antropometrici e test fisici (Should) | Epic 6, Story 6.1 | ✓ Covered |
| FR-25 | Grafico progresso test fisici (Could) | Epic 6, Story 6.2 | ✓ Covered |
| FR-26 | Gestione utenti e ruoli | Epic 1, Story 1.2 | ✓ Covered |
| FR-27 | Permessi granulari su dati sanitari (Should) | Epic 5, Story 5.2 | ✓ Covered |
| FR-28 | Wizard nuova stagione (Could) | Epic 6, Story 6.3 | ✓ Covered |
| FR-29 | Vista d'insieme Dirigente | Epic 5, Story 5.1 | ✓ Covered |

### Missing Requirements

Nessuna. Tutti i 29 FR del PRD hanno una storia di copertura tracciabile.

**FR in epics.md ma non nel PRD originale:** FR-30 ("Dirigente o Admin può assegnare una o più Atlete a un Gruppo") — aggiunta durante la story-writing (Epic 2, Story 2.4) per colmare una lacuna reale del PRD: nessun FR copriva esplicitamente l'assegnazione Atleta→Gruppo, pur essendo presupposta dal Glossario e necessaria per FR-4 e FR-8. **Raccomandazione:** riportare FR-30 nel PRD stesso (aggiunta minore, stesso perimetro Must) per tenere PRD ed epics allineati — non blocca lo sviluppo, ma evita che il PRD resti disallineato dalla fonte di verità operativa.

### Coverage Statistics

- Total PRD FRs: 29
- FRs covered in epics: 29 (+1 aggiuntiva, FR-30, anch'essa coperta)
- Coverage percentage: 100%

## UX Alignment Assessment

### UX Document Status

Not Found.

### Alignment Issues

Non applicabile (nessun documento UX da allineare).

### Warnings

⚠️ **UX implicita ma assente.** Il PRD descrive esplicitamente un'applicazione web con interfacce per 6 ruoli distinti (viste orario, upload file, form di registrazione, dashboard aggregate) — UI/UX è chiaramente implicata, non opzionale. La sua assenza è però una **scelta esplicita e consapevole** dell'utente (si è passati direttamente da PRD ad Architettura, saltando `bmad-ux`), non una svista.

Impatto pratico: le storie in `epics.md` specificano il *comportamento* (Given/When/Then) ma non pattern di interazione, layout o stati d'errore/vuoti a livello di dettaglio — questo lavoro ricadrà sul developer/agente in fase di implementazione di ogni storia, storia per storia, invece che essere pre-deciso una volta in un documento UX dedicato. Per un progetto personale/hobby-scale con poche schermate per ruolo, è un compromesso ragionevole; se in corso d'opera emergesse la necessità di coerenza visiva tra ruoli o pattern di interazione complessi, resta disponibile `bmad-ux` in qualsiasi momento senza rework del PRD/epics già fatto.

## Epic Quality Review

Revisione rigorosa applicata secondo gli standard di `bmad-create-epics-and-stories` (valore utente, indipendenza tra epic, nessuna dipendenza in avanti, dimensionamento storie, qualità degli Acceptance Criteria).

### Verifiche superate

- **Valore utente**: tutti e 6 gli epic sono centrati su un outcome utente reale, nessun epic tecnico ("setup database", "API development") mascherato da epic di prodotto.
- **Indipendenza tra epic**: nessun epic richiede il completamento di un epic successivo per funzionare — verificato epic per epic (Epic 1 autonomo; Epic 2 si appoggia solo a Epic 1; Epic 3 solo a Epic 1-2; Epic 4 solo a Epic 1; Epic 5 solo a Epic 2 e 4; Epic 6 solo a Epic 1 e 2).
- **Nessuna dipendenza in avanti tra storie**: verificata storia per storia in ogni epic — ogni storia referenzia solo storie o epic precedenti, mai successivi.
- **Creazione entità solo quando serve**: confermato in fase di creazione, non fatto upfront.

### 🔴 Critical Violations

Nessuna trovata.

### 🟠 Major Issues

1. **Nessuna storia inizializza esplicitamente l'entità Anno Agonistico per la primissima stagione.** Story 1.3 (Import) e Story 2.2 (Creazione Gruppi) presuppongono entrambe "l'Anno Agonistico corrente" già esistente, ma nessuna storia dell'Epic 1 o 2 copre la sua creazione/derivazione iniziale (AD-8 la definisce come entità con FK da Gruppo e Iscrizione, ma qualcuno deve pur crearne la prima riga). Il Wizard Nuova Stagione (Story 6.3) copre il passaggio da una stagione alla successiva, ma è Could/differito e comunque presuppone che una prima stagione esista già.
   - **Impatto:** al primo utilizzo reale (prima del 1° agosto), la catena FK descritta in AD-8 rischia di restare orfana — non è chiaro chi/come crea il primo Anno Agonistico.
   - **Raccomandazione:** aggiungere un Acceptance Criteria a Story 2.2 (o, se si preferisce, una breve Story 2.0) che copra la creazione automatica dell'Anno Agonistico corrente derivandolo dalle date di sistema (1 agosto–30 giugno), oppure la sua creazione esplicita da parte di Admin/Dirigente se si preferisce un controllo manuale.

### 🟡 Minor Concerns

1. Alcune Acceptance Criteria non coprono esplicitamente condizioni di errore/edge case (es. Story 1.3: file di import malformato o con colonne mancanti; Story 4.1: formato file non supportato per il certificato). A livello di epics è accettabile rimandarli alla fase di dev-story, ma vale la pena tenerli a mente quando si scriveranno le story-context complete.
2. La formulazione di Story 4.5 ("quando l'Allenatore visualizza il Gruppo o registra le presenze") può leggersi come una dipendenza da Epic 3 (Story 3.1) — non lo è realmente (l'alert compare già nella vista Gruppo di Epic 2), ma varrebbe la pena chiarire il testo per evitare l'impressione di un accoppiamento tra epic.

## Summary and Recommendations

### Overall Readiness Status

**READY** — nessun blocco critico. Un Major Issue va risolto prima di iniziare l'Epic 2 (non blocca l'avvio dell'Epic 1).

### Critical Issues Requiring Immediate Action

Nessuna.

### Recommended Next Steps

1. **Prima di implementare Story 2.2** (Creazione Gruppi): decidere e documentare come si inizializza il primo Anno Agonistico — creazione automatica derivata dalle date di sistema, o azione esplicita di Admin/Dirigente — e aggiungerlo come Acceptance Criteria a Story 2.2 (o come storia dedicata).
2. **Riportare FR-30** ("Assegnazione Atlete a Gruppo") nel PRD stesso, per allinearlo a `epics.md` — piccola modifica, stesso perimetro Must, nessun impatto su architettura o storie già scritte.
3. **Facoltativo, quando si scriveranno le story-context complete per lo sviluppo**: dettagliare le condizioni di errore/edge case non ancora esplicitate (import malformato, formato file certificato non supportato) e chiarire il testo di Story 4.5 per rimuovere l'apparente accoppiamento con Epic 3.

### Final Note

Questa valutazione ha identificato 1 Major Issue e 2 Minor Concerns su 4 categorie esaminate (documenti, copertura FR, allineamento UX, qualità epic/storie), oltre a un warning informativo sull'assenza (scelta) della UX. Nessuno di questi blocca l'avvio dello sviluppo dall'Epic 1: puoi procedere così come sono, e affrontare il punto 1 quando arrivi a Story 2.2.

### Post-Assessment Actions

- **Risolto:** Story 2.2 in `epics.md` ora include un Acceptance Criteria per la creazione/derivazione automatica del primo Anno Agonistico dalle date di calendario, se non ancora presente a sistema.
- **Risolto:** FR-30 (Assegnazione Atlete a Gruppo) riportato nel PRD (`prd.md`, §4.2 e §6.1 Perimetro MVP), allineandolo a `epics.md`. Cambio loggato nel memlog del PRD.
- Restano facoltativi (non affrontati ora): dettaglio degli edge case di errore in alcune storie, e chiarimento testuale di Story 4.5.
