import { prisma } from "@/lib/prisma";
import { PROTECTED_ROUTES } from "@/lib/auth/route-guard";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { PermessiAccessoForm } from "./PermessiAccessoForm";

// Dati mutabili in tempo reale (Server Action sulla stessa pagina) - stesso
// motivo di admin/page.tsx e permessi-certificati/page.tsx.
export const dynamic = "force-dynamic";

export default async function PermessiAccessoPage() {
  // Story 17.2 (review fix): ruoli e righe non dipendono l'uno dall'altro -
  // eseguiti in Promise.all, stesso principio gia' stabilito altrove nel
  // progetto. PermessoRotta non e' protetta da RLS (AD-9) - Prisma diretto,
  // stesso pattern di ogni altra pagina Amministrazione.
  const [ruoli, righe] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    prisma.permessoRotta.findMany({
      select: { rotta: true, ruolo: true },
    }),
  ]);
  const abilitati = righe.map((r) => `${r.rotta}|${r.ruolo}`);

  // AC #6: l'elenco delle rotte gestibili e' derivato da PROTECTED_ROUTES
  // (route-guard.ts), non un elenco distinto mantenuto a mano qui - nessuna
  // rotta protetta puo' restare "orfana" (assente sia dal seed che dalla UI).
  // Review fix (Story 12.1): le rotte ADMIN-only (es. /admin,
  // /permessi-certificati, /permessi-accesso stessa) sono escluse dalla
  // matrice - i Dev Notes le descrivono come "hardcoded, solo ADMIN vi
  // accede comunque". Includerle permetterebbe di salvare "DIRIGENTE
  // abilitato su /admin", una porta aperta per un'escalation di privilegi
  // non voluta.
  // Story 12.4: `r.ruoliAmmessi.some(...)` da solo non basta piu' - una
  // rotta migrata (permessiConfigurabili:true) puo' avere ruoliAmmessi
  // storico ancora ADMIN-only (es. /precaricamento-allenatori, Story 9.22)
  // pur essendo ora genuinamente configurabile: quel campo e' diventato solo
  // un fallback storico, non piu' la fonte di verita' (vedi isAutorizzato,
  // lib/auth/route-decision.ts). Senza `|| r.permessiConfigurabili`, una
  // rotta migrata resterebbe esclusa dalla matrice e un Admin non avrebbe
  // alcun modo di configurarla da UI.
  const rotte = PROTECTED_ROUTES.filter(
    (r) => r.permessiConfigurabili || r.ruoliAmmessi.some((ruolo) => ruolo !== "ADMIN")
  ).map((r) => ({
    prefix: r.prefix,
    navLabel: r.navLabel,
  }));

  return (
    <main>
      <TitoloPagina
        titolo="Permessi di accesso"
        contenuto={contenutoPerRotta("/app/permessi-accesso", ruoli)}
      />
      <PermessiAccessoForm rotte={rotte} abilitati={abilitati} />
    </main>
  );
}
