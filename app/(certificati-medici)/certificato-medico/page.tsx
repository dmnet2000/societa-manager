import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { trovaCertificatoPerAtleta } from "@/lib/db-rls/certificato-medico";
import { CaricaCertificatoForm } from "./CaricaCertificatoForm";
import { ottieniUrlCertificato } from "./actions";

// Dati mutabili ad ogni visita (upload tramite Server Action sulla stessa
// pagina) - stesso motivo di /presenze, /gruppi.
export const dynamic = "force-dynamic";

export default async function CertificatoMedicoPage({
  searchParams,
}: {
  // searchParams e' una Promise in questa versione di Next.js (16.2.10) -
  // Dev Notes Story 2.8, gia' verificato, non da ri-verificare qui.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const atletaIdSelezionato =
    typeof params.atletaId === "string" ? params.atletaId : "";

  // Utente/GenitoreAtleta non sono protetti da RLS (AD-9) - il client
  // Supabase serve SOLO a identificare la sessione e a leggere/scrivere
  // "certificati_medici" (RLS-protetta, AD-4) e il bucket Storage
  // "certificati-medici" (AD-6), stesso principio di presenze/page.tsx.
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Un errore qui va distinto da "nessuna sessione" nei log - stessa policy
  // gia' stabilita in requireRuolo/presenze (Story 1.3/3.1).
  if (error) {
    console.error(error);
  }

  // A differenza di storico-presenze (Story 3.2), qui NON si filtra per
  // autoAggancio: sia l'aggancio a se stessa sia quello Genitore<->figlia
  // danno lo stesso diritto di gestione del Certificato (AC #1/#3, vedi
  // Prerequisito architetturale della storia).
  const atletaIds = user
    ? await prisma.genitoreAtleta
        .findMany({
          where: { utente: { supabaseAuthId: user.id } },
          select: { atletaId: true },
        })
        .then((righe) => righe.map((riga) => riga.atletaId))
    : [];

  if (atletaIds.length === 0) {
    return (
      <main>
        <h1>Certificato medico</h1>
        <p>
          Il tuo account non è ancora collegato a nessuna Atleta. Contatta la
          segreteria.
        </p>
      </main>
    );
  }

  // Atleta e' protetta da RLS (AD-4) - letta SOLO tramite elencaAtlete(supabase),
  // mai con un include Prisma su GenitoreAtleta.atleta (Dev Notes Story 2.4).
  const atlete = await elencaAtlete(supabase);
  const atletaPerId = new Map(atlete.map((a) => [a.id, a]));
  const proprieAtlete = atletaIds
    .map((id) => atletaPerId.get(id))
    .filter((a): a is (typeof atlete)[number] => a !== undefined)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  // AC #3: con una sola Atleta risolta (self, o Genitore con una sola
  // figlia) nessun selettore e' necessario - risoluzione automatica. Con
  // piu' Atlete, la scelta deve essere esplicita (searchParams), mai
  // implicita.
  const atletaIdCorrente =
    proprieAtlete.length === 1
      ? proprieAtlete[0].id
      : proprieAtlete.some((a) => a.id === atletaIdSelezionato)
        ? atletaIdSelezionato
        : "";

  let sezioneSelettore: ReactNode = null;
  if (proprieAtlete.length > 1) {
    sezioneSelettore = (
      <form method="get">
        <label htmlFor="certificato-atleta">Atleta</label>
        <select
          id="certificato-atleta"
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
    );
  }

  let sezioneGestione: ReactNode = null;
  if (atletaIdCorrente) {
    const certificato = await trovaCertificatoPerAtleta(
      supabase,
      atletaIdCorrente
    );
    const filePath = certificato?.filePath as string | undefined;

    sezioneGestione = (
      <section>
        {filePath ? (
          <form action={ottieniUrlCertificato.bind(null, atletaIdCorrente)}>
            <button type="submit">Visualizza certificato attuale</button>
          </form>
        ) : (
          <p>Nessun Certificato ancora caricato.</p>
        )}
        <CaricaCertificatoForm atletaId={atletaIdCorrente} />
      </section>
    );
  } else if (proprieAtlete.length > 1) {
    sezioneGestione = <p>Seleziona un&apos;Atleta per gestire il suo Certificato.</p>;
  }

  return (
    <main>
      <h1>Certificato medico</h1>
      {sezioneSelettore}
      {sezioneGestione}
    </main>
  );
}
