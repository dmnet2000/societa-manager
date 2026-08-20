import DOMPurify from "isomorphic-dompurify";

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
// Allowlist esplicita, coerente con la toolbar minimale decisa per l'editor
// Tiptap della Story 19.10 (titoli H2/H3, grassetto/corsivo, elenchi
// puntati/numerati, link, immagini) - niente tabelle/embed/script/iframe,
// stessa ampiezza "dépliant digitale" decisa in party mode.
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

// href/src per i link/immagini; alt/title per il testo alternativo
// (accessibilita', immagini caricate tramite l'editor); target/rel per i
// link (Tiptap extension-link apre di default in una nuova scheda).
const ATTRIBUTI_CONSENTITI = ["href", "src", "alt", "title", "target", "rel"];

// Code review (Blind Hunter + Edge Case Hunter, trovato indipendentemente):
// l'allowlist permette target/rel su <a>, ma nulla forzava rel="noopener
// noreferrer" quando target="_blank" e' presente (Tiptap extension-link
// della Story 19.10 apre di default in una nuova scheda) - senza, la pagina
// aperta avrebbe accesso a window.opener (reverse tabnabbing). Hook DOMPurify
// registrato una sola volta al caricamento del modulo, si applica a ogni
// sanitizzaHtml() successiva - non un secondo passaggio manuale sul
// risultato gia' sanitizzato.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function sanitizzaHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: TAG_CONSENTITI,
    ALLOWED_ATTR: ATTRIBUTI_CONSENTITI,
  });
}
