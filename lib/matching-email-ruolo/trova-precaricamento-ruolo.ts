import "server-only";
import type { PrecaricamentoRuolo, Ruolo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizzaEmailRuolo } from "./normalizza-email-ruolo";

// Story 9.41: mirror esatto di trovaAllenatorePerCodiceFiscale
// (lib/matching-codice-fiscale/) - PrecaricamentoRuolo non e' protetta da
// RLS (AD-9), Prisma diretto. Normalizza sempre l'email tramite
// normalizzaEmailRuolo (unica fonte di normalizzazione, mai reimplementata).
export async function trovaPrecaricamentoRuolo(
  email: string,
  ruolo: Ruolo
): Promise<PrecaricamentoRuolo | null> {
  const emailNormalizzata = normalizzaEmailRuolo(email);

  return prisma.precaricamentoRuolo.findUnique({
    where: { email_ruolo: { email: emailNormalizzata, ruolo } },
  });
}
