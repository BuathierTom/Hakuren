import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon/icon';
import styles from './player-portrait.module.scss';

export function Portrait({
  src,
  small = false,
  list = false,
}: {
  src: string | null;
  small?: boolean;
  list?: boolean;
}) {
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
    <span
      className={`${styles.portrait} ${small ? styles.smallPortrait : ''} ${list ? styles.listPortrait : ''}`}
      aria-hidden="true"
    >
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
          <Icon name="shirt" size={small ? 25 : 50} />
          {!small && <span>Portrait à venir</span>}
        </span>
      )}
    </span>
  );
}
