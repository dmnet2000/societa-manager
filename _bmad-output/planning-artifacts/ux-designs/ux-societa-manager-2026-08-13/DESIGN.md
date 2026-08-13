---
name: Mogliano Volley — Sito pubblico Settore Volley
description: Sito vetrina pubblico (senza login) del Settore Volley di Mogliano Volley — home + Squadre/Calendario/Staff/Contatti; registro "Poster Sportivo" energico da stadio/manifesto, sibling del portale gestionale interno con cui condivide il brand ma non il registro visivo.
colors:
  bianco: '#FFFFFF'
  nero: '#0B0E14'
  azzurro: '#00A3E0'
  azzurro-scuro: '#0072A3'
  navy: '#312682'
  magenta: '#E6007C'
  grigio-chiaro: '#F2F5F7'
  grigio: '#5B6472'
  testo-chiaro-lead: '#D7DEE8'
  testo-chiaro-muto: '#AEB6C2'
  testo-chiaro-footer: '#B8C0CC'
  testo-chiaro-debole: '#8891A0'
  testo-scuro-muto: '#7B8697'
  bordo-chiaro: '#E5E9EE'
  bordo-tratteggiato: '#C6CDD6'
  bordo-scuro-forte: '#333B47'
  bordo-scuro-debole: '#262E3B'
  placeholder-hatch-alt: '#1C2433'
  focus-ring: '#0072A3'
  focus-ring-chiaro: '#FFFFFF'
  focus-ring-su-azzurro: '#0B0E14'
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
    background: '{colors.nero}'
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
    background: '{colors.nero}'
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
    background: '{colors.azzurro}'
    text-color: '{colors.nero}'
    tag-background: '{colors.nero}'
    tag-color: '{colors.bianco}'
    tag-typography: '{typography.eyebrow}'
    teams-typography: '{typography.display-card}'
    vs-color: '{colors.magenta}'
    countdown-box-background: '{colors.nero}'
    countdown-value-typography: '{typography.countdown-value}'
    countdown-value-color: '{colors.bianco}'
    countdown-label-typography: '{typography.countdown-label}'
    countdown-label-color: '{colors.azzurro}'
    vs-color: '{colors.navy}'
    focus-outline: '2px solid {colors.focus-ring-su-azzurro}, offset 2px'
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
    background: '{colors.nero}'
    text-color: '{colors.bianco}'
    clip-path: 'polygon(0 0,100% 0,100% 100%,4% 100%) — taglio diagonale asimmetrico nell''angolo in basso a sinistra'
    corner-accent: 'triangolo {colors.azzurro} a 15% opacità, angolo in alto a destra'
    category-tag-typography: '{typography.label-tag}'
    category-tag-color: '{colors.azzurro}'
    teams-typography: '{typography.display-card}'
    vs-color: '{colors.magenta}'
    vs-typography: '{typography.display-card}'
    meta-typography: '{typography.meta}'
    meta-color: '{colors.testo-chiaro-muto}'
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
    background: '{colors.nero}'
    text-color: '{colors.testo-chiaro-footer}'
    text-typography: '{typography.body}'
    heading-typography: '{typography.label-heading}'
    heading-color: '{colors.azzurro}'
    social-icon-background: '{colors.placeholder-hatch-alt}'
    social-icon-color: '{colors.azzurro}'
    social-icon-hover-background: '{colors.azzurro}'
    social-icon-hover-color: '{colors.nero}'
    social-icon-shape: '{rounded.full}'
    social-icon-visual-size: '38px'
    social-icon-hit-area: '44px minimo — area cliccabile reale via padding/hit-area, non l''icona visiva stessa (vedi EXPERIENCE.md → Primitive di Interazione)'
    social-icon-focus-outline: '2px solid {colors.focus-ring-chiaro}, offset 2px'
    divider: '1px solid {colors.bordo-scuro-debole}'
    copyright-typography: '{typography.meta}'
    copyright-color: '{colors.testo-scuro-muto}'
  button-primary:
    background: '{colors.azzurro}'
    foreground: '{colors.nero}'
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
    border-top: '2px solid {colors.nero}'
    radius: '{rounded.none}'
    text-typography: '{typography.body}'
    text-color: '{colors.nero}'
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
    name-color: '{colors.nero}'
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
    value-color: '{colors.nero}'
    social-icon-shape: '{rounded.full}'
    social-icon-hit-area: 'stesso vincolo 44px di components.footer.social-icon-hit-area'
    heading-typography: '{typography.display-section}'
    heading-typography-mobile: '{typography.display-section-mobile}'
  placeholder-foto:
    pattern: 'repeating-linear-gradient diagonale (45° hero, -45° team-card), banda 10-14px, {colors.nero} alternato a {colors.placeholder-hatch-alt}'
    caption-typography: '{typography.label-tag}'
    caption-color: 'rgba(255,255,255,0.5-0.55)'
    caption-example: '"[FOTO SQUADRA]", "[FOTO AZIONE — SCHIACCIATA A RETE]"'
