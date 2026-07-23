---
name: Mogliano Volley — Società Manager
description: Sistema visivo per lo strumento operativo interno del settore volley di Mogliano Volley — bianco e azzurro sociale come base, navy e magenta del logo come accenti riservati, registro energico e deciso ma da strumento di lavoro, non da sito vetrina. Solo light mode.
colors:
  surface: '#FFFFFF'
  surface-alt: '#E4F5FD'
  primary: '#00A3E0'
  primary-hover: '#0086BD'
  button-bg: '#006DA6'
  navy: '#312682'
  magenta: '#E6007C'
  text-primary: '#101820'
  text-secondary: '#46586B'
  border: '#BFE4F5'
  success: '#256029'
  success-bg: '#DFF2E1'
  warning: '#9A4A08'
  warning-bg: '#FCE9CE'
  danger: '#A81818'
  danger-bg: '#FBE3E3'
  focus-ring: '#006DA6'
  focus-ring-on-navy: '#FFFFFF'
typography:
  nav-title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 14px
    fontWeight: '900'
    letterSpacing: -0.01em
  nav-item:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 13px
    fontWeight: '700'
    letterSpacing: 0px
  section-label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 11px
    fontWeight: '900'
    letterSpacing: 0.04em
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 13.5px
    fontWeight: '400'
    lineHeight: '1.4'
  body-strong:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 13.5px
    fontWeight: '700'
  stat-value:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 19px
    fontWeight: '800'
    lineHeight: '1.1'
  stat-label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 10.5px
    fontWeight: '600'
  badge-label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 10.5px
    fontWeight: '700'
  button-label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 12.5px
    fontWeight: '700'
    letterSpacing: 0.03em
rounded:
  sm: 6px
  md: 8px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
components:
  nav-bar:
    background: '{colors.navy}'
    foreground: '{colors.surface}'
    logo-source: 'configurazione runtime Admin (Story 7.2) - riferimento visivo: imports/logo-mogliano-volley.png'
    item-typography: '{typography.nav-item}'
    active-item-background: '{colors.button-bg}'
    inactive-item-foreground: '{colors.surface-alt}'
    focus-outline: '2px solid {colors.focus-ring-on-navy}, offset 2px'
  button-primary:
    background: '{colors.button-bg}'
    foreground: '{colors.surface}'
    radius: '{rounded.sm}'
    text-transform: uppercase
    typography: '{typography.button-label}'
    focus-outline: '2px solid {colors.focus-ring}, offset 2px'
  badge:
    radius: '{rounded.sm}'
    typography: '{typography.badge-label}'
    success-background: '{colors.success-bg}'
    success-foreground: '{colors.success}'
    warning-background: '{colors.warning-bg}'
    warning-foreground: '{colors.warning}'
    danger-background: '{colors.danger-bg}'
    danger-foreground: '{colors.danger}'
  stat-tile:
    radius: '{rounded.sm}'
    typography-value: '{typography.stat-value}'
    typography-label: '{typography.stat-label}'
    success-background: '{colors.success-bg}'
    success-foreground: '{colors.success}'
    success-accent-border: '{colors.success}'
    warning-background: '{colors.warning-bg}'
    warning-foreground: '{colors.warning}'
    warning-accent-border: '{colors.warning}'
    danger-background: '{colors.danger-bg}'
    danger-foreground: '{colors.danger}'
    danger-accent-border: '{colors.magenta}'
  attendance-row:
    background: '{colors.surface-alt}'
    radius: '{rounded.sm}'
    typography-name: '{typography.body-strong}'
status: final
updated: 2026-07-22
---

## Marchio e Stile

Società Manager è lo strumento operativo interno del settore volley di Mogliano Volley: la app che sostituisce WhatsApp, Excel scollegati e telefonate per chi oggi gestisce orari, presenze e certificati medici. Non è un sito vetrina per i tifosi — è un attrezzo che allenatori, genitori, segreteria e dirigenti aprono per pochi minuti, spesso dal telefono, spesso la sera dopo allenamento, per fare un compito preciso e richiudere l'app.

