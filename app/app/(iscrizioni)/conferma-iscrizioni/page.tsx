import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaIscrizioniPerAnno } from "@/lib/db-rls/iscrizione";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { parseRuoli } from "@/lib/ruoli";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { IscrizioneRow } from "./IscrizioneRow";
import styles from "./conferma-iscrizioni.module.css";

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
  const ruoli = parseRuoli(user?.app_metadata?.ruoli);
  const puoConfermare = ruoli.includes("SEGRETERIA");

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

  // Story 1.9: Gruppo assegnato per l'Anno Agonistico corrente - mirror del
  // pattern gia' in uso in /app/gruppi/page.tsx (GruppoAtleta/Gruppo non
  // sono protetti da RLS, AD-9, Prisma diretto). Un'Atleta puo' appartenere
  // a piu' Gruppi nella stessa stagione (AD-8/Story 9.21) - la mappa
  // atletaId -> nomi ne raccoglie tutti, non solo il primo. Se l'Anno
  // Agonistico corrente non esiste ancora, la colonna resta vuota per
  // tutte le righe (stesso stato di Iscrizione oggi).
  const [gruppoAtleteRows, gruppi] = annoCorrente
    ? await Promise.all([
        prisma.gruppoAtleta.findMany({
          where: { annoAgonisticoId: annoCorrente.id },
          select: { atletaId: true, gruppoId: true },
        }),
        prisma.gruppo.findMany({
          where: { annoAgonisticoId: annoCorrente.id },
          select: { id: true, nome: true },
        }),
      ])
    : [[], []];
  const nomeGruppoPerId = new Map(gruppi.map((gruppo) => [gruppo.id, gruppo.nome]));
  const gruppiPerAtleta = new Map<string, string[]>();
  for (const riga of gruppoAtleteRows) {
    const nome = nomeGruppoPerId.get(riga.gruppoId);
    if (!nome) continue;
    const elenco = gruppiPerAtleta.get(riga.atletaId) ?? [];
    elenco.push(nome);
    gruppiPerAtleta.set(riga.atletaId, elenco);
  }
  // Review fix (3-layer review, Blind Hunter + Edge Case Hunter, trovato
  // indipendentemente da entrambi): ne' gruppoAtleteRows ne' gruppi hanno un
  // orderBy - per un'Atleta con piu' Gruppi (AD-8/Story 9.21) l'ordine dei
  // nomi dipenderebbe dall'ordine di ritorno di Postgres, non garantito e
  // potenzialmente diverso da un caricamento all'altro. Ordinati qui,
  // un'unica volta per Atleta, invece di aggiungere un ORDER BY a entrambe
  // le query sorgente (l'ordine finale dipende dal nome del Gruppo, non
  // dall'ordine delle righe GruppoAtleta).
  for (const elenco of gruppiPerAtleta.values()) {
    elenco.sort((a, b) => a.localeCompare(b));
  }

  return (
    <main>
      <TitoloPagina
        titolo="Conferma Iscrizioni"
        contenuto={contenutoPerRotta("/app/conferma-iscrizioni", ruoli)}
      />
      <div className={styles.scrollWrapper}>
        <table className={styles.tabella}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Codice Fiscale</th>
              <th>Gruppo</th>
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
                gruppi={gruppiPerAtleta.get(atleta.id) ?? []}
              />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
