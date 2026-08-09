import Link from "next/link";
import styles from "./sponsor.module.css";

type Props = {
  sponsor: { id: string; nome: string; descrizione: string; updatedAt: string };
  immagineUrl: string;
  // AC #3: il pulsante "Genera voucher" compare solo sulle Convenzioni, mai
  // sui Banner pubblicitari.
  mostraVoucher: boolean;
};

export function SponsorVetrinaCard({ sponsor, immagineUrl, mostraVoucher }: Props) {
  return (
    <article className={styles.schedaVetrina}>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL pubblico Supabase Storage, stesso pattern gia' accettato in SponsorRow.tsx/logo/page.tsx */}
      <img
        // Review fix (2026-08-09, Blind Hunter): cache-busting via updatedAt,
        // stesso principio di SponsorRow.tsx/logo/page.tsx - senza, la
        // vetrina puo' mostrare un'immagine sostituita dall'Admin ancora
        // dalla cache del browser.
        src={`${immagineUrl}?v=${encodeURIComponent(sponsor.updatedAt)}`}
        alt={`Immagine di ${sponsor.nome}`}
        className={styles.anteprimaVetrina}
      />
      <h3>{sponsor.nome}</h3>
      <p>{sponsor.descrizione}</p>
      {mostraVoucher && (
        <Link href={`/sponsor/${sponsor.id}/voucher`} className={`${styles.bottone} ${styles.linkVoucher}`}>
          Genera voucher
        </Link>
      )}
    </article>
  );
}
