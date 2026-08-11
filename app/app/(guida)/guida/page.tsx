import { createClient } from "@/lib/supabase/server";
import { parseRuoli } from "@/lib/ruoli";
import { contenutiPerRuoli } from "@/lib/guida/contenuti";
import styles from "./guida.module.css";

// Review fix (2026-08-10, Blind Hunter): CONTENUTI_GUIDA e' dato statico,
// non varia a runtime - il motivo reale di "force-dynamic" e' che la
// pagina legge la sessione dell'Utente (getUser()) ad ogni richiesta per
// filtrare l'indice per Ruolo, stesso motivo di /sponsor.
export const dynamic = "force-dynamic";

// Story 17.1: "/rotta" -> "rotta" per usarla come ancora #id - nessuna
// rotta pilota ha oggi un secondo segmento (es. "/sponsor", non
// "/sponsor/qualcosa"), replace basta per lo scope di questa storia.
function slugPerRotta(rotta: string): string {
  return rotta.replace(/^\//, "");
}

export default async function GuidaPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
  }

  const ruoli = parseRuoli(user?.app_metadata?.ruoli);
  const contenuti = contenutiPerRuoli(ruoli);

  return (
    <main>
      <h1>Guida</h1>
      {contenuti.length === 0 ? (
        <p className={styles.messaggioVuoto}>
          Nessuna voce di guida disponibile per il tuo Ruolo al momento.
        </p>
      ) : (
        <>
          <nav className={styles.indice} aria-label="Indice della guida">
            <ul>
              {contenuti.map((c) => (
                <li key={c.rotta}>
                  <a href={`#${slugPerRotta(c.rotta)}`}>{c.titolo}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className={styles.lista}>
            {contenuti.map((c) => (
              <section key={c.rotta} id={slugPerRotta(c.rotta)} className={styles.voce}>
                <h2>{c.titolo}</h2>
                {c.corpo.map((paragrafo, i) => (
                  <p key={i}>{paragrafo}</p>
                ))}
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
