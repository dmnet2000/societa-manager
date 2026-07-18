import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { leggiPresenzePerSlotEData } from "@/lib/db-rls/presenza";
import { ETICHETTA_GIORNO, giornoSettimanaDaData } from "@/lib/giorno-settimana";
import { PresenzeForm } from "./PresenzeForm";

// Dati mutabili ad ogni visita (registrazione presenze tramite Server
// Action sulla stessa pagina) - stesso motivo di /gruppi, /slot (Story 2.2,
// 2.5).
export const dynamic = "force-dynamic";

export default async function PresenzePage({
  searchParams,
}: {
  // searchParams e' una Promise in questa versione di Next.js (16.2.10) -
  // Dev Notes Story 2.8, gia' verificato, non da ri-verificare qui.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const slotId = typeof params.slotId === "string" ? params.slotId : "";
  const data = typeof params.data === "string" ? params.data : "";

  // Utente/Allenatore/Gruppo/GruppoAllenatore/GruppoAtleta/Slot non sono
  // protetti da RLS (AD-9) - il client Supabase serve SOLO a identificare la
  // sessione e a leggere/scrivere "presenze" (RLS-protetta, AD-4), mai per
  // le altre query dati, che restano Prisma diretto (stesso principio di
  // mio-orario/page.tsx, Story 2.6/2.7).
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Un errore qui va distinto da "nessuna sessione" nei log - stessa policy
  // gia' stabilita in requireRuolo/mio-orario (Story 1.3/2.6). Il
  // comportamento resta fail-closed (messaggio sotto) in entrambi i casi.
  if (error) {
    console.error(error);
  }

  const allenatore = user
    ? await prisma.allenatore.findFirst({
        where: { utente: { supabaseAuthId: user.id } },
      })
    : null;

  let body: ReactNode;

  if (!allenatore) {
    body = (
      <p>
        Il tuo account non è ancora collegato a un profilo Allenatore.
        Contatta la segreteria.
      </p>
    );
  } else {
    // Sola lettura (trovaAnnoAgonisticoCorrente, mai
    // risolviAnnoAgonisticoCorrente in una pagina GET - Dev Notes Story 1.6).
    const annoCorrente = await trovaAnnoAgonisticoCorrente();

    const slotPropri = annoCorrente
      ? await prisma.slot.findMany({
          where: {
            gruppo: {
              annoAgonisticoId: annoCorrente.id,
              allenatori: { some: { allenatoreId: allenatore.id } },
            },
          },
          include: { gruppo: true },
          orderBy: [{ giorno: "asc" }, { oraInizio: "asc" }],
        })
      : [];

    let sezioneRoster: ReactNode = null;

    if (slotId && data && annoCorrente) {
      const slotSelezionato = slotPropri.find((s) => s.id === slotId);

      if (!slotSelezionato) {
        // AC #4: uno Slot non tra i propri (manomissione dell'URL, non solo
        // un caso raggiungibile dalla UI, che espone solo i propri Slot nel
        // <select>) non deve mai arrivare a interrogare il roster.
        sezioneRoster = (
          <p role="alert">Slot non trovato tra i tuoi Gruppi.</p>
        );
      } else if (giornoSettimanaDaData(data) !== slotSelezionato.giorno) {
        sezioneRoster = (
          <p role="alert">
            La data selezionata non corrisponde al giorno di questo Slot.
          </p>
        );
      } else {
        const [gruppoAtleteRows, atlete, presenzeEsistenti] =
          await Promise.all([
            prisma.gruppoAtleta.findMany({
              where: {
                gruppoId: slotSelezionato.gruppoId,
                annoAgonisticoId: annoCorrente.id,
              },
              select: { atletaId: true },
            }),
            // Atleta e' protetta da RLS (AD-4) - letta SOLO tramite
            // elencaAtlete(supabase), mai con un include Prisma su
            // GruppoAtleta.atleta (vedi Dev Notes Story 2.4).
            elencaAtlete(supabase),
            leggiPresenzePerSlotEData(supabase, slotId, data),
          ]);

        const atletaPerId = new Map(atlete.map((a) => [a.id, a]));
        const roster = gruppoAtleteRows
          .map((r) => atletaPerId.get(r.atletaId))
          .filter((a): a is (typeof atlete)[number] => a !== undefined)
          .sort((a, b) => a.nome.localeCompare(b.nome))
          .map(({ id, nome }) => ({ id, nome }));

        const presentiIniziali = presenzeEsistenti
          .filter((p) => p.presente)
          .map((p) => p.atletaId);

        sezioneRoster =
          roster.length === 0 ? (
            <p>Nessuna Atleta assegnata a questo Gruppo.</p>
          ) : (
            // key su Slot+data (review fix): i checkbox sono non controllati
            // (defaultChecked, PresenzeForm.tsx) - senza una key che cambia
            // insieme ai dati caricati, React potrebbe non rimontare il
            // componente e lo stato visualizzato potrebbe non risincronizzarsi
            // con presentiIniziali dopo un cambio di Slot/data o un refresh.
            <PresenzeForm
              key={`${slotId}-${data}`}
              slotId={slotId}
              data={data}
              roster={roster}
              presentiIniziali={presentiIniziali}
            />
          );
      }
    }

    body = (
      <>
        <section>
          <form method="get">
            <div>
              <label htmlFor="presenze-slot">Slot</label>
              <select id="presenze-slot" name="slotId" defaultValue={slotId}>
                <option value="">Seleziona...</option>
                {slotPropri.map((s) => (
                  <option key={s.id} value={s.id}>
                    {ETICHETTA_GIORNO[s.giorno]} {s.oraInizio}–{s.oraFine} -{" "}
                    {s.gruppo.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="presenze-data">Data</label>
              <input
                id="presenze-data"
                name="data"
                type="date"
                defaultValue={data}
              />
            </div>
            <button type="submit">Carica</button>
          </form>
        </section>
        <section>{sezioneRoster}</section>
      </>
    );
  }

  return (
    <main>
      <h1>Registrazione presenze</h1>
      {body}
    </main>
  );
}
