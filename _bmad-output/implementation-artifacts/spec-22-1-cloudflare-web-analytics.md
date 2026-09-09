---
title: 'Story 22.1: Cloudflare Web Analytics sul sito pubblico'
type: 'feature'
created: '2026-09-09'
status: 'done'
review_loop_iteration: 0
context: []
route: 'one-shot'
baseline_commit: '129f569'
---

# Story 22.1: Cloudflare Web Analytics sul sito pubblico

## Intent

**Problem:** l'utente vuole conoscere quante persone visitano il sito pubblico e quali pagine, senza dover interrogare direttamente il database.

**Approach (scelto con l'utente dopo aver presentato le opzioni):** Cloudflare Web Analytics - il progetto è già ospitato su Cloudflare Workers, il servizio è gratuito, non usa cookie (nessun impatto sul banner cookie esistente) e richiede solo l'inclusione di un piccolo script beacon. I dati si consultano nella dashboard Cloudflare, non dentro il gestionale (alternativa scartata: una soluzione custom in-app, più lavoro di sviluppo per lo stesso risultato).

**Punto di inserimento:** `app/FooterPubblico.tsx` - unico componente già montato da OGNI pagina pubblica (home, squadre, calendario, staff, contatti, torneo, sponsor, pagine dinamiche del Site Manager `app/[...slug]/page.tsx`) e MAI dalle pagine autenticate `/app/*` (che hanno un proprio layout separato, `app/app/layout.tsx`). Nessun layout condiviso esiste per le sole pagine pubbliche - questo è il punto più vicino a un simile layout.

**Token:** passato via `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` (variabile pubblica, il token di Cloudflare Web Analytics non è un segreto - è pensato per essere incluso lato client). Script omesso interamente (fail-soft) se la variabile non è impostata.

## Suggested Review Order

- Il cuore della story: script beacon condizionale in `FooterPubblico.tsx`.
  [`FooterPubblico.tsx:114`](../../app/FooterPubblico.tsx#L114) (costante `tokenAnalytics`), [`FooterPubblico.tsx:201`](../../app/FooterPubblico.tsx#L201) (`<Script>`)

- Variabile d'ambiente documentata.
  [`.env.example`](../../.env.example)

- Fase di deploy dedicata, non prevista nel Code Map iniziale (necessaria).
  [`docs/deploy-produzione.md`](../../docs/deploy-produzione.md) (Fase 8)

**Review a 3 livelli:** Blind Hunter, Edge Case Hunter e Verification Gap Reviewer convergenti su due temi reali. (1) Configurazione: un token con spazi/vuoto dopo il trim non deve caricare uno script rotto - corretto con `.trim()` sulla lettura del token, `id` esplicito aggiunto allo `<Script>` per buona pratica. (2) Operativo: le variabili `NEXT_PUBLIC_*` su questo progetto vanno impostate come "Variables and Secrets" del Worker (Fase 5 di `docs/deploy-produzione.md`, non come Build variable di Fase 2) - documentato esplicitamente in una nuova Fase 8, insieme all'avviso sui deploy di anteprima che condividono probabilmente lo stesso token/dashboard della produzione. Punto sollevato dal Blind Hunter con severità alta - privacy/GDPR: Cloudflare Web Analytics non usa cookie ma elabora comunque l'IP del Visitatore tramite un fornitore terzo, aspetto distinto dal solo banner cookie esistente - presentato all'utente, che ha scelto di procedere aggiornando anche l'informativa privacy (fuori dal codice: nessuna pagina privacy esiste in questo repository, verosimilmente gestita come contenuto CMS via Site Manager - testo suggerito fornito all'utente, follow-up loro). Altri finding (assenza di `onError`/osservabilità - richiederebbe un Client Component dedicato, sproporzionato; pagine senza `FooterPubblico` non tracciate - preesistente/fuori scope; rischio di hit fasulli da un token pubblico estratto - intrinseco al prodotto Cloudflare) loggati in `deferred-work.md`.

## Verification

**Commands:**
- `npx tsc --noEmit` -- pulito
- `npm run lint` -- 0 errori (21 warning preesistenti, invariati)
- `npx vitest run` -- 2052/2052 verdi
- `npm run build` -- riuscito (exit 0, "Compiled successfully")

**Manual checks (da fare al primo deploy, dopo aver impostato il token):**
- Creare un sito in Cloudflare (Account Home → Web Analytics → Aggiungi un sito → copiare il token dal tag JS).
- Impostare `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` come Variable/Secret del Worker (Fase 5/8 di `docs/deploy-produzione.md`), non come Build variable.
- Dopo il deploy, aprire una pagina pubblica e verificare (DevTools → Network) la richiesta a `static.cloudflareinsights.com/beacon.min.js`.
- Verificare che nessuna pagina `/app/*` carichi lo script.
- Consultare la dashboard Cloudflare Web Analytics dopo un po' di traffico reale.
- Aggiungere una menzione di Cloudflare Web Analytics all'informativa privacy del sito (fuori dal codice, a cura dell'utente - testo suggerito fornito in chat).
