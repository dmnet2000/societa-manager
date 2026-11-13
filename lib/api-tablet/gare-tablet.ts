import "server-only";
import type { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import type { Gara } from "./contratto";
import { autenticaTablet } from "./autenticazione";
import { rispostaErroreTablet } from "./risposta-errore";

// Story 2.6 (epic tablet-collegato, AD-2, AD-15): le gare del tablet
// chiamante, dalle assegnazioni della story 2.5. Solo i dati del contratto:
// nessun dato personale (rose, refertista, risultati).

// select, non include: della partita si leggono solo i campi del contratto,
// mai refertista o risultati.
const SELECT_ASSEGNAZIONE = {
  epoca: true,
  partitaTorneo: {
    select: {
      id: true,
      numero: true,
      categoriaTorneo: { select: { nome: true } },
      squadraCasa: { select: { nome: true } },
      squadraOspite: { select: { nome: true } },
      slotTorneo: {
        select: {
          data: true,
          ora: true,
          palestra: { select: { nome: true } },
          campo: { select: { nome: true } },
        },
      },
    },
  },
} as const;

// Ordine: data, ora, numero; le gare senza orario in fondo. data
// (AAAA-MM-GG) e ora (HH:MM) si confrontano come testo.
function confrontaGare(a: Gara, b: Gara): number {
  if (a.data !== b.data) {
    if (a.data === null) return 1;
    if (b.data === null) return -1;
    return a.data < b.data ? -1 : 1;
  }
  if (a.ora !== b.ora) {
    if (a.ora === null) return 1;
    if (b.ora === null) return -1;
    return a.ora < b.ora ? -1 : 1;
  }
  return a.numero - b.numero;
}

/** Le gare assegnate oggi al tablet `utenteId` (id della riga Utente), con la loro epoca. */
export async function elencaGareTablet(utenteId: string): Promise<Gara[]> {
  const righe = await prisma.assegnazioneTablet.findMany({
    where: { utenteId },
    select: SELECT_ASSEGNAZIONE,
  });

  return righe
    .map(({ epoca, partitaTorneo: p }): Gara => {
      const slot = p.slotTorneo;
      return {
        garaId: p.id,
        epoca,
        numero: p.numero,
        categoria: p.categoriaTorneo.nome,
        casa: p.squadraCasa.nome,
        ospite: p.squadraOspite.nome,
        data: slot?.data ?? null,
        ora: slot?.ora ?? null,
        luogo: slot ? (slot.campo ? `${slot.palestra.nome} - ${slot.campo.nome}` : slot.palestra.nome) : null,
      };
    })
    .sort(confrontaGare);
}

export type EsitoAutorizzazioneGara =
  | { ok: true; utente: User; utenteId: string; garaId: string; epoca: number }
  | { ok: false; risposta: NextResponse };

const MESSAGGIO_RIASSEGNATA =
  "Questa gara non è più assegnata a questo tablet. Chiedi all'organizzatore.";

/**
 * Controllo unico per gli endpoint che scrivono su una gara (AD-2): token,
 * utente attivo, ruolo TABLET (autenticaTablet), poi la gara deve essere
 * assegnata a questo tablet con questa epoca. Altrimenti 409 RIASSEGNATA,
 * con lo stesso messaggio per gara di un altro, senza assegnazione o
 * inesistente (non rivela quali gare esistono). Errore del database: 500
 * INTERNAL.
 */
export async function autorizzaGaraTablet(
  request: Request,
  garaId: string,
  epoca: number
): Promise<EsitoAutorizzazioneGara> {
  const autenticazione = await autenticaTablet(request);
  if (!autenticazione.ok) return autenticazione;

  try {
    const riga = await prisma.assegnazioneTablet.findUnique({
      where: { partitaTorneoId: garaId },
      select: { utenteId: true, epoca: true },
    });
    if (!riga || riga.utenteId !== autenticazione.utenteId || riga.epoca !== epoca) {
      console.warn("api-tablet RIASSEGNATA");
      return {
        ok: false,
        risposta: rispostaErroreTablet("RIASSEGNATA", MESSAGGIO_RIASSEGNATA, 409),
      };
    }
    return {
      ok: true,
      utente: autenticazione.utente,
      utenteId: autenticazione.utenteId,
      garaId,
      epoca,
    };
  } catch {
    console.error("api-tablet INTERNAL motivo=ASSEGNAZIONE_NON_LEGGIBILE");
    return {
      ok: false,
      risposta: rispostaErroreTablet("INTERNAL", "Errore del server. Riprova.", 500),
    };
  }
}
