import type { Ruolo } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { PROTECTED_ROUTES } from "./route-guard";
import {
  filtraVociNavigazione,
  isGruppoAttivo,
  isVoceAttiva,
  raggruppaVociNavigazione,
  type VoceGruppo,
} from "./voci-navigazione";

// Story 15.1: filtraVociNavigazione ora restituisce una union discriminata
// (voce | gruppo). Gli href si estraggono filtrando esplicitamente su
// tipo:"voce" invece di assumerlo implicitamente come prima di quella
// storia. Story 15.2: /orari e /palestre sono ora raggruppate sotto
// "Orari/Palestre" (prima applicazione reale) - non compaiono piu' tra le
// voci dirette di hrefVoci, sono figlie del nodo gruppo.
function hrefVoci(voci: ReturnType<typeof filtraVociNavigazione>): string[] {
  return voci.filter((v) => v.tipo === "voce").map((v) => v.href);
}

// Review fix (Story 15.2): helper condiviso per trovare un nodo gruppo per
// etichetta - i 4 test dedicati al gruppo "Orari/Palestre" ripetevano lo
// stesso type guard inline, a rischio di divergere indipendentemente.
function trovaGruppo(
  voci: ReturnType<typeof filtraVociNavigazione>,
  label: string
): VoceGruppo | undefined {
  return voci.find((v): v is VoceGruppo => v.tipo === "gruppo" && v.label === label);
}

