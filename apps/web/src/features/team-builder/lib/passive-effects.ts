import type { StatKey } from '@shared/catalogue';
import type { PowerKey } from './power-stats';
export type PassiveScope =
  | 'self'
  | 'team'
  | 'same-element'
  | 'different-element'
  | 'same-position'
  | 'different-position'
  | 'nearby'
  | 'GK'
  | 'DF'
  | 'MF';
export interface PowerEffect {
  kind: 'power';
  keys: PowerKey[];
  scope: PassiveScope;
  conditional: boolean;
  phase?: 'own-half' | 'opponent-half' | 'first-half' | 'second-half';
  neighbor?: 'same-element' | 'different-element';
  cap?: { key: string; max: number };
}
export type PassiveEffect =
  | PowerEffect
  | { kind: 'flat'; stat: StatKey; scope: 'self' | 'team' }
  | { kind: 'gauge' }
  | { kind: 'match-state' };
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s*%\s*/g, '%')
    .replace(/\s+/g, ' ')
    .trim();
const catalogue = new Map<string, PassiveEffect>();
const register = (text: string, effect: PassiveEffect) => catalogue.set(normalize(text), effect);
const groups = {
  shot: ['shootAT'],
  focus: ['focusAT', 'focusDF'],
  scramble: ['scrambleAT', 'scrambleDF'],
  wall: ['wallDF'],
  kp: ['kp'],
  at: ['shootAT', 'focusAT', 'scrambleAT'],
  df: ['focusDF', 'scrambleDF', 'wallDF'],
  all: ['shootAT', 'focusAT', 'scrambleAT', 'focusDF', 'scrambleDF', 'wallDF'],
} satisfies Record<string, PowerKey[]>;
function power(
  text: string,
  group: keyof typeof groups,
  scope: PassiveScope = 'team',
  extra: Partial<PowerEffect> = {},
) {
  register(text, { kind: 'power', keys: groups[group]!, scope, conditional: false, ...extra });
}
for (const [name, stat] of Object.entries({
  Frappe: 'power',
  Contrôle: 'control',
  Technique: 'technique',
  Pression: 'pressure',
  Physique: 'physical',
  Agilité: 'agility',
  Intelligence: 'intelligence',
}))
  register(`${name} +…`, { kind: 'flat', stat: stat as StatKey, scope: 'self' });
const scopes: [string, PassiveScope][] = [
  ['du même élément', 'same-element'],
  ["d'éléments différents", 'different-element'],
  ['de la même position', 'same-position'],
  ['à des positions différentes', 'different-position'],
  ['proches', 'nearby'],
];
for (const [label, group] of [
  ['ATT des tirs', 'shot'],
  ['ATT & DÉF affrontement', 'focus'],
  ['ATT & DÉF duels', 'scramble'],
] as const)
  for (const [suffix, scope] of scopes)
    power(`${label} +… % pour les joueurs ${suffix}`, group, scope, {
      conditional: scope === 'nearby',
    });
for (const [suffix, scope] of scopes.filter(([, scope]) => scope !== 'same-position'))
  power(
    `DÉF des Remparts +… % pour les joueurs ${scope === 'different-position' ? 'à positions différentes' : suffix}`,
    'wall',
    scope,
    { conditional: scope === 'nearby' },
  );
for (const [label, group] of [
  ['ATT & DÉF affrontement', 'focus'],
  ['ATT & DÉF duels', 'scramble'],
] as const)
  for (const [text, phase] of [
    ['dans sa moitié de terrain', 'own-half'],
    ['dans la moitié de terrain adverse', 'opponent-half'],
    ['quand hors Zone', undefined],
  ] as const)
    power(`${label} (perso) +… % ${text}`, group, 'self', { conditional: true, phase });
for (const [text, phase] of [
  ['dans sa moitié de terrain', 'own-half'],
  ["dans la moitié de terrain de l'adversaire", 'opponent-half'],
  ['quand hors Zone', undefined],
] as const)
  power(`ATT & DÉF affrontement (équipe) +… % ${text}`, 'focus', 'team', {
    conditional: true,
    phase,
  });
power('ATT des tirs (perso) +… % dans la moitié de terrain adverse', 'shot', 'self', {
  conditional: true,
  phase: 'opponent-half',
});
for (const [condition, neighbor] of [
  ["Quand un joueur d'un autre élément est proche", 'different-element'],
  ['Quand un joueur du même élément est proche', 'same-element'],
] as const)
  for (const [label, group] of [
    ['ATT des tirs', 'shot'],
    ['ATT & DÉF affrontement', 'focus'],
    ['DÉF des Remparts', 'wall'],
    ...(neighbor === 'same-element' ? ([['ATT & DÉF duels', 'scramble']] as const) : []),
  ] as const)
    power(`${condition}, ${label} (perso) +… %`, group, 'self', { conditional: true, neighbor });