status: final
updated: 2026-08-13
---

## Marchio e Stile

Questo è il sito vetrina pubblico del Settore Volley di Mogliano Volley: la pagina che un genitore apre da telefono il venerdì sera per sapere dove si gioca sabato, che un potenziale iscritto guarda prima di chiamare la segreteria, che compare quando la società condivide un link sui propri social. Non richiede login, non presuppone alcun rapporto pregresso col club — deve convincere e informare in pochi secondi di scroll, non far completare un compito operativo.

È il sibling esatto di `../ux-societa-manager-2026-07-22/DESIGN.md`, il DESIGN.md `final` dello strumento gestionale interno dello stesso club (stesso brand, stesso stemma, stessi colori sociali reali bianco+azzurro con navy/magenta da logo). Quel documento è esplicito: non è un sito vetrina, ed esclude deliberatamente i pattern da "poster da tifoseria" — cita imocovolley.it come riferimento scartato, utile solo per il registro emotivo, non per l'interfaccia di uno strumento di lavoro quotidiano. Questo documento è esattamente la superficie che quel documento escludeva: qui il registro "poster da stadio" non è scartato, è la direzione scelta esplicitamente in discovery (2026-08-13) dopo il confronto di 4 direzioni visive alternative — **Poster Sportivo** ha vinto perché è la più vicina al requisito originale dell'epica ("un registro visivo accattivante").

La divergenza tra i due documenti è intenzionale, non un'incoerenza da correggere: stesso club, stessi colori di brand (`{colors.azzurro}`, `{colors.navy}`, `{colors.magenta}` sono gli stessi valori esadecimali del portale interno), ma registro tipografico, spaziatura, forme e uso del colore completamente diversi, perché il pubblico e il compito sono diversi — un visitatore anonimo che sfoglia una vetrina non è un allenatore che segna presenze in tre tocchi. Dove il portale interno usa angoli 6-8px e ombre quasi assenti per comunicare precisione operativa, questo sito usa tagli diagonali netti (`clip-path`), fondo quasi-nero assertivo nei blocchi di contenuto chiave e tipografia condensata pesante (peso 900, tutto maiuscolo) per comunicare energia da stadio.

Nessun font viene caricato: solo stack di sistema (`Arial Black`/`Arial Narrow`/`Impact`/`Arial`), la stessa disciplina "niente webfont" del portale interno, per gli stessi motivi (leggerezza, velocità su mobile, nessuna dipendenza esterna) — qui però il carattere energico non viene solo dal peso ma anche dalla composizione: tagli diagonali, blocchi colore pieni, fotografia (per ora placeholder, vedi sotto) protagonista nell'hero.

