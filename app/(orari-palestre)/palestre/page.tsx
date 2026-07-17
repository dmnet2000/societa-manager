import { prisma } from "@/lib/prisma";
import { NuovaPalestraForm } from "./NuovaPalestraForm";
import { PalestraRow } from "./PalestraRow";

// Dati mutabili in tempo reale (creazione/modifica Palestra e Campo tramite
// Server Action sulla stessa pagina) - stesso motivo di /admin (Story 1.2).
export const dynamic = "force-dynamic";

export default async function PalestrePage() {
  // Palestra/Campo non sono protette da RLS (AD-9): gestibili via Prisma
  // diretto, come Utente in /admin (Story 1.2). Scala ridotta (poche
  // palestre/campi per una polisportiva) - nessuna paginazione necessaria.
  const palestre = await prisma.palestra.findMany({
    include: { campi: { orderBy: { nome: "asc" } } },
    orderBy: { nome: "asc" },
  });

  return (
    <main>
      <h1>Palestre</h1>

      <section>
        <h2>Nuova Palestra</h2>
        <NuovaPalestraForm />
      </section>

      <section>
        <h2>Elenco Palestre</h2>
        {palestre.map((palestra) => (
          <PalestraRow key={palestra.id} palestra={palestra} />
        ))}
      </section>
    </main>
  );
}
