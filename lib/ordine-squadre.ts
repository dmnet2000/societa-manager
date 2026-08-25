import "server-only";
import { prisma } from "@/lib/prisma";

// Story 19.15 (Epic 19, Ruolo Site Manager): funzioni di lettura/scrittura
// per l'ordine dei Gruppo (prisma/schema.prisma) sulla pagina pubblica
// /squadre - mirror strutturale di lib/menu-pubblico.ts (Story 19.6/19.7).
// Gruppo non e' protetta da RLS (AD-9, tabella strutturale gia' esistente) -
// accesso solo via Prisma diretto, stesso trattamento di VoceMenuPubblico.

// Elenco ordinato dei Gruppi di UNA stagione (annoAgonisticoId) - "ordine" e'
// scoped per stagione, mai un contatore globale (Design Notes della spec:
// stagioni diverse hanno insiemi di Gruppi indipendenti, mai mostrati insieme
// in nessuna pagina esistente).
// Review fix (Edge Case Hunter): "ordine" da solo non e' un criterio stabile
// se due Gruppi hanno lo stesso valore (es. un duplicato transitorio non
// ancora corretto) - "nome" come secondo criterio rende il risultato
// deterministico, cosi' l'indice calcolato da spostaGruppoAction su una
// rilettura corrisponde sempre a quanto l'Admin vede nella pagina gia'
// renderizzata.
export async function elencaGruppiOrdinati(annoAgonisticoId: string) {
  return prisma.gruppo.findMany({
    where: { annoAgonisticoId },
    orderBy: [{ ordine: "asc" }, { nome: "asc" }],
  });
}

// idInOrdine: gli id di TUTTI i Gruppi della stagione, nel nuovo ordine
// desiderato - riscrive "ordine" per ciascuno col proprio indice nell'array,
// in un'unica transazione (nessuno stato intermedio con ordini duplicati
// osservabile da un'altra lettura concorrente). Mirror esatto di
// riordinaVociMenuPubblico (lib/menu-pubblico.ts).
export async function riordinaGruppi(idInOrdine: string[]): Promise<void> {
  await prisma.$transaction(
    idInOrdine.map((id, ordine) =>
      prisma.gruppo.update({ where: { id }, data: { ordine } })
    )
  );
}
