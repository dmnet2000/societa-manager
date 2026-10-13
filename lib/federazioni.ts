import "server-only";
import { prisma } from "@/lib/prisma";

// Story 26.1 (Epic 26, Tesseramento multi-Federazione): lettura/scrittura
// di Federazione (prisma/schema.prisma) - tabella strutturale (AD-9),
// accesso solo via Prisma diretto. Nessuna validazione qui: stessa
// separazione dei livelli di lib/menu-pubblico.ts, la validazione vive nel
// Server Action (app/app/(configurazione)/federazioni/actions.ts).

// Elenco completo (incluse le disattivate) per la pagina di gestione.
// Review fix: spareggio stabile su createdAt/id - due creazioni concorrenti
// possono ottenere lo stesso "ordine" (aggregate+create non atomici), e
// senza spareggio la pagina e spostaFederazioneAction potrebbero vedere
// ordini diversi per le stesse righe.
export async function elencaFederazioni() {
  return prisma.federazione.findMany({
    orderBy: [{ ordine: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
}

// Univocita' del nome senza distinzione maiuscole/minuscole (il vincolo DB
// @unique copre solo l'uguaglianza esatta). escludiId: in modifica, la
// Federazione stessa non conta come duplicato (es. "FIPAV" -> "Fipav").
export async function trovaFederazionePerNomeInsensitive(
  nome: string,
  escludiId?: string
) {
  return prisma.federazione.findFirst({
    where: {
      nome: { equals: nome, mode: "insensitive" },
      ...(escludiId ? { id: { not: escludiId } } : {}),
    },
  });
}

export async function creaFederazione(dati: {
  nome: string;
  sigla: string | null;
}) {
  // Nuova Federazione sempre in coda, stesso criterio di
  // creaVoceMenuPubblico (lib/menu-pubblico.ts).
  const aggregato = await prisma.federazione.aggregate({
    _max: { ordine: true },
  });
  const ordine = (aggregato._max.ordine ?? -1) + 1;

  return prisma.federazione.create({ data: { ...dati, ordine } });
}

export async function aggiornaFederazione(
  id: string,
  dati: { nome: string; sigla: string | null }
): Promise<void> {
  await prisma.federazione.update({ where: { id }, data: dati });
}

export async function impostaAttivaFederazione(
  id: string,
  attiva: boolean
): Promise<void> {
  await prisma.federazione.update({ where: { id }, data: { attiva } });
}

// idInOrdine: gli id di TUTTE le Federazioni nel nuovo ordine - stessa
// riscrittura transazionale di riordinaVociMenuPubblico.
export async function riordinaFederazioni(idInOrdine: string[]): Promise<void> {
  await prisma.$transaction(
    idInOrdine.map((id, ordine) =>
      prisma.federazione.update({ where: { id }, data: { ordine } })
    )
  );
}

// Il controllo "Federazione in uso" e' responsabilita' del chiamante
// (federazioneInUso, lib/tesseramento.ts) - qui solo la cancellazione.
export async function eliminaFederazione(id: string): Promise<void> {
  await prisma.federazione.delete({ where: { id } });
}
