import type { StatoCertificato } from "@/generated/prisma/client";
import { calcolaGiorniAScadenza } from "@/app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza";

// Story 5.1 (FR-29): riusa calcolaGiorniAScadenza (Story 4.6) invece di
// reimplementare una terza volta il confronto data di calendario
// Europe/Rome (dopo certificato-scaduto.ts, Story 4.5) - vedi Prerequisito
// #2 della storia. Soglia di 30 giorni per "in scadenza": stessa soglia
// gia' usata da FR-16/Story 4.6, non un nuovo numero scelto qui.
export type StatoCertificatoAggregato =
  | "IN_REGOLA"
  | "IN_SCADENZA"
  | "SCADUTO"
  | "SENZA_CERTIFICATO";

// Review fix (AC #2/#3): "in regola"/"in scadenza" si applicano solo a un
// Certificato CONFERMATO - un Certificato IN_ATTESA (es. ri-caricato, Story
// 4.4, che preserva la vecchia dataFineValidita finche' non riconfermato)
// non deve mai apparire "in regola" solo perche' la data preesistente e'
// ancora futura: verrebbe nascosta l'informazione che serve una nuova
// conferma. "Scaduto" resta l'unica eccezione state-agnostica (AC #4,
// stesso principio di certificato-scaduto.ts, Story 4.5): una data passata
// e' un rischio da segnalare indipendentemente dallo stato di conferma.
export function categorizzaStatoCertificato(
  dataFineValidita: string | null,
  stato: StatoCertificato | null,
  oggi: Date
): StatoCertificatoAggregato {
  const giorni = calcolaGiorniAScadenza(dataFineValidita, oggi);
  if (giorni === null || Number.isNaN(giorni)) return "SENZA_CERTIFICATO";
  if (giorni < 0) return "SCADUTO";
  if (stato !== "CONFERMATO") return "SENZA_CERTIFICATO";
  if (giorni <= 30) return "IN_SCADENZA";
  return "IN_REGOLA";
}
