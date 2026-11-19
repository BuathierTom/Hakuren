import type { PlayStyle } from '@shared/catalogue';
import { RARITIES, type TeamRarity, type Assignment } from './team';
const pink = { color: '#f472b6', shadow: '#f472b657' };
const silver = { color: '#cbd5e1', shadow: '#94a3b866' };
const red = { color: '#eb0000', shadow: '#eb00004d' };
const heroColors: Record<PlayStyle, { color: string; shadow: string }> = {
  breach: pink,
  counter: pink,
  justice: silver,
  bond: silver,
  rough_play: red,
  tension: red,
};
export function rarityAppearance(rarity: TeamRarity, playStyle: PlayStyle | null) {
  const appearance = rarity === 'hero' && playStyle ? heroColors[playStyle] : RARITIES[rarity];
  return { color: appearance.color, shadow: appearance.shadow };
}
export function assignmentAppearance(assignment: Assignment) {
  return rarityAppearance(assignment.rarity, assignment.playStyle ?? assignment.player.playStyle);
}
