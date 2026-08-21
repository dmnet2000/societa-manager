import TiptapTextAlign from "@tiptap/extension-text-align";
import TiptapImage from "@tiptap/extension-image";
import { ALLINEAMENTI_IMMAGINE_CONSENTITI } from "@/lib/allineamenti";

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
