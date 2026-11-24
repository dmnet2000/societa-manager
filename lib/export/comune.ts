// Story 28.1 (Epic 28): helper condivisi dalle composizioni degli export.

export type AtletaExport = {
  id: string;
  nome: string;
  codiceFiscale: string;
  dataNascita: string | null;
};

// Le date arrivano come stringhe ISO da supabase-js: Date vera per Excel
// (cella formattata gg/mm/aaaa), null se assente o non valida.
export function dataDaIso(valore: string | null | undefined): Date | null {
  if (!valore) return null;
  const data = new Date(valore);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function siNo(valore: boolean): string {
  return valore ? "Sì" : "No";
}

// Ordine dei file: per nome Atleta, stesso confronto delle tabelle
// ordinabili (italiano, senza distinzione di maiuscole/accenti).
export function perNomeAtleta(a: { nome: string }, b: { nome: string }): number {
  return a.nome.localeCompare(b.nome, "it", { sensitivity: "base", numeric: true });
}

// Story 28.2: un timestamp (es. Iscrizione.confermataIl) diventa il giorno
// di calendario sul fuso di Roma, a mezzanotte UTC come le altre date
// dell'app - stesso giorno mostrato in pagina ("Iscritta il ..."), anche
// per una conferma alle 00:30 ora italiana (ancora il giorno prima in UTC).
export function giornoRomaDaIso(valore: string | null | undefined): Date | null {
  const data = dataDaIso(valore);
  if (!data) return null;
  const giorno = data.toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
  return new Date(`${giorno}T00:00:00.000Z`);
}
