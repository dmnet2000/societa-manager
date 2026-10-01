import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { leggiCampionatiConLetturaFipav } from "@/lib/sincronizza-gare-fipav/leggi-live-fipav";
import { classifichePerCampionatoDaLetture } from "@/lib/sincronizza-gare-fipav/vista-home-live";
import { HeaderPubblico } from "../HeaderPubblico";
import { FooterPubblico } from "../FooterPubblico";
import { DecorazioniMatchWeek, classeFasciaMatchWeek } from "../SfondoMatchWeek";
import homeStyles from "../home-pubblica.module.css";
import styles from "./classifiche.module.css";

// Story 18.34: nuova pagina pubblica, mirror strutturale di
// app/calendario/page.tsx (non "/torneo"/"/sponsor"/"/staff"/"/contatti",
// gia' esistenti prima di questa storia - review fix, Blind Hunter: un
// conteggio errato qui era proprio cio' che aveva fatto dimenticare la
// registrazione di questa rotta in PUBLIC_ROUTES, lib/auth/route-guard.ts,
// stesso bug gia' capitato a /torneo e /sponsor, vedi commento li'). Dati letti
// live dal portale FIPAV a ogni visita (mai da un modello locale) tramite
// leggiCampionatiConLetturaFipav (Story 18.33/18.34, cache breve
// unstable_cache interna) - possono quindi cambiare in qualunque momento,
// stesso motivo di dynamic = "force-dynamic" gia' in uso su "/" e
// "/calendario".
export const dynamic = "force-dynamic";

