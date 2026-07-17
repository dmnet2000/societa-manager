import { describe, expect, it } from "vitest";
import { parseRuoli } from "./ruoli";

describe("parseRuoli", () => {
  it("returns an empty array when the value is not an array", () => {
    expect(parseRuoli(undefined)).toEqual([]);
    expect(parseRuoli(null)).toEqual([]);
    expect(parseRuoli("ADMIN")).toEqual([]);
    expect(parseRuoli({ ruoli: ["ADMIN"] })).toEqual([]);
  });

  it("filters out values that are not valid Ruolo strings", () => {
    expect(parseRuoli(["ADMIN", "NON_UN_RUOLO", 42, null])).toEqual(["ADMIN"]);
  });

  it("keeps all values when every entry is a valid Ruolo", () => {
    expect(parseRuoli(["ATLETA", "ALLENATORE"])).toEqual([
      "ATLETA",
      "ALLENATORE",
    ]);
  });

  it("dedupes repeated Ruolo values", () => {
    expect(parseRuoli(["ADMIN", "ADMIN", "ATLETA"])).toEqual([
      "ADMIN",
      "ATLETA",
    ]);
  });
});
