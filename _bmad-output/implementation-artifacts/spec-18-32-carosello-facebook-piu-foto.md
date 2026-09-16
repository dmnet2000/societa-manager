---
title: 'Story 18.32: Rotazione di tutte le foto di un post Facebook nel carosello hero'
type: 'feature'
created: '2026-09-16'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'f8658d144d7e852edeb0c2c002f2bb8aad84e399'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** il carosello Post Facebook nell'hero pubblico (Story 18.13, `app/HeroPostFacebook.tsx`) mostra una sola immagine per post (`full_picture`, l'immagine rappresentativa scelta da Facebook) - se un post ha più foto allegate (post tipo "album"), le altre non vengono mai mostrate. Richiesta esplicita dell'utente: ruotare tutte le foto di un post, non solo una.

**Approach:** `lib/facebook-graph.ts` richiede alla Graph API anche `attachments{type,media{image{src}},subattachments{media{image{src}}}}` (oltre ai campi già letti), estrae l'elenco completo delle foto di ciascun post (una sola per un post "photo", tutte le `subattachments` per un post "album"), con fallback su `full_picture` se `attachments` manca/non è parsabile. `PostFacebook.immagineUrl: string | null` diventa `immaginiUrl: string[]`. Nell'hero, un post con più foto le ruota automaticamente sullo stesso intervallo di 10s già usato per passare al post successivo: prima esaurisce le foto del post corrente, poi avanza al post successivo - stesso principio "un solo timer, nessuna doppia cadenza da sincronizzare" già alla base del componente.

## Boundaries & Constraints

