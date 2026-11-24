// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// Le Server Action non servono qui (nessun invio di form): mock per non
// caricare Supabase/Prisma nel test del componente.
vi.mock("./actions", () => ({
  confermaCertificato: vi.fn(),
  aggiornaCertificatoConfermato: vi.fn(),
  ottieniUrlCertificatoConferma: vi.fn(),
}));

import { CertificatiElenco } from "./CertificatiElenco";

// Richiesta utente 2026-10-27: badge del Tesseramento sotto il nome, sia
// nelle schede "Da confermare" sia nelle righe "Confermati". Render con
// react-dom/client + act, come IscrizioniElenco.test.tsx.
describe("CertificatiElenco - badge Tesseramento", () => {
  let contenitore: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    contenitore = document.createElement("div");
    document.body.appendChild(contenitore);
    root = createRoot(contenitore);
  });

  afterEach(() => {
    act(() => root.unmount());
    contenitore.remove();
  });

  it("mostra le Federazioni o 'Non tesserata' in entrambe le sezioni", () => {
    act(() =>
      root.render(
        <CertificatiElenco
          puoModificare={false}
          daConfermare={[
            {
              atleta: { id: "a1", nome: "Rossi Anna", codiceFiscale: "RSSANN" },
              filePath: null,
              dataInizioValidita: "",
              dataFineValidita: "",
              mesiValidita: null,
              modulo: null,
              federazioni: ["FIPAV", "CSI"],
            },
            {
              atleta: { id: "a2", nome: "Zanon Bea", codiceFiscale: "ZNNBEA" },
              filePath: null,
              dataInizioValidita: "",
              dataFineValidita: "",
              mesiValidita: null,
              modulo: null,
              federazioni: [],
            },
          ]}
          confermati={[
            {
              atletaId: "a3",
              nome: "Verdi Carla",
              codiceFiscale: "VRDCRL",
              dataFineValiditaFormattata: "10/01/2027",
              stato: "IN_REGOLA",
              dataInizioValidita: "2026-01-10",
              dataFineValidita: "2027-01-10",
              mesiValidita: 12,
              modulo: null,
              filePath: null,
              federazioni: ["UISP"],
            },
          ]}
        />
      )
    );

    const [daConfermare, confermati] = contenitore.querySelectorAll("section");
    const schede = daConfermare.querySelectorAll("li");
    expect(schede[0].textContent).toContain("Tesserata · FIPAV, CSI");
    expect(schede[1].textContent).toContain("Non tesserata");
    expect(confermati.querySelector("li")?.textContent).toContain("Tesserata · UISP");
  });
});
