import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { parseRuoli } from "@/lib/ruoli";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { costruisciLinkNaviga } from "@/lib/link-naviga-palestra";
import { raggruppaPerSettimana, parseDataUtc } from "@/lib/raggruppa-per-settimana";
import { raggruppaPartitePerGruppo } from "@/lib/raggruppa-partite-per-gruppo";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { PartitaRow } from "./PartitaRow";
import { TabellaPartiteGruppo } from "./TabellaPartiteGruppo";
import styles from "./partite.module.css";

// Un import riuscito su /campionati (Story 10.2, importaGare) revalida solo
// quella pagina, non questa - force-dynamic bypassa la cache di rendering
// invece di dover ricordarsi di aggiungere revalidatePath("/app/partite")
// altrove, stesso motivo/pattern gia' scelto per /campionati (Story 10.1).
export const dynamic = "force-dynamic";

// Review fix: timeZone: "UTC" esplicito - senza, il fuso orario locale del
// processo Node (se diverso da UTC) potrebbe mostrare una data sfalsata di
// un giorno rispetto alla stringa "YYYY-MM-DD" originale. parseDataUtc
// riusata da lib/raggruppa-per-settimana.ts invece di una seconda
// implementazione indipendente dello stesso parsing.
function formattaData(data: string): string {
  return parseDataUtc(data).toLocaleDateString("it-IT", { timeZone: "UTC" });
}

