import type { Ruolo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovoPrecaricamentoRuoloForm } from "./NuovoPrecaricamentoRuoloForm";
import { PrecaricamentoRuoloRow } from "./PrecaricamentoRuoloRow";
import styles from "./precaricamento-ruoli.module.css";

// Story 9.41: mirror strutturale di /app/precaricamento-allenatori
// (Server Component, dati mutabili in tempo reale sulla stessa pagina).
export const dynamic = "force-dynamic";

type GruppoPrecaricamentoRuolo = {
  email: string;
  ruoli: Ruolo[];
  utenteId: string | null;
};

export default async function PrecaricamentoRuoliPage() {
  const [ruoliPagina, righe] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    prisma.precaricamentoRuolo.findMany({
      orderBy: [{ email: "asc" }, { ruolo: "asc" }],
    }),
  ]);

  // Raggruppa per email: ogni riga e' un (email, ruolo) - la UI mostra una
  // "voce" per email con l'elenco dei suoi Ruoli. Per costruzione (vedi
  // Design Notes dello spec) tutte le righe di un'email condividono lo
  // stesso utenteId o sono tutte null: qui si usa un Utente "qualunque tra
  // le righe" (il primo trovato, es. reduce below preferisce il primo
  // valorizzato se presente).
  const gruppi: GruppoPrecaricamentoRuolo[] = [];
  const indicePerEmail = new Map<string, number>();
  for (const riga of righe) {
    const indiceEsistente = indicePerEmail.get(riga.email);
    if (indiceEsistente === undefined) {
      indicePerEmail.set(riga.email, gruppi.length);
      gruppi.push({ email: riga.email, ruoli: [riga.ruolo], utenteId: riga.utenteId });
    } else {
      const gruppo = gruppi[indiceEsistente];
      gruppo.ruoli.push(riga.ruolo);
      if (!gruppo.utenteId && riga.utenteId) {
        gruppo.utenteId = riga.utenteId;
      }
    }
  }

  return (
    <main>
      <TitoloPagina
        titolo="Precaricamento Segreteria/Dirigente"
        contenuto={contenutoPerRotta("/app/precaricamento-ruoli", ruoliPagina)}
      />

      <section className={styles.sezione}>
        <h2>Nuovo precaricamento</h2>
        <NuovoPrecaricamentoRuoloForm />
      </section>

      <section className={styles.sezione}>
        <h2>Elenco precaricamenti</h2>
        {gruppi.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessuna email precaricata.</p>
        ) : (
          <div className={styles.tabellaScroll}>
            <table className={styles.tabella}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Ruoli</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {gruppi.map((gruppo) => (
                  <PrecaricamentoRuoloRow key={gruppo.email} voce={gruppo} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
