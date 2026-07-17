import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { NuovoSlotForm } from "./NuovoSlotForm";
import { SlotTable } from "../SlotTable";

// Dati mutabili in tempo reale (creazione Slot tramite Server Action sulla
// stessa pagina) - stesso motivo di /admin e /palestre (Story 1.2, 2.1).
export const dynamic = "force-dynamic";

export default async function SlotPage() {
  // Sola lettura (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente
  // in una pagina GET - Dev Notes Story 1.6). Slot non ha una colonna
  // annoAgonisticoId propria (AD-8, transitiva via Gruppo) - il filtro per
  // stagione corrente passa quindi da una relazione, non da una colonna
  // diretta (applicato fin da subito, stessa lezione gia' rifatta piu' volte
  // in code review per Gruppo/GruppoAtleta/GruppoAllenatore, Story 2.2/2.3/2.4).
  const annoCorrente = await trovaAnnoAgonisticoCorrente();

  // Slot/Campo/Gruppo/Palestra non sono protetti da RLS (AD-9) - tutte
  // letture Prisma dirette, nessun client Supabase necessario qui (a
  // differenza di Story 2.4, che doveva leggere Atleta).
  const [campi, gruppi, slot] = await Promise.all([
    prisma.campo.findMany({
      include: { palestra: true },
      orderBy: [{ palestra: { nome: "asc" } }, { nome: "asc" }],
    }),
    annoCorrente
      ? prisma.gruppo.findMany({
          where: { annoAgonisticoId: annoCorrente.id },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
    annoCorrente
      ? prisma.slot.findMany({
          where: { gruppo: { annoAgonisticoId: annoCorrente.id } },
          include: { campo: { include: { palestra: true } }, gruppo: true },
          orderBy: [{ giorno: "asc" }, { oraInizio: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  return (
    <main>
      <h1>Slot</h1>

      <section>
        <h2>Nuovo Slot</h2>
        <NuovoSlotForm campi={campi} gruppi={gruppi} />
      </section>

      <section>
        <h2>Elenco Slot</h2>
        <SlotTable slot={slot} />
      </section>
    </main>
  );
}
