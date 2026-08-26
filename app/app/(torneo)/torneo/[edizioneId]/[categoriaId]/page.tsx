import Link from "next/link";
import { notFound } from "next/navigation";
import {
  trovaCategoriaTorneoPerId,
  elencaSquadreTorneo,
  trovaEdizioneTorneoPerId,
} from "@/lib/torneo";
import { etichettaSettimanaPersonalizzata } from "@/lib/settimana-torneo";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovaSquadraTorneoForm } from "./NuovaSquadraTorneoForm";
import { SquadraTorneoRow } from "./SquadraTorneoRow";
import styles from "../../torneo.module.css";

// Story 20.2 (Epic 20, Torneo Memorial): mirror di
// app/app/(torneo)/torneo/[edizioneId]/page.tsx - stesso schema
// form-di-creazione + tabella, stesso 404 su id inesistente. Dati mutabili
// in tempo reale (iscrizione/modifica/cancellazione Squadra tramite Server
// Action sulla stessa pagina) - stesso motivo di /app/torneo/[edizioneId].
export const dynamic = "force-dynamic";

export default async function CategoriaTorneoPage({
  params,
}: {
  params: Promise<{ edizioneId: string; categoriaId: string }>;
}) {
  const { edizioneId, categoriaId } = await params;

  // Le quattro risoluzioni non dipendono l'una dall'altra - eseguite in
  // Promise.all, stesso principio gia' stabilito in
  // [edizioneId]/page.tsx. elencaSquadreTorneo su un categoriaId
  // inesistente restituisce semplicemente un array vuoto, nessun problema a
  // lanciarla in parallelo al controllo di esistenza sotto. Story 20.13:
  // trovaEdizioneTorneoPerId aggiunta ora che questa pagina mostra l'etichetta
  // di Settimana personalizzata (etichettaSettimanaPersonalizzata, sotto) -
  // prima non caricava mai l'Edizione, solo la Categoria.
  const [ruoli, categoria, squadre, edizione] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaCategoriaTorneoPerId(categoriaId),
    elencaSquadreTorneo(categoriaId),
    trovaEdizioneTorneoPerId(edizioneId),
  ]);

  // Un id inesistente/gia' eliminato (link obsoleto, doppia scheda con
  // un'eliminazione nel frattempo), O una Categoria esistente ma sotto
  // un'altra Edizione (edizioneId nell'URL non corrispondente - stesso
  // principio anti-mismatch gia' applicato alle Server Action scoped su
  // id+parent) - 404 in entrambi i casi, stesso comportamento di ogni altra
  // pagina di dettaglio del progetto raggiunta per id. Story 20.13:
  // un'Edizione non trovata (caso limite: cancellata concorrentemente tra la
  // verifica del vincolo FK e questa lettura) e' trattata allo stesso modo -
  // mai un crash su edizione.nomeSettimana1/2 sotto.
  if (!categoria || categoria.edizioneTorneoId !== edizioneId || !edizione) {
    notFound();
  }

  return (
    <main>
      <Link className={styles.link} href={`/app/torneo/${edizioneId}`}>
        ← Torna alle Categorie
      </Link>
      <TitoloPagina
        titolo={categoria.nome}
        contenuto={contenutoPerRotta("/app/torneo", ruoli)}
      />
      {/* Review fix (Blind Hunter, Story 20.2): mostra quante Squadre sono
          gia' iscritte rispetto al massimo, invece di far scoprire il
          limite solo dopo un tentativo rifiutato. */}
      <p className={styles.riepilogo}>
        {etichettaSettimanaPersonalizzata(categoria.settimana, edizione)} · {squadre.length} /{" "}
        {categoria.numeroMassimoSquadre} squadre iscritte
      </p>

      {/* Story 20.3: link sempre visibile (anche con Squadre insufficienti
          per generare il calendario) - la pagina dei risultati spiega da
          sola se mancano ancora Squadre sufficienti in uno dei due gironi. */}
      <p className={styles.riepilogo}>
        <Link className={styles.link} href={`/app/torneo/${edizioneId}/${categoriaId}/risultati`}>
          Risultati e classifica →
        </Link>
      </p>

      <section className={styles.sezione}>
        <h2>Nuova Squadra</h2>
        <NuovaSquadraTorneoForm categoriaTorneoId={categoria.id} />
      </section>

      <section className={styles.sezione}>
        <h2>Elenco Squadre</h2>
        {squadre.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessuna Squadra iscritta.</p>
        ) : (
          <table className={styles.tabella}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Girone</th>
                <th>Referente</th>
                <th>Contatto</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {squadre.map((squadra) => (
                <SquadraTorneoRow key={squadra.id} squadra={squadra} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
