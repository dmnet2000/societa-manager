---
name: Mogliano Volley — Sito pubblico Settore Volley
description: Sito vetrina pubblico (senza login) del Settore Volley di Mogliano Volley — home + Squadre/Calendario/Staff/Contatti; registro "Poster Sportivo" energico da stadio/manifesto, sibling del portale gestionale interno con cui condivide il brand ma non il registro visivo.
colors:
  bianco: '#FFFFFF'
  blu-carbone: '#0F2438'
  azzurro: '#00A3E0'
  azzurro-scuro: '#0072A3'
  azzurro-partite: '#2E6F99'
  navy: '#312682'
  magenta: '#E6007C'
  magenta-chiaro: '#FFCBE6'
  grigio-chiaro: '#F2F5F7'
  grigio: '#5B6472'
  testo-chiaro-lead: '#D7DEE8'
  testo-chiaro-footer: '#B8C0CC'
  testo-chiaro-debole: '#8891A0'
  testo-chiaro-partite: '#EAF4FB'
  testo-scuro-muto: '#838E9E'
  bordo-chiaro: '#E5E9EE'
  bordo-tratteggiato: '#C6CDD6'
  bordo-scuro-forte: '#333B47'
  bordo-scuro-debole: '#262E3B'
  placeholder-hatch-alt: '#17384F'
  focus-ring: '#0072A3'
  focus-ring-chiaro: '#FFFFFF'
  focus-ring-su-azzurro: '#0F2438'
typography:
  display-hero:
    fontFamily: "'Arial Black','Arial Narrow',Impact,sans-serif"
    fontSize: 68px
    fontWeight: '900'
    lineHeight: '0.92'
    letterSpacing: 0.5px
  display-hero-mobile:
    fontFamily: "'Arial Black','Arial Narrow',Impact,sans-serif"
    fontSize: 44px
    fontWeight: '900'
    lineHeight: '0.95'
    letterSpacing: 0.5px
  display-section:
    fontFamily: "'Arial Black','Arial Narrow',Impact,sans-serif"
    fontSize: 40px
    fontWeight: '900'
    lineHeight: '1.05'
    letterSpacing: 0.5px
  display-section-mobile:
    fontFamily: "'Arial Black','Arial Narrow',Impact,sans-serif"
    fontSize: 22px
    fontWeight: '900'
    lineHeight: '1.1'
    letterSpacing: 0.5px
  display-card:
    fontFamily: "'Arial Black','Arial Narrow',Impact,sans-serif"
    fontSize: 22px
    fontWeight: '900'
    lineHeight: '1.15'
    letterSpacing: 0.5px
  label-heading:
    fontFamily: "'Arial Black',sans-serif"
    fontSize: 14px
    fontWeight: '900'
    letterSpacing: 1.5px
  wordmark:
    fontFamily: "'Arial Black',sans-serif"
    fontSize: 20px
    fontWeight: '900'
    lineHeight: '1'
  nav-item:
    fontFamily: "'Arial Narrow',Arial,'Helvetica Neue',sans-serif"
    fontSize: 14px
    fontWeight: '900'
    letterSpacing: 1px
  eyebrow:
    fontFamily: "'Arial Narrow',Arial,'Helvetica Neue',sans-serif"
    fontSize: 12px
    fontWeight: '900'
    letterSpacing: 2px
  button-label:
    fontFamily: "'Arial Narrow',Arial,'Helvetica Neue',sans-serif"
    fontSize: 14px
    fontWeight: '900'
    letterSpacing: 1px
  button-label-secondary:
    fontFamily: "'Arial Narrow',Arial,'Helvetica Neue',sans-serif"
    fontSize: 12px
    fontWeight: '700'
  label-tag:
    fontFamily: 'Arial,sans-serif'
    fontSize: 11px
    fontWeight: '700'
    letterSpacing: 1.5px
  body-lead:
    fontFamily: 'Arial,sans-serif'
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.5'
  body:
    fontFamily: 'Arial,sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.8'
  meta:
    fontFamily: 'Arial,sans-serif'
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
  countdown-value:
    fontFamily: "'Arial Narrow',Arial,'Helvetica Neue',sans-serif"
    fontSize: 20px
    fontWeight: '900'
    lineHeight: '1.1'
  countdown-label:
    fontFamily: "'Arial Narrow',Arial,'Helvetica Neue',sans-serif"
    fontSize: 9px
    fontWeight: '400'
    letterSpacing: 1px
rounded:
  none: '0px'
  sm: '2px'
  full: '9999px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '5': '20px'
  '6': '24px'
  '7': '28px'
  '8': '32px'
  '10': '40px'
  '12': '48px'
  '16': '64px'
  '20': '80px'
  header-height: '76px'
  section-padding-desktop: '80px 48px'
  section-padding-mobile: '24px 20px'
  hero-padding-desktop: '64px 48px 88px'
  hero-padding-mobile: '24px 20px'
  card-gap: '28px'
