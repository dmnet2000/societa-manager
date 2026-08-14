import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { raggruppaPerSettimana, parseDataUtc } from "@/lib/raggruppa-per-settimana";
import { costruisciLinkNaviga } from "@/lib/link-naviga-palestra";
import { HeaderPubblico } from "../HeaderPubblico";
import { FooterPubblico } from "../FooterPubblico";
import styles from "./calendario.module.css";

// Story 18.9: terza pagina pubblica reale (dopo Home e Squadre). Dati
// possono cambiare in qualunque momento dalla console Admin/Allenatore -
// stesso motivo di dynamic = "force-dynamic" gia' in uso su "/" e "/squadre".
export const dynamic = "force-dynamic";

// Mirror del wrapper locale gia' in uso in app/page.tsx e
// app/app/(partite-campionati)/partite/page.tsx - parseDataUtc riusata
// (mai un secondo parsing indipendente), timeZone: "UTC" esplicito.
function formattaData(data: string): string {
  return parseDataUtc(data).toLocaleDateString("it-IT", { timeZone: "UTC" });
}

export default async function CalendarioPage() {
  // Nessuna sessione qui (pagina pubblica). Sola lettura
  // (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente in una
  // pagina GET - side-effect di scrittura non ammissibile qui). .catch()
  // fail-soft fin dalla prima stesura (lezione di code review Story 18.8:
  // senza, un errore DB transiente farebbe crashare l'intera pagina invece
  // di degradare al messaggio esplicito dell'AC #3).
  const annoCorrente = await trovaAnnoAgonisticoCorrente().catch((err) => {
    console.error(err);
    return null;
  });

  // Mirror del filtro/orderBy di /app/partite (stagione intera via
  // annoAgonisticoId), ma con "select" (non "include", convenzione
  // public-page) e senza scoping per Ruolo - qui sempre tutti i Gruppi.
  // Stesso identico select gia' in uso per il teaser "Partite della
  // settimana" in app/page.tsx (AC #2: stessi campi di Story 18.3).
  const partite = annoCorrente
    ? await prisma.partita
        .findMany({
          where: { gruppo: { annoAgonisticoId: annoCorrente.id } },
          orderBy: [{ data: "asc" }, { ora: "asc" }],
          select: {
            id: true,
            data: true,
            ora: true,
            squadraCasa: true,
            squadraOspite: true,
            impianto: true,
            indirizzoImpianto: true,
            gruppo: { select: { nome: true } },
          },
        })
        .catch((err) => {
          console.error(err);
          return [];
        })
    : [];

  // Riuso diretto (gia' esportata e testata, Story 10.3) - genera ogni
  // settimana lunedi'-domenica tra la prima e l'ultima partita della
  // stagione, incluse le settimane senza alcuna partita (AC #1).
  const settimane = raggruppaPerSettimana(partite);

  return (
    <>
      <HeaderPubblico />
      <main className={styles.main}>
        <h1 className={styles.titolo}>Calendario</h1>
        {/* AC #3: messaggio esplicito invece di un'area vuota quando
            l'intera stagione non ha alcuna partita programmata (incluso il
            caso in cui annoCorrente stesso e' assente) - distinto dal
            messaggio "Nessuna partita questa settimana" sotto, che copre
            una singola settimana vuota dentro una stagione che ne ha
            comunque altre altrove. */}
        {settimane.length === 0 ? (
          <p className={styles.messaggioVuoto}>
            Nessuna partita programmata per la stagione in corso.
          </p>
        ) : (
          settimane.map((settimana) => (
            <section
              key={settimana.chiave}
              className={styles.sezioneSettimana}
              aria-labelledby={`settimana-${settimana.chiave}`}
            >
              <h2 id={`settimana-${settimana.chiave}`} className={styles.titoloSettimana}>
                {settimana.etichetta}
              </h2>
              {settimana.partite.length === 0 ? (
                <p className={styles.messaggioSettimanaVuota}>
                  Nessuna partita questa settimana.
                </p>
              ) : (
                <div className={styles.matchGrid}>
                  {settimana.partite.map((partita) => {
                    const linkNaviga = costruisciLinkNaviga({
                      indirizzo: partita.indirizzoImpianto,
                    });
                    return (
                      <div className={styles.matchCard} key={partita.id}>
                        <div className={styles.categoria}>{partita.gruppo.nome}</div>
                        <div className={styles.squadre}>
                          <span>{partita.squadraCasa}</span>
                          <span className={styles.vs}>vs</span>
                          <span>{partita.squadraOspite}</span>
                        </div>
                        <div className={styles.meta}>
                          <span>{formattaData(partita.data)}</span>
                          <span>{partita.ora}</span>
                          {partita.impianto && <span>{partita.impianto}</span>}
                          {linkNaviga && (
                            <a
                              className={styles.linkNaviga}
                              href={linkNaviga}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Naviga verso ${partita.impianto || "il luogo della partita"}`}
                            >
                              Naviga
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))
        )}
      </main>
      <FooterPubblico />
    </>
  );
}
