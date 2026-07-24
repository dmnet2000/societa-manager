import "server-only";
import type { Ruolo } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// AD-9: Utente/UtenteRuolo non sono nel bind-list di AD-4 - lettura via
// Prisma diretto, come ogni altra query sui Ruoli in questo progetto (es.
// contaAltriAdminAttivi, app/(amministrazione)/admin/actions.ts). Solo
// Utenti attivi: un account disattivato non deve ricevere email operative
// (stesso campo "attivo" gia' usato per bloccare il login, Story 1.2).
// Modulo condiviso (non specifico di Certificati-Medici) - riusabile da
// Story 4.4/4.6, che avranno bisogno dello stesso pattern "email per
// Ruolo". Restituisce sempre un array (anche vuoto se nessun Utente ha
// quel Ruolo), mai un errore per quel caso legittimo.
export async function elencaEmailPerRuolo(ruolo: Ruolo): Promise<string[]> {
  const utenti = await prisma.utente.findMany({
    where: { attivo: true, ruoli: { some: { ruolo } } },
    select: { email: true },
  });

  return utenti.map((u) => u.email);
}
