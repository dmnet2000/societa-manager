import TiptapTextAlign from "@tiptap/extension-text-align";
import TiptapImage from "@tiptap/extension-image";
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import type { Node as PMNode, ResolvedPos } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";
import { ALLINEAMENTI_IMMAGINE_CONSENTITI } from "@/lib/allineamenti";
import { costruisciSrcVideo, type PiattaformaVideo } from "@/lib/video-embed";

// Story 19.13 (Epic 19, Ruolo Site Manager): due estensioni Tiptap che
// riusano l'implementazione ufficiale (comandi, scorciatoie da tastiera,
// NodeView di ridimensionamento) ma sovrascrivono SOLO il rendering
// dell'attributo HTML - `data-align` invece di `style="text-align:..."` /
// invece di nessun attributo dedicato - per restare coerenti con la
// decisione (Boundaries della spec, Story 19.9/19.13) di non introdurre mai
// uno `style` libero: `lib/sanitizza-html.ts` valida `data-align` come
// stringa a insieme chiuso, non potrebbe validare una proprieta' CSS libera.

// Allineamento testo (paragrafi H2/H3 e paragrafi normali). I comandi
// setTextAlign/toggleTextAlign/unsetTextAlign e le scorciatoie da tastiera
// restano quelli ufficiali di @tiptap/extension-text-align - solo
// addGlobalAttributes e' sovrascritto.
export const AllineamentoTesto = TiptapTextAlign.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: this.options.defaultAlignment,
            parseHTML: (element) => {
              const allineamento = element.getAttribute("data-align");
              return allineamento && this.options.alignments.includes(allineamento)
                ? allineamento
                : this.options.defaultAlignment;
            },
            renderHTML: (attributes) => {
              if (!attributes.textAlign) {
                return {};
              }
              return { "data-align": attributes.textAlign };
            },
          },
        },
      },
    ];
  },
});

// Allineamento + ridimensionamento immagini. Il ridimensionamento e' la
// NodeView nativa di @tiptap/extension-image (opzione `resize`, gia'
// disponibile in v3.30.2, gia' installata) - nessuna UI di toolbar
// aggiuntiva, solo abilitazione. `width`/`height` restano gli attributi HTML
// semplici gia' presenti di default nell'estensione (nessun override qui),
// validati come stringhe di sole cifre da lib/sanitizza-html.ts.
export const ImmagineAllineabile = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        parseHTML: (element) => {
          const allineamento = element.getAttribute("data-align");
          return allineamento &&
            (ALLINEAMENTI_IMMAGINE_CONSENTITI as readonly string[]).includes(allineamento)
            ? allineamento
            : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.align) {
            return {};
          }
          return { "data-align": attributes.align };
        },
      },
    };
  },
}).configure({
  resize: {
    enabled: true,
    alwaysPreserveAspectRatio: true,
    minWidth: 40,
    minHeight: 40,
  },
});

// Story 19.14 (Epic 19, Ruolo Site Manager): editor a blocchi. Tre nuovi Node
// Tiptap (Video, Colonne, Pulsante) piu' le funzioni pure di riordino - tutti
// serializzati nello stesso `contenutoHtml` sanitizzato esistente (nessuna
// migrazione di storage, Boundaries "Always" della spec). Ogni Node produce
// solo markup entro l'allowlist estesa di lib/sanitizza-html.ts: mai uno
// `style` libero, mai un tag/attributo fuori da quell'insieme chiuso.

// Blocco Video: l'Utente inserisce solo un URL "umano" (gestito in
// PaginaPubblicaEditor.tsx tramite validaUrlVideoAction, che chiama
// lib/video-embed.ts SEMPRE lato server) - il Node stesso non accetta mai un
// `src` diretto, solo platform/videoId gia' validati. renderHTML ricostruisce
// l'src ogni volta da questi due attributi (mai dal src persistito, che non
// viene nemmeno letto in parseHTML) - stesso principio "mai fidarsi
// dell'ultimo passaggio" gia' in uso per la sanitizzazione (Story 19.9).
export const BloccoVideo = Node.create({
  name: "bloccoVideo",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      platform: {
        default: null,
        parseHTML: (element) => {
          const valore = element.getAttribute("data-platform");
          return valore === "youtube" || valore === "vimeo" ? valore : null;
        },
        renderHTML: (attributes) =>
          attributes.platform ? { "data-platform": attributes.platform } : {},
      },
      videoId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-video-id"),
        renderHTML: (attributes) =>
          attributes.videoId ? { "data-video-id": attributes.videoId } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'iframe[data-blocco="video"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const platform = node.attrs.platform as PiattaformaVideo | null;
    const videoId = node.attrs.videoId as string | null;
    const src = platform && videoId ? costruisciSrcVideo(platform, videoId) : "";

    return [
      "iframe",
      mergeAttributes(HTMLAttributes, {
        "data-blocco": "video",
        src,
        title: "Video incorporato",
        allow:
          "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        allowfullscreen: "true",
        // "Mai un <iframe src> con URL letto direttamente dall'utente" -
        // sandbox forzato qui E ri-forzato da lib/sanitizza-html.ts al
        // salvataggio/render (difesa in profondita', mai fidarsi del solo
        // passaggio client).
        sandbox: "allow-scripts allow-same-origin allow-presentation",
        loading: "lazy",
      }),
    ];
  },
});

