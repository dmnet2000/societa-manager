// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CalendarioVista, type PartitaMese } from "./CalendarioVista";
import { CHIAVE_STORAGE_NASCOSTI } from "@/lib/griglia-mensile";
import styles from "./calendario.module.css";

// Story 18.32 (review): test del componente client della vista mensile,
// render con react-dom/client + act (nessuna @testing-library nel progetto).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Campi del popup a null di default (obbligatori nel tipo).
const SENZA_DETTAGLI = {
  impianto: null,
  indirizzoImpianto: null,
  giornata: null,
  statoDescrizione: null,
  risultato: null,
  parziali: null,
};

// 2 Campionati su 2 mesi (ottobre e novembre 2026).
const PARTITE: PartitaMese[] = [
  {
    id: "p1",
    data: "2026-10-14",
    ora: "20:30",
    squadraCasa: "Mogliano",
    squadraOspite: "Treviso",
    impianto: "Palazzetto Mogliano",
    indirizzoImpianto: "Via Roma 1, Mogliano Veneto",
    giornata: "3",
    statoDescrizione: "Giocata",
    risultato: "3-1",
    parziali: "25-20,22-25,25-18,25-19",
    campionato: { id: "serie-d", nome: "Serie D", colore: "#ff0000" },
  },
  {
    id: "p2",
    data: "2026-10-18",
    ora: "18:00",
    squadraCasa: "Mogliano U16",
    squadraOspite: "Preganziol U16",
    ...SENZA_DETTAGLI,
    campionato: { id: "u16", nome: "Under 16", colore: null },
  },
  {
    id: "p3",
    data: "2026-11-07",
    ora: "21:00",
    squadraCasa: "Silea",
    squadraOspite: "Mogliano",
    ...SENZA_DETTAGLI,
    campionato: { id: "serie-d", nome: "Serie D", colore: "#ff0000" },
  },
];

// Fixture separata (per non cambiare la legenda dei test esistenti): un
// Campionato con colore chiaro, che richiede il testo scuro.
const PARTITA_COLORE_CHIARO: PartitaMese = {
  id: "p4",
  data: "2026-10-21",
  ora: "19:00",
  squadraCasa: "Mogliano U14",
  squadraOspite: "Casale U14",
  ...SENZA_DETTAGLI,
  campionato: { id: "u14", nome: "Under 14", colore: "#ffff66" },
};

let contenitore: HTMLDivElement;
let root: Root;

function monta(meseOggi = "2026-07", partite: PartitaMese[] = PARTITE) {
  act(() => {
    root.render(
      <CalendarioVista partite={partite} meseOggi={meseOggi}>
        <p>ELENCO SETTIMANALE</p>
      </CalendarioVista>
    );
  });
}

function smonta() {
  act(() => root.unmount());
  root = createRoot(contenitore);
}

function bottone(testo: string): HTMLButtonElement {
  const trovato = [...contenitore.querySelectorAll("button")].find(
    (b) => b.textContent === testo || b.getAttribute("aria-label") === testo
  );
  if (!trovato) throw new Error(`Bottone "${testo}" non trovato`);
  return trovato;
}

function clicca(elemento: HTMLElement) {
  act(() => elemento.click());
}

function checkbox(nome: string): HTMLInputElement {
  const label = [...contenitore.querySelectorAll("label")].find((l) =>
    l.textContent?.includes(nome)
  );
  const input = label?.querySelector("input");
  if (!input) throw new Error(`Checkbox "${nome}" non trovata`);
  return input;
}

function titoloMese(): string | null | undefined {
  return contenitore.querySelector("h2")?.textContent;
}

function testoGriglia(): string {
  return [...contenitore.querySelectorAll("li")].map((li) => li.textContent).join(" | ");
}

// jsdom puo' non implementare showModal/close di <dialog>: stub minimale
// basato sull'attributo "open", close() emette l'evento "close" come il
// browser (anche su Esc).
type ProtoDialog = { showModal?: () => void; close?: () => void };
const protoDialog = HTMLDialogElement.prototype as unknown as ProtoDialog;
const dialogOriginale: ProtoDialog = {
  showModal: protoDialog.showModal,
  close: protoDialog.close,
};

// Teardown: se jsdom non aveva il metodo, la proprieta' va cancellata (non
// riassegnata a undefined), cosi' gli altri test vedono il prototipo intatto.
function ripristinaDialog(nome: keyof ProtoDialog) {
  const originale = dialogOriginale[nome];
  if (originale === undefined) delete protoDialog[nome];
  else protoDialog[nome] = originale;
}