`[NOTA UX APERTA]` Il mockup di riferimento (`mockups/home-poster-sportivo.html`) mostra, nella sua sezione "Squadre", card con nome/ruolo/numero di maglia di singole atlete (es. "Giulia Bortoletto — Schiacciatrice — n. 7"). Questo è contenuto illustrativo del mockup, **non** il contenuto reale della pagina `/squadre` (Story 18.8): il prodotto non mostra mai nomi di Atlete in pubblico (dato intenzionalmente mai esposto, vedi `epics.md` Story 18.8 AC #2) e non esiste alcun campo "numero di maglia" nel modello dati pubblico. Questo documento distilla il **registro visivo** del mockup (colori, tipografia, forme, tagli), non il suo contenuto d'esempio — vedi Componenti → `team-card` per il contenuto reale, e Cose da fare e da evitare per la correzione esplicita.

## Colori

La base sociale resta bianco+azzurro, esattamente come nel portale interno — ma qui l'azzurro non è solo un accento di interazione, è un blocco colore a piena area (la fascia "prossima partita"), e il quasi-nero non è assente com'è nel portale interno: è usato assertivamente in blocchi di contenuto specifici.

- **{colors.bianco}** (`#FFFFFF`) — superficie di chrome chiaro: header/nav no, quello è nero (vedi sotto) — ma sezione Squadre (sfondo `{colors.grigio-chiaro}`), sezione Partite, sezione Sponsor, e ogni team-card. Resta la superficie prevalente per area totale della pagina nonostante la drammaticità dei blocchi scuri.
- **{colors.nero}** (`#0B0E14`) quasi-nero, **non** uno sfondo di sito — è riservato a blocchi di **contenuto** specifici e ricorrenti: header/nav, hero, tag "prossima partita" e box countdown dentro la fascia azzurra, ogni match-card, footer. Non è mai lo sfondo dell'intera pagina né delle sezioni chiare (Squadre/Sponsor). Vedi Layout e Spaziatura per la distinzione esplicita "blocchi scuri vs chrome chiaro" — è la sfumatura più facile da sbagliare in questo sistema.
- **{colors.azzurro}** (`#00A3E0`) qui è un **blocco colore pieno**, non solo un accento come nel portale interno: riempie l'intera fascia "prossima partita", il pulsante primario, l'accento diagonale dell'hero. Contrasto testo/sfondo verificato per l'uso reale in questo componente: testo `{colors.nero}` su `{colors.azzurro}` = **6.73:1** (calcolato, soglia AA 4.5:1 superata anche per testo normale, non solo per testo grande).
- **{colors.azzurro-scuro}** (`#0072A3`) variante più profonda per testo su sfondo chiaro dove `{colors.azzurro}` da solo non basterebbe (vedi `{colors.focus-ring}` sotto) e per l'etichetta di ruolo/categoria nelle team-card su sfondo bianco.
- **{colors.navy}** (`#312682`) qui **non** è riservato come nel portale interno: compone l'innesto diagonale dell'hero (gradiente con `{colors.azzurro}`) — un'area più ampia del suo uso nel portale interno, ma resta comunque confinato a un solo elemento strutturale (il cuneo diagonale dell'hero), mai uno sfondo di sezione o di card.
- **{colors.magenta}** (`#E6007C`) resta l'accento più riservato del sistema, coerente col principio del portale interno ("mai una fill ampia") — ma qui i punti di innesco reali sono due, non uno: il badge eyebrow dell'hero ("Stagione 2026/27") e il divisore "vs" nella match-card (sfondo `{colors.nero}`). Testo bianco su magenta (badge eyebrow) = **4.51:1** (calcolato, pass AA ma con margine minimo — circa lo 0.2% sopra soglia, da tenere d'occhio in produzione per eventuali scostamenti di resa colore). Magenta su `{colors.nero}` (divisore "vs" del match-card) = **4.28:1**, sotto la soglia piena 4.5:1 per testo normale: per questo il divisore "vs" del match-card usa esplicitamente `{typography.display-card}` (`components.match-card.vs-typography`, stessa dimensione/peso del testo squadra circostante, non più piccolo) — a quella dimensione/peso si applica la soglia ridotta 3:1 per testo grande, che 4.28:1 supera. **Correzione rispetto al mockup, verificata in accessibility review**: il mockup di riferimento usa magenta per il "vs" nella match-card ma navy in linea per il "vs" nella fascia "prossima partita" (sfondo `{colors.azzurro}`) — un'incoerenza minore del mockup stesso. Il tentativo iniziale di questo documento di risolverla standardizzando il divisore "vs" a magenta *ovunque* si è rivelato un regresso reale in accessibility review (magenta su azzurro = **1.57:1**, ben sotto anche la soglia ridotta 3:1 — due tinte sature di luminanza percepita simile). Corretto: il divisore "vs" della fascia "prossima partita" (`components.next-match-strip.vs-color`) resta `{colors.navy}` come nel mockup originale (navy su azzurro = 4.23:1, testo grande, pass), il magenta resta riservato al solo contesto `{colors.nero}` (match-card). Il badge numero-maglia del mockup (magenta, sulla foto squadra) **non** viene portato nel sistema reale — vedi Marchio e Stile sopra e Cose da fare e da evitare.
- **{colors.grigio-chiaro}** (`#F2F5F7`) sfondo della sezione Squadre, dei box sponsor-placeholder — un chiaro "quasi bianco" che separa leggermente una sezione dall'altra senza introdurre un bordo pesante, stesso ruolo che il token `surface-alt` gioca nel `DESIGN.md` del portale interno (nome diverso, stesso principio — non è un riferimento a un token di questo documento).
- **{colors.grigio}** (`#5B6472`) testo secondario su sfondo chiaro: numerazione di sezione, intestazione "I nostri sponsor", testo nei box sponsor-placeholder.
- **{colors.testo-chiaro-lead}** (`#D7DEE8`), **{colors.testo-chiaro-muto}** (`#AEB6C2`), **{colors.testo-chiaro-footer}** (`#B8C0CC`), **{colors.testo-scuro-muto}** (`#7B8697`) — quattro toni di testo chiaro/grigio-azzurro su sfondo `{colors.nero}`, usati rispettivamente per: il paragrafo introduttivo dell'hero, i metadati delle match-card (data/luogo), il corpo testo del footer, e la riga di copyright. Contrasto calcolato su `{colors.nero}` per tutti e quattro: lead 14.26:1, muto 9.44:1, footer 10.53:1, copyright/scuro-muto 5.24:1 — tutti sopra soglia AA. **Nota di correzione, verificata in accessibility review**: il valore originale di `{colors.testo-scuro-muto}` (`#6B7480`) dava solo 4.08:1, sotto soglia AA — mai stato calcolato esplicitamente nella prima stesura di questo documento nonostante la riga di copyright compaia su ogni pagina pubblica. Il valore qui sopra (`#7B8697`) è la correzione.
- **{colors.testo-chiaro-debole}** (`#8891A0`) — link "Accedi" nell'header, deliberatamente meno prominente delle voci di menu (è un ingresso verso l'area riservata, non una sezione del sito vetrina). Contrasto su `{colors.nero}`: **6.08:1** (calcolato), sopra soglia AA nonostante il tono smorzato.
- **{colors.bordo-chiaro}**, **{colors.bordo-tratteggiato}** — bordi sottili su sfondo chiaro (fascia sponsor, box sponsor-placeholder tratteggiato).
- **{colors.bordo-scuro-forte}**, **{colors.bordo-scuro-debole}** — bordi sottili su sfondo `{colors.nero}` (contorno idle del link "Accedi"; divisore sopra la riga di copyright nel footer).
- **{colors.placeholder-hatch-alt}** — seconda tinta della trama diagonale placeholder-foto (vedi Componenti) e sfondo idle delle icone social nel footer.
- **{colors.focus-ring}** / **{colors.focus-ring-chiaro}** / **{colors.focus-ring-su-azzurro}** — `[ASSUMPTION]` il mockup di riferimento non definisce **alcuno** stato `:focus-visible` (è un mockup puramente visivo, non uno stato di interazione). Questi tre token sono un'estrapolazione, non una decisione già presa in discovery — necessaria per rispettare la Soglia di Accessibilità (vedi `EXPERIENCE.md`). Verificati: `{colors.focus-ring}` (`#0072A3`) su `{colors.bianco}` = 5.33:1; `{colors.focus-ring-su-azzurro}` (`{colors.nero}`) su `{colors.azzurro}` = 6.73:1 (stesso calcolo di sopra). **Non** usare `{colors.azzurro}` stesso o `{colors.bianco}` come anello di focus sopra la fascia azzurra: entrambi scendono a ~2.87:1, sotto la soglia 3:1 richiesta per un indicatore di focus (SC 1.4.11) — lo stesso tipo di trappola di contrasto già documentata nel `DESIGN.md` del portale interno per il suo token `primary` su testo bianco piccolo (documento diverso, non un token di questo file).