**Always:**
- Nessuna modifica ai controlli manuali esistenti (frecce/pallini/pausa): restano a livello di POST, non di singola foto - un post con più foto resta un solo pallino nell'indicatore, mirror del comportamento attuale.
- Il fallback esistente (`full_picture`, o nessuna immagine se assente) resta l'ultima rete di sicurezza se `attachments` non è presente/parsabile nella risposta Graph API - mai un post senza immagine per un errore di parsing.
- L'estrazione delle foto (`type: "album"` → tutte le `subattachments`; `type: "photo"` → la singola `media`) è una funzione pura testata a sé (stesso principio già stabilito in questo file per `estraiSlugPaginaFacebook`), non intrecciata con la chiamata `fetch`.
- Riuso di `avanti`/`indietro`/`indiceEntroLimiti` (`lib/carosello-indice.ts`, già condivisi) per l'indice-foto interno al post, stessa aritmetica modulare già in uso per l'indice-post.
- L'indice-foto si azzera ogni volta che cambia il post corrente (avanzamento automatico, click su freccia, click su un pallino) - mai una foto "vecchia" mostrata all'apertura di un nuovo post.
- `leggiUltimiPostFacebook` continua a non lanciare mai (contratto esistente, AC #3 di Story 18.13) - un errore nel parsing di `attachments` per un singolo post non deve mai far fallire l'intera lettura, al più quel post degrada al solo fallback `full_picture`.

**Ask First:** nessuna - le due decisioni di design (stesso timer/cadenza per foto e post invece di un secondo timer indipendente; controlli manuali invariati a livello di post) sono chiuse qui, proposta ragionevole dell'implementatore - modificabile a Checkpoint 1 se non corrisponde a quanto immaginato.

**Never:** nessun nuovo controllo UI dedicato alle foto (no frecce/pallini per-foto in questa story - se servirà granularità manuale sulla singola foto, story futura). Nessuna modifica al filtro esistente "post senza `message` scartati" (AC #1 di Story 18.13, invariato). Nessuna richiesta di permessi/scope aggiuntivi al Page Access Token (i campi `attachments`/`subattachments` sono già coperti dai permessi minimi di lettura pagina esistenti, nessuna riconfigurazione lato Meta necessaria).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Post con una sola foto (`type: "photo"`) | `attachments.data[0].media.image.src` presente | `immaginiUrl` = array con quella sola foto, nessuna rotazione interna (comportamento identico a oggi) | N/A |
| Post con più foto (`type: "album"`) | `subattachments.data[]` con N foto | `immaginiUrl` = array con tutte le N foto, ruotate una alla volta ogni 10s prima di passare al post successivo | N/A |
| Post senza `attachments` (es. solo testo, o video) | `attachments` assente/vuoto | Fallback su `full_picture` se presente, altrimenti `immaginiUrl` vuoto (nessuno sfondo, mirror del comportamento attuale con `immagineUrl: null`) | N/A |
| `attachments`/`subattachments` malformati o con `media.image.src` mancente su alcune foto | Risposta Graph API parziale/inattesa | Le foto valide vengono comunque mostrate, quelle senza `src` vengono scartate silenziosamente (mai un elemento vuoto nella rotazione) | N/A |
| Utente clicca freccia "successivo"/un pallino mentre è a metà rotazione delle foto di un post | Interazione manuale | Passa al post successivo (o al post selezionato) mostrando la sua PRIMA foto, indice-foto azzerato | N/A |
| `prefers-reduced-motion: reduce` | Impostazione di sistema attiva | Nessuna rotazione automatica (né post né foto), stesso comportamento già esistente per i post | N/A |

</frozen-after-approval>

## Code Map

- `lib/facebook-graph.ts` -- `PostFacebook.immagineUrl: string | null` → `immaginiUrl: string[]`; parametro `fields` della richiesta esteso con `attachments{type,media{image{src}},subattachments{media{image{src}}}}`; nuova funzione pura `estraiImmaginiPost(attachment: AttachmentGraphApi | undefined, fullPicture: string | undefined): string[]` (tipizza la risposta grezza, gestisce `type: "album"` vs `"photo"` vs assente, fallback `full_picture`), richiamata dentro `leggiUltimiPostFacebook` per ciascun post.
- `app/HeroPostFacebook.tsx` -- nuovo state `indiceFoto`, azzerato via `useEffect` quando `indice` (post) cambia; l'`useEffect` del timer esistente avanza `indiceFoto` finché ci sono foto non ancora mostrate nel post corrente, altrimenti avanza `indice` (mirror dell'aritmetica già in uso, riusa `avanti`/`indiceEntroLimiti` da `lib/carosello-indice.ts`); `attuale.immagineUrl` → `attuale.immaginiUrl[indiceFotoValido]` nello style `backgroundImage`.

## Tasks & Acceptance

**Execution:**
- [x] `lib/facebook-graph.ts` -- `estraiImmaginiPost` + campo `attachments` nella richiesta + `immaginiUrl` al posto di `immagineUrl` + test
- [x] `app/HeroPostFacebook.tsx` -- rotazione interna delle foto sullo stesso timer, azzeramento dell'indice-foto al cambio post

**Acceptance Criteria:**
- Given un post con 3 foto (album), when l'hero lo mostra, then le 3 foto si alternano una alla volta ogni 10s prima di passare al post successivo
- Given un post con una sola foto, when l'hero lo mostra, then il comportamento è identico a oggi (nessuna rotazione interna)
- Given un post senza foto disponibili, when l'hero lo mostra, then nessuno sfondo fotografico viene mostrato (nessun errore, nessuna interruzione del carosello)
- Given l'utente passa manualmente al post successivo mentre è a metà rotazione foto, when clicca la freccia, then vede la prima foto del nuovo post

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti verdi, inclusi i nuovi test di `estraiImmaginiPost`
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile, richiede una Pagina Facebook configurata con almeno un post multi-foto reale):**
- Verificare che un post con più foto le mostri tutte in rotazione, e che il testo/permalink restino quelli del post per tutta la sua rotazione.
- Verificare che un post con una sola foto o senza foto si comporti come oggi.
- Caso critico emerso in review: se al momento del deploy risulta un SOLO post pubblicato (con più foto), verificare che la rotazione delle foto continui a ciclare all'infinito invece di bloccarsi sull'ultima (bug corretto prima del deploy, da confermare comunque dal vivo).

## Suggested Review Order

**Bug corretti in review (priorità)**

- Timer ristrutturato: elimina sia il blocco su un solo post multi-foto sia l'updater impuro annidato (finding convergente Blind Hunter + Edge Case Hunter).
  [`HeroPostFacebook.tsx:79`](../../app/HeroPostFacebook.tsx#L79)

- Guardia `Array.isArray` sul ramo "album": un `subattachments.data` malformato non fa più scartare l'intera lettura dei post (violava un vincolo Always della spec).
  [`facebook-graph.ts:111`](../../lib/facebook-graph.ts#L111)

**Funzionalità principale**

- Estrazione foto: singola per post "photo", tutte le subattachments per "album", fallback su full_picture.
  [`facebook-graph.ts:99`](../../lib/facebook-graph.ts#L99)

- Campo `attachments` esteso nella richiesta Graph API.
  [`facebook-graph.ts:178`](../../lib/facebook-graph.ts#L178)

- Rendering: foto corrente del post, clampata su `indiceFotoValido`.
  [`HeroPostFacebook.tsx:101`](../../app/HeroPostFacebook.tsx#L101)
