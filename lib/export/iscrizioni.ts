import type { CellaXlsx, FoglioXlsx } from "@/lib/export-xlsx";
import { dataDaIso, giornoRomaDaIso, perNomeAtleta, siNo, type AtletaExport } from "./comune";

// Story 28.2 (Epic 28): composizione del foglio "Iscrizioni", separata dal
// formato .xlsx come per i Certificati (Story 28.1) e riusabile
// dall'export complessivo (Story 28.4).

export type AtletaIscrizioniExport = AtletaExport & {
  categoria: string | null;
  email: string | null;
  cellulare: string | null;
};

// Solo le Iscrizioni attive dell'Anno Agonistico corrente
// (elencaIscrizioniPerAnno filtra gia' attiva=true): un'Atleta esclusa
// risulta "No", come in pagina.
export type IscrizioneExport = {
  atletaId: string;
  confermataIl: string;
};

export function componiExportIscrizioni(
  atlete: AtletaIscrizioniExport[],
  iscrizioni: IscrizioneExport[],
  gruppiPerAtleta: Map<string, string[]>
): FoglioXlsx {
  const iscrizionePerAtleta = new Map(iscrizioni.map((i) => [i.atletaId, i]));

  const righe = [...atlete].sort(perNomeAtleta).map((atleta): CellaXlsx[] => {
    const iscrizione = iscrizionePerAtleta.get(atleta.id);
    return [
      atleta.nome,
      atleta.codiceFiscale,
      dataDaIso(atleta.dataNascita),
      atleta.categoria,
      (gruppiPerAtleta.get(atleta.id) ?? []).join(", "),
      siNo(!!iscrizione),
      giornoRomaDaIso(iscrizione?.confermataIl),
      atleta.email,
      atleta.cellulare,
    ];
  });

  return {
    nome: "Iscrizioni",
    intestazioni: [
      "Atleta",
      "Codice fiscale",
      "Data di nascita",
      "Categoria",
      "Gruppo",
      "Iscritta",
      "Data iscrizione",
      "Email",
      "Cellulare",
    ],
    righe,
  };
}
