import Link from "next/link";
import { notFound } from "next/navigation";
import { trovaEdizioneTorneoPerId, elencaCategorieTorneo } from "@/lib/torneo";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { createClient } from "@/lib/supabase/server";
import { leggiInfoVolantinoTorneo, urlPubblicoVolantinoTorneo } from "@/lib/storage/volantino-torneo";
import { NuovaCategoriaTorneoForm } from "../NuovaCategoriaTorneoForm";
import { CategoriaTorneoRow } from "../CategoriaTorneoRow";
import { VolantinoTorneoForm } from "./VolantinoTorneoForm";
import styles from "../torneo.module.css";

// Story 20.1 (Epic 20, Torneo Memorial): mirror di
// app/(configurazione)/pagine-pubbliche/[id]/page.tsx per il 404 su id
// inesistente, e di app/(orari-palestre)/slot/page.tsx per lo schema
// form-di-creazione + tabella. Dati mutabili in tempo reale (creazione/
// modifica/cancellazione Categoria tramite Server Action sulla stessa
// pagina) - stesso motivo di /app/torneo.
export const dynamic = "force-dynamic";

export default async function EdizioneTorneoPage({
  params,
}: {
  params: Promise<{ edizioneId: string }>;
}) {
  const { edizioneId } = await params;

  // Le risoluzioni non dipendono l'una dall'altra - eseguite in Promise.all,
  // stesso principio gia' stabilito altrove nel progetto (review fix Story
  // 17.2, mirror app/(orari-palestre)/slot/page.tsx). elencaCategorieTorneo
  // su un edizioneId inesistente restituisce semplicemente un array vuoto,
  // nessun problema a lanciarla in parallelo al controllo di esistenza
  // sotto. Story 20.5: supabase risolto qui (serve anche a
  // leggiInfoVolantinoTorneo/urlPubblicoVolantinoTorneo, quest'ultima usata
  // in modo sincrono nel JSX sotto) - stesso principio "risolvi il client
  // una volta, riusalo" gia' stabilito in impostazioni/page.tsx.
  const [ruoli, edizione, categorie, supabase] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaEdizioneTorneoPerId(edizioneId),
    elencaCategorieTorneo(edizioneId),
    createClient(),
  ]);

  // Un id inesistente/gia' eliminato (link obsoleto, doppia scheda con
  // un'eliminazione nel frattempo) - 404, stesso comportamento di ogni
  // altra pagina di dettaglio del progetto raggiunta per id.
  if (!edizione) {
    notFound();
  }

  // Story 20.5: stesso pattern fail-soft di leggiInfoFotoHero/leggiInfoLogoPolisportiva
  // in impostazioni/page.tsx - un errore Storage transitorio non deve far
  // fallire l'intera pagina, solo nascondere l'anteprima del volantino.
  const volantino = await leggiInfoVolantinoTorneo(supabase, edizione.id).catch((err) => {
    console.error(err);
    return { esiste: false, aggiornatoIl: null };
  });

  return (
    <main>
      {/* Review fix (Blind Hunter, Story 20.1): nessun percorso in-pagina
          per tornare all'elenco delle Edizioni prima di questo link. */}
      <Link className={styles.link} href="/app/torneo">
        ← Torna alle Edizioni
      </Link>
      <TitoloPagina
        titolo={`${edizione.nome} ${edizione.anno}`}
        contenuto={contenutoPerRotta("/app/torneo", ruoli)}
      />

      <section className={styles.sezione}>
        <h2>Volantino</h2>
        <VolantinoTorneoForm
          edizioneTorneoId={edizione.id}
          edizioneNome={edizione.nome}
          edizioneAnno={edizione.anno}
          volantinoEsiste={volantino.esiste}
          volantinoUrl={urlPubblicoVolantinoTorneo(supabase, edizione.id)}
          volantinoAggiornatoIl={volantino.aggiornatoIl}
        />
      </section>

      {/* Story 20.9 (Epic 20, Torneo Memorial): link verso la gestione
          Slot orari/Palestre dell'Edizione - mirror del link "Categorie"
          nella riga Edizione di ../page.tsx. */}
      <p className={styles.riepilogo}>
        <Link className={styles.link} href={`/app/torneo/${edizione.id}/slot`}>
          Slot orari/Palestre →
        </Link>
      </p>

      <section className={styles.sezione}>
        <h2>Nuova Categoria</h2>
        <NuovaCategoriaTorneoForm edizioneTorneoId={edizione.id} />
      </section>

      <section className={styles.sezione}>
        <h2>Elenco Categorie</h2>
        {categorie.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessuna Categoria inserita.</p>
        ) : (
          <table className={styles.tabella}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Settimana</th>
                <th>Numero massimo squadre</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {categorie.map((categoria) => (
                <CategoriaTorneoRow key={categoria.id} categoria={categoria} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
