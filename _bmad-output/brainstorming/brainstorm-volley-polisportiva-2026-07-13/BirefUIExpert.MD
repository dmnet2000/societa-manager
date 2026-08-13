# Brief per agente UX Expert (BMAD) — Sito Squadra Pallavolo
 
## Contesto progetto
Sito web per una squadra di pallavolo, composto da due esperienze distinte:
1. **Sito pubblico** — presentazione squadra, news, calendario, sponsor
2. **Portale riservato** — area con login per giocatori/staff/dirigenza
Richiedo un `front-end-spec.md` che copra entrambe le aree con toni visivi diversi ma coerenti tra loro (stesso brand, applicazione diversa).
 
## Obiettivo
Definire identità visiva, design system e struttura UX per un sito accattivante e moderno, mantenendo il portale funzionale e leggibile.
 
---
 
## Sezione 1 — Sito pubblico
 
**Tono**: energico, dinamico, emozionale — deve comunicare movimento e appartenenza.
 
**Contenuti da prevedere**:
- Home con hero (foto d'azione o video), prossima partita in evidenza / countdown
- Sezione squadra: card giocatori (foto, ruolo, numero maglia, statistiche base)
- Calendario/risultati partite, classifica
- News/blog
- Sezione sponsor (striscia loghi)
- Contatti / dove giocare / social
**Direzione estetica**:
- Palette basata sui colori sociali della squadra (da specificare: [inserire colori squadra])
- Tipografia bold/condensed in stile poster sportivo per titoli, sans-serif pulita per testo
- Elementi grafici diagonali/dinamici che suggeriscono movimento
- Fotografia d'azione come elemento dominante (hero, sezioni squadra)
- Micro-animazioni leggere su hover/scroll (non invasive)
**Output richiesto**: wireframe struttura pagine, design tokens (colori, tipografia, spacing), componenti chiave (hero, card giocatore, card partita, sponsor bar).
 
---
 
## Sezione 2 — Portale riservato
 
**Tono**: sobrio, funzionale, utility-first — priorità a chiarezza e velocità d'uso.
 
**Ruoli utente**: giocatore, allenatore, admin/dirigenza (permessi diversi, viste diverse)
 
**Contenuti da prevedere**:
- Login/autenticazione
- Dashboard personalizzata per ruolo
- Calendario allenamenti e partite
- Comunicazioni/bacheca interna
- Statistiche individuali e di squadra
- Gestione presenze (se rilevante)
**Direzione estetica**:
- Stack consigliato: Tailwind + shadcn/ui
- Palette ridotta, solo accenti nei colori sociali (niente decorazioni pesanti)
- Massima leggibilità: tabelle, form, stati vuoti e di caricamento ben curati
- Accessibilità: contrasto adeguato, focus states chiari, componenti navigabili da tastiera
**Output richiesto**: mappa delle viste per ruolo, design tokens (possono derivare da quelli del sito pubblico ma con applicazione più contenuta), componenti chiave (dashboard card, tabella statistiche, form, calendario).
 
---
 
## Vincoli tecnici
- Framework: [da specificare — es. Next.js / React]
- Deve integrarsi con il flusso BMAD standard (output consumato da Architect e Dev agent)
- Responsive obbligatorio (mobile-first, molti utenti guarderanno calendario/risultati da smartphone)
## Extra
Se disponibile un tool di UI generation (v0, Lovable), generare anche i prompt per produrre mockup ad alta fedeltà di: home page pubblica, dashboard portale, card giocatore.
 
## Input da fornire prima di lanciare l'agente
- [ ] Colori sociali ufficiali della squadra (hex se disponibili)
- [ ] Logo esistente (sì/no, formato)
- [ ] Nome squadra e categoria (es. serie, maschile/femminile/giovanile)
- [ ] Eventuali riferimenti/siti che piacciono come stile
 


