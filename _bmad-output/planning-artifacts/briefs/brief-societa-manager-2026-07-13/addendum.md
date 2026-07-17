# Addendum — Gestione Settore Volley Polisportiva

Materiale di approfondimento raccolto durante la stesura del brief, utile per PRD/architettura ma non necessario nel brief stesso.

## Schema dell'export federale (Archivio Atleti.xlsx)

File di esempio fornito dall'utente, 1 foglio, intestazioni alla riga 5, 143 righe di atlete nel campione. Campi rilevanti osservati:

- `Stag` — stagione sportiva
- `Matricola` — ID tesserato FIPAV
- `Cognome e Nome` — nominativo (stringa unica, non separata in due campi)
- `M/F` — sesso
- `Codice Fiscale` — **chiave di matching primaria**
- `Data Nascita`, `Località Nascita`, `Pr.Nasc.` — anagrafica nascita
- `Indirizzo`, `CAP`, `Località Residenza`, `Pr.` — residenza
- `Categ.` — categoria età/attività (confermato dall'utente: l'export reale copre tutte le categorie insieme, incluse le Under 13, non filtrato per categoria)
- `Data 1° Tess.` — data primo tesseramento storico
- Campi società (appartenenza/tesseramento/provenienza + denominazioni), incluso eventuale prestito ad altra società — non rilevanti per il perimetro attuale
- `Data Validità Tess.` — validità tesseramento federativo. **Confermato dall'utente: non correlata alla conferma iscrizione, che resta un passaggio manuale separato in segreteria. Campo da NON tracciare.**
- `Campionato` — categoria di campionato disputato
- `Data Inizio Val.Cert`, `Data Fine Val.Cert`, `Mesi Validità Cert` — validità certificato medico: più ricco di quanto ipotizzato in fase di brainstorming (non solo una data di scadenza, ma inizio + durata in mesi + fine)
- `Modulo` — codice modulo idoneità (presumibilmente agonistica/non agonistica)
- `Tipo Attività`, `Tesseram.BV/SV` — non rilevanti per il perimetro attuale

**Nota tecnica per l'import:** le date nell'export sono stringhe in formato `gg/mm/aaaa`, non date native Excel — normalizzazione necessaria in fase di parsing.

## Cosa è fuori perimetro, e perché

### Ruoli esclusi

- **Gestore palestra/impianto**: gli slot orari delle palestre sono un dato già assegnato esternamente alla polisportiva (non decisi da essa), quindi non serve un ruolo dedicato a deciderli dentro l'app.
- **Medico sportivo/Staff sanitario**: nessuna persona ricopre oggi questo ruolo in polisportiva — riconsiderare se la situazione cambia.

### Incastro orari

In fase di brainstorming è emerso che gli orari dei gruppi, una volta definiti a inizio anno agonistico, restano fissi per l'intera stagione — non serve un rilevamento continuo dei conflitti. L'utente prevede di preparare la griglia di assegnazione slot-allenatore altrove con l'aiuto di un'AI generica, e di caricare in app solo il risultato finale (Palestra → Campo → Slot). Alcune palestre hanno più campi e possono quindi ospitare due gruppi in contemporanea nello stesso slot orario — il modello dati deve prevederlo.

### Idee valutate ma non portate nel Must/Should/Could

- **Log di accesso/audit sui dati sanitari**: proposto come spunto in fase di brainstorming per l'Admin di sistema, non discusso a fondo né confermato dall'utente. Da riconsiderare in sede di architettura se la sensibilità dei dati sanitari lo richiede.
- **Wizard "nuova stagione" con copia automatica**: incluso in Could ma solo abbozzato — il dettaglio di cosa esattamente viene copiato/adattato (gruppi? assegnazioni allenatori? entrambi?) va definito meglio quando si arriva a quella fase.

## Vincoli di sviluppo

Progetto personale: sviluppo in solitaria da parte dell'utente, con assistenza AI, senza budget o vincoli di hosting dedicato. Rilevante per le scelte tecniche a valle (stack, hosting, complessità operativa) in fase di architettura.

## Collegamento con la sessione di brainstorming

Il brief distilla `_bmad-output/brainstorming/brainstorm-volley-polisportiva-2026-07-13/brainstorm-intent.md`, a sua volta derivato dal log completo della sessione (`.memlog.md` nella stessa cartella), che resta la fonte più granulare se serve recuperare il ragionamento originale dietro una decisione.
