# Epic 20 Context: Torneo Memorial

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Gestione completa del "Torneo Memorial", un torneo annuale organizzato dalla società: edizioni, categorie, squadre partecipanti (esterne alla società, non i `Gruppo` interni), gironi all'italiana con classifica automatica, tabellone semifinali/finali per posizionamento, volantino caricabile, e una vetrina pubblica sul sito (classifiche, risultati, calendario) accanto alla gestione interna riservata ad Admin/Dirigente.

## Stories

- Story 20.1: Edizione del torneo e Categorie
- Story 20.2: Squadre partecipanti per Categoria
- Story 20.3: Calendario di girone e inserimento risultati (classifica automatica)
- Story 20.4: Generazione tabellone semifinali/finali
- Story 20.5: Volantino (immagine di sfondo) caricabile per l'edizione
- Story 20.6: Vetrina pubblica `/torneo` (classifiche, risultati, volantino)
- Story 20.7: Nome personalizzato dell'Edizione
- Story 20.8-20.9: (Slot/logistica incontri — data/ora/palestra)
- Story 20.10: Allineamento layout pubblico Torneo alle altre pagine pubbliche (rimozione riquadro bianco per Categoria)
- Story 20.11: Numero progressivo delle gare del Torneo
- Story 20.12: Creazione Slot di girone su tutte le Palestre in un solo passaggio
- Story 20.13: Nome personalizzato delle Settimane del Torneo
- Story 20.14: Contenuti centrati nella pagina pubblica del Torneo
- Story 20.15: Vista tabellare delle squadre iscritte per Girone
- Story 20.16: Punti realizzati nei set e nuovo criterio di spareggio (quoziente set/punti) nella classifica di girone

## Requirements & Constraints

Formula: 2 gironi all'italiana per Categoria, ogni incontro al meglio dei 3 set, punteggio 3/2/1/0 (vittoria 2-0/2-1, sconfitta 1-2/0-2). Classifica di girone: punti come criterio primario, set vinti come spareggio (Story 20.16 riapre questo criterio aggiungendo quoziente set poi quoziente punti). Al termine dei gironi: 1°/2° di ciascun girone si incrociano per il posizionamento 1°-4°, 3°/4° per il 5°-8° (incrocio standard 1°A-2°B, 1°B-2°A). Squadre torneo sono un'entità leggera distinta dai `Gruppo` interni (club esterni ospitati, nessuna riga Atleta/Allenatore). Gestione riservata ad Admin/Dirigente (`requireRuolo(["ADMIN","DIRIGENTE"])`), nessun Ruolo dedicato introdotto per l'epica. Sezione pubblica sul sito obbligatoria (classifiche, risultati, volantino), sola lettura, nessuna sessione richiesta.

## Technical Decisions

Pagina pubblica `/torneo` (`app/torneo/page.tsx` + `app/torneo/torneo-pubblico.module.css`) è un modulo CSS **separato e mai toccato in coppia** con la pagina interna/amministrativa `app/app/(torneo)/torneo/.../torneo.module.css` — boundary esplicito stabilito da Story 20.6, riconfermato da ogni story successiva che tocca la pagina pubblica. Registro visivo "Poster Sportivo" (DESIGN.md/EXPERIENCE.md), mirror diretto di `/calendario` (stessa struttura sezioni raggruppate + match-card) e `/squadre`. Pattern fail-soft consolidato su ogni lettura di `/torneo`: `.catch()` che degrada a stato vuoto/messaggio esplicito invece di far crashare la pagina, `dynamic = "force-dynamic"` (dati mutabili in ogni momento da console interna). Nessuna pagina pubblica del sito (`/`, `/calendario`, `/squadre`, `/staff`, `/contatti`, `/torneo`) applica oggi un contenitore centrato a livello di pagina — solo singoli blocchi interni hanno un `max-width` isolato (es. `.heroCta` in `home-pubblica.module.css`). Story 20.10 aveva escluso esplicitamente l'introduzione di un max-width centrato per `/torneo` (nessuna divergenza da correggere, all'epoca); Story 20.14 riapre parzialmente quella decisione solo per `/torneo`, scope confermato con l'utente: **limitato alla sola pagina `/torneo`**, nessun retrofit sulle altre pagine pubbliche. Story 20.10 non ha mai avuto verifica visiva dal vivo (ambiente locale rotto, pagina mai deployata prima) — stesso vincolo si applica a questa storia.

## Cross-Story Dependencies

Story 20.14 dipende visivamente dall'esito di Story 20.10 (rimozione riquadro bianco, stato `review`/non ancora committata) — il "mantenere lo sfondo come le altre pagine" richiesto da 20.14 è già nello scope di 20.10; 20.14 riverifica solo che l'esito visivo corrisponda a quanto atteso una volta deployato, aggiungendo il centraggio. Tocca solo `app/torneo/torneo-pubblico.module.css`/`app/torneo/page.tsx` (pagina pubblica) — nessuna regressione attesa sulla pagina interna amministrativa.
