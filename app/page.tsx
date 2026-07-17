import { createClient } from "@/lib/supabase/server";
import { parseRuoli } from "@/lib/ruoli";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruoli = parseRuoli(user?.app_metadata?.ruoli);

  return (
    <main>
      <h1>Area applicativa</h1>
      <p>Bentornata/o, {user?.email}.</p>
      <p>Ruoli: {ruoli.join(", ") || "nessuno"}</p>
    </main>
  );
}
