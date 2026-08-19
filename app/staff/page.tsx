import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createAdminClient } from "@/lib/auth-admin/client";
import {
  BUCKET_FOTO_ALLENATORE,
  esisteFotoProfilo,
  generaUrlFirmatoFotoProfilo,
} from "@/lib/storage/foto-profilo";
import { inizialiNome } from "@/lib/iniziali-nome";
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

  // Story 18.22: foto profilo dell'Allenatore (Story 9.12, bucket
  // "foto-profilo-allenatori") - PRIVATO per scelta deliberata (AD-6), la
  // sua policy RLS richiede un Ruolo tra ALLENATORE/ADMIN/DIRIGENTE/
  // SEGRETERIA nel JWT. Un Visitatore anonimo di questa pagina non ne ha
  // nessuno, quindi createClient() (sessione anonima) fallirebbe la RLS -
  // createAdminClient() (service-role, bypassa RLS) e' l'unico modo per
  // leggerla da qui, stesso client gia' usato da app/layout.tsx per letture
  // privilegiate su pagine pubbliche. Decisione presa esplicitamente con
  // l'utente in apertura di questa storia: riuso diretto, nessun nuovo
  // consenso/opt-in, il bucket stesso resta privato (nessuna policy
  // toccata) - solo questa lettura server-side lo bypassa.
  const supabaseAdmin = createAdminClient();
  const allenatoriConFoto = await Promise.all(
    allenatori.map(async (allenatore) => {
      // Mirror del blocco fail-soft di il-mio-profilo/page.tsx
      // (SezioneFoto): un errore Storage per UN Allenatore non deve far
      // sparire l'intera lista, ne' propagare fino a rompere la pagina.
      let fotoUrl: string | null = null;
      try {
        const info = await esisteFotoProfilo(
          supabaseAdmin,
          BUCKET_FOTO_ALLENATORE,
          allenatore.id
        );
        if (info.esiste) {
          fotoUrl = await generaUrlFirmatoFotoProfilo(
            supabaseAdmin,
            BUCKET_FOTO_ALLENATORE,
            allenatore.id
          );
        }
      } catch (err) {
        console.error(err);
      }
      return { ...allenatore, fotoUrl };
    })
  );

  return (
    <>
      <HeaderPubblico />
      <main className={styles.main}>
        <h1 className={styles.titolo}>Staff</h1>
        {/* AC #4: messaggio esplicito invece di un'area vuota quando
            nessun Allenatore risulta assegnato a un Gruppo nella stagione
            corrente - qui l'intera pagina esiste solo per questo
            contenuto (a differenza delle sezioni opzionali della home). */}
        {allenatoriConFoto.length === 0 ? (
          <p className={styles.messaggioVuoto}>
            Nessun Allenatore assegnato a un Gruppo per la stagione in corso.
          </p>
        ) : (
          <div className={styles.listaStaff}>
            {allenatoriConFoto.map((allenatore) => (
              <div className={styles.rigaAllenatore} key={allenatore.id}>
                {/* Review fix (party mode UI, post-18.22): un placeholder a
                    iniziali sostituisce il "niente" iniziale per chi non ha
                    una foto caricata - stessi token di DESIGN.md
                    (blu-carbone, stessa tipografia del nome), invece di una
                    lista con dei buchi a sinistra su meta' delle righe. */}
                {allenatore.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL firmato a breve scadenza, non ottimizzabile da next/image (mirror il-mio-profilo/page.tsx)
                  <img
                    className={styles.fotoAllenatore}
                    src={allenatore.fotoUrl}
                    alt=""
                    width={64}
                    height={64}
                  />
                ) : (
                  <div className={styles.inizialiAllenatore} aria-hidden="true">
                    {inizialiNome(allenatore.nome, allenatore.cognome)}
                  </div>
                )}
                <div className={styles.infoAllenatore}>
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
              </div>
            ))}
          </div>
        )}
      </main>
      <FooterPubblico />
    </>
  );
}
