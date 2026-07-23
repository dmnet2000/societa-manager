# Riconciliazione input: logo-mogliano-volley.png

## Cosa è stato estratto e usato

- **Colore navy/indigo** `#312682` — campionato su più punti del PNG (pallone stilizzato, contorno testo, "MOGLIANO VOLLEY"), alta consistenza tra i campioni. Usato in `DESIGN.md` come `{colors.navy}`: accento riservato (sfondo nav-bar, badge/etichette "decise"), mai sfondo di pagina.
- **Colore magenta/fuchsia** `#E6007C` — campionato sul grappolo d'uva in alto a sinistra dello stemma (riferimento territoriale, zona vinicola del Veneto). Usato in `DESIGN.md` come `{colors.magenta}`: l'accento più riservato del sistema, un solo punto d'uso (bordo sinistro della stat-tile "scaduto" nella Vista Dirigente).
- **Presenza dello stemma stesso** — confermata come asset da mostrare nell'app (probabile posizione: nav-bar, per coerenza col pattern già stabilito da Story 7.2/Configurazione logo, che permette già all'Admin di caricare un logo in un bucket pubblico).

## Cosa NON è stato usato/derivato

- **La forma a scudo/stemma del logo non è stata adottata come linguaggio di forma generale dell'interfaccia.** Il raggio degli angoli (`{rounded.sm}`/`{rounded.md}`, 6-8px) è stato deciso indipendentemente dalla variante colore "Energico e Deciso" scelta in discovery, non dal contorno dello stemma.
- **Gli elementi grafici del logo (rete del pallone, grappolo d'uva) non sono stati estratti come stile di icone/illustrazione.** Nessuna decisione è stata presa su un linguaggio iconografico: `DESIGN.md` non introduce icone, i badge di stato restano testuali (coerente con la Soglia di Accessibilità in `EXPERIENCE.md` — mai un colore/icona da solo come portatore di significato).
- **Il bianco di sfondo/trasparenza del PNG non è stato interpretato come vincolo** — il colore di sfondo prevalente dell'app (`{colors.surface}` bianco) discende dalla decisione esplicita dell'utente "bianco e azzurro come colori sociali", non da un'inferenza sul file immagine.

## Idee scartate durante l'esplorazione

- Nessuna variante di `color-themes-1.html` ha usato il navy o il magenta come colore prevalente di sfondo — tutte e 5 le varianti esplorate rispettavano già il vincolo "bianco+azzurro dominante, navy/magenta solo accento", per esplicita richiesta dell'utente fin dal brief iniziale (nessuna variante-scartata conteneva quindi un uso del logo diverso da quello adottato).
