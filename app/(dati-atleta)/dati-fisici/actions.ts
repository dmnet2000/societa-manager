"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inserisciMisurazione } from "@/lib/db-rls/misurazione-atleta";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }.
export type DatiFisiciActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

// Nessun requireRuolo qui (Dev Notes/Task 3): sia Allenatore sia Atleta sono
// ammessi e la RLS decide comunque riga per riga in base ad "atletaId" -
// stesso principio gia' usato per registraPresenze (Story 3.1).
export async function inserisciMisurazioneAction(
  _prevState: DatiFisiciActionState,
  formData: FormData
): Promise<DatiFisiciActionState> {
  const atletaId = String(formData.get("atletaId") ?? "");
  const tipo = String(formData.get("tipo") ?? "").trim();
  // Virgola come separatore decimale (convenzione italiana, es. "178,5") -
  // normalizzata al punto prima del parsing (review fix: altrimenti Number()
  // la rifiuta come non numerica in un'app interamente in italiano).
  const valoreGrezzo = String(formData.get("valore") ?? "").trim().replace(",", ".");
  const unitaMisura = String(formData.get("unitaMisura") ?? "").trim();
  const data = String(formData.get("data") ?? "").trim();

  if (!atletaId) {
    return { error: { code: "VALIDATION", message: "Atleta non specificata." } };
  }
  if (!tipo) {
    return { error: { code: "VALIDATION", message: "Il tipo è obbligatorio." } };
  }
  // Number.isFinite (non solo !Number.isNaN, review fix): "Infinity"/
  // "-Infinity" superano Number.isNaN ma non sono un valore numerico valido
  // per una misurazione.
  const valore = Number(valoreGrezzo);
  if (!valoreGrezzo || !Number.isFinite(valore)) {
    return {
      error: { code: "VALIDATION", message: "Il valore è obbligatorio e deve essere numerico." },
    };
  }
  if (!unitaMisura) {
    return {
      error: { code: "VALIDATION", message: "L'unità di misura è obbligatoria." },
    };
  }
  if (!data) {
    return { error: { code: "VALIDATION", message: "La data è obbligatoria." } };
  }
  if (!FORMATO_DATA.test(data)) {
    return { error: { code: "VALIDATION", message: "Formato data non valido." } };
  }

  try {
    const supabase = await createClient();
    await inserisciMisurazione(supabase, atletaId, {
      tipo,
      valore,
      unitaMisura,
      data,
    });
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare la misurazione. Riprova.",
      },
    };
  }

  revalidatePath("/dati-fisici");
  return { success: true };
}