components:
  header-nav:
    background: '{colors.blu-carbone}'
    border-bottom: '4px solid {colors.azzurro}'
    height: '{spacing.header-height}'
    logo-source: 'runtime da configurazione Admin (Story 7.2), stesso asset dinamico del portale interno — riferimento visivo: ../ux-societa-manager-2026-07-22/imports/logo-mogliano-volley.png'
    wordmark-typography: '{typography.wordmark}'
    wordmark-accent-color: '{colors.azzurro}'
    nav-item-typography: '{typography.nav-item}'
    nav-item-color: '{colors.bianco}'
    nav-item-active-decoration: 'sottolineatura {colors.azzurro} 3px sempre visibile (non solo hover)'
    nav-item-hover-decoration: 'sottolineatura {colors.azzurro} 3px che si espande da 0 a 100% larghezza, transition 250ms ease'
    accedi-link-color: '{colors.testo-chiaro-debole}'
    accedi-link-hover-color: '{colors.bianco}'
    accedi-link-border: '1px solid {colors.bordo-scuro-forte}, diventa {colors.azzurro} on hover'
    accedi-link-radius: '{rounded.sm}'
    accedi-link-hit-area: '44px minimo di altezza cliccabile (il padding visivo 8px 14px su testo 12px non basta da solo, va integrato con hit-area/padding aggiuntivo)'
    mobile-behavior: 'elenco orizzontale con wrap, NESSUN drawer/hamburger — vedi Componenti (prosa) e EXPERIENCE.md → Responsive & Piattaforma'
    focus-outline: '2px solid {colors.focus-ring-chiaro}, offset 2px'
  hero:
    background: '{colors.blu-carbone}'
    clip-path: 'polygon(0 0,100% 0,100% 92%,0 100%) — taglio diagonale netto sul bordo inferiore'
    diagonal-wash: 'linear-gradient(100deg, transparent 0%, {colors.azzurro} 35% (85% opacità), {colors.navy} 100% (90% opacità)), clip-path a cuneo sul lato destro'
    eyebrow-background: '{colors.magenta}'
    eyebrow-typography: '{typography.eyebrow}'
    eyebrow-color: '{colors.bianco}'
    title-typography: '{typography.display-hero}'
    title-typography-mobile: '{typography.display-hero-mobile}'
    title-color: '{colors.bianco}'
    title-accent-color: '{colors.azzurro}'
    lead-typography: '{typography.body-lead}'
    lead-color: '{colors.testo-chiaro-lead}'
    cta: 'vedi components.button-primary'
    photo: 'vedi components.placeholder-foto'
    padding-desktop: '{spacing.hero-padding-desktop}'
    padding-mobile: '{spacing.hero-padding-mobile}'
  next-match-strip:
    background: '{colors.azzurro-partite}'
    text-color: '{colors.bianco}'
    tag-background: '{colors.blu-carbone}'
    tag-color: '{colors.bianco}'
    tag-typography: '{typography.eyebrow}'
    teams-typography: '{typography.display-card}'
    vs-color: '{colors.magenta-chiaro}'
    countdown-box-background: '{colors.blu-carbone}'
    countdown-value-typography: '{typography.countdown-value}'
    countdown-value-color: '{colors.bianco}'
    countdown-label-typography: '{typography.countdown-label}'
    countdown-label-color: '{colors.azzurro}'
    focus-outline: '2px solid {colors.focus-ring-chiaro}, offset 2px'
  team-card:
    background: '{colors.bianco}'
    shape: 'rettangolo dritto (nessun {rounded}), foto interna con clip-path a taglio diagonale sul bordo inferiore'
    shadow: '0 8px 24px rgba(11,14,20,0.08)'
    hover-transform: 'translateY(-6px), transition 250ms ease'
    photo-height-desktop: '260px'
    photo-height-mobile: '140px'
    photo-placeholder: 'vedi components.placeholder-foto — solo in fase di lancio, vedi Componenti (prosa)'
    title-typography: '{typography.display-card}'
    subtitle-typography: '{typography.label-tag}'
    subtitle-color: '{colors.azzurro-scuro}'
    coach-list-typography: '{typography.body}'
  match-card:
    background: '{colors.azzurro-partite}'
    text-color: '{colors.bianco}'
    clip-path: 'polygon(0 0,100% 0,100% 100%,4% 100%) — taglio diagonale asimmetrico nell''angolo in basso a sinistra'
    corner-accent: 'triangolo {colors.azzurro} a 15% opacità, angolo in alto a destra'
    category-tag-typography: '{typography.label-tag}'
    category-tag-color: '{colors.testo-chiaro-partite}'
    teams-typography: '{typography.display-card}'
    teams-alignment: 'sinistra (flex-start) — non centrato né a spaziatura piena, vedi Componenti (prosa)'
    vs-color: '{colors.magenta-chiaro}'
    vs-typography: '{typography.display-card}'
    meta-typography: '{typography.meta}'
    meta-color: '{colors.testo-chiaro-partite}'
  sponsor-strip:
    background: '{colors.bianco}'
    border-top: '1px solid {colors.bordo-chiaro}'
    border-bottom: '1px solid {colors.bordo-chiaro}'
    heading-typography: '{typography.label-tag}'
    heading-letter-spacing-override: '3px'
    heading-color: '{colors.grigio}'
    box-background: '{colors.grigio-chiaro}'
    box-border: '1px dashed {colors.bordo-tratteggiato}'
    box-text-typography: '{typography.label-tag}'
    box-text-color: '{colors.grigio}'
  footer:
    background: '{colors.blu-carbone}'
    text-color: '{colors.testo-chiaro-footer}'
    text-typography: '{typography.body}'
    heading-typography: '{typography.label-heading}'
    heading-color: '{colors.azzurro}'
    social-icon-background: '{colors.placeholder-hatch-alt}'
    social-icon-color: '{colors.azzurro}'
    social-icon-hover-background: '{colors.azzurro}'
    social-icon-hover-color: '{colors.blu-carbone}'
    social-icon-shape: '{rounded.full}'
    social-icon-visual-size: '38px'
    social-icon-hit-area: '44px minimo — area cliccabile reale via padding/hit-area, non l''icona visiva stessa (vedi EXPERIENCE.md → Primitive di Interazione)'
    social-icon-focus-outline: '2px solid {colors.focus-ring-chiaro}, offset 2px'
    divider: '1px solid {colors.bordo-scuro-debole}'
    copyright-typography: '{typography.meta}'
    copyright-color: '{colors.testo-scuro-muto}'
  button-primary:
    background: '{colors.azzurro}'
    foreground: '{colors.blu-carbone}'
    radius: '{rounded.none}'
    typography: '{typography.button-label}'
    text-transform: uppercase
    padding: '{spacing.4} {spacing.8}'
    hover-background: '{colors.bianco}'
    hover-transform: 'translateY(-2px)'
    transition: 'transform .2s ease, background .2s ease'
    focus-outline: 'contestuale — {colors.focus-ring-chiaro} su sfondi scuri, {colors.focus-ring-su-azzurro} su {colors.azzurro}, {colors.focus-ring} su {colors.bianco}/{colors.grigio-chiaro} (vedi Componenti, prosa)'
  cookie-banner:
    background: '{colors.bianco}'
    border-top: '2px solid {colors.blu-carbone}'
    radius: '{rounded.none}'
    text-typography: '{typography.body}'
    text-color: '{colors.blu-carbone}'
    cta-primary: 'variante compatta di components.button-primary'
    cta-secondary-typography: '{typography.button-label-secondary}'
    cta-secondary-color: '{colors.grigio}'
    cta-secondary-background: '{colors.bianco}'
    cta-secondary-focus-outline: '2px solid {colors.focus-ring}, offset 2px'
    shadow: '0 -4px 16px rgba(11,14,20,0.12)'
    position: 'fissato in basso, larghezza piena, non bloccante — nessun overlay/scrim sul resto della pagina'
  social-embed:
    background: '{colors.grigio-chiaro}'
    padding: '{spacing.6}'
    heading-typography: '{typography.display-section}'
    heading-typography-mobile: '{typography.display-section-mobile}'
    container-radius: '{rounded.none}'
    iframe-title: 'obbligatorio, descrittivo (es. "Ultimi post dalla pagina Facebook di Mogliano Volley") — vedi EXPERIENCE.md → Soglia di Accessibilità'
  staff-list:
    background: '{colors.bianco}'
    row-border-bottom: '1px solid {colors.bordo-chiaro}'
    name-typography: '{typography.display-card}'
    name-color: '{colors.blu-carbone}'
    gruppi-typography: '{typography.body}'
    gruppi-color: '{colors.grigio}'
    heading-typography: '{typography.display-section}'
    heading-typography-mobile: '{typography.display-section-mobile}'
  contact-block:
    background: '{colors.grigio-chiaro}'
    padding: '{spacing.8} {spacing.6}'
    label-typography: '{typography.label-tag}'
    label-color: '{colors.grigio}'
    value-typography: '{typography.body}'
    value-color: '{colors.blu-carbone}'
    social-icon-shape: '{rounded.full}'
    social-icon-hit-area: 'stesso vincolo 44px di components.footer.social-icon-hit-area'
    heading-typography: '{typography.display-section}'
    heading-typography-mobile: '{typography.display-section-mobile}'
  placeholder-foto:
    pattern: 'repeating-linear-gradient diagonale (45° hero, -45° team-card), banda 10-14px, {colors.blu-carbone} alternato a {colors.placeholder-hatch-alt}'
    caption-typography: '{typography.label-tag}'
    caption-color: 'rgba(255,255,255,0.55)'
    caption-example: '"[FOTO SQUADRA]", "[FOTO AZIONE — SCHIACCIATA A RETE]"'
