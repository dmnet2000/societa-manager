import type { StatoCertificato } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaCertificati } from "@/lib/db-rls/certificato-medico";
import { categorizzaStatoCertificato } from "@/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato";
import { ConfermaCertificatoRow } from "./ConfermaCertificatoRow";
import styles from "./conferma-certificati.module.css";

// Story 9.23: mappa stato -> classe badge. SENZA_CERTIFICATO non e'
// raggiungibile in pratica per la sezione "Confermati" (dataFineValidita e'
// sempre obbligatoria in confermaCertificato) ma gestito comunque in modo
// difensivo (nessun badge), coerente col tipo di ritorno della funzione.
const CLASSE_BADGE: Record<
  ReturnType<typeof categorizzaStatoCertificato>,
  string | null
> = {
  IN_REGOLA: styles.badgeInRegola,
  IN_SCADENZA: styles.badgeInScadenza,
  SCADUTO: styles.badgeScaduto,
  SENZA_CERTIFICATO: null,
};

const ETICHETTA_BADGE: Record<ReturnType<typeof categorizzaStatoCertificato>, string> = {
  IN_REGOLA: "In regola",
  IN_SCADENZA: "In scadenza",
  SCADUTO: "Scaduto",
  SENZA_CERTIFICATO: "",
};

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

  // Story 9.23 (review fix): calcolata dopo le letture, non prima - stesso
  // pattern di vista-dirigente/page.tsx. Evita che un fetch lento faccia
  // classificare i certificati contro un "oggi" stantio se la richiesta
  // attraversasse la mezzanotte locale.
  const oggi = new Date();

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

      <section className={styles.sezione}>
        <h2>Da confermare ({daConfermare.length})</h2>
        {daConfermare.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessun Certificato in attesa di conferma.</p>
        ) : (
          <ul className={styles.lista}>
            {daConfermare.map(({ atleta, certificato }) => (
              <ConfermaCertificatoRow
                key={atleta.id}
                atleta={atleta}
                filePath={(certificato?.filePath as string | undefined) ?? null}
                // Review fix: precompila con i dati gia' a sistema (es. un
                // Certificato gia' CONFERMATO in passato, tornato IN_ATTESA
                // per un ri-caricamento, AC #3) - senza questo, confermare
                // senza ridigitare i campi opzionali li azzererebbe
                // silenziosamente (confermaCertificato scrive sempre i
                // valori del form, mai un merge per-campo).
                dataInizioValidita={
                  (certificato?.dataInizioValidita as string | undefined)?.slice(
                    0,
                    10
                  ) ?? ""
                }
                dataFineValidita={
                  (certificato?.dataFineValidita as string | undefined)?.slice(
                    0,
                    10
                  ) ?? ""
                }
                mesiValidita={certificato?.mesiValidita as number | null | undefined}
                modulo={certificato?.modulo as string | null | undefined}
              />
            ))}
          </ul>
        )}
      </section>

      <section className={styles.sezione}>
        <h2>Confermati ({confermati.length})</h2>
        {confermati.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessun Certificato ancora confermato.</p>
        ) : (
          <ul className={styles.listaConfermati}>
            {confermati.map(({ atleta, certificato }) => {
              const dataFineValidita = certificato?.dataFineValidita as
                | string
                | undefined;
              const stato = categorizzaStatoCertificato(
                dataFineValidita ?? null,
                (certificato?.stato as StatoCertificato | null) ?? null,
                oggi
              );
              const classeBadge = CLASSE_BADGE[stato];
              if (stato === "SENZA_CERTIFICATO") {
                // Review fix (Story 9.23): non raggiungibile tramite il
                // percorso di scrittura attuale (confermaCertificato impone
                // dataFineValidita obbligatoria), ma dataFineValidita resta
                // nullable a livello di schema - un log distintivo segnala
                // l'anomalia invece di renderizzare silenziosamente senza
                // badge, stesso pattern gia' usato in vista-dirigente/page.tsx.
                console.warn(
                  `Story 9.23: Certificato CONFERMATO senza dataFineValidita valida per Atleta ${atleta.id}.`
                );
              }
              return (
                <li key={atleta.id} className={styles.rigaConfermata}>
                  <span className={styles.nomeConData}>
                    {atleta.nome}
                    {dataFineValidita
                      ? ` — valido fino al ${new Date(dataFineValidita).toLocaleDateString("it-IT")}`
                      : null}
                  </span>
                  {classeBadge && (
                    <span className={classeBadge}>{ETICHETTA_BADGE[stato]}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