describe("filtraVociNavigazione", () => {
  it("restituisce array vuoto per ruoli vuoti", () => {
    expect(filtraVociNavigazione([])).toEqual([]);
  });

  it("mostra solo le voci ammesse al Ruolo Allenatore", () => {
    const href = hrefVoci(filtraVociNavigazione(["ALLENATORE"]));
    expect(href).toEqual(
      expect.arrayContaining([
        "/mio-orario",
        "/presenze",
        "/storico-presenze",
        "/notifiche",
        "/dati-fisici",
      ])
    );
    // Nessuna voce Admin-only o Atleta-only-non-condivisa
    expect(href).not.toContain("/admin");
    expect(href).not.toContain("/certificato-medico");
  });

  it("unisce le voci di Utenti con più Ruoli, senza duplicati", () => {
    const href = hrefVoci(filtraVociNavigazione(["ALLENATORE", "DIRIGENTE"]));
    expect(href).toEqual(expect.arrayContaining(["/presenze", "/vista-dirigente"]));
    expect(new Set(href).size).toBe(href.length);
  });

  it("un Admin vede tutte le voci Admin-ammesse", () => {
    const href = hrefVoci(filtraVociNavigazione(["ADMIN"]));
    expect(href).toEqual(
      expect.arrayContaining(["/gruppi", "/impostazioni", "/wizard-nuova-stagione"])
    );
    // Review fix (Story 15.2) + Story 15.3 + Story 15.4 + post-15.5 (/slot
    // entrato nel gruppo Orari/Palestre): non basta non richiederle piu' -
    // verificare esplicitamente che non siano "trapelate" sia nel gruppo sia
    // come voce diretta (stesso pattern .not.toContain gia' in uso sotto per
    // /smtp/logo, Story 9.24).
    expect(href).not.toContain("/palestre");
    expect(href).not.toContain("/orari");
    expect(href).not.toContain("/slot");
    expect(href).not.toContain("/import-atlete");
    expect(href).not.toContain("/conferma-iscrizioni");
    expect(href).not.toContain("/conferma-certificati");
    expect(href).not.toContain("/conferma-tesseramenti");
    expect(href).not.toContain("/admin");
    expect(href).not.toContain("/precaricamento-allenatori");
    expect(href).not.toContain("/permessi-accesso");
    // Story 15.4 estensione: /permessi-certificati e' entrata nel gruppo
    // "Accounting" (prima era una voce diretta) - stesso pattern .not.toContain
    // delle altre tre rotte del gruppo sopra.
    expect(href).not.toContain("/permessi-certificati");
  });

  // Story 15.2: /palestre non e' piu' una voce diretta per un Admin - e'
  // figlia del nodo gruppo "Orari/Palestre". Post-15.5 (richiesta esplicita
  // dell'utente): /slot (navLabel "Orari") e' entrata nello stesso gruppo -
  // un Admin (che non ha accesso a /orari) vede ora due figlie, non una
  // sola, nell'ordine di dichiarazione (/slot prima di /palestre).
  it("un Admin vede /slot e /palestre come figlie del gruppo Orari/Palestre, non come voci dirette", () => {
    const gruppo = trovaGruppo(filtraVociNavigazione(["ADMIN"]), "Orari/Palestre");
    expect(gruppo).toBeDefined();
    expect(gruppo?.figlie).toEqual([
      { href: "/slot", label: "Orari" },
      { href: "/palestre", label: "Palestre" },
    ]);
  });

  // Review fix (Story 15.2) + post-15.5: caso di sovrapposizione reale piu'
  // comune del Segreteria+Admin testato sotto - Admin e Dirigente condividono
  // le STESSE due rotte /slot e /palestre, un Utente con entrambi i Ruoli
  // deve vedere due figlie, non quattro duplicate.
  it("un Utente con Ruoli Admin e Dirigente vede due figlie (/slot, /palestre), non duplicate", () => {
    const gruppo = trovaGruppo(filtraVociNavigazione(["ADMIN", "DIRIGENTE"]), "Orari/Palestre");
    expect(gruppo).toBeDefined();
    expect(gruppo?.figlie).toEqual([
      { href: "/slot", label: "Orari" },
      { href: "/palestre", label: "Palestre" },
    ]);
  });

  // Review fix: nessun test con dati reali verificava che il gruppo non
  // comparisse affatto per un Ruolo senza accesso a nessuna delle due rotte -
  // un refuso futuro in ruoliAmmessi di /orari o /palestre che concedesse
  // l'accesso a un Ruolo estraneo produrrebbe un gruppo spurio non rilevato.
  it("Allenatore non vede alcun gruppo Orari/Palestre (nessun accesso a /orari o /palestre)", () => {
    const gruppo = trovaGruppo(filtraVociNavigazione(["ALLENATORE"]), "Orari/Palestre");
    expect(gruppo).toBeUndefined();
  });

  // Story 9.24: /smtp e /logo restano rotte accessibili (route-guard
  // invariata) ma non devono piu' comparire come voci dirette in barra -
  // raggiungibili solo passando dalla pagina hub /impostazioni.
  it("un Admin non vede più /smtp e /logo come voci dirette, nonostante l'accesso resti consentito (Story 9.24)", () => {
    const href = hrefVoci(filtraVociNavigazione(["ADMIN"]));
    expect(href).not.toContain("/smtp");
    expect(href).not.toContain("/logo");
  });

  // Story 15.2: esteso per gestire anche il caso "gruppo" - ogni figlia deve
  // avere href/label non vuoti, non solo le voci dirette di primo livello.
  it("ogni voce (o figlia di un gruppo) ha un href e una label non vuoti", () => {
    const voci = filtraVociNavigazione(["ADMIN"]);
    for (const voce of voci) {
      if (voce.tipo === "voce") {
        expect(voce.href).toMatch(/^\//);
        expect(voce.label.length).toBeGreaterThan(0);
      } else {
        expect(voce.label.length).toBeGreaterThan(0);
        for (const figlia of voce.figlie) {
          expect(figlia.href).toMatch(/^\//);
          expect(figlia.label.length).toBeGreaterThan(0);
        }
      }
    }
  });

  // Story 15.2: prima applicazione reale del raggruppamento (Story 15.1 era
  // infrastruttura pura, zero gruppi attivi) - /orari e /palestre sono ora
  // raggruppate sotto "Orari/Palestre". Nessun Ruolo ha accesso a entrambe
  // oggi (Segreteria vs Admin/Dirigente), quindi il gruppo ha sempre
  // esattamente una figlia visibile per Ruolo (vedi test dedicati sotto).
  //
  // Review fix (Story 15.2): verificato direttamente su PROTECTED_ROUTES,
  // non tramite l'output di filtraVociNavigazione per un solo Ruolo (ADMIN)
  // - un test scoped a un Ruolo non intercetterebbe un "gruppo" valorizzato
  // per errore su una rotta invisibile a quel Ruolo (es. una rotta solo-
  // Allenatore). Questa e' l'invariante indipendente dal Ruolo che il nome
  // del test promette davvero.
  //
  // Story 15.3: generalizzato per due gruppi coesistenti ("Orari/Palestre" +
  // "Atleti") invece di assumere che ne esista uno solo - stesso principio
  // di prima, esteso invece di riscritto da zero (lezione applicata
  // direttamente dai Dev Notes di questa story).
  //
  // Story 15.4: esteso per un terzo gruppo ("Accounting") - proprio la nota
  // lasciata dal test precedente ("una futura Story 15.4 aggiungera' un
  // terzo valore e dovra' estendere questo test") applicata alla lettera,
  // non riscritto da zero.
  it("esistono esattamente i nodi gruppo attesi con i dati reali del progetto", () => {
    const routeConGruppo = PROTECTED_ROUTES.filter((r) => r.gruppo !== undefined);
    const orariPalestre = routeConGruppo.filter((r) => r.gruppo === "Orari/Palestre");
    const atleti = routeConGruppo.filter((r) => r.gruppo === "Atleti");
    const accounting = routeConGruppo.filter((r) => r.gruppo === "Accounting");

    // Post-15.5: /slot e' entrata nel gruppo "Orari/Palestre" su richiesta
    // esplicita dell'utente (era una voce diretta separata) - 3 rotte, non
    // piu' 2.
    expect(orariPalestre.map((r) => r.prefix)).toEqual(
      expect.arrayContaining(["/orari", "/slot", "/palestre"])
    );
    expect(orariPalestre).toHaveLength(3);

    expect(atleti.map((r) => r.prefix)).toEqual(
      expect.arrayContaining([
        "/import-atlete",
        "/conferma-iscrizioni",
        "/conferma-certificati",
        "/conferma-tesseramenti",
      ])
    );
    expect(atleti).toHaveLength(4);

    expect(accounting.map((r) => r.prefix)).toEqual(
      expect.arrayContaining([
        "/admin",
        "/precaricamento-allenatori",
        "/permessi-accesso",
        "/permessi-certificati",
      ])
    );
    expect(accounting).toHaveLength(4);

    // Nessuna rotta ha un "gruppo" al di fuori dei tre valori attesi - una
    // futura story che aggiungesse un quarto gruppo dovra' estendere questo
    // test, non lasciarlo a rompersi silenziosamente.
    expect(routeConGruppo).toHaveLength(
      orariPalestre.length + atleti.length + accounting.length
    );
  });

  // Review fix: i test sopra usano expect.arrayContaining, che ignora
  // l'ordine - una regressione d'ordine introdotta dal nuovo ciclo `for` di
  // raggruppaVociNavigazione non verrebbe rilevata. Uguaglianza esatta
  // (ordine incluso) per un Ruolo reale, verificata a mano contro l'ordine
  // attuale di PROTECTED_ROUTES - se questo test rompe dopo aver
  // riordinato/aggiunto una rotta ammessa per ALLENATORE, aggiornare
  // l'elenco atteso, non ignorare il fallimento.
  it("mantiene l'ordine di PROTECTED_ROUTES per un Ruolo reale (Allenatore)", () => {
    const href = hrefVoci(filtraVociNavigazione(["ALLENATORE"]));
    expect(href).toEqual([
      "/i-miei-gruppi",
      "/mio-orario",
      "/presenze",
      "/storico-presenze",
      "/notifiche",
      "/vista-allenatore",
      "/dati-fisici",
      "/il-mio-profilo",
      "/campionati",
      "/partite",
      // Story 16.2: /sponsor e' ora visibile a tutti e sei i Ruoli.
      "/sponsor",
      // Story 17.1: /guida e' anch'essa visibile a tutti e sei i Ruoli.
      "/guida",
    ]);
  });

  // Story 15.2 (AC #1): Segreteria ha accesso a /orari ma non a /palestre -
  // il gruppo "Orari/Palestre" deve mostrare solo la figlia a cui ha
  // accesso, coerente col comportamento gia' testato con dati sintetici in
  // Story 15.1 ("un gruppo mostra solo le figlie a cui il Ruolo ha
  // accesso").
  it("Segreteria vede il gruppo Orari/Palestre con solo /orari tra le figlie", () => {
    const gruppo = trovaGruppo(filtraVociNavigazione(["SEGRETERIA"]), "Orari/Palestre");
    expect(gruppo).toBeDefined();
    expect(gruppo?.figlie).toEqual([{ href: "/orari", label: "Orari" }]);
  });

  // Story 15.2 (AC #1) + post-15.5: Admin e Dirigente hanno accesso a
  // /slot e /palestre ma non a /orari - speculare al test sopra, ora con
  // due figlie invece di una dopo l'ingresso di /slot nel gruppo.
  it.each(["ADMIN", "DIRIGENTE"] as const)(
    "%s vede il gruppo Orari/Palestre con /slot e /palestre tra le figlie, non /orari",
    (ruolo) => {
      const gruppo = trovaGruppo(filtraVociNavigazione([ruolo]), "Orari/Palestre");
      expect(gruppo).toBeDefined();
      expect(gruppo?.figlie).toEqual([
        { href: "/slot", label: "Orari" },
        { href: "/palestre", label: "Palestre" },
      ]);
    }
  );

  // Story 15.2 (Task 3, facoltativo): un Utente con entrambi i Ruoli
  // Segreteria e Admin (UtenteRuolo e' molti-a-molti, caso raro ma
  // possibile) vede tutte le figlie nello stesso gruppo - gia' garantito
  // dal filtro ".some()" di raggruppaVociNavigazione (Story 15.1), qui solo
  // verificato con dati reali per completezza.
  //
  // Review fix: uguaglianza esatta con ordine (non piu' arrayContaining) -
  // /orari e' dichiarata prima di /slot e /palestre in PROTECTED_ROUTES
  // proprio per rendere questo ordine deterministico e coerente con
  // l'etichetta padre "Orari/Palestre"; arrayContaining non avrebbe
  // intercettato un'inversione dell'ordine ne' una figlia duplicata
  // (lunghezza non verificata).
  //
  // Post-15.5 (richiesta esplicita dell'utente, 2026-08-05): /slot e' entrata
  // in questo gruppo - un Utente con entrambi i Ruoli vede ora **tre**
  // figlie, non due, con /orari e /slot che condividono lo stesso testo
  // "Orari" (scelta consapevole confermata dall'utente, nessun Ruolo reale
  // ha accesso a entrambe le rotte oggi - questo e' l'unico test che
  // esercita davvero il caso).
  it("un Utente con Ruoli Segreteria e Admin vede tutte e tre le figlie del gruppo Orari/Palestre, in ordine (incluse due 'Orari')", () => {
    const gruppo = trovaGruppo(filtraVociNavigazione(["SEGRETERIA", "ADMIN"]), "Orari/Palestre");
    expect(gruppo).toBeDefined();
    expect(gruppo?.figlie).toEqual([
      { href: "/orari", label: "Orari" },
      { href: "/slot", label: "Orari" },
      { href: "/palestre", label: "Palestre" },
    ]);
  });

  // Story 15.3 (AC #2): Segreteria ha accesso a /conferma-iscrizioni e
  // /conferma-certificati ma non a /import-atlete (ADMIN/DIRIGENTE-only) ne'
  // a /conferma-tesseramenti (Segreteria esplicitamente esclusa, Story
  // 13.1) - il gruppo "Atleti" deve mostrare solo le 2 figlie a cui ha
  // accesso, non le 4. Uguaglianza esatta con ordine fin da subito (lezione
  // dalla review di Story 15.2), coerente con l'ordine di dichiarazione in
  // PROTECTED_ROUTES (Task 1 di questa story).
  it("Segreteria vede il gruppo Atleti con solo 2 delle 4 figlie (conferma-iscrizioni, conferma-certificati)", () => {
    const gruppo = trovaGruppo(filtraVociNavigazione(["SEGRETERIA"]), "Atleti");
    expect(gruppo).toBeDefined();
    expect(gruppo?.figlie).toEqual([
      { href: "/conferma-iscrizioni", label: "Conferma iscrizioni" },
      { href: "/conferma-certificati", label: "Conferma certificati" },
    ]);
  });

  // Story 15.3 (AC #1): Admin e Dirigente hanno accesso a tutte e quattro le
  // rotte - il gruppo "Atleti" mostra tutte e quattro le figlie, nell'ordine
  // di dichiarazione del Task 1.
  it.each(["ADMIN", "DIRIGENTE"] as const)(
    "%s vede il gruppo Atleti con tutte e quattro le figlie, in ordine",
    (ruolo) => {
      const gruppo = trovaGruppo(filtraVociNavigazione([ruolo]), "Atleti");
      expect(gruppo).toBeDefined();
      expect(gruppo?.figlie).toEqual([
        { href: "/import-atlete", label: "Import atlete" },
        { href: "/conferma-iscrizioni", label: "Conferma iscrizioni" },
        { href: "/conferma-certificati", label: "Conferma certificati" },
        { href: "/conferma-tesseramenti", label: "Conferma tesseramenti" },
      ]);
    }
  );

  // Story 15.3: stesso principio del test gemello per "Orari/Palestre"
  // (review di Story 15.2) - un Ruolo senza accesso a nessuna delle quattro
  // rotte non deve produrre un nodo gruppo "Atleti" spurio.
  it("Allenatore non vede alcun gruppo Atleti (nessun accesso alle quattro rotte)", () => {
    const gruppo = trovaGruppo(filtraVociNavigazione(["ALLENATORE"]), "Atleti");
    expect(gruppo).toBeUndefined();
  });

  // Story 15.3: stesso principio del test gemello per "Orari/Palestre"
  // (dedup Admin+Dirigente su /palestre, review di Story 15.2) - qui con
  // quattro rotte condivise invece di una sola: un Utente con entrambi i
  // Ruoli deve vedere quattro figlie, non otto duplicate.
  it("un Utente con Ruoli Admin e Dirigente vede quattro figlie del gruppo Atleti, non duplicate", () => {
    const gruppo = trovaGruppo(filtraVociNavigazione(["ADMIN", "DIRIGENTE"]), "Atleti");
    expect(gruppo).toBeDefined();
    expect(gruppo?.figlie).toEqual([
      { href: "/import-atlete", label: "Import atlete" },
      { href: "/conferma-iscrizioni", label: "Conferma iscrizioni" },
      { href: "/conferma-certificati", label: "Conferma certificati" },
      { href: "/conferma-tesseramenti", label: "Conferma tesseramenti" },
    ]);
  });

  // Review fix: il caso che questa storia introduce per la prima volta - due
  // gruppi coesistenti per lo stesso Ruolo - non era mai verificato end-to-
  // end (ogni test sopra usa trovaGruppo per isolare un solo gruppo).
  // Segreteria vede oggi ENTRAMBI "Atleti" (2 figlie) e "Orari/Palestre" (1
  // figlia) nello stesso array, senza alcuna voce diretta - comportamento di
  // produzione reale, non ipotetico. Uguaglianza esatta sull'intero array
  // (ordine tra i due nodi gruppo incluso, non solo il contenuto di ciascuno
  // preso isolatamente).
  it("Segreteria vede entrambi i gruppi coesistenti (Atleti e Orari/Palestre) e nessun'altra voce diretta oltre /sponsor e /guida (Story 16.2/17.1)", () => {
    const voci = filtraVociNavigazione(["SEGRETERIA"]);
    expect(voci).toEqual([
      {
        tipo: "gruppo",
        label: "Atleti",
        figlie: [
          { href: "/conferma-iscrizioni", label: "Conferma iscrizioni" },
          { href: "/conferma-certificati", label: "Conferma certificati" },
        ],
      },
      {
        tipo: "gruppo",
        label: "Orari/Palestre",
        figlie: [{ href: "/orari", label: "Orari" }],
      },
      // Story 16.2/17.1: /sponsor e /guida sono visibili a tutti i Ruoli.
      { tipo: "voce", href: "/sponsor", label: "Sponsor" },
      { tipo: "voce", href: "/guida", label: "Guida" },
    ]);
  });

  // Review fix: a differenza di "Orari/Palestre" (Ruoli disgiunti, Segreteria
  // vs Admin/Dirigente), qui Segreteria e Admin condividono 2 delle 4 rotte
  // (conferma-iscrizioni, conferma-certificati) - caso di sovrapposizione
  // PARZIALE mai testato. Un Utente con entrambi i Ruoli deve vedere
  // l'unione (tutte e 4 le figlie), non le 2 di Segreteria ne' un duplicato
  // sulle 2 condivise.
  it("un Utente con Ruoli Segreteria e Admin vede l'unione delle 4 figlie del gruppo Atleti, senza duplicati sulle 2 condivise", () => {
    const gruppo = trovaGruppo(filtraVociNavigazione(["SEGRETERIA", "ADMIN"]), "Atleti");
    expect(gruppo).toBeDefined();
    expect(gruppo?.figlie).toEqual([
      { href: "/import-atlete", label: "Import atlete" },
      { href: "/conferma-iscrizioni", label: "Conferma iscrizioni" },
      { href: "/conferma-certificati", label: "Conferma certificati" },
      { href: "/conferma-tesseramenti", label: "Conferma tesseramenti" },
    ]);
  });

  // Review fix: nessuna guardia d'ordine di primo livello copriva un Ruolo
  // che vede davvero "Atleti" - l'unico test con uguaglianza esatta
  // sull'intero array era scoped ad Allenatore, che non ha accesso a
  // nessuna delle rotte di questa storia. Un futuro riordino accidentale
  // del blocco "Atleti" rispetto a /precaricamento-allenatori, /gruppi,
  // ecc. non sarebbe stato rilevato da nessun test esistente.
  // Story 15.4: riscritto quasi per intero - /admin (era la prima voce) e
  // /precaricamento-allenatori (era una voce diretta a meta' elenco)
  // spariscono da quelle posizioni; un nuovo nodo gruppo "Accounting" (3
  // figlie) compare per ultimo, coerente con AC #1 ("ultima voce del
  // menu"). Ricalcolato leggendo PROTECTED_ROUTES per intero dopo lo
  // spostamento del Task 1, non copiato dall'output del test fallito.
  //
  // Post-15.5 (richiesta esplicita dell'utente, 2026-08-05): /slot e' entrata
  // nel gruppo "Orari/Palestre" - sparisce dalla sua posizione di voce
  // diretta dopo /gruppi, il gruppo "Orari/Palestre" guadagna una seconda
  // figlia (/slot, prima di /palestre).
  //
  // Story 16.1 (Epic 16): nuova voce diretta /sponsor, dichiarata dopo
  // /partite e prima del gruppo "Accounting" in PROTECTED_ROUTES - nessun
  // "gruppo" assegnato (non fa parte di Accounting).
  // Story 16.2: /sponsor estesa a tutti e sei i Ruoli (era Admin/Dirigente-
  // only) - resta comunque nella stessa posizione per Admin.
  // Story 17.1 (Epic 17): nuova voce diretta /guida, dichiarata subito dopo
  // /sponsor - stesso principio, visibile a tutti e sei i Ruoli.
  it("mantiene l'ordine completo di PROTECTED_ROUTES per Admin (voci dirette e nodi gruppo insieme)", () => {
    const voci = filtraVociNavigazione(["ADMIN"]);
    expect(voci).toEqual([
      {
        tipo: "gruppo",
        label: "Atleti",
        figlie: [
          { href: "/import-atlete", label: "Import atlete" },
          { href: "/conferma-iscrizioni", label: "Conferma iscrizioni" },
          { href: "/conferma-certificati", label: "Conferma certificati" },
          { href: "/conferma-tesseramenti", label: "Conferma tesseramenti" },
        ],
      },
      {
        tipo: "gruppo",
        label: "Orari/Palestre",
        figlie: [
          { href: "/slot", label: "Orari" },
          { href: "/palestre", label: "Palestre" },
        ],
      },
      { tipo: "voce", href: "/gruppi", label: "Gruppi" },
      { tipo: "voce", href: "/impostazioni", label: "Impostazioni" },
      { tipo: "voce", href: "/wizard-nuova-stagione", label: "Wizard nuova stagione" },
      { tipo: "voce", href: "/campionati", label: "Campionati" },
      { tipo: "voce", href: "/partite", label: "Partite" },
      { tipo: "voce", href: "/sponsor", label: "Sponsor" },
      { tipo: "voce", href: "/guida", label: "Guida" },
      {
        tipo: "gruppo",
        label: "Accounting",
        figlie: [
          { href: "/admin", label: "Amministrazione" },
          { href: "/precaricamento-allenatori", label: "Precaricamento allenatori" },
          { href: "/permessi-accesso", label: "Permessi di accesso" },
          { href: "/permessi-certificati", label: "Permessi certificati" },
        ],
      },
    ]);
  });

  // Story 15.4 (AC #1): il gruppo "Accounting" ha le quattro figlie attese,
  // nell'ordine del Task 1, e compare per ultimo nell'array risultante -
  // non solo "presente" (gia' verificato anche dal test di ordine completo
  // sopra, qui isolato con trovaGruppo per un test piu' mirato e leggibile).
  // Story 15.4 estensione (2026-08-06): /permessi-certificati e' entrata nel
  // gruppo (quarta figlia) - l'esclusione originale (AC #3) era un
  // fraintendimento dell'appunto originale dell'utente, corretto su sua
  // richiesta esplicita.
  it("Admin vede il gruppo Accounting con tutte e quattro le figlie, posizionato per ultimo", () => {
    const voci = filtraVociNavigazione(["ADMIN"]);
    const gruppo = trovaGruppo(voci, "Accounting");
    expect(gruppo).toBeDefined();
    expect(gruppo?.figlie).toEqual([
      { href: "/admin", label: "Amministrazione" },
      { href: "/precaricamento-allenatori", label: "Precaricamento allenatori" },
      { href: "/permessi-accesso", label: "Permessi di accesso" },
      { href: "/permessi-certificati", label: "Permessi certificati" },
    ]);
    expect(voci[voci.length - 1]).toBe(gruppo);
  });

  // Story 15.4: stesso principio dei test gemelli per "Orari/Palestre" e
  // "Atleti" (Story 15.2/15.3) - un Ruolo senza accesso a nessuna delle
  // quattro rotte non deve produrre un nodo gruppo "Accounting" spurio.
  it("Allenatore non vede alcun gruppo Accounting (nessun accesso alle quattro rotte)", () => {
    const gruppo = trovaGruppo(filtraVociNavigazione(["ALLENATORE"]), "Accounting");
    expect(gruppo).toBeUndefined();
  });

  // Review fix (Story 15.4): le quattro rotte di "Accounting" sono oggi
  // ruoliAmmessi: ["ADMIN"] soltanto, ma Dirigente ha accesso a molte altre
  // rotte ADMIN-adiacenti (/gruppi, /slot, /wizard-nuova-stagione,
  // /campionati) - senza questo test, un futuro allargamento accidentale di
  // ruoliAmmessi su una delle quattro rotte a includere DIRIGENTE sarebbe
  // rilevato solo dal test generico "esistono esattamente i nodi gruppo
  // attesi" (che conta le rotte, non chi le vede), non da un test scoped al
  // Ruolo - a differenza di Atleti/Orari-Palestre, che hanno gia' una
  // copertura simmetrica Admin+Dirigente perche' quei gruppi condividono
  // davvero dei Ruoli.
  it("Dirigente non vede alcun gruppo Accounting (le quattro rotte sono ADMIN-only)", () => {
    const gruppo = trovaGruppo(filtraVociNavigazione(["DIRIGENTE"]), "Accounting");
    expect(gruppo).toBeUndefined();
  });
});

// Story 15.1: dati sintetici, non l'array reale PROTECTED_ROUTES - stesso
// principio gia' usato per isAutorizzato/rottaAbilitataMock in Story
// 12.2/12.3.
function routeSintetica(overrides: {
  prefix: string;
  ruoliAmmessi: Ruolo[];
  navLabel: string;
  gruppo?: string;
  nascostaDallaNav?: boolean;
}) {
  return overrides;
}

describe("raggruppaVociNavigazione", () => {
  it("raggruppa le rotte che condividono lo stesso gruppo in un unico nodo, in ordine di prima apparizione", () => {
    const routes = [
      routeSintetica({ prefix: "/a", ruoliAmmessi: ["ADMIN"], navLabel: "A" }),
      routeSintetica({
        prefix: "/b1",
        ruoliAmmessi: ["ADMIN"],
        navLabel: "B1",
        gruppo: "Gruppo B",
      }),
      routeSintetica({ prefix: "/c", ruoliAmmessi: ["ADMIN"], navLabel: "C" }),
      routeSintetica({
        prefix: "/b2",
        ruoliAmmessi: ["ADMIN"],
        navLabel: "B2",
        gruppo: "Gruppo B",
      }),
    ];

    const voci = raggruppaVociNavigazione(routes, ["ADMIN"]);

    expect(voci).toEqual([
      { tipo: "voce", href: "/a", label: "A" },
      {
        tipo: "gruppo",
        label: "Gruppo B",
        figlie: [
          { href: "/b1", label: "B1" },
          { href: "/b2", label: "B2" },
        ],
      },
      { tipo: "voce", href: "/c", label: "C" },
    ]);
  });

  it("un gruppo la cui nessuna figlia sopravvive al filtro per Ruolo non produce un nodo vuoto", () => {
    const routes = [
      routeSintetica({
        prefix: "/solo-admin",
        ruoliAmmessi: ["ADMIN"],
        navLabel: "Solo Admin",
        gruppo: "Gruppo Admin",
      }),
    ];

    const voci = raggruppaVociNavigazione(routes, ["ALLENATORE"]);

    expect(voci).toEqual([]);
  });

  it("un gruppo mostra solo le figlie a cui il Ruolo ha accesso, non tutte quelle configurate", () => {
    const routes = [
      routeSintetica({
        prefix: "/tutti",
        ruoliAmmessi: ["ADMIN", "SEGRETERIA"],
        navLabel: "Tutti",
        gruppo: "Gruppo Misto",
      }),
      routeSintetica({
        prefix: "/solo-admin",
        ruoliAmmessi: ["ADMIN"],
        navLabel: "Solo Admin",
        gruppo: "Gruppo Misto",
      }),
    ];

    const voci = raggruppaVociNavigazione(routes, ["SEGRETERIA"]);

    expect(voci).toEqual([
      {
        tipo: "gruppo",
        label: "Gruppo Misto",
        figlie: [{ href: "/tutti", label: "Tutti" }],
      },
    ]);
  });

  it("rispetta nascostaDallaNav anche dentro un gruppo", () => {
    const routes = [
      routeSintetica({
        prefix: "/visibile",
        ruoliAmmessi: ["ADMIN"],
        navLabel: "Visibile",
        gruppo: "Gruppo",
      }),
      routeSintetica({
        prefix: "/nascosta",
        ruoliAmmessi: ["ADMIN"],
        navLabel: "Nascosta",
        gruppo: "Gruppo",
        nascostaDallaNav: true,
      }),
    ];

    const voci = raggruppaVociNavigazione(routes, ["ADMIN"]);

    expect(voci).toEqual([
      {
        tipo: "gruppo",
        label: "Gruppo",
        figlie: [{ href: "/visibile", label: "Visibile" }],
      },
    ]);
  });
});

describe("isGruppoAttivo", () => {
  const gruppo: VoceGruppo = {
    tipo: "gruppo",
    label: "Gruppo",
    figlie: [
      { href: "/orari", label: "Orari" },
      { href: "/palestre", label: "Palestre" },
    ],
  };

  it("è attivo quando il pathname coincide con una figlia", () => {
    expect(isGruppoAttivo("/palestre", gruppo)).toBe(true);
  });

  it("è attivo quando il pathname è una sotto-pagina di una figlia", () => {
    expect(isGruppoAttivo("/palestre/1", gruppo)).toBe(true);
  });

  it("non è attivo per un pathname estraneo a tutte le figlie", () => {
    expect(isGruppoAttivo("/admin", gruppo)).toBe(false);
  });

  it("non è attivo per un gruppo senza figlie", () => {
    expect(isGruppoAttivo("/qualunque", { tipo: "gruppo", label: "Vuoto", figlie: [] })).toBe(
      false
    );
  });
});

// Story 9.10 (Review][Patch): estratta come funzione pura testabile - prima
// viveva inline dentro il .map() di NavBarClient.tsx, non testabile in
// isolamento senza montare React. Proprio uno stato derivato non testato e'
// stata la causa della regressione (voce attiva mai aggiornata) che ha
// originato questa storia.
describe("isVoceAttiva", () => {
  it("e' attiva quando il pathname coincide esattamente con l'href", () => {
    expect(isVoceAttiva("/palestre", "/palestre")).toBe(true);
  });

  it("e' attiva quando il pathname e' una sotto-pagina dell'href", () => {
    expect(isVoceAttiva("/palestre/1", "/palestre")).toBe(true);
  });

  it("non e' attiva per un pathname diverso", () => {
    expect(isVoceAttiva("/admin", "/palestre")).toBe(false);
  });

  it("non e' attiva per un href che e' solo prefisso testuale senza separatore '/'", () => {
    // "/palestreX" non e' una sotto-pagina di "/palestre" - deve richiedere
    // il separatore "/" esplicito, non un semplice startsWith su tutta la
    // stringa.
    expect(isVoceAttiva("/palestreX", "/palestre")).toBe(false);
  });

  it("e' attiva per /impostazioni quando il pathname e' /smtp o /logo, nonostante non compaiano piu' come voci dirette (review fix Story 9.24)", () => {
    expect(isVoceAttiva("/smtp", "/impostazioni")).toBe(true);
    expect(isVoceAttiva("/logo", "/impostazioni")).toBe(true);
    expect(isVoceAttiva("/logo/qualcosa", "/impostazioni")).toBe(true);
  });

  it("non e' attiva per /impostazioni su un pathname estraneo", () => {
    expect(isVoceAttiva("/admin", "/impostazioni")).toBe(false);
  });
});
