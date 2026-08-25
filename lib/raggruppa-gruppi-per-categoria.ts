// Story 18.24: raggruppa i Gruppi (gia' ordinati per Gruppo.ordine, Story
// 19.15, dal chiamante) in blocchi visivi per categoria su /squadre -
// funzione pura, estratta per essere testabile in isolamento, stesso
// principio gia' seguito da lib/raggruppa-per-settimana.ts (nessuna pagina
// di questo progetto viene mai testata direttamente).
//
// Un nuovo blocco inizia ogni volta che "categoria" cambia rispetto
// all'elemento IMMEDIATAMENTE precedente nell'array - non un raggruppamento
// globale per categoria: se la stessa categoria riappare piu' avanti non
// contigua nell'ordine (es. "Serie D", "Under 14", "Serie D"), forma un
// blocco separato con la stessa intestazione. Comportamento esplicitamente
// accettato (vedi I/O matrix di spec-18-24 e spec-19-15), non un bug -
// l'ordine e' una scelta libera del Site Manager in /app/ordine-squadre,
// nessuna lista di categorie fissata nel codice.
export type BloccoCategoria<T> = {
  categoria: string;
  gruppi: T[];
};

export function raggruppaGruppiPerCategoriaContigua<T extends { categoria: string }>(
  gruppi: T[]
): BloccoCategoria<T>[] {
  const blocchi: BloccoCategoria<T>[] = [];

  for (const gruppo of gruppi) {
    const bloccoCorrente = blocchi[blocchi.length - 1];
    if (bloccoCorrente && bloccoCorrente.categoria === gruppo.categoria) {
      bloccoCorrente.gruppi.push(gruppo);
    } else {
      blocchi.push({ categoria: gruppo.categoria, gruppi: [gruppo] });
    }
  }

  return blocchi;
}
