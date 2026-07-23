import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { leggiMisurazioniPerAtleta } from "@/lib/db-rls/misurazione-atleta";
import { raggruppaPerTipo } from "@/lib/misurazioni";
import { MisurazioneForm } from "./MisurazioneForm";
import { GraficoMisurazione } from "./GraficoMisurazione";

// Dati potenzialmente diversi ad ogni visita (nuove misurazioni inserite) -
// stesso motivo di /storico-presenze.
export const dynamic = "force-dynamic";

async function SezioneMisurazioni({
  supabase,
  atletaId,
}: {
  supabase: SupabaseClient;
  atletaId: string;
}) {
  const misurazioni = await leggiMisurazioniPerAtleta(supabase, atletaId);
  // Story 6.2 (AC #1/#2/#3/#4): nessuna nuova lettura RLS, opera sullo stesso
  // array gia' caricato per la tabella storico sotto. Array vuoto (nessun
  // tipo con >= 2 punti) -> nessun grafico renderizzato, coerente con AC #4.
  const gruppiGrafico = raggruppaPerTipo(misurazioni);

  return (
    <>
      <MisurazioneForm atletaId={atletaId} />
      {gruppiGrafico.map((gruppo) => (
        <GraficoMisurazione
          key={gruppo.tipo}
          tipo={gruppo.tipo}
          unitaMisura={gruppo.unitaMisura}
          punti={gruppo.punti}
        />
      ))}
      {misurazioni.length === 0 ? (
        <p>Nessuna misurazione registrata.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Valore</th>
              <th>Unità di misura</th>
            </tr>
          </thead>
          <tbody>
            {misurazioni.map((m) => (
              <tr key={m.id}>
                <td>{m.data}</td>
                <td>{m.tipo}</td>
                <td>{m.valore}</td>
                <td>{m.unitaMisura}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default async function DatiFisiciPage({
  searchParams,
}: {
  // searchParams e' una Promise in questa versione di Next.js (16.2.10) -
  // Dev Notes Story 2.8, gia' verificato, non da ri-verificare qui.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const atletaIdSelezionato =
    typeof params.atletaId === "string" ? params.atletaId : "";

  // Utente/Allenatore/GruppoAtleta/GruppoAllenatore non sono protetti da RLS
  // (AD-9) - il client Supabase serve SOLO a identificare la sessione e a
  // leggere "misurazioni_atleta" (RLS-protetta), stesso principio di
  // storico-presenze/page.tsx.
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error(error);
  }

  // Stesso pattern collassato di storico-presenze/page.tsx: le due
  // risoluzioni di identita' non dipendono l'una dall'altra.
  const [allenatore, atletaIds] = user
    ? await Promise.all([
        prisma.allenatore.findFirst({
          where: { utente: { supabaseAuthId: user.id } },
        }),
        // autoAggancio: true (AC #4/#5) - questa sezione mostra "Le mie
        // misurazioni": deve risolvere SOLO l'aggancio a se stessa, mai un
        // aggancio Genitore<->figlia (stesso principio di
        // storico-presenze/page.tsx, Story 3.2 review fix).
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
        <h1>Dati fisici</h1>
        <p>
          Il tuo account non è ancora collegato a un profilo Allenatore o
          Atleta. Contatta la segreteria.
        </p>
      </main>
    );
  }

  let sezioneAtleta: ReactNode = null;
  if (atletaIds.length > 0) {
    // AC #4: mostra il PRIMO atletaId risolto, mai un merge - stesso
    // principio di storico-presenze/page.tsx.
    sezioneAtleta = (
      <section>
        <h2>Le mie misurazioni</h2>
        <SezioneMisurazioni supabase={supabase} atletaId={atletaIds[0]} />
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
          // elencaAtlete(supabase), mai con un include Prisma.
          elencaAtlete(supabase),
        ])
      : [[], []];

    const atletaPerId = new Map(atlete.map((a) => [a.id, a]));
    const proprieAtlete = [...new Set(gruppoAtleteRows.map((r) => r.atletaId))]
      .map((id) => atletaPerId.get(id))
      .filter((a): a is (typeof atlete)[number] => a !== undefined)
      .sort((a, b) => a.nome.localeCompare(b.nome));

    let sezioneSelezionata: ReactNode = null;
    if (atletaIdSelezionato) {
      const trovata = proprieAtlete.some((a) => a.id === atletaIdSelezionato);
      sezioneSelezionata = trovata ? (
        <SezioneMisurazioni
          supabase={supabase}
          atletaId={atletaIdSelezionato}
        />
      ) : (
        // AC #3: un'Atleta non tra le proprie (manomissione dell'URL, non
        // raggiungibile dalla UI) non deve mai arrivare a interrogare le
        // misurazioni - stesso principio di storico-presenze/page.tsx.
        <p role="alert">Atleta non trovata tra le tue.</p>
      );
    }

    sezioneAllenatore = (
      <section>
        <h2>Misurazioni delle mie Atlete</h2>
        <form method="get">
          <label htmlFor="dati-fisici-atleta">Atleta</label>
          <select
            id="dati-fisici-atleta"
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
        {sezioneSelezionata}
      </section>
    );
  }

  return (
    <main>
      <h1>Dati fisici</h1>
      {sezioneAtleta}
      {sezioneAllenatore}
    </main>
  );
}
