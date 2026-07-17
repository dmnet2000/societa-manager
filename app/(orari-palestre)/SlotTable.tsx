import { ETICHETTA_GIORNO } from "@/lib/giorno-settimana";
import type { GiornoSettimana } from "@prisma/client";

type SlotRiga = {
  id: string;
  giorno: GiornoSettimana;
  oraInizio: string;
  oraFine: string;
  campo: { nome: string; palestra: { nome: string } };
  gruppo: { nome: string };
};

// Story 2.8: tabella Slot condivisa (Giorno/Orario/Palestra-Campo/Gruppo) -
// terza pagina (slot/, mio-orario/, orari/) a renderizzare lo stesso
// identico formato, estratta per evitare una quarta copia divergente
// (review Story 2.8). `messaggioVuoto` opzionale: slot/page.tsx non ne ha
// mai avuto uno (mostra sempre la tabella, anche vuota) - passarlo solo
// dove serve, senza cambiare il comportamento esistente di quella pagina.
export function SlotTable({
  slot,
  messaggioVuoto,
}: {
  slot: SlotRiga[];
  messaggioVuoto?: string;
}) {
  if (slot.length === 0 && messaggioVuoto) {
    return <p>{messaggioVuoto}</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Giorno</th>
          <th>Orario</th>
          <th>Palestra / Campo</th>
          <th>Gruppo</th>
        </tr>
      </thead>
      <tbody>
        {slot.map((s) => (
          <tr key={s.id}>
            <td>{ETICHETTA_GIORNO[s.giorno]}</td>
            <td>
              {s.oraInizio}–{s.oraFine}
            </td>
            <td>
              {s.campo.palestra.nome} - {s.campo.nome}
            </td>
            <td>{s.gruppo.nome}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
