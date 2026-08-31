// Story 20.18 (Epic 20, Torneo Memorial): encoding condiviso
// "palestraId|campoId" per la checklist Palestra x Campo della fase GIRONE
// (spec-20-18 Design Notes: "semplice da costruire/parsare, nessun carattere
// speciale in gioco essendo entrambi UUID"). Estratto qui - plain, nessuna
// direttiva "use client"/"use server" - perche' riusato da tre punti
// indipendenti che altrimenti reimplementerebbero la stessa convenzione:
// NuovoSlotTorneoForm.tsx (costruisce il value della checkbox, client),
// app/app/(torneo)/torneo/actions.ts (parsa formData.getAll, server action),
// lib/torneo.ts (costruisce la chiave del Set delle combinazioni valide,
// creaSlotTorneoPerSelezione). campoId null <=> "" nella stringa codificata -
// una Palestra senza Campi censiti produce sempre "palestraId|" (mai
// "palestraId" senza il separatore).
export function codificaSelezioneSlotGirone(
  palestraId: string,
  campoId: string | null
): string {
  return `${palestraId}|${campoId ?? ""}`;
}

// Inversa di codificaSelezioneSlotGirone - tollerante verso un valore senza
// alcun separatore "|" (dato manomesso/malformato: mai un crash, il valore
// intero diventa il palestraId, campoId null). Una stringa vuota dopo il
// separatore torna null (mai ""), stessa convenzione di codifica sopra.
export function decodificaSelezioneSlotGirone(valore: string): {
  palestraId: string;
  campoId: string | null;
} {
  const indiceSeparatore = valore.indexOf("|");
  if (indiceSeparatore === -1) {
    return { palestraId: valore, campoId: null };
  }
  const palestraId = valore.slice(0, indiceSeparatore);
  const campoId = valore.slice(indiceSeparatore + 1);
  return { palestraId, campoId: campoId || null };
}
