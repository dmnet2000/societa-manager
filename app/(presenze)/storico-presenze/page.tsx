import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import {
  leggiPresenzeGriglia,
  leggiStoricoPresenzePerAtleta,
} from "@/lib/db-rls/presenza";
import { ETICHETTA_GIORNO } from "@/lib/giorno-settimana";
import { giorniDelMese, meseCorrente } from "@/lib/mese-calendario";
import {
  calcolaStatistichePresenza,
  ETICHETTA_TREND,
} from "./calcola-statistiche-presenza";
import styles from "./storico-presenze.module.css";

// Dati potenzialmente diversi ad ogni visita (nuove Presenze registrate da
// un Allenatore, Story 3.1) - stesso motivo di /mio-orario, /presenze.
export const dynamic = "force-dynamic";

// Story 9.17 (review fix): valida il formato "YYYY-MM" del searchParam
// "mese" prima di passarlo a giorniDelMese - stesso principio di FORMATO_DATA
// gia' usato altrove nel progetto (es. dati-fisici/actions.ts).
const FORMATO_MESE = /^\d{4}-(0[1-9]|1[0-2])$/;

// Storico + join manuale con Slot/Campo/Palestra/Gruppo (non protetti da
// RLS, AD-9) - stesso pattern gia' usato in /presenze e /gruppi. Un Slot
// referenziato da una Presenza esiste sempre (FK con CASCADE, mai orfano) -
// il filtro sotto e' comunque difensivo, stesso principio gia' applicato al
// roster di /presenze.
async function StoricoTable({
  supabase,
  atletaId,
}: {
  supabase: SupabaseClient;
  atletaId: string;
}) {
  const storico = await leggiStoricoPresenzePerAtleta(supabase, atletaId);

  if (storico.length === 0) {
    return <p className={styles.messaggioVuoto}>Nessuna Presenza registrata.</p>;
  }

  const slotIds = [...new Set(storico.map((r) => r.slotId))];
  const slotRows = await prisma.slot.findMany({
    where: { id: { in: slotIds } },
    include: { gruppo: true },
  });
  const slotPerId = new Map(slotRows.map((s) => [s.id, s]));

  // Righe effettivamente renderizzate (Slot risolvibile) - le statistiche
  // FR-10 sono calcolate sullo stesso sottoinsieme visibile nella tabella,
  // cosi' restano sempre coerenti con cio' che l'Allenatore/Atleta vede
  // (review fix: prima venivano calcolate sull'intero storico non filtrato).
  const righeVisibili = storico
    .map((riga) => ({ riga, slot: slotPerId.get(riga.slotId) }))
    .filter(
      (r): r is { riga: (typeof storico)[number]; slot: NonNullable<(typeof r)["slot"]> } =>
        r.slot !== undefined
    );

  // FR-10: percentuale + trend calcolati sullo storico gia' caricato sopra,
  // nessuna query aggiuntiva. Componente condiviso Atleta/Allenatore (Dev
  // Notes Story 3.3) - compare identico in entrambe le sezioni.
  const statistiche = calcolaStatistichePresenza(
    righeVisibili.map((r) => r.riga)
  );

  return (
    <>
      {statistiche && (
        <p className={styles.statistiche}>
          Percentuale presenza: <span className={styles.percentuale}>{statistiche.percentuale}%</span> — Trend:{" "}
          {ETICHETTA_TREND[statistiche.trend]}
        </p>
      )}
      <div className={styles.scrollWrapper}>
        <table className={styles.tabella}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Giorno</th>
              <th>Orario</th>
              <th>Gruppo</th>
              <th>Presenza</th>
            </tr>
          </thead>
          <tbody>
            {righeVisibili.map(({ riga, slot }) => (
              <tr key={riga.id}>
                <td>{riga.data}</td>
                <td>{ETICHETTA_GIORNO[slot.giorno]}</td>
                <td>
                  {slot.oraInizio}–{slot.oraFine}
                </td>
                <td>{slot.gruppo.nome}</td>
                <td>{riga.presente ? "Presente" : "Assente"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default async function StoricoPresenzePage({
  searchParams,
}: {
  // searchParams e' una Promise in questa versione di Next.js (16.2.10) -
  // Dev Notes Story 2.8, gia' verificato, non da ri-verificare qui.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  // Story 9.17: "atletaId" non e' piu' un searchParam usato da questa pagina
  // - apparteneva solo al vecchio select singola Atleta lato Allenatore,
  // sostituito dalla griglia (gruppoId/mese sotto). "Il mio storico" non ha
  // mai usato un parametro URL, sceglie sempre atletaIds[0].
  const gruppoIdSelezionato =
    typeof params.gruppoId === "string" ? params.gruppoId : "";
  // Story 9.17: default al mese corrente se assente O malformato (review
  // fix: un valore manomesso, es. "?mese=abc" o "?mese=2026-13", produceva
  // una cascata di NaN in giorniDelMese - non e' un caso di autorizzazione
  // come gruppoId (AC #4, alert esplicito), un mese non valido ricade
  // semplicemente sul default, stesso trattamento di un parametro assente.
  const meseParam = typeof params.mese === "string" ? params.mese : "";
  const meseSelezionato = FORMATO_MESE.test(meseParam) ? meseParam : meseCorrente();

  // Utente/Allenatore/GruppoAtleta/GruppoAllenatore/Slot non sono protetti
  // da RLS (AD-9) - il client Supabase serve SOLO a identificare la sessione
  // e a leggere "presenze" (RLS-protetta, AD-4), stesso principio di
  // mio-orario/page.tsx e presenze/page.tsx.
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Un errore qui va distinto da "nessuna sessione" nei log - stessa policy
  // gia' stabilita in requireRuolo/mio-orario/presenze (Story 1.3/2.6/3.1).
  if (error) {
    console.error(error);
  }

  // Stesso pattern collassato di mio-orario/presenze (Story 2.6/2.7/3.1):
  // le due risoluzioni di identita' non dipendono l'una dall'altra.
  const [allenatore, atletaIds] = user
    ? await Promise.all([
        prisma.allenatore.findFirst({
          where: { utente: { supabaseAuthId: user.id } },
        }),
        // autoAggancio: true (Story 3.2 review fix, AC #3) - questa sezione
        // mostra "Il mio storico": deve risolvere SOLO l'aggancio a se
        // stessa, mai un aggancio Genitore<->figlia (un Utente con doppio
        // Ruolo Atleta+Genitore avrebbe altrimenti potuto vedere lo storico
        // di una figlia sotto la propria identita' - stessa distinzione
        // ora imposta anche a livello RLS, vedi migrazione
        // 20260718010000_genitori_atlete_auto_aggancio).
        prisma.genitoreAtleta
          .findMany({
            where: { utente: { supabaseAuthId: user.id }, autoAggancio: true },
            select: { atletaId: true },
          })
          .then((righe) => righe.map((riga) => riga.atletaId)),
      ])
    : [null, []];

  if (!allenatore && atletaIds.length === 0) {
    return (
      <main>
        <h1>Storico presenze</h1>
        <p>
          Il tuo account non è ancora collegato a un profilo Allenatore o
          Atleta. Contatta la segreteria.
        </p>
      </main>
    );
  }

  let sezioneAtleta: ReactNode = null;
  if (atletaIds.length > 0) {
    // AC #3: mostra il PRIMO atletaId risolto, mai un merge (Dev Notes
    // Story 3.2) - a differenza di mio-orario, unire cronologie di presenza
    // di persone diverse confonderebbe l'identita' di chi era presente.
    sezioneAtleta = (
      <section className={styles.sezione}>
        <h2>Il mio storico</h2>
        <StoricoTable supabase={supabase} atletaId={atletaIds[0]} />
      </section>
    );
  }

  // Story 9.17 (AC #1): sostituisce la sezione "Storico delle mie Atlete"
  // (select singola Atleta) con una griglia mensile per Gruppo - decisione
  // presa con l'utente in fase di creazione storia. "Il mio storico"
  // (sezioneAtleta sopra) non e' toccato.
  let sezioneAllenatore: ReactNode = null;
  if (allenatore) {
    // Sola lettura (trovaAnnoAgonisticoCorrente, mai
    // risolviAnnoAgonisticoCorrente in una pagina GET - Dev Notes Story 1.6).
    const annoCorrente = await trovaAnnoAgonisticoCorrente();

    // Stesso pattern "risolvi i miei Gruppi" di i-miei-gruppi/page.tsx
    // (Story 9.15) - replicato localmente, non importato tra moduli (AD-2).
    const gruppiPropri = annoCorrente
      ? await prisma.gruppo.findMany({
          where: {
            annoAgonisticoId: annoCorrente.id,
            allenatori: { some: { allenatoreId: allenatore.id } },
          },
          orderBy: { nome: "asc" },
        })
      : [];

    let griglia: ReactNode = null;
    if (gruppoIdSelezionato) {
      const gruppoValido = gruppiPropri.some((g) => g.id === gruppoIdSelezionato);

      if (!gruppoValido) {
        // AC #4: un Gruppo non tra i propri (manomissione dell'URL/form, non
        // raggiungibile dalla UI, che espone solo i propri Gruppi nel
        // <select>) non deve mai arrivare a interrogare la griglia.
        griglia = (
          <p role="alert" className={styles.errore}>
            Gruppo non trovato tra i tuoi.
          </p>
        );
      } else {
        const giorni = giorniDelMese(meseSelezionato);

        const [slotRows, gruppoAtleteRows, atlete] = await Promise.all([
          prisma.slot.findMany({
            where: { gruppoId: gruppoIdSelezionato },
            select: { id: true },
          }),
          annoCorrente
            ? prisma.gruppoAtleta.findMany({
                where: {
                  gruppoId: gruppoIdSelezionato,
                  annoAgonisticoId: annoCorrente.id,
                },
                select: { atletaId: true },
              })
            : Promise.resolve([]),
          // Atleta e' protetta da RLS (AD-4) - letta SOLO tramite
          // elencaAtlete(supabase), mai con un include Prisma (Dev Notes
          // Story 2.4).
          elencaAtlete(supabase),
        ]);

        const atletaPerId = new Map(atlete.map((a) => [a.id, a]));
        const roster = gruppoAtleteRows
          .map((r) => atletaPerId.get(r.atletaId))
          .filter((a): a is (typeof atlete)[number] => a !== undefined)
          .sort((a, b) => a.nome.localeCompare(b.nome));

        const slotIds = slotRows.map((s) => s.id);
        const atletaIdsRoster = roster.map((a) => a.id);
        const presenze = await leggiPresenzeGriglia(
          supabase,
          slotIds,
          atletaIdsRoster,
          giorni
        );

        // Chiave "atletaId|data" per un lookup O(1) per cella (AC #2/#3).
        const presenzaPerCella = new Map(
          presenze.map((p) => [`${p.atletaId}|${p.data}`, p.presente])
        );

        griglia =
          roster.length === 0 ? (
            <p className={styles.messaggioVuoto}>
              Nessuna Atleta assegnata a questo Gruppo.
            </p>
          ) : (
            <div className={styles.scrollWrapper}>
              <table className={styles.tabella}>
                <thead>
                  <tr>
                    <th>Atleta</th>
                    {giorni.map((giorno) => (
                      <th key={giorno}>{giorno.slice(8, 10)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((a) => (
                    <tr key={a.id}>
                      <td>{a.nome}</td>
                      {giorni.map((giorno) => {
                        const chiave = `${a.id}|${giorno}`;
                        const presente = presenzaPerCella.has(chiave)
                          ? presenzaPerCella.get(chiave)
                          : undefined;
                        return (
                          <td
                            key={giorno}
                            className={
                              presente === true
                                ? styles.cellaPresente
                                : presente === false
                                  ? styles.cellaAssente
                                  : undefined
                            }
                          >
                            {presente === true ? "✓" : presente === false ? "✗" : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
      }
    }

    sezioneAllenatore = (
      <section className={styles.sezione}>
        <h2>Griglia mensile presenze</h2>
        <form method="get">
          <div className={styles.campo}>
            <label htmlFor="griglia-gruppo">Gruppo</label>
            <select
              id="griglia-gruppo"
              name="gruppoId"
              defaultValue={gruppoIdSelezionato}
            >
              <option value="">Seleziona...</option>
              {gruppiPropri.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor="griglia-mese">Mese</label>
            <input
              id="griglia-mese"
              type="month"
              name="mese"
              defaultValue={meseSelezionato}
            />
          </div>
          <button type="submit" className={styles.bottone}>
            Carica
          </button>
        </form>
        {griglia}
      </section>
    );
  }

  return (
    <main>
      <h1>Storico presenze</h1>
      {sezioneAtleta}
      {sezioneAllenatore}
    </main>
  );
}
