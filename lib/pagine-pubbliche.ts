import "server-only";
import { prisma } from "@/lib/prisma";
import { sanitizzaHtml } from "@/lib/sanitizza-html";

// Story 19.9 (Epic 19, Ruolo Site Manager): funzioni di lettura per
// PaginaPubblica (prisma/schema.prisma) - tabella strutturale (AD-9),
// nessuna RLS/policy, accesso solo via Prisma diretto. Mirror strutturale di
// lib/menu-pubblico.ts. Nessuna scrittura qui (creazione/modifica arrivano
// con la Story 19.10, che aggiungera' creaPaginaPubblica/
// aggiornaPaginaPubblica/eliminaPaginaPubblica in questo stesso file) -
// questa storia costruisce solo il rendering pubblico.

// Story 19.10: elenco completo per la futura pagina di gestione
// /app/pagine-pubbliche.
export async function elencaPaginePubbliche() {
  return prisma.paginaPubblica.findMany({ orderBy: { titolo: "asc" } });
}

// Usata dalla rotta catch-all app/[...slug]/page.tsx per risolvere un URL a
// runtime - null quando nessuna Pagina corrisponde (notFound() lato
// chiamante, comportamento 404 di oggi, invariato).
export async function trovaPaginaPubblicaPerSlug(slug: string) {
  return prisma.paginaPubblica.findUnique({ where: { slug } });
}

// Code review (Verification Gap + Blind Hunter, indipendentemente): estratta
// da app/[...slug]/page.tsx apposta per essere testabile - senza questa
// estrazione nessun test del repo esercitava davvero la riga che sanitizza
// al render (prima e unica occorrenza di dangerouslySetInnerHTML nel
// progetto), quindi una regressione a un giorno futuro (es. passare
// pagina.contenutoHtml grezzo invece del risultato sanitizzato) sarebbe
// passata con la suite Vitest tutta verde. Mirror del principio gia' seguito
// da lib/sanitizza-html.ts stesso: logica di sicurezza fuori dal componente
// React, dove resta unit-testabile senza infrastruttura di render (il
// progetto non ha mai usato @testing-library/react).
export function contenutoSanitizzatoPaginaPubblica(pagina: {
  contenutoHtml: string;
}): string {
  return sanitizzaHtml(pagina.contenutoHtml);
}

// Story 19.10: serve alla pagina di modifica (/app/pagine-pubbliche/[id])
// per precaricare l'editor, e all'azione di aggiornamento per confrontare lo
// slug inviato con quello gia' salvato - stesso motivo/stesso pattern di
// trovaVoceMenuPubblicoPerId (lib/menu-pubblico.ts, Story 19.7/19.9):
// permette di risalvare la STESSA Pagina con lo stesso slug invariato senza
// urtare contro rottaRiservata() quando lo slug non e' davvero cambiato.
export async function trovaPaginaPubblicaPerId(id: string) {
  return prisma.paginaPubblica.findUnique({ where: { id } });
}

// Nessuna validazione qui (lunghezza titolo, formato/riserva dello slug,
// sanitizzazione del contenuto) - stessa separazione di livelli gia'
// stabilita da lib/menu-pubblico.ts: vive nel Server Action che chiama
// questa funzione (app/app/(configurazione)/pagine-pubbliche/actions.ts).
export async function creaPaginaPubblica(dati: {
  titolo: string;
  slug: string;
  contenutoHtml: string;
}) {
  return prisma.paginaPubblica.create({ data: dati });
}

export async function aggiornaPaginaPubblica(
  id: string,
  dati: { titolo: string; slug: string; contenutoHtml: string }
): Promise<void> {
  await prisma.paginaPubblica.update({ where: { id }, data: dati });
}

// Hard delete (nessuno stato "bozza"/soft-delete per PaginaPubblica, deciso
// in party mode - vedi spec-19-10, sezione Never): una volta rimossa, l'URL
// torna a mostrare il 404 di oggi (app/[...slug]/page.tsx, trovaPaginaPubblicaPerSlug
// torna null).
export async function eliminaPaginaPubblica(id: string): Promise<void> {
  await prisma.paginaPubblica.delete({ where: { id } });
}
