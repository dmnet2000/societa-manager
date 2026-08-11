import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaCertificati } from "@/lib/db-rls/certificato-medico";
import { elencaIscrizioniPerAnno } from "@/lib/db-rls/iscrizione";
import { calcolaAtleteConCertificatoInScadenza } from "@/lib/certificato-in-scadenza-per-atleta";
import { parseRuoli } from "@/lib/ruoli";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { MioGruppoCard } from "./MioGruppoCard";
import styles from "./i-miei-gruppi.module.css";

// Dati mutabili in tempo reale (assegnazione/rimozione Atlete tramite
// Server Action sulla stessa pagina) - stesso motivo di /gruppi (Story 2.2).
export const dynamic = "force-dynamic";

// Story 9.15: pagina self-service separata da /gruppi (ADMIN/DIRIGENTE-only,
// resta invariata) - stesso principio gia' seguito per /mio-orario,
// /presenze, /il-mio-profilo, /dati-fisici (Dev Notes story file).
export default async function IMieiGruppiPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
  }
  const ruoli = parseRuoli(user?.app_metadata?.ruoli);

  // Gruppo/Allenatore/GruppoAllenatore/GruppoAtleta non sono protetti da RLS
  // (AD-9) - Prisma diretto, stesso pattern di presenze/page.tsx.
  const allenatore = user
    ? await prisma.allenatore.findFirst({
        where: { utente: { supabaseAuthId: user.id } },
      })
    : null;

  if (!allenatore) {
    return (
      <main>
        <TitoloPagina
          titolo="I miei Gruppi"
          contenuto={contenutoPerRotta("/i-miei-gruppi", ruoli)}
        />
        <p className={styles.messaggioVuoto}>
          Il tuo account non è ancora collegato a un profilo Allenatore.
          Contatta la segreteria.
        </p>
      </main>
    );
  }

  // Sola lettura (trovaAnnoAgonisticoCorrente, mai
  // risolviAnnoAgonisticoCorrente in una pagina GET - Dev Notes Story 1.6).
  const annoCorrente = await trovaAnnoAgonisticoCorrente();

  const gruppiPropri = annoCorrente
    ? await prisma.gruppo.findMany({
        where: {
          annoAgonisticoId: annoCorrente.id,
          allenatori: { some: { allenatoreId: allenatore.id } },
        },
        orderBy: { nome: "asc" },
      })
    : [];

  // Atleta e' protetta da RLS (AD-4) - letta SOLO tramite elencaAtlete
  // (client Supabase autenticato), mai con un include Prisma su
  // GruppoAtleta.atleta (vedi Dev Notes Story 2.4). Ora "tutte le Atlete"
  // grazie alla nuova policy allenatore_tutte_atlete_select (Task 1).
  // Story 9.19: elencaCertificati aggiunta allo stesso Promise.all - la
  // policy allenatore_proprie_atlete_certificato_select (Story 4.5) resta
  // scoped ai Gruppi dell'Allenatore (non la nuova policy ampia su "atlete"),
  // nessuno scoping applicativo aggiuntivo necessario qui.
  const [atlete, gruppoAtleteRows, certificati, iscrizioni, tesseramenti] = await Promise.all([
    elencaAtlete(supabase),
    gruppiPropri.length > 0
      ? prisma.gruppoAtleta.findMany({
          where: {
            annoAgonisticoId: annoCorrente!.id,
            gruppoId: { in: gruppiPropri.map((g) => g.id) },
          },
          select: { atletaId: true, gruppoId: true },
        })
      : Promise.resolve([]),
    elencaCertificati(supabase),
    // Richiesta utente 2026-08-07: stesso layout a 5 colonne di /gruppi
    // (Story 9.33, round 4/5) applicato anche qui - stesso pattern di
    // lettura di gruppi/page.tsx (Iscrizione via RLS/elencaIscrizioniPerAnno,
    // Tesseramento via Prisma diretto, non RLS-protetta per AD-9).
    annoCorrente ? elencaIscrizioniPerAnno(supabase, annoCorrente.id) : Promise.resolve([]),
    annoCorrente
      ? prisma.tesseramento.findMany({
          where: { annoAgonisticoId: annoCorrente.id },
          select: { atletaId: true },
        })
      : Promise.resolve([]),
  ]);

  // Story 9.19: stesso helper condiviso di gruppi/page.tsx - una volta per
  // l'intero elenco Atlete, badge "in scadenza" solo se CONFERMATO
  // (categorizzaStatoCertificato, deciso con l'utente in fase di creazione
  // storia).
  const atleteMinime = calcolaAtleteConCertificatoInScadenza(
    atlete.map(({ id, nome }) => ({ id, nome })),
    certificati,
    new Date()
  );
  const atletaPerId = new Map(atleteMinime.map((a) => [a.id, a]));

  // Richiesta utente 2026-08-07: Set invece di Map - stesso principio di
  // gruppi/page.tsx, qui serve solo l'appartenenza.
  const idAtleteIscritte = new Set(iscrizioni.map((i) => i.atletaId));
  const idAtleteTesserate = new Set(tesseramenti.map((t) => t.atletaId));

  return (
    <main>
      <TitoloPagina
        titolo="I miei Gruppi"
        contenuto={contenutoPerRotta("/i-miei-gruppi", ruoli)}
      />
      {gruppiPropri.length === 0 ? (
        <p className={styles.messaggioVuoto}>
          Non gestisci ancora nessun Gruppo.
        </p>
      ) : (
        gruppiPropri.map((gruppo) => {
          const atleteGruppo = gruppoAtleteRows
            .filter((riga) => riga.gruppoId === gruppo.id)
            .map((riga) => atletaPerId.get(riga.atletaId))
            .filter(
              (
                a
              ): a is {
                id: string;
                nome: string;
                certificatoInScadenza: boolean;
                certificatoScaduto: boolean;
              } => a !== undefined
            )
            .map((a) => ({
              ...a,
              iscritta: idAtleteIscritte.has(a.id),
              tesserata: idAtleteTesserate.has(a.id),
            }))
            .sort((a, b) => a.nome.localeCompare(b.nome));

          // Esclude dal <select> solo le Atlete gia' in QUESTO Gruppo (non
          // quelle di un altro Gruppo/Allenatore: assegnaAtleta e' sempre
          // additiva, Story 9.21 - assegnare un'Atleta gia' in un altro
          // Gruppo la aggiunge anche a questo, senza rimuoverla dall'altro)
          // - stesso calcolo "disponibili" di campionati/page.tsx.
          const idAssegnati = new Set(atleteGruppo.map((a) => a.id));
          const atleteDisponibili = atleteMinime.filter(
            (a) => !idAssegnati.has(a.id)
          );

          return (
            <MioGruppoCard
              key={gruppo.id}
              gruppo={{ id: gruppo.id, nome: gruppo.nome, categoria: gruppo.categoria }}
              atlete={atleteGruppo}
              atleteDisponibili={atleteDisponibili}
            />
          );
        })
      )}
    </main>
  );
}
