---
title: "Story 20.10: Allineamento layout pubblico Torneo alle altre pagine pubbliche"
type: 'feature'
created: '2026-08-25'
status: 'done'
review_loop_iteration: 1
context: []
baseline_commit: '413a8890f38d5e01ceaf1149fb50db4412ccdfe2'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la pagina pubblica `/torneo` avvolge ogni sezione Categoria in una "card" bianca con `box-shadow`/`padding`/`border-radius` (`.sezioneCategoria`, mirror del componente team-card di `/squadre`, Story 20.6). Le altre pagine pubbliche costruite sullo stesso registro "Poster Sportivo" (`/calendario`, riferimento più vicino - stessa struttura "sezioni raggruppate + match-card") non hanno alcun riquadro: le sezioni (Settimana) siedono direttamente sullo sfondo della pagina, separate solo da un'intestazione e da spaziatura verticale.

**Approach:** rimuovere il riquadro bianco da `.sezioneCategoria` in `app/torneo/torneo-pubblico.module.css` - mantenere solo la spaziatura verticale (`margin-top`), mirror esatto di `.sezioneSettimana` in `app/calendario/calendario.module.css`. Nessun'altra classe della pagina viene toccata.

## Boundaries & Constraints

**Always:** il file toccato è esclusivamente `app/torneo/torneo-pubblico.module.css` (pagina pubblica). `app/app/(torneo)/torneo/torneo.module.css` (pagina interna/amministrativa) è un modulo CSS separato e diverso - **mai** toccato da questa storia (stesso Boundary già stabilito in Story 20.6).

**Ask First:** nessuna.

**Never:** nessun `max-width`/centratura del contenuto - nessuna pagina pubblica del sito (`/calendario`, `/squadre`, `/staff`, `/torneo`) ha oggi un contenitore centrato a larghezza massima; non è una divergenza rispetto alle altre pagine, quindi fuori scope (chiarito con l'utente tramite domanda diretta, che ha scelto esplicitamente solo l'opzione "rimuovere il riquadro bianco"). Nessuna modifica a `.matchCard`, `.tabellaClassifica`, `.titoloCategoria`, `.sezioneVolantino`, `.matchGrid`, o a qualunque altra classe: l'aspetto di tutto il resto della pagina resta bit-per-bit invariato.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Edizione con una sola Categoria | 1 Categoria | nessun riquadro bianco attorno alla sezione, contenuto direttamente sullo sfondo | N/A |
| Edizione con più Categorie | N Categorie | spaziatura verticale (`margin-top`) tra una Categoria e la successiva, coerente con `.sezioneSettimana`/`.sezioneSettimana:first-of-type` di `/calendario` | N/A |
| Nessuna Categoria pubblicata | 0 Categorie | messaggio esplicito già esistente (`.messaggioVuoto`), invariato - nessuna sezione da renderizzare | N/A |
| Pagina interna amministrativa `/app/torneo/...` | qualunque stato | aspetto invariato bit-per-bit (modulo CSS diverso, non toccato) | N/A |

</frozen-after-approval>

## Code Map

- `app/torneo/torneo-pubblico.module.css` -- `.sezioneCategoria`: rimuovere `background: var(--color-surface)`, `padding: var(--space-6)`, `box-shadow: 0 8px 24px rgba(15, 36, 56, 0.08)`, `border-radius: 0` (già un no-op, nessun arrotondamento applicato - rimosso comunque per pulizia, coerente con l'AC #1 "angoli arrotondati" tra le proprietà eliminate). Mantenere `margin-top: var(--space-8)` e la regola `.sezioneCategoria:first-of-type { margin-top: var(--space-6); }` invariate (mirror esatto di `.sezioneSettimana`/`.sezioneSettimana:first-of-type` in `app/calendario/calendario.module.css`). Aggiornare il commento in cima al file che descrive `.sezioneCategoria` come "team-card" (righe ~52-61) per riflettere il nuovo trattamento.
- Nessun altro file toccato: `app/torneo/page.tsx` non referenzia `border-radius`/`box-shadow` inline, la struttura JSX non cambia (stessa gerarchia di `<section className={styles.sezioneCategoria}>`).

## Tasks & Acceptance

**Execution:**
- [x] `app/torneo/torneo-pubblico.module.css` -- rimuovere il riquadro da `.sezioneCategoria`, aggiornare il commento

**Acceptance Criteria:** vedi `epics.md` Story 20.10 (Given/When/Then, verbatim).

## Design Notes

**Perché solo CSS, nessuna modifica JSX:** `.sezioneCategoria` è già l'unica classe che applica il trattamento "card" - rimuovendo le 3 proprietà (`background`/`padding`/`box-shadow`/`border-radius`) il contenuto interno (già disposto in un flusso verticale naturale tramite i suoi elementi figli con i propri margin) si allinea automaticamente allo stile "sezioni dirette sullo sfondo" di `/calendario`, senza bisogno di restructuring del markup.

**Perché non un `max-width` centrato:** già chiarito esplicitamente con l'utente (AskUserQuestion, 2026-08-25) - nessuna pagina pubblica del sito ha oggi un contenitore centrato, quindi non sarebbe un allineamento ma una modifica nuova non richiesta.

## Verification

**Commands:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`

**Manual checks (obbligatorio):** non eseguibile in questa sessione - pagina non ancora deployata in produzione, ambiente di sviluppo locale rotto (Prisma WASM + Windows). Verifica limitata a: assenza di riferimenti residui a `box-shadow`/`border-radius`/`background` su `.sezioneCategoria` nel CSS finale, build/lint/test puliti.

## Spec Change Log

Review a 1 agente (Blind Hunter + Edge Case Hunter + Verification Gap Reviewer applicate in sequenza dallo stesso agente, proporzionato alla dimensione della modifica) su diff isolato dal baseline.

**Verificato esplicitamente (nessun problema):** `body`/`.main` restano su sfondo bianco identico a prima (rimuovere `background: var(--color-surface)` dalla card non cambia nulla, era già lo stesso colore dello sfondo pagina) - nessun problema di contrasto per `.tabellaClassifica`/`.listaSquadre`/testo. Nessun altro selettore nel file dipende da padding/background residui di `.sezioneCategoria`. `.sezioneCategoria:first-of-type` invariata. Nessun'altra classe toccata, confermato leggendo il diff per intero.

**PATCH (applicati, entrambi cosmetici/documentali, nessun impatto funzionale):**
1. Code Map non menzionava `border-radius: 0` tra le proprietà rimosse (era già un no-op, nessun arrotondamento applicato prima) mentre l'AC #1 in epics.md lo cita esplicitamente ("angoli arrotondati") - Code Map aggiornato per coerenza.
2. Il commento sopra `.sezioneCategoria` diceva "Story 20.10 (review fix layout)" - etichetta "review fix" fuorviante dato che non è una correzione emersa durante la review di un'altra storia, ma il cambiamento primario di questa storia stessa. Rinominato a "Story 20.10" semplice.

**DEFER/REJECT:** nessuno - nessun altro finding emerso.
