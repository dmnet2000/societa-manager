// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const { salvaTesseramentiMock } = vi.hoisted(() => ({ salvaTesseramentiMock: vi.fn() }));
vi.mock("./actions", () => ({
  salvaTesseramenti: salvaTesseramentiMock,
}));

import {
  ConfermaTesseramentiForm,
  type AtletaTesseramentoRiga,
  type ColonnaFederazione,
} from "./ConfermaTesseramentiForm";

// Story 26.2 (review): test del componente - righe modificate, conferma
// dello svuotamento, colonne disattivate. Render con react-dom/client + act,
// come conferma-iscrizioni/IscrizioniElenco.test.tsx.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COLONNE: ColonnaFederazione[] = [
  { id: "fipav", etichetta: "FIPAV", nome: "FIPAV", attiva: true },
  { id: "csi", etichetta: "CSI", nome: "Centro Sportivo Italiano", attiva: true },
  { id: "uisp", etichetta: "UISP", nome: "UISP", attiva: false },
];

const ATLETE: AtletaTesseramentoRiga[] = [
  { id: "a", nome: "ANNA", codiceFiscale: "CFA", iscrizioneAttiva: true, federazioniIniziali: ["fipav"] },
  { id: "b", nome: "BEA", codiceFiscale: "CFB", iscrizioneAttiva: false, federazioniIniziali: [] },
  { id: "c", nome: "CARLA", codiceFiscale: "CFC", iscrizioneAttiva: true, federazioniIniziali: ["uisp"] },
];

let contenitore: HTMLDivElement;
let root: Root;

function render(colonne = COLONNE) {
  act(() => {
    root.render(<ConfermaTesseramentiForm atlete={ATLETE} colonne={colonne} />);
  });
}

beforeEach(() => {
  salvaTesseramentiMock.mockReset();
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  root = createRoot(contenitore);
});

afterEach(() => {
  act(() => root.unmount());
  contenitore.remove();
});

function casella(atleta: string, federazione: string): HTMLInputElement {
  return contenitore.querySelector(
    `input[name="federazione:${atleta}"][value="${federazione}"]`
  ) as HTMLInputElement;
}

function righeModificate(): string[] {
  return Array.from(
    contenitore.querySelectorAll<HTMLInputElement>('input[name="atletaModificata"]')
  ).map((i) => i.value);
}

function bottoneSalva(): HTMLButtonElement {
  return Array.from(contenitore.querySelectorAll("button")).find((b) =>
    b.textContent?.startsWith("Salva")
  ) as HTMLButtonElement;
}

function clic(elemento: HTMLElement) {
  act(() => elemento.click());
}

describe("ConfermaTesseramentiForm", () => {
  it("mostra le caselle gia' spuntate e nessuna riga modificata all'avvio", () => {
    render();
    expect(casella("a", "fipav").checked).toBe(true);
    expect(casella("a", "csi").checked).toBe(false);
    expect(righeModificate()).toEqual([]);
    expect(bottoneSalva().disabled).toBe(true);
  });

  it("solo la riga cambiata invia atletaModificata, e tornare allo stato iniziale la ripulisce", () => {
    render();
    clic(casella("b", "csi"));
    expect(righeModificate()).toEqual(["b"]);
    expect(bottoneSalva().disabled).toBe(false);
    expect(bottoneSalva().textContent).toBe("Salva (1)");

    clic(casella("b", "csi"));
    expect(righeModificate()).toEqual([]);
    expect(bottoneSalva().disabled).toBe(true);
  });

  it("una colonna disattivata si puo' togliere dove c'era, ma non aggiungere", () => {
    render();
    expect(casella("c", "uisp").disabled).toBe(false);
    expect(casella("a", "uisp").disabled).toBe(true);
    expect(casella("b", "uisp").disabled).toBe(true);
  });

  it("svuotare una riga tesserata chiede conferma prima di inviare", () => {
    render();
    clic(casella("a", "fipav"));
    clic(bottoneSalva());

    const conferma = contenitore.querySelector('[role="alertdialog"]');
    expect(conferma).not.toBeNull();
    expect(conferma?.textContent).toContain("ANNA");
    expect(document.activeElement).toBe(conferma);
    expect(salvaTesseramentiMock).not.toHaveBeenCalled();
    expect(
      contenitore.querySelector('input[name="confermaRimozioneTotale"]')
    ).not.toBeNull();
  });

  it("Annulla chiude la conferma lasciando la tabella com'era", () => {
    render();
    clic(casella("a", "fipav"));
    clic(bottoneSalva());
    const annulla = Array.from(contenitore.querySelectorAll("button")).find(
      (b) => b.textContent === "Annulla"
    ) as HTMLButtonElement;
    clic(annulla);

    expect(contenitore.querySelector('[role="alertdialog"]')).toBeNull();
    expect(casella("a", "fipav").checked).toBe(false);
    expect(righeModificate()).toEqual(["a"]);
    expect(salvaTesseramentiMock).not.toHaveBeenCalled();
  });

  it("cambiare una casella chiude una conferma ormai superata", () => {
    render();
    clic(casella("a", "fipav"));
    clic(bottoneSalva());
    clic(casella("a", "csi"));
    expect(contenitore.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("senza federazioni da mostrare non rende la tabella", () => {
    render([]);
    expect(contenitore.querySelector("table")).toBeNull();
    expect(contenitore.textContent).toContain("Nessuna federazione attiva");
  });

  it("ordina le righe cliccando sulle intestazioni, senza perdere le caselle spuntate", () => {
    render();
    const ordineRighe = () =>
      Array.from(contenitore.querySelectorAll("tbody tr")).map(
        (tr) => tr.querySelector("td")?.textContent
      );
    const intestazione = (testo: string) =>
      Array.from(contenitore.querySelectorAll("thead button")).find((b) =>
        b.getAttribute("aria-label")?.includes(testo)
      ) as HTMLButtonElement;

    expect(ordineRighe()).toEqual(["ANNA", "BEA", "CARLA"]);
    clic(casella("b", "csi"));

    clic(intestazione("FIPAV"));
    expect(ordineRighe()).toEqual(["BEA", "CARLA", "ANNA"]);
    expect(intestazione("FIPAV").closest("th")?.getAttribute("aria-sort")).toBe("ascending");

    clic(intestazione("Nome"));
    clic(intestazione("Nome"));
    expect(ordineRighe()).toEqual(["CARLA", "BEA", "ANNA"]);

    expect(casella("b", "csi").checked).toBe(true);
    expect(righeModificate()).toEqual(["b"]);
  });
});
