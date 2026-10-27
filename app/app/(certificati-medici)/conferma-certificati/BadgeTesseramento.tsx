import styles from "./conferma-certificati.module.css";

// Dove e' tesserata l'Atleta nella stagione corrente (sigle delle
// Federazioni, lette in page.tsx da lib/tesseramento.ts), accanto al
// Certificato da confermare o confermato - richiesta utente 2026-10-27,
// visibile a tutti i Ruoli della pagina, Segreteria compresa. Stesso testo
// del badge di /app/gruppi ("Tesserata · FIPAV, CSI" / "Non tesserata");
// "Non tesserata" resta neutro qui: e' un'informazione di contesto, non lo
// stato da confermare in questa pagina.
export function BadgeTesseramento({ federazioni }: { federazioni: string[] }) {
  return federazioni.length > 0 ? (
    <span className={styles.badgeTesserata}>Tesserata · {federazioni.join(", ")}</span>
  ) : (
    <span className={styles.badgeNonTesserata}>Non tesserata</span>
  );
}
