import { inizialiNomeCompleto } from "@/lib/iniziali-nome";
import styles from "./squadre.module.css";

// Story 18.37: card squadra di /squadre estratta da page.tsx (stesso markup
// e stessi dati di prima) per poterla renderizzare/testare con
// renderToStaticMarkup. Stile Match Week (sagoma obliqua + filo bianco,
// nome su fascia obliqua, numero di maglia nel quadratino rosso): vedi
// squadre.module.css e DESIGN.md -> team-card.
export type SchedaGruppoProps = {
  nome: string;
  categoria: string;
  // null = nessuna foto caricata (placeholder intenzionale, Story 18.12).
  urlFoto: string | null;
  allenatori: { id: string; nome: string; cognome: string }[];
  atlete: { id: string; nome: string; fotoUrl: string | null; numero: number | null }[];
};

export function SchedaGruppo({ nome, categoria, urlFoto, allenatori, atlete }: SchedaGruppoProps) {
  return (
    // Filo bianco obliquo: drop-shadow sul contenitore, segue il clip-path
    // della scheda (stesso principio di .cornice in riga-partita.module.css).
    <div className={styles.corniceGruppo}>
      <div className={styles.schedaGruppo}>
        {urlFoto !== null ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL di Storage con versione in query, mirror del markup precedente
          <img className={styles.immagineGruppo} src={urlFoto} alt={`Foto di squadra di ${nome}`} />
        ) : (
          // Story 18.12 (AC #5): placeholder intenzionale finché il Gruppo
          // non carica una foto.
          <div
            className={styles.placeholderFoto}
            role="img"
            aria-label={`Nessuna foto di squadra caricata per ${nome}`}
          />
        )}
        <div className={styles.contenutoScheda}>
          {/* Story 18.24: h3 sotto l'intestazione di blocco categoria (h2). */}
          <h3 className={styles.nomeGruppo}>{nome}</h3>
          <p className={styles.categoriaGruppo}>{categoria}</p>
          {/* AC #3 (Story 18.8): un Gruppo senza Allenatori compare comunque,
              senza elenco staff. */}
          {allenatori.length > 0 && (
            <ul className={styles.listaAllenatori}>
              {allenatori.map((allenatore) => (
                <li key={allenatore.id}>
                  {allenatore.nome} {allenatore.cognome}
                </li>
              ))}
            </ul>
          )}
          {/* Story 18.24: nome/foto/Numero di ogni Atleta pubblici qui;
              messaggio esplicito se il Gruppo non ha Atlete. */}
          <div className={styles.sezioneAtlete}>
            <h4 className={styles.titoloSezioneAtlete}>Atlete</h4>
            {atlete.length === 0 ? (
              <p className={styles.messaggioAtleteVuoto}>Nessuna atleta assegnata.</p>
            ) : (
              <ul className={styles.listaAtlete}>
                {atlete.map((atleta) => (
                  <li key={atleta.id} className={styles.rigaAtleta}>
                    {atleta.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL firmato a breve scadenza, non ottimizzabile da next/image (mirror /staff)
                      <img
                        className={styles.fotoAtleta}
                        src={atleta.fotoUrl}
                        alt=""
                        width={40}
                        height={40}
                      />
                    ) : (
                      <div className={styles.inizialiAtleta} aria-hidden="true">
                        {inizialiNomeCompleto(atleta.nome)}
                      </div>
                    )}
                    <span className={styles.nomeAtleta}>{atleta.nome}</span>
                    {atleta.numero != null && (
                      <span className={styles.numeroAtleta}>
                        <span className={styles.srOnly}>numero di maglia </span>
                        {atleta.numero}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
