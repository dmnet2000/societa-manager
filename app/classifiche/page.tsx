import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { leggiCampionatiConLetturaFipav } from "@/lib/sincronizza-gare-fipav/leggi-live-fipav";
import { classifichePerCampionatoDaLetture } from "@/lib/sincronizza-gare-fipav/vista-home-live";
import { HeaderPubblico } from "../HeaderPubblico";
import { FooterPubblico } from "../FooterPubblico";
import { DecorazioniMatchWeek, classeFasciaMatchWeek } from "../SfondoMatchWeek";
import { ClassificaMatchWeek } from "./ClassificaMatchWeek";
import styles from "./classifiche.module.css";

// Story 18.34: nuova pagina pubblica, mirror strutturale di
// app/calendario/page.tsx (non "/torneo"/"/sponsor"/"/staff"/"/contatti",
// gia' esistenti prima di questa storia - review fix, Blind Hunter: un
// conteggio errato qui era proprio cio' che aveva fatto dimenticare la
// registrazione di questa rotta in PUBLIC_ROUTES, lib/auth/route-guard.ts,
// stesso bug gia' capitato a /torneo e /sponsor, vedi commento li'). Dati letti
// live dal portale FIPAV a ogni visita (mai da un modello locale) tramite
// leggiCampionatiConLetturaFipav (Story 18.33/18.34, cache breve
// unstable_cache interna) - possono quindi cambiare in qualunque momento,
// stesso motivo di dynamic = "force-dynamic" gia' in uso su "/" e
// "/calendario".
export const dynamic = "force-dynamic";

export default async function ClassifichePage() {
  // Nessuna sessione qui (pagina pubblica). Sola lettura
  // (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente in una
  // pagina GET), .catch() fail-soft fin dalla prima stesura - stesso
  // principio di /calendario: un errore DB transiente degrada al messaggio
  // esplicito sotto invece di far crashare l'intera pagina.
  const annoCorrente = await trovaAnnoAgonisticoCorrente().catch((err) => {
    console.error(err);
    return null;
  });

  // Story 18.34 (Code Map): stessa funzione condivisa riusata invariata da
  // app/page.tsx (Story 18.33) - query Campionati con linkFipav + fetch
  // live in parallelo, mai una seconda implementazione della stessa query.
  // Un Campionato senza linkFipav non genera alcun fetch ne' alcun blocco
  // (AC #4); un fetch fallito per un Campionato non fa fallire gli altri
  // (.catch() qui, seconda rete di sicurezza esplicita, stesso principio di
  // app/page.tsx - AC #5).
  const letturePerCampionato = annoCorrente
    ? await leggiCampionatiConLetturaFipav(annoCorrente.id).catch((err) => {
        console.error(err);
        return [];
      })
    : [];

  // Story 18.34 (AC #1): stessa estrazione pura e testata di
  // lib/sincronizza-gare-fipav/vista-home-live.ts (Story 18.33) - una classifica
  // per Campionato con lettura riuscita e classifica non vuota, riusata
  // invariata (nessuna seconda copia della logica di filtro).
  const classifichePerCampionato = classifichePerCampionatoDaLetture(letturePerCampionato);
  const mostraClassifiche = classifichePerCampionato.length > 0;

  return (
    <>
      <HeaderPubblico />
      {/* Sfondo Match Week (variante C, scelta utente 2026-10-01) su tutta
          la pagina, stesso delle fasce partite/risultati della home. */}
      <main className={`${styles.main} ${classeFasciaMatchWeek}`}>
        <DecorazioniMatchWeek />
        <h1 className={styles.titolo}>Classifiche</h1>
        {/* AC #6 (spec-18-34): messaggio esplicito invece di un'area vuota
            quando nessun Campionato ha linkFipav impostato o tutti i fetch
            sono falliti - a differenza della home (dove l'assenza e'
            silenziosa perche' la pagina ha comunque altro contenuto), questa
            pagina esiste apposta per le classifiche, mirror del principio
            gia' in /calendario (AC #3 di quella storia). */}
        {!mostraClassifiche ? (
          <p className={styles.messaggioVuoto}>Nessuna classifica disponibile al momento.</p>
        ) : (
          <div className={styles.listaClassifiche}>
            {/* Story 18.36: ogni classifica e' una tabella Match Week
                (ClassificaMatchWeek.tsx) trasparente sulla fascia, con il
                titolo su una fascia obliqua del colore del Campionato -
                tutte le 13 colonne del parser restano visibili. Stesso
                ordine delle righe del portale. */}
            {classifichePerCampionato.map((classifica) => (
              <ClassificaMatchWeek classifica={classifica} key={classifica.campionatoId} />
            ))}
          </div>
        )}
      </main>
      <FooterPubblico />
    </>
  );
}
