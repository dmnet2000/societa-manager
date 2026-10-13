import { elencaFederazioni } from "@/lib/federazioni";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovaFederazioneForm } from "./NuovaFederazioneForm";
import { FederazioneRow } from "./FederazioneRow";
import styles from "./federazioni.module.css";

// Dati mutabili in tempo reale (creazione/modifica/riordino/toggle tramite
// Server Action sulla stessa pagina) - stesso motivo di /app/menu-pubblico.
export const dynamic = "force-dynamic";

// Story 26.1 (Epic 26, Tesseramento multi-Federazione): mirror strutturale
// di menu-pubblico/page.tsx. route-guard.ts limita l'accesso ad
// ADMIN/DIRIGENTE, nessun controllo di Ruolo ripetuto qui.
export default async function FederazioniPage() {
  const [ruoli, federazioni] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    elencaFederazioni(),
  ]);

  return (
    <main>
      <TitoloPagina
        titolo="Federazioni"
        contenuto={contenutoPerRotta("/app/federazioni", ruoli)}
      />
      <p className={styles.avviso}>
        Le federazioni con cui un&apos;Atleta può essere tesserata. Una
        federazione disattivata non è più selezionabile per nuovi
        tesseramenti; una federazione già usata in un tesseramento non può
        essere eliminata, solo disattivata.
      </p>

      <section className={styles.sezione}>
        <h2>Nuova federazione</h2>
        <NuovaFederazioneForm />
      </section>

      <section className={styles.sezione}>
        <h2>Federazioni</h2>
        {federazioni.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessuna federazione ancora creata.</p>
        ) : (
          <div className={styles.lista}>
            {federazioni.map((federazione, indice) => (
              <FederazioneRow
                key={federazione.id}
                federazione={{
                  id: federazione.id,
                  nome: federazione.nome,
                  sigla: federazione.sigla,
                  attiva: federazione.attiva,
                }}
                primo={indice === 0}
                ultimo={indice === federazioni.length - 1}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
