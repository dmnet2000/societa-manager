"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  BUCKET_FOTO_ATLETA,
  BUCKET_FOTO_ALLENATORE,
  MIME_AMMESSI_FOTO,
  DIMENSIONE_MASSIMA_FOTO_BYTE,
  contenutoCorrispondeAlMimeDichiaratoFoto,
  caricaFotoProfilo as caricaFotoProfiloStorage,
} from "@/lib/storage/foto-profilo";

// Data & formati (ARCHITECTURE-SPINE.md): errori come { error: { code, message } }.
export type FotoProfiloState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const NON_COLLEGATO = {
  code: "NON_COLLEGATO",
  message: "Il tuo account non è collegato a un profilo Allenatore o Atleta.",
};

// `tipo` arriva legato (bind) dal Client Component (quale sezione ha
// inviato) - MAI un entitaId dal form: la Server Action risolve sempre da
// sé, dalla sessione, quale Atleta (autoAggancio)/Allenatore appartiene
// all'Utente corrente, stesso principio anti-manomissione gia' applicato in
// aggiornaRuoliUtente/reimpostaPasswordFissaUtente (Story 1.2/9.9/9.11).
export async function caricaFotoProfilo(
  tipo: "ATLETA" | "ALLENATORE",
  _prevState: FotoProfiloState,
  formData: FormData
): Promise<FotoProfiloState> {
  const forbidden = await requireRuolo(["ATLETA", "ALLENATORE"]);
  if (forbidden) return forbidden;

  const file = formData.get("file");

  // I/O Matrix: nessuna chiamata a Supabase/Prisma se la validazione fallisce.
  if (!(file instanceof File) || file.size === 0) {
    return {
      error: { code: "VALIDATION", message: "Seleziona un file da caricare." },
    };
  }
  if (!MIME_AMMESSI_FOTO.includes(file.type)) {
    return {
      error: { code: "VALIDATION", message: "Formato file non ammesso (solo JPG, PNG)." },
    };
  }
  if (file.size > DIMENSIONE_MASSIMA_FOTO_BYTE) {
    return {
      error: { code: "VALIDATION", message: "Il file supera la dimensione massima di 5MB." },
    };
  }
  if (!(await contenutoCorrispondeAlMimeDichiaratoFoto(file))) {
    return {
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: NON_COLLEGATO };

    let bucket: string;
    let entitaId: string;

    if (tipo === "ATLETA") {
      // autoAggancio: true (self-service puro) - mai un aggancio
      // Genitore<->figlia, stesso principio gia' stabilito in
      // dati-fisici/page.tsx e storico-presenze/page.tsx. orderBy identico
      // a quello di page.tsx (review fix, Edge Case Hunter): stessa scelta
      // deterministica se mai esistessero 2+ righe autoAggancio=true.
      const riga = await prisma.genitoreAtleta.findFirst({
        where: { utente: { supabaseAuthId: user.id }, autoAggancio: true },
        select: { atletaId: true },
        orderBy: { atletaId: "asc" },
      });
      if (!riga) return { error: NON_COLLEGATO };
      bucket = BUCKET_FOTO_ATLETA;
      entitaId = riga.atletaId;
    } else if (tipo === "ALLENATORE") {
      const allenatore = await prisma.allenatore.findFirst({
        where: { utente: { supabaseAuthId: user.id } },
      });
      if (!allenatore) return { error: NON_COLLEGATO };
      bucket = BUCKET_FOTO_ALLENATORE;
      entitaId = allenatore.id;
    } else {
      // Review fix (code review Story 9.12, Blind Hunter): ramo difensivo -
      // il tipo TypeScript esclude gia' altri valori a compile-time, ma un
      // `else` esplicito con errore (invece di un fallback silenzioso su
      // ALLENATORE) evita che un futuro refactor/tipo allargato smisti
      // silenziosamente un valore imprevisto sull'entita' sbagliata.
      return {
        error: { code: "VALIDATION", message: "Tipo di profilo non valido." },
      };
    }

    // RLS su storage.objects (migrazione Story 9.12) e' l'unica autorita'
    // che decide se l'upload riesce davvero per questo entitaId - nessun
    // controllo applicativo duplicato sull'appartenenza.
    await caricaFotoProfiloStorage(supabase, bucket, entitaId, file);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile caricare la foto. Riprova." },
    };
  }

  revalidatePath("/app/il-mio-profilo");
  return { success: true };
}
