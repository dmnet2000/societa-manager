---
title: Gestione Settore Volley - Polisportiva
status: draft
created: 2026-07-13
updated: 2026-07-13
---

# Product Brief: Gestione Settore Volley - Polisportiva

## Executive Summary

Un'applicazione web dedicata alla gestione operativa del settore volley di una polisportiva: non un gestionale generale (la segreteria ne ha già uno per iscrizioni federali e pagamenti), ma uno strato verticale che risolve tre problemi concreti oggi gestiti a mano — sapere sempre orari e sede degli allenamenti, tracciare le presenze delle atlete, e non perdere il controllo sulle scadenze delle visite mediche. Nasce da un'esigenza personale e pratica: recuperare il tempo perso oggi tra WhatsApp, fogli Excel e telefonate, automatizzando quello che si può automatizzare senza costruire l'ennesimo gestionale generalista.

## Il Problema

Oggi la comunicazione e il tracciamento nel settore volley passano per canali informali e manuali: gruppi WhatsApp che generano rumore continuo, fogli Excel scollegati tra loro, rincorse telefoniche alla segreteria per sapere lo stato di una visita medica. Questo costa tempo a chi lo gestisce e crea un rischio concreto: un'atleta può scendere in campo con il certificato medico scaduto semplicemente perché nessuno se n'è accorto in tempo. Allenatori, atlete, genitori e dirigente hanno ciascuno bisogno di un pezzo di informazione diverso (il mio orario, la mia presenza, lo stato del certificato di mia figlia, la situazione del gruppo) e oggi nessuno di questi bisogni ha una risposta immediata e affidabile.

## La Soluzione

Un'app che copre in modo mirato quattro aree:

- **Visibilità degli orari** — palestre/campi/slot, caricati direttamente, non calcolati dall'app.
- **Gestione delle presenze** per gruppo, con storico per atleta.
- **Ciclo di vita del certificato medico** — dall'upload (genitore o atleta) alla conferma della segreteria, con notifiche e promemoria non invasivi.
- **Onboarding via codice fiscale**, chiave di aggancio univoca riutilizzata sia per importare l'archivio atlete dal portale federale sia per il passaggio da una stagione agonistica all'altra.

Il principio guida è "niente rumore": segnalare le eccezioni reali (un certificato in scadenza, un cambio orario), non generare notifiche per tutto.

## Chi la usa

- **Allenatore** — vede il proprio orario e i propri gruppi, segna le presenze, consulta lo storico per atleta, riceve alert sulle scadenze mediche del suo gruppo.
- **Atleta** — vede il proprio orario e la propria presenza, può caricare il proprio certificato medico, ha una sezione dati fisici/antropometrici.
- **Genitore** — si aggancia all'atleta via codice fiscale, carica il certificato medico per conto dell'atleta, riceve i promemoria di scadenza.
- **Segreteria/Amministrazione** — inserisce/conferma le visite mediche ricevute, conferma l'iscrizione; uso deliberatamente minimo, il resto resta nel gestionale esterno esistente.
- **Dirigente/Responsabile settore** — assegna allenatori ai gruppi, ha visibilità d'insieme su orari, presenze e certificati.
- **Admin di sistema** — gestisce utenti, ruoli e permessi tecnici; distinto dalla Segreteria.

## Criteri di Successo

- Nessuna atleta risulta "in campo" senza che il suo stato del certificato medico sia visibile a chi la allena.
- Il tempo speso oggi a rincorrere certificati e comunicare a mano si riduce sensibilmente.
- Allenatori, atlete e genitori trovano da soli l'orario e le informazioni che cercano, senza dover chiedere.
- Il passaggio da una stagione agonistica all'altra (1° agosto) non richiede di ricostruire da zero gruppi, atlete e assegnazioni.

## Perimetro

**Nella prima versione (Must):**
- I sei ruoli sopra.
- Struttura dati organizzata per anno agonistico (1° agosto – 30 giugno).
- Modello Palestra → Campo → Slot, caricato direttamente senza logica di assegnazione automatica.
- Vista orario personale per allenatore e atleta.
- Presenze con storico.
- Ciclo completo delle visite mediche (upload, notifica, conferma, alert non bloccante, promemoria a 30 e 7 giorni).
- Conferma iscrizione da segreteria.
- Onboarding via codice fiscale (registrazione per ruolo, import da export federale, precaricamento allenatori, aggancio genitore-atleta).
- Regole di rollover stagionale (merge certificato per data più recente, riporto di default delle Under 13 con esclusione manuale).

**Importante ma non bloccante (Should):**
- Dati antropometrici e test fisici nel tempo per atleta.
- Vista orari trasversale per la segreteria.
- Permessi granulari sui dati sanitari.

**Dopo, se serve (Could):**
- Trend/percentuale di presenza e grafici di progresso nei test fisici.
- Wizard di avvio nuova stagione con copia automatica delle assegnazioni.

**Esplicitamente fuori perimetro:**
- Un algoritmo che calcola l'incastro orari-allenatori (resta un lavoro umano, fuori dall'app).
- I ruoli Gestore palestra e Medico sportivo/Staff sanitario (non esistono oggi in polisportiva).
- Le funzioni gestionali complete di segreteria (pagamenti, iscrizioni federali), già coperte dal gestionale esistente.

## Regole di Business Non Negoziabili

- Anno agonistico: dal 1° agosto al 30 giugno successivo — unità temporale strutturale di tutto il sistema.
- Il certificato medico segue l'anno solare, non l'anno agonistico.
- In fase di import, tra la data del certificato a sistema e la data nell'export vince sempre la più recente.
- Le atlete Under 13 vanno riportate di default nella nuova stagione anche se assenti dall'export, con possibilità di esclusione manuale.
- L'alert di scadenza certificato è puramente informativo: non blocca mai la registrazione di una presenza.
- I promemoria di scadenza certificato partono a 30 e a 7 giorni dalla scadenza, verso genitore, atleta, allenatore e dirigente.
- Il codice fiscale è la chiave di matching unica in import, onboarding e rollover stagionale.

## Scala e Vision

Fino a circa 200 atlete per il solo settore volley. Se il modello regge, lo stesso impianto (orari per ruolo, presenze, compliance sanitaria per anno agonistico) potrebbe in futuro estendersi agli altri settori sportivi della polisportiva, fino a circa 1500 atlete complessive — un ordine di grandezza da tenere presente in ottica architetturale, ma un'estensione ipotetica, non un requisito di questa prima versione.

## Vincoli di Tempo

Deadline target: l'app deve essere pronta per l'avvio del nuovo anno agonistico, il 1° agosto.
