import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaIscrizioniPerAnno } from "@/lib/db-rls/iscrizione";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { prisma } from "@/lib/prisma";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { ConfermaTesseramentiForm } from "./ConfermaTesseramentiForm";

// Dati mutabili in tempo reale (conferme via Server Action sulla stessa
// pagina) - stesso motivo di /conferma-iscrizioni, Story 1.6.
export const dynamic = "force-dynamic";

export default async function ConfermaTesseramentiPage() {
  const supabase = await createClient();
  const ruoli = await risolviRuoliPerAiutoContestuale();

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
      <TitoloPagina
        titolo="Conferma Tesseramenti"
        contenuto={contenutoPerRotta("/conferma-tesseramenti", ruoli)}
      />
      <ConfermaTesseramentiForm
        atlete={atlete.map((atleta) => ({
          id: atleta.id,
          nome: atleta.nome,
          codiceFiscale: atleta.codiceFiscale,
          iscrizioneAttiva: iscrizioneAttivaPerAtleta.has(atleta.id),
          tesseramentoConfermato: tesseramentoConfermatoPerAtleta.has(atleta.id),
        }))}
      />
    </main>
  );
}
