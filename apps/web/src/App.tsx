import styles from './App.module.scss';

export function App() {
  return (
    <main className={styles.app}>
      <h1 className={styles.title}>KizunaDex</h1>
      <p className={styles.description}>Le projet est initialisé. Les interfaces seront développées ensuite.</p>
      <a href="/api/health" target="_blank" rel="noreferrer">Vérifier l’API</a>
    </main>
  );
}
