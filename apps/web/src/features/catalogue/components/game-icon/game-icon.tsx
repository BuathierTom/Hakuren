import type { Category, Element } from '@shared/catalogue';
import { Icon } from '@/components/ui/icon/icon';
import wind from '../../../../../assets/elements/wind_icon.webp';
import forest from '../../../../../assets/elements/forest_icon.webp';
import fire from '../../../../../assets/elements/fire_icon.webp';
import mountain from '../../../../../assets/elements/mountain_icon.webp';
import voidIcon from '../../../../../assets/elements/void_icon.webp';
import shoot from '../../../../../assets/types/shoot_icon.webp';
import dribble from '../../../../../assets/types/dribble_icon.webp';
import block from '../../../../../assets/types/block_icon.webp';
import catchIcon from '../../../../../assets/types/catch_icon.webp';
import styles from './game-icon.module.scss';

const elements: Record<Element, string> = { wind, forest, fire, mountain, void: voidIcon };
const categories: Partial<Record<Category, string>> = { shoot, dribble, block, catch: catchIcon };
export function ElementIcon({ element }: { element: Element | null }) {
  return element ? (
    <img
      className={styles.icon}
      src={elements[element]}
      width="16"
      height="16"
      alt=""
      aria-hidden="true"
    />
  ) : (
    <span className={styles.unknown} aria-hidden="true">
      ?
    </span>
  );
}
export function TechniqueTypeIcon({ category }: { category: Category | null }) {
  const src = category ? categories[category] : null;
  return src ? (
    <img className={styles.icon} src={src} width="16" height="16" alt="" aria-hidden="true" />
  ) : (
    <Icon name={category === null || category === 'other' ? 'book' : 'sparkles'} size={20} />
  );
}
