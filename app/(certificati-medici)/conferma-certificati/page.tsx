import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaCertificati } from "@/lib/db-rls/certificato-medico";
import { ConfermaCertificatoRow } from "./ConfermaCertificatoRow";

// Dati mutabili ad ogni visita (conferma tramite Server Action sulla stessa
// pagina) - stesso motivo di /presenze, /certificato-medico.
export const dynamic = "force-dynamic";

// Nessun controllo di Ruolo qui: la route-guard (lib/auth/route-guard.ts,
// prefix "/conferma-certificati") e' gia' il cancello, stesso pattern di
// ogni altra pagina di lista di questa codebase.
export default async function ConfermaCertificatiPage() {
  const supabase = await createClient();

  // Story 4.4: un'unica lettura di tutti i Certificati (elencaCertificati,
  // evita N+1) + un join applicativo in memoria per atletaId - stesso
  // pattern gia' usato in notifiche/page.tsx e storico-presenze/page.tsx,
  // mai un `include` Prisma diretto su tabelle RLS-protette (AD-4).
  const [atlete, certificati] = await Promise.all([
    elencaAtlete(supabase),
    elencaCertificati(supabase),
  ]);

  const certificatoPerAtleta = new Map(
    certificati.map((c) => [c.atletaId as string, c])
  );

  const righe = atlete.map((atleta) => ({
    atleta,
    certificato: certificatoPerAtleta.get(atleta.id),
  }));

  // AC #5: nessun rumore per cio' che e' gia' a posto - un'Atleta senza
  // alcuna riga in certificati_medici richiede conferma tanto quanto una
  // con stato IN_ATTESA (nessun Certificato mai verificato in entrambi i
  // casi).
  const daConfermare = righe.filter(
    (r) => !r.certificato || r.certificato.stato === "IN_ATTESA"
  );
  const confermati = righe.filter(
    (r) => r.certificato && r.certificato.stato === "CONFERMATO"
  );

  return (
    <main>
      <h1>Conferma Certificati Medici</h1>

      <section>
        <h2>Da confermare ({daConfermare.length})</h2>
        {daConfermare.length === 0 ? (
          <p>Nessun Certificato in attesa di conferma.</p>
        ) : (
          <ul>
            {daConfermare.map(({ atleta, certificato }) => (
              <ConfermaCertificatoRow
                key={atleta.id}
                atleta={atleta}
                filePath={(certificato?.filePath as string | undefined) ?? null}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Confermati ({confermati.length})</h2>
        {confermati.length === 0 ? (
          <p>Nessun Certificato ancora confermato.</p>
        ) : (
          <ul>
            {confermati.map(({ atleta, certificato }) => {
              const dataFineValidita = certificato?.dataFineValidita as
                | string
                | undefined;
              return (
                <li key={atleta.id}>
                  {atleta.nome}
                  {dataFineValidita
                    ? ` — valido fino al ${new Date(dataFineValidita).toLocaleDateString("it-IT")}`
                    : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
