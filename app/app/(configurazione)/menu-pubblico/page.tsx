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
// foto-squadre/page.tsx).
// Story 19.8: app/NavPubblica.tsx legge ora da questa stessa tabella - le
// modifiche fatte qui sono immediatamente visibili sul sito pubblico
// (l'avviso sotto e' stato aggiornato di conseguenza, review fix: prima
// diceva ancora "non collegato", diventato falso e fuorviante non appena
// la 19.8 e' stata completata).
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
        Le modifiche a queste voci sono visibili sul menu del sito pubblico
        non appena salvate. Deve restare sempre almeno una voce visibile: se
        provi a nascondere l&apos;ultima rimasta, il salvataggio viene
        rifiutato.
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
