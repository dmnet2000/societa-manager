import type { SponsorVetrina } from "@/lib/sponsor/raggruppa-sponsor-per-tipo";
import styles from "./home-pubblica.module.css";

// Story 18.2: struttura visiva di riferimento da SponsorVetrinaCard.tsx
// (app/app/(sponsor)/sponsor/SponsorVetrinaCard.tsx) - copiata, non
// importata: quel componente include il pulsante "Genera voucher", fuori
// scope qui (vedi Dev Notes della story, nessuna fonte di Nome/Cognome per
// un Visitatore anonimo). Nessuna azione cliccabile sulle Convenzioni in
// questa scheda pubblica.
// Review fix (Blind Hunter): riusa il tipo gia' esportato SponsorVetrina
// invece di ridichiararlo a mano - terza copia indipendente della stessa
// forma dati altrimenti (la seconda, in SponsorVetrinaCard.tsx, e'
// preesistente e fuori scope di questa story).
type Props = {
  sponsor: SponsorVetrina;
  immagineUrl: string;
};

export function SponsorPubblicoCard({ sponsor, immagineUrl }: Props) {
  const immagine = (
    // eslint-disable-next-line @next/next/no-img-element -- URL pubblico Supabase Storage, stesso pattern gia' accettato in SponsorVetrinaCard.tsx
    <img
      src={`${immagineUrl}?v=${encodeURIComponent(sponsor.updatedAt)}`}
      alt={`Immagine di ${sponsor.nome}`}
      className={styles.anteprimaSponsor}
    />
  );

  return (
    <article className={styles.schedaSponsor}>
      {sponsor.tipo === "BANNER" && sponsor.linkEsterno ? (
        <a
          href={sponsor.linkEsterno}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.linkImmagineSponsor}
          aria-label={`Vai al sito di ${sponsor.nome}`}
        >
          {immagine}
        </a>
      ) : (
        immagine
      )}
      <h3>{sponsor.nome}</h3>
      <p>{sponsor.descrizione}</p>
    </article>
  );
}
