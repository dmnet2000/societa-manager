// Story 2.12: estratta da app/(gruppi-allenatori)/gruppi/page.tsx (ramo di
// sola lettura Segreteria) - stesso principio "raggruppa per display, mai
// inline nella pagina" gia' seguito da ogni altro raggruppamento del
// progetto (raggruppaPartitePerGruppo, raggruppaGruppiPerCategoria,
// raggruppaPerSettimana, raggruppaSponsorPerTipo, raggruppaSlotPerGruppo).
// Mirror strutturale di raggruppaSlotPerGruppo ("gruppo-first": riceve
// l'elenco COMPLETO dei Gruppi, gia' ordinato a monte con
// orderBy: { nome: "asc" }, come unica fonte di verita' di quali sezioni
// mostrare - un Gruppo senza Atlete resta comunque nel risultato con un
// array atlete vuoto, mai filtrato via). A differenza di
// raggruppaSlotPerGruppo, qui l'associazione Atleta non e' un campo gia'
// presente sull'entita' (Slot ha `gruppo` incluso via Prisma) ma passa per
// una riga di giunzione separata (GruppoAtleta, letta via Prisma diretto,
// AD-9) unita a un Map di Atlete lette via RLS (elencaAtlete) - da qui il
// parametro atletaPerId invece di un include diretto.
export type GruppoConAtlete<G, A> = {
  gruppo: G;
  atlete: A[];
};

export function raggruppaAtletePerGruppo<
  G extends { id: string },
  A extends { id: string; nome: string },
>(
  gruppi: G[],
  gruppoAtleteRows: { gruppoId: string; atletaId: string }[],
  atletaPerId: Map<string, A>
): GruppoConAtlete<G, A>[] {
  return gruppi.map((gruppo) => {
    const atlete = gruppoAtleteRows
      .filter((riga) => riga.gruppoId === gruppo.id)
      .map((riga) => atletaPerId.get(riga.atletaId))
      .filter((atleta): atleta is A => atleta !== undefined)
      // Secondo criterio di ordinamento (id) per un risultato deterministico
      // quando due Atlete dello stesso Gruppo condividono lo stesso nome -
      // stesso ordinamento gia' applicato inline nel ramo Segreteria prima
      // di questa story (spec-2-12 I/O Matrix).
      .sort((a, b) => a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id));

    return { gruppo, atlete };
  });
}
