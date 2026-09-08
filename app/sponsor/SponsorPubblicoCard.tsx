import type { SponsorVetrina } from "@/lib/sponsor/raggruppa-sponsor-per-tipo";
import styles from "./sponsor-pubblico.module.css";

// Story 18.2: struttura visiva di riferimento da SponsorVetrinaCard.tsx
// (app/app/(sponsor)/sponsor/SponsorVetrinaCard.tsx) - copiata, non
// importata: quel componente include il pulsante "Genera voucher", fuori
// scope qui (vedi Dev Notes della story, nessuna fonte di Nome/Cognome per
// un Visitatore anonimo).
// Story 16.7: il link esterno era mostrato solo per i Banner (mirror del
// comportamento di SponsorVetrinaCard.tsx, dove le Convenzioni usano invece
// il pulsante "Genera voucher", assente qui) - un Visitatore anonimo che
// guarda una Convenzione pubblica non aveva pero' alcuna azione cliccabile
// se non passava da un Banner. `linkEsterno` e' un campo generico su Sponsor
// (Story 16.1), non specifico al tipo Banner: qui viene reso cliccabile per
// QUALUNQUE tipo, se impostato - resta opzionale, uno Sponsor senza link
// resta non cliccabile. Validazione (solo http/https) invariata e già
// applicata a entrambi i tipi in scrittura (linkEsternoValido, actions.ts) -
// nessuna nuova superficie di rischio, solo il tipo BANNER la sfruttava.
// Review fix (Blind Hunter): riusa il tipo gia' esportato SponsorVetrina
// invece di ridichiararlo a mano - terza copia indipendente della stessa
// forma dati altrimenti (la seconda, in SponsorVetrinaCard.tsx, e'
// preesistente e fuori scope di questa story).
// Story 16.5: spostato da app/SponsorPubblicoCard.tsx (era usato solo dalla
// sezione Sponsor della home, ora rimossa) in app/sponsor/ insieme alla
// nuova pagina pubblica dedicata - stesso componente, invariato, solo
// l'import dello style aggiornato al nuovo modulo di questa pagina
// (sponsor-pubblico.module.css invece di home-pubblica.module.css).
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
      {sponsor.linkEsterno ? (
        <a
          href={sponsor.linkEsterno}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.linkImmagineSponsor}
          aria-label={`Vai al link di ${sponsor.nome}`}
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