status: final
updated: 2026-08-14
---

## Marchio e Stile

Questo è il sito vetrina pubblico del Settore Volley di Mogliano Volley: la pagina che un genitore apre da telefono il venerdì sera per sapere dove si gioca sabato, che un potenziale iscritto guarda prima di chiamare la segreteria, che compare quando la società condivide un link sui propri social. Non richiede login, non presuppone alcun rapporto pregresso col club — deve convincere e informare in pochi secondi di scroll, non far completare un compito operativo.

È il sibling esatto di `../ux-societa-manager-2026-07-22/DESIGN.md`, il DESIGN.md `final` dello strumento gestionale interno dello stesso club (stesso brand, stesso stemma, stessi colori sociali reali bianco+azzurro con navy/magenta da logo). Quel documento è esplicito: non è un sito vetrina, ed esclude deliberatamente i pattern da "poster da tifoseria" — cita imocovolley.it come riferimento scartato, utile solo per il registro emotivo, non per l'interfaccia di uno strumento di lavoro quotidiano. Questo documento è esattamente la superficie che quel documento escludeva: qui il registro "poster da stadio" non è scartato, è la direzione scelta esplicitamente in discovery (2026-08-13) dopo il confronto di 4 direzioni visive alternative — **Poster Sportivo** ha vinto perché è la più vicina al requisito originale dell'epica ("un registro visivo accattivante").

La divergenza tra i due documenti è intenzionale, non un'incoerenza da correggere: stesso club, stessi colori di brand (`{colors.azzurro}`, `{colors.navy}`, `{colors.magenta}` sono gli stessi valori esadecimali del portale interno), ma registro tipografico, spaziatura, forme e uso del colore completamente diversi, perché il pubblico e il compito sono diversi — un visitatore anonimo che sfoglia una vetrina non è un allenatore che segna presenze in tre tocchi. Dove il portale interno usa angoli 6-8px e ombre quasi assenti per comunicare precisione operativa, questo sito usa tagli diagonali netti (`clip-path`), un blu molto scuro assertivo nei blocchi di contenuto chiave e tipografia condensata pesante (peso 900, tutto maiuscolo) per comunicare energia da stadio.

Nessun font viene caricato: solo stack di sistema (`Arial Black`/`Arial Narrow`/`Impact`/`Arial`), la stessa disciplina "niente webfont" del portale interno, per gli stessi motivi (leggerezza, velocità su mobile, nessuna dipendenza esterna) — qui però il carattere energico non viene solo dal peso ma anche dalla composizione: tagli diagonali, blocchi colore pieni, fotografia (per ora placeholder, vedi sotto) protagonista nell'hero.

`[RISOLTO — Story 18.15, 2026-08-14]` La prima stesura di questo documento (2026-08-13) usava un quasi-nero (`#0B0E14`) per i blocchi scuri strutturali. Dopo aver visto il sito pubblico live (Story 18.9-18.13 implementate), l'utente ha chiesto esplicitamente di non vedere più il nero: *"non voglio vedere il colore nero sul sito, lo stile grafico del resto non è male"* — confermando che il resto del registro (diagonali, tipografia, blocchi azzurro, accenti magenta) restava valido. Confrontate 3 alternative in artifact comparativo (stesso mockup, solo il colore scuro cambiato): **A — navy dello stemma** (scartata: il navy è già l'accento dell'innesto diagonale dell'hero, riusarlo anche come sfondo strutturale gli avrebbe tolto distintività), **B — blu carbone** (scelta), **C — antracite caldo neutro** (non scelta). `{colors.blu-carbone}` (`#0F2438`) sostituisce ovunque il vecchio quasi-nero nel resto di questo documento — stesso ruolo strutturale, stessa disciplina d'uso (blocchi di contenuto specifici, mai sfondo di pagina), ma resta nella famiglia cromatica fredda del brand (bianco+azzurro) invece di un nero generico da poster.

