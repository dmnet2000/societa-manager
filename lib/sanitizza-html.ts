import sanitizeHtml from "sanitize-html";
import {
  ALLINEAMENTI_IMMAGINE_CONSENTITI,
  ALLINEAMENTI_TESTO_CONSENTITI,
} from "@/lib/allineamenti";
import {
  costruisciSrcVideo,
  videoIdRiconosciuto,
  type PiattaformaVideo,
} from "@/lib/video-embed";

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
// Story 19.14 (Epic 19, Ruolo Site Manager): editor a blocchi - "iframe" e
// "div" sono gli UNICI due tag nuovi aggiunti da questa storia (Design Notes
// della spec: preferire il riuso di tag gia' allowlistati con un attributo
// data-blocco quando possibile). Il blocco Pulsante non ne ha bisogno affatto
// (riusa <a>, gia' presente); il blocco Colonne ha bisogno di un contenitore
// generico (nessun tag esistente nell'allowlist e' un contenitore di blocco
// generico) -> "div"; il blocco Video ha bisogno dell'embed stesso -> "iframe",
// ristretto a due soli hostname via allowedIframeHostnames sotto (mai un
// iframe generico).
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
  "iframe",
  "div",
];

const ATTRIBUTI_CONSENTITI: sanitizeHtml.IOptions["allowedAttributes"] = {
  // "data-blocco" su <a>: solo per distinguere il blocco Pulsante (Story
  // 19.14) da un link inline normale - insieme chiuso validato in
  // transformTags sotto (rimosso silenziosamente se non e' "pulsante").
  a: ["href", "target", "rel", "title", "data-blocco"],
  img: ["src", "alt", "title", "data-align", "width", "height"],
  p: ["data-align"],
  h2: ["data-align"],
  h3: ["data-align"],
  // Story 19.14: blocco Colonne - contenitore esterno ("colonne") e le due
  // colonne interne ("colonna"), insieme chiuso validato sotto.
  div: ["data-blocco"],
  // Story 19.14: blocco Video - src/allow/sandbox/etc sono SEMPRE
  // ricostruiti da transformTags sotto (mai fidarsi del valore persistito),
  // ma devono comunque comparire qui: sanitize-html applica l'allowlist
  // attributi anche al risultato di transformTags, un attributo forzato ma
  // non allowlistato verrebbe comunque rimosso subito dopo.
  iframe: [
    "src",
    "title",
    "allow",
    "allowfullscreen",
    "sandbox",
    "loading",
    "data-blocco",
    "data-platform",
    "data-video-id",
  ],
};

// Story 19.13 (Epic 19, Ruolo Site Manager): allineamento testo/immagini e
// ridimensionamento immagini (editor Tiptap, tiptap-estensioni.ts) - stessa
// filosofia "insieme chiuso di stringhe letterali" gia' in uso per
// target/rel su <a>, mai uno `style` libero (Boundaries della spec).
// `data-align` e' rimosso silenziosamente se non e' uno dei valori attesi
// per quel tag (invece del tag intero), coerente con il comportamento gia'
// documentato/testato per il resto dell'allowlist. Gli insiemi consentiti
// vivono in lib/allineamenti.ts (unica fonte di verita', condivisa col lato
// client - review fix, Blind Hunter + Verification Gap, indipendentemente).
function rimuoviAllineamentoNonValido(
  valoriConsentiti: readonly string[]
): sanitizeHtml.Transformer {
  return (tagName, attribs) => {
    const allineamento = attribs["data-align"];
    if (allineamento !== undefined && !valoriConsentiti.includes(allineamento)) {
      delete attribs["data-align"];
    }
    return { tagName, attribs };
  };
}

// Review fix (Edge Case Hunter, Story 19.13): SOLO_CIFRE da sola accettava
// "0" (e' una cifra) - un <img width="0" height="0"> sopravviveva alla
// sanitizzazione (il vero cancello, Suggested Review Order della spec) e si
// renderizzava invisibile (0x0), nessun'altra regola CSS lo ingrandisce
// (.contenuto img ha solo max-width:100%/height:auto, nessun width minimo).
// Il vincolo dei 40px minimi era gia' dichiarato nel Code Map come "stesso
// principio" del minWidth/minHeight della NodeView di resize
// (tiptap-estensioni.ts), ma enforced SOLO li' (lato client, durante il
// trascinamento) - un bypass ipotetico dell'editor (incolla di HTML grezzo)
// non passava mai dalla NodeView. Ora lo stesso minimo e' applicato anche
// qui, il cancello reale. Tetto massimo aggiunto per lo stesso principio
// di difesa in profondita' (nessun valore assurdo/enorme accettato).
const LARGHEZZA_MINIMA_IMMAGINE = 40;
const LARGHEZZA_MASSIMA_IMMAGINE = 4000;

