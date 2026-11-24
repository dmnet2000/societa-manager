import type { StatoCertificato } from "@prisma/client";
import { categorizzaStatoCertificato } from "@/app/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato";
import type { CellaXlsx, FoglioXlsx } from "@/lib/export-xlsx";
import { dataDaIso, perNomeAtleta, siNo, type AtletaExport } from "./comune";

// Story 28.1 (Epic 28): composizione del foglio "Certificati", separata dal
// formato .xlsx (testabile senza generare il file) e riusata dall'export
// complessivo (Story 28.4) tramite statoCertificatoExport.

export type CertificatoExport = {
  atletaId: string;
  stato: StatoCertificato;
  filePath: string | null;
  dataInizioValidita: string | null;
  dataFineValidita: string | null;
  mesiValidita: number | null;
};

// Stesse due sezioni della pagina: senza Certificato o IN_ATTESA -> "Da
// confermare" / "Senza certificato"; CONFERMATO -> stesso stato di scadenza
// del badge di CertificatoConfermatoRow (categorizzaStatoCertificato). Un
// Certificato confermato senza data di fine valida resta "Senza
// certificato", come in pagina.
export function statoCertificatoExport(
  certificato: CertificatoExport | undefined,
  oggi: Date
): string {
  if (!certificato) return "Senza certificato";
  if (certificato.stato === "IN_ATTESA") return "Da confermare";
  switch (
    categorizzaStatoCertificato(certificato.dataFineValidita, certificato.stato, oggi)
  ) {
    case "IN_REGOLA":
      return "In regola";
    case "IN_SCADENZA":
      return "In scadenza";
    case "SCADUTO":
      return "Scaduto";
    case "SENZA_CERTIFICATO":
      return "Senza certificato";
  }
}

export function componiExportCertificati(
  atlete: AtletaExport[],
  certificati: CertificatoExport[],
  gruppiPerAtleta: Map<string, string[]>,
  oggi: Date
): FoglioXlsx {
  const certificatoPerAtleta = new Map(certificati.map((c) => [c.atletaId, c]));

  const righe = [...atlete].sort(perNomeAtleta).map((atleta): CellaXlsx[] => {
    const certificato = certificatoPerAtleta.get(atleta.id);
    return [
      atleta.nome,
      atleta.codiceFiscale,
      dataDaIso(atleta.dataNascita),
      (gruppiPerAtleta.get(atleta.id) ?? []).join(", "),
      statoCertificatoExport(certificato, oggi),
      dataDaIso(certificato?.dataInizioValidita),
      dataDaIso(certificato?.dataFineValidita),
      certificato?.mesiValidita ?? null,
      siNo(!!certificato?.filePath),
    ];
  });

  return {
    nome: "Certificati",
    intestazioni: [
      "Atleta",
      "Codice fiscale",
      "Data di nascita",
      "Gruppo",
      "Stato",
      "Inizio validità",
      "Fine validità",
      "Mesi di validità",
      "File caricato",
    ],
    righe,
  };
}
