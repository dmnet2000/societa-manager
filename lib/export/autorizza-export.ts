import "server-only";
import { matchProtectedRoute } from "@/lib/auth/route-guard";
import { requireRuolo } from "@/lib/auth/require-ruolo";

// Story 28.1 (Epic 28): la rotta di download di un export ammette gli
// stessi Ruoli della pagina che la ospita, letti da PROTECTED_ROUTES invece
// che ripetuti - cosi' pagina ed export non possono divergere. Il
// middleware protegge gia' il prefisso della pagina; questo e' il secondo
// controllo lato server, come per le Server Action. null = autorizzato.
export async function rifiutaExportNonAutorizzato(
  rottaPagina: string
): Promise<Response | null> {
  const rotta = matchProtectedRoute(rottaPagina);
  const rifiuto = rotta
    ? await requireRuolo(rotta.ruoliAmmessi, rottaPagina)
    : { error: { code: "FORBIDDEN", message: "Non autorizzato." } };

  if (rifiuto) {
    return Response.json(rifiuto, {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return null;
}
