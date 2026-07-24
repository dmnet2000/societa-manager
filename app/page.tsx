import { createClient } from "@/lib/supabase/server";
import { parseRuoli } from "@/lib/ruoli";
import styles from "./home.module.css";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruoli = parseRuoli(user?.app_metadata?.ruoli);

  return (
    <main>
      <h1>Area applicativa</h1>
      <div className={styles.card}>
        <p className={styles.saluto}>Bentornata/o, {user?.email}.</p>
        <p className={styles.testo}>Ruoli: {ruoli.join(", ") || "nessuno"}</p>
      </div>
    </main>
  );
}
