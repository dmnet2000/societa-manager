import { prisma } from "@/lib/prisma";
import { NuovoUtenteForm } from "./NuovoUtenteForm";
import { UtenteRow } from "./UtenteRow";
import styles from "./admin.module.css";

// Pagina di gestione utenti con dati mutabili in tempo reale (creazione,
// disattivazione, riassegnazione Ruoli tramite Server Action sulla stessa
// pagina) - va sempre renderizzata per-richiesta, mai come snapshot statico
// generato al build.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Utente/UtenteRuolo non sono protetti da RLS (AD-9): gestibili via Prisma
  // diretto, come in Story 1.1.
  const utenti = await prisma.utente.findMany({
    include: { ruoli: true },
    orderBy: { email: "asc" },
  });

  return (
    <main>
      <h1>Amministrazione</h1>

      <section className={styles.sezione}>
        <h2>Nuovo utente</h2>
        <NuovoUtenteForm />
      </section>

      <section className={styles.sezione}>
        <h2>Utenti</h2>
        <div className={styles.scrollWrapper}>
          <table className={styles.tabella}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Ruoli</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {utenti.map((utente) => {
                const ruoli = utente.ruoli.map((r) => r.ruolo);
                return (
                  <UtenteRow
                    // Include i Ruoli nella key: forza il remount (e quindi il
                    // refresh delle checkbox non controllate) quando cambiano.
                    key={`${utente.id}:${ruoli.join(",")}`}
                    utente={{
                      id: utente.id,
                      email: utente.email,
                      attivo: utente.attivo,
                      ruoli,
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