power("PG de l'équipe +… %", 'kp');
power("Quand la tension est à 100%, ATT des tirs de l'équipe +… %", 'shot', 'team', {
  conditional: true,
  cap: { key: 'full-tension-shot', max: 200 },
});
power(
  "Quand la tension est égale ou supérieure à 50 %, l'ATT & DÉF de l'équipe +… %",
  'focus',
  'team',
  { conditional: true, cap: { key: 'half-tension-focus', max: 50 } },
);
power(
  "Après récupération du ballon (sauf arrêt), ATT des tirs de l'équipe +… % pendant 30 sec",
  'shot',
  'team',
  { conditional: true, cap: { key: 'recovery-shot', max: 100 } },
);
power(
  'Après récupération du ballon (sauf arrêt), ATT & DÉF affrontement [MIL] +… % pendant 30 sec',
  'focus',
  'MF',
  { conditional: true, cap: { key: 'recovery-focus', max: 50 } },
);
power('Après récupération du ballon (sauf arrêt), PG [PG] +… % pendant 15 sec', 'kp', 'GK', {
  conditional: true,
  cap: { key: 'recovery-kp', max: 100 },
});
power("Jusqu'à la prochaine faute commise, DÉF des Remparts de l'équipe +… %", 'wall', 'team', {
  conditional: true,
  cap: { key: 'clean-wall', max: 50 },
});
power("Pour la première mi-temps, ATT de l'équipe +… %", 'at', 'team', {
  conditional: true,
  phase: 'first-half',
  cap: { key: 'first-half-at', max: 30 },
});
power("Pour la deuxième mi-temps, DÉF de l'équipe +… %", 'df', 'team', {
  conditional: true,
  phase: 'second-half',
  cap: { key: 'second-half-df', max: 30 },
});
for (const text of [
  'Après un remplacement, ATT du joueur entrant +… % pendant 15 sec',
  'Après un remplacement, DÉF du joueur entrant +… % pendant 15 sec',
  "Chaque 1% puiss. de lien qui augmente (Build Lien), ATT & DÉF de l'équipe +… %",
  'À chaque augmentation du build Contre, ATT & DÉF Focus (équipe) +…%',
  "À chaque augmentation du build Justice, ATT & DÉF de l'équipe +…%",
  'À chaque augmentation du build Lien, ATT & DÉF en Duel (équipe) +…%',
])
  register(text, { kind: 'match-state' });
for (const text of [
  "Après une passe, puissance de lien de l'équipe +… %",
  "Après mouvement de recul dû à un sprint, puissance de lien de l'équipe +… %",
  "Taux de chute de l'équipe +… % (Rare)",
  "Taux de chute de l'équipe +… % (Commun)",
  'Temps de recharge des tactiques spéciales (perso) -… %',
  'Temps de recharge des techniques spéciales (perso) -… %',
  'À chaque augmentation du build Brèche, le taux de percée des Remparts +…%',
  "En gagnant un affrontement ou un duel, tension de l'équipe +… %",
  "Quand la puissance de lien est égale ou supérieure à 20 %, ATT des tirs directs de l'équipe +… %",
  'À chaque augmentation du build Violent, ATT & DÉF des Att. Brutales (équipe) +…%',
  "À chaque changement du build Lien, perte de puissance de lien de l'équipe -… %",
  "Taux de faute de l'équipe -… % hors Zone",
  "Taux de faute de l'équipe -… % lors des sprints",
  "Après récupération du ballon (sauf arrêt), ATT & DÉF des attaques brutales de l'équipe +… % pendant 30 sec",
  "Taux de brèche de l'équipe +… %",
  'À chaque augmentation du build Brèche, taux de Parade (équipe) +…%',
  "Coût d'une brèche de tension l'équipe -… %",
  "Après mouvement de recul de sprint (Build jeu violent), tension de l'équipe +… %",
  "Quand à égalité ou en retard, taux de brèche de l'équipe +… %",
  "Quand l'adversaire commet une faute, puissance de lien de l'équipe +… %",
  'À chaque augmentation du build Tension, Tension gagnée +…%',
  "Quand l'adversaire évite un affrontement ciblé avec une passe, draine … % de tension",
])
  register(text, { kind: 'gauge' });
export function passiveEffect(name: string): PassiveEffect | null {
  return catalogue.get(normalize(name)) ?? null;
}
