// @vitest-environment jsdom
//
// Review fix (Verification Gap, Story 19.14): i test di questo file coprivano
// SOLO le funzioni pure spostaBloccoSu/spostaBloccoGiu chiamate direttamente,
// mai il percorso reale (il comando registrato in addKeyboardShortcuts per
// Alt-Shift-ArrowUp/ArrowDown, che risolve la posizione via
// posBloccoSelezionato, costruisce una transazione e chiama view.dispatch) -
// una regressione confinata a quella closure (es. direzione invertita tra i
// due binding) non sarebbe stata presa da nessun test esistente. Il gruppo
// "comando da tastiera reale" sotto monta un Editor Tiptap vero (jsdom, gia'
// presente in node_modules come dipendenza transitiva - mai usato nel
// bundle di produzione, solo in questo test) e simula un vero evento DOM
// "keydown" con i modificatori Alt+Shift, esattamente come farebbe un
// browser: nessuna chiamata diretta a spostaBloccoSu/spostaBloccoGiu.
import { describe, expect, it } from "vitest";
import { Editor, getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  AllineamentoTesto,
  BloccoColonna,
  BloccoColonne,
  BloccoPulsante,
  BloccoVideo,
  ImmagineAllineabile,
  RiordinoBlocchiDaTastiera,
  spostaBloccoGiu,
  spostaBloccoSu,
} from "./tiptap-estensioni";

// Story 19.14 (Epic 19, Ruolo Site Manager): "il vero cancello" del riordino
// (Suggested Review Order della spec) - spostaBloccoSu/spostaBloccoGiu sono
// funzioni pure di ProseMirror (nessuna dipendenza da editor/view), testabili
// costruendo un piccolo schema/doc senza montare un editor reale. Sia il
// drag-handle sia la scorciatoia da tastiera (Alt+Shift+↑/↓) richiamano
// queste stesse due funzioni - nessuna implementazione divergente.
const schema = getSchema([StarterKit, BloccoPulsante, BloccoVideo]);

function paragrafo(testo: string): PMNode {
  return schema.node("paragraph", null, schema.text(testo));
}

function creaDoc(...figli: PMNode[]): PMNode {
  return schema.node("doc", null, figli);
}

function testiDeiBlocchi(doc: PMNode): string[] {
  const testi: string[] = [];
  doc.forEach((nodo) => testi.push(nodo.textContent));
  return testi;
}

describe("spostaBloccoSu", () => {
  it("scambia un blocco di primo livello con il precedente", () => {
    const doc = creaDoc(paragrafo("A"), paragrafo("B"), paragrafo("C"));
    const posB = doc.child(0).nodeSize; // inizio del secondo blocco (B)

    const risultato = spostaBloccoSu(doc, posB);

    expect(risultato).not.toBeNull();
    expect(testiDeiBlocchi(risultato!.doc)).toEqual(["B", "A", "C"]);
  });

  it("restituisce null (nessuna operazione) quando il blocco e' gia' il primo", () => {
    const doc = creaDoc(paragrafo("A"), paragrafo("B"));

    expect(spostaBloccoSu(doc, 0)).toBeNull();
  });

  it("restituisce null quando la posizione non e' l'inizio esatto di un blocco di primo livello", () => {
    const doc = creaDoc(paragrafo("AB"), paragrafo("C"));
    // pos 1 e' dentro il testo del primo paragrafo, non l'inizio di un blocco.
    expect(spostaBloccoSu(doc, 1)).toBeNull();
  });
});

describe("spostaBloccoGiu", () => {
  it("scambia un blocco di primo livello con il successivo", () => {
    const doc = creaDoc(paragrafo("A"), paragrafo("B"), paragrafo("C"));

    const risultato = spostaBloccoGiu(doc, 0);

    expect(risultato).not.toBeNull();
    expect(testiDeiBlocchi(risultato!.doc)).toEqual(["B", "A", "C"]);
  });

  it("restituisce null (nessuna operazione) quando il blocco e' gia' l'ultimo", () => {
    const doc = creaDoc(paragrafo("A"), paragrafo("B"));
    const posB = doc.child(0).nodeSize;

    expect(spostaBloccoGiu(doc, posB)).toBeNull();
  });

  it("funziona anche su un blocco atomico di primo livello (es. BloccoVideo)", () => {
    const video = schema.node("bloccoVideo", { platform: "youtube", videoId: "dQw4w9WgXcQ" });
    const doc = creaDoc(paragrafo("A"), video);

    const risultato = spostaBloccoGiu(doc, 0);

    expect(risultato).not.toBeNull();
    expect(risultato!.doc.childCount).toBe(2);
    expect(risultato!.doc.child(0).type.name).toBe("bloccoVideo");
    expect(risultato!.doc.child(1).type.name).toBe("paragraph");
  });
});

