import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
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
        <h1>I miei Gruppi</h1>
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
  const [atlete, gruppoAtleteRows] = await Promise.all([
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
  ]);

  const atleteMinime = atlete.map(({ id, nome }) => ({ id, nome }));
  const atletaPerId = new Map(atleteMinime.map((a) => [a.id, a]));

  return (
    <main>
      <h1>I miei Gruppi</h1>
      {gruppiPropri.length === 0 ? (
        <p className={styles.messaggioVuoto}>
          Non gestisci ancora nessun Gruppo.
        </p>
      ) : (
        gruppiPropri.map((gruppo) => {
          const atleteGruppo = gruppoAtleteRows
            .filter((riga) => riga.gruppoId === gruppo.id)
            .map((riga) => atletaPerId.get(riga.atletaId))
            .filter((a): a is { id: string; nome: string } => a !== undefined)
            .sort((a, b) => a.nome.localeCompare(b.nome));

          // Esclude dal <select> solo le Atlete gia' in QUESTO Gruppo (non
          // quelle di un altro Gruppo/Allenatore: assegnarle sposta
          // l'assegnazione, riassegnazione self-service esplicitamente
          // accettata, vedi Dev Notes story file) - stesso calcolo
          // "disponibili" di campionati/page.tsx.
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
