import { prisma } from "@/lib/prisma";
import { PROTECTED_ROUTES } from "@/lib/auth/route-guard";
import { PermessiAccessoForm } from "./PermessiAccessoForm";

// Dati mutabili in tempo reale (Server Action sulla stessa pagina) - stesso
// motivo di admin/page.tsx e permessi-certificati/page.tsx.
export const dynamic = "force-dynamic";

export default async function PermessiAccessoPage() {
  // PermessoRotta non e' protetta da RLS (AD-9) - Prisma diretto, stesso
  // pattern di ogni altra pagina Amministrazione.
  const righe = await prisma.permessoRotta.findMany({
    select: { rotta: true, ruolo: true },
  });
  const abilitati = righe.map((r) => `${r.rotta}|${r.ruolo}`);

  // AC #6: l'elenco delle rotte gestibili e' derivato da PROTECTED_ROUTES
  // (route-guard.ts), non un elenco distinto mantenuto a mano qui - nessuna
  // rotta protetta puo' restare "orfana" (assente sia dal seed che dalla UI).
  // Review fix: le rotte ADMIN-only (es. /admin, /permessi-certificati,
  // /permessi-accesso stessa) sono escluse dalla matrice - i Dev Notes le
  // descrivono come "hardcoded, solo ADMIN vi accede comunque" (stesso
  // trattamento del seed, che non produce righe per queste rotte). Includerle
  // permetterebbe di salvare "DIRIGENTE abilitato su /admin" - una riga che
  // il seed esclude deliberatamente ma che restava altrimenti ricreabile
  // dalla UI, una porta aperta per un'escalation di privilegi non voluta
  // quando Story 12.3 collegera' questa tabella al controllo reale
  // (incluso il rischio di auto-concedersi accesso al pannello permessi
  // stesso). Trovato indipendentemente da Blind Hunter ed Edge Case Hunter.
  const rotte = PROTECTED_ROUTES.filter((r) =>
    r.ruoliAmmessi.some((ruolo) => ruolo !== "ADMIN")
  ).map((r) => ({
    prefix: r.prefix,
    navLabel: r.navLabel,
  }));

  return (
    <main>
      <h1>Permessi di accesso</h1>
      <PermessiAccessoForm rotte={rotte} abilitati={abilitati} />
    </main>
  );
}
