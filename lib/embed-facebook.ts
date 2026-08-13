// Story 18.5: costruzione dell'URL del *Page Plugin* ufficiale di Facebook -
// mirror di costruisciLinkMappaIncorporata (lib/link-naviga-palestra.ts,
// Story 9.6): funzione pura, nessuna chiamata di rete, nessun token/API
// (coerente con NFR6 e con la decisione presa con l'utente di limitare
// questa storia a Facebook). L'href della Pagina va url-encodato per intero
// (a differenza della query di Google Maps, qui non c'e' alcuna parte "non
// codificata" come la virgola lat/lng).
export function costruisciLinkPaginaFacebookIncorporata(urlPagina: string): string {
  const href = encodeURIComponent(urlPagina);
  return `https://www.facebook.com/plugins/page.php?href=${href}&tabs=timeline&width=340&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=false`;
}
