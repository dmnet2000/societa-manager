import type { TipoSponsor } from "@prisma/client";

export type SponsorVetrina = {
  id: string;
  nome: string;
  tipo: TipoSponsor;
  descrizione: string;
  // Review fix (2026-08-09, Blind Hunter): serve per il cache-busting
  // dell'URL pubblico dell'immagine (stesso principio di SponsorRow.tsx/
  // logo/page.tsx) - senza, la vetrina puo' continuare a mostrare
  // un'immagine sostituita dall'Admin mentre la gestione si aggiorna gia'.
  updatedAt: string;
};

export type SponsorRaggruppati = {
  banner: SponsorVetrina[];
  convenzioni: SponsorVetrina[];
};

// AC #1: Banner pubblicitari e Convenzioni visivamente distinti - separati
// qui in due elenchi invece che con un badge per riga, cosi' la pagina puo'
// renderli come due sezioni distinte. Pura, testata senza mock Prisma - il
// filtro `attiva: true` resta a livello di query (page.tsx), qui arrivano
// gia' solo Sponsor attivi.
export function raggruppaSponsorPerTipo(
  sponsorList: SponsorVetrina[]
): SponsorRaggruppati {
  return {
    banner: sponsorList.filter((s) => s.tipo === "BANNER"),
    convenzioni: sponsorList.filter((s) => s.tipo === "CONVENZIONE"),
  };
}
