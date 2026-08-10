import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { parseRuoli } from "@/lib/ruoli";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { AiutoContestuale } from "@/app/AiutoContestuale";
import { NuovaPalestraForm } from "./NuovaPalestraForm";
import { PalestraRow } from "./PalestraRow";
import styles from "./palestre.module.css";

// Dati mutabili in tempo reale (creazione/modifica Palestra e Campo tramite
// Server Action sulla stessa pagina) - stesso motivo di /admin (Story 1.2).
export const dynamic = "force-dynamic";

export default async function PalestrePage() {
  // Story 17.1: solo per risolvere il contenuto dell'aiuto contestuale
  // scoped per Ruolo - la pagina resta comunque Admin/Dirigente-only via
  // route-guard.ts, invariato. Review fix (Blind Hunter): prima di questa
  // storia /palestre non chiamava mai Supabase Auth - avvolto in un
  // try/catch fail-soft (mirror di il-mio-profilo/page.tsx, SezioneFoto)
  // cosi' un errore di sessione disabilita solo l'icona "?" (nessun
  // contenuto guida) invece di rompere l'intera pagina di gestione per una
  // funzione puramente cosmetica.
  let ruoli: ReturnType<typeof parseRuoli> = [];
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      console.error(error);
    }
    ruoli = parseRuoli(user?.app_metadata?.ruoli);
  } catch (err) {
    console.error(err);
  }

  // Palestra/Campo non sono protette da RLS (AD-9): gestibili via Prisma
  // diretto, come Utente in /admin (Story 1.2). Scala ridotta (poche
  // palestre/campi per una polisportiva) - nessuna paginazione necessaria.
  const palestre = await prisma.palestra.findMany({
    include: { campi: { orderBy: { nome: "asc" } } },
    orderBy: { nome: "asc" },
  });

  return (
    <main>
      <div className={styles.intestazionePagina}>
        <h1>Palestre</h1>
        <AiutoContestuale contenuto={contenutoPerRotta("/palestre", ruoli)} />
      </div>

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
