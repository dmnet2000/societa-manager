import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaNotifiche } from "@/lib/db-rls/notifica";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import styles from "./notifiche.module.css";

// Dati potenzialmente diversi ad ogni visita (nuovi caricamenti Certificato,
// Story 4.1) - stesso motivo di /presenze, /storico-presenze.
export const dynamic = "force-dynamic";

// Nessun controllo di Ruolo qui: la route-guard (lib/auth/route-guard.ts,
// prefix "/notifiche") e' gia' il cancello, stesso pattern di ogni altra
// pagina di lista di questa codebase.
export default async function NotifichePage() {
  // Story 17.2 (review fix): ruoli e supabase non dipendono l'uno
  // dall'altro - eseguiti in Promise.all, stesso principio gia' stabilito
  // altrove nel progetto.
  const [ruoli, supabase] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    createClient(),
  ]);

  // Due letture RLS-safe + join applicativo in memoria (stesso pattern di
  // storico-presenze/page.tsx) - mai un `include` Prisma diretto su
  // "notifiche"/"atlete" (entrambe protette da RLS, AD-4/AD-9).
  const [notifiche, atlete] = await Promise.all([
    elencaNotifiche(supabase),
    elencaAtlete(supabase),
  ]);

  const atletaPerId = new Map(atlete.map((a) => [a.id, a]));

  const righe = notifiche
    .map((n) => ({ notifica: n, atleta: atletaPerId.get(n.atletaId) }))
    // Un'Atleta non risolvibile (RLS-filtrata anche su "atlete", caso
    // limite) viene scartata silenziosamente, non mostrata come errore -
    // stesso pattern difensivo di StoricoTable (storico-presenze/page.tsx).
    .filter(
      (r): r is { notifica: (typeof notifiche)[number]; atleta: NonNullable<(typeof r)["atleta"]> } =>
        r.atleta !== undefined
    );

  return (
    <main>
      <TitoloPagina titolo="Notifiche" contenuto={contenutoPerRotta("/notifiche", ruoli)} />
      {righe.length === 0 ? (
        <p className={styles.messaggioVuoto}>Nessuna notifica.</p>
      ) : (
        <ul className={styles.lista}>
          {righe.map(({ notifica, atleta }) => (
            <li key={notifica.id} className={styles.riga}>
              {/* Story 9.18 (AC #3): testo distinto per tipo - default
                  CERTIFICATO_CARICATO invariato (Story 4.2). Review fix:
                  nessuna attribuzione di Ruolo nel testo - creaEAssegnaAtleta
                  e' chiamabile anche da ADMIN/DIRIGENTE, non solo Allenatore. */}
              {notifica.tipo === "NUOVO_ATLETA"
                ? `Nuova Atleta inserita: ${atleta.nome}`
                : `Nuovo certificato caricato per ${atleta.nome}`}
              , il {new Date(notifica.createdAt).toLocaleString("it-IT")}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
