// Story 16.3: aritmetica modulare per il carosello Banner in homepage. JS
// `%` non avvolge i negativi come atteso (`-1 % 3 === -1`, non `2`) - serve
// `(indice - 1 + totale) % totale` per `indietro`, non solo `(indice - 1) %
// totale`. Pure, nessuna dipendenza da React/DOM/timer - estratte per essere
// testabili senza montare il componente client (stesso principio di
// raggruppaSponsorPerTipo/risolviNomeVoucher, Story 16.2).
//
// Story 18.13: promossa da lib/sponsor/carosello-indice.ts a questa
// posizione condivisa - secondo consumer reale (il carosello Post Facebook,
// app/PostFacebookCarosello.tsx), stesso principio di estrazione gia'
// applicato piu' volte in questo progetto (es. HeaderPubblico/FooterPubblico,
// Story 18.8). Contenuto invariato.
export function avanti(indice: number, totale: number): number {
  if (totale <= 1) return 0;
  return (indice + 1) % totale;
}

export function indietro(indice: number, totale: number): number {
  if (totale <= 1) return 0;
  return (indice - 1 + totale) % totale;
}

// Review fix (2026-08-09, Blind Hunter + Edge Case Hunter, trovato
// indipendentemente da entrambi): `indice` puo' restare "stale" oltre la
// nuova lunghezza se l'elenco Banner si riduce tra un render e l'altro (es.
// un Admin disattiva uno Sponsor mentre la home e' gia' montata) - senza
// questo clamp, un accesso diretto a banner[indice] sarebbe undefined.
export function indiceEntroLimiti(indice: number, totale: number): number {
  if (totale <= 0) return 0;
  return Math.min(indice, totale - 1);
}
