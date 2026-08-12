import { prisma } from "@/lib/prisma";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovoAllenatoreForm } from "./NuovoAllenatoreForm";
import { AllenatoreRow } from "./AllenatoreRow";
import styles from "./precaricamento-allenatori.module.css";

// Story 9.9: la pagina passa da Client Component (solo form) a Server
// Component (form + elenco) - stesso schema di /palestre. Dati mutabili in
// tempo reale (precaricamento/modifica/cancellazione sulla stessa pagina),
// stesso motivo di /admin, /palestre.
export const dynamic = "force-dynamic";

export default async function PrecaricamentoAllenatoriPage() {
  // Story 17.2 (review fix): ruoli e allenatori non dipendono l'uno
  // dall'altro - eseguiti in Promise.all, stesso principio gia' stabilito
  // altrove nel progetto. Allenatore non e' protetto da RLS (AD-9) - Prisma
  // diretto, come /palestre. Il guard-clause di cancellazione (AC #4) vive
  // interamente dentro cancellaAllenatore (where compound sulla
  // deleteMany) - qui non serve includere "gruppi".
  const [ruoli, allenatori] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    prisma.allenatore.findMany({
      orderBy: [{ nome: "asc" }, { cognome: "asc" }],
    }),
  ]);

  return (
    <main>
      <TitoloPagina
        titolo="Precaricamento Allenatori"
        contenuto={contenutoPerRotta("/app/precaricamento-allenatori", ruoli)}
      />

      <section className={styles.sezione}>
        <h2>Nuovo Allenatore</h2>
        <NuovoAllenatoreForm />
      </section>

      <section className={styles.sezione}>
        <h2>Elenco Allenatori</h2>
        {allenatori.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessun Allenatore precaricato.</p>
        ) : (
          // Review fix: wrapper con overflow-x:auto - la riga (Nome + Cognome
          // + Codice Fiscale a 16 caratteri + Stato + due pulsanti-icona da
          // 44px) puo' eccedere la larghezza di un viewport mobile stretto;
          // senza questo wrapper la tabella romperebbe il layout invece di
          // scorrere orizzontalmente solo al suo interno.
          <div className={styles.tabellaScroll}>
            <table className={styles.tabella}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Cognome</th>
                  <th>Codice Fiscale</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {allenatori.map((allenatore) => (
                  <AllenatoreRow key={allenatore.id} allenatore={allenatore} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
