import Link from "next/link";
import styles from "./InSviluppoPubblico.module.css";

// Il sito pubblico e' gia' in produzione (Epic 18) mentre le Story
// 18.9-18.11 sono ancora in backlog - /calendario, /staff, /contatti sono
// gia' pubbliche (aggiunte a PUBLIC_ROUTES nella code review di Story 18.7,
// raggiungibili dal menu NavPubblica) ma senza una pagina reale dietro:
// senza questo componente un Visitatore che clicca quelle voci vedrebbe il
// 404 grezzo di Next.js, senza spiegazione. Placeholder minimo, mirror del
// tono gia' usato nel paragrafo hero rimosso in Story 18.5 ("il sito
// pubblico... e' in costruzione: presto qui troverai..."). Quando la
// rispettiva Story 18.9/18.10/18.11 verra' implementata, il suo page.tsx
// smettera' di montare questo componente (sostituito dal contenuto reale,
// non esteso).
export function InSviluppoPubblico({ titolo }: { titolo: string }) {
  return (
    <main className={styles.main}>
      <h1 className={styles.titolo}>{titolo}</h1>
      <p className={styles.testo}>
        Questa sezione è in fase di sviluppo. Torna a trovarci presto!
      </p>
      <Link href="/" className={styles.linkHome}>
        Torna alla home
      </Link>
    </main>
  );
}
