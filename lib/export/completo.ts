import type { CellaXlsx, FoglioXlsx } from "@/lib/export-xlsx";
import type { ColonnaTesseramento } from "@/lib/tesseramento";
import type { AtletaAnagraficaExport } from "@/lib/db-rls/atleta";
import { dataDaIso, giornoRomaDaIso, perNomeAtleta, siNo } from "./comune";
import { statoCertificatoExport, type CertificatoExport } from "./certificati";
import type { IscrizioneExport } from "./iscrizioni";
import { federazioniTesseramentoExport } from "./tesseramenti";

// Story 28.4 (Epic 28): export complessivo, una riga per Atleta con
// anagrafica, Gruppi, certificato, iscrizione e tesseramento. Nessuna
// logica di stato propria: stato certificato, data di iscrizione e
// federazioni passano dalle stesse funzioni degli export di sezione
// (Story 28.1-28.3), cosi' i file non possono divergere.

export type DatiExportCompleto = {
  atlete: AtletaAnagraficaExport[];
  certificati: CertificatoExport[];
  iscrizioni: IscrizioneExport[];
  tesseramenti: Map<string, string[]>;
  colonneFederazioni: ColonnaTesseramento[];
  gruppiPerAtleta: Map<string, string[]>;
};

export function componiExportCompleto(dati: DatiExportCompleto, oggi: Date): FoglioXlsx {
  const certificatoPerAtleta = new Map(dati.certificati.map((c) => [c.atletaId, c]));
  const iscrizionePerAtleta = new Map(dati.iscrizioni.map((i) => [i.atletaId, i]));

  const righe = [...dati.atlete].sort(perNomeAtleta).map((atleta): CellaXlsx[] => {
    const certificato = certificatoPerAtleta.get(atleta.id);
    const iscrizione = iscrizionePerAtleta.get(atleta.id);
    const federazioni = federazioniTesseramentoExport(
      atleta.id,
      dati.tesseramenti,
      dati.colonneFederazioni
    );
    return [
      atleta.nome,
      atleta.codiceFiscale,
      atleta.sesso,
      dataDaIso(atleta.dataNascita),
      atleta.luogoNascita,
      atleta.provinciaNascita,
      atleta.indirizzo,
      atleta.cap,
      atleta.localitaResidenza,
      atleta.provinciaResidenza,
      atleta.email,
      atleta.cellulare,
      atleta.categoria,
      atleta.matricola,
      (dati.gruppiPerAtleta.get(atleta.id) ?? []).join(", "),
      statoCertificatoExport(certificato, oggi),
      dataDaIso(certificato?.dataFineValidita),
      siNo(!!iscrizione),
      giornoRomaDaIso(iscrizione?.confermataIl),
      siNo(federazioni.length > 0),
      federazioni.map((f) => f.etichetta).join(", "),
    ];
  });

  return {
    nome: "Export completo",
    intestazioni: [
      "Atleta",
      "Codice fiscale",
      "Sesso",
      "Data di nascita",
      "Luogo di nascita",
      "Provincia di nascita",
      "Indirizzo",
      "CAP",
      "Località",
      "Provincia",
      "Email",
      "Cellulare",
      "Categoria",
      "Matricola",
      "Gruppo",
      "Stato certificato",
      "Fine validità certificato",
      "Iscritta",
      "Data iscrizione",
      "Tesserata",
      "Federazioni",
    ],
    righe,
  };
}
