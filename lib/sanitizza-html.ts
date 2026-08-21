import sanitizeHtml from "sanitize-html";

// Story 19.9 (Epic 19, Ruolo Site Manager): prima introduzione di
// sanitizzazione HTML in questo progetto - richiesta dal contenuto libero di
// PaginaPubblica.contenutoHtml, scritto dall'editor Tiptap della Story
// 19.10 e mostrato con dangerouslySetInnerHTML (app/[...slug]/page.tsx,
// prima occorrenza nel progetto). Difesa in profondita' (decisione esplicita
// di Winston in party mode, 2026-08-19): questa funzione va chiamata SIA
// prima di scrivere su database (Server Action di creazione/modifica,
// Story 19.10) SIA di nuovo al momento del render - mai fidarsi di un solo
// passaggio, un dato scritto prima di questa storia (impossibile oggi) o
// tramite un bypass futuro deve restare innocuo.
//
// Bug di produzione (2026-08-21, segnalato dall'utente su
// /app/pagine-pubbliche: ERR_FAILED): la libreria originale, isomorphic-
// dompurify, istanzia un intero ambiente jsdom a livello di modulo
// (`new JSDOM(...)`, incondizionato, fuori da ogni funzione) - eseguito ad
// ogni import di questo file, quindi su OGNI richiesta a qualunque rotta che
// lo importa transitivamente (anche /app/pagine-pubbliche, che non chiama
// mai sanitizzaHtml() ma importa lib/pagine-pubbliche.ts che importa questo
// file). jsdom funziona in Node (per questo "npm run build" locale non
// l'aveva mai rivelato, il render Next avviene in Node in fase di build) ma
// non e' compatibile con l'isolate V8 di Cloudflare Workers (nessun DOM
// nativo, nodejs_compat non basta per l'intera superficie di jsdom) - il
// rischio era gia' stato segnalato esplicitamente e mai verificato dal vivo
// nella review della Story 19.9 (deferred-work.md), confermato ora in
// produzione. Sostituito con sanitize-html: nessuna dipendenza da un DOM
// (usa htmlparser2, puro JS), stesso principio "difesa in profondita'" e
// stessa allowlist esplicita di prima.
//
// Allowlist esplicita, coerente con la toolbar minimale decisa per l'editor
// Tiptap della Story 19.10 (titoli H2/H3, grassetto/corsivo, elenchi
// puntati/numerati, link, immagini) - niente tabelle/embed/script/iframe,
// stessa ampiezza "dépliant digitale" decisa in party mode. A differenza
// della vecchia ALLOWED_ATTR globale di DOMPurify (valida su ogni tag
// consentito), qui gli attributi sono assegnati per singolo tag (href/
// target/rel/title su <a>, src/alt/title su <img>) - piu' preciso, nessuna
// regressione sui contenuti gia' scritti (Tiptap non produce mai altre
// combinazioni).
const TAG_CONSENTITI = [
  "h2",
  "h3",
  "p",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "br",
];

const ATTRIBUTI_CONSENTITI: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "title"],
};

export function sanitizzaHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: TAG_CONSENTITI,
    allowedAttributes: ATTRIBUTI_CONSENTITI,
    // Code review (Blind Hunter + Edge Case Hunter, trovato
    // indipendentemente, Story 19.9): l'allowlist permette target/rel su
    // <a>, ma nulla forzava rel="noopener noreferrer" quando target="_blank"
    // e' presente (Tiptap extension-link apre di default in una nuova
    // scheda) - senza, la pagina aperta avrebbe accesso a window.opener
    // (reverse tabnabbing). Stesso fix di prima, ora come transformTags
    // invece di un hook DOMPurify.
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.target === "_blank") {
          attribs.rel = "noopener noreferrer";
        }
        return { tagName, attribs };
      },
    },
  });
}