## Tipografia

Tre famiglie, tutte di sistema, nessun font caricato — la stessa disciplina "niente webfont" del portale interno, applicata però a un ramo tipografico più ricco perché questo è un sito editoriale/vetrina con più ruoli di testo:

- **Famiglia display** (`'Arial Black','Arial Narrow',Impact,sans-serif`) — titoli, nomi squadra/partita, wordmark. Sempre peso 900, sempre maiuscolo (via `text-transform`, mai testo sorgente maiuscolo — stessa regola di accessibilità già stabilita nel portale interno per i pulsanti). `{typography.display-hero}` (68px, 44px su mobile) per il titolo hero; `{typography.display-section}` (40px, 22px su mobile) per i titoli di sezione; `{typography.display-card}` (22px) per nomi squadra/partita nelle card; `{typography.wordmark}` (20px) per il nome del club nell'header/footer; `{typography.label-heading}` (14px) per le intestazioni minori (footer, indice di sezione).
- **Famiglia condensata** (`'Arial Narrow',Arial,'Helvetica Neue',sans-serif`) — voci di navigazione, badge eyebrow, pulsanti, valore del countdown. `{typography.nav-item}` (14px/900), `{typography.eyebrow}` (12px/900), `{typography.button-label}` (14px/900) e `{typography.button-label-secondary}` (12px/700, "Accedi"), `{typography.countdown-value}` (20px/900) e `{typography.countdown-label}` (9px/400).
- **Famiglia testo** (`Arial,sans-serif`) — tutto ciò che è lettura corrente: `{typography.body-lead}` (17px, paragrafo hero), `{typography.body}` (14px, footer), `{typography.meta}` (13px, data/luogo partita), `{typography.label-tag}` (11px/700, etichette categoria/sponsor).

`[NOTA UX APERTA]` `{typography.countdown-label}` è a 9px — molto piccolo anche se il contrasto colore calcolato passa (6.73:1, stesso calcolo di `{colors.azzurro}`/`{colors.nero}` sopra, la soglia WCAG non impone una dimensione minima). È una didascalia di 3-4 caratteri ("giorni"/"ore"/"min"), non testo di lettura essenziale, ma vale la pena valutare in sviluppo se portarla a 10-11px per maggiore leggibilità a colpo d'occhio su schermi piccoli — non un blocco, solo una raccomandazione.

Nessun corsivo, nessun peso intermedio (regular o 900, mai 500/600) — la gerarchia si legge dal salto di peso e di famiglia, non da variazioni sottili, coerente col registro "da poster" scelto.

## Layout e Spaziatura

La distinzione più importante di questo sistema, facile da sbagliare: **non è un sito dark-mode**. Il registro ottiene la sua drammaticità da blocchi di contenuto specifici in `{colors.nero}` (header/nav, hero, match-card, footer, tag/countdown della fascia partita) — non da un tema scuro applicato all'intera pagina. Header e nav sono scuri; la sezione Squadre, la sezione Sponsor, e il corpo di ogni team-card restano su `{colors.bianco}`/`{colors.grigio-chiaro}`. Un sito interamente scuro avrebbe tradito sia il requisito "nessuna dark mode" sia i colori sociali reali (bianco+azzurro) che restano l'identità prevalente del club.

