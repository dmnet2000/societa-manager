# Epic 18 Context: Sito pubblico Settore Volley

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Costruire un sito pubblico (senza login) per il Settore Volley dentro la stessa app Next.js/Cloudflare — nessun sistema separato, nessuna duplicazione dei dati, nessuna API pubblica — con un registro visivo accattivante "Poster Sportivo": home e pagine dedicate Squadre, Calendario, Staff, Contatti e Classifiche. Il sito rispecchia in sola lettura i dati esistenti (Sponsor, Partita/Campionato, Gruppo/Allenatore/Atleta) e la presenza social/sportiva della società (post Facebook, risultati e classifiche live dal portale FIPAV), senza mai scrivere verso quelle piattaforme. Epica volutamente APERTA (come Epic 9/11/17): le story si aggiungono una alla volta in base al feedback visivo/UX dell'utente sul sito in produzione.

## Stories

- Story 18.1: Migrazione dashboard interna a `/app` e nuova home pubblica (fondativa)
- Story 18.2: Sezione Sponsor pubblica in home
- Story 18.3: Sezione Partite della settimana in home
- Story 18.4: Foto di squadra per Gruppo
- Story 18.5: Sezione post social in home (embed statico, poi sostituito da 18.13)
- Story 18.6: Banner di consenso cookie
- Story 18.7: Menu di navigazione multi-pagina
- Story 18.8: Pagina pubblica "Squadre"
- Story 18.9: Pagina pubblica "Calendario"
- Story 18.10: Pagina pubblica "Staff"
- Story 18.11: Pagina pubblica "Contatti"
- Story 18.12: Applicazione del registro visivo "Poster Sportivo" alle pagine pubbliche esistenti
- Story 18.13: Carosello automatico dei post Facebook in home
- Story 18.14: Caricamento della foto di sfondo dell'hero da Admin/Dirigente
- Story 18.15: Rimuovere il nero dal registro visivo "Poster Sportivo" (revisione DESIGN.md)
- Story 18.16: Applicare al codice il nuovo colore del registro (blu carbone + azzurro partite)
- Story 18.17: Rimuovere il pulsante "Preferenze cookie" dopo una scelta registrata
- Story 18.18: Menu di navigazione pubblica su mobile (voci su due righe)
- Story 18.19: Separare il titolo hero dal blocco Post Facebook
- Story 18.20: Logo della Polisportiva nel footer pubblico, con link a sito e social
- Story 18.21: Favicon e titolo della scheda dinamici dal nome del Settore
- Story 18.22: Foto dell'Allenatore nella sezione Staff
- Story 18.23: Riordino dell'header pubblico e larghezza didascalia Facebook su mobile
- Story 18.24: Elenco Atlete a blocchi per categoria su "Squadre", con foto e Numero
- Story 18.25: Contenuto centrato nella pagina pubblica `/squadre`
- Story 18.26 (BUG): `null value` su `accessToken` — chiusa, non un difetto applicativo
- Story 18.27: Scheda Gruppo molto più larga in `/squadre`
- Story 18.32: Vista mensile "stile Google Calendar" per `/calendario` (solo analisi)
- Story 18.33: Risultati e classifiche live dal portale FIPAV in home
- Story 18.34: Classifiche spostate su una pagina pubblica dedicata `/classifiche`

## Requirements & Constraints

