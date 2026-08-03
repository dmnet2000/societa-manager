import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { parseRuoli } from "@/lib/ruoli";
import { raggruppaPerSettimana, parseDataUtc } from "@/lib/raggruppa-per-settimana";
import { PartitaRow } from "./PartitaRow";
import styles from "./partite.module.css";

// Un import riuscito su /campionati (Story 10.2, importaGare) revalida solo
// quella pagina, non questa - force-dynamic bypassa la cache di rendering
// invece di dover ricordarsi di aggiungere revalidatePath("/partite")
// altrove, stesso motivo/pattern gia' scelto per /campionati (Story 10.1).
export const dynamic = "force-dynamic";

// Review fix: timeZone: "UTC" esplicito - senza, il fuso orario locale del
// processo Node (se diverso da UTC) potrebbe mostrare una data sfalsata di
// un giorno rispetto alla stringa "YYYY-MM-DD" originale. parseDataUtc
// riusata da lib/raggruppa-per-settimana.ts invece di una seconda
// implementazione indipendente dello stesso parsing.
function formattaData(data: string): string {
  return parseDataUtc(data).toLocaleDateString("it-IT", { timeZone: "UTC" });
}

export default async function PartitePage() {
  // Sola lettura (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente
  // in una pagina GET - Dev Notes Story 1.6/2.2/10.1).
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

  // Admin/Dirigente vedono le partite di tutti i Gruppi (accesso ampio,
  // AC #3); un Allenatore vede solo quelle dei propri - stesso identico
  // pattern di risoluzione gia' stabilito in campionati/page.tsx.
  const allenatore =
    !eGestionale && user
      ? await prisma.allenatore.findFirst({
          where: { utente: { supabaseAuthId: user.id } },
        })
      : null;

  if (!eGestionale && !allenatore) {
    return (
      <main>
        <h1>Partite</h1>
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

  // Partita/Gruppo/Campionato non sono protetti da RLS (AD-9) - Prisma
  // diretto, stesso pattern di /campionati.
  const partite = annoCorrente
    ? await prisma.partita.findMany({
        where: {
          gruppo: { annoAgonisticoId: annoCorrente.id, ...filtroAllenatore },
        },
        include: {
          gruppo: { select: { nome: true } },
          campionato: { select: { nome: true } },
        },
        orderBy: [{ data: "asc" }, { ora: "asc" }],
      })
    : [];

  const settimane = raggruppaPerSettimana(partite);

  return (
    <main>
      <h1>Partite</h1>
      {settimane.length === 0 && (
        <p className={styles.testo}>Nessuna partita programmata.</p>
      )}
      {settimane.map((settimana) => (
        <section key={settimana.chiave} className={styles.settimana}>
          <h2>{settimana.etichetta}</h2>
          {settimana.partite.length === 0 ? (
            <p className={styles.messaggioVuoto}>
              Nessuna partita questa settimana.
            </p>
          ) : (
            <div className={styles.scrollWrapper}>
              <table className={styles.tabella}>
                <thead>
                  <tr>
                    <th>Giorno</th>
                    <th>Ora</th>
                    <th>Squadre</th>
                    <th>Luogo</th>
                    <th>Gruppo</th>
                    <th>Campionato</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {settimana.partite.map((partita) => (
                    <PartitaRow
                      key={partita.id}
                      partita={{
                        id: partita.id,
                        data: partita.data,
                        dataFormattata: formattaData(partita.data),
                        ora: partita.ora,
                        impianto: partita.impianto,
                        indirizzoImpianto: partita.indirizzoImpianto,
                        squadraCasa: partita.squadraCasa,
                        squadraOspite: partita.squadraOspite,
                        gruppoNome: partita.gruppo.nome,
                        campionatoNome: partita.campionato.nome,
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
