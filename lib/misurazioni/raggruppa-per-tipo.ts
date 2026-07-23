import type { Misurazione } from "@/lib/db-rls/misurazione-atleta";

export type GruppoMisurazioni = {
  tipo: string;
  unitaMisura: string;
  punti: Misurazione[];
};

// Story 6.2 (AC #1/#2/#3/#4): raggruppa uno storico gia' ordinato
// cronologicamente (leggiMisurazioniPerAtleta, Story 6.1) per "tipo",
// preservando l'ordine di prima comparsa - nessun sort aggiuntivo necessario.
// I gruppi con meno di 2 punti sono esclusi (AC #3: dato insufficiente per un
// grafico) - la riga resta comunque visibile nella tabella storico esistente,
// solo il grafico viene omesso per quel tipo.
//
// Chiave di raggruppamento normalizzata (trim + lowercase, review fix): "tipo"
// e' testo libero digitato dall'utente (Story 6.1) - senza normalizzazione,
// "Altezza" e "altezza " finirebbero in due gruppi separati, ciascuno
// potenzialmente sotto la soglia di 2 punti, sopprimendo silenziosamente un
// grafico che l'utente si aspetterebbe di vedere. Il testo mostrato resta
// pero' quello della PRIMA occorrenza incontrata (stessa scelta gia' fatta
// per unitaMisura), non una forma normalizzata.
export function raggruppaPerTipo(misurazioni: Misurazione[]): GruppoMisurazioni[] {
  const gruppi = new Map<string, GruppoMisurazioni>();

  for (const misurazione of misurazioni) {
    const chiave = misurazione.tipo.trim().toLowerCase();
    const esistente = gruppi.get(chiave);
    if (esistente) {
      esistente.punti.push(misurazione);
    } else {
      gruppi.set(chiave, {
        tipo: misurazione.tipo,
        unitaMisura: misurazione.unitaMisura,
        punti: [misurazione],
      });
    }
  }

  return Array.from(gruppi.values()).filter((gruppo) => gruppo.punti.length >= 2);
}
