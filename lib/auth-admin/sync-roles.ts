import "server-only";
import type { Ruolo } from "@prisma/client";
import { createAdminClient } from "./client";

// AD-11: specchia i Ruoli (Prisma, fonte di verita') in app_metadata
// dell'utente Supabase Auth, cosi' il Proxy (proxy.ts) puo' leggerli dal JWT
// senza query Prisma. Se questa scrittura fallisce dopo che UtenteRuolo e'
// gia' stato scritto, l'operazione complessiva e' considerata fallita
// (il chiamante deve propagare l'errore, non ignorarlo).
export async function sincronizzaRuoliAppMetadata(
  supabaseAuthId: string,
  ruoli: Ruolo[]
) {
  const admin = createAdminClient();

  // Legge l'app_metadata esistente prima di scrivere: updateUserById
  // sostituisce l'intero oggetto, non unisce le chiavi - senza questa lettura
  // qualunque altro campo gia' presente in app_metadata verrebbe perso.
  const { data, error: getError } = await admin.auth.admin.getUserById(
    supabaseAuthId
  );

  if (getError) {
    throw new Error(
      `Lettura utente ${supabaseAuthId} fallita prima della sincronizzazione ruoli: ${getError.message}`
    );
  }

  const { error } = await admin.auth.admin.updateUserById(supabaseAuthId, {
    app_metadata: { ...data.user.app_metadata, ruoli },
  });

  if (error) {
    throw new Error(
      `Sincronizzazione ruoli su app_metadata fallita per l'utente ${supabaseAuthId}: ${error.message}`
    );
  }
}
