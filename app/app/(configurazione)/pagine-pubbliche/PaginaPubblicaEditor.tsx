"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import {
  creaPaginaPubblicaAction,
  aggiornaPaginaPubblicaAction,
  caricaImmaginePaginaAction,
  type PaginaPubblicaActionState,
} from "./actions";
import styles from "./pagine-pubbliche.module.css";

type PaginaPubblicaEsistente = {
  id: string;
  titolo: string;
  slug: string;
  contenutoHtml: string;
};

type PaginaPubblicaEditorProps =
  | { modalita: "crea" }
  | { modalita: "modifica"; pagina: PaginaPubblicaEsistente };

const CONTENUTO_VUOTO = "<p></p>";

// Story 19.10 (Epic 19, Ruolo Site Manager): editor rich-text Tiptap
// (tiptap.dev, MIT, gratuito/self-hosted - coerente con NFR6, decisione
// party mode 2026-08-19). Toolbar minimale coerente con lib/sanitizza-html.ts
// (Story 19.9, frozen): titoli H2/H3, grassetto/corsivo, elenchi
// puntati/numerati, link, immagini - niente tabelle/embed/colonne. StarterKit
// disabilita esplicitamente ogni nodo/mark che produrrebbe un tag FUORI
// dall'allowlist del sanitizzatore (blockquote/codeBlock/code/strike/
// underline/horizontalRule, H1/H4-H6) - senza questo, un input rule di
// Tiptap (es. "> " per una blockquote) produrrebbe comunque quel markup, che
// sanitizzaHtml() rimuoverebbe silenziosamente al salvataggio: meglio non
// poterlo produrre affatto che vederlo sparire senza preavviso.
export function PaginaPubblicaEditor(props: PaginaPubblicaEditorProps) {
  const { modalita } = props;
  const paginaEsistente = modalita === "modifica" ? props.pagina : null;

  const azione = modalita === "crea" ? creaPaginaPubblicaAction : aggiornaPaginaPubblicaAction;
  const [state, formAction, pending] = useActionState<PaginaPubblicaActionState, FormData>(
    azione,
    undefined
  );
  const router = useRouter();

  const contenutoHiddenRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caricamentoImmagine, setCaricamentoImmagine] = useState(false);
  const [erroreImmagine, setErroreImmagine] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false, // registrato sotto come extension separata (mirror del Code Map)
        blockquote: false,
        codeBlock: false,
        code: false,
        strike: false,
        underline: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      TiptapImage,
    ],
    content: paginaEsistente?.contenutoHtml ?? CONTENUTO_VUOTO,
    onUpdate: ({ editor }) => {
      if (contenutoHiddenRef.current) {
        contenutoHiddenRef.current.value = editor.getHTML();
      }
    },
  });

  // Story 18.x (pattern gia' in uso, es. NuovaVoceMenuPubblicoForm): niente
  // reset qui - a differenza di un form inline su una pagina che resta
  // aperta, questa e' una pagina intera dedicata. In creazione, un successo
  // riporta all'elenco (la nuova Pagina compare li'); in modifica, l'Utente
  // resta sulla stessa pagina con il messaggio di conferma (mirror di
  // VoceMenuPubblicoRow, che non naviga via dopo un salvataggio riuscito).
  useEffect(() => {
    if (state && "success" in state && modalita === "crea") {
      router.push("/app/pagine-pubbliche");
    }
  }, [state, modalita, router]);

  function handleLinkClick() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    // Code review (Edge Case Hunter): senza il trim, uno spazio bianco
    // digitato per errore superava il solo controllo "!url" (una stringa di
    // soli spazi e' truthy) e finiva salvato come href di un link vuoto.
    const url = window.prompt("URL del link (es. /squadre oppure https://...):")?.trim();
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset subito: permette di selezionare di nuovo lo stesso file (altrimenti
    // onChange non si ripete se il valore dell'input non cambia).
    e.target.value = "";
    if (!file || !editor) return;

    setErroreImmagine(null);
    setCaricamentoImmagine(true);

    const formData = new FormData();
    formData.append("file", file);

    caricaImmaginePaginaAction(formData)
      .then((risultato) => {
        if ("error" in risultato) {
          setErroreImmagine(risultato.error.message);
          return;
        }
        editor.chain().focus().setImage({ src: risultato.url }).run();
      })
      .catch(() => {
        setErroreImmagine("Impossibile caricare l'immagine. Riprova.");
      })
      .finally(() => {
        setCaricamentoImmagine(false);
      });
  }

  return (
    <form action={formAction} className={styles.formEditor}>
      {modalita === "modifica" && <input type="hidden" name="id" value={props.pagina.id} />}

      <div className={styles.campo}>
        <label htmlFor="pagina-titolo">Titolo</label>
        <input
          id="pagina-titolo"
          name="titolo"
          type="text"
          maxLength={100}
          defaultValue={paginaEsistente?.titolo ?? ""}
          required
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor="pagina-slug">URL</label>
        {/* type="text": lo slug e' sempre una rotta interna del sito
            (es. "/chi-siamo"), type="url" del browser lo rifiuterebbe come
            non assoluto - stesso motivo gia' documentato per il campo "url"
            di NuovaVoceMenuPubblicoForm.tsx. */}
        <input
          id="pagina-slug"
          name="slug"
          type="text"
          maxLength={200}
          placeholder="es. /chi-siamo"
          defaultValue={paginaEsistente?.slug ?? ""}
          required
        />
      </div>

      <div className={styles.campo}>
        <span className={styles.labelEditor}>Contenuto</span>

        {editor ? (
          <>
            <div className={styles.toolbar}>
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive("heading", { level: 2 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                H2
              </button>
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive("heading", { level: 3 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              >
                H3
              </button>
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive("bold")}
                aria-label="Grassetto"
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <strong>G</strong>
              </button>
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive("italic")}
                aria-label="Corsivo"
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <em>C</em>
              </button>
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive("bulletList")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                Elenco •
              </button>
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive("orderedList")}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                Elenco 1.
              </button>
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive("link")}
                onClick={handleLinkClick}
              >
                Link
              </button>
              <button
                type="button"
                className={styles.bottoneToolbar}
                disabled={caricamentoImmagine}
                onClick={() => fileInputRef.current?.click()}
              >
                {caricamentoImmagine ? "Caricamento…" : "Immagine"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                hidden
                onChange={handleFileChange}
              />
            </div>

            <div className={styles.corpoEditor}>
              <EditorContent editor={editor} />
            </div>
          </>
        ) : (
          <p className={styles.messaggioVuoto}>Caricamento dell&apos;editor…</p>
        )}

        <input
          ref={contenutoHiddenRef}
          type="hidden"
          name="contenutoHtml"
          defaultValue={paginaEsistente?.contenutoHtml ?? CONTENUTO_VUOTO}
        />
      </div>

      {erroreImmagine && (
        <p role="alert" className={styles.errore}>
          {erroreImmagine}
        </p>
      )}
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && modalita === "modifica" && (
        <p role="status" className={styles.successo}>
          Pagina aggiornata.
        </p>
      )}

      <button disabled={pending || !editor} type="submit" className={styles.bottone}>
        {modalita === "crea" ? "Crea pagina" : "Salva modifiche"}
      </button>
    </form>
  );
}
