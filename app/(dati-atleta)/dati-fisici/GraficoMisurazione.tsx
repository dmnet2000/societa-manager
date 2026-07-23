import type { Misurazione } from "@/lib/db-rls/misurazione-atleta";
import { calcolaCoordinateGrafico } from "@/lib/misurazioni";
import styles from "./GraficoMisurazione.module.css";

const LARGHEZZA = 280;
const ALTEZZA = 120;
const PADDING = 24;

// Story 6.2 (AC #1/#2/#6): un grafico per singolo "tipo" (mai serie
// sovrapposte, decisione presa in fase di creazione della storia - unita' di
// misura diverse tra tipi renderebbero un asse condiviso fuorviante). Nessuna
// interattivita' (niente useState/hook) - Server Component, nessuna
// direttiva "use client" necessaria.
export function GraficoMisurazione({
  tipo,
  unitaMisura,
  punti,
}: {
  tipo: string;
  unitaMisura: string;
  punti: Misurazione[];
}) {
  // Guardia difensiva (review fix): il chiamante (page.tsx) passa solo
  // gruppi gia' filtrati da raggruppaPerTipo (>= 2 punti), ma senza questo
  // controllo un array vuoto produrrebbe Math.min/max = Infinity/-Infinity
  // mostrati letteralmente in UI ("Min: Infinity cm").
  if (punti.length < 2) {
    return null;
  }

  const valori = punti.map((p) => p.valore);
  const coordinate = calcolaCoordinateGrafico(valori, {
    larghezza: LARGHEZZA,
    altezza: ALTEZZA,
    padding: PADDING,
  });
  const puntiPolyline = coordinate.map((c) => `${c.x},${c.y}`).join(" ");
  const min = Math.min(...valori);
  const max = Math.max(...valori);
  const titolo = `Andamento ${tipo} (${unitaMisura})`;

  return (
    <figure className={styles.grafico}>
      <figcaption className={styles.titolo}>{titolo}</figcaption>
      {/* Solo <title>, non anche aria-label (review fix): i due insieme
          sono un meccanismo di nome accessibile ridondante sullo stesso
          <svg> - alcuni screen reader annuncerebbero il testo due volte. */}
      <svg viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`} width="100%" role="img">
        <title>{titolo}</title>
        <polyline
          points={puntiPolyline}
          fill="none"
          className={styles.linea}
        />
      </svg>
      <p className={styles.etichetteAsse}>
        <span>
          Min: {min} {unitaMisura}
        </span>
        <span>
          Max: {max} {unitaMisura}
        </span>
      </p>
    </figure>
  );
}
