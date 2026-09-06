// Story 20.25 (Epic 20, Torneo Memorial, review fix - Verification Gap
// Reviewer): estratta da NuovoSlotTorneoForm.tsx e SlotTorneoRow.tsx, che la
// duplicavano identica - entrambe calcolano i Campi della Palestra
// correntemente selezionata nel proprio form, per decidere se mostrare (e
// come popolare) il <select> Campo condizionale. Un'unica fonte di verita',
// stesso principio gia' seguito da codificaSelezioneSlotGirone
// (lib/selezione-slot-girone.ts) per l'altra convenzione condivisa fra gli
// stessi due file. Generica sul tipo di Campo (<C>) - i due file hanno tipi
// locali "Palestra"/"Campo" leggermente diversi (es. SlotTorneoRow.tsx non
// ha bisogno di altro che id/nome), nessuna dipendenza di tipo aggiuntiva
// imposta qui.
export function campiDellaPalestraSelezionata<C>(
  palestre: { id: string; campi: C[] }[],
  palestraId: string
): C[] {
  return palestre.find((p) => p.id === palestraId)?.campi ?? [];
}
