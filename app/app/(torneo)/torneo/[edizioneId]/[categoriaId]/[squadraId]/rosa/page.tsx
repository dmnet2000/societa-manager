import Link from "next/link";
import { notFound } from "next/navigation";
import {
  trovaCategoriaTorneoPerId,
  trovaEdizioneTorneoPerId,
  trovaSquadraTorneoPerId,
} from "@/lib/torneo";
import { parametriEffettivi } from "@/lib/parametri-formato";
import { leggiRosa } from "@/lib/db-rls/rosa";
import { createClient } from "@/lib/supabase/server";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { RosaSquadraForm } from "./RosaSquadraForm";
import styles from "../../../../torneo.module.css";

// Referto elettronico, story 3.9 (AD-6): rosa di una Squadra dal sito.
// Protetta dal route guard di /app/torneo (ADMIN, DIRIGENTE); l'azione
// ricontrolla ruolo e appartenenza. Rose lette con la sessione (RLS).
export const dynamic = "force-dynamic";

export default async function RosaSquadraPage({
  params,
}: {
  params: Promise<{ edizioneId: string; categoriaId: string; squadraId: string }>;
}) {
  const { edizioneId, categoriaId, squadraId } = await params;

  const [ruoli, edizione, categoria, squadra] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaEdizioneTorneoPerId(edizioneId),
    trovaCategoriaTorneoPerId(categoriaId),
    trovaSquadraTorneoPerId(squadraId),
  ]);

  if (
    !edizione ||
    !categoria ||
    !squadra ||
    categoria.edizioneTorneoId !== edizioneId ||
    squadra.categoriaTorneoId !== categoriaId
  ) {
    notFound();
  }

  const supabase = await createClient();
  const rosa = await leggiRosa(supabase, squadraId);
  const parametri = parametriEffettivi(edizione.parametriFormato, categoria.parametriFormato);
  const versione = rosa?.versione ?? 0;

  return (
    <main>
      <Link className={styles.link} href={`/app/torneo/${edizione.id}/${categoria.id}`}>
        ← Torna alla Categoria
      </Link>
      <TitoloPagina
        titolo={`Rosa: ${squadra.nome} (${categoria.nome})`}
        contenuto={contenutoPerRotta("/app/torneo", ruoli)}
      />
      <p className={styles.riepilogo}>
        Versione attuale: <strong>{versione}</strong>
        {versione === 0 && " (rosa non ancora inserita)"}. Regole: al massimo{" "}
        <strong>{parametri.rosaMax}</strong> giocatori, da <strong>{parametri.liberiMin}</strong> a{" "}
        <strong>{parametri.liberiMax}</strong> liberi, numeri di maglia diversi, un solo capitano.
        La rosa è condivisa con i tablet.
      </p>
      <section className={styles.sezione}>
        <RosaSquadraForm
          edizioneTorneoId={edizione.id}
          categoriaTorneoId={categoria.id}
          squadraTorneoId={squadra.id}
          versioneBase={versione}
          giocatoriIniziali={(rosa?.giocatori ?? []).map((g) => ({
            numero: String(g.numero),
            nome: g.nome,
            cognome: g.cognome,
            capitano: g.capitano,
            libero: g.libero,
          }))}
          tesseratiIniziali={(rosa?.tesserati ?? []).map((t) => ({ ruolo: t.ruolo, nome: t.nome }))}
        />
      </section>
    </main>
  );
}
