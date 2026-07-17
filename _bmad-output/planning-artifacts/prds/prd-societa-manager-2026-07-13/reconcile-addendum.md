# Riconciliazione Addendum → PRD

Input analizzato: `_bmad-output/planning-artifacts/briefs/brief-societa-manager-2026-07-13/addendum.md`
Output analizzato: `_bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md`

Metodo: ogni punto tecnico/contestuale dell'addendum è stato cercato nel PRD (FR, NFR, Non-Obiettivo, Domanda Aperta, Assunzione, nota `[NOTE FOR PM]`) o verificato come legittimamente rimandato all'architettura con un puntatore esplicito.

## 1. Schema export federale (Archivio Atleti.xlsx)

| Punto addendum | Stato nel PRD |
|---|---|
| Codice Fiscale = chiave di matching primaria | Riflesso: Glossario §3, FR-19 |
| Categ. copre tutte le categorie incluse U13, non filtrato | Riflesso: motiva FR-23 ("il tesserino annuale non sempre vi compare") |
| Date stringa gg/mm/aaaa, normalizzazione in parsing | Riflesso: FR-19 Consequences, con puntatore esplicito `(dettaglio tecnico in addendum.md)` |
| Data Validità Tess. — NON tracciare (non correlata a Iscrizione) | Riflesso: Non-Obiettivi §5 ultimo punto, Glossario "Iscrizione" |
| Certificato medico più ricco (inizio+durata mesi+fine) | Parzialmente riflesso: Glossario definisce "data inizio/fine validità"; il campo "Mesi Validità Cert" (derivabile) non è citato, ma non è un'informazione persa in modo sostanziale (è ridondante rispetto a inizio/fine) |
| Campi anagrafici (Matricola, Cognome e Nome unico, M/F, nascita, residenza), campi società, Campionato, Modulo, Tipo Attività/Tesseram.BV/SV | Non ripresi nel PRD a livello di campo — **legittimo**: il PRD non è un data model, e la sezione §0 dichiara esplicitamente che il documento traduce "brief.md e addendum.md"; l'addendum resta la fonte tecnica per import. Nessun requisito sostanziale perso (questi campi sono o non rilevanti per il perimetro, o dettagli di mappatura da definire in implementazione/architettura). |

**Giudizio: nessun gap bloccante.** Il puntatore esplicito in FR-19 copre il punto più delicato (normalizzazione date); il resto è dettaglio di mappatura dati che non necessita di un FR dedicato.

## 2. Ruoli esclusi

Addendum distingue **due razionali diversi**:
- **Gestore palestra/impianto**: escluso perché gli slot orari sono un dato già assegnato esternamente alla polisportiva (non decisi da essa) — non serve un ruolo per *decidere* qualcosa che il sistema non deve calcolare.
- **Medico sportivo/Staff sanitario**: escluso perché nessuno ricopre oggi questo ruolo in polisportiva — con nota esplicita "riconsiderare se la situazione cambia".

PRD (§5 Non-Obiettivi): *"Il sistema non introduce i ruoli Gestore palestra/impianto o Medico sportivo/Staff sanitario: non esistono oggi in polisportiva."*

**GAP.** Il PRD collassa le due motivazioni distinte in una sola frase ("non esistono oggi in polisportiva"), che è corretta solo per il Medico sportivo. Per il Gestore palestra/impianto la ragione reale (slot decisi altrove, non un ruolo interno di decisione) non è la stessa e si perde. Si perde anche la clausola di temporaneità/ricondizionalità ("riconsiderare se la situazione cambia") per il Medico sportivo, che nel PRD suona come un'esclusione strutturale definitiva anziché contingente allo stato attuale dell'organico.

## 3. Razionale esclusione algoritmo di assegnazione orari

