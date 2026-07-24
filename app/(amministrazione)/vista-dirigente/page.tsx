import type { StatoCertificato } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaCertificati } from "@/lib/db-rls/certificato-medico";
import { categorizzaStatoCertificato } from "./categorizza-stato-certificato";
import { GruppoCard, type GruppoCardData } from "./GruppoCard";
import styles from "./vista-dirigente.module.css";

// Dati che cambiano ogni giorno per il solo passare del tempo (i bucket di
// scadenza dipendono da "oggi") - stesso motivo di orari/page.tsx (Story 2.8).
export const dynamic = "force-dynamic";

const GIORNO_BREVE: Record<string, string> = {
  LUNEDI: "Lun",
  MARTEDI: "Mar",
  MERCOLEDI: "Mer",
  GIOVEDI: "Gio",
  VENERDI: "Ven",
  SABATO: "Sab",
  DOMENICA: "Dom",
};

export default async function VistaDirigentePage() {
  // Sola lettura (Dev Notes Story 1.6): mai risolviAnnoAgonisticoCorrente in
  // una pagina GET.
  const annoCorrente = await trovaAnnoAgonisticoCorrente();

  if (!annoCorrente) {
    return (
      <main>
        <h1>Vista d&apos;insieme</h1>
        <p>Nessun Anno Agonistico corrente — nessun Gruppo puo&apos; esistere ancora.</p>
      </main>
    );
  }

  const supabase = await createClient();
  // Gruppo/Slot/Campo/Palestra/GruppoAtleta non protette da RLS (AD-9) -
  // Prisma diretto, stesso pattern di gruppi/page.tsx e orari/page.tsx.
  // Atleta/CertificatoMedico protette da RLS (AD-4) - client Supabase della
  // sessione Dirigente (createClient, mai createAdminClient: qui esiste una
  // sessione utente reale) - Dirigente ha gia' accesso ampio (Prerequisito
  // #1 della storia), nessuna nuova policy necessaria.
  const [gruppi, gruppoAtleteRows, atlete, certificati, righeVisibiliDirigente] =
    await Promise.all([
      prisma.gruppo.findMany({
        where: { annoAgonisticoId: annoCorrente.id },
        orderBy: { nome: "asc" },
        include: {
          slot: {
            include: { campo: { include: { palestra: true } } },
            orderBy: [{ giorno: "asc" }, { oraInizio: "asc" }],
          },
        },
      }),
      prisma.gruppoAtleta.findMany({
        where: { annoAgonisticoId: annoCorrente.id },
        select: { atletaId: true, gruppoId: true },
      }),
      elencaAtlete(supabase),
      elencaCertificati(supabase),
      // Review fix (Story 5.2): la restrizione per Ruolo Dirigente e' letta
      // qui, scoped alla stagione corrente (stesso principio della
      // migrazione 20260724010000, che ha corretto lo stesso bug per la
      // RLS) - senza questo, un'Atleta esclusa dallo scope del Dirigente
      // apparirebbe come "senza certificato" invece che "fuori dai
      // permessi configurati": un dato falso, non solo mancante. Tabella
      // non protetta da RLS (AD-9), Prisma diretto.
      prisma.gruppoVisibileDirigente.findMany({
        where: { gruppo: { annoAgonisticoId: annoCorrente.id } },
        select: { gruppoId: true },
      }),
    ]);

  const gruppoIdsVisibiliDirigente = righeVisibiliDirigente.map((r) => r.gruppoId);
  // Nessuna riga per la stagione corrente = nessuna restrizione attiva,
  // stessa semantica della funzione SQL dirigente_vede_certificato_atleta.
  const restrizioneAttiva = gruppoIdsVisibiliDirigente.length > 0;

  const oggi = new Date();
  const atletaPerId = new Map(atlete.map((a) => [a.id, a]));
  const certificatoPerAtletaId = new Map(certificati.map((c) => [c.atletaId, c]));

  const cardData: GruppoCardData[] = gruppi.map((gruppo) => {
    const atleteIdDelGruppo = gruppoAtleteRows
      .filter((riga) => riga.gruppoId === gruppo.id)
      .map((riga) => riga.atletaId);

    // Review fix: se una restrizione e' attiva e questo Gruppo non e' fra
    // quelli consentiti, i Certificati delle sue Atlete non sono comunque
    // leggibili (RLS) - mostra questo esplicitamente invece di calcolare
    // conteggi che sarebbero sistematicamente sbagliati (ogni Atleta
    // risulterebbe "senza certificato" anche se in realta' confermato).
    if (restrizioneAttiva && !gruppoIdsVisibiliDirigente.includes(gruppo.id)) {
      const slotFormattatiEsclusi = gruppo.slot.map((slot) => ({
        id: slot.id,
        testo: `${GIORNO_BREVE[slot.giorno] ?? slot.giorno} ${slot.oraInizio}-${slot.oraFine} · ${slot.campo.palestra.nome} - ${slot.campo.nome}`,
      }));
      return {
        id: gruppo.id,
        nome: gruppo.nome,
        categoria: gruppo.categoria,
        slotFormattati: slotFormattatiEsclusi,
        conteggi: null,
        atleteScadute: [],
        numeroAtlete: atleteIdDelGruppo.length,
      };
    }

    const conteggi = {
      IN_REGOLA: 0,
      IN_SCADENZA: 0,
      SCADUTO: 0,
      SENZA_CERTIFICATO: 0,
    };
    const atleteScadute: string[] = [];

    for (const atletaId of atleteIdDelGruppo) {
      const certificato = certificatoPerAtletaId.get(atletaId);
      const stato = categorizzaStatoCertificato(
        (certificato?.dataFineValidita as string | null) ?? null,
        (certificato?.stato as StatoCertificato | null) ?? null,
        oggi
      );
      conteggi[stato] += 1;
      if (stato === "SCADUTO") {
        const atleta = atletaPerId.get(atletaId);
        if (!atleta) {
          // Review fix: caso limite difensivo (mai osservato in pratica) -
          // divergenza fra GruppoAtleta (non RLS) ed elencaAtlete (RLS) -
          // stesso log distintivo gia' usato per un caso analogo in
          // caricaCertificato (Story 4.3).
          console.warn(
            `Story 5.1: Atleta ${atletaId} non risolvibile nell'elenco per la Vista d'insieme.`
          );
        }
        atleteScadute.push(atleta?.nome ?? "Atleta sconosciuta");
      }
    }
    // Review fix: ordine altrimenti non deterministico (nessun orderBy su
    // gruppoAtleta.findMany) - a differenza di ogni altra lista della
    // pagina, gia' ordinata per nome.
    atleteScadute.sort((a, b) => a.localeCompare(b));

    const slotFormattati = gruppo.slot.map((slot) => ({
      id: slot.id,
      testo: `${GIORNO_BREVE[slot.giorno] ?? slot.giorno} ${slot.oraInizio}-${slot.oraFine} · ${slot.campo.palestra.nome} - ${slot.campo.nome}`,
    }));

    return {
      id: gruppo.id,
      nome: gruppo.nome,
      categoria: gruppo.categoria,
      slotFormattati,
      conteggi,
      atleteScadute,
      numeroAtlete: atleteIdDelGruppo.length,
    };
  });

  return (
    <main>
      <h1>Vista d&apos;insieme</h1>
      {cardData.length === 0 ? (
        <p>Nessun Gruppo creato per l&apos;Anno Agonistico corrente.</p>
      ) : (
        <div className={styles.lista}>
          {cardData.map((gruppo) => (
            <GruppoCard key={gruppo.id} gruppo={gruppo} />
          ))}
        </div>
      )}
    </main>
  );
}
