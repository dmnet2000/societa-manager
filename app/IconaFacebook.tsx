// Story 18.30 (richiesta esplicita dell'utente: "icone ufficiali dei
// social"): deroga alla convenzione "icone disegnate a mano" di
// icone-azione-riga.tsx (Story 15.5) - un logo di marca non puo' essere
// ridisegnato a mano restando riconoscibile, stessa deroga gia' accettata
// per IconaAiuto in quel file. Path del glifo "f" di Facebook da Font
// Awesome Free 6 (licenza CC BY 4.0 per le icone brand, permissiva con
// obbligo di attribuzione - questo commento la soddisfa),
// https://github.com/FortAwesome/Font-Awesome/blob/6.x/svgs/brands/facebook-f.svg,
// viewBox e tracciato invariati. width/height calcolati per mantenere il
// rapporto naturale del viewBox (320/512) a un'altezza di 20px - un
// width=20 forzato (uguale all'height, come in un viewBox quadrato)
// schiaccerebbe il glifo in una gabbia con margini laterali innaturali,
// rendendolo visivamente più piccolo/stretto dell'icona Instagram
// affiancata (viewBox quasi quadrato, 448/512) allo stesso height.
export function IconaFacebook() {
  return (
    <svg
      viewBox="0 0 320 512"
      width="13"
      height="20"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M279.14 288l14.22-92.66h-88.91v-59.41c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
    </svg>
  );
}
