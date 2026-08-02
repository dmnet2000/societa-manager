// Review fix (Story 9.26): estratto perche' duplicato identico in
// vista-dirigente/page.tsx (Story 5.1) e vista-allenatore/page.tsx (Story
// 9.26) - stesso principio di estrazione gia' seguito nel progetto per altre
// utility condivise (lib/link-naviga-palestra.ts, lib/data-italiana.ts).
const GIORNO_BREVE: Record<string, string> = {
  LUNEDI: "Lun",
  MARTEDI: "Mar",
  MERCOLEDI: "Mer",
  GIOVEDI: "Gio",
  VENERDI: "Ven",
  SABATO: "Sab",
  DOMENICA: "Dom",
};

export function formattaSlotOrario(slot: {
  giorno: string;
  oraInizio: string;
  oraFine: string;
  campo: { nome: string; palestra: { nome: string } };
}): string {
  return `${GIORNO_BREVE[slot.giorno] ?? slot.giorno} ${slot.oraInizio}-${slot.oraFine} · ${slot.campo.palestra.nome} - ${slot.campo.nome}`;
}
