import Link from "next/link";
import { PROTECTED_ROUTES } from "@/lib/auth/route-guard";
import { leggiEmailSegreteria } from "@/lib/configurazione-applicazione";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { EmailSegreteriaForm } from "./EmailSegreteriaForm";
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
const PREFISSI_IMPOSTAZIONI = ["/app/smtp", "/app/logo"] as const;

// Story 9.31: prima lettura DB su questa pagina - da hub puro a hub+form
// (Email Segreteria, ConfigurazioneApplicazione, no-RLS - stesso principio
// di lettura pre-auth gia' usato per nomeSettore).
export default async function ImpostazioniPage() {
  const voci = PREFISSI_IMPOSTAZIONI.map((prefix) => {
    const route = PROTECTED_ROUTES.find((r) => r.prefix === prefix);
    return { href: prefix, label: route?.navLabel ?? prefix };
  });
  // Story 17.2 (review fix): ruoli e emailSegreteria non dipendono l'uno
  // dall'altro - eseguiti in Promise.all, stesso principio gia' stabilito
  // altrove nel progetto. Review fix (Edge Case Hunter): senza il .catch,
  // un errore DB su questa singola lettura farebbe crashare l'intero hub
  // /impostazioni, bloccando anche l'accesso ai link a /smtp e /logo che
  // prima non dipendevano da alcuna lettura DB - fail-soft su null, stesso
  // principio di ogni altro effetto collaterale non bloccante di questo
  // progetto (il .catch qui sostituisce il try/catch precedente per poter
  // stare dentro il Promise.all senza perdere il comportamento fail-soft).
  const [ruoli, emailSegreteria] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    leggiEmailSegreteria().catch((err) => {
      console.error(err);
      return null;
    }),
  ]);

  return (
    <main className="pagina-form">
      <div className="riquadro-form">
        <TitoloPagina
          titolo="Impostazioni"
          contenuto={contenutoPerRotta("/app/impostazioni", ruoli)}
        />
        <ul className={styles.lista}>
          {voci.map((voce) => (
            <li key={voce.href}>
              <Link href={voce.href} className={styles.link}>
                {voce.label}
              </Link>
            </li>
          ))}
        </ul>
        <h2 className={styles.titoloSezione}>Email Segreteria</h2>
        {/* Review fix (Blind Hunter): la notifica di nuovo certificato
            caricato (Story 4.3) e' silenziosa quando questo campo non e'
            configurato (AC #3, per design) - senza un avviso esplicito qui,
            un Admin non avrebbe modo di scoprire che nessuna email parte
            piu', nemmeno se ha gia' assegnato il Ruolo Segreteria (che dopo
            questa storia non ha piu' alcun effetto su questa notifica). */}
        {!emailSegreteria && (
          <p className={styles.avviso}>
            Email Segreteria non configurata: le notifiche di nuovo
            Certificato Medico caricato non verranno inviate finché non
            imposti un indirizzo qui sotto.
          </p>
        )}
        <EmailSegreteriaForm emailAttuale={emailSegreteria} />
      </div>
    </main>
  );
}
