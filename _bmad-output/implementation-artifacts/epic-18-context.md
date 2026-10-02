# Epic 18 Context: Sito pubblico Settore Volley

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Costruire un sito pubblico (senza login) per il Settore Volley dentro la stessa app Next.js/Cloudflare, senza un sistema separato, senza duplicare i dati e senza un'API pubblica, con un registro visivo accattivante "Poster Sportivo": home e pagine dedicate Squadre, Calendario, Staff, Contatti e Classifiche. Il sito rispecchia in sola lettura i dati esistenti (Sponsor, Partita/Campionato, Gruppo/Allenatore/Atleta) e la presenza social/sportiva della società (post Facebook, risultati e classifiche live dal portale FIPAV), senza mai scrivere verso quelle piattaforme. L'epica è volutamente APERTA (come Epic 9/11/17): le story si aggiungono una alla volta in base al feedback visivo/UX dell'utente sul sito in produzione. L'ultima direzione visiva è lo stile "Match Week" della grafica social del club, già applicato alle partite e ora da estendere alle classifiche.

## Stories

- Story 18.1: Migrazione dashboard interna a `/app` e nuova home pubblica (fondativa)
- Story 18.2: Sezione Sponsor pubblica in home
- Story 18.3: Sezione Partite della settimana in home
- Story 18.4: Foto di squadra per Gruppo
- Story 18.5: Sezione post social in home (poi sostituita da 18.13)
- Story 18.6: Banner di consenso cookie
- Story 18.7: Menu di navigazione multi-pagina
- Story 18.8: Pagina pubblica "Squadre"
- Story 18.9: Pagina pubblica "Calendario"
- Story 18.10: Pagina pubblica "Staff"
- Story 18.11: Pagina pubblica "Contatti"
- Story 18.12: Registro "Poster Sportivo" applicato alle pagine pubbliche
- Story 18.13: Carosello automatico dei post Facebook in home
- Story 18.14: Foto di sfondo dell'hero caricabile da Admin/Dirigente
- Story 18.15: Rimuovere il nero dal registro visivo (revisione DESIGN.md)
- Story 18.16: Nuovi colori del registro applicati al codice
- Story 18.17: Rimuovere "Preferenze cookie" dopo una scelta registrata
- Story 18.18: Menu pubblico su mobile
- Story 18.19: Titolo hero separato dal blocco Post Facebook
- Story 18.20: Logo della Polisportiva nel footer pubblico
- Story 18.21: Favicon e titolo scheda dinamici
- Story 18.22: Foto dell'Allenatore nella sezione Staff
- Story 18.23: Riordino header pubblico e didascalia Facebook su mobile
- Story 18.24: Atlete a blocchi per categoria su "Squadre", con foto e Numero
- Story 18.25: Contenuto centrato in `/squadre`
- Story 18.26 (BUG): `accessToken` null, chiusa, non un difetto applicativo
- Story 18.27: Scheda Gruppo più larga in `/squadre`
- Story 18.28: Footer su una riga allineata
- Story 18.29: Link Instagram configurabile
- Story 18.30: Icone ufficiali Facebook/Instagram
- Story 18.31: Card calendario a piena larghezza
- Story 18.32: Vista mensile di `/calendario` con filtro Campionato (+ popup dettaglio; rotazione foto nel carosello Facebook)
- Story 18.33: Risultati e classifiche live dal portale FIPAV in home
- Story 18.34: Classifiche su pagina pubblica dedicata `/classifiche`
- Story 18.35: Riga partita in stile "Match Week" per `/calendario` e home

## Requirements & Constraints

- Nessuna pagina richiede autenticazione e nessuna espone dati riservati. Unica eccezione voluta: 18.24 mostra delle Atlete solo nome/foto/Numero.
- Social e FIPAV solo in lettura (piattaforma → sito); il percorso pubblico non scrive mai nel DB.
- Preferire la soluzione più semplice, salvo che l'utente riapra esplicitamente il compromesso.
- Fail-soft: dato mancante, fetch fallito/in timeout o HTML cambiato → il blocco viene omesso in silenzio e non blocca mai gli altri. Le pagine dedicate a un solo contenuto mostrano invece un messaggio esplicito se vuote (es. "Nessuna classifica disponibile al momento").
- Cookie/GDPR: nessun cookie non essenziale né script di terze parti prima del consenso; consenso revocabile.
- Accessibilità: touch target ≥44×44px, focus visibile, pausa/ripresa su ogni carosello automatico, nessuno scroll orizzontale a 375px, testo maiuscolo solo via `text-transform`.
- Ogni nuova rotta pubblica va aggiunta a `PUBLIC_ROUTES` (dimenticanza già ripetuta più volte, anche in 18.34), altrimenti il Visitatore viene rediretto a `/accedi`.
- Regola permanente: se una story tocca una funzionalità documentata nella guida in-app (`lib/guida/contenuti.ts`), aggiornare anche la guida.

## Technical Decisions

