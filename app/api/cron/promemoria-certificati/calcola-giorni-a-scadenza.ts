// Story 4.6 (FR-16): confronto per sola data di calendario, fuso Europe/Rome
// per "oggi" - stessa costante e stesso principio gia' stabiliti e
// corretti dopo un bug reale in Story 4.5 (certificato-scaduto.ts): un
// conteggio in UTC sbaglierebbe di un giorno per 1-2 ore ogni giorno, a
// cavallo della mezzanotte italiana. Funzione pura: `oggi` e' un parametro
// esplicito, mai `new Date()` letta internamente, per restare testabile
// senza mock del tempo (stesso pattern di certificato-scaduto.ts).
const FORMATTER_DATA_ROMA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
});

const MS_PER_GIORNO = 24 * 60 * 60 * 1000;

function dataIsoAUtcMs(dataIso: string): number {
  const [anno, mese, giorno] = dataIso.split("-").map(Number);
  return Date.UTC(anno, mese - 1, giorno);
}

export function calcolaGiorniAScadenza(
  dataFineValidita: string | null,
  oggi: Date
): number | null {
  if (!dataFineValidita) return null;

  const oggiIso = FORMATTER_DATA_ROMA.format(oggi);
  const scadenzaIso = dataFineValidita.slice(0, 10);

  return Math.round(
    (dataIsoAUtcMs(scadenzaIso) - dataIsoAUtcMs(oggiIso)) / MS_PER_GIORNO
  );
}
