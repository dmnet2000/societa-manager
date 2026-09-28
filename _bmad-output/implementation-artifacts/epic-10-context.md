# Epic 10 Context: Gestione Partite e Campionati

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Dare a Allenatori, Admin e Dirigenti uno strumento per gestire i Campionati a cui i propri Gruppi partecipano e le Partite che li compongono (creazione, import massivo da file federale, modifica puntuale, cancellazione), con una vista settimanale e per Gruppo utile a pianificare presenza a bordo campo e trasferte, estesa in sola lettura ad Atlete e Genitori con la stessa navigazione Maps già usata per le Palestre. L'epica è nata a metà sviluppo (2026-07-25) — non è coperta dal PRD/architettura originali (2026-07-13): i vincoli di dominio (proprietà Campionato↔Gruppo, RLS, Anno Agonistico) sono stati chiariti direttamente con l'utente e sono riportati sotto. L'epica si è poi estesa (fino al 2026-09-27) a un'integrazione col portale FIPAV/Lega per sincronizzare calendario e risultati senza più dipendere da un export Excel manuale, prima manuale (pulsante) poi con cadenza automatica configurabile.

## Stories

- Story 10.1: Creazione di un Campionato per un Gruppo
- Story 10.2: Import Excel delle partite di un Campionato
- Story 10.3: Vista partite settimana per settimana (Allenatore, Dirigente, Admin)
- Story 10.4: Modifica di una singola partita
- Story 10.5: Vista partite per Atleta e Genitore
- Story 10.6: Cancellazione di una Partita o di un Campionato
- Story 10.7: Il Campionato appartiene a un solo Gruppo (rimozione della condivisione)
- Story 10.8: Modifica nome Campionato e link al portale FIPAV
- Story 10.9: Raggruppamento tabellare delle Partite per Gruppo, a scomparsa
- Story 10.10: Sincronizzazione automatica del calendario Partite dal portale FIPAV/Lega — analisi di fattibilità
- Story 10.11: Sincronizzazione manuale delle Partite di un Campionato dal portale FIPAV/Lega
- Story 10.12: Sincronizzazione automatica delle Partite dal portale FIPAV/Lega, cadenza configurabile dall'app

## Requirements & Constraints

- Vincolo di sviluppo generale del progetto (NFR6): progetto personale, sviluppo in solitaria, nessun budget/hosting dedicato — preferire sempre la soluzione più semplice ed economicamente sostenibile (rilevante per la scelta "manuale prima, cron dopo" e per evitare nuova infrastruttura).
- `Campionato`/`Partita` sono dato **strutturale**, non protetto da RLS — stesso trattamento di `Gruppo`/`Slot`: non riguardano dati sanitari/personali.
- `Campionato` ha FK diretta verso `AnnoAgonistico`: non sopravvive al cambio di stagione (stesso principio già usato per `Gruppo`).
- Autorizzazione: Allenatore limitato al proprio/i Gruppo/i; Admin/Dirigente ad accesso ampio su tutti i Gruppi. Diversamente dalla gestione Gruppi (riservata a soli Admin/Dirigente), qui l'Allenatore è anche gestore dei propri Campionati/Partite.
- Un Campionato appartiene a **un solo Gruppo** (corretto in Story 10.7): due squadre della stessa società nello stesso girone sono due Campionati distinti, non uno condiviso. Un Gruppo può però partecipare a più Campionati contemporaneamente.
- Atlete e Genitori hanno accesso in sola lettura, agganciato allo stesso legame Genitore↔Atleta già esistente in altre aree dell'app; vedono solo le partite del proprio Gruppo/della propria figlia.
- Il pulsante "Naviga" verso il luogo di gioco è lo stesso meccanismo generico già usato per le Palestre, riusato invariato (non richiede una nuova entità "luogo").
- Import Excel: formato reale dell'export federale FIPAV/Lega, chiave naturale `Gara N` per un re-import idempotente (aggiorna, non duplica); import rifiutato in blocco (nessuna scrittura parziale) su colonne mancanti/formato non riconosciuto; riepilogo N create/M aggiornate dopo ogni import.
- Sincronizzazione da portale FIPAV: fonte scelta è l'HTML pubblico di `fipavtreuno.net/gare` (non il feed iCalendar di `portalefipav.net`, il cui `robots.txt` è restrittivo); i parametri della URL (stagione/girone) cambiano ogni anno e vanno aggiornati a mano una volta a stagione da chi gestisce il Campionato.
- Le correzioni manuali di data/ora/impianto (Story 10.4) non devono mai essere sovrascritte silenziosamente da una sincronizzazione automatica.
- Nessuna notifica di fallimento per la sincronizzazione automatica — solo log server-side e riepilogo nella risposta, coerente col resto del progetto (nessun precedente di alerting).

