import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/auth-admin/client";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { elencaGruppiConFoto, urlPubblicoFotoSquadra } from "@/lib/storage/foto-squadra";
import {
  BUCKET_FOTO_ATLETA,
  esisteFotoProfilo,
  generaUrlFirmatoFotoProfilo,
} from "@/lib/storage/foto-profilo";
import { elencaAtletePubbliche } from "@/lib/db-rls/atleta";
import { inizialiNomeCompleto } from "@/lib/iniziali-nome";
import { raggruppaGruppiPerCategoriaContigua } from "@/lib/raggruppa-gruppi-per-categoria";
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

  // Story 18.24: client privilegiato (service-role, bypassa RLS) - la RLS
  // di "atlete" non concede alcun accesso a un Visitatore anonimo, nessuna
  // policy pubblica esiste su quella tabella. Stesso identico riuso di
  // createAdminClient() gia' stabilito per la foto profilo Allenatore in
  // /staff (Story 18.22) - sincrona, nessun await.
  const supabaseAdmin = createAdminClient();

  const [gruppi, fotoPerGruppo, gruppoAtleteRighe, atletePubbliche] = await Promise.all([
    // AC #1/#2/#3: mirror del filtro/ordinamento gia' in uso in
    // /app/gruppi/page.tsx, ma con "select" (non "include", convenzione
    // public-page stabilita da Story 18.2 in poi). Story 18.24 ROVESCIA
    // esplicitamente l'AC #2 originale (su conferma diretta dell'utente,
    // vedi spec-18-24 Intent): questa query NON tocca comunque
    // GruppoAtleta/Atleta direttamente (mai un include verso Atleta che
    // bypasserebbe la RLS attraverso la connessione privilegiata di
    // Prisma) - le Atlete sono lette a parte piu' sotto
    // (elencaAtletePubbliche, client privilegiato esplicito) e unite in
    // memoria, non tramite questa query.
    annoCorrente
      ? prisma.gruppo
          .findMany({
            where: { annoAgonisticoId: annoCorrente.id },
            // Story 19.15 (Epic 19, Ruolo Site Manager): ordinamento
            // configurabile da /app/ordine-squadre (bottoni Su/Giù),
            // sostituisce l'ordine alfabetico fisso di Story 18.8 - la
            // migrazione che introduce Gruppo.ordine esegue un backfill
            // alfabetico per nome, quindi il comportamento resta invariato
            // finché nessuno riordina esplicitamente.
            orderBy: { ordine: "asc" },
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
    // Story 18.24: GruppoAtleta letta via Prisma diretto (non protetta da
    // RLS, AD-9) - solo id/numero necessari per unire in memoria con le
    // Atlete lette sotto (mai un include diretto verso Atleta, che
    // bypasserebbe la RLS attraverso la connessione privilegiata di Prisma
    // invece che tramite elencaAtletePubbliche, spec-18-24 Boundaries).
    annoCorrente
      ? prisma.gruppoAtleta
          .findMany({
            where: { annoAgonisticoId: annoCorrente.id },
            select: { atletaId: true, gruppoId: true, numero: true },
          })
          .catch((err) => {
            console.error(err);
            return [];
          })
      : Promise.resolve([]),
    // Story 18.24: lettura dedicata e ristretta (solo id+nome, mai
    // elencaAtlete che espone codiceFiscale/categoria) - richiede
    // createAdminClient(), la RLS di "atlete" non concede alcun accesso
    // pubblico (spec-18-24 Boundaries). Review fix (Blind Hunter): senza
    // annoCorrente non esiste alcun Gruppo/GruppoAtleta da mostrare (le
    // due query sopra gia' degradano a []) - interpellare comunque questa
    // lettura leggerebbe l'intera tabella Atlete per niente, stesso
    // principio "mai lavoro sprecato" gia' applicato alle query sorelle.
    annoCorrente
      ? elencaAtletePubbliche(supabaseAdmin).catch((err) => {
          console.error(err);
          return [];
        })
      : Promise.resolve([]),
  ]);

  // Review fix (Blind Hunter + Edge Case Hunter, convergenti): elencaAtletePubbliche
  // non ha (e non puo' avere, e' condivisa con elencaAtlete) alcun filtro
  // per stagione/Gruppo - risolvere la foto per OGNI Atleta mai creata nel
  // gestionale sprecherebbe chiamate Storage privilegiate proporzionali
  // alla storia del club, non alla rosa corrente (a differenza di /staff,
  // Story 18.22, che filtra l'Allenatore PRIMA di leggere la sua foto).
  // Si risolve quindi solo per le Atlete effettivamente assegnate a un
  // Gruppo di QUESTA stagione (idAtleteAssegnate, da gruppoAtleteRighe).
  const idAtleteAssegnate = new Set(gruppoAtleteRighe.map((riga) => riga.atletaId));

  // Story 18.24: foto risolta UNA VOLTA per Atleta (non per ogni comparsa
  // nell'elenco GruppoAtleta) - un'Atleta puo' essere assegnata a più
  // Gruppi nella stessa stagione (Story 9.21), evitando cosi' chiamate
  // Storage duplicate per la stessa foto. Mirror del blocco fail-soft
  // per-entita' gia' in uso in /staff (Story 18.22): un errore Storage per
  // UNA Atleta non deve far sparire l'intero elenco ne' propagare fino a
  // rompere la pagina.
  const atleteConFoto = await Promise.all(
    atletePubbliche
      .filter((atleta) => idAtleteAssegnate.has(atleta.id))
      .map(async (atleta) => {
        let fotoUrl: string | null = null;
        try {
          const info = await esisteFotoProfilo(supabaseAdmin, BUCKET_FOTO_ATLETA, atleta.id);
          if (info.esiste) {
            fotoUrl = await generaUrlFirmatoFotoProfilo(supabaseAdmin, BUCKET_FOTO_ATLETA, atleta.id);
          }
        } catch (err) {
          console.error(err);
        }
        return { ...atleta, fotoUrl };
      })
  );
  const atletaPerId = new Map(atleteConFoto.map((atleta) => [atleta.id, atleta]));

  // Join in memoria (mai un include Prisma diretto, spec-18-24 Boundaries)
  // - per ciascun Gruppo, le sue righe GruppoAtleta unite ai dati Atleta
  // gia' risolti sopra. Un atletaId assente dalla mappa (caso limite
  // teorico: un'Atleta cancellata tra le due letture) viene scartato in
  // silenzio, mai un errore che romperebbe l'intera pagina per una singola
  // riga incoerente.
  const gruppiConAtlete = gruppi.map((gruppo) => {
    const atlete = gruppoAtleteRighe
      .filter((riga) => riga.gruppoId === gruppo.id)
      .map((riga) => {
        const atleta = atletaPerId.get(riga.atletaId);
        return atleta ? { ...atleta, numero: riga.numero } : null;
      })
      .filter((atleta): atleta is NonNullable<typeof atleta> => atleta !== null)
      // Numero crescente, null in fondo (I/O matrix spec-18-24) - poi nome
      // come criterio di spareggio/fallback.
      .sort((a, b) => {
        if (a.numero == null && b.numero == null) return a.nome.localeCompare(b.nome);
        if (a.numero == null) return 1;
        if (b.numero == null) return -1;
        return a.numero - b.numero || a.nome.localeCompare(b.nome);
      });
    return { ...gruppo, atlete };
  });

  // Story 19.15: i Gruppi arrivano gia' ordinati per "ordine" dalla query
  // sopra - il raggruppamento in blocchi visivi per categoria rispetta
  // quindi fedelmente l'ordine scelto dal Site Manager, mai un
  // riordinamento alfabetico implicito (spec-18-24 Intent).
  const blocchiCategoria = raggruppaGruppiPerCategoriaContigua(gruppiConAtlete);

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
          // Story 18.24: un blocco per ogni run contigua della stessa
          // categoria nell'ordine scelto dal Site Manager
          // (raggruppaGruppiPerCategoriaContigua) - non piu' un'unica
          // griglia piatta di tutti i Gruppi.
          blocchiCategoria.map((blocco, indiceBlocco) => (
            <section
              key={`${blocco.categoria}-${indiceBlocco}`}
              className={styles.bloccoCategoria}
            >
              <h2 className={styles.titoloBloccoCategoria}>{blocco.categoria}</h2>
              <div className={styles.listaGruppi}>
                {blocco.gruppi.map((gruppo) => {
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
                      {/* Story 18.24: h3 (non piu' h2) - ora nesting sotto
                          l'intestazione di blocco categoria (h2) sopra,
                          stessa classe/aspetto visivo invariato. */}
                      <h3 className={styles.nomeGruppo}>{gruppo.nome}</h3>
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
                      {/* Story 18.24: rovescia esplicitamente Story 18.8 AC
                          #2 (su conferma diretta dell'utente) - nome/foto/
                          Numero di ogni Atleta diventano pubblici qui.
                          Messaggio esplicito invece di un'area vuota
                          quando il Gruppo non ha ancora Atlete assegnate
                          (spec-18-24 I/O matrix). */}
                      <div className={styles.sezioneAtlete}>
                        <h4 className={styles.titoloSezioneAtlete}>Atlete</h4>
                        {gruppo.atlete.length === 0 ? (
                          <p className={styles.messaggioAtleteVuoto}>
                            Nessuna atleta assegnata.
                          </p>
                        ) : (
                          <ul className={styles.listaAtlete}>
                            {gruppo.atlete.map((atleta) => (
                              <li key={atleta.id} className={styles.rigaAtleta}>
                                {atleta.fotoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- URL firmato a breve scadenza, non ottimizzabile da next/image (mirror /staff)
                                  <img
                                    className={styles.fotoAtleta}
                                    src={atleta.fotoUrl}
                                    alt=""
                                    width={40}
                                    height={40}
                                  />
                                ) : (
                                  <div className={styles.inizialiAtleta} aria-hidden="true">
                                    {inizialiNomeCompleto(atleta.nome)}
                                  </div>
                                )}
                                <span className={styles.nomeAtleta}>{atleta.nome}</span>
                                {atleta.numero != null && (
                                  <span className={styles.numeroAtleta}>{atleta.numero}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
      <FooterPubblico />
    </>
  );
}
