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
      <h3>En action</h3>
      <TechniqueVideo key={preview.url} preview={preview} name={name} />
    </section>
  );
}
