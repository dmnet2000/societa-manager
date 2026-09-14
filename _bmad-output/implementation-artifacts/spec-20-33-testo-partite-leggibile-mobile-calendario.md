---
title: 'Story 20.33: /calendario non si ridimensiona su schermo cellulare'
type: 'bugfix'
created: '2026-09-14'
status: 'done'
route: 'one-shot'
review_loop_iteration: 0
context: []
---

# Story 20.33: /calendario non si ridimensiona su schermo cellulare

## Intent

**Problem:** richiesta esplicita dell'utente ("stessa cosa per la sezione calendario") dopo il fix equivalente su `/torneo` (Story 20.32). Verificato dal vivo su `volleymogliano.it/calendario` (iframe a 375px, ispezione DOM diretta): causa DIVERSA da `/torneo` - `.main` qui non ha `margin: 0 auto` (nessun centraggio), quindi non soffre del bug flex-item risolto li'. Il problema reale e' `.squadre` (nomi squadra nelle match-card): nessun `flex-wrap`, e un `padding-left: 100px` fisso (voluto, per evitare il taglio diagonale della card) diventa insostenibile su una card ridotta a ~312px di contenuto mobile - i due nomi squadra + "vs" sfondavano il bordo destro dello schermo. Con `html, body { overflow-x: hidden }` globale, il sintomo per il visitatore era testo tagliato/invisibile, non una scrollbar.

**Approach:** `.squadre` guadagna `flex-wrap`/`overflow-wrap` (mai piu' tagliato) e, sotto i 900px (breakpoint unico del sito pubblico), una riduzione di `font-size` (22px->16px) e `padding-left` (100px->`var(--space-6)`, 24px) - i 100px espliciti richiesti dall'utente restano intatti su desktop/tablet. Review fix critico: `.vs` eredita `font-size` da `.squadre` (`inherit`) - senza un override dedicato sarebbe sceso anch'esso a 16px, sotto la soglia WCAG "large text" che il contrasto magenta-chiaro-su-blu (3.88:1) richiede per restare AA. Aggiunto `.vs { font-size: 20px }` nello stesso breakpoint. **Lo stesso identico difetto e' stato trovato e corretto retroattivamente anche in `torneo-pubblico.module.css`** (Story 20.32, gia' "done" - introdotto li' per prima, scoperto solo durante la review di questa story gemella).

**Verifica dal vivo:** confermato via ispezione DOM diretta su produzione, sia a 375px sia a 320px (telefono piu' stretto comune) - zero elementi oltre il viewport dopo il fix (`document.body.scrollWidth` entro la larghezza del viewport in entrambi i casi).

## Suggested Review Order

**`/calendario` - fix principale**

- `.squadre`: flex-wrap sempre attivo + riduzione font-size/padding-left sotto i 900px.
  [`calendario.module.css:141`](../../app/calendario/calendario.module.css#L141)

- Override dedicato per evitare che `.vs` scenda sotto la soglia di contrasto AA insieme al nome squadra.
  [`calendario.module.css:173`](../../app/calendario/calendario.module.css#L173)

**Correzione retroattiva su `/torneo` (stesso difetto, scoperto qui)**

- Stesso override `.vs`, applicato al fix gemello gia' "done" (Story 20.32) dopo che la review di questa story ne ha rivelato la mancanza.
  [`torneo-pubblico.module.css:487`](../../app/torneo/torneo-pubblico.module.css#L487)

## Verification

**Commands:**
- `npx tsc --noEmit` -- pulito
- `npm run lint` -- 0 errori, 21 warning pre-esistenti non correlati

**Manual checks (dev locale rotto su questa macchina - verifica dal vivo gia' eseguita su produzione per questa story):**
- Fatto: `/calendario` a 375px e a 320px, nessun overflow orizzontale residuo (misurato).
- Il fix della soglia di contrasto `.vs` (20px) non e' verificabile visivamente finche' non deployato (produzione serve ancora il codice precedente) - solo la logica CSS e' stata verificata.
- Vedi `deferred-work.md`: `.meta` mantiene un padding-left proporzionalmente ampio non ottimizzato per mobile (non causa overflow, verificato).