function dimensioneImmagineValida(valore: string): boolean {
  if (!/^\d+$/.test(valore)) return false;
  const numero = Number(valore);
  return numero >= LARGHEZZA_MINIMA_IMMAGINE && numero <= LARGHEZZA_MASSIMA_IMMAGINE;
}

// Story 19.14 (Epic 19, Ruolo Site Manager): "data-blocco" su <a>/<div> e'
// sempre un insieme chiuso di stringhe letterali - stessa filosofia gia' in
// uso per data-align (rimosso silenziosamente se il valore non e' tra quelli
// attesi, il resto del tag resta invariato).
const VALORI_DATA_BLOCCO_A = ["pulsante"];
const VALORI_DATA_BLOCCO_DIV = ["colonne", "colonna"];

function rimuoviDataBloccoNonValido(valoriConsentiti: readonly string[]): sanitizeHtml.Transformer {
  return (tagName, attribs) => {
    const valore = attribs["data-blocco"];
    if (valore !== undefined && !valoriConsentiti.includes(valore)) {
      delete attribs["data-blocco"];
    }
    return { tagName, attribs };
  };
}

export function sanitizzaHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: TAG_CONSENTITI,
    allowedAttributes: ATTRIBUTI_CONSENTITI,
    // Story 19.14: unico hostname ammesso per l'src di un <iframe> - un
    // Node BloccoVideo legittimo lo ricostruisce sempre su uno di questi due
    // domini (lib/video-embed.ts, costruisciSrcVideo); qualunque altro src
    // (un <iframe> generico incollato/manomesso) fa rimuovere l'intero tag,
    // stesso comportamento gia' testato per <iframe> prima di questa storia.
    allowedIframeHostnames: ["www.youtube-nocookie.com", "player.vimeo.com"],
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
        return rimuoviDataBloccoNonValido(VALORI_DATA_BLOCCO_A)(tagName, attribs);
      },
      p: rimuoviAllineamentoNonValido(ALLINEAMENTI_TESTO_CONSENTITI),
      h2: rimuoviAllineamentoNonValido(ALLINEAMENTI_TESTO_CONSENTITI),
      h3: rimuoviAllineamentoNonValido(ALLINEAMENTI_TESTO_CONSENTITI),
      img: (tagName, attribs) => {
        const risultato = rimuoviAllineamentoNonValido(ALLINEAMENTI_IMMAGINE_CONSENTITI)(
          tagName,
          attribs
        );
        (["width", "height"] as const).forEach((chiave) => {
          const valore = risultato.attribs[chiave];
          if (valore !== undefined && !dimensioneImmagineValida(valore)) {
            delete risultato.attribs[chiave];
          }
        });
        return risultato;
      },
      div: rimuoviDataBloccoNonValido(VALORI_DATA_BLOCCO_DIV),
      // Story 19.14 ("Always" della spec): mai un <iframe src> con URL letto
      // direttamente dall'utente. allowedIframeHostnames sopra e' il vero
      // cancello sull'host; qui si forza SEMPRE lo stesso sandbox (mai
      // quello eventualmente persistito/manomesso) e si ri-valida
      // data-platform/data-video-id con lo stesso insieme chiuso di regex
      // usato da lib/video-embed.ts al salvataggio - un iframe con id
      // malformato perde quei due attributi (il tag/src restano, coerenti
      // col comportamento gia' in uso per data-align/width/height: si rimuove
      // l'attributo manomesso, non l'intero tag).
      // Review fix (Blind Hunter, Story 19.14): validare data-platform/
      // data-video-id per formato e l'hostname di src separatamente non basta
      // - un contenutoHtml manomesso poteva avere entrambi validi ma un src
      // che punta a un video diverso sullo stesso hostname consentito. Ora,
      // quando la coppia e' valida, src viene SEMPRE ricalcolato da
      // costruisciSrcVideo(platform, videoId) - mai fidarsi del valore
      // persistito, mai il contrario (src non convalida mai platform/videoId).
      iframe: (tagName, attribs) => {
        attribs.sandbox = "allow-scripts allow-same-origin allow-presentation";

        const platform = attribs["data-platform"];
        const videoId = attribs["data-video-id"];
        if (platform !== undefined && videoId !== undefined) {
          if (videoIdRiconosciuto(platform, videoId)) {
            attribs.src = costruisciSrcVideo(platform as PiattaformaVideo, videoId);
          } else {
            delete attribs["data-platform"];
            delete attribs["data-video-id"];
          }
        }

        return { tagName, attribs };
      },
    },
  });
}
