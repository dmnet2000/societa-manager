import type { Misurazione } from "@/lib/db-rls/misurazione-atleta";

// Story 9.16 (AC #4): tocca SOLO la vista a grafico (GraficoMisurazione.tsx,
// Story 6.2) - la tabella storico continua a mostrare ogni riga, invariata.
// Con un solo punto per data (Peso/Altezza/Reach/"Altro", caso di oggi) e'
// un no-op. Raggruppa per "data" (stringa "YYYY-MM-DD", uguaglianza diretta -
// formato gia' garantito da FORMATO_DATA in actions.ts) e tiene solo il
// valore piu' alto per gruppo (i due parametri a piu' tentativi, salto con
// rincorsa/salto a muro, sono test di elevazione: piu' alto e' sempre
// meglio - non una regola generale per ogni "tipo" futuro, vedi Dev Notes).
// Preserva l'ordine cronologico gia' garantito da leggiMisurazioniPerAtleta
// (Story 6.1): la Map itera nell'ordine di primo inserimento delle chiavi.
export function riduciMiglioreProData(punti: Misurazione[]): Misurazione[] {
  const migliorePerData = new Map<string, Misurazione>();

  for (const punto of punti) {
    const esistente = migliorePerData.get(punto.data);
    if (!esistente || punto.valore > esistente.valore) {
      migliorePerData.set(punto.data, punto);
    }
  }

  return Array.from(migliorePerData.values());
}