- Nessuna pagina di questa epica richiede autenticazione, e nessuna espone dati riservati ai Ruoli autenticati. Unica eccezione deliberata: Story 18.24 (confermata dall'utente) mostra delle Atlete solo nome/foto/Numero — mai email, codice fiscale, credenziali o campi interni.
- Social solo in direzione piattaforma → sito (mirroring in lettura); il sito non pubblica né scrive mai sui social. Lo stesso vale per FIPAV: il percorso pubblico non scrive mai nel DB.
- Preferire la soluzione più semplice a quella più "completa", salvo che l'utente riapra esplicitamente il compromesso (come per il carosello Facebook, 18.13).
- Fail-soft per ogni sezione che dipende da dati opzionali/esterni: se il dato manca, è mal configurato o il fetch fallisce/va in timeout/l'HTML cambia formato, il blocco viene omesso in silenzio — mai errori, immagini rotte o messaggi "non disponibile"; un blocco non deve mai bloccare gli altri. Eccezione: le pagine dedicate il cui unico scopo è quel contenuto mostrano un messaggio esplicito quando è vuoto (es. "Nessuna classifica disponibile al momento", "nessuna partita").
- Cookie/GDPR (Garante Privacy): nessun cookie non essenziale né script di terze parti (embed social, analytics futuri) prima del consenso esplicito; il consenso deve restare revocabile (tensione aperta segnalata in 18.17, non regredire).
- Accessibilità di base per ogni elemento interattivo: touch target minimo 44×44px, outline di focus visibile, controllo pausa/ripresa (WCAG 2.2.2) su ogni carosello automatico.
- Ogni nuova rotta pubblica va aggiunta esplicitamente a `PUBLIC_ROUTES`, altrimenti il Visitatore anonimo viene rediretto a `/accedi` (non basta che non sia in `PROTECTED_ROUTES`).
- Regola permanente di progetto: se una story tocca una funzionalità già documentata nella guida in-app, aggiornarne anche il contenuto guida.

## Technical Decisions

- Divisione fondativa (18.1): la dashboard interna autenticata vive sotto `/app` (prefissi di `PROTECTED_ROUTES`, link interni e redirect post-login/registrazione aggiornati); il sito pubblico possiede `"/"`. La logica di autorizzazione per Ruolo è invariata.
- Le pagine pubbliche leggono direttamente e in sola lettura i modelli Prisma esistenti — nessuno schema/API pubblica separata.
- Stagione corrente sulle pagine pubbliche: usare sempre `trovaAnnoAgonisticoCorrente` (sola lettura), mai `risolviAnnoAgonisticoCorrente` (crea la stagione se manca — effetto collaterale di scrittura inaccettabile su una GET pubblica).
- Upload immagini (foto squadra, hero, logo Polisportiva) seguono il pattern logo/Sponsor: validazione condivisa (2MB, PNG/JPEG, controllo magic byte), bucket Storage pubblico dedicato con policy SELECT già nella prima migrazione, esistenza tracciata via `list()` per gli asset singleton, modulo `lib/storage/<nome>.ts` speculare a quello del logo. La foto squadra può caricarla anche l'Allenatore assegnato al Gruppo.
- Impostazioni pubbliche del sito (URL pagina Facebook, contatti, link Polisportiva) come campi opzionali sul singleton `ConfigurazioneApplicazione`. Un vero segreto (token Graph API Facebook) va invece in una tabella singleton propria protetta da RLS (pattern `ConfigurazioneSmtp`), mai hardcoded né inviato al client. Ogni nuova tabella strutturale va comunque in ENABLE RLS + REVOKE esplicito.
- Immagini private da mostrare in pubblico (foto profilo Allenatore/Atleta): lette lato server con il client admin privilegiato e servite con signed URL a breve scadenza — mai rilassare le policy del bucket.
- L'aritmetica dell'indice dei caroselli (`lib/carosello-indice.ts`) è condivisa e va riusata da ogni nuovo carosello automatico.
- Pagine pubbliche generalmente Server Component `force-dynamic` con letture fail-soft. I dati FIPAV live (18.33/18.34) usano invece `fetch` Next.js con breve `revalidate` (~10 min) e timeout breve, un solo fetch per Campionato (la stessa pagina di `Campionato.linkFipav` contiene sia `tbl-risultati` sia `tbl-classifica`, classifica di default "all'ultima giornata"); nessun nuovo campo su `Campionato`. Percorso del tutto indipendente dalla sincronizzazione manuale interna (Epic 10), che resta invariata: i dati pubblici possono legittimamente differire da quelli salvati su `Partita`.
- Il menu pubblico è dinamico e gestito da pannello (Epic 19, `VoceMenuPubblico`): una nuova pagina pubblica che deve comparire nel menu di default si porta dietro una migrazione di seed della voce con ordine sensato (precedente: voce "Torneo"; "Classifiche" dopo "Calendario").

## UX & Interaction Patterns

- Registro "Poster Sportivo" (`ux-designs/ux-societa-manager-2026-08-13/DESIGN.md` + `EXPERIENCE.md`, rivisto da 18.15/18.16): dominano bianco/azzurro; l'unico colore scuro strutturale è `{colors.blu-carbone}` `#0F2438` (header, hero, footer). Il nero/quasi-nero è vietato per feedback diretto dell'utente — non reintrodurlo. Le card partita usano `{colors.azzurro-partite}` `#2E6F99`, mai il blu carbone.
- Tagli diagonali `clip-path` e tipografia condensata peso 900 su titoli/nav/bottoni sono strutturali. `{colors.magenta}` è riservato al solo badge eyebrow dell'hero; il divisore "vs" delle card usa `{colors.magenta-chiaro}` (il magenta pieno non passa il contrasto).
- Navigazione mobile: lista orizzontale con wrap, non hamburger/drawer (un mockup con drawer è solo illustrativo); decisione riaperta più volte (18.18, 18.23) senza cambiarne l'esito.
- Immagini mancanti (squadra, hero, staff, Atleta): sempre il placeholder condiviso `placeholder-foto` (tratteggio diagonale/iniziali), mai immagine rotta o area vuota.
- Layout `/squadre`: contenuto centrato (`.main` max 1000px, 18.25) e schede Gruppo a una sola colonna (18.27) — non riaprire.
- Tabelle classifica: in home (se presente) formato compatto; nella pagina dedicata tutte le 13 colonne, una card per Campionato, nessun selettore/filtro.

## Cross-Story Dependencies

- 18.1 è fondativa: quasi tutte le altre story ne dipendono.
- 18.7 (menu) rende raggiungibili 18.8–18.11, ma ogni pagina deve registrare comunque la propria rotta in `PUBLIC_ROUTES`. Il menu è poi diventato dinamico con Epic 19 (19.6–19.8): nuove voci passano dal seed di `VoceMenuPubblico`.
- 18.12 dipende da 18.1–18.5, 18.7, 18.8 e dalla sessione UX; 18.15 rivede DESIGN.md e deve precedere 18.16, che applica la palette al codice.
- 18.13 riapre la scelta dell'embed passivo di 18.5; 18.19 e 18.23 iterano ancora su hero, header e didascalia Facebook.
- 18.24 dipende da 19.15 (campo `ordine` del Gruppo) e 9.35 (campo `numero` dell'Atleta) e ribalta l'esclusione privacy di 18.8; 18.27 dipende dal layout centrato di 18.25.
- 18.33 aggiunge in home "Risultati della settimana scorsa" subito PRIMA di "Partite della settimana" (18.3, invariata) e non tocca la sincronizzazione FIPAV manuale di Epic 10 (10.11).
- 18.34 riusa invariata l'infrastruttura di 18.33 (fetch live con cache, parser, vista per Campionato): rimuove del tutto la sezione classifiche dalla home (i risultati restano in home) e la sposta su `/classifiche`, con voce di menu seed dopo "Calendario".
- 18.32 è solo analisi: una futura story di sviluppo dipende dalla chiusura con l'utente delle decisioni aperte che elenca (riusabile `Campionato.colore` per la legenda).