Scala di spaziatura dedotta direttamente dai valori del mockup di riferimento (padding di sezione 80px/48px desktop, 24px/20px mobile; gap tra card 28px; altezza header 76px) — non è un multiplo di 4px pulito ovunque (`{spacing.7}` = 28px rompe la progressione), perché il mockup non è stato costruito partendo da una scala astratta ma da proporzioni visive dirette; questo documento la formalizza così com'è, senza forzarla a una progressione più "pulita" che il riferimento visivo non useresti realmente.

Il layout è arioso nelle sezioni chiare (padding 80px verticale desktop tra sezioni) e compresso nei blocchi scuri (padding interno delle match-card e box countdown molto più stretto) — un contrasto di respiro deliberato: le sezioni chiare invitano a scorrere con calma, i blocchi scuri comunicano urgenza/azione (prossima partita, risultato).

Griglia: `team-grid` e `match-grid` sono griglie CSS a colonne fisse (3 colonne team, 2 colonne match) che collassano a una singola colonna sotto i 900px — unico breakpoint esplicito nel mockup di riferimento. `[ASSUMPTION]` Il mockup include anche un frame dimostrativo a 375px che mostra ulteriori riduzioni (es. titolo hero a 32px, non ai 44px del breakpoint 900px) senza definire un secondo breakpoint formale nel CSS. Questo documento non introduce un secondo breakpoint rigido: raccomanda di trattare la riduzione sotto ai ~480px come una scala fluida tra `{typography.display-hero-mobile}` (44px) e circa 32px, non un terzo valore fisso — da confermare in sviluppo se serve un breakpoint dedicato o basta un `clamp()`.

## Elevazione e Profondità

A differenza del portale interno (nessuna ombra, separazione solo per colore/bordo), questo sistema usa **un'unica ombra diffusa e leggera**, riservata esclusivamente alle superfici chiare: `0 8px 24px rgba(11,14,20,0.08)` sulle team-card. Nessun'altra superficie usa ombra — i blocchi scuri (hero, match-card, footer) si separano dal resto della pagina per taglio diagonale (`clip-path`) e blocco di colore pieno, mai per elevazione; l'header si separa per un bordo inferiore netto di 4px in `{colors.azzurro}`, non per ombra.

`[ASSUMPTION]` Il banner cookie (non presente nel mockup di riferimento, vedi Componenti) estrapola lo stesso principio "ombra riservata alle superfici chiare/transitorie": `0 -4px 16px rgba(11,14,20,0.12)`, leggermente più marcata delle team-card perché deve separarsi visivamente dal contenuto sottostante essendo un elemento sovrapposto fisso, non di flusso — stesso principio già usato dal portale interno per i suoi elementi transitori (menu profilo), qui applicato con un valore nuovo perché il contesto (banner a piena larghezza in basso, non un dropdown) è diverso.

## Forme

Divergenza deliberata e netta dal portale interno: dove quel sistema usa angoli 6-8px ovunque e nessuna forma a pillola, questo sistema usa **tagli diagonali (`clip-path`) al posto degli angoli arrotondati** — `{rounded.none}` (0px) è il valore di default per card, pulsanti, badge, blocchi di contenuto. La drammaticità non viene da un raggio ampio ma dalla geometria: l'hero si chiude con un taglio diagonale sul bordo inferiore, le match-card hanno un angolo tagliato in basso a sinistra, le foto squadra hanno un taglio diagonale sul bordo inferiore della propria area.

Due sole eccezioni, entrambe minori: `{rounded.sm}` (2px, appena percettibile) sul contorno del link "Accedi" nell'header — un dettaglio secondario coerente col suo ruolo di elemento meno prominente; `{rounded.full}` sulle icone social del footer, unica forma davvero circolare del sistema. Nessuna pillola (`rounded.full` su un elemento non circolare) altrove.

Questa scelta è coerente col registro "poster/manifesto da stadio": il taglio diagonale netto comunica energia e movimento in modo che un angolo arrotondato non comunicherebbe — è la stessa logica di divergenza già dichiarata esplicitamente dal portale interno quando ha scartato le forme "morbide" per il proprio registro "deciso ma da strumento di lavoro"; qui la direzione è ancora più marcata perché il pubblico e il compito sono diversi.

## Componenti

