import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { elencaGruppiConFoto, urlPubblicoFotoSquadra } from "@/lib/storage/foto-squadra";
import { HeaderPubblico } from "../HeaderPubblico";
import { FooterPubblico } from "../FooterPubblico";
import styles from "./squadre.module.css";

// Story 18.8: seconda pagina pubblica reale (dopo la home, Story 18.1-18.7).
// Dati possono cambiare in qualunque momento dalla console Admin - stesso
// motivo di dynamic = "force-dynamic" gia' in uso su "/" (Story 18.1).
export const dynamic = "force-dynamic";

export default async function SquadrePage() {
  // Nessuna sessione qui (pagina pubblica) - stesso principio di "/".
  const [supabase, annoCorrente] = await Promise.all([
    createClient(),
    // Sola lettura (trovaAnnoAgonisticoCorrente, MAI risolviAnnoAgonisticoCorrente
    // in una pagina GET - side-effect di scrittura non ammissibile qui,
    // stesso vincolo gia' rispettato in /app/gruppi/page.tsx e in "/" per
    // la sezione Foto squadra, Story 18.4). Review fix (Blind Hunter + Edge
    // Case Hunter, trovato indipendentemente da entrambi): .catch() fail-soft
    // aggiunto - senza, un errore DB transiente qui fa crashare l'intera
    // pagina invece di degradare al messaggio esplicito gia' previsto
    // dall'AC #4 (che qui si applica anche all'assenza di una stagione
    // corrente, non solo a una stagione senza Gruppi).
    trovaAnnoAgonisticoCorrente().catch((err) => {
      console.error(err);
      return null;
    }),
  ]);

  const [gruppi, fotoPerGruppo] = await Promise.all([
    // AC #1/#2/#3: mirror del filtro/ordinamento gia' in uso in
    // /app/gruppi/page.tsx, ma con "select" (non "include", convenzione
    // public-page stabilita da Story 18.2 in poi) - il confine "cosa e'
    // pubblico" e' imposto dalla query stessa: non tocca mai
    // GruppoAtleta/Atleta, nessun filtro applicativo successivo necessario
    // per rispettare l'AC #2 (nessun dato di Atleta).
    annoCorrente
      ? prisma.gruppo
          .findMany({
            where: { annoAgonisticoId: annoCorrente.id },
            orderBy: { nome: "asc" },
            select: {
              id: true,
              nome: true,
              categoria: true,
              allenatori: {
                select: {
                  allenatore: { select: { id: true, nome: true, cognome: true } },
                },
                orderBy: [
                  { allenatore: { nome: "asc" } },
                  { allenatore: { cognome: "asc" } },
                ],
              },
            },
          })
          .catch((err) => {
            console.error(err);
            return [];
          })
      : Promise.resolve([]),
    // Foto di squadra (nota dell'epica, Story 18.4 gia' done) - una sola
    // chiamata Storage per l'intera pagina, stesso principio gia' in uso
    // in "/" (lib/storage/foto-squadra.ts).
    elencaGruppiConFoto(supabase).catch((err) => {
      console.error(err);
      return new Map<string, string | null>();
    }),
  ]);

  return (
    <>
      <HeaderPubblico />
      <main className={styles.main}>
        <h1 className={styles.titolo}>Squadre</h1>
        {/* AC #4: messaggio esplicito invece di un'area vuota quando non
            c'e' alcun Gruppo per la stagione corrente - qui l'intera
            pagina esiste solo per questo contenuto (a differenza delle
            sezioni opzionali della home, che semplicemente spariscono). */}
        {gruppi.length === 0 ? (
          <p className={styles.messaggioVuoto}>
            Nessuna squadra disponibile per la stagione corrente.
          </p>
        ) : (
          <div className={styles.listaGruppi}>
            {gruppi.map((gruppo) => {
              // Review fix: un solo lookup nella Map (non has() + get()) -
              // undefined distingue "nessuna foto" da "foto con
              // aggiornatoIl null" altrettanto bene di has(), stesso
              // risultato con una chiamata invece di due.
              const fotoInfo = fotoPerGruppo.get(gruppo.id);
              return (
                <div className={styles.schedaGruppo} key={gruppo.id}>
                  {fotoInfo !== undefined ? (
                    <img
                      className={styles.immagineGruppo}
                      src={`${urlPubblicoFotoSquadra(supabase, gruppo.id)}?v=${encodeURIComponent(fotoInfo ?? "")}`}
                      alt={`Foto di squadra di ${gruppo.nome}`}
                    />
                  ) : (
                    // Story 18.12 (AC #5): placeholder intenzionale finché
                    // il Gruppo non carica una foto - distinto dalla
                    // galleria "parziale" della home (Story 18.4 AC #3,
                    // non toccata da questa storia), dove l'assenza di
                    // foto resta invece "nessun placeholder".
                    <div
                      className={styles.placeholderFoto}
                      role="img"
                      aria-label={`Nessuna foto di squadra caricata per ${gruppo.nome}`}
                    />
                  )}
                  <h2 className={styles.nomeGruppo}>{gruppo.nome}</h2>
                  <p className={styles.categoriaGruppo}>{gruppo.categoria}</p>
                  {/* AC #3: un Gruppo senza Allenatori compare comunque,
                      senza elenco staff - nessun filtro sull'array dei
                      Gruppi sopra, solo un rendering condizionale qui. */}
                  {gruppo.allenatori.length > 0 && (
                    <ul className={styles.listaAllenatori}>
                      {gruppo.allenatori.map(({ allenatore }) => (
                        <li key={allenatore.id}>
                          {allenatore.nome} {allenatore.cognome}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <FooterPubblico />
    </>
  );
}
