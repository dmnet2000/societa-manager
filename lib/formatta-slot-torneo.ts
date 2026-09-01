// Story 20.19 (Epic 20, Torneo Memorial): estratto da MetaSlot
// (app/torneo/page.tsx) - stessa forma dati/stessa stringa mostrata dentro
// ogni match-card, ora riusata anche dalla vista tabellare di tutti gli
// incontri di una Categoria (TabellaIncontriCategoria.tsx). Nessun import
// "server-only": funzione pura, nessun IO.
export type SlotPubblico = {
  etichetta: string;
  data: string;
  ora: string;
  palestra: {
    nome: string;
    indirizzo: string | null;
    latitudine: number | null;
    longitudine: number | null;
  };
  campo: { nome: string } | null;
};

export function formattaSlotTestoBreve(slot: SlotPubblico): string {
  const suffissoCampo = slot.campo ? ` - ${slot.campo.nome}` : "";
  return `${slot.etichetta} · ${slot.data} ${slot.ora} · ${slot.palestra.nome}${suffissoCampo}`;
}