- **Header/nav (`header-nav`)** — sfondo `{colors.nero}` a piena larghezza con bordo inferiore netto di 4px `{colors.azzurro}`. Stemma del club a sinistra: **non** un asset statico — letto a runtime dalla stessa configurazione Admin del portale interno (Story 7.2), riferimento visivo `../ux-societa-manager-2026-07-22/imports/logo-mogliano-volley.png`. Nome club in `{typography.wordmark}`, con la parola "VOLLEY" in `{colors.azzurro}`. Voci di menu (Home/Squadre/Calendario/Staff/Contatti) in `{typography.nav-item}`, bianco su nero; voce attiva con sottolineatura `{colors.azzurro}` sempre visibile; hover con sottolineatura che si espande da 0 a piena larghezza (micro-animazione, 250ms). Link "Accedi" visivamente secondario (`{colors.testo-chiaro-debole}`, bordo sottile, `{rounded.sm}`), diventa bianco/azzurro all'hover. **Comportamento mobile: elenco orizzontale con wrap, nessun drawer/hamburger** — vedi nota critica sotto.

  `[RISOLTO — decisione 2026-08-13, stessa data di questa sessione]` Il mockup di riferimento (`mockups/home-poster-sportivo.html`) mostra, nel suo frame mobile dimostrativo a 375px, un'icona hamburger (`.m-burger`) e nasconde interamente `nav.main` sotto i 900px via CSS — questo è **solo il comportamento del mockup statico**, non il pattern realmente deciso. La Story 18.7 (menu di navigazione multi-pagina) è già stata implementata (`app/NavPubblica.tsx`/`.module.css`, commento datato 2026-08-13) con la decisione opposta ed esplicita: **elenco orizzontale con wrap**, nessun drawer/hamburger — motivata dal fatto che 5 voci corte non giustificano un pattern più strutturato come quello della NavBar interna (Story 9.2, ruolo-dipendente e più lunga). Il restyling di questo componente deve **riverniciare** i colori/tipografia del pattern già esistente (wrap orizzontale) secondo i token sopra, non reintrodurre l'hamburger del mockup. `[NOTA UX APERTA]` resta aperto solo per il futuro: se il menu dovesse mai crescere oltre le 5+1 voci attuali, la scelta "wrap orizzontale" andrebbe rivalutata — non è un problema oggi.

- **Hero (`hero`)** — sfondo `{colors.nero}`, taglio diagonale sul bordo inferiore (`clip-path`), foto placeholder a piena area (vedi `placeholder-foto` sotto) con un innesto diagonale `{colors.azzurro}`→`{colors.navy}` sul lato destro. Badge eyebrow (es. "Stagione 2026/27") in `{colors.magenta}`, `{typography.eyebrow}`, bianco. Titolo in `{typography.display-hero}` (44px su mobile), bianco con una parola/frase accentata in `{colors.azzurro}` (uso di `<em>` semanticamente neutro, solo stile). Paragrafo introduttivo in `{typography.body-lead}`, `{colors.testo-chiaro-lead}`. Un solo pulsante primario come CTA (vedi `button-primary`).

  `[NOTA UX APERTA]` Il titolo ha un'ombra testo (`text-shadow: 0 4px 24px rgba(0,0,0,0.5)`) pensata per restare leggibile sopra una foto reale futura — ma senza una foto reale da verificare oggi, il contrasto testo/immagine non è calcolabile con certezza: quando arriverà la prima foto d'azione reale per l'hero, va verificato che l'ombra/overlay scuro basti a mantenere il titolo leggibile sopra quello specifico scatto, non assunto per tutte le foto future.

- **Fascia "prossima partita" (`next-match-strip`)** — blocco colore pieno `{colors.azzurro}`, testo `{colors.nero}` (contrasto 6.73:1, verificato). Tag "Prossima partita" in chip `{colors.nero}`/bianco, `{typography.eyebrow}`. Nomi squadra in `{typography.display-card}` con divisore "vs" in `{colors.navy}` (**non** magenta — vedi Colori per la correzione post-review: magenta su questo sfondo azzurro scenderebbe a 1.57:1). Countdown a tre box `{colors.nero}`/bianco con etichetta piccola `{colors.azzurro}` (vedi nota tipografica sulla dimensione 9px).

