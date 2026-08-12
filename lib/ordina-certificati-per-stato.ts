import type { StatoCertificatoAggregato } from "@/app/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato";

// Story 9.25: priorita' di visualizzazione quando l'ordinamento per stato e'
// attivo in /conferma-certificati - Scaduto prima di tutto (piu' urgente),
// poi In scadenza, poi In regola. SENZA_CERTIFICATO non e' raggiungibile in
// pratica per la sezione "Confermati" (Story 9.23) ma incluso per
// completezza del tipo, ultimo.
const PRIORITA_STATO: Record<StatoCertificatoAggregato, number> = {
  SCADUTO: 0,
  IN_SCADENZA: 1,
  IN_REGOLA: 2,
  SENZA_CERTIFICATO: 3,
};

export function ordinaPerPrioritaStato<
  T extends { stato: StatoCertificatoAggregato; nome: string },
>(righe: T[]): T[] {
  return [...righe].sort((a, b) => {
    const diff = PRIORITA_STATO[a.stato] - PRIORITA_STATO[b.stato];
    if (diff !== 0) return diff;
    return a.nome.localeCompare(b.nome, "it");
  });
}
