import styles from "./sfondo-match-week.module.css";

// Sfondo "Match Week" (variante C, scelta utente 2026-10-01): classe da
// mettere sul contenitore della fascia + decorazioni da inserire come suoi
// primi figli. Il contenitore resta quello della pagina (section/main/div
// con i suoi attributi ARIA), qui solo la parte visiva.
// Vedi app/sfondo-match-week.module.css.
export const classeFasciaMatchWeek = styles.fascia;

export function DecorazioniMatchWeek() {
  return (
    <>
      <div className={`${styles.decorazione} ${styles.rete}`} aria-hidden="true" />
      <svg
        className={`${styles.decorazione} ${styles.pallone}`}
        viewBox="0 0 200 200"
        aria-hidden="true"
        focusable="false"
      >
        <g fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="100" cy="100" r="96" />
          <path d="M100 4c-30 40-30 120 0 192" />
          <path d="M8 75c50 10 120 0 180-40" />
          <path d="M20 160c40-50 110-75 172-60" />
        </g>
      </svg>
    </>
  );
}
