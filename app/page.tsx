import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { parseRuoli } from "@/lib/ruoli";
import { urlPubblicoImmagineSponsor } from "@/lib/storage/sponsor";
import { SponsorCarosello } from "./SponsorCarosello";
import styles from "./home.module.css";

// Dati potenzialmente diversi ad ogni visita (Banner sponsor attivi) -
// stesso motivo di /sponsor, /notifiche.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruoli = parseRuoli(user?.app_metadata?.ruoli);

  // Story 16.3 (AC #1/#5): solo Atleta/Genitore vedono il carosello Banner -
  // per ogni altro Ruolo nessuna query, nessun cambiamento alla homepage.
  const mostraCarosello = ruoli.includes("ATLETA") || ruoli.includes("GENITORE");

  const bannerAttivi = mostraCarosello
    ? await prisma.sponsor.findMany({
        where: { tipo: "BANNER", attiva: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <main>
      <h1>Area applicativa</h1>
      <div className={styles.card}>
        <p className={styles.saluto}>Bentornata/o, {user?.email}.</p>
        <p className={styles.testo}>Ruoli: {ruoli.join(", ") || "nessuno"}</p>
      </div>
      {/* AC #4: nessuna sezione se non ci sono Banner attivi. */}
      {bannerAttivi.length > 0 && (
        <SponsorCarosello
          banner={bannerAttivi.map((sponsor) => ({
            id: sponsor.id,
            nome: sponsor.nome,
            linkEsterno: sponsor.linkEsterno,
            // Review fix Story 16.2 (Blind Hunter): cache-busting via
            // updatedAt, stesso principio di SponsorVetrinaCard.tsx.
            immagineUrl: `${urlPubblicoImmagineSponsor(supabase, sponsor.id)}?v=${encodeURIComponent(sponsor.updatedAt.toISOString())}`,
          }))}
        />
      )}
    </main>
  );
}
