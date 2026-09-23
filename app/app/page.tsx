import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { parseRuoli } from "@/lib/ruoli";
import { urlPubblicoImmagineSponsor } from "@/lib/storage/sponsor";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import {
  lunediDellaSettimana,
  formattaDataIso,
  parseDataUtc,
  oraInMinuti,
} from "@/lib/raggruppa-per-settimana";
import { costruisciLinkNaviga } from "@/lib/link-naviga-palestra";
import { SponsorCarosello } from "./SponsorCarosello";
import styles from "./home.module.css";

// Dati potenzialmente diversi ad ogni visita (Banner sponsor attivi,
// Partite della settimana) - stesso motivo di /sponsor, /notifiche.
export const dynamic = "force-dynamic";

// Mirror esatto di formattaData in .../partite/page.tsx e /calendario -
// parseDataUtc riusata (mai un secondo parsing indipendente), timeZone:
// "UTC" esplicito (stesso motivo ovunque nel progetto).
function formattaData(data: string): string {
  return parseDataUtc(data).toLocaleDateString("it-IT", { timeZone: "UTC" });
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruoli = parseRuoli(user?.app_metadata?.ruoli);

  // Story 16.3 (AC #1/#5): solo Atleta/Genitore vedono il carosello Banner -
  // per ogni altro Ruolo nessuna query, nessun cambiamento alla homepage.
  const mostraCarosello = ruoli.includes("ATLETA") || ruoli.includes("GENITORE");

  const bannerAttivi = mostraCarosello
    ? await prisma.sponsor.findMany({
        where: { tipo: "BANNER", attiva: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // Story 9.44: "Partite della settimana" del proprio Gruppo, in evidenza -
  // stesso identico pattern di risoluzione del proprio Gruppo già usato in
  // /app/partite (app/app/(partite-campionati)/partite/page.tsx) per
  // Allenatore/Atleta/Genitore, qui riapplicato alla home. La visibilità
  // della sezione è guidata dal DATO (un Allenatore o un'Atleta/figlia
  // risolti), non da un controllo esplicito sul Ruolo - stesso principio
  // già in vigore in quella pagina, evita una seconda condizione di
  // appartenenza indipendente che potrebbe disallinearsi da quella reale.
  // Review fix (Blind Hunter): annoCorrente e allenatore non dipendono
  // l'una dall'altra - eseguite in parallelo (Promise.all) invece che in
  // sequenza, meno latenza ad ogni visita (pagina force-dynamic, gira ad
  // ogni caricamento). genitoreAtleta dipende invece dall'esito di
  // allenatore (interrogata solo se nessun Allenatore e' risolto), resta
  // necessariamente dopo. Ogni query ha ora il proprio .catch (prima solo
  // annoCorrente/partite lo avevano) - un errore transitorio su una sola
  // query non deve far fallire l'intera Server Component, portando giu'
  // anche il carosello Sponsor e la card di saluto sotto.
  const [annoCorrente, allenatore] = await Promise.all([
    trovaAnnoAgonisticoCorrente().catch((err) => {
      console.error(err);
      return null;
    }),
    user
      ? prisma.allenatore
          .findFirst({ where: { utente: { supabaseAuthId: user.id } } })
          .catch((err) => {
            console.error(err);
            return null;
          })
      : null,
  ]);

  // Story 10.5: la stessa riga GenitoreAtleta copre sia "un Genitore vede le
  // proprie figlie" sia "un'Atleta vede sé stessa" (autoAggancio, stesso
  // principio già stabilito in certificato-medico/page.tsx) - nessuna
  // distinzione esplicita Atleta/Genitore necessaria qui.
  const atletaIds =
    !allenatore && user
      ? await prisma.genitoreAtleta
          .findMany({
            where: { utente: { supabaseAuthId: user.id } },
            select: { atletaId: true },
          })
          .then((righe) => righe.map((riga) => riga.atletaId))
          .catch((err) => {
            console.error(err);
            return [];
          })
      : [];

  const filtroGruppo = allenatore
    ? { allenatori: { some: { allenatoreId: allenatore.id } } }
    : atletaIds.length > 0
      ? // Story 9.21: attraversamento di relazione "some" su Gruppo.atlete,
        // non un gruppoId singolo - un'Atleta può appartenere a più Gruppi,
        // un Genitore a più figlie in Gruppi diversi; qui (a differenza di
        // /app/partite) TUTTI i Gruppi collegati sono mostrati insieme,
        // nessun selettore - un riquadro di sintesi in home non ha bisogno
        // della scelta esplicita richiesta invece dall'elenco completo.
        { atlete: { some: { atletaId: { in: atletaIds } } } }
      : null;

  // Mirror esatto del calcolo già in uso nel teaser pubblico sopra
  // (Story 18.3, review fix Story 4.5 citato lì) - "oggi" sul calendario di
  // Europe/Rome via Intl.DateTimeFormat, non sull'istante UTC di new Date():
  // per 1-2 ore ogni lunedì a cavallo della mezzanotte italiana l'istante
  // UTC è ancora domenica, calcolerebbe la settimana sbagliata.
  const oggiIsoItalia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
  }).format(new Date());
  const lunediCorrente = lunediDellaSettimana(parseDataUtc(oggiIsoItalia));
  const domenicaCorrente = new Date(lunediCorrente.getTime() + 6 * 24 * 60 * 60 * 1000);
  const lunediIso = formattaDataIso(lunediCorrente);
  const domenicaIso = formattaDataIso(domenicaCorrente);

  // Review fix (Blind Hunter): orderBy "ora" e' un orderBy Prisma/SQL,
  // quindi lessicografico sulla stringa - lo stesso problema gia' noto e
  // corretto in lib/raggruppa-per-settimana.ts ("9:00" dopo "20:30" nello
  // stesso giorno). Riordinata qui in memoria con oraInMinuti (esportata da
  // quel modulo apposta per questo riuso), non una seconda implementazione.
  const partiteSettimanaProprie = (
    annoCorrente && filtroGruppo
      ? await prisma.partita
          .findMany({
            where: {
              gruppo: { annoAgonisticoId: annoCorrente.id, ...filtroGruppo },
              data: { gte: lunediIso, lte: domenicaIso },
            },
            include: { gruppo: { select: { nome: true } } },
            orderBy: [{ data: "asc" }, { ora: "asc" }],
          })
          .catch((err) => {
            console.error(err);
            return [];
          })
      : []
  ).sort((a, b) => a.data.localeCompare(b.data) || oraInMinuti(a.ora) - oraInMinuti(b.ora));

  return (
    <main>
      <h1>Area applicativa</h1>
      {/* Story 9.44: "Partite della settimana" del proprio Gruppo, per PRIMA
          nella pagina - "in evidenza" (richiesta esplicita dell'utente)
          significa la posizione più prominente, ancora prima del carosello
          Sponsor. Stile sobrio/tabellare coerente con il resto dell'area
          interna (/app/partite), non lo stile "match-card" a sfondo
          colorato del sito pubblico (mai usato finora in quest'area).
          Sezione assente del tutto se vuota (nessuna Partita questa
          settimana), mirror dello stesso principio già scelto per il
          teaser pubblico equivalente (app/page.tsx).
          Review fix (Blind Hunter): aria-labelledby (non aria-label) - un
          solo <h2> qui fa già da nome accessibile alla sezione, stesso
          identico pattern già in uso in quel teaser pubblico. */}
      {partiteSettimanaProprie.length > 0 && (
        <section className={styles.inEvidenza} aria-labelledby="titolo-partite-in-evidenza">
          <h2 id="titolo-partite-in-evidenza">Partite di questa settimana</h2>
          <ul className={styles.listaInEvidenza}>
            {partiteSettimanaProprie.map((partita) => {
              const linkNaviga = costruisciLinkNaviga({
                indirizzo: partita.indirizzoImpianto,
              });
              return (
                <li key={partita.id} className={styles.rigaInEvidenza}>
                  <span className={styles.gruppoInEvidenza}>{partita.gruppo.nome}</span>
                  <span>
                    {formattaData(partita.data)} · {partita.ora}
                  </span>
                  <span>
                    {partita.squadraCasa} vs {partita.squadraOspite}
                  </span>
                  {partita.impianto && <span>{partita.impianto}</span>}
                  {linkNaviga && (
                    <a
                      className={styles.linkNaviga}
                      href={linkNaviga}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Naviga verso ${partita.impianto ?? "il luogo della partita"}`}
                    >
                      Naviga
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
          <Link className={styles.linkVediTutte} href="/app/partite">
            Vedi tutte le partite
          </Link>
        </section>
      )}
      {/* Design UX (con Sally, Story 16.3 estensione): il carosello va PRIMA
          della card di saluto, non dopo - su una home cosi' sparuta, essere
          il primo elemento e' gia' "in evidenza" (AC #1) senza bisogno di
          renderlo sticky. Confrontato con un mockup a due colonne (versione
          sticky vs versione normale): la sidebar e' sticky solo da desktop
          in su, un carosello sticky sarebbe il primo elemento fisso su
          mobile, costo permanente di spazio verticale mai più liberato man
          mano che la home cresce - scartato per questo motivo, non solo
          per gusto estetico. AC #4: nessuna sezione se non ci sono Banner attivi. */}
      {bannerAttivi.length > 0 && (
        <SponsorCarosello
          banner={bannerAttivi.map((sponsor) => ({
            id: sponsor.id,
            nome: sponsor.nome,
            linkEsterno: sponsor.linkEsterno,
            // Review fix Story 16.2 (Blind Hunter): cache-busting via
            // updatedAt, stesso principio di SponsorVetrinaCard.tsx.
            immagineUrl: `${urlPubblicoImmagineSponsor(supabase, sponsor.id)}?v=${encodeURIComponent(sponsor.updatedAt.toISOString())}`,
          }))}
        />
      )}
      <div className={styles.card}>
        <p className={styles.saluto}>Bentornata/o, {user?.email}.</p>
        <p className={styles.testo}>Ruoli: {ruoli.join(", ") || "nessuno"}</p>
      </div>
    </main>
  );
}
