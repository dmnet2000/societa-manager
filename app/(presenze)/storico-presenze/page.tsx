import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { leggiStoricoPresenzePerAtleta } from "@/lib/db-rls/presenza";
import { ETICHETTA_GIORNO } from "@/lib/giorno-settimana";

// Dati potenzialmente diversi ad ogni visita (nuove Presenze registrate da
// un Allenatore, Story 3.1) - stesso motivo di /mio-orario, /presenze.
export const dynamic = "force-dynamic";

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
    return <p>Nessuna Presenza registrata.</p>;
  }

  const slotIds = [...new Set(storico.map((r) => r.slotId))];
  const slotRows = await prisma.slot.findMany({
    where: { id: { in: slotIds } },
    include: { gruppo: true },
  });
  const slotPerId = new Map(slotRows.map((s) => [s.id, s]));

  return (
    <table>
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
        {storico
          .map((riga) => ({ riga, slot: slotPerId.get(riga.slotId) }))
          .filter(
            (r): r is { riga: (typeof storico)[number]; slot: NonNullable<(typeof r)["slot"]> } =>
              r.slot !== undefined
          )
          .map(({ riga, slot }) => (
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
  const atletaIdSelezionato =
    typeof params.atletaId === "string" ? params.atletaId : "";

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
        prisma.genitoreAtleta
          .findMany({
            where: { utente: { supabaseAuthId: user.id } },
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
      <section>
        <h2>Il mio storico</h2>
        <StoricoTable supabase={supabase} atletaId={atletaIds[0]} />
      </section>
    );
  }

  let sezioneAllenatore: ReactNode = null;
  if (allenatore) {
    // Sola lettura (trovaAnnoAgonisticoCorrente, mai
    // risolviAnnoAgonisticoCorrente in una pagina GET - Dev Notes Story 1.6).
    const annoCorrente = await trovaAnnoAgonisticoCorrente();

    const [gruppoAtleteRows, atlete] = annoCorrente
      ? await Promise.all([
          prisma.gruppoAtleta.findMany({
            where: {
              annoAgonisticoId: annoCorrente.id,
              gruppo: { allenatori: { some: { allenatoreId: allenatore.id } } },
            },
            select: { atletaId: true },
          }),
          // Atleta e' protetta da RLS (AD-4) - letta SOLO tramite
          // elencaAtlete(supabase), mai con un include Prisma (Dev Notes
          // Story 2.4).
          elencaAtlete(supabase),
        ])
      : [[], []];

    const atletaPerId = new Map(atlete.map((a) => [a.id, a]));
    const proprieAtlete = [...new Set(gruppoAtleteRows.map((r) => r.atletaId))]
      .map((id) => atletaPerId.get(id))
      .filter((a): a is (typeof atlete)[number] => a !== undefined)
      .sort((a, b) => a.nome.localeCompare(b.nome));

    let storicoSelezionato: ReactNode = null;
    if (atletaIdSelezionato) {
      const trovata = proprieAtlete.some((a) => a.id === atletaIdSelezionato);
      storicoSelezionato = trovata ? (
        <StoricoTable supabase={supabase} atletaId={atletaIdSelezionato} />
      ) : (
        // AC #2: un'Atleta non tra le proprie (manomissione dell'URL, non
        // raggiungibile dalla UI, che espone solo le proprie Atlete nel
        // <select>) non deve mai arrivare a interrogare lo storico.
        <p role="alert">Atleta non trovata tra le tue.</p>
      );
    }

    sezioneAllenatore = (
      <section>
        <h2>Storico delle mie Atlete</h2>
        <form method="get">
          <label htmlFor="storico-atleta">Atleta</label>
          <select
            id="storico-atleta"
            name="atletaId"
            defaultValue={atletaIdSelezionato}
          >
            <option value="">Seleziona...</option>
            {proprieAtlete.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
          <button type="submit">Carica</button>
        </form>
        {storicoSelezionato}
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
