import styles from "./pulsante-esporta-excel.module.css";

// Story 28.1 (Epic 28): link di download verso la Route Handler di export
// della pagina. <a> semplice e non <Link>: e' un file, non una navigazione
// (niente prefetch RSC); Content-Disposition: attachment lascia l'utente
// sulla pagina.
// Review fix (code review Epic 28): niente attributo download - con
// download il browser salverebbe come file qualunque risposta, compresa la
// pagina di login a cui il middleware rimanda una sessione scaduta o il
// testo di un errore 500. Senza, il file .xlsx si scarica comunque grazie a
// Content-Disposition, e in caso di errore si vede la pagina giusta.
export function PulsanteEsportaExcel({
  href,
  etichetta = "Esporta Excel",
}: {
  href: string;
  etichetta?: string;
}) {
  return (
    <a href={href} className={styles.pulsante}>
      {etichetta}
    </a>
  );
}