- Dashboard interna sotto `/app`; il sito pubblico possiede `"/"`. Autorizzazione per Ruolo invariata.
- Pagine pubbliche = Server Component `force-dynamic` che leggono in sola lettura i modelli Prisma esistenti. Stagione corrente: sempre `trovaAnnoAgonisticoCorrente`, mai `risolviAnnoAgonisticoCorrente` (scriverebbe su una GET pubblica).
- Upload immagini sul pattern logo/Sponsor (2MB, PNG/JPEG, magic byte, bucket pubblico con policy SELECT, modulo `lib/storage/<nome>.ts`). Immagini private mostrate in pubblico tramite signed URL lato server. Ogni nuova tabella strutturale in ENABLE RLS + REVOKE esplicito.
- FIPAV live: un solo `fetch` per Campionato su `Campionato.linkFipav` (contiene sia `tbl-risultati` sia `tbl-classifica`, classifica "all'ultima giornata"), `revalidate` breve (~10 min), timeout breve. Query + fetch condivisi in `leggiCampionatiConLetturaFipav` e vista in `classifichePerCampionatoDaLetture`: riusarli, mai duplicarli né modificarne la logica per un restyle. Il parser legge 13 colonne (Pos./Squadra/Punti/PG/PV/PP/SF/SS/QS/PF/PS/QP/Penal.).
- Menu pubblico dinamico (Epic 19, `VoceMenuPubblico`): una nuova pagina che deve comparire di default porta con sé una migrazione di seed.
- Componenti Match Week esistenti da riusare: `app/RigaPartita.tsx` + `app/riga-partita.module.css` (riga partita), `app/SfondoMatchWeek.tsx` + `app/sfondo-match-week.module.css` (fascia di sfondo), `lib/colore-testo-leggibile.ts` (`testoScuroSuSfondo`). Solo CSS + SVG inline: nessuna nuova libreria, immagine o font web.

## UX & Interaction Patterns

- Registro "Poster Sportivo" (`ux-designs/ux-societa-manager-2026-08-13/DESIGN.md` + `EXPERIENCE.md`): unico colore scuro strutturale `{colors.blu-carbone}` `#0F2438`; nero/quasi-nero vietato. Tagli diagonali `clip-path` al posto degli angoli arrotondati; tipografia display `'Arial Black','Arial Narrow',Impact` peso 900, maiuscolo via CSS; nessun peso intermedio.
- **Riga partita Match Week** (`riga-partita-matchweek`, unico componente partite pubblico): riga a piena larghezza con bordi superiore/inferiore leggermente obliqui (`clip-path: polygon(0 8px, 100% 0, 100% calc(100% - 8px), 0 100%)`, mai `skew`, il testo resta dritto). Sfondo = colore del Campionato (normalizzato, default `#2E6F99`); su sfondo chiaro (luminanza > 0.5) testi/contorno in blu carbone e "vs" in `#9C1458`. A sinistra blocco in **`#C8102E`** (`rosso-matchweek`, bianco sopra 5.88:1) con bordo destro obliquo e filo bianco: giorno abbreviato / numero grande / mese, letti dagli screen reader in forma estesa (parti visive `aria-hidden`). Al centro etichetta Campionato (`label-tag`), squadre maiuscole su due righe con "vs" `{colors.magenta-chiaro}` alla stessa dimensione. A destra, dopo un separatore verticale, valore grande **a contorno** (`color: transparent` + `-webkit-text-stroke`, fallback a testo pieno con `@supports not` e in `forced-colors`); i valori secondari in piccolo sotto. Sotto 900px il contorno diventa testo pieno (troppo sottile a 20-36px). Il rosso è ammesso **solo** sul blocco sinistro: mai una riga intera rossa, mai texture/logo dentro la riga. Pila verticale a una colonna, elenco semantico `<ul>`/`<li>`.
- **Fascia Match Week** (`fascia-matchweek`): sfondo di `/classifiche` (pagina intera), `/calendario` e delle sezioni partite/risultati in home. Blu notte (`#0A1A3F`, sfumato `#0F2D75` → `#071331`) con aloni, luci oblique, rete e pallone decorativi (`aria-hidden`, nascosti in `forced-colors`). Dentro la fascia `--color-text-primary` = bianco e `--color-text-secondary` = `#C3D6F5`, focus ring `--color-focus-ring-on-navy`; filo bianco obliquo sopra ogni riga via `drop-shadow` sul contenitore `.cornice`.
- **Card classifica**: oggi è una card **bianca** dentro la fascia, che ripristina la tavolozza da superficie chiara; una card per Campionato, nessun selettore o filtro, intestazioni abbreviate con `<abbr title>`. Il restyle "Match Week" atteso trasforma ogni squadra in una riga obliqua sul modello di `RigaPartita`: posizione nel blocco rosso `#C8102E`, nome squadra grande, punti grandi a contorno a destra, colonne restanti in piccolo sotto il nome. Il layout di DESIGN.md va aggiornato insieme al codice.
- Navigazione mobile: lista orizzontale con wrap, mai hamburger/drawer. Immagini mancanti: placeholder `placeholder-foto` condiviso.

## Cross-Story Dependencies

- 18.1 è fondativa. Il menu di 18.7 è diventato dinamico con Epic 19 (19.6–19.8).
- 18.15 → 18.16 (palette nel DESIGN.md, poi nel codice); 18.35 aggiunge il rosso Match Week e sostituisce ovunque la vecchia `match-card` (righe di DESIGN.md marcate SUPERATO).
- 18.33 fornisce l'infrastruttura FIPAV live; 18.34 la riusa invariata, sposta le classifiche su `/classifiche` con voce di menu seed dopo "Calendario" e mostra tutte le 13 colonne.
- Il restyle Match Week di `/classifiche` dipende dagli stili di 18.35 (`RigaPartita`, contorno, blocco rosso) e dalla fascia `SfondoMatchWeek`; vanno condivisi o riusati, non duplicati, senza toccare fetch/parser di 18.33/18.34 e senza regressioni sulle righe partita.
- 18.24 dipende da 19.15 e 9.35; 18.27 dipende da 18.25.
