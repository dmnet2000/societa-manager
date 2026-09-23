import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { analizzaHtmlGareFipav } = await import("./parser");

// Frammenti ispirati all'HTML reale della pagina risultati del portale
// FIPAV/Lega verificato in sessione (spec-10-11, Design Notes): tabella
// table.tbl.tbl-risultati, celle posizionali per numero gara/giornata/
// data-ora/squadre, selettori per classe per risultato/parziali/icone.

function tabella(righeHtml: string): string {
  return `<html><body><table class="tbl tbl-risultati"><tbody>${righeHtml}</tbody></table></body></html>`;
}

const RIGA_GARA_DISPUTATA = `
  <tr>
    <td>1568</td>
    <td>1</td>
    <td>25/10/25 20:30</td>
    <td title="VOLLEY MOGLIANO A.S.D.">VOLLEY MOGLIANO</td>
    <td title="SPACCIO OCCHIALI VISION SSD">SPACCIO OCCHIALI VISION</td>
    <td class="risultato">3 - 0</td>
    <td>
      <span class="parziali">25-19</span>
      <span class="parziali">29-27</span>
      <span class="parziali">25-21</span>
    </td>
    <td>
      <img class="tips ris-img" alt="statogara" title="Gara omologata"/>
      <img class="tips ris-img" alt="info" title="&lt;p&gt;&lt;b&gt;Palestra Olme&lt;/b&gt;&lt;br/&gt;Mogliano Veneto TV&lt;br/&gt;Via Olme 12&lt;/p&gt;"/>
    </td>
  </tr>
`;

const RIGA_GARA_FUTURA = `
  <tr>
    <td>1600</td>
    <td>5</td>
    <td>12/12/25 18:00</td>
    <td title="ASD ROSSA">ASD ROSSA</td>
    <td title="ASD BLU">ASD BLU</td>
    <td class="risultato">-</td>
    <td></td>
    <td>
      <img class="tips ris-img" alt="info" title="&lt;p&gt;&lt;b&gt;PalaSport&lt;/b&gt;&lt;br/&gt;Treviso TV&lt;br/&gt;Via Roma 1&lt;/p&gt;"/>
    </td>
  </tr>
`;

// Gara "designata" osservata dal vivo (Design Notes spec-10-11): il title
// dell'icona di stato e' su due righe separate da <br/> ("da disputare" +
// "Arbitro designato"), non una singola frase.
const RIGA_GARA_DESIGNATA = `
  <tr>
    <td>1610</td>
    <td>8</td>
    <td>20/12/25 18:00</td>
    <td title="ASD VIOLA">ASD VIOLA</td>
    <td title="ASD ARANCIO">ASD ARANCIO</td>
    <td class="risultato">-</td>
    <td></td>
    <td>
      <img class="tips ris-img" alt="statogara" title="da disputare&lt;br /&gt;Arbitro designato"/>
      <img class="tips ris-img" alt="info" title="&lt;p&gt;&lt;b&gt;Palazzetto&lt;/b&gt;&lt;br/&gt;Vittorio Veneto TV&lt;br/&gt;Via Dante 5&lt;/p&gt;"/>
    </td>
  </tr>
`;

// Formato del title dell'icona info senza <b> attorno al nome (variante non
// osservata dal vivo, ma il codice non deve dare per scontato che <b> ci sia
// sempre - review fix Blind Hunter/Edge Case Hunter).
const RIGA_INFO_SENZA_TAG_B = `
  <tr>
    <td>1611</td>
    <td>9</td>
    <td>21/12/25 18:00</td>
    <td title="ASD INDACO">ASD INDACO</td>
    <td title="ASD NERO">ASD NERO</td>
    <td class="risultato">-</td>
    <td></td>
    <td>
      <img class="tips ris-img" alt="info" title="&lt;p&gt;Palestra Comunale&lt;br/&gt;Conegliano TV&lt;/p&gt;"/>
    </td>
  </tr>
`;

const RIGA_MALFORMATA_POCHE_CELLE = `
  <tr>
    <td>1601</td>
    <td>6</td>
    <td>13/12/25 18:00</td>
  </tr>
`;

const RIGA_DATA_INVALIDA = `
  <tr>
    <td>1602</td>
    <td>7</td>
    <td>31/02/26 18:00</td>
    <td title="ASD VERDE">ASD VERDE</td>
    <td title="ASD GIALLA">ASD GIALLA</td>
    <td class="risultato">-</td>
    <td></td>
    <td></td>
  </tr>
`;

