"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import type { Ruolo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { PROTECTED_ROUTES } from "@/lib/auth/route-guard";

// Data & formati (ARCHITECTURE-SPINE.md): errori come { error: { code,
// message } }, "FORBIDDEN" riservato ai rifiuti di autorizzazione.
export type PermessiAccessoActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// AC #2: ADMIN e' sempre escluso dai permessi configurabili, hardcoded qui -
// non solo nella UI. Un form manomesso che tentasse di inviare "ADMIN" (o un
// ruolo inesistente) viene scartato dal filtro sotto, stesso principio di
// difesa in profondita' gia' applicato a ogni altra Server Action Admin-only
// di questo progetto.
const RUOLI_CONFIGURABILI: Ruolo[] = [
  "ALLENATORE",
  "ATLETA",
  "GENITORE",
  "SEGRETERIA",
  "DIRIGENTE",
];
// Review fix (Blind Hunter + Edge Case Hunter, indipendentemente): esclude
// le rotte ADMIN-only dalle rotte accettabili, stesso principio/stesso
// filtro di page.tsx - senza questo, un form manomesso (o un giorno la UI
// stessa) potrebbe persistere "DIRIGENTE abilitato su /admin", righe che il
// seed esclude deliberatamente perche' quelle rotte restano hardcoded
// (Dev Notes: "solo ADMIN vi accede comunque").
const ROTTE_VALIDE = new Set(
  PROTECTED_ROUTES.filter((r) =>
    r.ruoliAmmessi.some((ruolo) => ruolo !== "ADMIN")
  ).map((r) => r.prefix)
);

// AC #3, #5: solo Admin puo' configurare i permessi - verificato qui, non
// solo dal route guard di proxy.ts (le Server Action sono endpoint
// indipendenti dal path della pagina che le importa, stesso principio di
// ogni altra Server Action Admin-only, es. permessi-certificati/actions.ts).
// AC #4: sostituzione completa (delete-all + insert dei nuovi) in una
// transazione: dataset piccolo (al massimo 26 rotte x 5 Ruoli non-ADMIN),
// nessun bisogno di un diff riga-per-riga. Un form con tutte le caselle
// deselezionate produce correttamente zero righe (fail-closed su ogni
// rotta/Ruolo, comportamento voluto una volta che Story 12.3 collega questa
// configurazione al controllo di accesso reale).
export async function salvaPermessiRotte(
  _prevState: PermessiAccessoActionState,
  formData: FormData
): Promise<PermessiAccessoActionState> {
  const forbidden = await requireRuolo("ADMIN");
  if (forbidden) return forbidden;

  // Review fix (Edge Case Hunter): dedup dopo il parsing, sulla coppia
  // rotta+ruolo effettiva - non sulla stringa grezza. "/foo|BAR" e
  // "/foo|BAR|extra" (quest'ultima raggiungibile solo da un form manomesso,
  // mai dalla UI) parserebbero alla stessa coppia ma sono stringhe diverse:
  // un dedup sulla sola stringa grezza le avrebbe lasciate passare entrambe,
  // urtando il vincolo @@unique([rotta, ruolo]) in createMany. Stesso
  // principio del dedup gia' stabilito in permessi-certificati/actions.ts,
  // solo spostato dopo il parsing.
  const righe = Array.from(
    new Map(
      formData
        .getAll("permessi")
        .map(String)
        .map((chiave) => {
          const [rotta, ruolo] = chiave.split("|");
          return { rotta, ruolo: ruolo as Ruolo };
        })
        .filter(
          (r) =>
            ROTTE_VALIDE.has(r.rotta) && RUOLI_CONFIGURABILI.includes(r.ruolo)
        )
        .map((r) => [`${r.rotta}|${r.ruolo}`, r] as const)
    ).values()
  );

  try {
    await prisma.$transaction([
      prisma.permessoRotta.deleteMany({}),
      ...(righe.length > 0
        ? [
            prisma.permessoRotta.createMany({
              data: righe.map((r) => ({
                id: randomUUID(),
                rotta: r.rotta,
                ruolo: r.ruolo,
                abilitato: true,
              })),
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

  revalidatePath("/permessi-accesso");
  return { success: true };
}
