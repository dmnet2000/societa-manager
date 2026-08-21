import "server-only";
import { prisma } from "@/lib/prisma";

// Story 19.12 (Epic 19, Ruolo Site Manager): scrittura per
// Allenatore.descrizione/ruoliAggiuntivi (prisma/schema.prisma) - Allenatore
// e' una tabella strutturale (AD-9), nessuna RLS/policy nuova, accesso solo
// via Prisma diretto. Mirror strutturale di lib/pagine-pubbliche.ts/
// lib/menu-pubblico.ts: nessuna validazione qui (etichette dei ruoli
// aggiuntivi, lunghezza) - vive nel Server Action che chiama questa funzione
// (app/app/(gruppi-allenatori)/staff-descrizioni/actions.ts). Nessuna
// funzione di lettura dedicata: la pagina di gestione
// (staff-descrizioni/page.tsx) riusa una query Prisma diretta, mirror di
// app/staff/page.tsx.
export async function aggiornaDescrizioneStaff(
  allenatoreId: string,
  dati: { descrizione: string | null; ruoliAggiuntivi: string[] }
): Promise<void> {
  await prisma.allenatore.update({
    where: { id: allenatoreId },
    data: dati,
  });
}