describe("analizzaHtmlGareFipav", () => {
  it("parsa una riga di gara disputata (risultato, parziali multipli, stato, impianto/indirizzo)", () => {
    const risultato = analizzaHtmlGareFipav(tabella(RIGA_GARA_DISPUTATA));

    expect(risultato.scartate).toEqual([]);
    expect(risultato.righe).toEqual([
      {
        garaNumero: "1568",
        giornata: "1",
        data: "2025-10-25",
        ora: "20:30",
        squadraCasa: "VOLLEY MOGLIANO",
        squadraOspite: "SPACCIO OCCHIALI VISION",
        risultato: "3 - 0",
        parziali: "25-19,29-27,25-21",
        statoDescrizione: "Gara omologata",
        impianto: "Palestra Olme",
        indirizzoImpianto: "Mogliano Veneto TV, Via Olme 12",
      },
    ]);
  });

  it("usa il testo della cella squadra, non l'attributo title", () => {
    const risultato = analizzaHtmlGareFipav(tabella(RIGA_GARA_DISPUTATA));

    expect(risultato.righe[0].squadraCasa).toBe("VOLLEY MOGLIANO");
    expect(risultato.righe[0].squadraCasa).not.toBe("VOLLEY MOGLIANO A.S.D.");
  });

  it("parsa una gara futura (risultato '-', nessun parziale, nessuna icona di stato)", () => {
    const risultato = analizzaHtmlGareFipav(tabella(RIGA_GARA_FUTURA));

    expect(risultato.scartate).toEqual([]);
    expect(risultato.righe).toEqual([
      {
        garaNumero: "1600",
        giornata: "5",
        data: "2025-12-12",
        ora: "18:00",
        squadraCasa: "ASD ROSSA",
        squadraOspite: "ASD BLU",
        risultato: "-",
        parziali: null,
        statoDescrizione: null,
        impianto: "PalaSport",
        indirizzoImpianto: "Treviso TV, Via Roma 1",
      },
    ]);
  });

  it("scarta una riga con celle insufficienti, col motivo, senza bloccare le altre", () => {
    const risultato = analizzaHtmlGareFipav(
      tabella(RIGA_MALFORMATA_POCHE_CELLE + RIGA_GARA_DISPUTATA)
    );

    expect(risultato.righe).toHaveLength(1);
    expect(risultato.righe[0].garaNumero).toBe("1568");
    expect(risultato.scartate).toEqual([
      { numeroRiga: 1, motivo: "Riga con celle insufficienti (formato pagina inatteso)" },
    ]);
  });

  it("scarta una riga con data/ora in formato non riconosciuto (es. data inesistente)", () => {
    const risultato = analizzaHtmlGareFipav(tabella(RIGA_DATA_INVALIDA));

    expect(risultato.righe).toEqual([]);
    expect(risultato.scartate).toEqual([
      { numeroRiga: 1, motivo: "Data/ora mancante o in formato non riconosciuto" },
    ]);
  });

  it("numera le righe scartate in base alla posizione nella tabella (1-based)", () => {
    const risultato = analizzaHtmlGareFipav(
      tabella(RIGA_GARA_DISPUTATA + RIGA_MALFORMATA_POCHE_CELLE + RIGA_GARA_FUTURA)
    );

    expect(risultato.righe).toHaveLength(2);
    expect(risultato.scartate).toEqual([
      { numeroRiga: 2, motivo: "Riga con celle insufficienti (formato pagina inatteso)" },
    ]);
  });

  it("unisce le due righe del title (separate da <br/>) di una gara designata in un unico statoDescrizione", () => {
    const risultato = analizzaHtmlGareFipav(tabella(RIGA_GARA_DESIGNATA));

    expect(risultato.scartate).toEqual([]);
    expect(risultato.righe[0].statoDescrizione).toBe("da disputare - Arbitro designato");
    expect(risultato.righe[0].impianto).toBe("Palazzetto");
    expect(risultato.righe[0].indirizzoImpianto).toBe("Vittorio Veneto TV, Via Dante 5");
  });

  it("non perde la prima riga dell'indirizzo quando il title dell'icona info non ha un tag <b>", () => {
    const risultato = analizzaHtmlGareFipav(tabella(RIGA_INFO_SENZA_TAG_B));

    expect(risultato.scartate).toEqual([]);
    expect(risultato.righe[0].impianto).toBeNull();
    expect(risultato.righe[0].indirizzoImpianto).toBe("Palestra Comunale, Conegliano TV");
  });

  it("lancia un errore esplicito quando la tabella tbl-risultati non e' presente", () => {
    expect(() => analizzaHtmlGareFipav("<html><body><p>Pagina cambiata</p></body></html>")).toThrow(
      /Tabella dei risultati non trovata/
    );
  });

  it("non lancia un errore quando la tabella esiste ma non ha righe (stagione non ancora iniziata)", () => {
    const risultato = analizzaHtmlGareFipav(tabella(""));

    expect(risultato.righe).toEqual([]);
    expect(risultato.scartate).toEqual([]);
  });
});