Il registro scelto in discovery è "Energico e Deciso": azzurro molto saturo come colore d'azione, navy usato in modo assertivo come sfondo della barra di navigazione, tipografia pesante (peso 900) sui titoli, angoli poco arrotondati. È il registro con più carattere tra le cinque varianti esplorate, ma resta esplicitamente uno *strumento di lavoro*, non un poster da tifoseria: in discovery è stato consultato imocovolley.it come riferimento del tono energico/da club sportivo, ed è stato scartato come modello di interfaccia — utile solo per il registro emotivo (energia, sportività, maiuscole misurate), non per i suoi pattern di sito pubblico (hero, news, roster, sponsor), che non appartengono a questo strumento gestionale interno.

Il carattere non arriva da un font — nessun font viene caricato, si usa solo lo stack di sistema — ma dal peso tipografico e dalla decisione cromatica: bianco e azzurro (i colori sociali reali del club) restano prevalenti su ogni superficie, mentre navy e magenta (i colori del logo/stemma) sono accenti riservati, mai sfondo dominante. Il prodotto lavora sempre in light mode: un solo look curato, niente doppia manutenzione di palette.

## Colori

La base cromatica è "bianco + azzurro", i colori sociali reali di Mogliano Volley, non una palette neutra generica scelta a tavolino:

- **{colors.surface}** (`#FFFFFF`) è la superficie prevalente di ogni pagina — sfondo di default, non un colore "di riempimento" tra altri.
- **{colors.surface-alt}** (`#E4F5FD`) è una tinta azzurra più marcata, usata per righe/liste che devono distinguersi leggermente dal fondo bianco (es. righe presenza) senza introdurre un bordo pesante.
- **{colors.primary}** (`#00A3E0`) è l'azzurro molto saturo del registro scelto — usato per accenti di interazione e stati attivi su sfondo chiaro. **Non usato per la voce di navigazione attiva** (quella usa `{colors.button-bg}`, vedi Componenti → Barra di navigazione): su testo bianco piccolo `{colors.primary}` da solo scende sotto la soglia AA.
- **{colors.primary-hover}** (`#0086BD`) è lo stato hover/press di {colors.primary}.
- **{colors.button-bg}** (`#006DA6`) è un azzurro più profondo, riservato ai pulsanti primari: garantisce contrasto ≥ 4.5:1 con testo bianco (verificato AA), cosa che {colors.primary} da solo non garantirebbe altrettanto comodamente su testo bianco piccolo.
- **{colors.navy}** (`#312682`) è il navy del logo/stemma. Nel registro scelto è usato in modo assertivo come sfondo della barra di navigazione e come sfondo dei badge/etichette "decise" (es. il tag di sezione) — **mai** come sfondo di un'intera pagina o di un'area di contenuto ampia.
- **{colors.magenta}** (`#E6007C`) è il magenta del grappolo del logo. È l'accento più riservato di tutto il sistema: nel pattern di riferimento (stat-tile cluster) appare *in un solo punto* — il bordo sinistro di 4px della tile "scaduto" nella Vista Dirigente — e in nessun altro componente. Non è un colore di stato (non sostituisce {colors.danger}): è un tocco di brand deliberatamente unico, non ripetuto.
- **{colors.text-primary}** (`#101820`) è un quasi-nero ad alto contrasto, non il navy — il navy resta un accento, il testo principale no.
- **{colors.text-secondary}** (`#46586B`) per etichette, meta-testo, sezioni secondarie.
- **{colors.border}** (`#BFE4F5`) — bordi sottili, tonalità azzurra coerente con la palette, mai grigio neutro.
- **{colors.success} / {colors.success-bg}** (`#256029` su `#DFF2E1`) — stato "in regola/confermato". Contrasto verificato ~5.3:1.
- **{colors.warning} / {colors.warning-bg}** (`#9A4A08` su `#FCE9CE`) — stato "in scadenza" **e** stato individuale "certificato scaduto" mostrato a livello di singola atleta (vedi Componenti → Badge). Contrasto ~5.2:1.
- **{colors.danger} / {colors.danger-bg}** (`#A81818` su `#FBE3E3`) — riservato al conteggio aggregato "scaduto" nelle stat-tile (Vista Dirigente), non alla singola riga atleta. Anche qui il tono resta desaturato rispetto a un rosso acceso da form di errore: informativo, non allarmistico.