## Technical Decisions

- Modello dati: `Campionato` (nome, `linkFipav` opzionale, FK diretta e obbligatoria a `Gruppo` e a `AnnoAgonistico`); `Partita` (data, ora, impianto, indirizzoImpianto testo libero, risultato, parziali, statoDescrizione, giornata, `garaNumero`, `modificataManualmente: Boolean @default(false)`) con vincolo `@@unique` su `gruppoId + campionatoId + garaNumero`, chiave di upsert idempotente riusata sia dall'import Excel sia dalla sincronizzazione FIPAV.
- `aggiornaPartita` tocca solo data/ora/impianto/indirizzoImpianto e imposta `modificataManualmente = true`; la sincronizzazione FIPAV aggiorna sempre risultato/parziali/statoDescrizione/giornata, ma aggiorna data/ora/impianto/indirizzoImpianto solo se `modificataManualmente` è `false`.
- Parsing HTML del portale: nuova dipendenza libreria HTML (es. `cheerio`/`node-html-parser`), non regex su markup grezzo; selettore `table.tbl.tbl-risultati > tbody > tr`; impianto/indirizzo letti dall'attributo `title` (doppio decode) di un'icona informativa, già presenti su ogni riga.
- Pattern cron: mirror di `app/api/cron/promemoria-certificati/route.ts` — header `Authorization: Bearer <CRON_SECRET>`, confronto a tempo costante, fail-closed se il segreto manca, 401 se non valido, fail-soft per singolo elemento (un Campionato che fallisce non blocca gli altri).
- **Scoperta architetturale rilevante**: il Worker generato da `@opennextjs/cloudflare` espone solo un handler `fetch`, mai `scheduled` — un Cloudflare Cron Trigger nativo non ha nulla da invocare con questo adapter di build. Riguarda anche il cron esistente dei certificati (Story 4.6), non solo questa epica. Story 10.12 adotta invece un workflow GitHub Actions schedulato (`on: schedule`, ogni ora) che chiama l'endpoint via HTTPS con lo stesso `CRON_SECRET`.
- Cadenza reale configurabile dall'Admin (non dal workflow, fisso a ogni ora): nuovi campi su `ConfigurazioneApplicazione` (`frequenzaSincronizzazioneFipavOre`, fallback 24h; `ultimaSincronizzazioneFipavAutomaticaIl`), stesso pattern del singleton di configurazione già usato per SMTP/logo — modificabile senza redeploy.
- La logica centrale di sincronizzazione (fetch + parsing + upsert con protezione `modificataManualmente`) va estratta in una funzione condivisa, richiamata sia dalla Server Action manuale (dopo `requireRuolo`/autorizzazione Gruppo) sia dall'endpoint cron (dopo il controllo `CRON_SECRET`, senza sessione utente) — non due implementazioni parallele.
- Import Excel manuale resta sempre disponibile come fallback, per i Campionati senza `linkFipav` o se la sincronizzazione automatica fallisce.

## Cross-Story Dependencies

- Story 10.6 (cancellazione) dipende esplicitamente da Story 10.7 già completata: cancellare un Campionato è sicuro solo dopo che il modello garantisce un solo Gruppo proprietario.
- Story 10.7 corregge una decisione di modello dati presa in Story 10.1 (relazione molti-a-molti `GruppoCampionato` → FK diretta 1:1).
- Story 10.8 introduce `Campionato.linkFipav`, riusato come sorgente URL dalle Story 10.10/10.11/10.12.
- Story 10.9 si aggiunge sopra la vista settimanale di Story 10.3 (mai la sostituisce) e replica il pattern "bottone a scomparsa" già stabilito da `TabellaIncontriCategoria.tsx` (Epic 20, Story 20.19).
- Story 10.10 è solo analisi di fattibilità (nessun AC di prodotto); le sue decisioni aperte sono chiuse progressivamente dalle Story 10.11 (sincronizzazione manuale) e 10.12 (automatica).
- Story 10.12 riusa ed estrae in funzione condivisa la logica centrale già scritta in Story 10.11 (`sincronizzaGareFipav`), e dipende dal pattern cron di Story 4.6 (`promemoria-certificati`).
- Story 10.11/10.12 dipendono dal comportamento di `aggiornaPartita` (Story 10.4) per il flag `modificataManualmente` che protegge le correzioni manuali dalla sincronizzazione.
