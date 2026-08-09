import { describe, expect, it } from "vitest";
import { convenzioneVoucherValida } from "./convenzione-voucher-valida";

describe("convenzioneVoucherValida", () => {
  it("returns true per una Convenzione attiva (AC #2)", () => {
    expect(convenzioneVoucherValida({ tipo: "CONVENZIONE", attiva: true })).toBe(true);
  });

  it("returns false per un Banner pubblicitario, anche se attivo (AC #3)", () => {
    expect(convenzioneVoucherValida({ tipo: "BANNER", attiva: true })).toBe(false);
  });

  it("returns false per una Convenzione disattivata", () => {
    expect(convenzioneVoucherValida({ tipo: "CONVENZIONE", attiva: false })).toBe(false);
  });

  it("returns false quando lo Sponsor non esiste (id inesistente/manomesso)", () => {
    expect(convenzioneVoucherValida(null)).toBe(false);
  });
});
