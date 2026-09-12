import { createClient } from "@/lib/supabase/server";
import {
  trovaEdizioneTorneoCorrente,
  elencaCategorieTorneo,
  elencaSquadreTorneo,
  elencaPartiteTorneo,
  elencaSlotTorneo,
  trovaSlotPrenotatoInMemoria,
} from "@/lib/torneo";
import { leggiInfoVolantinoTorneo, urlPubblicoVolantinoTorneo } from "@/lib/storage/volantino-torneo";
import { calcolaClassificaGirone } from "@/lib/classifica-girone-torneo";
import { calcolaClassificaFinale } from "@/lib/classifica-finale-torneo";
import { formattaRisultatoPartitaTorneo } from "@/lib/risultato-partita-torneo";
import { GIRONI_TORNEO } from "@/lib/girone-torneo";
import { etichettaSettimanaPersonalizzata } from "@/lib/settimana-torneo";
import { TABELLONI_TORNEO } from "@/lib/tabelloni-torneo";
import { calcolaProspettoIpoteticoTorneo } from "@/lib/prospetto-ipotetico-torneo";
import { ordinaPartitePerSlot } from "@/lib/ordina-partite-per-slot";
import { costruisciLinkNaviga } from "@/lib/link-naviga-palestra";
import { formattaSlotTestoBreve, type SlotPubblico } from "@/lib/formatta-slot-torneo";
import { HeaderPubblico } from "../HeaderPubblico";
import { FooterPubblico } from "../FooterPubblico";
import { TabellaIncontriCategoria } from "./TabellaIncontriCategoria";
import styles from "./torneo-pubblico.module.css";

