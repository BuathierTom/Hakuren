import { useState } from 'react';
import type { TechniqueDetail } from '@shared/catalogue';
import styles from './technique-video.module.scss';

export function TechniqueVideo({
  preview,
  name,
  autoPlay = false,
}: {
  preview: NonNullable<TechniqueDetail['preview']>;
  name: string;
  autoPlay?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return (
    <>
      {failed ? (
        <div className={styles.unavailable} role="status">
          <p>La démonstration est momentanément indisponible.</p>
          <button
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            Réessayer
          </button>
        </div>
      ) : (
        <video
          key={`${preview.url}/${attempt}`}
          className={styles.video}
          src={preview.url}
          controls
          playsInline
          autoPlay={autoPlay}
          muted={autoPlay}
          preload={autoPlay ? 'auto' : 'none'}
          aria-label={`Démonstration de ${name}`}
          onError={() => setFailed(true)}
        >
          La lecture vidéo n’est pas prise en charge par ce navigateur.
        </video>
      )}
    </>
  );
}
