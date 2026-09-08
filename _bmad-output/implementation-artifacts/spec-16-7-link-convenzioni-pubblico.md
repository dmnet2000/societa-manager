---
title: 'Story 16.7: Link esterno cliccabile anche per le Convenzioni sul sito pubblico'
type: 'feature'
created: '2026-09-08'
status: 'done'
route: 'one-shot'
review_loop_iteration: 0
context: []
---

# Story 16.7: Link esterno cliccabile anche per le Convenzioni sul sito pubblico

## Intent

**Problem:** sulla pagina pubblica `/sponsor` (Story 16.5), l'immagine di uno Sponsor era cliccabile verso `linkEsterno` solo per il tipo BANNER - una Convenzione con un link esterno impostato non mostrava alcuna azione a un Visitatore anonimo (che, a differenza dell'Utente autenticato su `/app/sponsor`, non ha il pulsante "Genera voucher").

**Approach:** in `SponsorPubblicoCard.tsx` la condizione è stata allargata da `sponsor.tipo === "BANNER" && sponsor.linkEsterno` a semplicemente `sponsor.linkEsterno` - qualunque tipo di Sponsor con un link esterno impostato lo mostra ora cliccabile sull'immagine, sola pagina pubblica `/sponsor`. Nessuna modifica alla pagina autenticata `/app/sponsor` (`SponsorVetrinaCard.tsx`), che mantiene il pulsante "Genera voucher" per le Convenzioni - divergenza intenzionale, non un'incoerenza da colmare (l'Utente autenticato ha già un'azione equivalente).

## Suggested Review Order

- Il cuore della modifica: condizione allargata a qualunque tipo Sponsor.
  [`SponsorPubblicoCard.tsx:43`](../../app/sponsor/SponsorPubblicoCard.tsx#L43)

- Etichetta `aria-label` resa neutra rispetto al tipo (review fix, Blind Hunter: "Vai al sito di X" presumeva un sito web, non sempre corretto per una Convenzione).
  [`SponsorPubblicoCard.tsx:49`](../../app/sponsor/SponsorPubblicoCard.tsx#L49)

## Verification

**Commands:**
- `npx tsc --noEmit` -- pulito
- `npm run lint` -- 0 errori
- `npx vitest run` -- 2051/2051 verdi

**Review a 3 livelli:** Blind Hunter, Edge Case Hunter e Verification Gap Reviewer hanno tutti sollevato (indipendentemente) lo stesso possibile rischio - un `linkEsterno` con schema `javascript:`/`data:` reso come `href` cliccabile. Verificato contro il codice reale: già bloccato in scrittura da `linkEsternoValido()` (`app/app/(sponsor)/sponsor/actions.ts:51`, richiede esplicitamente `http:`/`https:`), applicato a ENTRAMBI i tipi Sponsor senza branch su `tipo` (nessun rischio nuovo introdotto, il Banner era già esposto identicamente prima di questa story). Altri finding (stringa vuota non raggiungibile per il `.trim() || null` in scrittura, assenza di test di rendering - convenzione già accettata nel progetto, nessun test `.tsx` esiste nell'intero repo, verificato da Verification Gap Reviewer con una ricerca su tutto il repo, ridondanza di commenti, mancanza di indicazione visiva "questo link apre una scheda esterna") respinti come falsi positivi, fuori scope o coerenti con pattern già accettati.

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire `/sponsor` con almeno una Convenzione attiva con `linkEsterno` impostato: verificare che l'immagine sia cliccabile e apra il link in una nuova scheda.
- Verificare che una Convenzione senza `linkEsterno` resti non cliccabile (immagine semplice).
- Verificare che `/app/sponsor` (autenticato) sia invariato: le Convenzioni mostrano ancora "Genera voucher", non un link.
