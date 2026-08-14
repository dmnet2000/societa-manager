import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { HeaderPubblico } from "../HeaderPubblico";
import { FooterPubblico } from "../FooterPubblico";
import styles from "./staff.module.css";

// Story 18.10: quarta pagina pubblica reale (dopo Home, Squadre,
// Calendario). Dati possono cambiare in qualunque momento dalla console
// Admin - stesso motivo di dynamic = "force-dynamic" gia' in uso su "/",
// "/squadre" e "/calendario".
export const dynamic = "force-dynamic";

export default async function StaffPage() {
  // Nessuna sessione qui (pagina pubblica). Sola lettura
  // (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente in una
  // pagina GET). .catch() fail-soft fin dalla prima stesura (stessa
  // lezione di code review gia' applicata in Story 18.9).
  const annoCorrente = await trovaAnnoAgonisticoCorrente().catch((err) => {
    console.error(err);
    return null;
  });

  // Lato opposto della relazione rispetto a /squadre (che parte da Gruppo
  // e annida allenatori): qui si parte da Allenatore e si filtra/annida
  // gruppi. Il "where" sull'Allenatore realizza da solo l'AC #2 (un
  // Allenatore senza alcun Gruppo nella stagione corrente non compare mai
  // nel risultato). Il "where" ripetuto dentro il select di "gruppi"
  // restringe anche i Gruppi annidati alla sola stagione corrente (un
  // Allenatore puo' avere Gruppi in Anni Agonistici diversi). "select"
  // esplicito (mai "include"): il confine "cosa e' pubblico" e' imposto
  // dalla query stessa - nessun campo email/codiceFiscale/utenteId
  // presente da nessuna parte (AC #3).
  const allenatori = annoCorrente
    ? await prisma.allenatore
        .findMany({
          where: {
            gruppi: { some: { gruppo: { annoAgonisticoId: annoCorrente.id } } },
          },
          orderBy: [{ nome: "asc" }, { cognome: "asc" }],
          select: {
            id: true,
            nome: true,
            cognome: true,
            gruppi: {
              where: { gruppo: { annoAgonisticoId: annoCorrente.id } },
              select: { gruppo: { select: { id: true, nome: true } } },
              orderBy: { gruppo: { nome: "asc" } },
            },
          },
        })
        .catch((err) => {
          console.error(err);
          return [];
        })
    : [];

  return (
    <>
      <HeaderPubblico />
      <main className={styles.main}>
        <h1 className={styles.titolo}>Staff</h1>
        {/* AC #4: messaggio esplicito invece di un'area vuota quando
            nessun Allenatore risulta assegnato a un Gruppo nella stagione
            corrente - qui l'intera pagina esiste solo per questo
            contenuto (a differenza delle sezioni opzionali della home). */}
        {allenatori.length === 0 ? (
          <p className={styles.messaggioVuoto}>
            Nessun Allenatore assegnato a un Gruppo per la stagione in corso.
          </p>
        ) : (
          <div className={styles.listaStaff}>
            {allenatori.map((allenatore) => (
              <div className={styles.rigaAllenatore} key={allenatore.id}>
                <div className={styles.nomeAllenatore}>
                  {allenatore.nome} {allenatore.cognome}
                </div>
                {/* Task 1 garantisce gruppi.length >= 1 per costruzione -
                    nessun elenco vuoto possibile qui. <ul>/<li> (non una
                    stringa unita da virgole) - stesso pattern gia'
                    stabilito per l'elenco Allenatori annidato in
                    /squadre (listaAllenatori), un elemento discreto per
                    Gruppo invece di un'unica riga di testo. */}
                <ul className={styles.listaGruppi}>
                  {allenatore.gruppi.map(({ gruppo }) => (
                    <li key={gruppo.id}>{gruppo.nome}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
      <FooterPubblico />
    </>
  );
}
