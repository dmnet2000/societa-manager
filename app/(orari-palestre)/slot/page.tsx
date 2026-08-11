import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovoSlotForm } from "./NuovoSlotForm";
import { SlotRow } from "./SlotRow";
import styles from "./slot.module.css";

// Dati mutabili in tempo reale (creazione Slot tramite Server Action sulla
// stessa pagina) - stesso motivo di /admin e /palestre (Story 1.2, 2.1).
export const dynamic = "force-dynamic";

export default async function SlotPage() {
  // Story 17.2 (review fix): le due risoluzioni non dipendono l'una
  // dall'altra - eseguite in Promise.all, stesso principio gia' stabilito
  // altrove nel progetto. Sola lettura (trovaAnnoAgonisticoCorrente, mai
  // risolviAnnoAgonisticoCorrente in una pagina GET - Dev Notes Story 1.6).
  // Slot non ha una colonna annoAgonisticoId propria (AD-8, transitiva via
  // Gruppo) - il filtro per stagione corrente passa quindi da una
  // relazione, non da una colonna diretta (applicato fin da subito, stessa
  // lezione gia' rifatta piu' volte in code review per
  // Gruppo/GruppoAtleta/GruppoAllenatore, Story 2.2/2.3/2.4).
  const [ruoli, annoCorrente] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaAnnoAgonisticoCorrente(),
  ]);

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
      {/* Story 15.5 (review fix): il navLabel di questa rotta e' diventato
          "Orari" (route-guard.ts) - il titolo di pagina deve corrispondere,
          altrimenti un utente che clicca "Orari" nel menu atterrerebbe su
          una pagina ancora intitolata "Slot", vanificando la disambiguazione
          che il rename voleva ottenere. I sotto-titoli "Nuovo Slot"/"Elenco
          Slot" restano invariati: si riferiscono all'entita' di dominio
          Slot che si sta gestendo, non al nome della pagina in nav. */}
      <TitoloPagina
        titolo="Orari"
        contenuto={contenutoPerRotta("/slot", ruoli)}
      />

      <section className={styles.sezione}>
        <h2>Nuovo Slot</h2>
        <NuovoSlotForm campi={campi} gruppi={gruppi} />
      </section>

      <section className={styles.sezione}>
        <h2>Elenco Slot</h2>
        {slot.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessuno Slot inserito.</p>
        ) : (
          <table className={styles.tabella}>
            <thead>
              <tr>
                <th>Giorno</th>
                <th>Orario</th>
                <th>Campo</th>
                <th>Gruppo</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {slot.map((s) => (
                <SlotRow key={s.id} slot={s} campi={campi} gruppi={gruppi} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
