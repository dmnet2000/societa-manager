// Story 2.9 (review fix, Verification Gap Reviewer): estratta dalla vista
// /app/orari - stesso principio gia' seguito per ogni raggruppamento di
// questo progetto (raggruppaPartitePerGruppo, raggruppaGruppiPerCategoria,
// raggruppaPerSettimana, raggruppaSponsorPerTipo, raggruppaPerTipo:
// "funzione pura, estratta per essere testabile in isolamento - nessuna
// pagina di questo progetto viene mai testata direttamente"). A differenza
// di raggruppaPartitePerGruppo (Story 10.9, "item-first": i Gruppi emergono
// dagli Slot stessi, un Gruppo senza Slot non comparirebbe), questa e'
// "gruppo-first": riceve l'elenco COMPLETO dei Gruppi della stagione (gia'
// ordinato a monte, orderBy: { nome: "asc" }) come unica fonte di verita' di
// quali sezioni mostrare - un Gruppo senza Slot resta comunque nel
// risultato con un array slot vuoto, mai filtrato via (spec-2-9 Boundaries
// "Always": "mai una sezione sparita in silenzio"). Il filtro opzionale per
// un singolo Gruppo (gruppoId dalla query string di /app/orari) e' applicato
// qui sui Gruppi stessi - la query Prisma di "gruppi" in quella pagina non
// lo applica (solo quella di Slot lo fa, a monte, sulle righe).
export type GruppoConSlot<G, S> = {
  gruppo: G;
  slot: S[];
};

export function raggruppaSlotPerGruppo<
  G extends { id: string },
  S extends { gruppo: { id: string } },
>(gruppi: G[], slot: S[], gruppoId: string): GruppoConSlot<G, S>[] {
  const gruppiSelezionati = gruppoId ? gruppi.filter((g) => g.id === gruppoId) : gruppi;
  return gruppiSelezionati.map((gruppo) => ({
    gruppo,
    slot: slot.filter((s) => s.gruppo.id === gruppo.id),
  }));
}
