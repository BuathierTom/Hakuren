import type { Element, PlayStyle, Position } from '@shared/catalogue';
import wind from '../../../../assets/icons/elements/icon_element_wind.png';
import forest from '../../../../assets/icons/elements/icon_element_wood.png';
import fire from '../../../../assets/icons/elements/icon_element_fire.png';
import mountain from '../../../../assets/icons/elements/icon_element_mountain.png';
import voidElement from '../../../../assets/icons/elements/icon_element_void.png';
import goalkeeper from '../../../../assets/icons/positions/icon_position_gk.fr.png';
import defender from '../../../../assets/icons/positions/icon_position_def.fr.png';
import midfielder from '../../../../assets/icons/positions/icon_position_mid.fr.png';
import forward from '../../../../assets/icons/positions/icon_position_fwd.fr.png';

import breach from '../../../../assets/icons/styles/icon_style_breach.png';
import tension from '../../../../assets/icons/styles/icon_style_tension.png';
import counter from '../../../../assets/icons/styles/icon_style_counter.png';
import bond from '../../../../assets/icons/styles/icon_style_bond.png';
import roughPlay from '../../../../assets/icons/styles/icon_style_rough_play.png';
import justice from '../../../../assets/icons/styles/icon_style_justice.png';

export const playStyleIcons: Record<PlayStyle, string> = {
  breach,
  tension,
  counter,
  bond,
  rough_play: roughPlay,
  justice,
};
export const elementIcons: Record<Element, string> = {
  wind,
  forest,
  fire,
  mountain,
  void: voidElement,
};
export const positionIcons: Record<Position, string> = {
  GK: goalkeeper,
  DF: defender,
  MF: midfielder,
  FW: forward,
};
