import type { ReactNode } from 'react';
import styles from './player-detail-block.module.scss';

export function PlayerDetailBlock({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.block} aria-label={title}>
      <header className={styles.heading}>
        <h3>{title}</h3>
        {meta && <span>{meta}</span>}
      </header>
      <div className={styles.content}>{children}</div>
    </section>
  );
}
