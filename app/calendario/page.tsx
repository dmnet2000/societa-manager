import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { raggruppaPerSettimana } from "@/lib/raggruppa-per-settimana";
import { meseCorrente } from "@/lib/mese-calendario";
import { partitaPerVistaMese } from "@/lib/griglia-mensile";
import { CalendarioVista } from "./CalendarioVista";
import { HeaderPubblico } from "../HeaderPubblico";
import { FooterPubblico } from "../FooterPubblico";
import { RigaPartita } from "../RigaPartita";
import { DecorazioniMatchWeek, classeFasciaMatchWeek } from "../SfondoMatchWeek";
import { propsRigaDaPartita } from "@/lib/props-riga-partita";
import styles from "./calendario.module.css";

// Story 18.9: terza pagina pubblica reale (dopo Home e Squadre). Dati
// possono cambiare in qualunque momento dalla console Admin/Allenatore -
// stesso motivo di dynamic = "force-dynamic" gia' in uso su "/" e "/squadre".
export const dynamic = "force-dynamic";

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
  // Richiesta utente (2026-09-24): l'etichetta sulla card mostra il nome del
  // Campionato, non del Gruppo - un Gruppo puo' partecipare a piu'
  // Campionati (Story 10.1 AC #5), il nome del Campionato identifica meglio
  // la singola partita per chi guarda il sito pubblico. Campionato e'
  // obbligatorio su ogni Partita (FK non nullable), nessun caso null da
  // gestire.
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
            // Seguito Story 18.32: campi del popup di dettaglio della vista
            // Mese (letti qui, mai una richiesta al click).
            giornata: true,
            statoDescrizione: true,
            risultato: true,
            parziali: true,
            // Story 18.32: id aggiunto per la legenda/filtro della vista
            // mensile (una checkbox per Campionato, identificato per id).
            campionato: { select: { id: true, nome: true, colore: true } },
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

  // Story 18.32: la vista mensile riceve solo i campi che mostra e lavora
  // tutta client-side su questi stessi dati, nessuna richiesta al cambio
  // mese. Seguito: anche i campi del popup di dettaglio (palestra,
  // indirizzo, giornata, stato, risultato, parziali), nessuna richiesta al
  // click su una Partita.
  const partiteMese = partite.map(partitaPerVistaMese);

  return (
    <>
      <HeaderPubblico />
      {/* Sfondo Match Week (variante C, scelta utente 2026-10-01) su tutta
          la pagina, titolo e interruttore Elenco/Mese compresi (richiesta
          utente 2026-10-01), stesso della home e di /classifiche. La
          griglia Mese e il popup restano su superficie chiara (vedi
          calendario.module.css). */}
      <main className={`${styles.main} ${classeFasciaMatchWeek}`}>
        <DecorazioniMatchWeek />
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
          // Story 18.32: l'elenco settimanale resta questo Server Component,
          // invariato - CalendarioVista (client) decide solo se mostrare lui
          // o la griglia mensile. Mese iniziale calcolato qui sul server
          // (UTC), mai new Date() nel render client.
          <CalendarioVista partite={partiteMese} meseOggi={meseCorrente()}>
          {settimane.map((settimana) => (
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
                // Story 18.35: riga Match Week condivisa con la home
                // (app/RigaPartita.tsx), stessi dati di prima; mappatura
                // testata in lib/props-riga-partita.ts. Elenco semantico.
                <ul className={styles.matchGrid}>
                  {settimana.partite.map((partita) => (
                    <li key={partita.id}>
                      <RigaPartita {...propsRigaDaPartita(partita)} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          </CalendarioVista>
        )}
      </main>
      <FooterPubblico />
    </>
  );
}
