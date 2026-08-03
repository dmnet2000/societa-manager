import "server-only";
import { prisma } from "@/lib/prisma";

// Story 4.6 (FR-16): destinatari del promemoria scadenza Certificato Medico
// per una singola Atleta - Genitore e Atleta-se-stessa vengono dalla stessa
// tabella GenitoreAtleta (non RLS-protetta, AD-9), indistinti da autoAggancio
// (entrambi sono persone da avvisare, nessun AC richiede di trattarli
// diversamente qui). L'Allenatore e' scoped ai Gruppi dell'Anno Agonistico
// indicato (annoAgonisticoId), transitivamente via GruppoAtleta (AD-8) - se
// annoAgonisticoId e' null (nessun Anno Agonistico corrente risolvibile),
// nessuna query GruppoAtleta viene eseguita, solo Genitore/Atleta restano.
// Review fix (code review Story 9.21): findMany, non findFirst - da quando
// un'Atleta puo' essere assegnata a piu' Gruppi contemporaneamente nella
// stessa stagione, un findFirst senza gruppoId avrebbe scelto una riga
// arbitraria e notificato gli Allenatori di un solo Gruppo, non di tutti.
// Dirigente NON e' incluso qui (a differenza di Genitore/Atleta/Allenatore):
// non e' scoped all'Atleta, va risolto a parte con elencaEmailPerRuolo
// ("DIRIGENTE") dal chiamante. Solo Utenti attivi (stesso principio di
// elencaEmailPerRuolo); un Allenatore non ancora agganciato a un Utente
// (utenteId null, Story 1.4) e' escluso, non e' un errore. Deduplica
// (Set) prima di restituire - la stessa persona puo' comparire piu' volte
// (es. un Genitore che e' anche Allenatore del Gruppo della propria figlia).
export async function elencaEmailCollegateAdAtleta(
  atletaId: string,
  annoAgonisticoId: string | null
): Promise<string[]> {
  const email = new Set<string>();

  const genitori = await prisma.genitoreAtleta.findMany({
    where: { atletaId },
    select: { utente: { select: { email: true, attivo: true } } },
  });

  for (const riga of genitori) {
    if (riga.utente.attivo) {
      // Review fix: normalizza in minuscolo prima di deduplicare - due
      // indirizzi che differiscono solo per maiuscole/minuscole sono la
      // stessa casella per qualunque provider reale.
      email.add(riga.utente.email.toLowerCase());
    }
  }

  if (annoAgonisticoId) {
    const righeGruppoAtleta = await prisma.gruppoAtleta.findMany({
      where: { atletaId, annoAgonisticoId },
      select: {
        gruppo: {
          select: {
            allenatori: {
              select: {
                allenatore: { select: { utente: { select: { email: true, attivo: true } } } },
              },
            },
          },
        },
      },
    });

    for (const riga of righeGruppoAtleta) {
      for (const ga of riga.gruppo.allenatori) {
        const utente = ga.allenatore.utente;
        if (utente?.attivo) {
          email.add(utente.email.toLowerCase());
        }
      }
    }
  }

  return Array.from(email);
}
