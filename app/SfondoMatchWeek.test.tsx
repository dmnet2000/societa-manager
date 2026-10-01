import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DecorazioniMatchWeek, classeFasciaMatchWeek } from "./SfondoMatchWeek";
import styles from "./sfondo-match-week.module.css";

// Sfondo Match Week (variante C, 2026-10-01): le decorazioni sono solo
// visive e non devono mai arrivare a screen reader o al focus da tastiera.
describe("SfondoMatchWeek", () => {
  it("espone la classe della fascia definita nel CSS module", () => {
    expect(classeFasciaMatchWeek).toBeTruthy();
    expect(classeFasciaMatchWeek).toBe(styles.fascia);
  });

  it("rete e pallone sono aria-hidden e il pallone non e' focalizzabile", () => {
    const html = renderToStaticMarkup(<DecorazioniMatchWeek />);
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
    expect(html).toContain('focusable="false"');
    expect(html).toContain(styles.rete);
    expect(html).toContain(styles.pallone);
  });
});
