import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  calcolaIntervalloStagioneCorrente,
  trovaAnnoAgonisticoCorrente,
  trovaAnnoAgonisticoPrecedente,
} from "@/lib/anno-agonistico";
import { ConfermaWizardForm } from "./ConfermaWizardForm";
import styles from "./wizard-nuova-stagione.module.css";

// Dati potenzialmente diversi ad ogni visita (conferma tramite Server Action
// sulla stessa pagina) - stesso motivo di /gruppi.
export const dynamic = "force-dynamic";

export default async function WizardNuovaStagionePage() {
  // Sola lettura (mai risolviAnnoAgonisticoCorrente in una pagina GET - Dev
  // Notes Story 1.6/2.2): calcolaIntervalloStagioneCorrente non ha bisogno
  // che la riga esista gia' a DB, e' un calcolo puro sulla data odierna.
  const intervalloCorrente = calcolaIntervalloStagioneCorrente(new Date());
  const annoCorrente = await trovaAnnoAgonisticoCorrente();

  // AC #3: se la stagione corrente ha gia' almeno un Gruppo, il wizard si
  // rifiuta di procedere - nessuna logica di merge/duplicazione. Se
  // annoCorrente e' null, la stagione non ha ancora nessuna riga scritta:
  // per definizione zero Gruppi possono esistere (creaGruppo risolve/crea
  // sempre l'Anno Agonistico prima del Gruppo).
  const numeroGruppiEsistenti = annoCorrente
    ? await prisma.gruppo.count({ where: { annoAgonisticoId: annoCorrente.id } })
    : 0;

  if (numeroGruppiEsistenti > 0) {
    return (
      <main>
        <h1>Wizard nuova stagione</h1>
        <p role="alert" className={styles.avviso}>
          Questa stagione ha già dei Gruppi. Il wizard è pensato per il primo
          utilizzo della stagione — per correggere o aggiungere Gruppi usa la{" "}
          <Link href="/gruppi">pagina Gruppi</Link>.
        </p>
      </main>
    );
  }

  // AC #4: nessuna stagione precedente trovata (primo utilizzo assoluto
  // dell'app) - trovaAnnoAgonisticoPrecedente (Story 1.8) riusata identica.
  const annoPrecedente = await trovaAnnoAgonisticoPrecedente({
    dataInizio: intervalloCorrente.dataInizio,
  });

  if (!annoPrecedente) {
    return (
      <main>
        <h1>Wizard nuova stagione</h1>
        <p className={styles.testo}>Nessuna stagione precedente trovata.</p>
      </main>
    );
  }

  // AC #1: Gruppo/GruppoAllenatore/Allenatore non sono protetti da RLS
  // (AD-9) - include Prisma diretto corretto qui, a differenza di Atleta
  // (vedi Dev Notes Story 2.4).
  const gruppiPrecedenti = await prisma.gruppo.findMany({
    where: { annoAgonisticoId: annoPrecedente.id },
    orderBy: { nome: "asc" },
    include: {
      allenatori: {
        include: { allenatore: true },
        orderBy: { allenatore: { nome: "asc" } },
      },
    },
  });

  // Review fix: la stagione precedente esiste ma non ha nessun Gruppo -
  // senza questo controllo la pagina mostrava un elenco vuoto con il
  // pulsante "Conferma" comunque attivo, e il click produceva un errore
  // scollegato solo dopo il submit ("Nessun Gruppo da copiare...").
  if (gruppiPrecedenti.length === 0) {
    return (
      <main>
        <h1>Wizard nuova stagione</h1>
        <p className={styles.testo}>
          La stagione precedente non ha nessun Gruppo da copiare.
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>Wizard nuova stagione</h1>
      <p className={styles.testo}>Dall'anno precedente verranno copiati:</p>
      <ul className={styles.lista}>
        {gruppiPrecedenti.map((gruppo) => (
          <li key={gruppo.id}>
            {gruppo.nome} ({gruppo.categoria})
            {gruppo.allenatori.length > 0 ? (
              <>: {gruppo.allenatori.map((ga) => ga.allenatore.nome).join(", ")}</>
            ) : (
              <> — nessun Allenatore assegnato</>
            )}
          </li>
        ))}
      </ul>
      <ConfermaWizardForm />
    </main>
  );
}
