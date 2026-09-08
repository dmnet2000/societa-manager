import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaCertificati } from "@/lib/db-rls/certificato-medico";
import { elencaIscrizioniPerAnno } from "@/lib/db-rls/iscrizione";
import { calcolaAtleteConCertificatoInScadenza } from "@/lib/certificato-in-scadenza-per-atleta";
import { elencaGruppiConFoto, urlPubblicoFotoSquadra } from "@/lib/storage/foto-squadra";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { parseRuoli } from "@/lib/ruoli";
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
  const [annoCorrente, supabase] = await Promise.all([
    trovaAnnoAgonisticoCorrente(),
    createClient(),
  ]);

  // Story 2.10 (review fix, Blind Hunter): ruoli risolto qui direttamente
  // (mirror letterale di conferma-iscrizioni/page.tsx per puoConfermare),
  // MAI tramite risolviRuoliPerAiutoContestuale() - quell'helper e'
  // esplicitamente documentato come fail-soft "puramente cosmetico"
  // (lib/guida/risolvi-ruoli-pagina.ts: "una funzione puramente cosmetica
  // non deve mai romperla"), pensato solo per l'icona di aiuto contestuale.
  // Usarlo per soloVisualizzazione avrebbe significato che un errore di
  // sessione transitorio lo farebbe silenziosamente tornare [], facendo
  // cadere soloVisualizzazione a false e mostrando la vista di gestione
  // completa (creazione/modifica Gruppi) a un Utente Segreteria - esposizione
  // dell'interfaccia esattamente opposta allo scopo di questa story (le
  // Server Action restano comunque protette da requireRuolo, spec-2-10
  // Boundaries "Never", ma l'esposizione della sola UI non andava
  // permessa). Nessun try/catch qui, deliberatamente: se getUser() fallisce
  // davvero, la pagina fallisce in modo visibile (errore) invece di
  // ricadere silenziosamente sulla vista piu' privilegiata - stesso
  // principio di fail-closed gia' in uso in conferma-iscrizioni/page.tsx.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ruoli = parseRuoli(user?.app_metadata?.ruoli);

  // Story 2.10: Segreteria vede questa stessa rotta in sola lettura (nome
  // Gruppo/categoria/elenco Atlete), mai il ramo di gestione. Un Utente con
  // Admin o Dirigente (anche insieme a Segreteria) vede sempre il ramo di
  // gestione invariato - stessa precedenza gia' stabilita altrove nel
  // progetto quando un Utente cumula piu' Ruoli con capacita' diverse sulla
  // stessa rotta.
  const soloVisualizzazione =
    ruoli.includes("SEGRETERIA") &&
    !ruoli.includes("ADMIN") &&
    !ruoli.includes("DIRIGENTE");
  // Gruppo/Allenatore/GruppoAllenatore/GruppoAtleta non sono protetti da RLS
  // (AD-9): gestibili via Prisma diretto, come Palestra/Campo (Story 2.1).
  // Scala ridotta (poche decine di Gruppi/Allenatori, ~200 Atlete al
  // massimo per una polisportiva) - nessuna paginazione necessaria.
  // Atleta e' invece protetta da RLS (AD-4) - letta SOLO tramite
  // elencaAtlete(supabase) (client Supabase autenticato), mai con un
  // include Prisma su GruppoAtleta.atleta, che bypasserebbe le policy RLS
  // usando la connessione privilegiata di Prisma (vedi Dev Notes Story 2.4).
  const [
    gruppi,
    allenatori,
    atlete,
    gruppoAtleteRows,
    certificati,
    iscrizioni,
    tesseramenti,
    gruppiConFoto,
  ] = await Promise.all([
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
      // Story 2.10: Segreteria (ramo di sola lettura) non mostra il
      // dropdown "Assegna Allenatore" - questa query serve solo al ramo di
      // gestione, saltata quando soloVisualizzazione.
      soloVisualizzazione
        ? Promise.resolve([])
        : prisma.allenatore.findMany({ orderBy: [{ nome: "asc" }, { cognome: "asc" }] }),
      elencaAtlete(supabase),
      annoCorrente
        ? prisma.gruppoAtleta.findMany({
            where: { annoAgonisticoId: annoCorrente.id },
            // Story 9.35: "numero" incluso qui (unica fonte del dato,
            // specifico della riga GruppoAtleta stessa) e unito sotto insieme
            // ad atletaId/gruppoId.
            select: { atletaId: true, gruppoId: true, numero: true },
          })
        : Promise.resolve([]),
      // Story 9.19: stesso pattern di join in memoria gia' usato in
      // vista-dirigente/page.tsx - CertificatoMedico e' RLS-protetta (AD-4/
      // AD-9), mai un include Prisma diretto.
      // Story 2.10: saltata nel ramo di sola lettura Segreteria - quel ramo
      // non mostra badge di scadenza Certificato.
      soloVisualizzazione ? Promise.resolve([]) : elencaCertificati(supabase),
      // Richiesta utente 2026-08-07: colonne Iscrizione/Tesseramento nella
      // tabella Atlete - stesso pattern di lettura gia' usato da
      // conferma-tesseramenti/page.tsx (Iscrizione via RLS/elencaIscrizioniPerAnno,
      // Tesseramento via Prisma diretto, non RLS-protetta per AD-9).
      // Story 2.10: saltate nel ramo di sola lettura Segreteria - quel ramo
      // non mostra le colonne Iscrizione/Tesseramento.
      soloVisualizzazione || !annoCorrente
        ? Promise.resolve([])
        : elencaIscrizioniPerAnno(supabase, annoCorrente.id),
      soloVisualizzazione || !annoCorrente
        ? Promise.resolve([])
        : prisma.tesseramento.findMany({
            where: { annoAgonisticoId: annoCorrente.id },
            select: { atletaId: true },
          }),
      // Story 18.4: UNA sola chiamata Storage per l'intero elenco Gruppi,
      // non N chiamate leggiInfoFotoSquadra() per-Gruppo dentro il .map()
      // sotto - vedi lib/storage/foto-squadra.ts.
      // Story 2.10: saltata nel ramo di sola lettura Segreteria - quel ramo
      // non mostra la foto squadra.
      soloVisualizzazione ? Promise.resolve(new Map<string, string | null>()) : elencaGruppiConFoto(supabase),
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

  // Story 2.10: ramo di sola lettura per Segreteria - stessi dati
  // (gruppi/atlete via atletaPerId/gruppoAtleteRows) gia' risolti sopra,
  // nessuna query duplicata. Mai <NuovoGruppoForm>/<GruppoRow> (fortemente
  // accoppiati a creazione/modifica Gruppi, fuori scope di questa storia).
  if (soloVisualizzazione) {
    return (
      <main>
        <TitoloPagina titolo="Gruppi" contenuto={contenutoPerRotta("/app/gruppi", ruoli)} />

        <section className={styles.sezione}>
          <h2>Elenco Gruppi</h2>
          {
            // Review fix (Blind Hunter + Edge Case Hunter, trovato
            // indipendentemente da entrambi): un elenco Gruppi vuoto (nessun
            // Anno Agonistico corrente, o una stagione senza ancora alcun
            // Gruppo) mostrava una tabella con solo l'intestazione, senza
            // spiegazione - a differenza del ramo di gestione, questo ramo
            // non ha il form "Nuovo Gruppo" a suggerire "non esiste ancora
            // nulla, creane uno", quindi il vuoto risultava piu' ambiguo.
            gruppi.length === 0 ? (
              <p className={styles.messaggioVuoto}>
                Nessun Gruppo trovato per la stagione corrente.
              </p>
            ) : (
              <div className={styles.scrollWrapper}>
                <table className={styles.tabella}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Categoria</th>
                      <th>Atleta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      // Richiesta esplicita dell'utente: un'Atleta per riga
                      // invece di un elenco unito da virgole in un'unica
                      // cella - Nome/Categoria del Gruppo ripetuti su ogni
                      // riga (nessun rowSpan, nessun precedente di quel
                      // pattern in questo progetto). Un Gruppo senza Atlete
                      // assegnate mostra comunque una riga con "–" (stesso
                      // principio "mai una riga sparita in silenzio" gia'
                      // seguito sopra per l'elenco Gruppi vuoto).
                      // Review fix (Blind Hunter): questo stesso file usa
                      // gia' un pattern consolidato per sopprimere il bordo
                      // tra righe interne allo stesso Gruppo, lasciandolo
                      // solo sull'ultima (.rigaAtlete/.rigaAllenatori/
                      // .rigaFotoSquadra sotto, nel ramo di gestione) -
                      // riusato qui identico (styles.rigaInterna) invece di
                      // lasciare un separatore identico tra ogni riga
                      // Atleta e tra un Gruppo e il successivo.
                      // Secondo criterio di ordinamento (atleta.id) per un
                      // risultato deterministico quando due Atlete dello
                      // stesso Gruppo condividono lo stesso nome.
                      gruppi.flatMap((gruppo) => {
                        const atleteDelGruppo = gruppoAtleteRows
                          .filter((riga) => riga.gruppoId === gruppo.id)
                          .map((riga) => atletaPerId.get(riga.atletaId))
                          .filter((atleta): atleta is NonNullable<typeof atleta> => atleta !== undefined)
                          .sort(
                            (a, b) => a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id)
                          );

                        if (atleteDelGruppo.length === 0) {
                          return (
                            <tr key={gruppo.id}>
                              <td>{gruppo.nome}</td>
                              <td>{gruppo.categoria}</td>
                              <td>–</td>
                            </tr>
                          );
                        }

                        return atleteDelGruppo.map((atleta, indice) => {
                          const ultimaRiga = indice === atleteDelGruppo.length - 1;
                          return (
                            <tr
                              key={`${gruppo.id}-${atleta.id}`}
                              className={ultimaRiga ? undefined : styles.rigaInterna}
                            >
                              <td>{gruppo.nome}</td>
                              <td>{gruppo.categoria}</td>
                              <td>{atleta.nome}</td>
                            </tr>
                          );
                        });
                      })
                    }
                  </tbody>
                </table>
              </div>
            )
          }
        </section>
      </main>
    );
  }

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
                  // Story 9.35: "numero" vive sulla riga GruppoAtleta stessa
                  // (riga), non su atletaPerId (proiezione di Atleta) -
                  // unito qui insieme al lookup, invece di perderlo con un
                  // semplice atletaPerId.get() come prima di questa storia.
                  .map((riga) => {
                    const atleta = atletaPerId.get(riga.atletaId);
                    return atleta ? { ...atleta, numero: riga.numero } : undefined;
                  })
                  .filter(
                    (
                      atleta
                    ): atleta is {
                      id: string;
                      nome: string;
                      certificatoInScadenza: boolean;
                      certificatoScaduto: boolean;
                      dataFineValidita: string | null;
                      numero: number | null;
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

                const fotoAggiornataIl = gruppiConFoto.get(gruppo.id) ?? null;

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
                    fotoEsiste={gruppiConFoto.has(gruppo.id)}
                    fotoUrl={urlPubblicoFotoSquadra(supabase, gruppo.id)}
                    fotoAggiornataIl={fotoAggiornataIl}
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
