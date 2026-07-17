import "server-only";
import { prisma } from "@/lib/prisma";
import type { AnnoAgonistico } from "@prisma/client";
import { calcolaIntervalloStagioneCorrente } from "./calcola-intervallo-stagione-corrente";

// AnnoAgonistico non e' protetta da RLS (non nel bind-list di AD-4) - dato
// puramente strutturale, gestita via Prisma diretto come Palestra/Gruppo
// (AD-9).

// Sola lettura, nessun side-effect: usata dalla pagina (GET) per mostrare lo
// stato corrente senza creare nulla durante il rendering.
export async function trovaAnnoAgonisticoCorrente(
  oggi: Date = new Date()
): Promise<AnnoAgonistico | null> {
  const { dataInizio, dataFine } = calcolaIntervalloStagioneCorrente(oggi);

  return prisma.annoAgonistico.findFirst({
    where: { dataInizio, dataFine },
  });
}

// Find-or-create (AD-8: "un solo helper condiviso" per la stagione
// corrente) - va richiamata solo da percorsi di scrittura (Server Action),
// mai dal rendering di una pagina. Story 2.2 (Creazione Gruppi) riusera'
// questa stessa funzione.
export async function risolviAnnoAgonisticoCorrente(
  oggi: Date = new Date()
): Promise<AnnoAgonistico> {
  const esistente = await trovaAnnoAgonisticoCorrente(oggi);
  if (esistente) {
    return esistente;
  }

  const { dataInizio, dataFine } = calcolaIntervalloStagioneCorrente(oggi);
  try {
    return await prisma.annoAgonistico.create({
      data: { dataInizio, dataFine },
    });
  } catch (err) {
    // Race condition (bassa probabilita', singolo utente Segreteria attivo,
    // stessa classe gia' accettata come Defer in Story 1.3/1.4): due
    // conferme concorrenti potrebbero entrambe trovare null e tentare la
    // create - la seconda urta @@unique([dataInizio, dataFine]) (Prisma
    // P2002). Invece di propagare l'errore, si ri-legge la riga appena
    // creata dall'altra chiamata (idempotente, come confermaIscrizione).
    if ((err as { code?: string }).code === "P2002") {
      const creataAltrove = await trovaAnnoAgonisticoCorrente(oggi);
      if (creataAltrove) {
        return creataAltrove;
      }
    }
    throw err;
  }
}
