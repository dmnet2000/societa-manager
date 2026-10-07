// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { AtletaElenco } from "@/lib/db-rls/atleta";

// Le Server Action non servono qui (nessun clic su Conferma/Escludi): mock
// per non caricare Supabase/Prisma nel test del componente.
vi.mock("./actions", () => ({
  confermaIscrizione: vi.fn(),
  escludiIscrizione: vi.fn(),
  rimuoviAtleta: vi.fn(),
  ripristinaAtleta: vi.fn(),
}));

import { IscrizioniElenco, type RigaIscrizione } from "./IscrizioniElenco";

// Story 9.46 (review): test del componente - clic sulle intestazioni,
// aria-sort, ricerca combinata con l'ordinamento. Render con
// react-dom/client + act, come app/calendario/CalendarioVista.test.tsx.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function atleta(id: string, nome: string): AtletaElenco {
  return {
    id,
    nome,
    codiceFiscale: `CF${id}`,
    categoria: null,
    dataNascita: "2010-01-01",
    email: null,
    cellulare: null,
    rimossaIl: null,
    motivoRimozione: null,
    notaRimozione: null,
  } as AtletaElenco;
}

// Arrivano dalla pagina gia' in ordine di nome.
const RIGHE: RigaIscrizione[] = [
  { atleta: atleta("a", "ANNA"), iscrizioneId: "i-a", gruppi: ["U16"] },
  { atleta: atleta("b", "BEA"), iscrizioneId: null, gruppi: [] },
  { atleta: atleta("c", "CARLA"), iscrizioneId: null, gruppi: ["U8"] },
];

let contenitore: HTMLDivElement;
let root: Root;

beforeEach(() => {
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  root = createRoot(contenitore);
  act(() => {
    root.render(<IscrizioniElenco righe={RIGHE} righeRimosse={[]} puoConfermare={false} />);
  });
});

afterEach(() => {
  act(() => root.unmount());
  contenitore.remove();
});

function nomiRighe(): string[] {
  return Array.from(contenitore.querySelectorAll("table tbody tr")).map(
    (tr) => tr.querySelector("td")?.textContent ?? ""
  );
}

function intestazione(etichetta: string): HTMLTableCellElement {
  const th = Array.from(contenitore.querySelectorAll("thead th")).find((cella) =>
    cella.textContent?.startsWith(etichetta)
  );
  if (!th) throw new Error(`Intestazione ${etichetta} non trovata`);
  return th as HTMLTableCellElement;
}

function clicca(etichetta: string) {
  const bottone = intestazione(etichetta).querySelector("button");
  if (!bottone) throw new Error(`Nessun bottone in ${etichetta}`);
  act(() => bottone.click());
}

describe("IscrizioniElenco - ordinamento", () => {
  it("parte per Nome crescente: Nome aria-sort ascending, le altre none", () => {
    expect(nomiRighe()).toEqual(["ANNA", "BEA", "CARLA"]);
    expect(intestazione("Nome").getAttribute("aria-sort")).toBe("ascending");
    expect(intestazione("Gruppo").getAttribute("aria-sort")).toBe("none");
    expect(intestazione("Stato Iscrizione").getAttribute("aria-sort")).toBe("none");
  });

  it("Codice Fiscale non e' ordinabile", () => {
    const th = intestazione("Codice Fiscale");
    expect(th.querySelector("button")).toBeNull();
    expect(th.hasAttribute("aria-sort")).toBe(false);
  });

  it("clic su Gruppo: crescente (senza Gruppo in fondo), poi decrescente", () => {
    clicca("Gruppo");
    expect(nomiRighe()).toEqual(["CARLA", "ANNA", "BEA"]);
    expect(intestazione("Gruppo").getAttribute("aria-sort")).toBe("ascending");
    expect(intestazione("Nome").getAttribute("aria-sort")).toBe("none");

    clicca("Gruppo");
    expect(nomiRighe()).toEqual(["ANNA", "CARLA", "BEA"]);
    expect(intestazione("Gruppo").getAttribute("aria-sort")).toBe("descending");
  });

  it("clic su Stato: Non iscritte prima", () => {
    clicca("Stato Iscrizione");
    expect(nomiRighe()).toEqual(["BEA", "CARLA", "ANNA"]);
  });

  it("primo clic su Nome (gia' attivo): decrescente", () => {
    clicca("Nome");
    expect(nomiRighe()).toEqual(["CARLA", "BEA", "ANNA"]);
    expect(intestazione("Nome").getAttribute("aria-sort")).toBe("descending");
  });

  it("ricerca + ordinamento: le righe non cercate restano nascoste dopo il riordino", () => {
    const campo = contenitore.querySelector('input[type="search"]') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(campo, "carla");
      campo.dispatchEvent(new Event("input", { bubbles: true }));
    });
    clicca("Gruppo");
    const visibili = Array.from(contenitore.querySelectorAll("table tbody tr"))
      .filter((tr) => !(tr as HTMLTableRowElement).hidden)
      .map((tr) => tr.querySelector("td")?.textContent);
    expect(visibili).toEqual(["CARLA"]);
    expect(nomiRighe()).toEqual(["CARLA", "ANNA", "BEA"]);
  });
});
