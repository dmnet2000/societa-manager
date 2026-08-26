import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/auth-admin/client";
import { calcolaEmailConfermataPerAuthId } from "@/lib/auth-admin/email-confermata";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovoUtenteForm } from "./NuovoUtenteForm";
import { UtenteRow } from "./UtenteRow";
import styles from "./admin.module.css";

// Pagina di gestione utenti con dati mutabili in tempo reale (creazione,
// disattivazione, riassegnazione Ruoli tramite Server Action sulla stessa
// pagina) - va sempre renderizzata per-richiesta, mai come snapshot statico
// generato al build.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Story 17.2 (review fix): risolviRuoliPerAiutoContestuale() e la lettura
  // Utenti non dipendono l'una dall'altra - eseguite in Promise.all, stesso
  // principio gia' stabilito altrove nel progetto (es. mio-orario/page.tsx),
  // invece di un await sequenziale che aggiungerebbe un giro di rete in piu'
  // solo per l'icona "?".
  const [ruoliAiuto, utenti, listaUtentiAuth] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    // Utente/UtenteRuolo non sono protetti da RLS (AD-9): gestibili via
    // Prisma diretto, come in Story 1.1.
    prisma.utente.findMany({
      include: { ruoli: true },
      orderBy: { email: "asc" },
    }),
    // Story 9.38: una sola chiamata listUsers() per l'intera lista (non
    // getUserById per riga) - evita N chiamate all'Admin API ad ogni
    // caricamento di questa pagina. Nessuna paginazione gestita
    // esplicitamente (limite accettato, vedi Design Notes della story - una
    // lista di un club anche numeroso resta ben dentro un singolo giro).
    createAdminClient().auth.admin.listUsers(),
  ]);

  // Review fix: se listUsers() fallisce, listaUtentiAuth.data e' undefined e
  // la mappa sotto resta vuota - OGNI Utente finirebbe silenziosamente
  // trattato come "gia' confermato" (fail-safe `?? true` piu' sotto) senza
  // alcuna traccia. Log esplicito, cosi' il fallimento resta almeno visibile
  // nei log server invece di sparire senza lasciare traccia.
  if (listaUtentiAuth.error) {
    console.error(
      "[AdminPage] listUsers() fallita - emailConfermata non calcolabile per nessun Utente in questo caricamento",
      listaUtentiAuth.error
    );
  }

  // Mappa supabaseAuthId -> se l'email e' stata confermata (usata per
  // decidere se mostrare il form "Correggi email" per ciascun Utente).
  // Estratta in una funzione pura testata separatamente (Story 9.38 review
  // fix): lib/auth-admin/email-confermata.ts.
  const emailConfermataPerAuthId = calcolaEmailConfermataPerAuthId(
    listaUtentiAuth.data?.users ?? []
  );

  return (
    <main>
      <TitoloPagina
        titolo="Amministrazione"
        contenuto={contenutoPerRotta("/app/admin", ruoliAiuto)}
      />

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
                <th></th>
                <th>Correggi email</th>
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
                      // Fail-safe: se l'Utente Auth non e' stato trovato in
                      // listUsers() per qualche motivo, tratta come
                      // confermato - non mostrare il form di correzione
                      // invece di rischiare di mostrarlo per un Utente in
                      // realta' gia' confermato.
                      emailConfermata:
                        emailConfermataPerAuthId.get(utente.supabaseAuthId) ?? true,
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
