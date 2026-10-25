import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { PulsanteEsportaExcel } from "@/app/PulsanteEsportaExcel";
import styles from "./export-dati.module.css";

// Story 28.4 (Epic 28): pagina solo Admin che raccoglie l'export completo e
// i tre export di sezione (Story 28.1-28.3), gia' raggiungibili anche
// dalle rispettive pagine. Nessun dato letto qui: i file sono generati
// dalle Route Handler al clic.
export const dynamic = "force-dynamic";

const EXPORT_DI_SEZIONE = [
  {
    href: "/app/conferma-certificati/export",
    etichetta: "Certificati medici",
  },
  {
    href: "/app/conferma-iscrizioni/export",
    etichetta: "Iscrizioni",
  },
  {
    href: "/app/conferma-tesseramenti/export",
    etichetta: "Tesseramenti",
  },
];

export default async function ExportDatiPage() {
  const ruoli = await risolviRuoliPerAiutoContestuale();

  return (
    <main>
      <TitoloPagina
        titolo="Export dati"
        contenuto={contenutoPerRotta("/app/export-dati", ruoli)}
      />

      <section className={styles.sezione}>
        <h2 className={styles.titoloSezione}>Export completo</h2>
        <p>
          Una riga per ogni Atleta della stagione con anagrafica, Gruppo, certificato
          medico, iscrizione e tesseramento.
        </p>
        <PulsanteEsportaExcel href="/app/export-dati/export" etichetta="Export completo" />
      </section>

      <section className={styles.sezione}>
        <h2 className={styles.titoloSezione}>Export per sezione</h2>
        <p>Gli stessi file che trovi nelle pagine di conferma.</p>
        <ul className={styles.elenco}>
          {EXPORT_DI_SEZIONE.map((voce) => (
            <li key={voce.href}>
              <PulsanteEsportaExcel href={voce.href} etichetta={voce.etichetta} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
