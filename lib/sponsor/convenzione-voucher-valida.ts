export type SponsorPerVoucher = { tipo: string; attiva: boolean } | null;

// AC #2/#3: il voucher esiste solo per uno Sponsor tipo CONVENZIONE attivo -
// mai per un Banner pubblicitario, uno Sponsor disattivato, o un id
// inesistente (sponsor === null, link manomesso/obsoleto). Pura, testata
// senza mock Prisma.
export function convenzioneVoucherValida(sponsor: SponsorPerVoucher): boolean {
  return !!sponsor && sponsor.tipo === "CONVENZIONE" && sponsor.attiva;
}