export default async function PartitePage({
  searchParams,
}: {
  // searchParams e' una Promise in questa versione di Next.js (16.2.10) -
  // Dev Notes Story 2.8, gia' verificato, non da ri-verificare qui.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const atletaIdSelezionato =
    typeof params.atletaId === "string" ? params.atletaId : "";

  // Sola lettura (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente
  // in una pagina GET - Dev Notes Story 1.6/2.2/10.1).
  const annoCorrente = await trovaAnnoAgonisticoCorrente();

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
  }

  const ruoli = parseRuoli(user?.app_metadata?.ruoli);
  const eGestionale = ruoli.includes("ADMIN") || ruoli.includes("DIRIGENTE");

  // Admin/Dirigente vedono le partite di tutti i Gruppi (accesso ampio,
  // AC #3); un Allenatore vede solo quelle dei propri - stesso identico
  // pattern di risoluzione gia' stabilito in campionati/page.tsx.
  const allenatore =
    !eGestionale && user
      ? await prisma.allenatore.findFirst({
          where: { utente: { supabaseAuthId: user.id } },
        })
      : null;

  // Story 10.5 (AC #1/#2): se non e' ne' ad accesso ampio ne' un Allenatore,
  // prova a risolvere come Atleta (se stessa) o Genitore (una o piu' figlie)
  // - SENZA autoAggancio: true (a differenza di storico-presenze/dati-fisici,
  // "il mio storico"/"le mie misurazioni"): qui i due casi danno lo stesso
  // diritto di visualizzazione, stesso principio gia' stabilito in
  // certificato-medico/page.tsx.
  const atletaIds =
    !eGestionale && !allenatore && user
      ? await prisma.genitoreAtleta
          .findMany({
            where: { utente: { supabaseAuthId: user.id } },
            select: { atletaId: true },
          })
          .then((righe) => righe.map((riga) => riga.atletaId))
      : [];

  if (!eGestionale && !allenatore && atletaIds.length === 0) {
    return (
      <main>
        <TitoloPagina titolo="Partite" contenuto={contenutoPerRotta("/app/partite", ruoli)} />
        <p className={styles.testo}>
          Il tuo account non è ancora collegato a un profilo Allenatore,
          Atleta o Genitore. Contatta la segreteria.
        </p>
      </main>
    );
  }

  // AC #4: Admin/Dirigente/Allenatore possono modificare, Atleta/Genitore
  // sono sempre in sola lettura.
  const puoModificare = eGestionale || !!allenatore;

  // AC #6: stesso identico pattern di certificato-medico/page.tsx - con una
  // sola Atleta risolta (self, o Genitore con una sola figlia) nessun
  // selettore e' necessario; con piu' Atlete la scelta deve essere
  // esplicita (searchParams), mai implicita.
  let proprieAtlete: { id: string; nome: string }[] = [];
  let atletaIdCorrente = "";
  if (!puoModificare) {
    // Atleta e' protetta da RLS (AD-4) - letta SOLO tramite
    // elencaAtlete(supabase), mai con un include Prisma (Dev Notes Story 2.4).
    const atlete = await elencaAtlete(supabase);
    const atletaPerId = new Map(atlete.map((a) => [a.id, a]));
    proprieAtlete = atletaIds
      .map((id) => atletaPerId.get(id))
      .filter((a): a is (typeof atlete)[number] => a !== undefined)
      .sort((a, b) => a.nome.localeCompare(b.nome));

    atletaIdCorrente =
      proprieAtlete.length === 1
        ? proprieAtlete[0].id
        : proprieAtlete.some((a) => a.id === atletaIdSelezionato)
          ? atletaIdSelezionato
          : "";
  }

  const filtroAllenatore = eGestionale
    ? undefined
    : allenatore
      ? { allenatori: { some: { allenatoreId: allenatore.id } } }
      : // Story 9.21 (AC #5): attraversamento di relazione "some" su
        // Gruppo.atlete, non un gruppoId singolo risolto a monte - gestisce
        // correttamente un'Atleta assegnata a piu' Gruppi, stesso pattern
        // gia' verificato sicuro in mio-orario/page.tsx.
        atletaIdCorrente
        ? { atlete: { some: { atletaId: atletaIdCorrente } } }
        : undefined;

  // Genitore con piu' figlie, nessuna ancora selezionata: nessuna query,
  // nessuna Partita mostrata finche' non sceglie esplicitamente (AC #6) -
  // mai una query senza filtro che esporrebbe le partite di Gruppi non suoi.
  const puoVederePartite = eGestionale || !!allenatore || !!atletaIdCorrente;

  // Partita/Gruppo/Campionato non sono protetti da RLS (AD-9) - Prisma
  // diretto, stesso pattern di /campionati.
  const partite =
    annoCorrente && puoVederePartite
      ? await prisma.partita.findMany({
          where: {
            gruppo: { annoAgonisticoId: annoCorrente.id, ...filtroAllenatore },
          },
          include: {
            // Review fix (Blind Hunter): "ordine" necessario per ordinare la
            // sezione "Partite per Gruppo" (Story 10.9) con lo stesso
            // criterio di visualizzazione gia' scelto dal Site Manager
            // (Story 19.15, elencaGruppiOrdinati), non alfabeticamente.
            gruppo: { select: { nome: true, ordine: true } },
            campionato: { select: { nome: true } },
          },
          orderBy: [{ data: "asc" }, { ora: "asc" }],
        })
      : [];

  const settimane = raggruppaPerSettimana(partite);

  // Story 10.9: sezione aggiuntiva "a scomparsa" (mai un rimpiazzo della
  // vista per settimana sopra) - visibile solo quando le Partite mostrate
  // appartengono a piu' di un Gruppo (AC #4: per un'Atleta/Genitore, o un
  // Allenatore con un solo Gruppo, "partite" contiene sempre un solo
  // gruppoId per costruzione - nessun controllo esplicito sul Ruolo
  // necessario, la condizione discende direttamente dai dati gia' filtrati
  // sopra). gruppoId e' gia' presente su ogni riga (scalare di default con
  // "include", nessuna modifica alla query sopra necessaria).
  const gruppiPartite = raggruppaPartitePerGruppo(partite);

  return (
    <main>
      <TitoloPagina titolo="Partite" contenuto={contenutoPerRotta("/app/partite", ruoli)} />
      {proprieAtlete.length > 1 && (
        <section className={styles.settimana}>
          <form method="get">
            <div className={styles.campo}>
              <label htmlFor="partite-atleta">Atleta</label>
              <select
                id="partite-atleta"
                name="atletaId"
                defaultValue={atletaIdSelezionato}
              >
                <option value="">Seleziona...</option>
                {proprieAtlete.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={styles.bottone}>
              Carica
            </button>
          </form>
        </section>
      )}
      {settimane.length === 0 &&
        (proprieAtlete.length > 1 && !atletaIdCorrente ? (
          // Review fix (code review Story 10.5): un Genitore con piu' figlie
          // che non ha ancora scelto vedeva il messaggio generico "Nessuna
          // partita programmata", indistinguibile da un calendario
          // genuinamente vuoto - stesso identico messaggio di
          // certificato-medico/page.tsx (sezioneGestione, "Seleziona
          // un'Atleta..."), che questa storia dichiarava di riprodurre 1:1
          // ma aveva omesso.
          <p className={styles.testo}>
            Seleziona un&apos;Atleta per vedere le sue Partite.
          </p>
        ) : (
          <p className={styles.testo}>Nessuna partita programmata.</p>
        ))}
      {settimane.map((settimana) => (
        <section key={settimana.chiave} className={styles.settimana}>
          <h2>{settimana.etichetta}</h2>
          {settimana.partite.length === 0 ? (
            <p className={styles.messaggioVuoto}>
              Nessuna partita questa settimana.
            </p>
          ) : (
            <div className={styles.scrollWrapper}>
              <table className={styles.tabella}>
                <thead>
                  <tr>
                    <th>Giorno</th>
                    <th>Ora</th>
                    <th>Squadre</th>
                    <th>Luogo</th>
                    <th>Gruppo</th>
                    <th>Campionato</th>
                    {puoModificare && <th>Azioni</th>}
                  </tr>
                </thead>
                <tbody>
                  {settimana.partite.map((partita) => {
                    if (puoModificare) {
                      return (
                        <PartitaRow
                          key={partita.id}
                          partita={{
                            id: partita.id,
                            data: partita.data,
                            dataFormattata: formattaData(partita.data),
                            ora: partita.ora,
                            impianto: partita.impianto,
                            indirizzoImpianto: partita.indirizzoImpianto,
                            squadraCasa: partita.squadraCasa,
                            squadraOspite: partita.squadraOspite,
                            gruppoNome: partita.gruppo.nome,
                            campionatoNome: partita.campionato.nome,
                          }}
                        />
                      );
                    }

                    // AC #4: riga statica di sola lettura, nessuna colonna
                    // Azioni - nessun Client Component/useActionState per un
                    // Ruolo che non puo' mai inviare nulla, stesso principio
                    // di SlotTable.tsx vs SlotRow.tsx.
                    const linkNaviga = costruisciLinkNaviga({
                      indirizzo: partita.indirizzoImpianto,
                    });
                    return (
                      <tr key={partita.id}>
                        <td>{formattaData(partita.data)}</td>
                        <td>{partita.ora}</td>
                        <td>
                          {partita.squadraCasa} - {partita.squadraOspite}
                        </td>
                        <td>
                          {partita.impianto}
                          {linkNaviga && (
                            <>
                              {" "}
                              <a
                                className={styles.linkNaviga}
                                href={linkNaviga}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Naviga verso ${partita.impianto ?? "il luogo della partita"}`}
                              >
                                Naviga
                              </a>
                            </>
                          )}
                        </td>
                        <td>{partita.gruppo.nome}</td>
                        <td>{partita.campionato.nome}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
      {gruppiPartite.length > 1 && (
        <section className={styles.sezionePerGruppo}>
          <h2>Partite per Gruppo</h2>
          {gruppiPartite.map((gruppo) => (
            <TabellaPartiteGruppo
              key={gruppo.gruppoId}
              gruppoNome={gruppo.gruppoNome}
              partite={gruppo.partite.map((partita) => ({
                id: partita.id,
                data: partita.data,
                ora: partita.ora,
                squadraCasa: partita.squadraCasa,
                squadraOspite: partita.squadraOspite,
                impianto: partita.impianto,
                indirizzoImpianto: partita.indirizzoImpianto,
                campionatoNome: partita.campionato.nome,
              }))}
            />
          ))}
        </section>
      )}
    </main>
  );
}