Ben riflesso:
- PRD §4.1 descrizione: "Nessuna logica di assegnazione automatica: l'incastro orari-allenatori è preparato altrove (fuori app, con assistenza AI generica) e qui viene solo caricato e mostrato."
- FR-2 Consequences: "Lo Slot resta fisso per l'intero Anno Agonistico una volta creato (nessuna rilevazione conflitti in continuo richiesta)."
- FR-1 Consequences: due Gruppi possono coesistere sullo stesso slot se su Campi diversi (copre il caso "palestre con più campi" dell'addendum).
- Non-Obiettivi §5: "Il sistema non calcola l'incastro ottimale slot-allenatore: resta un lavoro umano, svolto fuori dall'app."

**Giudizio: nessun gap.** Tutti gli elementi (fissità stagionale, niente rilevamento conflitti, preparazione esterna con AI, modello dati Palestra→Campo→Slot per campi multipli) sono presenti.

## 4. Idee valutate ma non decise

### 4a. Log di accesso/audit su dati sanitari
Addendum: proposto come spunto per l'Admin di sistema in brainstorming, non discusso a fondo né confermato — "da riconsiderare in sede di architettura se la sensibilità dei dati sanitari lo richiede."

Ricerca nel PRD (full text, case-insensitive): nessuna occorrenza di "audit" o "log di accesso". Non compare in FR-26/FR-27 (Amministrazione e Permessi), non in NFR §8 Privacy, non in Vincoli §9, non in Domande Aperte §10, non in Indice Assunzioni §11 — nonostante quelle sezioni parlino esplicitamente della sensibilità dei dati sanitari e contengano già un `[NOTE FOR PM]` su FR-27.

**GAP.** È il punto più netto: un'idea esplicitamente "parcheggiata per l'architettura" nell'addendum non ha alcun aggancio nel PRD — né come Domanda Aperta, né come nota, né come riga nell'Indice Assunzioni. Dato che il PRD già tratta a fondo la sensibilità dei dati sanitari (FR-27, §9), sarebbe stato naturale e a basso costo aggiungere lì un rimando esplicito.

### 4b. Wizard "nuova stagione" — dettaglio cosa copiare
**Giudizio: nessun gap.** Ben coperto:
- FR-28 Notes: "Could — dettaglio di cosa viene copiato da definire in fase di architettura (vedi `addendum.md`)."
- §6.2 Fuori Perimetro v1: coerente con l'addendum ("utile solo dal secondo rollover in poi").
- Domanda Aperta §10.3: "Contenuto esatto del Wizard Nuova Stagione (FR-28): cosa viene copiato/adattato esattamente dall'anno precedente."

Puntatore esplicito e triplice (FR + perimetro + domanda aperta): trattamento esemplare.

## 5. Vincolo sviluppatore solo/no budget

Addendum: progetto personale, sviluppo in solitaria con assistenza AI, senza budget né vincoli di hosting dedicato — "rilevante per le scelte tecniche a valle (stack, hosting, complessità operativa) in fase di architettura."

Nel PRD:
- §0 (Scopo): "scritto per un solo lettore/costruttore (l'utente stesso, sviluppatore unico con assistenza AI)" — ma qui è framing editoriale del documento, non un vincolo tecnico rivolto all'architettura.
- §8 NFR Affidabilità: "nessun requisito formale di uptime/SLA — progetto personale, non a produzione critica 24/7" — riflette una conseguenza del vincolo, ma non il vincolo stesso (assenza di budget/hosting dedicato).
- Nessuna occorrenza di "budget" o "hosting" collegata al vincolo economico/organizzativo (le uniche occorrenze di "hosting" sono nella sezione privacy dati sanitari, tema diverso).

**GAP (minore).** Il vincolo "no budget / no hosting dedicato" che l'addendum segnala esplicitamente come rilevante per le scelte di stack/hosting/complessità operativa non compare mai come tale nel PRD — solo una sua conseguenza indiretta (niente SLA) è menzionata. Manca una riga NFR o un rimando esplicito tipo "vincolo economico: sviluppo solista, nessun budget, nessun hosting dedicato — vedi addendum.md" che dia il contesto completo a chi (l'utente stesso, in veste di architetto) leggerà l'architettura.

## Sintesi

| # | Punto addendum | Esito |
|---|---|---|
| 1 | Schema export federale | Coperto (puntatore su normalizzazione date; resto è dettaglio di mappatura non richiesto a livello PRD) |
| 2 | Razionale ruoli esclusi | **GAP** — due razionali distinti collassati in uno solo, parzialmente impreciso |
| 3 | Esclusione algoritmo di assegnazione | Coperto integralmente |
| 4a | Log di accesso/audit dati sanitari | **GAP** — assente ovunque nel PRD |
| 4b | Dettaglio wizard nuova stagione | Coperto in modo esemplare (FR + perimetro + domanda aperta) |
| 5 | Vincolo solo-dev/no-budget | **GAP minore** — presente come framing editoriale, non come vincolo NFR rivolto all'architettura |

3 gap individuati su 6 punti controllati.