export default async function ClassifichePage() {
  // Nessuna sessione qui (pagina pubblica). Sola lettura
  // (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente in una
  // pagina GET), .catch() fail-soft fin dalla prima stesura - stesso
  // principio di /calendario: un errore DB transiente degrada al messaggio
  // esplicito sotto invece di far crashare l'intera pagina.
  const annoCorrente = await trovaAnnoAgonisticoCorrente().catch((err) => {
    console.error(err);
    return null;
  });

  // Story 18.34 (Code Map): stessa funzione condivisa riusata invariata da
  // app/page.tsx (Story 18.33) - query Campionati con linkFipav + fetch
  // live in parallelo, mai una seconda implementazione della stessa query.
  // Un Campionato senza linkFipav non genera alcun fetch ne' alcun blocco
  // (AC #4); un fetch fallito per un Campionato non fa fallire gli altri
  // (.catch() qui, seconda rete di sicurezza esplicita, stesso principio di
  // app/page.tsx - AC #5).
  const letturePerCampionato = annoCorrente
    ? await leggiCampionatiConLetturaFipav(annoCorrente.id).catch((err) => {
        console.error(err);
        return [];
      })
    : [];

  // Story 18.34 (AC #1): stessa estrazione pura e testata di
  // lib/sincronizza-gare-fipav/vista-home-live.ts (Story 18.33) - una card
  // per Campionato con lettura riuscita e classifica non vuota, riusata
  // invariata (nessuna seconda copia della logica di filtro).
  const classifichePerCampionato = classifichePerCampionatoDaLetture(letturePerCampionato);
  const mostraClassifiche = classifichePerCampionato.length > 0;

  return (
    <>
      <HeaderPubblico />
      {/* Sfondo Match Week (variante C, scelta utente 2026-10-01) su tutta
          la pagina, stesso delle fasce partite/risultati della home. */}
      <main className={`${styles.main} ${classeFasciaMatchWeek}`}>
        <DecorazioniMatchWeek />
        <h1 className={styles.titolo}>Classifiche</h1>
        {/* AC #6 (spec-18-34): messaggio esplicito invece di un'area vuota
            quando nessun Campionato ha linkFipav impostato o tutti i fetch
            sono falliti - a differenza della home (dove l'assenza e'
            silenziosa perche' la pagina ha comunque altro contenuto), questa
            pagina esiste apposta per le classifiche, mirror del principio
            gia' in /calendario (AC #3 di quella storia). */}
        {!mostraClassifiche ? (
          <p className={styles.messaggioVuoto}>Nessuna classifica disponibile al momento.</p>
        ) : (
          <div className={homeStyles.listaClassifiche}>
            {/* Story 18.34 (AC #1): TUTTE le 13 colonne lette dal parser
                (Pos./Squadra/Punti/PG/PV/PP/SF/SS/QS/PF/PS/QP/Penal.) - a
                differenza della card home (Story 18.33, solo 6 colonne per
                compattezza), questa pagina dedicata non ha quel vincolo. */}
            {classifichePerCampionato.map((classifica) => (
              <div
                className={homeStyles.schedaClassifica}
                style={
                  classifica.campionatoColore
                    ? { borderTopColor: classifica.campionatoColore }
                    : undefined
                }
                key={classifica.campionatoId}
              >
                <h2 className={homeStyles.titoloClassifica}>
                  {classifica.campionatoNome} — {classifica.gruppoNome}
                </h2>
                <table className={homeStyles.tabellaClassifica}>
                  {/* Mirror del review fix gia' applicato alla card home
                      (Blind Hunter, Story 18.33): un utente di screen reader
                      che naviga direttamente nella tabella non deve perdere
                      il contesto di quale Campionato/Gruppo stia leggendo. */}
                  <caption className={homeStyles.srOnly}>
                    Classifica {classifica.campionatoNome} — {classifica.gruppoNome}
                  </caption>
                  <thead>
                    {/* Review fix (Blind Hunter): title da solo non e'
                        affidabile per screen reader e irraggiungibile su
                        touch (nessun hover) - <abbr title="..."> dentro ogni
                        <th> espone lo stesso significato esteso anche li'. */}
                    <tr>
                      <th scope="col">Pos.</th>
                      <th scope="col">Squadra</th>
                      <th scope="col">Punti</th>
                      <th scope="col">
                        <abbr title="Partite Giocate">PG</abbr>
                      </th>
                      <th scope="col">
                        <abbr title="Partite Vinte">PV</abbr>
                      </th>
                      <th scope="col">
                        <abbr title="Partite Perse">PP</abbr>
                      </th>
                      <th scope="col">
                        <abbr title="Set Fatti">SF</abbr>
                      </th>
                      <th scope="col">
                        <abbr title="Set Subiti">SS</abbr>
                      </th>
                      <th scope="col">
                        <abbr title="Quoziente Set">QS</abbr>
                      </th>
                      <th scope="col">
                        <abbr title="Punti Fatti">PF</abbr>
                      </th>
                      <th scope="col">
                        <abbr title="Punti Subiti">PS</abbr>
                      </th>
                      <th scope="col">
                        <abbr title="Quoziente Punti">QP</abbr>
                      </th>
                      <th scope="col">
                        <abbr title="Penalizzazione">Penal.</abbr>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {classifica.righe.map((riga, indice) => (
                      <tr key={`${classifica.campionatoId}-${riga.posizione}-${indice}`}>
                        <td>{riga.posizione}</td>
                        <td>{riga.squadra}</td>
                        <td>{riga.punti ?? "—"}</td>
                        <td>{riga.partiteGiocate ?? "—"}</td>
                        <td>{riga.partiteVinte ?? "—"}</td>
                        <td>{riga.partitePerse ?? "—"}</td>
                        <td>{riga.setFatti ?? "—"}</td>
                        <td>{riga.setSubiti ?? "—"}</td>
                        <td>{riga.quozienteSet ?? "—"}</td>
                        <td>{riga.puntiFatti ?? "—"}</td>
                        <td>{riga.puntiSubiti ?? "—"}</td>
                        <td>{riga.quozientePunti ?? "—"}</td>
                        <td>{riga.penalizzazione ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </main>
      <FooterPubblico />
    </>
  );
}
