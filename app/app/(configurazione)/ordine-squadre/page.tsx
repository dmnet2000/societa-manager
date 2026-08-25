import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { elencaGruppiOrdinati } from "@/lib/ordine-squadre";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { GruppoOrdineRow } from "./GruppoOrdineRow";
import styles from "./ordine-squadre.module.css";

// Dati mutabili in tempo reale (riordino tramite Server Action sulla stessa
// pagina) - stesso motivo di /app/menu-pubblico.
export const dynamic = "force-dynamic";

// Story 19.15 (Epic 19, Ruolo Site Manager): mirror strutturale di
// /app/menu-pubblico/page.tsx (Story 19.7) - route-guard.ts limita l'accesso
// ad ADMIN/SITE_MANAGER, nessun controllo di Ruolo ripetuto qui (stesso
// pattern di ogni altra pagina single-purpose del progetto).
export default async function OrdineSquadrePage() {
  // Review fix (Blind Hunter): a differenza di menu-pubblico/page.tsx (che
  // NON avvolge la propria lettura in try/catch, lasciando propagare
  // l'errore all'error boundary), qui il fail-soft e' deliberato - stessa
  // scelta gia' fatta ovunque nel progetto per trovaAnnoAgonisticoCorrente()
  // (mai risolviAnnoAgonisticoCorrente in una pagina GET: side-effect di
  // scrittura non ammissibile qui), es. app/squadre/page.tsx,
  // app/calendario/page.tsx. VoceMenuPubblico non dipende da una stagione
  // corrente, quindi quel mirror non aveva questo stesso rischio di
  // fallimento transitorio da degradare esplicitamente.
  const [ruoli, annoCorrente] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaAnnoAgonisticoCorrente().catch((err) => {
      console.error(err);
      return null;
    }),
  ]);

  const gruppi = annoCorrente
    ? await elencaGruppiOrdinati(annoCorrente.id).catch((err) => {
        console.error(err);
        return [];
      })
    : [];

  return (
    <main>
      <TitoloPagina
        titolo="Ordine squadre"
        contenuto={contenutoPerRotta("/app/ordine-squadre", ruoli)}
      />
      <p className={styles.avviso}>
        L&apos;ordine impostato qui determina l&apos;ordine con cui le
        squadre compaiono sulla pagina pubblica &quot;/squadre&quot;, non
        appena salvato.
      </p>

      <section className={styles.sezione}>
        <h2>Squadre della stagione corrente</h2>
        {!annoCorrente ? (
          <p className={styles.messaggioVuoto}>
            Nessuna stagione corrente trovata.
          </p>
        ) : gruppi.length === 0 ? (
          <p className={styles.messaggioVuoto}>
            Nessuna squadra creata per la stagione corrente.
          </p>
        ) : (
          <div className={styles.lista}>
            {gruppi.map((gruppo, indice) => (
              <GruppoOrdineRow
                key={gruppo.id}
                gruppo={{
                  id: gruppo.id,
                  nome: gruppo.nome,
                  categoria: gruppo.categoria,
                }}
                primo={indice === 0}
                ultimo={indice === gruppi.length - 1}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
