import passiveSpriteMap from '../../../../../assets/icons/passives/_passive_icons.csv?raw';
import type { Category, Element, Gender, PlayStyle, Position } from '@shared/catalogue';
import male from '../../../../../assets/icons/gender/icon_gender_male.png';
import female from '../../../../../assets/icons/gender/icon_gender_female.png';
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
import { elementIcons, playStyleIcons, positionIcons } from '../../lib/game-icon-assets';

const genders: Partial<Record<Gender, string>> = { male, female };
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
  const src = element ? elementIcons[element] : null;
  return src ? (
    <img className={styles.element} src={src} width="20" height="20" alt="" aria-hidden="true" />
  ) : null;
}
export function GenderIcon({ gender }: { gender: Gender }) {
  const src = genders[gender];
  return src ? (
    <img className={styles.gender} src={src} width="20" height="20" alt="" aria-hidden="true" />
  ) : null;
}
export function PositionIcon({ position }: { position: Position }) {
  return (
    <img
      className={styles.position}
      src={positionIcons[position]}
      width="34"
      height="20"
      alt=""
      aria-hidden="true"
    />
  );
}
export function PlayStyleIcon({ style }: { style: PlayStyle }) {
  return (
    <img
      className={styles.playStyle}
      src={playStyleIcons[style]}
      width="20"
      height="20"
      alt=""
      aria-hidden="true"
    />
  );
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

const passiveIcons = import.meta.glob('../../../../../assets/icons/passives/*.png', {
  eager: true,
  query: '?url&no-inline',
  import: 'default',
}) as Record<string, string>;
const passiveSprites = new Map(
  passiveSpriteMap.split('\n').flatMap((line) => {
    const match = /^"(\d+)","[^"]*","(icon_teambuff\d+)","(?:fort|moyen)"/.exec(line.trim());
    return match ? [[Number(match[1]), match[2]!] as const] : [];
  }),
);
export function PassiveIcon({ icon }: { icon: number | null }) {
  const sprite = icon == null ? null : passiveSprites.get(icon);
  const suffix = sprite ? `/${sprite}.png` : '';
  const src = suffix
    ? Object.entries(passiveIcons).find(([path]) => path.endsWith(suffix))?.[1]
    : null;
  return src ? (
    <img
      className={styles.passive}
      src={src}
      width="24"
      height="24"
      alt=""
      aria-hidden="true"
      loading="lazy"
    />
  ) : null;
}
