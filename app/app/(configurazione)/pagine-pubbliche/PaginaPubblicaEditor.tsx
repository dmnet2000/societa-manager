"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import {
  creaPaginaPubblicaAction,
  aggiornaPaginaPubblicaAction,
  caricaImmaginePaginaAction,
  validaUrlVideoAction,
  type PaginaPubblicaActionState,
} from "./actions";
import {
  AllineamentoTesto,
  ImmagineAllineabile,
  BloccoVideo,
  BloccoPulsante,
  BloccoColonna,
  BloccoColonne,
  HTML_BLOCCO_COLONNE_VUOTO,
  RiordinoBlocchiDaTastiera,
} from "./tiptap-estensioni";
import { urlVoceMenuValido } from "@/lib/validazione-url";
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

  // Story 19.14 (Epic 19, Ruolo Site Manager): editor a blocchi - menu "+" di
  // inserimento blocco (Video/Pulsante/Colonne, oltre a Testo/Immagine gia'
  // esistenti). Pattern riusato tal quale da app/NavBarClient.tsx:351-390
  // (ref + onBlur + click-outside via mousedown), nessuna libreria dropdown
  // esterna (Boundaries "Never" della spec).
  const [menuBlocchiAperto, setMenuBlocchiAperto] = useState(false);
  const menuBlocchiRef = useRef<HTMLDivElement>(null);
  const [caricamentoVideo, setCaricamentoVideo] = useState(false);
  const [erroreBlocco, setErroreBlocco] = useState<string | null>(null);

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
      ImmagineAllineabile,
      AllineamentoTesto.configure({ types: ["paragraph", "heading"] }),
      // Story 19.14: i 3 nuovi tipi di blocco (Video/Pulsante/Colonne) + la
      // scorciatoia da tastiera di riordino (Alt+Shift+↑/↓) - il drag-handle
      // vero e proprio e' un componente React (<DragHandle>, sotto), non
      // un'estensione dell'editor.
      BloccoVideo,
      BloccoPulsante,
      BloccoColonna,
      BloccoColonne,
      RiordinoBlocchiDaTastiera,
    ],
    content: paginaEsistente?.contenutoHtml ?? CONTENUTO_VUOTO,
    onUpdate: ({ editor }) => {
      if (contenutoHiddenRef.current) {
        contenutoHiddenRef.current.value = editor.getHTML();
      }
    },
  });

  // Click-outside per il menu "+" - mirror esatto di NavBarClient.tsx
  // (mousedown su document, chiude solo se il click e' fuori dal pannello).
  useEffect(() => {
    if (!menuBlocchiAperto) return;
    function onPointerDown(e: MouseEvent) {
      if (menuBlocchiRef.current && !menuBlocchiRef.current.contains(e.target as Node)) {
        setMenuBlocchiAperto(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuBlocchiAperto]);

  function handleInserisciTesto() {
    setMenuBlocchiAperto(false);
    if (!editor) return;
    editor.chain().focus("end").insertContent("<p></p>").run();
  }

  function handleInserisciImmagineDalMenu() {
    setMenuBlocchiAperto(false);
    if (!editor) return;
    editor.chain().focus("end").run();
    fileInputRef.current?.click();
  }

  // Story 19.14 (Boundaries "Always"): il blocco Video passa sempre da
  // validaUrlVideoAction (Server Action, pagine-pubbliche/actions.ts) che
  // esegue estraiIdVideo() lato server - mai un parsing lato client di cui
  // fidarsi. L'id/piattaforma restituiti sono gia' stati validati contro
  // l'insieme chiuso di pattern riconosciuti, il Node si limita a
  // memorizzarli.
  function handleInserisciVideo() {
    setMenuBlocchiAperto(false);
    if (!editor) return;
    const url = window.prompt("URL del video (YouTube o Vimeo):")?.trim();
    if (!url) return;

    setErroreBlocco(null);
    setCaricamentoVideo(true);
    validaUrlVideoAction(url)
      .then((risultato) => {
        if ("error" in risultato) {
          setErroreBlocco(risultato.error.message);
          return;
        }
        editor
          .chain()
          .focus("end")
          .insertContent({
            type: "bloccoVideo",
            attrs: { platform: risultato.piattaforma, videoId: risultato.videoId },
          })
          .run();
      })
      .catch(() => {
        setErroreBlocco("Impossibile validare l'URL del video. Riprova.");
      })
      .finally(() => {
        setCaricamentoVideo(false);
      });
  }

  // Il blocco Pulsante riusa urlVoceMenuValido() tal quale (nessuna
  // validazione URL nuova, Boundaries "Always" della spec) - importata
  // direttamente qui perche' e' una funzione pura senza direttiva "use
  // server" (lib/validazione-url.ts), a differenza del blocco Video che deve
  // passare da un vero Server Action (estraiIdVideo non deve mai girare nel
  // bundle client). Il Server Action di salvataggio ri-valida comunque
  // l'href al momento di salvare l'intera Pagina (difesa in profondita').
  function handleInserisciPulsante() {
    setMenuBlocchiAperto(false);
    if (!editor) return;
    const href = window.prompt("Link del pulsante (es. /squadre oppure https://...):")?.trim();
    if (!href) return;
    if (!urlVoceMenuValido(href)) {
      setErroreBlocco(
        'URL non valido (deve iniziare con "/" per una pagina del sito, oppure con http:// o https:// per un link esterno).'
      );
      return;
    }
    // Review fix (Edge Case Hunter, Story 19.14): window.prompt() restituisce
    // null quando l'Utente preme Annulla - va distinto esplicitamente da una
    // conferma con campo vuoto (che usa "Scopri di più" come default). Prima
    // di questo fix, `?.trim() || "Scopri di più"` trattava i due casi allo
    // stesso modo: un Annulla sul SECONDO prompt (dopo aver gia' confermato
    // l'href sul primo) inseriva comunque il blocco invece di abortire
    // l'intero inserimento.
    const testoPrompt = window.prompt("Testo del pulsante:");
    if (testoPrompt === null) return;
    const testo = testoPrompt.trim() || "Scopri di più";
    setErroreBlocco(null);
    editor.chain().focus("end").insertContent({ type: "bloccoPulsante", attrs: { href, testo } }).run();
  }

  // Blocco Colonne: 2 colonne fisse, markup inserito come stringa HTML e
  // analizzato dalle stesse regole parseHTML del Node (nessuna costruzione
  // manuale dell'albero ProseMirror) - vedi HTML_BLOCCO_COLONNE_VUOTO in
  // tiptap-estensioni.ts.
  function handleInserisciColonne() {
    setMenuBlocchiAperto(false);
    if (!editor) return;
    editor.chain().focus("end").insertContent(HTML_BLOCCO_COLONNE_VUOTO).run();
  }

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
              {/* Story 19.13: allineamento testo (paragrafi/H2/H3) -
                  toggleTextAlign gestisce anche la rimozione al secondo
                  click sullo stesso pulsante attivo (comando ufficiale di
                  @tiptap/extension-text-align, riusato via AllineamentoTesto). */}
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive({ textAlign: "left" })}
                aria-label="Allinea testo a sinistra"
                onClick={() => editor.chain().focus().toggleTextAlign("left").run()}
              >
                Sinistra
              </button>
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive({ textAlign: "center" })}
                aria-label="Centra testo"
                onClick={() => editor.chain().focus().toggleTextAlign("center").run()}
              >
                Centro
              </button>
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive({ textAlign: "right" })}
                aria-label="Allinea testo a destra"
                onClick={() => editor.chain().focus().toggleTextAlign("right").run()}
              >
                Destra
              </button>
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive({ textAlign: "justify" })}
                aria-label="Giustifica testo"
                onClick={() => editor.chain().focus().toggleTextAlign("justify").run()}
              >
                Giustifica
              </button>
              {/* Story 19.13: allineamento immagine - solo attivo con
                  un'immagine selezionata (updateAttributes imposta, non
                  toggle: coerente con il Code Map della spec). */}
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive("image", { align: "left" })}
                aria-label="Allinea immagine a sinistra"
                disabled={!editor.isActive("image")}
                onClick={() => editor.chain().focus().updateAttributes("image", { align: "left" }).run()}
              >
                Imm. sinistra
              </button>
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive("image", { align: "center" })}
                aria-label="Centra immagine"
                disabled={!editor.isActive("image")}
                onClick={() => editor.chain().focus().updateAttributes("image", { align: "center" }).run()}
              >
                Imm. centro
              </button>
              <button
                type="button"
                className={styles.bottoneToolbar}
                aria-pressed={editor.isActive("image", { align: "right" })}
                aria-label="Allinea immagine a destra"
                disabled={!editor.isActive("image")}
                onClick={() => editor.chain().focus().updateAttributes("image", { align: "right" }).run()}
              >
                Imm. destra
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
              {/* Story 19.14: maniglia di trascinamento per il riordino dei
                  blocchi di primo livello (nested=false di default -
                  esattamente l'ambito richiesto dall'AC #1). Componente
                  React ufficiale (@tiptap/extension-drag-handle-react) - il
                  riordino da tastiera equivalente (Alt+Shift+↑/↓) e'
                  registrato invece come estensione dell'editor
                  (RiordinoBlocchiDaTastiera, sopra). */}
              <DragHandle editor={editor} className={styles.dragHandle}>
                {/* Review fix (Blind Hunter, Story 19.14): il componente
                    <DragHandle> non espone un prop title/aria-label diretto
                    (l'elemento interattivo vero e' renderizzato dalla
                    libreria in un portal) - title sul figlio mostra comunque
                    il tooltip nativo al passaggio del mouse sopra la
                    maniglia, indipendentemente da aria-hidden. */}
                <span title="Trascina per riordinare, oppure seleziona il blocco e usa Alt+Maiusc+Freccia su/giù" aria-label="Trascina per riordinare, oppure seleziona il blocco e usa Alt+Maiusc+Freccia su/giù">
                  ⠿
                </span>
              </DragHandle>
              <EditorContent editor={editor} />
            </div>

            {/* Story 19.14: menu "+" di inserimento blocco - pattern inline
                riusato da app/NavBarClient.tsx:351-390 (ref + onBlur +
                click-outside), nessuna libreria dropdown esterna. */}
            <div
              className={styles.menuBlocchiWrapper}
              ref={menuBlocchiRef}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setMenuBlocchiAperto(false);
                }
              }}
            >
              <button
                type="button"
                className={styles.bottoneAggiungiBlocco}
                aria-haspopup="menu"
                aria-expanded={menuBlocchiAperto}
                onClick={() => setMenuBlocchiAperto((v) => !v)}
              >
                + Aggiungi blocco
              </button>
              {menuBlocchiAperto && (
                <div className={styles.menuBlocchi} role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.voceMenuBlocchi}
                    onClick={handleInserisciTesto}
                  >
                    Testo
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.voceMenuBlocchi}
                    onClick={handleInserisciImmagineDalMenu}
                  >
                    Immagine
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.voceMenuBlocchi}
                    disabled={caricamentoVideo}
                    onClick={handleInserisciVideo}
                  >
                    {caricamentoVideo ? "Verifica in corso…" : "Video"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.voceMenuBlocchi}
                    onClick={handleInserisciPulsante}
                  >
                    Pulsante
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.voceMenuBlocchi}
                    onClick={handleInserisciColonne}
                  >
                    Colonne
                  </button>
                </div>
              )}
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
      {erroreBlocco && (
        <p role="alert" className={styles.errore}>
          {erroreBlocco}
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