// Review fix (Verification Gap, Story 19.14): stesso scambio gia' testato
// sopra per spostaBloccoSu/spostaBloccoGiu, ma passando dal VERO punto
// d'ingresso - un Editor Tiptap reale, montato con lo schema del progetto, e
// un vero evento DOM "keydown" con Alt+Shift, non una chiamata diretta alla
// funzione privata.
describe("RiordinoBlocchiDaTastiera (comando da tastiera reale, Alt-Shift-Arrow)", () => {
  function creaEditor(html: string): Editor {
    return new Editor({
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
        RiordinoBlocchiDaTastiera,
      ],
      content: html,
    });
  }

  function premiScorciatoia(editor: Editor, tasto: "ArrowUp" | "ArrowDown") {
    const evento = new KeyboardEvent("keydown", {
      key: tasto,
      code: tasto,
      altKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    editor.view.dom.dispatchEvent(evento);
  }

  it('Alt-Shift-ArrowDown scambia il blocco selezionato con il successivo, attraverso il comando registrato', () => {
    const editor = creaEditor("<p>A</p><p>B</p><p>C</p>");
    // Cursore dentro il primo blocco (A) - stessa posizione (0) gia' usata
    // dal test equivalente su spostaBloccoGiu sopra.
    editor.commands.setTextSelection(1);

    premiScorciatoia(editor, "ArrowDown");

    expect(testiDeiBlocchi(editor.state.doc)).toEqual(["B", "A", "C"]);
    editor.destroy();
  });

  it('Alt-Shift-ArrowUp scambia il blocco selezionato con il precedente, attraverso il comando registrato', () => {
    const editor = creaEditor("<p>A</p><p>B</p><p>C</p>");
    // Cursore dentro il secondo blocco (B) - stessa posizione (inizio di B)
    // gia' usata dal test equivalente su spostaBloccoSu sopra.
    editor.commands.setTextSelection(4);

    premiScorciatoia(editor, "ArrowUp");

    expect(testiDeiBlocchi(editor.state.doc)).toEqual(["B", "A", "C"]);
    editor.destroy();
  });

  it("Alt-Shift-ArrowUp non fa nulla (ma consuma l'evento) quando il blocco selezionato e' gia' il primo", () => {
    const editor = creaEditor("<p>A</p><p>B</p>");
    editor.commands.setTextSelection(1);

    premiScorciatoia(editor, "ArrowUp");

    expect(testiDeiBlocchi(editor.state.doc)).toEqual(["A", "B"]);
    editor.destroy();
  });
});

// Regressione: le stesse estensioni configurate in PaginaPubblicaEditor.tsx
// devono comporre uno schema ProseMirror valido tutte insieme - un content
// expression malformato o un conflitto tra Node/Mark sullo stesso tag (es.
// BloccoPulsante su <a> vs il Link mark) farebbe fallire getSchema() qui,
// molto prima di scoprirlo aprendo davvero l'editor nel browser.
describe("schema completo dell'editor (tutte le estensioni insieme)", () => {
  it("costruisce uno schema valido senza errori", () => {
    expect(() =>
      getSchema([
        StarterKit.configure({
          heading: { levels: [2, 3] },
          link: false,
          blockquote: false,
          codeBlock: false,
          code: false,
          strike: false,
          underline: false,
          horizontalRule: false,
        }),
        TiptapLink,
        ImmagineAllineabile,
        AllineamentoTesto.configure({ types: ["paragraph", "heading"] }),
        BloccoVideo,
        BloccoPulsante,
        BloccoColonna,
        BloccoColonne,
        RiordinoBlocchiDaTastiera,
      ])
    ).not.toThrow();
  });

  it("una Colonna accetta paragrafi/titoli/immagini ma non un blocco Video/Pulsante/Colonne annidato", () => {
    const schemaCompleto = getSchema([
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      ImmagineAllineabile,
      BloccoVideo,
      BloccoPulsante,
      BloccoColonna,
      BloccoColonne,
    ]);

    const colonna = schemaCompleto.nodes.bloccoColonna;
    expect(colonna.contentMatch.matchType(schemaCompleto.nodes.paragraph)).toBeTruthy();
    expect(colonna.contentMatch.matchType(schemaCompleto.nodes.image)).toBeTruthy();
    expect(colonna.contentMatch.matchType(schemaCompleto.nodes.bloccoVideo)).toBeFalsy();
    expect(colonna.contentMatch.matchType(schemaCompleto.nodes.bloccoPulsante)).toBeFalsy();
    expect(colonna.contentMatch.matchType(schemaCompleto.nodes.bloccoColonne)).toBeFalsy();
  });
});
