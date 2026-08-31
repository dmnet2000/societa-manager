import { describe, expect, it, vi } from "vitest";

// NuovoSlotTorneoForm.tsx importa ./actions (Server Action), che a sua
// volta importa @/lib/torneo e altri moduli "server-only" - mock minimo
// necessario solo per poter importare il file ed estrarne la funzione pura
// sotto test, mirror dello stesso mock gia' in uso in
// lib/torneo.test.ts/actions.test.ts. Nessun'altra chiamata di rete/DB
// avviene qui: nessuna Server Action viene mai invocata da questo file.
vi.mock("server-only", () => ({}));

import { calcolaRigheSelezioneGirone } from "./NuovoSlotTorneoForm";

// Story 20.18 (Epic 20, Torneo Memorial, review fix - Verification Gap
// Reviewer): test della sola funzione pura calcolaRigheSelezioneGirone -
// nessun rendering/DOM/Testing Library, mirror dello stile "test di logica
// pura" gia' in uso ovunque nel progetto per le funzioni di lib/ (es.
// lib/girone-torneo.test.ts). Il componente React che la usa
// (NuovoSlotTorneoForm.tsx) non e' altrimenti testato in questo progetto -
// solo la logica di calcolo riga/valore/etichetta e' verificata qui.
describe("calcolaRigheSelezioneGirone", () => {
  it("produces one riga per Campo when a Palestra has 2 Campi censiti", () => {
    const righe = calcolaRigheSelezioneGirone([
      {
        id: "palestra-1",
        nome: "Palestra Comunale",
        campi: [
          { id: "campo-1", nome: "Campo 1" },
          { id: "campo-2", nome: "Campo 2" },
        ],
      },
    ]);

    expect(righe).toEqual([
      { valore: "palestra-1|campo-1", etichetta: "Palestra Comunale - Campo 1" },
      { valore: "palestra-1|campo-2", etichetta: "Palestra Comunale - Campo 2" },
    ]);
  });

  it("produces a single 'sola Palestra' riga when a Palestra has no Campi censiti", () => {
    const righe = calcolaRigheSelezioneGirone([
      { id: "palestra-2", nome: "Palestra Scolastica", campi: [] },
    ]);

    expect(righe).toEqual([{ valore: "palestra-2|", etichetta: "Palestra Scolastica" }]);
  });

  it("returns an empty array when there are no Palestre", () => {
    expect(calcolaRigheSelezioneGirone([])).toEqual([]);
  });

  it("mixes both kinds of righe across multiple Palestre, preserving order", () => {
    const righe = calcolaRigheSelezioneGirone([
      {
        id: "palestra-1",
        nome: "Palestra Comunale",
        campi: [{ id: "campo-1", nome: "Campo 1" }],
      },
      { id: "palestra-2", nome: "Palestra Scolastica", campi: [] },
    ]);

    expect(righe).toEqual([
      { valore: "palestra-1|campo-1", etichetta: "Palestra Comunale - Campo 1" },
      { valore: "palestra-2|", etichetta: "Palestra Scolastica" },
    ]);
  });
});
