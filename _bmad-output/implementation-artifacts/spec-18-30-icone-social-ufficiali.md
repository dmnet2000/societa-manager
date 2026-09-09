---
title: 'Story 18.30: Icone ufficiali Facebook/Instagram'
type: 'feature'
created: '2026-09-09'
status: 'done'
route: 'one-shot'
review_loop_iteration: 0
context: []
---

# Story 18.30: Icone ufficiali Facebook/Instagram

## Intent

**Problem:** le icone social nel footer pubblico e in `/contatti` mostravano un testo segnaposto ("F"/"IG") invece delle icone ufficiali dei due social - richiesta esplicita dell'utente.

**Approach:** due nuovi componenti SVG condivisi (`app/IconaFacebook.tsx`, `app/IconaInstagram.tsx`) con i path dei glifi ufficiali (Font Awesome Free 6, licenza CC BY 4.0, attribuzione nel commento di ciascun file) - nessuna nuova libreria/dipendenza, stesso principio SVG-inline già in uso da `icone-azione-riga.tsx`. Sostituiscono il testo nei 4 punti di rendering esistenti (`FooterPubblico.tsx` e `contatti/page.tsx`, uno per social). Dimensioni fisse come attributi HTML diretti sull'`<svg>` (mirror della convenzione già stabilita in `icone-azione-riga.tsx`, mai una classe CSS per dimensionare un'icona condivisa) - width calcolato per icona sul rapporto naturale del proprio viewBox a un'altezza comune di 20px, per evitare che il glifo più stretto di Facebook (viewBox 320×512) appaia visivamente più piccolo di quello di Instagram (viewBox 448×512, quasi quadrato) se entrambi forzati nella stessa gabbia quadrata.

## Suggested Review Order

- Le due icone nuove, con l'attribuzione di fonte/licenza (deroga esplicita alla convenzione "icone disegnate a mano" di `icone-azione-riga.tsx`, stessa deroga già accettata per `IconaAiuto` in quel file).
  [`app/IconaFacebook.tsx`](../../app/IconaFacebook.tsx)
  [`app/IconaInstagram.tsx`](../../app/IconaInstagram.tsx)

- Review fix (Blind Hunter): dimensioni per-icona invece di una gabbia quadrata comune, per non far apparire le due icone di peso visivo diverso una volta affiancate.
  [`app/IconaFacebook.tsx`](../../app/IconaFacebook.tsx) (width=13, height=20)
  [`app/IconaInstagram.tsx`](../../app/IconaInstagram.tsx) (width=18, height=20)

- Punti di utilizzo (nessuna logica toccata, solo il contenuto del link).
  [`app/FooterPubblico.tsx`](../../app/FooterPubblico.tsx)
  [`app/contatti/page.tsx`](../../app/contatti/page.tsx)

## Verification

**Commands:**
- `npx tsc --noEmit` -- pulito
- `npm run lint` -- 0 errori
- `npx vitest run` -- 2073/2073 verdi
- `npm run build` -- riuscito

**Review (Blind Hunter):** trovati e corretti 2 problemi reali - (1) le icone forzate nella stessa gabbia 20×20px avrebbero avuto peso visivo molto diverso (Facebook più stretta/con margini, Instagram quasi a riempire il cerchio) per via dei viewBox non quadrati - corretto con dimensioni per-icona proporzionali al viewBox naturale; (2) mancava l'attribuzione di fonte/licenza per i path SVG copiati da una libreria esterna, richiesta dalla convenzione già stabilita nel progetto per icone non disegnate a mano (`icone-azione-riga.tsx`, `IconaAiuto`) - aggiunta. Riallineate anche le dimensioni a un attributo HTML fisso sul componente invece che a una classe CSS, mirror della stessa convenzione. Altri finding (drift preesistente della transizione hover tra i due CSS module, trattamento monocromatico invece del gradiente ufficiale di Instagram) loggati in `deferred-work.md` come preesistenti/fuori scope o scelta deliberata coerente con lo stile esistente.

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire una pagina pubblica con Facebook e/o Instagram configurati: verificare che le icone ufficiali compaiano, ben proporzionate, nel footer.
- Aprire `/contatti` con entrambi configurati: verificare le due icone affiancate.