// Esc come lo gestisce il browser: evento "cancel" (annullabile) e, se non
// annullato, chiusura del dialog con evento "close".
function premiEsc(d: HTMLDialogElement) {
  act(() => {
    const cancel = new Event("cancel", { cancelable: true });
    d.dispatchEvent(cancel);
    if (!cancel.defaultPrevented && d.hasAttribute("open")) {
      d.removeAttribute("open");
      d.dispatchEvent(new Event("close"));
    }
  });
}

function puntatore(tipo: "pointerdown" | "click", bersaglio: Element, x: number, y: number) {
  act(() => {
    bersaglio.dispatchEvent(
      new MouseEvent(tipo, { bubbles: true, cancelable: true, clientX: x, clientY: y })
    );
  });
}

// Rettangolo del contenuto del popup (jsdom non fa layout): 100..300 x 100..300.
function stubRettangoloContenuto(d: HTMLDialogElement) {
  const corpo = d.firstElementChild as HTMLElement;
  vi.spyOn(corpo, "getBoundingClientRect").mockReturnValue({
    left: 100,
    right: 300,
    top: 100,
    bottom: 300,
    width: 200,
    height: 200,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  } as DOMRect);
}

function dialog(): HTMLDialogElement {
  const trovato = contenitore.querySelector("dialog");
  if (!trovato) throw new Error("dialog non trovato");
  return trovato;
}

function striscia(testo: string): HTMLButtonElement {
  const trovato = [...contenitore.querySelectorAll("li button")].find((b) =>
    b.textContent?.includes(testo)
  );
  if (!trovato) throw new Error(`Striscia "${testo}" non trovata`);
  return trovato as HTMLButtonElement;
}

beforeEach(() => {
  protoDialog.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  protoDialog.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  window.localStorage.clear();
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  root = createRoot(contenitore);
});

afterEach(() => {
  act(() => root.unmount());
  contenitore.remove();
  vi.restoreAllMocks();
  ripristinaDialog("showModal");
  ripristinaDialog("close");
});

