import styles from "./pulsante-esporta-excel.module.css";

// Story 28.1 (Epic 28): link di download verso la Route Handler di export
// della pagina. <a> semplice e non <Link>: e' un file, non una navigazione
// (niente prefetch RSC); Content-Disposition: attachment lascia l'utente
// sulla pagina.
export function PulsanteEsportaExcel({
  href,
  etichetta = "Esporta Excel",
}: {
  href: string;
  etichetta?: string;
}) {
  return (
    <a href={href} className={styles.pulsante} download>
      {etichetta}
    </a>
  );
}
