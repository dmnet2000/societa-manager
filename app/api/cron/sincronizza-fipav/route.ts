import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sincronizzaCampionatoFipav } from "@/lib/sincronizza-gare-fipav/sincronizza";
import {
  leggiFrequenzaSincronizzazioneFipavOre,
  leggiUltimaSincronizzazioneFipavAutomaticaIl,
  segnaSincronizzazioneFipavAutomaticaEseguita,
} from "@/lib/configurazione-applicazione";

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

// Story 10.12: mirror diretto di app/api/cron/promemoria-certificati/route.ts
// (Story 4.6) - stesso CRON_SECRET (riusato, non un nuovo segreto), stesso
// timingSafeEqual, stesso fail-closed se la variabile non e' configurata.
// Chiamato ogni ora dal workflow GitHub Actions schedulato
// (.github/workflows/sincronizza-fipav.yml), ma la cadenza REALE e' decisa
// qui (ConfigurazioneApplicazione.frequenzaSincronizzazioneFipavOre,
// fallback 24 ore) - se la finestra non e' trascorsa, nessuna richiesta al
// portale FIPAV viene tentata, risposta esplicita { eseguito: false }.
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
  let ultimaEsecuzione: Date | null;
  try {
    [frequenzaOre, ultimaEsecuzione] = await Promise.all([
      leggiFrequenzaSincronizzazioneFipavOre(),
      leggiUltimaSincronizzazioneFipavAutomaticaIl(),
    ]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "LETTURA_FALLITA" }, { status: 500 });
  }

  const frequenzaEffettiva = frequenzaOre ?? FREQUENZA_FALLBACK_ORE;

  if (ultimaEsecuzione) {
    const oreTrascorse = (ora.getTime() - ultimaEsecuzione.getTime()) / MILLISECONDI_PER_ORA;
    if (oreTrascorse < frequenzaEffettiva) {
      return NextResponse.json({
        eseguito: false,
        motivo: `Ultima sincronizzazione automatica ${oreTrascorse.toFixed(1)}h fa, cadenza configurata ${frequenzaEffettiva}h - salto questa esecuzione.`,
      });
    }
  }

  let campionati: Array<{ id: string; gruppoId: string; linkFipav: string | null }>;
  try {
    campionati = await prisma.campionato.findMany({
      where: { linkFipav: { not: null } },
      select: { id: true, gruppoId: true, linkFipav: true },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "LETTURA_FALLITA" }, { status: 500 });
  }

  let sincronizzati = 0;
  let falliti = 0;
  let creati = 0;
  let aggiornati = 0;
  let bloccati = 0;
  // Review fix (Edge Case Hunter): risultato.scartate veniva ignorato -
  // righe scartate durante un'esecuzione automatica non presidiata
  // restavano invisibili (a differenza del bottone manuale, che le mostra
  // in UI, Story 10.11). Solo un conteggio nel riepilogo, non l'elenco
  // completo (mirror dello stile creati/aggiornati/bloccati sopra).
  let scartati = 0;

  // AC #5: un Campionato che fallisce (portale irraggiungibile, formato
  // cambiato) non blocca gli altri - fail-soft per Campionato, mirror di
  // promemoria-certificati/route.ts (fail-soft per Certificato).
  for (const campionato of campionati) {
    if (!campionato.linkFipav) continue; // findMany filtra gia' su not:null, narrowing per TypeScript.
    try {
      const risultato = await sincronizzaCampionatoFipav({
        gruppoId: campionato.gruppoId,
        campionatoId: campionato.id,
        linkFipav: campionato.linkFipav,
      });
      if ("error" in risultato) {
        console.error(
          `sincronizza-fipav (cron): Campionato ${campionato.id} fallito - ${risultato.error.message}`
        );
        falliti += 1;
        continue;
      }
      sincronizzati += 1;
      creati += risultato.create;
      aggiornati += risultato.aggiornate;
      bloccati += risultato.bloccate;
      scartati += risultato.scartate.length;
    } catch (err) {
      console.error(`sincronizza-fipav (cron): Campionato ${campionato.id} fallito`, err);
      falliti += 1;
    }
  }

  // AD boundaries (spec-10-12): aggiornato SOLO quando l'endpoint esegue
  // davvero (questo ramo) - mai su uno skip sopra, mai dal bottone manuale
  // (Story 10.11, invariato e indipendente).
  // Review fix (Edge Case Hunter): try/catch aggiunto - senza, un fallimento
  // di questa singola scrittura (dopo che la sincronizzazione di ogni
  // Campionato e' gia' riuscita) lanciava un'eccezione non gestita, perdendo
  // il riepilogo JSON già pronto invece di restituirlo comunque.
  try {
    await segnaSincronizzazioneFipavAutomaticaEseguita(ora);
  } catch (err) {
    console.error("sincronizza-fipav (cron): aggiornamento timestamp fallito", err);
    return NextResponse.json({ error: "SCRITTURA_FALLITA" }, { status: 500 });
  }

  return NextResponse.json({
    eseguito: true,
    campionatiTotali: campionati.length,
    sincronizzati,
    falliti,
    creati,
    aggiornati,
    bloccati,
    scartati,
  });
}