// Blocco Pulsante: riusa il tag <a> gia' allowlistato (nessun nuovo tag da
// aggiungere al sanitizzatore solo per questo blocco) con un attributo
// data-blocco="pulsante" che lo distingue da un link inline normale
// (Link extension) - stilizzato in pagina-pubblica.module.css come
// .buttonPrimary di DESIGN.md. href validato da urlVoceMenuValido()
// (lib/validazione-url.ts) lato Server Action al salvataggio - nessuna
// validazione nuova qui, il Node si limita a leggere/scrivere l'attributo.
export const BloccoPulsante = Node.create({
  name: "bloccoPulsante",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("href"),
        renderHTML: (attributes) => (attributes.href ? { href: attributes.href } : {}),
      },
      testo: {
        default: "",
        parseHTML: (element) => element.textContent?.trim() ?? "",
        // Il testo diventa il contenuto testuale del tag in renderHTML (terzo
        // elemento dell'array sotto), non un attributo HTML - nessun
        // rendering qui.
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-blocco="pulsante"]',
        // Priorita' esplicita piu' alta della regola di default del Link
        // mark (anche lui su <a>) - un <a data-blocco="pulsante"> deve
        // sempre essere interpretato come questo Node, mai come un link
        // testuale inline.
        priority: 100,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const testo = typeof node.attrs.testo === "string" && node.attrs.testo.trim()
      ? node.attrs.testo.trim()
      : "Scopri di più";

    return ["a", mergeAttributes(HTMLAttributes, { "data-blocco": "pulsante" }), testo];
  },
});

