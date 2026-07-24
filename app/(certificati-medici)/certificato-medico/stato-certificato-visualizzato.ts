import type { StatoCertificato } from "@prisma/client";
import { calcolaGiorniAScadenza } from "@/app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza";

// Story 8.5: cosa mostrare sulla scheda personale del certificato (Genitore/
// Atleta), secondo la tabella "Pattern di Stato" di EXPERIENCE.md - 5 stati,
// piu' fine di categorizzaStatoCertificato (vista-dirigente/, Story 5.1) che
// collassa deliberatamente "nessuno" e IN_ATTESA nello stesso bucket
// SENZA_CERTIFICATO (corretto per l'aggregato del Dirigente, sbagliato qui
// dove vanno distinti testualmente). Riusa calcolaGiorniAScadenza (Story
// 4.6) per il confronto data Europe/Rome - non un quarto confronto data
// reimplementato da zero.
export type StatoCertificatoVisualizzato =
  | { tipo: "nessuno" }
  | { tipo: "in-attesa" }
  | { tipo: "scaduto" }
  | { tipo: "in-scadenza" }
  | { tipo: "in-regola"; dataFineValidita: string | null };

const SOGLIA_GIORNI_IN_SCADENZA = 30;

export function calcolaStatoCertificatoVisualizzato(
  stato: StatoCertificato | null,
  dataFineValidita: string | null,
  oggi: Date
): StatoCertificatoVisualizzato {
  if (!stato) return { tipo: "nessuno" };

  // [NOTA UX APERTA] EXPERIENCE.md: nessuna variante badge e' mai stata
  // assegnata allo stato "in corso" IN_ATTESA - testo semplice, non
  // inventare qui una variante badge.
  if (stato === "IN_ATTESA") return { tipo: "in-attesa" };

  const giorni = calcolaGiorniAScadenza(dataFineValidita, oggi);

  if (giorni === null) return { tipo: "in-regola", dataFineValidita: null };
  if (giorni < 0) return { tipo: "scaduto" };
  if (giorni <= SOGLIA_GIORNI_IN_SCADENZA) return { tipo: "in-scadenza" };
  return { tipo: "in-regola", dataFineValidita };
}
