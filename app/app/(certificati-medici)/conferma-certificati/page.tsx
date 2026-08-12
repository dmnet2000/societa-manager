import type { StatoCertificato } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaCertificati } from "@/lib/db-rls/certificato-medico";
import { categorizzaStatoCertificato } from "@/app/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato";
import { parseRuoli } from "@/lib/ruoli";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { ConfermaCertificatoRow } from "./ConfermaCertificatoRow";
import { ListaConfermati } from "./ListaConfermati";
import styles from "./conferma-certificati.module.css";

// Dati mutabili ad ogni visita (conferma tramite Server Action sulla stessa
// pagina) - stesso motivo di /presenze, /certificato-medico.
export const dynamic = "force-dynamic";

// Nessun controllo di Ruolo qui: la route-guard (lib/auth/route-guard.ts,
// prefix "/conferma-certificati") e' gia' il cancello, stesso pattern di
// ogni altra pagina di lista di questa codebase.
export default async function ConfermaCertificatiPage() {
  const supabase = await createClient();

  // Story 9.27 (AC #2): questa pagina non risolveva finora alcun Ruolo del
  // chiamante (nessuna chiamata a getUser()/parseRuoli esisteva) - serve
  // per il gating UI del bottone "Modifica" sulla sezione "Confermati",
  // stesso identico pattern di app/(partite-campionati)/partite/page.tsx
  // righe 30-40.
  const {
    data: { user },
    error: erroreUtente,
  } = await supabase.auth.getUser();
  if (erroreUtente) {
    console.error(erroreUtente);
  }
  const ruoli = parseRuoli(user?.app_metadata?.ruoli);
  const puoModificareCertificatiConfermati =
    ruoli.includes("ADMIN") || ruoli.includes("DIRIGENTE");

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
      <TitoloPagina
        titolo="Conferma Certificati Medici"
        contenuto={contenutoPerRotta("/app/conferma-certificati", ruoli)}
      />

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
          <ListaConfermati
            puoModificare={puoModificareCertificatiConfermati}
            righe={confermati.map(({ atleta, certificato }) => {
              const dataFineValidita =
                (certificato?.dataFineValidita as string | undefined) ?? null;
              const stato = categorizzaStatoCertificato(
                dataFineValidita,
                (certificato?.stato as StatoCertificato | null) ?? null,
                oggi
              );
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
              // Review fix (Story 9.25): formattata qui, non nel Client
              // Component - un Server Component non idrata mai (nessun
              // rischio di mismatch), ma ListaConfermati si', e la stessa
              // chiamata new Date(...).toLocaleDateString() rieseguita in
              // hydration userebbe il fuso orario del browser invece di
              // quello del server, con un possibile disallineamento intorno
              // alla mezzanotte locale (stesso principio gia' corretto con
              // timeZone: "UTC" in raggruppa-per-settimana.ts, Story 10.3).
              const dataFineValiditaFormattata = dataFineValidita
                ? new Date(dataFineValidita).toLocaleDateString("it-IT", {
                    timeZone: "UTC",
                  })
                : null;
              // Story 9.27 (Task 3): elencaCertificati seleziona gia' tutte
              // queste colonne (lib/db-rls/certificato-medico.ts riga 54) -
              // prima scartate qui, ora necessarie per il form di modifica
              // di CertificatoConfermatoRow. Stesso slicing/casting gia'
              // usato sopra per daConfermare.
              return {
                atletaId: atleta.id,
                nome: atleta.nome,
                dataFineValiditaFormattata,
                stato,
                dataInizioValidita:
                  (certificato?.dataInizioValidita as string | undefined)?.slice(
                    0,
                    10
                  ) ?? "",
                dataFineValidita:
                  (certificato?.dataFineValidita as string | undefined)?.slice(
                    0,
                    10
                  ) ?? "",
                mesiValidita: certificato?.mesiValidita as number | null | undefined,
                modulo: certificato?.modulo as string | null | undefined,
                filePath: (certificato?.filePath as string | undefined) ?? null,
              };
            })}
          />
        )}
      </section>
    </main>
  );
}