// Blocco Colonne: contenitore a 2 colonne FISSE (mai un numero arbitrario,
// decisione esplicita in party mode) - nessun tag nuovo per il testo/immagine
// al suo interno (restano gli stessi Node "paragraph"/"heading"/"image" gia'
// esistenti), un solo nuovo tag minimale (<div>, gia' preventivato nel Code
// Map) con un data-blocco che distingue contenitore esterno ("colonne") da
// singola colonna ("colonna"). Contenuto ristretto per schema - mai
// video/pulsante/altre colonne annidate, imposto dalla content expression
// stessa (non da una validazione a runtime).
export const BloccoColonna = Node.create({
  name: "bloccoColonna",
  content: "(paragraph|heading|image)+",
  isolating: true,
  selectable: false,

  parseHTML() {
    return [{ tag: 'div[data-blocco="colonna"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-blocco": "colonna" }), 0];
  },
});

export const BloccoColonne = Node.create({
  name: "bloccoColonne",
  group: "block",
  content: "bloccoColonna bloccoColonna",
  isolating: true,
  draggable: false,

  parseHTML() {
    return [{ tag: 'div[data-blocco="colonne"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-blocco": "colonne" }), 0];
  },
});

// Markup HTML minimale per inserire un nuovo blocco Colonne vuoto dal menu
// "+" (PaginaPubblicaEditor.tsx) - passato a editor.chain().insertContent(),
// che lo fa analizzare dal DOMParser di ProseMirror usando le stesse regole
// parseHTML sopra (nessuna costruzione manuale dell'albero dei nodi).
export const HTML_BLOCCO_COLONNE_VUOTO =
  '<div data-blocco="colonne"><div data-blocco="colonna"><p></p></div><div data-blocco="colonna"><p></p></div></div>';

// Riordino blocchi (drag-and-drop + tastiera, spec-19-14 Boundaries
// "Always"): entrambi i percorsi di input devono richiamare la stessa
// funzione pura di riordino, mai due implementazioni divergenti. Operano
// esclusivamente sui blocchi di PRIMO LIVELLO (figli diretti di `doc`) -
// scambiano la posizione del blocco con quella del vicino immediato
// (su/giu), mai un riordino arbitrario a distanza. Pure: nessuna dipendenza
// da editor/view, solo Node/Fragment di ProseMirror - testabili costruendo
// un doc con un qualunque schema che abbia >=2 blocchi di primo livello.
export type SpostamentoBlocco = { doc: PMNode; pos: number } | null;

function indiceBloccoDiPrimoLivello(doc: PMNode, pos: number): number | null {
  const risolto = doc.resolve(pos);
  if (risolto.depth !== 0) return null;
  const indice = risolto.index(0);
  return indice >= 0 && indice < doc.childCount ? indice : null;
}

function scambiaBlocchiDiPrimoLivello(
  doc: PMNode,
  pos: number,
  direzione: -1 | 1
): SpostamentoBlocco {
  const indice = indiceBloccoDiPrimoLivello(doc, pos);
  if (indice === null) return null;

  const indiceVicino = indice + direzione;
  // Gia' al margine (primo blocco con "su", ultimo con "giu"): nessuna
  // operazione, non un errore - stesso principio gia' in uso per
  // spostaVoceMenuPubblicoAction (menu-pubblico/actions.ts, Story 19.7).
  if (indiceVicino < 0 || indiceVicino >= doc.childCount) return null;

  const figli: PMNode[] = [];
  for (let i = 0; i < doc.childCount; i += 1) {
    figli.push(doc.child(i));
  }
  [figli[indice], figli[indiceVicino]] = [figli[indiceVicino], figli[indice]];

  const nuovoDoc = doc.copy(Fragment.fromArray(figli));

  let nuovaPos = 0;
  for (let i = 0; i < indiceVicino; i += 1) {
    nuovaPos += figli[i].nodeSize;
  }

  return { doc: nuovoDoc, pos: nuovaPos };
}

export function spostaBloccoSu(doc: PMNode, pos: number): SpostamentoBlocco {
  return scambiaBlocchiDiPrimoLivello(doc, pos, -1);
}

export function spostaBloccoGiu(doc: PMNode, pos: number): SpostamentoBlocco {
  return scambiaBlocchiDiPrimoLivello(doc, pos, 1);
}

// Trova la posizione (prima del blocco) del blocco di primo livello che
// contiene la selezione attuale - funziona sia con un cursore di testo
// annidato a qualunque profondita' (es. dentro una Colonna) sia con una
// NodeSelection su un blocco atomico di primo livello (Video/Pulsante),
// dove $from.depth e' gia' 0.
function posBloccoSelezionato($from: ResolvedPos): number {
  return $from.depth === 0 ? $from.pos : $from.before(1);
}

// Story 19.14 (Epic 19, Ruolo Site Manager): scorciatoia da tastiera
// equivalente al drag-handle (Alt+Shift+↑/↓, scelta in party mode per evitare
// collisioni con scorciatoie native del browser/OS e con quelle gia' usate
// da Tiptap/StarterKit) - nessun Utente resta escluso per non avere
// mouse/touch (AC #1). Richiama le stesse spostaBloccoSu/spostaBloccoGiu
// sopra.
export const RiordinoBlocchiDaTastiera = Extension.create({
  name: "riordinoBlocchiDaTastiera",

  addKeyboardShortcuts() {
    const esegui = (direzione: -1 | 1) => () => {
      const { state, view } = this.editor;
      const { doc, selection } = state;
      const posBlocco = posBloccoSelezionato(selection.$from);
      const risultato = scambiaBlocchiDiPrimoLivello(doc, posBlocco, direzione);
      // Gia' al margine: consuma comunque la scorciatoia (true), non deve
      // propagare al browser (es. Alt+Shift+Freccia ha significati nativi in
      // alcuni sistemi operativi/estensioni).
      if (!risultato) return true;

      const tr = state.tr.replaceWith(0, doc.content.size, risultato.doc.content);
      tr.setSelection(Selection.near(tr.doc.resolve(risultato.pos)));
      view.dispatch(tr);
      return true;
    };

    return {
      "Alt-Shift-ArrowUp": esegui(-1),
      "Alt-Shift-ArrowDown": esegui(1),
    };
  },
});