- **Team-card (`team-card`)** — **contenuto reale**, non quello del mockup: nome del Gruppo (es. "Under 16 Femminile"), categoria come sottotitolo (`{typography.label-tag}`, `{colors.azzurro-scuro}`), elenco degli Allenatori assegnati (`{typography.body}` — zero, uno o più nomi; un Gruppo senza Allenatore compare comunque, senza elenco, per `epics.md` Story 18.8 AC #3). Foto squadra quando esiste (Story 18.4), altrimenti **nessuna foto e nessun placeholder** in quella singola card una volta che il prodotto è "a regime" — vedi `EXPERIENCE.md` → Pattern di Stato per la distinzione tra placeholder di lancio e assenza permanente di foto. Card rettangolare (nessun `{rounded}`), foto interna con taglio diagonale sul bordo inferiore, ombra leggera, si solleva di 6px all'hover (250ms). **Nessun badge numero-maglia magenta** — quell'elemento del mockup mostra un dato (numero di maglia atleta) che non esiste nella pagina `/squadre` reale.

- **Match-card (`match-card`)** — blocco `{colors.nero}`/bianco, taglio diagonale asimmetrico nell'angolo in basso a sinistra, triangolo `{colors.azzurro}` a bassa opacità nell'angolo opposto come accento strutturale. Etichetta categoria/girone in `{typography.label-tag}` `{colors.azzurro}`. Nomi squadra in `{typography.display-card}` con "vs" in `{colors.magenta}`, **esplicitamente alla stessa dimensione/peso del testo squadra** (`vs-typography: {typography.display-card}`, mai più piccolo): a quella dimensione il divisore magenta è testo grande (soglia 3:1, supera 4.28:1) — a una dimensione inferiore scenderebbe sotto soglia AA, vedi Colori. Metadati data/ora/luogo in `{typography.meta}` `{colors.testo-chiaro-muto}`. Stesso componente riusato sia nel teaser "partite della settimana" in home sia nell'elenco completo di `/calendario` (Story 18.9), raggruppato per settimana in quest'ultimo caso.

- **Fascia sponsor (`sponsor-strip`)** — sfondo bianco, bordi sottili sopra/sotto, intestazione discreta ("I nostri sponsor") in grigio. Box sponsor con bordo tratteggiato quando lo sponsor non ha ancora un logo caricato (placeholder distinto dal pattern foto, vedi sotto) — sezione intera nascosta se non ci sono Sponsor attivi (`epics.md` Story 18.2 AC #2, nessuna area vuota).

- **Footer (`footer`)** — sfondo `{colors.nero}`, tre colonne (contatti+social, menu, società) che collassano a colonna singola sotto i 900px. Intestazioni di colonna in `{typography.label-heading}` `{colors.azzurro}` maiuscolo, corpo testo in `{typography.body}` `{colors.testo-chiaro-footer}`. Icone social come cerchi (`{rounded.full}`) con iniziali testuali (nessuna libreria di icone caricata, coerente con "nessun webfont"), sfondo `{colors.placeholder-hatch-alt}` che diventa `{colors.azzurro}` all'hover, **area cliccabile reale minimo 44×44px** anche se la resa visiva dell'icona resta 38px (padding/hit-area, non l'icona stessa — corretto in accessibility review, il mockup originale a 38px netti era sotto soglia), contorno di focus `{colors.focus-ring-chiaro}` dedicato. Riga di copyright separata da un divisore sottile, in `{typography.meta}` `{colors.testo-scuro-muto}` (valore corretto in accessibility review, vedi Colori — l'originale falliva AA).

- **Pulsante primario (`button-primary`)** — blocco pieno `{colors.azzurro}`, testo `{colors.nero}`, nessun radius, `{typography.button-label}` maiuscolo (via CSS, mai testo sorgente maiuscolo — stessa regola già stabilita nel portale interno). All'hover: sfondo bianco + sollevamento di 2px (200ms). Micro-animazione, non decorativa: comunica "clic registrato", coerente col principio "solo transizioni di stato essenziali" ereditato dal portale interno.

- **Banner cookie (`cookie-banner`)** — `[ASSUMPTION]`, non presente nel mockup di riferimento: estrapolato dal precedente del portale interno per le superfici transitorie (leggera, non invasiva, non un modale). A differenza del menu profilo del portale interno (che vive sul suo token `surface`, con ombra leggera, perché è un dropdown ancorato — documento diverso, non un token di questo file), questo banner è una **fascia fissa in basso, a piena larghezza**, sfondo bianco (non nero — è un elemento di sistema/chrome transitorio, non un blocco di contenuto, coerente con la distinzione in Layout e Spaziatura), bordo superiore netto `{colors.nero}` 2px (nessun radius, coerente col resto del sistema), ombra leggera verso l'alto per separarsi dal contenuto sottostante. Pulsante primario compatto "Accetta", azione secondaria testuale "Rifiuta" in `{typography.button-label-secondary}` `{colors.grigio}` su `{colors.bianco}` (~5.46:1, colore assegnato esplicitamente in accessibility review — nella prima stesura "Rifiuta" non aveva alcun token di colore, quindi non era verificabile), con lo stesso peso visivo di "Accetta" per non introdurre un dark pattern (vedi `EXPERIENCE.md` → Voce e Tono), contorno di focus `{colors.focus-ring}` dedicato. Non blocca la navigazione (`epics.md` Story 18.6 AC #4) — nessuno scrim, nessun overlay sul resto della pagina.

- **Embed post social (`social-embed`)** — aggiunto in accessibility/rubric review: la sezione home già in produzione (Story 18.5) non aveva alcuna specifica visiva. Sfondo `{colors.grigio-chiaro}` (stessa superficie chiara di Squadre/Sponsor, coerente con "nessun blocco scuro fuori dai contenitori ricorrenti già elencati"), titolo di sezione in `{typography.display-section}`. L'iframe del widget ufficiale della piattaforma richiede un `title` descrittivo esplicito (es. "Ultimi post dalla pagina Facebook di Mogliano Volley") — requisito di accessibilità minimo per un contenuto di terze parti, vedi `EXPERIENCE.md` → Soglia di Accessibilità.

- **Elenco Staff (`staff-list`)** — aggiunto in rubric review: `/staff` (Story 18.10, backlog) non aveva alcuna specifica visiva nonostante fosse esplicitamente nello scope di questa sessione. Elenco su sfondo bianco, righe separate da bordo sottile `{colors.bordo-chiaro}` (non card, coerente con un elenco denso di nome+Gruppi per Allenatore). Nome Allenatore in `{typography.display-card}` `{colors.nero}`, elenco dei Gruppi seguiti in `{typography.body}` `{colors.grigio}` sotto il nome.

- **Blocco contatti (`contact-block`)** — aggiunto in rubric review: `/contatti` (Story 18.11, backlog) non aveva alcuna specifica visiva. Sfondo `{colors.grigio-chiaro}`, ogni campo (indirizzo/telefono/email) con etichetta piccola (`{typography.label-tag}` `{colors.grigio}`) sopra il valore (`{typography.body}` `{colors.nero}`) — solo i campi effettivamente configurati vengono renderizzati (nessuna etichetta orfana). Icone social, se presenti, riusano lo stesso vincolo di area cliccabile 44px di `components.footer`.

- **Foto placeholder (`placeholder-foto`)** — trama diagonale ripetuta (`{colors.nero}` alternato a `{colors.placeholder-hatch-alt}`, bande 10-14px) con didascalia centrata maiuscola discreta (`{typography.label-tag}`, bianco a opacità 50-55%, es. "[FOTO SQUADRA]"). **Non è un segnaposto da wireframe da rimuovere**: è il trattamento visivo reale e intenzionale finché non esistono foto vere, pensato per restare presentabile e coerente col registro del sito anche in questa fase. Usato in due punti distinti con regole diverse: (1) l'hero — presumibilmente permanente, nessuna story del prodotto introduce un pipeline di foto d'azione reali per l'hero oggi; (2) le team-card — **solo durante la fase di lancio**, prima che i Gruppi comincino a caricare foto reali (Story 18.4); una volta che il flusso di upload è in uso, un Gruppo senza foto propria non mostra questo placeholder (vedi `team-card` sopra e `EXPERIENCE.md` → Pattern di Stato). Distinto dal placeholder tratteggiato dei box sponsor (bordo tratteggiato + etichetta "SPONSOR 0X" su sfondo `{colors.grigio-chiaro}`), che è un pattern più semplice per un contesto diverso (loghi sponsor, non fotografia).

## Cose da fare e da evitare

| Fare | Evitare |
|---|---|
| `{colors.nero}` riservato a blocchi di contenuto specifici (header, hero, match-card, footer, tag/countdown) | Usare `{colors.nero}` come sfondo dell'intera pagina o delle sezioni Squadre/Sponsor — questo non è un sito dark-mode |
| `{colors.azzurro}` come blocco colore pieno (fascia partita, pulsante primario) | Trattarlo come solo accento puntuale — qui è un colore strutturale, non decorativo |
| `{colors.magenta}` solo su badge eyebrow hero e divisore "vs" del match-card (sfondo nero), mai ripetuto come accento decorativo altrove | Usare `{colors.magenta}` per il divisore "vs" su sfondo `{colors.azzurro}` (fascia "prossima partita") — scende a 1.57:1, uso corretto lì è `{colors.navy}` |
| Tagli diagonali (`clip-path`) come linguaggio di forma | Angoli arrotondati oltre le due eccezioni esplicite (link Accedi 2px, icone social circolari) |
| Team-card con nome Gruppo, categoria, Allenatori — contenuto reale di `/squadre` | Riprodurre il contenuto d'esempio del mockup (nome/ruolo/numero di maglia di un'Atleta) — quel dato non è mai pubblico |
| Elenco di navigazione orizzontale con wrap su mobile, come già shippato in Story 18.7 | Reintrodurre l'hamburger/drawer mostrato nel frame mobile del mockup — non è il pattern deciso |
| Micro-animazioni di stato (sottolineatura che si espande, sollevamento pulsante/card, cambio colore icona) | Animazioni di ingresso pagina, parallax, caroselli automatici — nessuna decorazione, coerente col principio "non invasivo" del brief |
| Placeholder-foto (trama diagonale + didascalia) come trattamento intenzionale finché non ci sono foto reali | Trattarlo come wireframe temporaneo da nascondere o rendere meno curato |
| Contorno di focus visibile su ogni elemento interattivo, contestuale allo sfondo (`{colors.focus-ring}`/`{colors.focus-ring-chiaro}`/`{colors.focus-ring-su-azzurro}`) | Affidarsi al solo cambio di sottolineatura/colore per segnalare il focus da tastiera |
| Area cliccabile reale ≥44×44px su icone social footer e link "Accedi" (hit-area indipendente dalla resa visiva, es. icona 38px con hit-area 44px) | Assumere che il vincolo 44px riguardi solo nav/pulsanti/countdown — si applica a ogni elemento cliccabile nuovo, corretto in accessibility review |
| Testo dei pulsanti in maiuscolo/minuscolo naturale nel markup, reso maiuscolo solo via CSS `text-transform` | Scrivere il testo già maiuscolo nella sorgente (penalizza screen reader/braille) — stessa regola del portale interno |
