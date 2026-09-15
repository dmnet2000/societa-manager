import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/auth-admin/client";
import { elencaAtletePerIds } from "@/lib/db-rls/atleta";
import { calcolaEmailConfermataPerAuthId } from "@/lib/auth-admin/email-confermata";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovoUtenteForm } from "./NuovoUtenteForm";
import { ElencoUtenti } from "./ElencoUtenti";
import styles from "./admin.module.css";

// Pagina di gestione utenti con dati mutabili in tempo reale (creazione,
// disattivazione, riassegnazione Ruoli tramite Server Action sulla stessa
// pagina) - va sempre renderizzata per-richiesta, mai come snapshot statico
// generato al build.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Story 17.2 (review fix): risolviRuoliPerAiutoContestuale() e la lettura
  // Utenti non dipendono l'una dall'altra - eseguite in Promise.all, stesso
  // principio gia' stabilito altrove nel progetto (es. mio-orario/page.tsx),
  // invece di un await sequenziale che aggiungerebbe un giro di rete in piu'
  // solo per l'icona "?".
  const [ruoliAiuto, utenti, listaUtentiAuth] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    // Utente/UtenteRuolo non sono protetti da RLS (AD-9): gestibili via
    // Prisma diretto, come in Story 1.1. Story 1.10: genitoriAtlete incluso
    // qui SOLO con select atletaId (mai un include diretto su Atleta, che e'
    // protetta da RLS, AD-9) - i nomi vengono risolti separatamente sotto via
    // elencaAtletePerIds (service-role).
    prisma.utente.findMany({
      include: {
        ruoli: true,
        genitoriAtlete: { select: { atletaId: true } },
      },
      orderBy: { email: "asc" },
    }),
    // Story 9.38: una sola chiamata listUsers() per l'intera lista (non
    // getUserById per riga) - evita N chiamate all'Admin API ad ogni
    // caricamento di questa pagina. Nessuna paginazione gestita
    // esplicitamente (limite accettato, vedi Design Notes della story - una
    // lista di un club anche numeroso resta ben dentro un singolo giro).
    createAdminClient().auth.admin.listUsers(),
  ]);

  // Review fix: se listUsers() fallisce, listaUtentiAuth.data e' undefined e
  // la mappa sotto resta vuota - OGNI Utente finirebbe silenziosamente
  // trattato come "gia' confermato" (fail-safe `?? true` piu' sotto) senza
  // alcuna traccia. Log esplicito, cosi' il fallimento resta almeno visibile
  // nei log server invece di sparire senza lasciare traccia.
  if (listaUtentiAuth.error) {
    console.error(
      "[AdminPage] listUsers() fallita - emailConfermata non calcolabile per nessun Utente in questo caricamento",
      listaUtentiAuth.error
    );
  }

  // Mappa supabaseAuthId -> se l'email e' stata confermata (usata per
  // decidere se mostrare il form "Correggi email" per ciascun Utente).
  // Estratta in una funzione pura testata separatamente (Story 9.38 review
  // fix): lib/auth-admin/email-confermata.ts.
  const emailConfermataPerAuthId = calcolaEmailConfermataPerAuthId(
    listaUtentiAuth.data?.users ?? []
  );

  // Story 1.10: una sola chiamata a elencaAtletePerIds per l'intero elenco
  // (non una per Utente) - stesso principio gia' seguito per listUsers()
  // sopra (Story 9.38), evita N letture separate contro "atlete" ad ogni
  // caricamento di questa pagina. Dipende da `utenti` (serve l'elenco di id),
  // quindi eseguita dopo il Promise.all, non dentro.
  const idsAtleteCollegate = [
    ...new Set(utenti.flatMap((u) => u.genitoriAtlete.map((g) => g.atletaId))),
  ];
  // Review fix (code review): a differenza di listUsers() sopra, questa
  // chiamata non era gestita in modo fail-soft - un errore transitorio
  // Supabase/rete avrebbe mandato in errore l'intera pagina Admin invece di
  // degradare (nessuna Atleta collegata mostrata quel giro, mai un crash).
  let atleteCollegate: Awaited<ReturnType<typeof elencaAtletePerIds>> = [];
  try {
    atleteCollegate = await elencaAtletePerIds(
      createAdminClient(),
      idsAtleteCollegate
    );
  } catch (err) {
    console.error(
      "[AdminPage] elencaAtletePerIds fallita - nessuna Atleta collegata mostrata in questo caricamento",
      err
    );
  }

  // Story 9.40: shape-ato qui (Server Component) - ElencoUtenti (Client
  // Component) riceve l'array gia' pronto, stesso schema gia' stabilito da
  // conferma-certificati/page.tsx + ListaConfermati.tsx per lo stesso
  // identico bisogno (dati risolti server-side, interattivita' di
  // ordinamento client-side).
  const utentiShapeati = utenti.map((utente) => ({
    id: utente.id,
    email: utente.email,
    attivo: utente.attivo,
    ruoli: utente.ruoli.map((r) => r.ruolo),
    // Fail-safe: se l'Utente Auth non e' stato trovato in listUsers() per
    // qualche motivo, tratta come confermato - non mostrare il form di
    // correzione invece di rischiare di mostrarlo per un Utente in realta'
    // gia' confermato.
    emailConfermata: emailConfermataPerAuthId.get(utente.supabaseAuthId) ?? true,
    // Story 1.10: Atlete gia' collegate a questo Utente (per dare contesto
    // prima di aggiungerne un'altra) - UtenteRow mostra questa colonna SOLO
    // per un Utente con Ruolo GENITORE (stesso principio gia' seguito per il
    // form "Correggi email" sopra). Un atletaId senza corrispondenza in
    // atleteCollegate (Atleta cancellata nel frattempo, o lookup fallito
    // sopra) viene scartato invece di mostrare una riga con nome mancante.
    // Review fix (code review): ricostruito filtrando l'array
    // atleteCollegate - GIA' ordinato per nome da elencaAtletePerIds - invece
    // di iterare utente.genitoriAtlete (ordine di inserimento DB), che
    // vanificava l'ordinamento alfabetico.
    atletiCollegati: (() => {
      const idsPerQuestoUtente = new Set(
        utente.genitoriAtlete.map((g) => g.atletaId)
      );
      return atleteCollegate.filter((a) => idsPerQuestoUtente.has(a.id));
    })(),
  }));

  return (
    <main>
      <TitoloPagina
        titolo="Amministrazione"
        contenuto={contenutoPerRotta("/app/admin", ruoliAiuto)}
      />

      <section className={styles.sezione}>
        <h2>Nuovo utente</h2>
        <NuovoUtenteForm />
      </section>

      <section className={styles.sezione}>
        <h2>Utenti</h2>
        <ElencoUtenti utenti={utentiShapeati} />
      </section>
    </main>
  );
}
