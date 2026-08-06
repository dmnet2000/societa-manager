import type { StatoCertificato } from "@prisma/client";
import { categorizzaStatoCertificato } from "@/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato";

type RigaCertificato = {
  atletaId: string;
  dataFineValidita: string | null;
  stato: string | null;
};

type AtletaMinima = { id: string; nome: string };

// Story 9.19 code review: estratto perche' era duplicato identico in
// gruppi/page.tsx e i-miei-gruppi/page.tsx - stesso principio di estrazione
// gia' stabilito nel progetto (lib/link-naviga-palestra.ts, lib/data-italiana.ts).
// Riusa categorizzaStatoCertificato (Story 5.1): "in scadenza" richiede
// stato CONFERMATO, deciso con l'utente in fase di creazione di questa storia
// - non un nuovo calcolo di soglia.
// Estensione richiesta dall'utente (2026-08-06, /gruppi): aggiunto anche
// certificatoScaduto (stato === "SCADUTO", gia' calcolato da
// categorizzaStatoCertificato, nessun nuovo calcolo) - entrambi i consumer
// di questa funzione (gruppi/page.tsx, i-miei-gruppi/page.tsx) ricevono ora
// il campo, ma solo /gruppi lo consuma davvero (Task richiesto solo li').
export function calcolaAtleteConCertificatoInScadenza(
  atlete: AtletaMinima[],
  certificati: RigaCertificato[],
  oggi: Date
): (AtletaMinima & { certificatoInScadenza: boolean; certificatoScaduto: boolean })[] {
  const certificatoPerAtletaId = new Map(certificati.map((c) => [c.atletaId, c]));

  return atlete.map((atleta) => {
    const certificato = certificatoPerAtletaId.get(atleta.id);
    const stato = categorizzaStatoCertificato(
      certificato?.dataFineValidita ?? null,
      (certificato?.stato as StatoCertificato | null) ?? null,
      oggi
    );
    return {
      ...atleta,
      certificatoInScadenza: stato === "IN_SCADENZA",
      certificatoScaduto: stato === "SCADUTO",
    };
  });
}
