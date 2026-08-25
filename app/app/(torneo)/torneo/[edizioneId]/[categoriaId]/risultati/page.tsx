import Link from "next/link";
import { notFound } from "next/navigation";
import {
  trovaCategoriaTorneoPerId,
  elencaSquadreTorneo,
  elencaPartiteTorneo,
} from "@/lib/torneo";
import { calcolaClassificaGirone } from "@/lib/classifica-girone-torneo";
import { GIRONI_TORNEO } from "@/lib/girone-torneo";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { GeneraCalendarioGironiForm } from "./GeneraCalendarioGironiForm";
import { RisultatoPartitaTorneoForm } from "./RisultatoPartitaTorneoForm";
import styles from "../../../torneo.module.css";

// Story 20.3 (Epic 20, Torneo Memorial): mirror di
// app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/page.tsx per il 404 su
// id inesistente/non corrispondente. Dati mutabili in tempo reale
// (generazione calendario/inserimento risultati tramite Server Action sulla
// stessa pagina, classifica sempre ricalcolata al volo) - stesso motivo
// delle altre pagine Torneo.
export const dynamic = "force-dynamic";

export default async function RisultatiTorneoPage({
  params,
}: {
  params: Promise<{ edizioneId: string; categoriaId: string }>;
}) {
  const { edizioneId, categoriaId } = await params;

  // Le tre risoluzioni non dipendono l'una dall'altra - eseguite in
  // Promise.all, stesso principio gia' stabilito altrove nel progetto.
  // elencaSquadreTorneo/elencaPartiteTorneo su un categoriaId inesistente
  // restituiscono semplicemente un array vuoto, nessun problema a lanciarle
  // in parallelo al controllo di esistenza sotto.
  const [ruoli, categoria, squadre, partite] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaCategoriaTorneoPerId(categoriaId),
    elencaSquadreTorneo(categoriaId),
    elencaPartiteTorneo(categoriaId),
  ]);

  // Un id inesistente/gia' eliminato, O una Categoria esistente ma sotto
  // un'altra Edizione (edizioneId nell'URL non corrispondente) - 404 in
  // entrambi i casi, stesso comportamento di ogni altra pagina di
  // dettaglio del progetto raggiunta per id.
  if (!categoria || categoria.edizioneTorneoId !== edizioneId) {
    notFound();
  }

  const squadreGironeA = squadre.filter((s) => s.girone === "GIRONE_A");
  const squadreGironeB = squadre.filter((s) => s.girone === "GIRONE_B");
  const squadrePerGirone = { GIRONE_A: squadreGironeA, GIRONE_B: squadreGironeB } as const;

  // Il calendario esiste per questa Categoria se e solo se almeno una
  // PartitaTorneo e' gia' stata generata (generaCalendarioGironiAction crea
  // sempre tutte le coppie di entrambi i gironi in un'unica azione, mai
  // parzialmente) - basta questo per decidere quale delle due viste
  // mostrare.
  const calendarioGenerato = partite.length > 0;

  return (
    <main>
      <Link
        className={styles.link}
        href={`/app/torneo/${edizioneId}/${categoriaId}`}
      >
        ← Torna alla Categoria
      </Link>
      <TitoloPagina
        titolo={`Risultati: ${categoria.nome}`}
        contenuto={contenutoPerRotta("/app/torneo", ruoli)}
      />

      {/* Story 20.4: link sempre visibile verso il tabellone
          semifinali/finali - quella pagina spiega da sola se la classifica
          di girone non e' ancora completa per generarlo. */}
      <p className={styles.riepilogo}>
        <Link
          className={styles.link}
          href={`/app/torneo/${edizioneId}/${categoriaId}/tabellone`}
        >
          Tabellone semifinali/finali →
        </Link>
      </p>

      {!calendarioGenerato ? (
        <section className={styles.sezione}>
          <p className={styles.riepilogo}>
            Girone A: {squadreGironeA.length} squadre · Girone B: {squadreGironeB.length}{" "}
            squadre.
            {(squadreGironeA.length < 2 || squadreGironeB.length < 2) && (
              <>
                {" "}
                Servono almeno 2 squadre in ciascun girone per generare il calendario degli
                incontri.
              </>
            )}
          </p>
          <GeneraCalendarioGironiForm categoriaTorneoId={categoriaId} />
        </section>
      ) : (
        GIRONI_TORNEO.map((girone) => {
          const squadreDelGirone = squadrePerGirone[girone.value];
          // Story 20.4: filtro esteso con "fase === GIRONE" - da quando il
          // tabellone di semifinale/finale (Story 20.4) puo' generare
          // PartitaTorneo cross-girone per la stessa Categoria, senza
          // questo filtro finirebbero mescolate qui (la fase GIRONE non
          // esisteva ancora quando questo filtro e' stato scritto in Story
          // 20.3).
          const partiteDelGirone = partite.filter(
            (p) => p.fase === "GIRONE" && p.squadraCasa.girone === girone.value
          );
          // Classifica MAI persistita - ricalcolata al volo da qui a ogni
          // caricamento della pagina (spec-20-3 Design Notes).
          const classifica = calcolaClassificaGirone(squadreDelGirone, partiteDelGirone);

          return (
            <section key={girone.value} className={styles.sezione}>
              <h2>{girone.label}</h2>

              <h3>Incontri</h3>
              {partiteDelGirone.length === 0 ? (
                <p className={styles.messaggioVuoto}>Nessun incontro in questo girone.</p>
              ) : (
                partiteDelGirone.map((partita) => (
                  <RisultatoPartitaTorneoForm key={partita.id} partita={partita} />
                ))
              )}

              <h3>Classifica</h3>
              <table className={styles.tabella}>
                <thead>
                  <tr>
                    <th>Squadra</th>
                    <th>Punti</th>
                    <th>Partite giocate</th>
                    <th>Set vinti</th>
                    <th>Set persi</th>
                  </tr>
                </thead>
                <tbody>
                  {classifica.map((riga) => (
                    <tr key={riga.squadra.id}>
                      <td>{riga.squadra.nome}</td>
                      <td>{riga.punti}</td>
                      <td>{riga.partiteGiocate}</td>
                      <td>{riga.setVinti}</td>
                      <td>{riga.setPersi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })
      )}
    </main>
  );
}
