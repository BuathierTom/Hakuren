import { useEffect, useState } from 'react';
import styles from './player-portrait.module.scss';

export function Portrait({ src, small = false }: { src: string | null; small?: boolean }) {
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt(0), [src]);
  const candidates = src ? [src] : [];
  if (src) {
    const url = new URL(src);
    if (url.hostname === 'dxi4wb638ujep.cloudfront.net' && url.pathname.endsWith('.webp')) {
      url.pathname = url.pathname.replace(/\.webp$/, '.png');
      candidates.push(url.href);
    }
  }
  const source = candidates[attempt];
  return (
    <span className={`${styles.portrait} ${small ? styles.smallPortrait : ''}`} aria-hidden="true">
      {source ? (
        <img
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          width="160"
          height="160"
          referrerPolicy="no-referrer"
          onError={() => setAttempt((value) => value + 1)}
        />
      ) : (
        <span className={styles.placeholder}>
          <span>{small ? '—' : 'Portrait indisponible'}</span>
        </span>
      )}
    </span>
  );
}
