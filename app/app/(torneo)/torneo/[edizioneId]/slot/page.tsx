import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { trovaEdizioneTorneoPerId, elencaSlotTorneo } from "@/lib/torneo";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovoSlotTorneoForm } from "../../NuovoSlotTorneoForm";
import { SlotTorneoRow } from "../../SlotTorneoRow";
import styles from "../../torneo.module.css";

// Story 20.9 (Epic 20, Torneo Memorial): mirror di
// app/app/(torneo)/torneo/[edizioneId]/page.tsx (sezione Categorie) per il
// 404 su id inesistente e lo schema form-di-creazione + tabella. Dati
// mutabili in tempo reale (creazione/cancellazione Slot tramite Server
// Action sulla stessa pagina) - stesso motivo di ogni altra pagina Torneo.
export const dynamic = "force-dynamic";

export default async function SlotTorneoPage({
  params,
}: {
  params: Promise<{ edizioneId: string }>;
}) {
  const { edizioneId } = await params;

  // Le risoluzioni non dipendono l'una dall'altra - eseguite in Promise.all,
  // stesso principio gia' stabilito altrove nel progetto (mirror
  // [edizioneId]/page.tsx). Story 20.18: include esteso con "campi" (stesso
  // pattern gia' in uso in app/(orari-palestre)/palestre/page.tsx) - serve
  // alla checklist Palestra x Campo di NuovoSlotTorneoForm.tsx.
  const [ruoli, edizione, slot, palestre] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaEdizioneTorneoPerId(edizioneId),
    elencaSlotTorneo(edizioneId),
    prisma.palestra.findMany({
      orderBy: { nome: "asc" },
      include: { campi: { orderBy: { nome: "asc" } } },
    }),
  ]);

  // Un id inesistente/gia' eliminato (link obsoleto, doppia scheda con
  // un'eliminazione nel frattempo) - 404, stesso comportamento di ogni altra
  // pagina di dettaglio del progetto raggiunta per id.
  if (!edizione) {
    notFound();
  }

  return (
    <main>
      <Link className={styles.link} href={`/app/torneo/${edizione.id}`}>
        ← Torna all&apos;Edizione
      </Link>
      <TitoloPagina
        titolo={`Slot: ${edizione.nome} ${edizione.anno}`}
        contenuto={contenutoPerRotta("/app/torneo", ruoli)}
      />

      <section className={styles.sezione}>
        <h2>Nuovo Slot</h2>
        <NuovoSlotTorneoForm edizioneTorneoId={edizione.id} palestre={palestre} />
      </section>

      <section className={styles.sezione}>
        <h2>Elenco Slot</h2>
        {slot.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessuno Slot inserito.</p>
        ) : (
          <table className={styles.tabella}>
            <thead>
              <tr>
                <th>Etichetta</th>
                <th>Data</th>
                <th>Ora</th>
                {/* Story 20.18 (review fix, Blind Hunter): rinominata da
                    "Palestra" - la cella puo' ora mostrare anche il Campo
                    ("Palestra - Campo", SlotTorneoRow.tsx). */}
                <th>Palestra / Campo</th>
                <th>Fase</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {slot.map((s) => (
                <SlotTorneoRow key={s.id} slot={s} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
