import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { urlPubblicoImmagineSponsor } from "@/lib/storage/sponsor";
import { NuovoSponsorForm } from "./NuovoSponsorForm";
import { SponsorRow } from "./SponsorRow";
import styles from "./sponsor.module.css";

// Dati mutabili in tempo reale (creazione/modifica/toggle Sponsor tramite
// Server Action sulla stessa pagina) - stesso motivo di /palestre (Story 2.1).
export const dynamic = "force-dynamic";

export default async function SponsorPage() {
  const supabase = await createClient();

  // Sponsor non e' protetto da RLS (AD-9): gestibile via Prisma diretto,
  // come Palestra. AC #3/#4: qui (gestione) attivi e disattivati sono
  // entrambi visibili - a differenza della vetrina pubblica (Story 16.2),
  // che mostrera' solo gli attivi.
  const sponsorList = await prisma.sponsor.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main>
      <h1>Sponsor</h1>

      <section className={styles.sezione}>
        <h2>Nuovo Sponsor</h2>
        <NuovoSponsorForm />
      </section>

      <section className={styles.sezione}>
        <h2>Elenco Sponsor</h2>
        {sponsorList.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessuno Sponsor ancora creato.</p>
        ) : (
          <div className={styles.lista}>
            {sponsorList.map((sponsor) => (
              <SponsorRow
                key={sponsor.id}
                sponsor={{
                  id: sponsor.id,
                  nome: sponsor.nome,
                  tipo: sponsor.tipo,
                  descrizione: sponsor.descrizione,
                  linkEsterno: sponsor.linkEsterno,
                  attiva: sponsor.attiva,
                  updatedAt: sponsor.updatedAt.toISOString(),
                  immagineUrl: urlPubblicoImmagineSponsor(supabase, sponsor.id),
                }}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
