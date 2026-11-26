import { t } from '@/features/preferences/lib/i18n';
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
          <p>{t('La démonstration est momentanément indisponible.')}</p>
          <button
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            {t('Réessayer')}
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
          aria-label={t('Démonstration de {0}', name)}
          onError={() => setFailed(true)}
        >
          {t('La lecture vidéo n’est pas prise en charge par ce navigateur.')}
        </video>
      )}
    </>
  );
}
