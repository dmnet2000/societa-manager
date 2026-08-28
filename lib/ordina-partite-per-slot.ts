// Story 20.17 (Epic 20, Torneo Memorial): richiesta esplicita dell'utente -
// le griglie di incontri (.matchGrid, pagina pubblica /torneo) mostrano oggi
// le PartitaTorneo nell'ordine di generazione/query, non per data/ora dello
// Slot assegnato. SlotTorneo.data/ora sono stringhe (prisma/schema.prisma),
// gia' in un formato lessicograficamente ordinabile (stesso principio gia'
// sfruttato da elencaSlotTorneo, lib/torneo.ts: `orderBy: [{ data: "asc" },
// { ora: "asc" }]`). Una Partita senza Slot ancora assegnato (slotTorneo:
// null, mostra "In programma" senza data/ora) finisce sempre in fondo, dopo
// tutte quelle con Slot - confermato con l'utente in fase di pianificazione
// (Array.sort e' stabile: due Partite entrambe senza Slot mantengono il
// proprio ordine relativo originale).
type PartitaConSlot = {
  slotTorneo: { data: string; ora: string } | null;
};

export function ordinaPartitePerSlot<T extends PartitaConSlot>(partite: T[]): T[] {
  return [...partite].sort((a, b) => {
    if (!a.slotTorneo && !b.slotTorneo) return 0;
    if (!a.slotTorneo) return 1;
    if (!b.slotTorneo) return -1;
    const diffData = a.slotTorneo.data.localeCompare(b.slotTorneo.data);
    if (diffData !== 0) return diffData;
    return a.slotTorneo.ora.localeCompare(b.slotTorneo.ora);
  });
}
