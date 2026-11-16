export const NON_TEAMS = new Set(['Sub Character', 'Unaffiliated']);

export const PRIMARY_ROSTER_WORKS: Record<string, string[]> = { Raimon: ['IE2'] };

export const TEAM_PAGES: Record<string, string[]> = {
  'Umbrella MS': ['Kasamino'],
  'Raimon First Squad': ['Shinsei Raimon', 'Team Raimon'],
  'Black Templars': ['Kuro no Kishidan'],
  'Rose Griffons': ['Rose Griffon'],
  'Rampart Junior High': ['Minodouzan'],
  'South Cirrus Junior High': ['Nagumohara'],
  Shuriken: ['Sengoku Igajima'],
  Mirage: ['Genei Gakuen'],
  'Big Bang': ['Big Bang (team)'],
  Supernova: ['Supernova (team)'],
  Raimon: ['Raimon', 'Inakuni Raimon'],
  'Inazuma National': ['Inazuma Japan', 'Inazuma Japan (Orion)'],
  'Royal Academy': ['Teikoku Gakuen', 'Henkaku no Teikoku', 'Teikoku Gakuen (Ares)'],
  Zeus: ['Zeus', 'Zeus (Ares)'],
  Brainwashing: ['Mikage Sennou', 'Mikage Sennou (Ares)'],
  Kirkwood: ['Kidokawa Seishuu', 'Kidokawa Seishuu (GO)', 'Kidokawa Seishuu (Ares)'],
  Alpine: ['Hakuren', 'Hakuren (GO)', 'Hakuren (Ares)'],
  'Inazuma Kids FC': ['Inazuma KFC', 'Inazuma KFC (GO)'],
  'Fire Dragon': ['Fire Dragon', 'Fire Dragon (GO)'],
  'Big Waves': ['Big Waves', 'Big Waves (GO)'],
};

export const wikiQuery = (params: Record<string, string>) =>
  `https://inazuma-eleven.fandom.com/api.php?${new URLSearchParams({ ...params, format: 'json', formatversion: '2' })}`;

export const playerModuleId = (module: string) => `wiki-playerdata-${module.toLowerCase()}`;
