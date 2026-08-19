import { elencaVociMenuPubblico } from "@/lib/menu-pubblico";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovaVoceMenuPubblicoForm } from "./NuovaVoceMenuPubblicoForm";
import { VoceMenuPubblicoRow } from "./VoceMenuPubblicoRow";
import styles from "./menu-pubblico.module.css";

// Dati mutabili in tempo reale (creazione/modifica/riordino/toggle tramite
// Server Action sulla stessa pagina) - stesso motivo di /app/sponsor.
export const dynamic = "force-dynamic";

// Story 19.7 (Epic 19, Ruolo Site Manager): gestione delle voci introdotte
// dalla Story 19.6 (VoceMenuPubblico) - route-guard.ts limita l'accesso ad
// ADMIN/SITE_MANAGER, nessun controllo di Ruolo ripetuto qui (stesso
// pattern di ogni altra pagina single-purpose del progetto, es.
// foto-squadre/page.tsx). Story 19.8 (non ancora esistente) collegera'
// queste voci al menu pubblico reale (app/NavPubblica.tsx) - fino ad
// allora le modifiche qui non hanno alcun effetto visibile sul sito
// pubblico, da cui l'avviso esplicito sotto.
export default async function MenuPubblicoPage() {
  const [ruoli, voci] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    elencaVociMenuPubblico(),
  ]);

  return (
    <main>
      <TitoloPagina
        titolo="Menu pubblico"
        contenuto={contenutoPerRotta("/app/menu-pubblico", ruoli)}
      />
      <p className={styles.avviso}>
        Le modifiche qui non sono ancora collegate al menu del sito pubblico
        (arriverà con una prossima funzionalità) — per ora servono a
        preparare in anticipo etichette, URL e ordine delle voci.
      </p>

      <section className={styles.sezione}>
        <h2>Nuova voce</h2>
        <NuovaVoceMenuPubblicoForm />
      </section>

      <section className={styles.sezione}>
        <h2>Voci del menu</h2>
        {voci.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessuna voce di menu ancora creata.</p>
        ) : (
          <div className={styles.lista}>
            {voci.map((voce, indice) => (
              <VoceMenuPubblicoRow
                key={voce.id}
                voce={{
                  id: voce.id,
                  etichetta: voce.etichetta,
                  url: voce.url,
                  visibile: voce.visibile,
                }}
                primo={indice === 0}
                ultimo={indice === voci.length - 1}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
