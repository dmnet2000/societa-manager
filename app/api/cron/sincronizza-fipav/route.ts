import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sincronizzaCampionatoFipav } from "@/lib/sincronizza-gare-fipav/sincronizza";

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

// Richiesta utente 2026-10-01: sincronizzazione una volta al giorno (ciclo
// notturno delle 2:00 ora italiana guidato da cron-worker/src/index.ts),
// non piu' un battito ogni 10 minuti con una cadenza per-Campionato. Ogni
// chiamata elabora ancora UN SOLO Campionato (mai tutti insieme, review fix
// Story 10.12: timeout e raffica di richieste al portale FIPAV): il Worker
// richiama questo endpoint in sequenza, con 1 minuto di pausa tra un
// Campionato e l'altro, finche' `rimanenti` non arriva a 0.
// - `dal` (ISO, obbligatorio): inizio del ciclo - sono "dovuti" i Campionati
//   mai sincronizzati o sincronizzati prima di questo istante, cosi' un
//   Campionato gia' fatto in questo ciclo non viene ripreso.
// - `escludi` (id separati da virgola, facoltativo): Campionati falliti in
//   questo stesso giro del Worker, da non ritentare subito (il timestamp non
//   avanza su un fallimento: senza esclusione verrebbero ripresi a ogni
//   chiamata).
// La cadenza e' fissa, una volta per notte: la vecchia impostazione
// "ogni quante ore" (ConfigurazioneApplicazione.frequenzaSincronizzazioneFipavOre)
// e' stata rimossa da /app/impostazioni insieme al suo codice.
export async function GET(request: NextRequest) {
  const segretoAtteso = process.env.CRON_SECRET;
  const autorizzazione = request.headers.get("authorization");

  if (!segretoAtteso || !segretoValido(autorizzazione, `Bearer ${segretoAtteso}`)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const parametri = request.nextUrl.searchParams;
  const dal = new Date(parametri.get("dal") ?? "");
  if (Number.isNaN(dal.getTime())) {
    return NextResponse.json({ error: "PARAMETRO_DAL_NON_VALIDO" }, { status: 400 });
  }
  const escludi = new Set(
    (parametri.get("escludi") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );

  // Un solo "ora" per l'intera esecuzione (mai piu' letture indipendenti di
  // new Date()) - stesso principio "oggi esplicito" gia' stabilito da
  // promemoria-certificati/route.ts.
  const ora = new Date();

  let campionati: CampionatoDaSincronizzare[];
  try {
    campionati = (await prisma.campionato.findMany({
      where: { linkFipav: { not: null } },
      select: {
        id: true,
        gruppoId: true,
        linkFipav: true,
        ultimaSincronizzazioneFipavIl: true,
      },
    })) as CampionatoDaSincronizzare[];
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "LETTURA_FALLITA" }, { status: 500 });
  }

  const dovuti = campionati
    .filter((c) => !escludi.has(c.id))
    .filter((c) => !c.ultimaSincronizzazioneFipavIl || c.ultimaSincronizzazioneFipavIl < dal)
    .sort(ilPiuVecchioPrimo);

  if (dovuti.length === 0) {
    return NextResponse.json({
      eseguito: false,
      rimanenti: 0,
      motivo:
        campionati.length === 0
          ? "Nessun Campionato con un link FIPAV impostato."
          : `Nessun Campionato da sincronizzare in questo ciclo (${campionati.length} con link FIPAV).`,
    });
  }

  const [campionato, ...altri] = dovuti;
  // Dopo questa chiamata restano gli altri dovuti, qualunque sia l'esito di
  // questo (un fallito viene escluso dal Worker per il resto del giro).
  const rimanenti = altri.length;

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
      rimanenti,
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
      rimanenti,
    });
  }

  // Aggiornato SOLO su successo (mai su un fallimento sopra) - un
  // Campionato fallito resta "dovuto" e viene ritentato alla ripresa
  // successiva del ciclo (cron-worker, ogni 15 minuti durante le 2:00).
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
    rimanenti,
  });
}
