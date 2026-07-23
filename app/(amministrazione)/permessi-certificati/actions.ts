"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireRuolo } from "@/lib/auth/require-ruolo";

// Data & formati (ARCHITECTURE-SPINE.md): errori come { error: { code,
// message } }, "FORBIDDEN" riservato ai rifiuti di autorizzazione.
export type PermessiCertificatiActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// AC #2, #3, #5: solo Admin puo' configurare questo permesso - verificato
// qui, non solo dal route guard di proxy.ts (le Server Action sono endpoint
// indipendenti dal path della pagina che le importa, stesso principio di
// ogni altra Server Action Admin-only, es. admin/actions.ts).
// Sostituzione completa (delete-all + insert dei nuovi) in una transazione:
// dataset piccolo (poche decine di Gruppi al massimo per un singolo club),
// nessun bisogno di un diff riga-per-riga. gruppoIds: [] produce
// correttamente zero righe = nessuna restrizione (AC #3, "deseleziona
// tutto" equivale a disattivare).
export async function salvaGruppiVisibiliDirigente(
  _prevState: PermessiCertificatiActionState,
  formData: FormData
): Promise<PermessiCertificatiActionState> {
  const forbidden = await requireRuolo("ADMIN");
  if (forbidden) return forbidden;

  // Review fix: deduplica prima dell'insert - un form manomesso o un
  // doppio submit di rete con lo stesso id ripetuto avrebbe altrimenti
  // urtato il vincolo @unique su gruppoId e fatto fallire l'intera
  // transazione con un errore generico.
  const gruppoIds = Array.from(new Set(formData.getAll("gruppoIds").map(String)));

  try {
    await prisma.$transaction([
      prisma.gruppoVisibileDirigente.deleteMany({}),
      ...(gruppoIds.length > 0
        ? [
            prisma.gruppoVisibileDirigente.createMany({
              data: gruppoIds.map((gruppoId) => ({ id: randomUUID(), gruppoId })),
            }),
          ]
        : []),
    ]);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare la configurazione. Riprova.",
      },
    };
  }

  revalidatePath("/permessi-certificati");
  return { success: true };
}
