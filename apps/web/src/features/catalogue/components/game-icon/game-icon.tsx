import type { Category, Element } from '@shared/catalogue';
import wind from '../../../../../assets/icons/elements/icon_element_wind.png';
import forest from '../../../../../assets/icons/elements/icon_element_wood.png';
import fire from '../../../../../assets/icons/elements/icon_element_fire.png';
import mountain from '../../../../../assets/icons/elements/icon_element_mountain.png';
import shoot from '../../../../../assets/icons/hissatsu/icon_hissatsu_shoot.png';
import dribble from '../../../../../assets/icons/hissatsu/icon_hissatsu_dribble.png';
import block from '../../../../../assets/icons/hissatsu/icon_hissatsu_block.png';
import catchIcon from '../../../../../assets/icons/hissatsu/icon_hissatsu_catch.png';
import keshin from '../../../../../assets/icons/aura/icon_aura_keshin.png';
import armed from '../../../../../assets/icons/aura/icon_aura_armed.png';
import miximax from '../../../../../assets/icons/aura/icon_aura_mixi_max.png';
import totem from '../../../../../assets/icons/aura/icon_aura_totem.png';
import bond from '../../../../../assets/icons/aura/icon_aura_bond_transform.png';
import awakening from '../../../../../assets/icons/aura/icon_aura_awakening_power.png';
import mode from '../../../../../assets/icons/aura/icon_aura_mode_change.png';
import styles from './game-icon.module.scss';

const elements: Partial<Record<Element, string>> = { wind, forest, fire, mountain };
const categories: Partial<Record<Category, string>> = {
  shoot,
  dribble,
  block,
  catch: catchIcon,
  keshin,
  keshin_armed: armed,
  miximax,
  totem,
  bond_transform: bond,
  awakening_power: awakening,
  mode_change: mode,
};
const tactics = import.meta.glob('../../../../../assets/icons/tactics/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
export function ElementIcon({ element }: { element: Element | null }) {
  const src = element ? elements[element] : null;
  return src ? (
    <img className={styles.element} src={src} width="20" height="20" alt="" aria-hidden="true" />
  ) : element === 'void' ? (
    <span aria-hidden="true">∅</span>
  ) : null;
}
export function TechniqueTypeIcon({ category }: { category: Category | null }) {
  const src = category ? categories[category] : null;
  return src ? (
    <img className={styles.type} src={src} width="24" height="24" alt="" aria-hidden="true" />
  ) : null;
}
export function TacticIcon({ stringId }: { stringId: string }) {
  const src = Object.entries(tactics).find(([path]) =>
    path.endsWith(`/icon_tactic_${stringId}.png`),
  )?.[1];
  return src ? (
    <img
      className={styles.type}
      src={src}
      width="24"
      height="24"
      alt=""
      aria-hidden="true"
      loading="lazy"
    />
  ) : null;
}
