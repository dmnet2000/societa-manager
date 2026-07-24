import "server-only";
import { prisma } from "@/lib/prisma";
import type { Allenatore } from "@prisma/client";

// AD-5: stesso modulo condiviso di trovaPerCodiceFiscale (Atleta, Story 1.3),
// ma implementazione diversa - Allenatore non e' protetta da RLS (AD-9,
// elencata esplicitamente tra le tabelle Prisma-dirette) - qui si usa Prisma
// diretto, non il client Supabase autenticato.
export async function trovaAllenatorePerCodiceFiscale(
  codiceFiscale: string
): Promise<Allenatore | null> {
  const codiceFiscaleNormalizzato = codiceFiscale.trim().toUpperCase();

  return prisma.allenatore.findUnique({
    where: { codiceFiscale: codiceFiscaleNormalizzato },
  });
}