Tutte le coppie testo/sfondo sono state verificate contro la soglia WCAG AA (≥ 4.5:1 per testo normale) durante l'esplorazione delle varianti — non è stato eseguito un audit di accessibilità formale: il criterio guida resta comunque quello applicato in ogni combinazione elencata sopra.

## Tipografia

Nessun font viene caricato: solo lo stack di sistema (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`), per restare leggero, veloce da caricare da mobile con connessione dati normale, e coerente su ogni piattaforma senza dipendenze esterne.

Il carattere "energico e deciso" non viene dal typeface (che è lo stesso ovunque) ma dal **peso**: i titoli e le etichette di sezione usano peso 900 (`{typography.nav-title}`, `{typography.section-label}`), molto più pesante del corpo testo normale. Questo crea gerarchia visiva senza bisogno di una seconda famiglia tipografica:

- `{typography.nav-title}` — nome app nella barra di navigazione, 14px/900.
- `{typography.section-label}` — etichette di sezione, 11px/900, tracking positivo (0.04em), maiuscolo in resa (vedi Componenti).
- `{typography.body}` / `{typography.body-strong}` — testo corrente e nomi atleta nelle righe presenza, 13.5px, regolare o 700.
- `{typography.stat-value}` / `{typography.stat-label}` — numero e didascalia delle stat-tile, 19px/800 e 10.5px/600.
- `{typography.badge-label}` — testo dei badge di stato, 10.5px/700.
- `{typography.button-label}` — testo dei pulsanti primari, 12.5px/700, maiuscolo, tracking 0.03em.

Nessuna dimensione display/eroica: questo è uno strumento di consultazione rapida, non una superficie editoriale.

## Layout e Spaziatura

La scala di spaziatura (`{spacing}`) è dedotta dai valori effettivamente usati nel mockup di esplorazione colore (padding di riga ~9-10px, gap tra stat-tile ~8px, padding pulsante ~10px/20px, margini pagina ~16-20px) — non è una decisione a sé stante discussa separatamente in sessione, ma un'estrapolazione diretta e coerente di quei numeri in una scala basata su multipli di 4px (`4 / 8 / 12 / 16 / 20 / 24 / 32`).

Il layout resta compatto, non arioso: rispetto alla variante "Familiare e Caldo" scartata (più respiro, angoli più tondi), la variante scelta usa spaziature più strette e dirette, coerenti con un registro "deciso" e con l'uso su schermi di telefono dove lo spazio verticale è prezioso. Liste (atlete, gruppi, certificati) restano a colonna singola; su desktop i cluster di stat-tile e le card-gruppo si dispongono su più colonne che si riducono a una sola colonna in verticale su mobile (comportamento di reflow, dettagliato in `EXPERIENCE.md` → Responsive & Piattaforma).

→ Riferimento di composizione: `mockups/key-vista-dirigente.html` (unico mockup reso sia in frame telefono sia in frame desktop, per mostrare il reflow della griglia di card). Spec vince in caso di conflitto.

## Elevazione e Profondità

Il registro scelto non usa ombre come dispositivo di gerarchia: la separazione tra superfici avviene per colore di sfondo ({colors.surface} vs {colors.surface-alt}) e per bordo sottile ({colors.border}), non per shadow. Questo è coerente con la decisione di motion minimo e con il principio "niente rumore" — un'interfaccia piatta comunica meno "decorazione" da elaborare a colpo d'occhio.

`[NOTA UX APERTA]` La discovery non ha definito un trattamento per le superfici sovrapposte transitorie (dropdown, popover, modali di conferma) — nessun mockup le mostra. In assenza di indicazioni, l'ipotesi di lavoro più sicura è: un'ombra molto leggera e a basso raggio solo su questi elementi transitori (mai su card o contenuto di pagina), per restare coerenti col registro piatto. Da confermare quando si costruirà il primo componente che ne ha bisogno (es. wizard Story 6.3 o un dialog di conferma).

## Forme

Angoli poco arrotondati: `{rounded.sm}` (6px) su badge, righe presenza, stat-tile e pulsanti; `{rounded.md}` (8px) sui contenitori/card più ampi. Questo è deliberatamente meno morbido delle varianti "Familiare e Caldo" (pillole, angoli molto tondi) e "Fresco e Minimale" (badge a contorno) scartate in esplorazione: il raggio ridotto è parte del registro "assertivo" scelto — comunica precisione e velocità operativa, non accoglienza da spogliatoio.

Nessuna forma a pillola (`rounded.full`) nel sistema: non è stata definita né usata nella variante scelta.

## Componenti

- **Barra di navigazione (`nav-bar`)** — sfondo `{colors.navy}` a piena larghezza, non un accento puntuale: è l'unico punto in cui il navy occupa un'area larga, per la sua natura di elemento di cornice fisso e non di contenuto. Testo/nome app in bianco (`{typography.nav-title}`, peso 900). Lo stemma del club (riferimento visivo: `imports/logo-mogliano-volley.png`) compare a sinistra del nome app — non è però un asset statico da incorporare nel codice: la Story 7.2 (già costruita) rende il logo configurabile a runtime dall'Admin in un bucket pubblico, quindi il componente mostra qualunque immagine sia stata caricata, con lo stemma reale di Mogliano Volley come contenuto atteso, non hardcoded. Voci di navigazione in `{typography.nav-item}` (13px/700) — non riusare `{typography.nav-title}` per le singole voci, è riservato al nome app. Voci inattive in `{colors.surface-alt}` su sfondo navy (leggibile, non a piena luminosità). La voce attiva usa sfondo `{colors.button-bg}` (non `{colors.primary}`) con testo bianco — `{colors.primary}` da solo su testo bianco piccolo scende sotto la soglia AA (4.5:1), lo stesso motivo per cui `{colors.button-bg}` esiste per i pulsanti (vedi Colori). Stato di focus da tastiera: vedi voce dedicata sotto.
- **Badge di stato (`badge`)** — pillola arrotondata `{rounded.sm}`, testo `{typography.badge-label}`. Tre varianti semantiche: successo ({colors.success} su {colors.success-bg}), attenzione ({colors.warning} su {colors.warning-bg}) e criticità ({colors.danger} su {colors.danger-bg}). **Regola specifica e non negoziabile**: il badge "Certificato scaduto" mostrato accanto al nome di una singola atleta (es. in una riga presenza) usa la variante **warning**, non danger — coerente con FR-15 ("l'alert non impedisce in nessun caso di registrare la presenza"): a livello di singola persona lo stato deve informare, non allarmare. La variante danger è riservata al conteggio aggregato (vedi stat-tile).
- **Riga presenza (`attendance-row`)** — sfondo `{colors.surface-alt}`, `{rounded.sm}`, checkbox nativa a sinistra, nome atleta in `{typography.body-strong}` (colore {colors.text-primary}), badge di stato opzionale allineato a destra. Riga compatta (padding verticale ~9px) per restare scorrevole su liste di ~15-25 atlete per gruppo. → Riferimento di composizione: `mockups/key-presenze.html`. Spec vince in caso di conflitto.
- **Cluster di stat-tile (`stat-tile`)** — usato dalla Vista Dirigente (Story 5.1, non ancora costruita) per riassumere lo stato certificati di un gruppo: tre tile affiancate "in regola / in scadenza / scaduto", ciascuna con numero grande (`{typography.stat-value}`) ed etichetta piccola (`{typography.stat-label}`). Ogni tile usa il colore semantico coerente (success/warning/danger) sia per sfondo/testo sia per un bordo sinistro di accento di 4px — **eccetto** la tile "scaduto", il cui bordo sinistro usa `{colors.magenta}` invece di `{colors.danger}`: l'unico punto in tutto il sistema in cui il magenta del logo appare in un componente funzionale, non solo come colore di brand statico. → Riferimento di composizione: `mockups/key-vista-dirigente.html`. Spec vince in caso di conflitto.
- **Pulsante primario (`button-primary`)** — sfondo `{colors.button-bg}`, testo bianco, `{rounded.sm}`, **maiuscolo** (`text-transform: uppercase`), `{typography.button-label}`. Il maiuscolo è una scelta di registro (assertivo, "azione decisa"), non un default: da riservare al pulsante primario di un form/flusso, non applicarlo a link o azioni secondarie. Il testo sorgente resta in maiuscolo/minuscolo naturale (es. "Salva presenze", mai "SALVA PRESENZE" scritto così nel markup): la resa maiuscola è affidata esclusivamente alla proprietà CSS `text-transform`, mai alla stringa stessa — uno screen reader o un display braille impostato su verbosità carattere-per-carattere legge la stringa sorgente, non la resa visiva. Stato di focus da tastiera: vedi voce dedicata sotto.
- **Stato di focus (trasversale, non un componente a sé)** — ogni elemento interattivo (voce di navigazione, pulsante, checkbox, link) mostra un contorno di focus visibile alla navigazione da tastiera, coerente con l'impegno WCAG AA dichiarato in `EXPERIENCE.md` → Soglia di Accessibilità (SC 2.4.7): `{colors.focus-ring}` (`#006DA6`, 2px, offset 2px) su sfondi chiari/bianchi (pulsanti, form, righe); `{colors.focus-ring-on-navy}` (bianco, stessa dimensione) sulla nav-bar navy. Nessun elemento interattivo si affida al solo cambio di colore di sfondo per segnalare il focus.

## Cose da fare e da evitare

| Fare | Evitare |
|---|---|
| Bianco + azzurro come colori prevalenti di ogni superficie | Usare {colors.navy} o {colors.magenta} come sfondo di un'area di contenuto ampia (restano accenti/logo) |
| Badge "certificato scaduto" a livello di singola atleta in tono warning (informativo) | Usare rosso/danger acceso a livello di singola riga — allarma proprio nel momento in cui si registra la presenza (contro FR-15) |
| Riservare {colors.magenta} al singolo accento già definito (bordo stat-tile "scaduto") | Ripetere il magenta come colore decorativo ricorrente in più componenti |
| Un solo stack tipografico di sistema, leva del peso (900) per il carattere | Caricare un font custom per "dare personalità" — il carattere viene dal peso e dalla decisione cromatica, non dal typeface |
| Angoli stretti (6-8px), coerenti su badge/righe/pulsanti/tile | Angoli molto arrotondati o pillole — appartengono al registro "Familiare e Caldo" scartato |
| Transizioni di stato essenziali (hover, focus, apertura form) | Animazioni decorative, transizioni di ingresso pagina, effetti "poster" |
| Contrasto testo/sfondo verificato ≥ soglia WCAG AA su ogni coppia elencata in Colori | Introdurre nuove coppie colore senza verificarne il contrasto |
| Registro energico ma da strumento di lavoro (frasi brevi, dirette) | Il tono "poster da tifoseria" (maiuscole ed esclamativi diffusi, stile Imoco Volley) — utile solo come ispirazione di energia, non come modello UI |
| `{colors.button-bg}` come sfondo della voce di navigazione attiva | `{colors.primary}` come sfondo con testo bianco piccolo (contrasto insufficiente, ~2.87:1, sotto la soglia AA) |
| Contorno di focus visibile (`{colors.focus-ring}`/`{colors.focus-ring-on-navy}`) su ogni elemento interattivo alla navigazione da tastiera | Rimuovere l'outline di focus di default senza sostituirlo con un contorno visibile equivalente |
| Testo del pulsante scritto in maiuscolo/minuscolo naturale, reso maiuscolo solo via CSS `text-transform` | Scrivere il testo del pulsante già in maiuscolo nel markup (penalizza screen reader/braille) |
