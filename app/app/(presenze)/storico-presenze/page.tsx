import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnnoAgonistico } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete, type AtletaElenco } from "@/lib/db-rls/atleta";
import {
  leggiPresenzeGriglia,
  leggiStoricoPresenzePerAtleta,
} from "@/lib/db-rls/presenza";
import { ETICHETTA_GIORNO } from "@/lib/giorno-settimana";
import { giorniDelMese, meseCorrente } from "@/lib/mese-calendario";
import { parseRuoli } from "@/lib/ruoli";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { TitoloPagina } from "@/app/AiutoContestuale";
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

// Story 3.4: logica di caricamento della griglia mensile estratta dalla
// sezione Allenatore (Story 9.17) per essere condivisa con la nuova sezione
// Segreteria - stesso roster/presenze, l'unica differenza tra i due
// chiamanti e' l'elenco Gruppi a monte (propri per l'Allenatore, tutti
// quelli della stagione per la Segreteria), gia' filtrato dal chiamante
// prima di invocare questa funzione.
async function caricaGrigliaGruppo(
  supabase: SupabaseClient,
  gruppoId: string,
  giorni: string[],
  annoCorrente: AnnoAgonistico | null
): Promise<{ roster: AtletaElenco[]; presenzaPerCella: Map<string, boolean> }> {
  const [slotRows, gruppoAtleteRows, atlete] = await Promise.all([
    prisma.slot.findMany({
      where: { gruppoId },
      select: { id: true },
    }),
    annoCorrente
      ? prisma.gruppoAtleta.findMany({
          where: {
            gruppoId,
            annoAgonisticoId: annoCorrente.id,
          },
          select: { atletaId: true },
        })
      : Promise.resolve([]),
    // Atleta e' protetta da RLS (AD-4) - letta SOLO tramite
    // elencaAtlete(supabase), mai con un include Prisma (Dev Notes Story 2.4).
    elencaAtlete(supabase),
  ]);

  const atletaPerId = new Map(atlete.map((a) => [a.id, a]));
  const roster = gruppoAtleteRows
    .map((r) => atletaPerId.get(r.atletaId))
    .filter((a): a is AtletaElenco => a !== undefined)
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

  return { roster, presenzaPerCella };
}

