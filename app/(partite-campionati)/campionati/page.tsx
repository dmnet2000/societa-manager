import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { parseRuoli } from "@/lib/ruoli";
import { NuovoCampionatoForm } from "./NuovoCampionatoForm";
import { CollegaCampionatoForm } from "./CollegaCampionatoForm";
import styles from "./campionati.module.css";

// Dati mutabili in tempo reale (creazione/collegamento Campionato tramite
// Server Action sulla stessa pagina) - stesso motivo di /gruppi (Story 2.2).
export const dynamic = "force-dynamic";

export default async function CampionatiPage() {
  // Sola lettura (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente
  // in una pagina GET - Dev Notes Story 1.6/2.2).
  const annoCorrente = await trovaAnnoAgonisticoCorrente();

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
  }

  const ruoli = parseRuoli(user?.app_metadata?.ruoli);
  const eGestionale = ruoli.includes("ADMIN") || ruoli.includes("DIRIGENTE");

  // Admin/Dirigente vedono tutti i Gruppi (accesso ampio, AC #3); un
  // Allenatore vede solo i propri (stesso pattern di risoluzione "sono un
  // Allenatore?" gia' usato in dati-fisici/page.tsx).
  const allenatore =
    !eGestionale && user
      ? await prisma.allenatore.findFirst({
          where: { utente: { supabaseAuthId: user.id } },
        })
      : null;

  if (!eGestionale && !allenatore) {
    return (
      <main>
        <h1>Campionati</h1>
        <p className={styles.testo}>
          Il tuo account non è ancora collegato a un profilo Allenatore.
          Contatta la segreteria.
        </p>
      </main>
    );
  }

  const filtroAllenatore = eGestionale
    ? undefined
    : { allenatori: { some: { allenatoreId: allenatore!.id } } };

  // Gruppo/Campionato/GruppoCampionato/Allenatore non sono protetti da RLS
  // (AD-9) - Prisma diretto, stesso pattern di /gruppi.
  const [gruppi, tuttiCampionati] = await Promise.all([
    annoCorrente
      ? prisma.gruppo.findMany({
          where: { annoAgonisticoId: annoCorrente.id, ...filtroAllenatore },
          orderBy: { nome: "asc" },
          include: { campionati: { include: { campionato: true } } },
        })
      : Promise.resolve([]),
    annoCorrente
      ? prisma.campionato.findMany({
          where: { annoAgonisticoId: annoCorrente.id },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main>
      <h1>Campionati</h1>
      <div className={styles.scrollWrapper}>
        <table className={styles.tabella}>
          <thead>
            <tr>
              <th>Gruppo</th>
              <th>Campionati</th>
            </tr>
          </thead>
          <tbody>
            {gruppi.map((gruppo) => {
              const collegati = gruppo.campionati.map((gc) => gc.campionato);
              const collegatiIds = new Set(collegati.map((c) => c.id));
              const disponibili = tuttiCampionati.filter(
                (c) => !collegatiIds.has(c.id)
              );

              return (
                <tr key={gruppo.id}>
                  <td>{gruppo.nome}</td>
                  <td>
                    <ul className={styles.listaAssegnati}>
                      {collegati.map((campionato) => (
                        <li key={campionato.id}>{campionato.nome}</li>
                      ))}
                    </ul>
                    <NuovoCampionatoForm gruppoId={gruppo.id} />
                    <CollegaCampionatoForm
                      gruppoId={gruppo.id}
                      campionatiDisponibili={disponibili}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
