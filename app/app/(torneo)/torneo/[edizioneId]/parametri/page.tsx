import Link from "next/link";
import { notFound } from "next/navigation";
import { trovaEdizioneTorneoPerId, elencaCategorieTorneo } from "@/lib/torneo";
import { chiaviValide, parametriEffettivi, PARAMETRI_FORMATO_DEFAULT } from "@/lib/parametri-formato";
import { CAMPI_MODULO, type ChiaveModulo } from "@/lib/parametri-formato-modulo";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { salvaParametriEdizioneAction, salvaParametriCategoriaAction } from "../../actions";
import { ParametriFormatoForm, type CampoParametro } from "./ParametriFormatoForm";
import styles from "../../torneo.module.css";

// Referto elettronico, story 3.8 (AD-5): parametri del formato di gara
// dell'Edizione e eccezioni per Categoria. Protetta dal route guard di
// /app/torneo (ADMIN, DIRIGENTE); le Server Action ricontrollano il ruolo.
export const dynamic = "force-dynamic";

function campiPer(
  impostati: Partial<Record<ChiaveModulo, number>>,
  effettivi: { [K in ChiaveModulo]: number },
  daEdizione?: Partial<Record<ChiaveModulo, number>>
): CampoParametro[] {
  return CAMPI_MODULO.map(({ chiave, etichetta }) => ({
    chiave,
    etichetta,
    impostato: impostati[chiave] === undefined ? "" : String(impostati[chiave]),
    effettivo: effettivi[chiave],
    ereditaDa:
      daEdizione?.[chiave] !== undefined
        ? `eredita dall'Edizione: ${daEdizione[chiave]}`
        : `default: ${PARAMETRI_FORMATO_DEFAULT[chiave]}`,
  }));
}

export default async function ParametriFormatoPage({
  params,
}: {
  params: Promise<{ edizioneId: string }>;
}) {
  const { edizioneId } = await params;

  const [ruoli, edizione, categorie] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaEdizioneTorneoPerId(edizioneId),
    elencaCategorieTorneo(edizioneId),
  ]);

  if (!edizione) {
    notFound();
  }

  return (
    <main>
      <Link className={styles.link} href={`/app/torneo/${edizione.id}`}>
        ← Torna all&apos;Edizione
      </Link>
      <TitoloPagina
        titolo={`Parametri del formato: ${edizione.nome} ${edizione.anno}`}
        contenuto={contenutoPerRotta("/app/torneo", ruoli)}
      />

      <section className={styles.sezione}>
        <h2>Edizione</h2>
        <p className={styles.riepilogo}>
          Lascia vuoto un campo per usare il valore di default. Il tablet riceve i parametri al
          successivo &quot;Aggiorna&quot; dell&apos;elenco gare.
        </p>
        <ParametriFormatoForm
          action={salvaParametriEdizioneAction}
          campiNascosti={{ edizioneTorneoId: edizione.id }}
          idPrefisso="parametri-edizione"
          campi={campiPer(
            chiaviValide(edizione.parametriFormato),
            parametriEffettivi(edizione.parametriFormato, null)
          )}
        />
      </section>

      {categorie.length === 0 ? (
        <p className={styles.messaggioVuoto}>Nessuna Categoria in questa Edizione.</p>
      ) : (
        categorie.map((categoria) => (
          <section className={styles.sezione} key={categoria.id}>
            <h2>{categoria.nome}</h2>
            <ParametriFormatoForm
              action={salvaParametriCategoriaAction}
              campiNascosti={{ edizioneTorneoId: edizione.id, categoriaTorneoId: categoria.id }}
              idPrefisso={`parametri-${categoria.id}`}
              campi={campiPer(
                chiaviValide(categoria.parametriFormato),
                parametriEffettivi(edizione.parametriFormato, categoria.parametriFormato),
                chiaviValide(edizione.parametriFormato)
              )}
            />
          </section>
        ))
      )}
    </main>
  );
}
