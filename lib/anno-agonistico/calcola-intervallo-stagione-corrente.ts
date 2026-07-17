// AD-8: l'Anno Agonistico va dal 1 agosto al 30 giugno. Se "oggi" cade tra
// gennaio e luglio, la stagione e' iniziata l'agosto dell'anno precedente;
// se cade tra agosto e dicembre, la stagione inizia quest'agosto.
export function calcolaIntervalloStagioneCorrente(oggi: Date): {
  dataInizio: Date;
  dataFine: Date;
} {
  const anno = oggi.getUTCFullYear();
  const mese = oggi.getUTCMonth(); // 0 = gennaio, 7 = agosto

  const annoInizio = mese >= 7 ? anno : anno - 1;

  return {
    dataInizio: new Date(Date.UTC(annoInizio, 7, 1)),
    dataFine: new Date(Date.UTC(annoInizio + 1, 5, 30)),
  };
}
