import Link from "next/link";
import { notFound } from "next/navigation";
import {
  trovaCategoriaTorneoPerId,
  elencaSquadreTorneo,
  elencaPartiteTorneo,
  elencaSlotTorneo,
  elencaSlotOccupatiEdizione,
} from "@/lib/torneo";
import { calcolaClassificaFinale } from "@/lib/classifica-finale-torneo";
import { haRisultatoCompleto } from "@/lib/risultato-partita-torneo";
import { GIRONI_TORNEO } from "@/lib/girone-torneo";
import { TABELLONI_TORNEO } from "@/lib/tabelloni-torneo";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { GeneraTabelloneForm } from "./GeneraTabelloneForm";
import { RisultatoPartitaTorneoForm } from "../risultati/RisultatoPartitaTorneoForm";
import styles from "../../../torneo.module.css";

// Story 20.4 (Epic 20, Torneo Memorial): mirror di
// app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/page.tsx per
// il 404 su id inesistente/non corrispondente. Dati mutabili in tempo reale
// (generazione tabellone/inserimento risultati/generazione automatica delle
// finali tramite Server Action sulla stessa pagina, classifica finale
// sempre ricalcolata al volo) - stesso motivo delle altre pagine Torneo.
export const dynamic = "force-dynamic";

export default async function TabelloneTorneoPage({
  params,
}: {
  params: Promise<{ edizioneId: string; categoriaId: string }>;
}) {
  const { edizioneId, categoriaId } = await params;

  // Le risoluzioni non dipendono l'una dall'altra - eseguite in Promise.all,
  // stesso principio gia' stabilito altrove nel progetto. Story 20.9:
  // elencaSlotTorneo e' scoped per edizioneId (gia' disponibile dai params).
  const [ruoli, categoria, squadre, partite, slotTorneo, slotOccupatiEdizione] =
    await Promise.all([
      risolviRuoliPerAiutoContestuale(),
      trovaCategoriaTorneoPerId(categoriaId),
      elencaSquadreTorneo(categoriaId),
      elencaPartiteTorneo(categoriaId),
      elencaSlotTorneo(edizioneId),
      // Review fix (Blind Hunter + Edge Case Hunter): stesso motivo di
      // risultati/page.tsx - SlotTorneo e' condiviso tra tutte le Categorie
      // dell'Edizione, l'insieme degli occupati deve coprirle tutte.
      elencaSlotOccupatiEdizione(edizioneId),
    ]);

  // Un id inesistente/gia' eliminato, O una Categoria esistente ma sotto
  // un'altra Edizione (edizioneId nell'URL non corrispondente) - 404 in
  // entrambi i casi, stesso comportamento di ogni altra pagina di dettaglio
  // del progetto raggiunta per id.
  if (!categoria || categoria.edizioneTorneoId !== edizioneId) {
    notFound();
  }

  // Il tabellone esiste per questa Categoria se e solo se almeno una
  // PartitaTorneo con fase diversa da GIRONE e' gia' stata generata
  // (generaTabelloneAction crea sempre le 4 semifinali in un'unica azione,
  // mai parzialmente) - basta questo per decidere quale delle due viste
  // mostrare, stesso principio di "calendarioGenerato" in risultati/page.tsx.
  const tabelloneGenerato = partite.some((p) => p.fase !== "GIRONE");

  // Riepilogo di completezza dei gironi mostrato SOLO nello stato "tabellone
  // non ancora generato" - stessa informazione (non lo stesso messaggio)
  // verificata server-side da generaTabelloneAction, qui e' solo un aiuto
  // visivo prima del tentativo. Review fix (Blind Hunter, Story 20.4): due
  // condizioni indipendenti ("almeno 4 squadre" e "tutti i risultati di
  // girone inseriti") ora restano distinte invece di un solo booleano
  // combinato - un girone a 3 squadre con tutti i risultati inseriti non
  // deve piu' mostrare lo stesso messaggio generico "classifica non ancora
  // completa" di un girone a 4 squadre con un incontro ancora da giocare.
  // Iterata su GIRONI_TORNEO (unica fonte di verita', lib/girone-torneo.ts)
  // invece di ripetere "GIRONE_A"/"GIRONE_B" come stringhe letterali.
  const statoGironi = GIRONI_TORNEO.map((girone) => {
    const squadreDelGirone = squadre.filter((s) => s.girone === girone.value);
    const partiteDelGirone = partite.filter(
      (p) => p.fase === "GIRONE" && p.squadraCasa.girone === girone.value
    );
    return {
      girone,
      numeroSquadre: squadreDelGirone.length,
      squadreSufficienti: squadreDelGirone.length >= 4,
      risultatiCompleti:
        partiteDelGirone.length > 0 && partiteDelGirone.every(haRisultatoCompleto),
    };
  });
  const tabelloneGenerabile = statoGironi.every(
    (s) => s.squadreSufficienti && s.risultatiCompleti
  );

  // Classifica finale MAI persistita - ricalcolata al volo da qui a ogni
  // caricamento della pagina (spec-20-4 Boundaries, stesso principio di
  // calcolaClassificaGirone). null finche' le 4 finali non hanno tutte un
  // risultato completo (spec-20-4 I/O matrix).
  // Review fix (Verification Gap Reviewer, Story 20.4): calcolaClassificaFinale
  // ora prende l'intero array e deriva da sola quale riga appartiene a
  // quale tabellone (legge "tabellone" dai dati) - nessun filtro/scambio
  // posizionale qui da poter sbagliare.
  const classificaFinale = tabelloneGenerato ? calcolaClassificaFinale(partite) : null;

  // Story 20.9: a differenza di risultati/page.tsx (un solo insieme di Slot
  // GIRONE per tutta la pagina), qui fase/tabellone variano per Partita
  // (SEMIFINALE/FINALE_VINCENTI/FINALE_PERDENTI x POSIZIONI_1_4/5_8) - gli
  // Slot disponibili sono quindi filtrati per-Partita da questo helper.
  // slotOccupati raccoglie gli slotTorneoId gia' assegnati a QUALUNQUE
  // Partita dell'INTERA EDIZIONE (non solo di questa Categoria, review fix
  // - vedi risultati/page.tsx) - serve solo all'avviso client-side "Slot
  // gia' occupato".
  function slotPerPartita(p: { fase: string; tabellone: string | null }) {
    return slotTorneo.filter((s) => s.fase === p.fase && s.tabellone === p.tabellone);
  }
  const slotOccupati = new Set(slotOccupatiEdizione);

  return (
    <main>
      <Link className={styles.link} href={`/app/torneo/${edizioneId}/${categoriaId}`}>
        ← Torna alla Categoria
      </Link>
      <TitoloPagina
        titolo={`Tabellone: ${categoria.nome}`}
        contenuto={contenutoPerRotta("/app/torneo", ruoli)}
      />

      {!tabelloneGenerato ? (
        <section className={styles.sezione}>
          <p className={styles.riepilogo}>
            {statoGironi
              .map(({ girone, numeroSquadre, squadreSufficienti, risultatiCompleti }) => {
                if (!squadreSufficienti) {
                  return `${girone.label}: ${numeroSquadre} squadre (servono almeno 4)`;
                }
                if (!risultatiCompleti) {
                  return `${girone.label}: ${numeroSquadre} squadre (risultati di girone non ancora completi)`;
                }
                return `${girone.label}: ${numeroSquadre} squadre (pronto)`;
              })
              .join(" · ")}
          </p>
          <GeneraTabelloneForm categoriaTorneoId={categoriaId} pronto={tabelloneGenerabile} />
        </section>
      ) : (
        <>
          {TABELLONI_TORNEO.map((tabellone) => {
            const partiteTabellone = partite.filter((p) => p.tabellone === tabellone.value);
            const semifinali = partiteTabellone.filter((p) => p.fase === "SEMIFINALE");
            // Review fix (Blind Hunter, Story 20.4): le due finali di uno
            // stesso tabellone erano indistinguibili sulla pagina (nessuna
            // etichetta, solo le squadre in campo) - ora ciascuna mostra
            // esplicitamente quale posizionamento decide.
            const finaleVincenti = partiteTabellone.find((p) => p.fase === "FINALE_VINCENTI");
            const finalePerdenti = partiteTabellone.find((p) => p.fase === "FINALE_PERDENTI");

            return (
              <section key={tabellone.value} className={styles.sezione}>
                <h2>{tabellone.label}</h2>

                <h3>Semifinali</h3>
                {semifinali.map((partita) => (
                  <RisultatoPartitaTorneoForm
                    key={partita.id}
                    partita={partita}
                    slotDisponibili={slotPerPartita(partita)}
                    slotOccupati={slotOccupati}
                  />
                ))}

                <h3>Finali</h3>
                {/* Nessuna azione manuale per generarle - side-effect di
                    salvaRisultatoPartitaTorneoAction quando entrambe le
                    semifinali sorelle hanno un risultato (spec-20-4 Design
                    Notes). */}
                {!finaleVincenti && !finalePerdenti ? (
                  <p className={styles.messaggioVuoto}>
                    Le finali vengono generate automaticamente una volta inseriti i risultati di
                    entrambe le semifinali.
                  </p>
                ) : (
                  <>
                    {finaleVincenti && (
                      <>
                        <p className={styles.riepilogo}>{tabellone.etichettaVincenti}</p>
                        <RisultatoPartitaTorneoForm
                          partita={finaleVincenti}
                          slotDisponibili={slotPerPartita(finaleVincenti)}
                          slotOccupati={slotOccupati}
                        />
                      </>
                    )}
                    {finalePerdenti && (
                      <>
                        <p className={styles.riepilogo}>{tabellone.etichettaPerdenti}</p>
                        <RisultatoPartitaTorneoForm
                          partita={finalePerdenti}
                          slotDisponibili={slotPerPartita(finalePerdenti)}
                          slotOccupati={slotOccupati}
                        />
                      </>
                    )}
                  </>
                )}
              </section>
            );
          })}

          <section className={styles.sezione}>
            <h2>Classifica finale</h2>
            {!classificaFinale ? (
              <p className={styles.messaggioVuoto}>
                La classifica finale sarà consultabile una volta completati tutti gli incontri del
                tabellone.
              </p>
            ) : (
              <table className={styles.tabella}>
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
          </section>
        </>
      )}
    </main>
  );
}
