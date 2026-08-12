"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inserisciMisurazione } from "@/lib/db-rls/misurazione-atleta";
import { PARAMETRI_STANDARD } from "@/lib/misurazioni";

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
  const unitaMisura = String(formData.get("unitaMisura") ?? "").trim();
  const data = String(formData.get("data") ?? "").trim();

  if (!atletaId) {
    return { error: { code: "VALIDATION", message: "Atleta non specificata." } };
  }
  if (!tipo) {
    return { error: { code: "VALIDATION", message: "Il tipo è obbligatorio." } };
  }

  // Story 9.16 (AC #3): getAll invece di get - un parametro a "tentativi: 3"
  // (Salto con rincorsa/Salto a muro, MisurazioneForm.tsx) invia piu' <input
  // name="valore">, un parametro a tentativo singolo (o "Altro") ne invia
  // uno solo - stesso identico comportamento di prima (Story 6.1) in
  // quest'ultimo caso, l'array ha semplicemente lunghezza 1.
  const valoriGrezzi = formData.getAll("valore").map((v) => String(v).trim());

  // Review fix: getAll su un campo "valore" del tutto assente dal submit
  // restituisce [], che senza questo controllo farebbe saltare l'intero
  // ciclo di validazione sotto (bypassando "obbligatorio") e scriverebbe un
  // insert vuoto con esito { success: true }. Verifica anche che il numero
  // di valori corrisponda a quanto atteso dal catalogo (1 per un parametro a
  // tentativo singolo o "Altro", 3 per Salto con rincorsa/Salto a muro) -
  // una richiesta manomessa con un numero diverso viene rifiutata.
  const tentativiAttesi =
    PARAMETRI_STANDARD.find((p) => p.tipo === tipo)?.tentativi ?? 1;
  if (valoriGrezzi.length !== tentativiAttesi) {
    return {
      error: { code: "VALIDATION", message: "Il valore è obbligatorio e deve essere numerico." },
    };
  }

  const valori: number[] = [];
  for (const valoreGrezzo of valoriGrezzi) {
    // Virgola come separatore decimale (convenzione italiana, es. "178,5") -
    // normalizzata al punto prima del parsing (review fix: altrimenti Number()
    // la rifiuta come non numerica in un'app interamente in italiano).
    const normalizzato = valoreGrezzo.replace(",", ".");
    const valore = Number(normalizzato);
    // Number.isFinite (non solo !Number.isNaN, review fix): "Infinity"/
    // "-Infinity" superano Number.isNaN ma non sono un valore numerico valido
    // per una misurazione. Fail-fast (Dev Notes): se anche un solo tentativo
    // non e' valido, l'intera azione fallisce - nessuna riga scritta.
    if (!valoreGrezzo || !Number.isFinite(valore)) {
      return {
        error: { code: "VALIDATION", message: "Il valore è obbligatorio e deve essere numerico." },
      };
    }
    valori.push(valore);
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
      valori,
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

  revalidatePath("/app/dati-fisici");
  return { success: true };
}
