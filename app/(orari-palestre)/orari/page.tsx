import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { SlotTable } from "../SlotTable";

// Dati potenzialmente diversi ad ogni visita - stesso motivo di
// slot/page.tsx e mio-orario/page.tsx (Story 2.5/2.6).
export const dynamic = "force-dynamic";

export default async function OrariPage({
  searchParams,
}: {
  // searchParams e' una Promise in questa versione di Next.js (16.2.10),
  // verificato nella documentazione locale prima di scrivere questo codice
  // (Dev Notes Story 2.8) - non un oggetto sincrono come in versioni
  // precedenti di Next.js.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  // Un valore string[] (query duplicata, es. ?palestraId=a&palestraId=b) non
  // e' un caso valido per questi filtri a singola selezione - scartato come
  // se il filtro non fosse impostato.
  const palestraId = typeof params.palestraId === "string" ? params.palestraId : "";
  const gruppoId = typeof params.gruppoId === "string" ? params.gruppoId : "";

  // Sola lettura (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente
  // in una pagina GET - Dev Notes Story 1.6).
  const annoCorrente = await trovaAnnoAgonisticoCorrente();

  // Slot/Campo/Gruppo/Palestra non sono protetti da RLS (AD-9) - tutte
  // letture Prisma dirette, nessun client Supabase necessario (a differenza
  // di mio-orario/page.tsx, questa vista non e' scopata per utente).
  const [palestre, gruppi, slot] = await Promise.all([
    prisma.palestra.findMany({ orderBy: { nome: "asc" } }),
    annoCorrente
      ? prisma.gruppo.findMany({
          where: { annoAgonisticoId: annoCorrente.id },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
    annoCorrente
      ? prisma.slot.findMany({
          where: {
            gruppo: {
              annoAgonisticoId: annoCorrente.id,
              ...(gruppoId ? { id: gruppoId } : {}),
            },
            ...(palestraId ? { campo: { palestraId } } : {}),
          },
          include: { campo: { include: { palestra: true } }, gruppo: true },
          orderBy: [{ giorno: "asc" }, { oraInizio: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  return (
    <main>
      <h1>Orari</h1>

      <section>
        <form method="get">
          <div>
            <label htmlFor="filtro-palestra">Palestra</label>
            <select id="filtro-palestra" name="palestraId" defaultValue={palestraId}>
              <option value="">Tutte le Palestre</option>
              {palestre.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtro-gruppo">Gruppo</label>
            <select id="filtro-gruppo" name="gruppoId" defaultValue={gruppoId}>
              <option value="">Tutti i Gruppi</option>
              {gruppi.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">Filtra</button>
        </form>
      </section>

      <section>
        <h2>Elenco Slot</h2>
        <SlotTable slot={slot} messaggioVuoto="Nessuno Slot trovato." />
      </section>
    </main>
  );
}
