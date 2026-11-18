import type { Category, Element, Gender, PlayStyle, Position } from '@shared/catalogue';
import wind from '../../../../../assets/icons/elements/icon_element_wind.png';
import forest from '../../../../../assets/icons/elements/icon_element_wood.png';
import fire from '../../../../../assets/icons/elements/icon_element_fire.png';
import mountain from '../../../../../assets/icons/elements/icon_element_mountain.png';
import voidElement from '../../../../../assets/icons/elements/icon_element_void.png';
import male from '../../../../../assets/icons/gender/icon_gender_male.png';
import female from '../../../../../assets/icons/gender/icon_gender_female.png';
import goalkeeper from '../../../../../assets/icons/positions/icon_position_gk.fr.png';
import defender from '../../../../../assets/icons/positions/icon_position_def.fr.png';
import midfielder from '../../../../../assets/icons/positions/icon_position_mid.fr.png';
import forward from '../../../../../assets/icons/positions/icon_position_fwd.fr.png';
import breach from '../../../../../assets/icons/styles/icon_style_breach.png';
import tension from '../../../../../assets/icons/styles/icon_style_tension.png';
import counter from '../../../../../assets/icons/styles/icon_style_counter.png';
import bondStyle from '../../../../../assets/icons/styles/icon_style_bond.png';
import roughPlay from '../../../../../assets/icons/styles/icon_style_rough_play.png';
import justice from '../../../../../assets/icons/styles/icon_style_justice.png';
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

const elements: Record<Element, string> = { wind, forest, fire, mountain, void: voidElement };
const genders: Partial<Record<Gender, string>> = { male, female };
const positions: Record<Position, string> = {
  GK: goalkeeper,
  DF: defender,
  MF: midfielder,
  FW: forward,
};
const playStyles: Record<PlayStyle, string> = {
  breach,
  tension,
  counter,
  bond: bondStyle,
  rough_play: roughPlay,
  justice,
};
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
      src={positions[position]}
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
      src={playStyles[style]}
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
