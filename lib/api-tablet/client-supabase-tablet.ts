import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// AD-17: client Supabase con la sessione del tablet (header Bearer col suo
// JWT), cosi le RLS delle rose valgono. Nessuna sessione persistita.
// `null` se la configurazione pubblica manca.
export function creaClientSupabaseTablet(jwt: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}
