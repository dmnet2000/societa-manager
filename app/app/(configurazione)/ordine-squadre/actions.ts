"use server";

import { revalidatePath } from "next/cache";
import type { Ruolo } from "@prisma/client";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { elencaGruppiOrdinati, riordinaGruppi } from "@/lib/ordine-squadre";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type OrdineSquadreActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// Story 19.15 (Epic 19, Ruolo Site Manager): mirror esatto del perimetro di
// /app/menu-pubblico (Story 19.7) - funzionalita' nuova, nessun permesso
// preesistente da affiancare, DIRIGENTE resta escluso.
const RUOLI_ORDINE_SQUADRE: Ruolo[] = ["ADMIN", "SITE_MANAGER"];

// Nessuna libreria di drag-and-drop nel progetto (stesso principio gia'
// stabilito da /app/menu-pubblico, Story 19.7) - due bottoni Su/Giù, ciascuno
// scambia il Gruppo con il vicino nell'ordine attuale. Legge l'elenco
// completo (gia' ordinato) della stagione corrente invece di fidarsi di un
// indice passato dal client: l'ordine osservato dal client potrebbe essere
// stale se un'altra sessione ha riordinato nel frattempo.
export async function spostaGruppoAction(
  _prevState: OrdineSquadreActionState,
  formData: FormData
): Promise<OrdineSquadreActionState> {
  const forbidden = await requireRuolo(RUOLI_ORDINE_SQUADRE);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const direzione = String(formData.get("direzione") ?? "");
  if (direzione !== "su" && direzione !== "giu") {
    return { error: { code: "VALIDATION", message: "Direzione non valida." } };
  }

  try {
    // Sola lettura (trovaAnnoAgonisticoCorrente, MAI risolviAnnoAgonisticoCorrente
    // qui - side-effect di scrittura non ammissibile in un'azione di
    // riordino), stesso vincolo gia' rispettato in app/squadre/page.tsx.
    const annoCorrente = await trovaAnnoAgonisticoCorrente();
    if (!annoCorrente) {
      return {
        error: { code: "VALIDATION", message: "Nessuna stagione corrente trovata." },
      };
    }

    const gruppi = await elencaGruppiOrdinati(annoCorrente.id);
    const indice = gruppi.findIndex((g) => g.id === id);
    if (indice === -1) {
      return { error: { code: "VALIDATION", message: "Gruppo non trovato." } };
    }

    const indiceVicino = direzione === "su" ? indice - 1 : indice + 1;
    // Gia' al margine (primo Gruppo con "su", ultimo con "giu"): nessuna
    // operazione, non un errore - il bottone e' disabilitato lato client in
    // questo caso, ma il vero cancello resta qui.
    if (indiceVicino < 0 || indiceVicino >= gruppi.length) {
      return { success: true };
    }

    const nuovoOrdine = [...gruppi];
    [nuovoOrdine[indice], nuovoOrdine[indiceVicino]] = [
      nuovoOrdine[indiceVicino],
      nuovoOrdine[indice],
    ];
    await riordinaGruppi(nuovoOrdine.map((g) => g.id));
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile riordinare le squadre. Riprova." },
    };
  }

  revalidatePath("/app/ordine-squadre");
  revalidatePath("/squadre");
  return { success: true };
}
