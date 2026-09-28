import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sincronizzaCampionatoFipav } from "@/lib/sincronizza-gare-fipav/sincronizza";
import { leggiFrequenzaSincronizzazioneFipavOre } from "@/lib/configurazione-applicazione";

// Review fix (mirror di app/api/cron/promemoria-certificati/route.ts, Story
// 4.6): confronto a tempo costante per l'unico segreto che protegge questo
// endpoint pubblicamente raggiungibile - un `!==` su stringa espone il tempo
// di risposta come canale laterale sulla lunghezza/prefisso corretto del
// segreto. Buffer di lunghezza diversa falliscono prima del confronto a
// tempo costante (la lunghezza non e' il segreto, solo il contenuto lo e').
function segretoValido(fornito: string | null, atteso: string): boolean {
  if (!fornito) return false;
  const bufferFornito = Buffer.from(fornito);
  const bufferAtteso = Buffer.from(atteso);
  if (bufferFornito.length !== bufferAtteso.length) return false;
  return timingSafeEqual(bufferFornito, bufferAtteso);
}

// Story 10.12 (Design Notes): fallback quando l'Admin non ha mai impostato
// una cadenza da /app/impostazioni.
const FREQUENZA_FALLBACK_ORE = 24;
const MILLISECONDI_PER_ORA = 60 * 60 * 1000;

type CampionatoDaSincronizzare = {
  id: string;
  gruppoId: string;
  linkFipav: string;
  ultimaSincronizzazioneFipavIl: Date | null;
};

// Il meno recentemente sincronizzato per primo (mai sincronizzato = sempre
// per primo) - stesso principio di una coda FIFO per-Campionato.
function ilPiuVecchioPrimo(a: CampionatoDaSincronizzare, b: CampionatoDaSincronizzare): number {
  if (!a.ultimaSincronizzazioneFipavIl && !b.ultimaSincronizzazioneFipavIl) return 0;
  if (!a.ultimaSincronizzazioneFipavIl) return -1;
  if (!b.ultimaSincronizzazioneFipavIl) return 1;
  return a.ultimaSincronizzazioneFipavIl.getTime() - b.ultimaSincronizzazioneFipavIl.getTime();
}

// Story 10.12 (review fix, 2026-09-28): bug di produzione osservato dopo il
// primo tentativo reale - elaborare TUTTI i Campionati nella stessa
// invocazione (prima in sequenza, poi in parallelo) rischiava sia un
// timeout lato workflow GitHub Actions sia di bombardare il portale FIPAV
// con piu' richieste ravvicinate. Corretto elaborando UN SOLO Campionato
// per invocazione - quello con `ultimaSincronizzazioneFipavIl` piu' vecchio
// (o mai sincronizzato), tra quelli la cui finestra di frequenza e'
// trascorsa - invocato ogni 10 minuti da
// .github/workflows/sincronizza-fipav.yml invece che ogni ora: con piu'
// Campionati, la rotazione completa richiede piu' battiti, mai una raffica
// di richieste simultanee/ravvicinate allo stesso portale di terzi.
// `frequenzaSincronizzazioneFipavOre` (ConfigurazioneApplicazione,
// editabile da /app/impostazioni) governa ancora ogni quante ore un
// singolo Campionato viene ri-sincronizzato, non piu' un'unica esecuzione
// globale.
export async function GET(request: NextRequest) {
  const segretoAtteso = process.env.CRON_SECRET;
  const autorizzazione = request.headers.get("authorization");

  if (!segretoAtteso || !segretoValido(autorizzazione, `Bearer ${segretoAtteso}`)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Un solo "ora" per l'intera esecuzione (mai piu' letture indipendenti di
  // new Date()) - stesso principio "oggi esplicito" gia' stabilito da
  // promemoria-certificati/route.ts.
  const ora = new Date();

  let frequenzaOre: number | null;
  let campionati: CampionatoDaSincronizzare[];
  try {
    [frequenzaOre, campionati] = await Promise.all([
      leggiFrequenzaSincronizzazioneFipavOre(),
      prisma.campionato.findMany({
        where: { linkFipav: { not: null } },
        select: {
          id: true,
          gruppoId: true,
          linkFipav: true,
          ultimaSincronizzazioneFipavIl: true,
        },
      }) as Promise<CampionatoDaSincronizzare[]>,
    ]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "LETTURA_FALLITA" }, { status: 500 });
  }

  const frequenzaEffettiva = frequenzaOre ?? FREQUENZA_FALLBACK_ORE;

  const dovuti = campionati.filter((c) => {
    if (!c.ultimaSincronizzazioneFipavIl) return true;
    const oreTrascorse =
      (ora.getTime() - c.ultimaSincronizzazioneFipavIl.getTime()) / MILLISECONDI_PER_ORA;
    return oreTrascorse >= frequenzaEffettiva;
  });

  if (dovuti.length === 0) {
    return NextResponse.json({
      eseguito: false,
      motivo:
        campionati.length === 0
          ? "Nessun Campionato con un link FIPAV impostato."
          : `Tutti i ${campionati.length} Campionati sono stati sincronizzati entro la cadenza configurata (${frequenzaEffettiva}h) - salto questa esecuzione.`,
    });
  }

  const campionato = [...dovuti].sort(ilPiuVecchioPrimo)[0];

  let risultato;
  try {
    risultato = await sincronizzaCampionatoFipav({
      gruppoId: campionato.gruppoId,
      campionatoId: campionato.id,
      linkFipav: campionato.linkFipav,
    });
  } catch (err) {
    console.error(`sincronizza-fipav (cron): Campionato ${campionato.id} fallito`, err);
    return NextResponse.json({
      eseguito: true,
      campionatoId: campionato.id,
      esito: "fallito",
    });
  }

  if ("error" in risultato) {
    console.error(
      `sincronizza-fipav (cron): Campionato ${campionato.id} fallito - ${risultato.error.message}`
    );
    return NextResponse.json({
      eseguito: true,
      campionatoId: campionato.id,
      esito: "fallito",
      errore: risultato.error.message,
    });
  }

  // Aggiornato SOLO su successo (mai su un fallimento sopra) - un
  // Campionato fallito viene ritentato al battito successivo (10 minuti
  // dopo), non bloccato per l'intera finestra di frequenza come sarebbe
  // se il timestamp avanzasse comunque.
  try {
    await prisma.campionato.update({
      where: { id: campionato.id },
      data: { ultimaSincronizzazioneFipavIl: ora },
    });
  } catch (err) {
    console.error(
      `sincronizza-fipav (cron): aggiornamento timestamp fallito per il Campionato ${campionato.id}`,
      err
    );
    return NextResponse.json({ error: "SCRITTURA_FALLITA" }, { status: 500 });
  }

  return NextResponse.json({
    eseguito: true,
    campionatoId: campionato.id,
    esito: "riuscito",
    creati: risultato.create,
    aggiornati: risultato.aggiornate,
    bloccati: risultato.bloccate,
    scartati: risultato.scartate.length,
  });
}
