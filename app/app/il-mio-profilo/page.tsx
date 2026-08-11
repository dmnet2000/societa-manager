import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  BUCKET_FOTO_ATLETA,
  BUCKET_FOTO_ALLENATORE,
  esisteFotoProfilo,
  generaUrlFirmatoFotoProfilo,
} from "@/lib/storage/foto-profilo";
import { parseRuoli } from "@/lib/ruoli";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { FotoProfiloForm } from "./FotoProfiloForm";
import styles from "./il-mio-profilo.module.css";

// Dati potenzialmente diversi ad ogni visita (foto appena caricata) - stesso
// motivo di /dati-fisici/storico-presenze.
export const dynamic = "force-dynamic";

async function SezioneFoto({
  supabase,
  bucket,
  entitaId,
  tipo,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  bucket: string;
  entitaId: string;
  tipo: "ATLETA" | "ALLENATORE";
}) {
  // Review fix (code review Story 9.12, Blind Hunter + Edge Case Hunter):
  // un errore transitorio di Storage non deve far crashare l'intera pagina
  // (incluso il form di upload stesso) - stesso principio del doppio
  // try/catch di app/(auth)/accedi/page.tsx (logo/nome settore, letture
  // indipendenti che non devono nascondersi a vicenda in caso di errore).
  let url: string | null = null;
  try {
    const info = await esisteFotoProfilo(supabase, bucket, entitaId);
    if (info.esiste) {
      url = await generaUrlFirmatoFotoProfilo(supabase, bucket, entitaId);
    }
  } catch (err) {
    console.error(err);
  }

  return (
    <>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- stesso pattern gia' accettato in accedi/page.tsx (URL firmato, non ottimizzabile da next/image)
        <img
          className={styles.fotoAttuale}
          src={url}
          alt="La tua foto profilo attuale"
          width={120}
          height={120}
        />
      )}
      <FotoProfiloForm tipo={tipo} />
    </>
  );
}

export default async function IlMioProfiloPage() {
  // Utente/Allenatore non sono protetti da RLS (AD-9) - il client Supabase
  // serve solo a identificare la sessione e a leggere/scrivere i bucket
  // privati (RLS-protetti), stesso principio di dati-fisici/page.tsx.
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error(error);
  }
  const ruoli = parseRuoli(user?.app_metadata?.ruoli);

  // Stesso identico pattern di risoluzione identita' gia' stabilito in
  // app/(dati-atleta)/dati-fisici/page.tsx (righe 86-114) - non reinventato.
  const [allenatore, atletaIds] = user
    ? await Promise.all([
        prisma.allenatore.findFirst({
          where: { utente: { supabaseAuthId: user.id } },
        }),
        prisma.genitoreAtleta
          .findMany({
            where: { utente: { supabaseAuthId: user.id }, autoAggancio: true },
            select: { atletaId: true },
            // Review fix (code review Story 9.12, Edge Case Hunter): stesso
            // ordinamento esplicito usato in app/il-mio-profilo/actions.ts -
            // senza un orderBy condiviso, questa query e quella dell'azione
            // (entrambe indipendenti) potrebbero risolvere una riga diversa
            // come "prima" in modo non deterministico se mai esistessero 2+
            // righe autoAggancio=true per lo stesso Utente.
            orderBy: { atletaId: "asc" },
          })
          .then((righe) => righe.map((riga) => riga.atletaId)),
      ])
    : [null, []];

  if (!allenatore && atletaIds.length === 0) {
    return (
      <main className="pagina-form">
        <div className="riquadro-form">
          <TitoloPagina
            titolo="Il mio profilo"
            contenuto={contenutoPerRotta("/app/il-mio-profilo", ruoli)}
          />
          <p className={styles.testo}>
            Il tuo account non è ancora collegato a un profilo Allenatore o
            Atleta. Contatta la segreteria.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="pagina-form">
      <div className="riquadro-form">
        <TitoloPagina
          titolo="Il mio profilo"
          contenuto={contenutoPerRotta("/app/il-mio-profilo", ruoli)}
        />
        {atletaIds.length > 0 && (
          <section className={styles.sezione}>
            <h2>La mia foto (Atleta)</h2>
            <SezioneFoto
              supabase={supabase}
              bucket={BUCKET_FOTO_ATLETA}
              entitaId={atletaIds[0]}
              tipo="ATLETA"
            />
          </section>
        )}
        {allenatore && (
          <section className={styles.sezione}>
            <h2>La mia foto (Allenatore)</h2>
            <SezioneFoto
              supabase={supabase}
              bucket={BUCKET_FOTO_ALLENATORE}
              entitaId={allenatore.id}
              tipo="ALLENATORE"
            />
          </section>
        )}
      </div>
    </main>
  );
}
