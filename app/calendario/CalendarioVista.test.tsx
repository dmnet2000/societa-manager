// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CalendarioVista, type PartitaMese } from "./CalendarioVista";
import { CHIAVE_STORAGE_NASCOSTI } from "@/lib/griglia-mensile";

// Story 18.32 (review): test del componente client della vista mensile,
// render con react-dom/client + act (nessuna @testing-library nel progetto).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// 2 Campionati su 2 mesi (ottobre e novembre 2026).
const PARTITE: PartitaMese[] = [
  {
    id: "p1",
    data: "2026-10-14",
    ora: "20:30",
    squadraCasa: "Mogliano",
    squadraOspite: "Treviso",
    campionato: { id: "serie-d", nome: "Serie D", colore: "#ff0000" },
  },
  {
    id: "p2",
    data: "2026-10-18",
    ora: "18:00",
    squadraCasa: "Mogliano U16",
    squadraOspite: "Preganziol U16",
    campionato: { id: "u16", nome: "Under 16", colore: null },
  },
  {
    id: "p3",
    data: "2026-11-07",
    ora: "21:00",
    squadraCasa: "Silea",
    squadraOspite: "Mogliano",
    campionato: { id: "serie-d", nome: "Serie D", colore: "#ff0000" },
  },
];

let contenitore: HTMLDivElement;
let root: Root;

function monta(meseOggi = "2026-07") {
  act(() => {
    root.render(
      <CalendarioVista partite={PARTITE} meseOggi={meseOggi}>
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

beforeEach(() => {
  window.localStorage.clear();
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  root = createRoot(contenitore);
});

afterEach(() => {
  act(() => root.unmount());
  contenitore.remove();
  vi.restoreAllMocks();
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
