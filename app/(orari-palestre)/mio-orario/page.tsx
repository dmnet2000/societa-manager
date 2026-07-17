import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { ETICHETTA_GIORNO } from "@/lib/giorno-settimana";

// Dati potenzialmente diversi ad ogni visita (nuovi Slot caricati da un
// Dirigente) - stesso motivo di slot/page.tsx (Story 2.5).
export const dynamic = "force-dynamic";

export default async function MioOrarioPage() {
  // Utente/Allenatore/Gruppo/GruppoAllenatore/Slot non sono protetti da RLS
  // (AD-9) - il client Supabase serve SOLO a identificare la sessione (chi
  // e' l'utente loggato), non per bypassare RLS come in Story 2.4. Tutte le
  // query dati restano Prisma diretto.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const utente = user
    ? await prisma.utente.findUnique({ where: { supabaseAuthId: user.id } })
    : null;
  const allenatore = utente
    ? await prisma.allenatore.findUnique({ where: { utenteId: utente.id } })
    : null;

  // AC #2: l'Utente ha il Ruolo ALLENATORE (il route-guard lo ammette) ma
  // non e' ancora agganciato a un profilo Allenatore (Codice Fiscale non
  // fornito o non corrispondente in fase di registrazione, Story 1.1/1.4) -
  // messaggio chiaro, non un redirect ne' una pagina vuota.
  if (!allenatore) {
    return (
      <main>
        <h1>Il mio orario</h1>
        <p>
          Il tuo account non è ancora collegato a un profilo Allenatore.
          Contatta la segreteria.
        </p>
      </main>
    );
  }

  // Sola lettura (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente
  // in una pagina GET - Dev Notes Story 1.6). Se l'Anno Agonistico corrente
  // non esiste ancora, nessuno Slot puo' comunque esistere per definizione
  // (stesso ragionamento di gruppi/page.tsx e slot/page.tsx).
  const annoCorrente = await trovaAnnoAgonisticoCorrente();

  const slot = annoCorrente
    ? await prisma.slot.findMany({
        where: {
          gruppo: {
            annoAgonisticoId: annoCorrente.id,
            allenatori: { some: { allenatoreId: allenatore.id } },
          },
        },
        include: { campo: { include: { palestra: true } }, gruppo: true },
        orderBy: [{ giorno: "asc" }, { oraInizio: "asc" }],
      })
    : [];

  return (
    <main>
      <h1>Il mio orario</h1>
      {slot.length === 0 ? (
        <p>Nessuno Slot ancora assegnato ai tuoi Gruppi.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Giorno</th>
              <th>Orario</th>
              <th>Palestra / Campo</th>
              <th>Gruppo</th>
            </tr>
          </thead>
          <tbody>
            {slot.map((s) => (
              <tr key={s.id}>
                <td>{ETICHETTA_GIORNO[s.giorno]}</td>
                <td>
                  {s.oraInizio}–{s.oraFine}
                </td>
                <td>
                  {s.campo.palestra.nome} - {s.campo.nome}
                </td>
                <td>{s.gruppo.nome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
