import { HeaderPubblico } from "../HeaderPubblico";
import { FooterPubblico } from "../FooterPubblico";
import { InSviluppoPubblico } from "../InSviluppoPubblico";

// Placeholder "in sviluppo" - sostituire con la pagina reale quando la
// Story 18.9 verra' implementata, non estendere questo file (vedi
// InSviluppoPubblico.tsx per il motivo). Header/Footer leggono dati
// (logo/nome settore) che possono cambiare in qualunque momento - stesso
// motivo di dynamic = "force-dynamic" gia' in uso su "/" e "/squadre".
export const dynamic = "force-dynamic";

export default function CalendarioPage() {
  return (
    <>
      <HeaderPubblico />
      <InSviluppoPubblico titolo="Calendario" />
      <FooterPubblico />
    </>
  );
}
