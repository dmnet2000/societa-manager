import { testoScuroSuSfondo } from "@/lib/colore-testo-leggibile";
import { normalizzaColoreCampionato, testoOppureNull } from "@/lib/props-riga-partita";
import type { RigaClassificaFipav } from "@/lib/sincronizza-gare-fipav/parser";
import {
  eNostraSquadra,
  type ClassificaVista,
} from "@/lib/sincronizza-gare-fipav/vista-home-live";
import { TabellaOrdinabile } from "@/app/TabellaOrdinabile";
import type { ValoreOrdinamento } from "@/lib/ordina-tabella";
import styles from "./classifiche.module.css";

// Story 18.36: una classifica di /classifiche in stile Match Week. Dopo
// l'anteprima l'utente (2026-10-02) ha scelto di restare con la tabella
// compatta, senza righe separate: tabella trasparente sullo sfondo blu,
// titolo su una fascia obliqua del colore del Campionato, posizione in un
// quadratino rosso, Punti in risalto, nostra squadra evidenziata.
// Server Component presentazionale, estratto da page.tsx per essere
// testabile con renderToStaticMarkup. Ordine delle righe = quello del portale.

// Le 10 colonne dopo Pos./Squadra/Punti, nell'ordine del portale FIPAV.
const COLONNE: { campo: keyof RigaClassificaFipav; sigla: string; nome: string }[] = [
  { campo: "partiteGiocate", sigla: "PG", nome: "Partite Giocate" },
  { campo: "partiteVinte", sigla: "PV", nome: "Partite Vinte" },
  { campo: "partitePerse", sigla: "PP", nome: "Partite Perse" },
  { campo: "setFatti", sigla: "SF", nome: "Set Fatti" },
  { campo: "setSubiti", sigla: "SS", nome: "Set Subiti" },
  { campo: "quozienteSet", sigla: "QS", nome: "Quoziente Set" },
  { campo: "puntiFatti", sigla: "PF", nome: "Punti Fatti" },
  { campo: "puntiSubiti", sigla: "PS", nome: "Punti Subiti" },
  { campo: "quozientePunti", sigla: "QP", nome: "Quoziente Punti" },
  { campo: "penalizzazione", sigla: "Penal.", nome: "Penalizzazione" },
];

// I valori del portale sono testo ("12", "1,250", "—"): ordinati come
// numeri quando lo sono (virgola decimale italiana), altrimenti come testo.
function valoreNumericoOTesto(testo: string | null | undefined): ValoreOrdinamento {
  const pulito = testoOppureNull(testo);
  if (pulito === null) return null;
  const numero = Number(pulito.replace(",", "."));
  return Number.isFinite(numero) ? numero : pulito;
}

export function ClassificaMatchWeek({ classifica }: { classifica: ClassificaVista }) {
  const idTitolo = `classifica-${classifica.campionatoId}`;
  // Un solo colore normalizzato per sfondo della fascia e tavolozza del
  // testo (stesso principio della riga partita, Story 18.35).
  const coloreFascia = normalizzaColoreCampionato(classifica.campionatoColore);
  const classiFascia = testoScuroSuSfondo(coloreFascia)
    ? `${styles.fasciaTitolo} ${styles.fasciaTestoScuro}`
    : styles.fasciaTitolo;
  // Una sola riga evidenziata per classifica: la PRIMA che corrisponde alla
  // nostra squadra (due righe con lo stesso nome normalizzato sarebbero un
  // errore del portale, mai due righe "nostre").
  const indiceNostra = classifica.righe.findIndex((riga) =>
    eNostraSquadra(riga.squadra, classifica.nostraSquadra)
  );
  // Solo il nome del Campionato (richiesta utente 2026-10-12): il nome del
  // Gruppo era ridondante nel titolo.
  const titolo = classifica.campionatoNome;

  return (
    <section aria-labelledby={idTitolo}>
      <h2 className={classiFascia} id={idTitolo} style={{ backgroundColor: coloreFascia }}>
        {titolo}
      </h2>
      {/* 13 colonne non stanno a 375px: scorre solo questo contenitore, mai
          la pagina. tabIndex + nome accessibile: raggiungibile e scorribile
          da tastiera. */}
      <div
        className={styles.scorrimentoTabella}
        tabIndex={0}
        role="region"
        aria-label={`Tabella ${titolo}`}
      >
        <TabellaOrdinabile
          className={styles.tabellaClassifica}
          didascalia={<caption className={styles.srOnly}>Classifica {titolo}</caption>}
          colonne={[
            { etichetta: "Posizione", contenuto: "Pos." },
            { etichetta: "Squadra" },
            { etichetta: "Punti", className: styles.colonnaPunti },
            ...COLONNE.map(({ sigla, nome }) => ({
              etichetta: nome,
              contenuto: <abbr title={nome}>{sigla}</abbr>,
            })),
          ]}
          righe={classifica.righe.map((riga, indice) => {
            const nostra = indice === indiceNostra;
            // Posizione/squadra obbligatorie nel parser, ma una stringa di
            // soli spazi resta possibile: mai un quadratino vuoto.
            const posizione = testoOppureNull(riga.posizione) ?? "—";
            return {
              chiave: `${classifica.campionatoId}-${riga.posizione}-${indice}`,
              valori: [
                valoreNumericoOTesto(riga.posizione),
                testoOppureNull(riga.squadra),
                valoreNumericoOTesto(riga.punti),
                ...COLONNE.map(({ campo }) => valoreNumericoOTesto(riga[campo])),
              ],
              riga: (
                <tr className={nostra ? styles.rigaNostra : undefined}>
                  <td>
                    <span className={styles.posizione}>{posizione}</span>
                  </td>
                  <th scope="row" className={styles.squadra}>
                    {testoOppureNull(riga.squadra) ?? "—"}
                    {nostra && <span className={styles.srOnly}>, la nostra squadra</span>}
                  </th>
                  <td className={styles.colonnaPunti}>{testoOppureNull(riga.punti) ?? "—"}</td>
                  {COLONNE.map(({ campo }) => (
                    <td key={campo}>{testoOppureNull(riga[campo]) ?? "—"}</td>
                  ))}
                </tr>
              ),
            };
          })}
        />
      </div>
    </section>
  );
}
