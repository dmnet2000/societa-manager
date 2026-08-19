import "server-only";
import { prisma } from "@/lib/prisma";

// Story 19.6 (Epic 19, Ruolo Site Manager): funzioni di lettura/scrittura
// per VoceMenuPubblico (prisma/schema.prisma) - tabella strutturale (AD-9),
// nessuna RLS/policy, accesso solo via Prisma diretto. Nessuna UI collegata
// ancora (Story 19.7 costruira' il Server Action che chiama queste
// funzioni), nessuna lettura da app/NavPubblica.tsx ancora (Story 19.8) -
// mirror del principio "fondazione senza consumer reale" gia' seguito in
// Story 12.1/15.1. Nessuna validazione qui (lunghezza etichetta, formato
// URL): stessa separazione dei livelli gia' stabilita da
// lib/configurazione-applicazione.ts, la validazione vive nel Server
// Action che chiamera' queste funzioni (Story 19.7).

export async function elencaVociMenuPubblico() {
  return prisma.voceMenuPubblico.findMany({ orderBy: { ordine: "asc" } });
}

export async function creaVoceMenuPubblico(dati: {
  etichetta: string;
  url: string;
}) {
  // Nuova voce sempre in coda: l'ordine e' il max esistente + 1 (0 se la
  // tabella e' vuota, caso che dopo il seed di questa storia non si
  // verifica mai in produzione ma resta corretto in isolamento/test).
  const aggregato = await prisma.voceMenuPubblico.aggregate({
    _max: { ordine: true },
  });
  const ordine = (aggregato._max.ordine ?? -1) + 1;

  return prisma.voceMenuPubblico.create({
    data: { ...dati, ordine },
  });
}

export async function aggiornaVoceMenuPubblico(
  id: string,
  dati: { etichetta: string; url: string }
): Promise<void> {
  await prisma.voceMenuPubblico.update({ where: { id }, data: dati });
}

export async function impostaVisibileVoceMenuPubblico(
  id: string,
  visibile: boolean
): Promise<void> {
  await prisma.voceMenuPubblico.update({ where: { id }, data: { visibile } });
}

// idInOrdine: gli id di TUTTE le voci, nel nuovo ordine desiderato -
// riscrive "ordine" per ciascuna col proprio indice nell'array, in
// un'unica transazione (nessuno stato intermedio con ordini duplicati
// osservabile da un'altra lettura concorrente).
export async function riordinaVociMenuPubblico(
  idInOrdine: string[]
): Promise<void> {
  await prisma.$transaction(
    idInOrdine.map((id, ordine) =>
      prisma.voceMenuPubblico.update({ where: { id }, data: { ordine } })
    )
  );
}
