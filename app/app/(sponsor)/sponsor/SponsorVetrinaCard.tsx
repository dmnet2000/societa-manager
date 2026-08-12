import Link from "next/link";
import type { TipoSponsor } from "@prisma/client";
import styles from "./sponsor.module.css";

type Props = {
  sponsor: {
    id: string;
    nome: string;
    descrizione: string;
    tipo: TipoSponsor;
    linkEsterno: string | null;
    updatedAt: string;
  };
  immagineUrl: string;
};

export function SponsorVetrinaCard({ sponsor, immagineUrl }: Props) {
  const immagine = (
    // eslint-disable-next-line @next/next/no-img-element -- URL pubblico Supabase Storage, stesso pattern gia' accettato in SponsorRow.tsx/logo/page.tsx
    <img
      // Review fix (2026-08-09, Blind Hunter): cache-busting via updatedAt,
      // stesso principio di SponsorRow.tsx/logo/page.tsx.
      src={`${immagineUrl}?v=${encodeURIComponent(sponsor.updatedAt)}`}
      alt={`Immagine di ${sponsor.nome}`}
      className={styles.anteprimaVetrina}
    />
  );

  return (
    <article className={styles.schedaVetrina}>
      {/* Post-review (segnalato dall'utente dal vivo): un Banner senza
          alcuna azione cliccabile non ha senso per uno sponsor - se ha un
          link esterno impostato (Story 16.1, gestione), l'immagine lo apre
          in una nuova scheda. Le Convenzioni non lo usano qui: hanno il
          pulsante "Genera voucher" sotto, non l'immagine cliccabile. */}
      {sponsor.tipo === "BANNER" && sponsor.linkEsterno ? (
        <a
          href={sponsor.linkEsterno}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.linkImmagineBanner}
          aria-label={`Vai al sito di ${sponsor.nome}`}
        >
          {immagine}
        </a>
      ) : (
        immagine
      )}
      <h3>{sponsor.nome}</h3>
      <p>{sponsor.descrizione}</p>
      {/* AC #3: il pulsante "Genera voucher" compare solo sulle Convenzioni,
          mai sui Banner pubblicitari. */}
      {sponsor.tipo === "CONVENZIONE" && (
        <Link
          href={`/app/sponsor/${sponsor.id}/voucher`}
          className={`${styles.bottone} ${styles.linkVoucher}`}
        >
          Genera voucher
        </Link>
      )}
    </article>
  );
}
