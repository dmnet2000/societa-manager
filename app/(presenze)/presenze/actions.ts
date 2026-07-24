"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { createClient } from "@/lib/supabase/server";
import type { GiornoSettimana } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { registraPresenze as registraPresenzeRls } from "@/lib/db-rls/presenza";
import { giornoSettimanaDaData } from "@/lib/giorno-settimana";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type PresenzeActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

// AC #1: FR-8 e' specifico del Ruolo Allenatore - nessuna UI per Admin/
// Dirigente/Segreteria in questa storia (stesso scope minimale di
// /mio-orario, Story 2.6). AC #4 e' garantito a livello di database dalle
// policy RLS "allenatore_proprio_gruppo_*" (migrazione
// 20260717210000_presenze_scope_atleta_gruppo, review fix: la versione
// precedente verificava solo la proprieta' dello Slot, non l'appartenenza
// dell'Atleta al suo Gruppo) - un tentativo di scrivere per uno Slot non
// proprio, o per un'Atleta non del Gruppo di quello Slot, viene rifiutato
// li', non da un controllo applicativo duplicato qui.
export async function registraPresenze(
  _prevState: PresenzeActionState,
  formData: FormData
): Promise<PresenzeActionState> {
  const forbidden = await requireRuolo(["ALLENATORE"]);
  if (forbidden) return forbidden;

  const slotId = String(formData.get("slotId") ?? "");
  const data = String(formData.get("data") ?? "");
  // Ogni Atleta del roster ha un hidden input "rosterAtletaId" (Dev Notes
  // Story 3.1): solo i checkbox spuntati vengono inviati in un FormData, ma
  // ogni Atleta del roster deve comunque ottenere una riga esplicita,
  // presente o assente (AC #1) - non solo quelle spuntate. Deduplicato
  // (review fix): un form manomesso con id ripetuti non deve far fallire
  // l'intero upsert con un errore Postgres poco chiaro ("cannot affect row a
  // second time" su un ON CONFLICT).
  const rosterAtletaId = [
    ...new Set(formData.getAll("rosterAtletaId").map(String)),
  ];
  const presenteAtletaId = new Set(
    formData.getAll("presenteAtletaId").map(String)
  );

  if (!slotId) {
    return { error: { code: "VALIDATION", message: "Lo Slot è obbligatorio." } };
  }
  if (!data) {
    return { error: { code: "VALIDATION", message: "La data è obbligatoria." } };
  }
  if (!FORMATO_DATA.test(data)) {
    return { error: { code: "VALIDATION", message: "Formato data non valido." } };
  }
  if (rosterAtletaId.length === 0) {
    return {
      error: { code: "VALIDATION", message: "Nessuna Atleta nel roster." },
    };
  }

  // Review fix (AC #2): il controllo giorno/Slot esisteva solo nel percorso
  // di lettura (page.tsx) - una POST diretta verso questa Server Action
  // (bypassando la UI) poteva registrare una Presenza per una data il cui
  // giorno della settimana non corrisponde allo Slot. Slot non e' protetto
  // da RLS (AD-9) - Prisma diretto, stessa lettura gia' fatta in page.tsx.
  let slot: { giorno: GiornoSettimana } | null;
  try {
    slot = await prisma.slot.findUnique({
      where: { id: slotId },
      select: { giorno: true },
    });
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare le presenze. Riprova.",
      },
    };
  }
  if (!slot) {
    return { error: { code: "VALIDATION", message: "Slot non trovato." } };
  }
  if (giornoSettimanaDaData(data) !== slot.giorno) {
    return {
      error: {
        code: "VALIDATION",
        message: "La data selezionata non corrisponde al giorno di questo Slot.",
      },
    };
  }

  const righe = rosterAtletaId.map((atletaId) => ({
    atletaId,
    slotId,
    data,
    presente: presenteAtletaId.has(atletaId),
  }));

  try {
    const supabase = await createClient();
    await registraPresenzeRls(supabase, righe);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare le presenze. Riprova.",
      },
    };
  }

  revalidatePath("/presenze");
  return { success: true };
}
