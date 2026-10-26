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

// Story 28.1 (Export dati): stessa lettura di elencaNomiGruppiAtletaCorrenti
// ma per tutte le Atlete in una sola query - atletaId -> nomi dei Gruppi
// della stagione corrente, in ordine alfabetico. Un'Atleta senza Gruppo non
// compare nella mappa.
export async function elencaNomiGruppiPerAtletaCorrenti(
  oggi: Date = new Date()
): Promise<Map<string, string[]>> {
  const annoAgonistico = await trovaAnnoAgonisticoCorrente(oggi);
  const nomiPerAtleta = new Map<string, string[]>();
  if (!annoAgonistico) {
    return nomiPerAtleta;
  }

  const righe = await prisma.gruppoAtleta.findMany({
    where: { annoAgonisticoId: annoAgonistico.id },
    select: { atletaId: true, gruppo: { select: { nome: true } } },
  });

  for (const riga of righe) {
    const nomi = nomiPerAtleta.get(riga.atletaId) ?? [];
    nomi.push(riga.gruppo.nome);
    nomiPerAtleta.set(riga.atletaId, nomi);
  }
  // Review fix (code review Epic 28): ordinati qui con localeCompare, come
  // /app/conferma-iscrizioni, non con l'ORDER BY del database (la
  // collation di Postgres puo' ordinare diversamente maiuscole e accenti).
  for (const nomi of nomiPerAtleta.values()) {
    nomi.sort((a, b) => a.localeCompare(b));
  }
  return nomiPerAtleta;
}
