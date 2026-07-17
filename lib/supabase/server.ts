import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client per Server Component / Server Action / Route Handler. Legge/scrive
// i cookie di sessione tramite l'API cookies() di Next.js (asincrona).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll puo' essere chiamato da un Server Component: se non c'e'
            // una risposta da modificare, l'errore va ignorato — il Proxy
            // (proxy.ts) si occupa comunque di rinfrescare la sessione.
          }
        },
      },
    }
  );
}
