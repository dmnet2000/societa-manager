import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaIscrizioniPerAnno } from "@/lib/db-rls/iscrizione";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { prisma } from "@/lib/prisma";
import { TesseramentoRow } from "./TesseramentoRow";
import styles from "./conferma-tesseramenti.module.css";

// Dati mutabili in tempo reale (conferme via Server Action sulla stessa
// pagina) - stesso motivo di /conferma-iscrizioni, Story 1.6.
export const dynamic = "force-dynamic";

export default async function ConfermaTesseramentiPage() {
  const supabase = await createClient();

  const [atlete, annoCorrente] = await Promise.all([
    elencaAtlete(supabase),
    // Sola lettura (AC #1): se l'Anno Agonistico non esiste ancora, nessuna
    // Atleta puo' avere ne' Iscrizione ne' Tesseramento - creato solo alla
    // prima conferma (Server Action), mai in fase di rendering.
    trovaAnnoAgonisticoCorrente(),
  ]);

  const [iscrizioni, tesseramenti] = annoCorrente
    ? await Promise.all([
        elencaIscrizioniPerAnno(supabase, annoCorrente.id),
        prisma.tesseramento.findMany({
          where: { annoAgonisticoId: annoCorrente.id },
          select: { atletaId: true },
        }),
      ])
    : [[], []];

  const iscrizioneAttivaPerAtleta = new Set(
    iscrizioni.map((iscrizione) => iscrizione.atletaId)
  );
  const tesseramentoConfermatoPerAtleta = new Set(
    tesseramenti.map((tesseramento) => tesseramento.atletaId)
  );

  return (
    <main>
      <h1>Conferma Tesseramenti</h1>
      <div className={styles.scrollWrapper}>
        <table className={styles.tabella}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Codice Fiscale</th>
              <th>Stato Iscrizione</th>
              <th>Stato Tesseramento</th>
            </tr>
          </thead>
          <tbody>
            {atlete.map((atleta) => (
              <TesseramentoRow
                key={atleta.id}
                atleta={atleta}
                iscrizioneAttiva={iscrizioneAttivaPerAtleta.has(atleta.id)}
                tesseramentoConfermato={tesseramentoConfermatoPerAtleta.has(atleta.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
