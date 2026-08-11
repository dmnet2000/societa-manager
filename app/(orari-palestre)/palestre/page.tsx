import { prisma } from "@/lib/prisma";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovaPalestraForm } from "./NuovaPalestraForm";
import { PalestraRow } from "./PalestraRow";
import styles from "./palestre.module.css";

// Dati mutabili in tempo reale (creazione/modifica Palestra e Campo tramite
// Server Action sulla stessa pagina) - stesso motivo di /admin (Story 1.2).
export const dynamic = "force-dynamic";

export default async function PalestrePage() {
  // Story 17.1/17.2: solo per risolvere il contenuto dell'aiuto contestuale
  // scoped per Ruolo - la pagina resta comunque Admin/Dirigente-only via
  // route-guard.ts, invariato. Fail-soft (Story 17.2, helper estratto
  // dal fix originale di Story 17.1 review).
  const ruoli = await risolviRuoliPerAiutoContestuale();

  // Palestra/Campo non sono protette da RLS (AD-9): gestibili via Prisma
  // diretto, come Utente in /admin (Story 1.2). Scala ridotta (poche
  // palestre/campi per una polisportiva) - nessuna paginazione necessaria.
  const palestre = await prisma.palestra.findMany({
    include: { campi: { orderBy: { nome: "asc" } } },
    orderBy: { nome: "asc" },
  });

  return (
    <main>
      <TitoloPagina titolo="Palestre" contenuto={contenutoPerRotta("/palestre", ruoli)} />

      <section className={styles.sezione}>
        <h2>Nuova Palestra</h2>
        <NuovaPalestraForm />
      </section>

      <section className={styles.sezione}>
        <h2>Elenco Palestre</h2>
        <div className={styles.lista}>
          {palestre.map((palestra) => (
            <PalestraRow key={palestra.id} palestra={palestra} />
          ))}
        </div>
      </section>
    </main>
  );
}
