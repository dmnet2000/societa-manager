import { describe, expect, it } from "vitest";
import { validaNuovaPassword } from "./validazione-password";

describe("validaNuovaPassword", () => {
  it("rifiuta una password piu' corta di 8 caratteri", () => {
    expect(validaNuovaPassword("corta1", "corta1")).toEqual({
      code: "VALIDATION",
      message: "La nuova password deve avere almeno 8 caratteri (non solo spazi).",
    });
  });

  it("rifiuta una password di soli spazi anche se lunga 8+ caratteri", () => {
    expect(validaNuovaPassword("        ", "        ")).toEqual({
      code: "VALIDATION",
      message: "La nuova password deve avere almeno 8 caratteri (non solo spazi).",
    });
  });

  it("rifiuta una password piu' lunga di 72 caratteri", () => {
    const lunga = "a".repeat(73);
    expect(validaNuovaPassword(lunga, lunga)).toEqual({
      code: "VALIDATION",
      message: "La nuova password non può superare i 72 caratteri.",
    });
  });

  it("rifiuta se la conferma non coincide", () => {
    expect(validaNuovaPassword("password1", "password2")).toEqual({
      code: "VALIDATION",
      message: "La conferma non coincide con la nuova password.",
    });
  });

  it("restituisce null per una password valida con conferma coincidente", () => {
    expect(validaNuovaPassword("password1", "password1")).toBeNull();
  });
});
