export type AtletaComposizione = {
  id: string;
  nome: string;
  iscritta: boolean;
  // Etichette (sigla, o nome) delle Federazioni del Tesseramento nella
  // stagione corrente - vuoto = non tesserata.
  federazioni: string[];
};

export type GruppoComposizione = {
  id: string;
  nome: string;
  categoria: string;
  atlete: AtletaComposizione[];
  numeroIscritte: number;
  numeroTesserate: number;
};

// Funzione pura: unisce in memoria i dati letti da fonti diverse (Gruppo/
// GruppoAtleta via Prisma, Atleta/Iscrizione via RLS, Tesseramento via
// lib/tesseramento.ts) senza mai attraversare relazioni con un include -
// stesso principio di gruppi/page.tsx. "atlete" arriva da elencaAtlete(),
// che esclude le Atlete rimosse: una riga GruppoAtleta che punta a
// un'Atleta non presente lì viene saltata, fuori sia dall'elenco sia dai
// conteggi.
export function componiGruppi(
  gruppi: { id: string; nome: string; categoria: string }[],
  righeGruppoAtleta: { gruppoId: string; atletaId: string }[],
  atlete: { id: string; nome: string }[],
  idAtleteIscritte: Set<string>,
  federazioniPerAtleta: Map<string, string[]>
): GruppoComposizione[] {
  const atletaPerId = new Map(atlete.map((a) => [a.id, a]));

  return gruppi.map((gruppo) => {
    const atleteDelGruppo: AtletaComposizione[] = [];
    for (const riga of righeGruppoAtleta) {
      if (riga.gruppoId !== gruppo.id) continue;
      const atleta = atletaPerId.get(riga.atletaId);
      if (!atleta) continue;
      atleteDelGruppo.push({
        id: atleta.id,
        nome: atleta.nome,
        iscritta: idAtleteIscritte.has(atleta.id),
        federazioni: federazioniPerAtleta.get(atleta.id) ?? [],
      });
    }
    atleteDelGruppo.sort((a, b) => a.nome.localeCompare(b.nome));

    return {
      id: gruppo.id,
      nome: gruppo.nome,
      categoria: gruppo.categoria,
      atlete: atleteDelGruppo,
      numeroIscritte: atleteDelGruppo.filter((a) => a.iscritta).length,
      numeroTesserate: atleteDelGruppo.filter((a) => a.federazioni.length > 0).length,
    };
  });
}