// Story 3.4: markup tabella estratto dalla sezione Allenatore (Story 9.17)
// per essere condiviso con la nuova sezione Segreteria - stesso identico
// rendering (Atleta per riga, colonna per giorno, celle vuote/presente/
// assente), nessuna copia del JSX tra le due sezioni.
function TabellaGriglia({
  roster,
  giorni,
  presenzaPerCella,
}: {
  roster: AtletaElenco[];
  giorni: string[];
  presenzaPerCella: Map<string, boolean>;
}): ReactNode {
  // Stesso principio "mai una riga sparita in silenzio" gia' in uso nel
  // resto del progetto: un Gruppo senza Atlete assegnate mostra un messaggio
  // esplicito, non una tabella/sezione vuota senza spiegazione.
  if (roster.length === 0) {
    return (
      <p className={styles.messaggioVuoto}>
        Nessuna Atleta assegnata a questo Gruppo.
      </p>
    );
  }

  return (
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
  // Story 3.4 (review fix, Blind Hunter + Edge Case Hunter, trovato
  // indipendentemente da entrambi): la sezione Segreteria usa searchParam
  // distinti da quelli dell'Allenatore sopra - le due sezioni possono
  // coesistere per un Utente con doppio Ruolo Allenatore+Segreteria (caso
  // raro ma reale), e condividere "gruppoId"/"mese" farebbe si' che
  // sottomettere UN form (es. quello Segreteria) sovrascriva silenziosamente
  // anche il Gruppo/Mese mostrato dall'ALTRA sezione, mai toccata
  // dall'Utente in quell'azione.
  const gruppoIdSegreteriaSelezionato =
    typeof params.gruppoIdSegreteria === "string"
      ? params.gruppoIdSegreteria
      : "";
  const meseSegreteriaParam =
    typeof params.meseSegreteria === "string" ? params.meseSegreteria : "";
  const meseSegreteriaSelezionato = FORMATO_MESE.test(meseSegreteriaParam)
    ? meseSegreteriaParam
    : meseCorrente();

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
  const ruoli = parseRuoli(user?.app_metadata?.ruoli);
  // Story 3.4: la Segreteria non ha (e non deve avere) un profilo
  // Allenatore/Atleta collegato per accedere a questa rotta - e' l'unico dei
  // tre Ruoli ammessi la cui sezione non dipende da allenatore/atletaIds.
  const isSegreteria = ruoli.includes("SEGRETERIA");

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

  // Story 3.4 (I/O matrix): un Utente con SOLO Ruolo Segreteria non ha (e
  // non deve avere) un profilo Allenatore/Atleta collegato - la guardia
  // "account non collegato" va quindi bypassata quando isSegreteria e' vero,
  // la sua sezione e' comunque mostrata sotto senza dipendere da
  // allenatore/atletaIds.
  if (!allenatore && atletaIds.length === 0 && !isSegreteria) {
    return (
      <main>
        <TitoloPagina
          titolo="Storico presenze"
          contenuto={contenutoPerRotta("/app/storico-presenze", ruoli)}
        />
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

  // Sola lettura (trovaAnnoAgonisticoCorrente, mai
  // risolviAnnoAgonisticoCorrente in una pagina GET - Dev Notes Story 1.6).
  // Story 3.4: calcolato una sola volta, condiviso tra la sezione Allenatore
  // e la nuova sezione Segreteria (entrambe interrogano Gruppi della
  // stagione corrente) - nessuna delle due lo richiede se l'Utente non ha
  // nessuno dei due Ruoli.
  const annoCorrente =
    allenatore || isSegreteria ? await trovaAnnoAgonisticoCorrente() : null;

  // Story 9.17 (AC #1): sostituisce la sezione "Storico delle mie Atlete"
  // (select singola Atleta) con una griglia mensile per Gruppo - decisione
  // presa con l'utente in fase di creazione storia. "Il mio storico"
  // (sezioneAtleta sopra) non e' toccato.
  let sezioneAllenatore: ReactNode = null;
  if (allenatore) {
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
        const { roster, presenzaPerCella } = await caricaGrigliaGruppo(
          supabase,
          gruppoIdSelezionato,
          giorni,
          annoCorrente
        );
        griglia = (
          <TabellaGriglia
            roster={roster}
            giorni={giorni}
            presenzaPerCella={presenzaPerCella}
          />
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

  // Story 3.4: terza sezione, visibile alla Segreteria - riusa la stessa
  // griglia mensile dell'Allenatore (caricaGrigliaGruppo/TabellaGriglia
  // sopra), unica differenza l'elenco Gruppi a monte: TUTTI i Gruppi della
  // stagione corrente (stesso pattern gia' usato per Segreteria in
  // /app/orari e /app/gruppi), non solo quelli propri - la Segreteria non
  // allena alcun Gruppo, "propri" non si applica. Sola consultazione, nessun
  // form di scrittura (stesso principio gia' seguito per Segreteria su
  // /app/gruppi Story 2.10 e /app/orari Story 2.9).
  let sezioneSegreteria: ReactNode = null;
  if (isSegreteria) {
    const gruppiStagione = annoCorrente
      ? await prisma.gruppo.findMany({
          where: { annoAgonisticoId: annoCorrente.id },
          orderBy: { nome: "asc" },
        })
      : [];

    let grigliaSegreteria: ReactNode = null;
    if (gruppoIdSegreteriaSelezionato) {
      const gruppoValido = gruppiStagione.some(
        (g) => g.id === gruppoIdSegreteriaSelezionato
      );

      if (!gruppoValido) {
        // Stesso trattamento della guardia Allenatore sopra (AC #4): un
        // gruppoId manomesso (non esistente/non della stagione corrente)
        // non deve mai arrivare a interrogare la griglia.
        grigliaSegreteria = (
          <p role="alert" className={styles.errore}>
            Gruppo non trovato tra quelli della stagione corrente.
          </p>
        );
      } else {
        const giorni = giorniDelMese(meseSegreteriaSelezionato);
        const { roster, presenzaPerCella } = await caricaGrigliaGruppo(
          supabase,
          gruppoIdSegreteriaSelezionato,
          giorni,
          annoCorrente
        );
        grigliaSegreteria = (
          <TabellaGriglia
            roster={roster}
            giorni={giorni}
            presenzaPerCella={presenzaPerCella}
          />
        );
      }
    }

    sezioneSegreteria = (
      <section className={styles.sezione}>
        {/* Review fix (Blind Hunter): titolo differenziato da quello
            dell'Allenatore sopra - per un Utente col doppio Ruolo
            Allenatore+Segreteria (caso raro) le due sezioni comparirebbero
            altrimenti con lo stesso <h2>, indistinguibili per chi naviga per
            intestazioni (screen reader). */}
        <h2>Griglia mensile presenze (tutti i Gruppi)</h2>
        <form method="get">
          <div className={styles.campo}>
            <label htmlFor="griglia-gruppo-segreteria">Gruppo</label>
            <select
              id="griglia-gruppo-segreteria"
              name="gruppoIdSegreteria"
              defaultValue={gruppoIdSegreteriaSelezionato}
            >
              <option value="">Seleziona...</option>
              {gruppiStagione.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor="griglia-mese-segreteria">Mese</label>
            <input
              id="griglia-mese-segreteria"
              type="month"
              name="meseSegreteria"
              defaultValue={meseSegreteriaSelezionato}
            />
          </div>
          <button type="submit" className={styles.bottone}>
            Carica
          </button>
        </form>
        {grigliaSegreteria}
      </section>
    );
  }

  return (
    <main>
      <TitoloPagina
        titolo="Storico presenze"
        contenuto={contenutoPerRotta("/app/storico-presenze", ruoli)}
      />
      {sezioneAtleta}
      {sezioneAllenatore}
      {sezioneSegreteria}
    </main>
  );
}
