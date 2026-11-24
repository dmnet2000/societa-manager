// Referto elettronico, story 2.5: funzioni pure condivise dalla pagina
// (Server Component) e dalla riga (Client Component) di assegnazione dei
// tablet - in un modulo senza "use client", perche' una funzione esportata da
// un file "use client" non si puo' chiamare dal server.

export type TabletOpzione = { id: string; email: string; attivo: boolean };

// Il nome del tablet e' la parte dell'email prima di "@" (email sintetica
// <nome>@tablet.invalid, story 2.3).
export function nomeTablet(email: string): string {
  const chiocciola = email.indexOf("@");
  return chiocciola === -1 ? email : email.slice(0, chiocciola);
}

// Tablet mostrati nel menu di una gara: tutti quelli attivi, piu' quello
// gia' assegnato a questa gara anche se nel frattempo e' stato disattivato
// (resta visibile come "(disattivato)", mai proposto alle altre gare).
export function tabletNelMenu(
  tablet: readonly TabletOpzione[],
  assegnatoId: string | null
): TabletOpzione[] {
  return tablet.filter((t) => t.attivo || t.id === assegnatoId);
}
