// Story 10.9: raggruppa un elenco di Partite (gia' ordinate per data/ora,
// stesso array passato a raggruppaPerSettimana) per Gruppo - usata per la
// sezione "a scomparsa" di /app/partite, aggiuntiva rispetto alla vista
// settimana-per-settimana esistente (Story 10.3), mai un rimpiazzo.
// L'ordine cronologico dell'array in input si conserva per costruzione
// dentro ogni gruppo (una Map preserva l'ordine di inserimento, nessun
// sort aggiuntivo necessario) - nessuna assunzione fatta qui su come
// l'array e' stato ordinato a monte, solo che l'ordine relativo va
// preservato.
export type GruppoPartite<T> = {
  gruppoId: string;
  gruppoNome: string;
  partite: T[];
};

// Review fix (Blind Hunter): i Gruppi vanno ordinati con lo stesso criterio
// gia' scelto dal Site Manager altrove nel progetto (Gruppo.ordine, Story
// 19.15, elencaGruppiOrdinati - orderBy [{ ordine: "asc" }, { nome: "asc" }])
// invece di un ordine alfabetico indipendente, che tra l'altro non e'
// nemmeno numeric-aware ("Under 13" ordinerebbe prima di "Under 9").
export function raggruppaPartitePerGruppo<
  T extends { gruppoId: string; gruppo: { nome: string; ordine: number } },
>(partite: T[]): GruppoPartite<T>[] {
  const mappa = new Map<string, GruppoPartite<T> & { ordine: number }>();

  for (const partita of partite) {
    const esistente = mappa.get(partita.gruppoId);
    if (esistente) {
      esistente.partite.push(partita);
    } else {
      mappa.set(partita.gruppoId, {
        gruppoId: partita.gruppoId,
        gruppoNome: partita.gruppo.nome,
        ordine: partita.gruppo.ordine,
        partite: [partita],
      });
    }
  }

  return Array.from(mappa.values()).sort(
    (a, b) => a.ordine - b.ordine || a.gruppoNome.localeCompare(b.gruppoNome)
  );
}
