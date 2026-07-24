import "server-only";
import { prisma } from "@/lib/prisma";
import type { AnnoAgonistico } from "@prisma/client";

// Story 1.8: sola lettura (Prisma diretto, come le altre funzioni del
// modulo) - cerca l'Anno Agonistico immediatamente precedente a quello
// passato, per il riporto delle Under 13 (AC #1). Restituisce null se non
// esiste (prima stagione in assoluto, AC #5) - nessuna creazione qui, a
// differenza di risolviAnnoAgonisticoCorrente.
export async function trovaAnnoAgonisticoPrecedente(
  annoCorrente: Pick<AnnoAgonistico, "dataInizio">
): Promise<AnnoAgonistico | null> {
  return prisma.annoAgonistico.findFirst({
    where: { dataFine: { lt: annoCorrente.dataInizio } },
    orderBy: { dataFine: "desc" },
  });
}
