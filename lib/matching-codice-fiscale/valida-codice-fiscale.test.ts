import { describe, expect, it } from "vitest";
import { isCodiceFiscaleValido } from "./valida-codice-fiscale";

describe("isCodiceFiscaleValido", () => {
  it("accepts a well-formed 16-character Codice Fiscale", () => {
    expect(isCodiceFiscaleValido("RSSMRA10A41H501Z")).toBe(true);
  });

  it("rejects a value that is too short", () => {
    expect(isCodiceFiscaleValido("123")).toBe(false);
  });

  it("rejects a value with invalid characters", () => {
    expect(isCodiceFiscaleValido("RSSMRA10A41H501!")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isCodiceFiscaleValido("")).toBe(false);
  });
});
