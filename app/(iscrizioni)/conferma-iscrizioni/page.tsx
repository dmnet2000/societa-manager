import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaIscrizioniPerAnno } from "@/lib/db-rls/iscrizione";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { parseRuoli } from "@/lib/ruoli";
import { IscrizioneRow } from "./IscrizioneRow";

// Dati mutabili in tempo reale (conferme via Server Action sulla stessa
// pagina) - stesso motivo di /admin, Story 1.2.
export const dynamic = "force-dynamic";

export default async function ConfermaIscrizioniPage() {
  const supabase = await createClient();

  // Review fix (Story 1.8): la route ora ammette anche Admin/Dirigente (per
  // poter escludere, FR-23), ma confermaIscrizione resta riservata alla sola
  // Segreteria (FR-17) - senza questo controllo, Admin/Dirigente vedrebbero
  // un bottone "Conferma" che il server rifiuta sempre.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const puoConfermare = parseRuoli(user?.app_metadata?.ruoli).includes(
    "SEGRETERIA"
  );

  const [atlete, annoCorrente] = await Promise.all([
    elencaAtlete(supabase),
    // Sola lettura (AC #1): se l'Anno Agonistico non esiste ancora, nessuna
    // Atleta risulta iscritta - viene creato solo alla prima conferma
    // (Server Action, vedi Dev Notes).
    trovaAnnoAgonisticoCorrente(),
  ]);

  const iscrizioni = annoCorrente
    ? await elencaIscrizioniPerAnno(supabase, annoCorrente.id)
    : [];
  // Story 1.8: serve anche l'id della riga Iscrizione (non solo l'atletaId)
  // - la UI lo usa per chiamare escludiIscrizione (AC #4).
  const iscrizioneIdPerAtleta = new Map(
    iscrizioni.map((iscrizione) => [iscrizione.atletaId, iscrizione.id])
  );

  return (
    <main>
      <h1>Conferma Iscrizioni</h1>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Codice Fiscale</th>
            <th>Stato Iscrizione</th>
          </tr>
        </thead>
        <tbody>
          {atlete.map((atleta) => (
            <IscrizioneRow
              key={atleta.id}
              atleta={atleta}
              iscrizioneId={iscrizioneIdPerAtleta.get(atleta.id) ?? null}
              puoConfermare={puoConfermare}
            />
          ))}
        </tbody>
      </table>
    </main>
  );
}
