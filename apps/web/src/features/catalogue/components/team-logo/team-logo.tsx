import { useState } from 'react';
import styles from './team-logo.module.scss';
export function TeamLogo({ name, src }: { name: string; src: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={styles.logo}>
      {src && !failed ? (
        <img
          src={src}
          alt={`Écusson de ${name}`}
          width="64"
          height="64"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label={`Écusson indisponible pour ${name}`}>
          {name
            .split(/\s+/)
            .map((word) => word[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </span>
      )}
    </span>
  );
}
