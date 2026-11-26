import { t } from '@/features/preferences/lib/i18n';
import type { TechniqueDetail } from '@shared/catalogue';
import { TechniqueVideo } from '../technique-video/technique-video';
import styles from './technique-preview.module.scss';

export function TechniquePreview({
  preview,
  name,
}: {
  preview: NonNullable<TechniqueDetail['preview']>;
  name: string;
}) {
  return (
    <section className={styles.section}>
      <h3>{t('En action')}</h3>
      <TechniqueVideo key={preview.url} preview={preview} name={name} />
    </section>
  );
}