// Mostrato dentro ogni match-card (girone/semifinale/finale) SOLO quando la
// Partita ha uno Slot assegnato - "Naviga" riusa costruisciLinkNaviga TALE E
// QUALE (lib/link-naviga-palestra.ts, gia' verificata dal vivo altrove nel
// progetto, es. /calendario), null se la Palestra non ha ne' coordinate ne'
// indirizzo (nessun link mostrato in quel caso, mai un href vuoto).
function MetaSlot({
  slotTorneo,
  suSfondoChiaro = false,
}: {
  slotTorneo: SlotPubblico | null;
  // Story 20.28 (review fix, Blind Hunter): .metaSlot/.linkNaviga usano un
  // colore quasi bianco (#EAF4FB), leggibile SOLO sullo sfondo blu scuro di
  // .matchCard (unico contesto in cui questo componente veniva usato finora).
  // Il prospetto ipotetico lo riusa pero' su sfondo chiaro (.main) - stesso
  // colore li' sarebbe praticamente invisibile (contrasto ~1:1). true
  // seleziona la variante scura leggibile su sfondo chiaro
  // (.metaSlotChiaro/.linkNavigaChiaro), false (default, invariato) preserva
  // il comportamento delle partite reali dentro .matchCard.
  suSfondoChiaro?: boolean;
}) {
  if (!slotTorneo) {
    return null;
  }
  const linkNaviga = costruisciLinkNaviga(slotTorneo.palestra);
  return (
    <div className={suSfondoChiaro ? styles.metaSlotChiaro : styles.metaSlot}>
      <span>{formattaSlotTestoBreve(slotTorneo)}</span>
      {linkNaviga && (
        <a
          className={suSfondoChiaro ? styles.linkNavigaChiaro : styles.linkNaviga}
          href={linkNaviga}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Naviga verso ${slotTorneo.palestra.nome}`}
        >
          Naviga
        </a>
      )}
    </div>
  );
}

// Story 20.6 (Epic 20, Torneo Memorial): ultima pagina pubblica dell'epica -
// vetrina in sola lettura di quanto le Story 20.1-20.5 gestiscono
// internamente da /app/torneo/... . Dati mutabili in qualunque momento dalla
// console interna (Edizioni/Categorie/Squadre/risultati/tabellone) - stesso
// motivo di dynamic = "force-dynamic" gia' in uso su ogni altra pagina
// pubblica del sito (mirror /calendario, /squadre).
export const dynamic = "force-dynamic";

export default async function TorneoPubblicoPage() {
  // Nessuna sessione qui (pagina pubblica, sola lettura) - stesso principio
  // di ogni altra pagina pubblica del sito. "Edizione corrente" = anno piu'
  // alto (lib/torneo.ts, trovaEdizioneTorneoCorrente) - .catch() fail-soft
  // fin dalla prima stesura, mirror di trovaAnnoAgonisticoCorrente in
  // /calendario: un errore DB transiente degrada al messaggio esplicito
  // sotto invece di far crashare l'intera pagina.
  const edizione = await trovaEdizioneTorneoCorrente().catch((err) => {
    console.error(err);
    return null;
  });

  // Never: nessun placeholder/errore fuorviante quando l'Edizione corrente
  // non esiste ancora (nessuna Edizione mai creata) - messaggio esplicito,
  // mirror /squadre AC #4.
  if (!edizione) {
    return (
      <>
        <HeaderPubblico />
        <main className={styles.main}>
          <h1 className={styles.titolo}>Torneo Memorial</h1>
          <p className={styles.messaggioVuoto}>
            Nessuna edizione del Torneo Memorial disponibile al momento.
          </p>
        </main>
        <FooterPubblico />
      </>
    );
  }

  // Le due risoluzioni non dipendono l'una dall'altra - eseguite in
  // Promise.all, stesso principio gia' stabilito altrove nel progetto.
  // elencaCategorieTorneo su un'Edizione senza Categorie restituisce
  // semplicemente un array vuoto. Review fix (Edge Case Hunter): createClient()
  // era l'unica risoluzione della pagina senza un .catch() fail-soft - un suo
  // fallimento (es. variabili d'ambiente Supabase temporaneamente non
  // valide) faceva collassare l'intera pagina anche se l'Edizione era gia'
  // stata trovata con successo. Ora degrada a "nessun volantino" (l'unico
  // uso di supabase in questa pagina), coerente con ogni altra lettura qui.
  const [supabase, categorie] = await Promise.all([
    createClient().catch((err) => {
      console.error(err);
      return null;
    }),
    elencaCategorieTorneo(edizione.id).catch((err) => {
      console.error(err);
      return [];
    }),
  ]);

  // Volantino (bucket pubblico, Story 20.5) + dati di ogni Categoria, tutti
  // in parallelo - nessuna dipendenza reciproca. Per ciascuna Categoria,
  // Squadre e Partite sono a loro volta risolte in parallelo (mirror del
  // Promise.all gia' in uso in risultati/page.tsx e tabellone/page.tsx per
  // le stesse due letture), ma con un UNICO .catch() condiviso (review fix,
  // Edge Case Hunter): se una delle due letture fallisce mentre l'altra
  // riesce, la pagina finiva in uno stato auto-contraddittorio (es. "nessuna
  // squadra iscritta" nella sezione Girone mentre il Tabellone sottostante,
  // che legge i nomi Squadra direttamente da "partite" non da "squadre",
  // continuava a mostrare risultati/classifica finale con quegli stessi
  // nomi). Un fallimento di una delle due ora azzera sempre entrambe
  // insieme, mai solo una.
  const [volantino, datiCategorie, slotTorneo] = await Promise.all([
    // Story 20.5: stesso pattern fail-soft di leggiInfoFotoHero/
    // leggiInfoLogoPolisportiva in impostazioni/page.tsx - un errore
    // Storage transitorio non deve far fallire l'intera pagina, solo
    // nascondere il volantino. Nessun client (createClient() fallito sopra):
    // stesso esito, nessun volantino mostrato.
    supabase
      ? leggiInfoVolantinoTorneo(supabase, edizione.id).catch((err) => {
          console.error(err);
          return { esiste: false, aggiornatoIl: null as string | null };
        })
      : Promise.resolve({ esiste: false, aggiornatoIl: null as string | null }),
    Promise.all(
      categorie.map(async (categoria) => {
        try {
          const [squadre, partite] = await Promise.all([
            elencaSquadreTorneo(categoria.id),
            elencaPartiteTorneo(categoria.id),
          ]);
          return { categoria, squadre, partite };
        } catch (err) {
          console.error(err);
          return { categoria, squadre: [], partite: [] };
        }
      })
    ),
    // Story 20.28: SlotTorneo dell'intera Edizione, UNA sola query - serve a
    // mostrare, sul prospetto ipotetico pubblico, uno Slot gia' prenotato in
    // anticipo dall'Admin (Story 20.21) per una riga specifica, prima ancora
    // che il tabellone reale esista. A differenza di tabellone/page.tsx
    // (stessa query eseguita una volta PER Categoria, pagina di dettaglio),
    // qui viene letta una sola volta per l'intera pagina condivisa da tutte
    // le Categorie dell'Edizione - una query in meno di quante Categorie
    // esistono, non un mirror posizionale 1:1. Richiesta esplicita
    // dell'utente dopo aver verificato dal vivo che le prenotazioni non
    // comparivano: rinegozia il "Never" di Story 20.27 (che escludeva la
    // prenotazione anticipata dalla vista pubblica) SOLO per la
    // visualizzazione - il form di prenotazione resta admin-only (spec-20-28
    // Boundaries "Never", invariato).
    elencaSlotTorneo(edizione.id).catch((err) => {
      console.error(err);
      return [];
    }),
  ]);

  return (
    <>
      <HeaderPubblico />
      <main className={styles.main}>
        <h1 className={styles.titolo}>
          {edizione.nome} {edizione.anno}
        </h1>

        {/* Nessun placeholder se il volantino non e' presente (mirror
            /squadre "messaggio esplicito invece di area vuota", qui pero'
            la sezione stessa sparisce - il volantino e' un contenuto
            opzionale, non l'unico scopo della pagina come lo e' l'elenco
            Gruppi per /squadre). */}
        {/* supabase e' null solo se createClient() e' fallito sopra - in tal
            caso volantino.esiste e' gia' forzato a false (vedi Promise.all
            sopra), quindi questo ramo non viene mai raggiunto con supabase
            nullo: il controllo esplicito qui e' solo per soddisfare il
            tipo, non un vero stato raggiungibile. */}
        {volantino.esiste && supabase && (
          <section className={styles.sezioneVolantino}>
            <img
              className={styles.volantino}
              src={`${urlPubblicoVolantinoTorneo(supabase, edizione.id)}?v=${encodeURIComponent(
                volantino.aggiornatoIl ?? ""
              )}`}
              alt={`Volantino del Torneo, edizione "${edizione.nome}" ${edizione.anno}`}
            />
          </section>
        )}

        {datiCategorie.length === 0 ? (
          <p className={styles.messaggioVuoto}>
            Nessuna categoria del Torneo pubblicata per questa edizione.
          </p>
        ) : (
          datiCategorie.map(({ categoria, squadre, partite }) => {
            // Il calendario di girone esiste per questa Categoria se e solo
            // se almeno una PartitaTorneo e' gia' stata generata - stesso
            // criterio di risultati/page.tsx.
            const calendarioGenerato = partite.length > 0;
            // Il tabellone semifinali/finali esiste se e solo se almeno una
            // PartitaTorneo ha fase diversa da GIRONE - stesso criterio di
            // tabellone/page.tsx.
            const tabelloneGenerato = partite.some((p) => p.fase !== "GIRONE");
            // Classifica finale MAI persistita - ricalcolata al volo da qui
            // a ogni caricamento della pagina (spec-20-6 Boundaries), null
            // finche' le 4 finali non hanno tutte un risultato completo.
            const classificaFinale = tabelloneGenerato ? calcolaClassificaFinale(partite) : null;

            // Story 20.15: precalcolato una sola volta a livello di
            // Categoria (non dentro il loop GIRONI_TORNEO.map sotto, che ora
            // serve solo al ramo calendarioGenerato) - ogni cella della
            // tabella condivisa del ramo !calendarioGenerato deve conoscere
            // sia il proprio Girone (colonna) sia il proprio indice di riga.
            const squadrePerGirone = GIRONI_TORNEO.map((girone) =>
              squadre.filter((s) => s.girone === girone.value)
            );

            // Story 20.27: prospetto ipotetico della seconda fase (Story
            // 20.20, gia' mostrato in area admin, lib/prospetto-ipotetico-torneo.ts)
            // ora riusato TALE E QUALE anche qui, di sola lettura - stessi due
            // conteggi di Squadre per Girone gia' derivati sopra in
            // squadrePerGirone (ordine GIRONI_TORNEO: Girone A poi Girone B,
            // stesso principio gia' documentato in tabellone/page.tsx), nessuna
            // nuova logica di calcolo. Calcolato SOLO quando !tabelloneGenerato
            // (spec-20-27 Boundaries "Always") - null altrove, mai usato in
            // quel caso. Funzione pura: null per qualunque combinazione non
            // riconosciuta (gironi sbilanciati, conteggi diversi da 3/4,
            // iscrizioni incomplete o assenti) - in quel caso un messaggio
            // esplicito viene mostrato piu' sotto invece di un'area vuota.
            const numeroGironeA = squadrePerGirone[0].length;
            const numeroGironeB = squadrePerGirone[1].length;
            const prospettoIpotetico = !tabelloneGenerato
              ? calcolaProspettoIpoteticoTorneo(numeroGironeA, numeroGironeB)
              : null;

            // Story 20.23: stesso ordinamento per data/ora dello Slot gia'
            // riusato identico da "partiteDelGirone"/"semifinali" sotto
            // (Story 20.17) - un incontro senza Slot finisce sempre in
            // fondo, la colonna "Gara" della tabella non e' quindi
            // necessariamente crescente dall'alto in basso.
            const partiteTabellaCompleta = ordinaPartitePerSlot(partite);

            return (
              <section
                key={categoria.id}
                className={styles.sezioneCategoria}
                aria-labelledby={`categoria-${categoria.id}`}
              >
                <h2 id={`categoria-${categoria.id}`} className={styles.titoloCategoria}>
                  {categoria.nome}
                </h2>
                <p className={styles.etichettaSettimana}>
                  {etichettaSettimanaPersonalizzata(categoria.settimana, edizione)}
                </p>

                {/* Story 20.19: vista tabellare aggiuntiva di TUTTI gli
                    incontri della Categoria (Gironi + Semifinali + Finali
                    insieme), ordinata per data/ora dello Slot (Story 20.23,
                    vedi partiteTabellaCompleta sopra) - affianca la griglia
                    grafica sotto senza mai sostituirla, nascosta di default. */}
                <TabellaIncontriCategoria
                  partite={partiteTabellaCompleta}
                  nomeCategoria={categoria.nome}
                />

                {calendarioGenerato ? (
                  GIRONI_TORNEO.map((girone) => {
                    // Never: solo nome/girone di ogni Squadra sono pubblici -
                    // referente/contatto non vengono mai letti/renderizzati
                    // qui (dati di contatto personali di un referente di club
                    // esterno).
                    const squadreDelGirone = squadre.filter((s) => s.girone === girone.value);
                    // Story 20.17: ordinate per data/ora dello Slot assegnato
                    // (le Partite senza Slot finiscono in fondo) prima del
                    // rendering della griglia - calcolaClassificaGirone sotto
                    // e' order-indipendente (aggrega e basta), nessun impatto
                    // sulla classifica.
                    const partiteDelGirone = ordinaPartitePerSlot(
                      partite.filter(
                        (p) => p.fase === "GIRONE" && p.squadraCasa.girone === girone.value
                      )
                    );
                    const classifica = calcolaClassificaGirone(squadreDelGirone, partiteDelGirone);

                    return (
                      <section
                        key={girone.value}
                        className={styles.sezioneGirone}
                        aria-labelledby={`girone-${categoria.id}-${girone.value}`}
                      >
                        <h3
                          id={`girone-${categoria.id}-${girone.value}`}
                          className={styles.titoloGirone}
                        >
                          {girone.label}
                        </h3>

                        {squadreDelGirone.length === 0 ? (
                          <p className={styles.messaggioSezione}>
                            Nessuna squadra iscritta in questo girone.
                          </p>
                        ) : (
                          <>
                            <table className={styles.tabellaClassifica}>
                              <thead>
                                <tr>
                                  {/* Review fix (Blind Hunter, Story 20.16): scope="col"
                                      aggiunto a tutte le intestazioni per coerenza con
                                      .tabellaSquadreGironi (Story 20.15), che gia' lo usa. */}
                                  <th scope="col">Squadra</th>
                                  <th scope="col">Punti</th>
                                  <th scope="col">Partite giocate</th>
                                  <th scope="col">Set vinti</th>
                                  <th scope="col">Set persi</th>
                                  <th scope="col">Punti fatti</th>
                                  <th scope="col">Punti subiti</th>
                                </tr>
                              </thead>
                              <tbody>
                                {classifica.map((riga) => (
                                  <tr key={riga.squadra.id}>
                                    <td>{riga.squadra.nome}</td>
                                    <td>{riga.punti}</td>
                                    <td>{riga.partiteGiocate}</td>
                                    <td>{riga.setVinti}</td>
                                    <td>{riga.setPersi}</td>
                                    <td>{riga.puntiFatti}</td>
                                    <td>{riga.puntiSubiti}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {partiteDelGirone.length === 0 ? (
                              // Review fix (Blind Hunter): mirror del messaggio
                              // esplicito gia' in uso nella pagina interna
                              // (risultati/page.tsx) per lo stesso caso - un
                              // calendario generato ma senza incontri per
                              // questo specifico girone non deve lasciare
                              // un'area vuota senza spiegazione.
                              <p className={styles.messaggioSezione}>
                                Nessun incontro in questo girone.
                              </p>
                            ) : (
                              <div className={styles.matchGrid}>
                                {partiteDelGirone.map((partita) => (
                                  <div className={styles.matchCard} key={partita.id}>
                                    {/* Story 20.11: numero di gara progressivo
                                        dell'Edizione, sempre calcolato
                                        server-side. */}
                                    <div className={styles.numeroGara}>Gara {partita.numero}</div>
                                    <div className={styles.squadre}>
                                      <span>{partita.squadraCasa.nome}</span>
                                      <span className={styles.vs}>vs</span>
                                      <span>{partita.squadraOspite.nome}</span>
                                    </div>
                                    <div className={styles.meta}>
                                      {formattaRisultatoPartitaTorneo(partita) ?? (
                                        <em>In programma</em>
                                      )}
                                    </div>
                                    <MetaSlot slotTorneo={partita.slotTorneo} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </section>
                    );
                  })
                ) : squadre.length === 0 ? (
                  // Story 20.15: nessuna Squadra iscritta in nessun Girone di
                  // questa Categoria - stesso messaggio testuale esistente,
                  // una sola volta a livello di Categoria (mai una tabella
                  // con tutte le colonne vuote).
                  <p className={styles.messaggioSezione}>
                    Nessuna squadra iscritta in questo girone.
                  </p>
                ) : (
                  // Story 20.15: calendario di girone non ancora generato -
                  // tabella condivisa a livello di Categoria, un Girone per
                  // colonna, richiesta esplicita dell'utente ("i gironi in
                  // visualizzazione li vorrei sotto forma tabellare con le
                  // squadre sulle righe"). Celle senza una Squadra
                  // corrispondente (righe in eccesso di un Girone piu' corto,
                  // o un Girone interamente senza Squadre) restano semplici
                  // celle <td> vuote - nessun testo placeholder (deciso in
                  // fase di pianificazione, Ask First).
                  <table className={styles.tabellaSquadreGironi}>
                    <thead>
                      <tr>
                        {GIRONI_TORNEO.map((girone) => (
                          <th key={girone.value} scope="col">
                            {girone.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({
                        length: Math.max(...squadrePerGirone.map((arr) => arr.length)),
                      }).map((_, indiceRiga) => (
                        <tr key={indiceRiga}>
                          {squadrePerGirone.map((squadreDelGirone, indiceGirone) => (
                            // Review fix (Blind Hunter): key su girone.value
                            // (stabile), non sull'indice di array - coerente
                            // con la key gia' usata sopra sull'<th> dello
                            // stesso Girone.
                            <td key={GIRONI_TORNEO[indiceGirone].value}>
                              {squadreDelGirone[indiceRiga]?.nome ?? null}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <section
                  className={styles.sezioneTabellone}
                  aria-labelledby={`tabellone-${categoria.id}`}
                >
                  <h3 id={`tabellone-${categoria.id}`} className={styles.titoloGirone}>
                    Tabellone semifinali/finali
                  </h3>
                  {!tabelloneGenerato ? (
                    // Story 20.27: prospetto ipotetico di sola lettura -
                    // mirror di tabellone/page.tsx (admin) MA senza
                    // PrenotaSlotIpoteticoForm/mostraPrenotazione (nessun
                    // controllo di prenotazione anticipata Slot sulla vista
                    // pubblica, spec-20-27 Boundaries "Never") - bastano
                    // sezione.semifinali/sezione.finali cosi' come restituiti
                    // da calcolaProspettoIpoteticoTorneo. Sezione "Tabellone
                    // semifinali/finali" gia' esistente riusata cosi' com'e'
                    // (nessun nuovo <h2>/<h3> duplicato qui).
                    !prospettoIpotetico ? (
                      <p className={styles.messaggioSezione}>
                        Il prospetto ipotetico è disponibile solo quando entrambi i Gironi hanno
                        lo stesso numero di Squadre (3 o 4).
                      </p>
                    ) : (
                      <>
                        <p className={styles.messaggioSezione}>
                          Anteprima di sola lettura: mostra come si incroceranno le posizioni di
                          girone una volta completato il calendario - nessuna Squadra reale,
                          nessun incontro creato.
                        </p>
                        {prospettoIpotetico.map((sezione) => {
                          // Review fix mirror (Verification Gap Reviewer,
                          // Story 20.20/20.26): senza semifinali (finalina
                          // diretta del formato 6) il titolo della sezione e
                          // l'etichetta dell'unico accoppiamento di "Finali"
                          // sono la STESSA stringa - il prefisso "etichetta:"
                          // e' quindi omesso sotto solo in quel caso, stessa
                          // condizione gia' usata in admin.
                          const haSemifinali = sezione.semifinali.length > 0;
                          return (
                            <div key={sezione.titolo} className={styles.blocoTabellone}>
                              <p className={styles.etichettaSettimana}>{sezione.titolo}</p>
                              {sezione.semifinali.map((accoppiamento) => (
                                <div key={accoppiamento.etichetta} className={styles.rigaProspetto}>
                                  <p className={styles.messaggioSezione}>
                                    {accoppiamento.etichetta}:{" "}
                                    <strong>{accoppiamento.casa}</strong> vs{" "}
                                    <strong>{accoppiamento.ospite}</strong>
                                  </p>
                                  {/* Story 20.28: Slot eventualmente prenotato
                                      in anticipo per questa riga - sola
                                      visualizzazione, stesso componente
                                      MetaSlot gia' usato per le partite reali
                                      ma con la variante di colore leggibile
                                      su sfondo chiaro (review fix, Blind
                                      Hunter: il colore originale, pensato per
                                      lo sfondo scuro di .matchCard, sarebbe
                                      stato illeggibile qui). */}
                                  {accoppiamento.fase && accoppiamento.tabellone && (
                                    <MetaSlot
                                      suSfondoChiaro
                                      slotTorneo={trovaSlotPrenotatoInMemoria(
                                        slotTorneo,
                                        categoria.id,
                                        accoppiamento.fase,
                                        accoppiamento.tabellone,
                                        accoppiamento.ordinale ?? null
                                      )}
                                    />
                                  )}
                                </div>
                              ))}
                              {sezione.finali.map((accoppiamento) => (
                                <div key={accoppiamento.etichetta} className={styles.rigaProspetto}>
                                  <p className={styles.messaggioSezione}>
                                    {haSemifinali && <>{accoppiamento.etichetta}: </>}
                                    <strong>{accoppiamento.casa}</strong> vs{" "}
                                    <strong>{accoppiamento.ospite}</strong>
                                  </p>
                                  {accoppiamento.fase && accoppiamento.tabellone && (
                                    <MetaSlot
                                      suSfondoChiaro
                                      slotTorneo={trovaSlotPrenotatoInMemoria(
                                        slotTorneo,
                                        categoria.id,
                                        accoppiamento.fase,
                                        accoppiamento.tabellone,
                                        accoppiamento.ordinale ?? null
                                      )}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </>
                    )
                  ) : (
                    <>
                      {TABELLONI_TORNEO.map((tabellone) => {
                        const partiteTabellone = partite.filter(
                          (p) => p.tabellone === tabellone.value
                        );
                        // Story 20.17: stesso ordinamento per Slot della griglia di girone.
                        const semifinali = ordinaPartitePerSlot(
                          partiteTabellone.filter((p) => p.fase === "SEMIFINALE")
                        );
                        const finaleVincenti = partiteTabellone.find(
                          (p) => p.fase === "FINALE_VINCENTI"
                        );
                        const finalePerdenti = partiteTabellone.find(
                          (p) => p.fase === "FINALE_PERDENTI"
                        );

                        if (semifinali.length === 0 && !finaleVincenti && !finalePerdenti) {
                          return null;
                        }

                        return (
                          <div key={tabellone.value} className={styles.blocoTabellone}>
                            <p className={styles.etichettaSettimana}>{tabellone.label}</p>
                            <div className={styles.matchGrid}>
                              {semifinali.map((partita) => (
                                <div className={styles.matchCard} key={partita.id}>
                                  {/* Story 20.11: numero di gara progressivo
                                      dell'Edizione, sempre calcolato
                                      server-side. */}
                                  <div className={styles.numeroGara}>Gara {partita.numero}</div>
                                  <div className={styles.categoria}>Semifinale</div>
                                  <div className={styles.squadre}>
                                    <span>{partita.squadraCasa.nome}</span>
                                    <span className={styles.vs}>vs</span>
                                    <span>{partita.squadraOspite.nome}</span>
                                  </div>
                                  <div className={styles.meta}>
                                    {formattaRisultatoPartitaTorneo(partita) ?? (
                                      <em>In programma</em>
                                    )}
                                  </div>
                                  <MetaSlot slotTorneo={partita.slotTorneo} />
                                </div>
                              ))}
                              {finaleVincenti && (
                                <div className={styles.matchCard} key={finaleVincenti.id}>
                                  {/* Story 20.11: numero di gara progressivo
                                      dell'Edizione, sempre calcolato
                                      server-side. */}
                                  <div className={styles.numeroGara}>
                                    Gara {finaleVincenti.numero}
                                  </div>
                                  <div className={styles.categoria}>
                                    {tabellone.etichettaVincenti}
                                  </div>
                                  <div className={styles.squadre}>
                                    <span>{finaleVincenti.squadraCasa.nome}</span>
                                    <span className={styles.vs}>vs</span>
                                    <span>{finaleVincenti.squadraOspite.nome}</span>
                                  </div>
                                  <div className={styles.meta}>
                                    {formattaRisultatoPartitaTorneo(finaleVincenti) ?? (
                                      <em>In programma</em>
                                    )}
                                  </div>
                                  <MetaSlot slotTorneo={finaleVincenti.slotTorneo} />
                                </div>
                              )}
                              {finalePerdenti && (
                                <div className={styles.matchCard} key={finalePerdenti.id}>
                                  {/* Story 20.11: numero di gara progressivo
                                      dell'Edizione, sempre calcolato
                                      server-side. */}
                                  <div className={styles.numeroGara}>
                                    Gara {finalePerdenti.numero}
                                  </div>
                                  <div className={styles.categoria}>
                                    {tabellone.etichettaPerdenti}
                                  </div>
                                  <div className={styles.squadre}>
                                    <span>{finalePerdenti.squadraCasa.nome}</span>
                                    <span className={styles.vs}>vs</span>
                                    <span>{finalePerdenti.squadraOspite.nome}</span>
                                  </div>
                                  <div className={styles.meta}>
                                    {formattaRisultatoPartitaTorneo(finalePerdenti) ?? (
                                      <em>In programma</em>
                                    )}
                                  </div>
                                  <MetaSlot slotTorneo={finalePerdenti.slotTorneo} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <h3 className={styles.titoloGirone}>Classifica finale</h3>
                      {!classificaFinale ? (
                        <p className={styles.messaggioSezione}>
                          La classifica finale sarà consultabile una volta completati tutti gli
                          incontri del tabellone.
                        </p>
                      ) : (
                        <table className={styles.tabellaClassifica}>
                          <thead>
                            <tr>
                              <th>Posizione</th>
                              <th>Squadra</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classificaFinale.map((riga) => (
                              <tr key={riga.squadra.id}>
                                <td>{riga.posizione}°</td>
                                <td>{riga.squadra.nome}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  )}
                </section>
              </section>
            );
          })
        )}
      </main>
      <FooterPubblico />
    </>
  );
}
