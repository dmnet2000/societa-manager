import type { StatoCertificato } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaCertificati } from "@/lib/db-rls/certificato-medico";
import { categorizzaStatoCertificato } from "@/app/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato";
import { GruppoCard, type GruppoCardData } from "@/app/app/(amministrazione)/vista-dirigente/GruppoCard";
import styles from "@/app/app/(amministrazione)/vista-dirigente/vista-dirigente.module.css";
import { formattaSlotOrario } from "@/lib/formatta-slot-orario";
import { parseRuoli } from "@/lib/ruoli";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { TitoloPagina } from "@/app/AiutoContestuale";

// Story 9.26: specchio di /vista-dirigente (Story 5.1/5.2) ma scoped ai soli
// Gruppi dell'Allenatore - GruppoCard/categorizzaStatoCertificato riusati
// invariati via import cross-modulo, stesso pattern gia' stabilito da
// conferma-certificati/page.tsx (Story 9.23/9.25) per categorizzaStatoCertificato.
// Dati che cambiano ogni giorno per il solo passare del tempo (i bucket di
// scadenza dipendono da "oggi") - stesso motivo di vista-dirigente/page.tsx.
export const dynamic = "force-dynamic";

export default async function VistaAllenatorePage() {
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
  // (AD-9) - Prisma diretto, stesso pattern di i-miei-gruppi/page.tsx.
  const allenatore = user
    ? await prisma.allenatore.findFirst({
        where: { utente: { supabaseAuthId: user.id } },
      })
    : null;

  if (!allenatore) {
    return (
      <main>
        <TitoloPagina
          titolo="Vista d'insieme"
          contenuto={contenutoPerRotta("/app/vista-allenatore", ruoli)}
        />
        <p>
          Il tuo account non è ancora collegato a un profilo Allenatore.
          Contatta la segreteria.
        </p>
      </main>
    );
  }

  // Sola lettura (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente
  // in una pagina GET - Dev Notes Story 1.6/2.2).
  const annoCorrente = await trovaAnnoAgonisticoCorrente();

  // Review fix: caso distinto da "nessun Gruppo assegnato" - stesso
  // messaggio esplicito gia' usato in vista-dirigente/page.tsx (Story 5.1)
  // per lo stesso caso. Narrowing TypeScript: da qui in poi annoCorrente
  // non e' piu' null, nessuna asserzione "!" necessaria sotto.
  if (!annoCorrente) {
    return (
      <main>
        <TitoloPagina
          titolo="Vista d'insieme"
          contenuto={contenutoPerRotta("/app/vista-allenatore", ruoli)}
        />
        <p>Nessun Anno Agonistico corrente — nessun Gruppo puo&apos; esistere ancora.</p>
      </main>
    );
  }

  const gruppiPropri = await prisma.gruppo.findMany({
    where: {
      annoAgonisticoId: annoCorrente.id,
      allenatori: { some: { allenatoreId: allenatore.id } },
    },
    orderBy: { nome: "asc" },
    include: {
      slot: {
        include: { campo: { include: { palestra: true } } },
        orderBy: [{ giorno: "asc" }, { oraInizio: "asc" }],
      },
    },
  });

  if (gruppiPropri.length === 0) {
    return (
      <main>
        <TitoloPagina
          titolo="Vista d'insieme"
          contenuto={contenutoPerRotta("/app/vista-allenatore", ruoli)}
        />
        <p>Non gestisci ancora nessun Gruppo.</p>
      </main>
    );
  }

  // Atleta e' protetta da RLS (AD-4) - letta SOLO tramite elencaAtlete, mai
  // un include Prisma su GruppoAtleta.atleta (Dev Notes Story 2.4). Nessuna
  // query gruppoVisibileDirigente: quella restrizione (Story 5.2) e'
  // specifica del Ruolo DIRIGENTE, non applicabile qui - un Allenatore ha
  // gia' accesso pieno ai certificati delle Atlete dei propri Gruppi
  // (policy allenatore_tutte_atlete_select/allenatore_proprie_atlete_certificato_select).
  const [gruppoAtleteRows, atlete, certificati] = await Promise.all([
    prisma.gruppoAtleta.findMany({
      where: {
        annoAgonisticoId: annoCorrente.id,
        gruppoId: { in: gruppiPropri.map((g) => g.id) },
      },
      select: { atletaId: true, gruppoId: true },
    }),
    elencaAtlete(supabase),
    elencaCertificati(supabase),
  ]);

  const oggi = new Date();
  const atletaPerId = new Map(atlete.map((a) => [a.id, a]));
  const certificatoPerAtletaId = new Map(certificati.map((c) => [c.atletaId, c]));

  const cardData: GruppoCardData[] = gruppiPropri.map((gruppo) => {
    const atleteIdDelGruppo = gruppoAtleteRows
      .filter((riga) => riga.gruppoId === gruppo.id)
      .map((riga) => riga.atletaId);

    const conteggi = {
      IN_REGOLA: 0,
      IN_SCADENZA: 0,
      SCADUTO: 0,
      SENZA_CERTIFICATO: 0,
    };
    const atleteScadute: string[] = [];
    const atleteInScadenza: string[] = [];

    for (const atletaId of atleteIdDelGruppo) {
      const certificato = certificatoPerAtletaId.get(atletaId);
      const stato = categorizzaStatoCertificato(
        (certificato?.dataFineValidita as string | null) ?? null,
        (certificato?.stato as StatoCertificato | null) ?? null,
        oggi
      );
      conteggi[stato] += 1;
      if (stato === "SCADUTO" || stato === "IN_SCADENZA") {
        const atleta = atletaPerId.get(atletaId);
        if (!atleta) {
          // Caso limite difensivo (mai osservato in pratica) - divergenza
          // fra GruppoAtleta (non RLS) ed elencaAtlete (RLS), stesso log
          // distintivo gia' usato in vista-dirigente/page.tsx (Story 5.1).
          console.warn(
            `Story 9.26: Atleta ${atletaId} non risolvibile nell'elenco per la Vista d'insieme Allenatore.`
          );
        }
        if (stato === "SCADUTO") {
          atleteScadute.push(atleta?.nome ?? "Atleta sconosciuta");
        } else {
          atleteInScadenza.push(atleta?.nome ?? "Atleta sconosciuta");
        }
      }
    }
    atleteScadute.sort((a, b) => a.localeCompare(b));
    atleteInScadenza.sort((a, b) => a.localeCompare(b));

    const slotFormattati = gruppo.slot.map((slot) => ({
      id: slot.id,
      testo: formattaSlotOrario(slot),
    }));

    return {
      id: gruppo.id,
      nome: gruppo.nome,
      categoria: gruppo.categoria,
      slotFormattati,
      conteggi,
      atleteScadute,
      atleteInScadenza,
      numeroAtlete: atleteIdDelGruppo.length,
    };
  });

  return (
    <main>
      <TitoloPagina
        titolo="Vista d'insieme"
        contenuto={contenutoPerRotta("/app/vista-allenatore", ruoli)}
      />
      <div className={styles.lista}>
        {cardData.map((gruppo) => (
          <GruppoCard key={gruppo.id} gruppo={gruppo} />
        ))}
      </div>
    </main>
  );
}
