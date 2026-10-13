import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaIscrizioniPerAnno } from "@/lib/db-rls/iscrizione";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { elencaFederazioni } from "@/lib/federazioni";
import { colonneTesseramento, federazioniPerAtleta } from "@/lib/tesseramento";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { ConfermaTesseramentiForm } from "./ConfermaTesseramentiForm";

// Dati mutabili in tempo reale (salvataggi via Server Action sulla stessa
// pagina) - stesso motivo di /conferma-iscrizioni, Story 1.6.
export const dynamic = "force-dynamic";

export default async function ConfermaTesseramentiPage() {
  const supabase = await createClient();
  const ruoli = await risolviRuoliPerAiutoContestuale();

  const [atlete, annoCorrente, federazioni] = await Promise.all([
    elencaAtlete(supabase),
    // Sola lettura (AC #1): se l'Anno Agonistico non esiste ancora, nessuna
    // Atleta puo' avere ne' Iscrizione ne' Tesseramento - creato solo al
    // primo salvataggio (Server Action), mai in fase di rendering.
    trovaAnnoAgonisticoCorrente(),
    elencaFederazioni(),
  ]);

  const [iscrizioni, tesseramenti] = annoCorrente
    ? await Promise.all([
        elencaIscrizioniPerAnno(supabase, annoCorrente.id),
        federazioniPerAtleta(annoCorrente.id),
      ])
    : [[], new Map<string, string[]>()];

  const iscrizioneAttivaPerAtleta = new Set(
    iscrizioni.map((iscrizione) => iscrizione.atletaId)
  );

  // Story 26.2: colonne = Federazioni attive + disattivate ancora usate in
  // stagione (regola in lib/tesseramento.ts).
  const colonne = colonneTesseramento(federazioni, tesseramenti);
  // Review fix: le caselle iniziali di ogni riga considerano solo id che
  // hanno una colonna - un id senza Federazione corrispondente (non
  // dovrebbe esistere: eliminare una Federazione in uso e' bloccato) non
  // sarebbe ne' visibile ne' deselezionabile, e la riga non potrebbe piu'
  // essere svuotata. Coerente col badge di /app/gruppi, che lo ignora.
  const idColonne = new Set(colonne.map((c) => c.id));

  return (
    <main>
      <TitoloPagina
        titolo="Conferma Tesseramenti"
        contenuto={contenutoPerRotta("/app/conferma-tesseramenti", ruoli)}
      />
      <ConfermaTesseramentiForm
        colonne={colonne}
        atlete={atlete.map((atleta) => ({
          id: atleta.id,
          nome: atleta.nome,
          codiceFiscale: atleta.codiceFiscale,
          iscrizioneAttiva: iscrizioneAttivaPerAtleta.has(atleta.id),
          federazioniIniziali: (tesseramenti.get(atleta.id) ?? []).filter((id) =>
            idColonne.has(id)
          ),
        }))}
      />
    </main>
  );
}
