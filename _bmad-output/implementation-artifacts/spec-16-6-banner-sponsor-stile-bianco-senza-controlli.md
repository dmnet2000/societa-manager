---
title: 'Story 16.6: Banner sponsor - sfondo bianco, senza pallini/pausa'
type: 'chore'
created: '2026-09-08'
status: 'done'
route: 'one-shot'
review_loop_iteration: 0
context: []
---

# Story 16.6: Banner sponsor - sfondo bianco, senza pallini/pausa

## Intent

**Problem:** il banner sponsor rotante fisso (Story 16.4) aveva sfondo blu scuro, pallini indicatori e un pulsante di pausa/ripresa - richiesta esplicita dell'utente di cambiare lo stile.

**Approach:** sfondo del banner cambiato da blu scuro (`#0F2438`) a bianco (`var(--color-surface)`), con testo/icone/focus-ring di conseguenza scuri invece di bianchi; rimossi del tutto i pallini indicatori e il pulsante di pausa/ripresa (incluso lo stato `inPausa` e la sua dipendenza nell'effetto di avanzamento automatico). Le frecce precedente/successivo restano invariate, unico controllo manuale rimasto. L'utente è stato avvisato esplicitamente, prima di procedere, che la rimozione del pulsante di pausa elimina l'unico modo per fermare la rotazione automatica ogni 5s (requisito WCAG 2.2.2 "Pause, Stop, Hide") e ha scelto consapevolmente di continuare - il carosello interno gemello (`SponsorCarosello.tsx`, area autenticata) resta invariato, con pausa e pallini ancora presenti.

## Suggested Review Order

- Sfondo bianco + colori testo/icone/focus-ring aggiornati di conseguenza.
  [`BannerSponsorPubblico.module.css:16`](../../app/BannerSponsorPubblico.module.css#L16)

- Rimozione di pallini e pulsante pausa (JSX + CSS + stato `inPausa`), con commento in testa al file che documenta la richiesta esplicita e il compromesso di accessibilità accettato.
  [`BannerSponsorPubblico.tsx:25`](../../app/BannerSponsorPubblico.tsx#L25)

- Review fix: due commenti ormai obsoleti (facevano ancora riferimento a pallini/pausa rimossi) corretti in due file diversi - trovato da Blind Hunter.
  [`BannerSponsorPubblico.module.css:20`](../../app/BannerSponsorPubblico.module.css#L20), [`globals.css:27`](../../app/globals.css#L27)

## Verification

**Commands:**
- `npx tsc --noEmit` -- pulito
- `npm run lint` -- 0 errori
- `npx vitest run` -- 2050/2050 verdi

**Review a 3 livelli:** Blind Hunter ha trovato due commenti obsoleti (corretti) e ha suggerito una traccia in `deferred-work.md` per il compromesso di accessibilità accettato (aggiunta, insieme a una nota sul contrasto borderline del bordo decorativo contro il nuovo sfondo bianco). Edge Case Hunter e Verification Gap Reviewer non hanno trovato problemi. La discontinuità visiva tra il banner ora bianco e il footer condiviso ancora blu scuro, e la perdita del salto diretto a uno sponsor specifico (prima permesso dai pallini), sono conseguenze dirette delle scelte esplicite dell'utente, non difetti di implementazione - segnalate all'utente, non corrette autonomamente.

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire una qualunque pagina pubblica con più Sponsor Banner attivi: verificare sfondo bianco, nessun pallino, nessun pulsante pausa, frecce ancora funzionanti.
