import { dataEstesaRigaPartita, partiDataRigaPartita } from "@/lib/data-riga-partita";
import { costruisciLinkNaviga } from "@/lib/link-naviga-palestra";
import { testoScuroSuSfondo } from "@/lib/colore-testo-leggibile";
import {
  normalizzaColoreCampionato,
  testoOppureNull,
  type RigaPartitaProps,
} from "@/lib/props-riga-partita";
import styles from "./riga-partita.module.css";

// Story 18.35: "riga partita" in stile Match Week (grafica social
// _bmad-output/planning-artifacts/ux-designs/stile.jpg), unico componente
// server presentazionale riusato in /calendario (vista Elenco), home
// "Partite della settimana" e home "Risultati della settimana scorsa".
// Sostituisce le tre card match-card precedenti (duplicate in due CSS
// module). Vedi DESIGN.md -> Componenti -> "Riga partita Match Week".
// Tipi e mappature riga -> props in lib/props-riga-partita.ts (testabili).
export type { DestraRigaPartita, RigaPartitaProps } from "@/lib/props-riga-partita";

export function RigaPartita({
  data,
  campionatoNome,
  colore,
  squadraCasa,
  squadraOspite,
  impianto,
  indirizzoImpianto,
  destra,
}: RigaPartitaProps) {
  // Un solo colore normalizzato sia per lo sfondo sia per la scelta della
  // tavolozza del testo: i due non possono divergere.
  const sfondo = normalizzaColoreCampionato(colore);
  const classiRiga = testoScuroSuSfondo(sfondo)
    ? `${styles.riga} ${styles.testoScuro}`
    : styles.riga;
  const dataRiga = partiDataRigaPartita(data);
  const dataEstesa = dataEstesaRigaPartita(data);
  const linkNaviga = costruisciLinkNaviga({ indirizzo: indirizzoImpianto });
  const nomeImpianto = testoOppureNull(impianto);

  return (
    <div className={classiRiga} style={{ backgroundColor: sfondo }}>
      {/* Blocco data sempre rosso (decisione utente 2026-09-30), anche
          quando la data non e' parsabile: in quel caso resta vuoto, la
          riga viene comunque mostrata. Le tre parti visive sono
          aria-hidden: lo screen reader legge la data estesa. */}
      <div className={styles.data}>
        {dataRiga && (
          <time dateTime={data} className={styles.dataTesto}>
            <span className={styles.dataGiorno} aria-hidden="true">
              {dataRiga.giorno}
            </span>
            <span className={styles.dataNumero} aria-hidden="true">
              {dataRiga.numero}
            </span>
            <span className={styles.dataMese} aria-hidden="true">
              {dataRiga.mese}
            </span>
            {dataEstesa && <span className={styles.srOnly}>{dataEstesa}</span>}
          </time>
        )}
      </div>

      <div className={styles.corpo}>
        <div className={styles.campionato}>{campionatoNome}</div>
        <div className={styles.squadre}>
          <span className={styles.squadra}>{squadraCasa}</span>
          <span className={styles.squadra}>
            <span className={styles.vs}>vs</span> {squadraOspite}
          </span>
        </div>
        {(nomeImpianto || linkNaviga) && (
          <div className={styles.palestra}>
            {nomeImpianto && <span className={styles.nomePalestra}>{nomeImpianto}</span>}
            {linkNaviga && (
              <a
                className={styles.linkNaviga}
                href={linkNaviga}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Naviga verso ${nomeImpianto ?? "il luogo della partita"}`}
              >
                Naviga
              </a>
            )}
          </div>
        )}
      </div>

      <div className={styles.destra}>
        <ColonnaDestra destra={destra} />
      </div>
    </div>
  );
}

// Valori vuoti o di soli spazi valgono come assenti: mai un contorno vuoto.
function ColonnaDestra({ destra }: { destra: RigaPartitaProps["destra"] }) {
  if (destra.tipo === "ora") {
    const ora = testoOppureNull(destra.valore);
    return ora ? (
      <span className={styles.contorno}>{ora}</span>
    ) : (
      <span className={styles.statoRisultato}>Orario da definire</span>
    );
  }

  const risultato = testoOppureNull(destra.risultato);
  const stato = testoOppureNull(destra.stato);
  const ora = testoOppureNull(destra.ora);
  return (
    <>
      {risultato ? (
        <span className={styles.contorno}>{risultato}</span>
      ) : (
        <span className={styles.statoRisultato}>{stato ?? "Risultato non disponibile"}</span>
      )}
      {/* Review: l'orario della gara non va perso nei Risultati - in
          piccolo sotto il risultato, la colonna resta il risultato. */}
      {ora && <span className={styles.oraSecondaria}>ore {ora}</span>}
    </>
  );
}
