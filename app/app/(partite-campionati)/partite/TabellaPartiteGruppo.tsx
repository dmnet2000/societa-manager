"use client";

import { useId, useState } from "react";
import { parseDataUtc } from "@/lib/raggruppa-per-settimana";
import { costruisciLinkNaviga } from "@/lib/link-naviga-palestra";
import styles from "./partite.module.css";

type PartitaGruppo = {
  id: string;
  data: string;
  ora: string;
  squadraCasa: string;
  squadraOspite: string;
  impianto: string | null;
  indirizzoImpianto: string | null;
  campionatoNome: string;
};

// Review fix: timeZone: "UTC" esplicito - stesso identico principio di
// formattaData in page.tsx (mai una seconda implementazione indipendente
// di questo stesso parsing/formattazione).
function formattaData(data: string): string {
  return parseDataUtc(data).toLocaleDateString("it-IT", { timeZone: "UTC" });
}

// Story 10.9: mirror di TabellaIncontriCategoria.tsx (Story 20.19, sito
// pubblico Torneo) per la MECCANICA (bottone + tabella aggiuntiva che
// affianca la vista settimana-per-settimana esistente, Story 10.3, senza
// mai sostituirla; nascosta di default; stato indipendente per Gruppo, un
// componente per istanza, nessuno stato condiviso; sola lettura anche per
// chi puo' modificare altrove, nessuna colonna Azioni) - NON per lo stile
// del bottone, che qui riusa il registro "secondario" gia' in uso in
// questa stessa pagina (.bottoneSecondario) invece del bottone primario
// del sito pubblico, coerente con il resto di /app/partite.
export function TabellaPartiteGruppo({
  partite,
  gruppoNome,
}: {
  partite: PartitaGruppo[];
  gruppoNome: string;
}) {
  const [visibile, setVisibile] = useState(false);
  const idTabella = useId();

  const etichettaPulsante = visibile
    ? `Nascondi tutte le partite di ${gruppoNome}`
    : `Mostra tutte le partite di ${gruppoNome}`;

  return (
    <section className={styles.sezioneTabellaGruppo}>
      <button
        type="button"
        className={styles.bottoneTabellaGruppo}
        onClick={() => setVisibile((v) => !v)}
        aria-expanded={visibile}
        aria-controls={idTabella}
      >
        {etichettaPulsante}
      </button>

      {visibile && (
        <div id={idTabella} className={styles.scrollWrapper}>
          <table className={styles.tabella}>
            <caption className={styles.srOnly}>
              Tutte le partite di {gruppoNome}
            </caption>
            <thead>
              <tr>
                <th scope="col">Giorno</th>
                <th scope="col">Ora</th>
                <th scope="col">Squadre</th>
                <th scope="col">Luogo</th>
                <th scope="col">Campionato</th>
              </tr>
            </thead>
            <tbody>
              {partite.map((partita) => {
                const linkNaviga = costruisciLinkNaviga({
                  indirizzo: partita.indirizzoImpianto,
                });
                return (
                  <tr key={partita.id}>
                    <td>{formattaData(partita.data)}</td>
                    <td>{partita.ora}</td>
                    <td>
                      {partita.squadraCasa} - {partita.squadraOspite}
                    </td>
                    <td>
                      {partita.impianto}
                      {linkNaviga && (
                        <>
                          {" "}
                          <a
                            className={styles.linkNaviga}
                            href={linkNaviga}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Naviga verso ${partita.impianto ?? "il luogo della partita"}`}
                          >
                            Naviga
                          </a>
                        </>
                      )}
                    </td>
                    <td>{partita.campionatoNome}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
