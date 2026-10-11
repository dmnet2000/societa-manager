import "server-only";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";

// Story 4.7: nomi dei Gruppi dell'Atleta nella stagione corrente, per il
// testo della notifica email all'Admin su nuovo Certificato caricato.
// GruppoAtleta/Gruppo non sono RLS-protette (AD-9) - Prisma diretto, stesso
// accesso di elencaEmailCollegateAdAtleta (lib/utenti). findMany, non
// findFirst: da Story 9.21 un'Atleta puo' stare in piu' Gruppi nella stessa
// stagione. Sola lettura (trovaAnnoAgonisticoCorrente, mai risolvi...):
// nessun Anno Agonistico corrente -> [] (il chiamante mostra un fallback).
export async function elencaNomiGruppiAtletaCorrenti(
  atletaId: string,
  oggi: Date = new Date()
): Promise<string[]> {
  const annoAgonistico = await trovaAnnoAgonisticoCorrente(oggi);
  if (!annoAgonistico) {
    return [];
  }

  const righe = await prisma.gruppoAtleta.findMany({
    where: { atletaId, annoAgonisticoId: annoAgonistico.id },
    select: { gruppo: { select: { nome: true } } },
    orderBy: { gruppo: { nome: "asc" } },
  });

  return righe.map((riga) => riga.gruppo.nome);
}
