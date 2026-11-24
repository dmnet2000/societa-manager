import type { CellaXlsx, FoglioXlsx } from "@/lib/export-xlsx";
import type { ColonnaTesseramento } from "@/lib/tesseramento";
import { dataDaIso, perNomeAtleta, siNo, type AtletaExport } from "./comune";

// Story 28.3 (Epic 28): composizione del foglio "Tesseramenti", separata dal
// formato .xlsx come per Certificati/Iscrizioni e riusabile dall'export
// complessivo (Story 28.4). I dati del Tesseramento arrivano gia' letti da
// lib/tesseramento.ts (vincolo Epic 26): qui solo la mappa atletaId -> id
// Federazioni e le colonne calcolate da colonneTesseramento, le stesse
// della pagina.

// Come in pagina: contano solo gli id che hanno una colonna (un id senza
// Federazione corrispondente non dovrebbe esistere ed e' ignorato anche
// dal badge di /app/gruppi).
export function federazioniTesseramentoExport(
  atletaId: string,
  tesseramenti: Map<string, string[]>,
  colonne: ColonnaTesseramento[]
): ColonnaTesseramento[] {
  const presenti = new Set(tesseramenti.get(atletaId) ?? []);
  return colonne.filter((colonna) => presenti.has(colonna.id));
}

export function componiExportTesseramenti(
  atlete: AtletaExport[],
  atleteIscritte: Set<string>,
  tesseramenti: Map<string, string[]>,
  colonne: ColonnaTesseramento[],
  gruppiPerAtleta: Map<string, string[]>
): FoglioXlsx {
  const righe = [...atlete].sort(perNomeAtleta).map((atleta): CellaXlsx[] => {
    const tesserateCon = new Set(
      federazioniTesseramentoExport(atleta.id, tesseramenti, colonne).map((c) => c.id)
    );
    return [
      atleta.nome,
      atleta.codiceFiscale,
      dataDaIso(atleta.dataNascita),
      (gruppiPerAtleta.get(atleta.id) ?? []).join(", "),
      siNo(atleteIscritte.has(atleta.id)),
      siNo(tesserateCon.size > 0),
      ...colonne.map((colonna) => (tesserateCon.has(colonna.id) ? "Sì" : null)),
    ];
  });

  return {
    nome: "Tesseramenti",
    intestazioni: [
      "Atleta",
      "Codice fiscale",
      "Data di nascita",
      "Gruppo",
      "Iscritta",
      "Tesserata",
      ...colonne.map((colonna) => colonna.etichetta),
    ],
    righe,
  };
}
