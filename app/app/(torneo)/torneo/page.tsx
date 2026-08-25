import Link from "next/link";
import { elencaEdizioniTorneo } from "@/lib/torneo";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovaEdizioneTorneoForm } from "./NuovaEdizioneTorneoForm";
import { EliminaEdizioneTorneoForm } from "./EliminaEdizioneTorneoForm";
import styles from "./torneo.module.css";

// Story 20.1 (Epic 20, Torneo Memorial): dati mutabili in tempo reale
// (creazione/cancellazione Edizione tramite Server Action sulla stessa
// pagina) - stesso motivo di /slot, /admin, /palestre.
export const dynamic = "force-dynamic";

export default async function TorneoPage() {
  const [ruoli, edizioni] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    elencaEdizioniTorneo(),
  ]);

  return (
    <main>
      <TitoloPagina titolo="Torneo" contenuto={contenutoPerRotta("/app/torneo", ruoli)} />

      <section className={styles.sezione}>
        <h2>Nuova Edizione</h2>
        <NuovaEdizioneTorneoForm />
      </section>

      <section className={styles.sezione}>
        <h2>Elenco Edizioni</h2>
        {edizioni.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessuna Edizione inserita.</p>
        ) : (
          <table className={styles.tabella}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Anno</th>
                <th>Categorie</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {edizioni.map((edizione) => (
                <tr key={edizione.id}>
                  <td>{edizione.nome}</td>
                  <td>{edizione.anno}</td>
                  <td>
                    <Link className={styles.link} href={`/app/torneo/${edizione.id}`}>
                      {edizione._count.categorie === 0
                        ? "Nessuna Categoria"
                        : `${edizione._count.categorie} Categorie`}
                    </Link>
                  </td>
                  <td>
                    <EliminaEdizioneTorneoForm
                      edizioneId={edizione.id}
                      nome={edizione.nome}
                      anno={edizione.anno}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
