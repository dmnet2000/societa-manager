import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { parseRuoli } from "@/lib/ruoli";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovoCampionatoForm } from "./NuovoCampionatoForm";
import { ImportaGareForm } from "./ImportaGareForm";
import { EliminaCampionatoForm } from "./EliminaCampionatoForm";
import { ModificaCampionatoForm } from "./ModificaCampionatoForm";
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
        <TitoloPagina titolo="Campionati" contenuto={contenutoPerRotta("/app/campionati", ruoli)} />
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

  // Gruppo/Campionato/Allenatore non sono protetti da RLS (AD-9) - Prisma
  // diretto, stesso pattern di /gruppi. Story 10.7: Campionato ha ora un
  // gruppoId diretto - una sola query basta, nessun secondo giro per
  // calcolare i Campionati "disponibili" da collegare (funzionalità rimossa).
  const gruppi = annoCorrente
    ? await prisma.gruppo.findMany({
        where: { annoAgonisticoId: annoCorrente.id, ...filtroAllenatore },
        orderBy: { nome: "asc" },
        include: { campionati: { orderBy: { nome: "asc" } } },
      })
    : [];

  return (
    <main>
      <TitoloPagina titolo="Campionati" contenuto={contenutoPerRotta("/app/campionati", ruoli)} />
      <div className={styles.scrollWrapper}>
        <table className={styles.tabella}>
          <thead>
            <tr>
              <th>Gruppo</th>
              <th>Campionati</th>
            </tr>
          </thead>
          <tbody>
            {gruppi.map((gruppo) => (
              <tr key={gruppo.id}>
                <td>{gruppo.nome}</td>
                <td>
                  <ul className={styles.listaAssegnati}>
                    {gruppo.campionati.map((campionato) => (
                      <li key={campionato.id}>
                        <ModificaCampionatoForm
                          campionatoId={campionato.id}
                          nome={campionato.nome}
                          linkFipav={campionato.linkFipav}
                        />
                        <ImportaGareForm
                          gruppoId={gruppo.id}
                          campionatoId={campionato.id}
                        />
                        <EliminaCampionatoForm
                          campionatoId={campionato.id}
                          nome={campionato.nome}
                        />
                      </li>
                    ))}
                  </ul>
                  <NuovoCampionatoForm gruppoId={gruppo.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
