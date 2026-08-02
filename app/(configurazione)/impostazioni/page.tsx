import Link from "next/link";
import { PROTECTED_ROUTES } from "@/lib/auth/route-guard";
import styles from "./impostazioni.module.css";

// Story 9.24: pagina hub - raggruppa /smtp e /logo (Story 7.1/7.2), non piu'
// elencate direttamente in barra (route-guard.ts, nascostaDallaNav). Nessun
// controllo di Ruolo qui: la route-guard (prefix "/impostazioni") e' gia' il
// cancello, stesso pattern di ogni altra pagina di questa codebase.

// Review fix: le etichette vengono lette da PROTECTED_ROUTES (navLabel),
// non ripetute come stringa letterale qui - stessa fonte di verita' unica
// gia' dichiarata per l'autorizzazione/la barra di navigazione (route-guard.ts,
// commento su PROTECTED_ROUTES). Rinominare navLabel per /smtp o /logo in
// futuro aggiorna automaticamente anche questa pagina.
const PREFISSI_IMPOSTAZIONI = ["/smtp", "/logo"] as const;

export default function ImpostazioniPage() {
  const voci = PREFISSI_IMPOSTAZIONI.map((prefix) => {
    const route = PROTECTED_ROUTES.find((r) => r.prefix === prefix);
    return { href: prefix, label: route?.navLabel ?? prefix };
  });

  return (
    <main className="pagina-form">
      <div className="riquadro-form">
        <h1>Impostazioni</h1>
        <ul className={styles.lista}>
          {voci.map((voce) => (
            <li key={voce.href}>
              <Link href={voce.href} className={styles.link}>
                {voce.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
