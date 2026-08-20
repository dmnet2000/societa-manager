import Link from "next/link";
import { elencaPaginePubbliche } from "@/lib/pagine-pubbliche";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { EliminaPaginaPubblicaForm } from "./EliminaPaginaPubblicaForm";
import styles from "./pagine-pubbliche.module.css";

// Dati mutabili in tempo reale (creazione/modifica/eliminazione tramite
// Server Action sulla stessa area) - stesso motivo di /app/menu-pubblico.
export const dynamic = "force-dynamic";

// Story 19.10 (Epic 19, Ruolo Site Manager): gestione delle Pagine
// introdotte dalla Story 19.9 (PaginaPubblica) - route-guard.ts limita
// l'accesso ad ADMIN/SITE_MANAGER, nessun controllo di Ruolo ripetuto qui
// (stesso pattern di ogni altra pagina single-purpose del progetto).
export default async function PaginePubblichePage() {
  const [ruoli, pagine] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    elencaPaginePubbliche(),
  ]);

  return (
    <main>
      <TitoloPagina
        titolo="Pagine pubbliche"
        contenuto={contenutoPerRotta("/app/pagine-pubbliche", ruoli)}
      />
      <p className={styles.avviso}>
        Una Pagina salvata è subito visibile pubblicamente all&apos;URL
        scelto - non esiste uno stato bozza. Per collegarla al menu del sito
        pubblico, aggiungi una voce corrispondente in{" "}
        <Link href="/app/menu-pubblico" className={styles.link}>
          Menu pubblico
        </Link>
        .
      </p>

      <Link href="/app/pagine-pubbliche/nuova" className={styles.bottone}>
        Nuova pagina
      </Link>

      <section className={styles.sezione}>
        <h2>Pagine create</h2>
        {pagine.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessuna Pagina creata.</p>
        ) : (
          <div className={styles.lista}>
            {pagine.map((pagina) => (
              <article key={pagina.id} className={styles.card}>
                <div className={styles.intestazioneCard}>
                  <strong>{pagina.titolo}</strong>
                  <span className={styles.slug}>{pagina.slug}</span>
                </div>
                <div className={styles.azioniIntestazione}>
                  <Link href={`/app/pagine-pubbliche/${pagina.id}`} className={styles.link}>
                    Modifica
                  </Link>
                  <Link
                    href={pagina.slug}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    Vedi pagina pubblica
                  </Link>
                  <EliminaPaginaPubblicaForm id={pagina.id} titolo={pagina.titolo} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
