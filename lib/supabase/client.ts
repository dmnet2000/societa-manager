import { createBrowserClient } from "@supabase/ssr";

// Client per Client Component. Usa la anon key: le policy RLS (AD-4) e la
// distinzione da Prisma (AD-9) valgono comunque lato server per le tabelle
// protette; questo client serve per le chiamate lato browser (es. upload).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
