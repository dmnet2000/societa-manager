import styles from "./non-autorizzato.module.css";

export default function NonAutorizzatoPage() {
  return (
    <main>
      <h1>Non autorizzato</h1>
      <p className={styles.testo}>
        Non hai i permessi per accedere a questa pagina.
      </p>
    </main>
  );
}
