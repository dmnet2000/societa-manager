import { prisma } from "@/lib/prisma";
import { NuovoAllenatoreForm } from "./NuovoAllenatoreForm";
import { AllenatoreRow } from "./AllenatoreRow";
import styles from "./precaricamento-allenatori.module.css";

// Story 9.9: la pagina passa da Client Component (solo form) a Server
// Component (form + elenco) - stesso schema di /palestre. Dati mutabili in
// tempo reale (precaricamento/modifica/cancellazione sulla stessa pagina),
// stesso motivo di /admin, /palestre.
export const dynamic = "force-dynamic";

export default async function PrecaricamentoAllenatoriPage() {
  // Allenatore non e' protetto da RLS (AD-9) - Prisma diretto, come
  // /palestre. Il guard-clause di cancellazione (AC #4) vive interamente
  // dentro cancellaAllenatore (where compound sulla deleteMany) - qui non
  // serve includere "gruppi".
  const allenatori = await prisma.allenatore.findMany({
    orderBy: [{ nome: "asc" }, { cognome: "asc" }],
  });

  return (
    <main>
      <h1>Precaricamento Allenatori</h1>

      <section className={styles.sezione}>
        <h2>Nuovo Allenatore</h2>
        <NuovoAllenatoreForm />
      </section>

      <section className={styles.sezione}>
        <h2>Elenco Allenatori</h2>
        <div className={styles.lista}>
          {allenatori.map((allenatore) => (
            <AllenatoreRow key={allenatore.id} allenatore={allenatore} />
          ))}
        </div>
      </section>
    </main>
  );
}