describe("CalendarioVista - dettaglio Partita", () => {
  it("click su una striscia apre il popup con tutti i dettagli", () => {
    monta();
    clicca(bottone("Mese"));
    expect(dialog().hasAttribute("open")).toBe(false);
    clicca(striscia("Mogliano - Treviso"));

    const d = dialog();
    expect(d.hasAttribute("open")).toBe(true);
    const testo = d.textContent ?? "";
    expect(testo).toContain("Serie D");
    expect(testo).toContain("Mogliano - Treviso");
    expect(testo).toContain("mercoledì 14 ottobre 2026, ore 20:30");
    expect(testo).toContain("Palazzetto Mogliano");
    expect(testo).toContain("Via Roma 1, Mogliano Veneto");
    expect(testo).toContain("Giocata");
    expect(testo).toContain("3-1");
    expect(testo).toContain("25-20, 22-25, 25-18, 25-19");

    // Titolo collegato e focus iniziale dentro la finestra.
    const ids = d.getAttribute("aria-labelledby")!.split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual([
      "Serie D",
      "Mogliano - Treviso",
    ]);
    expect(d.contains(document.activeElement)).toBe(true);

    const naviga = d.querySelector("a")!;
    expect(naviga.textContent).toBe("Naviga");
    expect(naviga.getAttribute("href")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Via%20Roma%201%2C%20Mogliano%20Veneto"
    );
    expect(naviga.getAttribute("target")).toBe("_blank");
    expect(naviga.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("campi opzionali assenti omessi, nessun Naviga senza indirizzo", () => {
    monta();
    clicca(bottone("Mese"));
    clicca(striscia("Mogliano U16 - Preganziol U16"));
    const d = dialog();
    const etichette = [...d.querySelectorAll("dt")].map((dt) => dt.textContent);
    expect(etichette).toEqual(["Quando"]);
    expect(d.querySelector("a")).toBeNull();
    expect(d.textContent).not.toContain("non disponibile");
  });

  it("chiusura con x riporta il focus sulla striscia", () => {
    monta();
    clicca(bottone("Mese"));
    const origine = striscia("Mogliano - Treviso");
    origine.focus();
    clicca(origine);
    clicca(bottone("Chiudi"));
    expect(dialog().hasAttribute("open")).toBe(false);
    expect(dialog().textContent).toBe("");
    expect(document.activeElement).toBe(origine);
  });

  it("chiusura con Esc (cancel + close del browser) riporta il focus", () => {
    monta();
    clicca(bottone("Mese"));
    const origine = striscia("Mogliano U16");
    clicca(origine);
    premiEsc(dialog());
    expect(dialog().hasAttribute("open")).toBe(false);
    expect(dialog().textContent).toBe("");
    expect(document.activeElement).toBe(origine);
  });

  it("clic dentro la finestra non chiude", () => {
    monta();
    clicca(bottone("Mese"));
    clicca(striscia("Mogliano - Treviso"));
    const d = dialog();
    stubRettangoloContenuto(d);
    const titolo = d.querySelector("h2")!;
    puntatore("pointerdown", titolo, 150, 150);
    puntatore("click", titolo, 150, 150);
    expect(d.hasAttribute("open")).toBe(true);
  });

  it("selezione iniziata dentro e rilasciata fuori non chiude", () => {
    monta();
    clicca(bottone("Mese"));
    clicca(striscia("Mogliano - Treviso"));
    const d = dialog();
    stubRettangoloContenuto(d);
    puntatore("pointerdown", d.querySelector("h2")!, 150, 150);
    // Il click finale ha come target il dialog (antenato comune).
    puntatore("click", d, 20, 20);
    expect(d.hasAttribute("open")).toBe(true);
  });

  it("click sul dialog ma dentro il rettangolo del contenuto (scrollbar) non chiude", () => {
    monta();
    clicca(bottone("Mese"));
    clicca(striscia("Mogliano - Treviso"));
    const d = dialog();
    stubRettangoloContenuto(d);
    puntatore("pointerdown", d, 295, 200);
    puntatore("click", d, 295, 200);
    expect(d.hasAttribute("open")).toBe(true);
  });

  it("pointerdown e click sullo sfondo chiudono e riportano il focus", () => {
    monta();
    clicca(bottone("Mese"));
    const origine = striscia("Mogliano - Treviso");
    clicca(origine);
    const d = dialog();
    stubRettangoloContenuto(d);
    puntatore("pointerdown", d, 20, 20);
    puntatore("click", d, 20, 20);
    expect(d.hasAttribute("open")).toBe(false);
    expect(document.activeElement).toBe(origine);
  });

  it("striscia e testata usano il colore del Campionato", () => {
    monta();
    clicca(bottone("Mese"));
    const origine = striscia("Mogliano - Treviso");
    expect(origine.style.backgroundColor).toBe("rgb(255, 0, 0)");
    clicca(origine);
    const testata = dialog().firstElementChild!.firstElementChild as HTMLElement;
    expect(testata.style.backgroundColor).toBe("rgb(255, 0, 0)");
    expect(testata.classList.contains(styles.dialogoTestataTestoScuro)).toBe(false);
  });

  it("Campionato con colore chiaro: testo scuro su striscia e testata", () => {
    monta("2026-07", [...PARTITE, PARTITA_COLORE_CHIARO]);
    clicca(bottone("Mese"));
    const origine = striscia("Mogliano U14 - Casale U14");
    expect(origine.style.backgroundColor).toBe("rgb(255, 255, 102)");
    expect(origine.classList.contains(styles.eventoTestoScuro)).toBe(true);
    expect(striscia("Mogliano - Treviso").classList.contains(styles.eventoTestoScuro)).toBe(
      false
    );
    clicca(origine);
    const testata = dialog().firstElementChild!.firstElementChild as HTMLElement;
    expect(testata.style.backgroundColor).toBe("rgb(255, 255, 102)");
    expect(testata.classList.contains(styles.dialogoTestataTestoScuro)).toBe(true);
  });

  it("senza showModal/close (browser vecchi): attributo open, nessun crash", () => {
    protoDialog.showModal = undefined;
    protoDialog.close = undefined;
    monta();
    clicca(bottone("Mese"));
    const origine = striscia("Mogliano - Treviso");
    clicca(origine);
    expect(dialog().hasAttribute("open")).toBe(true);
    expect(dialog().textContent).toContain("Palazzetto Mogliano");
    clicca(bottone("Chiudi"));
    expect(dialog().hasAttribute("open")).toBe(false);
    expect(document.activeElement).toBe(origine);
  });

  it("striscia non piu' nel documento: il focus va al titolo del mese", () => {
    monta();
    clicca(bottone("Mese"));
    const origine = striscia("Mogliano - Treviso");
    clicca(origine);
    // Simula la sparizione del pulsante di origine prima della chiusura.
    const li = origine.parentElement!;
    li.removeChild(origine);
    clicca(bottone("Chiudi"));
    expect(document.activeElement).toBe(contenitore.querySelector("h2"));
    li.appendChild(origine); // ripristino per lo smontaggio di React
  });
});

describe("CalendarioVista", () => {
  it("di default mostra l'elenco (children)", () => {
    monta();
    expect(contenitore.textContent).toContain("ELENCO SETTIMANALE");
    expect(bottone("Elenco").getAttribute("aria-pressed")).toBe("true");
    expect(bottone("Mese").getAttribute("aria-pressed")).toBe("false");
    expect(contenitore.querySelector("h2")).toBeNull();
  });

  it("click su Mese apre il mese iniziale (oggi fuori stagione -> primo mese)", () => {
    monta("2026-07");
    clicca(bottone("Mese"));
    expect(contenitore.textContent).not.toContain("ELENCO SETTIMANALE");
    expect(titoloMese()).toBe("ottobre 2026");
    expect(testoGriglia()).toContain("Mogliano - Treviso");
  });

  it("click su Mese apre il mese corrente se dentro la stagione", () => {
    monta("2026-11");
    clicca(bottone("Mese"));
    expect(titoloMese()).toBe("novembre 2026");
  });

  it("frecce disabilitate ai bordi della stagione", () => {
    monta();
    clicca(bottone("Mese"));
    expect(bottone("Mese precedente").disabled).toBe(true);
    expect(bottone("Mese successivo").disabled).toBe(false);
    clicca(bottone("Mese successivo"));
    expect(titoloMese()).toBe("novembre 2026");
    expect(bottone("Mese precedente").disabled).toBe(false);
    expect(bottone("Mese successivo").disabled).toBe(true);
  });

  it("deselezionare un Campionato toglie le sue Partite dalla griglia", () => {
    monta();
    clicca(bottone("Mese"));
    expect(testoGriglia()).toContain("Mogliano U16 - Preganziol U16");
    clicca(checkbox("Under 16"));
    expect(checkbox("Under 16").checked).toBe(false);
    expect(testoGriglia()).not.toContain("Mogliano U16");
    expect(testoGriglia()).toContain("Mogliano - Treviso");
  });

  it("la selezione sopravvive a smontaggio e rimontaggio (localStorage)", () => {
    monta();
    clicca(bottone("Mese"));
    clicca(checkbox("Serie D"));
    expect(JSON.parse(window.localStorage.getItem(CHIAVE_STORAGE_NASCOSTI)!)).toEqual([
      "serie-d",
    ]);
    smonta();
    monta();
    clicca(bottone("Mese"));
    expect(checkbox("Serie D").checked).toBe(false);
    expect(checkbox("Under 16").checked).toBe(true);
    expect(testoGriglia()).not.toContain("Mogliano - Treviso");
  });

  it("conserva gli id salvati di Campionati non di questa stagione", () => {
    window.localStorage.setItem(CHIAVE_STORAGE_NASCOSTI, JSON.stringify(["altra-stagione"]));
    monta();
    clicca(bottone("Mese"));
    clicca(checkbox("Under 16"));
    expect(JSON.parse(window.localStorage.getItem(CHIAVE_STORAGE_NASCOSTI)!)).toEqual([
      "altra-stagione",
      "u16",
    ]);
  });

  it("localStorage che lancia: tutti selezionati, nessun crash", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage bloccato");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage bloccato");
    });
    monta();
    clicca(bottone("Mese"));
    expect(checkbox("Serie D").checked).toBe(true);
    expect(checkbox("Under 16").checked).toBe(true);
    clicca(checkbox("Serie D"));
    expect(checkbox("Serie D").checked).toBe(false);
    expect(testoGriglia()).not.toContain("Mogliano - Treviso");
  });

  it("tutti i Campionati deselezionati: messaggio al posto della griglia", () => {
    monta();
    clicca(bottone("Mese"));
    expect(contenitore.textContent).not.toContain("Nessun Campionato selezionato.");
    clicca(checkbox("Serie D"));
    clicca(checkbox("Under 16"));
    expect(contenitore.textContent).toContain("Nessun Campionato selezionato.");
    expect(contenitore.querySelectorAll("li")).toHaveLength(0);
  });

  it("il mese resta quello scelto dopo Mese -> Elenco -> Mese", () => {
    monta();
    clicca(bottone("Mese"));
    clicca(bottone("Mese successivo"));
    expect(titoloMese()).toBe("novembre 2026");
    clicca(bottone("Elenco"));
    expect(contenitore.textContent).toContain("ELENCO SETTIMANALE");
    clicca(bottone("Mese"));
    expect(titoloMese()).toBe("novembre 2026");
  });
});
