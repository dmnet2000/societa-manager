import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// AD-11: client service-role, usato SOLO lato server per scrivere
// app_metadata (mai esposto al client, mai importato da un componente client).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
