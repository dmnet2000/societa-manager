---
title: 'Story 18.28: Footer pubblico - copyright/logo Polisportiva/social su una riga'
type: 'feature'
created: '2026-09-09'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '8f93123cb9b5d85376734147d2ac8a1aed3fc065'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** nel footer pubblico (`app/FooterPubblico.tsx`), copyright, logo Polisportiva e link social sono impilati verticalmente (uno sotto l'altro, `.footer { flex-direction: column }`) - richiesta esplicita dell'utente: vederli allineati sulla stessa riga.

**Approach:** i tre elementi (copyright, logo Polisportiva se presente, icone social se presenti) vengono racchiusi in un nuovo contenitore flex-row (`.rigaPrincipale`), con `flex-wrap` per non rompere il layout su schermi stretti. Il link "Preferenze cookie" resta com'è, ultimo figlio del `<footer>`, sotto la riga - non è stato menzionato dall'utente, nessuna richiesta di spostarlo.

## Boundaries & Constraints

**Always:** la riga si ricentra naturalmente sui soli elementi effettivamente presenti (nessun logo Polisportiva caricato e/o nessun social configurato) - nessuno spazio vuoto o separatore orfano, stesso principio "fail-soft" già in uso per ogni elemento condizionale di questo componente. Su viewport stretti la riga va a capo (`flex-wrap: wrap`) invece di causare overflow orizzontale o testo/icone schiacciati.

**Ask First:** nessuna prevista.

**Never:** nessuna modifica alla logica di QUALI elementi compaiono (stessa condizionalità esistente su `logoPolisportiva.esiste`/social configurati) - solo il loro arrangiamento visivo. Nessuno spostamento del link "Preferenze cookie" (resta sotto la riga, comportamento invariato). Nessuna modifica al banner sponsor fisso/CookieBanner (pari grado del `<footer>`, mai annidati al suo interno - invariato dalla Story 16.4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nessun logo Polisportiva, nessun social configurato | solo copyright | Riga con il solo copyright, centrata (comportamento visivo equivalente a oggi) | N/A |
| Logo Polisportiva presente, nessun social | copyright + logo | Riga con copyright e logo affiancati | N/A |
| Nessun logo, social presente (Facebook e/o Instagram, Story 18.29) | copyright + icone | Riga con copyright e icone affiancate | N/A |
| Tutti presenti | copyright + logo + icone | Riga con tutti gli elementi, a capo su viewport stretti | N/A |
| Viewport molto stretto (mobile) | tutti presenti | Gli elementi vanno a capo su più righe (`flex-wrap`), nessun overflow orizzontale | N/A |

</frozen-after-approval>

## Code Map

- `app/FooterPubblico.tsx` -- avvolgere `<p>copyright</p>`, il blocco logo Polisportiva condizionale e il blocco icone social condizionale in un nuovo `<div className={styles.rigaPrincipale}>`, dentro `<footer>`. Il `<Link>` "Preferenze cookie" resta fuori da questo div, com'è oggi.
- `app/FooterPubblico.module.css` -- nuova classe `.rigaPrincipale` (`display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap: var(--space-4)`). Rimuovere `margin-top` da `.logoPolisportiva`/`.iconaSocial` (ridondante/in conflitto con il `gap` della riga) e azzerare il margine di default del `<p>` copyright (`margin: 0` su un nuovo stile o inline, per un allineamento verticale pulito nella riga).

## Tasks & Acceptance

**Execution:**
- [ ] `app/FooterPubblico.tsx` -- introdurre `.rigaPrincipale`
- [ ] `app/FooterPubblico.module.css` -- stile della riga, pulizia margini dei figli

**Acceptance Criteria:**
- Given un logo Polisportiva caricato e almeno un social configurato, when si apre una qualunque pagina pubblica, then copyright, logo e icone social compaiono sulla stessa riga, centrati
- Given nessun logo/nessun social configurato, when si apre una pagina pubblica, then il footer mostra solo il copyright, centrato, senza spazi vuoti visibili
- Given un viewport stretto (mobile), when tutti gli elementi sono presenti, then vanno a capo in modo leggibile, senza scroll orizzontale

## Verification

**Commands:**
- `npx tsc --noEmit` -- pulito
- `npm run lint` -- 0 errori
- `npx vitest run` -- 2067/2067 verdi
- `npm run build` -- riuscito (exit 0, "Compiled successfully")

**Review a 3 livelli (implementata insieme alla Story 18.29, stessi file):** vedi Verification di spec-18-29-link-instagram-configurabile.md per il dettaglio completo dei finding condivisi. Per la sola parte 18.28: nessun finding specifico sul layout stesso (flex-wrap/gap approvati), un solo finding di accessibilità (Blind Hunter) - le icone social raggruppate senza indicazione semantica per screen reader - corretto insieme alla 18.29 con un wrapper `role="group" aria-label="Social"` (`display:contents`, nessun impatto sul layout visivo).

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire una pagina pubblica con logo Polisportiva e social configurati: verificare l'allineamento orizzontale.
- Restringere la finestra (mobile): verificare che gli elementi vadano a capo senza rompere il layout.
- Aprire una pagina pubblica senza logo/social configurati: verificare che resti solo il copyright, centrato.
