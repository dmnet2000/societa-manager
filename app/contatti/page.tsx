import {
  leggiContattiPubblici,
  leggiUrlPaginaFacebook,
  nessunContattoPubblicoConfigurato,
} from "@/lib/configurazione-applicazione";
import { HeaderPubblico } from "../HeaderPubblico";
import { FooterPubblico } from "../FooterPubblico";
import styles from "./contatti.module.css";

// Story 18.11: quinta pagina pubblica reale (dopo Home, Squadre, Calendario,
// Staff). Dati possono cambiare in qualunque momento dalla console Admin -
// stesso motivo di dynamic = "force-dynamic" gia' in uso sulle altre.
export const dynamic = "force-dynamic";

export default async function ContattiPage() {
  // Nessuna sessione qui (pagina pubblica). ConfigurazioneApplicazione non
  // e' protetta da RLS (AD-9), Prisma diretto. .catch() fail-soft su
  // entrambe le letture, stesso pattern di ogni pagina pubblica del progetto.
  const [contatti, urlPaginaFacebook] = await Promise.all([
    leggiContattiPubblici().catch((err) => {
      console.error(err);
      return { indirizzoSede: null, telefonoPubblico: null, emailPubblica: null };
    }),
    // Story 18.5, gia' done - riuso invariato del campo esistente: qui
    // serve solo come link diretto in uscita, non il carosello "ultimi
    // post" della home (lib/facebook-graph.ts, Story 18.13, dominio diverso).
    leggiUrlPaginaFacebook().catch((err) => {
      console.error(err);
      return null;
    }),
  ]);

  const { indirizzoSede, telefonoPubblico, emailPubblica } = contatti;

  // AC #3: "nessun campo" include il social (urlPaginaFacebook), non solo i
  // 3 campi introdotti da questa storia - vedi Dev Notes della storia.
  const nessunContatto = nessunContattoPubblicoConfigurato({
    indirizzoSede,
    telefonoPubblico,
    emailPubblica,
    urlPaginaFacebook,
  });

  return (
    <>
      <HeaderPubblico />
      <main className={styles.main}>
        <h1 className={styles.titolo}>Contatti</h1>
        {nessunContatto ? (
          <p className={styles.messaggioVuoto}>
            Nessun contatto pubblico configurato al momento.
          </p>
        ) : (
          // AC #2: rendering campo per campo, indipendentemente
          // condizionale - ogni campo compare SOLO se valorizzato, nessuna
          // etichetta orfana, nessun "non disponibile" al posto del valore
          // mancante (vedi Dev Notes "La regola più facile da violare").
          <div className={styles.contactBlock}>
            {indirizzoSede && (
              <div className={styles.campo}>
                <span className={styles.etichetta}>Indirizzo</span>
                <span className={styles.valore}>{indirizzoSede}</span>
              </div>
            )}
            {telefonoPubblico && (
              <div className={styles.campo}>
                <span className={styles.etichetta}>Telefono</span>
                <a
                  className={styles.link}
                  href={`tel:${telefonoPubblico.replace(/\s+/g, "")}`}
                >
                  {telefonoPubblico}
                </a>
              </div>
            )}
            {emailPubblica && (
              <div className={styles.campo}>
                <span className={styles.etichetta}>Email</span>
                <a className={styles.link} href={`mailto:${emailPubblica}`}>
                  {emailPubblica}
                </a>
              </div>
            )}
            {urlPaginaFacebook && (
              <div className={styles.campo}>
                <span className={styles.etichetta}>Social</span>
                <a
                  className={styles.iconaSocial}
                  href={urlPaginaFacebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Pagina Facebook della società"
                >
                  F
                </a>
              </div>
            )}
          </div>
        )}
      </main>
      <FooterPubblico />
    </>
  );
}