`[NOTA UX APERTA]` Il mockup di riferimento (`mockups/home-poster-sportivo.html`) mostra, nella sua sezione "Squadre", card con nome/ruolo/numero di maglia di singole atlete (es. "Giulia Bortoletto — Schiacciatrice — n. 7"). Questo è contenuto illustrativo del mockup, **non** il contenuto reale della pagina `/squadre` (Story 18.8): il prodotto non mostra mai nomi di Atlete in pubblico (dato intenzionalmente mai esposto, vedi `epics.md` Story 18.8 AC #2) e non esiste alcun campo "numero di maglia" nel modello dati pubblico. Questo documento distilla il **registro visivo** del mockup (colori, tipografia, forme, tagli), non il suo contenuto d'esempio — vedi Componenti → `team-card` per il contenuto reale, e Cose da fare e da evitare per la correzione esplicita. Il mockup mostra anche ancora il vecchio quasi-nero nei propri file `.working/` — quei file restano invariati come riferimento storico delle 4 direzioni originali, la palette reale è quella di questo documento, non quella del mockup HTML.

## Colori

La base sociale resta bianco+azzurro, esattamente come nel portale interno — ma qui l'azzurro non è solo un accento di interazione, è un blocco colore a piena area (la fascia "prossima partita"), e il blu scuro non è assente com'è nel portale interno: è usato assertivamente in blocchi di contenuto specifici.

- **{colors.bianco}** (`#FFFFFF`) — superficie di chrome chiaro: header/nav no, quello è scuro (vedi sotto) — ma sezione Squadre (sfondo `{colors.grigio-chiaro}`), sezione Partite, sezione Sponsor, e ogni team-card. Resta la superficie prevalente per area totale della pagina nonostante la drammaticità dei blocchi scuri.
- **{colors.blu-carbone}** (`#0F2438`) blu molto scuro, **non** uno sfondo di sito — è riservato a blocchi di **contenuto** specifici e ricorrenti: header/nav, hero, tag "prossima partita" e box countdown (chip scuri dentro i blocchi partite), footer. Non è mai lo sfondo dell'intera pagina né delle sezioni chiare (Squadre/Sponsor), e **non** è più lo sfondo delle match-card/fascia "prossima partita" (vedi `{colors.azzurro-partite}` sotto — corretto in una seconda iterazione della Story 18.15). Vedi Layout e Spaziatura per la distinzione esplicita "blocchi scuri vs chrome chiaro" — è la sfumatura più facile da sbagliare in questo sistema. **Sostituisce il quasi-nero `#0B0E14` della prima stesura** (Story 18.15, 2026-08-14, richiesta esplicita dell'utente) — stesso ruolo strutturale, ma un blu molto scuro invece di un nero generico, per restare nella famiglia cromatica del brand.
- **{colors.azzurro}** (`#00A3E0`) qui è un **blocco colore pieno**, non solo un accento come nel portale interno: riempie il pulsante primario e l'accento diagonale dell'hero (**non** più la fascia "prossima partita", vedi `{colors.azzurro-partite}` sotto). Contrasto testo/sfondo verificato per l'uso reale in questo componente: testo `{colors.blu-carbone}` su `{colors.azzurro}` (`button-primary`) = **5.51:1** (calcolato, soglia AA 4.5:1 superata anche per testo normale, non solo per testo grande).
- **{colors.azzurro-scuro}** (`#0072A3`) variante più profonda per testo su sfondo chiaro dove `{colors.azzurro}` da solo non basterebbe (vedi `{colors.focus-ring}` sotto) e per l'etichetta di ruolo/categoria nelle team-card su sfondo bianco.
- **{colors.azzurro-partite}** (`#2E6F99`) `[NUOVO — Story 18.15, seconda iterazione, 2026-08-14]` blu medio, più chiaro e più saturo del `{colors.blu-carbone}` strutturale, riservato **esclusivamente** ai due blocchi legati alle partite: sfondo della fascia "prossima partita" (`next-match-strip`) e di ogni match-card. Nato da un feedback diretto dell'utente dopo aver visto la Story 18.15 dal vivo: *"non mi piace il colore delle partite... il colore di fondo più sul bluetto e chiaro"* — confrontate 3 alternative in artifact comparativo (A azzurro intenso `#1B4D73`, B azzurro medio `#2E6F99` — scelta, C azzurro chiaro pastello `#D6ECF8`). Testo bianco sopra = **5.46:1** (pass AA anche per testo normale). Introdurre questo token ha reso orfani i token `testo-chiaro-muto` e `{colors.navy}`/`{colors.magenta}` pieno come colore diretto del divisore "vs" su questi due blocchi — vedi sotto.
- **{colors.testo-chiaro-partite}** (`#EAF4FB`) `[NUOVO — Story 18.15, seconda iterazione]` testo secondario (etichetta categoria/girone, metadati data-ora-luogo) sopra `{colors.azzurro-partite}` — i toni chiari già usati su `{colors.blu-carbone}` non reggono su questo sfondo più chiaro (es. `{colors.azzurro}` scende a 1.90:1): serviva un tono specifico per questo componente, verificato a **4.89:1**, con margine reale rispetto alla soglia 4.5:1, non al limite.
- **{colors.navy}** (`#312682`) qui **non** è riservato come nel portale interno, ma il suo unico uso reale nel sistema è ora l'innesto diagonale dell'hero (gradiente con `{colors.azzurro}`) — non compone più il divisore "vs" della fascia "prossima partita" (quel ruolo, dopo il cambio a `{colors.azzurro-partite}`, è passato a `{colors.magenta-chiaro}`: navy su `{colors.azzurro-partite}` scenderebbe a 2.22:1, ben sotto soglia anche per testo grande). Distinto per tonalità dal `{colors.blu-carbone}` (navy vira al violaceo, blu-carbone resta nella famiglia ciano/petrolio dell'azzurro) — restano visivamente distinguibili l'uno dall'altro, motivo per cui il navy non è stato scelto come sostituto del nero nella prima iterazione della Story 18.15 (avrebbe reso l'innesto diagonale dell'hero meno leggibile contro uno sfondo dello stesso colore).
- **{colors.magenta}** (`#E6007C`) resta l'accento più riservato del sistema, coerente col principio del portale interno ("mai una fill ampia") — il suo unico punto di innesco reale oggi è il badge eyebrow dell'hero ("Stagione 2026/27"), testo bianco su magenta = **4.51:1** (margine minimo, da tenere d'occhio in produzione per eventuali scostamenti di resa colore). Il magenta pieno **non** è più usato per il divisore "vs" (vedi `{colors.magenta-chiaro}` sotto) — su `{colors.blu-carbone}` restava comunque a un margine molto stretto (3.50:1), e su `{colors.azzurro-partite}` sarebbe sceso a **1.21:1** (le due luminanze sono quasi identiche, il magenta vi sarebbe stato quasi invisibile). Il badge numero-maglia del mockup (magenta, sulla foto squadra) **non** viene portato nel sistema reale — vedi Marchio e Stile sopra e Cose da fare e da evitare.
- **{colors.magenta-chiaro}** (`#FFCBE6`) `[NUOVO — Story 18.15, seconda iterazione]` tinta chiara della famiglia magenta, sostituisce il magenta pieno come divisore "vs" in entrambi i blocchi partite (`next-match-strip` e `match-card`) sopra `{colors.azzurro-partite}`: **3.88:1** — sotto la soglia piena 4.5:1 per testo normale, sopra la soglia ridotta 3:1 per testo grande, per questo resta vincolato a `{typography.display-card}` (mai più piccolo) esattamente come il magenta pieno lo era prima. Non riusare altrove come accento generico: resta specifico a questo ruolo, per non moltiplicare le tinte di un colore già riservato.
- **{colors.grigio-chiaro}** (`#F2F5F7`) sfondo della sezione Squadre, dei box sponsor-placeholder — un chiaro "quasi bianco" che separa leggermente una sezione dall'altra senza introdurre un bordo pesante, stesso ruolo che il token `surface-alt` gioca nel `DESIGN.md` del portale interno (nome diverso, stesso principio — non è un riferimento a un token di questo documento).
- **{colors.grigio}** (`#5B6472`) testo secondario su sfondo chiaro: numerazione di sezione, intestazione "I nostri sponsor", testo nei box sponsor-placeholder.
- **{colors.testo-chiaro-lead}** (`#D7DEE8`), **{colors.testo-chiaro-footer}** (`#B8C0CC`), **{colors.testo-scuro-muto}** (`#838E9E`) — tre toni di testo chiaro/grigio-azzurro su sfondo `{colors.blu-carbone}`, usati rispettivamente per: il paragrafo introduttivo dell'hero, il corpo testo del footer, e la riga di copyright. Contrasto ricalcolato su `{colors.blu-carbone}` per tutti e tre (Story 18.15, dopo il cambio dal quasi-nero): lead 11.58:1 (era 14.26:1), footer 8.61:1 (era 10.53:1), copyright/scuro-muto 4.76:1 (era 5.24:1) — tutti sopra soglia AA. **Correzione reale necessaria per `{colors.testo-scuro-muto}`**: il valore precedente (`#7B8697`, già una correzione della stesura originale) scendeva a **4.29:1** sul nuovo sfondo più chiaro `{colors.blu-carbone}` — sotto soglia AA. Il valore qui sopra (`#838E9E`) è la correzione, riverificata a 4.76:1. **`{colors.testo-chiaro-muto}` (`#AEB6C2`) è stato ritirato**: il suo unico uso era il testo secondario delle match-card, ora su `{colors.azzurro-partite}` e coperto da `{colors.testo-chiaro-partite}` — non è più referenziato da nessun componente.
- **{colors.testo-chiaro-debole}** (`#8891A0`) — link "Accedi" nell'header, deliberatamente meno prominente delle voci di menu (è un ingresso verso l'area riservata, non una sezione del sito vetrina). Contrasto su `{colors.blu-carbone}`: **4.97:1** (ricalcolato, era 6.08:1 col vecchio quasi-nero), sopra soglia AA con margine più stretto ma ancora solido.
- **{colors.bordo-chiaro}**, **{colors.bordo-tratteggiato}** — bordi sottili su sfondo chiaro (fascia sponsor, box sponsor-placeholder tratteggiato).
- **{colors.bordo-scuro-forte}**, **{colors.bordo-scuro-debole}** — bordi sottili su sfondo `{colors.blu-carbone}` (contorno idle del link "Accedi"; divisore sopra la riga di copyright nel footer).
- **{colors.placeholder-hatch-alt}** (`#17384F`) — seconda tinta della trama diagonale placeholder-foto (vedi Componenti) e sfondo idle delle icone social nel footer. Ricalcolato in proporzione al nuovo `{colors.blu-carbone}` (Story 18.15) — vedi nota sulla didascalia del placeholder-foto più sotto per l'impatto sul contrasto.
- **{colors.focus-ring}** / **{colors.focus-ring-chiaro}** / **{colors.focus-ring-su-azzurro}** — `[ASSUMPTION]` il mockup di riferimento non definisce **alcuno** stato `:focus-visible` (è un mockup puramente visivo, non uno stato di interazione). Questi tre token sono un'estrapolazione, non una decisione già presa in discovery — necessaria per rispettare la Soglia di Accessibilità (vedi `EXPERIENCE.md`). Verificati: `{colors.focus-ring}` (`#0072A3`) su `{colors.bianco}` = 5.33:1 (invariato); `{colors.focus-ring-su-azzurro}` (`{colors.blu-carbone}`) su `{colors.azzurro}` = 5.51:1, unico uso oggi il pulsante primario (`button-primary`). **Non** usare `{colors.azzurro}` stesso o `{colors.bianco}` come anello di focus sopra `{colors.azzurro}`: entrambi scendono a ~2.87:1, sotto la soglia 3:1 richiesta per un indicatore di focus (SC 1.4.11) — lo stesso tipo di trappola di contrasto già documentata nel `DESIGN.md` del portale interno per il suo token `primary` su testo bianco piccolo (documento diverso, non un token di questo file). La fascia "prossima partita" (`next-match-strip`), dopo il cambio di sfondo a `{colors.azzurro-partite}`, usa invece `{colors.focus-ring-chiaro}` (bianco): `{colors.focus-ring-su-azzurro}` su questo sfondo più chiaro scenderebbe a 2.89:1, sotto soglia — bianco resta a 5.46:1.

## Tipografia

Tre famiglie, tutte di sistema, nessun font caricato — la stessa disciplina "niente webfont" del portale interno, applicata però a un ramo tipografico più ricco perché questo è un sito editoriale/vetrina con più ruoli di testo:

- **Famiglia display** (`'Arial Black','Arial Narrow',Impact,sans-serif`) — titoli, nomi squadra/partita, wordmark. Sempre peso 900, sempre maiuscolo (via `text-transform`, mai testo sorgente maiuscolo — stessa regola di accessibilità già stabilita nel portale interno per i pulsanti). `{typography.display-hero}` (68px, 44px su mobile) per il titolo hero; `{typography.display-section}` (40px, 22px su mobile) per i titoli di sezione; `{typography.display-card}` (22px) per nomi squadra/partita nelle card; `{typography.wordmark}` (20px) per il nome del club nell'header/footer; `{typography.label-heading}` (14px) per le intestazioni minori (footer, indice di sezione).
- **Famiglia condensata** (`'Arial Narrow',Arial,'Helvetica Neue',sans-serif`) — voci di navigazione, badge eyebrow, pulsanti, valore del countdown. `{typography.nav-item}` (14px/900), `{typography.eyebrow}` (12px/900), `{typography.button-label}` (14px/900) e `{typography.button-label-secondary}` (12px/700, "Accedi"), `{typography.countdown-value}` (20px/900) e `{typography.countdown-label}` (9px/400).
- **Famiglia testo** (`Arial,sans-serif`) — tutto ciò che è lettura corrente: `{typography.body-lead}` (17px, paragrafo hero), `{typography.body}` (14px, footer), `{typography.meta}` (13px, data/luogo partita), `{typography.label-tag}` (11px/700, etichette categoria/sponsor).

`[NOTA UX APERTA]` `{typography.countdown-label}` è a 9px — molto piccolo anche se il contrasto colore calcolato passa (5.51:1 su `{colors.blu-carbone}`, ricalcolato Story 18.15 — era 6.73:1, la soglia WCAG non impone una dimensione minima). È una didascalia di 3-4 caratteri ("giorni"/"ore"/"min"), non testo di lettura essenziale, ma vale la pena valutare in sviluppo se portarla a 10-11px per maggiore leggibilità a colpo d'occhio su schermi piccoli — non un blocco, solo una raccomandazione.

Nessun corsivo, nessun peso intermedio (regular o 900, mai 500/600) — la gerarchia si legge dal salto di peso e di famiglia, non da variazioni sottili, coerente col registro "da poster" scelto.

## Layout e Spaziatura

La distinzione più importante di questo sistema, facile da sbagliare: **non è un sito dark-mode**. Il registro ottiene la sua drammaticità da blocchi di contenuto specifici in `{colors.blu-carbone}` (header/nav, hero, match-card, footer, tag/countdown della fascia partita) — non da un tema scuro applicato all'intera pagina. Header e nav sono scuri; la sezione Squadre, la sezione Sponsor, e il corpo di ogni team-card restano su `{colors.bianco}`/`{colors.grigio-chiaro}`. Un sito interamente scuro avrebbe tradito sia il requisito "nessuna dark mode" sia i colori sociali reali (bianco+azzurro) che restano l'identità prevalente del club.

Scala di spaziatura dedotta direttamente dai valori del mockup di riferimento (padding di sezione 80px/48px desktop, 24px/20px mobile; gap tra card 28px; altezza header 76px) — non è un multiplo di 4px pulito ovunque (`{spacing.7}` = 28px rompe la progressione), perché il mockup non è stato costruito partendo da una scala astratta ma da proporzioni visive dirette; questo documento la formalizza così com'è, senza forzarla a una progressione più "pulita" che il riferimento visivo non useresti realmente.

Il layout è arioso nelle sezioni chiare (padding 80px verticale desktop tra sezioni) e compresso nei blocchi scuri (padding interno delle match-card e box countdown molto più stretto) — un contrasto di respiro deliberato: le sezioni chiare invitano a scorrere con calma, i blocchi scuri comunicano urgenza/azione (prossima partita, risultato).

Griglia: `team-grid` e `match-grid` sono griglie CSS a colonne fisse (3 colonne team, 2 colonne match) che collassano a una singola colonna sotto i 900px — unico breakpoint esplicito nel mockup di riferimento. `[ASSUMPTION]` Il mockup include anche un frame dimostrativo a 375px che mostra ulteriori riduzioni (es. titolo hero a 32px, non ai 44px del breakpoint 900px) senza definire un secondo breakpoint formale nel CSS. Questo documento non introduce un secondo breakpoint rigido: raccomanda di trattare la riduzione sotto ai ~480px come una scala fluida tra `{typography.display-hero-mobile}` (44px) e circa 32px, non un terzo valore fisso — da confermare in sviluppo se serve un breakpoint dedicato o basta un `clamp()`.

## Elevazione e Profondità

A differenza del portale interno (nessuna ombra, separazione solo per colore/bordo), questo sistema usa **un'unica ombra diffusa e leggera**, riservata esclusivamente alle superfici chiare: `0 8px 24px rgba(11,14,20,0.08)` sulle team-card. Nessun'altra superficie usa ombra — i blocchi scuri (hero, match-card, footer) si separano dal resto della pagina per taglio diagonale (`clip-path`) e blocco di colore pieno, mai per elevazione; l'header si separa per un bordo inferiore netto di 4px in `{colors.azzurro}`, non per ombra. Il valore rgba dell'ombra resta un tono neutro generico (non legato a `{colors.blu-carbone}`) — le ombre in questo sistema non portano significato di brand, solo separazione visiva, quindi non sono state ricalcolate col cambio colore di Story 18.15.

`[ASSUMPTION]` Il banner cookie (non presente nel mockup di riferimento, vedi Componenti) estrapola lo stesso principio "ombra riservata alle superfici chiare/transitorie": `0 -4px 16px rgba(11,14,20,0.12)`, leggermente più marcata delle team-card perché deve separarsi visivamente dal contenuto sottostante essendo un elemento sovrapposto fisso, non di flusso — stesso principio già usato dal portale interno per i suoi elementi transitori (menu profilo), qui applicato con un valore nuovo perché il contesto (banner a piena larghezza in basso, non un dropdown) è diverso.

## Forme

Divergenza deliberata e netta dal portale interno: dove quel sistema usa angoli 6-8px ovunque e nessuna forma a pillola, questo sistema usa **tagli diagonali (`clip-path`) al posto degli angoli arrotondati** — `{rounded.none}` (0px) è il valore di default per card, pulsanti, badge, blocchi di contenuto. La drammaticità non viene da un raggio ampio ma dalla geometria: l'hero si chiude con un taglio diagonale sul bordo inferiore, le match-card hanno un angolo tagliato in basso a sinistra, le foto squadra hanno un taglio diagonale sul bordo inferiore della propria area.

Due sole eccezioni, entrambe minori: `{rounded.sm}` (2px, appena percettibile) sul contorno del link "Accedi" nell'header — un dettaglio secondario coerente col suo ruolo di elemento meno prominente; `{rounded.full}` sulle icone social del footer, unica forma davvero circolare del sistema. Nessuna pillola (`rounded.full` su un elemento non circolare) altrove.

Questa scelta è coerente col registro "poster/manifesto da stadio": il taglio diagonale netto comunica energia e movimento in modo che un angolo arrotondato non comunicherebbe — è la stessa logica di divergenza già dichiarata esplicitamente dal portale interno quando ha scartato le forme "morbide" per il proprio registro "deciso ma da strumento di lavoro"; qui la direzione è ancora più marcata perché il pubblico e il compito sono diversi.

## Componenti

- **Header/nav (`header-nav`)** — sfondo `{colors.blu-carbone}` a piena larghezza con bordo inferiore netto di 4px `{colors.azzurro}`. Stemma del club a sinistra: **non** un asset statico — letto a runtime dalla stessa configurazione Admin del portale interno (Story 7.2), riferimento visivo `../ux-societa-manager-2026-07-22/imports/logo-mogliano-volley.png`. Nome club in `{typography.wordmark}`, con la parola "VOLLEY" in `{colors.azzurro}`. Voci di menu (Home/Squadre/Calendario/Staff/Contatti) in `{typography.nav-item}`, bianco su blu scuro; voce attiva con sottolineatura `{colors.azzurro}` sempre visibile; hover con sottolineatura che si espande da 0 a piena larghezza (micro-animazione, 250ms). Link "Accedi" visivamente secondario (`{colors.testo-chiaro-debole}`, bordo sottile, `{rounded.sm}`), diventa bianco/azzurro all'hover. **Comportamento mobile: elenco orizzontale con wrap, nessun drawer/hamburger** — vedi nota critica sotto.

  `[RISOLTO — decisione 2026-08-13]` Il mockup di riferimento (`mockups/home-poster-sportivo.html`) mostra, nel suo frame mobile dimostrativo a 375px, un'icona hamburger (`.m-burger`) e nasconde interamente `nav.main` sotto i 900px via CSS — questo è **solo il comportamento del mockup statico**, non il pattern realmente deciso. La Story 18.7 (menu di navigazione multi-pagina) è già stata implementata (`app/NavPubblica.tsx`/`.module.css`) con la decisione opposta ed esplicita: **elenco orizzontale con wrap**, nessun drawer/hamburger — motivata dal fatto che 5 voci corte non giustificano un pattern più strutturato come quello della NavBar interna (Story 9.2, ruolo-dipendente e più lunga). Il restyling di questo componente deve **riverniciare** i colori/tipografia del pattern già esistente (wrap orizzontale) secondo i token sopra, non reintrodurre l'hamburger del mockup. `[NOTA UX APERTA]` resta aperto solo per il futuro: se il menu dovesse mai crescere oltre le 5+1 voci attuali, la scelta "wrap orizzontale" andrebbe rivalutata — non è un problema oggi.

- **Hero (`hero`)** — sfondo `{colors.blu-carbone}`, taglio diagonale sul bordo inferiore (`clip-path`), foto placeholder a piena area (vedi `placeholder-foto` sotto) con un innesto diagonale `{colors.azzurro}`→`{colors.navy}` sul lato destro. Badge eyebrow (es. "Stagione 2026/27") in `{colors.magenta}`, `{typography.eyebrow}`, bianco. Titolo in `{typography.display-hero}` (44px su mobile), bianco con una parola/frase accentata in `{colors.azzurro}` (uso di `<em>` semanticamente neutro, solo stile). Paragrafo introduttivo in `{typography.body-lead}`, `{colors.testo-chiaro-lead}`. Un solo pulsante primario come CTA (vedi `button-primary`).

  `[NOTA UX APERTA]` Il titolo ha un'ombra testo (`text-shadow: 0 4px 24px rgba(0,0,0,0.5)`) pensata per restare leggibile sopra una foto reale futura — ma senza una foto reale da verificare oggi, il contrasto testo/immagine non è calcolabile con certezza: quando arriverà la prima foto d'azione reale per l'hero (Story 18.14, backlog), va verificato che l'ombra/overlay scuro basti a mantenere il titolo leggibile sopra quello specifico scatto, non assunto per tutte le foto future.

- **Fascia "prossima partita" (`next-match-strip`)** — blocco colore pieno `{colors.azzurro-partite}` (blu medio, `[RISOLTO — Story 18.15, seconda iterazione, 2026-08-14]`: l'utente non gradiva né il quasi-nero originale né l'azzurro pieno di prima stesura su questo blocco, "il colore di fondo più sul bluetto e chiaro" — vedi Colori per il confronto a 3 vie), testo `{colors.bianco}` (contrasto 5.46:1). Tag "Prossima partita" in chip `{colors.blu-carbone}`/bianco, `{typography.eyebrow}`. Nomi squadra in `{typography.display-card}` con divisore "vs" in `{colors.magenta-chiaro}` (**non** magenta pieno — scenderebbe a 1.21:1 su questo sfondo, vedi Colori; **non** più navy — scenderebbe a 2.22:1). Countdown a tre box `{colors.blu-carbone}`/bianco con etichetta piccola `{colors.azzurro}` (vedi nota tipografica sulla dimensione 9px).

- **Team-card (`team-card`)** — **contenuto reale**, non quello del mockup: nome del Gruppo (es. "Under 16 Femminile"), categoria come sottotitolo (`{typography.label-tag}`, `{colors.azzurro-scuro}`), elenco degli Allenatori assegnati (`{typography.body}` — zero, uno o più nomi; un Gruppo senza Allenatore compare comunque, senza elenco, per `epics.md` Story 18.8 AC #3). Foto squadra quando esiste (Story 18.4), altrimenti placeholder intenzionale in fase di lancio (Story 18.12 AC #5) — vedi `EXPERIENCE.md` → Pattern di Stato per la distinzione tra placeholder di lancio e assenza permanente di foto (regola diversa dalla galleria "parziale" della home). Card rettangolare (nessun `{rounded}`), foto interna con taglio diagonale sul bordo inferiore, ombra leggera, si solleva di 6px all'hover (250ms). **Nessun badge numero-maglia magenta** — quell'elemento del mockup mostra un dato (numero di maglia atleta) che non esiste nella pagina `/squadre` reale.

- **Match-card (`match-card`)** — blocco `{colors.azzurro-partite}`/bianco (`[RISOLTO — Story 18.15, seconda iterazione, 2026-08-14]`, stesso sfondo del `next-match-strip`, vedi sopra e Colori), taglio diagonale asimmetrico nell'angolo in basso a sinistra, triangolo `{colors.azzurro}` a bassa opacità nell'angolo opposto come accento strutturale. Etichetta categoria/girone in `{typography.label-tag}` `{colors.testo-chiaro-partite}` (**non** più `{colors.azzurro}` puro — scenderebbe a 1.90:1 su questo sfondo più chiaro). Nomi squadra in `{typography.display-card}`, **allineati a sinistra** (`flex-start`, non centrati e non a spaziatura piena `space-between` come nel mockup di riferimento — correzione esplicita richiesta dall'utente, il mockup spargeva "squadra1 ... VS ... squadra2" ai due margini della card) con "vs" in `{colors.magenta-chiaro}`, **esplicitamente alla stessa dimensione/peso del testo squadra** (`vs-typography: {typography.display-card}`, mai più piccolo): a quella dimensione il divisore è testo grande (soglia 3:1, supera 3.88:1). Metadati data/ora/luogo in `{typography.meta}` `{colors.testo-chiaro-partite}` (4.89:1). Stesso componente riusato sia nel teaser "partite della settimana" in home sia nell'elenco completo di `/calendario` (Story 18.9), raggruppato per settimana in quest'ultimo caso.

- **Fascia sponsor (`sponsor-strip`)** — sfondo bianco, bordi sottili sopra/sotto, intestazione discreta ("I nostri sponsor") in grigio. Box sponsor con bordo tratteggiato quando lo sponsor non ha ancora un logo caricato (placeholder distinto dal pattern foto, vedi sotto) — sezione intera nascosta se non ci sono Sponsor attivi (`epics.md` Story 18.2 AC #2, nessuna area vuota).

- **Footer (`footer`)** — sfondo `{colors.blu-carbone}`, tre colonne (contatti+social, menu, società) che collassano a colonna singola sotto i 900px. Intestazioni di colonna in `{typography.label-heading}` `{colors.azzurro}` maiuscolo, corpo testo in `{typography.body}` `{colors.testo-chiaro-footer}`. Icone social come cerchi (`{rounded.full}`) con iniziali testuali (nessuna libreria di icone caricata, coerente con "nessun webfont"), sfondo `{colors.placeholder-hatch-alt}` che diventa `{colors.azzurro}` all'hover, **area cliccabile reale minimo 44×44px** anche se la resa visiva dell'icona resta 38px (padding/hit-area, non l'icona stessa), contorno di focus `{colors.focus-ring-chiaro}` dedicato. Riga di copyright separata da un divisore sottile, in `{typography.meta}` `{colors.testo-scuro-muto}` (valore ricalcolato Story 18.15, vedi Colori).

- **Pulsante primario (`button-primary`)** — blocco pieno `{colors.azzurro}`, testo `{colors.blu-carbone}`, nessun radius, `{typography.button-label}` maiuscolo (via CSS, mai testo sorgente maiuscolo — stessa regola già stabilita nel portale interno). All'hover: sfondo bianco + sollevamento di 2px (200ms). Micro-animazione, non decorativa: comunica "clic registrato", coerente col principio "solo transizioni di stato essenziali" ereditato dal portale interno.

- **Banner cookie (`cookie-banner`)** — `[ASSUMPTION]`, non presente nel mockup di riferimento: estrapolato dal precedente del portale interno per le superfici transitorie (leggera, non invasiva, non un modale). A differenza del menu profilo del portale interno (che vive sul suo token `surface`, con ombra leggera, perché è un dropdown ancorato — documento diverso, non un token di questo file), questo banner è una **fascia fissa in basso, a piena larghezza**, sfondo bianco (non scuro — è un elemento di sistema/chrome transitorio, non un blocco di contenuto, coerente con la distinzione in Layout e Spaziatura), bordo superiore netto `{colors.blu-carbone}` 2px (nessun radius, coerente col resto del sistema), ombra leggera verso l'alto per separarsi dal contenuto sottostante. Pulsante primario compatto "Accetta", azione secondaria testuale "Rifiuta" in `{typography.button-label-secondary}` `{colors.grigio}` su `{colors.bianco}` (~5.46:1, invariato dal cambio colore di sfondo scuro — questa coppia non lo coinvolge), con lo stesso peso visivo di "Accetta" per non introdurre un dark pattern (vedi `EXPERIENCE.md` → Voce e Tono), contorno di focus `{colors.focus-ring}` dedicato. Non blocca la navigazione (`epics.md` Story 18.6 AC #4) — nessuno scrim, nessun overlay sul resto della pagina.

- **Embed post social (`social-embed`)** — sfondo `{colors.grigio-chiaro}` (stessa superficie chiara di Squadre/Sponsor, coerente con "nessun blocco scuro fuori dai contenitori ricorrenti già elencati"), titolo di sezione in `{typography.display-section}`. L'iframe del widget ufficiale della piattaforma richiede un `title` descrittivo esplicito (es. "Ultimi post dalla pagina Facebook di Mogliano Volley") — requisito di accessibilità minimo per un contenuto di terze parti, vedi `EXPERIENCE.md` → Soglia di Accessibilità. Questa sezione è in scope per la sostituzione con un carosello proprio (Story 18.13, backlog) — quando implementata, riusa comunque questi stessi token di sfondo/tipografia per il contenitore.

- **Elenco Staff (`staff-list`)** — `/staff` (Story 18.10). Elenco su sfondo bianco, righe separate da bordo sottile `{colors.bordo-chiaro}` (non card, coerente con un elenco denso di nome+Gruppi per Allenatore). Nome Allenatore in `{typography.display-card}` `{colors.blu-carbone}`, elenco dei Gruppi seguiti in `{typography.body}` `{colors.grigio}` sotto il nome.

- **Blocco contatti (`contact-block`)** — `/contatti` (Story 18.11). Sfondo `{colors.grigio-chiaro}`, ogni campo (indirizzo/telefono/email) con etichetta piccola (`{typography.label-tag}` `{colors.grigio}`) sopra il valore (`{typography.body}` `{colors.blu-carbone}`) — solo i campi effettivamente configurati vengono renderizzati (nessuna etichetta orfana). Icone social, se presenti, riusano lo stesso vincolo di area cliccabile 44px di `components.footer`.

- **Foto placeholder (`placeholder-foto`)** — trama diagonale ripetuta (`{colors.blu-carbone}` alternato a `{colors.placeholder-hatch-alt}`, bande 10-14px) con didascalia centrata maiuscola discreta (`{typography.label-tag}`, bianco a opacità **55%** — fissa, non un range, vedi nota sotto — es. "[FOTO SQUADRA]"). **Non è un segnaposto da wireframe da rimuovere**: è il trattamento visivo reale e intenzionale finché non esistono foto vere, pensato per restare presentabile e coerente col registro del sito anche in questa fase. Usato in due punti distinti con regole diverse: (1) l'hero — presumibilmente permanente finché Story 18.14 (backlog) non introduce un upload reale; (2) le team-card — **solo durante la fase di lancio**, prima che i Gruppi comincino a caricare foto reali (Story 18.4); una volta che il flusso di upload è in uso, un Gruppo senza foto propria non mostra questo placeholder (vedi `team-card` sopra e `EXPERIENCE.md` → Pattern di Stato). Distinto dal placeholder tratteggiato dei box sponsor (bordo tratteggiato + etichetta "SPONSOR 0X" su sfondo `{colors.grigio-chiaro}`), che è un pattern più semplice per un contesto diverso (loghi sponsor, non fotografia). **Correzione Story 18.15**: l'opacità della didascalia era specificata come range "50-55%" nella stesura originale — ricalcolando i contrasti sul nuovo `{colors.blu-carbone}`/`{colors.placeholder-hatch-alt}`, il 50% scende a 4.32:1 sulla banda `{colors.placeholder-hatch-alt}` (sotto soglia AA), mentre il 55% dà 4.87:1 su quella banda e 4.98:1 sull'altra (entrambe verificate) — fissato a **55% esatto**, non più un range.

## Cose da fare e da evitare

| Fare | Evitare |
|---|---|
| `{colors.blu-carbone}` riservato a blocchi di contenuto specifici (header, hero, footer, tag/countdown) | Usare `{colors.blu-carbone}` come sfondo dell'intera pagina, delle sezioni Squadre/Sponsor, o delle match-card/fascia "prossima partita" — questo non è un sito dark-mode, e i blocchi partite hanno un proprio sfondo dedicato (`{colors.azzurro-partite}`) |
| `{colors.azzurro-partite}` riservato esclusivamente a `next-match-strip` e `match-card` | Riusarlo per altri blocchi scuri (header/hero/footer restano `{colors.blu-carbone}`) o come accento puntuale |
| `{colors.azzurro}` come blocco colore pieno (pulsante primario, accento diagonale hero) | Trattarlo come solo accento puntuale — qui è un colore strutturale, non decorativo. Non usarlo come testo/etichetta sopra `{colors.azzurro-partite}` (scende a 1.90:1) |
| `{colors.magenta}` solo su badge eyebrow hero, mai ripetuto come accento decorativo altrove | Usare `{colors.magenta}` pieno per il divisore "vs" dei blocchi partite — su `{colors.azzurro-partite}` scende a 1.21:1 (le due luminanze sono quasi identiche); l'uso corretto lì è `{colors.magenta-chiaro}` |
| Tagli diagonali (`clip-path`) come linguaggio di forma | Angoli arrotondati oltre le due eccezioni esplicite (link Accedi 2px, icone social circolari) |
| Team-card con nome Gruppo, categoria, Allenatori — contenuto reale di `/squadre` | Riprodurre il contenuto d'esempio del mockup (nome/ruolo/numero di maglia di un'Atleta) — quel dato non è mai pubblico |
| Elenco di navigazione orizzontale con wrap su mobile, come già shippato in Story 18.7 | Reintrodurre l'hamburger/drawer mostrato nel frame mobile del mockup — non è il pattern deciso |
| Micro-animazioni di stato (sottolineatura che si espande, sollevamento pulsante/card, cambio colore icona) | Animazioni di ingresso pagina, parallax, caroselli automatici — nessuna decorazione, coerente col principio "non invasivo" del brief |
| Placeholder-foto (trama diagonale + didascalia) come trattamento intenzionale finché non ci sono foto reali | Trattarlo come wireframe temporaneo da nascondere o rendere meno curato |
| Contorno di focus visibile su ogni elemento interattivo, contestuale allo sfondo (`{colors.focus-ring}`/`{colors.focus-ring-chiaro}`/`{colors.focus-ring-su-azzurro}`) | Affidarsi al solo cambio di sottolineatura/colore per segnalare il focus da tastiera |
| Area cliccabile reale ≥44×44px su icone social footer e link "Accedi" (hit-area indipendente dalla resa visiva, es. icona 38px con hit-area 44px) | Assumere che il vincolo 44px riguardi solo nav/pulsanti/countdown — si applica a ogni elemento cliccabile nuovo |
| Testo dei pulsanti in maiuscolo/minuscolo naturale nel markup, reso maiuscolo solo via CSS `text-transform` | Scrivere il testo già maiuscolo nella sorgente (penalizza screen reader/braille) — stessa regola del portale interno |
| `{colors.blu-carbone}` (`#0F2438`) per ogni nuovo uso del "colore scuro strutturale" | Reintrodurre il vecchio quasi-nero `#0B0E14` (o qualunque nero puro/quasi puro) — richiesta esplicita dell'utente da non regredire (Story 18.15) |
| Nomi squadra nella match-card allineati a sinistra (`flex-start`) | Centrare o distribuire ai due margini (`space-between`) come nel mockup di riferimento — corretto su richiesta esplicita dell'utente (Story 18.15, seconda iterazione) |
