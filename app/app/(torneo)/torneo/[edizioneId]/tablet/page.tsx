import Link from "next/link";
import { notFound } from "next/navigation";
import { trovaEdizioneTorneoPerId } from "@/lib/torneo";
import { elencaGareConAssegnazioneTablet, elencaTablet } from "@/lib/assegnazioni-tablet";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { TabellaOrdinabile } from "@/app/TabellaOrdinabile";
import { AssegnazioneTabletRow, type GaraConTablet } from "./AssegnazioneTabletRow";
import { nomeTablet } from "./tablet-menu";
import styles from "../../torneo.module.css";

// Referto elettronico, story 2.5 (AD-2): assegnazione delle gare
// dell'Edizione ai tablet del referto elettronico - mirror di
// [edizioneId]/slot/page.tsx (404 su id inesistente, TitoloPagina con la
// guida di /app/torneo, TabellaOrdinabile). Protetta dal route guard di
// /app/torneo (ADMIN, DIRIGENTE); la Server Action ricontrolla il ruolo.
export const dynamic = "force-dynamic";

export default async function TabletTorneoPage({
  params,
}: {
  params: Promise<{ edizioneId: string }>;
}) {
  const { edizioneId } = await params;

  const [ruoli, edizione, gare, tablet] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaEdizioneTorneoPerId(edizioneId),
    elencaGareConAssegnazioneTablet(edizioneId),
    elencaTablet(),
  ]);

  if (!edizione) {
    notFound();
  }

  const righe: GaraConTablet[] = gare.map((g) => ({
    id: g.id,
    edizioneTorneoId: g.edizioneTorneoId,
    numero: g.numero,
    categoria: g.categoriaTorneo.nome,
    casa: g.squadraCasa.nome,
    ospite: g.squadraOspite.nome,
    slot: g.slotTorneo
      ? `${g.slotTorneo.data} ${g.slotTorneo.ora} — ${g.slotTorneo.palestra.nome}${
          g.slotTorneo.campo ? ` - ${g.slotTorneo.campo.nome}` : ""
        }`
      : null,
    tablet: g.assegnazioneTablet?.utente ?? null,
    epoca: g.assegnazioneTablet?.epoca ?? null,
  }));

  return (
    <main>
      <Link className={styles.link} href={`/app/torneo/${edizione.id}`}>
        ← Torna all&apos;Edizione
      </Link>
      <TitoloPagina
        titolo={`Tablet del referto: ${edizione.nome} ${edizione.anno}`}
        contenuto={contenutoPerRotta("/app/torneo", ruoli)}
      />

      <section className={styles.sezione}>
        {!tablet.some((t) => t.attivo) && (
          <p className={styles.messaggioVuoto}>
            Nessun tablet attivo: crealo da Amministrazione con &quot;Nuovo tablet&quot;, oppure
            riattiva un tablet disattivato.
          </p>
        )}
        {righe.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessuna gara generata in questa Edizione.</p>
        ) : (
          <TabellaOrdinabile
            className={styles.tabella}
            colonne={[
              { etichetta: "Gara" },
              { etichetta: "Categoria" },
              { etichetta: "Incontro" },
              { etichetta: "Slot" },
              { etichetta: "Tablet" },
              { etichetta: "Epoca" },
            ]}
            righe={righe.map((r) => ({
              chiave: r.id,
              valori: [
                r.numero,
                r.categoria,
                `${r.casa} ${r.ospite}`,
                r.slot,
                r.tablet ? nomeTablet(r.tablet.email) : null,
                r.epoca,
              ],
              riga: <AssegnazioneTabletRow gara={r} tablet={tablet} />,
            }))}
          />
        )}
      </section>
    </main>
  );
}
