import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaCertificati } from "@/lib/db-rls/certificato-medico";
import { elencaIscrizioniPerAnno } from "@/lib/db-rls/iscrizione";
import { calcolaAtleteConCertificatoInScadenza } from "@/lib/certificato-in-scadenza-per-atleta";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovoGruppoForm } from "./NuovoGruppoForm";
import { GruppoRow } from "./GruppoRow";
import styles from "./gruppi.module.css";

// Dati mutabili in tempo reale (creazione Gruppo/assegnazione Allenatori
// tramite Server Action sulla stessa pagina) - stesso motivo di /admin e
// /palestre (Story 1.2, 2.1).
export const dynamic = "force-dynamic";

export default async function GruppiPage() {
  // Story 17.2 (review fix): le tre risoluzioni non dipendono l'una
  // dall'altra - eseguite in Promise.all invece di await sequenziali,
  // stesso principio gia' stabilito altrove nel progetto.
  //
  // L'elenco va scoped all'Anno Agonistico corrente (AD-8, review fix
  // Story 2.2) - senza questo filtro, non appena esiste piu' di una
  // stagione l'elenco mescolerebbe Gruppi di anni diversi. Sola lettura
  // (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente in una
  // pagina GET, vedi Dev Notes Story 1.6) - se l'Anno Agonistico corrente
  // non esiste ancora, nessun Gruppo puo' comunque esistere per
  // definizione (creaGruppo lo risolve/crea sempre per primo), quindi
  // l'elenco resta semplicemente vuoto.
  const [ruoli, annoCorrente, supabase] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaAnnoAgonisticoCorrente(),
    createClient(),
  ]);
  // Gruppo/Allenatore/GruppoAllenatore/GruppoAtleta non sono protetti da RLS
  // (AD-9): gestibili via Prisma diretto, come Palestra/Campo (Story 2.1).
  // Scala ridotta (poche decine di Gruppi/Allenatori, ~200 Atlete al
  // massimo per una polisportiva) - nessuna paginazione necessaria.
  // Atleta e' invece protetta da RLS (AD-4) - letta SOLO tramite
  // elencaAtlete(supabase) (client Supabase autenticato), mai con un
  // include Prisma su GruppoAtleta.atleta, che bypasserebbe le policy RLS
  // usando la connessione privilegiata di Prisma (vedi Dev Notes Story 2.4).
  const [gruppi, allenatori, atlete, gruppoAtleteRows, certificati, iscrizioni, tesseramenti] =
    await Promise.all([
      annoCorrente
        ? prisma.gruppo.findMany({
            where: { annoAgonisticoId: annoCorrente.id },
            orderBy: { nome: "asc" },
            include: {
              allenatori: {
                include: { allenatore: true },
                orderBy: [{ allenatore: { nome: "asc" } }, { allenatore: { cognome: "asc" } }],
              },
            },
          })
        : Promise.resolve([]),
      prisma.allenatore.findMany({ orderBy: [{ nome: "asc" }, { cognome: "asc" }] }),
      elencaAtlete(supabase),
      annoCorrente
        ? prisma.gruppoAtleta.findMany({
            where: { annoAgonisticoId: annoCorrente.id },
            select: { atletaId: true, gruppoId: true },
          })
        : Promise.resolve([]),
      // Story 9.19: stesso pattern di join in memoria gia' usato in
      // vista-dirigente/page.tsx - CertificatoMedico e' RLS-protetta (AD-4/
      // AD-9), mai un include Prisma diretto.
      elencaCertificati(supabase),
      // Richiesta utente 2026-08-07: colonne Iscrizione/Tesseramento nella
      // tabella Atlete - stesso pattern di lettura gia' usato da
      // conferma-tesseramenti/page.tsx (Iscrizione via RLS/elencaIscrizioniPerAnno,
      // Tesseramento via Prisma diretto, non RLS-protetta per AD-9).
      annoCorrente ? elencaIscrizioniPerAnno(supabase, annoCorrente.id) : Promise.resolve([]),
      annoCorrente
        ? prisma.tesseramento.findMany({
            where: { annoAgonisticoId: annoCorrente.id },
            select: { atletaId: true },
          })
        : Promise.resolve([]),
    ]);

  // Mappa costruita lato server per abbinare le Atlete (lette via RLS) alle
  // righe GruppoAtleta (lette via Prisma diretto) senza mai attraversare la
  // relazione con un include - vedi commento sopra. Proiettata a {id, nome}
  // (review fix): elencaAtlete espone anche codiceFiscale/categoria, dati
  // sensibili non necessari a questa pagina - il payload RSC verso il
  // client non deve portare piu' dati di quelli che il <select> usa.
  // Story 9.19: certificatoInScadenza calcolato una sola volta per l'intero
  // elenco Atlete (non solo per il roster assegnato) tramite l'helper
  // condiviso con /i-miei-gruppi (code review: era duplicato identico nei
  // due file).
  const atleteMinime = calcolaAtleteConCertificatoInScadenza(
    atlete.map(({ id, nome }) => ({ id, nome })),
    certificati,
    new Date()
  );
  const atletaPerId = new Map(atleteMinime.map((atleta) => [atleta.id, atleta]));

  // Richiesta utente 2026-08-07: Set invece di Map - qui serve solo
  // l'appartenenza (iscritta/tesserata sì o no), non altri campi della riga
  // Iscrizione/Tesseramento, a differenza di certificati/atleteMinime sopra
  // che portano dati aggiuntivi (dataFineValidita/stato).
  const idAtleteIscritte = new Set(iscrizioni.map((i) => i.atletaId));
  const idAtleteTesserate = new Set(tesseramenti.map((t) => t.atletaId));

  return (
    <main>
      <TitoloPagina titolo="Gruppi" contenuto={contenutoPerRotta("/app/gruppi", ruoli)} />

      <section className={styles.sezione}>
        <h2>Nuovo Gruppo</h2>
        <NuovoGruppoForm />
      </section>

      <section className={styles.sezione}>
        <h2>Elenco Gruppi</h2>
        <div className={styles.scrollWrapper}>
          <table className={styles.tabella}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
              </tr>
            </thead>
            <tbody>
              {gruppi.map((gruppo) => {
                const atleteGruppo = gruppoAtleteRows
                  .filter((riga) => riga.gruppoId === gruppo.id)
                  .map((riga) => atletaPerId.get(riga.atletaId))
                  .filter(
                    (
                      atleta
                    ): atleta is {
                      id: string;
                      nome: string;
                      certificatoInScadenza: boolean;
                      certificatoScaduto: boolean;
                    } => atleta !== undefined
                  )
                  // Richiesta utente 2026-08-07: colonne Iscrizione/Tesseramento -
                  // aggiunte qui invece che dentro atleteMinime perche' sono
                  // specifiche di /gruppi (non richieste per /i-miei-gruppi,
                  // stessa scelta di scope gia' fatta per certificatoScaduto in
                  // Story 9.33 round 3, qui applicata evitando di ripetere la
                  // duplicazione di tipo gia' segnalata in quella code review).
                  .map((atleta) => ({
                    ...atleta,
                    iscritta: idAtleteIscritte.has(atleta.id),
                    tesserata: idAtleteTesserate.has(atleta.id),
                  }))
                  .sort((a, b) => a.nome.localeCompare(b.nome));

                return (
                  <GruppoRow
                    key={gruppo.id}
                    gruppo={{
                      id: gruppo.id,
                      nome: gruppo.nome,
                      categoria: gruppo.categoria,
                      allenatori: gruppo.allenatori.map((ga) => ga.allenatore),
                      atlete: atleteGruppo,
                    }}
                    allenatoriDisponibili={allenatori}
                    atleteDisponibili={atleteMinime}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
