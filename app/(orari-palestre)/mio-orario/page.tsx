import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { unisciESordinaSlot } from "@/lib/orario/unisci-slot";
import { ETICHETTA_GIORNO } from "@/lib/giorno-settimana";
import type { GiornoSettimana } from "@/generated/prisma/client";
import { type SlotRiga } from "../SlotTable";
import styles from "./mio-orario.module.css";

// Segue il mockup key-mio-orario.html (day-group/slot-row), non la tabella
// condivisa di SlotTable - vedi "Decisione" nella Story 8.3. `slot` arriva
// gia' ordinato per giorno (unisciESordinaSlot), quindi raggruppare per
// cambio di `giorno` consecutivo preserva l'ordine Lunedi->Domenica senza
// bisogno di iterare GIORNI_SETTIMANA a parte, e produce solo i giorni che
// hanno davvero almeno uno Slot (nessun giorno vuoto mostrato).
function raggruppaPerGiorno(slot: SlotRiga[]): { giorno: GiornoSettimana; righe: SlotRiga[] }[] {
  const gruppi: { giorno: GiornoSettimana; righe: SlotRiga[] }[] = [];
  for (const riga of slot) {
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.giorno === riga.giorno) {
      ultimo.righe.push(riga);
    } else {
      gruppi.push({ giorno: riga.giorno, righe: [riga] });
    }
  }
  return gruppi;
}

// Dati potenzialmente diversi ad ogni visita (nuovi Slot caricati da un
// Dirigente) - stesso motivo di slot/page.tsx (Story 2.5).
export const dynamic = "force-dynamic";

export default async function MioOrarioPage() {
  // Utente/Allenatore/Gruppo/GruppoAllenatore/Slot non sono protetti da RLS
  // (AD-9) - il client Supabase serve SOLO a identificare la sessione (chi
  // e' l'utente loggato), non per bypassare RLS come in Story 2.4. Tutte le
  // query dati restano Prisma diretto.
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Un errore qui (es. Supabase Auth non raggiungibile) va distinto da
  // "nessuna sessione"/"non collegato" nei log - stessa policy gia'
  // stabilita in requireRuolo (lib/auth/require-ruolo.ts, review Story 1.3):
  // un'interruzione del servizio non deve essere indistinguibile da uno
  // stato applicativo normale. Il comportamento resta fail-closed (messaggio
  // AC #2) in entrambi i casi.
  if (error) {
    console.error(error);
  }

  // Le due risoluzioni di identita' (Allenatore/Atleta) non dipendono l'una
  // dall'altra - eseguite in Promise.all (review fix Story 2.7: il commento
  // originale di Story 2.6 anticipava che questo pattern sarebbe stato
  // ripreso da questa storia, non aggiunto come un ulteriore round-trip
  // sequenziale).
  const [allenatore, atletaIds] = user
    ? await Promise.all([
        prisma.allenatore.findFirst({
          where: { utente: { supabaseAuthId: user.id } },
        }),
        // Story 2.7: GenitoreAtleta riusata deliberatamente anche per
        // l'aggancio di un'Atleta a se stessa, vedi Dev Notes Story 2.7 -
        // non protetta da RLS, nessuna lettura di Atleta stessa qui: serve
        // solo l'id di correlazione. Un Utente puo' avere piu' righe
        // GenitoreAtleta (es. Ruolo Genitore con piu' figlie) - per questa
        // vista si prendono tutte, caso limite accettato (vedi Dev Notes)
        // piuttosto che disambiguare "quale riga sono io".
        prisma.genitoreAtleta
          .findMany({
            where: { utente: { supabaseAuthId: user.id } },
            select: { atletaId: true },
          })
          .then((righe) => righe.map((riga) => riga.atletaId)),
      ])
    : [null, []];

  let body: ReactNode;

  // AC #2: l'Utente ha il Ruolo ALLENATORE e/o ATLETA (il route-guard lo
  // ammette) ma non e' ancora agganciato a nessuno dei due profili -
  // messaggio unico che copre entrambi i casi, non serve distinguere quale
  // Ruolo specifico manca (vedi Dev Notes Story 2.7).
  if (!allenatore && atletaIds.length === 0) {
    body = (
      <p>
        Il tuo account non è ancora collegato a un profilo Allenatore o
        Atleta. Contatta la segreteria.
      </p>
    );
  } else {
    // Sola lettura (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente
    // in una pagina GET - Dev Notes Story 1.6). Se l'Anno Agonistico corrente
    // non esiste ancora, nessuno Slot puo' comunque esistere per definizione
    // (stesso ragionamento di gruppi/page.tsx e slot/page.tsx).
    const annoCorrente = await trovaAnnoAgonisticoCorrente();

    // Due query separate (Slot non ha una relazione uniforme verso "il
    // proprietario" - il ramo Allenatore attraversa GruppoAllenatore, il
    // ramo Atleta attraversa GruppoAtleta, vedi Dev Notes Story 2.7),
    // eseguite in parallelo poi unite deduplicando per id e riordinate: un
    // singolo Promise.all non garantisce un ordine coerente tra le due
    // liste dopo l'unione.
    const [slotAllenatore, slotAtleta] = annoCorrente
      ? await Promise.all([
          allenatore
            ? prisma.slot.findMany({
                where: {
                  gruppo: {
                    annoAgonisticoId: annoCorrente.id,
                    allenatori: { some: { allenatoreId: allenatore.id } },
                  },
                },
                include: { campo: { include: { palestra: true } }, gruppo: true },
                orderBy: [{ giorno: "asc" }, { oraInizio: "asc" }],
              })
            : Promise.resolve([]),
          atletaIds.length > 0
            ? prisma.slot.findMany({
                where: {
                  gruppo: {
                    annoAgonisticoId: annoCorrente.id,
                    atlete: { some: { atletaId: { in: atletaIds } } },
                  },
                },
                include: { campo: { include: { palestra: true } }, gruppo: true },
                orderBy: [{ giorno: "asc" }, { oraInizio: "asc" }],
              })
            : Promise.resolve([]),
        ])
      : [[], []];

    const slot = unisciESordinaSlot(slotAllenatore, slotAtleta);

    if (slot.length === 0) {
      body = (
        <p className={styles.messaggioVuoto}>
          Nessuno Slot ancora assegnato ai tuoi Gruppi.
        </p>
      );
    } else {
      const gruppiPerGiorno = raggruppaPerGiorno(slot);
      body = (
        <div className={styles.settimana}>
          {gruppiPerGiorno.map((gruppo) => (
            <div key={gruppo.giorno} className={styles.giornoGruppo}>
              <p className={styles.giornoLabel}>{ETICHETTA_GIORNO[gruppo.giorno]}</p>
              {gruppo.righe.map((riga) => (
                <div key={riga.id} className={styles.slotRiga}>
                  <span className={styles.slotOrario}>
                    {riga.oraInizio}–{riga.oraFine}
                  </span>
                  <div className={styles.slotDettagli}>
                    <span className={styles.slotGruppo}>{riga.gruppo.nome}</span>
                    <span className={styles.slotPosto}>
                      {riga.campo.palestra.nome} - {riga.campo.nome}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <main>
      <h1>Il mio orario</h1>
      {body}
    </main>
  );
}
