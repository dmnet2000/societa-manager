import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client service-role condiviso, usato SOLO lato server (mai esposto al
// client, mai importato da un componente client). Nato per AD-11 (scrivere
// app_metadata dopo ogni scrittura Ruoli); riusato anche da lib/email/invia-email.ts
// (Story 4.3) per leggere "configurazione_smtp" (RLS ADMIN-only, AD-12)
// indipendentemente dal Ruolo di chi ha innescato l'invio email.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
